// GET /api/complaints/:id — one complaint, owner only (404 for others).
import { getSessionProfile, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionProfile();
    if (!session) return apiError("UNAUTHORIZED", "Sign in to view a complaint.", 401);
    const { id } = await params;
    const admin = createAdminClient();
    const { data: complaint, error } = await admin
      .from("complaints")
      .select("*")
      .eq("id", id)
      .eq("citizen_id", session.userId)
      .single();
    if (error || !complaint) return apiError("NOT_FOUND", "Complaint not found.", 404);

    const [{ data: events }, { data: department }, { data: ward }, { data: category }, { data: transfers }] =
      await Promise.all([
        admin
          .from("complaint_events")
          .select("id,event,meta,created_at")
          .eq("complaint_id", id)
          .order("created_at", { ascending: true }),
        admin
          .from("departments")
          .select("id,name,status")
          .eq("id", complaint.department_id)
          .single(),
        complaint.ward_id
          ? admin.from("wards").select("id,name").eq("id", complaint.ward_id).single()
          : Promise.resolve({ data: null }),
        complaint.category_id
          ? admin.from("categories").select("id,name").eq("id", complaint.category_id).single()
          : Promise.resolve({ data: null }),
        admin
          .from("complaint_transfers")
          .select("id,from_department_id,to_department_id,reason,created_at")
          .eq("complaint_id", id)
          .order("created_at", { ascending: true }),
      ]);

    return Response.json({
      complaint,
      events: events ?? [],
      department: department ?? null,
      ward: ward ?? null,
      category: category ?? null,
      transfers: transfers ?? [],
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
