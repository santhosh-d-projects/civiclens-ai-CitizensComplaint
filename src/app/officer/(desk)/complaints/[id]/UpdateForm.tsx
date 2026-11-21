// Officer status-update form: status, internal/resolution note, resolution
// photo upload (signed URL via POST /api/uploads/sign, then PUT the file).
// "Mark resolved" requires a resolution note — enforced by the API and by
// the officer_update_complaint SQL function.
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, GlassCard, inputClass } from "@/components/ui";

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  submitted: [
    { value: "received", label: "Mark received" },
    { value: "in_progress", label: "Start work (in progress)" },
  ],
  received: [
    { value: "in_progress", label: "Start work (in progress)" },
    { value: "resolved", label: "Mark resolved" },
  ],
  in_progress: [{ value: "resolved", label: "Mark resolved" }],
  reopened: [
    { value: "received", label: "Mark received" },
    { value: "in_progress", label: "Start work (in progress)" },
  ],
  resolved: [],
  closed: [],
};

async function uploadPhoto(file: File, complaintId: string): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Photo must be 10MB or smaller.");
  const path = `${complaintId}/resolution/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket: "complaint-photos", path, contentType: file.type }),
  });
  if (!signRes.ok) {
    const j = (await signRes.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(j?.error?.message ?? "Could not get an upload URL.");
  }
  const j = (await signRes.json()) as {
    signedUrl?: string;
    url?: string;
    uploadUrl?: string;
    token?: string;
  };
  const signedUrl = j.signedUrl ?? j.url ?? j.uploadUrl;
  if (signedUrl) {
    const put = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("Photo upload failed.");
  } else if (j.token) {
    // Supabase signed-upload token style.
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("complaint-photos")
      .uploadToSignedUrl(path, j.token, file);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Upload endpoint returned no URL or token.");
  }
  return path;
}

export default function UpdateForm({
  complaintId,
  currentStatus,
}: {
  complaintId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const options = NEXT_STATUS[currentStatus] ?? [];
  const isResolved = status === "resolved";

  async function submit() {
    setError("");
    setSuccess("");
    if (!status) {
      setError("Choose a new status first.");
      return;
    }
    if (isResolved && !note.trim()) {
      setError("A resolution note is required to mark a complaint resolved.");
      return;
    }
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of files) paths.push(await uploadPhoto(f, complaintId));
      const res = await fetch(`/api/department/complaints/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: note.trim() || undefined,
          resolution_photo_paths: paths.length > 0 ? paths : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(j?.error?.message ?? "Update failed.");
      }
      setSuccess("Update saved — the citizen has been notified.");
      setNote("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      // Re-fetch the server-rendered badge/timeline. Keep the form busy
      // until the refresh has had time to land (smoke test 21 Nov: the badge
      // still read "Submitted" until a manual reload).
      router.refresh();
      window.setTimeout(() => setBusy(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
      setBusy(false);
    }
  }

  if (options.length === 0) {
    return (
      <GlassCard className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-navy-ink">Update status</h3>
        <p className="mt-2 text-sm leading-6 text-slate-muted">
          This complaint is {currentStatus.replaceAll("_", " ")} — no further
          officer action is available here.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <h3 className="text-sm font-bold text-navy-ink">Update status</h3>
      <div className="mt-4 space-y-4">
        <Field label="New status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
            data-testid="update-status"
          >
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field
          label={isResolved ? "Resolution note (required)" : "Internal note"}
          hint={
            isResolved
              ? "What was fixed, and how the citizen can verify it."
              : "Visible to your department and in the audit trail."
          }
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className={inputClass}
            data-testid="update-note"
            placeholder={isResolved ? "e.g. Pothole filled and resurfaced; road reopened." : "e.g. Crew dispatched, expected on site by 4 PM."}
          />
        </Field>
        <Field label="Resolution photo (optional)" hint="JPG/PNG, up to 10MB each, max 5.">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            className={inputClass}
            data-testid="update-photo"
          />
          {files.length > 0 && (
            <p className="mt-1 text-xs text-slate-muted">
              {files.map((f) => f.name).join(", ")}
            </p>
          )}
        </Field>
        {error && (
          <p className="rounded-xl border border-critical/30 bg-critical-bg px-3 py-2.5 text-sm font-medium text-critical">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-low/30 bg-low-bg px-3 py-2.5 text-sm font-medium text-low">
            {success}
          </p>
        )}
        <Button
          onClick={submit}
          disabled={busy || !status}
          data-testid="update-submit"
          className="w-full"
        >
          {busy ? "Saving…" : "Save update"}
        </Button>
      </div>
    </GlassCard>
  );
}
