/**
 * POST /api/solar/calculate
 * Body: AssessmentInput
 * Fast preview: fetch weather, compute results, return { results, weatherData }.
 * Does NOT call AI and does NOT persist.
 */

import { requireUser } from "@/lib/auth";
import { getWeatherData } from "@/lib/weather";
import { calculateSolar } from "@/lib/solar/engine";
import { validateAssessmentInput } from "@/lib/solar/validation";
import {
  handleError,
  jsonError,
  jsonOk,
  parseJsonBody,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return jsonError(401, "Please sign in to continue.");

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    const parsed = validateAssessmentInput(body);
    if (!parsed.ok) return jsonError(400, parsed.error);
    const input = parsed.value;

    const weatherData = await getWeatherData(input.city, input.state, input.country);
    const results = calculateSolar(input, weatherData);

    return jsonOk({ results, weatherData });
  } catch (err) {
    return handleError(err);
  }
}
