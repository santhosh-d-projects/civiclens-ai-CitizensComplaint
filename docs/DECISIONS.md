# Decisions (master prompt §14 — record the best decision and continue)

## 2026-11-21 ~12:00 — Repo
- Complaint-Sathi goes into the existing event repo
  `santhosh-d-projects/civiclens-ai-CitizensComplaint` on `main`, replacing the
  premature CivicLens MVP. The master prompt said "new private repo", but the
  event submission form needs this repo's link, and the old MVP was built
  before the user gave the design direction. The old MVP stays live until
  Complaint-Sathi deploys, then the Vercel project is re-pointed.

## 2026-11-21 ~11:45 — Supabase
- Fresh project `complaint-sathi` (ref `vilqhhvimmzuibwkqqll`, ap-south-1)
  created via the Management API. Schema `01` + `02_additions.sql`
  (added `ai_analysis_log` + `notifications`, which the master prompt
  requires but the SQL file did not contain) applied via the Management API
  `query` command and verified (12 wards, 9 categories, 7 departments /
  5 active, 5 audit rows, hash chain intact).
- The OAuth connector lacks `api_gateway_keys_read`, so anon + service-role
  keys must come from the user (dashboard Settings → API).

## 2026-11-21 ~11:50 — AI provider
- `AI_PROVIDER=gemini`, model `gemini-3.5-flash-lite` (verified live, 200 OK).
  Default `claude-haiku-5-5` needs an Anthropic key we don't have;
  `gemini-2.5-flash`/`2.5-flash-lite` return 404 (retired for new users),
  `gemini-3.8-flash` returns 503 (overloaded). Keyword fallback (§8) always
  available and is used when the model is down.

## 2026-11-21 ~12:05 — Auth/roles
- Middleware refreshes the session and redirects unauthenticated users from
  /citizen, /officer, /admin to /login. Role + department-status checks live
  in server layouts and route handlers (`src/lib/auth.ts`), because
  middleware cannot trust the JWT for department status and the department
  guard must re-read the DB (cache ≤30s per spec — implemented as a fresh
  read per request; the traffic is low).
- `database.types.ts` is hand-written (no Supabase CLI in this environment
  for `supabase gen types`); it must be updated if the schema changes.

## 2026-11-21 ~12:11 — Master prompt V2 (user pasted a revised spec in chat)
- Citizen auth changes from Supabase email OTP to **Firebase phone OTP**
  (STEP 0): Firebase project + phone provider + test numbers, firebase-admin
  session cookie, a `citizens` table (firebase_uid, phone, phone_verified),
  citizen APIs read the Firebase session cookie. Officers/admin stay on
  Supabase email + password. Decision: do NOT stop the current build —
  finish the admin track, deploy the email-OTP version first (safety net),
  then swap citizen auth to Firebase and redeploy. Firebase setup needs the
  user's Google login (CLI) or console steps (project + phone provider +
  test numbers) — that part cannot be done by the agent alone.
- Voice (8b): the ASR service (FastAPI, IndicConformer/Whisper) cannot run
  on Vercel and cannot be hosted in the remaining time → P2, not built.
  The new prompt explicitly forbids the browser's built-in speech API as a
  substitute, so the SpeechRecognition mic button the citizen agent built
  must be HIDDEN, not shipped.
- Everything else in V2 (P0/P1/P2 order, KNOWN_ISSUES.md, Playwright as
  time allows) already matches the current build; no change needed.

## 2026-11-21 ~12:20 — Citizen login: email + password primary (user decision)
- The login flow is email id + password. New citizens register on the login
  page with email + password + confirm password (`supabase.auth.signUp`);
  if Supabase email confirmation is on, they confirm via the email link and
  then sign in with the same password. Email-code OTP stays as a secondary
  sign-in option. Firebase email verification (link-based, free on Spark,
  50k MAU) is an OPTIONAL add-on only — it must never gate the login flow.
  It is NOT built yet: no Firebase connector exists, and it needs a Firebase
  project from the user (console: create project + enable the Email provider)
  plus `firebase-admin` wiring. The current build is Supabase-only.
- Supersedes the V2 phone-OTP plan above: the user corrected it to email
  verification as an option, login unchanged (email + password).

## 2026-11-21 ~12:00 — Keys + admin account
- User supplied the Supabase anon + service-role keys, the Gemini API key
  and the admin credentials in chat. All saved to `app/.env.local`
  (gitignored, chmod 600) and verified live: anon key reads wards via REST,
  service key created the admin, Gemini key returns 200 on
  gemini-3.5-flash-lite. Values are never committed and never repeated in
  chat replies.
- Admin login: the user said "user id: Admin" — "Admin" is not an email, and
  Supabase Auth needs one, so the admin account is
  **admin@complaint-sathi.in** (password as given by the user), full name
  "Platform Admin", role admin, id c054c8d7-2f3f-41b5-ae9c-adb134b836e6.
  `scripts/seed-admin.ts` must be idempotent (skip if the user exists).
- Skills the user asked to use (installed 2026-11-20, "last night"):
  writing-plans, executing-plans, test-driven-development,
  systematic-debugging, verification-before-completion, vercel-deployments,
  sdlc-throwaway-projects, prompt-master, grill-me/grilling/handoff.
  verification-before-completion applies to every claim: evidence before
  assertions, verify subagent reports independently (VCS diff + tsc +
  build + live checks) before reporting success.

## 2026-11-21 ~12:10 — Seeds
- Admin account: `scripts/seed-admin.ts` with ADMIN_EMAIL/ADMIN_PASSWORD
  from env (default: the user's Gmail + a generated password reported in
  the final report, never committed).
- Demo officers + citizens + ~15 complaints: `scripts/seed-demo.ts`
  (needs the service-role key).
