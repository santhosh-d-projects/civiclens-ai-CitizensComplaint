// POST /api/admin/audit/sign — sign all unsigned audit rows with the
// Ed25519 key from env (AUDIT_SIGNING_PRIVATE_KEY). Also called
// best-effort after admin mutations (see signAuditBestEffort).
import { requireAdmin } from "@/lib/admin-api";
import { sqlErrorToResponse } from "@/lib/auth";
import { signAuditRows } from "@/lib/audit";

export async function POST() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const result = await signAuditRows();
    return Response.json(result);
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
