/**
 * GET /api/assessment/history
 * Returns a list of the current user's assessments (newest first),
 * with only the fields needed for a history list view.
 */

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, rateLimited } from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";

export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const rows = await db.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        propertyType: true,
        city: true,
        state: true,
        country: true,
        suitabilityScore: true,
        recommendedCapacity: true,
        estimatedAnnualSavings: true,
        createdAt: true,
      },
    });

    const data = rows.map((r) => ({
      id: r.id,
      propertyType: r.propertyType,
      city: r.city,
      state: r.state,
      country: r.country,
      suitabilityScore: r.suitabilityScore,
      recommendedCapacity: r.recommendedCapacity,
      estimatedAnnualSavings: r.estimatedAnnualSavings,
      createdAt: r.createdAt.toISOString(),
    }));

    return jsonOk({ assessments: data });
  } catch (err) {
    return handleError(err);
  }
}
