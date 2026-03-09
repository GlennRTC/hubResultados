"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticatePortal } from "@/lib/portal/authenticate-portal";
import { db } from "@/lib/db";
import { orders, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function authenticateAndSetCookieAction(
  verificationCode: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const documentType = formData.get("documentType") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;

  const result = await authenticatePortal(
    verificationCode,
    documentType,
    documentNumber,
    dateOfBirth
  );

  if (!result.success) {
    return { error: result.error };
  }

  // Set a short-lived httpOnly cookie to mark this session as authenticated
  const cookieStore = await cookies();
  cookieStore.set(`portal_${verificationCode}`, "verified", {
    httpOnly: true,
    maxAge: 3600, // 1 hour — matches signed URL expiry
    path: `/r/${verificationCode}`,
    sameSite: "lax",
  });

  // Audit log: result_viewed — fire and forget, must not block access
  try {
    const orderRows = await db
      .select({ laboratoryId: orders.laboratoryId })
      .from(orders)
      .where(eq(orders.id, result.orderId))
      .limit(1);

    if (orderRows[0]) {
      await db.insert(auditLog).values({
        laboratoryId: orderRows[0].laboratoryId,
        action: "result_viewed",
        targetId: result.orderId,
      });
    }
  } catch {
    // audit log failure must not block access
  }

  redirect(`/r/${verificationCode}`);
}
