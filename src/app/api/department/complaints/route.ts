// GET /api/department/complaints — the officer's own department queue.
// Filters: status, severity, category_id, ward_id, q (search ticket/title/
// description), sort, page, pageSize. Only the officer's department's
// complaints are ever returned (department guard enforced first).
import { requireActiveDepartment, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ComplaintStatus, Severity } from "@/lib/database.types";

const STATUSES: ComplaintStatus[] = [
  "submitted",
  "received",
  "in_progress",
  "resolved",
  "closed",
  "reopened",
];
const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export async function GET(req: Request) {
  try {
    const { departmentId } = await requireActiveDepartment();
    const admin = createAdminClient();
    const sp = new URL(req.url).searchParams;

    const status = sp.get("status");
    const severity = sp.get("severity");
    const categoryId = sp.get("category_id");
    const wardId = sp.get("ward_id");
    const q = (sp.get("q") ?? "").trim();
    const sort = sp.get("sort") ?? "newest";
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(sp.get("pageSize") ?? "10", 10) || 10));

    if (status && !STATUSES.includes(status as ComplaintStatus)) {
      return apiError("VALIDATION", "Unknown status filter.", 422);
    }
    if (severity && !SEVERITIES.includes(severity as Severity)) {
      return apiError("VALIDATION", "Unknown severity filter.", 422);
    }

    let query = admin
      .from("complaints")
      .select(
        "id,ticket_no,title,description,severity,status,category_id,ward_id,sla_due_at,created_at,updated_at",
        { count: "exact" },
      )
      .eq("department_id", departmentId);

    if (status) query = query.eq("status", status as ComplaintStatus);
    if (severity) query = query.eq("severity", severity as Severity);
    if (categoryId) query = query.eq("category_id", parseInt(categoryId, 10));
    if (wardId) query = query.eq("ward_id", parseInt(wardId, 10));
    if (q) {
      // Ticket numbers are exact-ish; title/description are substring.
      query = query.or(
        `ticket_no.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`,
      );
    }
    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (sort === "severity") query = query.order("severity", { ascending: false }).order("created_at", { ascending: false });
    else if (sort === "sla") query = query.order("sla_due_at", { ascending: true, nullsFirst: false });
    else query = query.order("created_at", { ascending: false });

    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as {
      id: string;
      ticket_no: string;
      title: string;
      description: string;
      severity: string;
      status: string;
      category_id: number | null;
      ward_id: number | null;
      sla_due_at: string | null;
      created_at: string;
      updated_at: string;
    }[];

    const [{ data: wards }, { data: categories }] = await Promise.all([
      admin.from("wards").select("id,name").order("name"),
      admin.from("categories").select("id,slug,name").order("name"),
    ]);

    return Response.json({
      complaints: rows,
      total: count ?? 0,
      page,
      pageSize,
      wards: (wards ?? []) as { id: number; name: string }[],
      categories: (categories ?? []) as { id: number; slug: string; name: string }[],
    });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
