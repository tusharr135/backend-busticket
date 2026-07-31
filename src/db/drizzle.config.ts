import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: [
    "./src/db/schema.ts",
    "./schema.ts"
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/postgres",
  },
});
