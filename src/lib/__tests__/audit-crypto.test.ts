// Unit tests: Ed25519 audit sign/verify round-trip (src/lib/audit.ts).
// No Supabase needed — pure crypto over a generated keypair.
// Run: npm test
import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  signRecordHash,
  verifyRecordHash,
  publicKeyFingerprint,
} from "@/lib/audit";

function makeKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    privateB64: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    publicB64: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  };
}

describe("audit Ed25519 signing", () => {
  it("signs a record hash and verifies with the matching public key", () => {
    const { privateB64, publicB64 } = makeKeypair();
    const hash = "a".repeat(64);
    const sig = signRecordHash(hash, privateB64);
    expect(verifyRecordHash(hash, sig, publicB64)).toBe(true);
  });

  it("fails verification when the hash is tampered", () => {
    const { privateB64, publicB64 } = makeKeypair();
    const sig = signRecordHash("a".repeat(64), privateB64);
    expect(verifyRecordHash("b".repeat(64), sig, publicB64)).toBe(false);
  });

  it("fails verification with a different key", () => {
    const a = makeKeypair();
    const b = makeKeypair();
    const sig = signRecordHash("a".repeat(64), a.privateB64);
    expect(verifyRecordHash("a".repeat(64), sig, b.publicB64)).toBe(false);
  });

  it("fingerprint is a stable 64-hex SHA-256 of the public key", () => {
    const { publicB64 } = makeKeypair();
    const fp1 = publicKeyFingerprint(publicB64);
    const fp2 = publicKeyFingerprint(publicB64);
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[0-9a-f]{64}$/);
  });
});
