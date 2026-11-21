// Sign all unsigned audit rows with the Ed25519 key (master prompt §6).
// Usage: npm run sign:audit
// Same action as POST /api/admin/audit/sign, runnable from the CLI.
import { loadEnv } from "./load-env.js";
import { signAuditRows } from "../src/lib/audit.js";

async function main(): Promise<void> {
  loadEnv();
  const result = await signAuditRows();
  console.log(`Signed ${result.signed} pending audit row(s).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
