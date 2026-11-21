// LIVE integration test for analyzeComplaint (src/lib/ai/analyze.ts).
// Hits real Supabase (candidate departments, ai_analysis_log) and real
// Gemini (gemini-3.5-flash-lite). Requires .env.local with live keys;
// fails loudly if they are missing. Run: npx vitest run analyze.live
import { describe, expect, it } from "vitest";
import { analyzeComplaint } from "./analyze";
import { createAdminClient } from "@/lib/supabase/admin";

describe("analyzeComplaint (live)", () => {
  it("needs live keys in .env.local", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL").toBeTruthy();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY").toBeTruthy();
    expect(process.env.GEMINI_API_KEY, "GEMINI_API_KEY").toBeTruthy();
  });

  it(
    "analyses a burst water pipe: water_supply, high/critical, with a default department",
    async () => {
      const result = await analyzeComplaint(
        { description: "main water pipe burst, road flooded near the park", ward_id: 1 },
        null,
      );
      expect(result.category).toBe("water_supply");
      expect(["high", "critical"]).toContain(result.severity);
      expect(result.departments.length).toBeGreaterThan(0);
      expect(result.default_department_id).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(["model", "fallback"]).toContain(result.source);
      expect(result.reason.length).toBeGreaterThan(0);
    },
    30_000,
  );

  it(
    "logs the analysis to ai_analysis_log (metadata only, no PII)",
    async () => {
      const before = new Date(Date.now() - 60_000).toISOString();
      await analyzeComplaint(
        { description: "streetlight not working on the main road", ward_id: 1 },
        null,
      );
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("ai_analysis_log")
        .select("id,category_slug,severity,source,ward_id")
        .eq("ward_id", 1)
        .gte("created_at", before)
        .order("created_at", { ascending: false })
        .limit(1);
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.[0].category_slug).toBe("electricity");
    },
    30_000,
  );
});
