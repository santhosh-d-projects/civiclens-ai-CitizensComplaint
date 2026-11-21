// LIVE integration test for the complaint-creation path
// (POST /api/complaints → create_complaint SQL function).
// Creates a throwaway citizen auth user, submits a complaint through the
// real DB function, asserts the ticket number / SLA / event row, then
// deletes everything it created. Requires live keys in .env.local.
import { describe, expect, it, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";

const TEST_EMAIL = `citizen-test-${Date.now()}@complaintsathi.test`;
let testUserId: string | null = null;
let testComplaintId: string | null = null;

describe("create_complaint (live)", () => {
  it("creates a complaint with ticket number, SLA and a submitted event", async () => {
    const admin = createAdminClient();

    // 1) Throwaway citizen (handle_new_user trigger creates the profile).
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: "TestCitizen123!",
        email_confirm: true,
        user_metadata: { full_name: "Test Citizen" },
      });
    expect(userError).toBeNull();
    expect(userData.user).toBeTruthy();
    testUserId = userData.user!.id;

    // 2) Pick an ACTIVE department covering ward 1 for water_supply.
    const { data: cat } = await admin
      .from("categories")
      .select("id")
      .eq("slug", "water_supply")
      .single();
    expect(cat).toBeTruthy();
    const { data: wardDepts } = await admin
      .from("department_wards")
      .select("department_id")
      .eq("ward_id", 1);
    const { data: catDepts } = await admin
      .from("department_categories")
      .select("department_id")
      .eq("category_id", cat!.id);
    const wardSet = new Set((wardDepts ?? []).map((d) => d.department_id));
    const candidateIds = (catDepts ?? [])
      .map((d) => d.department_id)
      .filter((id) => wardSet.has(id));
    expect(candidateIds.length).toBeGreaterThan(0);
    const { data: dept } = await admin
      .from("departments")
      .select("id,status")
      .in("id", candidateIds)
      .eq("status", "active")
      .limit(1)
      .single();
    expect(dept).toBeTruthy();

    // 3) Create the complaint through the real SQL function.
    const result = await callDbFunction<{ ticket_no: string; id: string }>(
      admin,
      "create_complaint",
      {
        p_citizen: testUserId,
        p_title: "Water pipe burst near park gate",
        p_description: "main water pipe burst, road flooded near the park",
        p_language: "en",
        p_category: cat!.id,
        p_severity: "critical",
        p_ai_category: cat!.id,
        p_ai_severity: "critical",
        p_ai_conf: 0.9,
        p_ai_reason: "Major pipe burst flooding the road.",
        p_ai_dept: dept!.id,
        p_department: dept!.id,
        p_ward: 1,
        p_address: "5th Cross, near the park gate",
        p_lat: 12.9352,
        p_lng: 77.6245,
        p_photos: [],
      },
    );
    expect(result.ticket_no).toMatch(/^CS-\d+$/);
    testComplaintId = result.id;

    // 4) SLA set by severity (critical → 6h) and a 'submitted' event exists.
    const { data: complaint } = await admin
      .from("complaints")
      .select("sla_due_at,status,department_id")
      .eq("id", result.id)
      .single();
    expect(complaint?.status).toBe("submitted");
    expect(complaint?.department_id).toBe(dept!.id);
    const slaMs =
      new Date(complaint!.sla_due_at!).getTime() - Date.now();
    expect(slaMs).toBeGreaterThan(5 * 3_600_000);
    expect(slaMs).toBeLessThan(7 * 3_600_000);
    const { data: events } = await admin
      .from("complaint_events")
      .select("event")
      .eq("complaint_id", result.id);
    expect(events?.map((e) => e.event)).toContain("submitted");
  }, 30_000);

  afterAll(async () => {
    // Clean up everything this test created.
    const admin = createAdminClient();
    if (testComplaintId) {
      await admin.from("complaint_events").delete().eq("complaint_id", testComplaintId);
      await admin.from("complaints").delete().eq("id", testComplaintId);
    }
    if (testUserId) {
      await admin.auth.admin.deleteUser(testUserId);
    }
  });
});
