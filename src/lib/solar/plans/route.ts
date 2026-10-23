/**
 * POST /api/solar/plans
 * Returns matched solar company plans for the user's assessment.
 *
 * Body:
 *   { assessmentId: string }
 *   OR
 *   { capacityKW, budget, panelType, propertyType, state, includeBattery }
 *
 * Response:
 *   { recommendation: PlansRecommendation, input: PlanMatchInput }
 */

import { requireUser } from "@/lib/auth";
import {
  handleError,
  jsonError,
  jsonOk,
  parseJsonBody,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import { matchPlans } from "@/lib/solar/plans";
import { db } from "@/lib/db";
import { deserializeResults } from "@/lib/solar/helpers";
import type { PlanMatchInput } from "@/types/solar";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    if (!body) return jsonError(400, "Invalid request body.");

    let input: PlanMatchInput;

    // Option 1: by assessmentId
    if (body.assessmentId) {
      const record = await db.assessment.findUnique({
        where: { id: String(body.assessmentId) },
      });
      if (!record) return jsonError(404, "Assessment not found.");
      if (record.userId !== user.id && user.role !== "admin") {
        return jsonError(404, "Assessment not found.");
      }
      const results = deserializeResults(record.calculationResults);
      if (!results) return jsonError(500, "Assessment results missing.");

      input = {
        recommendedCapacityKW: results.recommendedCapacityKW,
        budget: record.budget,
        panelType: record.panelType as PlanMatchInput["panelType"],
        propertyType: record.propertyType as PlanMatchInput["propertyType"],
        state: record.state,
        includeBattery: results.batteryRecommendation.status !== "Not needed",
      };
    } else {
      // Option 2: direct params
      const capacity = Number(body.capacityKW || body.recommendedCapacityKW);
      const budget = Number(body.budget);
      if (!capacity || capacity <= 0) {
        return jsonError(400, "capacityKW is required and must be > 0.");
      }
      if (!budget || budget < 0) {
        return jsonError(400, "budget is required.");
      }
      input = {
        recommendedCapacityKW: capacity,
        budget,
        panelType: body.panelType || "no-preference",
        propertyType: body.propertyType || "residential",
        state: String(body.state || ""),
        includeBattery: Boolean(body.includeBattery),
      };
    }

    const recommendation = matchPlans(input);
    return jsonOk({ recommendation, input });
  } catch (err) {
    return handleError(err);
  }
}

/** GET — returns the full catalog (for browsing without matching). */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const { SOLAR_PLANS } = await import("@/lib/solar/plans");
    return jsonOk({ plans: SOLAR_PLANS, count: SOLAR_PLANS.length });
  } catch (err) {
    return handleError(err);
  }
}
