"use server";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// --- Shared status guard ---
async function requirePendingOrder(orderId: string, labId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.laboratoryId, labId)))
    .limit(1);
  return rows[0]?.status === "pending" ? rows[0] : null;
}

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

// ORD-06: Validate order — sets status=validated, records who and when
export async function validateOrderAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  const orderId = formData.get("orderId") as string;

  if (!orderId) return;

  const order = await requirePendingOrder(orderId, lab.id);
  if (!order) return; // already validated or not found — silently reject

  await db
    .update(orders)
    .set({
      status: "validated",
      validatedById: user.id,
      validatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  revalidatePath(`/dashboard/ordenes/${orderId}`);
}
