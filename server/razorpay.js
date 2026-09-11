import crypto from "node:crypto";
import { config } from "./config.js";
import { safeEqualHex } from "./security.js";

async function razorpayRequest(path, options = {}) {
  const authorization = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.description || "Razorpay request failed.");
  }
  return body;
}

export function createRazorpayOrder({ amountPaise, receipt, notes }) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    }),
  });
}

export function fetchRazorpayPayment(paymentId) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", config.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac("sha256", config.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}
