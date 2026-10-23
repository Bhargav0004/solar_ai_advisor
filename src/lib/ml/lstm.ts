// Minimal single-layer LSTM for time-series regression, implemented from scratch
// with manual Backpropagation Through Time (BPTT) and the Adam optimizer.
// Small by design (hidden 12-16) so training completes server-side in seconds.

interface LSTMOptions {
  hiddenSize?: number;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  seed?: number;
}

interface Cache {
  z: number[]; // concatenated [x_t, h_prev]
  i: number[];
  f: number[];
  o: number[];
  g: number[];
  cPrev: number[];
  c: number[];
  cAct: number[]; // tanh(c)
  h: number[];
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export class LSTMModel {
  private H: number;
  private D: number; // feature dim
  private K: number; // D + H

  // parameters (flat arrays)
  private Wi: number[]; Wf: number[]; Wo: number[]; Wg: number[];
  private bi: number[]; bf: number[]; bo: number[]; bg: number[];
  private Wy: number[]; by = 0;

  // Adam moments
  private m: Record<string, number[]>;
  private v: Record<string, number[]>;
  private step = 0;

  lossCurve: number[] = []; // training loss sampled every few epochs

  constructor(private opts: LSTMOptions = {}) {
    this.H = opts.hiddenSize ?? 12;
    this.D = 0; // set in fit
    this.K = 0;
    this.Wi = this.Wf = this.Wo = this.Wg = [];
    this.bi = this.bf = this.bo = this.bg = [];
    this.Wy = [];
    this.m = {};
    this.v = {};
  }

  private initParams(D: number) {
    this.D = D;
    this.K = D + this.H;
    const rand = mulberry(this.opts.seed ?? 21);
    const scale = Math.sqrt(2 / (this.K + this.H));
    const init = (n: number) => Array.from({ length: n }, () => (rand() * 2 - 1) * scale);
    this.Wi = init(this.H * this.K);
    this.Wf = init(this.H * this.K);
    this.Wo = init(this.H * this.K);
    this.Wg = init(this.H * this.K);
    this.bi = new Array(this.H).fill(0);
    this.bf = new Array(this.H).fill(1); // forget-gate bias = 1 (helps learning)
    this.bo = new Array(this.H).fill(0);
    this.bg = new Array(this.H).fill(0);
    this.Wy = init(this.H);
    const zero = (n: number) => new Array(n).fill(0);
    this.m = {
      Wi: zero(this.Wi.length), Wf: zero(this.Wf.length), Wo: zero(this.Wo.length), Wg: zero(this.Wg.length),
      bi: zero(this.H), bf: zero(this.H), bo: zero(this.H), bg: zero(this.H),
      Wy: zero(this.H), by: zero(1),
    };
    this.v = JSON.parse(JSON.stringify(this.m));
  }

  /** sequences: array of {seq: number[][], target: number} with raw (standardized) values */
  fit(sequences: { seq: number[][]; target: number }[]) {
    const D = sequences[0].seq[0].length;
    this.initParams(D);
    const H = this.H;
    const epochs = this.opts.epochs ?? 50;
    const batch = this.opts.batchSize ?? 64;
    const lr = this.opts.learningRate ?? 0.02;
    const rand = mulberry((this.opts.seed ?? 21) + 1);

    const order = sequences.map((_, i) => i);
    for (let epoch = 0; epoch < epochs; epoch++) {
      // shuffle
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      let epochLoss = 0;
      let batches = 0;

      for (let bStart = 0; bStart < order.length; bStart += batch) {
        const bIdx = order.slice(bStart, bStart + batch);
        const grads = this.zeroGrads();
        let loss = 0;

        for (const si of bIdx) {
          const { caches, yHat, hFinal } = this.forward(sequences[si].seq);
          const err = yHat - sequences[si].target;
          loss += err * err;
          this.backward(sequences[si].seq, caches, hFinal, err, grads, 1 / bIdx.length);
        }

        epochLoss += loss / bIdx.length;
        batches++;
        this.adamUpdate(grads, lr);
      }

      if (epoch % 5 === 0 || epoch === epochs - 1) this.lossCurve.push(round4(epochLoss / batches));
    }
  }

  predict(seq: number[][]): number {
    const { yHat } = this.forward(seq);
    return yHat;
  }

  // ---------- forward ----------
  private forward(seq: number[][]) {
    const H = this.H, K = this.K;
    const h = new Array(H).fill(0);
    const c = new Array(H).fill(0);
    const caches: Cache[] = [];

    for (let t = 0; t < seq.length; t++) {
      const z = [...seq[t], ...h]; // [x_t, h_prev]
      const cPrev = [...c];

      const i = gate(this.Wi, this.bi, z, sigmoid);
      const f = gate(this.Wf, this.bf, z, sigmoid);
      const o = gate(this.Wo, this.bo, z, sigmoid);
      const g = gate(this.Wg, this.bg, z, Math.tanh);

      for (let j = 0; j < H; j++) c[j] = f[j] * cPrev[j] + i[j] * g[j];
      const cAct = c.map(Math.tanh);
      for (let j = 0; j < H; j++) h[j] = o[j] * cAct[j];

      caches.push({ z, i, f, o, g, cPrev, c: [...c], cAct, h: [...h] });
    }

    let yHat = this.by;
    for (let j = 0; j < H; j++) yHat += this.Wy[j] * h[j];

    return { caches, yHat, hFinal: h };
  }

  // ---------- backward (BPTT) ----------
  private backward(seq: number[][], caches: Cache[], hFinal: number[], err: number, grads: Grads, scale: number) {
    const H = this.H, K = this.K, D = this.D;

    // output layer
    const dY = 2 * err * scale;
    for (let j = 0; j < H; j++) grads.Wy[j] += dY * hFinal[j];
    grads.by[0] += dY;

    let dhNext = new Array(H).fill(0);
    let dcNext = new Array(H).fill(0);

    for (let t = seq.length - 1; t >= 0; t--) {
      const cache = caches[t];
      const dh = new Array(H);
      for (let j = 0; j < H; j++) dh[j] = dY * this.Wy[j] + dhNext[j];

      const daO = new Array(H), daI = new Array(H), daF = new Array(H), daG = new Array(H);
      const dc = new Array(H);
      for (let j = 0; j < H; j++) {
        const o = cache.o[j], f = cache.f[j], ii = cache.i[j], g = cache.g[j];
        const cAct = cache.cAct[j], cPrev = cache.cPrev[j];
        daO[j] = dh[j] * cAct * o * (1 - o);
        dc[j] = dh[j] * o * (1 - cAct * cAct) + dcNext[j];
        daG[j] = dc[j] * ii * (1 - g * g);
        daI[j] = dc[j] * g * ii * (1 - ii);
        daF[j] = dc[j] * cPrev * f * (1 - f);
      }
      const dcPrev = new Array(H);
      for (let j = 0; j < H; j++) dcPrev[j] = dc[j] * cache.f[j];

      // weight grads (outer product with z) + dz accumulation
      const dz = new Array(K).fill(0);
      accumulate(grads.Wi, grads.bi, daI, cache.z, dz, this.Wi, H, K);
      accumulate(grads.Wf, grads.bf, daF, cache.z, dz, this.Wf, H, K);
      accumulate(grads.Wo, grads.bo, daO, cache.z, dz, this.Wo, H, K);
      accumulate(grads.Wg, grads.bg, daG, cache.z, dz, this.Wg, H, K);

      dhNext = dz.slice(D); // gradient wrt h_prev
      dcNext = dcPrev;
    }
  }

  private zeroGrads(): Grads {
    const zero = (n: number) => new Array(n).fill(0);
    return {
      Wi: zero(this.Wi.length), Wf: zero(this.Wf.length), Wo: zero(this.Wo.length), Wg: zero(this.Wg.length),
      bi: zero(this.H), bf: zero(this.H), bo: zero(this.H), bg: zero(this.H),
      Wy: zero(this.H), by: zero(1),
    };
  }

  private adamUpdate(grads: Grads, lr: number) {
    this.step++;
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    // global norm clipping for stability
    let sq = 0;
    for (const key of Object.keys(grads) as (keyof Grads)[]) for (const gv of grads[key]) sq += gv * gv;
    const norm = Math.sqrt(sq);
    const clip = norm > 5 ? 5 / norm : 1;

    const update = (p: number[], g: number[], mk: number[], vk: number[]) => {
      const c1 = 1 - Math.pow(b1, this.step);
      const c2 = 1 - Math.pow(b2, this.step);
      for (let i = 0; i < p.length; i++) {
        const gi = g[i] * clip;
        mk[i] = b1 * mk[i] + (1 - b1) * gi;
        vk[i] = b2 * vk[i] + (1 - b2) * gi * gi;
        p[i] -= (lr * (mk[i] / c1)) / (Math.sqrt(vk[i] / c2) + eps);
      }
    };

    update(this.Wi, grads.Wi, this.m.Wi, this.v.Wi);
    update(this.Wf, grads.Wf, this.m.Wf, this.v.Wf);
    update(this.Wo, grads.Wo, this.m.Wo, this.v.Wo);
    update(this.Wg, grads.Wg, this.m.Wg, this.v.Wg);
    update(this.bi, grads.bi, this.m.bi, this.v.bi);
    update(this.bf, grads.bf, this.m.bf, this.v.bf);
    update(this.bo, grads.bo, this.m.bo, this.v.bo);
    update(this.bg, grads.bg, this.m.bg, this.v.bg);
    update(this.Wy, grads.Wy, this.m.Wy, this.v.Wy);
    update(this.by, grads.by, this.m.by, this.v.by);
  }
}

interface Grads {
  Wi: number[]; Wf: number[]; Wo: number[]; Wg: number[];
  bi: number[]; bf: number[]; bo: number[]; bg: number[];
  Wy: number[]; by: number[];
}

function gate(W: number[], b: number[], z: number[], act: (x: number) => number): number[] {
  const H = b.length;
  const out = new Array(H);
  for (let j = 0; j < H; j++) {
    let s = b[j];
    const row = j * z.length;
    for (let k = 0; k < z.length; k++) s += W[row + k] * z[k];
    out[j] = act(s);
  }
  return out;
}

function accumulate(Wg: number[], bg: number[], da: number[], z: number[], dz: number[], W: number[], H: number, K: number) {
  for (let j = 0; j < H; j++) {
    const g = da[j];
    bg[j] += g;
    const row = j * K;
    for (let k = 0; k < K; k++) {
      Wg[row + k] += g * z[k];
      dz[k] += W[row + k] * g;
    }
  }
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
