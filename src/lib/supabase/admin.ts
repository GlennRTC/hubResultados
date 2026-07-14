import { createClient } from "@supabase/supabase-js";

// SERVICE ROLE client bypasses RLS — NEVER expose to client.
// Used only in server-side code (server actions, route handlers).
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
