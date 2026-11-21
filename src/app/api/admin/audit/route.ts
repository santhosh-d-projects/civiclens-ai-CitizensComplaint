// GET /api/admin/audit — append-only audit log with filters + pagination.
// Filters: action, entity_type, actor_role, from (ISO), to (ISO), q.
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const actorRole = searchParams.get("actor_role");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, Number(searchParams.get("per_page") ?? 25) || 25),
    );
    const admin = createAdminClient();
    let query = admin
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("seq", { ascending: false });
    if (action) query = query.eq("action", action);
    if (entityType) query = query.eq("entity_type", entityType);
    if (actorRole) query = query.eq("actor_role", actorRole);
    if (from) query = query.gte("ts", from);
    if (to) query = query.lte("ts", to);
    if (q) query = query.or(`action.ilike.%${q}%,reason.ilike.%${q}%`);
    const { data, count, error: qErr } = await query.range(
      (page - 1) * perPage,
      page * perPage - 1,
    );
    if (qErr) throw new Error(qErr.message);
    // Distinct actions for the filter dropdown.
    const { data: actions } = await admin
      .from("audit_log")
      .select("action")
      .limit(500);
    const distinctActions = [...new Set((actions ?? []).map((a) => a.action))].sort();
    return Response.json({
      events: data ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
      distinctActions,
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
