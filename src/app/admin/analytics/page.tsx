import AnalyticsCharts from "./AnalyticsCharts";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();
  const [complaintsRes, aiRes, catsRes, wardsRes, deptsRes] = await Promise.all([
    admin.from("complaints").select("id,category_id,ward_id,department_id,severity,status,created_at,resolved_at"),
    admin.from("ai_analysis_log").select("source,created_at"),
    admin.from("categories").select("id,name,slug"),
    admin.from("wards").select("id,name"),
    admin.from("departments").select("id,name"),
  ]);
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
    const cat = catName.get(c.category_id ?? -1) ?? "Unknown";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    const ward = wardName.get(c.ward_id ?? -1) ?? "Unknown";
    byWard[ward] = (byWard[ward] ?? 0) + 1;
    const dept = deptName.get(c.department_id) ?? "Unknown";
    byDepartment[dept] = (byDepartment[dept] ?? 0) + 1;
    const day = c.created_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
    if (c.resolved_at) {
      resolutionHours.push(
        (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / 3_600_000,
      );
    }
  }
  const aiBySource: Record<string, number> = {};
  for (const r of aiRes.data ?? []) aiBySource[r.source] = (aiBySource[r.source] ?? 0) + 1;
  const avgResolutionHours =
    resolutionHours.length > 0
      ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
      : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">City analytics</h1>
      <p className="mt-1 text-sm text-slate-muted">
        Complaint volumes, resolution times and AI performance — all from live
        data.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-xs font-medium tracking-wide text-slate-muted uppercase">Total complaints</p>
          <p className="tnum mt-2 text-3xl font-semibold">{complaints.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-xs font-medium tracking-wide text-slate-muted uppercase">Avg. resolution time</p>
          <p className="tnum mt-2 text-3xl font-semibold">{avgResolutionHours === null ? "—" : `${avgResolutionHours}h`}</p>
          <p className="mt-1 text-sm text-slate-muted">{resolutionHours.length} resolved</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-xs font-medium tracking-wide text-slate-muted uppercase">Wards with complaints</p>
          <p className="tnum mt-2 text-3xl font-semibold">{Object.keys(byWard).length}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-xs font-medium tracking-wide text-slate-muted uppercase">Departments receiving</p>
          <p className="tnum mt-2 text-3xl font-semibold">{Object.keys(byDepartment).length}</p>
        </div>
      </div>
      <div className="mt-6">
        <AnalyticsCharts
          byCategory={byCategory}
          byWard={byWard}
          byDepartment={byDepartment}
          byDay={byDay}
          aiBySource={aiBySource}
        />
      </div>
    </div>
  );
}
