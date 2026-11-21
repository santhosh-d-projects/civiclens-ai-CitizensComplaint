// POST /api/uploads/sign — mint a signed upload URL for a private bucket.
// Contract (shared with the citizen track):
//   request:  { bucket: "complaint-photos" | "department-docs", path, contentType }
//   response: { signedUrl, token, path }
// department-docs allows anonymous callers (public department applications)
// but only under the applications/ prefix and rate-limited. complaint-photos
// requires a signed-in user. The service-role key mints the URL.
import { z } from "zod";
import { getSessionProfile, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const SignBody = z.object({
  bucket: z.enum(["complaint-photos", "department-docs"]),
  path: z
    .string()
    .min(1)
    .max(300)
    .refine((p) => !p.includes("..") && !p.startsWith("/"), "Invalid path."),
  contentType: z.string().min(1).max(100),
});

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const anonHits = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignBody.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const { bucket, path, contentType } = parsed.data;
    if (!ALLOWED_TYPES.has(contentType)) {
      return apiError("VALIDATION", "Only PDF, PNG and JPG files are accepted.", 422);
    }

    const session = await getSessionProfile();
    if (bucket === "complaint-photos") {
      if (!session) {
        return apiError("UNAUTHORIZED", "Sign in to upload a photo.", 401);
      }
    } else if (!session) {
      // Public department applications: anonymous, but only under
      // applications/ and rate-limited per IP (10/hour).
      if (!path.startsWith("applications/")) {
        return apiError("FORBIDDEN", "Anonymous uploads are only allowed for applications.", 403);
      }
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";
      const now = Date.now();
      const hits = (anonHits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
      if (hits.length >= 10) {
        return apiError("RATE_LIMITED", "Too many uploads. Try again later.", 429);
      }
      hits.push(now);
      anonHits.set(ip, hits);
    }

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return Response.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
