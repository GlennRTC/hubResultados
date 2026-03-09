import Link from "next/link";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { orders, patients } from "@/lib/db/schema";
import { eq, and, gte, inArray, desc } from "drizzle-orm";

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

type StatusBadgeProps = {
  status: "pending" | "validated" | "delivered";
};

function StatusBadge({ status }: StatusBadgeProps) {
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

export default async function OrdenesPage({ searchParams }: PageProps) {
  const { lab } = await getLabUser();
  const { estado } = await searchParams;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const whereClause =
    estado === "hoy"
      ? and(eq(orders.laboratoryId, lab.id), gte(orders.createdAt, todayStart))
      : estado === "pendiente"
      ? and(eq(orders.laboratoryId, lab.id), eq(orders.status, "pending"))
      : estado === "validado"
      ? and(eq(orders.laboratoryId, lab.id), eq(orders.status, "validated"))
      : eq(orders.laboratoryId, lab.id); // default: all

  const orderRows = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  // Batch-fetch patient names — no N+1
  const patientIds = [...new Set(orderRows.map((o) => o.patientId))];
  const patientRows =
    patientIds.length > 0
      ? await db
          .select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName })
          .from(patients)
          .where(inArray(patients.id, patientIds))
      : [];
  const patientMap = Object.fromEntries(
    patientRows.map((p) => [p.id, `${p.firstName} ${p.lastName}`])
  );

  const tabs = [
    { label: "Todos", href: "/dashboard/ordenes", key: undefined },
    { label: "Hoy", href: "/dashboard/ordenes?estado=hoy", key: "hoy" },
    { label: "Pendientes", href: "/dashboard/ordenes?estado=pendiente", key: "pendiente" },
    { label: "Validados", href: "/dashboard/ordenes?estado=validado", key: "validado" },
  ];

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes</h1>
        <Link
          href="/dashboard/ordenes/nueva"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Nueva orden
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const isActive = estado === tab.key;
            return (
              <a
                key={tab.label}
                href={tab.href}
                className={
                  isActive
                    ? "border-b-2 border-blue-600 pb-3 text-sm font-medium text-blue-600"
                    : "border-b-2 border-transparent pb-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              >
                {tab.label}
              </a>
            );
          })}
        </nav>
      </div>

      {orderRows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          No hay órdenes para mostrar.
        </p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orderRows.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/dashboard/ordenes/${o.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patientMap[o.patientId] ?? "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString("es-CO")}
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
