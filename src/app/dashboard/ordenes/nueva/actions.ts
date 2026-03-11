"use server";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { patients, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function createOrderAction(formData: FormData) {
  const { lab } = await getLabUser();

  const patientId = (formData.get("patientId") as string)?.trim();
  const orderNumber = (formData.get("orderNumber") as string)?.trim();

  if (!patientId || !orderNumber) {
    redirect("/dashboard/ordenes/nueva?error=campos_requeridos");
  }

  // Verify the patient belongs to this lab (security check)
  const patientRows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.laboratoryId, lab.id)))
    .limit(1);

  if (!patientRows[0]) {
    redirect("/dashboard/ordenes/nueva?error=paciente_no_encontrado");
  }

  const verificationCode = Buffer.from(
    crypto.getRandomValues(new Uint8Array(9))
  ).toString("base64url");

  const [newOrder] = await db
    .insert(orders)
    .values({
      laboratoryId: lab.id,
      patientId,
      orderNumber,
      verificationCode,
    })
    .returning({ id: orders.id });

  redirect(`/dashboard/ordenes/${newOrder.id}`);
}
