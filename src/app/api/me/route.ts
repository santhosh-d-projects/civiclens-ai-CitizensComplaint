// GET /api/me — returns the signed-in user's role (from profiles in the
// DB) so the login page can route citizens / officers / admins.
import { getSessionProfile, apiError } from "@/lib/auth";

export async function GET() {
  const session = await getSessionProfile();
  if (!session) return apiError("UNAUTHORIZED", "Not signed in.", 401);
  return Response.json({
    role: session.profile.role,
    email: session.email,
    department_id: session.profile.department_id,
  });
}
