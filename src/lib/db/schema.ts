import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "technician", "reception"]);

export const planEnum = pgEnum("plan", ["free", "pro"]);

export const laboratories = pgTable("laboratories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country").notNull().default("CO"),
  whatsappPhoneId: text("whatsapp_phone_id"),
  whatsappToken: text("whatsapp_token"),
  plan: planEnum("plan").notNull().default("free"),
  resultsThisMonth: integer("results_this_month").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const labUsers = pgTable("lab_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  laboratoryId: uuid("laboratory_id")
    .notNull()
    .references(() => laboratories.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("technician"),
  authUserId: uuid("auth_user_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Laboratory = typeof laboratories.$inferSelect;
export type NewLaboratory = typeof laboratories.$inferInsert;
export type LabUser = typeof labUsers.$inferSelect;
export type NewLabUser = typeof labUsers.$inferInsert;
