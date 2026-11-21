import { loadEnv } from "./load-env.js";
import { createAdminClient } from "../src/lib/supabase/admin.js";
import { callDbFunction } from "../src/lib/supabase/rpc.js";

async function main(): Promise<void> {
// Demo seed (master prompt §5): officers for the 5 seeded active
// departments, 3 citizens, ~15 sample complaints in varied states.
// Usage: npm run seed:demo
// IDEMPOTENT: existing users/officers/complaints are reused, not duplicated.
// Demo credentials are printed to the CONSOLE ONLY — never written to a
// file or committed.

loadEnv();

const DEMO_PASSWORD = "Demo1234!";
const admin = createAdminClient();

async function findUserByEmail(email: string): Promise<string | null> {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

async function ensureUser(
  email: string,
  fullName: string,
): Promise<string> {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

async function setProfile(
  userId: string,
  patch: { role: string; full_name: string; department_id?: string | null },
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update(patch as never)
    .eq("id", userId);
  if (error) throw new Error(`update profile ${userId}: ${error.message}`);
}

// ---------- departments + officers ----------
const { data: depts, error: dErr } = await admin
  .from("departments")
  .select("id,name,official_email")
  .eq("status", "active")
  .eq("source", "admin_created")
  .order("name");
if (dErr) throw new Error(dErr.message);
if (!depts || depts.length === 0) throw new Error("No active seeded departments found.");

const officerByDept = new Map<string, { id: string; email: string }>();
for (const dept of depts) {
  const slug = dept.official_email.split("@")[0]; // water, power, waste, roads, drain
  const officerEmail = `officer+${slug}@demo.complaintsathi.test`;
  const userId = await ensureUser(officerEmail, `Demo Officer — ${dept.name}`);
  await setProfile(userId, {
    role: "department_officer",
    full_name: `Demo Officer — ${dept.name}`,
    department_id: dept.id,
  });
  const { data: existing } = await admin
    .from("department_officers")
    .select("id")
    .eq("department_id", dept.id)
    .eq("email", officerEmail)
    .maybeSingle();
  if (!existing) {
    await admin.from("department_officers").insert({
      department_id: dept.id,
      profile_id: userId,
      name: `Demo Officer — ${dept.name}`,
      email: officerEmail,
    } as never);
  }
  officerByDept.set(slug, { id: userId, email: officerEmail });
  console.log(`Officer ready: ${officerEmail} → ${dept.name}`);
}

// ---------- citizens ----------
const citizenIds: string[] = [];
for (let i = 1; i <= 3; i++) {
  const email = `citizen${i}@demo.complaintsathi.test`;
  const userId = await ensureUser(email, `Demo Citizen ${i}`);
  await setProfile(userId, { role: "citizen", full_name: `Demo Citizen ${i}` });
  citizenIds.push(userId);
  console.log(`Citizen ready: ${email}`);
}

// ---------- complaints ----------
const { data: wards } = await admin.from("wards").select("id,name");
const wardId = new Map((wards ?? []).map((w) => [w.name, w.id]));
const { data: cats } = await admin.from("categories").select("id,slug");
const catId = new Map((cats ?? []).map((c) => [c.slug, c.id]));

type SeedComplaint = {
  citizen: number;
  dept: string;
  ward: string;
  category: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  after?: { status: "received" | "in_progress" | "resolved"; note?: string };
};
const SEEDS: SeedComplaint[] = [
  { citizen: 0, dept: "water", ward: "Bellandur", category: "water_supply", title: "Main water pipe burst on Outer Ring Road", description: "A large water main has burst near the Bellandur junction. Water is flooding the road and supply to nearby apartments has stopped.", severity: "critical", after: { status: "in_progress", note: "Crew dispatched; valve isolated, repair in progress." } },
  { citizen: 1, dept: "water", ward: "HSR Layout", category: "water_supply", title: "No water supply for 2 days", description: "No water in our block for over 48 hours. Tankers are not reaching us.", severity: "high", after: { status: "in_progress", note: "Supply restored partially; tanker scheduled." } },
  { citizen: 2, dept: "water", ward: "Koramangala", category: "sewerage", title: "Sewage overflowing near the park", description: "Sewage water is overflowing onto the footpath near the park entrance, with a foul smell.", severity: "high" },
  { citizen: 0, dept: "power", ward: "Whitefield", category: "electricity", title: "Streetlights not working on main road", description: "All streetlights on the main road near the ITPL gate have been out for a week.", severity: "high", after: { status: "received", note: "Complaint acknowledged; line inspection scheduled." } },
  { citizen: 1, dept: "power", ward: "Marathahalli", category: "electricity", title: "Live wire hanging low over footpath", description: "An electric wire is hanging dangerously low over the footpath and sparks at night.", severity: "critical", after: { status: "in_progress", note: "Line crew on site; area cordoned off." } },
  { citizen: 2, dept: "power", ward: "Indiranagar", category: "electricity", title: "Single streetlight out near the metro station", description: "One streetlight outside the metro station is not working.", severity: "medium" },
  { citizen: 0, dept: "waste", ward: "BTM Layout", category: "solid_waste", title: "Garbage not collected for a week", description: "Garbage has not been picked up in our lane for a week and bins are overflowing.", severity: "medium", after: { status: "resolved", note: "Backlog cleared; daily pickup resumed." } },
  { citizen: 1, dept: "waste", ward: "Jayanagar", category: "solid_waste", title: "Dumped waste blocking the lane", description: "Construction debris and garbage dumped at the corner is blocking half the lane.", severity: "medium" },
  { citizen: 2, dept: "waste", ward: "Malleshwaram", category: "solid_waste", title: "Overflowing dustbin near the market", description: "The dustbin near the market is overflowing and stray dogs are scattering waste.", severity: "low", after: { status: "resolved", note: "Bin emptied and a second bin installed." } },
  { citizen: 0, dept: "roads", ward: "Hebbal", category: "roads", title: "Large pothole on the flyover approach", description: "A deep pothole on the flyover approach road is damaging vehicles and causing jams.", severity: "high" },
  { citizen: 1, dept: "roads", ward: "Yelahanka", category: "roads", title: "Footpath broken near the bus stop", description: "The footpath slabs near the bus stop are broken and uneven, difficult for elderly people to walk on.", severity: "medium" },
  { citizen: 2, dept: "roads", ward: "Rajajinagar", category: "roads", title: "Potholes after the rain on 5th Cross", description: "Several small potholes have appeared on 5th Cross after last week's rain.", severity: "medium", after: { status: "resolved", note: "Potholes filled and the stretch re-surfaced." } },
  { citizen: 0, dept: "drain", ward: "Bellandur", category: "drainage_flood", title: "Stormwater drain blocked, waterlogging", description: "The stormwater drain is blocked with silt and the road waterlogs after every rain.", severity: "high" },
  { citizen: 1, dept: "drain", ward: "Koramangala", category: "drainage_flood", title: "Flooding at the underpass", description: "The underpass floods knee-deep after moderate rain and two-wheelers are getting stuck.", severity: "high", after: { status: "in_progress", note: "Desilting in progress; pumps deployed." } },
  { citizen: 2, dept: "drain", ward: "Whitefield", category: "drainage_flood", title: "Blocked drain near the lake road", description: "A drain near the lake road is blocked and stagnant water is breeding mosquitoes.", severity: "medium", after: { status: "received", note: "Complaint acknowledged." } },
];

const { data: existingComplaints } = await admin
  .from("complaints")
  .select("id,title")
  .in("citizen_id", citizenIds);
const existingTitles = new Set((existingComplaints ?? []).map((c) => c.title));

let created = 0;
for (const s of SEEDS) {
  if (existingTitles.has(s.title)) continue;
  const dept = depts.find((d) => d.official_email.startsWith(s.dept + "@"));
  const officer = officerByDept.get(s.dept);
  if (!dept || !officer) {
    console.warn(`Skipping seed (no department/officer for ${s.dept}): ${s.title}`);
    continue;
  }
  const complaint = await callDbFunction<{ id: string; ticket_no: string }>(
    admin,
    "create_complaint",
    {
      p_citizen: citizenIds[s.citizen],
      p_title: s.title,
      p_description: s.description,
      p_language: "en",
      p_category: catId.get(s.category),
      p_severity: s.severity,
      p_ai_category: catId.get(s.category),
      p_ai_severity: s.severity,
      p_ai_conf: 0.85,
      p_ai_reason: "Seeded sample complaint for demo.",
      p_ai_dept: dept.id,
      p_department: dept.id,
      p_ward: wardId.get(s.ward),
      p_address: null,
      p_lat: null,
      p_lng: null,
      p_photos: [],
    },
  );
  created += 1;
  console.log(`Complaint ${complaint.ticket_no}: ${s.title}`);
  if (s.after) {
    await callDbFunction(admin, "officer_update_complaint", {
      p_officer: officer.id,
      p_complaint: complaint.id,
      p_status: s.after.status,
      p_note: s.after.note ?? null,
      p_photos: null,
    });
  }
}

console.log(`\nDemo seed complete: ${created} new complaint(s) created (15 total in the seed set).`);
console.log("Demo credentials (console only — do not commit):");
console.log("  Admin:    admin@complaint-sathi.in / Admin@123");
for (const [slug, o] of officerByDept) {
  console.log(`  Officer (${slug}): ${o.email} / ${DEMO_PASSWORD}`);
}
for (let i = 1; i <= 3; i++) {
  console.log(`  Citizen ${i}: citizen${i}@demo.complaintsathi.test / ${DEMO_PASSWORD}`);
}
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
