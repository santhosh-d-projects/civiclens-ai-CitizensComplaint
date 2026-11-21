// POST /api/complaints/:id/reopen — citizen reopens a resolved/closed
// complaint (e.g. the fix did not hold). Sets status 'reopened' and logs
// a complaint_events row.
import { getSessionProfile, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionProfile();
    if (!session) return apiError("UNAUTHORIZED", "Sign in to reopen a complaint.", 401);
    const { id } = await params;
    const admin = createAdminClient();
    const { data: complaint, error } = await admin
      .from("complaints")
      .select("id,status,citizen_id")
      .eq("id", id)
      .eq("citizen_id", session.userId)
      .single();
    if (error || !complaint) return apiError("NOT_FOUND", "Complaint not found.", 404);
    if (!["resolved", "closed"].includes(complaint.status)) {
      return apiError(
        "VALIDATION",
        "Only a resolved or closed complaint can be reopened.",
        422,
      );
    }
    const { error: updateError } = await admin
      .from("complaints")
      .update({ status: "reopened", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);
    const { error: eventError } = await admin.from("complaint_events").insert({
      complaint_id: id,
      event: "reopened",
      actor_id: session.userId,
      meta: { note: "Citizen reported the issue is not fixed." },
    });
    if (eventError) throw new Error(eventError.message);
    return Response.json({ ok: true, status: "reopened" });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
