// Login page — server wrapper. The form reads ?next= via useSearchParams,
// so it must render inside a Suspense boundary (Next 16 prerender rule).
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
          <p className="text-sm text-slate-muted">Loading sign-in…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
