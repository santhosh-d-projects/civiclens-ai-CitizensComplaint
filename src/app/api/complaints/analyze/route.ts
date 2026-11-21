// POST /api/complaints/analyze — AI analysis (master prompt §8).
// Auth required (citizen). Rate-limited: 10 analyses / minute / user.
import { getSessionProfile, apiError, sqlErrorToResponse } from "@/lib/auth";
import { AnalyzeInput, analyzeComplaint } from "@/lib/ai/analyze";

const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) return apiError("UNAUTHORIZED", "Sign in to analyse a complaint.", 401);

    const now = Date.now();
    const key = session.userId;
    const windowHits = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
    if (windowHits.length >= 10) {
      return apiError("RATE_LIMITED", "Too many analyses. Wait a minute and try again.", 429);
    }
    windowHits.push(now);
    hits.set(key, windowHits);

    const body = await req.json();
    const parsed = AnalyzeInput.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const result = await analyzeComplaint(parsed.data, session.userId);
    return Response.json(result);
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
