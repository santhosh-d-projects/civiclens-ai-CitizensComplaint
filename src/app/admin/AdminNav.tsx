// Admin navigation with an active-state pill. Client component so the
// current section is highlighted (usePathname); styling only.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", testId: "admin-nav-dashboard" },
  { href: "/admin/departments", label: "Departments", testId: "admin-nav-departments" },
  { href: "/admin/complaints", label: "Complaints", testId: "admin-nav-complaints" },
  { href: "/admin/audit", label: "Audit Log", testId: "admin-nav-audit" },
  { href: "/admin/analytics", label: "Analytics", testId: "admin-nav-analytics" },
];

export default function AdminNav({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  if (variant === "mobile") {
    return (
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Admin">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            data-testid={`${n.testId}-mobile`}
            className={`min-h-[36px] rounded-full px-3 py-2 text-xs font-semibold transition-all ${
              isActive(n.href)
                ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]"
                : "glass text-navy-ink hover:bg-white/90"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="mt-8 flex flex-col gap-1" aria-label="Admin">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          data-testid={n.testId}
          aria-current={isActive(n.href) ? "page" : undefined}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            isActive(n.href)
              ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
