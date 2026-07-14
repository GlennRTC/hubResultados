import { getAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(
  verificationCode: string
): Promise<{ allowed: boolean }> {
  const admin = getAdminClient();
  const oneHourAgo = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await admin
    .from("portal_auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("verification_code", verificationCode)
    .gte("attempted_at", oneHourAgo);

  if (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true }; // fail open — don't block on DB error
  }

  return { allowed: (count ?? 0) < MAX_ATTEMPTS };
}

export async function recordAttempt(verificationCode: string): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from("portal_auth_attempts")
    .insert({ verification_code: verificationCode });
}
