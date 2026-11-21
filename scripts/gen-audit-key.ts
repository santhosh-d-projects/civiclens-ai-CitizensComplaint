import { generateKeyPairSync, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.js";
import { createAdminClient } from "../src/lib/supabase/admin.js";

async function main(): Promise<void> {
// Generate the Ed25519 audit signing keypair (master prompt §5).
// Usage: npm run gen:audit-key
// - Prints the private key as base64 (for AUDIT_SIGNING_PRIVATE_KEY) and
//   the public key + SHA-256 fingerprint.
// - Inserts the public key into audit_keys (key_id from AUDIT_KEY_ID,
//   default audit-2026-01).
// - Also writes AUDIT_SIGNING_PRIVATE_KEY + AUDIT_KEY_ID into app/.env.local
//   (gitignored) so the app can sign audit rows. The private key is NEVER
//   written to any other file and never committed.

loadEnv();

const KEY_ID = process.env.AUDIT_KEY_ID ?? "audit-2026-01";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const privateB64 = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
const publicB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const fingerprint = createHash("sha256")
  .update(Buffer.from(publicB64, "base64"))
  .digest("hex");

const admin = createAdminClient();
const { error } = await admin.from("audit_keys").upsert(
  {
    key_id: KEY_ID,
    public_key: publicB64,
    algorithm: "Ed25519",
    fingerprint,
  } as never,
  { onConflict: "key_id" },
);
if (error) {
  console.error("Failed to insert audit key:", error.message);
  process.exit(1);
}

// Persist the private key into the gitignored .env.local only.
const dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(dir, "..", ".env.local");
let envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
function setVar(text: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) return text.replace(re, `${key}=${value}`);
  return text.endsWith("\n") || text === "" ? `${text}${key}=${value}\n` : `${text}\n${key}=${value}\n`;
}
envText = setVar(envText, "AUDIT_SIGNING_PRIVATE_KEY", privateB64);
envText = setVar(envText, "AUDIT_KEY_ID", KEY_ID);
writeFileSync(envPath, envText);

console.log("Audit signing key generated and stored.");
console.log(`key_id:      ${KEY_ID}`);
console.log(`fingerprint: ${fingerprint}`);
console.log(`public_key:  ${publicB64}`);
console.log(`private_key (base64, also saved to app/.env.local as AUDIT_SIGNING_PRIVATE_KEY):`);
console.log(privateB64);
console.log("Keep the private key secret. It is in .env.local (gitignored) only.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
