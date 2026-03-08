import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { labUsers, laboratories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Laboratory, LabUser } from "@/lib/db/schema";

export type LabContext = {
  user: LabUser;
  lab: Laboratory;
};

export async function getLabUser(): Promise<LabContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch lab_user row using Drizzle select (compatible with Transaction mode pooler)
  const labUserRows = await db
    .select()
    .from(labUsers)
    .where(eq(labUsers.authUserId, user.id))
    .limit(1);

  const labUser = labUserRows[0];

  if (!labUser) {
    // Auth user exists but no lab_user — orphaned auth; sign out and redirect
    await supabase.auth.signOut();
    redirect("/login?error=cuenta_no_encontrada");
  }

  // Fetch laboratory
  const labRows = await db
    .select()
    .from(laboratories)
    .where(eq(laboratories.id, labUser.laboratoryId))
    .limit(1);

  const lab = labRows[0];

  if (!lab) {
    redirect("/login?error=laboratorio_no_encontrado");
  }

  return { user: labUser, lab };
}
