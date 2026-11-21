// Officer profile — department (read-only) + the officer's own details +
// password change.
import { requireActiveDepartment } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/ui";
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

  return (
    <div>
      <h1 className="text-2xl font-semibold">Department Profile</h1>
      <p className="mt-1 text-sm text-slate-muted">
        Read-only. Changes to your department go through the administrator.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">{d?.name ?? "Department"}</h2>
            {d && <StatusPill status={d.status} />}
          </div>
          {d?.description && <p className="mt-2 text-sm text-slate-muted">{d.description}</p>}
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-muted">Official email</dt>
              <dd className="font-semibold">{d?.official_email}</dd>
            </div>
            {d?.official_phone && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-muted">Official phone</dt>
                <dd className="font-semibold">{d.official_phone}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-muted">Wards covered</dt>
              <dd className="text-right font-semibold">{wardNames.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-muted">Categories handled</dt>
              <dd className="text-right font-semibold">{catNames.join(", ") || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold">Your details</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-muted">Name</dt>
              <dd className="font-semibold">{o?.name ?? session.profile.full_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-muted">Email</dt>
              <dd className="font-semibold">{o?.email ?? session.email}</dd>
            </div>
            {o?.phone && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-muted">Phone</dt>
                <dd className="font-semibold">{o.phone}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-muted">Role</dt>
              <dd className="font-semibold">Department Officer</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-line pt-5">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </div>
  );
}
