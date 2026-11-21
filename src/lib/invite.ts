// Officer invite helpers (pure, unit-tested).
// The invite token is a random 32-byte value; only its SHA-256 is stored
// (department_officers.invite_token_hash). Invites are single-use and
// expire 48h after issue.
import { createHash } from "crypto";

/** Hex SHA-256 of a raw invite token. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteStatus = "valid" | "used" | "expired";

/** Fail closed: a missing expiry is treated as expired. */
export function inviteStatus(row: {
  invite_used_at: string | null;
  invite_expires_at: string | null;
}): InviteStatus {
  if (row.invite_used_at) return "used";
  if (!row.invite_expires_at) return "expired";
  return new Date(row.invite_expires_at).getTime() < Date.now()
    ? "expired"
    : "valid";
}
