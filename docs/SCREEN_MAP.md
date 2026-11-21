# SCREEN_MAP.md — Complaint-Sathi Stitch export → Next.js routes

Source: `stitch/stitch_complaint_sathi_civic_portal/` — 11 screen folders, each with
`code.html` (static Tailwind mock, no working buttons) and `screen.png`, plus two
design systems (`civic_precision/DESIGN.md`, `civic_dignity/DESIGN.md`).
DB tables named below are from `01_supabase_schema.sql` (+ `02_additions.sql`).

## Design-system split (must be unified in the build)

The export mixes two systems. Do not mix them in the app — pick one and re-skin the
other system's screens to it. (Master prompt: "keep the teal design system from
DESIGN.md".)

| | Civic Precision (7 screens) | Civic Dignity (4 screens) |
|---|---|---|
| Screens | public portal, apply-department, officer invite, live tracker, operations command, report-an-issue, admin audit | citizen home, create-department form, governance approvals, officer queue |
| Font | Geist (display/headline/body); JetBrains Mono for IDs, dates, SLA timers | Inter only (400/500/600/700) |
| Primary | Navy `#001D36` / `#17324D`; teal `#006874` / `#087F8C` | Deep teal `#0F3D3E`; accent teal `#1F7A7A` |
| Canvas / surface | `#F6F8FA` / `#FFFFFF`, border `#E2E8F0` | `#F4F6F8` / `#FFFFFF`, border `#E5E7EB` |
| Radii | 4px controls, 8px cards, 12px overlays, pill badges | 8px controls, 16px cards, 24px mobile sheets, pill chips |
| Icons | Material Symbols Outlined in every mock | Same mocks; DESIGN.md prescribes 1.5–2px outline icons (Lucide/Feather/Heroicons lineage), no emojis |

Severity/status tints differ slightly between the two files; the values in
§Shared components are the union — normalise to one set at build time.

## Global wording fixes (apply to every screen)

Per product rules: **AI suggests, citizen confirms, Admin never routes complaints.**
Admin approves/activates departments; suspension/deactivation transfers complaints
only via the explicit Admin-chosen target (`suspend_department`).

- **Ombudsman** — remove as institution/brand everywhere: "Civic Ombudsman Portal /
  Platform", "Chief Ombudsman Office", "Ombudsman Grievance Intake Portal",
  "Civic Ombudsman Desk", "Request Ombud Escalation", "NIC Certified Ombudsman
  Gateway", "ombudsman-grid@karnataka.gov.in", "activation by the Chief Ombudsman".
  Replace with Complaint-Sathi / Admin as approver ("approved and activated by an
  administrator").
- **Auto-routing / auto-assignment / dispatch** — remove: "auto-routes", "auto-routed",
  "auto-assigned", "Auto-Assigned Field Unit", "Direct dispatch", "Analyze & Dispatch
  Ticket", "Ticket … Dispatched", "auto-migrated", "Automated Redirections",
  "routing established automatically", "Dispatched via Automated Incident Grid",
  "Emergency Dispatch", "field crew dispatch". Replace with: AI suggests a department
  (active + covers ward + category) → citizen confirms → ticket is created.
  ("Dispatch"/"sent" for an *email/SMS invite or notification* is acceptable.)
- **Aadhaar** — remove everywhere: "Authenticated via Aadhaar OTP", "Aadhaar/OTP
  verified only at final signoff", "Verified Aadhaar", "Officer Official Mobile
  (Aadhaar / OTP Tied)". Citizen verification is email OTP; officer verification is
  official email + mobile OTP.
- **Statutory / named laws** — remove: "Statutory …" as a qualifier (Statutory
  Routing, Statutory SLA, Statutory Audit Trail, Statutory Accreditation, Statutory
  Invite, Statutory Cyber Hygiene Policy, Statutory Public Covenant, Statutory
  Grievance Redressal Mechanism), and named laws: "Section 14(b) Civic
  Accountability Act", "Karnataka Sakala Guarantee Services Act", "Public Service
  Guarantee Act", "Municipal Corporation Act", "Karnataka Municipal Corporations
  Act (1976)", "KMSSA / Karnataka Municipal Service Standards Act", "RTI mandate",
  "Transparency Act 2024", "Right to Public Service Act", "IS 15700:2018 Sevottam
  Grid". "Sakala" (incl. "Sakala SLA") — remove; SLA is product-defined.
- **Fabricated metrics / overclaims** — the mocks' numbers are demo data, not real:
  "Classification Precision 94.2%", "Grievances Redressed 18,400+", "1,482
  complaints", "SLA Resolution 94.2%", "Triage Latency: 420ms", "98% match" (keep
  match % only as the AI suggestion confidence, labelled as such). Remove or label
  as demo data. Remove AI overclaims: "AI matches before/after frames", "Dual-
  photographic sign-off", "End-to-End Cryptographic Audit" (citizen-facing claim
  should be "every action is logged in a tamper-evident audit trail"), "Zero Bribe
  Shield", "Zero bureaucratic delays".

## 1. `complaint_sathi_public_portal` — Public landing

- **Portal / route:** Public — `/`
- **Purpose:** Marketing/landing + public intake entry point + live ward grid and
  incident stream.
- **Sections:** Top nav (Complaint-Sathi, Public Portal, Citizen Desk, Track Status,
  Municipal Network: Live, "Officer V. Sharma — Ombudsman" profile chip); hero
  ("Your City. Your Voice. Real Action." + "Report an Issue (Instant AI Triage)" +
  Track); "Live AI Intake Demonstration" (audio sample, category, severity,
  auto-assigned unit, SLA timer, geo-deduplication); KPI band (Critical SLA,
  Grievances Redressed, Multilingual Ingestion); "Automated Governance Pipeline"
  (Multimodal Ingestion, AI Triage & Deduplication, Statutory Routing & SLA,
  Proof-of-Work Verification); "Live Municipal Network" ward grid (W-01…W-08 with
  active counts + status); "Live Resolution Queue" (ticket rows with status/SLA);
  "Comprehensive Municipal Integration" department coverage cards (Public Works,
  Jal Board, Electricity, Solid Waste, Health & Vector + Avg SLA); "Instant Civic
  Intake & AI Routing Assistant" form (description, ward/landmark, photo upload,
  "Analyze & Dispatch Ticket", result "Ticket #CS-9912 Dispatched"); "Statutory
  Public Covenant" strip; helpline footer (1800-CIVIC-SATHI, WhatsApp bot, Dial 112).
- **Data needed:** `departments` (active only, for coverage cards + Avg SLA is demo
  data), `wards` (grid + counts), `complaints` (public-safe fields only: id,
  category, ward, status, severity — no citizen PII) for live queue/stream.
- **Wording fixes:** "Civic Ombudsman Platform"; "Ombudsman" profile label; "Auto-
  Assigned Field Unit"; "Direct dispatch to the on-duty Junior Engineer";
  "Statutory Routing & SLA"; "Statutory Escalation to Commissioner"; "Analyze &
  Dispatch Ticket"; "Ticket #CS-9912 Dispatched to Municipal Unit"; "Statutory
  Public Covenant"; "Right to Public Service Act"; "Statutory redressal legally
  enforceable…"; "Aadhaar/OTP verified only at final signoff"; "Statutory
  Grievance Redressal Mechanism"; "Zero Bribe Shield"; "Direct digital routing
  eliminates middlemen"; "No officer can close a ticket without … dual
  photographic confirmation" (overclaim — closure requires citizen confirmation
  per spec); "Complaint-Sathi directly integrates into municipal ERPs …
  emergency contractor dispatch lines"; "supply tanker dispatch" (department
  card copy). The intake form here duplicates `/citizen/report` — in the build it
  should link to `/citizen/report` (login) rather than submit anonymously, or be
  kept as a public demo only.
- **Status in export:** exists as mock. Note: the mock's left nav is a combined
  shell (Public Landing, Citizen Dashboard, Report an Issue, Complaint Tracker,
  Operations Queue, City Geospatial Map, AI Intelligence Centre, Resolution
  Verification) that mixes all portals — replace with the public nav.

## 2. `citizen_home_ai_complaint_intake` — Citizen home

- **Portal / route:** Citizen — `/citizen`
- **Purpose:** Logged-in citizen home: greeting, active case, AI intake
  confirm-department step, ward pulse stats, bottom nav.
- **Sections:** Header (Complaint-Sathi, "Bengaluru Mahanagara", notifications,
  citizen name "Namaskara, Ananya Sharma", "Verified Mobile: +91 98450-XXXXX",
  location "Indiranagar, Ward 112", GPS Lock, 24×7 Helpline 1533); "Fast Civic
  Action / Report Municipal Issue" card; category quick actions (Potholes & Roads
  — BBMP Infra; Water & Sewerage — BWSSB Desk; Garbage & Waste — SWM Division;
  Streetlights & Power — BESCOM Field); "Active Grievance Tracker" (1 live case
  BLR-2024-9104, 4-step progress Submitted → Received → In progress → Resolved,
  assigned unit, resolution target, "Message Officer"); "Confirm Department —
  AI suggests a department, you confirm (Step 4 of 4)" card (description,
  issue type, department selection list with "Suggested by AI 98% match",
  "Department active & covers Indiranagar Ward 112 for Drainage & Sewage",
  "Change department (Active departments only)", location + photo, "Submit
  complaint", "Verified via OTP…"); "Ward 112 Redressal Pulse" (SLA Met 94%,
  Avg Triage 3.4h, Teams Duty); bottom nav (Home, Complaints, Report, Ward Map,
  Profile).
- **Data needed:** `profiles` (citizen), `complaints` (own, by `citizen_id`) for
  active tracker, `departments` (active + covering ward + category) for the
  suggestion list, `categories`, `wards` (pulse stats — demo data in mock).
- **Wording fixes:** "AI auto-routes directly to on-duty field engineers with
  photo geotagging." → AI suggests; citizen confirms. ("AI suggests a department,
  you confirm" and "Change department (Active departments only)" are already
  correct — keep.)
- **Status in export:** exists as mock. "Ward Map" bottom-nav item has **no route**
  in the route list — fold into `/citizen` or drop (button-matrix decision).

## 3. `report_an_issue_with_ai_triage` — Report a complaint

- **Portal / route:** Citizen — `/citizen/report`
- **Purpose:** 4-step complaint wizard with live AI triage.
- **Sections:** Left nav (same combined shell as §1 — replace with citizen nav);
  "Ombudsman Grievance Intake Portal", Session ID, privacy strip; Stepper
  (01 Description & Speech, 02 Evidence & Photos, 03 Precise Ward Location,
  04 Live Triage); Step 01: multilingual description + voice note
  (Hindi example text, dialect match, retake, on-device translation);
  Step 02: photo evidence + EXIF verification (GPS coords, "AI Computer Vision
  identifies…", upload/drag-drop, JPG/PNG/HEIC ≤10MB); Step 03: ward pin
  ("Use Current GPS", "Auto-Resolved Address Line", landmark); Step 04 / AI
  Triage panel (Confidence 98.4%, Critical Severity, Priority Tier 1, detected
  language, "Target Routing Agency", "Statutory Response SLA — Under 02 Hours",
  "Duplicate Incident Consolidation — 2 similar reports detected within 200m;
  merging into priority cluster"); actions "Confirm & Submit to Emergency
  Dispatch" / Edit Details / Save as Draft; footer "Audited under State Civic
  Ombudsman Charter & Transparency Act 2024"; "Direct Ward 7 Control Room"
  + Request Callback.
- **Data needed:** `categories`, `wards` (ward pin + address resolution),
  `departments` (active, covering ward + category — suggestion list only),
  AI triage API (returns category, severity + reason, confidence, duplicate
  candidates), storage buckets (`complaint-photos` etc.) for evidence upload,
  `ai_analysis_log` for the suggestion record.
- **Wording fixes:** "Ombudsman Grievance Intake Portal"; "Statutory Response
  SLA"; "Audited under State Civic Ombudsman Charter & Transparency Act 2024";
  "Confirm & Submit to Emergency Dispatch" → "Confirm department & submit
  complaint"; "Duplicate Incident Consolidation … merging into priority
  cluster" → duplicates are a *suggestion* shown to the citizen, never an
  automatic merge; "Target Routing Agency" → "Suggested department".
  Mock uses Delhi coords (Lat 28.6139° N, Long 77.2090° E) and "Ward 7" — reseed
  to Bengaluru wards.
- **Status in export:** exists as mock.

## 4. `live_complaint_tracker_progress_timeline` — Complaint detail / tracker

- **Portal / route:** Citizen — `/citizen/complaints/[id]`
- **Purpose:** Public/citizen tracking page for one complaint: status timeline,
  assigned crew, evidence, verified audit timeline, citizen actions.
- **Sections:** Left nav (combined shell — replace); "Track Grievance Status &
  SLA Audit" + search box + recent lookups (#CS-8924…); L1 header (Critical,
  "Severe Main Pipeline Burst & Street Inundation", Ward 7 MG Road Crossing,
  assigned department, assigned field engineer, target/SLA, "Crew Live
  Geo-Telemetry", field log feed); "Verified Audit Timeline" (Complaint
  Submitted → AI Assessment & Duplicate Merge → Dispatched to Water Supply
  Division → Emergency Repair Crew Dispatched → Resolution Evidence → Citizen
  Verification & Ticket Closure); "Incident & Site Evidence" (2 records);
  "Field Crew Telemetry Diagnostic"; "Citizen Action Desk" (SMS/WhatsApp
  alerts, submit additional photo/audio, "Request Ombud Escalation — Locked",
  Post-Resolution Audit: Confirm Fix / Report Incomplete); "Civic Ombudsman
  Desk" helpline.
- **Data needed:** `complaints` (one row + `complaint_events` timeline),
  `departments`, `department_officers` (assigned field engineer — mock shows a
  named engineer; only show what the spec exposes), `audit_log` (verified
  timeline entries), storage (evidence photos), `complaint_transfers` (if any).
- **Wording fixes:** "Statutory Public Grievance Tracking Engine"; "Authenticated
  via Aadhaar OTP OTP-9941" (remove Aadhaar; show "Verified via email OTP" or
  nothing); "Auto-routed to Central Jal Board control room"; "Emergency Repair
  Crew Dispatched & Arrived On-Site" / "Cryptographically signed civic dispatch
  events"; "Request Ombud Escalation"; "Protected by State Public Services
  Guarantee Charter"; "48-hour automated escalation window". "Merged Duplicates:
  #CS-8925, #CS-8927" — duplicates are merged only per spec rules; do not
  present auto-merge as a fact without the underlying rule.
- **Status in export:** exists as mock. The search/lookup header doubles as the
  entry point for `/citizen/complaints` list — the list itself is **not** mocked
  (see Missing screens).

## 5. `department_officer_operations_queue` — Officer desk + queue

- **Portal / route:** Officer — `/officer` (desk home / queue); embedded ticket
  detail panel maps to `/officer/complaints/[id]`
- **Purpose:** Officer duty desk: KPIs, grievance inflow queue, ticket detail with
  status update, internal notes, resolution photo, mark resolved.
- **Sections:** Header "Gov Municipal Portal"; **sidebar (LEAK — see below)**;
  "Department Officer Desk — BWSSB", "Rapid Response Cell — Wards 140–155",
  officer on duty (Er. Rajeshwari Devi, AEE, Duty Shift A 08:00–17:00 IST);
  KPI cards (New — Assigned to BWSSB, In Progress, Overdue/High Urgency,
  Resolved This Month 342, Citizen Satisfaction 96.4%); "Grievance Inflow Queue"
  filters (urgency, ward, status) + table (Ticket ID, Citizen Details, Issue &
  Ward, SLA Window, Assigned Tech, Action) — 42 active records; ticket detail
  panel (Ticket #BW-8924: full text, complainant, contact "(Verified via OTP)",
  landmark, geotagged photo evidence, "Update Status — In Progress (Crew
  On-Site)", "Internal Department Notes", "Upload Resolution Photo Proof",
  "Mark Resolved & Notify Citizen", success state "Action Dispatched
  Successfully — Resolution proof registered. OTP dispatched to citizen.");
  "Rapid Crew Availability" side panel.
- **Data needed:** `departments` (own department + status — guard: non-active →
  `/officer/blocked`), `department_officers` (on-duty officer), `complaints`
  (assigned to own department; filters by urgency/ward/status), `wards`,
  `categories`, `complaint_events` (status updates), storage (resolution photo).
- **Wording fixes:** "Official portal for grievance resolution and field crew
  dispatch in Bangalore South Wards" → drop "dispatch"; "Action Dispatched
  Successfully" → "Update saved — citizen notified"; "Resolution proof
  registered. OTP dispatched to citizen." → "…notification sent to citizen."
  "Pending Assign" as a status is fine (officer-side assignment within the
  department is allowed; it is not Admin routing).
- **⚠️ Officer UI shows Admin navigation (must fix):** the mock's sidebar is the
  **Admin** sidebar — "Admin Overview, Department Approval, All City Complaints,
  Audit & Compliance, City Analytics, Jurisdictions & Setup" — and the header
  shows "Administrator - Gov Level 1" / "Shri R. Venkatraman, IAS / Chief
  Ombudsman Office". Officer UI must show only officer navigation (Officer Desk,
  Complaints, Profile, Sign out) and the officer's own identity/department.
- **Status in export:** exists as mock (with the leak above).

## 6. `operations_command_priority_queue` — Admin complaints registry

- **Portal / route:** Admin — `/admin/complaints`
- **Purpose:** Read-only, city-wide complaints monitoring for Admin: KPIs, filters,
  registry table, complaint detail drawer.
- **Sections:** Left nav (combined shell — replace with admin nav); "City
  Grievances Monitoring (Read-Only)" + Live Stream + Auto-syncing (3s) +
  Export CSV; **"Admin Monitoring Mode" banner — already correct wording:**
  "Complaints are routed by citizen confirmation based on AI suggestions. Admin
  accounts monitor city-wide performance and do not manually route or dispatch
  individual complaints." (Keep as the model for the rule.); KPI cards (Total
  Complaints 1,482, In Progress, Field Crews Active, Resolved 1,325 — 89.4%,
  Avg. Resolution Time 4.2h); filters (date, wards, department, urgency/status);
  "Complaints Registry (Read-Only)" table (Ticket ID, Citizen, Department,
  Category, Ward, Status, Urgency, Submitted At) with pagination; detail panel
  (CRITICAL, "Aadhaar Verified", Read-Only Audit, SLA, Citizen Submission quote,
  "AI Suggestion & Routing Log — Citizen Confirmed", "Assigned Active
  Department", "Current Progress Timeline & Field Logs", "Citizen Confirmation &
  Auto-Routing", "Complaint Logged via Phone IVR", "Citizen Photographic
  Evidence").
- **Data needed:** `complaints` (all, read-only), `departments`, `wards`,
  `categories`, `complaint_events`, `ai_analysis_log` (suggestion + citizen
  confirmation record), `audit_log` (read-only audit line).
- **Wording fixes:** "Verified Aadhaar" / "Aadhaar Verified" (twice) — remove;
  "Field Officer: Eng. D. Verma · Dispatched via Automated Incident Grid" →
  drop "Dispatched via Automated Incident Grid"; "Citizen Confirmation &
  Auto-Routing" → "Citizen Confirmation"; "department routing established
  automatically" → "department confirmed by citizen". KPI counts are demo data.
- **Status in export:** exists as mock. The detail panel is the model for the
  admin complaint detail drawer — wire it as a Drawer (see §Shared components),
  not a separate page.

## 7. `department_governance_approvals` — Admin departments

- **Portal / route:** Admin — `/admin/departments`
- **Purpose:** Approve / request-changes / reject / activate departments; suspend
  with transfer.
- **Sections:** Admin sidebar (Admin Overview, Department Approval, All City
  Complaints, Audit & Compliance, City Analytics, Jurisdictions & Setup,
  "Statutory SLA Audit") — correct admin nav; header "Shri R. Venkatraman, IAS /
  Chief Ombudsman Office" (fix "Chief Ombudsman Office" → Admin identity);
  KPI cards (Pending Applications, Active Departments, Suspended, Changes
  Requested); tabs (Pending Applications (5), Approved Departments (20), All /
  Active 18 / Suspended 2, Rejected Applications (12)); filters (service area,
  zone, source); table (Department, Applicant, Service Area, Contact, Submitted,
  Source, Status, Actions); **Review Drawer** (APP #2024-884: "Similar Service
  Area Detected" warning — Ward 150 already has an active partner; 1. Department
  Information, 2. Officer Information, 3. Documents Checklist 2 of 3 Verified;
  "Department Approved. Not yet active — Department login remains disabled until
  activated by the administrator."; buttons "Activate & Send Officer Invite" /
  Approve / Request Changes / Reject + Message/Reason field); **Suspend Modal**
  ("Suspend Department — Kengeri Drainage Division": open-complaint count
  34, reason required, "Move open complaints to (Active departments only)"
  dropdown, "Confirm Suspension & Transfer Complaints").
- **Data needed:** `departments` (all states; tabs map to
  `pending`/`changes_requested`, `approved`+`active`+`suspended`, `rejected`),
  `department_documents` (verify checkboxes), `department_officers` (first
  officer), `department_wards`, `department_categories`, `complaints` (open
  count per department for the suspend modal), `dept_transitions` (legal
  transitions), `audit_log` (history in drawer).
- **Wording fixes:** "Gov & Ombudsman" (sidebar brand) → Complaint-Sathi Admin;
  "Chief Ombudsman Office" → Admin role label; "Statutory SLA Audit" (sidebar
  item — drop "Statutory"); "Approved departments gain full access to citizen
  complaint routing in their designated service areas." → "…receive complaints
  citizens confirm for their service areas." The suspend modal's copy is
  otherwise correct (reason required, eligible active departments only) — keep.
  Note: per spec the Activate step needs typed confirmation `ACTIVATE` — the
  mock's "Activate & Send Officer Invite" button does not show it; add it.
- **Status in export:** exists as mock. Review Drawer and Suspend Modal exist
  as static panels — rebuild as interactive Drawer/Modal wired to
  `dept_transitions` + `suspend_department`.

## 8. `create_department_admin_form` — Create department (Admin)

- **Portal / route:** Admin — `/admin/departments/new`
- **Purpose:** Admin creates a department (5-step form); stays inactive until
  approved + activated.
- **Sections:** Admin sidebar (correct admin nav); breadcrumb "Admin Console /
  Department Governance / New Department Intake"; "Standard Onboarding SLA:
  48h", "Municipal Service Provisioning Form GS-402"; Stepper (1 Department
  Information, 2 Service Area & Jurisdiction, 3 Official Contact Details,
  4 First Officer / Nodal Lead, 5 Supporting Documents); Step 1: name, sector
  classification (Water, Sanitation, Roads, Electricity, Health), charter
  description (max 500 chars); Step 2: zone/circle, Jurisdiction Unique Node
  ID, covered wards (Ward 112/150/149/85 chips), GeoJSON boundary upload
  ("GIS Raster Active: Zone 04 BBMP East Boundary"); Step 3: official email
  (.gov.in), telephone, 24×7 hotline, HQ address; Step 4: "Assigned Master
  Administrator Credentials" (nodal officer name, designation/cadre, Govt
  Employee ID KGID/HRMS, official mobile for 2FA/OTP); Step 5: documents
  (Gazette Notification, Cadastral Boundary Map, Citizen Service Charter —
  Sakala SLA Guarantee) + affirmation + "Created departments remain inactive
  until explicitly approved and activated by an administrator."; actions
  Cancel / Save Draft / Submit for Review.
- **Data needed:** `categories` (sector list), `wards` (ward picker),
  `departments` (create → `draft`), `department_wards`,
  `department_categories`, `department_documents` (uploads), `department_officers`
  (first officer), storage buckets for documents.
- **Wording fixes:** "Gov & Ombudsman" / "Chief Ombudsman Office"; "requires
  ombudsman activation before portal login and automated ticket routing are
  enabled" → "…before officer login is enabled and the department can receive
  complaints"; "as listed in the Karnataka State Municipal Gazette" (keep the
  gazette reference for the name field only if the spec keeps it — it is a
  document requirement, not a law claim); "Statutory Requirement" (Step 1
  callout — keep the Class-A/B nodal officer + GOI email requirement, drop
  "Statutory"); "Citizens are routed to this line during severe statutory
  red-flag grievances" → "…during severe grievances"; "Assigned Master
  Administrator Credentials" / "inaugural root cryptographic security token"
  → "First Nodal Officer" (the officer gets an invite, not a root token);
  "Citizen Service Charter (Sakala SLA Guarantee)" → drop "Sakala";
  affirmation citing "Karnataka Municipal Corporations Act (1976)" +
  "formal ombudsman background check" → reword to a plain authenticity
  affirmation + admin review.
- **Status in export:** exists as mock. (Master prompt lists it under "add
  missing screens" — it is missing as *working* UI, not as a mock.)

## 9. `admin_audit_log_system_events` — Admin audit log

- **Portal / route:** Admin — `/admin/audit`
- **Purpose:** Tamper-evident audit ledger: filters, event table, ledger status,
  forensic detail per event.
- **Sections:** Admin sidebar ("Governance Console" variant — same admin nav);
  "Statutory Audit Trail — Section 14(b) Civic Accountability Act"; "System
  Audit & Compliance Log" (description); KPI cards (Ledger Status 14,289 Events
  Recorded, Ledger Root Hash 0x9d4e…e62b14 SHA-256 Synchronized, 24H High-Impact
  Events: 17 Transitions, 2 Emergency Suspensions, Automated Redirections 34
  Grievances, Active Gateway Nodes NIC-BLR-04); Filter Presets (Critical
  Department Actions, Past 24h Security Failures, Sakala SLA Reassignments,
  GovNet NIC Admin Logins); Export Audit Log (CSV/JSON); filters (Event Type:
  DEPARTMENT_SUSPENDED, COMPLAINTS_REASSIGNED, DEPARTMENT_ACTIVATED,
  DEPARTMENT_APPROVED, CHANGES_REQUESTED, DEPARTMENT_REJECTED,
  OFFICER_PASSWORD_SETUP; Actor Role; Time Horizon; Target Jurisdiction);
  table (Timestamp IST, Actor Details, IP/Origin, Action Token, Target Unit,
  State Shift, Integrity Hash, Inspect) with rows incl. SUSPEND_DEPARTMENT,
  system failover, DEPARTMENT_APPROVED, OFFICER_CREDENTIALS,
  DEPARTMENT_CREATED; pagination (1–6 of 14,289); "Ledger Cryptographic
  Verification Passed" strip (Merkle tree check, Run On-Demand Audit Probe);
  **Forensic Record Detail panel** (IMMUTABLE; Event ID EVT-20251024-88412;
  timestamp; "Statutory Justification & Notes"; Actor Identification —
  Gov Level 1 Administrator UID-AD-011; Network Origin & Hardware Fingerprint —
  IP, ASN AS45820 GovNet NIC BLR, TLSv1.3, Auth PKI SmartCard + 2FA;
  Cryptographic Signature sha256:7f4a…; Export Cryptographic Receipt (.sig);
  View Full Raw JSON Payload).
- **Data needed:** `audit_log` (append-only, hash-chained; columns incl.
  `prev_hash`, `record_hash`), `audit_signatures` (Ed25519),
  `audit_keys` (signer/key id/fingerprint), `departments` (target filter),
  `profiles` (actor).
- **Wording fixes:** "Statutory Audit Trail"; "Section 14(b) Civic
  Accountability Act"; "Sakala SLA Reassignments"; "Failover Rule Sakala #8";
  "Automated Redirections — 34 Grievances"; "Failover Daemon v4.1 / Internal
  Dispatcher"; "34 open citizen complaints auto-migrated to BWSSB South Rapid
  Unit" (justification text — rewrite as the Admin's recorded reason for the
  suspend + transfer); "Secured GovNet / GovNet NIC Admin Logins / NIC-BLR-04 /
  AS45820 (GovNet NIC BLR)" (infrastructure branding — drop or replace with
  neutral "Admin network"); "Statutory Justification & Notes" → "Justification
  & Notes". "Administrator / Gov Level 1 Administrator" is correct here (this
  IS the Admin UI).
- **Status in export:** exists as mock, **including a static Forensic Record
  Detail panel** — but it is a page section, not an interactive drawer, and it
  lacks the spec's drawer contents: Ed25519 **signature certificate** (signer,
  key ID, fingerprint, validity, signature value, copy button), **verification
  receipt** (record hash SHA-256, previous hash, chain position,
  "Chain verified"/"Tampered" badge, Re-verify button), UTC time (mock shows
  IST), old→new status. Rebuild as a Drawer wired to the row's Inspect action
  (see Missing screens).

## 10. `apply_as_a_department_public_onboarding` — Apply as a department

- **Portal / route:** Public — `/apply-department`
- **Purpose:** Public 4-step accreditation application wizard + acknowledgement.
- **Sections:** Public header (Complaint-Sathi, "Civic Ombudsman Portal", Track
  Grievance, Citizen Charter, Department Onboarding, Toll Free 1800-425-0101,
  language switcher English/ಕನ್ನಡ/हिन्दी); "Statutory Accreditation Framework
  — Ref: CS-FORM-ACC-2025"; "Apply for Department Accreditation" intro +
  "Standard Review Turnaround 3–5 Working Days (SLA Cap)"; "Prerequisite
  Authorization Notice — Zero-Access Gate" (pending review; no credentials or
  routing before validation by the Municipal Commissioner's Office and
  activation by the Chief Ombudsman); Stepper (1. Agency Info, 2. Jurisdiction,
  3. Nodal Officer, 4. Statutory Orders); Step 1: agency name, classification/
  sector, institutional category, charter scope ("Key categories auto-routed to
  this department"); Step 2: zone/circle, HQ precinct, assigned wards chips
  (Ward 112 Domlur, 150 Bellandur Central, 85 HAL Airport Road, 149 Varthur
  Lake West), jurisdiction GeoJSON upload (east_dult_jurisdiction_v2.4.geojson,
  1.42 MB, "Validated: 4 Polygons • EPSG:4326"); Step 3: nodal officer (name,
  cadre/designation, official email .gov.in — "Commercial accounts (@gmail,
  @yahoo) will be automatically rejected", control-room landline, mobile
  "Aadhaar / OTP Tied", Govt Employee ID/HRMS); Step 4: documents (Gazette
  Notification, Ward Boundary Jurisdiction Map, Citizen Charter & SLA
  Resolution Undertaking) + affirmation citing "Municipal Corporation Act and
  Digital Personal Data Protection standards"; actions Save Draft / Cancel /
  Submit Application for Review; right rail "Accreditation Journey" (Stage 1
  Filing → Stage 2 Admin Scrutiny → Stage 3 Activation), "Zero Login Access
  Before Activation", helpdesk (080-2266-1025, ombudsman-grid@karnataka.gov.in,
  Room 204 Civic Towers), "Compliance Standard IS 15700:2018 Sevottam Grid";
  acknowledgement state ("Application Dispatched", Docket No. ACK-BBMP-2025-0814,
  Reviewing Directorate, "Estimated Audit Decision: Within 72 Hours",
  "Login credentials will remain inactive until formal sign-off…",
  Print Acknowledgement / Return to Portal).
- **Data needed:** `categories`, `wards`, `departments` (create application →
  `pending`; duplicate-ward check against active departments), `department_documents`
  (uploads), `department_officers` (nodal officer draft), storage buckets.
- **Wording fixes:** "Civic Ombudsman Portal"; "Statutory Accreditation
  Framework"; "4. Statutory Orders"; "Autonomous Statutory Parastatal Board";
  "Cadre / Statutory Designation"; "Statutory Evidence & Mandate Filings";
  "Designated executive accountable under the Public Service Guarantee Act";
  "Key categories auto-routed to this department" → "Categories this department
  would serve"; "affirmative validation by the Municipal Commissioner's Office
  and activation by the Chief Ombudsman" → "review and activation by an
  administrator"; "Central Ombudsman verifies Government Gazette mandate…"
  → "An administrator verifies…"; "an encrypted 2FA invite token is dispatched
  to the Nodal Officer" (email dispatch is fine; prefer "sent"); "Officer
  Official Mobile (Aadhaar / OTP Tied)" → drop Aadhaar; affirmation citing
  "Municipal Corporation Act" → plain authenticity affirmation; "Compliance
  Standard IS 15700:2018 Sevottam Grid" → remove; "Application Dispatched"
  → "Application Submitted"; "ombudsman-grid@karnataka.gov.in" → replace
  with the real support address.
- **Status in export:** exists as mock (desktop only). **Mobile/responsive
  layout of this wizard is missing** — build it (the Stitch follow-up
  "View responsive mobile layout for the Public Department Application form"
  is not in the export).

## 11. `department_officer_first_time_invite_password_setup` — Officer invite

- **Portal / route:** Public — `/officer/accept-invite?token=`
- **Purpose:** First-time officer invite: validate token, set password, OTP
  verify, accept terms, land in the officer queue.
- **Sections:** Public header (same as §10); "State Municipal E-Governance
  Network • Secure Access Node S-KA-09", "256-Bit Encrypted Setup",
  "Single-Use Token: 46h 18m remaining"; "Officer Credential Initialization —
  Active & Operational" (Er. Ramesh Narayan, AEE; BWSSB Ward 112 Sewage
  Maintenance Division; Assigned Role "Lead Operations Officer (Tier-1
  Dispatch)"; official mail); "Authentication & Security Configuration"
  (Single-Use Invitation Token — "Statutory Invite Validated", "Issued by State
  Municipal E-Governance IT Director"; Create/Confirm Portal Password;
  "Karnataka E-Gov Security Compliance Meter" — Min 10 chars, 1 Uppercase,
  1 Numeral, 1 Special symbol; "Officer 2-Step Identity Verification" —
  HRMS ID KA-EMP-09411, linked govt mobile, "Dispatch Verification SMS",
  6-digit OTP, resend timer 01:59); terms checkbox ("handle citizen grievances
  strictly according to the Karnataka Municipal Service Standards Act (KMSSA),
  acknowledge that all audit trails are permanently logged under statutory RTI
  mandate…"); "Complete Setup & Access Officer Queue"; right rail "Next
  Operational Steps" (Credential Verification, Live Queue Handover — "Receive
  14 pending citizen tickets auto-assigned to Ward 112 sewage maintenance",
  SLA Clock Activation — "48-hour statutory resolution timer"); "Ward 112 SLA
  Benchmark — 48 Hours Standard / 6 Hours Escalation"; "SEC-AUTH-2025 Statutory
  Cyber Hygiene Policy"; "NIC Certified Ombudsman Gateway"; helpdesk
  (BBMP Head Office, N.R. Square).
- **Data needed:** invite token validation (officer record + department +
  expiry), `department_officers` (activate on setup), `departments` (must be
  `active` — otherwise redirect to `/officer/blocked`), Supabase Auth
  (password set), OTP verification.
- **Wording fixes:** "Civic Ombudsman Portal"; "NIC Certified Ombudsman
  Gateway"; "Statutory Invite Validated"; "Lead Operations Officer (Tier-1
  Dispatch)" → drop "(Tier-1 Dispatch)"; "Karnataka E-Gov Security Compliance
  Meter" → "Password strength"; terms citing "Karnataka Municipal Service
  Standards Act (KMSSA)" + "statutory RTI mandate" → plain terms (handle
  grievances per published standards; all actions are logged in the audit
  trail); "Receive 14 pending citizen tickets auto-assigned…" → "Your
  department's open tickets will be listed in your queue"; "48-hour statutory
  resolution timer" → "48-hour resolution timer"; "Statutory Cyber Hygiene
  Policy" → "Account security policy"; "Statutory Privacy Policy" (footer).
- **Status in export:** exists as mock. (Master prompt lists it under "add
  missing screens" — missing as *working* UI, not as a mock.)

---

## Missing screens — build from scratch (no mock in the export)

| Route | Screen | Notes |
|---|---|---|
| `/login` | Citizen/officer/admin sign-in | No login screen exists in the export. Citizen: email OTP. Officer/Admin: email + password. Must not reuse the public portal's "No Login Required" copy. |
| `/citizen/complaints` | Citizen's complaints list | Citizen home (§2) shows one active case + a bottom-nav entry only. Build a list (status filter, search) reusing the tracker card from §2 and linking each row to `/citizen/complaints/[id]`. |
| `/officer/complaints` | Officer complaints list | The queue table in §5 is the desk home (`/officer`); this route is the same table as a standalone list (filters by status/ward/urgency, pagination). Reuse §5's table component. |
| `/officer/profile` | Officer profile | No mock. Officer details, department, duty shift, contact, password change. |
| `/officer/blocked` | Blocked pages (3 variants) | No mock at all. **Pending Approval** (department approved but not active — login disabled), **Suspended — with active transfer details** (which department the open complaints moved to + reason), **Deactivated**. Plus Rejected per the department guard (`DEPARTMENT_NOT_ACTIVE` → matching variant). Shown server-side when `departments.status != 'active'`. |
| `/admin` | Admin overview dashboard | Nav item only ("Admin Overview"). Build: counts by department state, complaints by status/severity, SLA-at-risk, recent audit events. Reuse KPI cards from §6/§7. |
| `/admin/analytics` | City analytics | Nav item only ("City Analytics"). Build: complaints by category/ward/department over time, SLA compliance, resolution time. No mock. |
| `/apply-department` (mobile) | Apply wizard, responsive layout | Desktop mock exists (§10); mobile layout missing. Single-column, 44px touch targets, stacked stepper. |
| `/admin/audit` drawer | Audit Forensic Detail drawer | Static panel exists inside §9, but not as a drawer and missing spec contents: Ed25519 **signature certificate** (signer, key ID, fingerprint, validity, signature value, copy button), **verification receipt** (record hash SHA-256, previous hash, chain position, "Chain verified"/"Tampered" badge, Re-verify button), UTC time, old→new status, Export JSON. Build as a right Drawer opened from the table's Inspect action. |

Not in the route list but referenced by mocks — decide in the button matrix:
`Jurisdictions & Setup` (admin sidebar; wards/categories setup — no route given),
`City Geospatial Map` and `AI Intelligence Centre` (combined-shell nav items in
§3/§4/§6 — no routes; do not build unless the spec adds them), `Ward Map`
(citizen bottom nav — no route).

## Shared UI components implied by the screens

| Component | Where it appears / notes |
|---|---|
| Button (primary / secondary / destructive, loading + disabled states) | Every screen. Primary: navy/teal per chosen system; destructive for Reject/Suspend. |
| Badge / StatusPill | Severity (Critical/High/Medium/Low), complaint status (Submitted/Received/In Progress/Resolved), department state (draft/pending/changes_requested/approved/active/suspended/deactivated/rejected), audit action tokens. Pill geometry; always icon + label, never colour alone. |
| Table (search, filters, sorting, pagination) | Officer queue (§5), admin registry (§6), governance (§7), audit log (§9). Row height 52px (Precision) / hover `#F4F6F8` (Dignity); header `label-md` uppercase; IDs in mono/tabular. |
| Drawer (right slide-in, Esc/backdrop close, focus trap) | Dept Review (§7), complaint detail (§6), Forensic Detail (§9, missing). |
| Modal (confirm + reason field) | Suspend + transfer (§7); reject/request-changes reason (§7). |
| Toast | Success/error after every mutation (submit, status change, invite sent, activation). |
| Stepper | Report wizard (§3, 4 steps), apply wizard (§10, 4 steps), create-department form (§8, 5 steps). |
| EmptyState | "No tickets match these filters", empty queue, no audit results. |
| Skeleton | Loading states for tables, KPIs, tracker timeline. |
| FilterBar / FilterChips + SearchInput | All list screens (ward, department, category, status, urgency, date). |
| StatCard / KPI | §5, §6, §7, §9. Value in headline-lg, delta chip, tabular numbers. |
| SLACountdown | §1, §4, §5, §6 (4px multi-segment track: green >48h, amber 24–48h, red <24h). |
| Timeline | §2 (4-step progress), §4 (verified audit timeline), §6 (field logs). |
| FileUpload (drag-drop, PDF/image, size limits) | Evidence photos (§3), GeoJSON boundary (§8/§10), documents (§7/§8/§10), resolution photo (§5). |
| OTPInput + PasswordStrengthMeter | Invite setup (§11), citizen login (`/login`). |
| ConfirmDialog (typed `ACTIVATE`) | Department activation (§7) — typed confirmation required by spec, not shown in mock. |
| LanguageSwitcher (EN / ಕನ್ನಡ / हिन्दी) | Public header (§10/§11); report form (§3) lists EN/HI/MR/BN/TA. |
| Tabs | Governance §7 (Pending/Approved/Rejected + Active/Suspended chips). |
| Pagination | §6 (1–6 of 1,482), §7 (4 of 5), §9 (1–6 of 14,289). |

## Design tokens to reuse

From `civic_precision/DESIGN.md` (Geist) and `civic_dignity/DESIGN.md` (Inter)
— pick one system; values below are the two systems' tokens, not a blend.

- **Colours (Precision):** primary navy `#001D36` / `#17324D`; secondary teal
  `#006874`; tertiary blue `#2563EB`; canvas `#F6F8FA`; surface `#FFFFFF`;
  border `#E2E8F0`; text `#172B3A` / muted `#64748B`. Severity: Critical
  `#B42318` on `#FEF3F2`; High `#D97706` on `#FFFBEB`; Medium `#2563EB` on
  `#EFF6FF`; Low/Resolved `#16845B` on `#ECFDF5`.
- **Colours (Dignity):** primary deep teal `#0F3D3E`; accent teal `#1F7A7A`;
  canvas `#F4F6F8`; surface `#FFFFFF`; border `#E5E7EB`; text `#1F2937` /
  muted `#5B6472`. Status: Pending `#D97706`/`#FEF3C7`; Approved/Resolved
  `#16A34A`/`#DCFCE7`; Rejected/Critical `#DC2626`/`#FEE2E2`; Changes Requested
  `#4F46E5`/`#EEF2FF`; Suspended `#64748B`/`#F1F5F9`; In Progress
  `#2563EB`/`#DBEAFE`.
- **Fonts:** Geist 600 display (36/30/20/16px) + JetBrains Mono 13px tabular
  (Precision); or Inter 700/600 headlines (36/30/22/18px) + tabular-nums
  (Dignity). Sentence-case headers; ALL CAPS only for `label-sm` chips.
- **Radii:** Precision 4/8/12px + pill; Dignity 8/16/24px + pill.
- **Spacing:** 8px base (4/8/16/24/32px scale); desktop margins 40px
  (Precision) / 2rem, max-width 1280px (Dignity); 12-col grid ≥1280px,
  8-col tablet, 4-col / single-column mobile.
- **Elevation:** 1px borders over shadows (both systems); Level 4 modal/drawer
  shadow + scrim `rgba(23,43,58,0.45)` + blur (Precision); hover shadow
  `0 6px 16px -2px rgba(15,61,62,0.08)` (Dignity).
- **Form controls:** 40px inputs, border `#E2E8F0`, focus teal ring
  (Precision); 44px inputs, border `#E5E7EB`, focus `#1F7A7A` + 3px 15% ring
  (Dignity). Touch targets ≥44px. Error `#B42318` / `#DC2626`.
- **Rules:** no emojis anywhere; no decorative noise; status always icon +
  label, never colour alone; numeric data tabular; WCAG AA/AAA contrast.
