import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

function getConnectionString(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER) {
    const user = process.env.POSTGRES_USER;
    const pass = process.env.POSTGRES_PASSWORD || "";
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT || "5432";
    const db = process.env.POSTGRES_DB || "postgres";
    return `postgres://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }
  return "postgresql://postgres.ewzjuuoooegvcjzbqepe:navaladevi%40135@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
}

const connectionString = getConnectionString();
console.log("[Supabase] Connecting to PostgreSQL at:", connectionString ? connectionString.replace(/:[^:@]+@/, ":***@") : "none");

export const client = connectionString
  ? postgres(connectionString, { max: 10, idle_timeout: 20, ssl: "require", connect_timeout: 10, prepare: false })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export async function isDatabaseConnected(): Promise<boolean> {
  if (!db || !client) return false;
  try {
    await client`SELECT 1`;
    return true;
  } catch (err) {
    console.warn("[Supabase] Direct PostgreSQL connection check warning/error:", err);
    return false;
  }
}
