// Admin audit log — tamper-evident ledger (master prompt §5/§6).
// Filters, pagination, chain verification, and a Forensic Detail drawer
// per event (signature certificate + verification receipt).
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  EmptyState,
  Drawer,
  inputClass,
} from "@/components/ui";

type AuditRow = {
  seq: number;
  event_id: string;
  ts: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  ip: string | null;
  device: string | null;
  meta: Record<string, unknown>;
  prev_hash: string;
  record_hash: string;
};

type Verification = {
  found: boolean;
  hash_ok: boolean;
  prev_ok: boolean;
  record_hash: string;
  prev_hash: string;
  chainVerified: boolean;
  signature: {
    ok: boolean;
    present: boolean;
    keyId: string | null;
    fingerprint: string | null;
    signature: string | null;
    signedAt: string | null;
    validFrom: string | null;
    validTo: string | null;
  };
};

function ForensicDrawer({
  seq,
  onClose,
}: {
  seq: number | null;
  onClose: () => void;
}) {
  const [row, setRow] = useState<AuditRow | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    if (!seq) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/audit/${seq}/verify`);
    const body = (await res.json()) as {
      row?: AuditRow;
      verification?: Verification;
      error?: { message: string };
    };
    setLoading(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not verify this event.");
      return;
    }
    setRow(body.row ?? null);
    setVerification(body.verification ?? null);
  }, [seq]);

  useEffect(() => {
    if (seq) {
      setRow(null);
      setVerification(null);
      load();
    }
  }, [seq, load]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  const chainVerified = verification?.chainVerified ?? false;

  return (
    <Drawer
      open={seq !== null}
      onClose={onClose}
      title={row ? `Forensic detail — event #${row.seq}` : "Forensic detail"}
      testId="audit-forensic-drawer"
    >
      {loading && <p className="text-sm text-slate-muted">Verifying…</p>}
      {error && (
        <p className="rounded border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}
      {row && verification && (
        <div className="space-y-6 text-sm">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                chainVerified
                  ? "bg-low-bg text-low"
                  : "bg-critical-bg text-critical"
              }`}
              data-testid="audit-chain-badge"
            >
              {chainVerified ? "Chain verified" : "Tampered"}
            </span>
          </div>

          <section>
            <h3 className="font-semibold">Event</h3>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Event ID</dt><dd className="font-mono text-xs break-all">{row.event_id}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Time (UTC)</dt><dd className="tnum">{new Date(row.ts).toISOString()}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Time (IST)</dt><dd>{new Date(row.ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Actor</dt><dd>{row.actor_id ?? "system"}{row.actor_role ? ` (${row.actor_role})` : ""}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Action</dt><dd className="font-semibold">{row.action}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Entity</dt><dd>{row.entity_type}{row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ""}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Status change</dt><dd>{row.old_status ?? "—"} → {row.new_status ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Justification</dt><dd>{row.reason ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">IP / device</dt><dd className="text-right">{row.ip ?? "—"}<br /><span className="text-xs text-slate-muted">{row.device ?? ""}</span></dd></div>
            </dl>
          </section>

          <section>
            <h3 className="font-semibold">Signature certificate (Ed25519)</h3>
            {verification.signature.present ? (
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Key ID</dt><dd className="font-mono text-xs">{verification.signature.keyId}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Fingerprint</dt><dd className="font-mono text-xs break-all">{verification.signature.fingerprint}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Valid</dt><dd>{verification.signature.validFrom ? new Date(verification.signature.validFrom).toLocaleDateString("en-IN") : "—"} → {verification.signature.validTo ? new Date(verification.signature.validTo).toLocaleDateString("en-IN") : "ongoing"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Signed at</dt><dd>{verification.signature.signedAt ? new Date(verification.signature.signedAt).toLocaleString("en-IN") : "—"}</dd></div>
                <div>
                  <dt className="text-slate-muted">Signature value</dt>
                  <dd className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-xs">{verification.signature.signature}</dd>
                  <Button variant="secondary" className="mt-2" onClick={() => copy(verification.signature.signature ?? "", "signature")} data-testid="audit-copy-signature">
                    {copied === "signature" ? "Copied ✓" : "Copy signature"}
                  </Button>
                </div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Signature check</dt><dd className={verification.signature.ok ? "font-semibold text-low" : "font-semibold text-critical"}>{verification.signature.ok ? "Valid" : "INVALID"}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-slate-muted">
                This event has not been signed yet. Use “Sign pending rows” on
                the audit page (requires the audit signing key).
              </p>
            )}
          </section>

          <section>
            <h3 className="font-semibold">Verification receipt</h3>
            <dl className="mt-2 space-y-1">
              <div><dt className="text-slate-muted">Record hash (SHA-256)</dt><dd className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-xs">{verification.record_hash}</dd></div>
              <div><dt className="text-slate-muted">Previous hash</dt><dd className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-xs">{verification.prev_hash}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Chain position</dt><dd className="tnum">#{row.seq}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Hash recomputed</dt><dd className={verification.hash_ok ? "font-semibold text-low" : "font-semibold text-critical"}>{verification.hash_ok ? "Matches" : "MISMATCH"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-muted">Previous link</dt><dd className={verification.prev_ok ? "font-semibold text-low" : "font-semibold text-critical"}>{verification.prev_ok ? "Intact" : "BROKEN"}</dd></div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={load} disabled={loading} data-testid="audit-reverify">
              {loading ? "Verifying…" : "Re-verify"}
            </Button>
            <a
              href={`/api/admin/audit/${row.seq}/export`}
              download
              data-testid="audit-export-json"
              className="inline-flex min-h-[44px] items-center rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-navy-ink hover:bg-slate-50"
            >
              Export JSON
            </a>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function AuditLogTable() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [chain, setChain] = useState<{ ok: boolean; brokenSeq: number | null } | null>(null);
  const [chainBusy, setChainBusy] = useState(false);
  const [signMsg, setSignMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "25" });
    if (action) params.set("action", action);
    if (entityType) params.set("entity_type", entityType);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/audit?${params}`);
    const body = (await res.json()) as {
      events?: AuditRow[];
      total?: number;
      distinctActions?: string[];
      error?: { message: string };
    };
    setLoading(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not load the audit log.");
      return;
    }
    setRows(body.events ?? []);
    setTotal(body.total ?? 0);
    setActions(body.distinctActions ?? []);
  }, [page, action, entityType, from, to, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function verifyChain() {
    setChainBusy(true);
    const res = await fetch("/api/admin/audit/verify-chain");
    const body = (await res.json()) as { ok?: boolean; brokenSeq?: number | null };
    setChainBusy(false);
    if (res.ok) setChain({ ok: body.ok ?? false, brokenSeq: body.brokenSeq ?? null });
  }

  async function signPending() {
    setSignMsg("");
    const res = await fetch("/api/admin/audit/sign", { method: "POST" });
    const body = (await res.json()) as { signed?: number; error?: { message: string } };
    if (!res.ok) setSignMsg(body.error?.message ?? "Signing failed.");
    else setSignMsg(`Signed ${body.signed ?? 0} pending row(s).`);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={verifyChain} disabled={chainBusy} data-testid="audit-verify-chain">
          {chainBusy ? "Verifying…" : "Verify full chain"}
        </Button>
        <Button variant="secondary" onClick={signPending} data-testid="audit-sign-pending">
          Sign pending rows
        </Button>
        {chain && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${chain.ok ? "bg-low-bg text-low" : "bg-critical-bg text-critical"}`}
            data-testid="audit-chain-status"
          >
            {chain.ok ? "Chain verified — no broken rows" : `Chain broken at seq ${chain.brokenSeq}`}
          </span>
        )}
        {signMsg && <span className="text-sm text-slate-muted">{signMsg}</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={`${inputClass} w-auto`} data-testid="audit-filter-action" aria-label="Filter by action">
          <option value="">All actions</option>
          {actions.map((a) => (<option key={a} value={a}>{a}</option>))}
        </select>
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className={`${inputClass} w-auto`} data-testid="audit-filter-entity" aria-label="Filter by entity">
          <option value="">All entities</option>
          <option value="department">Department</option>
          <option value="complaint">Complaint</option>
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${inputClass} w-auto`} data-testid="audit-filter-from" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${inputClass} w-auto`} data-testid="audit-filter-to" aria-label="To date" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search action or reason…" className={`${inputClass} max-w-xs`} data-testid="audit-search" aria-label="Search audit log" />
      </div>

      {error && (
        <p className="mt-4 rounded border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-muted">
              <th className="px-4 py-3">Seq</th>
              <th className="px-4 py-3">Time (IST)</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">State shift</th>
              <th className="px-4 py-3">Record hash</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-muted">Loading audit log…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8"><EmptyState title="No audit events match" body="Try different filters." /></td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.seq} className="border-b border-line last:border-0 hover:bg-slate-50">
                  <td className="tnum px-4 py-3">{r.seq}</td>
                  <td className="px-4 py-3 text-slate-muted">{new Date(r.ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  <td className="px-4 py-3">{r.actor_role ?? "system"}</td>
                  <td className="px-4 py-3 font-semibold">{r.action}</td>
                  <td className="px-4 py-3">{r.entity_type}</td>
                  <td className="px-4 py-3">{r.old_status ?? "—"} → {r.new_status ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-muted">{r.record_hash.slice(0, 16)}…</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" onClick={() => setSelectedSeq(r.seq)} data-testid={`audit-inspect-${r.seq}`}>
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} data-testid="audit-prev">← Previous</Button>
        <span className="text-sm text-slate-muted">Page {page} · {total} events</span>
        <Button variant="secondary" disabled={rows.length < 25 || loading} onClick={() => setPage((p) => p + 1)} data-testid="audit-next">Next →</Button>
      </div>

      <ForensicDrawer seq={selectedSeq} onClose={() => setSelectedSeq(null)} />
    </div>
  );
}
