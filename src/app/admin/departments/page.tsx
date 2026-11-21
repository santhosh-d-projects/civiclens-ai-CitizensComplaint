// Admin departments — governance & approvals (master prompt §5).
// Tabs: Pending (incl. changes requested), Approved (chips All/Active/
// Suspended), Rejected. Row opens the Review Drawer.
import Link from "next/link";
import DepartmentsTable from "./DepartmentsTable";
import { PageHeader } from "@/components/ui";

export default function AdminDepartmentsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Department governance"
        sub="Approve, request changes, reject, activate and suspend departments. No department can log in until it is approved and activated."
        actions={
          <Link
            href="/admin/departments/new"
            data-testid="departments-new"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(5,150,105,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(5,150,105,0.45)]"
          >
            + Create department
          </Link>
        }
      />
      <DepartmentsTable />
    </div>
  );
}
