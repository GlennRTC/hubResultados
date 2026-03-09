import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSignedUrl } from "@/lib/storage/upload-pdf";
import { PortalAuthForm } from "@/components/portal-auth-form";

interface PageProps {
  params: Promise<{ verification_code: string }>;
}

export default async function PortalPage({ params }: PageProps) {
  const { verification_code } = await params;

  // Verify the code exists — quick check, not auth
  const orderRows = await db
    .select({ id: orders.id, pdfPath: orders.pdfPath, status: orders.status })
    .from(orders)
    .where(eq(orders.verificationCode, verification_code))
    .limit(1);

  if (!orderRows[0]) notFound();
  const order = orderRows[0];

  // Check if patient has already authenticated this session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(`portal_${verification_code}`);
  const isAuthenticated = sessionCookie?.value === "verified";

  // Generate fresh signed URL if authenticated and PDF exists
  let pdfSignedUrl: string | null = null;
  if (isAuthenticated && order.pdfPath) {
    try {
      pdfSignedUrl = await getSignedUrl(order.pdfPath);
    } catch {
      pdfSignedUrl = null;
    }
  }

  if (isAuthenticated && pdfSignedUrl) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Sus resultados de laboratorio
          </h1>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Puede ver y descargar su resultado a continuación.
          </p>

          {/* PDF viewer — PORTAL-03 */}
          <div
            className="mb-4 rounded border border-gray-200 overflow-hidden"
            style={{ height: "70vh" }}
          >
            <iframe
              src={pdfSignedUrl}
              className="w-full h-full"
              title="Resultado de laboratorio"
            />
          </div>

          {/* Download button — PORTAL-04 */}
          <a
            href={pdfSignedUrl}
            download="resultado.pdf"
            className="block w-full text-center rounded bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
          >
            Descargar PDF
          </a>
        </div>
      </main>
    );
  }

  if (isAuthenticated && !pdfSignedUrl) {
    // Authenticated but PDF not yet available
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-gray-600">
            Su resultado ha sido validado pero el PDF no está disponible aún.
            Por favor, comuníquese con el laboratorio.
          </p>
        </div>
      </main>
    );
  }

  // Not yet authenticated — show auth form
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Resultados de Laboratorio
        </h1>
        <p className="text-sm text-gray-500 mb-8 text-center">
          Ingrese sus datos para acceder a sus resultados.
        </p>
        <PortalAuthForm verificationCode={verification_code} />
      </div>
    </main>
  );
}
