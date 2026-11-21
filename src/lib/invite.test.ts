// Tests for src/lib/invite.ts — invite token hashing + status checks.
// Security-critical: only the SHA-256 of a token is stored; invites are
// single-use and expire after 48h.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { hashInviteToken, inviteStatus } from "@/lib/invite";

describe("hashInviteToken", () => {
  it("returns the hex SHA-256 of the token", () => {
    const token = "a".repeat(64);
    expect(hashInviteToken(token)).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
  });

  it("is deterministic and differs per token", () => {
    expect(hashInviteToken("token-one")).not.toBe(hashInviteToken("token-two"));
    expect(hashInviteToken("token-one")).toBe(hashInviteToken("token-one"));
  });

  it("never returns the token itself", () => {
    const token = "super-secret-invite-token";
    expect(hashInviteToken(token)).not.toContain(token);
    expect(hashInviteToken(token)).toHaveLength(64);
  });
});

describe("inviteStatus", () => {
  const now = new Date();
  const future = new Date(now.getTime() + 60_000).toISOString();
  const past = new Date(now.getTime() - 60_000).toISOString();

  it("returns 'valid' for an unused, unexpired invite", () => {
    expect(inviteStatus({ invite_used_at: null, invite_expires_at: future })).toBe("valid");
  });

  it("returns 'used' when invite_used_at is set (even if not expired)", () => {
    expect(
      inviteStatus({ invite_used_at: now.toISOString(), invite_expires_at: future }),
    ).toBe("used");
  });

  it("returns 'expired' when the expiry has passed", () => {
    expect(inviteStatus({ invite_used_at: null, invite_expires_at: past })).toBe("expired");
  });

  it("returns 'expired' when the expiry is missing (fail closed)", () => {
    expect(inviteStatus({ invite_used_at: null, invite_expires_at: null })).toBe("expired");
  });
});
