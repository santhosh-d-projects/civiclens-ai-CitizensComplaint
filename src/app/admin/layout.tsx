// Admin shell: role guard + dark-glass sidebar navigation.
// Officer UI must never show admin navigation; this layout is admin-only.
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import SignOutButton from "./SignOutButton";
import AdminNav from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["admin"]);
  return (
    <div className="flex min-h-screen text-navy-ink">
      <aside className="glass-dark sticky top-0 hidden h-screen w-64 shrink-0 flex-col px-4 py-6 text-white md:flex">
        <Link href="/admin" className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-lg font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.5)]">
            S
          </div>
          <div>
            <p className="text-lg leading-none font-bold">Complaint-Sathi</p>
            <p className="mt-1 text-xs text-white/60">Admin Console · Bengaluru</p>
          </div>
        </Link>
        <AdminNav variant="sidebar" />
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
            className="mt-2 block rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            ← Back to portal
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 border-b border-white/60 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold">Complaint-Sathi · Admin</p>
            <SignOutButton tone="light" />
          </div>
          <AdminNav variant="mobile" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
