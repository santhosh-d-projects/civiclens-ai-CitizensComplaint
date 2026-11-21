// Sign in — email + password only (user decision 2026-11-21 ~12:20 IST, and
// the email-code verification removal ~16:22 IST). Citizens register with
// email + password + confirm password via POST /api/auth/register, which
// creates the account pre-confirmed — no confirmation email, no code, the
// citizen signs in with the same password immediately. Officers sign in
// with the password they set from their invite; the department guard runs
// on every officer page and API route. Firebase email verification (V2) was
// never built and must never gate this flow.
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, inputClass } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [auth, setAuth] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function signInPassword() {
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Keep the button busy until navigation unmounts this page; clearing it
    // first makes a slow navigation look like a failed sign-in (smoke test
    // 21 Nov: first click appeared to stall).
    if (error) {
      setBusy(false);
      setError(error.message);
    } else await routeByRole();
  }

  async function signUp() {
    setError("");
    setInfo("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    // The server creates the account pre-confirmed (no email, no code).
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setBusy(false);
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message ?? "Could not create the account.");
      return;
    }
    // Account is confirmed already — sign in with the same password.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    setInfo("Account created. Signing you in…");
    await routeByRole();
  }

  async function routeByRole() {
    // Role comes from profiles (DB) via a same-origin API that uses the
    // service client — never from client-side claims.
    const res = await fetch("/api/me");
    if (!res.ok) {
      setError("Signed in, but we could not load your profile. Try again.");
      return;
    }
    const { role } = (await res.json()) as { role: string };
    if (next) {
      router.push(next);
      return;
    }
    if (role === "admin") router.push("/admin");
    else if (role === "department_officer") router.push("/officer");
    else router.push("/citizen");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-xl font-extrabold text-white shadow-[0_8px_20px_rgba(5,150,105,0.4)]">
              S
            </span>
            <span>
              <span className="block text-lg leading-none font-bold text-navy-ink">
                Complaint-<span className="text-gradient">Sathi</span>
              </span>
              <span className="mt-1 block text-xs font-medium text-slate-muted">
                Civic Complaint Portal · Bengaluru
              </span>
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-navy-ink">
            {auth === "signup" ? "Create your citizen account" : "Sign in to Complaint-Sathi"}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-muted">
            {auth === "signup"
              ? "Register with your email and a password. No email confirmation needed — you sign in right away."
              : "Sign in with your email and password. Officers use the password set from their invite."}
          </p>

          <div className="mt-6 space-y-4">
            <Field label="Email" error={undefined}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                data-testid="login-email"
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                data-testid="login-password"
                autoComplete={auth === "signup" ? "new-password" : "current-password"}
              />
            </Field>
            {auth === "signup" && (
              <Field label="Confirm password">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  data-testid="login-confirm-password"
                  autoComplete="new-password"
                />
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-xl bg-low-bg px-3.5 py-2.5 text-sm font-medium text-low">
                {info}
              </p>
            )}

            {auth === "signin" && (
              <Button
                onClick={signInPassword}
                disabled={busy || !email.includes("@") || !password}
                data-testid="login-signin"
                className="w-full"
              >
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            )}
            {auth === "signup" && (
              <Button
                onClick={signUp}
                disabled={busy || !email.includes("@") || !password || !confirm}
                data-testid="login-signup"
                className="w-full"
              >
                {busy ? "Creating account…" : "Create account"}
              </Button>
            )}
          </div>

          <p className="mt-5 text-center text-sm text-slate-muted">
            {auth === "signin" ? (
              <>
                New citizen?{" "}
                <button
                  type="button"
                  onClick={() => setAuth("signup")}
                  data-testid="login-goto-signup"
                  className="font-semibold text-indigo underline underline-offset-2 hover:text-violet"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuth("signin")}
                  data-testid="login-goto-signin"
                  className="font-semibold text-indigo underline underline-offset-2 hover:text-violet"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-slate-muted">
          Report a civic issue in Bengaluru — AI suggests the right department,
          you confirm it.
        </p>
      </div>
    </div>
  );
}
