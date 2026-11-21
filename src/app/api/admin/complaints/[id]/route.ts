// GET /api/admin/complaints/[id] — read-only detail for the admin drawer:
// complaint + timeline events + AI analysis record + transfers.
// Admins monitor; they never edit, assign or route a complaint.
import { requireAdmin } from "@/lib/admin-api";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { id } = await params;
    const admin = createAdminClient();
    const { data: complaint, error: cErr } = await admin
      .from("complaints")
      .select("*")
      .eq("id", id)
      .single();
    if (cErr || !complaint) {
      return apiError("NOT_FOUND", "Complaint not found.", 404);
    }
    const [eventsRes, aiRes, transfersRes, deptRes, wardRes, catRes] =
      await Promise.all([
        admin
          .from("complaint_events")
          .select("*")
          .eq("complaint_id", id)
          .order("created_at"),
        admin
          .from("ai_analysis_log")
          .select("*")
          .eq("complaint_id", id)
          .order("created_at", { ascending: false })
          .limit(1),
        admin
          .from("complaint_transfers")
          .select("*")
          .eq("complaint_id", id)
          .order("created_at"),
        admin
          .from("departments")
          .select("id,name")
          .eq("id", complaint.department_id)
          .maybeSingle(),
        complaint.ward_id
          ? admin.from("wards").select("id,name").eq("id", complaint.ward_id).maybeSingle()
          : Promise.resolve({ data: null }),
        complaint.category_id
          ? admin.from("categories").select("id,name").eq("id", complaint.category_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
    return Response.json({
      complaint: {
        ...complaint,
        department_name: deptRes.data?.name ?? "—",
        ward_name: wardRes.data?.name ?? "—",
        category_name: catRes.data?.name ?? "—",
      },
      events: eventsRes.data ?? [],
      aiLog: aiRes.data?.[0] ?? null,
      transfers: transfersRes.data ?? [],
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
