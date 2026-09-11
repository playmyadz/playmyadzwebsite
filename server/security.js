import crypto from "node:crypto";
import { config } from "./config.js";

export function hmac(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqualHex(left, right) {
  if (!left || !right || left.length !== right.length || !/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function generateOtp() {
  return String(crypto.randomInt(100_000, 1_000_000));
}

export function encryptOtp(value) {
  const key = crypto.createHash("sha256").update(config.otpPepper).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptOtp(value) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  const key = crypto.createHash("sha256").update(config.otpPepper).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, decodeURIComponent(value.join("="))];
  }).filter(([key]) => key));
}

export function sessionCookie(token, maxAge = 60 * 60 * 24 * 7) {
  const secure = config.isProduction ? "; Secure" : "";
  return `pmz_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  const secure = config.isProduction ? "; Secure" : "";
  return `pmz_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}
