# Button Matrix — Citizen track

Screen | Element | Handler | API / DB effect | Success UI | Error UI | test id
---|---|---|---|---|---|---
/citizen (home) | Report an issue button | Link → /citizen/report | none | navigates | — | home-report-cta
/citizen (home) | View all link | Link → /citizen/complaints | none | navigates | — | home-view-all
/citizen (home) | Complaint card | Link → /citizen/complaints/[id] | none | navigates | — | home-complaint-<ticket_no>
/citizen (home) | Report an issue (empty state) | Link → /citizen/report | none | navigates | — | home-empty-report
/citizen (layout nav) | Home | Link → /citizen | none | navigates | — | nav-citizen-home
/citizen (layout nav) | Report an issue | Link → /citizen/report | none | navigates | — | nav-citizen-report
/citizen (layout nav) | My complaints | Link → /citizen/complaints | none | navigates | — | nav-citizen-complaints
/citizen (layout nav) | Sign out | supabase.auth.signOut() → /login | ends session | redirects to /login | stays on page | nav-sign-out
/citizen/report step 1 | Use voice input | browser SpeechRecognition → appends transcript to description | none (on-device browser API) | text appears in description | alert if unsupported | report-voice
/citizen/report step 1 | Continue to photos | step 1 → 2 (disabled until description ≥ 10 chars) | none | step 2 shown | inline hint | report-next-1
/citizen/report step 2 | Add photos | opens file picker (image/*, ≤5, ≤10 MB each) | none yet | picker opens | — | report-add-photos
/citizen/report step 2 | Photo picked | POST /api/uploads/sign → uploadToSignedUrl | file stored in private bucket `complaint-photos` | thumbnail shows "Uploaded" | per-photo error text | report-photo-input
/citizen/report step 2 | Remove photo (×) | removes from list, revokes preview URL | none (already-uploaded file is simply not submitted) | thumbnail removed | — | report-remove-photo
/citizen/report step 2 | Back / Continue | step 2 → 1 / 3 | none | step shown | — | report-back-2 / report-next-2
/citizen/report step 3 | Ward select | sets ward_id | none | — | — | report-ward
/citizen/report step 3 | Address input | sets address | none | — | — | report-address
/citizen/report step 3 | Use my current location | navigator.geolocation | none (coords attached to submission) | "Location attached: lat, lng" | inline error, ward+address still work | report-gps
/citizen/report step 3 | Analyse my complaint | step 3 → 4, POST /api/complaints/analyze | ai_analysis_log row (metadata only) | suggestion panel | inline error + Try again | report-next-3
/citizen/report step 4 | Try again (analysis) | re-runs POST /api/complaints/analyze | ai_analysis_log row | suggestion panel | inline error | report-retry-analysis
/citizen/report step 4 | Category select | changes category_slug for submission | none yet | — | — | report-category
/citizen/report step 4 | Department radio | sets department_id (default = AI suggestion when confidence ≥ 0.5; no default when < 0.5) | none yet | selected card highlighted | — | report-dept-<id>
/citizen/report step 4 | Back / Review & submit | step 4 → 3 / 5 (disabled until analysis + department chosen) | none | step shown | — | report-back-4 / report-next-4
/citizen/report step 5 | Confirm department & submit complaint | POST /api/complaints (create_complaint: re-validates dept active + covers ward + category, sets SLA) | complaint row + complaint_events 'submitted' | redirects to /citizen/complaints/[id] | inline error | report-submit
/citizen/report step 5 | Back | step 5 → 4 | none | step shown | — | report-back-5
/citizen/complaints | Search input + status select + Apply | GET form → /citizen/complaints?q&status (server query, RLS own) | none | filtered list | — | complaints-search / complaints-status-filter / complaints-apply-filter
/citizen/complaints | Report an issue button | Link → /citizen/report | none | navigates | — | complaints-new
/citizen/complaints | Complaint row | Link → /citizen/complaints/[id] | none | navigates | — | complaint-row-<ticket_no>
/citizen/complaints | Previous / Next page | Link with ?page= | none | paged list | — | complaints-prev-page / complaints-next-page
/citizen/complaints/[id] | Feedback stars 1–5 | sets rating | none yet | star highlighted | — | feedback-star-<n>
/citizen/complaints/[id] | Feedback comment | sets comment | none yet | — | — | feedback-comment
/citizen/complaints/[id] | Submit feedback | POST /api/complaints/:id/feedback | complaint_events row (event 'feedback') | "Thanks for your feedback." | inline error | feedback-submit
/citizen/complaints/[id] | Report it as not fixed (reopen) | shows confirm | none | confirm buttons | — | reopen-start
/citizen/complaints/[id] | Yes, reopen | POST /api/complaints/:id/reopen | status → 'reopened' + 'reopened' event | page refreshes, status Reopened | inline error | reopen-confirm
/citizen/complaints/[id] | Cancel (reopen) | hides confirm | none | — | — | reopen-cancel

## Login (updated 2026-11-21 ~12:20 — email + password is the primary flow)
| /login | Password tab (default) | setMode("password") | — | password form | — | login-mode-password |
| /login | Email code tab | setMode("otp") | — | OTP form | — | login-mode-otp |
| /login | Sign in | signInPassword() | Supabase signInWithPassword → /api/me role route | portal redirect | inline error | login-signin |
| /login | Create an account | setAuth("signup") | — | sign-up form (email + password + confirm) | — | login-goto-signup |
| /login | Create account (submit) | signUp() | supabase.auth.signUp; session → route, else "check your email" | portal redirect or confirm info | inline error (short/mismatch/supabase) | login-signup |
| /login | Sign in (back link) | setAuth("signin") | — | sign-in form | — | login-goto-signin |
