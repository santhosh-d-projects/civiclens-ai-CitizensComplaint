// Vitest config — resolves the @/ alias to src/ (same as tsconfig paths).
// Vitest loads .env.local automatically, so live tests get the real
// Supabase + Gemini keys.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src");

export default defineConfig({
  resolve: {
    alias: { "@": src },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
