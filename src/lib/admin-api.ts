// Shared helpers for admin API routes (master prompt §7).
// Every admin route: requireAdmin() first, zod on the body, and
// {error:{code,message}} via apiError / sqlErrorToResponse.
import { getSessionProfile, apiError, type SessionProfile } from "@/lib/auth";

export async function requireAdmin(): Promise<
  | { session: SessionProfile; error: null }
  | { session: null; error: Response }
> {
  const session = await getSessionProfile();
  if (!session) {
    return { session: null, error: apiError("UNAUTHORIZED", "Sign in as an admin.", 401) };
  }
  if (session.profile.role !== "admin") {
    return { session: null, error: apiError("FORBIDDEN", "Admin only.", 403) };
  }
  return { session, error: null };
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export function deviceOf(req: Request): string | null {
  return req.headers.get("user-agent");
}

/** Fire-and-forget audit signing after a mutation (best effort — the
 * audit page also has a manual "Sign pending rows" action). */
export async function signAuditBestEffort(): Promise<void> {
  try {
    const { signAuditRows } = await import("@/lib/audit");
    await signAuditRows();
  } catch {
    // Signing is best-effort here; unsigned rows are flagged in the UI.
  }
}
