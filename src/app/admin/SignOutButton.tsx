"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      data-testid="sign-out"
      className={
        tone === "dark"
          ? "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          : "glass inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-navy-ink transition-colors hover:bg-white/90"
      }
    >
      Sign out
    </button>
  );
}
