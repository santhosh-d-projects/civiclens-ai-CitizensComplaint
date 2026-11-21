// GET /api/admin/departments/check-duplicate
// ?email=…&name=…&ward_ids=1,2,3 — duplicate warning data for the review
// drawer (same live email, or same name sharing a ward with another
// live department).
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") ?? "").trim().toLowerCase();
    const name = (searchParams.get("name") ?? "").trim().toLowerCase();
    const wardIds = (searchParams.get("ward_ids") ?? "")
      .split(",")
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
    const exclude = searchParams.get("exclude") ?? "";
    const admin = createAdminClient();
    let q = admin
      .from("departments")
      .select("id,name,official_email,status")
      .not("status", "in", '("rejected","deactivated")');
    if (exclude) q = q.neq("id", exclude);
    const { data: depts, error: dErr } = await q;
    if (dErr) throw new Error(dErr.message);
    const emailDuplicate = email
      ? (depts ?? []).some((d) => d.official_email.toLowerCase() === email)
      : false;
    let nameWardOverlap: { id: string; name: string; status: string }[] = [];
    if (name && wardIds.length > 0) {
      const sameName = (depts ?? []).filter(
        (d) => d.name.toLowerCase() === name,
      );
      if (sameName.length > 0) {
        const { data: dw } = await admin
          .from("department_wards")
          .select("department_id,ward_id")
          .in(
            "department_id",
            sameName.map((d) => d.id),
          );
        const overlapping = new Set(
          (dw ?? [])
            .filter((w) => wardIds.includes(w.ward_id))
            .map((w) => w.department_id),
        );
        nameWardOverlap = sameName.filter((d) => overlapping.has(d.id));
      }
    }
    return Response.json({ emailDuplicate, nameWardOverlap });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
