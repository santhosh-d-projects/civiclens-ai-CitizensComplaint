// POST /api/admin/departments/[id]/approve — pending → approved.
// Activation is a separate step (typed ACTIVATE + officer invite).
import { sqlErrorToResponse } from "@/lib/auth";
import { transitionDepartment } from "@/lib/admin-actions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { department, error } = await transitionDepartment(req, id, "approved", null);
    if (error) return error;
    return Response.json({ department });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
