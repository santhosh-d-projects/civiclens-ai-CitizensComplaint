// POST /api/officer/accept-invite — first-time officer credential setup.
// The invite token is a random 32-byte value emailed to the officer; only
// its SHA-256 is stored (department_officers.invite_token_hash). Single use,
// 48h expiry. Sets the officer's auth password, marks the invite used, and
// writes OFFICER_CREDENTIALS_ACCEPTED to the audit log. Never returns a
// password or a token.
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import { hashInviteToken, inviteStatus } from "@/lib/invite";

const Body = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const { token, password } = parsed.data;
    const admin = createAdminClient();
    const tokenHash = hashInviteToken(token);

    const { data: officer } = await admin
      .from("department_officers")
      .select("id,department_id,profile_id,name,email")
      .eq("invite_token_hash", tokenHash)
      .single();
    const row = officer as {
      id: string;
      department_id: string;
      profile_id: string | null;
      name: string;
      email: string;
    } | null;
    if (!row) return apiError("INVALID_TOKEN", "This invite link is not valid.", 404);

    const { data: fresh } = await admin
      .from("department_officers")
      .select("invite_used_at,invite_expires_at")
      .eq("id", row.id)
      .single();
    const inv = fresh as { invite_used_at: string | null; invite_expires_at: string | null } | null;
    const status = inviteStatus({
      invite_used_at: inv?.invite_used_at ?? null,
      invite_expires_at: inv?.invite_expires_at ?? null,
    });
    if (status === "used") {
      return apiError("INVITE_USED", "This invite has already been used. Sign in with your password, or ask the administrator for a new invite.", 409);
    }
    if (status === "expired") {
      return apiError("INVITE_EXPIRED", "This invite has expired (invites last 48 hours). Ask the administrator to resend it.", 410);
    }

    // Set the password: update the existing auth user, or create one and
    // link it (officer rows created before the auth user exists have
    // profile_id null).
    let profileId = row.profile_id;
    if (profileId) {
      const { error } = await admin.auth.admin.updateUserById(profileId, { password });
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: row.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: row.name },
      });
      if (createErr) {
        // The auth user may already exist (created by another flow) — find
        // it by email and set the password instead of failing.
        if (/already registered|already exists/i.test(createErr.message)) {
          const { data: listed } = await admin.auth.admin.listUsers();
          const existing = (listed?.users ?? []).find(
            (u) => u.email?.toLowerCase() === row.email.toLowerCase(),
          );
          if (!existing) throw new Error(createErr.message);
          profileId = existing.id;
          const { error } = await admin.auth.admin.updateUserById(profileId, { password });
          if (error) throw new Error(error.message);
        } else {
          throw new Error(createErr.message);
        }
      } else {
        profileId = created.user?.id ?? null;
      }
      if (!profileId) throw new Error("Could not create the officer account.");
    }

    // The officer's profile must be role department_officer in this dept.
    // (handle_new_user creates citizen profiles for new auth users.)
    await admin
      .from("profiles")
      .upsert(
        {
          id: profileId,
          role: "department_officer",
          full_name: row.name,
          email: row.email,
          department_id: row.department_id,
        },
        { onConflict: "id" },
      );

    await admin
      .from("department_officers")
      .update({
        profile_id: profileId,
        invite_used_at: new Date().toISOString(),
        invite_token_hash: null,
      })
      .eq("id", row.id);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await callDbFunction(admin, "write_audit", {
      p_actor: profileId,
      p_role: "department_officer",
      p_action: "OFFICER_CREDENTIALS_ACCEPTED",
      p_etype: "department_officer",
      p_entity: row.id,
      p_old: null,
      p_new: "active",
      p_reason: null,
      p_ip: ip,
      p_device: req.headers.get("user-agent") ?? null,
      p_meta: { department_id: row.department_id },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
