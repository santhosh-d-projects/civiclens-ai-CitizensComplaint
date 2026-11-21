// Public portal — Complaint-Sathi home. Hero, report CTA, how it works,
// and the list of active departments (real data from Supabase when the
// keys are configured; the section hides itself otherwise — never fake data).
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let departments: { id: string; name: string; description: string | null }[] =
    [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("departments")
      .select("id,name,description")
      .eq("status", "active")
      .order("name");
    departments = data ?? [];
  } catch {
    departments = [];
  }

  return (
    <div className="min-h-screen bg-canvas text-navy-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-navy text-lg font-bold text-white">
              S
            </div>
            <div>
              <p className="text-lg leading-none font-bold">Complaint-Sathi</p>
              <p className="mt-0.5 text-xs text-slate-muted">
                Civic Complaint Portal · Bengaluru
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/apply-department"
              className="rounded px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-100"
            >
              For departments
            </Link>
            <Link
              href="/login"
              data-testid="nav-login"
              className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <section className="max-w-2xl">
          <h1 className="text-4xl leading-[44px] font-semibold tracking-tight">
            Report a civic issue. Track it till it&rsquo;s fixed.
          </h1>
          <p className="mt-4 text-base leading-6 text-slate-muted">
            Potholes, water leaks, garbage, broken streetlights — describe the
            problem in your own words. Our AI suggests the right department and
            the urgency, <strong className="text-navy-ink">you confirm it</strong>,
            and the department fixes it. No queues, no follow-up calls.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/citizen/report"
              data-testid="cta-report"
              className="inline-flex min-h-[44px] items-center rounded bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-hover"
            >
              Report an issue
            </Link>
            <Link
              href="/citizen/complaints"
              data-testid="cta-track"
              className="inline-flex min-h-[44px] items-center rounded border border-line bg-white px-5 py-3 text-sm font-semibold text-navy-ink hover:bg-slate-50"
            >
              Track my complaints
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Describe it",
              d: "Text in English, Kannada or Hindi — photos help. Your location picks the ward.",
            },
            {
              n: "2",
              t: "AI suggests, you confirm",
              d: "The AI reads your report, suggests a category, severity and department. You can change any of it.",
            },
            {
              n: "3",
              t: "Track to resolution",
              d: "A ticket number, a timeline, and a notification when the department marks it resolved.",
            },
          ].map((s) => (
            <article
              key={s.n}
              className="rounded-lg border border-line bg-white p-5"
            >
              <p className="tnum text-2xl font-semibold text-teal">{s.n}</p>
              <h2 className="mt-2 text-base font-semibold">{s.t}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-muted">{s.d}</p>
            </article>
          ))}
        </section>

        {departments.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Departments on the portal</h2>
            <p className="mt-1 text-sm text-slate-muted">
              Only active, admin-approved departments can receive complaints.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <article
                  key={d.id}
                  className="rounded-lg border border-line bg-white p-5"
                >
                  <h3 className="text-sm font-semibold">{d.name}</h3>
                  {d.description && (
                    <p className="mt-1 text-sm text-slate-muted">{d.description}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line bg-white py-6">
        <p className="mx-auto max-w-6xl px-4 text-xs text-slate-muted">
          Complaint-Sathi · Bengaluru · Built for the Prompt to Product event,
          21 Nov 2026. Complaints are routed only to active departments that
          cover your ward and category.
        </p>
      </footer>
    </div>
  );
}
