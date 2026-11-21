// GET /api/admin/complaints — READ-ONLY city-wide registry.
// Filters: department_id, status, severity, q (ticket/title), page.
// The admin never assigns, routes or overrides individual complaints.
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("department_id");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, Number(searchParams.get("per_page") ?? 20) || 20),
    );
    const admin = createAdminClient();
    let query = admin
      .from("complaints")
      .select(
        "id,ticket_no,title,severity,status,department_id,ward_id,category_id,citizen_id,sla_due_at,created_at,ai_suggested_department_id,citizen_changed_suggestion",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });
    if (departmentId) query = query.eq("department_id", departmentId);
    const validStatuses = ["submitted", "received", "in_progress", "resolved", "closed", "reopened"];
    const validSeverities = ["critical", "high", "medium", "low"];
    if (status && validStatuses.includes(status)) query = query.eq("status", status as never);
    if (severity && validSeverities.includes(severity)) query = query.eq("severity", severity as never);
    if (q) query = query.or(`ticket_no.ilike.%${q}%,title.ilike.%${q}%`);
    const { data, count, error: qErr } = await query.range(
      (page - 1) * perPage,
      page * perPage - 1,
    );
    if (qErr) throw new Error(qErr.message);
    const [deptsRes, wardsRes, catsRes] = await Promise.all([
      admin.from("departments").select("id,name"),
      admin.from("wards").select("id,name"),
      admin.from("categories").select("id,name,slug"),
    ]);
    const deptName = new Map((deptsRes.data ?? []).map((d) => [d.id, d.name]));
    const wardName = new Map((wardsRes.data ?? []).map((w) => [w.id, w.name]));
    const catName = new Map((catsRes.data ?? []).map((c) => [c.id, c.name]));
    return Response.json({
      complaints: (data ?? []).map((c) => ({
        ...c,
        department_name: deptName.get(c.department_id) ?? "—",
        ward_name: c.ward_id ? (wardName.get(c.ward_id) ?? "—") : "—",
        category_name: c.category_id ? (catName.get(c.category_id) ?? "—") : "—",
      })),
      total: count ?? 0,
      page,
      per_page: perPage,
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
