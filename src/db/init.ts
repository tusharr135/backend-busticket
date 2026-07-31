import { client, db } from "./index";
import { sql } from "drizzle-orm";

export async function initDbTables() {
  if (!db || !client) {
    console.log("No PostgreSQL client available, skipping table creation.");
    return;
  }

  try {
    // Ensure PostgreSQL tables exist
    await client`
      CREATE TABLE IF NOT EXISTS bus_info (
        id TEXT PRIMARY KEY DEFAULT 'default',
        bus_name TEXT NOT NULL DEFAULT 'श्री नवलादेवी प्रसन्न',
        bus_number TEXT NOT NULL DEFAULT 'MH-48-BY-5115',
        driver_name TEXT NOT NULL DEFAULT 'Shantaram Patil',
        driver_phone TEXT NOT NULL DEFAULT '9876543210',
        conductor_name TEXT NOT NULL DEFAULT 'Milind Raut',
        conductor_phone TEXT NOT NULL DEFAULT '9123456789',
        capacity INTEGER NOT NULL DEFAULT 45
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS admin (
        id TEXT PRIMARY KEY DEFAULT 'default',
        username TEXT NOT NULL DEFAULT 'admin',
        password TEXT NOT NULL DEFAULT 'admin123',
        admin_name TEXT NOT NULL DEFAULT 'Milind Raut',
        profile_photo TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=150&h=150&q=80'
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        ticket_no TEXT NOT NULL,
        journey_date TEXT NOT NULL,
        from_location TEXT NOT NULL,
        to_location TEXT NOT NULL,
        passenger_name TEXT NOT NULL,
        passenger_phone TEXT NOT NULL,
        pickup_point TEXT NOT NULL,
        drop_point TEXT NOT NULL,
        seat_number TEXT NOT NULL,
        ticket_fare DOUBLE PRECISION NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'Paid',
        paid_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        license TEXT,
        address TEXT,
        aadhaar_no TEXT,
        photo TEXT,
        assigned_bus_number TEXT,
        status TEXT DEFAULT 'Available',
        created_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        driver_id TEXT,
        driver_name TEXT NOT NULL,
        bus_number TEXT NOT NULL,
        journey_date TEXT NOT NULL,
        from_location TEXT NOT NULL,
        to_location TEXT NOT NULL,
        departure_time TEXT,
        arrival_time TEXT,
        remarks TEXT,
        total_passengers INTEGER NOT NULL DEFAULT 0,
        total_bookings INTEGER DEFAULT 0,
        revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'Scheduled',
        created_at TEXT,
        created_by TEXT
      );
    `;

    // Seed default bus info row if table is empty
    const busInfoRows = await client`SELECT count(*)::int FROM bus_info`;
    if (busInfoRows[0]?.count === 0) {
      await client`
        INSERT INTO bus_info (id, bus_name, bus_number, driver_name, driver_phone, conductor_name, conductor_phone, capacity)
        VALUES ('default', 'श्री नवलादेवी प्रसन्न', 'MH-48-BY-5115', 'Shantaram Patil', '9876543210', 'Milind Raut', '9123456789', 45)
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // Seed default admin row if table is empty
    const adminRows = await client`SELECT count(*)::int FROM admin`;
    if (adminRows[0]?.count === 0) {
      await client`
        INSERT INTO admin (id, username, password, admin_name, profile_photo)
        VALUES ('default', 'admin', 'admin123', 'Milind Raut', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=150&h=150&q=80')
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log("[Supabase] PostgreSQL Database tables initialized successfully.");
  } catch (err) {
    console.error("[Supabase] Error initializing PostgreSQL tables:", err);
  }
}
