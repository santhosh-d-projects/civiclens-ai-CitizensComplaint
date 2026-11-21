// GET /api/admin/departments — list with tab/search/pagination.
// POST /api/admin/departments — admin creates a department (draft; submit
// → pending). The department then enters the same review flow as applicants.
import { z } from "zod";
import {
  requireAdmin,
  clientIp,
  deviceOf,
  signAuditBestEffort,
} from "@/lib/admin-api";
import { apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import type { Department, DeptStatus } from "@/lib/database.types";

const TAB_STATUSES: Record<string, DeptStatus[]> = {
  pending: ["pending", "changes_requested"],
  approved: ["approved", "active", "suspended"],
  rejected: ["rejected"],
  all: [
    "draft",
    "pending",
    "changes_requested",
    "approved",
    "active",
    "suspended",
    "deactivated",
    "rejected",
  ],
};

export async function GET(req: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;
    void session;
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "pending";
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, Number(searchParams.get("per_page") ?? 10) || 10),
    );
    const admin = createAdminClient();
    const statuses = TAB_STATUSES[tab] ?? TAB_STATUSES.pending;
    const { data: depts, error: dErr } = await admin
      .from("departments")
      .select("*")
      .in("status", statuses)
      .order("created_at", { ascending: false });
    if (dErr) throw new Error(dErr.message);
    const list = (depts ?? []) as Department[];
    const ids = list.map((d) => d.id);
    const { data: dw } = ids.length
      ? await admin
          .from("department_wards")
          .select("department_id,ward_id")
          .in("department_id", ids)
      : { data: [] };
    const { data: wards } = await admin.from("wards").select("id,name,zone");
    const wardName = new Map((wards ?? []).map((w) => [w.id, w.name]));
    const wardsByDept = new Map<string, string[]>();
    for (const row of dw ?? []) {
      const arr = wardsByDept.get(row.department_id) ?? [];
      const name = wardName.get(row.ward_id);
      if (name) arr.push(name);
      wardsByDept.set(row.department_id, arr);
    }
    const { data: officers } = ids.length
      ? await admin
          .from("department_officers")
          .select("department_id,name,email")
          .in("department_id", ids)
      : { data: [] };
    const officerByDept = new Map(
      (officers ?? []).map((o) => [o.department_id, o]),
    );
    let filtered = list.filter((d) => {
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.official_email.toLowerCase().includes(q) ||
        (d.applicant_name ?? "").toLowerCase().includes(q)
      );
    });
    const total = filtered.length;
    filtered = filtered.slice((page - 1) * perPage, page * perPage);
    return Response.json({
      departments: filtered.map((d) => ({
        ...d,
        wards: wardsByDept.get(d.id) ?? [],
        officer: officerByDept.get(d.id) ?? null,
      })),
      total,
      page,
      per_page: perPage,
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}

const CreateDepartment = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  official_email: z.string().email(),
  official_phone: z.string().max(20).optional(),
  applicant_name: z.string().min(2).max(200).optional(),
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
  submit: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;
    const body = await req.json();
    const parsed = CreateDepartment.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const v = parsed.data;
    const admin = createAdminClient();
    // Duplicate live email check.
    const { data: dup } = await admin
      .from("departments")
      .select("id")
      .ilike("official_email", v.official_email)
      .not("status", "in", '("rejected","deactivated")')
      .limit(1);
    if ((dup ?? []).length > 0) {
      return apiError(
        "DUPLICATE",
        "A department with this official email already exists.",
        409,
      );
    }
    const { data: dept, error: dErr } = await admin
      .from("departments")
      .insert({
        name: v.name,
        description: v.description ?? null,
        official_email: v.official_email,
        official_phone: v.official_phone ?? null,
        applicant_name: v.applicant_name ?? null,
        status: "draft",
        source: "admin_created",
        created_by: session.userId,
      } as never)
      .select()
      .single();
    if (dErr) throw new Error(dErr.message);
    const deptId = (dept as Department).id;
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
    let result = dept as Department;
    if (v.submit) {
      result = await callDbFunction<Department>(admin, "transition_department", {
        p_dept: deptId,
        p_to: "pending",
        p_actor: session.userId,
        p_reason: null,
        p_ip: clientIp(req),
        p_device: deviceOf(req),
      });
      await signAuditBestEffort();
    } else {
      // Draft creation is an admin action too — audit it explicitly.
      await callDbFunction(admin, "write_audit", {
        p_actor: session.userId,
        p_role: "admin",
        p_action: "DEPARTMENT_CREATED",
        p_etype: "department",
        p_entity: deptId,
        p_old: null,
        p_new: "draft",
        p_reason: "Created by admin",
        p_ip: clientIp(req),
        p_device: deviceOf(req),
      });
      await signAuditBestEffort();
    }
    return Response.json({ department: result }, { status: 201 });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
