// src/lib/whatsapp/send-template.ts
// Meta Cloud API v21.0 — sends the resultado_listo template

export async function sendResultadoListo(
  toPhone: string,           // international format e.g. "573001234567" — no + prefix
  patientFirstName: string,
  labName: string,
  verificationCode: string
): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WhatsApp credentials: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const resultUrl = `https://labflash.co/r/${verificationCode}`;

  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: "resultado_listo",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: patientFirstName },   // {{1}}
            { type: "text", text: labName },             // {{2}}
            { type: "text", text: resultUrl },           // {{3}}
          ],
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { messages: Array<{ id: string }> };
  return data.messages[0].id; // wamid
}
