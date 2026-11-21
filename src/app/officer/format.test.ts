// Tests for src/app/officer/format.ts — SLA labels and date formatting
// used across the officer desk (dashboard, queue, detail).
import { describe, it, expect } from "vitest";
import { slaLabel, formatDateTime } from "@/app/officer/format";

describe("slaLabel", () => {
  it("reports no SLA when the due date is null", () => {
    expect(slaLabel(null)).toEqual({ text: "No SLA set", tone: "muted" });
  });

  it("flags overdue as bad", () => {
    const past = new Date(Date.now() - 2 * 3600_000).toISOString();
    const r = slaLabel(past);
    expect(r.tone).toBe("bad");
    expect(r.text).toMatch(/^Overdue by 2h/);
  });

  it("warns when due within 24h", () => {
    const soon = new Date(Date.now() + 5 * 3600_000).toISOString();
    const r = slaLabel(soon);
    expect(r.tone).toBe("warn");
    expect(r.text).toMatch(/^Due in 5h/);
  });

  it("is ok when due after 24h", () => {
    const later = new Date(Date.now() + 3 * 24 * 3600_000).toISOString();
    const r = slaLabel(later);
    expect(r.tone).toBe("ok");
    expect(r.text).toMatch(/^Due in 72h/);
  });

  it("formats sub-hour spans in minutes", () => {
    const soon = new Date(Date.now() + 30 * 60_000).toISOString();
    expect(slaLabel(soon).text).toMatch(/30m/);
  });
});

describe("formatDateTime", () => {
  it("formats an ISO date in en-IN with day, month, year and time", () => {
    const out = formatDateTime("2026-11-21T06:30:00.000Z");
    expect(out).toMatch(/21 Nov 2026/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});
