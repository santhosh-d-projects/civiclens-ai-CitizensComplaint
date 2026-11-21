// Report a complaint — server wrapper: loads wards + categories (public
// read) and renders the 5-step wizard.
import { createClient } from "@/lib/supabase/server";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = await createClient();
  const [{ data: wards }, { data: categories }] = await Promise.all([
    supabase.from("wards").select("id,name,zone").order("name"),
    supabase.from("categories").select("id,slug,name,default_severity").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Report an issue</h1>
      <p className="mt-1 text-sm text-slate-muted">
        Describe the problem in your own words. Our AI suggests the right
        department — <strong className="text-navy-ink">you confirm it</strong>{" "}
        before anything is submitted.
      </p>
      <div className="mt-6">
        <ReportForm
          wards={wards ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  );
}
