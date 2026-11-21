// My complaints — list with status filter, search and pagination.
// Real data only (own complaints via RLS on the anon server client).
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Button,
  EmptyState,
  GlassCard,
  PageHeader,
  SeverityBadge,
  StatusPill,
  inputClass,
} from "@/components/ui";
import type { ComplaintStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const STATUSES: { value: ComplaintStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "received", label: "Received" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "reopened", label: "Reopened" },
];

export default async function MyComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionProfile();
  const supabase = await createClient();
  const status = (params.status ?? "all") as ComplaintStatus | "all";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  let query = supabase
    .from("complaints")
    .select(
      "id,ticket_no,title,severity,status,sla_due_at,created_at,ward_id,category_id",
      { count: "exact" },
    )
    .eq("citizen_id", session?.userId ?? "")
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, count } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

  const list = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [{ data: wards }, { data: categories }] = await Promise.all([
    supabase.from("wards").select("id,name"),
    supabase.from("categories").select("id,name"),
  ]);
  const wardName = new Map((wards ?? []).map((w) => [w.id, w.name]));
  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const href = (over: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (over.status ?? (status !== "all" ? status : "")) sp.set("status", over.status ?? status);
    if (over.q ?? q) sp.set("q", over.q ?? q);
    if (over.page ?? (page > 1 ? String(page) : "")) sp.set("page", over.page ?? String(page));
    const s = sp.toString();
    return s ? `/citizen/complaints?${s}` : "/citizen/complaints";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your complaints"
        title="My complaints"
        sub="Every issue you have reported, with its current status. Open one to see the department's progress and resolution."
        actions={
          <Link
            href="/citizen/report"
            data-testid="complaints-new"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(79,70,229,0.45)]"
          >
            Report an issue
          </Link>
        }
      />

      <GlassCard className="p-3 sm:p-4">
        <form
          method="get"
          action="/citizen/complaints"
          className="flex flex-wrap items-center gap-2"
          data-testid="complaints-filter-form"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by title…"
            className={`${inputClass} min-h-[44px] flex-1 sm:max-w-xs`}
            data-testid="complaints-search"
          />
          <select
            name="status"
            defaultValue={status}
            className={`${inputClass} min-h-[44px] w-auto`}
            data-testid="complaints-status-filter"
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit" data-testid="complaints-apply-filter">
            Apply
          </Button>
        </form>
      </GlassCard>

      {list.length === 0 ? (
        <EmptyState
          title="No complaints match"
          body={
            q || status !== "all"
              ? "Try a different search or filter."
              : "You have not reported any issues yet."
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/citizen/complaints/${c.id}`}
                data-testid={`complaint-row-${c.ticket_no}`}
                className="glass block rounded-3xl p-4 transition-all hover:-translate-y-px hover:bg-white/90 hover:shadow-[0_16px_32px_-16px_rgba(17,27,69,0.25)] sm:p-5"
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
                  {c.category_id ? `${catName.get(c.category_id) ?? "Issue"} · ` : ""}
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

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={href({ page: String(page - 1) })}
              data-testid="complaints-prev-page"
              className="glass inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-navy-ink transition-all hover:bg-white/90"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-slate-muted">
            Page {page} of {totalPages} · {total} complaint{total === 1 ? "" : "s"}
          </span>
          {page < totalPages ? (
            <Link
              href={href({ page: String(page + 1) })}
              data-testid="complaints-next-page"
              className="glass inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-navy-ink transition-all hover:bg-white/90"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
