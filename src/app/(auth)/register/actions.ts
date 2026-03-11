"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { laboratories, labUsers } from "@/lib/db/schema";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function registerAction(formData: FormData) {
  const labName = formData.get("labName") as string;
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!labName || !fullName || !email || !password || password.length < 8) {
    redirect("/register?error=datos_invalidos");
  }

  const supabase = await createClient();

  // Clear any stale session (e.g. from a previous partial registration)
  // so signUp always creates a fresh auth user rather than returning the cached one.
  await supabase.auth.signOut();

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      redirect("/register?error=email_en_uso");
    }
    redirect("/register?error=error_registro");
  }

  if (!authData.user) {
    redirect("/register?error=error_registro");
  }

  // When email confirmation is ON, Supabase silently returns the existing user
  // with an empty identities array instead of an error. Treat this as "already registered".
  if (authData.user.identities?.length === 0) {
    redirect("/register?error=email_en_uso");
  }

  const authUserId = authData.user.id;
  const slug = slugify(labName) + "-" + Math.random().toString(36).slice(2, 6);

  // Steps 2+3: Insert laboratory and lab_user atomically
  try {
    await db.transaction(async (tx) => {
      const [lab] = await tx
        .insert(laboratories)
        .values({ name: labName, slug, country: "CO" })
        .returning({ id: laboratories.id });

      await tx.insert(labUsers).values({
        laboratoryId: lab.id,
        email,
        fullName,
        role: "admin",
        authUserId,
      });
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("23505") || msg.includes("duplicate key")) {
      redirect("/register?error=email_en_uso");
    }
    redirect("/register?error=error_registro");
  }

  redirect("/dashboard");
}
