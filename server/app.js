import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config, validateConfig } from "./config.js";
import { db, initializeDatabase, releaseExpiredReservations } from "./db.js";
import { sendBookingConfirmation, sendOtpEmail } from "./email.js";
import { calculatePricing, getCampaignDates, getPackage } from "./pricing.js";
import {
  clearSessionCookie,
  decryptOtp,
  encryptOtp,
  generateOtp,
  hmac,
  parseCookies,
  safeEqualHex,
  sessionCookie,
} from "./security.js";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./razorpay.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(__dirname, "../public_html");
const app = express();
const allowedSlots = new Set(["Morning", "Afternoon", "Evening", "Night"]);
const allowedTrucks = new Set(["TRK-HYD-204"]);
const requestBuckets = new Map();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((request, response, next) => {
  response.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src https://api.razorpay.com https://checkout.razorpay.com https://maps.google.com https://www.google.com; connect-src 'self' https://api.razorpay.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  });
  next();
});

app.post("/api/webhooks/razorpay", express.raw({ type: "application/json", limit: "512kb" }), async (request, response) => {
  try {
    const signature = request.get("x-razorpay-signature") || "";
    if (!verifyWebhookSignature(request.body, signature)) {
      return response.status(400).json({ error: "Invalid webhook signature." });
    }

    const event = JSON.parse(request.body.toString("utf8"));
    const eventId = request.get("x-razorpay-event-id") || hmac(request.body, config.razorpayWebhookSecret);
    const [existing] = await db.execute("SELECT event_id FROM webhook_events WHERE event_id = ?", [eventId]);
    if (existing.length) {
      return response.json({ received: true, duplicate: true });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id || event.payload?.order?.entity?.id;
      const paymentId = payment?.id;
      if (orderId) {
        await confirmPaidBooking({ orderId, paymentId });
      }
    }
    await db.execute("INSERT IGNORE INTO webhook_events (event_id, event_type) VALUES (?, ?)", [eventId, event.event]);
    return response.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook failed", error);
    return response.status(500).json({ error: "Webhook processing failed." });
  }
});

app.use(express.json({ limit: "100kb" }));

app.use("/api", (request, response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return next();
  }
  const origin = request.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).hostname.replace(/^www\./, "");
      const appHost = new URL(config.appOrigin).hostname.replace(/^www\./, "");
      if (originHost !== appHost) {
        return response.status(403).json({ error: "Request origin is not allowed." });
      }
    } catch {
      return response.status(403).json({ error: "Request origin is not allowed." });
    }
  }
  next();
});

function rateLimit(key, maximum, windowMs) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > maximum;
}

function text(value, maximum) {
  return String(value || "").trim().slice(0, maximum);
}

function normalizeEmail(value) {
  const email = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeMobile(value) {
  const mobile = text(value, 24).replace(/[\s()-]/g, "");
  return /^\+?[0-9]{10,15}$/.test(mobile) ? mobile : "";
}

function futureDate(minutes) {
  return new Date(Date.now() + minutes * 60_000);
}

function sqlDateTime(value) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.full_name,
    business: row.business_name,
    mobile: row.mobile,
  };
}

async function getSession(request) {
  const token = parseCookies(request.headers.cookie).pmz_session;
  if (!token) {
    return null;
  }
  const tokenHash = hmac(token, config.sessionPepper);
  const [rows] = await db.execute(
    `SELECT users.* FROM sessions
     INNER JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function requireSession(request, response, next) {
  try {
    const user = await getSession(request);
    if (!user) {
      return response.status(401).json({ error: "Verify your email to continue." });
    }
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function bookingReference() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `PMA-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function bookingInput(body) {
  const truckId = text(body.truckId, 32);
  const packageCode = text(body.packageCode, 16);
  const routeCode = text(body.routeCode, 24);
  const slot = text(body.slot, 20);
  const creativeType = text(body.creativeType, 10);
  if (!allowedTrucks.has(truckId) || !getPackage(packageCode) || !allowedSlots.has(slot)) {
    throw new Error("Choose a supported truck, package, and time slot.");
  }
  if (!new Set(["metro", "retail", "campus"]).has(routeCode)) {
    throw new Error("Custom routes require approval before payment.");
  }
  if (!new Set(["video", "image"]).has(creativeType)) {
    throw new Error("Choose video or image creative.");
  }
  return {
    truckId,
    packageCode,
    routeCode,
    slot,
    creativeType,
    needsVideo: Boolean(body.needsVideo),
    radiusKm: Number(body.radiusKm),
    durationSeconds: Number(body.durationSeconds),
    startDate: text(body.startDate, 10),
    origin: text(body.origin, 255),
    destination: text(body.destination, 255),
  };
}

async function sendConfirmationOnce(bookingId) {
  const connection = await db.getConnection();
  let payload;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT bookings.*, users.email, users.full_name, users.business_name, users.mobile
       FROM bookings INNER JOIN users ON users.id = bookings.user_id
       WHERE bookings.id = ? FOR UPDATE`,
      [bookingId],
    );
    const booking = rows[0];
    if (!booking || booking.confirmation_sent_at) {
      await connection.rollback();
      return;
    }
    await connection.execute("UPDATE bookings SET confirmation_sent_at = UTC_TIMESTAMP() WHERE id = ?", [bookingId]);
    await connection.commit();
    payload = booking;
  } finally {
    connection.release();
  }

  try {
    await sendBookingConfirmation({
      booking: payload,
      customer: payload,
      tripOtp: decryptOtp(payload.trip_otp_ciphertext),
    });
  } catch (error) {
    await db.execute("UPDATE bookings SET confirmation_sent_at = NULL WHERE id = ?", [bookingId]);
    throw error;
  }
}

async function confirmPaidBooking({ orderId, paymentId }) {
  const connection = await db.getConnection();
  let bookingId;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      "SELECT * FROM bookings WHERE razorpay_order_id = ? FOR UPDATE",
      [orderId],
    );
    const booking = rows[0];
    if (!booking) {
      await connection.rollback();
      return null;
    }
    bookingId = booking.id;
    if (!["confirmed", "started", "completed"].includes(booking.status)) {
      await connection.execute(
        `UPDATE bookings SET status = 'confirmed', razorpay_payment_id = COALESCE(?, razorpay_payment_id), paid_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [paymentId || null, booking.id],
      );
      await connection.execute(
        "UPDATE booking_slots SET status = 'confirmed', expires_at = NULL WHERE booking_id = ?",
        [booking.id],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  try {
    await sendConfirmationOnce(bookingId);
  } catch (error) {
    console.error("Booking confirmation email failed", error);
  }
  return bookingId;
}

app.get("/api/health", async (_request, response, next) => {
  try {
    await db.query("SELECT 1");
    response.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/config", (_request, response) => {
  response.json({ razorpayKeyId: config.razorpayKeyId });
});

app.post("/api/auth/request-otp", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const mobile = normalizeMobile(request.body.mobile);
    const name = text(request.body.name, 120);
    const business = text(request.body.business, 160);
    if (!email || !mobile || name.length < 2 || business.length < 2) {
      return response.status(400).json({ error: "Enter a valid name, business, email, and mobile number." });
    }
    if (rateLimit(`otp-ip:${request.ip}`, 10, 60 * 60_000) || rateLimit(`otp-email:${email}`, 5, 60 * 60_000)) {
      return response.status(429).json({ error: "Too many verification requests. Please try again later." });
    }

    const [recent] = await db.execute(
      "SELECT created_at FROM email_otp_requests WHERE email = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 SECOND) LIMIT 1",
      [email],
    );
    if (recent.length) {
      return response.status(429).json({ error: "Please wait one minute before requesting another code." });
    }

    const id = crypto.randomUUID();
    const code = generateOtp();
    await db.execute(
      `INSERT INTO email_otp_requests (id, email, profile_json, code_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, email, JSON.stringify({ name, business, email, mobile }), hmac(`${email}:${code}`, config.otpPepper), sqlDateTime(futureDate(10))],
    );
    try {
      await sendOtpEmail({ email, name, code });
    } catch (error) {
      await db.execute("DELETE FROM email_otp_requests WHERE id = ?", [id]);
      throw error;
    }
    response.json({ sent: true, expiresInSeconds: 600 });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-otp", async (request, response, next) => {
  const email = normalizeEmail(request.body.email);
  const code = text(request.body.code, 6);
  if (!email || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: "Enter the six-digit code from your email." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT * FROM email_otp_requests
       WHERE email = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [email],
    );
    const requestRow = rows[0];
    if (!requestRow || new Date(requestRow.expires_at) < new Date() || requestRow.attempts >= 5) {
      await connection.rollback();
      return response.status(400).json({ error: "This code has expired. Request a new code." });
    }
    const expected = hmac(`${email}:${code}`, config.otpPepper);
    if (!safeEqualHex(expected, requestRow.code_hash)) {
      await connection.execute("UPDATE email_otp_requests SET attempts = attempts + 1 WHERE id = ?", [requestRow.id]);
      await connection.commit();
      return response.status(400).json({ error: "The verification code is incorrect." });
    }

    const profile = JSON.parse(requestRow.profile_json);
    const userId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO users (id, email, full_name, business_name, mobile, email_verified_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), business_name = VALUES(business_name), mobile = VALUES(mobile), email_verified_at = UTC_TIMESTAMP()`,
      [userId, email, profile.name, profile.business, profile.mobile],
    );
    const [users] = await connection.execute("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];
    const token = crypto.randomBytes(32).toString("base64url");
    await connection.execute(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
      [hmac(token, config.sessionPepper), user.id, sqlDateTime(futureDate(60 * 24 * 7))],
    );
    await connection.execute("UPDATE email_otp_requests SET consumed_at = UTC_TIMESTAMP() WHERE id = ?", [requestRow.id]);
    await connection.commit();
    response.setHeader("Set-Cookie", sessionCookie(token));
    response.json({ user: publicUser(user) });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.get("/api/auth/me", async (request, response, next) => {
  try {
    const user = await getSession(request);
    if (!user) {
      return response.status(401).json({ error: "Not signed in." });
    }
    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/sign-out", async (request, response, next) => {
  try {
    const token = parseCookies(request.headers.cookie).pmz_session;
    if (token) {
      await db.execute("DELETE FROM sessions WHERE token_hash = ?", [hmac(token, config.sessionPepper)]);
    }
    response.setHeader("Set-Cookie", clearSessionCookie());
    response.json({ signedOut: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/availability", requireSession, async (request, response, next) => {
  try {
    const truckId = text(request.query.truckId, 32);
    const packageCode = text(request.query.packageCode, 16);
    const slot = text(request.query.slot, 20);
    const startDate = text(request.query.startDate, 10);
    const selectedPackage = getPackage(packageCode);
    if (!allowedTrucks.has(truckId) || !selectedPackage || !allowedSlots.has(slot)) {
      return response.status(400).json({ error: "Choose a valid truck, package, and time slot." });
    }
    const campaignDates = getCampaignDates(startDate, selectedPackage.days);
    await releaseExpiredReservations();
    const placeholders = campaignDates.map(() => "?").join(",");
    const [rows] = await db.execute(
      `SELECT campaign_date FROM booking_slots
       WHERE truck_id = ? AND time_slot = ? AND campaign_date IN (${placeholders})`,
      [truckId, slot, ...campaignDates],
    );
    response.json({
      available: rows.length === 0,
      availableCount: rows.length === 0 ? 1 : 0,
      conflictingDates: rows.map((row) => String(row.campaign_date).slice(0, 10)),
      campaignDates,
    });
  } catch (error) {
    if (/Choose|Campaigns|date/.test(error.message)) {
      return response.status(400).json({ error: error.message });
    }
    next(error);
  }
});

app.post("/api/bookings/order", requireSession, async (request, response, next) => {
  let booking;
  try {
    booking = bookingInput(request.body);
    const pricing = calculatePricing(booking);
    const campaignDates = getCampaignDates(booking.startDate, pricing.packageDays);
    const bookingId = crypto.randomUUID();
    const reference = bookingReference();
    const tripOtp = generateOtp();
    const reservationExpiry = futureDate(15);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await releaseExpiredReservations(connection);
      const [truckRows] = await connection.execute(
        "SELECT id FROM trucks WHERE id = ? AND status = 'active' FOR UPDATE",
        [booking.truckId],
      );
      if (!truckRows.length) {
        throw new Error("This truck is not currently available.");
      }
      const placeholders = campaignDates.map(() => "?").join(",");
      const [conflicts] = await connection.execute(
        `SELECT campaign_date FROM booking_slots
         WHERE truck_id = ? AND time_slot = ? AND campaign_date IN (${placeholders}) FOR UPDATE`,
        [booking.truckId, booking.slot, ...campaignDates],
      );
      if (conflicts.length) {
        const conflict = new Error("This truck was just reserved for one or more selected dates.");
        conflict.statusCode = 409;
        throw conflict;
      }

      await connection.execute(
        `INSERT INTO bookings (
          id, booking_reference, user_id, truck_id, package_code, route_code, origin, destination,
          distance_km, radius_km, creative_type, needs_video_creation, ad_duration_seconds,
          campaign_start_date, time_slot, subtotal_paise, gst_paise, total_paise, status,
          trip_otp_hash, trip_otp_ciphertext, reservation_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_pending', ?, ?, ?)`,
        [
          bookingId, reference, request.user.id, booking.truckId, booking.packageCode, booking.routeCode,
          booking.origin, booking.destination, pricing.distanceKm, booking.radiusKm, booking.creativeType,
          booking.needsVideo, booking.durationSeconds, booking.startDate, booking.slot, pricing.subtotalPaise,
          pricing.gstPaise, pricing.totalPaise, hmac(`${bookingId}:${tripOtp}`, config.otpPepper),
          encryptOtp(tripOtp), sqlDateTime(reservationExpiry),
        ],
      );
      for (const campaignDate of campaignDates) {
        await connection.execute(
          `INSERT INTO booking_slots (truck_id, campaign_date, time_slot, booking_id, status, expires_at)
           VALUES (?, ?, ?, ?, 'reserved', ?)`,
          [booking.truckId, campaignDate, booking.slot, bookingId, sqlDateTime(reservationExpiry)],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    try {
      const order = await createRazorpayOrder({
        amountPaise: pricing.totalPaise,
        receipt: reference,
        notes: { booking_id: bookingId, booking_reference: reference },
      });
      await db.execute("UPDATE bookings SET razorpay_order_id = ? WHERE id = ?", [order.id, bookingId]);
      response.json({
        bookingId,
        bookingReference: reference,
        orderId: order.id,
        keyId: config.razorpayKeyId,
        amount: pricing.totalPaise,
        currency: "INR",
        expiresAt: reservationExpiry.toISOString(),
      });
    } catch (error) {
      await db.execute("DELETE FROM bookings WHERE id = ?", [bookingId]);
      throw error;
    }
  } catch (error) {
    if (error.statusCode) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (/Choose|Unsupported|Custom|radius|duration|booked|available|Campaigns/.test(error.message)) {
      return response.status(400).json({ error: error.message });
    }
    next(error);
  }
});

app.post("/api/payments/verify", requireSession, async (request, response, next) => {
  try {
    const orderId = text(request.body.razorpay_order_id, 64);
    const paymentId = text(request.body.razorpay_payment_id, 64);
    const signature = text(request.body.razorpay_signature, 128);
    if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
      return response.status(400).json({ error: "Payment signature verification failed." });
    }
    const [rows] = await db.execute(
      "SELECT * FROM bookings WHERE razorpay_order_id = ? AND user_id = ?",
      [orderId, request.user.id],
    );
    const booking = rows[0];
    if (!booking) {
      return response.status(404).json({ error: "Booking not found." });
    }
    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.order_id !== orderId || payment.amount !== booking.total_paise) {
      return response.status(400).json({ error: "Payment details do not match this booking." });
    }
    if (payment.status === "captured") {
      await confirmPaidBooking({ orderId, paymentId });
    } else if (payment.status === "authorized") {
      await db.execute(
        "UPDATE bookings SET status = 'payment_authorized', razorpay_payment_id = ?, reservation_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE id = ?",
        [paymentId, booking.id],
      );
      await db.execute(
        "UPDATE booking_slots SET expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE booking_id = ?",
        [booking.id],
      );
    } else {
      return response.status(409).json({ error: "Payment is not yet captured. We will confirm it automatically." });
    }
    const [updatedRows] = await db.execute("SELECT * FROM bookings WHERE id = ?", [booking.id]);
    const updated = updatedRows[0];
    response.json({
      bookingId: updated.id,
      bookingReference: updated.booking_reference,
      status: updated.status,
      tripOtp: updated.status === "confirmed" ? decryptOtp(updated.trip_otp_ciphertext) : null,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/bookings/latest", requireSession, async (request, response, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM bookings WHERE user_id = ? AND status IN ('confirmed', 'started', 'completed')
       ORDER BY created_at DESC LIMIT 1`,
      [request.user.id],
    );
    const booking = rows[0];
    if (!booking) {
      return response.status(404).json({ error: "No confirmed booking found." });
    }
    response.json({
      booking: {
        id: booking.id,
        reference: booking.booking_reference,
        truckId: booking.truck_id,
        startDate: booking.campaign_start_date,
        slot: booking.time_slot,
        status: booking.status,
        tripOtp: decryptOtp(booking.trip_otp_ciphertext),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings/:bookingId/start", requireSession, async (request, response, next) => {
  try {
    const bookingId = text(request.params.bookingId, 36);
    const code = text(request.body.code, 6);
    const [rows] = await db.execute(
      "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
      [bookingId, request.user.id],
    );
    const booking = rows[0];
    if (!booking || !["confirmed", "started"].includes(booking.status)) {
      return response.status(404).json({ error: "Confirmed booking not found." });
    }
    const expected = hmac(`${booking.id}:${code}`, config.otpPepper);
    if (!/^\d{6}$/.test(code) || !safeEqualHex(expected, booking.trip_otp_hash)) {
      return response.status(400).json({ error: "The trip OTP is incorrect." });
    }
    await db.execute(
      "UPDATE bookings SET status = 'started', started_at = COALESCE(started_at, UTC_TIMESTAMP()) WHERE id = ?",
      [booking.id],
    );
    response.json({ started: true });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

app.use(express.static(publicDirectory, {
  extensions: ["html"],
  maxAge: config.isProduction ? "1h" : 0,
  setHeaders(response, filePath) {
    if (filePath.endsWith("index.html")) {
      response.setHeader("Cache-Control", "no-cache");
    }
  },
}));

app.use((_request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

app.use((error, _request, response, _next) => {
  void _next;
  console.error(error);
  response.status(500).json({ error: "We could not complete that request. Please try again." });
});

async function start() {
  validateConfig();
  await initializeDatabase();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`PlayMyAdz server listening on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error("PlayMyAdz failed to start", error);
  process.exit(1);
});
