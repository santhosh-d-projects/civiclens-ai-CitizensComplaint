// Report wizard — 5 steps: describe → photos → ward/location → AI
// analysis (citizen confirms/changes the department) → review → submit.
// Photos upload via signed URLs from POST /api/uploads/sign.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, GlassCard, SeverityBadge, inputClass } from "@/components/ui";
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

// Minimal Web Speech API types (not in this project's TS DOM lib).
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const VOICE_LANGS = [
  { code: "en-IN", label: "English" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
  { code: "hi-IN", label: "हिन्दी" },
] as const;

/** Voice complaint input (user order 2026-11-21 13:28 IST).
 *  Speak the complaint → the browser transcribes it into the description
 *  field → the existing AI analysis (step 4) classifies it and fills the
 *  category/severity/department. This uses the browser's built-in speech
 *  recognition (Chrome, mic permission, internet) because a hosted ASR
 *  service cannot be built and deployed inside the event window — see
 *  docs/DECISIONS.md. On browsers without it the mic button is hidden. */
function VoiceInput({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState<string>("en-IN");
  const [error, setError] = useState("");
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef("");

  function start() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    setError("");
    setInterim("");
    finalRef.current = "";
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      // resultIndex = first changed result; earlier results were already
      // consumed, so only process from there to avoid duplicating text.
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      setListening(false);
      setError(
        e.error === "not-allowed"
          ? "Microphone access was blocked. Allow the microphone and try again."
          : e.error === "no-speech"
            ? "No speech was heard. Try again, a little closer to the microphone."
            : "Voice input could not start in this browser. You can type the complaint instead.",
      );
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) onTranscript(text);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Voice input could not start in this browser.");
    }
  }

  function stop() {
    recRef.current?.stop();
  }

  // Stop listening if the component unmounts mid-dictation.
  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  if (!supported) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Voice language"
          className={`${inputClass} w-auto py-2 text-sm`}
          data-testid="report-voice-lang"
        >
          {VOICE_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        {!listening ? (
          <Button
            type="button"
            variant="secondary"
            onClick={start}
            data-testid="report-voice-start"
          >
            🎙 Speak your complaint
          </Button>
        ) : (
          <Button
            type="button"
            variant="danger"
            onClick={stop}
            data-testid="report-voice-stop"
          >
            ■ Stop listening
          </Button>
        )}
        {listening && (
          <p className="text-sm font-semibold text-low" data-testid="report-voice-status" role="status">
            Listening… speak now{interim ? ` — “${interim}”` : ""}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
          {error}
        </p>
      )}
      <p className="text-xs leading-5 text-slate-faint">
        Your speech is transcribed into the description below — then the AI
        reads it and suggests the category, severity and department. Works in
        Chrome with microphone access.
      </p>
    </div>
  );
}

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
  // Set when the server refuses an exact duplicate: the citizen is shown
  // the existing complaint instead of getting a second ticket number.
  const [duplicate, setDuplicate] = useState<{
    message: string;
    existing_ticket_no?: string;
    existing_complaint_id?: string;
  } | null>(null);
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
    setDuplicate(null);
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
        | {
            error: {
              code: string;
              message: string;
              existing_ticket_no?: string;
              existing_complaint_id?: string;
            };
          };
      if (!res.ok || "error" in data) {
        // Exact duplicate: no new ticket is created. Show the existing
        // complaint instead of a generic failure so the citizen can track
        // the one already filed.
        if ("error" in data && data.error.code === "DUPLICATE_COMPLAINT") {
          setDuplicate({
            message: data.error.message,
            existing_ticket_no: data.error.existing_ticket_no,
            existing_complaint_id: data.error.existing_complaint_id,
          });
          setSubmitting(false);
          return;
        }
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
    <GlassCard className="p-5 sm:p-8">
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2" data-testid="report-stepper">
        {STEPS.map((label, i) => {
          const done = step > i + 1;
          const current = step === i + 1;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-semibold transition-all ${
                  current
                    ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)]"
                    : done
                      ? "bg-teal-soft text-teal"
                      : "glass text-slate-muted"
                }`}
                aria-current={current ? "step" : undefined}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    current
                      ? "bg-white/25 text-white"
                      : done
                        ? "bg-teal text-white"
                        : "bg-slate-200 text-slate-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="hidden h-px w-3 bg-line sm:block" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step 1 — Describe */}
      {step === 1 && (
        <div className="mt-7 space-y-5">
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
            hint="At least 10 characters. English, Kannada or Hindi — write it the way you would say it, or speak it and we will type it for you."
            error={description && description.trim().length < 10 ? "Please describe the issue in at least 10 characters." : undefined}
          >
            <VoiceInput
              onTranscript={(text) =>
                setDescription((prev) =>
                  prev.trim() ? `${prev.trim()} ${text}` : text,
                )
              }
            />
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
        <div className="mt-7 space-y-5">
          <p className="text-sm leading-6 text-slate-muted">
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
          {photoError && (
            <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
              {photoError}
            </p>
          )}
          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p) => (
                <li
                  key={p.previewUrl}
                  className="glass relative overflow-hidden rounded-2xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt="Complaint evidence"
                    className="h-32 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                    <span className={`truncate text-xs ${p.error ? "font-medium text-critical" : "text-slate-muted"}`}>
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
                      className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-base font-bold text-critical hover:bg-critical-bg"
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
        <div className="mt-7 space-y-5">
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
              <p className="mt-2 inline-flex rounded-full bg-low-bg px-3 py-1.5 text-xs font-semibold text-low">
                Location attached: {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            )}
            {locError && (
              <p className="mt-2 rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
                {locError}
              </p>
            )}
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
        <div className="mt-7 space-y-5">
          {analyzing && (
            <div className="glass rounded-2xl p-5" data-testid="report-analyzing">
              <div className="h-4 w-2/3 animate-pulse rounded bg-indigo/10" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-indigo/10" />
              <p className="mt-3 text-sm text-slate-muted">Analysing your complaint…</p>
            </div>
          )}
          {analyzeError && (
            <div>
              <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
                {analyzeError}
              </p>
              <Button
                variant="secondary"
                onClick={() => void runAnalysis()}
                data-testid="report-retry-analysis"
                className="mt-3"
              >
                Try again
              </Button>
            </div>
          )}
          {analysis && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-indigo/20 bg-gradient-to-br from-indigo/[0.06] via-violet/[0.05] to-teal/[0.05] p-4 sm:p-5">
                <p className="text-xs font-bold tracking-[0.14em] text-indigo uppercase">
                  AI suggestion — you confirm
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-navy-ink">
                    {categoryName(analysis.category)}
                  </span>
                  <SeverityBadge severity={analysis.severity} />
                  <span className="text-xs font-medium text-slate-muted">
                    Confidence {Math.round(analysis.confidence * 100)}%
                    {analysis.source === "fallback" ? " (rule-based check — AI was unavailable)" : ""}
                  </span>
                </div>
                <p className="mt-2.5 text-sm leading-6 text-navy-ink">{analysis.reason}</p>
                {analysis.language !== "en" && analysis.translated_text && (
                  <p className="mt-2.5 rounded-xl bg-white/70 px-3 py-2 text-sm leading-6 text-slate-muted">
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
                <p className="rounded-2xl border border-high/30 bg-high-bg p-4 text-sm leading-6 text-high">
                  No active department currently covers this ward for this
                  category. Please go back and check the ward, or try a
                  different description.
                </p>
              ) : (
                <fieldset>
                  <legend className="text-xs font-semibold tracking-[0.14em] text-slate-muted uppercase">
                    Suggested department — pick one
                  </legend>
                  {analysis.default_department_id === null && (
                    <p className="mt-1.5 text-xs leading-5 text-slate-muted">
                      The AI was not confident enough to pick a default — please
                      choose the department you think should handle this.
                    </p>
                  )}
                  <div className="mt-3 space-y-2.5">
                    {analysis.departments.map((d) => (
                      <label
                        key={d.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                          departmentId === d.id
                            ? "border-indigo bg-indigo/[0.05] ring-2 ring-indigo/30"
                            : "glass hover:bg-white/90"
                        }`}
                      >
                        <input
                          type="radio"
                          name="department"
                          value={d.id}
                          checked={departmentId === d.id}
                          onChange={() => setDepartmentId(d.id)}
                          className="mt-1 accent-indigo"
                          data-testid={`report-dept-${d.id}`}
                        />
                        <span>
                          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-ink">
                            {d.name}
                            {analysis.default_department_id === d.id && (
                              <span className="rounded-full bg-gradient-to-r from-indigo to-violet px-2 py-0.5 text-[11px] font-bold text-white">
                                Suggested by AI
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-muted">
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
        <div className="mt-7 space-y-5">
          <GlassCard className="p-1 sm:p-2">
            <dl className="divide-y divide-line">
              {[
                { label: "Title", value: title.trim() || description.trim().slice(0, 80) },
                { label: "Description", value: description.trim(), pre: true },
                { label: "Ward", value: wards.find((w) => w.id === wardId)?.name ?? "—" },
                ...(address
                  ? [{ label: "Address", value: address }]
                  : []),
                { label: "Category", value: categoryName(categorySlug) },
                { label: "Department", value: analysis.departments.find((d) => d.id === departmentId)?.name ?? "—" },
                {
                  label: "Photos",
                  value: `${photos.filter((p) => p.path && !p.error).length} uploaded${photos.some((p) => p.error) ? " (some failed — they will be skipped)" : ""}`,
                },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-3">
                  <dt className="w-28 shrink-0 text-xs font-semibold tracking-wide text-slate-muted uppercase sm:pt-0.5">
                    {row.label}
                  </dt>
                  <dd className={`text-sm leading-6 text-navy-ink ${row.pre ? "whitespace-pre-wrap" : ""}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-3">
                <dt className="w-28 shrink-0 text-xs font-semibold tracking-wide text-slate-muted uppercase sm:pt-0.5">
                  Severity
                </dt>
                <dd>
                  <SeverityBadge severity={analysis.severity} />
                </dd>
              </div>
            </dl>
          </GlassCard>
          <p className="text-xs leading-5 text-slate-muted">
            By submitting, you confirm this report is about a real issue in the
            ward above. The department you picked will receive it.
          </p>
          {duplicate && (
            <div
              role="alert"
              className="rounded-2xl border border-high/30 bg-high-bg p-4"
              data-testid="report-duplicate-error"
            >
              <p className="text-sm font-bold text-high">
                This looks like a complaint you already reported.
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-muted">{duplicate.message}</p>
              {duplicate.existing_complaint_id && (
                <Link
                  href={`/citizen/complaints/${duplicate.existing_complaint_id}`}
                  data-testid="report-duplicate-link"
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-white/90 px-4 text-sm font-semibold text-indigo shadow-sm hover:text-violet"
                >
                  View {duplicate.existing_ticket_no ?? "the existing complaint"} →
                </Link>
              )}
            </div>
          )}
          {submitError && (
            <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-sm font-medium text-critical">
              {submitError}
            </p>
          )}
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
    </GlassCard>
  );
}
