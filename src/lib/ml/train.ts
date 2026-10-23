// Benchmark orchestrator: trains all 4 models on the same dataset/split
// and reports MAE / RMSE / R² comparison for the research component.

import {
  generateDataset,
  splitData,
  buildSequences,
  computeMetrics,
  FEATURE_NAMES,
  NUM_FEATURES,
  type DataRecord,
  type Metrics,
} from './dataset';
import { LinearRegressionModel, RandomForestModel, GradientBoostingModel } from './models';
import { LSTMModel } from './lstm';

export interface ModelResult {
  model: string;
  fullModelName: string;
  mae: number;
  rmse: number;
  r2: number;
  trainMs: number;
  notes: string;
}

export interface BenchmarkResult {
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
}

/** z-score standardization params computed on TRAIN rows only (no leakage) */
function standardizer(rows: DataRecord[], trainIdx: number[]) {
  const means = new Array(NUM_FEATURES).fill(0);
  const stds = new Array(NUM_FEATURES).fill(0);
  let meanT = 0;
  for (const i of trainIdx) {
    for (let j = 0; j < NUM_FEATURES; j++) means[j] += rows[i].features[j] / trainIdx.length;
    meanT += rows[i].target / trainIdx.length;
  }
  for (let j = 0; j < NUM_FEATURES; j++) {
    let s = 0;
    for (const i of trainIdx) s += Math.pow(rows[i].features[j] - means[j], 2);
    stds[j] = Math.sqrt(s / Math.max(1, trainIdx.length - 1)) || 1;
  }
  let sT = 0;
  for (const i of trainIdx) sT += Math.pow(rows[i].target - meanT, 2);
  const stdT = Math.sqrt(sT / Math.max(1, trainIdx.length - 1)) || 1;

  return {
    transformX: (f: number[]) => f.map((v, j) => (v - means[j]) / stds[j]),
    transformY: (v: number) => (v - meanT) / stdT,
    inverseY: (v: number) => v * stdT + meanT,
  };
}

export function runBenchmark(): BenchmarkResult {
  const t0 = Date.now();
  const records = generateDataset(720, 42);
  const { trainIdx, testIdx } = splitData(records.length, 0.2, 123);
  const std = standardizer(records, trainIdx);

  // ---- shared matrices (standardized) ----
  const X = records.map((r) => std.transformX(r.features));
  const Yraw = records.map((r) => r.target);
  const Ys = Yraw.map(std.transformY);

  const results: ModelResult[] = [];
  const predictions = new Map<string, number[]>(); // model -> raw-scale predictions for test rows

  const evaluate = (name: string, fullName: string, notes: string, tStart: number, predictFn: (x: number[]) => number) => {
    const preds = testIdx.map((i) => predictFn(X[i]));
    predictions.set(name, preds);
    const m = computeMetrics(testIdx.map((i) => Yraw[i]), preds);
    results.push({
      model: name,
      fullModelName: fullName,
      mae: Math.round(m.mae),
      rmse: Math.round(m.rmse),
      r2: Math.round(m.r2 * 10000) / 10000,
      trainMs: Date.now() - tStart,
      notes,
    });
  };

  // ---- 1. Linear Regression ----
  let t = Date.now();
  const lr = new LinearRegressionModel();
  lr.fit(trainIdx.map((i) => X[i]), trainIdx.map((i) => Ys[i]), 1e-3);
  evaluate('Linear Regression', 'Ridge-regularized Ordinary Least Squares', 'Fast, interpretable baseline; captures only linear effects.', t, (x) => std.inverseY(lr.predict(x)));

  // ---- 2. Random Forest ----
  t = Date.now();
  const rf = new RandomForestModel();
  rf.fit(trainIdx.map((i) => X[i]), trainIdx.map((i) => Ys[i]), { nTrees: 60, seed: 7 });
  evaluate('Random Forest', 'Bagged CART ensemble (60 trees)', 'Handles non-linearity & interactions; robust to noise but cannot extrapolate.', t, (x) => std.inverseY(rf.predict(x)));

  // ---- 3. Gradient Boosting (XGBoost-style) ----
  t = Date.now();
  const gbm = new GradientBoostingModel({ nRounds: 220, learningRate: 0.06, maxDepth: 3, subsample: 0.85, seed: 11 });
  gbm.fit(trainIdx.map((i) => X[i]), trainIdx.map((i) => Ys[i]));
  evaluate('XGBoost (GBM)', 'Gradient-boosted trees, squared loss, shrinkage 0.06', 'Usually the strongest on tabular data; sequential error-correction.', t, (x) => std.inverseY(gbm.predict(x)));

  // ---- 4. LSTM (time-series) ----
  t = Date.now();
  const trainSet = new Set(trainIdx);
  const testSet = new Set(testIdx);
  const WINDOW = 4;
  const trainSeqs = buildSequences(records, WINDOW, trainSet).map((s) => ({
    seq: s.seq.map(std.transformX),
    target: std.transformY(s.target),
  }));
  const lstmTrainRows = new Set(buildSequences(records, WINDOW, trainSet).map((s) => s.rowIdx));
  const testSeqs = buildSequences(records, WINDOW, testSet);

  const lstm = new LSTMModel({ hiddenSize: 12, epochs: 60, batchSize: 64, learningRate: 0.02, seed: 21 });
  lstm.fit(trainSeqs);

  // LSTM predictions for test rows that HAVE a valid sequence; rows without
  // history fall back to the Random Forest prediction so the test row-set stays identical.
  const lstmPredMap = new Map<number, number>();
  for (const s of testSeqs) {
    lstmPredMap.set(s.rowIdx, std.inverseY(lstm.predict(s.seq.map(std.transformX))));
  }
  const lstmFallback = predictions.get('Random Forest') as number[];
  const lstmPreds = testIdx.map((i, k) => (lstmPredMap.has(i) ? (lstmPredMap.get(i) as number) : lstmFallback[k]));

  evaluate('LSTM', 'Single-layer LSTM (hidden 12), Adam, BPTT', 'Models temporal sequences; needs more data to beat tree ensembles on tabular tasks.', t, () => 0);
  // recompute metrics with real preds (evaluate() used X[i] for others, so patch LSTM entry):
  const lstmMetrics = computeMetrics(
    testIdx.map((i) => Yraw[i]),
    lstmPreds,
  );
  const lstmEntry = results[results.length - 1];
  lstmEntry.mae = Math.round(lstmMetrics.mae);
  lstmEntry.rmse = Math.round(lstmMetrics.rmse);
  lstmEntry.r2 = Math.round(lstmMetrics.r2 * 10000) / 10000;
  predictions.set('LSTM', lstmPreds);
  void lstmTrainRows;

  // ---- best model ----
  const best = results.reduce((a, b) => (b.r2 > a.r2 ? b : a));

  // ---- feature importance (from Random Forest) ----
  const impTotal = rf.featureImportance.reduce((s, v) => s + v, 0) || 1;
  const featureImportance = FEATURE_NAMES.map((f, i) => ({
    feature: f,
    importance: Math.round((rf.featureImportance[i] / impTotal) * 1000) / 1000,
  })).sort((a, b) => b.importance - a.importance);

  // ---- predicted vs actual sample (first 60 test rows per model) ----
  const predictedVsActual = ['Linear Regression', 'Random Forest', 'XGBoost (GBM)', 'LSTM'].map((m) => ({
    model: m,
    points: testIdx.slice(0, 60).map((i, k) => ({
      actual: Yraw[i],
      predicted: Math.round((predictions.get(m) as number[])[k]),
    })),
  }));

  const lstmLossCurve = lstm.lossCurve.map((loss, i) => ({
    epoch: i * 5,
    loss,
  }));

  return {
    task: 'Agricultural Income Prediction (INR/acre/year)',
    datasetSize: records.length,
    trainSize: trainIdx.length,
    testSize: testIdx.length,
    results,
    bestModel: best.model,
    featureImportance,
    predictedVsActual,
    lstmLossCurve,
    totalMs: Date.now() - t0,
  };
}
