// GET /api/department/complaints/[id] — one complaint of the officer's own
// department (404 otherwise). PATCH — status update via the
// officer_update_complaint SQL function (enforces: officer of the dept,
// dept active, complaint belongs to dept, resolution note required when
// resolving).
import { requireActiveDepartment, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import { validateOfficerUpdate } from "@/lib/officer-update";
import type { Complaint, ComplaintStatus } from "@/lib/database.types";

async function loadComplaint(id: string, departmentId: string) {
  const admin = createAdminClient();
  const { data: complaint } = await admin
    .from("complaints")
    .select("*")
    .eq("id", id)
    .eq("department_id", departmentId)
    .single();
  return { admin, complaint: complaint as Complaint | null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { departmentId } = await requireActiveDepartment();
    const { id } = await params;
    const { admin, complaint } = await loadComplaint(id, departmentId);
    if (!complaint) return apiError("NOT_FOUND", "Complaint not found.", 404);

    const [{ data: events }, { data: ward }, { data: cat }, { data: citizen }] =
      await Promise.all([
        admin
          .from("complaint_events")
          .select("id,event,actor_id,meta,created_at")
          .eq("complaint_id", id)
          .order("created_at", { ascending: true }),
        complaint.ward_id
          ? admin.from("wards").select("id,name").eq("id", complaint.ward_id).single()
          : Promise.resolve({ data: null }),
        complaint.category_id
          ? admin.from("categories").select("id,slug,name").eq("id", complaint.category_id).single()
          : Promise.resolve({ data: null }),
        admin.from("profiles").select("full_name").eq("id", complaint.citizen_id).single(),
      ]);

    return Response.json({
      complaint,
      events: events ?? [],
      ward: (ward as { id: number; name: string } | null) ?? null,
      category: (cat as { id: number; slug: string; name: string } | null) ?? null,
      citizen_name:
        (citizen as { full_name: string | null } | null)?.full_name ?? null,
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session } = await requireActiveDepartment();
    const { id } = await params;
    const body = await req.json();
    const validated = validateOfficerUpdate(body);
    if (!validated.ok) {
      return apiError("VALIDATION", validated.error, 422);
    }
    const v = validated.data;
    const admin = createAdminClient();
    const updated = await callDbFunction<Complaint>(admin, "officer_update_complaint", {
      p_officer: session.userId,
      p_complaint: id,
      p_status: v.status as ComplaintStatus,
      p_note: v.note ?? null,
      p_photos: v.resolution_photo_paths ?? null,
    });
    return Response.json({ complaint: updated });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
