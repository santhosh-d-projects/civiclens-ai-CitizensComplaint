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
