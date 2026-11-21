# BUTTON_MATRIX — Complaint-Sathi (master prompt §9)

Every interactive element on every screen: screen | element | handler | API/DB effect | success UI | error UI | test id. Merged from the three track matrices.


---

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

---

# Button Matrix — Officer track (Complaint-Sathi)

Every interactive element on the officer screens. Columns: screen | element | handler | API/DB effect | success UI | error UI | test id.

## /officer (dashboard)

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| View full queue link | Link | none (navigation) | — | — | `dashboard-view-queue` |
| Complaint row (latest 5) | Link | none (navigation) | — | — | `dashboard-complaint-<ticket_no>` |
| Sign out (sidebar) | `supabase.auth.signOut()` | session cleared | redirect `/login` | stays on page | `officer-sign-out` |

## /officer/complaints (queue)

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| Search input | `onChange` → refetch | GET /api/department/complaints?q= | filtered rows | inline error text | `queue-search` |
| Status filter | `onChange` → refetch | GET …?status= | filtered rows | inline error text | `queue-filter-status` |
| Severity filter | `onChange` → refetch | GET …?severity= | filtered rows | inline error text | `queue-filter-severity` |
| Category filter | `onChange` → refetch | GET …?category_id= | filtered rows | inline error text | `queue-filter-category` |
| Ward filter | `onChange` → refetch | GET …?ward_id= | filtered rows | inline error text | `queue-filter-ward` |
| Sort select | `onChange` → refetch | GET …?sort= | re-ordered rows | inline error text | `queue-sort` |
| Clear filters | resets all filters, page 1 | GET (no params) | full queue | inline error text | `queue-reset-filters` |
| Complaint row | Link | none (navigation) | — | — | `queue-complaint-<ticket_no>` |
| Previous page | page − 1 | GET …?page= | new page | inline error text | `queue-prev-page` |
| Next page | page + 1 | GET …?page= | new page | inline error text | `queue-next-page` |
| Clear filters (empty state) | same as Clear filters | GET (no params) | full queue | inline error text | `queue-empty-clear` |

## /officer/complaints/[id] (detail)

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| Back to queue | Link | none (navigation) | — | — | `detail-back-queue` |
| Citizen photo | Link (new tab) | signed URL (server, 1h) | image opens | — | `detail-photo` |
| Resolution photo | Link (new tab) | signed URL (server, 1h) | image opens | — | `detail-resolution-photo` |
| New status select | `onChange` | none until submit | — | — | `update-status` |
| Note textarea | `onChange` | none until submit | — | — | `update-note` |
| Resolution photo input | file select (≤10MB, ≤5) | none until submit | filenames listed | — | `update-photo` |
| Save update | PATCH /api/department/complaints/[id] | `officer_update_complaint` + complaint_events row; resolution photo upload via POST /api/uploads/sign then PUT | "Update saved — the citizen has been notified." + page refresh | inline error (incl. RESOLUTION_NOTE_REQUIRED) | `update-submit` |

## /officer/profile

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| New password input | `onChange` | none until submit | — | — | `profile-new-password` |
| Confirm password input | `onChange` | none until submit | — | — | `profile-confirm-password` |
| Change password | `supabase.auth.updateUser({password})` | auth user password changed | "Password changed." | inline error | `profile-change-password` |

## /officer/blocked

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| Back to sign in | Link | none (navigation) | — | — | `blocked-go-login` |
| Public portal | Link | none (navigation) | — | — | `blocked-go-home` |

## /officer/accept-invite

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| Create password input | `onChange` | none until submit | strength hint | — | `invite-password` |
| Confirm password input | `onChange` | none until submit | — | "Passwords do not match." | `invite-confirm-password` |
| Terms checkbox | `onChange` | none until submit | enables submit | — | `invite-terms` |
| Complete setup | POST /api/officer/accept-invite | auth password set/created, profile role set, invite marked used, audit OFFICER_CREDENTIALS_ACCEPTED | "Setup complete" + Go to sign in | inline error (INVALID_TOKEN / INVITE_USED / INVITE_EXPIRED) | `invite-submit` |
| Go to sign in (done) | Link | none (navigation) | — | — | `invite-done-login` |

## Layout (all officer desk pages)

| Element | Handler | API/DB effect | Success UI | Error UI | test id |
|---|---|---|---|---|---|
| Dashboard nav | Link | none | — | — | `nav-officer-dashboard` (+ `-mobile`) |
| My Complaints nav | Link | none | — | — | `nav-officer-complaints` (+ `-mobile`) |
| Department Profile nav | Link | none | — | — | `nav-officer-profile` (+ `-mobile`) |
| Sign out | `supabase.auth.signOut()` | session cleared | redirect `/login` | stays on page | `officer-sign-out` |

## Notes

- Officer UI shows only officer navigation (Dashboard, My Complaints, Department
  Profile, Sign out). No Admin navigation and no "Administrator" label anywhere
  (Stitch mock leaked the Admin sidebar — removed).
- Wording: "Update saved — citizen notified" (never "dispatched"); no
  Ombudsman / Aadhaar / Statutory wording anywhere.
- Photo upload (`/api/uploads/sign`) is built by the citizen track; the officer
  UpdateForm accepts either `{signedUrl}` (PUT upload) or `{token}`
  (Supabase `uploadToSignedUrl`) from that endpoint — verify the contract at
  integration time.

---

# Button Matrix — Admin track + public department application

Screen | Element | Handler | API / DB effect | Success UI | Error UI | test id
---|---|---|---|---|---|---
**/admin** | New department button | `router` link | — (navigates) | Opens /admin/departments/new | — | `admin-new-department`
**/admin** | View audit log link | `router` link | — (navigates) | Opens /admin/audit | — | `admin-view-audit`
**/admin** | KPI cards (display only) | — | GET /api/admin/dashboard (read-only) | Counts render | Empty state | `kpi-total-complaints`, `kpi-open-complaints`, `kpi-pending-apps`, `kpi-departments`
**/admin** | Sign out | `supabase.auth.signOut()` | Clears session | Redirect /login | — | `sign-out`
**/admin/departments** | Tab Pending / Approved / Rejected / All | `setTab` + refetch | GET /api/admin/departments?tab=… | Table re-renders | Error banner | `departments-tab-pending`, `departments-tab-approved`, `departments-tab-rejected`, `departments-tab-all`
**/admin/departments** | Approved chips All / Active / Suspended | `setChip` (client filter) | — (filters loaded rows) | Table filters | — | `departments-chip-all`, `departments-chip-active`, `departments-chip-suspended`
**/admin/departments** | Search input | `setQ` + refetch (debounced by typing) | GET /api/admin/departments?q=… | Table filters | Error banner | `departments-search`
**/admin/departments** | Previous / Next | `setPage` | GET …&page=… | Page changes | Error banner | `departments-prev`, `departments-next`
**/admin/departments** | Department row (click) | `setSelectedId` | GET /api/admin/departments/[id] | Review drawer opens | Error banner in drawer | `department-row-<id>`
**/admin/departments** | + Create department | `router` link | — (navigates) | Opens /admin/departments/new | — | `departments-new`
**Review drawer** | Document verify checkbox | POST …/documents/[docId]/verify {verified} | `department_documents.verified_by/at` + audit DOCUMENT_VERIFIED | Checkbox state + counts update | Error banner | `doc-verify-<docId>`
**Review drawer** | Approve | POST …/approve | `transition_department` → approved + audit | Toast “Department approved…” | Error banner | `dept-approve`
**Review drawer** | Request changes | Modal → POST …/request-changes {reason} | `transition_department` → changes_requested + audit + resubmit token | Toast + token panel | Error banner / modal validation | `dept-request-changes`, `dept-reason-input`, `dept-reason-confirm`
**Review drawer** | Reject | Modal → POST …/reject {reason} | `transition_department` → rejected + audit | Toast “Department rejected.” | Error banner / modal validation | `dept-reject`, `dept-reason-input`, `dept-reason-confirm`
**Review drawer** | Copy resubmission token | `navigator.clipboard` | — | Token copied | — | `copy-resubmit-token`
**Review drawer** | Activate & send officer invite | POST …/activate {confirmation:"ACTIVATE"} | `transition_department` → active (enforces docs verified + officer + maker-checker) + officer invite issued (SHA-256 stored, 48h) | Toast + invite link panel | Error banner (e.g. DOCUMENTS_NOT_VERIFIED) | `dept-activate`, `dept-activate-confirm`
**Review drawer** | Copy invite link | `navigator.clipboard` | — | Link copied | — | `copy-invite-url`
**Review drawer** | Suspend | Modal → POST …/suspend {reason, targetDepartmentId?} | `suspend_department` (atomic transfer) + officer sessions revoked | Toast “Department suspended…” | Error banner (TARGET_REQUIRED / TARGET_DOES_NOT_COVER) | `dept-suspend`, `dept-suspend-reason`, `dept-suspend-target`, `dept-suspend-confirm`
**Review drawer** | Deactivate | Modal → POST …/deactivate {reason} | `transition_department` → deactivated + sessions revoked | Toast | Error banner | `dept-deactivate`, `dept-reason-input`, `dept-reason-confirm`
**Review drawer** | Reactivate | Modal → POST …/reactivate {reason} | `transition_department` suspended → active | Toast | Error banner | `dept-reactivate`, `dept-reason-input`, `dept-reason-confirm`
**Review drawer** | Close (× / Esc / backdrop) | `onClose` | — | Drawer closes | — | `department-review-drawer`
**/admin/departments/new** | Stepper Next / Back | `setStep` | — | Step changes (validated) | — | `new-dept-next`, `new-dept-back`
**/admin/departments/new** | Category / ward chips | toggle select | — | Chip selected | — | `new-dept-category-<slug>`, `new-dept-ward-<id>`
**/admin/departments/new** | Document file input | POST /api/uploads/sign → uploadToSignedUrl | File → `department-docs` bucket | File listed | Error banner | `new-dept-documents`
**/admin/departments/new** | Save draft | POST /api/admin/departments {submit:false} | Department draft + wards/categories/officer/docs + audit DEPARTMENT_CREATED | Redirect /admin/departments | Error banner | `new-dept-save-draft`
**/admin/departments/new** | Submit for review | POST /api/admin/departments {submit:true} | As above + `transition_department` → pending | Redirect /admin/departments | Error banner (DUPLICATE 409) | `new-dept-submit`
**/admin/complaints** | Search / status / severity / department filters | refetch | GET /api/admin/complaints?… (read-only) | Table filters | Error banner | `admin-complaints-search`, `admin-complaints-status`, `admin-complaints-severity`, `admin-complaints-department`
**/admin/complaints** | Previous / Next | `setPage` | GET …&page=… | Page changes | Error banner | `admin-complaints-prev`, `admin-complaints-next`
**/admin/complaints** | Complaint row (click) | GET /api/admin/complaints/[id] | Read-only detail + timeline | Detail drawer opens | — | `admin-complaint-row-<ticket>`
**/admin/complaints** | Drawer close | `onClose` | — | Drawer closes | — | `admin-complaint-drawer`
**/admin/audit** | Verify full chain | GET /api/admin/audit/verify-chain | `verify_audit_chain()` | Badge “Chain verified — no broken rows” / broken seq | — | `audit-verify-chain`, `audit-chain-status`
**/admin/audit** | Sign pending rows | POST /api/admin/audit/sign | `signAuditRows()` (Ed25519) | “Signed N pending row(s).” | Error message | `audit-sign-pending`
**/admin/audit** | Action / entity / date / search filters | refetch | GET /api/admin/audit?… | Table filters | Error banner | `audit-filter-action`, `audit-filter-entity`, `audit-filter-from`, `audit-filter-to`, `audit-search`
**/admin/audit** | Previous / Next | `setPage` | GET …&page=… | Page changes | Error banner | `audit-prev`, `audit-next`
**/admin/audit** | Inspect | GET /api/admin/audit/[seq]/verify | `verify_audit` + Ed25519 check | Forensic drawer opens | Error banner | `audit-inspect-<seq>`
**Forensic drawer** | Chain badge (display) | — | Verification result | “Chain verified” / “Tampered” | — | `audit-chain-badge`
**Forensic drawer** | Copy signature | `navigator.clipboard` | — | “Copied ✓” | — | `audit-copy-signature`
**Forensic drawer** | Re-verify | GET /api/admin/audit/[seq]/verify | Re-runs hash + signature checks | Receipt refreshes | Error banner | `audit-reverify`
**Forensic drawer** | Export JSON | GET /api/admin/audit/[seq]/export | JSON download | File downloads | — | `audit-export-json`
**/admin/analytics** | Charts (display only) | — | GET /api/admin/analytics (read-only) | Charts render | “No complaints yet.” | —
**/apply-department** | Stepper Next / Back | `setStep` | — | Step changes (validated) | — | `apply-next`, `apply-back`
**/apply-department** | Category / ward chips | toggle select | — | Chip selected | — | `apply-category-<slug>`, `apply-ward-<id>`
**/apply-department** | Document file input | POST /api/uploads/sign → uploadToSignedUrl | File → `department-docs/applications/…` | File listed | Error banner | `apply-documents`
**/apply-department** | Submit application for review | POST /api/departments/apply | Department pending + officer + docs + audit DEPARTMENT_APPLIED (honeypot + rate limit + duplicate 409) | Acknowledgement screen | Error banner | `apply-submit`
**/apply-department** | Return to portal | `router` link | — | Opens / | — | `apply-done-home`

## Notes
- No dead controls: every button above has a handler and a real effect. Admin has no assign/route/override control on any complaint (by design — read-only registry).
- The `Jurisdictions & Setup` sidebar item from the mock has no route in the spec and is not built; wards/categories are managed via the seed data.
- The officer invite acceptance page (`/officer/accept-invite`) is the officer track's build; the admin track only issues the invite token (activate API).
