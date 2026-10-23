/**
 * POST /api/assessment/[id]/recalculate
 * Re-runs calculateSolar + analyzeAssessment with the stored input
 * (re-fetches weather too), updates the record, returns updated record.
 */

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getWeatherData } from "@/lib/weather";
import { calculateSolar } from "@/lib/solar/engine";
import { analyzeAssessment } from "@/lib/ai";
import {
  serializeAI,
  serializeResults,
  serializeWeather,
} from "@/lib/solar/helpers";
import { mapAssessmentRecord, reconstructAssessmentInput } from "@/lib/solar/mapping";
import {
  handleError,
  jsonError,
  jsonOk,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const { id } = await params;
    const record = await db.assessment.findUnique({ where: { id } });
    if (!record) return jsonError(404, "Assessment not found.");
    if (record.userId !== user.id && user.role !== "admin") {
      return jsonError(404, "Assessment not found.");
    }

    const input = reconstructAssessmentInput(record);

    // Re-fetch weather
    const weatherData = await getWeatherData(input.city, input.state, input.country);

    // Re-run calculations
    const results = calculateSolar(input, weatherData);

    // Re-run AI analysis
    const aiRecommendation = await analyzeAssessment(input, results, weatherData?.note);

    const updated = await db.assessment.update({
      where: { id },
      data: {
        weatherData: serializeWeather(weatherData),
        calculationResults: serializeResults(results),
        aiRecommendation: serializeAI(aiRecommendation),
        suitabilityScore: results.suitabilityScore,
        recommendedCapacity: results.recommendedCapacityKW,
        estimatedAnnualSavings: results.annualSavings,
        // Keep input scalar fields in sync in case the reconstruction
        // produced normalized values (e.g. appliance ids). Cheap to write.
        monthlyConsumption: input.monthlyConsumption ?? null,
      },
    });

    return jsonOk({ assessment: mapAssessmentRecord(updated) });
  } catch (err) {
    return handleError(err);
  }
}
