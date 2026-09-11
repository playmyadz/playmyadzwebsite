import assert from "node:assert/strict";
import test from "node:test";

process.env.OTP_PEPPER = "otp-test-pepper-with-at-least-32-bytes";
process.env.SESSION_PEPPER = "session-test-pepper-with-at-least-32-bytes";

const { decryptOtp, encryptOtp, hmac, safeEqualHex } = await import("./security.js");

test("encrypts and decrypts trip OTPs", () => {
  const encrypted = encryptOtp("123456");
  assert.notEqual(encrypted, "123456");
  assert.equal(decryptOtp(encrypted), "123456");
});

test("compares signatures without accepting malformed hex", () => {
  const signature = hmac("booking", process.env.OTP_PEPPER);
  assert.equal(safeEqualHex(signature, signature), true);
  assert.equal(safeEqualHex(signature, "z".repeat(signature.length)), false);
});
