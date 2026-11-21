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
      className={`rounded px-3 py-2 text-sm font-semibold ${
        pathname === href
          ? "bg-teal-soft text-teal"
          : "text-navy hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex items-center gap-1">
      <span className="mr-2 hidden text-sm text-slate-muted md:inline">
        Namaskara, {name}
      </span>
      {link("/citizen", "Home", "nav-citizen-home")}
      {link("/citizen/report", "Report an issue", "nav-citizen-report")}
      {link("/citizen/complaints", "My complaints", "nav-citizen-complaints")}
      <button
        onClick={signOut}
        data-testid="nav-sign-out"
        className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-100"
      >
        Sign out
      </button>
    </nav>
  );
}
