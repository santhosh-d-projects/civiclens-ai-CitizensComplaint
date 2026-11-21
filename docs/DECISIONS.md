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

## 2026-11-21 12:51 — Full glassmorphism redesign (user order, overrides Civic Precision)
- The user supplied stitch_complaint_sathi_civic_redesign.zip (7 new Stitch
  screens + Civic Glass System dark + Civic Glass Light design systems) and
  ordered a complete redesign of ALL pages to premium glassmorphism
  (indigo/violet/midnight navy/teal, Plus Jakarta Sans + Inter, frosted
  glass, backdrop blur). This OVERRIDES the master prompt's "do NOT redesign
  the identity / keep Civic Precision" rule — the user's latest instruction
  wins. Business logic, auth, DB, APIs, routes, data-testids unchanged.
- Foundation (Jarvis): globals.css tokens remapped (old names kept so
  un-redesigned pages still render), layout.tsx loads Plus Jakarta Sans +
  Inter + JetBrains Mono with a fixed ambient-glow layer, ui.tsx restyled
  (gradient primary buttons, GlassCard/StatCard/PageHeader/Chip, glass
  Modal/Drawer/inputs). Page redesigns delegated to three subagents
  (citizen / officer / admin+public) with strict no-logic-change rules.
- Reference screens contain FABRICATED content (94.8% SLA, 198 wards,
  "98.4% routing accuracy", "45,000 resolved", ISO/Aadhaar/laws wording) —
  subagents were told never to copy it; only real DB data. No voice button
  anywhere (ASR not built; browser speech API forbidden by V2 §8b).

## 2026-11-21 13:00 — Exact-duplicate complaint detection (user order)
- Rule: an exact duplicate (same citizen, same ward, same category,
  identical description after lowercase + whitespace normalisation, within
  7 days, not closed) is REJECTED with a 409 DUPLICATE_COMPLAINT error
  naming the existing ticket; NO new complaint and NO new ticket number are
  generated. Enforced in `create_complaint` (migration
  03_duplicate_guard.sql) BEFORE the INSERT, so complaint_seq never
  advances. The API route parses `DUPLICATE_COMPLAINT:<ticket>:<uuid>` and
  returns existing_ticket_no + existing_complaint_id for the UI link.
- Scope is per-citizen by design: a different citizen reporting the same
  issue is a separate, legitimate complaint. Normalisation is Unicode-safe
  (keeps Kannada/Hindi script); punctuation-only differences do NOT match.
- Verified live: re-submitting "main water pipe burst, road flooded" as
  citizen1 raised DUPLICATE_COMPLAINT:CS-1023; a differently-worded
  complaint created CS-1026 (deleted afterwards; count back to 16).

## 2026-11-21 12:43 — Resolution workflow visibility (user order)
- Officer flow already enforced status + resolution note (resolved requires
  note via officer_update_complaint) + after-work photos
  (resolution_photo_paths). The citizen detail page already had the data;
  the redesign makes it PROMINENT: a Resolution section with the note, the
  after-work photos, and the status timeline — so citizens can see the staff
  did the work. Verified end to end in the next smoke test.

## 2026-11-21 ~13:05 IST — Green Civic Glass redesign (user order, with reference image)
- The user sent the Participant Guide PDF + a Stitch reference screenshot and
  ordered: use the frontend skills to design; change the palette to GREEN and
  its gradients; copy the font-loading/animation/hover language from the
  Jarvis showcase page I built on 15 Nov; add a Bengaluru Vidhana Soudha
  background image (blurred) to the landing page, with all text kept visible.
- Palette: emerald #059669 primary, teal #0D9488 secondary, #10B981 electric,
  deep green #064E3B, midnight #04150E (deep green-black), canvas #F2F7F2.
  All old token names remapped in globals.css, so all pages re-skin at once;
  hardcoded indigo shadows (rgba 79,70,229 / 99,102,241) replaced project-wide
  with emerald shadows (5,150,105 / 16,185,129). Status colours unchanged.
- Motion (from the Jarvis showcase, ts-spaces/jarvis-showcase/index.html):
  riseIn 0.9s cubic-bezier(0.22,1,0.36,1), fadeUp 0.9s ease, staggered
  delays; one orchestrated page-load moment; hover-lift on GlassCard/StatCard
  (translateY(-2px) + green border/shadow) and buttons shift to a deeper
  green gradient on hover; prefers-reduced-motion respected.
- Hero: Vidhana Soudha photo (officechai.com, 1024x638, downloaded to
  app/public/vidhana-soudha.jpg, credited in the footer) as a blurred
  (blur 2px, brightness 0.55, scale 1.05) background under a dark green
  gradient scrim; white headline on the scrim, never on the bare photo.
  The image is binary, so it CANNOT go through the UTF-8 snapshot push to
  GitHub — it is deployed via the Vercel upload_file flow and documented in
  README.md. A fresh clone from GitHub would miss the hero image (next/image
  would 404 on it); the live Vercel deployment is the source of truth.
- Participant Guide (Prompt_to_Product_Participant_Guide__1.pdf) read in full:
  judging 20/20/20/20/15/5; pitch 5 min + 3 min Q&A; submissions = team
  details, GitHub IDs, repo link, complete AI chat history, prompt log,
  1–2 page write-up, slides PDF, 2–3 min demo video, live link (optional);
  files named TeamName_DocumentName. The Guide contains NO submission-form
  URL (strings found zero http links) — the form link is still outstanding
  and must come from the coordinators.

## 2026-11-21 ~13:10 IST — Stale-build lesson (dpl_86UM) + feedback fix
- dpl_86UM went READY but served the OLD indigo build: the upload script
  crashed (E2BIG on the jpg) BEFORE saving /tmp/vercel-file-refs.json, so
  the 22 re-uploaded text files kept their OLD SHAs in the refs file and
  create_deployment rebuilt the old code. Lesson: ALWAYS verify the saved
  refs' SHAs match the actual files (sha1sum) before create_deployment.
- Fixed: re-uploaded all 23 changed files, verified refs SHAs byte-for-byte,
  redeployed as dpl_64s5 — production alias confirmed green (vidhana in
  HTML, emerald shadows, 0 indigo shadows).
- Feedback bug from the re-test: FeedbackForm defaulted rating to 5 stars
  (useState(5)). Fixed to 0 (no pre-selection) with submit disabled until a
  rating is picked; included in dpl_64s5.

## 2026-11-21 ~13:28 IST — Voice complaint input (user order, supersedes V2 §8b)
- The user ordered voice complaint registration: speak the complaint, the
  voice is analysed and fills the form, so a complaint can be raised by
  voice. Implemented in ReportForm.tsx as a VoiceInput component on step 1:
  mic button + language picker (English/Kannada/Hindi → en-IN/kn-IN/hi-IN),
  browser Web Speech API (SpeechRecognition/webkitSpeechRecognition,
  continuous + interim results), transcript appended to the description,
  then the existing AI analysis (step 4) classifies it and fills
  category/severity/department. Results are processed from resultIndex
  only, so final text is never duplicated.
- This deliberately uses the browser speech API that V2 §8b forbade as a
  *silent substitute* for a hosted ASR service — the user's direct order
  overrides it, and a hosted ASR service (AI4Bharat/Whisper) cannot be built
  and deployed inside the remaining event window. Honest limits, shown in
  the UI: needs Chrome (or another browser with SpeechRecognition), mic
  permission and internet; accuracy depends on accent and background noise;
  on unsupported browsers the mic button is hidden, not faked.
- Not verified live with a real voice: the cloud browser has no microphone,
  so only the button rendering + graceful error states can be checked there.
  Real transcription must be demoed on the user's laptop (Chrome + mic).

## 2026-11-21 ~13:34 IST — Voice input live verification (browser task)
- Verified live on /citizen/report step 1 as citizen1: mic button
  "🎙 Speak your complaint" + language picker (English / ಕನ್ನಡ / हिन्दी)
  render above the description; helper text present. Clicking the mic in the
  mic-less cloud browser showed the exact error "Microphone access was
  blocked. Allow the microphone and try again." (the onerror not-allowed
  path works); the description box stayed usable and no complaint was
  submitted. Real speech-to-text still untested — needs a mic on the user's
  laptop; tell him to try it once before the demo.

## 2026-11-21 ~13:34 IST — Voice auto-fill: AI analyses the spoken complaint and fills the form
- User order: for a voice user, the AI must analyse the voice and fill the
  rest of the form — including the area — so the citizen only uploads a
  photo and submits. Implemented:
  - `fallback.ts`: `inferWardName()` — earliest-mentioned ward in the text,
    English + Kannada script + transliteration, canonical DB names
    (12 wards). 5 unit tests.
  - `analyze.ts`: `AnalyzeInput.ward_id` is now optional. The model prompt
    asks for an `area` field; the server resolves the ward from the supplied
    id, else the model's area (name-matched against wards), else the keyword
    matcher. Candidates are computed only for the resolved ward; with no
    ward, departments stay empty and `ward_id/ward_name` come back null.
    `AnalyzeResult` now carries `ward_id` + `ward_name`.
  - `ReportForm.tsx`: on transcript commit the full spoken text is sent to
    /api/complaints/analyze with no ward. Ward detected → the form jumps to
    the photo step with a "AI filled the form from your voice" banner and
    the review step is one tap away (photo optional, submit). Ward not
    detected → jumps to the ward picker; picking it re-runs the analysis
    and the department is suggested. The citizen can still change every
    AI-filled field (area, category, department) before submitting.
  - Verified: tsc 0 errors, vitest 48/48 (5 new ward tests), build passes.
  - Not verified live end to end: the cloud browser has no mic, so the
    spoken flow itself still needs a real-mic test on the user's laptop.

## 2026-11-21 ~13:57 IST — Full browser sweep: session contamination + verified findings
- Three parallel browser tasks (citizen/officer/admin) SHARE ONE browser
  session: their sign-ins overwrote each other. Proof from the DB: the
  citizen task's ticket CS-1040 was created with citizen_id = officer+water,
  and CS-1041 with citizen_id = the admin. That explains every alarming
  failure in the sweep: the "duplicate not blocked" (two submissions ran as
  two different users, so the per-citizen guard correctly did not match),
  feedback "Complaint not found" (feedback route requires
  citizen_id = session user; CS-1035 belongs to citizen1), the dashboard
  flipping identities, and the admin API calls rejected as "not admin".
  Lesson: never run role tests in parallel in this browser — sequential
  only. The sweep's citizen/admin failures on those items are INVALID.
- Duplicate guard RE-VERIFIED deterministically via SQL after the sweep:
  re-submitting CS-1040's exact text as its actual creator raises
  DUPLICATE_COMPLAINT:CS-1040:9db74cef-29f0-4c84-8ffb-88672fc21cfd. Guard
  works; the browser FAIL was contamination.
- Register: first `.test` sign-up attempt failed with "Email address ...
  is invalid" (Supabase Auth rejects the .test domain); later attempts hit
  "email rate limit exceeded" (Supabase per-hour email rate limit — also
  confirmed by direct API calls, which now return 429 for ANY address).
  Video sign-up email changed to videocitizen.complaintsathi@gmail.com in
  the workflow doc; do not retry sign-up repeatedly in the hour before
  recording or the rate limit will block the take.
- Genuine minor issue from the sweep (already known): Home / My complaints
  links intermittently do nothing on the first click (second click works).

## 2026-11-21 ~16:22 IST — Email verification removed from sign-up (user order)
- Symptom: new users could not be created/used. Diagnosis (direct API test
  16:22 IST): `supabase.auth.signUp` returned a user with
  `confirmation_sent_at` set and `email_verified: false` — Supabase email
  confirmation is ON, so the account exists but cannot sign in until the
  confirmation email is clicked. The 13:57 IST email rate limit
  (429 over_email_send_rate_limit) was a second failure mode of the same
  design: every sign-up sends an email.
- The Supabase dashboard setting (mailer_autoconfirm) could NOT be changed:
  this project's Management API credential lacks the auth_config_read/write
  scopes (GET /v1/projects/{ref}/config/auth → 403, same as api-keys).
- Fix in the app instead: new server route POST /api/auth/register (zod,
  5/hr/IP rate limit) creates the user via the service-role admin API with
  `email_confirm: true` — NO confirmation email is ever sent, so the rate
  limit cannot trip either. LoginForm sign-up now calls that route, then
  signs in with the same password. The "Email code" OTP tab and all
  signInWithOtp/verifyOtp code were removed from LoginForm.tsx — login is
  password-only. Verified: tsc 0 errors, vitest 48/48, build passed.
- Trade-off, stated plainly: anyone can now register with any email address
  without proving they own it. Fine for this event build; a production
  portal should turn email confirmation back on.
