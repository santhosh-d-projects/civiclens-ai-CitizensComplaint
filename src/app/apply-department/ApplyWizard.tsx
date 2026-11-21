// Public "Apply as a department" wizard — 4 steps + review + acknowledgement.
// No login before approval + activation: the application only creates a
// pending department. Mobile-first single column, 44px touch targets.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Field, inputClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, randomPath, validateFile } from "@/lib/uploads";

type Ward = { id: number; name: string; zone: string };
type Category = { id: number; slug: string; name: string };

const STEPS = ["Agency info", "Jurisdiction", "Nodal officer", "Documents"];

export default function ApplyWizard() {
  const [step, setStep] = useState(0);
  const [wards, setWards] = useState<Ward[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [wardIds, setWardIds] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [applicant, setApplicant] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPhone, setOfficerPhone] = useState("");
  const [docs, setDocs] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [affirmed, setAffirmed] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot — leave empty
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("wards").select("id,name,zone").order("name").then(({ data }) => setWards(data ?? []));
    supabase.from("categories").select("id,slug,name").order("name").then(({ data }) => setCategories(data ?? []));
  }, []);

  function toggle(list: number[], id: number, set: (v: number[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const err = validateFile(file);
        if (err) throw new Error(`${file.name}: ${err}`);
        const path = await uploadFile(
          "department-docs",
          randomPath("applications", file.name),
          file,
        );
        setDocs((d) => [...d, { name: file.name, path }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function stepValid(): boolean {
    if (step === 0) return name.trim().length >= 3 && categoryIds.length > 0;
    if (step === 1) return wardIds.length > 0;
    if (step === 2) return officerName.trim().length >= 2 && officerEmail.includes("@") && email.includes("@") && applicant.trim().length >= 2;
    return affirmed;
  }

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/departments/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        official_email: email.trim(),
        official_phone: phone.trim() || undefined,
        applicant_name: applicant.trim(),
        ward_ids: wardIds,
        category_ids: categoryIds,
        officer: {
          name: officerName.trim(),
          email: officerEmail.trim(),
          phone: officerPhone.trim() || undefined,
        },
        documents: docs,
        website,
      }),
    });
    const body = (await res.json()) as { error?: { message: string } };
    setBusy(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not submit the application.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal to-indigo text-2xl font-bold text-white shadow-[0_8px_20px_rgba(13,148,136,0.35)]">✓</span>
        <p className="mt-4 text-2xl font-bold">Application submitted</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-muted">
          Thank you. An administrator will review your application — typical
          turnaround is 3–5 working days. <strong className="text-navy-ink">No login
          is possible until the department is approved and activated.</strong>{" "}
          You will be contacted at {email}.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/"
            data-testid="apply-done-home"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo to-violet px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)] transition-all hover:-translate-y-px"
          >
            Return to portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ol className="flex flex-wrap gap-2" aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${
              i === step
                ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]"
                : i < step
                  ? "bg-teal-soft text-teal"
                  : "glass text-slate-muted"
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-4 rounded-2xl border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">{error}</p>
      )}

      <div className="mt-6 space-y-5">
        {/* Honeypot — visually hidden, must stay empty. */}
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        {step === 0 && (
          <>
            <Field label="Agency / department name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Kengeri Drainage Division" data-testid="apply-name" />
            </Field>
            <Field label="What does this department do? (optional, max 500 characters)">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} className={inputClass} data-testid="apply-description" />
            </Field>
            <fieldset>
              <legend className="text-xs font-medium tracking-wide text-slate-muted uppercase">Categories this department would serve</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c.id} type="button" onClick={() => toggle(categoryIds, c.id, setCategoryIds)} data-testid={`apply-category-${c.slug}`} className={`min-h-[44px] rounded-full border px-3 text-sm font-semibold transition-all ${categoryIds.includes(c.id) ? "border-transparent bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]" : "glass text-navy-ink hover:bg-white/90"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {step === 1 && (
          <fieldset>
            <legend className="text-xs font-medium tracking-wide text-slate-muted uppercase">Wards served</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {wards.map((w) => (
                <button key={w.id} type="button" onClick={() => toggle(wardIds, w.id, setWardIds)} data-testid={`apply-ward-${w.id}`} className={`min-h-[44px] rounded-full border px-3 text-sm font-semibold transition-all ${wardIds.includes(w.id) ? "border-transparent bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]" : "glass text-navy-ink hover:bg-white/90"}`}>
                  {w.name} <span className="text-xs text-slate-muted">· {w.zone}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-muted">
              If another active department already serves a ward under the same
              name, the application will be flagged for review.
            </p>
          </fieldset>
        )}
        {step === 2 && (
          <>
            <Field label="Applicant name">
              <input value={applicant} onChange={(e) => setApplicant(e.target.value)} className={inputClass} data-testid="apply-applicant" />
            </Field>
            <Field label="Official email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="department@example.gov.in" data-testid="apply-email" autoComplete="email" />
            </Field>
            <Field label="Official phone (optional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} data-testid="apply-phone" autoComplete="tel" />
            </Field>
            <Field label="Nodal officer name">
              <input value={officerName} onChange={(e) => setOfficerName(e.target.value)} className={inputClass} data-testid="apply-officer-name" />
            </Field>
            <Field label="Nodal officer official email">
              <input type="email" value={officerEmail} onChange={(e) => setOfficerEmail(e.target.value)} className={inputClass} data-testid="apply-officer-email" />
            </Field>
            <Field label="Nodal officer phone (optional)">
              <input value={officerPhone} onChange={(e) => setOfficerPhone(e.target.value)} className={inputClass} data-testid="apply-officer-phone" />
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <Field label="Supporting documents (PDF/PNG/JPG, max 10MB each)" hint="Gazette notification, ward boundary map, service charter — whichever apply.">
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => onFiles(e.target.files)} disabled={uploading} className={inputClass} data-testid="apply-documents" />
            </Field>
            {uploading && <p className="text-sm text-slate-muted">Uploading…</p>}
            <ul className="space-y-1 text-sm">
              {docs.map((d) => (
                <li key={d.path} className="flex justify-between gap-2 rounded-xl border border-line bg-white/70 px-3 py-2.5">
                  <span className="truncate">{d.name}</span>
                  <button type="button" onClick={() => setDocs(docs.filter((x) => x.path !== d.path))} className="font-semibold text-critical" data-testid={`apply-doc-remove-${d.path}`}>Remove</button>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={affirmed} onChange={(e) => setAffirmed(e.target.checked)} className="mt-1 h-5 w-5 accent-indigo" data-testid="apply-affirm" />
              <span>
                I confirm the details above are accurate and that this
                department will have no login access until an administrator
                reviews, approves and activates the application.
              </span>
            </label>
          </>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-5">
          <Button variant="secondary" disabled={step === 0 || busy} onClick={() => setStep((s) => Math.max(0, s - 1))} data-testid="apply-back">
            ← Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!stepValid() || busy} onClick={() => setStep((s) => s + 1)} data-testid="apply-next">
              Next →
            </Button>
          ) : (
            <Button disabled={busy || !affirmed} onClick={submit} data-testid="apply-submit">
              {busy ? "Submitting…" : "Submit application for review"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
