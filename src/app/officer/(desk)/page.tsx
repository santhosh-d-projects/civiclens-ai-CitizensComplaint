// Officer dashboard — counts + SLA-at-risk + recent queue preview, all for
// the officer's own (active) department. Real data only; empty states when
// there is nothing.
import Link from "next/link";
import { requireActiveDepartment } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SeverityBadge, StatusPill, EmptyState, GlassCard, StatCard, PageHeader } from "@/components/ui";
import { slaLabel, formatDateTime } from "@/app/officer/format";
import type { Complaint, ComplaintStatus } from "@/lib/database.types";

const OPEN: ComplaintStatus[] = ["submitted", "received", "in_progress", "reopened"];

export default async function OfficerDashboard() {
  const { session, departmentId } = await requireActiveDepartment();
  const admin = createAdminClient();

  const { data: dept } = await admin
    .from("departments")
    .select("name")
    .eq("id", departmentId)
    .single();
  const deptName = (dept as { name: string } | null)?.name ?? "Your department";

  const countQuery = () =>
    admin
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId);
  const [{ count: openCount }, { count: inProgressCount }, { count: resolvedCount }, { count: overdueCount }] =
    await Promise.all([
      countQuery().in("status", OPEN),
      countQuery().eq("status", "in_progress"),
      countQuery().eq("status", "resolved"),
      countQuery()
        .in("status", OPEN)
        .lt("sla_due_at", new Date().toISOString()),
    ]);

  const { data: recent } = await admin
    .from("complaints")
    .select("id,ticket_no,title,severity,status,sla_due_at,created_at,ward_id")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = (recent ?? []) as Pick<
    Complaint,
    "id" | "ticket_no" | "title" | "severity" | "status" | "sla_due_at" | "created_at" | "ward_id"
  >[];

  const wards = new Map<number, string>();
  if (rows.length > 0) {
    const { data: w } = await admin.from("wards").select("id,name");
    ((w ?? []) as { id: number; name: string }[]).forEach((x) => wards.set(x.id, x.name));
  }

  const cards = [
    { label: "Open complaints", value: String(openCount ?? 0), tone: "indigo" as const, testId: "kpi-open" },
    { label: "In progress", value: String(inProgressCount ?? 0), tone: "blue" as const, testId: "kpi-in-progress" },
    { label: "Resolved", value: String(resolvedCount ?? 0), tone: "green" as const, testId: "kpi-resolved" },
    { label: "SLA overdue", value: String(overdueCount ?? 0), tone: "red" as const, testId: "kpi-overdue" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Officer Desk"
        title="Department Officer Desk"
        sub={`${deptName} · ${session.profile.full_name ?? session.email}`}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            tone={c.tone}
            testId={c.testId}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy-ink">Latest complaints</h2>
        <Link
          href="/officer/complaints"
          data-testid="dashboard-view-queue"
          className="rounded-full px-3 py-2 text-sm font-semibold text-indigo transition-colors hover:bg-indigo/5 hover:underline"
        >
          View full queue →
        </Link>
      </div>
      <div className="mt-3">
        {rows.length === 0 ? (
          <EmptyState
            title="No complaints yet"
            body="Complaints citizens confirm for your department will appear here."
          />
        ) : (
          <GlassCard className="overflow-hidden p-0">
            <ul className="divide-y divide-line/60">
              {rows.map((c) => {
                const sla = slaLabel(c.sla_due_at);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/officer/complaints/${c.id}`}
                      data-testid={`dashboard-complaint-${c.ticket_no}`}
                      className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/70 sm:px-5"
                    >
                      <span className="tnum text-sm font-semibold text-navy-ink">{c.ticket_no}</span>
                      <SeverityBadge severity={c.severity} />
                      <StatusPill status={c.status} />
                      <span className="min-w-0 flex-1 truncate text-sm text-navy-ink">{c.title}</span>
                      <span className="text-xs text-slate-muted">
                        {c.ward_id ? wards.get(c.ward_id) ?? "" : ""}
                      </span>
                      <span
                        className={`text-xs font-semibold ${sla.tone === "bad" ? "text-critical" : sla.tone === "warn" ? "text-high" : "text-slate-muted"}`}
                      >
                        {sla.text}
                      </span>
                      <span className="tnum text-xs text-slate-muted">{formatDateTime(c.created_at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
