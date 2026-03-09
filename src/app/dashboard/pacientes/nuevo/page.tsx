import Link from "next/link";
import { createPatientAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const errorMessages: Record<string, string> = {
  campos_requeridos: "Por favor complete todos los campos obligatorios.",
  tipo_documento_invalido: "El tipo de documento seleccionado no es válido.",
};

export default async function NuevoPacientePage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/dashboard/pacientes"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Volver a pacientes
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          Nuevo paciente
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessages[error] ?? "Ha ocurrido un error. Intente nuevamente."}
          </div>
        )}

        <form action={createPatientAction} className="space-y-4">
          <div>
            <label
              htmlFor="documentType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              id="documentType"
              name="documentType"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccione...</option>
              <option value="CC">CC — Cédula de ciudadanía</option>
              <option value="CE">CE — Cédula de extranjería</option>
              <option value="PA">PA — Pasaporte</option>
              <option value="RC">RC — Registro civil</option>
              <option value="TI">TI — Tarjeta de identidad</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="documentNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Número de documento <span className="text-red-500">*</span>
            </label>
            <input
              id="documentNumber"
              name="documentNumber"
              type="text"
              required
              placeholder="Ej. 1234567890"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="Ej. Juan Carlos"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="Ej. Pérez López"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dateOfBirth"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fecha de nacimiento <span className="text-red-500">*</span>
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+57300..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Crear paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
