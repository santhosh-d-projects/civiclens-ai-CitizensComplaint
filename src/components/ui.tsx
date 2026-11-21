// Shared UI primitives — Complaint-Sathi design system (Stitch tokens).
// Every interactive element gets a data-testid (master prompt §9).
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
      "bg-navy text-white hover:bg-navy-hover focus:ring-teal disabled:bg-slate-300",
    secondary:
      "bg-white text-navy-ink border border-line hover:bg-slate-50 focus:ring-teal disabled:text-slate-400",
    danger:
      "bg-white text-critical border border-critical hover:bg-critical-bg focus:ring-critical disabled:text-slate-400",
    ghost: "bg-transparent text-navy hover:bg-slate-100 focus:ring-teal",
  };
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
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
    in_progress: "bg-high-bg text-high",
    resolved: "bg-low-bg text-low",
    closed: "bg-slate-100 text-slate-600",
    reopened: "bg-high-bg text-high",
    active: "bg-low-bg text-low",
    pending: "bg-high-bg text-high",
    approved: "bg-medium-bg text-medium",
    changes_requested: "bg-high-bg text-high",
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
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p className="text-sm font-semibold text-navy-ink">{title}</p>
      {body && <p className="mt-1 text-sm text-slate-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-ink/45 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      data-testid={testId}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-navy-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded text-xl text-slate-muted hover:bg-slate-100"
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
      className="fixed inset-0 z-50 bg-navy-ink/45 backdrop-blur-[2px]"
      onClick={onClose}
      data-testid={testId}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-navy-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded text-xl text-slate-muted hover:bg-slate-100"
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
      <span className="text-xs font-medium tracking-wide text-slate-muted uppercase">
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
  "w-full rounded border border-line bg-white px-3 py-2.5 text-sm text-navy-ink outline-none placeholder:text-slate-400 focus:border-teal focus:ring-2 focus:ring-teal-soft disabled:bg-slate-50";
