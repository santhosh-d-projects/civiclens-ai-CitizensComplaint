// Admin shell: role guard + sidebar navigation.
// Officer UI must never show admin navigation; this layout is admin-only.
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

const NAV = [
  { href: "/admin", label: "Dashboard", testId: "admin-nav-dashboard" },
  { href: "/admin/departments", label: "Departments", testId: "admin-nav-departments" },
  { href: "/admin/complaints", label: "Complaints", testId: "admin-nav-complaints" },
  { href: "/admin/audit", label: "Audit Log", testId: "admin-nav-audit" },
  { href: "/admin/analytics", label: "Analytics", testId: "admin-nav-analytics" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["admin"]);
  return (
    <div className="flex min-h-screen bg-canvas text-navy-ink">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-navy px-4 py-6 text-white md:flex">
        <Link href="/admin" className="px-2">
          <p className="text-lg font-bold">Complaint-Sathi</p>
          <p className="mt-0.5 text-xs text-white/60">Admin Console · Bengaluru</p>
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Admin">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-testid={n.testId}
              className="rounded px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-8">
          <p className="text-xs text-white/60">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            {session.email ?? "Admin"}
          </p>
          <p className="text-xs text-white/60">Platform Administrator</p>
          <div className="mt-4">
            <SignOutButton />
          </div>
          <Link
            href="/"
            className="mt-2 block rounded px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            ← Back to portal
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <p className="font-bold">Complaint-Sathi · Admin</p>
            <SignOutButton />
          </div>
          <nav className="mt-3 flex flex-wrap gap-2" aria-label="Admin">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`${n.testId}-mobile`}
                className="rounded bg-slate-100 px-3 py-2 text-xs font-semibold text-navy"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
