# KNOWN_ISSUES — Complaint-Sathi (master prompt V2 §14)

## Smoke test 2026-11-21 12:29–12:43 IST (live URL, all 3 roles)
All flows passed end to end: admin dashboard/departments/audit (chain verified),
citizen report → AI (water_supply, Critical, 98%) → ticket CS-1023 → officer
in-progress with note. Issues found and fixed in the same session:
- **Silent first-submit stall (FIXED):** the sign-in/submit button cleared its
  busy state before the soft navigation finished, so a slow navigation looked
  like a failed sign-in/submit (the ticket WAS created; a user could submit a
  duplicate). Fix: the button now stays busy until the navigation unmounts the
  page (LoginForm, ReportForm submit); a global `loading.tsx` skeleton shows
  instantly on every navigation.
- **Stale officer UI after save (FIXED):** the badge/timeline read "Submitted"
  until a manual reload. Fix: UpdateForm keeps the form busy 1.5s while
  `router.refresh()` settles; both complaint detail pages are
  `force-dynamic` so refreshes always re-run the server queries.
- **Slow client-side navigation (PARTIAL):** link clicks take seconds on cold
  serverless starts (hobby plan). The loading skeleton now makes it visible;
  the underlying cold-start latency cannot be removed on this plan.
- Ticket URLs use the complaint UUID, not the CS number — by design; a guessed
  `/citizen/complaints/CS-1023` URL 404s.

## Fixed 2026-11-21 ~13:00 — exact-duplicate detection
- Re-submitting the exact same complaint (same citizen/ward/category,
  identical description, 7 days) now returns 409 DUPLICATE_COMPLAINT with
  the existing ticket (e.g. CS-1023) and creates nothing. Verified live
  against create_complaint; test ticket CS-1026 deleted afterwards.

## Not finished / limitations (stated plainly)
- **Citizen login is Supabase email + password, not Firebase.** V2 STEP 0
  asked for Firebase phone OTP; the user corrected it to Firebase *email
  verification as an optional add-on* that must not disturb the email+password
  login. Not built: no Firebase connector exists; needs a Firebase project
  from the user (console: create project + enable the Email provider).
- **Voice complaints (V2 §8b) not built.** The ASR service (FastAPI,
  IndicConformer/Whisper) cannot run on Vercel and was not hosted. The
  browser-speech mic button was REMOVED (V2 forbids the browser speech API
  as a silent substitute); the report form is text-only.
- **Email notifications not wired.** In-app `notifications` table exists and
  the types are defined; no email provider (Resend/SMTP) is configured, so
  no emails are sent. Invite links are logged to the server console.
- **Playwright e2e suite not yet run.** Unit/live tests pass (43/43 vitest)
  and the browser smoke test passed all 3 role flows; the full §13 Playwright
  flows (incl. 1440px/390px screenshots and Lighthouse) are still to run
  against the live URL.
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
- Vercel deploy failed ERESOLVE (vitest vs @types/node) — fixed with
  `.npmrc` legacy-peer-deps=true; 397 KB inline payload exceeded the CLI argv
  limit — fixed with the two-stage upload_file + SHA1-reference deploy.

## 2026-11-21 ~13:05 IST — Green redesign notes
- Green Civic Glass live in the redeploy after this note (dpl pending).
  Hero image vidhana-soudha.jpg is NOT in the GitHub repo (binary, snapshot
  push is UTF-8-only); it is in the Vercel deployment via upload_file.
  A GitHub-clone deploy would show a broken hero image until the file is
  added to public/ by hand.
- The browser re-test (task 85becc2a) ran against the indigo build; its
  functional findings (duplicate block, resolution flow) still apply, but
  the visual check must be redone on the green build.
