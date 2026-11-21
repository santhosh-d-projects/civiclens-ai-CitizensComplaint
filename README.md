# Complaint-Sathi — Civic Complaint Portal, Bengaluru

Report a civic issue, track it till it is fixed. AI suggests the right
department and the urgency — **you confirm it**. Built for the Prompt to
Product event, 21 Nov 2026.

Three portals: **Citizen** (report + track), **Department Officer**
(queue + resolve), **Admin** (department approvals, read-only complaint
registry, tamper-evident audit log).

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4 on Vercel · Supabase
(Postgres, Auth, Storage, RLS) · Gemini (`gemini-3.5-flash-lite`) for AI
triage with a keyword-rule fallback · zod validation · vitest unit/live
tests.

## Setup

```bash
cd app
cp .env.example .env.local   # fill in the values below
npm install
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role, server only) |
| `AI_PROVIDER` | `gemini` (default `anthropic` needs an Anthropic key) |
| `AI_MODEL` | `gemini-3.5-flash-lite` |
| `GEMINI_API_KEY` | Google AI Studio key |
| `AUDIT_SIGNING_PRIVATE_KEY` | base64 Ed25519 private key (`npm run gen:audit-key`) |
| `AUDIT_KEY_ID` | `audit-2026-01` |
| `APP_URL` | `http://localhost:3000` locally, the Vercel URL in prod |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed scripts only, run locally |

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm test             # vitest (unit + live DB tests)
npm run gen:audit-key # Ed25519 audit keypair; inserts public key into audit_keys
npm run seed:admin   # create/promote the admin (idempotent)
npm run seed:demo    # demo officers + citizens + 15 complaints (console only)
npm run sign:audit   # sign any unsigned audit rows
```

## Demo logins

Printed by the seed scripts to the console only — never committed to git.
Admin: `admin@complaint-sathi.in` · Officers:
`officer+water/power/waste/roads/drain@demo.complaintsathi.test` ·
Citizens: `citizen1/2/3@demo.complaintsathi.test` (passwords in the seed
output).

## Architecture

```
Browser ──► Next.js (Vercel)
  ├─ /citizen/*  email-OTP citizens (Firebase phone OTP: planned, V2 STEP 0)
  ├─ /officer/*  Supabase email+password + department guard (DB re-read)
  ├─ /admin/*    Supabase email+password, role='admin' server-side
  └─ /api/*      zod-validated; service-role only in route handlers
Supabase (ap-south-1, project complaint-sathi)
  ├─ Postgres: wards, categories, departments, complaints, audit_log
  │   (+ hash chain), audit_signatures (Ed25519), ai_analysis_log,
  │   notifications; security-definer functions: create_complaint,
  │   transition_department, suspend_department, officer_update_complaint,
  │   verify_audit, verify_audit_chain
  └─ Storage (private): complaint-photos, department-docs
Gemini (server-side only) ──► POST /api/complaints/analyze
  (8s timeout → keyword fallback, source:"fallback")
```

Department lifecycle: `draft → pending → changes_requested → approved →
active → suspended/deactivated/rejected`, only via `transition_department`;
activation needs verified documents + an officer + typed `ACTIVATE`.
Suspension atomically transfers open complaints to another ACTIVE
department covering the same wards + categories and revokes officer
sessions. The admin never routes individual complaints — the AI suggests,
the citizen confirms.

## Key rotation

- **Supabase keys**: regenerate in Supabase → Settings → API, update
  `.env.local` and the Vercel env vars, redeploy.
- **Gemini key**: regenerate in Google AI Studio, update `GEMINI_API_KEY`
  in Vercel, redeploy.
- **Audit signing key**: run `npm run gen:audit-key` (new `key_id`, e.g.
  `audit-2026-02`), set `AUDIT_KEY_ID` + `AUDIT_SIGNING_PRIVATE_KEY` in
  Vercel, redeploy. Old signatures stay verifiable against the old row in
  `audit_keys`.

## Add a new department

Admin → Departments → New (or the public Apply-as-department form) →
review in the Pending tab → verify documents → Approve → Activate (type
`ACTIVATE`) → the officer gets an invite link → sets a password → logs in.
A department cannot log in before approval AND activation.
