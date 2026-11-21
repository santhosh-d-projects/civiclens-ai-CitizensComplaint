// Officer-track formatting helpers (SLA + dates).

/** Human SLA label from an ISO due date, e.g. "Due in 5h 20m" / "Overdue by 2h". */
export function slaLabel(slaDueAt: string | null): {
  text: string;
  tone: "ok" | "warn" | "bad" | "muted";
} {
  if (!slaDueAt) return { text: "No SLA set", tone: "muted" };
  const diffMs = new Date(slaDueAt).getTime() - Date.now();
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const span = h > 0 ? `${h}h ${m}m` : `${m}m`;
  if (diffMs < 0) return { text: `Overdue by ${span}`, tone: "bad" };
  if (diffMs < 24 * 3600_000) return { text: `Due in ${span}`, tone: "warn" };
  return { text: `Due in ${span}`, tone: "ok" };
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
