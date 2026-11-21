// Officer blocked screen — shown when the officer's department is not
// `active`. Variants by status: pending (approved but not yet activated),
// suspended (with transfer details), deactivated, rejected.
// This page is OUTSIDE the (desk) layout: it must render for officers whose
// department guard fails, and it never requires an active department.
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill, GlassCard } from "@/components/ui";

const COPY: Record<
  string,
  { title: string; body: string; next: string }
> = {
  pending: {
    title: "Pending Approval",
    body: "Your department has been approved but not yet activated. Officer login stays disabled until an administrator activates the department and sends your invite.",
    next: "Once activated, your officer invite will arrive by email and you can set your password to sign in.",
  },
  changes_requested: {
    title: "Changes Requested",
    body: "The administrator asked for changes to your department application before it can be approved.",
    next: "The applicant should review the requested changes and resubmit. Your login will be enabled after approval and activation.",
  },
  approved: {
    title: "Approved — Not Yet Active",
    body: "Your department is approved, but activation is a separate step. Officer login stays disabled until an administrator activates the department.",
    next: "Once activated, your officer invite will arrive by email and you can set your password to sign in.",
  },
  suspended: {
    title: "Department Suspended",
    body: "Your department has been suspended by an administrator. You cannot access the complaint queue while suspended.",
    next: "Open complaints were moved to another active department (see below). Contact the administrator for the reason and next steps.",
  },
  deactivated: {
    title: "Department Deactivated",
    body: "Your department has been deactivated by an administrator. Officer login is disabled.",
    next: "Contact the administrator if you believe this is a mistake. A deactivated department can be reactivated by an administrator.",
  },
  rejected: {
    title: "Application Rejected",
    body: "Your department application was rejected by an administrator.",
    next: "Contact the administrator for the recorded reason. A new application can be submitted from the public portal.",
  },
  draft: {
    title: "Department Not Submitted",
    body: "Your department application is still a draft and has not been submitted for review.",
    next: "Submit the application for review; an administrator will approve and activate it before officer login works.",
  },
};

export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionProfile();
  const admin = createAdminClient();

  let status = params.status ?? "pending";
  let reason: string | null = null;
  let departmentName: string | null = null;
  let transfers: {
    complaint_id: string;
    to_department_id: string;
    to_name: string;
    ticket_no: string;
    created_at: string;
  }[] = [];

  const departmentId = session?.profile.department_id ?? null;
  if (departmentId) {
    const { data: dept } = await admin
      .from("departments")
      .select("id,name,status,status_reason")
      .eq("id", departmentId)
      .single();
    const d = dept as {
      id: string;
      name: string;
      status: string;
      status_reason: string | null;
    } | null;
    if (d) {
      status = d.status;
      reason = d.status_reason;
      departmentName = d.name;
    }
    if (status === "suspended") {
      const { data: tr } = await admin
        .from("complaint_transfers")
        .select("complaint_id,to_department_id,created_at")
        .eq("from_department_id", departmentId)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (tr ?? []) as {
        complaint_id: string;
        to_department_id: string;
        created_at: string;
      }[];
      if (rows.length > 0) {
        const toIds = [...new Set(rows.map((r) => r.to_department_id))];
        const { data: depts } = await admin
          .from("departments")
          .select("id,name")
          .in("id", toIds);
        const nameById = new Map(
          ((depts ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name]),
        );
        const cIds = rows.map((r) => r.complaint_id);
        const { data: comps } = await admin
          .from("complaints")
          .select("id,ticket_no")
          .in("id", cIds);
        const ticketById = new Map(
          ((comps ?? []) as { id: string; ticket_no: string }[]).map((x) => [x.id, x.ticket_no]),
        );
        transfers = rows.map((r) => ({
          complaint_id: r.complaint_id,
          to_department_id: r.to_department_id,
          to_name: nameById.get(r.to_department_id) ?? "Unknown department",
          ticket_no: ticketById.get(r.complaint_id) ?? r.complaint_id.slice(0, 8),
          created_at: r.created_at,
        }));
      }
    }
  }

  const copy = COPY[status] ?? COPY.pending;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <GlassCard className="w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo">
          Complaint-Sathi · Officer Desk
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-ink">{copy.title}</h1>
          <StatusPill status={status} />
        </div>
        {departmentName && (
          <p className="mt-1 text-sm font-semibold text-navy-ink">{departmentName}</p>
        )}
        <p className="mt-3 text-sm leading-6 text-navy-ink">{copy.body}</p>
        {reason && (
          <div className="mt-4 rounded-2xl border border-line/60 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
              Recorded reason
            </p>
            <p className="mt-1 text-sm leading-6 text-navy-ink">{reason}</p>
          </div>
        )}
        <p className="mt-4 text-sm leading-6 text-slate-muted">{copy.next}</p>

        {status === "suspended" && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-navy-ink">
              Where your open complaints went
            </h2>
            {transfers.length === 0 ? (
              <p className="mt-1 text-sm text-slate-muted">
                No open complaints were transferred (none were open at suspension).
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/60 bg-white/60">
                {transfers.map((t) => (
                  <li key={t.complaint_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="tnum font-semibold text-navy-ink">{t.ticket_no}</span>
                    <span className="text-slate-muted">moved to</span>
                    <span className="text-right font-semibold text-navy-ink">{t.to_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
            data-testid="blocked-go-login"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(5,150,105,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(5,150,105,0.45)]"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            data-testid="blocked-go-home"
            className="glass inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-navy-ink transition-colors hover:bg-white/90"
          >
            Public portal
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
