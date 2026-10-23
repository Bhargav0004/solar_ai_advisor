/**
 * SolarAI - API response helpers
 * ===============================================================
 * Uniform JSON responses with security headers, error normalization,
 * IP extraction and a thin rate-limit wrapper.
 */

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { SOLAR_CONFIG } from "@/lib/solar/config";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

/** Successful JSON response with security headers. */
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...SECURITY_HEADERS,
    },
  });
}

/** Error JSON response `{ error }` with status + security headers. */
export function jsonError(status: number, message: string): Response {
  return NextResponse.json(
    { error: message },
    { status, headers: SECURITY_HEADERS },
  );
}

/** Extract the caller IP from request headers (proxy-aware). */
export function getIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Apply rate-limiting for a request. Returns a 429 Response if the
 * caller has exceeded `max` requests in the window, otherwise null.
 */
export function rateLimited(
  req: Request,
  max: number,
  windowMs: number = SOLAR_CONFIG.RATE_LIMIT.WINDOW_MS,
): Response | null {
  const ip = getIP(req);
  const result = rateLimit(`${ip}:${max}:${windowMs}`, max, windowMs);
  if (!result.allowed) {
    const res = jsonError(429, "Too many requests. Please slow down.");
    res.headers.set("Retry-After", String(Math.ceil(result.resetMs / 1000)));
    return res;
  }
  return null;
}

/**
 * Normalize a thrown error from the auth layer (and elsewhere) into
 * a clean JSON Response. NEVER exposes stack traces to the client.
 */
export function handleError(err: unknown): Response {
  if (err instanceof Error) {
    switch (err.message) {
      case "UNAUTHORIZED":
        return jsonError(401, "Please sign in to continue.");
      case "FORBIDDEN":
        return jsonError(403, "You don't have permission to perform this action.");
    }
    // Prisma unique-constraint violation (P2002) → 409 conflict
    if ("code" in err && (err as { code?: string }).code === "P2002") {
      return jsonError(409, "A record with this value already exists.");
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[API] error:", err);
    } else {
      console.error("[API] error:", err instanceof Error ? err.message : err);
    }
  } else {
    console.error("[API] unknown error:", err);
  }
  return jsonError(500, "Something went wrong on our end. Please try again.");
}

/** Safely parse a JSON request body. Returns null on failure. */
export async function parseJsonBody(req: Request): Promise<any | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
