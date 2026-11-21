# CivicLens — AI Triage for Citizen Complaints

> Citizens report potholes, overflowing garbage, broken streetlights, water leaks and
> fallen trees every day. Municipal bodies receive thousands of these reports — many
> vague, many duplicates, many sent to the wrong department — so urgent issues get
> buried. CivicLens takes an unstructured complaint (text, photo, or both) and turns it
> into a structured, prioritised, correctly routed ticket a municipal officer can act
> on right away.

Built during **Prompt to Product, 21 Nov 2026 (10:30 AM–2:30 PM IST)** by
**Santhosh Devappa Dubari & Vaishnavi V**. All code was written during the event;
the starter template (`create-next-app`) is the only pre-existing code, as the rules
allow.

## What it does

1. **Accepts a complaint** as free text in English, Kannada, Hindi or
   Roman-transliterated Kannada/Hindi, with an optional photo.
2. **Classifies the issue** — roads, waste, water, electricity, trees, drainage.
3. **Assigns a severity** — Low / Medium / High / Critical — with a one-line reason
   and the signals that drove the decision.
4. **Routes the ticket** to the correct department (BBMP Roads, BBMP Solid Waste
   Management, BWSSB Water Supply, BESCOM Street Lighting, BBMP Forest &
   Horticulture, BWSSB Underground Drainage).
5. **Shows an officer dashboard** listing every ticket sorted by priority
   (Critical first), with category/status filters, search, ticket detail and status
   updates (Open → In Progress → Resolved).

## How the triage works

`src/lib/triage.ts` is a deterministic multilingual NLP pipeline: keyword and
signal scoring over English, Kannada script, Hindi script and Roman
transliteration, with severity rules (safety signals like sparking wires, burst
pipes and fallen trees score highest; places like schools and hospitals raise
priority). Every decision is explainable — the matched signals are returned with
the result and shown in the UI.

No runtime LLM dependency: the Gemini API key available to the team has zero
free-tier quota for image models and the text models were unavailable/timed out
(verified live during the event), so the product does not depend on a live model
call. The generative-AI tooling for this build is Jarvis / Muse, used throughout
— see `PROMPT_LOG.md` for the full prompt history, which is part of the
submission.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Tickets persist in the browser via localStorage; 8 realistic Bengaluru seed
  tickets ship with the app so the dashboard is meaningful from the first load
- Photos are stored as data URLs (under 800 KB) alongside the ticket

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Limitations (honest)

- Severity and routing are rule-based, not a trained model — a live LLM call
  would improve handling of truly novel phrasing.
- No duplicate detection yet: the same pothole reported twice becomes two
  tickets (flagged as a next step).
- Data lives in the browser (localStorage), not a shared database — a Supabase
  backend is the planned next step.
- Photo analysis is not implemented: the photo is stored and shown, but the
  triage reads the text only.

## Credits

- Starter template: `create-next-app` (Next.js)
- UI conventions: shadcn/ui style, components inspired by 21st.dev
- Fonts: Geist (Next.js)
