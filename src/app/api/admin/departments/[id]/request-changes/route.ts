// POST /api/admin/departments/[id]/request-changes — reason required.
// Issues a signed resubmission token (30 days) so the applicant can
// resubmit via POST /api/departments/[id]/resubmit. The token is returned
// to the admin (who passes it to the applicant) and logged server-side;
// in production it would be emailed.
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { transitionDepartment } from "@/lib/admin-actions";
import { issueResubmitToken } from "@/lib/resubmit-token";

const Body = z.object({ reason: z.string().trim().min(1) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError("VALIDATION", "A reason is required to request changes.", 422);
    }
    const { department, error } = await transitionDepartment(
      req,
      id,
      "changes_requested",
      parsed.data.reason,
    );
    if (error) return error;
    const resubmitToken = issueResubmitToken(id);
    console.log(
      `[resubmit] department ${id}: token ${resubmitToken} (share with the applicant; valid 30 days)`,
    );
    return Response.json({ department, resubmitToken });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
