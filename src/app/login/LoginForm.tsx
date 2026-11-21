// Sign in — email OTP (master prompt §4/§6). Citizens register the same
// way; the DB trigger creates their profile as `citizen`. Officers sign in
// with the password they set from their invite; the department guard runs
// on every officer page and API route.
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, inputClass } from "@/components/ui";


export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
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
    setBusy(false);
    if (error) setError(error.message);
    else await routeByRole();
  }

  async function signInPassword() {
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) setError(error.message);
    else await routeByRole();
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to Complaint-Sathi</h1>
        <p className="mt-1 text-sm text-slate-muted">
          Citizens sign in with an email code. Officers use the password set
          from their invite.
        </p>

        <div className="mt-5 flex gap-2">
          <Button
            variant={mode === "otp" ? "primary" : "secondary"}
            onClick={() => setMode("otp")}
            data-testid="login-mode-otp"
            className="flex-1"
          >
            Email code
          </Button>
          <Button
            variant={mode === "password" ? "primary" : "secondary"}
            onClick={() => setMode("password")}
            data-testid="login-mode-password"
            className="flex-1"
          >
            Password
          </Button>
        </div>

        <div className="mt-5 space-y-4">
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
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                data-testid="login-password"
                autoComplete="current-password"
              />
            </Field>
          )}

          {error && <p className="text-sm text-critical">{error}</p>}
          {info && <p className="text-sm text-low">{info}</p>}

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
          {mode === "password" && (
            <Button
              onClick={signInPassword}
              disabled={busy || !email.includes("@") || !password}
              data-testid="login-signin"
              className="w-full"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
