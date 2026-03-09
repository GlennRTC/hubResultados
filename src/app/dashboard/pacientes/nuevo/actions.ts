"use server";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";

export async function createPatientAction(formData: FormData) {
  const { lab } = await getLabUser();

  const documentType = formData.get("documentType") as string;
  const documentNumber = (formData.get("documentNumber") as string)?.trim();
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const dateOfBirth = formData.get("dateOfBirth") as string;
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!documentType || !documentNumber || !firstName || !lastName || !dateOfBirth) {
    redirect("/dashboard/pacientes/nuevo?error=campos_requeridos");
  }

  // Validate documentType is a valid enum value
  const validDocTypes = ["CC", "CE", "PA", "RC", "TI"];
  if (!validDocTypes.includes(documentType)) {
    redirect("/dashboard/pacientes/nuevo?error=tipo_documento_invalido");
  }

  await db.insert(patients).values({
    laboratoryId: lab.id,
    documentType: documentType as "CC" | "CE" | "PA" | "RC" | "TI",
    documentNumber,
    firstName,
    lastName,
    dateOfBirth,
    phone,
  });

  redirect("/dashboard/pacientes");
}
