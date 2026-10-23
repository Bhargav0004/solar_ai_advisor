/**
 * SolarAI - Weather / Solar data service
 * ===============================================================
 * Uses the free Open-Meteo API (no API key required) to fetch:
 *  - geocoding (city -> lat/lon)
 *  - current weather (temp, cloud cover, weather code)
 *  - solar radiation -> peak sun hours estimate
 *  - sunrise/sunset
 *
 * Falls back to reasonable deterministic estimates when the API is
 * unavailable, and clearly flags the data source so the UI can show
 * "estimated/fallback data" warnings.
 */

import type { WeatherData } from "@/types/solar";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

interface GeoResult {
  latitude: number;
  longitude: number;
  timezone: string;
  name: string;
  country: string;
  admin1?: string;
}

async function geocode(city: string, country?: string): Promise<GeoResult | null> {
  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });
  if (country) params.set("country", country);
  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    return {
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone,
      name: hit.name,
      country: hit.country,
      admin1: hit.admin1,
    };
  } catch {
    return null;
  }
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

/** Fetch weather + solar data for a location. Returns fallback on failure. */
export async function getWeatherData(
  city: string,
  state?: string,
  country?: string,
): Promise<WeatherData> {
  const geo = await geocode(city, country);
  if (!geo) {
    return fallbackWeather(city, country, "Location could not be geocoded; using default estimates.");
  }

  try {
    const params = new URLSearchParams({
      latitude: String(geo.latitude),
      longitude: String(geo.longitude),
      current: "temperature_2m,cloud_cover,weather_code,is_day",
      daily: "shortwave_radiation_sum,sunrise,sunset,weather_code,cloud_cover_mean",
      timezone: "auto",
      forecast_days: "7",
    });
    const res = await fetch(`${FORECAST_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return fallbackWeather(
        `${geo.name}${geo.admin1 ? ", " + geo.admin1 : ""}`,
        geo.country,
        "Weather API returned an error; using default estimates.",
      );
    }
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;

    // Peak sun hours ≈ daily shortwave_radiation_sum (MJ/m²) / 3.6
    // Open-Meteo returns shortwave_radiation_sum in MJ/m²/day.
    // 1 kWh/m² = 3.6 MJ/m², and 1 peak sun hour = 1 kWh/m².
    const pshValues: number[] = (daily.shortwave_radiation_sum || []).map(
      (v: number) => (v ? v / 3.6 : 0),
    );
    const avgPSH =
      pshValues.length > 0
        ? pshValues.reduce((a: number, b: number) => a + b, 0) / pshValues.length
        : 4.5;

    // Monthly distribution scaled from the forecast average using the
    // configured seasonal weights (we don't have a full year of data here).
    const seasonal = [
      0.62, 0.7, 0.85, 0.95, 1.08, 1.12, 1.1, 1.06, 0.98, 0.88, 0.72, 0.64,
    ];
    const seasonalSum = seasonal.reduce((a, b) => a + b, 0);
    const monthlySunHours = seasonal.map((w) =>
      Math.round((avgPSH * (w / seasonalSum) * 12) * 10) / 10,
    );

    const weatherCode = current.weather_code ?? 0;
    const locationName = `${geo.name}${geo.admin1 ? ", " + geo.admin1 : ""}${geo.country ? ", " + geo.country : ""}`;

    return {
      source: "open-meteo",
      locationName,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
      currentTempC: current.temperature_2m,
      cloudCoverPct: current.cloud_cover,
      weatherCode,
      weatherDescription: WEATHER_CODE_MAP[weatherCode] ?? "Unknown",
      sunrise: daily.sunrise?.[0],
      sunset: daily.sunset?.[0],
      estimatedPeakSunHours: Math.round(avgPSH * 100) / 100,
      monthlySunHours,
    };
  } catch {
    return fallbackWeather(
      `${geo.name}${geo.admin1 ? ", " + geo.admin1 : ""}`,
      geo.country,
      "Weather API request failed; using default estimates.",
    );
  }
}

function fallbackWeather(city: string, country?: string, note?: string): WeatherData {
  const seasonal = [3.5, 4.2, 5.0, 5.6, 6.0, 5.8, 5.2, 5.0, 5.0, 4.8, 4.0, 3.5];
  const avg = seasonal.reduce((a, b) => a + b, 0) / 12;
  return {
    source: "fallback",
    locationName: [city, country].filter(Boolean).join(", ") || "Unknown",
    estimatedPeakSunHours: Math.round(avg * 100) / 100,
    monthlySunHours: seasonal.map((v) => Math.round(v * 10) / 10),
    weatherDescription: "Estimated (API unavailable)",
    note: note ?? "Using estimated solar data (no live API data).",
  };
}
