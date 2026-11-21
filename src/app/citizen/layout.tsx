// Citizen portal shell — server layout, role guard from DB profiles.
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import CitizenNav from "./nav";

export const dynamic = "force-dynamic";

export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role === "admin") redirect("/admin");
  if (session.profile.role === "department_officer") redirect("/officer");

  const name = session.profile.full_name ?? session.email ?? "Citizen";
  return (
    <div className="min-h-screen text-navy-ink">
      <header className="glass sticky top-0 z-40 border-b border-line/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/citizen" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-lg font-extrabold text-white shadow-[0_8px_20px_rgba(79,70,229,0.35)]">
              S
            </span>
            <span>
              <span className="block text-lg leading-none font-bold">
                Complaint-<span className="text-gradient">Sathi</span>
              </span>
              <span className="mt-1 block text-xs font-medium text-slate-muted">
                Citizen Portal · Bengaluru
              </span>
            </span>
          </Link>
          <CitizenNav name={name} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
