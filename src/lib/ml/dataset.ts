// Synthetic-but-realistic dataset generator for agricultural income prediction.
// Used by the ML Research Lab to benchmark Linear Regression / Random Forest /
// Gradient Boosting (XGBoost-style) / LSTM on the same task with the same split.

export const FEATURE_NAMES = [
  'rainfall_mm',
  'avg_temp_c',
  'irrigation_index',
  'soil_quality',
  'fertilizer_index',
  'crop_price_index',
  'year',
] as const;

export const NUM_FEATURES = FEATURE_NAMES.length;

export interface DataRecord {
  features: number[]; // raw feature values (length NUM_FEATURES)
  target: number; // income INR/acre/year
  regionId: number;
  year: number;
}

// Deterministic RNG so benchmark runs are reproducible
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generative model (approximates Indian district-level agri economics):
 * - rainfall has an optimum (~1200mm); too little or too much reduces yield
 * - irrigation x soil quality interaction (irrigation helps poor soil more)
 * - crop price index multiplies revenue, fertilizer index interacts with it
 * - yearly technology/market trend ~2.5%/yr compounding
 * - heat stress above 30°C; log-normal noise for income skew
 */
function generativeIncome(f: number[], year: number): number {
  const [rain, temp, irrigation, soil, fertilizer, price] = f;
  const rainOpt = -Math.pow((rain - 1200) / 700, 2); // peak at 1200mm
  const heatStress = temp > 30 ? -(temp - 30) * 5200 : 0;
  const irrigSoil = irrigation * (0.55 + 0.75 * soil);
  const priceFert = price * (0.65 + 0.6 * fertilizer);
  const trend = Math.pow(1.025, year - 2005);
  const base = 26000;
  const income =
    (base +
      24000 * Math.max(0, 1 + rainOpt) * (0.5 + 0.5 * soil) +
      32000 * irrigSoil +
      28000 * (priceFert - 0.65) +
      heatStress) *
    trend;
  return Math.max(8000, income);
}

export function generateDataset(size = 720, seed = 42): DataRecord[] {
  const rand = mulberry32(seed);
  const records: DataRecord[] = [];
  const nRegions = 36;
  const startYear = 2005;
  const endYear = 2025;
  const yearsPerRegion = Math.floor(size / nRegions);

  for (let r = 0; r < nRegions; r++) {
    // region characteristics drawn once per region (correlated within region)
    const regionIrrigation = clamp(rand() * 0.9 + 0.05, 0, 1);
    const regionSoil = clamp(rand() * 0.85 + 0.1, 0, 1);
    const baseRain = 350 + rand() * 2200;
    const baseTemp = 20 + rand() * 13;

    for (let i = 0; i < yearsPerRegion; i++) {
      const year = startYear + (i % (endYear - startYear + 1));
      const rain = clamp(baseRain + (rand() - 0.5) * 600, 250, 3200);
      const temp = clamp(baseTemp + (rand() - 0.5) * 3, 16, 38);
      const irrigation = clamp(regionIrrigation + (rand() - 0.5) * 0.1, 0, 1);
      const soil = clamp(regionSoil + (rand() - 0.5) * 0.08, 0, 1);
      const fertilizer = clamp(0.3 + 0.6 * irrigation + (rand() - 0.5) * 0.15, 0, 1);
      const price = clamp(0.75 + (year - 2005) * 0.02 + (rand() - 0.5) * 0.12, 0.6, 1.5);

      const features = [rain, temp, irrigation, soil, fertilizer, price, year];
      const mean = generativeIncome(features, year);
      // log-normal noise ~ 8-14% sigma
      const noise = Math.exp((rand() + rand() + rand() - 1.5) * 0.22);
      records.push({
        features,
        target: Math.round(mean * noise),
        regionId: r,
        year,
      });
    }
  }
  return records;
}

export interface TrainTestData {
  trainIdx: number[];
  testIdx: number[];
}

/** Row-level split for target rows; identical for all models (seeded) */
export function splitData(n: number, testRatio = 0.2, seed = 123): TrainTestData {
  const rand = mulberry32(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  // shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const testCount = Math.round(n * testRatio);
  return { testIdx: idx.slice(0, testCount).sort((a, b) => a - b), trainIdx: idx.slice(testCount).sort((a, b) => a - b) };
}

/** Build LSTM sequences (window of W past years -> next-year income).
 *  Only sequences whose TARGET row is in `allowedRows` are returned,
 *  so LSTM is scored on exactly the same target rows as other models. */
export function buildSequences(
  records: DataRecord[],
  window: number,
  allowedRows: Set<number>,
): { seq: number[][]; target: number; rowIdx: number }[] {
  // group rows by region preserving chronological order
  const byRegion = new Map<number, { rowIdx: number; rec: DataRecord }[]>();
  records.forEach((rec, rowIdx) => {
    const arr = byRegion.get(rec.regionId) ?? [];
    arr.push({ rowIdx, rec });
    byRegion.set(rec.regionId, arr);
  });

  const out: { seq: number[][]; target: number; rowIdx: number }[] = [];
  for (const arr of byRegion.values()) {
    arr.sort((a, b) => a.rec.year - b.rec.year);
    for (let i = window; i < arr.length; i++) {
      if (!allowedRows.has(arr[i].rowIdx)) continue;
      const seq: number[][] = [];
      for (let w = i - window; w < i; w++) seq.push(arr[w].rec.features);
      out.push({ seq, target: arr[i].rec.target, rowIdx: arr[i].rowIdx });
    }
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// ============================= Metrics =============================

export interface Metrics {
  mae: number;
  rmse: number;
  r2: number;
}

export function computeMetrics(actual: number[], predicted: number[]): Metrics {
  const n = actual.length;
  const mean = actual.reduce((s, v) => s + v, 0) / n;
  let mae = 0;
  let rmse = 0;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const err = actual[i] - predicted[i];
    mae += Math.abs(err);
    rmse += err * err;
    ssRes += err * err;
    ssTot += (actual[i] - mean) * (actual[i] - mean);
  }
  return {
    mae: mae / n,
    rmse: Math.sqrt(rmse / n),
    r2: 1 - ssRes / ssTot,
  };
}
