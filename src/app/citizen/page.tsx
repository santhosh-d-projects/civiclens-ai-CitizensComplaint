// Citizen home — greeting, open/resolved counts, latest complaints,
// quick actions. All data is real (own complaints via RLS).
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button, EmptyState, SeverityBadge, StatusPill } from "@/components/ui";

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
      <section>
        <h1 className="text-2xl font-semibold">
          Namaskara{session?.profile.full_name ? `, ${session.profile.full_name}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-slate-muted">
          Report a civic issue in Bengaluru and track it till it is fixed. Our
          AI suggests the right department — you confirm it.
        </p>
        <div className="mt-4">
          <Link href="/citizen/report">
            <Button data-testid="home-report-cta">Report an issue</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="tnum text-3xl font-semibold">{open.length}</p>
          <p className="mt-1 text-sm text-slate-muted">Open complaints</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="tnum text-3xl font-semibold">{resolved.length}</p>
          <p className="mt-1 text-sm text-slate-muted">Resolved / closed</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="tnum text-3xl font-semibold">{list.length}</p>
          <p className="mt-1 text-sm text-slate-muted">Total reported</p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your recent complaints</h2>
          <Link
            href="/citizen/complaints"
            data-testid="home-view-all"
            className="text-sm font-semibold text-teal hover:underline"
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
                <Link href="/citizen/report">
                  <Button data-testid="home-empty-report">Report an issue</Button>
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
                  className="block rounded-lg border border-line bg-white p-4 hover:border-teal"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      <span className="tnum text-slate-muted">{c.ticket_no}</span>
                      {" · "}
                      {c.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <StatusPill status={c.status} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-muted">
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

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-muted">
          <li>Describe the issue in English, Kannada or Hindi — photos help.</li>
          <li>
            The AI suggests a category, severity and department. You confirm or
            change it.
          </li>
          <li>
            You get a ticket number and a timeline. You are notified when the
            department marks it resolved.
          </li>
        </ol>
      </section>
    </div>
  );
}
