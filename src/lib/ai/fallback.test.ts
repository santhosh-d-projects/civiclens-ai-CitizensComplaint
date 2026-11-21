// Unit tests for the keyword-rule fallback classifier
// (src/lib/ai/fallback.ts) — the deterministic classifier used when the
// AI model is down, and the base the model output is checked against.
import { describe, expect, it } from "vitest";
import { detectLanguage, fallbackClassify, inferWardName } from "./fallback";

describe("detectLanguage", () => {
  it("detects Kannada script as kn", () => {
    expect(detectLanguage("ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿ ಇದೆ")).toBe("kn");
  });
  it("detects Devanagari script as hi", () => {
    expect(detectLanguage("सड़क पर गड्ढा है")).toBe("hi");
  });
  it("defaults to en for Latin text", () => {
    expect(detectLanguage("Pothole on the main road")).toBe("en");
  });
});

describe("fallbackClassify", () => {
  it("classifies a burst water pipe as water_supply / critical", () => {
    const r = fallbackClassify("main water pipe burst, road flooded");
    expect(r.category).toBe("water_supply");
    expect(r.severity).toBe("critical");
    expect(r.language).toBe("en");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("classifies a Kannada pothole report as roads / medium", () => {
    const r = fallbackClassify("ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ");
    expect(r.category).toBe("roads");
    expect(r.language).toBe("kn");
    expect(r.severity).toBe("medium");
  });

  it("classifies a Hindi road report as roads", () => {
    const r = fallbackClassify("सड़क पर बड़ा गड्ढा है");
    expect(r.category).toBe("roads");
    expect(r.language).toBe("hi");
  });

  it("classifies an open manhole near children as public_safety / critical", () => {
    const r = fallbackClassify("open manhole on the main road, children walk here");
    expect(r.category).toBe("public_safety");
    expect(r.severity).toBe("critical");
  });

  it("raises severity one level when a school is involved", () => {
    const r = fallbackClassify("small pothole near the school gate");
    expect(r.category).toBe("roads");
    // LOW signal would be "low"; the school mention raises it to medium.
    expect(r.severity).toBe("medium");
  });

  it("classifies no water for 24 hours as water_supply / high", () => {
    const r = fallbackClassify("no water for 24 hours in our block");
    expect(r.category).toBe("water_supply");
    expect(r.severity).toBe("high");
  });

  it("classifies uncollected garbage as solid_waste", () => {
    const r = fallbackClassify("garbage not collected for a week, smell everywhere");
    expect(r.category).toBe("solid_waste");
    expect(r.severity).toBe("medium");
  });

  it("falls back to other with low confidence for an unrecognised report", () => {
    const r = fallbackClassify("something is wrong near my house");
    expect(r.category).toBe("other");
    expect(r.confidence).toBe(0.3);
    expect(r.severity).toBe("medium");
  });
});

describe("inferWardName", () => {
  it("finds Bellandur in an English voice report", () => {
    expect(
      inferWardName("main water pipe burst near Bellandur, road flooded"),
    ).toBe("Bellandur");
  });
  it("finds HSR Layout and returns the canonical DB name", () => {
    expect(inferWardName("streetlight sparking in HSR Layout")).toBe("HSR Layout");
  });
  it("finds a Kannada ward name", () => {
    expect(inferWardName("ಕೋರಮಂಗಲದಲ್ಲಿ ರಸ್ತೆ ಗುಂಡಿ")).toBe("Koramangala");
  });
  it("picks the first-mentioned area when two appear", () => {
    expect(
      inferWardName("near HSR, on the way to Koramangala the road is broken"),
    ).toBe("HSR Layout");
  });
  it("returns null when no area is mentioned", () => {
    expect(inferWardName("water pipe burst near my house")).toBeNull();
  });
});
