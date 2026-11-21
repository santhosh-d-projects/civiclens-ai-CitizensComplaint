// Stateless signed resubmission tokens (master prompt §7).
// Issued when an admin requests changes; the applicant presents it to
// resubmit (transition_department with actor null, to='pending').
// Format: base64url("<deptId>.<expiryEpochMs>.<hmacHex>"), HMAC-SHA256
// over "<deptId>.<expiry>" with the service-role key (server-only secret).
// No DB storage needed; expiry is 30 days.
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.RESUBMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No resubmission signing secret configured.");
  return s;
}

export function issueResubmitToken(departmentId: string): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${departmentId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyResubmitToken(
  token: string,
): { departmentId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [departmentId, expStr, sig] = decoded.split(".");
    if (!departmentId || !expStr || !sig) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    const payload = `${departmentId}.${exp}`;
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { departmentId };
  } catch {
    return null;
  }
}
