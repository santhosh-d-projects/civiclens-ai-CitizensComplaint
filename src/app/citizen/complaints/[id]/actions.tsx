// Citizen actions on a resolved/closed complaint: feedback + reopen.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";

export function FeedbackForm({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0); // 0 = no rating chosen yet (never pre-select 5)
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating === 0) {
      setError("Please pick a rating first.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/complaints/${complaintId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
    });
    const data = (await res.json()) as { error?: { message: string } };
    setBusy(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Could not save your feedback.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <p className="text-sm font-medium text-low">Thanks for your feedback.</p>;
  }
  return (
    <div className="space-y-4">
      <Field label="Rate the resolution">
        <div className="flex gap-2" role="radiogroup" aria-label="Rating out of 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              data-testid={`feedback-star-${n}`}
              className={`min-h-[44px] min-w-[44px] rounded-xl border text-sm font-bold transition-all ${
                rating === n
                  ? "border-transparent bg-gradient-to-br from-indigo to-violet text-white shadow-[0_6px_14px_rgba(5,150,105,0.35)]"
                  : "glass text-navy-ink hover:bg-white/90"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Comment (optional)">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="What was fixed, or what is still pending?"
          className={`${inputClass} resize-y`}
          data-testid="feedback-comment"
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
          {error}
        </p>
      )}
      <Button
        onClick={() => void submit()}
        disabled={busy || rating === 0}
        data-testid="feedback-submit"
      >
        {busy ? "Saving…" : "Submit feedback"}
      </Button>
    </div>
  );
}

export function ReopenButton({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function reopen() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/complaints/${complaintId}/reopen`, {
      method: "POST",
    });
    const data = (await res.json()) as { error?: { message: string } };
    setBusy(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Could not reopen the complaint.");
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <div>
        <Button
          variant="danger"
          onClick={() => setConfirming(true)}
          data-testid="reopen-start"
        >
          Report it as not fixed (reopen)
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-navy-ink">
        Reopen this complaint? The department will see it again as an open
        case.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          onClick={() => void reopen()}
          disabled={busy}
          data-testid="reopen-confirm"
        >
          {busy ? "Reopening…" : "Yes, reopen"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setConfirming(false)}
          data-testid="reopen-cancel"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
