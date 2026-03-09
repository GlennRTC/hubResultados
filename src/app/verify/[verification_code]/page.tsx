import { notFound } from "next/navigation";
import { getVerificationData } from "@/lib/portal/get-verification-data";

interface PageProps {
  params: Promise<{ verification_code: string }>;
}

export default async function VerifyPage({ params }: PageProps) {
  const { verification_code } = await params;

  const data = await getVerificationData(verification_code);

  if (!data) notFound();

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Verification icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Resultado Auténtico
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Este resultado de laboratorio ha sido verificado y es auténtico.
        </p>

        <dl className="rounded-lg border border-gray-200 p-6 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Laboratorio</dt>
            <dd className="font-medium text-gray-900">{data.labName}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Paciente</dt>
            <dd className="font-medium text-gray-900">{data.patientPartialName}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Fecha de la orden</dt>
            <dd className="font-medium text-gray-900">
              {new Date(data.orderDate).toLocaleDateString("es-CO")}
            </dd>
          </div>
          {data.validatedAt && (
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Fecha de validación</dt>
              <dd className="font-medium text-gray-900">
                {new Date(data.validatedAt).toLocaleDateString("es-CO")}
              </dd>
            </div>
          )}
          {data.validatedByName && (
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Validado por</dt>
              <dd className="font-medium text-gray-900">{data.validatedByName}</dd>
            </div>
          )}
        </dl>

        <p className="text-xs text-gray-400 mt-6">
          Verificación provista por LabFlash — plataforma de resultados médicos
        </p>
      </div>
    </main>
  );
}
