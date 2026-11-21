// POST /api/departments/[id]/resubmit — applicant resubmission after
// changes were requested. Authenticated by the signed resubmission token
// issued at request-changes time (no account needed). Calls
// transition_department with actor null → to 'pending' (the only
// actor-less transition the SQL allows).
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import { verifyResubmitToken } from "@/lib/resubmit-token";
import type { Department } from "@/lib/database.types";

const Body = z.object({ token: z.string().min(10) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError("VALIDATION", "A valid resubmission token is required.", 422);
    }
    const verified = verifyResubmitToken(parsed.data.token);
    if (!verified || verified.departmentId !== id) {
      return apiError("FORBIDDEN", "This resubmission token is invalid or expired.", 403);
    }
    const admin = createAdminClient();
    const { data: dept } = await admin
      .from("departments")
      .select("status")
      .eq("id", id)
      .single();
    if (!dept || dept.status !== "changes_requested") {
      return apiError(
        "VALIDATION",
        "This application is not awaiting changes.",
        422,
      );
    }
    const department = await callDbFunction<Department>(
      admin,
      "transition_department",
      { p_dept: id, p_to: "pending", p_actor: null, p_reason: null },
    );
    return Response.json({ department });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
