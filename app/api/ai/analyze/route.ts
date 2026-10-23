/**
 * POST /api/ai/analyze
 * Body: { assessmentId }
 * Loads owned assessment, deserializes, calls analyzeAssessment,
 * updates the record's aiRecommendation field, returns the recommendation.
 * Rate-limited: 15 req/min per IP.
 */

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { analyzeAssessment } from "@/lib/ai";
import {
  deserializeResults,
  deserializeWeather,
  serializeAI,
} from "@/lib/solar/helpers";
import { reconstructAssessmentInput } from "@/lib/solar/mapping";
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

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_AI);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    if (!body || typeof body !== "object") {
      return jsonError(400, "Invalid request body.");
    }
    const assessmentId = body.assessmentId;
    if (typeof assessmentId !== "string" || !assessmentId.trim()) {
      return jsonError(400, "assessmentId is required.");
    }

    const record = await db.assessment.findUnique({ where: { id: assessmentId } });
    if (!record) return jsonError(404, "Assessment not found.");
    if (record.userId !== user.id && user.role !== "admin") {
      return jsonError(404, "Assessment not found.");
    }

    const input = reconstructAssessmentInput(record);
    const results = deserializeResults(record.calculationResults);
    if (!results) {
      return jsonError(500, "Stored calculation results are missing.");
    }
    const weather = deserializeWeather(record.weatherData);

    const recommendation = await analyzeAssessment(input, results, weather?.note);

    await db.assessment.update({
      where: { id: record.id },
      data: { aiRecommendation: serializeAI(recommendation) },
    });

    return jsonOk({ recommendation });
  } catch (err) {
    return handleError(err);
  }
}
