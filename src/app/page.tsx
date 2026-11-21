"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  triageComplaint,
  CATEGORY_LABELS,
  SEVERITY_ORDER,
  type Category,
  type Severity,
  type Status,
  type TriageResult,
} from "@/lib/triage";
import {
  loadTickets,
  saveTickets,
  nextTicketId,
  SEED_TICKETS,
  type Ticket,
} from "@/lib/store";

const SEVERITY_STYLE: Record<Severity, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-amber-500 text-white",
  Medium: "bg-sky-600 text-white",
  Low: "bg-emerald-600 text-white",
};

const SEVERITY_DOT: Record<Severity, string> = {
  Critical: "bg-red-600",
  High: "bg-amber-500",
  Medium: "bg-sky-600",
  Low: "bg-emerald-600",
};

const CATEGORY_COLOR: Record<Category, string> = {
  roads: "bg-slate-800 text-white",
  waste: "bg-lime-700 text-white",
  water: "bg-cyan-700 text-white",
  electricity: "bg-yellow-600 text-white",
  trees: "bg-green-700 text-white",
  drainage: "bg-indigo-700 text-white",
  other: "bg-slate-500 text-white",
};

const STATUS_STYLE: Record<Status, string> = {
  Open: "bg-red-50 text-red-700 ring-red-200",
  "In Progress": "bg-amber-50 text-amber-700 ring-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

// Pure relative-time helper: `now` comes from state set after mount, so
// prerendering never evaluates Date.now() (Next 16 blocks it in Client
// Components). Before mount, show a static IST timestamp instead.
function timeAgo(iso: string, now: number | null): string {
  if (now === null) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  }
  const mins = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home() {
  // Seed tickets render on the server too, so the dashboard is never
  // empty on first paint; localStorage (if any) replaces them after mount.
  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [reporter, setReporter] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [result, setResult] = useState<(TriageResult & { id: string }) | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // `now` ticks after mount so "x min ago" stays fresh without blocking prerender.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setTickets(loadTickets());
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (tickets.length > 0) saveTickets(tickets);
  }, [tickets]);

  const sorted = useMemo(() => {
    return [...tickets]
      .filter((t) => (categoryFilter === "all" ? true : t.category === categoryFilter))
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) =>
        query.trim()
          ? (t.text + t.location + t.id + t.department)
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [tickets, categoryFilter, statusFilter, query]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "Resolved").length;
    const critical = tickets.filter(
      (t) => t.severity === "Critical" && t.status !== "Resolved",
    ).length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    return { total: tickets.length, open, critical, resolved };
  }, [tickets]);

  function onPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > 800_000) {
      alert("Photo must be under 800 KB for this prototype.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function submitComplaint() {
    if (text.trim().length < 10) {
      alert("Please describe the issue in a few words first.");
      return;
    }
    setSubmitting(true);
    // The triage engine runs instantly; a short delay keeps the
    // "analysing" state honest in the demo.
    window.setTimeout(() => {
      const triage = triageComplaint(text);
      const ticket: Ticket = {
        id: nextTicketId(),
        text: text.trim(),
        location: location.trim() || "Location not given",
        reporter: reporter.trim() || "Anonymous citizen",
        category: triage.category,
        severity: triage.severity,
        reason: triage.reason,
        department: triage.department,
        signals: triage.signals,
        language: triage.language,
        photo,
        status: "Open",
        createdAt: new Date().toISOString(),
      };
      setTickets((prev) => [ticket, ...prev]);
      setResult({ ...triage, id: ticket.id });
      setSubmitting(false);
      setText("");
      setLocation("");
      setPhoto(null);
      setPhotoName("");
      document.getElementById("triage-result")?.scrollIntoView({ behavior: "smooth" });
    }, 600);
  }

  function setStatus(id: string, status: Status) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-lg font-black text-white">
              C
            </div>
            <div>
              <p className="text-lg font-extrabold leading-none tracking-tight">CivicLens</p>
              <p className="text-xs text-slate-500">AI Triage for Citizen Complaints · Bengaluru</p>
            </div>
          </div>
          <a
            href="#dashboard"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Officer Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        {/* Hero */}
        <section className="py-10 sm:py-14">
          <p className="mb-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
            Prompt to Product · 21 Nov 2026
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Report a civic issue. We triage it, prioritise it, and route it — in seconds.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Describe the problem in English, Kannada or Hindi — with an optional photo.
            CivicLens classifies it, assigns a severity with a reason, and sends it to the
            right department, so urgent issues stop getting buried.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Tickets in system", value: stats.total },
              { label: "Open now", value: stats.open },
              { label: "Critical open", value: stats.critical },
              { label: "Resolved", value: stats.resolved },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-3xl font-black">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Report + result */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Report a complaint</h2>
            <p className="mt-1 text-sm text-slate-500">
              Free text in English, Kannada or Hindi. The triage engine detects the language
              automatically.
            </p>
            <label className="mt-5 block text-sm font-semibold">What happened?</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="e.g. Huge pothole on Outer Ring Road near Marathahalli, cars are swerving into oncoming traffic… / ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ… / सड़क पर बड़ा गड्ढा है…"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Area, road or landmark"
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">Your name (optional)</label>
                <input
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  placeholder="Anonymous citizen"
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold">Photo (optional)</label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  {photo ? "Change photo" : "Upload a photo"}
                </button>
                {photoName && <span className="truncate text-sm text-slate-500">{photoName}</span>}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPhoto(e.target.files?.[0])}
                />
              </div>
              {photo && (
                <img
                  src={photo}
                  alt="Complaint photo preview"
                  className="mt-3 max-h-48 rounded-xl border border-slate-200 object-cover"
                />
              )}
            </div>
            <button
              onClick={submitComplaint}
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? "Analysing complaint…" : "Triage with AI →"}
            </button>
            <p className="mt-3 text-xs text-slate-400">
              Try: “Streetlight sparking near the school” or “ಕಸ 5 ದಿನದಿಂದ ತೆಗೆದಿಲ್ಲ” — watch
              the category, severity and department change.
            </p>
          </div>

          {/* Triage result */}
          <div
            id="triage-result"
            className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm"
          >
            <h2 className="text-xl font-bold">Triage result</h2>
            {!result ? (
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <p>Submit a complaint and the triage appears here:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Issue category — roads, waste, water, electricity, trees, drainage</li>
                  <li>Severity — Low / Medium / High / Critical, with a one-line reason</li>
                  <li>Department the ticket is routed to</li>
                  <li>A ticket ID the citizen can track</li>
                </ul>
                <p className="pt-3 text-xs text-slate-400">
                  The engine reads English, Kannada, Hindi and Roman-transliterated text, and
                  explains every decision with the signals it matched.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                    Ticket {result.id}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                    Language: {result.language}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Category
                  </p>
                  <p className="mt-1 text-2xl font-black">{CATEGORY_LABELS[result.category]}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Severity
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${SEVERITY_STYLE[result.severity]}`}
                  >
                    {result.severity}
                  </span>
                  <p className="mt-2 text-sm text-slate-200">{result.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Routed to
                  </p>
                  <p className="mt-1 text-lg font-bold">{result.department}</p>
                </div>
                {result.signals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Signals matched
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.signals.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="border-t border-white/10 pt-4 text-xs text-slate-400">
                  Ticket added to the dashboard below, sorted by priority. The citizen can
                  track it with ID {result.id}.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="mt-14 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Officer dashboard</h2>
              <p className="mt-1 text-sm text-slate-500">
                Every ticket, sorted by priority — Critical first. Click a ticket for detail,
                change its status as work progresses.
              </p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tickets, places, IDs…"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-emerald-600 sm:w-64"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["all", "roads", "waste", "water", "electricity", "trees", "drainage"] as const).map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    categoryFilter === c
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c === "all" ? "All categories" : CATEGORY_LABELS[c]}
                </button>
              ),
            )}
            <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block" />
            {(["all", "Open", "In Progress", "Resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  statusFilter === s
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? "All statuses" : s}
              </button>
            ))}
          </div>

          {sorted.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No tickets match these filters.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {sorted.map((t) => (
                <article
                  key={t.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[t.severity]}`} />
                    <span className="w-20 shrink-0 font-mono text-sm font-bold text-slate-500">
                      {t.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.text}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {t.location} · {timeAgo(t.createdAt, now)} · {t.reporter}
                      </span>
                    </span>
                    <span
                      className={`hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline-block ${CATEGORY_COLOR[t.category]}`}
                    >
                      {CATEGORY_LABELS[t.category]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${SEVERITY_STYLE[t.severity]}`}
                    >
                      {t.severity}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_STYLE[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </button>
                  {expanded === t.id && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                      <p className="text-sm leading-relaxed">{t.text}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Why this severity: </span>
                        {t.reason}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Routed to: </span>
                        {t.department}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Language: </span>
                        {t.language}
                      </p>
                      {t.photo && (
                        <img
                          src={t.photo}
                          alt="Complaint photo"
                          className="mt-3 max-h-56 rounded-xl border border-slate-200 object-cover"
                        />
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Set status:</span>
                        {(["Open", "In Progress", "Resolved"] as Status[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(t.id, s)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                              t.status === s
                                ? "bg-slate-900 text-white ring-slate-900"
                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
          <p>
            <span className="font-bold text-slate-700">CivicLens</span> — built during Prompt
            to Product, 21 Nov 2026, 10:30 AM–2:30 PM. Team: Santhosh Devappa Dubari &
            Vaishnavi V. Stack: Next.js, React, Tailwind CSS. Triage is a deterministic
            multilingual NLP pipeline built for this event; the build was driven by
            generative AI (Jarvis / Muse) with the full prompt history in PROMPT_LOG.md.
          </p>
          <p className="mt-2">
            Departments shown are Bengaluru civic bodies (BBMP, BWSSB, BESCOM). Seed tickets
            are realistic examples for the demo; new complaints are stored locally in your
            browser.
          </p>
        </footer>
      </main>
    </div>
  );
}
