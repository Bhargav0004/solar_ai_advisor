/**
 * POST /api/auth/login
 * Body: { email, password }
 * Verifies credentials, signs token, sets httpOnly cookie, returns user.
 * Rate-limited: 10 req/min per IP. 401 on bad credentials.
 */

import { db } from "@/lib/db";
import {
  setAuthCookie,
  signToken,
  verifyPassword,
} from "@/lib/auth";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import {
  handleError,
  jsonError,
  jsonOk,
  parseJsonBody,
  rateLimited,
} from "@/lib/api-response";
import { validateLoginPayload } from "@/lib/solar/validation";

export async function POST(req: Request) {
  try {
    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_AUTH);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    const parsed = validateLoginPayload(body);
    if (!parsed.ok) return jsonError(400, parsed.error);
    const { email, password } = parsed.value;

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return jsonError(401, "Invalid email or password.");
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return jsonError(401, "Invalid email or password.");
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setAuthCookie(token);

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
