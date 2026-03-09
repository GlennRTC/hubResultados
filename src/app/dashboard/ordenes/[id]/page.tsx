import Link from "next/link";
import { notFound } from "next/navigation";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { orders, patients, labUsers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface PageProps {
  params: Promise<{ id: string }>;
}

function StatusBadge({ status }: { status: "pending" | "validated" | "delivered" }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        Pendiente
      </span>
    );
  }
  if (status === "validated") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Validado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      Entregado
    </span>
  );
}

export default async function OrdenDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { lab } = await getLabUser();

  // Fetch order scoped to lab — cross-lab access returns 404
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.laboratoryId, lab.id)))
    .limit(1);

  if (!orderRows[0]) notFound();
  const order = orderRows[0];

  // Fetch linked patient (also scoped to lab.id)
  const patientRows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, order.patientId), eq(patients.laboratoryId, lab.id)))
    .limit(1);
  const patient = patientRows[0] ?? null;

  // Fetch validator name if order has been validated
  const validatorRows = order.validatedById
    ? await db
        .select({ fullName: labUsers.fullName })
        .from(labUsers)
        .where(eq(labUsers.id, order.validatedById))
        .limit(1)
    : [];
  const validatorName = validatorRows[0]?.fullName ?? null;

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/ordenes"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Volver a órdenes
        </Link>
      </div>

      {/* Order card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Creada el {new Date(order.createdAt).toLocaleDateString("es-CO")}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.validatedById && validatorName && order.validatedAt && (
          <p className="text-sm text-gray-600 mt-2">
            Validado por <span className="font-medium">{validatorName}</span> el{" "}
            {new Date(order.validatedAt).toLocaleDateString("es-CO")}
          </p>
        )}

        {order.pdfPath && (
          <p className="text-sm text-gray-600 mt-2">
            PDF adjunto: <span className="font-mono text-xs text-gray-500">{order.pdfPath}</span>
          </p>
        )}
      </div>

      {/* Patient section */}
      {patient && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paciente</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Nombre completo
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {patient.firstName} {patient.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Documento
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {patient.documentType} {patient.documentNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fecha de nacimiento
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(patient.dateOfBirth + "T12:00:00").toLocaleDateString("es-CO")}
              </dd>
            </div>
            {patient.phone && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Teléfono
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{patient.phone}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4">
            <Link
              href={`/dashboard/pacientes/${patient.id}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Ver perfil del paciente &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Resultados placeholder — Plan 02-03 will fill this in */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Resultados</h2>
        <p className="text-sm text-gray-500">
          Los resultados se agregan en la siguiente sección.
        </p>
      </div>

      {/* Acciones placeholder — Plan 02-03 will fill this in */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Acciones</h2>
        <p className="text-sm text-gray-500">
          Las acciones de carga y validación se agregan en la siguiente sección.
        </p>
      </div>
    </div>
  );
}
