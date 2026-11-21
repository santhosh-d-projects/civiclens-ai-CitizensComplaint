// POST /api/departments/apply — public department application.
// Rate-limited (5/hour/IP) + honeypot. Duplicate check on live email and
// name+ward overlap → 409. Creates the department (pending, source
// applied) + first officer + documents, and audits DEPARTMENT_APPLIED.
// No login is possible until an admin approves AND activates it.
import { z } from "zod";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";

const ApplyBody = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  official_email: z.string().email(),
  official_phone: z.string().max(20).optional(),
  applicant_name: z.string().min(2).max(200),
  ward_ids: z.array(z.number().int().positive()).min(1),
  category_ids: z.array(z.number().int().positive()).min(1),
  officer: z.object({
    name: z.string().min(2).max(200),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
  }),
  documents: z
    .array(z.object({ name: z.string().min(1), path: z.string().min(1) }))
    .max(10)
    .optional(),
  // Honeypot: must stay empty; bots fill it.
  website: z.string().optional(),
});

const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const now = Date.now();
    const windowHits = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    if (windowHits.length >= 5) {
      return apiError("RATE_LIMITED", "Too many applications. Try again later.", 429);
    }
    windowHits.push(now);
    hits.set(ip, windowHits);

    const body = await req.json();
    const parsed = ApplyBody.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const v = parsed.data;
    // Honeypot filled → pretend success, create nothing.
    if (v.website && v.website.trim() !== "") {
      return Response.json({ submitted: true }, { status: 201 });
    }

    const admin = createAdminClient();
    const { data: dupEmail } = await admin
      .from("departments")
      .select("id")
      .ilike("official_email", v.official_email)
      .not("status", "in", '("rejected","deactivated")')
      .limit(1);
    if ((dupEmail ?? []).length > 0) {
      return apiError(
        "DUPLICATE",
        "A department with this official email already has an application or is active.",
        409,
      );
    }
    // Name + ward overlap with a live department.
    const { data: sameName } = await admin
      .from("departments")
      .select("id")
      .ilike("name", v.name)
      .not("status", "in", '("rejected","deactivated")');
    if ((sameName ?? []).length > 0) {
      const { data: dw } = await admin
        .from("department_wards")
        .select("department_id,ward_id")
        .in(
          "department_id",
          (sameName ?? []).map((d) => d.id),
        );
      const overlap = (dw ?? []).some((w) => v.ward_ids.includes(w.ward_id));
      if (overlap) {
        return apiError(
          "DUPLICATE",
          "A department with this name already serves one of the selected wards.",
          409,
        );
      }
    }

    const { data: dept, error: dErr } = await admin
      .from("departments")
      .insert({
        name: v.name,
        description: v.description ?? null,
        official_email: v.official_email,
        official_phone: v.official_phone ?? null,
        applicant_name: v.applicant_name,
        status: "pending",
        source: "applied",
      } as never)
      .select()
      .single();
    if (dErr) throw new Error(dErr.message);
    const deptId = (dept as { id: string }).id;
    await admin.from("department_wards").insert(
      v.ward_ids.map((ward_id) => ({ department_id: deptId, ward_id })) as never,
    );
    await admin.from("department_categories").insert(
      v.category_ids.map((category_id) => ({
        department_id: deptId,
        category_id,
      })) as never,
    );
    await admin.from("department_officers").insert({
      department_id: deptId,
      name: v.officer.name,
      email: v.officer.email,
      phone: v.officer.phone ?? null,
    } as never);
    if (v.documents?.length) {
      await admin.from("department_documents").insert(
        v.documents.map((d) => ({
          department_id: deptId,
          name: d.name,
          file_path: d.path,
        })) as never,
      );
    }
    await callDbFunction(admin, "write_audit", {
      p_actor: null,
      p_role: "applicant",
      p_action: "DEPARTMENT_APPLIED",
      p_etype: "department",
      p_entity: deptId,
      p_old: null,
      p_new: "pending",
      p_reason: null,
      p_ip: ip,
      p_device: req.headers.get("user-agent"),
    });
    return Response.json({ submitted: true, departmentId: deptId }, { status: 201 });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
