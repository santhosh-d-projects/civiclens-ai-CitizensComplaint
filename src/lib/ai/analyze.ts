// AI complaint analysis (master prompt §8).
// Model first (Gemini via AI_PROVIDER=gemini / AI_MODEL, temperature 0,
// JSON-only output validated by zod). On any failure or 8s timeout, fall
// back to the keyword classifier and mark source:"fallback", confidence low.
// The model ranks ONLY the candidate departments the server supplies
// (active departments covering the ward + predicted category); the server
// rejects any department id not in that list.
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fallbackClassify, inferWardName } from "@/lib/ai/fallback";
import type { Severity } from "@/lib/database.types";

export const AnalyzeInput = z.object({
  description: z.string().min(10).max(5000),
  // Optional: voice complaints arrive without a ward — the AI infers the
  // area from the spoken text (model `area` field, then keyword match).
  ward_id: z.number().int().positive().optional(),
  language: z.string().optional(),
  photoUrls: z.array(z.string().url()).max(5).optional(),
});

const ModelOutput = z.object({
  language: z.string(),
  translated_text: z.string(),
  // Area / locality / ward name mentioned in the complaint, or null.
  area: z.string().nullable(),
  category: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  ranked_departments: z.array(
    z.object({
      id: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
});

export interface DepartmentCandidate {
  id: string;
  name: string;
  confidence: number;
  reason: string;
}

export interface AnalyzeResult {
  category: string;
  severity: Severity;
  confidence: number;
  reason: string;
  language: string;
  translated_text: string;
  // Ward the AI inferred from the text (voice flow) or the ward the caller
  // supplied. Null when no area could be detected — the UI then asks the
  // citizen to pick the ward before a department can be suggested.
  ward_id: number | null;
  ward_name: string | null;
  departments: DepartmentCandidate[];
  default_department_id: string | null;
  source: "model" | "fallback";
}

const SYSTEM_PROMPT = `You are a civic complaint triage assistant for a city municipal platform.
Given a citizen complaint (any language), return ONLY JSON:
{"language":"en|hi|kn|...","translated_text":"English translation or same text",
 "area":"<locality or ward name mentioned in the complaint, or null>",
 "category":"<one of: roads, water_supply, sewerage, electricity, solid_waste, drainage_flood, parks_trees, public_safety, other>",
 "severity":"low|medium|high|critical",
 "confidence":0.0-1.0,
 "reason":"one short sentence a citizen can understand",
 "ranked_departments":[{"id":"<id from the provided candidates>","confidence":0.0-1.0,"reason":"short"}]}
Severity rubric:
- critical: immediate danger to life/property (live electric wires, open manhole on a road, major pipe burst flooding roads, gas smell, building/tree collapse blocking road, fire).
- high: major service loss or health risk affecting many people (no water for 24h+, sewage overflow, streetlight outage on a main road, large flooding, blocked main drain).
- medium: significant nuisance with limited risk (potholes, irregular garbage pickup, minor leaks, single streetlight out).
- low: minor or cosmetic issues (overgrown plants, small litter, request for information).
Raise severity one level if children, hospitals, schools or elderly people are mentioned in danger. Use only the candidate department ids given. If unsure, lower confidence; never invent ids.`;

async function callGemini(
  description: string,
  candidates: { id: string; name: string }[],
): Promise<z.infer<typeof ModelOutput> | null> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-3.5-flash-lite";
  if (!key) return null;
  const body = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nCandidates (use only these ids):\n${candidates.map((c) => `- ${c.id}: ${c.name}`).join("\n")}\n\nComplaint: ${description}`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return ModelOutput.parse(JSON.parse(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeComplaint(
  input: z.infer<typeof AnalyzeInput>,
  userId: string | null,
): Promise<AnalyzeResult> {
  const started = Date.now();
  const admin = createAdminClient();

  // All wards (for area → ward mapping) and all active departments (the
  // model ranks them; the server filters the ranking to the resolved ward
  // afterwards, so a model suggestion outside the ward is discarded).
  const { data: wardRows } = await admin.from("wards").select("id,name");
  const { data: allActive } = await admin
    .from("departments")
    .select("id,name,status")
    .eq("status", "active");

  // 1) Category + severity: model first, fallback on failure.
  const fb = fallbackClassify(input.description);
  const model = await callGemini(input.description, (allActive ?? []).map((d) => ({ id: d.id, name: d.name })));
  const useModel = model !== null;
  const category = useModel ? model.category : fb.category;
  const severity: Severity = useModel ? model.severity : fb.severity;
  const confidence = useModel ? model.confidence : fb.confidence;
  const reason = useModel ? model.reason : fb.reason;
  const language = useModel ? model.language : fb.language;
  const translated = useModel ? model.translated_text : fb.translated_text;

  // 1b) Resolve the ward: caller-supplied id wins; otherwise the model's
  // `area`, then the keyword matcher. No area detected → ward stays null
  // and no department can be suggested yet (the UI asks for the ward).
  const matchWardByName = (name: string | null) => {
    if (!name) return null;
    const needle = name.trim().toLowerCase();
    return (
      (wardRows ?? []).find(
        (w) =>
          w.name.toLowerCase() === needle ||
          w.name.toLowerCase().includes(needle) ||
          needle.includes(w.name.toLowerCase()),
      ) ?? null
    );
  };
  const resolvedWard =
    input.ward_id !== undefined
      ? ((wardRows ?? []).find((w) => w.id === input.ward_id) ?? null)
      : (matchWardByName(useModel ? model.area : null) ??
        matchWardByName(inferWardName(input.description)));
  const resolvedWardId = resolvedWard?.id ?? null;
  const resolvedWardName = resolvedWard?.name ?? null;

  // Candidate departments: active + cover the resolved ward.
  let activeDepts: { id: string; name: string; status: string }[] = [];
  if (resolvedWardId !== null) {
    const { data: deptWards } = await admin
      .from("department_wards")
      .select("department_id")
      .eq("ward_id", resolvedWardId);
    const wardDeptIds = (deptWards ?? []).map((d) => d.department_id);
    activeDepts = (allActive ?? []).filter((d) => wardDeptIds.includes(d.id));
  }

  // 2) Candidates for the predicted category.
  const { data: catRow } = await admin
    .from("categories")
    .select("id")
    .eq("slug", category)
    .single();
  let candidates: DepartmentCandidate[] = [];
  if (catRow && activeDepts) {
    const { data: deptCats } = await admin
      .from("department_categories")
      .select("department_id")
      .eq("category_id", catRow.id);
    const catDeptIds = new Set((deptCats ?? []).map((d) => d.department_id));
    const ranked = useModel ? model.ranked_departments : [];
    const byId = new Map(ranked.map((r) => [r.id, r]));
    candidates = activeDepts
      .filter((d) => catDeptIds.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        confidence: byId.get(d.id)?.confidence ?? (useModel ? 0.5 : fb.confidence),
        reason: byId.get(d.id)?.reason ?? `Handles ${category} in this ward.`,
      }))
      .filter((c) => byId.has(c.id) || !useModel)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  // 3) Default department only when confident and candidates exist.
  const top = candidates[0];
  const default_department_id =
    top && top.confidence >= 0.5 ? top.id : null;

  // 4) Log metadata (no personal data) for accuracy review.
  try {
    await admin.from("ai_analysis_log").insert({
      user_id: userId,
      provider: process.env.AI_PROVIDER || "gemini",
      model: useModel ? process.env.AI_MODEL || "gemini-3.5-flash-lite" : "fallback",
      language,
      ward_id: resolvedWardId,
      category_slug: category,
      severity,
      confidence,
      source: useModel ? "model" : "fallback",
      latency_ms: Date.now() - started,
    });
  } catch {
    // Logging must never break the analysis response.
  }

  return {
    category,
    severity,
    confidence,
    reason,
    language,
    translated_text: translated,
    ward_id: resolvedWardId,
    ward_name: resolvedWardName,
    departments: candidates,
    default_department_id,
    source: useModel ? "model" : "fallback",
  };
}
