import Link from "next/link";
import ApplyWizard from "./ApplyWizard";

export default function ApplyDepartmentPage() {
  return (
    <div className="min-h-screen bg-canvas text-navy-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-navy text-lg font-bold text-white">S</div>
            <div>
              <p className="text-lg leading-none font-bold">Complaint-Sathi</p>
              <p className="mt-0.5 text-xs text-slate-muted">Civic Complaint Portal · Bengaluru</p>
            </div>
          </Link>
          <Link href="/login" className="rounded px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-100">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Apply as a department</h1>
        <p className="mt-2 text-sm leading-6 text-slate-muted">
          Departments join the portal by application or by admin creation, and
          both go through the same review. <strong className="text-navy-ink">No
          login is possible until an administrator approves and activates the
          department.</strong> Typical review time is 3–5 working days.
        </p>
        <div className="mt-6">
          <ApplyWizard />
        </div>
      </main>
    </div>
  );
}
