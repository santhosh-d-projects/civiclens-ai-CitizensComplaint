// POST /api/admin/departments/[id]/reactivate — suspended → active.
// Reason required by the SQL function for suspended → active.
import { sqlErrorToResponse } from "@/lib/auth";
import { transitionDepartment, reasonBody } from "@/lib/admin-actions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { reason, error: rErr } = reasonBody(await req.json().catch(() => null));
    if (rErr) return rErr;
    const { department, error } = await transitionDepartment(req, id, "active", reason);
    if (error) return error;
    return Response.json({ department });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
