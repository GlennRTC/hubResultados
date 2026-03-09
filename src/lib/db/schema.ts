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

export const documentTypeEnum = pgEnum("document_type", ["CC", "CE", "PA", "RC", "TI"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "validated", "delivered"]);
export const resultFlagEnum = pgEnum("result_flag", ["normal", "high", "low", "critical"]);

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  laboratoryId: uuid("laboratory_id")
    .notNull()
    .references(() => laboratories.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(), // ISO "YYYY-MM-DD"
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  laboratoryId: uuid("laboratory_id")
    .notNull()
    .references(() => laboratories.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  verificationCode: text("verification_code").notNull().unique(),
  pdfPath: text("pdf_path"),
  validatedById: uuid("validated_by_id").references(() => labUsers.id),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  testName: text("test_name").notNull(),
  value: text("value").notNull(),
  unit: text("unit"),
  referenceRange: text("reference_range"),
  flag: resultFlagEnum("flag").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
