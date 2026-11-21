# KNOWN_ISSUES — Complaint-Sathi (master prompt V2 §14)

## Not finished / limitations (stated plainly)
- **Citizen login is Supabase email OTP, not Firebase phone OTP.** V2 STEP 0
  asks for Firebase phone auth; the build so far uses Supabase email OTP for
  citizens (officers/admin use Supabase email + password). Firebase is the
  next phase after the first deploy: needs a Firebase project + phone
  provider + test numbers (console steps by the user or CLI login).
- **Voice complaints (V2 §8b) not built.** The ASR service (FastAPI,
  IndicConformer/Whisper) cannot run on Vercel and was not hosted. The
  browser-speech mic button was REMOVED (V2 forbids the browser speech API
  as a silent substitute); the report form is text-only.
- **Email notifications not wired.** In-app `notifications` table exists and
  the types are defined; no email provider (Resend/SMTP) is configured, so
  no emails are sent. Invite links are logged to the server console.
- **Playwright e2e suite not yet run.** Unit/live tests pass (43/43 vitest);
  the full §13 Playwright flows (incl. 1440px/390px screenshots and
  Lighthouse) are still to run against the live URL.
- **Audit signing is best-effort after mutations.** `signAuditRows()` runs
  after admin actions and via `POST /api/admin/audit/sign` / `npm run
  sign:audit`; if the private key env is missing at runtime, rows stay
  unsigned until the backfill runs.
- **Vercel ↔ GitHub auto-deploy not linked.** The Vercel project has no
  GitHub Login Connection (user action in the Vercel dashboard); redeploys
  are manual via the connector/CLI.
- **Supabase Auth email OTP needs the redirect URLs configured.** Localhost
  and the Vercel domain must be in Supabase Auth → URL Configuration;
  otherwise the OTP/magic-link flow fails on the deployed URL.
- **Admin "Apply" duplicate check** is email + name+ward overlap only; fuzzy
  duplicate detection (e.g. similar names, different emails) is not done.

## Resolved during the build
- supabase-js select inference collapses to `never` when Row types are
  `interface` — converted all Row types to `type` aliases.
- `callDbFunction` detached `.rpc` from the client (`Cannot read properties
  of undefined (reading 'rest')`) — fixed by calling `.rpc` as a method.
- Fallback classifier: "open manhole" misclassified as roads; school/hospital
  double-counted severity — fixed (tests added).
- Next 16 prerender: `useSearchParams` needs a Suspense boundary; `Date.now()`
  blocked in prerendered client components — fixed.
- Tailwind utilities missing until the scaffold's Turbopack `*.css` rule was
  restored in `next.config.ts`.
