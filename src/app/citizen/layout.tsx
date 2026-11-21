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
    <div className="min-h-screen bg-canvas text-navy-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/citizen" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-navy text-lg font-bold text-white">
              S
            </span>
            <span>
              <span className="block text-lg leading-none font-bold">
                Complaint-Sathi
              </span>
              <span className="mt-0.5 block text-xs text-slate-muted">
                Citizen Portal · Bengaluru
              </span>
            </span>
          </Link>
          <CitizenNav name={name} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
