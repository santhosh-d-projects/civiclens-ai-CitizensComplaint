// GET /api/admin/dashboard — KPI counts + recent activity (real data).
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const admin = createAdminClient();
    const [complaintsRes, deptsRes, auditRes] = await Promise.all([
      admin.from("complaints").select("id,status,severity,department_id,created_at"),
      admin.from("departments").select("id,status"),
      admin
        .from("audit_log")
        .select("seq,event_id,ts,actor_role,action,entity_type,entity_id,old_status,new_status,reason")
        .order("seq", { ascending: false })
        .limit(8),
    ]);
    if (complaintsRes.error) throw new Error(complaintsRes.error.message);
    if (deptsRes.error) throw new Error(deptsRes.error.message);
    const complaints = complaintsRes.data ?? [];
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    for (const c of complaints) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
      byDepartment[c.department_id] = (byDepartment[c.department_id] ?? 0) + 1;
    }
    const deptStatus: Record<string, number> = {};
    for (const d of deptsRes.data ?? []) {
      deptStatus[d.status] = (deptStatus[d.status] ?? 0) + 1;
    }
    return Response.json({
      complaints: {
        total: complaints.length,
        byStatus,
        bySeverity,
        byDepartment,
      },
      departments: { total: (deptsRes.data ?? []).length, byStatus: deptStatus },
      recentAudit: auditRes.data ?? [],
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
