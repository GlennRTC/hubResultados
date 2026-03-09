// Tests for WhatsApp webhook handler (DEL-04, INFRA-06)
// Implementation: src/app/api/webhooks/whatsapp/route.ts

describe("GET /api/webhooks/whatsapp", () => {
  it.todo("returns hub.challenge when mode=subscribe and token matches");
  it.todo("returns 403 when token does not match");
});

describe("POST /api/webhooks/whatsapp", () => {
  it.todo("returns 401 when x-hub-signature-256 header is missing");
  it.todo("returns 401 when HMAC signature is invalid");
  it.todo("updates notification status for valid status event");
  it.todo("rejects invalid Zod schema body after HMAC passes (INFRA-06)");
});
