/**
 * POST /api/auth/register
 * Body: { name, email, password }
 * Creates a new user (role "user"), signs token, sets httpOnly cookie.
 * Rate-limited: 10 req/min per IP.
 */

import { db } from "@/lib/db";
import {
  hashPassword,
  setAuthCookie,
  signToken,
} from "@/lib/auth";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import {
  handleError,
  jsonError,
  jsonOk,
  parseJsonBody,
  rateLimited,
} from "@/lib/api-response";
import { validateRegisterPayload } from "@/lib/solar/validation";

export async function POST(req: Request) {
  try {
    // Rate-limit
    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_AUTH);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    const parsed = validateRegisterPayload(body);
    if (!parsed.ok) return jsonError(400, parsed.error);
    const { name, email, password } = parsed.value;

    // Check for existing email
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError(409, "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: "user",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setAuthCookie(token);

    return jsonOk({ user });
  } catch (err) {
    return handleError(err);
  }
}
