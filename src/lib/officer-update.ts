// Officer complaint-update validation (pure, unit-tested). Used by
// PATCH /api/department/complaints/[id]. The SQL function
// officer_update_complaint re-enforces the same rules server-side.
import { z } from "zod";

export const OfficerUpdateBody = z.object({
  status: z.enum(["received", "in_progress", "resolved"]),
  note: z.string().max(2000).optional(),
  resolution_photo_paths: z.array(z.string()).max(5).optional(),
});

export type OfficerUpdateInput = z.infer<typeof OfficerUpdateBody>;

export function validateOfficerUpdate(
  body: unknown,
): { ok: true; data: OfficerUpdateInput } | { ok: false; error: string } {
  const parsed = OfficerUpdateBody.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (parsed.data.status === "resolved" && !parsed.data.note?.trim()) {
    return {
      ok: false,
      error: "A resolution note is required to mark a complaint resolved.",
    };
  }
  return { ok: true, data: parsed.data };
}
