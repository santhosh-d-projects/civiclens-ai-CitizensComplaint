// Client-side document/photo upload via signed URLs.
// Contract for POST /api/uploads/sign:
//   request:  { bucket, path, contentType }
//   response: { signedUrl, token, path }
// The file is then uploaded with the browser Supabase client to the
// signed URL (private bucket, no public access).
"use client";

import { createClient } from "@/lib/supabase/client";

export const MAX_FILE_MB = 10;
export const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `File must be ${MAX_FILE_MB}MB or smaller.`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only PDF, PNG and JPG files are accepted.";
  }
  return null;
}

/** Upload one file to a private bucket via a signed URL. Returns the
 * storage path (stored in the DB, never the public URL). */
export async function uploadFile(
  bucket: "complaint-photos" | "department-docs",
  path: string,
  file: File,
): Promise<string> {
  const res = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path, contentType: file.type }),
  });
  const body = (await res.json()) as {
    signedUrl?: string;
    token?: string;
    path?: string;
    error?: { message: string };
  };
  if (!res.ok || !body.signedUrl || !body.token || !body.path) {
    throw new Error(body.error?.message ?? "Could not prepare the upload.");
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(body.path, body.token, file);
  if (error) throw new Error(error.message);
  return body.path;
}

export function randomPath(prefix: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}/${rand}-${safe}`;
}
