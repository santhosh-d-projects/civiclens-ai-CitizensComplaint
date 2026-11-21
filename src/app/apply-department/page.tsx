import Link from "next/link";
import ApplyWizard from "./ApplyWizard";
import { PageHeader, GlassCard } from "@/components/ui";

export default function ApplyDepartmentPage() {
  return (
    <div className="min-h-screen text-navy-ink">
      <header className="glass sticky top-0 z-40 border-b border-white/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-lg font-bold text-white shadow-[0_8px_20px_rgba(5,150,105,0.4)]">
              S
            </div>
            <div>
              <p className="text-lg leading-none font-bold">Complaint-Sathi</p>
              <p className="mt-0.5 text-xs text-slate-muted">Civic Complaint Portal · Bengaluru</p>
            </div>
          </Link>
          <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-ink transition-colors hover:bg-white/70">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          eyebrow="Department onboarding"
          title="Apply as a department"
          sub="Departments join the portal by application or by admin creation, and both go through the same review. No login is possible until an administrator approves and activates the department. Typical review time is 3–5 working days."
        />
        <GlassCard className="mt-8 p-6 sm:p-8">
          <ApplyWizard />
        </GlassCard>
      </main>
    </div>
  );
}
