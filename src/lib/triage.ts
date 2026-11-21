// CivicLens triage engine — deterministic NLP pipeline.
// Classifies an unstructured complaint (English, Kannada, Hindi, or
// Roman-transliterated Kannada/Hindi) into a category, a severity with a
// one-line reason, and the responsible department.
//
// Design: keyword + signal scoring, no runtime LLM dependency. The
// generative-AI tooling for this build is Jarvis/Muse (prompt log in
// PROMPT_LOG.md). Every decision below is explainable: the matched signals
// are returned with the result and shown in the UI.

export type Category =
  | "roads"
  | "waste"
  | "water"
  | "electricity"
  | "trees"
  | "drainage"
  | "other";

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Status = "Open" | "In Progress" | "Resolved";

export interface TriageResult {
  category: Category;
  severity: Severity;
  reason: string;
  department: string;
  signals: string[];
  language: "English" | "Kannada" | "Hindi" | "Mixed";
}

export const CATEGORY_LABELS: Record<Category, string> = {
  roads: "Roads",
  waste: "Waste & Garbage",
  water: "Water Supply",
  electricity: "Electricity",
  trees: "Trees & Greenery",
  drainage: "Drainage & Sewage",
  other: "General",
};

export const DEPARTMENT_MAP: Record<Category, string> = {
  roads: "BBMP — Roads & Infrastructure",
  waste: "BBMP — Solid Waste Management",
  water: "BWSSB — Water Supply",
  electricity: "BESCOM — Street Lighting & Power",
  trees: "BBMP — Forest & Horticulture",
  drainage: "BWSSB — Underground Drainage",
  other: "BBMP — Citizen Helpline",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

// Keyword signals per category. Each entry: [keyword, weight].
// Covers English, Kannada script, Hindi script, and Roman transliteration.
const CATEGORY_KEYWORDS: Record<Exclude<Category, "other">, [string, number][]> = {
  roads: [
    ["pothole", 5], ["potholes", 5], ["crater", 5], ["road", 3], ["roads", 3],
    ["street", 2], ["asphalt", 4], ["tar road", 4], ["footpath", 4],
    ["pavement", 4], ["sidewalk", 3], ["speed breaker", 3], ["divider", 2],
    ["manhole", 3], ["bump", 2], ["crack", 2], ["damaged road", 5],
    ["ರಸ್ತೆ", 5], ["ಗುಂಡಿ", 5], ["ಸड़क", 5], ["गड्ढा", 5],
    ["raste", 4], ["rasta", 4], ["gundi", 5], ["sadak", 4], ["gaddha", 4],
  ],
  waste: [
    ["garbage", 5], ["waste", 4], ["trash", 4], ["dump", 4], ["dumping", 4],
    ["bin", 3], ["overflowing", 4], ["litter", 3], ["smell", 2], ["stink", 3],
    ["rotting", 3], ["uncollected", 4], ["heap", 2], ["debris", 2],
    ["ಕಸ", 5], ["कचरा", 5], ["कूड़ा", 5],
    ["kasa", 4], ["kasa", 4], ["kachra", 5], ["kooda", 4], ["kude", 4],
  ],
  water: [
    ["water leak", 5], ["leak", 3], ["burst pipe", 5], ["pipeline", 4],
    ["no water", 5], ["water supply", 4], ["contaminat", 5], ["dirty water", 5],
    ["tap", 2], ["drinking water", 4], ["borewell", 3], ["waterlogging", 2],
    ["ನೀರು", 5], ["पानी", 5],
    ["neeru", 4], ["neer", 4], ["paani", 5], ["pani", 4],
  ],
  electricity: [
    ["streetlight", 5], ["street light", 5], ["power cut", 4], ["sparking", 5],
    ["live wire", 5], ["wire", 3], ["electric", 3], ["pole", 2],
    ["transformer", 4], ["no light", 4], ["dark street", 4], ["outage", 3],
    ["ವಿದ್ಯುತ್", 5], ["ಬೀದಿ ದೀಪ", 5], ["बिजली", 5],
    ["vidyut", 4], ["bijli", 5], ["current", 2], ["light", 2],
  ],
  trees: [
    ["fallen tree", 6], ["tree fallen", 6], ["tree", 3], ["branch", 3],
    ["uprooted", 5], ["leaning tree", 4], ["dry tree", 2],
    ["ಮರ", 5], ["पेड़", 5],
    ["mara", 4], ["ped", 4], ["tree", 3],
  ],
  drainage: [
    ["drain", 4], ["drainage", 5], ["sewage", 5], ["sewer", 5],
    ["blocked drain", 5], ["overflow", 4], ["flooding", 4], ["stagnant", 4],
    ["waterlog", 4], ["foul smell", 3], ["mosquito", 2],
    ["ಚರಂಡಿ", 5], ["नाली", 5], ["गटर", 4],
    ["charandi", 4], ["naali", 4], ["gutter", 4], ["nala", 3],
  ],
};

// Severity signals: [keyword, points, label for the reason line]
const SEVERITY_SIGNALS: [string, number, string][] = [
  ["sparking", 4, "sparking wire"],
  ["live wire", 4, "exposed live wire"],
  ["burst", 4, "burst pipe"],
  ["blocking the road", 4, "blocking the road"],
  ["blocked the road", 4, "blocking the road"],
  ["blocking road", 4, "blocking the road"],
  ["no water", 3, "no water supply"],
  ["sewage", 3, "sewage overflow"],
  ["flooding", 3, "flooding"],
  ["school", 2, "near a school"],
  ["hospital", 2, "near a hospital"],
  ["children", 2, "children at risk"],
  ["main road", 2, "on a main road"],
  ["highway", 2, "on a highway"],
  ["days", 1, "reported for days"],
  ["week", 1, "pending for a week"],
  ["weeks", 2, "pending for weeks"],
  ["month", 2, "pending for a month"],
  ["accident", 3, "accident risk"],
  ["injured", 3, "someone was injured"],
  ["fallen tree", 4, "fallen tree"],
  ["uprooted", 3, "uprooted tree"],
  ["large", 1, "large in size"],
  ["deep", 1, "deep"],
  ["huge", 1, "very large"],
  ["smell", 1, "bad smell"],
  ["mosquito", 1, "mosquito breeding risk"],
  ["elderly", 1, "elderly residents affected"],
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?;:()"'/\\]/g, " ").replace(/\s+/g, " ").trim();
}

function detectLanguage(text: string): TriageResult["language"] {
  const hasKannada = /[\u0C80-\u0CFF]/.test(text);
  const hasHindi = /[\u0900-\u097F]/.test(text);
  if (hasKannada && hasHindi) return "Mixed";
  if (hasKannada) return "Kannada";
  if (hasHindi) return "Hindi";
  return "English";
}

export function triageComplaint(rawText: string): TriageResult {
  const text = normalize(rawText);
  const language = detectLanguage(rawText);

  // 1. Category scoring
  const { category: bestCategory, hits: categoryHits } = pickCategory(text);

  // 2. Severity scoring
  let points = 0;
  const signals: string[] = [];
  for (const [kw, pts, label] of SEVERITY_SIGNALS) {
    if (text.includes(kw)) {
      points += pts;
      if (!signals.includes(label)) signals.push(label);
    }
  }
  // Category baseline: some categories start hotter
  if (bestCategory === "electricity" && text.includes("spark")) points += 2;
  if (bestCategory === "trees" && /block|road|fall/.test(text)) points += 2;

  let severity: Severity;
  if (points >= 6) severity = "Critical";
  else if (points >= 3) severity = "High";
  else if (points >= 1) severity = "Medium";
  else severity = "Low";

  // A vague report with no category match stays Low and goes to the helpline.
  if (bestCategory === "other") severity = "Low";

  // 3. One-line reason
  const reason = buildReason(bestCategory, severity, signals, categoryHits[bestCategory] ?? []);

  return {
    category: bestCategory,
    severity,
    reason,
    department: DEPARTMENT_MAP[bestCategory],
    signals,
    language,
  };
}

function pickCategory(text: string): {
  category: Category;
  hits: Partial<Record<Category, string[]>>;
} {
  let bestCategory: Category = "other";
  let bestScore = 0;
  const hits: Partial<Record<Category, string[]>> = {};
  (Object.keys(CATEGORY_KEYWORDS) as Exclude<Category, "other">[]).forEach((cat) => {
    let score = 0;
    const catHits: string[] = [];
    for (const [kw, weight] of CATEGORY_KEYWORDS[cat]) {
      if (text.includes(kw)) {
        score += weight;
        catHits.push(kw);
      }
    }
    hits[cat] = catHits;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  });
  return { category: bestCategory, hits };
}

function buildReason(
  category: Category,
  severity: Severity,
  signals: string[],
  hits: string[],
): string {
  if (category === "other") {
    return "Could not match a specific category — needs a human review at the citizen helpline.";
  }
  const main = signals[0] ?? hits[0] ?? CATEGORY_LABELS[category].toLowerCase();
  const extra = signals[1] ? `, ${signals[1]}` : "";
  switch (severity) {
    case "Critical":
      return `Immediate safety risk: ${main}${extra} — needs same-day action.`;
    case "High":
      return `${cap(main)}${extra} affecting daily movement — prioritise this week.`;
    case "Medium":
      return `${cap(main)}${extra} — schedule a routine fix.`;
    default:
      return `Minor ${CATEGORY_LABELS[category].toLowerCase()} issue — add to the routine maintenance queue.`;
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
