// Officer complaint detail — full complaint, evidence photos (signed
// URLs), timeline, AI suggestion record, and the status-update form.
// Server component fetches with the admin client (department-scoped);
// the form is a client component that PATCHes the API route.
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { requireActiveDepartment } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SeverityBadge, StatusPill } from "@/components/ui";
import { slaLabel, formatDateTime } from "@/app/officer/format";
import UpdateForm from "./UpdateForm";
import type { Complaint, ComplaintEvent } from "@/lib/database.types";

const EVENT_LABELS: Record<string, string> = {
  submitted: "Complaint submitted",
  status_received: "Marked received",
  status_in_progress: "Work started",
  status_resolved: "Marked resolved",
  status_closed: "Closed",
  status_reopened: "Reopened",
};

export default async function OfficerComplaintDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let guard;
  try {
    guard = await requireActiveDepartment();
  } catch {
    redirect("/officer/blocked?status=pending");
  }
  const { departmentId } = guard;
  const admin = createAdminClient();

  const { data: complaint } = await admin
    .from("complaints")
    .select("*")
    .eq("id", id)
    .eq("department_id", departmentId)
    .single();
  const c = complaint as Complaint | null;
  if (!c) notFound();

  const [{ data: events }, { data: ward }, { data: cat }, { data: citizen }, { data: dept }] =
    await Promise.all([
      admin
        .from("complaint_events")
        .select("id,event,actor_id,meta,created_at")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true }),
      c.ward_id
        ? admin.from("wards").select("id,name").eq("id", c.ward_id).single()
        : Promise.resolve({ data: null }),
      c.category_id
        ? admin.from("categories").select("id,slug,name").eq("id", c.category_id).single()
        : Promise.resolve({ data: null }),
      admin.from("profiles").select("full_name,email").eq("id", c.citizen_id).single(),
      admin.from("departments").select("name").eq("id", c.department_id).single(),
    ]);

  const actorIds = [...new Set(((events ?? []) as ComplaintEvent[]).map((e) => e.actor_id).filter(Boolean))] as string[];
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await admin.from("profiles").select("id,full_name").in("id", actorIds);
    ((actors ?? []) as { id: string; full_name: string | null }[]).forEach((a) =>
      actorNames.set(a.id, a.full_name ?? "Officer"),
    );
  }

  // Signed URLs for private-bucket photos (1h, server-side only).
  const photoUrls: { path: string; url: string }[] = [];
  for (const path of c.photo_paths ?? []) {
    const { data } = await admin.storage.from("complaint-photos").createSignedUrl(path, 3600);
    if (data?.signedUrl) photoUrls.push({ path, url: data.signedUrl });
  }
  const resolutionUrls: { path: string; url: string }[] = [];
  for (const path of c.resolution_photo_paths ?? []) {
    const { data } = await admin.storage.from("complaint-photos").createSignedUrl(path, 3600);
    if (data?.signedUrl) resolutionUrls.push({ path, url: data.signedUrl });
  }

  const sla = slaLabel(c.sla_due_at);
  const timeline = (events ?? []) as ComplaintEvent[];

  return (
    <div>
      <a href="/officer/complaints" className="text-sm font-semibold text-teal hover:underline" data-testid="detail-back-queue">
        ← Back to queue
      </a>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="tnum text-2xl font-semibold">{c.ticket_no}</h1>
            <SeverityBadge severity={c.severity} />
            <StatusPill status={c.status} />
          </div>
          <h2 className="mt-1 text-lg font-semibold">{c.title}</h2>
          <p className="mt-1 text-sm text-slate-muted">
            {(dept as { name: string } | null)?.name ?? ""} ·{" "}
            {(ward as { name: string } | null)?.name ?? "Ward not set"} ·{" "}
            {(cat as { name: string } | null)?.name ?? "Uncategorised"} · Submitted{" "}
            {formatDateTime(c.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${sla.tone === "bad" ? "bg-critical-bg text-critical" : sla.tone === "warn" ? "bg-high-bg text-high" : "bg-low-bg text-low"}`}
          data-testid="detail-sla"
        >
          {sla.text}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-line bg-white p-5">
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{c.description}</p>
            {c.address && (
              <p className="mt-3 text-sm text-slate-muted">Location: {c.address}</p>
            )}
            {c.language && c.language !== "en" && (
              <p className="mt-1 text-xs text-slate-muted">Reported in {c.language.toUpperCase()}</p>
            )}
          </section>

          {photoUrls.length > 0 && (
            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="text-sm font-semibold">Citizen photos</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photoUrls.map((p) => (
                  <a key={p.path} href={p.url} target="_blank" rel="noreferrer" data-testid="detail-photo">
                    <img src={p.url} alt="Complaint evidence" className="h-32 w-full rounded object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {resolutionUrls.length > 0 && (
            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="text-sm font-semibold">Resolution proof</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {resolutionUrls.map((p) => (
                  <a key={p.path} href={p.url} target="_blank" rel="noreferrer" data-testid="detail-resolution-photo">
                    <img src={p.url} alt="Resolution proof" className="h-32 w-full rounded object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-line bg-white p-5">
            <h3 className="text-sm font-semibold">Timeline</h3>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-slate-muted">No events recorded yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {timeline.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                    <div>
                      <p className="font-semibold">{EVENT_LABELS[e.event] ?? e.event}</p>
                      <p className="text-xs text-slate-muted">
                        {formatDateTime(e.created_at)}
                        {e.actor_id ? ` · ${actorNames.get(e.actor_id) ?? "Officer"}` : ""}
                      </p>
                      {typeof e.meta?.note === "string" && e.meta.note !== "" && (
                        <p className="mt-1 text-slate-muted">{e.meta.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h3 className="text-sm font-semibold">Citizen</h3>
            <p className="mt-2 text-sm">
              {(citizen as { full_name: string | null } | null)?.full_name ?? "Citizen"}
            </p>
            <p className="mt-1 text-xs text-slate-muted">
              Contact details are not shown to officers. The citizen is notified of status changes.
            </p>
          </section>

          {c.ai_reason && (
            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="text-sm font-semibold">AI suggestion (for reference)</h3>
              <p className="mt-2 text-sm text-slate-muted">{c.ai_reason}</p>
              <p className="tnum mt-1 text-xs text-slate-muted">
                Confidence {c.ai_confidence != null ? `${Math.round(c.ai_confidence * 100)}%` : "—"}
                {c.citizen_changed_suggestion ? " · citizen changed the suggested department" : ""}
              </p>
            </section>
          )}

          {c.resolution_note && (
            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="text-sm font-semibold">Resolution note</h3>
              <p className="mt-2 text-sm">{c.resolution_note}</p>
              {c.resolved_at && (
                <p className="tnum mt-1 text-xs text-slate-muted">Resolved {formatDateTime(c.resolved_at)}</p>
              )}
            </section>
          )}

          <UpdateForm complaintId={c.id} currentStatus={c.status} />
        </div>
      </div>
    </div>
  );
}
