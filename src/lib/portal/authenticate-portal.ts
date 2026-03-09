import { z } from "zod";
import { db } from "@/lib/db";
import { orders, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, recordAttempt } from "./rate-limit";

// INFRA-06: Zod schema for portal auth input
const PortalAuthSchema = z.object({
  verificationCode: z.string().min(1).max(50),
  documentType: z.enum(["CC", "CE", "PA", "RC", "TI", "CI"]),
  documentNumber: z.string().min(1).max(30),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
});

type AuthResult =
  | { success: true; orderId: string; pdfPath: string | null }
  | { success: false; error: string };

const GENERIC_ERROR = "Datos no coinciden"; // No field-specific hints — security requirement

export async function authenticatePortal(
  verificationCode: string,
  documentType: string,
  documentNumber: string,
  dateOfBirth: string
): Promise<AuthResult> {
  // 1. Validate inputs with Zod
  const parsed = PortalAuthSchema.safeParse({
    verificationCode,
    documentType,
    documentNumber,
    dateOfBirth,
  });
  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR };
  }
  const data = parsed.data;

  // 2. Check rate limit BEFORE DB lookup
  const { allowed } = await checkRateLimit(data.verificationCode);
  if (!allowed) {
    return { success: false, error: "Demasiados intentos. Intente de nuevo en 1 hora." };
  }

  // 3. Record attempt BEFORE validation (counts regardless of outcome)
  await recordAttempt(data.verificationCode);

  // 4. Find order by verification code with patient info
  const rows = await db
    .select({
      orderId: orders.id,
      pdfPath: orders.pdfPath,
      status: orders.status,
      docType: patients.documentType,
      docNumber: patients.documentNumber,
      dob: patients.dateOfBirth,
    })
    .from(orders)
    .innerJoin(patients, eq(orders.patientId, patients.id))
    .where(eq(orders.verificationCode, data.verificationCode))
    .limit(1);

  const row = rows[0];

  // 5. Validate patient identity — generic error on any mismatch (no hints)
  if (
    !row ||
    row.docType !== data.documentType ||
    row.docNumber !== data.documentNumber ||
    row.dob !== data.dateOfBirth
  ) {
    return { success: false, error: GENERIC_ERROR };
  }

  // 6. Order must be validated or delivered (not pending) to have results
  if (row.status === "pending") {
    return { success: false, error: "Los resultados aún no han sido validados." };
  }

  return { success: true, orderId: row.orderId, pdfPath: row.pdfPath };
}
