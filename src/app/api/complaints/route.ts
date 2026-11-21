// POST /api/complaints — create a complaint (master prompt §7).
// The citizen confirms (or changes) the AI suggestion; the server calls
// create_complaint, which re-validates: department active, covers the ward
// and the category. SLA is set by severity inside the function.
import { z } from "zod";
import { getSessionProfile, apiError, sqlErrorToResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDbFunction } from "@/lib/supabase/rpc";
import type { ComplaintStatus } from "@/lib/database.types";

const CreateComplaint = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  language: z.string().optional(),
  category_slug: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  ai_category_slug: z.string().optional(),
  ai_severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  ai_reason: z.string().optional(),
  ai_suggested_department_id: z.string().uuid().optional(),
  department_id: z.string().uuid(),
  ward_id: z.number().int().positive(),
  address: z.string().max(500).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photo_paths: z.array(z.string()).max(5).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) return apiError("UNAUTHORIZED", "Sign in to submit a complaint.", 401);

    const body = await req.json();
    const parsed = CreateComplaint.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
    }
    const v = parsed.data;
    const admin = createAdminClient();

    const { data: cat } = await admin
      .from("categories")
      .select("id")
      .eq("slug", v.category_slug)
      .single();
    if (!cat) return apiError("VALIDATION", "Unknown category.", 422);
    let aiCatId: number | null = null;
    if (v.ai_category_slug) {
      const { data: aiCat } = await admin
        .from("categories")
        .select("id")
        .eq("slug", v.ai_category_slug)
        .single();
      aiCatId = aiCat?.id ?? null;
    }

    const result = await callDbFunction<{ ticket_no: string; id: string }>(
      admin,
      "create_complaint",
      {
        p_citizen: session.userId,
        p_title: v.title,
        p_description: v.description,
        p_language: v.language ?? null,
        p_category: cat.id,
        p_severity: v.severity,
        p_ai_category: aiCatId,
        p_ai_severity: v.ai_severity ?? null,
        p_ai_conf: v.ai_confidence ?? null,
        p_ai_reason: v.ai_reason ?? null,
        p_ai_dept: v.ai_suggested_department_id ?? null,
        p_department: v.department_id,
        p_ward: v.ward_id,
        p_address: v.address ?? null,
        p_lat: v.lat ?? null,
        p_lng: v.lng ?? null,
        p_photos: v.photo_paths ?? [],
      },
    );
    return Response.json(
      { ticket_no: result.ticket_no, id: result.id },
      { status: 201 },
    );
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}

// GET /api/complaints — the citizen's own complaints (newest first).
export async function GET(req: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) return apiError("UNAUTHORIZED", "Sign in to view complaints.", 401);
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const validStatuses: ComplaintStatus[] = [
      "submitted",
      "received",
      "in_progress",
      "resolved",
      "closed",
      "reopened",
    ];
    if (status && !validStatuses.includes(status as ComplaintStatus)) {
      return apiError("VALIDATION", "Unknown status filter.", 422);
    }
    let q = admin
      .from("complaints")
      .select("id,ticket_no,title,category_id,severity,status,sla_due_at,created_at,ward_id")
      .eq("citizen_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (status) q = q.eq("status", status as ComplaintStatus);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return Response.json({ complaints: data ?? [] });
  } catch (err) {
    return sqlErrorToResponse(err);
  }
}
