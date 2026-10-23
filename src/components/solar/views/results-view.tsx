"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Sun,
  Zap,
  Wallet,
  Clock,
  Leaf,
  Bot,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Battery,
  Sparkles,
  ArrowLeft,
  ClipboardList,
  CloudSun,
  TrendingUp,
  Gauge,
  Loader2,
  Tag,
  PanelTop,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/lib/solar/helpers";
import type {
  AIRecommendation,
  AssessmentRecord,
  CalculationResults,
  WeatherData,
} from "@/types/solar";

// ---------------------------------------------------------------------------
// Chart palette
// ---------------------------------------------------------------------------

const CHART_COLORS = ["#16a34a", "#eab308", "#1e3a5f", "#f59e0b", "#14b8a6", "#a855f7", "#ef4444"];

// ---------------------------------------------------------------------------
// Sub-components (module-level)
// ---------------------------------------------------------------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "solar" | "navy" | "teal" | "amber";
}) {
  const toneClass =
    tone === "solar"
      ? "bg-[var(--solar)]/15 text-[var(--solar-foreground)]"
      : tone === "navy"
        ? "bg-[var(--chart-3)]/15 text-foreground"
        : tone === "teal"
          ? "bg-[var(--chart-5)]/15 text-foreground"
          : tone === "amber"
            ? "bg-[var(--chart-4)]/15 text-foreground"
            : "bg-primary/10 text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground/80">{sub}</div>}
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[260px] w-full rounded-md" />;
}

function tooltipFormatter(value: number | string, name: string) {
  if (typeof value === "number") {
    return [formatNumber(value, 0), name];
  }
  return [String(value), name];
}

function FactorRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number; // 0..1
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function RoofStatusBadge({ status }: { status: CalculationResults["roofFeasibility"] }) {
  const map: Record<CalculationResults["roofFeasibility"], { cls: string; label: string }> = {
    Sufficient: { cls: "bg-primary/10 text-primary", label: "Sufficient" },
    Limited: { cls: "bg-[var(--solar)]/15 text-[var(--solar-foreground)]", label: "Limited" },
    Insufficient: { cls: "bg-destructive/10 text-destructive", label: "Insufficient" },
  };
  const m = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

function BatteryStatusBadge({
  status,
}: {
  status: "Recommended" | "Potentially useful" | "Not needed";
}) {
  const map = {
    Recommended: "bg-primary/10 text-primary",
    "Potentially useful": "bg-[var(--solar)]/15 text-[var(--solar-foreground)]",
    "Not needed": "bg-muted text-muted-foreground",
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status]}`}>{status}</span>;
}

function WeatherCard({ weather }: { weather: WeatherData }) {
  const live = weather.source === "open-meteo";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--chart-5)]/15">
            <CloudSun className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Weather data</div>
            <div className="text-xs text-muted-foreground">{weather.locationName}</div>
          </div>
        </div>
        <Badge variant={live ? "default" : "outline"} className={live ? "" : "border-[var(--solar)]/40 text-[var(--solar-foreground)]"}>
          {live ? "Live data" : "Estimated data"}
        </Badge>
      </div>
      <Separator className="my-4" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WeatherStat label="Current temp" value={weather.currentTempC != null ? `${formatNumber(weather.currentTempC, 0)}°C` : "—"} />
        <WeatherStat label="Cloud cover" value={weather.cloudCoverPct != null ? `${formatNumber(weather.cloudCoverPct, 0)}%` : "—"} />
        <WeatherStat label="Conditions" value={weather.weatherDescription || "—"} />
        <WeatherStat label="Peak sun hrs" value={`${formatNumber(weather.estimatedPeakSunHours, 1)} h`} />
      </div>
      {weather.note && (
        <p className="mt-3 text-xs text-muted-foreground">{weather.note}</p>
      )}
    </Card>
  );
}

function WeatherStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}

function RecommendationList({
  items,
  icon: Icon,
  tone,
  empty,
}: {
  items: string[] | undefined | null;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "solar" | "amber" | "teal";
  empty?: string;
}) {
  if (!items || items.length === 0) {
    return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  }
  const toneClass =
    tone === "solar"
      ? "text-[var(--solar-foreground)]"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "teal"
          ? "text-teal-600"
          : "text-primary";
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} />
          <span className="text-foreground/90">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function AIRecommendationCard({
  recommendation,
  loading,
  onGenerate,
  assessmentId,
}: {
  recommendation: AIRecommendation | null;
  loading: boolean;
  onGenerate: () => void;
  assessmentId: string | null;
}) {
  return (
    <Card className="border-l-4 border-l-[var(--solar)]">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--solar)]/15">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">AI Recommendation</CardTitle>
              <CardDescription>Generated by SolarAI based on your assessment</CardDescription>
            </div>
          </div>
          <Badge className="bg-[var(--solar)] text-[var(--solar-foreground)]">
            <Sparkles className="h-3 w-3" /> AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating analysis…
          </div>
        ) : !recommendation ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No AI analysis yet</p>
            <p className="text-xs text-muted-foreground">
              Generate a detailed recommendation from SolarAI.
            </p>
            <Button
              className="mt-3 gap-1.5"
              onClick={onGenerate}
              disabled={!assessmentId}
            >
              <Sparkles className="h-4 w-4" /> Generate AI analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-sm leading-relaxed">{recommendation.summary}</p>
            </div>

            {recommendation.recommendedSystem && (
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Recommended system
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {recommendation.recommendedSystem}
                </div>
              </div>
            )}

            {recommendation.keyReasons && recommendation.keyReasons.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Key reasons
                </h4>
                <RecommendationList items={recommendation.keyReasons} icon={CheckCircle2} tone="primary" />
              </div>
            )}

            {recommendation.recommendations && recommendation.recommendations.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommendations
                </h4>
                <RecommendationList items={recommendation.recommendations} icon={CheckCircle2} tone="teal" />
              </div>
            )}

            {recommendation.warnings && recommendation.warnings.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Warnings
                </h4>
                <RecommendationList items={recommendation.warnings} icon={AlertTriangle} tone="amber" />
              </div>
            )}

            {recommendation.efficiencyTips && recommendation.efficiencyTips.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Efficiency tips
                </h4>
                <RecommendationList items={recommendation.efficiencyTips} icon={Lightbulb} tone="solar" />
              </div>
            )}

            <Button variant="outline" size="sm" onClick={onGenerate} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh AI analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SolarRecommendationCard({ results }: { results: CalculationResults }) {
  const rows = [
    { label: "Recommended system", value: `${formatNumber(results.recommendedCapacityKW, 2)} kW` },
    {
      label: "Estimated panels",
      value: `${results.panelCount} × ${results.panelWattage}W panels`,
    },
    {
      label: "Estimated generation",
      value: `${formatNumber(results.monthlyGenerationKWh, 0)} kWh / month`,
    },
    {
      label: "Roof requirement",
      value: `~${formatNumber(results.requiredRoofAreaSqFt, 0)} sq ft`,
      badge: <RoofStatusBadge status={results.roofFeasibility} />,
    },
    {
      label: "Installation cost",
      value: `${formatCurrency(results.installationCostMin)} – ${formatCurrency(results.installationCostMax)}`,
    },
    { label: "Annual savings", value: formatCurrency(results.annualSavings) },
    { label: "Payback period", value: `~${formatNumber(results.paybackYears, 1)} years` },
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <PanelTop className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Solar recommendation</CardTitle>
            <CardDescription>System sizing summary at a glance</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border/60">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="flex items-center gap-2 text-sm font-semibold">
                {r.value}
                {r.badge}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function BatteryRecommendationCard({ results }: { results: CalculationResults }) {
  const b = results.batteryRecommendation;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--chart-5)]/15">
              <Battery className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Battery recommendation</CardTitle>
              <CardDescription>Energy storage analysis</CardDescription>
            </div>
          </div>
          <BatteryStatusBadge status={b.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Suggested capacity
            </div>
            <div className="mt-0.5 text-base font-semibold">
              {formatNumber(b.suggestedCapacityKWh, 1)} kWh
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Estimated cost
            </div>
            <div className="mt-0.5 text-base font-semibold">{formatCurrency(b.estimatedCost)}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Primary benefit
          </div>
          <p className="mt-0.5 text-sm font-medium">{b.primaryBenefit}</p>
        </div>
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rationale</div>
          <p className="mt-0.5 text-sm text-foreground/90">{b.rationale}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SuitabilityCard({ results }: { results: CalculationResults }) {
  const score = results.suitabilityScore;
  const scoreColor =
    score >= 70 ? "#16a34a" : score >= 50 ? "#eab308" : "#ef4444";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Suitability score</CardTitle>
        <CardDescription>How well-suited your property is for solar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{
            background: `conic-gradient(${scoreColor} ${score * 3.6}deg, var(--muted) ${score * 3.6}deg)`,
          }}>
            <div className="grid h-16 w-16 place-items-center rounded-full bg-background">
              <div className="text-center">
                <div className="text-xl font-bold leading-none" style={{ color: scoreColor }}>
                  {score}
                </div>
                <div className="text-[10px] text-muted-foreground">/ 100</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: scoreColor }}>
              {results.suitabilityLabel}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A weighted score across five factors below.
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="space-y-3">
          <FactorRow label="Roof suitability" value={results.factors.roofSuitability} color="#16a34a" />
          <FactorRow label="Solar resource" value={results.factors.solarResource} color="#eab308" />
          <FactorRow label="Budget suitability" value={results.factors.budgetSuitability} color="#1e3a5f" />
          <FactorRow label="Energy demand" value={results.factors.energyDemand} color="#f59e0b" />
          <FactorRow label="Shading" value={results.factors.shading} color="#14b8a6" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Charts (module-level components)
// ---------------------------------------------------------------------------

function EnergyProductionChart({ results }: { results: CalculationResults }) {
  const data = results.monthlyGeneration.map((m) => ({
    month: m.month,
    generation: Math.round(m.generation),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <RTooltip
          contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(v: number, n: string) => tooltipFormatter(v, n)}
        />
        <Area
          type="monotone"
          dataKey="generation"
          name="Generation (kWh)"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#genGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ConsumptionVsSolarChart({ results }: { results: CalculationResults }) {
  const data = results.monthlyGeneration.map((m) => ({
    month: m.month,
    generation: Math.round(m.generation),
    consumption: Math.round(m.consumption),
    grid: Math.round(m.gridDependency),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <RTooltip
          contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(v: number, n: string) => tooltipFormatter(v, n)}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Bar dataKey="generation" name="Solar" fill="#16a34a" radius={[3, 3, 0, 0]} />
        <Bar dataKey="consumption" name="Consumption" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
        <Bar dataKey="grid" name="Grid" fill="#f59e0b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SavingsOverTimeChart({ results }: { results: CalculationResults }) {
  const data = results.annualSavingsSeries.map((s) => ({
    year: `Y${s.year}`,
    savings: Math.round(s.savings),
    cumulative: Math.round(s.cumulative),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} interval={2} />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <RTooltip
          contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(v: number, n: string) => [formatCurrency(v), n]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Line type="monotone" dataKey="savings" name="Annual" stroke="#eab308" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#16a34a" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ApplianceConsumptionChart({ results }: { results: CalculationResults }) {
  const data = results.applianceBreakdown
    .filter((a) => a.kWhPerMonth > 0)
    .map((a) => ({ name: a.name, value: Math.round(a.kWhPerMonth) }));
  const hasData = data.length > 0;
  return (
    <div>
      {!hasData ? (
        <div className="grid h-[260px] place-items-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
          No appliance data was provided for this assessment.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={45}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <RTooltip
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              formatter={(v: number, n: string) => [`${formatNumber(v, 0)} kWh/mo`, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CO2Chart({ results }: { results: CalculationResults }) {
  const data = [
    { name: "Annual", value: Math.round(results.annualCO2ReductionTons * 100) / 100 },
    { name: "Lifetime", value: Math.round(results.lifetimeCO2ReductionTons * 100) / 100 },
  ];
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} unit=" t" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} width={70} />
          <RTooltip
            contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            formatter={(v: number) => [`${formatNumber(v, 2)} tons CO₂`, "Reduction"]}
          />
          <Bar dataKey="value" fill="#16a34a" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-primary/5 p-3 text-center">
          <Leaf className="mx-auto h-4 w-4 text-primary" />
          <div className="mt-1 text-lg font-bold">{formatNumber(results.annualCO2ReductionTons, 2)} t</div>
          <div className="text-[11px] text-muted-foreground">CO₂ / year</div>
        </div>
        <div className="rounded-lg bg-primary/5 p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-primary" />
          <div className="mt-1 text-lg font-bold">{formatNumber(results.lifetimeCO2ReductionTons, 1)} t</div>
          <div className="text-[11px] text-muted-foreground">CO₂ over 25 years</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / error / empty states
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <PageBody>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-1" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </PageBody>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <PageBody>
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load assessment</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <div className="mt-4">
        <Button onClick={onRetry} variant="outline" className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </PageBody>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <PageBody>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">No assessment selected</p>
            <p className="text-sm text-muted-foreground">
              Run a new assessment to see your personalized results here.
            </p>
          </div>
          <Button onClick={onNew} className="gap-2">
            <ClipboardList className="h-4 w-4" /> Start new assessment
          </Button>
        </CardContent>
      </Card>
    </PageBody>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function ResultsView() {
  const { currentAssessmentId, navigate } = useApp();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const queryKey = useMemo(
    () => ["assessment", currentAssessmentId],
    [currentAssessmentId],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryKeyHashFn: (k) => JSON.stringify(k),
    enabled: !!currentAssessmentId,
    queryFn: () =>
      api.get<{ assessment: AssessmentRecord }>(
        `/api/assessment/${currentAssessmentId}`,
      ).then((d) => d.assessment),
  });

  const recalcMutation = useMutation({
    mutationFn: () =>
      api.post<{ assessment: AssessmentRecord }>(
        `/api/assessment/${currentAssessmentId}/recalculate`,
      ),
    onSuccess: () => {
      toast.success("Assessment recalculated with fresh weather data.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Recalculation failed.";
      toast.error(msg);
    },
  });

  const aiMutation = useMutation({
    mutationFn: () =>
      api.post<{ recommendation: AIRecommendation }>("/api/ai/analyze", {
        assessmentId: currentAssessmentId,
      }),
    onSuccess: () => {
      toast.success("AI analysis updated.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "AI analysis failed.";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/api/assessment/${currentAssessmentId}`),
    onSuccess: () => {
      toast.success("Assessment deleted.");
      queryClient.invalidateQueries({ queryKey: ["assessment-history"] });
      navigate("history");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Delete failed.";
      toast.error(msg);
      setDeleteOpen(false);
    },
  });

  if (!currentAssessmentId) {
    return (
      <>
        <PageHeader title="Results" description="Your solar assessment dashboard" />
        <EmptyState onNew={() => navigate("assessment")} />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Results" description="Your solar assessment dashboard" />
        <LoadingState />
      </>
    );
  }

  if (isError || !data) {
    const msg =
      error instanceof ApiError
        ? error.message
        : "Something went wrong while loading your assessment.";
    return (
      <>
        <PageHeader title="Results" description="Your solar assessment dashboard" />
        <ErrorState message={msg} onRetry={() => refetch()} />
      </>
    );
  }

  const assessment = data;
  const results = assessment.calculationResults;

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("advisor")}
        className="gap-1.5"
      >
        <Bot className="h-4 w-4" /> AI Advisor
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("simulator")}
        className="gap-1.5"
      >
         <SlidersHorizontal className="h-4 w-4" /> Simulator  
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => recalcMutation.mutate()}
        disabled={recalcMutation.isPending}
        className="gap-1.5"
      >
        {recalcMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Recalculate
      </Button>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the assessment and its AI conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Your solar results"
        description={`${assessment.propertyType} • ${assessment.city}, ${assessment.state}`}
        action={headerActions}
      />
      <PageBody>
        {/* Top KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            icon={Sun}
            label="Recommended system"
            value={`${formatNumber(results.recommendedCapacityKW, 2)} kW`}
            sub={`${results.panelCount} × ${results.panelWattage}W panels`}
            tone="default"
          />
          <KpiCard
            icon={Zap}
            label="Monthly generation"
            value={`${formatNumber(results.monthlyGenerationKWh, 0)} kWh`}
            sub={`${formatNumber(results.annualGenerationKWh, 0)} kWh / yr`}
            tone="solar"
          />
          <KpiCard
            icon={Wallet}
            label="Monthly savings"
            value={formatCurrency(results.monthlySavings)}
            sub={`${formatCurrency(results.annualSavings)} / yr`}
            tone="default"
          />
          <KpiCard
            icon={Clock}
            label="Payback period"
            value={`${formatNumber(results.paybackYears, 1)} yr`}
            sub={`${formatCurrency(results.lifetimeSavings, { compact: true })} lifetime`}
            tone="navy"
          />
          <KpiCard
            icon={Leaf}
            label="Annual CO₂ reduction"
            value={`${formatNumber(results.annualCO2ReductionTons, 2)} t`}
            sub={`${formatNumber(results.lifetimeCO2ReductionTons, 1)} t lifetime`}
            tone="teal"
          />
        </div>

        {/* Suitability + Solar recommendation */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SuitabilityCard results={results} />
          <div className="lg:col-span-2">
            <SolarRecommendationCard results={results} />
          </div>
        </div>

        {/* Charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Energy production"
            description="Estimated monthly solar generation (kWh)."
          >
            <EnergyProductionChart results={results} />
          </ChartCard>

          <ChartCard
            title="Consumption vs Solar"
            description="Monthly consumption, solar generation and grid dependency."
          >
            <ConsumptionVsSolarChart results={results} />
          </ChartCard>

          <ChartCard
            title="Savings over time"
            description="Annual and cumulative savings across the 25-year system life."
          >
            <SavingsOverTimeChart results={results} />
          </ChartCard>

          <ChartCard
            title="Appliance consumption"
            description="Share of monthly kWh by appliance."
          >
            <ApplianceConsumptionChart results={results} />
          </ChartCard>
        </div>

        {/* CO2 + Weather */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="CO₂ reduction"
            description="Annual and lifetime CO₂ avoided versus grid electricity."
          >
            <CO2Chart results={results} />
          </ChartCard>
          {assessment.weatherData ? (
            <WeatherCard weather={assessment.weatherData} />
          ) : (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                  <CloudSun className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Weather data</div>
                  <div className="text-xs text-muted-foreground">No weather data available</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* AI + Battery */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AIRecommendationCard
            recommendation={assessment.aiRecommendation}
            loading={aiMutation.isPending}
            onGenerate={() => aiMutation.mutate()}
            assessmentId={currentAssessmentId}
          />
          <BatteryRecommendationCard results={results} />
        </div>

        {/* Back to overview */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("overview")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to overview
          </Button>
          <span className="text-xs text-muted-foreground">
            Assessment ID: <code className="font-mono">{assessment.id.slice(0, 8)}</code>
          </span>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          Estimates are informational and based on configurable assumptions. Actual results vary
          with weather, equipment and installation. Verify with a qualified solar professional.
        </p>
      </PageBody>
    </>
  );
}
