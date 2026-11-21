// Officer invite — server wrapper. The form reads ?token= via
// useSearchParams, so it renders inside a Suspense boundary.
import { Suspense } from "react";
import AcceptInviteForm from "./AcceptInviteForm";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
          <p className="text-sm text-slate-muted">Loading invite…</p>
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
