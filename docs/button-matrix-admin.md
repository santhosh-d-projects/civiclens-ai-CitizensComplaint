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
