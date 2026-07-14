import { getAdminClient } from "@/lib/supabase/admin";

const BUCKET = "results";

export async function uploadPDF(buffer: Buffer, path: string): Promise<string> {
  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function getSignedUrl(path: string): Promise<string> {
  const supabaseAdmin = getAdminClient();
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
