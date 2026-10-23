// Shared client-safe types for the solar analysis app
import type {
  SolarEnergyResult,
  AgriIncomeResult,
  ForecastResult,
  RiskAnalysisResult,
  SuitabilityResult,
} from '@/lib/solar/engine';

export type {
  SolarEnergyResult,
  AgriIncomeResult,
  ForecastResult,
  RiskAnalysisResult,
  SuitabilityResult,
};

export interface RegionSummary {
  state: string;
  ghi: number;
  cuf: number;
  rainfallMm: number;
}

export interface AnalysisResponse {
  ok: boolean;
  id: string | null;
  reportSource: 'groq' | 'solarai' | 'engine';
  input: {
    farmerName: string;
    landAreaAcres: number;
    state: string;
    district?: string;
    landType: string;
    agriIncomeYearly: number;
    solarRentYearly: number;
    contractYears: number;
    solarGeneration?: number | null;
    escalationPercent?: number;
  };
  region: RegionSummary;
  solarEnergy: SolarEnergyResult;
  agriPrediction: AgriIncomeResult;
  forecast: ForecastResult;
  riskAnalysis: RiskAnalysisResult;
  suitability: SuitabilityResult;
  aiReport: string;
  error?: string;
}

export interface AssessmentRow {
  id: string;
  createdAt: string;
  farmerName: string;
  landAreaAcres: number;
  state: string;
  district: string | null;
  landType: string;
  agriIncomeYearly: number;
  solarRentYearly: number;
  contractYears: number;
  escalationPercent: number;
  reportSource: string;
}

export interface ModelResult {
  model: string;
  fullModelName: string;
  mae: number;
  rmse: number;
  r2: number;
  trainMs: number;
  notes: string;
}

export interface Benchmark {
  task: string;
  datasetSize: number;
  trainSize: number;
  testSize: number;
  results: ModelResult[];
  bestModel: string;
  featureImportance: { feature: string; importance: number }[];
  predictedVsActual: { model: string; points: { actual: number; predicted: number }[] }[];
  lstmLossCurve: { epoch: number; loss: number }[];
  totalMs: number;
  createdAt?: string;
}

export const INR = (n: number) => {
  if (!Number.isFinite(n)) return '₹0';
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

export const INR_FULL = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
