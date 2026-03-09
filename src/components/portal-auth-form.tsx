"use client";
import { useActionState } from "react";
import { authenticateAndSetCookieAction } from "@/app/r/[verification_code]/actions";

interface Props {
  verificationCode: string;
}

type State = { error?: string };

export function PortalAuthForm({ verificationCode }: Props) {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    authenticateAndSetCookieAction.bind(null, verificationCode),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de documento
        </label>
        <select
          name="documentType"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue=""
        >
          <option value="" disabled>
            Seleccionar...
          </option>
          <option value="CC">Cédula de Ciudadanía (CC)</option>
          <option value="TI">Tarjeta de Identidad (TI)</option>
          <option value="CE">Cédula de Extranjería (CE)</option>
          <option value="PA">Pasaporte (PA)</option>
          <option value="RC">Registro Civil (RC)</option>
          <option value="CI">Cédula de Identidad (CI)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de documento
        </label>
        <input
          type="text"
          name="documentNumber"
          required
          autoComplete="off"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ingrese su número de documento"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de nacimiento
        </label>
        <input
          type="date"
          name="dateOfBirth"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Verificando..." : "Acceder a mis resultados"}
      </button>
    </form>
  );
}
