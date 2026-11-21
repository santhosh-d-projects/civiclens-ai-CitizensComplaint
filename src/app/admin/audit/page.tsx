import AuditLogTable from "./AuditLogTable";
import { PageHeader } from "@/components/ui";

export default function AdminAuditPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tamper-evident ledger"
        title="Audit log & system events"
        sub="Append-only, hash-chained ledger. Every privileged action is recorded with an Ed25519 signature. Select “Inspect” for the forensic detail."
      />
      <AuditLogTable />
    </div>
  );
}
