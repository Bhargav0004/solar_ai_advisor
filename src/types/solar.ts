/**
 * SolarAI - Shared TypeScript types
 * Used across frontend, backend API routes, and the calculation engine.
 */

export type PropertyType = "residential" | "commercial" | "industrial";
export type RoofType = "flat" | "sloped" | "metal" | "concrete" | "other";
export type Orientation =
  | "North"
  | "South"
  | "East"
  | "West"
  | "South-East"
  | "South-West"
  | "Unknown";
export type Shading = "None" | "Low" | "Medium" | "High";
export type PanelType = "monocrystalline" | "polycrystalline" | "no-preference";

export interface Appliance {
  id: string;
  name: string;
  quantity: number;
  wattage: number; // watts per unit
  hoursPerDay: number;
  daysPerMonth: number;
}

/** Step 1 + 2 + 3 + appliances form payload */
export interface AssessmentInput {
  // Basic
  fullName: string;
  propertyType: PropertyType;
  city: string;
  state: string;
  country: string;
  monthlyBill: number;
  monthlyConsumption?: number | null;
  // Roof
  roofArea: number; // sq ft
  roofType: RoofType;
  orientation: Orientation;
  shading: Shading;
  // Solar
  sunlightHours: number; // peak sun hours/day
  panelType: PanelType;
  budget: number;
  energyOffset: number; // percent
  // Appliances
  appliances: Appliance[];
}

export interface WeatherData {
  source: "open-meteo" | "fallback";
  locationName: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currentTempC?: number;
  cloudCoverPct?: number;
  weatherCode?: number;
  weatherDescription?: string;
  sunrise?: string;
  sunset?: string;
  estimatedPeakSunHours: number;
  monthlySunHours: number[]; // 12 entries
  note?: string;
}

export interface ApplianceConsumption {
  id: string;
  name: string;
  kWhPerMonth: number;
  percentage: number;
}

export interface CalculationResults {
  // Consumption
  monthlyConsumptionKWh: number;
  annualConsumptionKWh: number;
  consumptionSource: "provided" | "estimated-from-bill" | "estimated-from-appliances";
  applianceBreakdown: ApplianceConsumption[];

  // Solar capacity & generation
  targetMonthlyGenerationKWh: number;
  recommendedCapacityKW: number;
  dailyGenerationKWh: number;
  monthlyGenerationKWh: number;
  annualGenerationKWh: number;
  monthlyGeneration: { month: string; generation: number; consumption: number; gridDependency: number }[];

  // Panels
  panelWattage: number;
  panelCount: number;
  panelAreaPerUnit: number;
  requiredRoofAreaSqFt: number;
  roofFeasibility: "Sufficient" | "Limited" | "Insufficient";
  maxCapacityByRoofKW: number;

  // Cost & savings
  installationCostMin: number;
  installationCostMax: number;
  installationCostAvg: number;
  monthlySavings: number;
  annualSavings: number;
  lifetimeSavings: number;
  annualSavingsSeries: { year: number; savings: number; cumulative: number }[];

  // Payback
  paybackYears: number;

  // Environmental
  annualCO2ReductionKg: number;
  lifetimeCO2ReductionKg: number;
  annualCO2ReductionTons: number;
  lifetimeCO2ReductionTons: number;

  // Suitability
  suitabilityScore: number; // 0-100
  suitabilityLabel: string;
  factors: {
    roofSuitability: number;
    solarResource: number;
    budgetSuitability: number;
    energyDemand: number;
    shading: number;
  };

  // Battery
  batteryRecommendation: {
    status: "Recommended" | "Potentially useful" | "Not needed";
    suggestedCapacityKWh: number;
    primaryBenefit: string;
    estimatedCost: number;
    rationale: string;
  };

  // Effective inputs used (after fallbacks)
  effectiveSunlightHours: number;
  effectiveTariff: number;
  systemDerating: number;
  orientationFactor: number;
  shadingFactor: number;
}

export interface AIRecommendation {
  summary: string;
  recommendedSystem: string;
  keyReasons: string[];
  recommendations: string[];
  warnings: string[];
  efficiencyTips: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  propertyType: PropertyType;
  city: string;
  state: string;
  country: string;
  monthlyBill: number;
  monthlyConsumption: number | null;
  estimatedConsumption: number | null;
  roofArea: number;
  roofType: RoofType;
  orientation: Orientation;
  shading: Shading;
  sunlightHours: number;
  panelType: PanelType;
  budget: number;
  energyOffset: number;
  appliances: Appliance[];
  weatherData: WeatherData | null;
  calculationResults: CalculationResults;
  aiRecommendation: AIRecommendation | null;
  suitabilityScore: number;
  recommendedCapacity: number;
  estimatedAnnualSavings: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimulateInput {
  baseResults: CalculationResults;
  baseInput: {
    propertyType: PropertyType;
    monthlyConsumptionKWh: number;
    sunlightHours: number;
    roofArea: number;
    panelType: PanelType;
  };
  overrides: {
    capacityKW?: number;
    monthlyConsumptionKWh?: number;
    tariff?: number;
    panelEfficiencyMultiplier?: number; // 1 = baseline
    roofArea?: number;
    batteryCapacityKWh?: number;
    energyOffsetPct?: number;
  };
}

export interface SimulateResult {
  scenarios: ScenarioResult[];
}

export interface ScenarioResult {
  label: string;
  capacityKW: number;
  monthlyGenerationKWh: number;
  annualGenerationKWh: number;
  installationCost: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  annualCO2ReductionTons: number;
  roofFeasibility: "Sufficient" | "Limited" | "Insufficient";
  batteryCapacityKWh: number;
  batteryCost: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalAssessments: number;
  averageRecommendedCapacityKW: number;
  averageSuitabilityScore: number;
  mostCommonLocations: { location: string; count: number }[];
  assessmentsLast30Days: number;
  assessmentsByDay: { date: string; count: number }[];
  aiApiCalls: number;
  propertyTypeBreakdown: { type: string; count: number }[];
}

// ---- Solar Company Plans feature ----

export type PlanTier = "Basic" | "Standard" | "Premium" | "Enterprise";
export type InverterType = "String" | "Micro" | "Hybrid";

export interface SolarPlan {
  id: string;
  company: string;
  companyInitials: string;
  brandColor: string;
  planName: string;
  tier: PlanTier;
  panelType: "monocrystalline" | "polycrystalline" | "both";
  panelWattage: number;
  panelBrand: string;
  panelEfficiencyPct: number;
  inverterType: InverterType;
  inverterBrand: string;
  batteryIncluded: boolean;
  batteryCapacityKWh: number;
  pricePerKW: number;
  warrantyYears: number;
  performanceWarrantyYears: number;
  freeMonitoringYears: number;
  freeMaintenanceYears: number;
  emiAvailable: boolean;
  emiRatePct: number;
  rating: number;
  reviewsCount: number;
  installationDays: number;
  features: string[];
  minCapacityKW: number;
  maxCapacityKW: number;
  financingAvailable: boolean;
  subsidyAssistance: boolean;
  supportedRegions: string[] | "all";
}

export interface PlanMatchInput {
  recommendedCapacityKW: number;
  budget: number;
  panelType: PanelType;
  propertyType: PropertyType;
  state: string;
  includeBattery: boolean;
}

export interface ScoredPlan {
  plan: SolarPlan;
  totalPrice: number;
  pricePerKW: number;
  emiPerMonth: number;
  budgetFit: number;
  valueScore: number;
  overallScore: number;
  withinBudget: boolean;
  capacityFit: boolean;
  badges: string[];
}

export interface PlansRecommendation {
  cheapest: ScoredPlan | null;
  bestValue: ScoredPlan | null;
  bestOverall: ScoredPlan | null;
  allPlans: ScoredPlan[];
  totalMatches: number;
}