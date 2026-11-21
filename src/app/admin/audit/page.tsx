import AuditLogTable from "./AuditLogTable";

export default function AdminAuditPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log & system events</h1>
      <p className="mt-1 text-sm text-slate-muted">
        Append-only, hash-chained ledger. Every privileged action is recorded
        with an Ed25519 signature. Select “Inspect” for the forensic detail.
      </p>
      <AuditLogTable />
    </div>
  );
}
