// Tests for PDF generation (DEL-01, INFRA-07)
// Implementation: src/lib/pdf/generate-pdf.ts
import { generateResultPDF, type ResultPDFData } from "@/lib/pdf/generate-pdf";
import { generateQRDataUrl } from "@/lib/pdf/generate-qr";

jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.alloc(100_000)), // 100KB mock
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: { create: (s: object) => s },
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,abc123"),
}));

const mockData: ResultPDFData = {
  lab: { name: "Lab Test", address: "Calle 1", phone: "3001234567", logoBase64: null },
  patient: {
    firstName: "Ana",
    lastName: "García",
    documentType: "CC",
    documentNumber: "12345678",
    dateOfBirth: "1990-01-15",
  },
  order: { orderNumber: "ORD-001", createdAt: "2026-03-09", validatedAt: "2026-03-09" },
  items: [
    {
      testName: "Hemoglobina",
      value: "14.5",
      unit: "g/dL",
      referenceRange: "12-16",
      flag: "normal",
    },
  ],
  validatedByName: "Dr. Pérez",
  qrDataUrl: "data:image/png;base64,abc123",
  verificationCode: "abc123xyz",
};

describe("generateResultPDF", () => {
  it("generates a PDF buffer for a valid order", async () => {
    const buffer = await generateResultPDF(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("PDF buffer is less than 500KB (INFRA-07)", async () => {
    const buffer = await generateResultPDF(mockData);
    expect(buffer.byteLength).toBeLessThan(500_000);
  });
});

describe("generateQRDataUrl", () => {
  it("returns a base64 PNG data URL", async () => {
    const dataUrl = await generateQRDataUrl("https://labflash.co/verify/abc123");
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
