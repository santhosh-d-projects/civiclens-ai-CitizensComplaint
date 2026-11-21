// Keyword-rule fallback classifier (master prompt §8 step 2).
// Used when the AI model is down, invalid, or times out — and as the
// deterministic base the model output is checked against.
// Categories are the 9 slugs from the DB seed; keywords cover English,
// Kannada (script + transliterated) and Hindi (script + transliterated).
import type { Severity } from "@/lib/database.types";

export interface FallbackResult {
  category: string;
  severity: Severity;
  confidence: number;
  reason: string;
  language: string;
  translated_text: string;
}

const CATEGORY_KEYWORDS: [string, RegExp][] = [
  [
    "roads",
    /pothole|road|footpath|sidewalk|speed\s?breaker|asphalt|tar|curb|pavement|ಗುಂಡಿ|ರಸ್ತೆ|सड़क|gundi|raste|sadak|footpath/i,
  ],
  [
    "water_supply",
    /water|pipe|burst|leak|tap|supply|drinking|bwssb|ನೀರು|ಪೈಪ್|पानी|पाइप|neeru|paip|paani/i,
  ],
  [
    "sewerage",
    /sewer|sewage|drain|manhole|smell|stench|overflow|septic|ಚರಂಡಿ|ಒಳಚರಂಡಿ|सीवर|नाली|charandi|sewer|naali/i,
  ],
  [
    "electricity",
    /electric|streetlight|street\s?light|power|wire|sparking|transformer|pole|light|ವಿದ್ಯುತ್|ಬೀದಿ ದೀಪ|बिजली|बत्ती|vidyut|bijli|current/i,
  ],
  [
    "solid_waste",
    /garbage|waste|trash|dump|bin|dustbin|smell|stray dogs|ಕಸ|ತ್ಯಾಜ್ಯ|कचरा|कूड़ा|kasa|kachra|kooda/i,
  ],
  [
    "drainage_flood",
    /flood|flooding|waterlog|rain|storm|stagnant|blocked drain|ಮಳೆ|ಪ್ರವಾಹ|बाढ़|बारिश|male|baadh|flood/i,
  ],
  [
    "parks_trees",
    /tree|branch|park|fallen|garden|plant|ಮರ|ಗಿಡ|उद्यान|पेड़|mara|ped|park/i,
  ],
  [
    "public_safety",
    /live wire|open manhole|gas smell|collapse|fire|danger|unsafe|accident|manhole|ಅಪಾಯ|खतरा|danger|accident/i,
  ],
];

const CRITICAL_SIGNALS =
  /live wire|sparking|open manhole|gas smell|collapse|fire|burst.*flood|major.*burst|blocking road|tree.*fallen|fallen.*tree|accident/i;
// Note: "school"/"hospital" are NOT high signals on their own — per the
// rubric they raise severity one level (see the escalation step below).
// Listing them here double-counted them (high, then escalated to critical).
const HIGH_SIGNALS =
  /no water|sewage overflow|burst pipe|flooding|blocked main|main road|24\s?h|many people/i;
const LOW_SIGNALS =
  /small litter|overgrown|cosmetic|request for information|minor|small pothole/i;

export function detectLanguage(text: string): string {
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

export function fallbackClassify(description: string): FallbackResult {
  const text = description;
  const language = detectLanguage(text);
  let best: string | null = null;
  let bestScore = 0;
  let bestHits = 0;
  for (const [slug, re] of CATEGORY_KEYWORDS) {
    // Rank by total matched length, not match count: a specific phrase
    // ("open manhole", 12 chars) must beat a generic word ("road", 4 chars)
    // when both appear once — otherwise ties fall to list order and a
    // manhole report is misclassified as "roads".
    const matches = text.match(new RegExp(re.source, re.flags + "g")) ?? [];
    const score = matches.reduce((n, m) => n + m.length, 0);
    if (score > bestScore) {
      bestScore = score;
      bestHits = matches.length;
      best = slug;
    }
  }
  const category = best ?? "other";
  let severity: Severity = "medium";
  let reason = "A civic issue that needs attention.";
  if (CRITICAL_SIGNALS.test(text)) {
    severity = "critical";
    reason = "Immediate danger to life or property — needs same-day action.";
  } else if (HIGH_SIGNALS.test(text)) {
    severity = "high";
    reason = "Major service loss or health risk affecting many people.";
  } else if (LOW_SIGNALS.test(text)) {
    severity = "low";
    reason = "A minor or cosmetic issue — routine queue.";
  } else if (category === "public_safety") {
    severity = "high";
    reason = "A safety hazard — prioritise this week.";
  }
  // Children / hospitals / schools / elderly in danger raise severity one level.
  if (
    /(child|children|school|hospital|elderly|old age)/i.test(text) &&
    severity !== "critical"
  ) {
    severity =
      severity === "low" ? "medium" : severity === "medium" ? "high" : "critical";
    reason += " Children, a school, a hospital or elderly people are involved.";
  }
  return {
    category,
    severity,
    confidence: best ? Math.min(0.45 + bestHits * 0.1, 0.75) : 0.3,
    reason,
    language,
    translated_text: text, // fallback cannot translate; the model does
  };
}

// Ward / area inference from free text (voice complaints, user order
// 2026-11-21 13:34 IST). Canonical names match the DB `wards.name` seed
// values exactly, so the server can map the returned name straight to a
// ward row. English + Kannada script + transliterated spellings.
const WARD_PATTERNS: [string, RegExp][] = [
  ["Bellandur", /bellandur|ಬೆಳ್ಳಂದೂರು|bellanduru/i],
  ["Whitefield", /whitefield|ವೈಟ್‌ಫೀಲ್ಡ್|white\s?field|itpl|kundalahalli/i],
  ["Marathahalli", /marathahalli|ಮರಾಠಹಳ್ಳಿ/i],
  ["Koramangala", /koramangala|ಕೋರಮಂಗಲ/i],
  ["HSR Layout", /\bhsr\b|ಹೆಚ್‌ಎಸ್‌ಆರ್/i],
  ["BTM Layout", /\bbtm\b/i],
  ["Jayanagar", /jayanagar|ಜಯನಗರ/i],
  ["Indiranagar", /indiranagar|ಇಂದಿರಾನಗರ/i],
  ["Malleshwaram", /malleshwaram|ಮಲ್ಲೇಶ್ವರಂ/i],
  ["Rajajinagar", /rajajinagar|ರಾಜಾಜಿನಗರ/i],
  ["Yelahanka", /yelahanka|ಯಲಹಂಕ/i],
  ["Hebbal", /hebbal|ಹೆಬ್ಬಾಳ/i],
];

/** Earliest-mentioned ward name in the text, or null. The first area named
 *  is usually where the issue is ("near HSR, on the way to Koramangala"
 *  picks HSR). */
export function inferWardName(text: string): string | null {
  let best: string | null = null;
  let bestIdx = Infinity;
  for (const [name, re] of WARD_PATTERNS) {
    const m = text.match(new RegExp(re.source, re.flags));
    if (m && m.index !== undefined && m.index < bestIdx) {
      bestIdx = m.index;
      best = name;
    }
  }
  return best;
}
