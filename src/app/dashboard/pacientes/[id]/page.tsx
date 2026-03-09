import Link from "next/link";
import { notFound } from "next/navigation";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { patients, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  validated: "Validado",
  delivered: "Entregado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  validated: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
};

export default async function PacienteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { lab } = await getLabUser();

  // Fetch patient scoped to both id AND laboratoryId for tenant isolation
  const patientRows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.laboratoryId, lab.id)))
    .limit(1);

  if (!patientRows[0]) notFound();
  const patient = patientRows[0];

  // Fetch orders scoped to both patientId AND laboratoryId
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.patientId, patient.id), eq(orders.laboratoryId, lab.id)))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/pacientes"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Volver a pacientes
        </Link>
      </div>

      {/* Patient card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {patient.firstName} {patient.lastName}
        </h1>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Documento
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {patient.documentType} {patient.documentNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha de nacimiento
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(patient.dateOfBirth + "T00:00:00").toLocaleDateString("es-CO")}
            </dd>
          </div>
          {patient.phone && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{patient.phone}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Order history */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Historial de órdenes
        </h2>

        {orderRows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            Este paciente no tiene órdenes aún.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de orden
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orderRows.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <Link
                      href={`/dashboard/ordenes/${order.id}`}
                      className="hover:text-blue-600"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[order.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.createdAt.toLocaleDateString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
