// GET /api/admin/departments/[id] — full review data for the drawer:
// department, wards, categories, officers, documents, open-complaint count,
// eligible suspend targets, duplicate warnings, audit history.
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
    const { data: dept, error: dErr } = await admin
      .from("departments")
      .select("*")
      .eq("id", id)
      .single();
    if (dErr || !dept) {
      return apiError("NOT_FOUND", "Department not found.", 404);
    }
    const [wardsRes, catsRes, officersRes, docsRes, openRes, historyRes, allDeptsRes] =
      await Promise.all([
        admin
          .from("department_wards")
          .select("ward_id,wards(id,name,zone)")
          .eq("department_id", id),
        admin
          .from("department_categories")
          .select("category_id,categories(id,slug,name)")
          .eq("department_id", id),
        admin
          .from("department_officers")
          .select("*")
          .eq("department_id", id)
          .order("created_at"),
        admin
          .from("department_documents")
          .select("*")
          .eq("department_id", id)
          .order("created_at"),
        admin
          .from("complaints")
          .select("id", { count: "exact", head: true })
          .eq("department_id", id)
          .not("status", "in", '("resolved","closed")'),
        admin
          .from("audit_log")
          .select("*")
          .eq("entity_type", "department")
          .eq("entity_id", id)
          .order("seq", { ascending: false })
          .limit(20),
        admin
          .from("departments")
          .select("id,name,official_email,status")
          .neq("id", id)
          .not("status", "in", '("rejected","deactivated")'),
      ]);
    const wards = (wardsRes.data ?? []).map((r) => r.wards).filter(Boolean);
    const categories = (catsRes.data ?? []).map((r) => r.categories).filter(Boolean);
    const officers = officersRes.data ?? [];
    const documents = docsRes.data ?? [];
    const openComplaints = openRes.count ?? 0;

    // Duplicate warnings: same live email, or same name sharing a ward.
    const others = allDeptsRes.data ?? [];
    const emailDuplicate = others.some(
      (o) => o.official_email.toLowerCase() === dept.official_email.toLowerCase(),
    );
    const wardIds = new Set((wardsRes.data ?? []).map((r) => r.ward_id));
    const { data: otherWards } = others.length
      ? await admin
          .from("department_wards")
          .select("department_id,ward_id")
          .in(
            "department_id",
            others.map((o) => o.id),
          )
      : { data: [] };
    const nameWardOverlap = others
      .filter((o) => o.name.toLowerCase() === dept.name.toLowerCase())
      .filter((o) =>
        (otherWards ?? []).some(
          (w) => w.department_id === o.id && wardIds.has(w.ward_id),
        ),
      )
      .map((o) => o.name);

    // Eligible suspend targets: ACTIVE departments covering every ward +
    // every category of this department.
    const catIds = new Set((catsRes.data ?? []).map((r) => r.category_id));
    const { data: activeDepts } = await admin
      .from("departments")
      .select("id,name")
      .eq("status", "active")
      .neq("id", id);
    const eligibleTargets: { id: string; name: string }[] = [];
    const activeList = activeDepts ?? [];
    if (activeList.length > 0) {
      const activeIds = activeList.map((d) => d.id);
      const [tw, tc] = await Promise.all([
        admin
          .from("department_wards")
          .select("department_id,ward_id")
          .in("department_id", activeIds),
        admin
          .from("department_categories")
          .select("department_id,category_id")
          .in("department_id", activeIds),
      ]);
      for (const d of activeList) {
        const dw = new Set(
          (tw.data ?? []).filter((x) => x.department_id === d.id).map((x) => x.ward_id),
        );
        const dc = new Set(
          (tc.data ?? []).filter((x) => x.department_id === d.id).map((x) => x.category_id),
        );
        const coversWards = [...wardIds].every((w) => dw.has(w));
        const coversCats = [...catIds].every((c) => dc.has(c));
        if (coversWards && coversCats) eligibleTargets.push(d);
      }
    }

    return Response.json({
      department: dept,
      wards,
      categories,
      officers,
      documents,
      openComplaints,
      duplicates: { emailDuplicate, nameWardOverlap },
      eligibleTargets,
      history: historyRes.data ?? [],
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
