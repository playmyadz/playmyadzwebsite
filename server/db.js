import mysql from "mysql2/promise";
import { config } from "./config.js";

export const db = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 6,
  maxIdle: 6,
  idleTimeout: 60_000,
  enableKeepAlive: true,
  timezone: "Z",
});

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    business_name VARCHAR(160) NOT NULL,
    mobile VARCHAR(24) NOT NULL,
    email_verified_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS email_otp_requests (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    profile_json TEXT NOT NULL,
    code_hash CHAR(64) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_otp_lookup (email, created_at),
    INDEX idx_email_otp_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expiry (expires_at),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS trucks (
    id VARCHAR(32) PRIMARY KEY,
    display_name VARCHAR(120) NOT NULL,
    status ENUM('active', 'maintenance', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id CHAR(36) PRIMARY KEY,
    booking_reference VARCHAR(24) NOT NULL UNIQUE,
    user_id CHAR(36) NOT NULL,
    truck_id VARCHAR(32) NOT NULL,
    package_code VARCHAR(16) NOT NULL,
    route_code VARCHAR(24) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    distance_km DECIMAL(7,2) NOT NULL,
    radius_km TINYINT UNSIGNED NOT NULL,
    creative_type ENUM('video', 'image') NOT NULL,
    needs_video_creation BOOLEAN NOT NULL DEFAULT FALSE,
    ad_duration_seconds TINYINT UNSIGNED NOT NULL,
    campaign_start_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    subtotal_paise INT UNSIGNED NOT NULL,
    gst_paise INT UNSIGNED NOT NULL,
    total_paise INT UNSIGNED NOT NULL,
    status ENUM('payment_pending', 'payment_authorized', 'payment_review', 'confirmed', 'expired', 'cancelled', 'started', 'completed') NOT NULL,
    razorpay_order_id VARCHAR(64) NULL UNIQUE,
    razorpay_payment_id VARCHAR(64) NULL UNIQUE,
    trip_otp_hash CHAR(64) NOT NULL,
    trip_otp_ciphertext TEXT NOT NULL,
    reservation_expires_at DATETIME NOT NULL,
    paid_at DATETIME NULL,
    started_at DATETIME NULL,
    confirmation_sent_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bookings_user (user_id, created_at),
    INDEX idx_bookings_status (status, reservation_expires_at),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_truck FOREIGN KEY (truck_id) REFERENCES trucks(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS booking_slots (
    truck_id VARCHAR(32) NOT NULL,
    campaign_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    booking_id CHAR(36) NOT NULL,
    status ENUM('reserved', 'confirmed') NOT NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (truck_id, campaign_date, time_slot),
    INDEX idx_booking_slots_booking (booking_id),
    INDEX idx_booking_slots_expiry (status, expires_at),
    CONSTRAINT fk_slots_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_slots_truck FOREIGN KEY (truck_id) REFERENCES trucks(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function initializeDatabase() {
  for (const statement of statements) {
    await db.query(statement);
  }
  await db.query(
    `ALTER TABLE bookings MODIFY status
     ENUM('payment_pending', 'payment_authorized', 'payment_review', 'confirmed', 'expired', 'cancelled', 'started', 'completed') NOT NULL`,
  );
  await db.execute(
    `INSERT INTO trucks (id, display_name, status)
     VALUES ('TRK-HYD-204', 'PlayMyAdz Hyderabad LED Truck', 'active')
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
  );
}

export async function releaseExpiredReservations(connection = db) {
  await connection.execute(
    `DELETE booking_slots FROM booking_slots
     INNER JOIN bookings ON bookings.id = booking_slots.booking_id
     WHERE bookings.status IN ('payment_pending', 'payment_authorized')
       AND booking_slots.status = 'reserved' AND booking_slots.expires_at < UTC_TIMESTAMP()`,
  );
  await connection.execute(
    `UPDATE bookings SET status = 'expired'
     WHERE status IN ('payment_pending', 'payment_authorized') AND reservation_expires_at < UTC_TIMESTAMP()`,
  );
}
