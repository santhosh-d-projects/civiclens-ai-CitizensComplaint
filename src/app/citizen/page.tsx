// Citizen home — greeting, open/resolved counts, latest complaints,
// quick actions. All data is real (own complaints via RLS).
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  SeverityBadge,
  StatCard,
  StatusPill,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["submitted", "received", "in_progress", "reopened"];

export default async function CitizenHome() {
  const session = await getSessionProfile();
  const supabase = await createClient();
  const { data: complaints } = await supabase
    .from("complaints")
    .select("id,ticket_no,title,severity,status,sla_due_at,created_at,ward_id")
    .eq("citizen_id", session?.userId ?? "")
    .order("created_at", { ascending: false })
    .limit(20);

  const list = complaints ?? [];
  const open = list.filter((c) => OPEN_STATUSES.includes(c.status));
  const resolved = list.filter((c) => ["resolved", "closed"].includes(c.status));
  const { data: wards } = await supabase.from("wards").select("id,name");
  const wardName = new Map((wards ?? []).map((w) => [w.id, w.name]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Citizen Portal · Bengaluru"
        title={`Namaskara${session?.profile.full_name ? `, ${session.profile.full_name}` : ""}.`}
        sub="Report a civic issue in Bengaluru and track it till it is fixed. Our AI suggests the right department — you confirm it."
        actions={
          <Link
            href="/citizen/report"
            data-testid="home-report-cta"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(5,150,105,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(5,150,105,0.45)]"
          >
            Report an issue
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Your complaint counts">
        <StatCard
          label="Open complaints"
          value={String(open.length)}
          tone="indigo"
          testId="home-stat-open"
        />
        <StatCard
          label="Resolved / closed"
          value={String(resolved.length)}
          tone="green"
          testId="home-stat-resolved"
        />
        <StatCard
          label="Total reported"
          value={String(list.length)}
          tone="violet"
          testId="home-stat-total"
        />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-ink">Your recent complaints</h2>
          <Link
            href="/citizen/complaints"
            data-testid="home-view-all"
            className="text-sm font-semibold text-indigo hover:text-violet hover:underline"
          >
            View all
          </Link>
        </div>
        {list.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No complaints yet"
              body="Report your first issue — a pothole, a water leak, garbage, a broken streetlight."
              action={
                <Link
                  href="/citizen/report"
                  data-testid="home-empty-report"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(5,150,105,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(5,150,105,0.45)]"
                >
                  Report an issue
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {list.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/citizen/complaints/${c.id}`}
                  data-testid={`home-complaint-${c.ticket_no}`}
                  className="glass block rounded-3xl p-4 transition-all hover:-translate-y-px hover:bg-white/90 hover:shadow-[0_16px_32px_-16px_rgba(17,27,69,0.25)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-ink">
                      <span className="tnum text-slate-muted">{c.ticket_no}</span>
                      {" · "}
                      {c.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <StatusPill status={c.status} />
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-muted">
                    {c.ward_id ? `${wardName.get(c.ward_id) ?? "Ward"} · ` : ""}
                    {new Date(c.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GlassCard className="p-6">
        <h2 className="text-base font-bold text-navy-ink">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Describe the issue",
              body: "Write it in English, Kannada or Hindi — photos help the department find it.",
            },
            {
              n: "2",
              title: "Confirm the suggestion",
              body: "The AI suggests a category, severity and department. You confirm or change it.",
            },
            {
              n: "3",
              title: "Track it till fixed",
              body: "You get a ticket number and a timeline. You are notified when the department marks it resolved.",
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-violet text-sm font-bold text-white shadow-[0_6px_14px_rgba(5,150,105,0.35)]">
                {s.n}
              </span>
              <span>
                <span className="block text-sm font-semibold text-navy-ink">{s.title}</span>
                <span className="mt-0.5 block text-sm leading-6 text-slate-muted">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </GlassCard>
    </div>
  );
}
