// Complaint detail — ticket, timeline, SLA, evidence photos, citizen
// actions (feedback when resolved, reopen when resolved/closed).
// The Resolution section is prominent: for resolved complaints it shows
// the department's resolution note and after-work photos; while work is in
// progress it shows the department's progress updates from the timeline.
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlassCard, SeverityBadge, StatusPill } from "@/components/ui";
import { FeedbackForm, ReopenButton } from "./actions";

export const dynamic = "force-dynamic";

const STAGE_ORDER = [
  "submitted",
  "received",
  "in_progress",
  "resolved",
  "closed",
] as const;

function slaText(slaDueAt: string | null, status: string): string {
  if (!slaDueAt) return "No response target set.";
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  if (["resolved", "closed"].includes(status)) {
    return `Target was ${new Date(slaDueAt).toLocaleString("en-IN")}.`;
  }
  const diff = due - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  return diff >= 0
    ? `Response target in ${h}h ${m}m (by ${new Date(slaDueAt).toLocaleString("en-IN")}).`
    : `Response target overdue by ${h}h ${m}m (was ${new Date(slaDueAt).toLocaleString("en-IN")}).`;
}

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionProfile();
  if (!session) notFound();
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("*")
    .eq("id", id)
    .single();
  if (!complaint || complaint.citizen_id !== session.userId) notFound();

  const [{ data: events }, { data: dept }, { data: ward }, { data: cat }, { data: transfers }] =
    await Promise.all([
      supabase
        .from("complaint_events")
        .select("id,event,meta,created_at")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("departments")
        .select("id,name,status")
        .eq("id", complaint.department_id)
        .single(),
      complaint.ward_id
        ? supabase.from("wards").select("id,name").eq("id", complaint.ward_id).single()
        : Promise.resolve({ data: null }),
      complaint.category_id
        ? supabase.from("categories").select("id,name").eq("id", complaint.category_id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from("complaint_transfers")
        .select("id,from_department_id,to_department_id,reason,created_at")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true }),
    ]);

  // Signed view URLs for evidence photos (private bucket).
  const admin = createAdminClient();
  const photoUrls: { path: string; url: string }[] = [];
  for (const path of complaint.photo_paths ?? []) {
    const { data } = await admin.storage
      .from("complaint-photos")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) photoUrls.push({ path, url: data.signedUrl });
  }
  const resolutionUrls: { path: string; url: string }[] = [];
  for (const path of complaint.resolution_photo_paths ?? []) {
    const { data } = await admin.storage
      .from("complaint-photos")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) resolutionUrls.push({ path, url: data.signedUrl });
  }

  const stageIndex = STAGE_ORDER.indexOf(
    complaint.status as (typeof STAGE_ORDER)[number],
  );
  const alreadyRated = (events ?? []).some((e) => e.event === "feedback");

  // Resolution / work-in-progress data (all real, from the complaint row
  // and its events — the officer's resolution note, after-work photos and
  // progress notes).
  const isResolvedLike = ["resolved", "closed"].includes(complaint.status);
  const isInProgress =
    complaint.status === "in_progress" || complaint.status === "reopened";
  const progressNotes = (events ?? []).filter(
    (e) =>
      typeof e.meta?.note === "string" &&
      (e.meta.note as string).trim() !== "" &&
      e.event !== "feedback",
  );
  const showResolution =
    isResolvedLike ||
    isInProgress ||
    !!complaint.resolution_note ||
    resolutionUrls.length > 0;
  const slaOverdue =
    !!complaint.sla_due_at &&
    !isResolvedLike &&
    new Date(complaint.sla_due_at).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div>
        <p className="tnum inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold tracking-wide text-indigo ring-1 ring-indigo/20">
          {complaint.ticket_no}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-ink sm:text-3xl">
          {complaint.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={complaint.severity} />
          <StatusPill status={complaint.status} />
          <span className="text-sm text-slate-muted">
            {cat?.name ?? "Issue"}
            {ward ? ` · ${ward.name}` : ""}
            {dept ? ` · ${dept.name}` : ""}
          </span>
        </div>
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xs font-bold tracking-[0.14em] text-slate-muted uppercase">
          Response target
        </h2>
        <p className={`mt-2 text-sm leading-6 ${slaOverdue ? "font-semibold text-critical" : "text-navy-ink"}`}>
          {slaText(complaint.sla_due_at, complaint.status)}
        </p>
      </GlassCard>

      {/* Progress stages */}
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-bold text-navy-ink">Progress</h2>
        <ol className="mt-5 space-y-0">
          {STAGE_ORDER.map((stage, i) => {
            const isReopenedStep =
              complaint.status === "reopened" && stage === "in_progress";
            const isDone = i <= stageIndex && stageIndex >= 0;
            return (
              <li key={stage} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isReopenedStep
                        ? "bg-high text-white shadow-[0_6px_14px_rgba(234,88,12,0.35)]"
                        : isDone
                          ? "bg-gradient-to-br from-indigo to-violet text-white shadow-[0_6px_14px_rgba(79,70,229,0.35)]"
                          : "bg-slate-200 text-slate-muted"
                    } ${i === stageIndex && stageIndex >= 0 && !isReopenedStep ? "ring-2 ring-indigo/30 ring-offset-2" : ""}`}
                  >
                    {i + 1}
                  </span>
                  {i < STAGE_ORDER.length - 1 && (
                    <span
                      className={`w-0.5 flex-1 ${isDone ? "bg-indigo/30" : "bg-line"}`}
                    />
                  )}
                </span>
                <span
                  className={`pb-5 text-sm font-semibold capitalize ${
                    isDone ? "text-navy-ink" : "text-slate-muted"
                  }`}
                >
                  {stage.replace(/_/g, " ")}
                </span>
              </li>
            );
          })}
        </ol>
        {complaint.status === "reopened" && (
          <p className="rounded-xl bg-high-bg px-3.5 py-2.5 text-sm font-medium text-high">
            This complaint was reopened and is being looked at again.
          </p>
        )}
      </GlassCard>

      {/* Prominent resolution / work-in-progress section */}
      {showResolution && (
        <GlassCard
          className="overflow-hidden p-0 ring-1 ring-teal/25"
          testId="complaint-resolution"
        >
          <div className="border-b border-teal/20 bg-gradient-to-r from-teal/[0.10] via-indigo/[0.06] to-transparent px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal to-indigo text-base font-bold text-white shadow-[0_6px_14px_rgba(13,148,136,0.35)]">
                ✓
              </span>
              <h2 className="text-base font-bold text-navy-ink">
                {isResolvedLike ? "Resolution" : "Work in progress"}
              </h2>
              <StatusPill status={complaint.status} />
            </div>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            {complaint.resolution_note ? (
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-slate-muted uppercase">
                  Resolution note from {dept?.name ?? "the department"}
                </p>
                <p className="mt-2 text-sm leading-6 text-navy-ink">
                  {complaint.resolution_note}
                </p>
              </div>
            ) : isResolvedLike ? (
              <p className="text-sm leading-6 text-slate-muted">
                Marked resolved by {dept?.name ?? "the department"}.
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-muted">
                The department has started work on this complaint. Their
                updates — and the resolution note and after-work photos once
                the work is done — appear here.
              </p>
            )}
            {resolutionUrls.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-slate-muted uppercase">
                  After-work photos from the department
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {resolutionUrls.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.path}
                      src={p.url}
                      alt="After-work photo from the department"
                      className="h-40 w-full rounded-2xl border border-line object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
            {isInProgress && progressNotes.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-slate-muted uppercase">
                  Updates from the department
                </p>
                <ul className="mt-3 space-y-3">
                  {progressNotes.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-2xl bg-white/70 px-3.5 py-2.5 ring-1 ring-line"
                    >
                      <p className="text-sm leading-6 text-navy-ink">
                        {typeof e.meta?.note === "string" ? e.meta.note : ""}
                      </p>
                      <p className="tnum mt-1 text-xs text-slate-muted">
                        {new Date(e.created_at).toLocaleString("en-IN")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-bold text-navy-ink">What you reported</h2>
        <p className="mt-2.5 text-sm leading-6 whitespace-pre-wrap text-navy-ink">
          {complaint.description}
        </p>
        {complaint.address && (
          <p className="mt-2.5 text-sm text-slate-muted">Location: {complaint.address}</p>
        )}
        {complaint.ai_reason && (
          <p className="mt-3 rounded-2xl bg-indigo/[0.05] px-3.5 py-2.5 text-sm leading-6 text-slate-muted">
            AI assessment: {complaint.ai_reason}
            {complaint.citizen_changed_suggestion
              ? " (You changed the suggested department.)"
              : ""}
          </p>
        )}
        {photoUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photoUrls.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.path}
                src={p.url}
                alt="Evidence photo"
                className="h-40 w-full rounded-2xl border border-line object-cover"
              />
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-bold text-navy-ink">Timeline</h2>
        {(events ?? []).length === 0 ? (
          <p className="mt-2.5 text-sm text-slate-muted">
            No updates yet — the department has received your complaint.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {(events ?? []).map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-indigo to-teal ring-4 ring-indigo/10" />
                <div>
                  <p className="text-sm font-semibold text-navy-ink capitalize">
                    {e.event.replace(/_/g, " ")}
                  </p>
                  <p className="tnum text-xs text-slate-muted">
                    {new Date(e.created_at).toLocaleString("en-IN")}
                  </p>
                  {typeof e.meta?.note === "string" && (
                    <p className="mt-1 text-sm leading-6 text-slate-muted">{e.meta.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {(transfers ?? []).length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-navy-ink">Department transfers</h3>
            <ul className="mt-2 space-y-2">
              {(transfers ?? []).map((t) => (
                <li key={t.id} className="text-sm leading-6 text-slate-muted">
                  Moved to another department on{" "}
                  {new Date(t.created_at).toLocaleDateString("en-IN")} — {t.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </GlassCard>

      {(complaint.status === "resolved" || complaint.status === "closed") && (
        <GlassCard className="space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-bold text-navy-ink">Was the issue fixed?</h2>
          {alreadyRated ? (
            <p className="text-sm text-slate-muted">
              Thanks — you have already shared feedback for this complaint.
            </p>
          ) : (
            <FeedbackForm complaintId={complaint.id} />
          )}
          <ReopenButton complaintId={complaint.id} />
        </GlassCard>
      )}
    </div>
  );
}
