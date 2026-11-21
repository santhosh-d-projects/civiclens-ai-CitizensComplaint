// POST /api/admin/departments/[id]/activate — approved → active.
// Requires the typed confirmation "ACTIVATE". The SQL function enforces:
// all documents verified + an officer exists + maker-checker.
// On success an officer invite is issued (32-byte random token, only the
// SHA-256 hash is stored, 48h expiry, single use). The invite link is
// logged to the server console (dev) and returned to the admin.
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { requireAdmin, clientIp, deviceOf, signAuditBestEffort } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import type { Department } from "@/lib/database.types";

const Body = z.object({ confirmation: z.string() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, error: authErr } = await requireAdmin();
    if (authErr) return authErr;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success || parsed.data.confirmation.trim() !== "ACTIVATE") {
      return apiError(
        "VALIDATION",
        'Type ACTIVATE to confirm activation.',
        422,
      );
    }
    const admin = createAdminClient();
    const department = await callDbFunction<Department>(
      admin,
      "transition_department",
      {
        p_dept: id,
        p_to: "active",
        p_actor: session.userId,
        p_reason: null,
        p_ip: clientIp(req),
        p_device: deviceOf(req),
      },
    );
    await signAuditBestEffort();

    // Officer invite: first officer without an account yet.
    const { data: officers } = await admin
      .from("department_officers")
      .select("*")
      .eq("department_id", id)
      .order("created_at")
      .limit(1);
    const officer = officers?.[0];
    let inviteUrl: string | null = null;
    if (officer && !officer.profile_id) {
      const token = randomBytes(32).toString("hex");
      const hash = createHash("sha256").update(token).digest("hex");
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      await admin
        .from("department_officers")
        .update({ invite_token_hash: hash, invite_expires_at: expires })
        .eq("id", officer.id);
      const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      inviteUrl = `${base}/officer/accept-invite?token=${token}`;
      console.log(`[invite] ${officer.email} (${department.name}): ${inviteUrl}`);
    }
    return Response.json({ department, inviteUrl });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
