// tests/webhook.test.ts
import { createHmac } from "node:crypto";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";
import { NextRequest } from "next/server";

// Mock Drizzle DB
jest.mock("@/lib/db", () => ({
  db: {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/db/schema", () => ({
  notifications: { whatsappMessageId: "whatsapp_message_id", status: "status", updatedAt: "updated_at" },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  sql: Object.assign(jest.fn(), { raw: jest.fn() }),
}));

const APP_SECRET = "test-app-secret";
const VERIFY_TOKEN = "test-verify-token";

beforeEach(() => {
  process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
});

function makeSignature(body: string): string {
  return "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");
}

function makePostRequest(body: object, sig?: string): NextRequest {
  const bodyStr = JSON.stringify(body);
  const url = new URL("http://localhost/api/webhooks/whatsapp");
  return new NextRequest(url, {
    method: "POST",
    body: bodyStr,
    headers: {
      "content-type": "application/json",
      ...(sig !== undefined ? { "x-hub-signature-256": sig } : {}),
    },
  });
}

describe("GET /api/webhooks/whatsapp", () => {
  it("returns hub.challenge when mode=subscribe and token matches", async () => {
    const url = new URL("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=test-challenge");
    const req = new NextRequest(url);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("test-challenge");
  });

  it("returns 403 when token does not match", async () => {
    const url = new URL("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test-challenge");
    const req = new NextRequest(url);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/webhooks/whatsapp", () => {
  it("returns 401 when x-hub-signature-256 header is missing", async () => {
    const req = makePostRequest({ object: "whatsapp_business_account", entry: [] });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when HMAC signature is invalid", async () => {
    const req = makePostRequest(
      { object: "whatsapp_business_account", entry: [] },
      "sha256=invalidsignature"
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 for valid status event with correct HMAC", async () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            statuses: [{ id: "wamid.test", status: "delivered", recipient_id: "573001234567" }],
          },
        }],
      }],
    };
    const bodyStr = JSON.stringify(body);
    const req = makePostRequest(body, makeSignature(bodyStr));
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 for payload that fails Zod schema (INFRA-06)", async () => {
    const invalidBody = { not_object: true }; // missing required 'object' field
    const bodyStr = JSON.stringify(invalidBody);
    const req = makePostRequest(invalidBody, makeSignature(bodyStr));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
