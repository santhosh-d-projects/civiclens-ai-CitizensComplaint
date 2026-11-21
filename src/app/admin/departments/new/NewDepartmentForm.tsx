// Admin creates a department — 5-step form (master prompt §4).
// Created departments stay inactive until approved AND activated by an
// administrator, exactly like online applications.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, randomPath, validateFile } from "@/lib/uploads";

type Ward = { id: number; name: string; zone: string };
type Category = { id: number; slug: string; name: string };

const STEPS = [
  "Department information",
  "Service area",
  "Official contact",
  "First officer",
  "Documents",
];

export default function NewDepartmentForm() {
  const router = useRouter();
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("wards")
      .select("id,name,zone")
      .order("name")
      .then(({ data }) => setWards(data ?? []));
    supabase
      .from("categories")
      .select("id,slug,name")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));
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
          randomPath("admin-created", file.name),
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
    if (step === 2) return email.includes("@");
    if (step === 3) return officerName.trim().length >= 2 && officerEmail.includes("@");
    return affirmed;
  }

  async function submit(submitForReview: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        official_email: email.trim(),
        official_phone: phone.trim() || undefined,
        applicant_name: applicant.trim() || undefined,
        ward_ids: wardIds,
        category_ids: categoryIds,
        officer: {
          name: officerName.trim(),
          email: officerEmail.trim(),
          phone: officerPhone.trim() || undefined,
        },
        documents: docs,
        submit: submitForReview,
      }),
    });
    const body = (await res.json()) as { error?: { message: string } };
    setBusy(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not create the department.");
      return;
    }
    router.push("/admin/departments");
    router.refresh();
  }

  return (
    <div>
      <ol className="flex flex-wrap gap-2" aria-label="Form steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${
              i === step
                ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)]"
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
        <p className="mt-4 rounded-2xl border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {step === 0 && (
          <>
            <Field label="Department name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Bellandur Water & Sewerage Division" data-testid="new-dept-name" />
            </Field>
            <Field label="Description" hint="What does this department do? (max 500 characters)">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} className={inputClass} data-testid="new-dept-description" />
            </Field>
            <fieldset>
              <legend className="text-xs font-medium tracking-wide text-slate-muted uppercase">Categories served</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(categoryIds, c.id, setCategoryIds)}
                    data-testid={`new-dept-category-${c.slug}`}
                    className={`min-h-[44px] rounded-full border px-3 text-sm font-semibold transition-all ${categoryIds.includes(c.id) ? "border-transparent bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)]" : "glass text-navy-ink hover:bg-white/90"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {step === 1 && (
          <fieldset>
            <legend className="text-xs font-medium tracking-wide text-slate-muted uppercase">Wards covered</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {wards.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggle(wardIds, w.id, setWardIds)}
                  data-testid={`new-dept-ward-${w.id}`}
                  className={`min-h-[44px] rounded-full border px-3 text-sm font-semibold transition-all ${wardIds.includes(w.id) ? "border-transparent bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)]" : "glass text-navy-ink hover:bg-white/90"}`}
                >
                  {w.name} <span className="text-xs text-slate-muted">· {w.zone}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {step === 2 && (
          <>
            <Field label="Official email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="department@example.gov.in" data-testid="new-dept-email" autoComplete="email" />
            </Field>
            <Field label="Official phone (optional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} data-testid="new-dept-phone" autoComplete="tel" />
            </Field>
            <Field label="Applicant / contact person (optional)">
              <input value={applicant} onChange={(e) => setApplicant(e.target.value)} className={inputClass} data-testid="new-dept-applicant" />
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <p className="text-sm text-slate-muted">
              The first nodal officer. They receive an invite link when the
              department is activated — no password is set here.
            </p>
            <Field label="Officer name">
              <input value={officerName} onChange={(e) => setOfficerName(e.target.value)} className={inputClass} data-testid="new-dept-officer-name" />
            </Field>
            <Field label="Officer official email">
              <input type="email" value={officerEmail} onChange={(e) => setOfficerEmail(e.target.value)} className={inputClass} data-testid="new-dept-officer-email" />
            </Field>
            <Field label="Officer phone (optional)">
              <input value={officerPhone} onChange={(e) => setOfficerPhone(e.target.value)} className={inputClass} data-testid="new-dept-officer-phone" />
            </Field>
          </>
        )}
        {step === 4 && (
          <>
            <Field label="Supporting documents (PDF/PNG/JPG, max 10MB each)" hint="Upload at least one document — all must be verified before activation.">
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => onFiles(e.target.files)}
                disabled={uploading}
                className={inputClass}
                data-testid="new-dept-documents"
              />
            </Field>
            {uploading && <p className="text-sm text-slate-muted">Uploading…</p>}
            <ul className="space-y-1 text-sm">
              {docs.map((d) => (
                <li key={d.path} className="flex justify-between gap-2 rounded-xl border border-line bg-white/70 px-3 py-2.5">
                  <span className="truncate">{d.name}</span>
                  <button
                    type="button"
                    onClick={() => setDocs(docs.filter((x) => x.path !== d.path))}
                    className="font-semibold text-critical"
                    data-testid={`new-dept-doc-remove-${d.path}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={affirmed}
                onChange={(e) => setAffirmed(e.target.checked)}
                className="mt-1 h-5 w-5 accent-indigo"
                data-testid="new-dept-affirm"
              />
              <span>
                I confirm the details above are accurate. This department will
                remain inactive until it is reviewed, approved and activated by
                an administrator.
              </span>
            </label>
          </>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-5">
          <Button
            variant="secondary"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            data-testid="new-dept-back"
          >
            ← Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              disabled={!stepValid() || busy}
              onClick={() => setStep((s) => s + 1)}
              data-testid="new-dept-next"
            >
              Next →
            </Button>
          ) : (
            <span className="flex gap-2">
              <Button
                variant="secondary"
                disabled={busy || !affirmed}
                onClick={() => submit(false)}
                data-testid="new-dept-save-draft"
              >
                Save draft
              </Button>
              <Button
                disabled={busy || !affirmed}
                onClick={() => submit(true)}
                data-testid="new-dept-submit"
              >
                {busy ? "Creating…" : "Submit for review"}
              </Button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
