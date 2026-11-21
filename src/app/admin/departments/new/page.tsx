import NewDepartmentForm from "./NewDepartmentForm";

export default function NewDepartmentPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Create department</h1>
      <p className="mt-1 text-sm text-slate-muted">
        Departments created here enter the same review flow as online
        applications: they stay inactive until approved and activated.
      </p>
      <div className="mt-6">
        <NewDepartmentForm />
      </div>
    </div>
  );
}
