/**
 * SolarAI - Central Configuration
 * ---------------------------------------------------------------
 * All hard-coded assumptions live here so they can be tuned in one
 * place and are never scattered through the application.
 *
 * Every value below is an ESTIMATE used for indicative analysis.
 * Real-world results vary with location, equipment, weather and
 * installation quality. Always verify with a qualified solar
 * professional before making investment decisions.
 */

export const SOLAR_CONFIG = {
  // ---- Currency ----
  // Default currency symbol used across the app (₹ = Indian Rupee).
  // Examples in the spec use ₹. Can be changed to "$", "€", etc.
  CURRENCY_SYMBOL: "₹",
  CURRENCY_CODE: "INR",

  // ---- Electricity tariff assumptions (per kWh) ----
  // Used to estimate consumption when only the monthly bill is known.
  // Tariff in INR per kWh. Indian residential average ~ ₹6-8/kWh.
  ELECTRICITY_TARIFF: {
    residential: 7.5, // ₹/kWh
    commercial: 9.0, // ₹/kWh
    industrial: 8.0, // ₹/kWh
  },

  // ---- Solar system efficiency / derating ----
  // Real-world systems produce less than nameplate due to:
  // inverter losses, wiring losses, temperature, dust, soiling, etc.
  // Typical derating factor: 0.75 - 0.80
  SYSTEM_DERATING_FACTOR: 0.78,

  // ---- Panel assumptions ----
  PANEL: {
    // Watts per panel for the "estimated panels" calculation.
    MONOCRYSTALLINE_WATT: 550, // high-efficiency mono
    POLYCRYSTALLINE_WATT: 450,
    NO_PREFERENCE_WATT: 500,
    // Area per panel in sq ft (approx for a ~550W panel)
    MONOCRYSTALLINE_AREA_SQFT: 22,
    POLYCRYSTALLINE_AREA_SQFT: 24,
    NO_PREFERENCE_AREA_SQFT: 23,
    // Efficiency multipliers (relative)
    EFFICIENCY: {
      monocrystalline: 1.0,
      polycrystalline: 0.88,
      "no-preference": 0.94,
    },
  },

  // ---- Installation cost (per kW of installed capacity) ----
  // Indian residential solar ~ ₹45,000 - ₹60,000 per kW (incl. installation).
  COST_PER_KW: {
    residential: { min: 45000, max: 60000, avg: 52000 },
    commercial: { min: 40000, max: 55000, avg: 47500 },
    industrial: { min: 38000, max: 50000, avg: 44000 },
  },

  // ---- Battery cost (per kWh of storage) ----
  BATTERY_COST_PER_KWH: 18000, // ₹/kWh

  // ---- Grid emission factor (kg CO2 per kWh of grid electricity) ----
  // India grid average ~ 0.71 kg CO2/kWh. (Source: CEA estimates)
  GRID_EMISSION_FACTOR_KG_PER_KWH: 0.71,

  // ---- System lifetime (years) ----
  SYSTEM_LIFETIME_YEARS: 25,

  // ---- Annual degradation of panel output ----
  ANNUAL_DEGRADATION: 0.005, // 0.5% per year

  // ---- Electricity tariff annual escalation ----
  TARIFF_ESCALATION: 0.04, // 4% per year

  // ---- Rooftop utilization factor ----
  // Not all roof area can be covered with panels (setbacks, gaps, etc.)
  ROOF_UTILIZATION_FACTOR: 0.7,

  // ---- Orientation efficiency multiplier ----
  // Relative to ideal south-facing in Northern Hemisphere.
  ORIENTATION_FACTOR: {
    South: 1.0,
    "South-East": 0.96,
    "South-West": 0.96,
    East: 0.85,
    West: 0.85,
    North: 0.7,
    Unknown: 0.9,
  },

  // ---- Shading derate factor ----
  SHADING_FACTOR: {
    None: 1.0,
    Low: 0.95,
    Medium: 0.85,
    High: 0.7,
  },

  // ---- Monthly solar generation distribution (Northern Hemisphere) ----
  // Relative weights summing to ~12. Higher in summer, lower in winter.
  // Used to spread annual generation across months for charts.
  MONTHLY_DISTRIBUTION: [
    0.62, // Jan
    0.70, // Feb
    0.85, // Mar
    0.95, // Apr
    1.08, // May
    1.12, // Jun
    1.10, // Jul
    1.06, // Aug
    0.98, // Sep
    0.88, // Oct
    0.72, // Nov
    0.64, // Dec
  ],
  MONTH_NAMES: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],

  // ---- Suitability score weights (must sum to 1.0) ----
  SUITABILITY_WEIGHTS: {
    roofSuitability: 0.25,
    solarResource: 0.2,
    budgetSuitability: 0.2,
    energyDemand: 0.2,
    shading: 0.15,
  },

  // ---- Battery recommendation thresholds ----
  BATTERY: {
    // Recommend battery if evening grid dependency ratio exceeds this
    EVENING_DEPENDENCY_THRESHOLD: 0.4,
    // Default suggested battery size as fraction of daily generation
    DEFAULT_CAPACITY_FRACTION: 0.4,
    MIN_CAPACITY_KWH: 5,
    MAX_CAPACITY_KWH: 30,
  },

  // ---- Rate limiting (per IP, per window) ----
  RATE_LIMIT: {
    WINDOW_MS: 60_000, // 1 minute
    MAX_GENERAL: 60,
    MAX_AI: 15,
    MAX_AUTH: 10,
  },
} as const;

export type SolarConfig = typeof SOLAR_CONFIG;
