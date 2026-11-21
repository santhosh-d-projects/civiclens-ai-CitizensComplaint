// Login page — server wrapper. The form reads ?next= via useSearchParams,
// so it must render inside a Suspense boundary (Next 16 prerender rule).
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 text-center">
            <p className="text-sm text-slate-muted">Loading sign-in…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
