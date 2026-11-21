import NewDepartmentForm from "./NewDepartmentForm";
import { PageHeader, GlassCard } from "@/components/ui";

export default function NewDepartmentPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Create department"
        sub="Departments created here enter the same review flow as online applications: they stay inactive until approved and activated."
      />
      <GlassCard className="mt-6 max-w-2xl p-6 sm:p-8">
        <NewDepartmentForm />
      </GlassCard>
    </div>
  );
}
