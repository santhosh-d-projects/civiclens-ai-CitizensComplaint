# Complaint-Sathi — Plan (Prompt to Product, 21 Nov 2026)

**Deadline:** 2:30 PM IST. **Window left at plan time (~12:00): ~2.5h.**
**Source of truth:** `docs/MASTER_PROMPT.md` + `supabase/migrations/01_supabase_schema.sql` (+ `02_additions.sql`: `ai_analysis_log`, `notifications`) + Stitch export in `stitch/`.
**Working method (master prompt §14):** autonomous, best decision, record in `docs/DECISIONS.md`, commit per milestone, run typecheck/lint/build/tests after each.

## Decisions already made (see DECISIONS.md for the full log)
- **Repo:** the existing event repo `santhosh-d-projects/civiclens-ai-CitizensComplaint` (public) carries Complaint-Sathi on `main`, replacing the premature CivicLens MVP. The master prompt said "new private repo", but the event submission needs this repo's link.
- **Supabase project:** `complaint-sathi`, ref `vilqhhvimmzuibwkqqll`, region ap-south-1, created via the Management API. Schema 01 + 02 already applied and verified (12 wards, 9 categories, 7 departments / 5 active, 5 audit rows).
- **AI:** `AI_PROVIDER=gemini`, model `gemini-3.5-flash-lite` (verified live 200 OK). The default `claude-haiku-5-5` needs an Anthropic key we don't have; 2.5-flash is 404, 3.8-flash is 503. Keyword fallback always available.
- **Keys still needed from the user:** Supabase anon + service-role keys (connector lacks `api_gateway_keys_read`), Gemini API key value (for Vercel env vars), ADMIN_EMAIL/ADMIN_PASSWORD (default: his Gmail + generated password, told in the final report).

## Milestones
- **M1 — Repo + Supabase + schema + seeds** (done: schema applied; left: admin + demo seeds — needs service key)
- **M2 — Auth + guards** (Supabase Auth email OTP, middleware role guards, department guard 403 `DEPARTMENT_NOT_ACTIVE`, blocked screens)
- **M3 — Admin department workflow** (apply/review drawer/approve/request-changes/reject/activate with typed ACTIVATE/invite/suspend+transfer/deactivate/reactivate)
- **M4 — Citizen flow + AI** (`/citizen/report` 5-step flow, `/api/complaints/analyze` with rubric + fallback + candidate-only departments, `create_complaint`, ticket + timeline, feedback/reopen)
- **M5 — Officer portal** (queue, detail, status updates via `officer_update_complaint`, resolution proof, profile)
- **M6 — Audit + forensics** (audit list, forensic drawer with signature certificate + verification receipt, verify-chain, export JSON, `signAuditRows()` helper)
- **M7 — Polish + a11y + responsive** (Stitch teal/navy tokens, min sizes, 44px targets, AA contrast, 1440px + 390px)
- **M8 — Tests** (vitest unit/DB checks + Playwright e2e per §13, loop until green)
- **M9 — Deploy** (Vercel prod, env vars, Playwright vs live URL, README, final report)

## Routes (from §4)
Public: `/`, `/apply-department`, `/login`, `/officer/accept-invite?token=`
Citizen: `/citizen`, `/citizen/report`, `/citizen/complaints`, `/citizen/complaints/[id]`
Officer: `/officer`, `/officer/complaints`, `/officer/complaints/[id]`, `/officer/profile`, `/officer/blocked`
Admin: `/admin`, `/admin/departments`, `/admin/departments/new`, `/admin/complaints` (read-only), `/admin/audit`, `/admin/analytics`

## API (from §7 — all zod-validated, `{error:{code,message}}`)
Public: `POST /api/departments/apply`, `POST /api/departments/:id/resubmit`
Citizen: `POST /api/complaints/analyze`, `POST /api/complaints`, `GET /api/complaints`, `GET /api/complaints/:id`, `POST /api/complaints/:id/feedback`, `POST /api/complaints/:id/reopen`
Officer: `GET /api/department/complaints`, `PATCH /api/department/complaints/:id`
Admin: `GET /api/admin/dashboard`, `GET/POST /api/admin/departments`, `GET /api/admin/departments/:id`, `POST .../documents/:docId/verify`, `POST .../approve|reject|request-changes|activate|deactivate|reactivate`, `POST .../suspend`, `GET /api/admin/complaints`, `GET /api/admin/analytics`, `GET /api/admin/audit?filters`, `GET /api/admin/audit/:seq/verify`, `GET /api/admin/audit/verify-chain`, `GET /api/admin/audit/:seq/export`

## Order of work (time-boxed)
1. Foundation: env example, Supabase clients (browser/server/admin), types, shared UI, auth pages, middleware. (M2)
2. Citizen report + analyze + complaints (the demo's heart). (M4)
3. Officer queue + detail. (M5)
4. Admin departments + review drawer + activate/invite + suspend. (M3)
5. Audit + forensic drawer. (M6)
6. Polish, tests, deploy. (M7–M9)
