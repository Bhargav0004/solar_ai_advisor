/**
 * SolarAI - Solar Company Plans Catalog & Matching Engine
 * ===============================================================
 * A curated catalog of realistic solar installation plans from
 * various companies. Plans are matched against the user's assessment
 * (capacity, budget, panel type, location) and scored to recommend
 * the cheapest, best value, and best overall plans.
 *
 * NOTE: Company names are fictional but realistic for demo purposes.
 * Prices reflect typical Indian residential/commercial solar rates
 * (₹40,000–₹65,000 per kW installed).
 */

import type {
  SolarPlan,
  PlanMatchInput,
  ScoredPlan,
  PlansRecommendation,
  PanelType,
} from "@/types/solar";
import { SOLAR_CONFIG } from "./config";

// ============================================================
// CATALOG — realistic solar installation plans
// ============================================================

export const SOLAR_PLANS: SolarPlan[] = [
  {
    id: "sunmax-eco-1",
    company: "SunMax Energy",
    companyInitials: "SM",
    brandColor: "#f59e0b",
    planName: "EcoSave Residential",
    tier: "Basic",
    panelType: "polycrystalline",
    panelWattage: 450,
    panelBrand: "Waaree Poly 450W",
    panelEfficiencyPct: 17.5,
    inverterType: "String",
    inverterBrand: "Delta RPI 5kW",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 42000,
    warrantyYears: 5,
    performanceWarrantyYears: 20,
    freeMonitoringYears: 2,
    freeMaintenanceYears: 1,
    emiAvailable: true,
    emiRatePct: 9.5,
    rating: 4.1,
    reviewsCount: 1240,
    installationDays: 14,
    features: [
      "Polycrystalline panels (budget-friendly)",
      "String inverter with WiFi monitoring",
      "Free site survey & structural design",
      "MNRE-approved components",
      "Net-metering documentation assistance",
    ],
    minCapacityKW: 1,
    maxCapacityKW: 10,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "sunmax-eco-2",
    company: "SunMax Energy",
    companyInitials: "SM",
    brandColor: "#f59e0b",
    planName: "EcoSave Plus",
    tier: "Standard",
    panelType: "monocrystalline",
    panelWattage: 540,
    panelBrand: "Waaree Mono 540W",
    panelEfficiencyPct: 20.2,
    inverterType: "String",
    inverterBrand: "Delta RPI 6kW",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 46000,
    warrantyYears: 7,
    performanceWarrantyYears: 25,
    freeMonitoringYears: 3,
    freeMaintenanceYears: 2,
    emiAvailable: true,
    emiRatePct: 9.0,
    rating: 4.3,
    reviewsCount: 890,
    installationDays: 12,
    features: [
      "Monocrystalline panels (higher efficiency)",
      "String inverter with app monitoring",
      "Free site survey & structural design",
      "MNRE-approved components",
      "Net-metering documentation",
      "2-year free maintenance",
    ],
    minCapacityKW: 2,
    maxCapacityKW: 15,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "solarprime-pro-1",
    company: "SolarPrime India",
    companyInitials: "SP",
    brandColor: "#16a34a",
    planName: "PrimeHome Mono",
    tier: "Standard",
    panelType: "monocrystalline",
    panelWattage: 550,
    panelBrand: "Adani Mono 550W",
    panelEfficiencyPct: 21.0,
    inverterType: "String",
    inverterBrand: "Fronus 5kW",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 48000,
    warrantyYears: 7,
    performanceWarrantyYears: 25,
    freeMonitoringYears: 5,
    freeMaintenanceYears: 2,
    emiAvailable: true,
    emiRatePct: 8.5,
    rating: 4.4,
    reviewsCount: 2150,
    installationDays: 10,
    features: [
      "Tier-1 monocrystalline 550W panels",
      "Premium string inverter",
      "5-year free monitoring app",
      "Free site survey & design",
      "Net-metering assistance",
      "Insurance included (2 years)",
    ],
    minCapacityKW: 2,
    maxCapacityKW: 20,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "solarprime-pro-2",
    company: "SolarPrime India",
    companyInitials: "SP",
    brandColor: "#16a34a",
    planName: "PrimeHome Hybrid",
    tier: "Premium",
    panelType: "monocrystalline",
    panelWattage: 550,
    panelBrand: "Adani Mono 550W",
    panelEfficiencyPct: 21.0,
    inverterType: "Hybrid",
    inverterBrand: "Fronus Hybrid 5kW",
    batteryIncluded: true,
    batteryCapacityKWh: 5,
    pricePerKW: 62000,
    warrantyYears: 10,
    performanceWarrantyYears: 25,
    freeMonitoringYears: 5,
    freeMaintenanceYears: 3,
    emiAvailable: true,
    emiRatePct: 8.5,
    rating: 4.6,
    reviewsCount: 1560,
    installationDays: 14,
    features: [
      "Tier-1 monocrystalline 550W panels",
      "Hybrid inverter (battery + grid)",
      "5 kWh lithium battery included",
      "Backup power during outages",
      "5-year free monitoring",
      "3-year free maintenance",
      "Insurance included (3 years)",
    ],
    minCapacityKW: 3,
    maxCapacityKW: 15,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "greenwatt-premium-1",
    company: "GreenWatt Solutions",
    companyInitials: "GW",
    brandColor: "#0d9488",
    planName: "GreenWatt Premium",
    tier: "Premium",
    panelType: "monocrystalline",
    panelWattage: 575,
    panelBrand: "Vikram Mono 575W",
    panelEfficiencyPct: 22.1,
    inverterType: "Micro",
    inverterBrand: "Enphase IQ8",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 58000,
    warrantyYears: 12,
    performanceWarrantyYears: 30,
    freeMonitoringYears: 10,
    freeMaintenanceYears: 5,
    emiAvailable: true,
    emiRatePct: 7.5,
    rating: 4.7,
    reviewsCount: 720,
    installationDays: 8,
    features: [
      "Premium 575W monocrystalline panels",
      "Microinverter (panel-level optimization)",
      "No single point of failure",
      "10-year free monitoring",
      "5-year free maintenance",
      "30-year performance warranty",
      "Panel-level monitoring app",
    ],
    minCapacityKW: 3,
    maxCapacityKW: 25,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "greenwatt-premium-2",
    company: "GreenWatt Solutions",
    companyInitials: "GW",
    brandColor: "#0d9488",
    planName: "GreenWatt Premium+ Storage",
    tier: "Premium",
    panelType: "monocrystalline",
    panelWattage: 575,
    panelBrand: "Vikram Mono 575W",
    panelEfficiencyPct: 22.1,
    inverterType: "Hybrid",
    inverterBrand: "Enphase IQ8 + Battery",
    batteryIncluded: true,
    batteryCapacityKWh: 10,
    pricePerKW: 72000,
    warrantyYears: 12,
    performanceWarrantyYears: 30,
    freeMonitoringYears: 10,
    freeMaintenanceYears: 5,
    emiAvailable: true,
    emiRatePct: 7.5,
    rating: 4.8,
    reviewsCount: 410,
    installationDays: 12,
    features: [
      "Premium 575W monocrystalline panels",
      "Hybrid microinverter system",
      "10 kWh lithium battery",
      "Full backup power",
      "10-year free monitoring",
      "5-year free maintenance",
      "30-year performance warranty",
      "Panel-level monitoring",
    ],
    minCapacityKW: 4,
    maxCapacityKW: 20,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "heliotech-1",
    company: "HelioTech Solar",
    companyInitials: "HT",
    brandColor: "#dc2626",
    planName: "HelioHome Standard",
    tier: "Standard",
    panelType: "monocrystalline",
    panelWattage: 530,
    panelBrand: "Tata Mono 530W",
    panelEfficiencyPct: 20.5,
    inverterType: "String",
    inverterBrand: "Sungrow 5kW",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 50000,
    warrantyYears: 8,
    performanceWarrantyYears: 25,
    freeMonitoringYears: 5,
    freeMaintenanceYears: 2,
    emiAvailable: true,
    emiRatePct: 8.0,
    rating: 4.5,
    reviewsCount: 3200,
    installationDays: 9,
    features: [
      "Tata Power Solar panels",
      "Sungrow string inverter",
      "5-year monitoring app",
      "Free site survey",
      "Net-metering assistance",
      "8-year inverter warranty",
    ],
    minCapacityKW: 1,
    maxCapacityKW: 30,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "ecovoltz-1",
    company: "EcoVoltz",
    companyInitials: "EV",
    brandColor: "#7c3aed",
    planName: "VoltzBudget Poly",
    tier: "Basic",
    panelType: "polycrystalline",
    panelWattage: 400,
    panelBrand: "Loom Poly 400W",
    panelEfficiencyPct: 16.8,
    inverterType: "String",
    inverterBrand: "Luminous 3kW",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 38000,
    warrantyYears: 5,
    performanceWarrantyYears: 20,
    freeMonitoringYears: 1,
    freeMaintenanceYears: 1,
    emiAvailable: true,
    emiRatePct: 10.0,
    rating: 3.9,
    reviewsCount: 540,
    installationDays: 7,
    features: [
      "Budget polycrystalline panels",
      "Luminous string inverter",
      "Basic monitoring",
      "Free site survey",
      "Net-metering documentation",
    ],
    minCapacityKW: 1,
    maxCapacityKW: 8,
    financingAvailable: true,
    subsidyAssistance: false,
    supportedRegions: "all",
  },
  {
    id: "brightsolar-1",
    company: "BrightSolar Systems",
    companyInitials: "BS",
    brandColor: "#0891b2",
    planName: "BrightHome Mono+",
    tier: "Standard",
    panelType: "monocrystalline",
    panelWattage: 540,
    panelBrand: "RenewSys Mono 540W",
    panelEfficiencyPct: 20.8,
    inverterType: "String",
    inverterBrand: "Huawei 5kW",
    batteryIncluded: false,
    batteryCapacityKWh: 0,
    pricePerKW: 47000,
    warrantyYears: 7,
    performanceWarrantyYears: 25,
    freeMonitoringYears: 5,
    freeMaintenanceYears: 2,
    emiAvailable: true,
    emiRatePct: 8.5,
    rating: 4.4,
    reviewsCount: 1100,
    installationDays: 10,
    features: [
      "RenewSys monocrystalline panels",
      "Huawei smart inverter",
      "5-year monitoring app",
      "Free site survey & design",
      "Net-metering assistance",
      "Bird-proofing included",
    ],
    minCapacityKW: 2,
    maxCapacityKW: 18,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
  {
    id: "brightsolar-2",
    company: "BrightSolar Systems",
    companyInitials: "BS",
    brandColor: "#0891b2",
    planName: "BrightHome Enterprise",
    tier: "Enterprise",
    panelType: "monocrystalline",
    panelWattage: 575,
    panelBrand: "RenewSys Mono 575W",
    panelEfficiencyPct: 22.0,
    inverterType: "Hybrid",
    inverterBrand: "Huawei Hybrid 10kW",
    batteryIncluded: true,
    batteryCapacityKWh: 15,
    pricePerKW: 78000,
    warrantyYears: 12,
    performanceWarrantyYears: 30,
    freeMonitoringYears: 10,
    freeMaintenanceYears: 5,
    emiAvailable: true,
    emiRatePct: 7.0,
    rating: 4.9,
    reviewsCount: 280,
    installationDays: 15,
    features: [
      "Premium 575W monocrystalline panels",
      "Huawei hybrid inverter",
      "15 kWh lithium battery",
      "Full home backup",
      "10-year monitoring",
      "5-year free maintenance",
      "30-year performance warranty",
      "Priority support",
    ],
    minCapacityKW: 5,
    maxCapacityKW: 50,
    financingAvailable: true,
    subsidyAssistance: true,
    supportedRegions: "all",
  },
];

// ============================================================
// MATCHING ENGINE
// ============================================================

/** Calculate EMI per month using reducing balance formula. */
function calcEMI(
  principal: number,
  annualRatePct: number,
  months: number,
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return Math.round(
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1),
  );
}

/** Check if a plan's panel type matches the user's preference. */
function panelTypeMatches(
  planType: SolarPlan["panelType"],
  userPref: PanelType,
): boolean {
  if (planType === "both") return true;
  if (userPref === "no-preference") return true;
  return planType === userPref;
}

/** Check if a plan supports the user's region. */
function regionMatches(supported: string[] | "all", state: string): boolean {
  if (supported === "all") return true;
  const lower = state.toLowerCase().trim();
  return supported.some((s) => s.toLowerCase().trim() === lower);
}

/**
 * Match and score plans against the user's assessment.
 * Returns plans sorted by overall score (desc), plus cheapest/bestValue/bestOverall picks.
 */
export function matchPlans(input: PlanMatchInput): PlansRecommendation {
  const { recommendedCapacityKW, budget, panelType, state, includeBattery } =
    input;

  const scored: ScoredPlan[] = [];

  for (const plan of SOLAR_PLANS) {
    // ---- Eligibility filters ----
    const capacityFit =
      recommendedCapacityKW >= plan.minCapacityKW &&
      recommendedCapacityKW <= plan.maxCapacityKW;
    const panelMatch = panelTypeMatches(plan.panelType, panelType);
    const regionMatch = regionMatches(plan.supportedRegions, state);
    const batteryMatch = includeBattery ? plan.batteryIncluded || true : true;

    if (!capacityFit || !regionMatch) continue;

    // ---- Pricing ----
    const basePrice = plan.pricePerKW * recommendedCapacityKW;
    const totalPrice = Math.round(basePrice);
    const emiPerMonth = plan.emiAvailable
      ? calcEMI(totalPrice, plan.emiRatePct, 60)
      : 0;

    // ---- Budget fit (0-1) ----
    const withinBudget = totalPrice <= budget;
    let budgetFit: number;
    if (budget <= 0) {
      budgetFit = 0.5;
    } else if (totalPrice <= budget) {
      budgetFit = 0.7 + 0.3 * (totalPrice / budget);
    } else {
      const overRatio = totalPrice / budget;
      budgetFit = Math.max(0, 0.5 - (overRatio - 1) * 0.5);
    }

    // ---- Value score (0-100) — quality per rupee ----
    const qualityScore =
      plan.rating * 10 +
      (plan.warrantyYears / 12) * 15 +
      (plan.performanceWarrantyYears / 30) * 10 +
      (plan.freeMonitoringYears / 10) * 5 +
      (plan.freeMaintenanceYears / 5) * 5 +
      (plan.panelEfficiencyPct / 22) * 10 +
      (plan.batteryIncluded ? 5 : 0);

    const minPricePerKW = Math.min(...SOLAR_PLANS.map((p) => p.pricePerKW));
    const maxPricePerKW = Math.max(...SOLAR_PLANS.map((p) => p.pricePerKW));
    const priceScore =
      maxPricePerKW > minPricePerKW
        ? 30 *
          (1 -
            (plan.pricePerKW - minPricePerKW) / (maxPricePerKW - minPricePerKW))
        : 15;

    const valueScore = Math.round(qualityScore * 0.7 + priceScore * 0.3);

    // ---- Overall score (0-100) — weighted blend ----
    const overallScore = Math.round(
      valueScore * 0.4 + budgetFit * 100 * 0.35 + plan.rating * 10 * 0.25,
    );

    // ---- Badges ----
    const badges: string[] = [];
    if (plan.batteryIncluded) badges.push("Battery Included");
    if (plan.tier === "Premium") badges.push("Premium");
    if (plan.rating >= 4.5) badges.push("Top Rated");
    if (plan.freeMaintenanceYears >= 3) badges.push("Low Maintenance");
    if (plan.subsidyAssistance) badges.push("Subsidy Help");
    if (!panelMatch) badges.push("Panel Mismatch");

    scored.push({
      plan,
      totalPrice,
      pricePerKW: plan.pricePerKW,
      emiPerMonth,
      budgetFit,
      valueScore,
      overallScore,
      withinBudget,
      capacityFit,
      badges,
    });
  }

  scored.sort((a, b) => b.overallScore - a.overallScore);

  const cheapest =
    scored.length > 0
      ? [...scored].sort((a, b) => a.totalPrice - b.totalPrice)[0]
      : null;
  const bestValue =
    scored.length > 0
      ? [...scored].sort((a, b) => b.valueScore - a.valueScore)[0]
      : null;
  const bestOverall = scored.length > 0 ? scored[0] : null;

  return {
    cheapest,
    bestValue,
    bestOverall,
    allPlans: scored,
    totalMatches: scored.length,
  };
}

/** Format currency in INR. */
export function formatPlanPrice(value: number): string {
  return `${SOLAR_CONFIG.CURRENCY_SYMBOL}${Math.round(value).toLocaleString("en-IN")}`;
}
