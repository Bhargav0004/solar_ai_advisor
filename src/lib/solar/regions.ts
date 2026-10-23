// Region-level solar & agriculture reference data for India.
// Values are engineering approximations drawn from public sources
// (NREL/NIWE solar maps, state agricultural statistics) for planning purposes.

export interface RegionProfile {
  state: string;
  /** Average Global Horizontal Irradiance kWh/m²/day */
  ghi: number;
  /** Expected Capacity Utilization Factor for a fixed-tilt plant (0-1) */
  cuf: number;
  /** Annual average rainfall mm */
  rainfallMm: number;
  /** Climate volatility for agriculture 0 (stable) - 1 (volatile) */
  climateVolatility: number;
  /** Dominated crops list (informational) */
  crops: string[];
  /** Average annual agri income growth (fraction, real) */
  agriGrowth: number;
}

export const REGIONS: Record<string, RegionProfile> = {
  'Rajasthan':            { state: 'Rajasthan',            ghi: 5.8, cuf: 0.24, rainfallMm: 550,  climateVolatility: 0.55, crops: ['Bajra', 'Mustard', 'Guar'],   agriGrowth: 0.030 },
  'Gujarat':              { state: 'Gujarat',              ghi: 5.6, cuf: 0.23, rainfallMm: 800,  climateVolatility: 0.45, crops: ['Cotton', 'Groundnut', 'Bajra'], agriGrowth: 0.035 },
  'Maharashtra':          { state: 'Maharashtra',          ghi: 5.5, cuf: 0.22, rainfallMm: 900,  climateVolatility: 0.50, crops: ['Sugarcane', 'Cotton', 'Soybean'], agriGrowth: 0.032 },
  'Madhya Pradesh':       { state: 'Madhya Pradesh',       ghi: 5.4, cuf: 0.22, rainfallMm: 1050, climateVolatility: 0.45, crops: ['Soybean', 'Wheat', 'Gram'],   agriGrowth: 0.033 },
  'Karnataka':            { state: 'Karnataka',            ghi: 5.4, cuf: 0.21, rainfallMm: 1150, climateVolatility: 0.40, crops: ['Ragi', 'Maize', 'Sunflower'], agriGrowth: 0.031 },
  'Telangana':            { state: 'Telangana',            ghi: 5.4, cuf: 0.21, rainfallMm: 900,  climateVolatility: 0.48, crops: ['Cotton', 'Rice', 'Maize'],    agriGrowth: 0.034 },
  'Andhra Pradesh':       { state: 'Andhra Pradesh',       ghi: 5.3, cuf: 0.21, rainfallMm: 950,  climateVolatility: 0.45, crops: ['Rice', 'Chilli', 'Cotton'],   agriGrowth: 0.032 },
  'Tamil Nadu':           { state: 'Tamil Nadu',           ghi: 5.5, cuf: 0.21, rainfallMm: 990,  climateVolatility: 0.42, crops: ['Rice', 'Sugarcane', 'Cotton'], agriGrowth: 0.030 },
  'Uttar Pradesh':        { state: 'Uttar Pradesh',        ghi: 4.9, cuf: 0.19, rainfallMm: 1000, climateVolatility: 0.42, crops: ['Wheat', 'Rice', 'Sugarcane'], agriGrowth: 0.028 },
  'Punjab':               { state: 'Punjab',               ghi: 5.0, cuf: 0.20, rainfallMm: 650,  climateVolatility: 0.30, crops: ['Wheat', 'Rice', 'Potato'],    agriGrowth: 0.026 },
  'Haryana':              { state: 'Haryana',              ghi: 5.0, cuf: 0.20, rainfallMm: 600,  climateVolatility: 0.35, crops: ['Wheat', 'Rice', 'Mustard'],   agriGrowth: 0.029 },
  'Bihar':                { state: 'Bihar',                ghi: 4.8, cuf: 0.18, rainfallMm: 1200, climateVolatility: 0.55, crops: ['Rice', 'Wheat', 'Maize'],     agriGrowth: 0.027 },
  'Odisha':               { state: 'Odisha',               ghi: 4.9, cuf: 0.18, rainfallMm: 1450, climateVolatility: 0.60, crops: ['Rice', 'Pulses', 'Oilseeds'], agriGrowth: 0.028 },
  'West Bengal':          { state: 'West Bengal',          ghi: 4.7, cuf: 0.17, rainfallMm: 1750, climateVolatility: 0.50, crops: ['Rice', 'Jute', 'Potato'],     agriGrowth: 0.027 },
  'Chhattisgarh':         { state: 'Chhattisgarh',         ghi: 5.0, cuf: 0.19, rainfallMm: 1300, climateVolatility: 0.50, crops: ['Rice', 'Maize', 'Pulses'],    agriGrowth: 0.030 },
  'Uttarakhand':          { state: 'Uttarakhand',          ghi: 4.8, cuf: 0.18, rainfallMm: 1550, climateVolatility: 0.45, crops: ['Rice', 'Wheat', 'Millets'],   agriGrowth: 0.026 },
  'Himachal Pradesh':     { state: 'Himachal Pradesh',     ghi: 4.9, cuf: 0.18, rainfallMm: 1250, climateVolatility: 0.45, crops: ['Apple', 'Wheat', 'Maize'],    agriGrowth: 0.027 },
  'Kerala':               { state: 'Kerala',               ghi: 5.0, cuf: 0.19, rainfallMm: 3000, climateVolatility: 0.40, crops: ['Coconut', 'Rice', 'Spices'],  agriGrowth: 0.025 },
  'Assam':                { state: 'Assam',                ghi: 4.5, cuf: 0.16, rainfallMm: 2800, climateVolatility: 0.60, crops: ['Tea', 'Rice', 'Mustard'],     agriGrowth: 0.028 },
  'Jharkhand':            { state: 'Jharkhand',            ghi: 5.0, cuf: 0.19, rainfallMm: 1300, climateVolatility: 0.55, crops: ['Rice', 'Pulses', 'Maize'],    agriGrowth: 0.029 },
  'Other / Not listed':   { state: 'Other / Not listed',   ghi: 5.2, cuf: 0.20, rainfallMm: 1000, climateVolatility: 0.45, crops: ['Mixed crops'],                agriGrowth: 0.030 },
};

export const LAND_TYPES = [
  { value: 'fertile',      label: 'Fertile / Irrigated',            labelHi: 'उपजाऊ / सिंचित',           productivity: 1.0,  restorationRisk: 'low',    solarPenalty: 0.0  },
  { value: 'semi_fertile', label: 'Semi-fertile / Partially irrigated', labelHi: 'अर्ध-उपजाऊ',           productivity: 0.72, restorationRisk: 'medium', solarPenalty: 0.05 },
  { value: 'dry_rainfed',  label: 'Dry / Rain-fed',                 labelHi: 'सूखा / वर्षा आधारित',       productivity: 0.45, restorationRisk: 'medium', solarPenalty: 0.10 },
  { value: 'barren',       label: 'Barren / Low-yield',             labelHi: 'बंजर / कम उपज',            productivity: 0.25, restorationRisk: 'low',    solarPenalty: 0.15 },
] as const;

export type LandTypeValue = (typeof LAND_TYPES)[number]['value'];

export function getRegion(state: string): RegionProfile {
  return REGIONS[state] ?? REGIONS['Other / Not listed'];
}

export function getLandType(value: string) {
  return LAND_TYPES.find((l) => l.value === value) ?? LAND_TYPES[1];
}
