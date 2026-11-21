// Typed wrapper for the security-definer SQL functions (create_complaint,
// transition_department, suspend_department, officer_update_complaint,
// verify_audit, verify_audit_chain, write_audit). The Database type does
// not declare these functions, so .rpc() cannot type-check them directly;
// this helper keeps the call sites honest with explicit generics.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type RpcFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{
  data: unknown;
  error: { message: string } | null;
}>;

export async function callDbFunction<T>(
  client: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  // Call as a method on the client — detaching `rpc` into a bare variable
  // loses `this` and supabase-js throws "Cannot read properties of
  // undefined (reading 'rest')".
  const { data, error } = await (client as unknown as { rpc: RpcFn }).rpc(
    name,
    args,
  );
  if (error) throw new Error(error.message);
  return data as T;
}
