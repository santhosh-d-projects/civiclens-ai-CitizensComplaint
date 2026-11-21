// Shared logic for admin department transitions (master prompt §5/§7).
// All status changes go through transition_department / suspend_department
// in SQL — never a direct update of departments.status.
import {
  requireAdmin,
  clientIp,
  deviceOf,
  signAuditBestEffort,
} from "@/lib/admin-api";
import { apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import type { Department, DeptStatus } from "@/lib/database.types";

/** Revoke every officer session of a department (suspend / deactivate). */
export async function revokeOfficerSessions(departmentId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: officers } = await admin
    .from("department_officers")
    .select("profile_id")
    .eq("department_id", departmentId);
  for (const o of officers ?? []) {
    if (o.profile_id) {
      try {
        await admin.auth.admin.signOut(o.profile_id, "global");
      } catch {
        // Best effort — the department is already suspended/deactivated.
      }
    }
  }
}

export async function transitionDepartment(
  req: Request,
  departmentId: string,
  to: DeptStatus,
  reason: string | null,
): Promise<
  | { department: Department; error: null }
  | { department: null; error: Response }
> {
  const { session, error } = await requireAdmin();
  if (error) return { department: null, error };
  const admin = createAdminClient();
  const department = await callDbFunction<Department>(
    admin,
    "transition_department",
    {
      p_dept: departmentId,
      p_to: to,
      p_actor: session.userId,
      p_reason: reason,
      p_ip: clientIp(req),
      p_device: deviceOf(req),
    },
  );
  await signAuditBestEffort();
  return { department, error: null };
}

export function reasonBody(body: unknown): {
  reason: string | null;
  error: Response | null;
} {
  const reason =
    body != null && typeof body === "object" && "reason" in body
      ? String((body as { reason?: unknown }).reason ?? "").trim()
      : "";
  if (!reason) {
    return {
      reason: null,
      error: apiError("VALIDATION", "A reason is required for this action.", 422),
    };
  }
  return { reason, error: null };
}
