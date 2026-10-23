/**
 * SolarAI - Prisma <-> AssessmentRecord mapping helpers
 * ===============================================================
 * Deserialize the JSON-stringified fields stored in SQLite back into
 * their typed object form for the API response, and reconstruct an
 * AssessmentInput from a stored record (for recalculation / AI chat).
 */

import type {
  AIRecommendation,
  Appliance,
  AssessmentInput,
  AssessmentRecord,
  CalculationResults,
  Orientation,
  PanelType,
  PropertyType,
  RoofType,
  Shading,
  WeatherData,
} from "@/types/solar";
import type { Assessment as DbAssessment } from "@prisma/client";
import {
  deserializeAI,
  deserializeAppliances,
  deserializeResults,
  deserializeWeather,
} from "@/lib/solar/helpers";

/** Map a Prisma Assessment row to a fully-typed AssessmentRecord. */
export function mapAssessmentRecord(r: DbAssessment): AssessmentRecord {
  return {
    id: r.id,
    userId: r.userId,
    propertyType: r.propertyType as PropertyType,
    city: r.city,
    state: r.state,
    country: r.country,
    monthlyBill: r.monthlyBill,
    monthlyConsumption: r.monthlyConsumption ?? null,
    estimatedConsumption: r.estimatedConsumption ?? null,
    roofArea: r.roofArea,
    roofType: r.roofType as RoofType,
    orientation: r.orientation as Orientation,
    shading: r.shading as Shading,
    sunlightHours: r.sunlightHours,
    panelType: r.panelType as PanelType,
    budget: r.budget,
    energyOffset: r.energyOffset,
    appliances: deserializeAppliances(r.appliances),
    weatherData: deserializeWeather(r.weatherData),
    calculationResults:
      deserializeResults(r.calculationResults) ?? ({} as CalculationResults),
    aiRecommendation: deserializeAI(r.aiRecommendation),
    suitabilityScore: r.suitabilityScore,
    recommendedCapacity: r.recommendedCapacity,
    estimatedAnnualSavings: r.estimatedAnnualSavings,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Reconstruct an AssessmentInput from a stored Assessment record. */
export function reconstructAssessmentInput(r: DbAssessment): AssessmentInput {
  const appliances: Appliance[] = deserializeAppliances(r.appliances);
  return {
    fullName: "",
    propertyType: r.propertyType as PropertyType,
    city: r.city,
    state: r.state,
    country: r.country,
    monthlyBill: r.monthlyBill,
    monthlyConsumption: r.monthlyConsumption ?? null,
    roofArea: r.roofArea,
    roofType: r.roofType as RoofType,
    orientation: r.orientation as Orientation,
    shading: r.shading as Shading,
    sunlightHours: r.sunlightHours,
    panelType: r.panelType as PanelType,
    budget: r.budget,
    energyOffset: r.energyOffset,
    appliances,
  };
}

/** Type guard for AIRecommendation used when persisting chat context. */
export function isAIRecommendation(v: unknown): v is AIRecommendation {
  return !!v && typeof v === "object" && typeof (v as AIRecommendation).summary === "string";
}
