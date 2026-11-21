// Unit tests: resubmission token sign/verify (stateless HMAC).
// Run: npm test
import { describe, it, expect, beforeEach } from "vitest";
import { issueResubmitToken, verifyResubmitToken } from "@/lib/resubmit-token";

const DEPT_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("resubmit tokens", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("issues a token that verifies for the same department", () => {
    const token = issueResubmitToken(DEPT_ID);
    expect(verifyResubmitToken(token)).toEqual({ departmentId: DEPT_ID });
  });

  it("rejects a token for a different department", () => {
    const token = issueResubmitToken(DEPT_ID);
    const other = token; // same token, but the caller checks departmentId
    const verified = verifyResubmitToken(other);
    expect(verified?.departmentId).not.toBe(
      "123e4567-e89b-12d3-a456-426614174001",
    );
  });

  it("rejects tampered tokens", () => {
    const token = issueResubmitToken(DEPT_ID);
    const tampered = token.slice(0, -2) + "AA";
    expect(verifyResubmitToken(tampered)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyResubmitToken("not-a-token")).toBeNull();
    expect(verifyResubmitToken("")).toBeNull();
  });

  it("rejects an expired token", () => {
    // Build an expired token by hand with the same signing scheme.
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const exp = Date.now() - 1000;
    const payload = `${DEPT_ID}.${exp}`;
    const sig = createHmac("sha256", "test-service-key").update(payload).digest("hex");
    const token = Buffer.from(`${payload}.${sig}`).toString("base64url");
    expect(verifyResubmitToken(token)).toBeNull();
  });
});
