import { db } from "@/lib/db";
import { orders, patients, laboratories, labUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type VerificationData = {
  labName: string;
  patientPartialName: string; // "Ana G." — first name + last initial
  orderDate: string;          // ISO date string
  validatedAt: string | null; // ISO date string
  validatedByName: string | null;
};

export async function getVerificationData(
  verificationCode: string
): Promise<VerificationData | null> {
  if (!verificationCode || verificationCode.length > 50) return null;

  const rows = await db
    .select({
      labName: laboratories.name,
      firstName: patients.firstName,
      lastName: patients.lastName,
      orderCreatedAt: orders.createdAt,
      validatedAt: orders.validatedAt,
      validatedByName: labUsers.fullName,
    })
    .from(orders)
    .innerJoin(patients, eq(orders.patientId, patients.id))
    .innerJoin(laboratories, eq(orders.laboratoryId, laboratories.id))
    .leftJoin(labUsers, eq(orders.validatedById, labUsers.id))
    .where(eq(orders.verificationCode, verificationCode))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const lastInitial = row.lastName ? row.lastName[0] + "." : "";
  return {
    labName: row.labName,
    patientPartialName: `${row.firstName} ${lastInitial}`,
    orderDate: row.orderCreatedAt.toISOString(),
    validatedAt: row.validatedAt?.toISOString() ?? null,
    validatedByName: row.validatedByName ?? null,
  };
}
