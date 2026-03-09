"use client";
import { useRef } from "react";
import { addResultItemAction } from "@/app/dashboard/ordenes/[id]/actions";

interface Props {
  orderId: string;
}

export function ResultItemsForm({ orderId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addResultItemAction(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <input
          name="testName"
          required
          placeholder="Nombre del examen"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          name="value"
          required
          placeholder="Resultado"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          name="unit"
          placeholder="Unidad (ej. mg/dL)"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          name="referenceRange"
          placeholder="Rango ref. (ej. 70-100)"
          className="border rounded px-2 py-1 text-sm"
        />
        <select name="flag" className="border rounded px-2 py-1 text-sm">
          <option value="normal">Normal</option>
          <option value="high">Alto</option>
          <option value="low">Bajo</option>
          <option value="critical">Crítico</option>
        </select>
      </div>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        Agregar resultado
      </button>
    </form>
  );
}
