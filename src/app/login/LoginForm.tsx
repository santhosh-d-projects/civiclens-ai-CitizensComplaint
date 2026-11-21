// Sign in — email + password is the primary flow (user decision 2026-11-21
// ~12:20 IST). Citizens register with email + password + confirm password;
// officers sign in with the password they set from their invite; the
// department guard runs on every officer page and API route. Email-code OTP
// stays as a secondary sign-in option. Firebase email verification is an
// OPTIONAL add-on (V2) and must never gate this flow.
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, inputClass } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [auth, setAuth] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function sendOtp() {
    setError("");
    setInfo("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setStep("code");
      setInfo("We sent a 6-digit code to your email. It expires in 10 minutes.");
    }
  }

  async function verifyOtp() {
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    // On success the button stays busy until the navigation unmounts this
    // page; clearing it first makes a slow navigation look like a failed
    // sign-in (smoke test 21 Nov: first click appeared to stall).
    if (error) {
      setBusy(false);
      setError(error.message);
    } else await routeByRole();
  }

  async function signInPassword() {
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // See verifyOtp: keep the button busy until navigation unmounts the page.
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
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // If email confirmation is on, Supabase returns no session: the citizen
    // confirms via the email link, then signs in with the same password.
    if (data.session) await routeByRole();
    else {
      setBusy(false);
      setInfo("Account created. Check your email to confirm it, then sign in with your password.");
    }
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
              ? "Register with your email and a password. You will sign in with the same email and password."
              : "Sign in with your email and password. Officers use the password set from their invite."}
          </p>

          <div className="glass mt-6 flex gap-1 rounded-full p-1">
            <Button
              variant={mode === "password" ? "primary" : "ghost"}
              onClick={() => setMode("password")}
              data-testid="login-mode-password"
              className="flex-1 rounded-full"
            >
              Password
            </Button>
            <Button
              variant={mode === "otp" ? "primary" : "ghost"}
              onClick={() => setMode("otp")}
              data-testid="login-mode-otp"
              className="flex-1 rounded-full"
            >
              Email code
            </Button>
          </div>

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

            {mode === "otp" && step === "code" && (
              <Field label="6-digit code">
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className={`${inputClass} tnum tracking-[0.3em]`}
                  data-testid="login-code"
                  autoComplete="one-time-code"
                />
              </Field>
            )}

            {mode === "password" && (
              <>
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
              </>
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

            {mode === "otp" && step === "email" && (
              <Button
                onClick={sendOtp}
                disabled={busy || !email.includes("@")}
                data-testid="login-send-code"
                className="w-full"
              >
                {busy ? "Sending…" : "Send code"}
              </Button>
            )}
            {mode === "otp" && step === "code" && (
              <Button
                onClick={verifyOtp}
                disabled={busy || code.length !== 6}
                data-testid="login-verify"
                className="w-full"
              >
                {busy ? "Verifying…" : "Verify and sign in"}
              </Button>
            )}
            {mode === "password" && auth === "signin" && (
              <Button
                onClick={signInPassword}
                disabled={busy || !email.includes("@") || !password}
                data-testid="login-signin"
                className="w-full"
              >
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            )}
            {mode === "password" && auth === "signup" && (
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

          {mode === "password" && (
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
          )}
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-slate-muted">
          Report a civic issue in Bengaluru — AI suggests the right department,
          you confirm it.
        </p>
      </div>
    </div>
  );
}
