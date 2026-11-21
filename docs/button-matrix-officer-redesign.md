# Button matrix — Officer redesign (Civic Glass, 21 Nov 2026)

Redesign of the officer pages (`src/app/officer/**`) to the Civic Glass design
system. **Styling only: no button-matrix entries changed.** Every interactive
element keeps its original `data-testid`, label, handler, route, and behaviour;
no element was added, removed, renamed, or reordered. Verified by grep over
`src/app/officer/`: all 38 `data-testid` occurrences from the pre-redesign
files are present (34 static + 4 dynamic: nav items, dashboard/queue
complaint links, KPI testids now passed as `testId` props into `StatCard`,
which renders them as `data-testid`).

## Visual-only additions (no new interactive elements)
- `AcceptInviteForm`: a 4-segment password-strength bar under the password
  field. It is `aria-hidden`, renders only from the existing `strength()`
  checks (`s.checks.length`), and adds no button, field, or testid.
- Officer desk sidebar: dark glass (`glass-dark`, midnight) with a gradient
  "CS" monogram and gradient department-initial avatar. Navigation is still
  Dashboard / My Complaints / Department Profile / Sign out only — no Admin
  navigation, no "Administrator" label.
- `loading.tsx`-style skeletons in the queue reuse the existing
  `data-testid="queue-loading"` container.

## Unchanged (verified)
- Resolution workflow: `update-status` select, `update-note` textarea
  (required when resolving), `update-photo` upload (signed URL, max 5,
  10MB each), `update-submit` — same PATCH payload and flow.
- Queue: search, all five filters, sort, pagination, reset — same API params.
- Dashboard KPIs, profile read-only fields, password change, blocked-screen
  variants (incl. suspended transfer list), invite accept/terms/done flow.

## Verification
- `npx tsc --noEmit` → 0 errors.
- `npx vitest run` → 8 files, 43 tests, all passing.
