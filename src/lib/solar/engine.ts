import { getRegion, getLandType, type RegionProfile } from './regions';

// ============================= Types =============================

export interface LandInput {
  farmerName: string;
  landAreaAcres: number;
  state: string;
  district?: string;
  landType: string;
  agriIncomeYearly: number;
  solarRentYearly: number;
  contractYears: number;
  solarGeneration?: number | null; // expected annual kWh (optional)
  escalationPercent?: number; // yearly rent escalation %
}

export interface SolarEnergyResult {
  estimatedCapacityKwp: number;
  capacitySource: 'area_estimate' | 'farmer_provided';
  cuf: number;
  ghi: number;
  year1GenerationKwh: number;
  generationSeries: number[]; // per contract year (degradation applied)
  degradationRate: number;
  rentPerAcre: number; // offered rent / acre
  marketRentMinPerAcre: number; // typical Indian solar lease band
  marketRentMaxPerAcre: number;
  rentVerdict: 'attractive' | 'fair' | 'below_market' | 'very_low';
  impliedTariffPerKwh: number; // informational: rent share of energy value
  annualGenerationValueInr: number; // year-1 energy value at benchmark tariff
}

export interface AgriIncomeResult {
  baseIncome: number;
  adjustedGrowth: number; // annual real+inflation growth used
  volatility: number; // climate volatility 0-1
  productivityFactor: number;
  incomeSeries: number[]; // median path per year
  pessimisticSeries: number[];
  optimisticSeries: number[];
  dominantCrops: string[];
  riskNote: string;
}

export interface YearlyComparison {
  year: number;
  solarIncome: number;
  agriIncome: number;
  solarCumulative: number;
  agriCumulative: number;
}

export interface Scenario {
  name: string;
  description: string;
  solarCumulative: number;
  agriCumulative: number;
  difference: number;
  winner: 'solar' | 'agriculture' | 'near_equal';
}

export interface ForecastResult {
  contractYears: number;
  yearly: YearlyComparison[];
  solarCumulative10y: number;
  agriCumulative10y: number;
  solarNpv: number;
  agriNpv: number;
  npvDiscountRate: number;
  breakevenYear: number | null; // year when cumulative solar overtakes agri
  difference: number; // solar - agri cumulative (base case)
  verdict: 'solar_higher' | 'agriculture_higher' | 'near_equal';
  advantagePercent: number; // relative advantage of the leader
  scenarios: Scenario[];
  postContractNote: string;
}

export interface RiskFactor {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  weight: number; // 0-1 contribution
}

export interface RiskAnalysisResult {
  overallScore: number; // 0-100, higher = riskier
  band: 'low' | 'moderate' | 'elevated' | 'high';
  factors: RiskFactor[];
  summary: string;
}

export interface SuitabilityFactor {
  label: string;
  score: number; // 0-100
  note: string;
}

export interface SuitabilityResult {
  score: number; // 0-100
  band: 'poor' | 'moderate' | 'good' | 'excellent';
  factors: SuitabilityFactor[];
  summary: string;
}

export interface EngineResult {
  region: RegionProfile;
  solarEnergy: SolarEnergyResult;
  agriPrediction: AgriIncomeResult;
  forecast: ForecastResult;
  riskAnalysis: RiskAnalysisResult;
  suitability: SuitabilityResult;
}

// ============================= Constants =============================

const KWP_PER_ACRE = 250; // typical fixed-tilt ground-mount density in India
const DEGRADATION = 0.005; // 0.5%/yr panel degradation
const NPV_RATE = 0.08; // discount rate for NPV
const BENCHMARK_TARIFF = 3.1; // INR/kWh proxy used by developers for lease economics
const INFLATION = 0.04; // general inflation for scenario stresses

// ============================= Solar Energy =============================

export function predictSolarEnergy(input: LandInput, region: RegionProfile): SolarEnergyResult {
  const farmerProvided = input.solarGeneration && input.solarGeneration > 0;
  const capacityKwp = farmerProvided
    ? Math.max(1, (input.solarGeneration as number) / (8760 * region.cuf * (1 - DEGRADATION / 2)))
    : input.landAreaAcres * KWP_PER_ACRE * (1 - getLandType(input.landType).solarPenalty);

  const years = Math.max(1, Math.min(30, input.contractYears));
  const generationSeries: number[] = [];
  for (let y = 1; y <= years; y++) {
    generationSeries.push(capacityKwp * 8760 * region.cuf * Math.pow(1 - DEGRADATION, y - 1));
  }

  const year1GenerationKwh = generationSeries[0];

  // Fairness check based on RENT PER ACRE vs typical Indian solar lease bands.
  // Market band shifts up slightly in high-irradiance states (Rajasthan/Gujarat command premium).
  const rentPerAcre = input.solarRentYearly / Math.max(0.1, input.landAreaAcres);
  const ghiPremium = region.ghi >= 5.4 ? 1.15 : region.ghi >= 5.0 ? 1.05 : 1.0;
  const marketMin = 20000 * ghiPremium;
  const marketMax = 45000 * ghiPremium;

  let rentVerdict: SolarEnergyResult['rentVerdict'];
  if (rentPerAcre >= marketMax) rentVerdict = 'attractive';
  else if (rentPerAcre >= (marketMin + marketMax) / 2) rentVerdict = 'fair';
  else if (rentPerAcre >= marketMin * 0.75) rentVerdict = 'below_market';
  else rentVerdict = 'very_low';

  return {
    estimatedCapacityKwp: round(capacityKwp, 1),
    capacitySource: farmerProvided ? 'farmer_provided' : 'area_estimate',
    cuf: region.cuf,
    ghi: region.ghi,
    year1GenerationKwh: Math.round(year1GenerationKwh),
    generationSeries: generationSeries.map((g) => Math.round(g)),
    degradationRate: DEGRADATION,
    rentPerAcre: Math.round(rentPerAcre),
    marketRentMinPerAcre: Math.round(marketMin),
    marketRentMaxPerAcre: Math.round(marketMax),
    rentVerdict,
    impliedTariffPerKwh: round(input.solarRentYearly / Math.max(1, year1GenerationKwh), 3),
    annualGenerationValueInr: Math.round(year1GenerationKwh * BENCHMARK_TARIFF),
  };
}

// ============================= Agriculture =============================

export function predictAgriIncome(input: LandInput, region: RegionProfile): AgriIncomeResult {
  const lt = getLandType(input.landType);
  const years = Math.max(1, Math.min(30, input.contractYears));

  // Land-type productivity dampens growth potential (irrigated land intensifies faster)
  const productivityFactor = lt.productivity;
  // Climate volatility dampens expected growth but widens the band
  const vol = region.climateVolatility;
  const baseGrowth = region.agriGrowth + INFLATION; // nominal growth
  const adjustedGrowth = baseGrowth * (0.6 + 0.4 * productivityFactor) - vol * 0.01;

  const incomeSeries: number[] = [];
  const pessimisticSeries: number[] = [];
  const optimisticSeries: number[] = [];
  const spread = 0.04 + vol * 0.12; // annual band width

  for (let y = 1; y <= years; y++) {
    const factor = Math.pow(1 + adjustedGrowth, y);
    incomeSeries.push(Math.round(input.agriIncomeYearly * factor));
    pessimisticSeries.push(Math.round(input.agriIncomeYearly * Math.pow(1 + adjustedGrowth - spread, y)));
    optimisticSeries.push(Math.round(input.agriIncomeYearly * Math.pow(1 + adjustedGrowth + spread, y)));
  }

  const riskNote =
    vol >= 0.55
      ? 'High climate volatility region — rainfall variability can swing farm income significantly year to year.'
      : vol >= 0.42
        ? 'Moderate climate volatility — occasional drought or excess-rain years should be expected.'
        : 'Relatively stable climate — farm income expected to be more predictable.';

  return {
    baseIncome: input.agriIncomeYearly,
    adjustedGrowth: round(adjustedGrowth, 4),
    volatility: vol,
    productivityFactor,
    incomeSeries,
    pessimisticSeries,
    optimisticSeries,
    dominantCrops: region.crops,
    riskNote,
  };
}

// ============================= 10-Year Forecast =============================

export function buildForecast(input: LandInput, solar: SolarEnergyResult, agri: AgriIncomeResult): ForecastResult {
  const years = Math.max(1, Math.min(30, input.contractYears));
  const escalation = (input.escalationPercent ?? 0) / 100;

  const yearly: YearlyComparison[] = [];
  let solarCum = 0;
  let agriCum = 0;
  let solarNpv = 0;
  let agriNpv = 0;
  let breakeven: number | null = null;

  for (let y = 1; y <= years; y++) {
    const rent = input.solarRentYearly * Math.pow(1 + escalation, y - 1);
    const farm = agri.incomeSeries[y - 1];
    solarCum += rent;
    agriCum += farm;
    solarNpv += rent / Math.pow(1 + NPV_RATE, y);
    agriNpv += farm / Math.pow(1 + NPV_RATE, y);
    if (breakeven === null && solarCum > agriCum) breakeven = y;
    yearly.push({
      year: y,
      solarIncome: Math.round(rent),
      agriIncome: farm,
      solarCumulative: Math.round(solarCum),
      agriCumulative: Math.round(agriCum),
    });
  }

  const difference = solarCum - agriCum;
  const leader = Math.abs(difference) < agriCum * 0.05 ? 'near_equal' : difference > 0 ? 'solar_higher' : 'agriculture_higher';
  const advantagePercent = round((Math.abs(difference) / Math.max(1, Math.min(solarCum, agriCum))) * 100, 1);

  // ---- Scenario analysis ----
  const scenarios: Scenario[] = [];

  const mkScenario = (name: string, description: string, agriGrowthDelta: number, solarRentFactor: number, escalationDelta: number): Scenario => {
    let sCum = 0;
    let aCum = 0;
    for (let y = 1; y <= years; y++) {
      sCum += input.solarRentYearly * solarRentFactor * Math.pow(1 + escalation + escalationDelta, y - 1);
      aCum += input.agriIncomeYearly * Math.pow(1 + agri.adjustedGrowth + agriGrowthDelta, y);
    }
    const diff = sCum - aCum;
    return {
      name,
      description,
      solarCumulative: Math.round(sCum),
      agriCumulative: Math.round(aCum),
      difference: Math.round(diff),
      winner: Math.abs(diff) < aCum * 0.05 ? 'near_equal' : diff > 0 ? 'solar' : 'agriculture',
    };
  };

  scenarios.push(mkScenario('Pessimistic Farm', 'Farm income grows slowly (drought/prices), solar rent stays as promised.', -0.05, 1.0, 0));
  scenarios.push(mkScenario('Base Case', 'Both sides follow current trends.', 0, 1.0, 0));
  scenarios.push(mkScenario('Optimistic Farm', 'Crop prices / irrigation improve farm income above trend.', +0.04, 1.0, 0));
  scenarios.push(mkScenario('No Escalation Risk', 'Rent stays flat while inflation (~4%) erodes its value.', 0, 1.0, 0));
  scenarios.push(mkScenario('Payment Delays', 'Developer pays late / short in some years (~10% effective loss).', 0, 0.9, 0));
  scenarios.push(mkScenario('High Inflation', 'Inflation ~6%: farm income rises faster, flat rent loses value.', 0.02, 1.0, -0.01));

  return {
    contractYears: years,
    yearly,
    solarCumulative10y: Math.round(solarCum),
    agriCumulative10y: Math.round(agriCum),
    solarNpv: Math.round(solarNpv),
    agriNpv: Math.round(agriNpv),
    npvDiscountRate: NPV_RATE,
    breakevenYear: breakeven,
    difference: Math.round(difference),
    verdict: leader,
    advantagePercent,
    scenarios,
    postContractNote:
      'After the contract ends, land restoration terms and re-cultivation cost become critical — check who bears decommissioning & topsoil restoration cost.',
  };
}

// ============================= Risk Analysis =============================

export function analyzeRisk(input: LandInput, solar: SolarEnergyResult, agri: AgriIncomeResult, forecast: ForecastResult): RiskAnalysisResult {
  const factors: RiskFactor[] = [];
  const escalation = input.escalationPercent ?? 0;

  // 1. Flat rent / inflation erosion
  factors.push({
    id: 'inflation_erosion',
    title: 'Inflation erodes flat rent',
    titleHi: 'महंगाई से किराए की कीमत घटना',
    description:
      escalation <= 0
        ? 'Offered rent has no yearly escalation. At ~4% inflation, ₹100 of rent today is worth only ~₹68 after 10 years in real terms.'
        : `Escalation of ${escalation}%/yr partially protects against ~4% inflation — shortfall of ~${Math.max(0, Math.round((4 - escalation) * 100 / 4))}% in real value.`,
    severity: escalation <= 0 ? 'high' : escalation < 3 ? 'medium' : 'low',
    weight: 0.2,
  });

  // 2. Contract lock-in / opportunity cost
  const opportunityGap = forecast.difference < 0 ? Math.abs(forecast.difference) : 0;
  factors.push({
    id: 'lock_in',
    title: 'Long lock-in & opportunity cost',
    titleHi: 'लंबा अनुबंध और अवसर लागत',
    description: `${input.contractYears}-year lease restricts future options. If farm income grows faster than expected (cumulative gap ₹${fmt(opportunityGap)}), renegotiating mid-contract is usually not possible.`,
    severity: input.contractYears >= 25 ? 'high' : input.contractYears >= 15 ? 'medium' : 'low',
    weight: 0.18,
  });

  // 3. Counterparty / payment risk
  factors.push({
    id: 'payment',
    title: 'Developer payment & agreement risk',
    titleHi: 'डेवलपर भुगतान जोखिम',
    description:
      'Lease payments depend on the developer\u2019s financial health and project commissioning. Delays in commissioning can mean 1-2 years with little or no rent while land is already committed.',
    severity: 'medium',
    weight: 0.15,
  });

  // 4. Land restoration
  const lt = getLandType(input.landType);
  factors.push({
    id: 'restoration',
    title: 'Land restoration after contract',
    titleHi: 'अनुबंध के बाद भूमि बहाली',
    description: `Land type "${lt.label}" — ${lt.restorationRisk} restoration risk. Piling, cable trenches and compaction can reduce fertility; ensure the agreement includes decommissioning & restoration clauses with bank guarantee if possible.`,
    severity: lt.restorationRisk === 'medium' ? 'medium' : 'low',
    weight: 0.15,
  });

  // 5. Climate risk to remaining agri dependence
  factors.push({
    id: 'climate_agri',
    title: 'Climate risk on alternative farm income',
    titleHi: 'खेती की आय पर जलवायु जोखिम',
    description:
      solar.rentVerdict === 'very_low' || solar.rentVerdict === 'below_market'
        ? `If you reject the lease and continue farming, note: ${agri.riskNote}`
        : `Region climate volatility ${(agri.volatility * 100).toFixed(0)}% — farm income varies year to year, which is partly why a fixed rent looks attractive.`,
    severity: agri.volatility >= 0.55 ? 'high' : agri.volatility >= 0.42 ? 'medium' : 'low',
    weight: 0.12,
  });

  // 6. Rent fairness (per-acre market comparison)
  factors.push({
    id: 'tariff_fairness',
    title: 'Rent vs market rate',
    titleHi: 'किराया बनाम बाज़ार दर',
    description: `Offered rent is ₹${fmt(solar.rentPerAcre)}/acre/year against a typical market band of ₹${fmt(solar.marketRentMinPerAcre)}–₹${fmt(solar.marketRentMaxPerAcre)}/acre for this region — verdict: ${solar.rentVerdict.replace('_', ' ')}. A below-market offer may leave room to negotiate, or signal a weak developer.`,
    severity: solar.rentVerdict === 'very_low' ? 'high' : solar.rentVerdict === 'below_market' ? 'medium' : 'low',
    weight: 0.2,
  });

  const severityScore: Record<RiskFactor['severity'], number> = { low: 25, medium: 55, high: 85 };
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const overall = factors.reduce((s, f) => s + severityScore[f.severity] * f.weight, 0) / totalWeight;

  const band: RiskAnalysisResult['band'] = overall >= 70 ? 'high' : overall >= 55 ? 'elevated' : overall >= 40 ? 'moderate' : 'low';

  return {
    overallScore: Math.round(overall),
    band,
    factors,
    summary:
      band === 'high'
        ? 'Multiple high-severity risks detected. Get the lease agreement reviewed by a lawyer before signing.'
        : band === 'elevated'
          ? 'Several significant risks — most can be reduced with better contract clauses (escalation, restoration, payment security).'
          : band === 'moderate'
            ? 'A fairly typical risk profile for solar leases — focus on escalation clause and restoration terms.'
            : 'Risk profile looks manageable with standard contract safeguards.',
  };
}

// ============================= Land Suitability =============================

export function predictSuitability(input: LandInput, region: RegionProfile): SuitabilityResult {
  const factors: SuitabilityFactor[] = [];

  // Irradiance factor (GHI 4.5 -> 5.8 maps to 50 -> 100)
  const irrScore = clamp(((region.ghi - 4.2) / (5.9 - 4.2)) * 100, 20, 100);
  factors.push({
    label: 'Solar irradiance (state average)',
    score: Math.round(irrScore),
    note: `${region.ghi} kWh/m²/day — ${irrScore >= 75 ? 'excellent solar zone' : irrScore >= 55 ? 'good solar potential' : 'average solar potential'}`,
  });

  // Land type factor
  const lt = getLandType(input.landType);
  const landScore = clamp(35 + lt.solarPenalty * 500, 20, 100); // barren land scores higher for solar
  factors.push({
    label: 'Land type (opportunity cost of farming)',
    score: Math.round(landScore),
    note: `${lt.label} — ${lt.solarPenalty > 0.1 ? 'lower farm productivity makes solar a natural fit' : lt.solarPenalty > 0 ? 'moderate farm productivity — decent solar candidate' : 'highly productive farmland — high opportunity cost'}`,
  });

  // Area viability (developers prefer contiguous 5+ acres; small parcels harder)
  const areaScore = input.landAreaAcres >= 10 ? 100 : input.landAreaAcres >= 5 ? 85 : input.landAreaAcres >= 2 ? 65 : 40;
  factors.push({
    label: 'Parcel size viability',
    score: areaScore,
    note: `${input.landAreaAcres} acres — ${areaScore >= 85 ? 'commercially attractive for developers' : areaScore >= 65 ? 'viable, may attract local developers' : 'small parcel — usually leased via group/collective schemes'}`,
  });

  // Rainfall (lower rain + drier = fewer cloudy days, better CUF)
  const rainScore = clamp(100 - (region.rainfallMm - 500) / 25, 30, 100);
  factors.push({
    label: 'Weather clarity (rainfall proxy)',
    score: Math.round(rainScore),
    note: `${region.rainfallMm} mm average rainfall`,
  });

  const score = Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length);
  const band: SuitabilityResult['band'] = score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 50 ? 'moderate' : 'poor';

  return {
    score,
    band,
    factors,
    summary:
      band === 'excellent'
        ? 'This land is in a strong solar zone — developers are likely to be interested, which is leverage for negotiating a better rent.'
        : band === 'good'
          ? 'Land has good solar potential — reasonable developer interest can be expected.'
          : band === 'moderate'
            ? 'Land is moderately suited for solar — developer interest will depend on cluster size and grid connectivity.'
            : 'Solar suitability is limited — farming or agroforestry may remain the better long-term use.',
  };
}

// ============================= Orchestration =============================

export function runAnalysis(input: LandInput): EngineResult {
  const region = getRegion(input.state);
  const solarEnergy = predictSolarEnergy(input, region);
  const agriPrediction = predictAgriIncome(input, region);
  const forecast = buildForecast(input, solarEnergy, agriPrediction);
  const riskAnalysis = analyzeRisk(input, solarEnergy, agriPrediction, forecast);
  const suitability = predictSuitability(input, region);
  return { region, solarEnergy, agriPrediction, forecast, riskAnalysis, suitability };
}

// ============================= Utils =============================

function round(n: number, d: number) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fmt(n: number) {
  if (n >= 1e7) return `${round(n / 1e7, 2)} Cr`;
  if (n >= 1e5) return `${round(n / 1e5, 2)} L`;
  return Math.round(n).toLocaleString('en-IN');
}
