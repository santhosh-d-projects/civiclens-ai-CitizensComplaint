// Tests for src/lib/officer-update.ts — the PATCH validation for officer
// complaint updates: allowed statuses, and the rule that resolving requires
// a resolution note (also enforced by officer_update_complaint in SQL).
import { describe, it, expect } from "vitest";
import { validateOfficerUpdate } from "@/lib/officer-update";

describe("validateOfficerUpdate", () => {
  it("accepts a received/in-progress update with an optional note", () => {
    const r = validateOfficerUpdate({ status: "in_progress", note: "Crew on site" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("in_progress");
  });

  it("accepts resolving with a resolution note", () => {
    const r = validateOfficerUpdate({ status: "resolved", note: "Fixed and verified" });
    expect(r.ok).toBe(true);
  });

  it("rejects resolving without a note", () => {
    const r = validateOfficerUpdate({ status: "resolved" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/resolution note/i);
  });

  it("rejects resolving with a blank note", () => {
    const r = validateOfficerUpdate({ status: "resolved", note: "   " });
    expect(r.ok).toBe(false);
  });

  it("rejects statuses officers may not set (submitted, closed, reopened)", () => {
    for (const status of ["submitted", "closed", "reopened"]) {
      expect(validateOfficerUpdate({ status }).ok).toBe(false);
    }
  });

  it("rejects more than 5 resolution photos and over-long notes", () => {
    expect(
      validateOfficerUpdate({
        status: "resolved",
        note: "ok",
        resolution_photo_paths: ["a", "b", "c", "d", "e", "f"],
      }).ok,
    ).toBe(false);
    expect(
      validateOfficerUpdate({ status: "received", note: "x".repeat(2001) }).ok,
    ).toBe(false);
  });
});
