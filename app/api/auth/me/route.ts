/**
 * GET /api/auth/me
 * Returns the currently authenticated user, or 401 if not signed in.
 */

import { getCurrentUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Not signed in.");
    return jsonOk({ user });
  } catch (err) {
    return handleError(err);
  }
}
