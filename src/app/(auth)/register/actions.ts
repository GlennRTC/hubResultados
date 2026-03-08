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

  // Basic validation
  if (!labName || !fullName || !email || !password || password.length < 8) {
    redirect("/register?error=datos_invalidos");
  }

  const supabase = await createClient();

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      redirect("/register?error=email_en_uso");
    }
    redirect("/register?error=error_registro");
  }

  const authUserId = authData.user.id;

  // Step 2: Insert laboratory
  const slug = slugify(labName) + "-" + Math.random().toString(36).slice(2, 6);

  const [lab] = await db
    .insert(laboratories)
    .values({ name: labName, slug, country: "CO" })
    .returning({ id: laboratories.id });

  // Step 3: Insert lab_users (admin)
  await db.insert(labUsers).values({
    laboratoryId: lab.id,
    email,
    fullName,
    role: "admin",
    authUserId,
  });

  redirect("/dashboard");
}
