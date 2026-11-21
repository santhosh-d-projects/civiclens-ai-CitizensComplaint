// POST /api/complaints/:id/feedback — citizen rates a resolved/closed
// complaint. Stored as a complaint_events row (event 'feedback') — there
// is no feedback table by design.
import { z } from "zod";
import { getSessionProfile, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const Feedback = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionProfile();
    if (!session) return apiError("UNAUTHORIZED", "Sign in to leave feedback.", 401);
    const { id } = await params;
    const body = await req.json();
    const parsed = Feedback.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const admin = createAdminClient();
    const { data: complaint, error } = await admin
      .from("complaints")
      .select("id,status,citizen_id")
      .eq("id", id)
      .eq("citizen_id", session.userId)
      .single();
    if (error || !complaint) return apiError("NOT_FOUND", "Complaint not found.", 404);
    if (!["resolved", "closed"].includes(complaint.status)) {
      return apiError("VALIDATION", "You can only rate a complaint once it is resolved.", 422);
    }
    const { data: existing } = await admin
      .from("complaint_events")
      .select("id")
      .eq("complaint_id", id)
      .eq("event", "feedback")
      .limit(1);
    if (existing && existing.length > 0) {
      return apiError("VALIDATION", "You have already shared feedback for this complaint.", 422);
    }
    const { error: insertError } = await admin.from("complaint_events").insert({
      complaint_id: id,
      event: "feedback",
      actor_id: session.userId,
      meta: {
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
    });
    if (insertError) throw new Error(insertError.message);
    return Response.json({ ok: true });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
