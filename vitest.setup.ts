// Test setup — load .env.local so live tests get the real Supabase +
// Gemini keys (vitest does not load .env.local on its own in this setup).
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
