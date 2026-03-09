import Link from "next/link";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createOrderAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const errorMessages: Record<string, string> = {
  campos_requeridos: "Por favor complete todos los campos obligatorios.",
  paciente_no_encontrado: "El paciente seleccionado no fue encontrado o no pertenece a este laboratorio.",
};

export default async function NuevaOrdenPage({ searchParams }: PageProps) {
  const { lab } = await getLabUser();
  const { error } = await searchParams;

  const patientRows = await db
    .select()
    .from(patients)
    .where(eq(patients.laboratoryId, lab.id))
    .orderBy(patients.lastName);

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/dashboard/ordenes"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Volver a órdenes
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          Nueva orden
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessages[error] ?? "Ha ocurrido un error. Intente nuevamente."}
          </div>
        )}

        <form action={createOrderAction} className="space-y-4">
          <div>
            <label
              htmlFor="patientId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Paciente <span className="text-red-500">*</span>
            </label>
            <select
              id="patientId"
              name="patientId"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccione un paciente...</option>
              {patientRows.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} ({p.documentType} {p.documentNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="orderNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Número de orden <span className="text-red-500">*</span>
            </label>
            <input
              id="orderNumber"
              name="orderNumber"
              type="text"
              required
              placeholder="Ej. ORD-2024-001"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Crear orden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
