// POST /api/auth/register — citizen sign-up WITHOUT email verification
// (user order 2026-11-21 ~16:22 IST: remove the email code verification).
// Creates the auth user pre-confirmed via the service-role admin API
// (email_confirm: true), so NO confirmation email is sent and the citizen
// can sign in with the password immediately. The Supabase dashboard setting
// (mailer_autoconfirm) could not be changed — this project's Management API
// credential lacks the auth_config_read/write scopes — so verification is
// removed in the app instead. Trade-off, stated plainly: anyone can register
// with any email address without proving they own it. Fine for this event
// build; a production portal should turn email confirmation back on.
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const now = Date.now();
    const windowHits = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    if (windowHits.length >= 5) {
      return apiError("RATE_LIMITED", "Too many sign-ups. Try again later.", 429);
    }
    windowHits.push(now);
    hits.set(ip, windowHits);

    const body = await req.json();
    const parsed = RegisterBody.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (error) {
      const msg = error.message ?? "";
      if (/already (registered|exists)|already been registered/i.test(msg)) {
        return apiError(
          "ALREADY_REGISTERED",
          "An account with this email already exists. Sign in instead.",
          409,
        );
      }
      return apiError("REGISTER_FAILED", msg || "Could not create the account.", 400);
    }
    // handle_new_user trigger creates the citizen profile automatically.
    return Response.json({ created: true, userId: data.user?.id ?? null }, { status: 201 });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
