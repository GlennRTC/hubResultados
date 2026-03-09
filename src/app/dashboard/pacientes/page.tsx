import Link from "next/link";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PacientesPage({ searchParams }: PageProps) {
  const { lab } = await getLabUser();
  const { q } = await searchParams;

  const patientList = q
    ? await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.laboratoryId, lab.id),
            or(
              ilike(patients.firstName, `%${q}%`),
              ilike(patients.lastName, `%${q}%`),
              ilike(patients.documentNumber, `%${q}%`)
            )
          )
        )
    : await db
        .select()
        .from(patients)
        .where(eq(patients.laboratoryId, lab.id))
        .orderBy(patients.createdAt)
        .limit(50);

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pacientes</h1>
        <Link
          href="/dashboard/pacientes/nuevo"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Nuevo paciente
        </Link>
      </div>

      {/* Search form — GET method, no JavaScript required */}
      <form method="GET" action="/dashboard/pacientes" className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o documento..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Buscar
          </button>
          {q && (
            <Link
              href="/dashboard/pacientes"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {patientList.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {q
            ? `No se encontraron pacientes para "${q}".`
            : "No se encontraron pacientes."}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre completo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de nacimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patientList.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link
                      href={`/dashboard/pacientes/${patient.id}`}
                      className="block"
                    >
                      <span className="font-medium text-gray-500">
                        {patient.documentType}
                      </span>{" "}
                      {patient.documentNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link
                      href={`/dashboard/pacientes/${patient.id}`}
                      className="block font-medium hover:text-blue-600"
                    >
                      {patient.firstName} {patient.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <Link
                      href={`/dashboard/pacientes/${patient.id}`}
                      className="block"
                    >
                      {new Date(
                        patient.dateOfBirth + "T00:00:00"
                      ).toLocaleDateString("es-CO")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <Link
                      href={`/dashboard/pacientes/${patient.id}`}
                      className="block"
                    >
                      {patient.phone ?? "—"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
