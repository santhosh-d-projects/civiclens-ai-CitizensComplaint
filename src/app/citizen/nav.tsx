// Citizen nav (client) — Home / Report / My Complaints / Sign out.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CitizenNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string, testId: string) => (
    <Link
      key={href}
      href={href}
      data-testid={testId}
      aria-current={pathname === href ? "page" : undefined}
      className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
        pathname === href
          ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]"
          : "text-slate-muted hover:bg-white/80 hover:text-navy-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex flex-wrap items-center gap-1">
      <span className="mr-2 hidden text-sm text-slate-muted lg:inline">
        Namaskara, <span className="font-semibold text-navy-ink">{name}</span>
      </span>
      {link("/citizen", "Home", "nav-citizen-home")}
      {link("/citizen/report", "Report an issue", "nav-citizen-report")}
      {link("/citizen/complaints", "My complaints", "nav-citizen-complaints")}
      <button
        onClick={signOut}
        data-testid="nav-sign-out"
        className="min-h-[44px] rounded-full px-3.5 py-2 text-sm font-semibold text-slate-muted transition-colors hover:bg-white/80 hover:text-navy-ink"
      >
        Sign out
      </button>
    </nav>
  );
}
