// Department Review Drawer — approve / request-changes / reject /
// activate (typed ACTIVATE) / suspend with transfer / deactivate /
// reactivate. All status changes go through the SQL transition functions
// via the admin APIs; the drawer never mutates departments.status directly.
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  StatusPill,
  Modal,
  Drawer,
  Field,
  inputClass,
} from "@/components/ui";

type Officer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile_id: string | null;
  invite_used_at: string | null;
  invite_expires_at: string | null;
};
type Doc = {
  id: string;
  name: string;
  file_path: string;
  verified_at: string | null;
  verified_by: string | null;
};
type HistoryRow = {
  seq: number;
  ts: string;
  action: string;
  actor_role: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
};
type Detail = {
  department: {
    id: string;
    name: string;
    description: string | null;
    official_email: string;
    official_phone: string | null;
    applicant_name: string | null;
    status: string;
    source: string;
    status_reason: string | null;
    created_at: string;
  };
  wards: { id: number; name: string; zone: string }[];
  categories: { id: number; slug: string; name: string }[];
  officers: Officer[];
  documents: Doc[];
  openComplaints: number;
  duplicates: { emailDuplicate: boolean; nameWardOverlap: string[] };
  eligibleTargets: { id: string; name: string }[];
  history: HistoryRow[];
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message: string };
    [k: string]: unknown;
  };
  if (!res.ok) throw new Error(data.error?.message ?? "Request failed.");
  return data;
}

export default function DepartmentReviewDrawer({
  departmentId,
  onClose,
  onChanged,
}: {
  departmentId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonModal, setReasonModal] = useState<null | "reject" | "request-changes" | "deactivate" | "reactivate">(null);
  const [reason, setReason] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendTarget, setSuspendTarget] = useState("");
  const [activateConfirm, setActivateConfirm] = useState("");
  const [resubmitToken, setResubmitToken] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  const load = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/departments/${departmentId}`);
    const body = (await res.json()) as Detail & { error?: { message: string } };
    setLoading(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not load the department.");
      return;
    }
    setDetail(body);
  }, [departmentId]);

  useEffect(() => {
    if (departmentId) {
      setDetail(null);
      setToast("");
      setResubmitToken("");
      setInviteUrl("");
      setActivateConfirm("");
      load();
    }
  }, [departmentId, load]);

  async function act(
    action: string,
    body: Record<string, unknown>,
    success: string,
  ) {
    if (!departmentId) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson(
        `/api/admin/departments/${departmentId}/${action}`,
        body,
      );
      if (action === "request-changes" && typeof data.resubmitToken === "string") {
        setResubmitToken(data.resubmitToken);
      }
      if (action === "activate" && typeof data.inviteUrl === "string") {
        setInviteUrl(data.inviteUrl);
      }
      setToast(success);
      setReason("");
      setReasonModal(null);
      setSuspendOpen(false);
      setActivateConfirm("");
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyDoc(docId: string, verified: boolean) {
    if (!departmentId) return;
    setBusy(true);
    try {
      await postJson(
        `/api/admin/departments/${departmentId}/documents/${docId}/verify`,
        { verified },
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the document.");
    } finally {
      setBusy(false);
    }
  }

  const d = detail?.department;
  const allDocsVerified =
    (detail?.documents.length ?? 0) > 0 &&
    (detail?.documents ?? []).every((doc) => doc.verified_at);
  const hasOfficer = (detail?.officers.length ?? 0) > 0;
  const canActivate =
    d?.status === "approved" && allDocsVerified && hasOfficer;

  return (
    <Drawer
      open={departmentId !== null}
      onClose={onClose}
      title={d ? `Review — ${d.name}` : "Review department"}
      testId="department-review-drawer"
    >
      {loading && <p className="text-sm text-slate-muted">Loading…</p>}
      {error && (
        <p className="rounded-2xl border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}
      {toast && (
        <p className="mb-4 rounded-2xl border border-low/30 bg-low-bg px-4 py-3 text-sm text-low">
          {toast}
        </p>
      )}
      {detail && d && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={d.status} />
            <span className="text-xs text-slate-muted">
              {d.source === "applied" ? "Applied online" : "Created by admin"} ·{" "}
              {new Date(d.created_at).toLocaleDateString("en-IN")}
            </span>
          </div>

          {(detail.duplicates.emailDuplicate ||
            detail.duplicates.nameWardOverlap.length > 0) && (
            <div
              className="rounded-2xl border border-high/40 bg-high-bg px-4 py-3 text-sm shadow-[0_8px_24px_rgba(234,88,12,0.12)]"
              data-testid="duplicate-warning"
            >
              <p className="font-semibold text-high">Similar application detected</p>
              {detail.duplicates.emailDuplicate && (
                <p>Another live department already uses {d.official_email}.</p>
              )}
              {detail.duplicates.nameWardOverlap.length > 0 && (
                <p>
                  {detail.duplicates.nameWardOverlap.join(", ")} already serves one
                  of these wards under the same name.
                </p>
              )}
            </div>
          )}

          <section className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold">Department information</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Name</dt><dd className="font-medium">{d.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Email</dt><dd>{d.official_email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Phone</dt><dd>{d.official_phone ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Applicant</dt><dd>{d.applicant_name ?? "—"}</dd></div>
              {d.description && <p className="pt-1 text-slate-muted">{d.description}</p>}
              <div><dt className="text-slate-muted">Wards</dt><dd>{detail.wards.map((w) => w.name).join(", ") || "—"}</dd></div>
              <div><dt className="text-slate-muted">Categories</dt><dd>{detail.categories.map((c) => c.name).join(", ") || "—"}</dd></div>
              {d.status_reason && (
                <div><dt className="text-slate-muted">Latest reason</dt><dd>{d.status_reason}</dd></div>
              )}
            </dl>
          </section>

          <section className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold">Officer</h3>
            {detail.officers.length === 0 ? (
              <p className="mt-1 text-sm text-slate-muted">No officer assigned yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {detail.officers.map((o) => (
                  <li key={o.id} className="rounded-xl border border-line bg-white/70 px-3 py-2">
                    <p className="font-medium">{o.name}</p>
                    <p className="text-slate-muted">{o.email} · {o.phone ?? "—"}</p>
                    <p className="text-xs text-slate-muted">
                      {o.profile_id ? "Account active" : o.invite_used_at ? "Invite accepted" : "Invite not yet accepted"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold">
              Documents ({detail.documents.filter((x) => x.verified_at).length} of {detail.documents.length} verified)
            </h3>
            {detail.documents.length === 0 ? (
              <p className="mt-1 text-sm text-slate-muted">No documents uploaded yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detail.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/70 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{doc.name}</span>
                      <span className="block truncate text-xs text-slate-muted">{doc.file_path}</span>
                    </span>
                    <label className="flex shrink-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!doc.verified_at}
                        disabled={busy}
                        onChange={(e) => verifyDoc(doc.id, e.target.checked)}
                        data-testid={`doc-verify-${doc.id}`}
                        className="h-5 w-5 accent-indigo"
                      />
                      <span className="text-xs font-semibold">Verified</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold">History</h3>
            {detail.history.length === 0 ? (
              <p className="mt-1 text-sm text-slate-muted">No recorded events yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {detail.history.map((h) => (
                  <li key={h.seq} className="border-l-2 border-indigo/30 pl-3">
                    <p className="font-medium">{h.action}</p>
                    <p className="text-xs text-slate-muted">
                      {new Date(h.ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      {h.old_status && h.new_status ? ` · ${h.old_status} → ${h.new_status}` : ""}
                      {h.reason ? ` · ${h.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- Actions ---- */}
          {d.status === "pending" && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button
                onClick={() => act("approve", {}, "Department approved. It still needs activation before officers can log in.")}
                disabled={busy}
                data-testid="dept-approve"
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => setReasonModal("request-changes")}
                disabled={busy}
                data-testid="dept-request-changes"
              >
                Request changes
              </Button>
              <Button
                variant="danger"
                onClick={() => setReasonModal("reject")}
                disabled={busy}
                data-testid="dept-reject"
              >
                Reject
              </Button>
            </div>
          )}
          {d.status === "changes_requested" && (
            <p className="border-t border-line pt-4 text-sm text-slate-muted">
              Changes were requested. The applicant resubmits with the token issued
              below; the department returns to Pending.
            </p>
          )}
          {d.status === "approved" && (
            <section className="glass rounded-2xl border-indigo/25 p-4">
              <h3 className="text-sm font-bold">Activate department</h3>
              <p className="mt-1 text-sm text-slate-muted">
                Activation enables officer login and lets citizens send complaints
                to this department. It needs all documents verified and an officer
                assigned.
              </p>
              {!allDocsVerified && (
                <p className="mt-2 text-sm text-high">All documents must be verified first.</p>
              )}
              {!hasOfficer && (
                <p className="mt-2 text-sm text-high">An officer must be assigned first.</p>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field label="Type ACTIVATE to confirm">
                  <input
                    value={activateConfirm}
                    onChange={(e) => setActivateConfirm(e.target.value)}
                    placeholder="ACTIVATE"
                    className={`${inputClass} w-44`}
                    data-testid="dept-activate-confirm"
                  />
                </Field>
                <Button
                  onClick={() => act("activate", { confirmation: activateConfirm }, "Department activated. The officer invite was issued.")}
                  disabled={busy || !canActivate || activateConfirm.trim() !== "ACTIVATE"}
                  data-testid="dept-activate"
                >
                  Activate & send officer invite
                </Button>
              </div>
            </section>
          )}
          {d.status === "active" && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button
                variant="danger"
                onClick={() => setSuspendOpen(true)}
                disabled={busy}
                data-testid="dept-suspend"
              >
                Suspend
              </Button>
              <Button
                variant="danger"
                onClick={() => setReasonModal("deactivate")}
                disabled={busy}
                data-testid="dept-deactivate"
              >
                Deactivate
              </Button>
            </div>
          )}
          {d.status === "suspended" && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button
                onClick={() => setReasonModal("reactivate")}
                disabled={busy}
                data-testid="dept-reactivate"
              >
                Reactivate
              </Button>
              <Button
                variant="danger"
                onClick={() => setReasonModal("deactivate")}
                disabled={busy}
                data-testid="dept-deactivate"
              >
                Deactivate
              </Button>
            </div>
          )}

          {resubmitToken && (
            <div className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm">
              <p className="font-semibold">Resubmission token (share with the applicant)</p>
              <p className="mt-1 break-all font-mono text-xs">{resubmitToken}</p>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(resubmitToken)}
                data-testid="copy-resubmit-token"
              >
                Copy token
              </Button>
            </div>
          )}
          {inviteUrl && (
            <div className="rounded-2xl border border-low/30 bg-low-bg px-4 py-3 text-sm">
              <p className="font-semibold text-low">Officer invite link (send to the officer)</p>
              <p className="mt-1 break-all font-mono text-xs">{inviteUrl}</p>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                data-testid="copy-invite-url"
              >
                Copy invite link
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Reason modal (reject / request-changes / deactivate / reactivate) */}
      <Modal
        open={reasonModal !== null}
        onClose={() => setReasonModal(null)}
        title={
          reasonModal === "reject"
            ? "Reject department"
            : reasonModal === "request-changes"
              ? "Request changes"
              : reasonModal === "deactivate"
                ? "Deactivate department"
                : "Reactivate department"
        }
        testId="dept-reason-modal"
      >
        <Field
          label="Reason (required — recorded in the audit log)"
          error={undefined}
        >
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={inputClass}
            data-testid="dept-reason-input"
            placeholder="Explain the decision for the record…"
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReasonModal(null)} data-testid="dept-reason-cancel">
            Cancel
          </Button>
          <Button
            variant={reasonModal === "reject" || reasonModal === "deactivate" ? "danger" : "primary"}
            disabled={busy || !reason.trim()}
            onClick={() => {
              if (reasonModal === "reject") act("reject", { reason }, "Department rejected.");
              else if (reasonModal === "request-changes") act("request-changes", { reason }, "Changes requested. Share the resubmission token with the applicant.");
              else if (reasonModal === "deactivate") act("deactivate", { reason }, "Department deactivated. Officer sessions were revoked.");
              else if (reasonModal === "reactivate") act("reactivate", { reason }, "Department reactivated.");
            }}
            data-testid="dept-reason-confirm"
          >
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </Modal>

      {/* Suspend modal */}
      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend department"
        testId="dept-suspend-modal"
      >
        <p className="text-sm text-slate-muted">
          Open complaints: <strong className="text-navy-ink">{detail?.openComplaints ?? 0}</strong>.
          They will move to the target department atomically. Officer sessions
          are revoked immediately.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Reason (required)">
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className={inputClass}
              data-testid="dept-suspend-reason"
              placeholder="Why is this department being suspended?"
            />
          </Field>
          {(detail?.openComplaints ?? 0) > 0 && (
            <Field label="Move open complaints to (active departments only)">
              <select
                value={suspendTarget}
                onChange={(e) => setSuspendTarget(e.target.value)}
                className={inputClass}
                data-testid="dept-suspend-target"
              >
                <option value="">Select a department…</option>
                {(detail?.eligibleTargets ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {(detail?.eligibleTargets ?? []).length === 0 && (
                <span className="mt-1 block text-xs text-critical">
                  No active department covers all the affected wards and categories.
                </span>
              )}
            </Field>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSuspendOpen(false)} data-testid="dept-suspend-cancel">
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={
              busy ||
              !suspendReason.trim() ||
              ((detail?.openComplaints ?? 0) > 0 && !suspendTarget)
            }
            onClick={() =>
              act(
                "suspend",
                { reason: suspendReason, targetDepartmentId: suspendTarget || undefined },
                "Department suspended. Open complaints were moved and officer sessions revoked.",
              )
            }
            data-testid="dept-suspend-confirm"
          >
            {busy ? "Suspending…" : "Confirm suspension & transfer"}
          </Button>
        </div>
      </Modal>
    </Drawer>
  );
}
