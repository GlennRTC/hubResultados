import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Direct connection (port 5432) for migrations — NOT the pooler
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
} satisfies Config;
