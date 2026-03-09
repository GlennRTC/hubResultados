import QRCode from "qrcode";

export async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200, // small enough to avoid 500KB budget; renders at 72pt in PDF
  });
}
