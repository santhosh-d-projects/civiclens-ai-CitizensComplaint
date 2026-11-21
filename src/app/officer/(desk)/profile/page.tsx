// Officer profile — department (read-only) + the officer's own details +
// password change.
import { requireActiveDepartment } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill, GlassCard, PageHeader } from "@/components/ui";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function OfficerProfile() {
  const { session, departmentId } = await requireActiveDepartment();
  const admin = createAdminClient();

  const [{ data: dept }, { data: wards }, { data: cats }, { data: officer }] =
    await Promise.all([
      admin.from("departments").select("*").eq("id", departmentId).single(),
      admin.from("department_wards").select("ward_id").eq("department_id", departmentId),
      admin.from("department_categories").select("category_id").eq("department_id", departmentId),
      admin
        .from("department_officers")
        .select("name,email,phone")
        .eq("profile_id", session.userId)
        .maybeSingle(),
    ]);

  const d = dept as {
    name: string;
    description: string | null;
    official_email: string;
    official_phone: string | null;
    status: string;
  } | null;
  const wardIds = ((wards ?? []) as { ward_id: number }[]).map((w) => w.ward_id);
  const catIds = ((cats ?? []) as { category_id: number }[]).map((c) => c.category_id);
  const [{ data: wardRows }, { data: catRows }] = await Promise.all([
    wardIds.length > 0
      ? admin.from("wards").select("id,name").in("id", wardIds)
      : Promise.resolve({ data: [] }),
    catIds.length > 0
      ? admin.from("categories").select("id,name").in("id", catIds)
      : Promise.resolve({ data: [] }),
  ]);
  const wardNames = ((wardRows ?? []) as { id: number; name: string }[]).map((w) => w.name);
  const catNames = ((catRows ?? []) as { id: number; name: string }[]).map((c) => c.name);
  const o = officer as { name: string; email: string; phone: string | null } | null;

  const rowClass = "flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line/60 py-2.5 text-sm last:border-0";

  return (
    <div>
      <PageHeader
        eyebrow="Officer Desk"
        title="Department Profile"
        sub="Read-only. Changes to your department go through the administrator."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-base font-bold text-white">
              {(d?.name ?? "D").charAt(0).toUpperCase()}
            </span>
            <h2 className="min-w-0 flex-1 text-base font-bold text-navy-ink">{d?.name ?? "Department"}</h2>
            {d && <StatusPill status={d.status} />}
          </div>
          {d?.description && <p className="mt-3 text-sm leading-6 text-slate-muted">{d.description}</p>}
          <dl className="mt-4">
            <div className={rowClass}>
              <dt className="text-slate-muted">Official email</dt>
              <dd className="font-semibold text-navy-ink">{d?.official_email}</dd>
            </div>
            {d?.official_phone && (
              <div className={rowClass}>
                <dt className="text-slate-muted">Official phone</dt>
                <dd className="font-semibold text-navy-ink">{d.official_phone}</dd>
              </div>
            )}
            <div className={rowClass}>
              <dt className="shrink-0 text-slate-muted">Wards covered</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {wardNames.length > 0 ? (
                  wardNames.map((w) => (
                    <span key={w} className="rounded-full bg-indigo/10 px-2.5 py-1 text-xs font-semibold text-indigo">
                      {w}
                    </span>
                  ))
                ) : (
                  <span className="font-semibold text-navy-ink">—</span>
                )}
              </dd>
            </div>
            <div className={rowClass}>
              <dt className="shrink-0 text-slate-muted">Categories handled</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {catNames.length > 0 ? (
                  catNames.map((c) => (
                    <span key={c} className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="font-semibold text-navy-ink">—</span>
                )}
              </dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-navy-ink">Your details</h2>
          <dl className="mt-4">
            <div className={rowClass}>
              <dt className="text-slate-muted">Name</dt>
              <dd className="font-semibold text-navy-ink">{o?.name ?? session.profile.full_name ?? "—"}</dd>
            </div>
            <div className={rowClass}>
              <dt className="text-slate-muted">Email</dt>
              <dd className="break-all font-semibold text-navy-ink">{o?.email ?? session.email}</dd>
            </div>
            {o?.phone && (
              <div className={rowClass}>
                <dt className="text-slate-muted">Phone</dt>
                <dd className="font-semibold text-navy-ink">{o.phone}</dd>
              </div>
            )}
            <div className={rowClass}>
              <dt className="text-slate-muted">Role</dt>
              <dd className="font-semibold text-navy-ink">Department Officer</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-line/60 pt-5">
            <ChangePasswordForm />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
