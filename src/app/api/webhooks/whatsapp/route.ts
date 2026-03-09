// src/app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// Zod schema for incoming webhook payload (INFRA-06)
const WebhookStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  recipient_id: z.string(),
});

const WebhookBodySchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          value: z.object({
            statuses: z.array(WebhookStatusSchema).optional(),
          }),
        })
      ),
    })
  ),
});

// Numeric ordinal for status — only advance forward (handles out-of-order events)
const STATUS_ORDINAL: Record<string, number> = {
  failed: -1, pending: 0, sent: 1, delivered: 2, read: 3,
};

async function updateNotificationStatus(wamid: string, newStatus: string) {
  const newOrdinal = STATUS_ORDINAL[newStatus] ?? 0;
  // Only update if incoming status is higher ordinal than current
  // Use a conditional update — if new status is 'failed', always update
  if (newStatus === "failed") {
    await db
      .update(notifications)
      .set({ status: newStatus as "failed", updatedAt: new Date() })
      .where(eq(notifications.whatsappMessageId, wamid));
  } else {
    // Update only if current ordinal < new ordinal
    await db
      .update(notifications)
      .set({ status: newStatus as "sent" | "delivered" | "read", updatedAt: new Date() })
      .where(
        sql`${notifications.whatsappMessageId} = ${wamid}
          AND CASE ${notifications.status}
            WHEN 'pending' THEN 0
            WHEN 'sent' THEN 1
            WHEN 'delivered' THEN 2
            WHEN 'read' THEN 3
            ELSE -1
          END < ${newOrdinal}`
      );
  }
}

// GET: Meta webhook verification handshake
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: delivery status updates
export async function POST(req: NextRequest) {
  // CRITICAL: read as text FIRST — consuming as json() before HMAC makes signature fail
  const rawBody = await req.text();

  const sig = req.headers.get("x-hub-signature-256");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error("WHATSAPP_APP_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const expected = "sha256=" +
    createHmac("sha256", appSecret).update(rawBody).digest("hex");

  let sigMatch = false;
  try {
    sigMatch = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    // Buffers with different lengths throw — treat as mismatch
    sigMatch = false;
  }

  if (!sigMatch) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse and validate with Zod (INFRA-06)
  let parsedBody: z.infer<typeof WebhookBodySchema>;
  try {
    const json = JSON.parse(rawBody);
    const result = WebhookBodySchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.issues }, { status: 400 });
    }
    parsedBody = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Process status events
  for (const entry of parsedBody.entry) {
    for (const change of entry.changes) {
      const statuses = change.value?.statuses ?? [];
      for (const status of statuses) {
        try {
          await updateNotificationStatus(status.id, status.status);
        } catch (err) {
          console.error("Failed to update notification status:", err);
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
