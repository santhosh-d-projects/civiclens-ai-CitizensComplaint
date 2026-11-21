# Button Matrix — Citizen track, Civic Glass redesign (2026-11-21)

Only entries that CHANGED in the redesign are listed here. Everything else
keeps the rows in `button-matrix-citizen.md` unchanged (same testids, same
handlers, same API/DB effects). Styling-only changes are noted as such.

Screen | Element | Change in redesign | Handler / API | test id
---|---|---|---|---
/login | Sign-in card | Plain bordered card → `glass-strong` card with gradient logo mark, gradient "Sathi" wordmark, glass pill mode toggle | unchanged | —
/login | Error / info messages | Plain text → tinted banner boxes (`bg-critical-bg` / `bg-low-bg`) with `role="alert"` on errors | unchanged | —
/citizen (layout header) | Header | White bar → sticky frosted-glass header, gradient logo mark | unchanged | —
/citizen (layout nav) | Active nav link | Teal tint → indigo→violet gradient pill; inactive links hover on white glass | unchanged | nav-citizen-home / nav-citizen-report / nav-citizen-complaints / nav-sign-out
/citizen (home) | Stat cards | Plain bordered boxes → `StatCard` glass cards (indigo / green / violet tones) | unchanged, real counts only | NEW: home-stat-open / home-stat-resolved / home-stat-total
/citizen (home) | Recent complaint rows | Plain card → glass card with hover lift | unchanged | home-complaint-<ticket_no>
/citizen (home) | How it works | Plain list → glass card, 3-column numbered steps with gradient number discs | unchanged (static copy) | —
/citizen/report | Stepper | Plain pills → numbered circles with connector, current = gradient, done = teal check | unchanged | report-stepper
/citizen/report step 4 | AI suggestion panel | Plain canvas box → gradient-tinted glass panel (indigo/violet/teal) | unchanged, real confidence from analyze response | —
/citizen/report step 4 | Department radio cards | Plain bordered cards → glass cards; selected = indigo ring; "Suggested by AI" badge = gradient pill | unchanged | report-dept-<id>
/citizen/report step 5 | Review summary | Plain definition list → glass card with divided rows | unchanged | —
/citizen/report step 5 | Duplicate complaint error | NEW UI: when POST /api/complaints returns `{error:{code:"DUPLICATE_COMPLAINT", message, existing_ticket_no, existing_complaint_id}}`, a banner is shown ("This looks like a complaint you already reported.") with a link to the existing complaint. No new ticket is created. Other errors still show the existing inline error. | POST /api/complaints error response only; no new request | NEW: report-duplicate-error / report-duplicate-link
/citizen/complaints | Filter bar | Plain row → glass card wrapping the same GET form | unchanged | complaints-filter-form / complaints-search / complaints-status-filter / complaints-apply-filter
/citizen/complaints | Complaint rows | Plain card → glass card with hover lift | unchanged | complaint-row-<ticket_no>
/citizen/complaints/[id] | Resolution section | Was: shown only when `resolution_note` exists. Now: PROMINENT glass section (teal ring, gradient header band, `complaint-resolution`) shown whenever the complaint is resolved/closed, in progress, or reopened — or a note/photos exist. Resolved: resolution note + after-work photos (`resolution_photo_paths`, signed URLs). In progress: department progress notes from `complaint_events` (real `meta.note` values) + a note that the resolution note and after-work photos appear here once work is done. Resolved with no note: "Marked resolved by <department>". | No new fetch — data already on the complaint row / events loaded by the page | NEW: complaint-resolution
/citizen/complaints/[id] | Progress stages | Teal circles → gradient indigo→violet circles, current stage ringed; connector tinted when done | unchanged | —
/citizen/complaints/[id] | Timeline | Plain left-border list → gradient dots with ring | unchanged | —
/citizen/complaints/[id] | Feedback stars | Teal selected → gradient indigo→violet selected | unchanged | feedback-star-<n>

## Notes
- No voice/mic button exists anywhere in the citizen or login flows (verified by
  grep: no `report-voice`, `SpeechRecognition`, or mic references). The
  "Use voice input" row in the older `button-matrix-citizen.md` is stale — it
  was removed before this redesign, not by it.
- The backend duplicate guard already exists (`03_duplicate_guard.sql` +
  `src/app/api/complaints/route.ts`): an exact duplicate raises
  `DUPLICATE_COMPLAINT:<ticket>:<uuid>` from SQL, mapped to a 409 with
  `{error:{code:"DUPLICATE_COMPLAINT", message, existing_ticket_no,
  existing_complaint_id}}` — exactly the shape the redesigned submit UI
  renders, with a link to the existing complaint. No new ticket is created.
- No fabricated data was added: all counts, confidence values, notes, and
  photos come from the database / analyze response.
