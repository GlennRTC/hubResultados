import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResultPDF, type ResultPDFData } from "./ResultPDF";

export type { ResultPDFData };

export async function generateResultPDF(data: ResultPDFData): Promise<Buffer> {
  // Next.js 15 auto-externalizes @react-pdf/renderer — no next.config.ts change needed
  // Requires react@^19.0.0 (already in package.json)
  const buffer = await renderToBuffer(<ResultPDF data={data} />);

  // Development guard: warn if approaching 500KB limit
  if (buffer.byteLength > 400_000) {
    console.warn(
      `PDF size warning: ${buffer.byteLength} bytes (limit: 500KB). Check embedded images.`
    );
  }

  return buffer;
}
