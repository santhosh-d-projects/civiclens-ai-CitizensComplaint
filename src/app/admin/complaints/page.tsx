import AdminComplaintsTable from "./AdminComplaintsTable";

export default function AdminComplaintsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Complaints registry</h1>
      <p className="mt-1 text-sm text-slate-muted">
        City-wide monitoring, read-only. Select a row for the full timeline.
      </p>
      <AdminComplaintsTable />
    </div>
  );
}
