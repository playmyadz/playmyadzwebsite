const required = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "SMTP_USER",
  "SMTP_PASS",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "OTP_PEPPER",
  "SESSION_PEPPER",
];

export function validateConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  appOrigin: process.env.APP_ORIGIN || "http://localhost:3000",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
  },
  emailFrom: process.env.EMAIL_FROM || "PlayMyAdz <bookings@playmyadz.co.in>",
  adminEmail: process.env.ADMIN_EMAIL || "bookings@playmyadz.co.in",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  otpPepper: process.env.OTP_PEPPER,
  sessionPepper: process.env.SESSION_PEPPER,
  isProduction: process.env.NODE_ENV === "production",
};
