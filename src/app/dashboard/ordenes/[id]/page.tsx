import Link from "next/link";
import { notFound } from "next/navigation";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { orders, orderItems, patients, labUsers, notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ResultItemsForm } from "@/components/result-items-form";
import { PdfUpload } from "@/components/pdf-upload";
import { validateAndSendAction } from "./actions";
import { DeliveryStatusBadge } from "@/components/delivery-status-badge";

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

function FlagBadge({ flag }: { flag: "normal" | "high" | "low" | "critical" }) {
  const styles: Record<string, string> = {
    normal: "bg-gray-100 text-gray-700",
    high: "bg-red-100 text-red-700",
    low: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-800 font-bold",
  };
  const labels: Record<string, string> = {
    normal: "Normal",
    high: "Alto",
    low: "Bajo",
    critical: "Crítico",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${styles[flag] ?? styles.normal}`}>
      {labels[flag] ?? flag}
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

  // Fetch result items scoped by orderId (after order ownership verified above)
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.createdAt);

  // DEL-05: Fetch latest notification status for real-time badge
  const notificationRows = await db
    .select({ status: notifications.status })
    .from(notifications)
    .where(eq(notifications.orderId, order.id))
    .orderBy(notifications.createdAt)
    .limit(1);
  const notificationStatus = notificationRows[0]?.status ?? null;

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

      {/* Resultados section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h2>

        {itemRows.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Examen</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Resultado</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Unidad</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Rango ref.</th>
                  <th className="text-left py-2 font-medium text-gray-600">Bandera</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-gray-900">{item.testName}</td>
                    <td className="py-2 pr-4 text-gray-900">{item.value}</td>
                    <td className="py-2 pr-4 text-gray-500">{item.unit ?? "—"}</td>
                    <td className="py-2 pr-4 text-gray-500">{item.referenceRange ?? "—"}</td>
                    <td className="py-2">
                      <FlagBadge flag={item.flag} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">No hay resultados registrados aún.</p>
        )}

        {order.status === "pending" ? (
          <ResultItemsForm orderId={order.id} />
        ) : (
          <p className="text-sm text-gray-500 italic">
            No se pueden agregar resultados a una orden validada.
          </p>
        )}
      </div>

      {/* Acciones section — pending order */}
      {order.status === "pending" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">PDF de resultados</h3>
            <PdfUpload orderId={order.id} currentPdfPath={order.pdfPath} />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Validación</h3>
            <form action={validateAndSendAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700"
              >
                Validar y Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Acciones section — validated/delivered order */}
      {order.status !== "pending" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Orden validada
            </span>
            {notificationStatus && (
              <DeliveryStatusBadge orderId={order.id} initialStatus={notificationStatus} />
            )}
          </div>
          {validatorName && order.validatedAt && (
            <p className="text-sm text-gray-600 mt-2">
              Validado por <span className="font-medium">{validatorName}</span> el{" "}
              {new Date(order.validatedAt).toLocaleDateString("es-CO")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
