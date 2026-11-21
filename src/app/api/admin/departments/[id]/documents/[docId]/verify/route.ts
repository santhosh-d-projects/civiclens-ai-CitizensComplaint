// POST /api/admin/departments/[id]/documents/[docId]/verify
// Toggle document verification (verified_by / verified_at). Activation
// requires every document verified (enforced in transition_department).
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { requireAdmin, signAuditBestEffort } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";

const Body = z.object({ verified: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const { session, error: authErr } = await requireAdmin();
    if (authErr) return authErr;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError("VALIDATION", "verified must be true or false.", 422);
    }
    const admin = createAdminClient();
    const { data: doc, error: dErr } = await admin
      .from("department_documents")
      .select("*")
      .eq("id", docId)
      .eq("department_id", id)
      .single();
    if (dErr || !doc) {
      return apiError("NOT_FOUND", "Document not found.", 404);
    }
    const { data, error: uErr } = await admin
      .from("department_documents")
      .update({
        verified_by: parsed.data.verified ? session.userId : null,
        verified_at: parsed.data.verified ? new Date().toISOString() : null,
      } as never)
      .eq("id", docId)
      .select()
      .single();
    if (uErr) throw new Error(uErr.message);
    await callDbFunction(admin, "write_audit", {
      p_actor: session.userId,
      p_role: "admin",
      p_action: parsed.data.verified ? "DOCUMENT_VERIFIED" : "DOCUMENT_UNVERIFIED",
      p_etype: "department",
      p_entity: id,
      p_old: null,
      p_new: null,
      p_reason: doc.name,
      p_ip: null,
      p_device: null,
      p_meta: { document_id: docId },
    });
    await signAuditBestEffort();
    return Response.json({ document: data });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
