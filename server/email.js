import nodemailer from "nodemailer";
import { config } from "./config.js";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
});

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

export async function sendOtpEmail({ email, name, code }) {
  await transporter.sendMail({
    from: config.emailFrom,
    to: email,
    subject: `${code} is your PlayMyAdz verification code`,
    text: `Hello ${name}, your PlayMyAdz verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Your PlayMyAdz verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
  });
}

function bookingText(booking, tripOtp) {
  const total = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
    .format(booking.total_paise / 100);
  const startDate = new Date(booking.campaign_start_date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return [
    `Booking: ${booking.booking_reference}`,
    `Truck: ${booking.truck_id}`,
    `Start date: ${startDate}`,
    `Time slot: ${booking.time_slot}`,
    `Route: ${booking.origin} to ${booking.destination}`,
    `Amount paid: ${total}`,
    `Trip start OTP: ${tripOtp}`,
  ].join("\n");
}

export async function sendBookingConfirmation({ booking, customer, tripOtp }) {
  const details = bookingText(booking, tripOtp);
  await Promise.all([
    transporter.sendMail({
      from: config.emailFrom,
      to: customer.email,
      subject: `PlayMyAdz booking confirmed: ${booking.booking_reference}`,
      text: `Hello ${customer.full_name},\n\nYour campaign is confirmed.\n\n${details}\n\nKeep the trip OTP private and share it with the assigned driver only at campaign start.`,
    }),
    transporter.sendMail({
      from: config.emailFrom,
      to: config.adminEmail,
      subject: `New paid campaign: ${booking.booking_reference}`,
      text: `A paid PlayMyAdz campaign has been confirmed for ${customer.business_name}.\n\n${details}\n\nCustomer: ${customer.full_name}\nEmail: ${customer.email}\nMobile: ${customer.mobile}`,
    }),
  ]);
}

export async function sendPaymentReviewAlert({ booking, customer }) {
  const details = bookingText(booking, "Withheld pending review");
  await transporter.sendMail({
    from: config.emailFrom,
    to: config.adminEmail,
    subject: `Payment needs manual review: ${booking.booking_reference}`,
    text: `A payment was captured after this reservation expired or was cancelled. Do not assign the truck until availability is checked.\n\n${details}\n\nCustomer: ${customer.full_name}\nEmail: ${customer.email}\nMobile: ${customer.mobile}`,
  });
}
