/**
 * POST /api/assessment
 * Body: AssessmentInput
 * 1. Validate input
 * 2. Fetch weather
 * 3. Calculate solar results
 * 4. AI recommendation
 * 5. Persist (with cached scalar fields)
 * 6. Return full AssessmentRecord (JSON fields deserialized)
 */

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getWeatherData } from "@/lib/weather";
import { calculateSolar } from "@/lib/solar/engine";
import { analyzeAssessment } from "@/lib/ai";
import {
  serializeAI,
  serializeAppliances,
  serializeResults,
  serializeWeather,
} from "@/lib/solar/helpers";
import { validateAssessmentInput } from "@/lib/solar/validation";
import { mapAssessmentRecord } from "@/lib/solar/mapping";
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

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    const parsed = validateAssessmentInput(body);
    if (!parsed.ok) return jsonError(400, parsed.error);
    const input = parsed.value;

    // 2. Weather
    const weatherData = await getWeatherData(input.city, input.state, input.country);

    // 3. Calculation
    const results = calculateSolar(input, weatherData);

    // 4. AI recommendation
    const aiRecommendation = await analyzeAssessment(input, results, weatherData?.note);

    // 5. Persist
    const created = await db.assessment.create({
      data: {
        userId: user.id,
        propertyType: input.propertyType,
        city: input.city,
        state: input.state,
        country: input.country,
        monthlyBill: input.monthlyBill,
        monthlyConsumption: input.monthlyConsumption ?? null,
        estimatedConsumption: results.monthlyConsumptionKWh,
        roofArea: input.roofArea,
        roofType: input.roofType,
        orientation: input.orientation,
        shading: input.shading,
        sunlightHours: input.sunlightHours,
        panelType: input.panelType,
        budget: input.budget,
        energyOffset: input.energyOffset,
        appliances: serializeAppliances(input.appliances),
        weatherData: serializeWeather(weatherData),
        calculationResults: serializeResults(results),
        aiRecommendation: serializeAI(aiRecommendation),
        suitabilityScore: results.suitabilityScore,
        recommendedCapacity: results.recommendedCapacityKW,
        estimatedAnnualSavings: results.annualSavings,
      },
    });

    // 6. Return full record
    return jsonOk(mapAssessmentRecord(created));
  } catch (err) {
    return handleError(err);
  }
}
