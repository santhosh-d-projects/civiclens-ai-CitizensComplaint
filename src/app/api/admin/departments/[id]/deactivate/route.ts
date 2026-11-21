// POST /api/admin/departments/[id]/deactivate — reason required.
// Officer sessions are revoked immediately (master prompt §6).
import { sqlErrorToResponse } from "@/lib/auth";
import {
  transitionDepartment,
  reasonBody,
  revokeOfficerSessions,
} from "@/lib/admin-actions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { reason, error: rErr } = reasonBody(await req.json().catch(() => null));
    if (rErr) return rErr;
    const { department, error } = await transitionDepartment(req, id, "deactivated", reason);
    if (error) return error;
    await revokeOfficerSessions(id);
    return Response.json({ department });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
