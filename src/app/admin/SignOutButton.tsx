"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
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
      className="inline-flex min-h-[44px] items-center justify-center rounded border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
