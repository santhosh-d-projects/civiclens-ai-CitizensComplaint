// Shared UI primitives — Complaint-Sathi Civic Glass design system
// (redesign 21 Nov 2026). Every interactive element gets a data-testid
// (master prompt §9). Existing exports keep their props/signatures so pages
// keep working; styling is glassmorphism (indigo → violet, teal, midnight).
"use client";

import { useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_28px_rgba(79,70,229,0.45)] hover:-translate-y-px focus:ring-electric disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none",
    secondary:
      "glass text-navy-ink hover:bg-white/90 focus:ring-electric disabled:text-slate-400",
    danger:
      "bg-white text-critical border border-critical/40 hover:bg-critical-bg focus:ring-critical disabled:text-slate-400",
    ghost: "bg-transparent text-indigo hover:bg-indigo/5 focus:ring-electric",
  };
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:translate-y-0 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

/* ---------- Glass surfaces ---------- */
export function GlassCard({
  className = "",
  children,
  testId,
}: {
  className?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className={`glass rounded-3xl ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "indigo",
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "indigo" | "teal" | "violet" | "amber" | "red" | "green" | "blue";
  testId?: string;
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo/10 text-indigo",
    teal: "bg-teal/10 text-teal",
    violet: "bg-violet/10 text-violet",
    amber: "bg-pending-bg text-pending",
    red: "bg-critical-bg text-critical",
    green: "bg-low-bg text-low",
    blue: "bg-medium-bg text-medium",
  };
  return (
    <div data-testid={testId} className="glass rounded-3xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
        {label}
      </p>
      <p className={`tnum mt-2 text-3xl font-bold ${tones[tone].split(" ")[1] ?? "text-navy-ink"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-muted">{sub}</p>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-ink sm:text-4xl">
          {title}
        </h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-slate-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  testId,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]"
          : "glass text-slate-muted hover:bg-white/90 hover:text-navy-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Badges ---------- */
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-critical-bg text-critical border-critical/20",
    high: "bg-high-bg text-high border-high/20",
    medium: "bg-medium-bg text-medium border-medium/20",
    low: "bg-low-bg text-low border-low/20",
  };
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[severity] ?? "bg-slate-100 text-slate-600"}`}
    >
      {severity === "critical" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-critical" />
      )}
      {label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const label = status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const map: Record<string, string> = {
    submitted: "bg-medium-bg text-medium",
    received: "bg-medium-bg text-medium",
    in_progress: "bg-medium-bg text-medium",
    resolved: "bg-low-bg text-low",
    closed: "bg-slate-100 text-slate-600",
    reopened: "bg-high-bg text-high",
    active: "bg-low-bg text-low",
    pending: "bg-pending-bg text-pending",
    approved: "bg-medium-bg text-medium",
    changes_requested: "bg-pending-bg text-pending",
    suspended: "bg-critical-bg text-critical",
    deactivated: "bg-slate-100 text-slate-600",
    rejected: "bg-critical-bg text-critical",
    draft: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {label}
    </span>
  );
}

/* ---------- Empty state / skeleton ---------- */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass rounded-3xl border-dashed p-8 text-center">
      <p className="text-sm font-semibold text-navy-ink">{title}</p>
      {body && <p className="mt-1 text-sm text-slate-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-indigo/10 ${className}`} />;
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/40 p-4 backdrop-blur-md sm:items-center"
      onClick={onClose}
      data-testid={testId}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong w-full max-w-lg rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-navy-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded-xl text-xl text-slate-muted hover:bg-indigo/5"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Right drawer ---------- */
export function Drawer({
  open,
  onClose,
  title,
  children,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-midnight/40 backdrop-blur-md"
      onClick={onClose}
      data-testid={testId}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-line bg-white/80 px-6 py-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-navy-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded-xl text-xl text-slate-muted hover:bg-indigo/5"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

/* ---------- Field helpers ---------- */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide text-slate-muted uppercase">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-muted">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-critical">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white/80 px-3 py-2.5 text-sm text-navy-ink outline-none placeholder:text-slate-faint backdrop-blur focus:border-electric focus:ring-2 focus:ring-electric/25 disabled:bg-slate-50";
