"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, inputClass } from "@/components/ui";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setError("");
    setSuccess("");
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
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password changed.");
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Change password</h3>
      <div className="mt-3 space-y-3">
        <Field label="New password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            data-testid="profile-new-password"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            data-testid="profile-confirm-password"
            autoComplete="new-password"
          />
        </Field>
        {error && <p className="text-sm text-critical">{error}</p>}
        {success && <p className="text-sm text-low">{success}</p>}
        <Button
          variant="secondary"
          onClick={submit}
          disabled={busy || !password || !confirm}
          data-testid="profile-change-password"
        >
          {busy ? "Changing…" : "Change password"}
        </Button>
      </div>
    </div>
  );
}
