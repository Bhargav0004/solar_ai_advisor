/**
 * POST /api/auth/logout
 * Clears the auth cookie. Always returns { ok: true }.
 */

import { clearAuthCookie } from "@/lib/auth";
import { handleError, jsonOk } from "@/lib/api-response";

export async function POST() {
  try {
    await clearAuthCookie();
    return jsonOk({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
