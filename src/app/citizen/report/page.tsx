// Report a complaint — server wrapper: loads wards + categories (public
// read) and renders the 5-step wizard.
import { createClient } from "@/lib/supabase/server";
import ReportForm from "./ReportForm";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = await createClient();
  const [{ data: wards }, { data: categories }] = await Promise.all([
    supabase.from("wards").select("id,name,zone").order("name"),
    supabase.from("categories").select("id,slug,name,default_severity").order("name"),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="New complaint"
        title="Report an issue"
        sub="Describe the problem in your own words. Our AI suggests the right department — you confirm it before anything is submitted."
      />
      <div className="mt-6">
        <ReportForm
          wards={wards ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  );
}
