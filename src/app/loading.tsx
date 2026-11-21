// Shown instantly on every soft navigation while the destination's server
// components load (smoke test 21 Nov: link clicks appeared to do nothing
// for several seconds on cold starts).
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        <p className="mt-4 text-sm text-slate-muted">Loading…</p>
      </div>
    </div>
  );
}
