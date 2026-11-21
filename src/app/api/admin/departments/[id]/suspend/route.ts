// POST /api/admin/departments/[id]/suspend — reason + target required.
// Calls suspend_department (atomic transfer of open complaints to an
// ACTIVE department covering the same wards + categories), then revokes
// every officer session of the suspended department.
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { requireAdmin, clientIp, deviceOf, signAuditBestEffort } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import { revokeOfficerSessions } from "@/lib/admin-actions";

const Body = z.object({
  reason: z.string().trim().min(1),
  // Required only when the department has open complaints (the SQL
  // function enforces TARGET_REQUIRED in that case).
  targetDepartmentId: z.string().uuid().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, error: authErr } = await requireAdmin();
    if (authErr) return authErr;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError(
        "VALIDATION",
        "A reason is required to suspend.",
        422,
      );
    }
    const admin = createAdminClient();
    const moved = await callDbFunction<number>(admin, "suspend_department", {
      p_dept: id,
      p_actor: session.userId,
      p_reason: parsed.data.reason,
      p_target: parsed.data.targetDepartmentId ?? null,
      p_ip: clientIp(req),
      p_device: deviceOf(req),
    });
    await revokeOfficerSessions(id);
    await signAuditBestEffort();
    return Response.json({ moved });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
