import AdminComplaintsTable from "./AdminComplaintsTable";
import { PageHeader } from "@/components/ui";

export default function AdminComplaintsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Monitoring"
        title="Complaints registry"
        sub="City-wide monitoring, read-only. Select a row for the full timeline."
      />
      <AdminComplaintsTable />
    </div>
  );
}
