// Officer invite — server wrapper. The form reads ?token= via
// useSearchParams, so it renders inside a Suspense boundary.
import { Suspense } from "react";
import AcceptInviteForm from "./AcceptInviteForm";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="glass w-full max-w-md rounded-3xl p-6">
            <div className="h-5 w-2/3 animate-pulse rounded bg-indigo/10" />
            <p className="mt-3 text-sm text-slate-muted">Loading invite…</p>
          </div>
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
