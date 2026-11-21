// GET /api/admin/audit/[seq]/export — download the event as JSON,
// including the verification receipt and signature certificate.
import { requireAdmin } from "@/lib/admin-api";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { verifyAuditRow } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ seq: string }> },
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { seq } = await params;
    const n = Number(seq);
    if (!Number.isFinite(n) || n < 1) {
      return apiError("VALIDATION", "Invalid audit sequence number.", 422);
    }
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("audit_log")
      .select("*")
      .eq("seq", n)
      .maybeSingle();
    if (!row) return apiError("NOT_FOUND", "Audit event not found.", 404);
    const verification = await verifyAuditRow(n);
    const payload = {
      exported_at: new Date().toISOString(),
      event: row,
      verification: {
        found: verification.found,
        hash_ok: verification.hash_ok,
        prev_ok: verification.prev_ok,
        record_hash: verification.record_hash,
        prev_hash: verification.prev_hash,
        chain_position: row.seq,
        signature: verification.signature,
      },
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="audit-event-${n}.json"`,
      },
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
