// Server-side auth helpers (master prompt §6).
// Role always comes from `profiles` in the DB, never from client input or
// unverified JWT claims.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/lib/database.types";

export interface SessionProfile {
  userId: string;
  email: string | null;
  profile: Profile;
}

/** Returns the signed-in user + their DB profile, or null. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? null, profile };
}

/** Throws a Response redirect / error tuple for route handlers. */
export function unauthorized(): never {
  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}

export function forbidden(code = "FORBIDDEN"): never {
  throw Object.assign(new Error(code), { status: 403, code });
}

/** Require one of the given roles; returns the session profile. */
export async function requireRole(
  roles: UserRole[],
): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) unauthorized();
  if (!roles.includes(session.profile.role)) forbidden("ROLE_FORBIDDEN");
  return session;
}

/** Department guard (§6): loads the officer's department fresh from the DB
 * (never trusts the JWT for status). Returns the department row when it is
 * `active`; otherwise throws 403 DEPARTMENT_NOT_ACTIVE with the current
 * status attached so the UI can show the matching blocked screen. */
export async function requireActiveDepartment(): Promise<{
  session: SessionProfile;
  departmentId: string;
  departmentStatus: string;
}> {
  const session = await requireRole(["department_officer"]);
  const departmentId = session.profile.department_id;
  if (!departmentId) forbidden("DEPARTMENT_NOT_ACTIVE");
  const admin = createAdminClient();
  const { data } = await admin
    .from("departments")
    .select("id,status")
    .eq("id", departmentId)
    .single();
  // Narrowed explicitly: the generated query-builder type collapses this
  // select to never with our hand-written Database type.
  const dept = data as { id: string; status: string } | null;
  if (!dept || dept.status !== "active") {
    const err = Object.assign(new Error("DEPARTMENT_NOT_ACTIVE"), {
      status: 403,
      code: "DEPARTMENT_NOT_ACTIVE",
      departmentStatus: dept?.status ?? "unknown",
    });
    throw err;
  }
  return { session, departmentId, departmentStatus: dept.status };
}

/** Consistent API error shape: { error: { code, message } }. */
export function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

/** Map the SQL exception names (§7) to HTTP codes + friendly messages. */
export function sqlErrorToResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const map: [RegExp, number, string][] = [
    [/ADMIN_ONLY/, 403, "Only an admin can do this."],
    [/ILLEGAL_TRANSITION/, 409, "That status change is not allowed from here."],
    [/REASON_REQUIRED/, 422, "A reason is required for this action."],
    [/DOCUMENTS_NOT_VERIFIED/, 422, "All documents must be verified first."],
    [/NO_OFFICER/, 422, "An officer must be assigned before activation."],
    [/MAKER_CHECKER/, 403, "Another admin must activate a department you created."],
    [/TARGET_REQUIRED/, 422, "Choose a department to move the open complaints to."],
    [/TARGET_NOT_ACTIVE/, 422, "The target department is not active."],
    [/TARGET_DOES_NOT_COVER/, 422, "The target department does not cover all the affected wards and categories."],
    [/DEPARTMENT_NOT_ACTIVE/, 403, "This department is not active."],
    [/DEPARTMENT_DOES_NOT_COVER_WARD/, 422, "The chosen department does not serve this ward."],
    [/DEPARTMENT_DOES_NOT_HANDLE_CATEGORY/, 422, "The chosen department does not handle this category."],
    [/NOT_AN_OFFICER/, 403, "Only a department officer can do this."],
    [/NOT_FOUND/, 404, "Not found."],
    [/RESOLUTION_NOTE_REQUIRED/, 422, "A resolution note is required to mark a complaint resolved."],
    [/DUPLICATE_COMPLAINT/, 409, "You already reported this exact complaint."],
  ];
  for (const [re, status, friendly] of map) {
    if (re.test(message)) return apiError(re.source.replace(/[/\\^$]/g, ""), friendly, status);
  }
  console.error("Unhandled API error:", message);
  return apiError("INTERNAL", "Something went wrong. Please try again.", 500);
}
