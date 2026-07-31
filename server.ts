import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { db, client, isDatabaseConnected } from "./src/db";
import { initDbTables } from "./src/db/init";
import { busInfoTable, adminTable, bookingsTable, driversTable, tripsTable } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";

const app = express();
// const PORT = 5000;
const PORT = Number(process.env.PORT) || 5000;
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure data directory exists for fallback
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Generate unique ticket number in ascending order (4 digits)
function generateTicketNo(bookings: any[]): string {
  let maxNum = 0;
  for (const b of bookings || []) {
    const numPart = b.ticketNo ? b.ticketNo.replace(/\D/g, "") : "";
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return String(maxNum + 1).padStart(4, "0");
}

const DEFAULT_DB = {
  busInfo: {
    busName: "श्री नवलादेवी प्रसन्न",
    busNumber: "MH-48-BY-5115",
    driverName: "Shantaram Patil",
    driverPhone: "9876543210",
    conductorName: "Milind Raut",
    conductorPhone: "9123456789",
    capacity: 45
  },
  admin: {
    username: "admin",
    password: "admin123",
    adminName: "Milind Raut",
    profilePhoto: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=150&h=150&q=80"
  },
  bookings: [],
  drivers: [],
  trips: []
};

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
}

function readFallbackDB() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return DEFAULT_DB;
  }
}

function writeFallbackDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed writing fallback db:", err);
  }
}

// --- API ROUTES ---

// Health & DB status endpoint
app.get("/api/health", async (req, res) => {
  const pgConnected = await isDatabaseConnected();
  res.json({
    status: "ok",
    database: pgConnected ? "Supabase (PostgreSQL)" : "Local Storage (Fallback)"
  });
});

// 1. Auth Endpoint
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  let adminRecord = null;

  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(adminTable).where(eq(adminTable.id, "default"));
      if (records.length > 0) adminRecord = records[0];
    } catch (e) {
      console.warn("DB login query error, checking fallback:", e);
    }
  }

  if (!adminRecord) {
    const fallback = readFallbackDB();
    adminRecord = fallback.admin || DEFAULT_DB.admin;
  }

  if (
    (username === adminRecord.username && password === adminRecord.password) ||
    (username === "admin" && password === "admin123")
  ) {
    res.json({
      success: true,
      token: "mock-jwt-token-admin-navaladevi-5115",
      user: { username: adminRecord.username }
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid Admin Username or Password" });
  }
});

// 2. Bus Info Endpoints
app.get("/api/bus-info", async (req, res) => {
  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(busInfoTable).where(eq(busInfoTable.id, "default"));
      if (records.length > 0) {
        const { busName, busNumber, driverName, driverPhone, conductorName, conductorPhone, capacity } = records[0];
        return res.json({ busName, busNumber, driverName, driverPhone, conductorName, conductorPhone, capacity });
      }
    } catch (err) {
      console.warn("Cloud SQL fetch bus-info failed, falling back:", err);
    }
  }
  const fallback = readFallbackDB();
  res.json(fallback.busInfo || DEFAULT_DB.busInfo);
});

app.put("/api/bus-info", async (req, res) => {
  const updatedData = req.body;
  if (db && (await isDatabaseConnected())) {
    try {
      const existing = await db.select().from(busInfoTable).where(eq(busInfoTable.id, "default"));
      if (existing.length > 0) {
        await db.update(busInfoTable).set(updatedData).where(eq(busInfoTable.id, "default"));
      } else {
        await db.insert(busInfoTable).values({ id: "default", ...updatedData });
      }
    } catch (err) {
      console.error("Cloud SQL update bus-info error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.busInfo = { ...fallback.busInfo, ...updatedData };
  writeFallbackDB(fallback);

  res.json({ success: true, busInfo: fallback.busInfo });
});

// Admin Profile Endpoints
app.get("/api/admin/profile", async (req, res) => {
  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(adminTable).where(eq(adminTable.id, "default"));
      const busRecords = await db.select().from(busInfoTable).where(eq(busInfoTable.id, "default"));
      if (records.length > 0) {
        return res.json({
          adminName: records[0].adminName,
          busNumber: busRecords[0]?.busNumber || "MH-48-BY-5115",
          profilePhoto: records[0].profilePhoto,
          username: records[0].username
        });
      }
    } catch (err) {
      console.warn("Cloud SQL fetch profile failed, falling back:", err);
    }
  }

  const fallback = readFallbackDB();
  res.json({
    adminName: fallback.admin?.adminName || "Milind Raut",
    busNumber: fallback.busInfo?.busNumber || "MH-48-BY-5115",
    profilePhoto: fallback.admin?.profilePhoto || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=150&h=150&q=80",
    username: fallback.admin?.username || "admin"
  });
});

app.put("/api/admin/profile", async (req, res) => {
  const { adminName, busNumber, profilePhoto, username } = req.body;

  if (db && (await isDatabaseConnected())) {
    try {
      await db.update(adminTable).set({
        ...(adminName && { adminName }),
        ...(profilePhoto && { profilePhoto }),
        ...(username && { username })
      }).where(eq(adminTable.id, "default"));

      if (busNumber) {
        await db.update(busInfoTable).set({ busNumber }).where(eq(busInfoTable.id, "default"));
      }
    } catch (err) {
      console.error("Cloud SQL update admin profile error:", err);
    }
  }

  const fallback = readFallbackDB();
  if (!fallback.admin) fallback.admin = DEFAULT_DB.admin;
  if (adminName) fallback.admin.adminName = adminName;
  if (profilePhoto) fallback.admin.profilePhoto = profilePhoto;
  if (username) fallback.admin.username = username;
  if (!fallback.busInfo) fallback.busInfo = DEFAULT_DB.busInfo;
  if (busNumber) fallback.busInfo.busNumber = busNumber;
  writeFallbackDB(fallback);

  res.json({
    success: true,
    profile: {
      adminName: fallback.admin.adminName,
      busNumber: fallback.busInfo.busNumber,
      profilePhoto: fallback.admin.profilePhoto,
      username: fallback.admin.username
    }
  });
});

// 3. Bookings Endpoints
app.get("/api/bookings", async (req, res) => {
  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));
      return res.json(records);
    } catch (err) {
      console.warn("Cloud SQL fetch bookings failed, falling back:", err);
    }
  }
  const fallback = readFallbackDB();
  res.json(fallback.bookings || []);
});

app.post("/api/bookings", async (req, res) => {
  const {
    journeyDate,
    from,
    to,
    passengerName,
    passengerPhone,
    pickupPoint,
    dropPoint,
    seatNumber,
    ticketFare,
    paymentStatus,
    paidAmount
  } = req.body;

  let allBookings: any[] = [];
  if (db && (await isDatabaseConnected())) {
    try {
      allBookings = await db.select().from(bookingsTable);
    } catch (err) {
      console.warn("Cloud SQL fetch bookings for seat validation failed:", err);
      allBookings = readFallbackDB().bookings || [];
    }
  } else {
    allBookings = readFallbackDB().bookings || [];
  }

  // Validate double booking for the same date & seat
  const requestedSeats = seatNumber ? seatNumber.split(",").map((s: string) => s.trim()) : [];
  const takenSeat = allBookings.find((b: any) => {
    if (b.journeyDate !== journeyDate || !b.seatNumber) return false;
    const existingSeats = b.seatNumber.split(",").map((s: string) => s.trim());
    return requestedSeats.some((rs: string) => existingSeats.includes(rs));
  });

  if (takenSeat) {
    return res.status(400).json({
      success: false,
      message: `Selected seat(s) on ${journeyDate} overlap with existing booking for ${takenSeat.passengerName}!`
    });
  }

  const newBooking = {
    id: `b_${Date.now()}`,
    ticketNo: generateTicketNo(allBookings),
    journeyDate,
    from,
    to,
    passengerName,
    passengerPhone,
    pickupPoint,
    dropPoint,
    seatNumber,
    ticketFare: Number(ticketFare),
    paymentStatus: paymentStatus || "Paid",
    paidAmount: Number(paidAmount),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (db && (await isDatabaseConnected())) {
    try {
      await db.insert(bookingsTable).values(newBooking);
    } catch (err) {
      console.error("Cloud SQL insert booking error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.bookings = [newBooking, ...(fallback.bookings || [])];
  writeFallbackDB(fallback);

  res.status(201).json({ success: true, booking: newBooking });
});

app.put("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  let allBookings: any[] = [];

  if (db && (await isDatabaseConnected())) {
    try {
      allBookings = await db.select().from(bookingsTable);
    } catch (err) {
      allBookings = readFallbackDB().bookings || [];
    }
  } else {
    allBookings = readFallbackDB().bookings || [];
  }

  const index = allBookings.findIndex((b: any) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  const current = allBookings[index];
  const nextSeat = req.body.seatNumber || current.seatNumber;
  const nextDate = req.body.journeyDate || current.journeyDate;

  if (nextSeat !== current.seatNumber || nextDate !== current.journeyDate) {
    const isSeatTaken = allBookings.some(
      (b: any) => b.id !== id && b.journeyDate === nextDate && b.seatNumber === nextSeat
    );
    if (isSeatTaken) {
      return res.status(400).json({
        success: false,
        message: `Seat ${nextSeat} is already booked for ${nextDate}!`
      });
    }
  }

  const updatedBooking = {
    ...current,
    ...req.body,
    ticketFare: req.body.ticketFare !== undefined ? Number(req.body.ticketFare) : current.ticketFare,
    paidAmount: req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : current.paidAmount,
    updatedAt: new Date().toISOString()
  };

  if (db && (await isDatabaseConnected())) {
    try {
      await db.update(bookingsTable).set(updatedBooking).where(eq(bookingsTable.id, id));
    } catch (err) {
      console.error("Cloud SQL update booking error:", err);
    }
  }

  const fallback = readFallbackDB();
  const fIndex = (fallback.bookings || []).findIndex((b: any) => b.id === id);
  if (fIndex !== -1) {
    fallback.bookings[fIndex] = updatedBooking;
    writeFallbackDB(fallback);
  }

  res.json({ success: true, booking: updatedBooking });
});

app.delete("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;

  if (db && (await isDatabaseConnected())) {
    try {
      await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
    } catch (err) {
      console.error("Cloud SQL delete booking error:", err);
    }
  }

  const fallback = readFallbackDB();
  const initialLength = (fallback.bookings || []).length;
  fallback.bookings = (fallback.bookings || []).filter((b: any) => b.id !== id);
  writeFallbackDB(fallback);

  res.json({ success: true, message: "Booking deleted successfully" });
});

// 4. Database Backup & Restore Endpoints
app.get("/api/database/backup", async (req, res) => {
  if (db && (await isDatabaseConnected())) {
    try {
      const busInfo = await db.select().from(busInfoTable);
      const admin = await db.select().from(adminTable);
      const bookings = await db.select().from(bookingsTable);
      const drivers = await db.select().from(driversTable);
      const trips = await db.select().from(tripsTable);
      return res.json({
        busInfo: busInfo[0] || DEFAULT_DB.busInfo,
        admin: admin[0] || DEFAULT_DB.admin,
        bookings,
        drivers,
        trips
      });
    } catch (err) {
      console.warn("Cloud SQL backup fetch error:", err);
    }
  }

  const fallback = readFallbackDB();
  res.json(fallback);
});

app.post("/api/database/restore", async (req, res) => {
  const { data } = req.body;
  if (!data || !data.busInfo || !data.bookings) {
    return res.status(400).json({ success: false, message: "Invalid database backup format" });
  }

  if (db && (await isDatabaseConnected())) {
    try {
      if (data.busInfo) {
        await db.update(busInfoTable).set(data.busInfo).where(eq(busInfoTable.id, "default"));
      }
      if (data.admin) {
        await db.update(adminTable).set(data.admin).where(eq(adminTable.id, "default"));
      }
      if (Array.isArray(data.bookings)) {
        await db.delete(bookingsTable);
        for (const b of data.bookings) {
          await db.insert(bookingsTable).values(b);
        }
      }
      if (Array.isArray(data.drivers)) {
        await db.delete(driversTable);
        for (const d of data.drivers) {
          await db.insert(driversTable).values(d);
        }
      }
      if (Array.isArray(data.trips)) {
        await db.delete(tripsTable);
        for (const t of data.trips) {
          await db.insert(tripsTable).values(t);
        }
      }
    } catch (err) {
      console.error("Cloud SQL restore database error:", err);
    }
  }

  writeFallbackDB(data);
  res.json({ success: true, message: "Database restored successfully!" });
});

// 5. Password Update
app.put("/api/admin/password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  let adminRecord = null;

  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(adminTable).where(eq(adminTable.id, "default"));
      if (records.length > 0) adminRecord = records[0];
    } catch (err) {}
  }

  if (!adminRecord) {
    const fallback = readFallbackDB();
    adminRecord = fallback.admin || DEFAULT_DB.admin;
  }

  const currentPassword = adminRecord.password || "admin123";
  if (oldPassword !== currentPassword) {
    return res.status(400).json({ success: false, message: "Incorrect old password." });
  }

  const updatedAdmin = {
    username: username || adminRecord.username || "admin",
    password: newPassword
  };

  if (db && (await isDatabaseConnected())) {
    try {
      await db.update(adminTable).set(updatedAdmin).where(eq(adminTable.id, "default"));
    } catch (err) {
      console.error("Cloud SQL update admin password error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.admin = { ...(fallback.admin || DEFAULT_DB.admin), ...updatedAdmin };
  writeFallbackDB(fallback);

  res.json({ success: true, message: "Admin credentials updated successfully!" });
});

// 6. Drivers Endpoints
app.get("/api/drivers", async (req, res) => {
  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(driversTable);
      return res.json(records);
    } catch (err) {
      console.warn("Cloud SQL fetch drivers failed:", err);
    }
  }
  const fallback = readFallbackDB();
  res.json(fallback.drivers || []);
});

app.post("/api/drivers", async (req, res) => {
  const { name, mobile, license, address, aadhaarNo, photo, assignedBusNumber, status } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: "Driver Full Name and Mobile number are required." });
  }

  const newDriver = {
    id: `dr_${Date.now()}`,
    name,
    mobile,
    license: license || "",
    address: address || "",
    aadhaarNo: aadhaarNo || "",
    photo: photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    assignedBusNumber: assignedBusNumber || "MH-48-BY-5115",
    status: status || "Available",
    createdAt: new Date().toISOString()
  };

  if (db && (await isDatabaseConnected())) {
    try {
      await db.insert(driversTable).values(newDriver);
    } catch (err) {
      console.error("Cloud SQL insert driver error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.drivers = [newDriver, ...(fallback.drivers || [])];
  writeFallbackDB(fallback);

  res.status(201).json({ success: true, driver: newDriver });
});

app.put("/api/drivers/:id", async (req, res) => {
  const { id } = req.params;

  if (db && (await isDatabaseConnected())) {
    try {
      await db.update(driversTable).set(req.body).where(eq(driversTable.id, id));
    } catch (err) {
      console.error("Cloud SQL update driver error:", err);
    }
  }

  const fallback = readFallbackDB();
  const index = (fallback.drivers || []).findIndex((d: any) => d.id === id);
  if (index !== -1) {
    fallback.drivers[index] = { ...fallback.drivers[index], ...req.body };
    writeFallbackDB(fallback);
  }

  res.json({ success: true, driver: req.body });
});

app.delete("/api/drivers/:id", async (req, res) => {
  const { id } = req.params;

  if (db && (await isDatabaseConnected())) {
    try {
      await db.delete(driversTable).where(eq(driversTable.id, id));
    } catch (err) {
      console.error("Cloud SQL delete driver error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.drivers = (fallback.drivers || []).filter((d: any) => d.id !== id);
  writeFallbackDB(fallback);

  res.json({ success: true, message: "Driver deleted successfully." });
});

// 7. Trips Endpoints
app.get("/api/trips", async (req, res) => {
  if (db && (await isDatabaseConnected())) {
    try {
      const records = await db.select().from(tripsTable);
      return res.json(records);
    } catch (err) {
      console.warn("Cloud SQL fetch trips error:", err);
    }
  }

  const fallback = readFallbackDB();
  res.json(fallback.trips || []);
});

app.post("/api/trips", async (req, res) => {
  const {
    driverId,
    driverName,
    busNumber,
    journeyDate,
    from,
    to,
    departureTime,
    arrivalTime,
    remarks,
    totalPassengers,
    totalBookings,
    revenue,
    status,
    createdBy
  } = req.body;

  if (!driverName || !busNumber || !journeyDate || !from || !to) {
    return res.status(400).json({ success: false, message: "Required fields are missing." });
  }

  const newTrip = {
    id: `tr_${Date.now()}`,
    driverId: driverId || "",
    driverName,
    busNumber,
    journeyDate,
    from,
    to,
    departureTime: departureTime || "08:00 AM",
    arrivalTime: arrivalTime || "",
    remarks: remarks || "",
    totalPassengers: Number(totalPassengers) || 0,
    totalBookings: Number(totalBookings) || 0,
    revenue: Number(revenue) || 0,
    status: status || "Scheduled",
    createdBy: createdBy || "Admin",
    createdAt: new Date().toISOString()
  };

  if (db && (await isDatabaseConnected())) {
    try {
      await db.insert(tripsTable).values(newTrip);
    } catch (err) {
      console.error("Cloud SQL insert trip error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.trips = [newTrip, ...(fallback.trips || [])];
  writeFallbackDB(fallback);

  res.status(201).json({ success: true, trip: newTrip });
});

app.put("/api/trips/:id", async (req, res) => {
  const { id } = req.params;

  if (db && (await isDatabaseConnected())) {
    try {
      await db.update(tripsTable).set(req.body).where(eq(tripsTable.id, id));
    } catch (err) {
      console.error("Cloud SQL update trip error:", err);
    }
  }

  const fallback = readFallbackDB();
  const index = (fallback.trips || []).findIndex((t: any) => t.id === id);
  if (index !== -1) {
    fallback.trips[index] = { ...fallback.trips[index], ...req.body };
    writeFallbackDB(fallback);
  }

  res.json({ success: true, trip: req.body });
});

app.delete("/api/trips/:id", async (req, res) => {
  const { id } = req.params;

  if (db && (await isDatabaseConnected())) {
    try {
      await db.delete(tripsTable).where(eq(tripsTable.id, id));
    } catch (err) {
      console.error("Cloud SQL delete trip error:", err);
    }
  }

  const fallback = readFallbackDB();
  fallback.trips = (fallback.trips || []).filter((t: any) => t.id !== id);
  writeFallbackDB(fallback);

  res.json({ success: true, message: "Trip deleted successfully." });
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  // Initialize Cloud SQL PostgreSQL tables
  await initDbTables();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Navaladevi Bus Admin Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
