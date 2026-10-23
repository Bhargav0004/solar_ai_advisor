// Classical ML models implemented from scratch in TypeScript:
// Ridge-regularized Linear Regression, CART regression tree,
// Random Forest (bagging) and Gradient Boosting (XGBoost-style, squared loss).

import { NUM_FEATURES, mulberry32 } from './dataset';

type Matrix = number[][];

// ============================= Linear Regression (Ridge OLS) =============================

export class LinearRegressionModel {
  weights: number[] = [];
  bias = 0;

  fit(X: Matrix, y: number[], lambda = 1e-3) {
    const n = X.length;
    const d = NUM_FEATURES;
    // Build normal equations (X'X + lambda*I) w = X'y  (with bias absorbed by centering)
    const meanX = new Array(d).fill(0);
    let meanY = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) meanX[j] += X[i][j] / n;
      meanY += y[i] / n;
    }
    const Xc: Matrix = X.map((row) => row.map((v, j) => v - meanX[j]));
    const yc = y.map((v) => v - meanY);

    const A: Matrix = Array.from({ length: d }, () => new Array(d).fill(0));
    const b = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) {
        b[j] += Xc[i][j] * yc[i];
        for (let k = 0; k < d; k++) A[j][k] += Xc[i][j] * Xc[i][k];
      }
    }
    for (let j = 0; j < d; j++) A[j][j] += lambda * n;

    this.weights = solveLinearSystem(A, b);
    this.bias = meanY - meanX.reduce((s, v, j) => s + v * this.weights[j], 0);
  }

  predict(x: number[]): number {
    return this.bias + x.reduce((s, v, j) => s + v * this.weights[j], 0);
  }
}

/** Gaussian elimination with partial pivoting */
function solveLinearSystem(A: Matrix, b: number[]): number[] {
  const n = b.length;
  const M: Matrix = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const p = M[col][col] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / p;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

// ============================= CART Regression Tree =============================

interface TreeNode {
  leaf: boolean;
  value?: number;
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

interface TreeOptions {
  maxDepth: number;
  minSamplesLeaf: number;
  featureSubset?: number; // features considered per split (for random forest)
  rand?: () => number;
  maxSplitBuckets?: number; // threshold candidates per feature
}

class RegressionTree {
  root: TreeNode | null = null;
  featureImportance = new Array(NUM_FEATURES).fill(0);
  private opts: TreeOptions;

  constructor(opts: TreeOptions) {
    this.opts = opts;
  }

  fit(X: Matrix, y: number[]) {
    const indices = X.map((_, i) => i);
    this.root = this.build(X, y, indices, 0);
  }

  private build(X: Matrix, y: number[], idx: number[], depth: number): TreeNode {
    const mean = idx.reduce((s, i) => s + y[i], 0) / idx.length;
    if (depth >= this.opts.maxDepth || idx.length < 2 * this.opts.minSamplesLeaf) {
      return { leaf: true, value: mean };
    }

    let best: { feature: number; threshold: number; gain: number } | null = null;
    let features: number[];
    if (this.opts.featureSubset && this.opts.featureSubset < NUM_FEATURES) {
      const rand = this.opts.rand ?? Math.random;
      features = pickRandomFeatures(NUM_FEATURES, this.opts.featureSubset, rand);
    } else {
      features = Array.from({ length: NUM_FEATURES }, (_, i) => i);
    }

    const parentVar = variance(X, y, idx, mean);

    for (const f of features) {
      // collect candidate thresholds via quantile buckets
      const vals = idx.map((i) => X[i][f]).sort((a, b) => a - b);
      const buckets = this.opts.maxSplitBuckets ?? 24;
      const thresholds: number[] = [];
      for (let b = 1; b < buckets; b++) {
        const t = vals[Math.floor((b / buckets) * vals.length)];
        if (thresholds.length === 0 || t !== thresholds[thresholds.length - 1]) thresholds.push(t);
      }
      for (const t of thresholds) {
        let leftSum = 0;
        let leftCount = 0;
        for (const i of idx) {
          if (X[i][f] <= t) {
            leftSum += y[i];
            leftCount++;
          }
        }
        const rightCount = idx.length - leftCount;
        if (leftCount < this.opts.minSamplesLeaf || rightCount < this.opts.minSamplesLeaf) continue;
        const rightSum = idx.reduce((s, i) => s + y[i], 0) - leftSum;
        const lMean = leftSum / leftCount;
        const rMean = rightSum / rightCount;
        let varAfter = 0;
        for (const i of idx) {
          const m = X[i][f] <= t ? lMean : rMean;
          const d = y[i] - m;
          varAfter += d * d;
        }
        const gain = parentVar - varAfter;
        if (!best || gain > best.gain) best = { feature: f, threshold: t, gain };
      }
    }

    if (!best || best.gain <= 1e-9) return { leaf: true, value: mean };

    this.featureImportance[best.feature] += best.gain;
    const leftIdx = idx.filter((i) => X[i][best!.feature] <= best!.threshold);
    const rightIdx = idx.filter((i) => X[i][best!.feature] > best!.threshold);
    return {
      leaf: false,
      feature: best.feature,
      threshold: best.threshold,
      left: this.build(X, y, leftIdx, depth + 1),
      right: this.build(X, y, rightIdx, depth + 1),
    };
  }

  predict(x: number[]): number {
    let node = this.root;
    while (node && !node.leaf) {
      node = x[node.feature as number] <= (node.threshold as number) ? (node.left as TreeNode) : (node.right as TreeNode);
    }
    return node?.value ?? 0;
  }
}

function variance(X: Matrix, y: number[], idx: number[], mean: number): number {
  let v = 0;
  for (const i of idx) {
    const d = y[i] - mean;
    v += d * d;
  }
  return v;
}

function pickRandomFeatures(d: number, k: number, rand: () => number): number[] {
  const all = Array.from({ length: d }, (_, i) => i);
  for (let i = d - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, k);
}

// ============================= Random Forest =============================

export class RandomForestModel {
  trees: RegressionTree[] = [];
  featureImportance = new Array(NUM_FEATURES).fill(0);

  fit(X: Matrix, y: number[], opts?: { nTrees?: number; seed?: number }) {
    const nTrees = opts?.nTrees ?? 60;
    const rand = mulberry32(opts?.seed ?? 7);
    const n = X.length;
    for (let t = 0; t < nTrees; t++) {
      // bootstrap sample
      const bootIdx: number[] = [];
      for (let i = 0; i < n; i++) bootIdx.push(Math.floor(rand() * n));
      const Xb = bootIdx.map((i) => X[i]);
      const yb = bootIdx.map((i) => y[i]);
      const tree = new RegressionTree({
        maxDepth: 10,
        minSamplesLeaf: 4,
        featureSubset: Math.max(3, Math.round(NUM_FEATURES / 1.5)),
        rand,
      });
      tree.fit(Xb, yb);
      this.trees.push(tree);
      const tot = tree.featureImportance.reduce((s, v) => s + v, 0) || 1;
      tree.featureImportance.forEach((v, f) => (this.featureImportance[f] += v / tot / nTrees));
    }
  }

  predict(x: number[]): number {
    return this.trees.reduce((s, t) => s + t.predict(x), 0) / this.trees.length;
  }
}

// ============================= Gradient Boosting (XGBoost-style) =============================

export class GradientBoostingModel {
  trees: RegressionTree[] = [];
  baseValue = 0;
  learningRate: number;
  featureImportance = new Array(NUM_FEATURES).fill(0);

  constructor(opts?: { learningRate?: number; nRounds?: number; maxDepth?: number; subsample?: number; seed?: number }) {
    this.learningRate = opts?.learningRate ?? 0.06;
    this.nRounds = opts?.nRounds ?? 220;
    this.maxDepth = opts?.maxDepth ?? 3;
    this.subsample = opts?.subsample ?? 0.85;
    this.seed = opts?.seed ?? 11;
  }
  nRounds: number;
  maxDepth: number;
  subsample: number;
  seed: number;

  fit(X: Matrix, y: number[]) {
    const rand = mulberry32(this.seed);
    const n = X.length;
    this.baseValue = y.reduce((s, v) => s + v, 0) / n;
    const pred = new Array(n).fill(this.baseValue);

    for (let round = 0; round < this.nRounds; round++) {
      // squared-loss gradients = residuals
      const residual = y.map((v, i) => v - pred[i]);
      // subsample rows (stochastic gradient boosting)
      const idx: number[] = [];
      for (let i = 0; i < n; i++) if (rand() < this.subsample) idx.push(i);
      if (idx.length < 20) idx.push(...Array.from({ length: 20 }, (_, i) => i));

      const Xs = idx.map((i) => X[i]);
      const rs = idx.map((i) => residual[i]);
      const tree = new RegressionTree({ maxDepth: this.maxDepth, minSamplesLeaf: 5 });
      tree.fit(Xs, rs);
      this.trees.push(tree);

      const tot = tree.featureImportance.reduce((s, v) => s + v, 0) || 1;
      tree.featureImportance.forEach((v, f) => (this.featureImportance[f] += (v / tot) * this.learningRate));

      for (let i = 0; i < n; i++) pred[i] += this.learningRate * tree.predict(X[i]);
    }
  }

  predict(x: number[]): number {
    let p = this.baseValue;
    for (const t of this.trees) p += this.learningRate * t.predict(x);
    return p;
  }
}
