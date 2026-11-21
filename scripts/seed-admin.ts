import { loadEnv } from "./load-env.js";
import { createAdminClient } from "../src/lib/supabase/admin.js";

async function main(): Promise<void> {
// Create (or confirm) the single platform admin (master prompt §5).
// Usage: npm run seed:admin   (env ADMIN_EMAIL / ADMIN_PASSWORD)
// IDEMPOTENT: if a user with ADMIN_EMAIL already exists, creation is
// skipped and the profile is ensured to be role=admin. Prints only a
// confirmation — never the password.

loadEnv();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set (see .env.example).");
  process.exit(1);
}

const admin = createAdminClient();

// Find an existing user by email (listUsers is paginated; the admin is
// normally among the first page).
let existingId: string | null = null;
let page = 1;
while (!existingId) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) {
    console.error("Could not list users:", error.message);
    process.exit(1);
  }
  const found = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (found) existingId = found.id;
  if (data.users.length < 100) break;
  page += 1;
}

if (existingId) {
  console.log(`Admin user already exists: ${email} (id ${existingId}). Skipping creation.`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Platform Admin" },
  });
  if (error || !data.user) {
    console.error("Could not create admin user:", error?.message ?? "unknown error");
    process.exit(1);
  }
  existingId = data.user.id;
  console.log(`Admin user created: ${email} (id ${existingId}).`);
}

const { error: profErr } = await admin
  .from("profiles")
  .update({ role: "admin", full_name: "Platform Admin" } as never)
  .eq("id", existingId);
if (profErr) {
  console.error("Could not promote profile to admin:", profErr.message);
  process.exit(1);
}
console.log(`Profile ${existingId} confirmed as role=admin, full_name='Platform Admin'.`);
console.log("Done. Sign in at /login with the admin email and password.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
