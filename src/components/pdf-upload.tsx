"use client";
import { useRef, useState } from "react";
import { uploadPdfAction } from "@/app/dashboard/ordenes/[id]/actions";

interface Props {
  orderId: string;
  currentPdfPath: string | null;
}

export function PdfUpload({ orderId, currentPdfPath }: Props) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      return;
    }
    setStatus("uploading");
    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("file", file);
    await uploadPdfAction(formData);
    setStatus("done");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      {currentPdfPath && (
        <p className="text-sm text-green-700">PDF adjunto: {currentPdfPath.split("/").pop()}</p>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {status === "uploading" && "Subiendo..."}
        {status === "done" && "PDF adjuntado correctamente"}
        {status === "error" && "Solo se aceptan archivos PDF"}
        {status === "idle" && "Arrastre un PDF aquí o haga clic para seleccionar"}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    </div>
  );
}
