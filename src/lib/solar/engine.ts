/**
 * SolarAI - Deterministic Calculation Engine
 * ===============================================================
 * ALL numerical solar calculations happen here. The AI is NEVER
 * asked to perform critical math. The AI only explains and adds
 * qualitative insights based on the numbers produced here.
 *
 * Every formula is documented inline. All assumptions come from
 * ./config.ts (central configuration).
 */

import { SOLAR_CONFIG } from "./config";
import type {
  AssessmentInput,
  Appliance,
  ApplianceConsumption,
  CalculationResults,
  PropertyType,
  WeatherData,
} from "@/types/solar";

/** Round to n decimals safely. */
function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

/** Estimate monthly consumption (kWh) from a monthly bill and property type tariff. */
export function estimateConsumptionFromBill(
  monthlyBill: number,
  propertyType: PropertyType,
): number {
  const tariff =
    SOLAR_CONFIG.ELECTRICITY_TARIFF[propertyType] ??
    SOLAR_CONFIG.ELECTRICITY_TARIFF.residential;
  return round(monthlyBill / tariff, 2);
}

/** Compute appliance-level monthly consumption (kWh). */
export function computeApplianceConsumption(
  appliances: Appliance[],
): { breakdown: ApplianceConsumption[]; totalKWh: number } {
  const items = appliances
    .filter((a) => a && a.name && a.quantity > 0 && a.wattage >= 0 && a.hoursPerDay >= 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      kWhPerMonth: round(
        (a.wattage * a.quantity * a.hoursPerDay * a.daysPerMonth) / 1000,
        2,
      ),
    }));

  const totalKWh = round(items.reduce((s, i) => s + i.kWhPerMonth, 0), 2);
  const breakdown = items.map((i) => ({
    ...i,
    percentage: totalKWh > 0 ? round((i.kWhPerMonth / totalKWh) * 100, 1) : 0,
  }));
  return { breakdown, totalKWh };
}

/** Resolve the effective peak sun hours. Prefer weather data, then user input, then fallback. */
export function resolveSunlightHours(
  userInput: number,
  weather: WeatherData | null,
): { hours: number; source: "weather" | "user" | "fallback" } {
  if (weather && weather.estimatedPeakSunHours > 0) {
    return { hours: round(weather.estimatedPeakSunHours, 2), source: "weather" };
  }
  if (userInput && userInput > 0) {
    return { hours: round(userInput, 2), source: "user" };
  }
  // Fallback: global average ~ 4.5 peak sun hours
  return { hours: 4.5, source: "fallback" };
}

/** Get per-panel wattage & area for a panel type. */
export function panelSpecs(panelType: string) {
  switch (panelType) {
    case "monocrystalline":
      return {
        wattage: SOLAR_CONFIG.PANEL.MONOCRYSTALLINE_WATT,
        areaSqFt: SOLAR_CONFIG.PANEL.MONOCRYSTALLINE_AREA_SQFT,
        efficiency: SOLAR_CONFIG.PANEL.EFFICIENCY.monocrystalline,
      };
    case "polycrystalline":
      return {
        wattage: SOLAR_CONFIG.PANEL.POLYCRYSTALLINE_WATT,
        areaSqFt: SOLAR_CONFIG.PANEL.POLYCRYSTALLINE_AREA_SQFT,
        efficiency: SOLAR_CONFIG.PANEL.EFFICIENCY.polycrystalline,
      };
    default:
      return {
        wattage: SOLAR_CONFIG.PANEL.NO_PREFERENCE_WATT,
        areaSqFt: SOLAR_CONFIG.PANEL.NO_PREFERENCE_AREA_SQFT,
        efficiency: SOLAR_CONFIG.PANEL.EFFICIENCY["no-preference"],
      };
  }
}

/**
 * Core calculation. Pure function — no side effects, no AI calls.
 */
export function calculateSolar(
  input: AssessmentInput,
  weather: WeatherData | null,
): CalculationResults {
  const tariff =
    SOLAR_CONFIG.ELECTRICITY_TARIFF[input.propertyType] ??
    SOLAR_CONFIG.ELECTRICITY_TARIFF.residential;

  // ---------- 1. Consumption ----------
  const applianceCalc = computeApplianceConsumption(input.appliances);
  let monthlyConsumption: number;
  let consumptionSource: CalculationResults["consumptionSource"];

  if (input.monthlyConsumption && input.monthlyConsumption > 0) {
    monthlyConsumption = round(input.monthlyConsumption, 2);
    consumptionSource = "provided";
  } else if (applianceCalc.totalKWh > 0) {
    // If appliances are detailed, use the larger of bill-estimate and appliance-estimate
    const fromBill = estimateConsumptionFromBill(input.monthlyBill, input.propertyType);
    monthlyConsumption = round(Math.max(fromBill, applianceCalc.totalKWh), 2);
    consumptionSource = "estimated-from-appliances";
  } else {
    monthlyConsumption = estimateConsumptionFromBill(input.monthlyBill, input.propertyType);
    consumptionSource = "estimated-from-bill";
  }

  const annualConsumption = round(monthlyConsumption * 12, 2);

  // ---------- 2. Solar capacity ----------
  const offsetFraction = Math.min(Math.max(input.energyOffset, 0), 100) / 100;
  const targetMonthlyGeneration = round(monthlyConsumption * offsetFraction, 2);

  const { hours: sunlightHours } = resolveSunlightHours(input.sunlightHours, weather);
  const orientationFactor =
    SOLAR_CONFIG.ORIENTATION_FACTOR[input.orientation] ?? 0.9;
  const shadingFactor = SOLAR_CONFIG.SHADING_FACTOR[input.shading] ?? 0.9;
  const { efficiency: panelEfficiency } = panelSpecs(input.panelType);

  const systemDerating = SOLAR_CONFIG.SYSTEM_DERATING_FACTOR;
  // Capacity needed so that (capacity_kW * sunlightHours * 30 * derating * orientation * shading * panelEff) >= targetMonthlyGeneration
  const effectiveMultiplier =
    sunlightHours * 30 * systemDerating * orientationFactor * shadingFactor * panelEfficiency;

  let recommendedCapacityKW =
    effectiveMultiplier > 0 ? targetMonthlyGeneration / effectiveMultiplier : 0;
  recommendedCapacityKW = round(Math.max(recommendedCapacityKW, 0.5), 2);

  // ---------- 3. Generation ----------
  const dailyGeneration = round(
    recommendedCapacityKW * sunlightHours * systemDerating * orientationFactor * shadingFactor * panelEfficiency,
    2,
  );
  const monthlyGeneration = round(dailyGeneration * 30, 2);
  const annualGeneration = round(monthlyGeneration * 12, 2);

  // Monthly distribution for charts
  const dist = SOLAR_CONFIG.MONTHLY_DISTRIBUTION;
  const distSum = dist.reduce((a, b) => a + b, 0);
  const monthlyGenerationArr = SOLAR_CONFIG.MONTH_NAMES.map((month, i) => {
    const generation = round((annualGeneration * dist[i]) / distSum, 2);
    const consumption = round(monthlyConsumption, 2);
    const gridDependency = round(Math.max(consumption - generation, 0), 2);
    return { month, generation, consumption, gridDependency };
  });

  // ---------- 4. Panels & roof ----------
  const { wattage: panelWattage, areaSqFt: panelAreaPerUnit } = panelSpecs(input.panelType);
  const panelCount = Math.ceil((recommendedCapacityKW * 1000) / panelWattage);
  const requiredRoofAreaSqFt = round(panelCount * panelAreaPerUnit, 2);

  const usableRoofArea = input.roofArea * SOLAR_CONFIG.ROOF_UTILIZATION_FACTOR;
  const maxCapacityByRoofKW = round(
    (usableRoofArea / panelAreaPerUnit) * (panelWattage / 1000),
    2,
  );

  let roofFeasibility: CalculationResults["roofFeasibility"];
  if (requiredRoofAreaSqFt <= input.roofArea * 0.7) {
    roofFeasibility = "Sufficient";
  } else if (requiredRoofAreaSqFt <= input.roofArea) {
    roofFeasibility = "Limited";
  } else {
    roofFeasibility = "Insufficient";
  }

  // ---------- 5. Cost ----------
  const costBand =
    SOLAR_CONFIG.COST_PER_KW[input.propertyType] ?? SOLAR_CONFIG.COST_PER_KW.residential;
  const installationCostMin = round(recommendedCapacityKW * costBand.min, 0);
  const installationCostMax = round(recommendedCapacityKW * costBand.max, 0);
  const installationCostAvg = round(recommendedCapacityKW * costBand.avg, 0);

  // ---------- 6. Savings ----------
  // Self-consumed solar displaces grid electricity at the retail tariff.
  // Surplus exported is valued conservatively at ~50% of retail (net-metering approximation).
  const selfConsumedRatio = Math.min(
    1,
    monthlyConsumption > 0 ? monthlyGeneration / monthlyConsumption : 0.6,
  );
  const blendedTariff = tariff * 0.6 + tariff * 0.5 * 0.4; // 60% self-consumed at retail, 40% exported at 50%
  const monthlySavings = round(monthlyGeneration * blendedTariff, 0);
  const annualSavings = round(monthlySavings * 12, 0);

  // Lifetime savings with tariff escalation and panel degradation
  const lifetimeYears = SOLAR_CONFIG.SYSTEM_LIFETIME_YEARS;
  const annualSavingsSeries: { year: number; savings: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let y = 1; y <= lifetimeYears; y++) {
    const degradation = Math.pow(1 - SOLAR_CONFIG.ANNUAL_DEGRADATION, y - 1);
    const escalation = Math.pow(1 + SOLAR_CONFIG.TARIFF_ESCALATION, y - 1);
    const yearSavings = round(annualSavings * degradation * escalation, 0);
    cumulative += yearSavings;
    annualSavingsSeries.push({ year: y, savings: yearSavings, cumulative: round(cumulative, 0) });
  }
  const lifetimeSavings = round(cumulative, 0);

  // ---------- 7. Payback ----------
  const paybackYears =
    annualSavings > 0 ? round(installationCostAvg / annualSavings, 1) : 0;

  // ---------- 8. CO2 ----------
  const annualCO2ReductionKg = round(
    annualGeneration * SOLAR_CONFIG.GRID_EMISSION_FACTOR_KG_PER_KWH,
    1,
  );
  const lifetimeCO2ReductionKg = round(annualCO2ReductionKg * lifetimeYears * 0.97, 1); // slight degradation over life
  const annualCO2ReductionTons = round(annualCO2ReductionKg / 1000, 2);
  const lifetimeCO2ReductionTons = round(lifetimeCO2ReductionKg / 1000, 2);

  // ---------- 9. Suitability score (0-100) ----------
  const factors = computeSuitabilityFactors({
    roofArea: input.roofArea,
    requiredRoofArea: requiredRoofAreaSqFt,
    orientation: input.orientation,
    shading: input.shading,
    sunlightHours,
    monthlyConsumption,
    budget: input.budget,
    installationCostAvg,
    energyOffset: input.energyOffset,
    monthlyGeneration,
  });

  const w = SOLAR_CONFIG.SUITABILITY_WEIGHTS;
  const suitabilityScore = Math.round(
    factors.roofSuitability * w.roofSuitability * 100 +
      factors.solarResource * w.solarResource * 100 +
      factors.budgetSuitability * w.budgetSuitability * 100 +
      factors.energyDemand * w.energyDemand * 100 +
      factors.shading * w.shading * 100,
  );

  const suitabilityLabel = suitabilityLabelFor(suitabilityScore);

  // ---------- 10. Battery recommendation ----------
  const batteryRecommendation = computeBatteryRecommendation({
    monthlyGeneration,
    monthlyConsumption,
    tariff,
    roofFeasibility,
    energyOffset: input.energyOffset,
  });

  return {
    monthlyConsumptionKWh: monthlyConsumption,
    annualConsumptionKWh: annualConsumption,
    consumptionSource,
    applianceBreakdown: applianceCalc.breakdown,
    targetMonthlyGenerationKWh: targetMonthlyGeneration,
    recommendedCapacityKW,
    dailyGenerationKWh: dailyGeneration,
    monthlyGenerationKWh: monthlyGeneration,
    annualGenerationKWh: annualGeneration,
    monthlyGeneration: monthlyGenerationArr,
    panelWattage,
    panelCount,
    panelAreaPerUnit,
    requiredRoofAreaSqFt,
    roofFeasibility,
    maxCapacityByRoofKW,
    installationCostMin,
    installationCostMax,
    installationCostAvg,
    monthlySavings,
    annualSavings,
    lifetimeSavings,
    annualSavingsSeries,
    paybackYears,
    annualCO2ReductionKg,
    lifetimeCO2ReductionKg,
    annualCO2ReductionTons,
    lifetimeCO2ReductionTons,
    suitabilityScore,
    suitabilityLabel,
    factors,
    batteryRecommendation,
    effectiveSunlightHours: sunlightHours,
    effectiveTariff: tariff,
    systemDerating,
    orientationFactor,
    shadingFactor,
  };
}

/** Compute the 5 sub-factors (each 0..1) that feed the suitability score. */
function computeSuitabilityFactors(args: {
  roofArea: number;
  requiredRoofArea: number;
  orientation: AssessmentInput["orientation"];
  shading: AssessmentInput["shading"];
  sunlightHours: number;
  monthlyConsumption: number;
  budget: number;
  installationCostAvg: number;
  energyOffset: number;
  monthlyGeneration: number;
}): CalculationResults["factors"] {
  // Roof suitability: orientation * shading * area sufficiency
  const orientationFactor = SOLAR_CONFIG.ORIENTATION_FACTOR[args.orientation] ?? 0.9;
  const shadingFactor = SOLAR_CONFIG.SHADING_FACTOR[args.shading] ?? 0.9;
  const areaRatio =
    args.requiredRoofArea > 0
      ? Math.min(1, (args.roofArea * SOLAR_CONFIG.ROOF_UTILIZATION_FACTOR) / args.requiredRoofArea)
      : 0.5;
  const roofSuitability = clamp01(
    0.4 * orientationFactor + 0.3 * shadingFactor + 0.3 * areaRatio,
  );

  // Solar resource: based on peak sun hours. 5+ = excellent, 3 = ok, <2 = poor
  const solarResource = clamp01((args.sunlightHours - 1.5) / 4);

  // Budget suitability: how much of the avg installation cost the budget covers
  const budgetSuitability =
    args.installationCostAvg > 0
      ? clamp01(args.budget / args.installationCostAvg)
      : 0.5;

  // Energy demand: higher consumption => better ROI suitability (capped)
  const energyDemand = clamp01(args.monthlyConsumption / 600);

  // Shading factor standalone (already 0..1)
  const shading = clamp01(shadingFactor);

  return {
    roofSuitability: round(roofSuitability, 3),
    solarResource: round(solarResource, 3),
    budgetSuitability: round(budgetSuitability, 3),
    energyDemand: round(energyDemand, 3),
    shading: round(shading, 3),
  };
}

function computeBatteryRecommendation(args: {
  monthlyGeneration: number;
  monthlyConsumption: number;
  tariff: number;
  roofFeasibility: string;
  energyOffset: number;
}): CalculationResults["batteryRecommendation"] {
  const dailyGeneration = args.monthlyGeneration / 30;
  const dailyConsumption = args.monthlyConsumption / 30;
  // Assume ~50% of consumption happens during non-production (evening/night)
  const eveningConsumption = dailyConsumption * 0.5;
  const surplusGeneration = Math.max(0, dailyGeneration - dailyConsumption * 0.6);
  const eveningDependency =
    dailyConsumption > 0 ? eveningConsumption / dailyConsumption : 0.5;

  const suggestedCapacityKWh = Math.min(
    SOLAR_CONFIG.BATTERY.MAX_CAPACITY_KWH,
    Math.max(
      SOLAR_CONFIG.BATTERY.MIN_CAPACITY_KWH,
      round(dailyGeneration * SOLAR_CONFIG.BATTERY.DEFAULT_CAPACITY_FRACTION, 1),
    ),
  );

  let status: CalculationResults["batteryRecommendation"]["status"];
  let primaryBenefit: string;
  let rationale: string;

  if (args.energyOffset >= 75 && surplusGeneration > dailyConsumption * 0.3) {
    status = "Recommended";
    primaryBenefit = "Store surplus daytime generation for evening/night use";
    rationale =
      "Your system produces significant surplus that would otherwise be exported. A battery increases self-consumption and backup resilience.";
  } else if (eveningDependency >= SOLAR_CONFIG.BATTERY.EVENING_DEPENDENCY_THRESHOLD) {
    status = "Potentially useful";
    primaryBenefit = "Evening energy usage / backup power";
    rationale =
      "A meaningful portion of your consumption happens outside solar production hours. A battery can shift surplus solar into the evening.";
  } else {
    status = "Not needed";
    primaryBenefit = "Minimal benefit at current consumption pattern";
    rationale =
      "Your solar generation closely matches consumption timing. A battery may not be cost-effective unless backup power is a priority.";
  }

  return {
    status,
    suggestedCapacityKWh,
    primaryBenefit,
    rationale,
    estimatedCost: round(suggestedCapacityKWh * SOLAR_CONFIG.BATTERY_COST_PER_KWH, 0),
  };
}

/** Scenario simulator — recomputes key outputs for multiple what-if overrides. */
export function simulateScenarios(
  baseResults: CalculationResults,
  baseInput: AssessmentInput,
  scenarios: {
    label: string;
    overrides: {
      capacityKW?: number;
      monthlyConsumptionKWh?: number;
      tariff?: number;
      panelEfficiencyMultiplier?: number;
      roofArea?: number;
      batteryCapacityKWh?: number;
      energyOffsetPct?: number;
    };
  }[],
): ScenarioResult[] {
  const dist = SOLAR_CONFIG.MONTHLY_DISTRIBUTION;
  const distSum = dist.reduce((a, b) => a + b, 0);
  const orientationFactor = SOLAR_CONFIG.ORIENTATION_FACTOR[baseInput.orientation] ?? 0.9;
  const shadingFactor = SOLAR_CONFIG.SHADING_FACTOR[baseInput.shading] ?? 0.9;
  const panelEff = panelSpecs(baseInput.panelType).efficiency;

  return scenarios.map((s) => {
    const capacityKW = s.overrides.capacityKW ?? baseResults.recommendedCapacityKW;
    const monthlyConsumption =
      s.overrides.monthlyConsumptionKWh ?? baseResults.monthlyConsumptionKWh;
    const tariff = s.overrides.tariff ?? baseResults.effectiveTariff;
    const panelEffMult = s.overrides.panelEfficiencyMultiplier ?? 1;
    const roofArea = s.overrides.roofArea ?? baseInput.roofArea;
    const batteryCapacityKWh = s.overrides.batteryCapacityKWh ?? 0;
    const offsetPct = s.overrides.energyOffsetPct ?? baseInput.energyOffset;

    const effectiveMult =
      baseResults.effectiveSunlightHours *
      30 *
      SOLAR_CONFIG.SYSTEM_DERATING_FACTOR *
      orientationFactor *
      shadingFactor *
      panelEff *
      panelEffMult;

    const monthlyGeneration = round(capacityKW * effectiveMult, 2);
    const annualGeneration = round(monthlyGeneration * 12, 2);

    // Roof feasibility for this capacity
    const { areaSqFt } = panelSpecs(baseInput.panelType);
    const panelCount = Math.ceil((capacityKW * 1000) / panelSpecs(baseInput.panelType).wattage);
    const requiredArea = panelCount * areaSqFt;
    let roofFeasibility: ScenarioResult["roofFeasibility"];
    if (requiredArea <= roofArea * 0.7) roofFeasibility = "Sufficient";
    else if (requiredArea <= roofArea) roofFeasibility = "Limited";
    else roofFeasibility = "Insufficient";

    const costBand =
      SOLAR_CONFIG.COST_PER_KW[baseInput.propertyType] ?? SOLAR_CONFIG.COST_PER_KW.residential;
    const installationCost = round(capacityKW * costBand.avg, 0);

    const blendedTariff = tariff * 0.6 + tariff * 0.5 * 0.4;
    const monthlySavings = round(monthlyGeneration * blendedTariff, 0);
    const annualSavings = round(monthlySavings * 12, 0);
    const paybackYears = annualSavings > 0 ? round(installationCost / annualSavings, 1) : 0;

    const annualCO2Tons = round(
      (annualGeneration * SOLAR_CONFIG.GRID_EMISSION_FACTOR_KG_PER_KWH) / 1000,
      2,
    );

    return {
      label: s.label,
      capacityKW: round(capacityKW, 2),
      monthlyGenerationKWh: monthlyGeneration,
      annualGenerationKWh: annualGeneration,
      installationCost,
      monthlySavings,
      annualSavings,
      paybackYears,
      annualCO2ReductionTons: annualCO2Tons,
      roofFeasibility,
      batteryCapacityKWh,
      batteryCost: round(batteryCapacityKWh * SOLAR_CONFIG.BATTERY_COST_PER_KWH, 0),
    };
  });
}

function suitabilityLabelFor(score: number): string {
  if (score >= 85) return "Excellent potential";
  if (score >= 70) return "Good potential";
  if (score >= 55) return "Moderate potential";
  if (score >= 40) return "Limited potential";
  return "Not recommended";
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export { round };
