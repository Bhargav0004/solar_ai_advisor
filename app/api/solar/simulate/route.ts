/**
 * POST /api/solar/simulate
 * Body: SimulateInput (or { baseResults, baseInput, scenarios?: [...] })
 * Uses simulateScenarios(baseResults, baseInput, scenariosArray).
 * Returns { scenarios: ScenarioResult[] }.
 *
 * NOTE: The engine's simulateScenarios expects a full AssessmentInput
 * as baseInput (it reads orientation/shading). The SimulateInput type
 * only provides 5 baseInput fields, so we fill the remaining fields
 * with sensible defaults derived from baseResults when not provided.
 */

import { requireUser } from "@/lib/auth";
import { simulateScenarios } from "@/lib/solar/engine";
import {
  inferOrientation,
  inferShading,
  validateSimulateInput,
} from "@/lib/solar/validation";
import {
  handleError,
  jsonError,
  jsonOk,
  parseJsonBody,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import type { AssessmentInput, ScenarioResult } from "@/types/solar";

export async function POST(req: Request) {
  try {
    await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    const parsed = validateSimulateInput(body);
    if (!parsed.ok) return jsonError(400, parsed.error);

    const { baseResults, baseInput, overrides, scenarios } = parsed.value;

    // Construct a full AssessmentInput for the engine.
    const orientation = baseInput.orientation ?? inferOrientation(baseResults.orientationFactor);
    const shading = baseInput.shading ?? inferShading(baseResults.shadingFactor);

    const fullBaseInput: AssessmentInput = {
      fullName: "Simulation",
      propertyType: baseInput.propertyType,
      city: "",
      state: "",
      country: "",
      monthlyBill: 0,
      monthlyConsumption: baseInput.monthlyConsumptionKWh,
      roofArea: baseInput.roofArea,
      roofType: "flat",
      orientation,
      shading,
      sunlightHours: baseInput.sunlightHours,
      panelType: baseInput.panelType,
      budget: 0,
      energyOffset:
        typeof overrides.energyOffsetPct === "number" ? overrides.energyOffsetPct : 100,
      appliances: [],
    };

    // Build scenarios array. Support either:
    //  - body.scenarios: [{ label, overrides }, ...]
    //  - body.overrides: { ... }  (single scenario)
    // Always include a baseline "Current setup" scenario for comparison.
    const scenarioDefs: { label: string; overrides: Record<string, unknown> }[] = [
      { label: "Current setup", overrides: {} },
    ];

    if (scenarios && scenarios.length > 0) {
      for (let i = 0; i < scenarios.length; i++) {
        const s = scenarios[i];
        scenarioDefs.push({
          label: s.label?.trim() || `Scenario ${i + 1}`,
          overrides: s.overrides ?? {},
        });
      }
    } else {
      // Single overrides object -> one custom scenario
      const hasAnyOverride = Object.keys(overrides).length > 0;
      if (hasAnyOverride) {
        scenarioDefs.push({
          label:
            typeof (overrides as { label?: unknown }).label === "string"
              ? (overrides as { label: string }).label
              : "Custom scenario",
          overrides,
        });
      }
    }

    const results: ScenarioResult[] = simulateScenarios(
      baseResults,
      fullBaseInput,
      scenarioDefs,
    );

    return jsonOk({ scenarios: results });
  } catch (err) {
    return handleError(err);
  }
}
