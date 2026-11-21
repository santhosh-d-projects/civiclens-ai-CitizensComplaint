// Report wizard — 5 steps: describe → photos → ward/location → AI
// analysis (citizen confirms/changes the department) → review → submit.
// Photos upload via signed URLs from POST /api/uploads/sign.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, SeverityBadge, inputClass } from "@/components/ui";
import type { Category, Ward } from "@/lib/database.types";
import type { AnalyzeResult } from "@/lib/ai/analyze";

const MAX_PHOTOS = 5;
const MAX_SIZE = 10 * 1024 * 1024;
// Must match the shared /api/uploads/sign contract (image/png, jpeg, webp).
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Step = 1 | 2 | 3 | 4 | 5;

interface PhotoItem {
  file: File;
  previewUrl: string;
  path?: string;
  uploading: boolean;
  error?: string;
}

const STEPS = [
  "Describe",
  "Photos",
  "Ward & location",
  "AI suggestion",
  "Review & submit",
];

export default function ReportForm({
  wards,
  categories,
}: {
  wards: Ward[];
  categories: Category[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [wardId, setWardId] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Clean up preview URLs on unmount.
  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug.replace(/_/g, " ");

  /* ---------- Step 2: photos ---------- */
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotoError("");
    const incoming = Array.from(files);
    if (photos.length + incoming.length > MAX_PHOTOS) {
      setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const items: PhotoItem[] = [];
    for (const f of incoming) {
      if (!ACCEPTED.includes(f.type)) {
        setPhotoError(`"${f.name}" is not a supported image (JPG, PNG, WebP).`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        setPhotoError(`"${f.name}" is larger than 10 MB.`);
        continue;
      }
      items.push({ file: f, previewUrl: URL.createObjectURL(f), uploading: true });
    }
    if (items.length === 0) return;
    setPhotos((prev) => [...prev, ...items]);
    // Upload each via a signed URL as soon as it is picked. The shared
    // /api/uploads/sign contract takes a client path (server-validated:
    // no "..", no leading "/") and returns {signedUrl, token, path}.
    for (const item of items) {
      const ext = item.file.type === "image/png"
        ? "png"
        : item.file.type === "image/webp"
          ? "webp"
          : "jpg";
      const path = `citizen/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      try {
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: "complaint-photos",
            path,
            contentType: item.file.type,
          }),
        });
        const sign = (await signRes.json()) as
          | { path: string; signedUrl: string; token: string }
          | { error: { message: string } };
        if (!signRes.ok || "error" in sign) {
          throw new Error("error" in sign ? sign.error.message : "Could not prepare upload.");
        }
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("complaint-photos")
          .uploadToSignedUrl(sign.path, sign.token, item.file);
        if (error) throw new Error(error.message);
        setPhotos((prev) =>
          prev.map((p) =>
            p.previewUrl === item.previewUrl
              ? { ...p, path: sign.path, uploading: false }
              : p,
          ),
        );
      } catch (e) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.previewUrl === item.previewUrl
              ? { ...p, uploading: false, error: e instanceof Error ? e.message : "Upload failed." }
              : p,
          ),
        );
      }
    }
  }

  function removePhoto(previewUrl: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.previewUrl === previewUrl);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.previewUrl !== previewUrl);
    });
  }

  /* ---------- Step 3: GPS ---------- */
  function useMyLocation() {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocError("Could not get your location. You can still pick a ward and type an address.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }

  /* ---------- Step 4: AI analysis ---------- */
  async function runAnalysis() {
    if (wardId === "") return;
    setAnalyzing(true);
    setAnalyzeError("");
    setAnalysis(null);
    try {
      const res = await fetch("/api/complaints/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          ward_id: wardId,
          photoUrls: undefined,
        }),
      });
      const data = (await res.json()) as AnalyzeResult | { error: { message: string } };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error.message : "Analysis failed.");
      }
      setAnalysis(data);
      setCategorySlug(data.category);
      setDepartmentId(data.default_department_id ?? "");
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ---------- Step 5: submit ---------- */
  async function submit() {
    if (!analysis || !departmentId || wardId === "") return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const finalTitle =
        title.trim() ||
        description.trim().slice(0, 80).replace(/\s+/g, " ");
      const uploadedPaths = photos
        .filter((p) => p.path && !p.error)
        .map((p) => p.path as string);
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          description: description.trim(),
          language: analysis.language,
          category_slug: categorySlug,
          severity: analysis.severity,
          ai_category_slug: analysis.category,
          ai_severity: analysis.severity,
          ai_confidence: analysis.confidence,
          ai_reason: analysis.reason,
          ai_suggested_department_id:
            analysis.default_department_id ?? undefined,
          department_id: departmentId,
          ward_id: wardId,
          address: address.trim() || undefined,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          photo_paths: uploadedPaths,
        }),
      });
      const data = (await res.json()) as
        | { ticket_no: string; id: string }
        | { error: { code: string; message: string } };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error.message : "Submission failed.");
      }
      // Keep the button busy until the ticket page unmounts this form:
      // clearing it first makes a slow navigation look like a failed submit
      // (smoke test 21 Nov: the ticket WAS created but the page never seemed
      // to confirm it, so a user could submit a duplicate).
      router.push(`/citizen/complaints/${data.id}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  const canNext1 = description.trim().length >= 10;
  const canNext3 = wardId !== "";
  const canSubmit = !!analysis && !!departmentId && !!categorySlug;

  return (
    <div className="rounded-lg border border-line bg-white p-5 sm:p-6">
      {/* Stepper */}
      <ol className="flex flex-wrap gap-2" data-testid="report-stepper">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              step === i + 1
                ? "bg-navy text-white"
                : step > i + 1
                  ? "bg-teal-soft text-teal"
                  : "bg-slate-100 text-slate-muted"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {/* Step 1 — Describe */}
      {step === 1 && (
        <div className="mt-6 space-y-4">
          <Field
            label="Title (optional)"
            hint="A short headline — e.g. “Water pipe burst on 5th Cross”. If left blank we use the first words of your description."
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Short headline for your complaint"
              className={inputClass}
              data-testid="report-title"
            />
          </Field>
          <Field
            label="Describe the issue"
            hint="At least 10 characters. English, Kannada or Hindi — write it the way you would say it."
            error={description && description.trim().length < 10 ? "Please describe the issue in at least 10 characters." : undefined}
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="e.g. A main water pipe has burst near the park gate and the road is flooding…"
              className={`${inputClass} resize-y`}
              data-testid="report-description"
            />
          </Field>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              data-testid="report-next-1"
            >
              Continue to photos
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Photos */}
      {step === 2 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-muted">
            Photos help the department find and fix the issue. Optional — up to{" "}
            {MAX_PHOTOS} images, JPG / PNG / WebP, each up to 10 MB.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void addPhotos(e.target.files);
              e.target.value = "";
            }}
            data-testid="report-photo-input"
          />
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            data-testid="report-add-photos"
          >
            Add photos
          </Button>
          {photoError && <p className="text-sm text-critical">{photoError}</p>}
          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p) => (
                <li
                  key={p.previewUrl}
                  className="relative overflow-hidden rounded-lg border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt="Complaint evidence"
                    className="h-32 w-full object-cover"
                  />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="truncate text-xs text-slate-muted">
                      {p.uploading
                        ? "Uploading…"
                        : p.error
                          ? p.error
                          : "Uploaded"}
                    </span>
                    <button
                      onClick={() => removePhoto(p.previewUrl)}
                      aria-label="Remove photo"
                      data-testid="report-remove-photo"
                      className="min-h-[32px] min-w-[32px] rounded text-sm font-bold text-critical hover:bg-critical-bg"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)} data-testid="report-back-2">
              Back
            </Button>
            <Button onClick={() => setStep(3)} data-testid="report-next-2">
              Continue to location
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Ward & location */}
      {step === 3 && (
        <div className="mt-6 space-y-4">
          <Field label="Ward" hint="Pick the ward where the issue is.">
            <select
              value={wardId}
              onChange={(e) =>
                setWardId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputClass}
              data-testid="report-ward"
            >
              <option value="">Select a ward…</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.zone})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address / landmark (optional)" hint="Street, cross, or a landmark near the issue.">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={500}
              placeholder="e.g. 5th Cross, near the park gate"
              className={inputClass}
              data-testid="report-address"
            />
          </Field>
          <div>
            <Button
              variant="secondary"
              onClick={useMyLocation}
              disabled={locating}
              data-testid="report-gps"
            >
              {locating ? "Getting location…" : "Use my current location"}
            </Button>
            {lat !== null && lng !== null && (
              <p className="mt-1 text-xs text-low">
                Location attached: {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            )}
            {locError && <p className="mt-1 text-xs text-critical">{locError}</p>}
          </div>
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)} data-testid="report-back-3">
              Back
            </Button>
            <Button
              onClick={() => {
                setStep(4);
                void runAnalysis();
              }}
              disabled={!canNext3}
              data-testid="report-next-3"
            >
              Analyse my complaint
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — AI suggestion */}
      {step === 4 && (
        <div className="mt-6 space-y-4">
          {analyzing && (
            <p className="text-sm text-slate-muted" data-testid="report-analyzing">
              Analysing your complaint…
            </p>
          )}
          {analyzeError && (
            <div>
              <p className="text-sm text-critical">{analyzeError}</p>
              <Button
                variant="secondary"
                onClick={() => void runAnalysis()}
                data-testid="report-retry-analysis"
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          )}
          {analysis && (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-canvas p-4">
                <p className="text-xs font-medium tracking-wide text-slate-muted uppercase">
                  AI suggestion — you confirm
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {categoryName(analysis.category)}
                  </span>
                  <SeverityBadge severity={analysis.severity} />
                  <span className="text-xs text-slate-muted">
                    Confidence {Math.round(analysis.confidence * 100)}%
                    {analysis.source === "fallback" ? " (rule-based check — AI was unavailable)" : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm">{analysis.reason}</p>
                {analysis.language !== "en" && analysis.translated_text && (
                  <p className="mt-2 text-sm text-slate-muted">
                    Detected language: {analysis.language}. English version:{" "}
                    {analysis.translated_text}
                  </p>
                )}
              </div>

              <Field label="Category" hint="Change it if the AI got the type of issue wrong.">
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className={inputClass}
                  data-testid="report-category"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              {analysis.departments.length === 0 ? (
                <p className="rounded-lg border border-high/30 bg-high-bg p-4 text-sm text-high">
                  No active department currently covers this ward for this
                  category. Please go back and check the ward, or try a
                  different description.
                </p>
              ) : (
                <fieldset>
                  <legend className="text-xs font-medium tracking-wide text-slate-muted uppercase">
                    Suggested department — pick one
                  </legend>
                  {analysis.default_department_id === null && (
                    <p className="mt-1 text-xs text-slate-muted">
                      The AI was not confident enough to pick a default — please
                      choose the department you think should handle this.
                    </p>
                  )}
                  <div className="mt-2 space-y-2">
                    {analysis.departments.map((d) => (
                      <label
                        key={d.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          departmentId === d.id
                            ? "border-teal bg-teal-soft"
                            : "border-line bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="department"
                          value={d.id}
                          checked={departmentId === d.id}
                          onChange={() => setDepartmentId(d.id)}
                          className="mt-1"
                          data-testid={`report-dept-${d.id}`}
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {d.name}
                            {analysis.default_department_id === d.id && (
                              <span className="ml-2 rounded-full bg-teal px-2 py-0.5 text-xs font-semibold text-white">
                                Suggested by AI
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-slate-muted">
                            {d.reason} · {Math.round(d.confidence * 100)}% match
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)} data-testid="report-back-4">
              Back
            </Button>
            <Button
              onClick={() => setStep(5)}
              disabled={!analysis || !canSubmit}
              data-testid="report-next-4"
            >
              Review & submit
            </Button>
          </div>
        </div>
      )}

      {/* Step 5 — Review */}
      {step === 5 && analysis && (
        <div className="mt-6 space-y-4">
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Title</dt>
              <dd className="font-semibold">
                {title.trim() || description.trim().slice(0, 80)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Description</dt>
              <dd className="whitespace-pre-wrap">{description.trim()}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Ward</dt>
              <dd>{wards.find((w) => w.id === wardId)?.name ?? "—"}</dd>
            </div>
            {address && (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-slate-muted">Address</dt>
                <dd>{address}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Category</dt>
              <dd>{categoryName(categorySlug)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Severity</dt>
              <dd>
                <SeverityBadge severity={analysis.severity} />
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Department</dt>
              <dd>
                {analysis.departments.find((d) => d.id === departmentId)?.name ?? "—"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-muted">Photos</dt>
              <dd>
                {photos.filter((p) => p.path && !p.error).length} uploaded
                {photos.some((p) => p.error) ? " (some failed — they will be skipped)" : ""}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-muted">
            By submitting, you confirm this report is about a real issue in the
            ward above. The department you picked will receive it.
          </p>
          {submitError && <p className="text-sm text-critical">{submitError}</p>}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(4)} data-testid="report-back-5">
              Back
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={submitting || !canSubmit}
              data-testid="report-submit"
            >
              {submitting ? "Submitting…" : "Confirm department & submit complaint"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
