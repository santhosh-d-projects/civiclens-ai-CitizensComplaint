// GET /api/admin/audit/[seq]/verify — full verification of one row:
// hash recomputation + chain link (verify_audit) + Ed25519 signature.
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
    const chainVerified =
      verification.found &&
      verification.hash_ok &&
      verification.prev_ok &&
      (!verification.signature.present || verification.signature.ok);
    return Response.json({
      row,
      verification: {
        ...verification,
        chainVerified,
      },
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
