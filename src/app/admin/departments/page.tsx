// Admin departments — governance & approvals (master prompt §5).
// Tabs: Pending (incl. changes requested), Approved (chips All/Active/
// Suspended), Rejected. Row opens the Review Drawer.
import Link from "next/link";
import DepartmentsTable from "./DepartmentsTable";

export default function AdminDepartmentsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Department governance</h1>
          <p className="mt-1 text-sm text-slate-muted">
            Approve, request changes, reject, activate and suspend departments.
            No department can log in until it is approved and activated.
          </p>
        </div>
        <Link
          href="/admin/departments/new"
          data-testid="departments-new"
          className="inline-flex min-h-[44px] items-center rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
        >
          + Create department
        </Link>
      </div>
      <DepartmentsTable />
    </div>
  );
}
