// GET /api/admin/audit/verify-chain — verify_audit_chain():
// returns the first broken seq, or null when the whole chain is intact.
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const brokenSeq = await callDbFunction<number | null>(
      createAdminClient(),
      "verify_audit_chain",
      {},
    );
    return Response.json({ ok: brokenSeq === null, brokenSeq });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
