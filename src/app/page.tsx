// Public portal — Complaint-Sathi home. Hero, report CTA, how it works,
// portal cards, and the list of active departments (real data from Supabase
// when the keys are configured; the section hides itself otherwise — never
// fake data).
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui";

const HOW_IT_WORKS = [
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
];

const PORTALS = [
  {
    href: "/citizen/report",
    testId: "portal-report",
    title: "Citizen desk",
    body: "Report a civic issue in your own words — English, Kannada or Hindi — with photos and your ward.",
    cta: "Report an issue",
  },
  {
    href: "/citizen/complaints",
    testId: "portal-track",
    title: "Track & audit",
    body: "Follow your tickets from submission to resolution, with a full timeline on every complaint.",
    cta: "Track my complaints",
  },
  {
    href: "/apply-department",
    testId: "portal-apply",
    title: "Department onboarding",
    body: "Municipal departments join by application or admin creation, then pass the same review before activation.",
    cta: "Apply as a department",
  },
  {
    href: "/login",
    testId: "portal-officer",
    title: "Officer desk",
    body: "Department officers sign in to work their queue, update statuses and close complaints with proof.",
    cta: "Officer sign in",
  },
];

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
    <div className="min-h-screen text-navy-ink">
      <header className="glass sticky top-0 z-40 border-b border-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-lg font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]">
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
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-ink transition-colors hover:bg-white/70"
            >
              For departments
            </Link>
            <Link
              href="/login"
              data-testid="nav-login"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(79,70,229,0.45)]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <section className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo/20 bg-white/70 px-3 py-1 text-xs font-bold tracking-wide text-indigo uppercase backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Bengaluru · Civic Complaint Portal
          </p>
          <h1 className="mt-5 text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
            Report a civic issue.{" "}
            <span className="text-gradient">Track it till it&rsquo;s fixed.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-muted">
            Potholes, water leaks, garbage, broken streetlights — describe the
            problem in your own words. Our AI suggests the right department and
            the urgency, <strong className="font-semibold text-navy-ink">you confirm it</strong>,
            and the department fixes it. No queues, no follow-up calls.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/citizen/report"
              data-testid="cta-report"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo to-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(79,70,229,0.45)]"
            >
              Report an issue →
            </Link>
            <Link
              href="/citizen/complaints"
              data-testid="cta-track"
              className="glass inline-flex min-h-[44px] items-center rounded-xl px-6 py-3 text-sm font-semibold text-navy-ink transition-all hover:bg-white/90"
            >
              Track my complaints
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <p className="text-xs font-bold tracking-[0.14em] text-indigo uppercase">
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            From the street to a fixed street, in three steps
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <GlassCard key={s.n} className="p-6">
                <p className="tnum flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-base font-bold text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]">
                  {s.n}
                </p>
                <h3 className="mt-4 text-base font-bold">{s.t}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-muted">{s.d}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {departments.length > 0 && (
          <section className="mt-14">
            <p className="text-xs font-bold tracking-[0.14em] text-indigo uppercase">
              Live on the portal
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Departments on the portal
            </h2>
            <p className="mt-2 text-sm text-slate-muted">
              Only active, admin-approved departments can receive complaints.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <GlassCard key={d.id} className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-sm font-bold text-teal">
                      {d.name.charAt(0)}
                    </span>
                    <h3 className="text-sm leading-snug font-bold">{d.name}</h3>
                  </div>
                  {d.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-muted">
                      {d.description}
                    </p>
                  )}
                </GlassCard>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <p className="text-xs font-bold tracking-[0.14em] text-indigo uppercase">
            Portals
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            One portal, every role
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PORTALS.map((p) => (
              <GlassCard key={p.href} className="group p-6">
                <h3 className="text-base font-bold">{p.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-muted">{p.body}</p>
                <Link
                  href={p.href}
                  data-testid={p.testId}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-indigo transition-colors group-hover:text-violet"
                >
                  {p.cta} <span aria-hidden>→</span>
                </Link>
              </GlassCard>
            ))}
          </div>
        </section>
      </main>

      <footer className="glass mt-8 border-t border-white/60">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-5 text-slate-muted">
          Complaint-Sathi · Bengaluru · Built for the Prompt to Product event,
          21 Nov 2026. Complaints are routed only to active departments that
          cover your ward and category.
        </p>
      </footer>
    </div>
  );
}
