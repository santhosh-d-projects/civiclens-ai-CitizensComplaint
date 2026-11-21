# Button matrix — Admin + Public redesign (Civic Glass, 21 Nov 2026)

Redesign-only change set: JSX/classNames/layout. No handler, fetch URL,
route, prop, validation, or data-flow change. Every `data-testid` below is
unchanged from the pre-redesign build unless marked NEW.

## Unchanged (verified by testid diff vs the pre-redesign tree)

- Public landing: `nav-login`, `cta-report`, `cta-track`.
- Apply wizard: all 17 testids (`apply-name`, `apply-description`,
  `apply-category-*`, `apply-ward-*`, `apply-applicant`, `apply-email`,
  `apply-phone`, `apply-officer-name`, `apply-officer-email`,
  `apply-officer-phone`, `apply-documents`, `apply-doc-remove-*`,
  `apply-affirm`, `apply-back`, `apply-next`, `apply-submit`,
  `apply-done-home`).
- Admin nav: `admin-nav-dashboard|departments|complaints|audit|analytics`
  and the `-mobile` variants (moved into the new `AdminNav` client
  component; rendered testids identical). `sign-out` unchanged; the mobile
  header now uses the light `tone="light"` variant (was invisible white on
  white before — styling fix, same testid and handler).
- Admin dashboard: `admin-new-department`, `kpi-total-complaints`,
  `kpi-open-complaints`, `kpi-pending-apps`, `kpi-departments`,
  `admin-view-audit`.
- Departments: `departments-new`, `departments-tab-pending|approved|
  rejected|all`, `departments-chip-all|active|suspended`,
  `departments-search`, `department-row-*`, `departments-prev|next`.
  (Tabs/chips now render through the shared `Chip` component — the
  `data-testid` attribute in the DOM is unchanged.)
- Review drawer: `department-review-drawer`, `duplicate-warning`,
  `doc-verify-*`, `dept-approve`, `dept-request-changes`, `dept-reject`,
  `dept-activate-confirm`, `dept-activate`, `dept-suspend`,
  `dept-deactivate`, `dept-reactivate`, `copy-resubmit-token`,
  `copy-invite-url`, `dept-reason-modal`, `dept-reason-input`,
  `dept-reason-cancel`, `dept-reason-confirm`, `dept-suspend-modal`,
  `dept-suspend-reason`, `dept-suspend-target`, `dept-suspend-cancel`,
  `dept-suspend-confirm`.
- New department form: all `new-dept-*` testids unchanged.
- Admin complaints (read-only): `admin-complaints-search|status|severity|
  department`, `admin-complaint-row-*`, `admin-complaints-prev|next`,
  `admin-complaint-drawer`. No assign/route/override controls exist, before
  or after the redesign.
- Audit: `audit-verify-chain`, `audit-sign-pending`, `audit-chain-status`,
  `audit-filter-action|entity|from|to`, `audit-search`,
  `audit-inspect-*`, `audit-prev|next`, `audit-forensic-drawer`,
  `audit-chain-badge`, `audit-copy-signature`, `audit-reverify`,
  `audit-export-json`. Forensic drawer keeps every field (event ID, UTC/IST
  time, actor+role, IP/device, old→new, justification, Ed25519 certificate,
  verification receipt, Re-verify, Export JSON).
- Analytics: no testids on this page before or after.

## New testids (additive, landing portal cards only)

- `portal-report` → /citizen/report
- `portal-track` → /citizen/complaints
- `portal-apply` → /apply-department
- `portal-officer` → /login

## Deliberately not changed

- No button, tab, filter, drawer, modal, chart, or form was removed.
- No fabricated numbers from the reference screens were used (no 94.8%
  SLA, 198 wards, 45,000 resolved, 98.4% routing accuracy, ISO/Aadhaar/
  law wording). All counts come from the existing DB queries.
- No voice/mic button anywhere.
