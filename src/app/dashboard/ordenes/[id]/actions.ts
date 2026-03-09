"use server";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orders, orderItems, patients, notifications, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateResultPDF, type ResultPDFData } from "@/lib/pdf/generate-pdf";
import { generateQRDataUrl } from "@/lib/pdf/generate-qr";
import { uploadPDF } from "@/lib/storage/upload-pdf";
import { sendResultadoListo } from "@/lib/whatsapp/send-template";

// --- Shared status guard ---
async function requirePendingOrder(orderId: string, labId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.laboratoryId, labId)))
    .limit(1);
  return rows[0]?.status === "pending" ? rows[0] : null;
}

// INFRA-06: Zod schema for validate action input
const ValidateActionSchema = z.object({
  orderId: z.string().uuid("orderId must be a UUID"),
});

// ORD-04: Add a result item to a pending order
export async function addResultItemAction(formData: FormData) {
  const { lab } = await getLabUser();
  const orderId = formData.get("orderId") as string;
  const testName = (formData.get("testName") as string)?.trim();
  const value = (formData.get("value") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim() || null;
  const referenceRange = (formData.get("referenceRange") as string)?.trim() || null;
  const flag = (formData.get("flag") as string) || "normal";

  if (!orderId || !testName || !value) return;

  const order = await requirePendingOrder(orderId, lab.id);
  if (!order) return; // order not found or already validated — silently reject

  const validFlags = ["normal", "high", "low", "critical"];
  const safeFlag = validFlags.includes(flag) ? flag as "normal" | "high" | "low" | "critical" : "normal";

  await db.insert(orderItems).values({ orderId, testName, value, unit, referenceRange, flag: safeFlag });
  revalidatePath(`/dashboard/ordenes/${orderId}`);
}

// ORD-05: PDF upload stub — stores filename placeholder only (actual storage in Phase 3)
export async function uploadPdfAction(formData: FormData) {
  const { lab } = await getLabUser();
  const orderId = formData.get("orderId") as string;
  const file = formData.get("file") as File | null;

  if (!orderId || !file) return;

  // Server-side content-type validation (client accept= is UI-only)
  if (file.type !== "application/pdf") return;

  const order = await requirePendingOrder(orderId, lab.id);
  if (!order) return;

  // Phase 2: store placeholder path only — no binary written to storage
  // Phase 3 will configure bodySizeLimit and upload to Supabase Storage
  const placeholder = `pending-upload/${file.name}`;

  await db
    .update(orders)
    .set({ pdfPath: placeholder })
    .where(eq(orders.id, orderId));

  revalidatePath(`/dashboard/ordenes/${orderId}`);
}

// ORD-06 / DEL-01 / DEL-02 / DEL-03 / DEL-04: Full validate-and-send pipeline
export async function validateAndSendAction(formData: FormData) {
  const { lab, user } = await getLabUser();

  // Zod validation (INFRA-06)
  const parsed = ValidateActionSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return; // silently reject invalid input

  const { orderId } = parsed.data;

  // 1. Verify order is pending and belongs to this lab
  const order = await requirePendingOrder(orderId, lab.id);
  if (!order) return;

  // 2. Mark validated FIRST (idempotency — if PDF/WhatsApp fail, order is still validated)
  await db
    .update(orders)
    .set({ status: "validated", validatedById: user.id, validatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // 3. Fetch patient data for PDF
  const patientRows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, order.patientId), eq(patients.laboratoryId, lab.id)))
    .limit(1);
  const patient = patientRows[0];
  if (!patient) {
    // Patient data missing — log and bail (order is still validated above)
    console.error("validateAndSendAction: patient not found for order", orderId);
    revalidatePath(`/dashboard/ordenes/${orderId}`);
    return;
  }

  // 4. Fetch result items for PDF
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.createdAt);

  // 5. Generate PDF
  const validatedAt = new Date();
  const qrUrl = `https://labflash.co/verify/${order.verificationCode}`;
  const qrDataUrl = await generateQRDataUrl(qrUrl);

  // Fetch lab logo as base64 for PDF embedding (if logoUrl is set)
  let logoBase64: string | null = null;
  if (lab.logoUrl) {
    try {
      const res = await fetch(lab.logoUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const contentType = res.headers.get("content-type") ?? "image/png";
        logoBase64 = `data:${contentType};base64,${base64}`;
      }
    } catch {
      // Logo fetch failed — PDF generated without logo
    }
  }

  const pdfData: ResultPDFData = {
    lab: { name: lab.name, address: lab.address ?? null, phone: lab.phone ?? null, logoBase64 },
    patient: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      documentType: patient.documentType,
      documentNumber: patient.documentNumber,
      dateOfBirth: patient.dateOfBirth,
    },
    order: {
      orderNumber: order.orderNumber,
      createdAt: new Date(order.createdAt).toLocaleDateString("es-CO"),
      validatedAt: validatedAt.toLocaleDateString("es-CO"),
    },
    items: items.map((i) => ({
      testName: i.testName,
      value: i.value,
      unit: i.unit,
      referenceRange: i.referenceRange,
      flag: i.flag,
    })),
    validatedByName: user.fullName,
    qrDataUrl,
    verificationCode: order.verificationCode,
  };

  let storagePath: string | null = null;
  try {
    const pdfBuffer = await generateResultPDF(pdfData);
    storagePath = `results/${orderId}.pdf`;
    await uploadPDF(pdfBuffer, storagePath);

    // Update orders.pdf_path after successful upload
    await db
      .update(orders)
      .set({ pdfPath: storagePath })
      .where(eq(orders.id, orderId));
  } catch (err) {
    console.error("PDF generation or upload failed:", err);
    // Continue — WhatsApp still attempted if patient has a phone
  }

  // 6. Send WhatsApp (isolated try/catch — failure must not block validation)
  let wamid: string | null = null;
  if (patient.phone) {
    try {
      wamid = await sendResultadoListo(
        patient.phone,
        patient.firstName,
        lab.name,
        order.verificationCode
      );
    } catch (err) {
      console.error("WhatsApp send failed:", err);
      // wamid remains null — notifications row will have status=failed
    }
  }

  // 7. Create notifications record
  await db.insert(notifications).values({
    orderId,
    laboratoryId: lab.id,
    channel: "whatsapp",
    status: wamid ? "sent" : "failed",
    whatsappMessageId: wamid,
  });

  // 8. Advance order to delivered if WhatsApp succeeded
  if (wamid) {
    await db
      .update(orders)
      .set({ status: "delivered" })
      .where(eq(orders.id, orderId));
  }

  // 9. Audit log
  try {
    await db.insert(auditLog).values({
      laboratoryId: lab.id,
      userId: user.id,
      action: "notification_sent",
      targetId: orderId,
    });
  } catch (err) {
    console.error("Audit log insert failed:", err);
  }

  revalidatePath(`/dashboard/ordenes/${orderId}`);
  revalidatePath("/dashboard/ordenes");
}
