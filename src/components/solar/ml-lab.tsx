'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ZAxis, LineChart, Line, Cell } from 'recharts';
import { Brain, Loader2, Trophy, Info } from 'lucide-react';
import type { Benchmark } from '@/lib/types';

const MODEL_COLORS: Record<string, string> = {
  'Linear Regression': '#16a34a',
  'Random Forest': '#d97706',
  'XGBoost (GBM)': '#dc2626',
  LSTM: '#7c3aed',
};

export function MlLab() {
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scatterModel, setScatterModel] = useState<string>('');

 useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const res = await fetch('/api/ml/benchmark');
      const json = await res.json();
      if (!cancelled && json.ok && json.benchmark) {
        setBenchmark(json.benchmark);
        setScatterModel(json.benchmark.results[json.benchmark.results.length - 1]?.model ?? '');
      }
    } catch { /* silent */ }
  })();
  return () => { cancelled = true; };
}, []);

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ml/benchmark', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Training failed');
      setBenchmark(json.benchmark);
      setScatterModel(json.benchmark.results[json.benchmark.results.length - 1]?.model ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const scatterPoints =
    benchmark?.predictedVsActual.find((p) => p.model === scatterModel)?.points.map((p) => ({ actual: p.actual, predicted: p.predicted, size: 40 })) ?? [];

  return (
    <div className="space-y-6">
      <Card className="border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-green-700" /> AI-Based Predictive Model for Agricultural Land-to-Solar Conversion
          </CardTitle>
          <CardDescription>
            Research benchmark: 4 models trained from scratch on the same dataset (720 synthetic-but-realistic agri income records, 80/20 split), compared with MAE, RMSE & R².
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={runBenchmark} disabled={loading} className="bg-green-700 hover:bg-green-800 text-white h-10">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training 4 models (~5s)...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" /> Train & Compare Models
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground max-w-md">
            Trains Linear Regression, Random Forest, XGBoost-style Gradient Boosting and a real LSTM (BPTT) in the browser&apos;s backend — metrics are computed on a held-out test set.
          </p>
        </CardContent>
      </Card>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      {benchmark && (
        <>
          {/* Results table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Comparison — {benchmark.task}</CardTitle>
              <CardDescription>
                {benchmark.datasetSize} records · {benchmark.trainSize} train / {benchmark.testSize} test · completed in {(benchmark.totalMs / 1000).toFixed(1)}s
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">MAE (₹)</TableHead>
                    <TableHead className="text-right">RMSE (₹)</TableHead>
                    <TableHead className="text-right">R²</TableHead>
                    <TableHead className="text-right">Train Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmark.results.map((r) => (
                    <TableRow key={r.model} className={r.model === benchmark.bestModel ? 'bg-green-50/60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: MODEL_COLORS[r.model] ?? '#78716c' }} />
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              {r.model}
                              {r.model === benchmark.bestModel && (
                                <Badge className="bg-green-700 text-white text-[10px] gap-1">
                                  <Trophy className="h-3 w-3" /> Best R²
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{r.fullModelName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.mae.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right text-sm">{r.rmse.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{r.r2.toFixed(4)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{(r.trainMs / 1000).toFixed(2)}s</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* R² comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">R² Score Comparison</CardTitle>
                <CardDescription>Higher = more variance explained (1.0 = perfect)</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmark.results.map((r) => ({ model: r.model, R2: r.r2, MAE: r.mae }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="model" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="R2" radius={[4, 4, 0, 0]}>
                      {benchmark.results.map((r) => (
                        <Cell key={r.model} fill={MODEL_COLORS[r.model] ?? '#78716c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Predicted vs actual */}
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Predicted vs Actual</CardTitle>
                  <CardDescription>Closer to the diagonal = better predictions</CardDescription>
                </div>
                <Select value={scatterModel} onValueChange={setScatterModel}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {benchmark.results.map((r) => (
                      <SelectItem key={r.model} value={r.model}>
                        {r.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" dataKey="actual" name="Actual" tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="number" dataKey="predicted" name="Predicted" tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                    <ZAxis range={[35, 35]} />
                    <Tooltip formatter={(v: number | string) => `₹${Number(v).toLocaleString('en-IN')}`} />
                    <Scatter data={scatterPoints} fill={MODEL_COLORS[scatterModel] ?? '#78716c'} />
                    <Scatter data={[{ actual: 15000, predicted: 15000 }, { actual: 200000, predicted: 200000 }]} line={{ stroke: '#a8a29e', strokeDasharray: '4 4' }} shape={() => null as never} legendType="none" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Feature importance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature Importance</CardTitle>
                <CardDescription>Which factors drive farm income most (from Random Forest)</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmark.featureImportance} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="importance" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* LSTM loss curve */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LSTM Training Loss (MSE)</CardTitle>
                <CardDescription>Backpropagation through time, Adam optimizer — loss should fall and flatten</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchmark.lstmLossCurve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="loss" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Methodology */}
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-green-700" /> Methodology Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                <span className="font-medium text-foreground">Dataset:</span> 720 records (36 regions × 20 years) with 7 features — rainfall, temperature, irrigation index, soil quality, fertilizer index, crop price index, year. Income is generated from an agronomic model with log-normal noise, so it mimics real district-level variance without claiming to be real data.
              </p>
              <p>
                <span className="font-medium text-foreground">Fair comparison:</span> All 4 models predict the exact same held-out test rows. Features/target are z-score standardized using train-set statistics only (no leakage). LSTM additionally receives 4-year history sequences per region.
              </p>
              <p>
                <span className="font-medium text-foreground">Metrics:</span> MAE (average error in ₹), RMSE (penalizes big errors), R² (variance explained). Typical finding on tabular data: Gradient Boosting ≳ Random Forest &gt; LSTM &gt; Linear Regression — matching published literature, because tree ensembles capture nonlinear interactions with less data.
              </p>
              <p>
                <span className="font-medium text-foreground">Reproducibility:</span> Seeded RNG everywhere, so re-running gives identical results.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
