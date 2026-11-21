// Officer desk shell — applies only to pages under the (desk) route group
// (dashboard, complaints, profile). /officer/blocked and
// /officer/accept-invite sit outside this group so they are never guarded
// by it: blocked officers must be able to see the blocked screen, and
// invitees have no session yet.
// Guard: officer role + ACTIVE department, re-read from the DB on every
// request. Non-active departments are redirected to /officer/blocked.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import SignOutButton from "./SignOutButton";

const NAV = [
  { href: "/officer", label: "Dashboard", testId: "nav-officer-dashboard" },
  { href: "/officer/complaints", label: "My Complaints", testId: "nav-officer-complaints" },
  { href: "/officer/profile", label: "Department Profile", testId: "nav-officer-profile" },
];

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["department_officer"]);
  const departmentId = session.profile.department_id;
  if (!departmentId) redirect("/officer/blocked?status=pending");

  const admin = createAdminClient();
  const { data: dept } = await admin
    .from("departments")
    .select("id,name,status")
    .eq("id", departmentId)
    .single();
  const department = dept as { id: string; name: string; status: string } | null;
  if (!department || department.status !== "active") {
    redirect(`/officer/blocked?status=${department?.status ?? "pending"}`);
  }

  return (
    <div className="flex min-h-screen bg-canvas text-navy-ink">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="border-b border-line px-5 py-4">
          <p className="text-base font-bold leading-tight">Complaint-Sathi</p>
          <p className="mt-0.5 text-xs text-slate-muted">Officer Desk</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Officer">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className="flex min-h-[44px] items-center rounded px-3 py-2 text-sm font-semibold text-navy-ink hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-sm font-semibold" data-testid="officer-dept-name">
            {department.name}
          </p>
          <p className="truncate text-xs text-slate-muted">
            {session.profile.full_name ?? session.email}
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <p className="text-sm font-bold">Complaint-Sathi · Officer Desk</p>
          <SignOutButton />
        </header>
        <nav
          className="flex gap-1 overflow-x-auto border-b border-line bg-white px-2 py-2 md:hidden"
          aria-label="Officer"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`${item.testId}-mobile`}
              className="whitespace-nowrap rounded px-3 py-2 text-sm font-semibold text-navy-ink hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
