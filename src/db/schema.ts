import { pgTable, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const busInfoTable = pgTable("bus_info", {
  id: text("id").primaryKey().default("default"),
  busName: text("bus_name").notNull().default("श्री नवलादेवी प्रसन्न"),
  busNumber: text("bus_number").notNull().default("MH-48-BY-5115"),
  driverName: text("driver_name").notNull().default("Shantaram Patil"),
  driverPhone: text("driver_phone").notNull().default("9876543210"),
  conductorName: text("conductor_name").notNull().default("Milind Raut"),
  conductorPhone: text("conductor_phone").notNull().default("9123456789"),
  capacity: integer("capacity").notNull().default(45),
});

export const adminTable = pgTable("admin", {
  id: text("id").primaryKey().default("default"),
  username: text("username").notNull().default("admin"),
  password: text("password").notNull().default("admin123"),
  adminName: text("admin_name").notNull().default("Milind Raut"),
  profilePhoto: text("profile_photo").notNull().default("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=150&h=150&q=80"),
});

export const bookingsTable = pgTable("bookings", {
  id: text("id").primaryKey(),
  ticketNo: text("ticket_no").notNull(),
  journeyDate: text("journey_date").notNull(),
  from: text("from_location").notNull(),
  to: text("to_location").notNull(),
  passengerName: text("passenger_name").notNull(),
  passengerPhone: text("passenger_phone").notNull(),
  pickupPoint: text("pickup_point").notNull(),
  dropPoint: text("drop_point").notNull(),
  seatNumber: text("seat_number").notNull(),
  ticketFare: doublePrecision("ticket_fare").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("Paid"),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const driversTable = pgTable("drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  license: text("license"),
  address: text("address"),
  aadhaarNo: text("aadhaar_no"),
  photo: text("photo"),
  assignedBusNumber: text("assigned_bus_number"),
  status: text("status").default("Available"),
  createdAt: text("created_at"),
});

export const tripsTable = pgTable("trips", {
  id: text("id").primaryKey(),
  driverId: text("driver_id"),
  driverName: text("driver_name").notNull(),
  busNumber: text("bus_number").notNull(),
  journeyDate: text("journey_date").notNull(),
  from: text("from_location").notNull(),
  to: text("to_location").notNull(),
  departureTime: text("departure_time"),
  arrivalTime: text("arrival_time"),
  remarks: text("remarks"),
  totalPassengers: integer("total_passengers").notNull().default(0),
  totalBookings: integer("total_bookings").default(0),
  revenue: doublePrecision("revenue").notNull().default(0),
  status: text("status").default("Scheduled"),
  createdAt: text("created_at"),
  createdBy: text("created_by"),
});
