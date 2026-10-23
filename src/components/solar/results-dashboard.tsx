'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Sun, Wheat, TrendingUp, ShieldAlert, MapPin, Scale, Bot, CalendarClock } from 'lucide-react';
import { INR, INR_FULL, type AnalysisResponse } from '@/lib/types';

const SOLAR_COLOR = '#d97706'; // amber-600
const AGRI_COLOR = '#16a34a'; // green-600

const severityBadge = (s: 'low' | 'medium' | 'high') =>
  s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';

const bandColor = (band: string) =>
  band === 'excellent' || band === 'low'
    ? 'bg-green-100 text-green-800'
    : band === 'good' || band === 'moderate'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-800';

export function ResultsDashboard({ data }: { data: AnalysisResponse }) {
  const { forecast, solarEnergy, agriPrediction, riskAnalysis, suitability, input, reportSource } = data;

  const chartData = forecast.yearly.map((y) => ({
    year: `Y${y.year}`,
    'Solar Rent (yearly)': y.solarIncome,
    'Farm Income (yearly)': y.agriIncome,
    'Solar Cumulative': y.solarCumulative,
    'Farm Cumulative': y.agriCumulative,
  }));

  const verdictText =
    forecast.verdict === 'solar_higher'
      ? `Over ${forecast.contractYears} years, the solar lease pays ${INR(forecast.difference)} more than the projected farm income (base case).`
      : forecast.verdict === 'agriculture_higher'
        ? `Over ${forecast.contractYears} years, continuing agriculture is projected to earn ${INR(Math.abs(forecast.difference))} more than the offered solar lease (base case).`
        : `Over ${forecast.contractYears} years, both options are nearly equal — the difference is within ${INR(Math.abs(forecast.difference))}.`;

  const sourceBadge = reportSource === 'groq' ? 'Groq Llama 3.3 70B' : reportSource === 'solarai' ? 'GLM (fallback)' : 'Rule-based engine';

  return (
    <div className="space-y-6">
      {/* ---------- Neutral verdict banner ---------- */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 via-white to-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-green-700" />
            Neutral Comparison — {input.farmerName}&apos;s Land
          </CardTitle>
          <CardDescription>
            {input.landAreaAcres} acres · {input.district ? `${input.district}, ` : ''}
            {input.state} · {forecast.contractYears}-year contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{verdictText}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            ⚖️ This is an informational estimate, not a recommendation. Final decision should involve your family, neighbours with solar contracts, and a lawyer.
          </p>
        </CardContent>
      </Card>

      {/* ---------- KPI cards ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-amber-100">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <Sun className="h-3.5 w-3.5 text-amber-600" /> Solar Energy Prediction
            </CardDescription>
            <CardTitle className="text-xl">{(solarEnergy.year1GenerationKwh / 1000).toFixed(0)}k kWh</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-0.5">
            <p>{solarEnergy.estimatedCapacityKwp} kWp · CUF {(solarEnergy.cuf * 100).toFixed(0)}% · GHI {solarEnergy.ghi}</p>
            <p>
              Rent/acre {INR(solarEnergy.rentPerAcre)}{' '}
              <Badge variant={severityBadge(solarEnergy.rentVerdict === 'attractive' ? 'low' : solarEnergy.rentVerdict === 'fair' ? 'medium' : 'high')} className="ml-1 h-4 px-1 text-[10px]">
                {solarEnergy.rentVerdict.replace('_', ' ')}
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-100">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <Wheat className="h-3.5 w-3.5 text-green-700" /> Farm Income (Year {forecast.contractYears})
            </CardDescription>
            <CardTitle className="text-xl">{INR(agriPrediction.incomeSeries[agriPrediction.incomeSeries.length - 1])}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-0.5">
            <p>Growth {(agriPrediction.adjustedGrowth * 100).toFixed(1)}%/yr · volatility {(agriPrediction.volatility * 100).toFixed(0)}%</p>
            <p>Crops: {agriPrediction.dominantCrops.slice(0, 3).join(', ')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-green-700" /> Cumulative Difference
            </CardDescription>
            <CardTitle className={`text-xl ${forecast.difference >= 0 ? 'text-amber-700' : 'text-green-700'}`}>
              {forecast.difference >= 0 ? '+' : '−'}
              {INR(Math.abs(forecast.difference))}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-0.5">
            <p>{forecast.difference >= 0 ? 'in favour of solar lease' : 'in favour of farming'}</p>
            <p>NPV: solar {INR(forecast.solarNpv)} vs farm {INR(forecast.agriNpv)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <CalendarClock className="h-3.5 w-3.5 text-green-700" /> Break-even Year
            </CardDescription>
            <CardTitle className="text-xl">{forecast.breakevenYear ? `Year ${forecast.breakevenYear}` : 'Never'}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-0.5">
            <p>{forecast.breakevenYear ? 'When cumulative solar rent overtakes farm income' : 'Solar rent never catches up in contract period'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Charts + analysis tabs ---------- */}
      <Tabs defaultValue="forecast" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="forecast" className="text-xs sm:text-sm py-2">10-Year Forecast</TabsTrigger>
          <TabsTrigger value="scenarios" className="text-xs sm:text-sm py-2">Scenario Analysis</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs sm:text-sm py-2">Risk Analysis</TabsTrigger>
          <TabsTrigger value="suitability" className="text-xs sm:text-sm py-2">Land Suitability</TabsTrigger>
        </TabsList>

        {/* Forecast tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cumulative Income — Solar vs Agriculture</CardTitle>
              <CardDescription>How total earnings diverge over the contract period</CardDescription>
            </CardHeader>
            <CardContent className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | string) => INR_FULL(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Solar Cumulative" stroke={SOLAR_COLOR} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Farm Cumulative" stroke={AGRI_COLOR} strokeWidth={2.5} dot={false} />
                  {forecast.breakevenYear && (
                    <ReferenceLine
                      x={`Y${forecast.breakevenYear}`}
                      stroke="#78716c"
                      strokeDasharray="4 4"
                      label={{ value: 'break-even', fontSize: 11, position: 'insideTopRight', fill: '#78716c' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yearly Income Comparison</CardTitle>
              <CardDescription>Rent cheque vs farm income each year (farm income grows with inflation & trends)</CardDescription>
            </CardHeader>
            <CardContent className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | string) => INR_FULL(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Solar Rent (yearly)" fill={SOLAR_COLOR} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Farm Income (yearly)" fill={AGRI_COLOR} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios tab */}
        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What if assumptions change?</CardTitle>
              <CardDescription>
                Same land, different futures. Notice how often the winner flips — this is why a single &quot;10-year number&quot; should never be the only input to your decision.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead className="text-right">Solar Total</TableHead>
                    <TableHead className="text-right">Farm Total</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="text-center">Better</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.scenarios.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">{INR(s.solarCumulative)}</TableCell>
                      <TableCell className="text-right text-sm">{INR(s.agriCumulative)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${s.difference >= 0 ? 'text-amber-700' : 'text-green-700'}`}>
                        {s.difference >= 0 ? '+' : '−'}
                        {INR(Math.abs(s.difference))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={s.winner === 'solar' ? 'bg-amber-100 text-amber-800' : s.winner === 'agriculture' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-700'}>
                          {s.winner === 'solar' ? 'Solar' : s.winner === 'agriculture' ? 'Farming' : 'Nearly equal'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" /> Contract Risk Analysis
              </CardTitle>
              <CardDescription>{riskAnalysis.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Overall risk score</span>
                  <span className={`font-semibold ${riskAnalysis.overallScore >= 55 ? 'text-red-600' : riskAnalysis.overallScore >= 40 ? 'text-amber-600' : 'text-green-700'}`}>
                    {riskAnalysis.overallScore}/100 · {riskAnalysis.band.toUpperCase()}
                  </span>
                </div>
                <Progress value={riskAnalysis.overallScore} className="h-2.5 [&>div]:bg-amber-500" />
              </div>
              <div className="space-y-3">
                {riskAnalysis.factors.map((f) => (
                  <div key={f.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {f.title}
                        <span className="block text-xs text-muted-foreground font-normal">{f.titleHi}</span>
                      </p>
                      <Badge variant={severityBadge(f.severity)} className="shrink-0">{f.severity}</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suitability tab */}
        <TabsContent value="suitability">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-700" /> Land Suitability for Solar
              </CardTitle>
              <CardDescription>{suitability.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Suitability score</span>
                  <span className={`font-semibold px-2 py-0.5 rounded ${bandColor(suitability.band)}`}>
                    {suitability.score}/100 · {suitability.band.toUpperCase()}
                  </span>
                </div>
                <Progress value={suitability.score} className="h-2.5 [&>div]:bg-green-600" />
              </div>
              <div className="space-y-3">
                {suitability.factors.map((f) => (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground">{f.score}/100</span>
                    </div>
                    <Progress value={f.score} className="h-2 [&>div]:bg-green-600" />
                    <p className="text-xs text-muted-foreground mt-1">{f.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- AI Report ---------- */}
      <Card className="border-green-200">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-green-700" /> AI Personalized Report
              </CardTitle>
              <CardDescription>Generated by AI using your land data, regional history & risk model</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">Engine: {sourceBadge}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <AIReport report={data.aiReport} />
        </CardContent>
      </Card>
    </div>
  );
}

// Simple markdown renderer (headings, tables, bold, lists) without heavy deps
import ReactMarkdown from 'react-markdown';

function AIReport({ report }: { report: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-green-900 prose-table:text-sm">
      <ReactMarkdown
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border bg-green-50 px-2.5 py-1.5 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border px-2.5 py-1.5 align-top">{children}</td>,
          h2: ({ children }) => <h2 className="text-base font-bold mt-5 mb-2 text-green-900 first:mt-0">{children}</h2>,
          li: ({ children }) => <li className="text-sm leading-relaxed ml-4 list-disc">{children}</li>,
          p: ({ children }) => <p className="text-sm leading-relaxed mb-2.5">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-green-900">{children}</strong>,
        }}
      >
        {report}
      </ReactMarkdown>
    </div>
  );
}
