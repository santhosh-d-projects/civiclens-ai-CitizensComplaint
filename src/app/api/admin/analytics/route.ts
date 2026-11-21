// GET /api/admin/analytics — city analytics from real data:
// complaints by category / ward / department / day (last 30 days),
// average resolution time, AI model vs fallback share.
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const admin = createAdminClient();
    const [complaintsRes, aiRes, catsRes, wardsRes, deptsRes] = await Promise.all([
      admin
        .from("complaints")
        .select("id,category_id,ward_id,department_id,severity,status,created_at,resolved_at"),
      admin.from("ai_analysis_log").select("source,created_at"),
      admin.from("categories").select("id,name,slug"),
      admin.from("wards").select("id,name"),
      admin.from("departments").select("id,name"),
    ]);
    if (complaintsRes.error) throw new Error(complaintsRes.error.message);
    const complaints = complaintsRes.data ?? [];
    const catName = new Map((catsRes.data ?? []).map((c) => [c.id, c.name]));
    const wardName = new Map((wardsRes.data ?? []).map((w) => [w.id, w.name]));
    const deptName = new Map((deptsRes.data ?? []).map((d) => [d.id, d.name]));
    const byCategory: Record<string, number> = {};
    const byWard: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const resolutionHours: number[] = [];
    for (const c of complaints) {
      byCategory[catName.get(c.category_id ?? -1) ?? "Unknown"] =
        (byCategory[catName.get(c.category_id ?? -1) ?? "Unknown"] ?? 0) + 1;
      byWard[wardName.get(c.ward_id ?? -1) ?? "Unknown"] =
        (byWard[wardName.get(c.ward_id ?? -1) ?? "Unknown"] ?? 0) + 1;
      byDepartment[deptName.get(c.department_id) ?? "Unknown"] =
        (byDepartment[deptName.get(c.department_id) ?? "Unknown"] ?? 0) + 1;
      const day = c.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
      if (c.resolved_at) {
        resolutionHours.push(
          (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) /
            3_600_000,
        );
      }
    }
    const aiBySource: Record<string, number> = {};
    for (const r of aiRes.data ?? []) {
      aiBySource[r.source] = (aiBySource[r.source] ?? 0) + 1;
    }
    const avgResolutionHours =
      resolutionHours.length > 0
        ? Math.round(
            (resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10,
          ) / 10
        : null;
    return Response.json({
      total: complaints.length,
      byCategory,
      byWard,
      byDepartment,
      byDay,
      avgResolutionHours,
      resolvedCount: resolutionHours.length,
      aiBySource,
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
