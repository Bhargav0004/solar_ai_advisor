/**
 * SolarAI - Input validation helpers
 * ===============================================================
 * Pure validation functions used by API route handlers. Returns
 * either a typed success value or a human-readable error string.
 */

import type {
  Appliance,
  AssessmentInput,
  Orientation,
  PanelType,
  PropertyType,
  RoofType,
  Shading,
  CalculationResults,
} from "@/types/solar";

const PROPERTY_TYPES: PropertyType[] = ["residential", "commercial", "industrial"];
const ROOF_TYPES: RoofType[] = ["flat", "sloped", "metal", "concrete", "other"];
const ORIENTATIONS: Orientation[] = [
  "North", "South", "East", "West", "South-East", "South-West", "Unknown",
];
const SHADINGS: Shading[] = ["None", "Low", "Medium", "High"];
const PANEL_TYPES: PanelType[] = ["monocrystalline", "polycrystalline", "no-preference"];

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isEnum<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v);
}

/** Validate an Appliance object. */
function validateAppliance(item: unknown, idx: number): ValidationResult<Appliance> {
  if (!item || typeof item !== "object") {
    return { ok: false, error: `Appliance #${idx + 1} is invalid.` };
  }
  const a = item as Record<string, unknown>;
  if (!isNonEmptyString(a.name)) {
    return { ok: false, error: `Appliance #${idx + 1}: name is required.` };
  }
  if (!isNumber(a.quantity) || a.quantity <= 0) {
    return { ok: false, error: `Appliance "${a.name}": quantity must be a positive number.` };
  }
  if (!isNumber(a.wattage) || a.wattage < 0) {
    return { ok: false, error: `Appliance "${a.name}": wattage must be >= 0.` };
  }
  if (!isNumber(a.hoursPerDay) || a.hoursPerDay < 0 || a.hoursPerDay > 24) {
    return { ok: false, error: `Appliance "${a.name}": hoursPerDay must be between 0 and 24.` };
  }
  if (!isNumber(a.daysPerMonth) || a.daysPerMonth < 0 || a.daysPerMonth > 31) {
    return { ok: false, error: `Appliance "${a.name}": daysPerMonth must be between 0 and 31.` };
  }
  return {
    ok: true,
    value: {
      id: typeof a.id === "string" && a.id ? a.id : `app-${idx}-${Date.now()}`,
      name: (a.name as string).trim(),
      quantity: a.quantity,
      wattage: a.wattage,
      hoursPerDay: a.hoursPerDay,
      daysPerMonth: a.daysPerMonth,
    },
  };
}

/** Validate an AssessmentInput payload. */
export function validateAssessmentInput(body: unknown): ValidationResult<AssessmentInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;

  // Required strings
  if (!isNonEmptyString(b.fullName)) return { ok: false, error: "Full name is required." };
  if (!isEnum(b.propertyType, PROPERTY_TYPES)) return { ok: false, error: "Invalid property type." };
  if (!isNonEmptyString(b.city)) return { ok: false, error: "City is required." };
  if (!isNonEmptyString(b.state)) return { ok: false, error: "State is required." };
  if (!isNonEmptyString(b.country)) return { ok: false, error: "Country is required." };
  if (!isEnum(b.roofType, ROOF_TYPES)) return { ok: false, error: "Invalid roof type." };
  if (!isEnum(b.orientation, ORIENTATIONS)) return { ok: false, error: "Invalid orientation." };
  if (!isEnum(b.shading, SHADINGS)) return { ok: false, error: "Invalid shading value." };
  if (!isEnum(b.panelType, PANEL_TYPES)) return { ok: false, error: "Invalid panel type." };

  // Numeric fields
  if (!isNumber(b.monthlyBill) || b.monthlyBill <= 0) {
    return { ok: false, error: "Monthly bill must be a positive number." };
  }
  if (b.monthlyConsumption != null && (!isNumber(b.monthlyConsumption) || b.monthlyConsumption < 0)) {
    return { ok: false, error: "Monthly consumption must be >= 0 when provided." };
  }
  if (!isNumber(b.roofArea) || b.roofArea <= 0) {
    return { ok: false, error: "Roof area must be a positive number." };
  }
  if (!isNumber(b.sunlightHours) || b.sunlightHours < 0) {
    return { ok: false, error: "Sunlight hours must be >= 0." };
  }
  if (!isNumber(b.budget) || b.budget < 0) {
    return { ok: false, error: "Budget must be >= 0." };
  }
  if (!isNumber(b.energyOffset) || b.energyOffset < 0 || b.energyOffset > 100) {
    return { ok: false, error: "Energy offset must be between 0 and 100." };
  }

  // Appliances
  if (!Array.isArray(b.appliances)) {
    return { ok: false, error: "Appliances must be an array." };
  }
  const appliances: Appliance[] = [];
  for (let i = 0; i < b.appliances.length; i++) {
    const r = validateAppliance(b.appliances[i], i);
    if (!r.ok) return r;
    appliances.push(r.value);
  }

  return {
    ok: true,
    value: {
      fullName: (b.fullName as string).trim(),
      propertyType: b.propertyType,
      city: (b.city as string).trim(),
      state: (b.state as string).trim(),
      country: (b.country as string).trim(),
      monthlyBill: b.monthlyBill,
      monthlyConsumption:
        isNumber(b.monthlyConsumption) && b.monthlyConsumption > 0 ? b.monthlyConsumption : null,
      roofArea: b.roofArea,
      roofType: b.roofType,
      orientation: b.orientation,
      shading: b.shading,
      sunlightHours: b.sunlightHours,
      panelType: b.panelType,
      budget: b.budget,
      energyOffset: b.energyOffset,
      appliances,
    },
  };
}

/** Validate an email + password auth payload for REGISTER (enforces password length >= 6). */
export function validateRegisterPayload(body: unknown): ValidationResult<{ name: string; email: string; password: string }> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body." };
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.email)) return { ok: false, error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((b.email as string).trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (typeof b.password !== "string" || b.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (!isNonEmptyString(b.name)) {
    return { ok: false, error: "Name is required." };
  }
  return {
    ok: true,
    value: {
      name: (b.name as string).trim(),
      email: (b.email as string).trim().toLowerCase(),
      password: b.password,
    },
  };
}

/** Validate a LOGIN payload — requires non-empty email + password. Does NOT enforce length. */
export function validateLoginPayload(body: unknown): ValidationResult<{ email: string; password: string }> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body." };
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.email)) return { ok: false, error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((b.email as string).trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (typeof b.password !== "string" || b.password.length === 0) {
    return { ok: false, error: "Password is required." };
  }
  return {
    ok: true,
    value: {
      email: (b.email as string).trim().toLowerCase(),
      password: b.password,
    },
  };
}

/** Infer an Orientation enum from an orientationFactor (0..1). */
export function inferOrientation(factor: number): Orientation {
  if (factor >= 0.99) return "South";
  if (factor >= 0.94) return "South-East";
  if (factor >= 0.84) return "East";
  if (factor >= 0.69) return "North";
  return "Unknown";
}

/** Infer a Shading enum from a shadingFactor (0..1). */
export function inferShading(factor: number): Shading {
  if (factor >= 0.99) return "None";
  if (factor >= 0.93) return "Low";
  if (factor >= 0.83) return "Medium";
  return "High";
}

/** Validate a SimulateInput payload (used by /api/solar/simulate). */
export function validateSimulateInput(body: unknown): ValidationResult<{
  baseResults: CalculationResults;
  baseInput: {
    propertyType: PropertyType;
    monthlyConsumptionKWh: number;
    sunlightHours: number;
    roofArea: number;
    panelType: PanelType;
    orientation?: Orientation;
    shading?: Shading;
  };
  overrides: Record<string, unknown>;
  scenarios?: { label?: string; overrides?: Record<string, unknown> }[];
}> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body." };
  const b = body as Record<string, unknown>;

  if (!b.baseResults || typeof b.baseResults !== "object") {
    return { ok: false, error: "baseResults is required." };
  }
  const baseResults = b.baseResults as CalculationResults;
  if (!isNumber(baseResults.recommendedCapacityKW) || !isNumber(baseResults.monthlyConsumptionKWh)) {
    return { ok: false, error: "baseResults is missing required calculation fields." };
  }

  if (!b.baseInput || typeof b.baseInput !== "object") {
    return { ok: false, error: "baseInput is required." };
  }
  const bi = b.baseInput as Record<string, unknown>;
  if (!isEnum(bi.propertyType, PROPERTY_TYPES)) return { ok: false, error: "baseInput.propertyType is invalid." };
  if (!isEnum(bi.panelType, PANEL_TYPES)) return { ok: false, error: "baseInput.panelType is invalid." };
  if (!isNumber(bi.monthlyConsumptionKWh) || bi.monthlyConsumptionKWh < 0) {
    return { ok: false, error: "baseInput.monthlyConsumptionKWh must be >= 0." };
  }
  if (!isNumber(bi.sunlightHours) || bi.sunlightHours < 0) {
    return { ok: false, error: "baseInput.sunlightHours must be >= 0." };
  }
  if (!isNumber(bi.roofArea) || bi.roofArea <= 0) {
    return { ok: false, error: "baseInput.roofArea must be > 0." };
  }
  const biOrientation = isEnum(bi.orientation, ORIENTATIONS) ? bi.orientation : undefined;
  const biShading = isEnum(bi.shading, SHADINGS) ? bi.shading : undefined;

  const overrides =
    b.overrides && typeof b.overrides === "object" ? (b.overrides as Record<string, unknown>) : {};

  let scenarios:
    | { label?: string; overrides?: Record<string, unknown> }[]
    | undefined = undefined;
  if (Array.isArray(b.scenarios)) {
    scenarios = b.scenarios
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s) => ({
        label: typeof s.label === "string" ? s.label : undefined,
        overrides:
          s.overrides && typeof s.overrides === "object"
            ? (s.overrides as Record<string, unknown>)
            : {},
      }));
  }

  return {
    ok: true,
    value: {
      baseResults,
      baseInput: {
        propertyType: bi.propertyType,
        monthlyConsumptionKWh: bi.monthlyConsumptionKWh,
        sunlightHours: bi.sunlightHours,
        roofArea: bi.roofArea,
        panelType: bi.panelType,
        orientation: biOrientation,
        shading: biShading,
      },
      overrides,
      scenarios,
    },
  };
}
