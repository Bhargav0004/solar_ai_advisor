/**
 * SolarAI - shared helpers for serialization, formatting, validation.
 */
import { SOLAR_CONFIG } from "@/lib/solar/config";
import type { Appliance, AIRecommendation, CalculationResults, WeatherData } from "@/types/solar";

export function formatCurrency(value: number, opts?: { compact?: boolean }): string {
  const sym = SOLAR_CONFIG.CURRENCY_SYMBOL;
  if (!Number.isFinite(value)) return `${sym}0`;
  if (opts?.compact && Math.abs(value) >= 100000) {
    return `${sym}${(value / 100000).toFixed(2)} L`;
  }
  if (opts?.compact && Math.abs(value) >= 1000) {
    return `${sym}${(value / 1000).toFixed(1)}k`;
  }
  return `${sym}${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Serialize complex fields for SQLite storage (JSON strings). */
export function serializeAppliances(items: Appliance[]): string {
  return JSON.stringify(items);
}
export function deserializeAppliances(raw: string | null | undefined): Appliance[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function serializeResults(r: CalculationResults): string {
  return JSON.stringify(r);
}
export function deserializeResults(raw: string | null | undefined): CalculationResults | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalculationResults;
  } catch {
    return null;
  }
}

export function serializeAI(r: AIRecommendation | null): string | null {
  if (!r) return null;
  return JSON.stringify(r);
}
export function deserializeAI(raw: string | null | undefined): AIRecommendation | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AIRecommendation;
  } catch {
    return null;
  }
}

export function serializeWeather(w: WeatherData | null): string | null {
  if (!w) return null;
  return JSON.stringify(w);
}
export function deserializeWeather(raw: string | null | undefined): WeatherData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeatherData;
  } catch {
    return null;
  }
}

export function serializeMessages(items: { role: string; content: string; ts?: string }[]): string {
  return JSON.stringify(items);
}
export function deserializeMessages(raw: string | null | undefined): { role: "user" | "assistant"; content: string; ts?: string }[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Generate a stable short id for appliances added in the form. */
export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
