// First-time officer invite: set your portal password from the single-use
// invite link. The invite is valid for 48 hours and can be used once.
// No password is ever shown or emailed back.
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field, GlassCard, inputClass } from "@/components/ui";

function strength(password: string): { label: string; checks: string[] } {
  const checks: string[] = [];
  if (password.length >= 10) checks.push("10+ characters");
  if (/[A-Z]/.test(password)) checks.push("uppercase letter");
  if (/[0-9]/.test(password)) checks.push("number");
  if (/[^A-Za-z0-9]/.test(password)) checks.push("special character");
  const label =
    checks.length >= 4 ? "Strong" : checks.length >= 2 ? "Good" : password ? "Weak" : "";
  return { label, checks };
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md p-6 sm:p-8">{children}</GlassCard>
    </div>
  );
}

export default function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const s = strength(password);
  const valid =
    token.length > 0 &&
    password.length >= 8 &&
    password === confirm &&
    agreed;

  async function submit() {
    setError("");
    if (!valid) return;
    setBusy(true);
    const res = await fetch("/api/officer/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(j?.error?.message ?? "Could not complete setup.");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <InviteShell>
        <h1 className="text-xl font-bold text-navy-ink">Invalid invite link</h1>
        <p className="mt-2 text-sm leading-6 text-slate-muted">
          This page needs the invite link from your email. Ask the
          administrator to resend your officer invite.
        </p>
      </InviteShell>
    );
  }

  if (done) {
    return (
      <InviteShell>
        <h1 className="text-xl font-bold text-navy-ink">Setup complete</h1>
        <p className="mt-2 text-sm leading-6 text-slate-muted">
          Your password is set. Sign in to open your officer desk. If your
          department has not been activated yet, you will see a holding page
          until the administrator activates it.
        </p>
        <div className="mt-5">
          <Button onClick={() => router.push("/login")} data-testid="invite-done-login" className="w-full">
            Go to sign in
          </Button>
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo">
        Complaint-Sathi · Officer Desk
      </p>
      <h1 className="mt-2 text-2xl font-bold text-navy-ink">Set your officer password</h1>
      <p className="mt-1 text-sm leading-6 text-slate-muted">
        This invite link is single-use and expires 48 hours after it was
        sent. Your password is stored securely and never emailed.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Create password" hint="At least 8 characters.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            data-testid="invite-password"
            autoComplete="new-password"
          />
        </Field>
        {password && (
          <div>
            <div className="flex gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < s.checks.length
                      ? "bg-gradient-to-r from-indigo to-violet"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-muted" data-testid="invite-strength">
              Password strength: <strong className="text-navy-ink">{s.label || "Weak"}</strong>
              {s.checks.length > 0 ? ` — ${s.checks.join(", ")}` : ""}
            </p>
          </div>
        )}
        <Field label="Confirm password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            data-testid="invite-confirm-password"
            autoComplete="new-password"
          />
        </Field>
        <label className="flex min-h-[44px] items-start gap-2 text-sm text-navy-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-indigo"
            data-testid="invite-terms"
          />
          <span>
            I will handle citizen grievances per the published standards, and
            I understand every action I take is logged in the tamper-evident
            audit trail.
          </span>
        </label>
        {password && confirm && password !== confirm && (
          <p className="text-sm font-medium text-critical">Passwords do not match.</p>
        )}
        {error && (
          <p className="rounded-xl border border-critical/30 bg-critical-bg px-3 py-2.5 text-sm font-medium text-critical">
            {error}
          </p>
        )}
        <Button
          onClick={submit}
          disabled={busy || !valid}
          data-testid="invite-submit"
          className="w-full"
        >
          {busy ? "Setting up…" : "Complete setup & open my desk"}
        </Button>
      </div>
    </InviteShell>
  );
}
