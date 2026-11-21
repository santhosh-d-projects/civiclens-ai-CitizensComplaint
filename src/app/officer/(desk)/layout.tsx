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
    <div className="flex min-h-screen text-navy-ink">
      {/* Dark glass sidebar — midnight contrast against the light canvas */}
      <aside className="glass-dark sticky top-0 hidden h-screen w-68 shrink-0 flex-col md:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-sm font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.45)]">
            CS
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight text-white">
              Complaint-Sathi
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-300">Officer Desk</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="Officer">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className="flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-electric"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal to-indigo text-xs font-bold text-white">
              {(department.name ?? "D").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white" data-testid="officer-dept-name">
                {department.name}
              </p>
              <p className="truncate text-xs text-slate-300">
                {session.profile.full_name ?? session.email}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-dark flex items-center justify-between px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo to-violet text-xs font-bold text-white">
              CS
            </span>
            <p className="text-sm font-bold text-white">Complaint-Sathi · Officer Desk</p>
          </div>
          <SignOutButton />
        </header>
        <nav
          className="glass sticky top-0 z-10 flex gap-1 overflow-x-auto px-2 py-2 md:hidden"
          aria-label="Officer"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`${item.testId}-mobile`}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-navy-ink transition-colors hover:bg-indigo/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
