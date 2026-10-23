/**
 * GET /api/weather?city=&state=&country=
 * Returns weather data for the given location.
 */

import { requireUser } from "@/lib/auth";
import { getWeatherData } from "@/lib/weather";
import {
  handleError,
  jsonError,
  jsonOk,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";

export async function GET(req: Request) {
  try {
    await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const url = new URL(req.url);
    const city = url.searchParams.get("city")?.trim();
    const state = url.searchParams.get("state")?.trim() || undefined;
    const country = url.searchParams.get("country")?.trim() || undefined;

    if (!city) return jsonError(400, "Query parameter 'city' is required.");

    const weatherData = await getWeatherData(city, state, country);
    return jsonOk({ weather: weatherData });
  } catch (err) {
    return handleError(err);
  }
}
