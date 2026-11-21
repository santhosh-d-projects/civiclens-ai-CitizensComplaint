// Complaint detail — ticket, timeline, SLA, evidence photos, citizen
// actions (feedback when resolved, reopen when resolved/closed).
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SeverityBadge, StatusPill } from "@/components/ui";
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

  return (
    <div className="space-y-6">
      <div>
        <p className="tnum text-sm text-slate-muted">{complaint.ticket_no}</p>
        <h1 className="mt-1 text-2xl font-semibold">{complaint.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={complaint.severity} />
          <StatusPill status={complaint.status} />
          <span className="text-sm text-slate-muted">
            {cat?.name ?? "Issue"}
            {ward ? ` · ${ward.name}` : ""}
            {dept ? ` · ${dept.name}` : ""}
          </span>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Response target</h2>
        <p className="mt-1 text-sm">{slaText(complaint.sla_due_at, complaint.status)}</p>
      </section>

      {/* Progress stages */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Progress</h2>
        <ol className="mt-4 space-y-0">
          {STAGE_ORDER.map((stage, i) => (
            <li key={stage} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    complaint.status === "reopened" && stage === "in_progress"
                      ? "bg-high text-white"
                      : i <= stageIndex && stageIndex >= 0
                        ? "bg-teal text-white"
                        : "bg-slate-200 text-slate-muted"
                  }`}
                >
                  {i + 1}
                </span>
                {i < STAGE_ORDER.length - 1 && (
                  <span className="w-0.5 flex-1 bg-line" />
                )}
              </span>
              <span className="pb-5 text-sm font-medium capitalize">
                {stage.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ol>
        {complaint.status === "reopened" && (
          <p className="text-sm text-high">
            This complaint was reopened and is being looked at again.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">What you reported</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {complaint.description}
        </p>
        {complaint.address && (
          <p className="mt-2 text-sm text-slate-muted">Location: {complaint.address}</p>
        )}
        {complaint.ai_reason && (
          <p className="mt-3 rounded bg-canvas p-3 text-sm text-slate-muted">
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
                className="h-40 w-full rounded-lg border border-line object-cover"
              />
            ))}
          </div>
        )}
      </section>

      {complaint.resolution_note && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold">Resolution</h2>
          <p className="mt-2 text-sm leading-6">{complaint.resolution_note}</p>
          {resolutionUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {resolutionUrls.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.path}
                  src={p.url}
                  alt="Resolution proof"
                  className="h-40 w-full rounded-lg border border-line object-cover"
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Timeline</h2>
        {(events ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-muted">
            No updates yet — the department has received your complaint.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {(events ?? []).map((e) => (
              <li key={e.id} className="border-l-2 border-teal pl-3">
                <p className="text-sm font-semibold capitalize">
                  {e.event.replace(/_/g, " ")}
                </p>
                <p className="tnum text-xs text-slate-muted">
                  {new Date(e.created_at).toLocaleString("en-IN")}
                </p>
                {typeof e.meta?.note === "string" && (
                  <p className="mt-1 text-sm text-slate-muted">{e.meta.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
        {(transfers ?? []).length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Department transfers</h3>
            <ul className="mt-2 space-y-2">
              {(transfers ?? []).map((t) => (
                <li key={t.id} className="text-sm text-slate-muted">
                  Moved to another department on{" "}
                  {new Date(t.created_at).toLocaleDateString("en-IN")} — {t.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {(complaint.status === "resolved" || complaint.status === "closed") && (
        <section className="space-y-4 rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold">Was the issue fixed?</h2>
          {alreadyRated ? (
            <p className="text-sm text-slate-muted">
              Thanks — you have already shared feedback for this complaint.
            </p>
          ) : (
            <FeedbackForm complaintId={complaint.id} />
          )}
          <ReopenButton complaintId={complaint.id} />
        </section>
      )}
    </div>
  );
}
