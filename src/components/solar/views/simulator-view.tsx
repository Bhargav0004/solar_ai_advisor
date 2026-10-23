"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  SlidersHorizontal,
  ArrowLeft,
  Zap,
  Wallet,
  Clock,
  Leaf,
  Battery,
  TrendingUp,
  ClipboardList,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Maximize2,
  Target,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import type { AssessmentRecord, ScenarioResult } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/solar/helpers";

interface Controls {
  capacityKW: number;
  monthlyConsumptionKWh: number;
  tariff: number;
  panelEfficiencyMultiplier: number;
  roofArea: number;
  batteryCapacityKWh: number;
  energyOffsetPct: number;
}

function buildInitialControls(assessment: AssessmentRecord): Controls {
  const r = assessment.calculationResults;
  return {
    capacityKW: r.recommendedCapacityKW,
    monthlyConsumptionKWh: r.monthlyConsumptionKWh,
    tariff: r.effectiveTariff,
    panelEfficiencyMultiplier: 1.0,
    roofArea: assessment.roofArea,
    batteryCapacityKWh: 0,
    energyOffsetPct: assessment.energyOffset,
  };
}

export function SimulatorView() {
  const { currentAssessmentId, navigate } = useApp();
  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", currentAssessmentId],
    queryFn: () =>
      api
        .get<{ assessment: AssessmentRecord }>(
          `/api/assessment/${currentAssessmentId}`,
        )
        .then((d) => d.assessment),
    enabled: !!currentAssessmentId,
  });

  const [controls, setControls] = useState<Controls | null>(null);
  const [baseline, setBaseline] = useState<Controls | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioResult[] | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Initialize controls once the assessment loads
  useEffect(() => {
    if (assessment && !initRef.current) {
      initRef.current = true;
      const init = buildInitialControls(assessment);
      setControls(init);
      setBaseline(init);
    }
  }, [assessment]);

  // Debounced simulation whenever controls change
  useEffect(() => {
    if (!controls || !assessment) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void runSimulation(controls, assessment, () => cancelled);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // runSimulation is stable in behavior — only depends on controls/assessment
  }, [controls, assessment]);

  async function runSimulation(
    c: Controls,
    a: AssessmentRecord,
    isCancelled: () => boolean,
  ) {
    setSimulating(true);
    setError(null);
    try {
      const data = await api.post<{ scenarios: ScenarioResult[] }>(
        "/api/solar/simulate",
        {
          baseResults: a.calculationResults,
          baseInput: {
            propertyType: a.propertyType,
            monthlyConsumptionKWh: a.calculationResults.monthlyConsumptionKWh,
            sunlightHours: a.calculationResults.effectiveSunlightHours,
            roofArea: a.roofArea,
            panelType: a.panelType,
          },
          scenarios: [{ label: "My scenario", overrides: { ...c } }],
        },
      );
      if (!isCancelled()) {
        setScenarios(data.scenarios);
      }
    } catch (err) {
      if (isCancelled()) return;
      const msg =
        err instanceof ApiError ? err.message : "Simulation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      if (!isCancelled()) setSimulating(false);
    }
  }

  // Debounced simulation whenever controls change
  useEffect(() => {
    if (!controls || !assessment) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void runSimulation(controls, assessment, () => cancelled);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [controls, assessment]);

  function updateControl<K extends keyof Controls>(key: K, value: number) {
    setControls((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function resetToBaseline() {
    if (baseline) {
      setControls({ ...baseline });
      toast.success("Reset to baseline values");
    }
  }

  function applyPreset(capacity: number) {
    setControls((prev) => (prev ? { ...prev, capacityKW: capacity } : prev));
  }

  if (!currentAssessmentId) {
    return (
      <>
        <PageHeader
          title="What-If Simulator"
          description="See how changes affect your solar economics."
        />
        <PageBody>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                <SlidersHorizontal className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">No assessment selected</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Run a solar assessment first, then simulate changes to your
                  setup.
                </p>
              </div>
              <Button
                onClick={() => navigate("assessment")}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" /> Start an assessment
              </Button>
            </CardContent>
          </Card>
        </PageBody>
      </>
    );
  }

  if (isLoading || !assessment) {
    return (
      <>
        <PageHeader
          title="What-If Simulator"
          description="See how changes affect your solar economics."
          action={
            <Button variant="outline" className="gap-2" disabled>
              <ArrowLeft className="h-4 w-4" /> Back to results
            </Button>
          }
        />
        <PageBody>
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Skeleton className="h-[520px] rounded-xl" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[260px] rounded-xl" />
              <Skeleton className="h-[260px] rounded-xl" />
            </div>
          </div>
        </PageBody>
      </>
    );
  }

  const recommendedCapacity =
    assessment.calculationResults.recommendedCapacityKW;

  return (
    <>
      <PageHeader
        title="What-If Simulator"
        description="See how changes affect your solar economics."
        action={
          <Button
            variant="outline"
            onClick={() => navigate("results", currentAssessmentId)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-4">
        {/* Preset scenario cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <PresetCard
            icon={Battery}
            label="Smaller"
            subLabel="3 kW"
            description="Test a smaller system"
            onClick={() => applyPreset(3)}
            active={controls?.capacityKW === 3}
          />
          <PresetCard
            icon={Target}
            label="Recommended"
            subLabel={`${formatNumber(recommendedCapacity, 1)} kW`}
            description="Your sized system"
            onClick={() => applyPreset(recommendedCapacity)}
            active={
              controls?.capacityKW === recommendedCapacity &&
              Math.abs(recommendedCapacity - 3) > 0.001 &&
              Math.abs(recommendedCapacity - 7) > 0.001
            }
            highlighted
          />
          <PresetCard
            icon={Maximize2}
            label="Larger"
            subLabel="7 kW"
            description="Test a larger system"
            onClick={() => applyPreset(7)}
            active={controls?.capacityKW === 7}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Controls panel */}
          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Controls</h3>
                {simulating && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    recalculating…
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToBaseline}
                disabled={!baseline || !controls}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <Separator className="mb-5" />

            {controls && baseline && (
              <div className="flex flex-col gap-5">
                <ControlSlider
                  label="Solar capacity"
                  icon={Zap}
                  value={controls.capacityKW}
                  baseValue={baseline.capacityKW}
                  min={0.5}
                  max={15}
                  step={0.5}
                  decimals={1}
                  unit="kW"
                  onChange={(v) => updateControl("capacityKW", v)}
                />
                <ControlSlider
                  label="Electricity tariff"
                  icon={Wallet}
                  value={controls.tariff}
                  baseValue={baseline.tariff}
                  min={3}
                  max={15}
                  step={0.5}
                  decimals={1}
                  unit="₹/kWh"
                  onChange={(v) => updateControl("tariff", v)}
                />
                <ControlSlider
                  label="Panel efficiency"
                  icon={Sparkles}
                  value={controls.panelEfficiencyMultiplier}
                  baseValue={baseline.panelEfficiencyMultiplier}
                  min={0.7}
                  max={1.2}
                  step={0.05}
                  decimals={2}
                  unit="x"
                  helper="1.0 = baseline. Higher = more efficient panels."
                  onChange={(v) =>
                    updateControl("panelEfficiencyMultiplier", v)
                  }
                />
                <ControlSlider
                  label="Battery capacity"
                  icon={Battery}
                  value={controls.batteryCapacityKWh}
                  baseValue={baseline.batteryCapacityKWh}
                  min={0}
                  max={30}
                  step={1}
                  decimals={0}
                  unit="kWh"
                  onChange={(v) => updateControl("batteryCapacityKWh", v)}
                />
                <ControlSlider
                  label="Solar offset"
                  icon={Leaf}
                  value={controls.energyOffsetPct}
                  baseValue={baseline.energyOffsetPct}
                  min={25}
                  max={100}
                  step={5}
                  decimals={0}
                  unit="%"
                  onChange={(v) => updateControl("energyOffsetPct", v)}
                />
                <Separator className="my-1" />
                <ControlNumber
                  label="Monthly consumption"
                  icon={Zap}
                  value={controls.monthlyConsumptionKWh}
                  baseValue={baseline.monthlyConsumptionKWh}
                  unit="kWh"
                  onChange={(v) =>
                    updateControl("monthlyConsumptionKWh", Math.max(0, v))
                  }
                />
                <ControlNumber
                  label="Roof area"
                  icon={Sun}
                  value={controls.roofArea}
                  baseValue={baseline.roofArea}
                  unit="sq ft"
                  onChange={(v) => updateControl("roofArea", Math.max(0, v))}
                />
              </div>
            )}
          </Card>

          {/* Comparison panel */}
          <div className="flex flex-col gap-4">
            {error ? (
              <Card className="border-destructive/30">
                <CardContent className="flex items-center gap-3 py-6 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {scenarios && scenarios.length >= 2 ? (
                    <>
                      <ScenarioCard
                        scenario={scenarios[0]}
                        variant="baseline"
                      />
                      <ScenarioCard
                        scenario={scenarios[1]}
                        variant="modified"
                        baseline={scenarios[0]}
                      />
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-[460px] rounded-xl" />
                      <Skeleton className="h-[460px] rounded-xl" />
                    </>
                  )}
                </div>

                {scenarios && scenarios.length >= 2 && (
                  <ComparisonChart
                    current={scenarios[0]}
                    modified={scenarios[1]}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

/* -------------------- Sub-components (module-level) -------------------- */

function PresetCard({
  icon: Icon,
  label,
  subLabel,
  description,
  onClick,
  active,
  highlighted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subLabel: string;
  description: string;
  onClick: () => void;
  active: boolean;
  highlighted?: boolean;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-primary ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            highlighted
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{label}</span>
            {highlighted && (
              <Badge className="bg-[var(--solar)]/20 text-[var(--solar-foreground)]">
                Recommended
              </Badge>
            )}
          </div>
          <div className="text-lg font-bold text-primary">{subLabel}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ControlSlider({
  label,
  icon: Icon,
  value,
  baseValue,
  min,
  max,
  step,
  decimals,
  unit,
  helper,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  baseValue: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  unit: string;
  helper?: string;
  onChange: (v: number) => void;
}) {
  const isChanged = Math.abs(value - baseValue) > 0.0001;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Label>
        <div className="flex items-center gap-1.5">
          {isChanged && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              base {formatNumber(baseValue, decimals)}
            </span>
          )}
          <span
            className={`text-sm font-semibold ${
              isChanged ? "text-primary" : "text-foreground"
            }`}
          >
            {formatNumber(value, decimals)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          </span>
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(arr) => onChange(arr[0])}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>
          {formatNumber(min, decimals)} {unit}
        </span>
        <span>
          {formatNumber(max, decimals)} {unit}
        </span>
      </div>
      {helper && (
        <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}

function ControlNumber({
  label,
  icon: Icon,
  value,
  baseValue,
  unit,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  baseValue: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const isChanged = Math.abs(value - baseValue) > 0.0001;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Label>
        {isChanged && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            base {formatNumber(baseValue)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          min={0}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className="w-full"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

type DeltaDirection = "higher" | "lower" | "neutral";

function computeDelta(
  current: number,
  base: number,
  direction: DeltaDirection,
): { diff: number; isPositive: boolean; isNeutral: boolean } {
  const diff = current - base;
  if (Math.abs(diff) < 0.001) {
    return { diff: 0, isPositive: false, isNeutral: true };
  }
  let isPositive: boolean;
  if (direction === "higher") {
    isPositive = diff > 0;
  } else if (direction === "lower") {
    isPositive = diff < 0;
  } else {
    isPositive = false;
  }
  return { diff, isPositive, isNeutral: direction === "neutral" };
}

function DeltaBadge({
  delta,
  format,
}: {
  delta: { diff: number; isPositive: boolean; isNeutral: boolean };
  format: "currency" | "number" | "duration";
}) {
  if (delta.diff === 0 || delta.isNeutral) return null;
  const absDiff = Math.abs(delta.diff);
  let text: string;
  if (format === "currency") {
    text = formatCurrency(absDiff);
  } else if (format === "duration") {
    text = `${formatNumber(absDiff, 1)} yr`;
  } else {
    text = formatNumber(absDiff, 1);
  }
  const sign = delta.diff > 0 ? "+" : "−";
  const colorClass = delta.isPositive
    ? "bg-primary/10 text-primary"
    : "bg-destructive/10 text-destructive";
  const arrow = delta.diff > 0 ? "▲" : "▼";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colorClass}`}
    >
      <span className="text-[8px] leading-none">{arrow}</span>
      {sign}
      {text}
    </span>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  delta,
  deltaFormat = "number",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: { diff: number; isPositive: boolean; isNeutral: boolean } | null;
  deltaFormat?: "currency" | "number" | "duration";
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {delta && <DeltaBadge delta={delta} format={deltaFormat} />}
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function RoofFeasibilityBadge({
  feasibility,
}: {
  feasibility: "Sufficient" | "Limited" | "Insufficient";
}) {
  const cls =
    feasibility === "Sufficient"
      ? "bg-primary/10 text-primary"
      : feasibility === "Limited"
        ? "bg-[var(--solar)]/20 text-[var(--solar-foreground)]"
        : "bg-destructive/10 text-destructive";
  return (
    <Badge variant="secondary" className={`gap-1 ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {feasibility}
    </Badge>
  );
}

function ScenarioCard({
  scenario,
  variant,
  baseline,
}: {
  scenario: ScenarioResult;
  variant: "baseline" | "modified";
  baseline?: ScenarioResult;
}) {
  const isModified = variant === "modified";
  return (
    <Card
      className={`h-full p-5 ${
        isModified ? "border-primary/40 ring-1 ring-primary/20" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`grid h-8 w-8 place-items-center rounded-lg ${
              isModified
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isModified ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{scenario.label}</h3>
            <p className="text-xs text-muted-foreground">
              {isModified
                ? "Your modified scenario"
                : "From your assessment"}
            </p>
          </div>
        </div>
        <RoofFeasibilityBadge feasibility={scenario.roofFeasibility} />
      </div>

      <Separator className="mb-1" />

      <div className="flex flex-col divide-y divide-border">
        <MetricRow
          icon={Zap}
          label="Capacity"
          value={`${formatNumber(scenario.capacityKW, 1)} kW`}
          delta={
            isModified && baseline
              ? computeDelta(scenario.capacityKW, baseline.capacityKW, "neutral")
              : null
          }
          deltaFormat="number"
        />
        <MetricRow
          icon={Zap}
          label="Monthly generation"
          value={`${formatNumber(scenario.monthlyGenerationKWh)} kWh`}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.monthlyGenerationKWh,
                  baseline.monthlyGenerationKWh,
                  "higher",
                )
              : null
          }
          deltaFormat="number"
        />
        <MetricRow
          icon={Sun}
          label="Annual generation"
          value={`${formatNumber(scenario.annualGenerationKWh)} kWh`}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.annualGenerationKWh,
                  baseline.annualGenerationKWh,
                  "higher",
                )
              : null
          }
          deltaFormat="number"
        />
        <MetricRow
          icon={Wallet}
          label="Installation cost"
          value={formatCurrency(scenario.installationCost, { compact: true })}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.installationCost,
                  baseline.installationCost,
                  "lower",
                )
              : null
          }
          deltaFormat="currency"
        />
        <MetricRow
          icon={Wallet}
          label="Monthly savings"
          value={formatCurrency(scenario.monthlySavings)}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.monthlySavings,
                  baseline.monthlySavings,
                  "higher",
                )
              : null
          }
          deltaFormat="currency"
        />
        <MetricRow
          icon={TrendingUp}
          label="Annual savings"
          value={formatCurrency(scenario.annualSavings)}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.annualSavings,
                  baseline.annualSavings,
                  "higher",
                )
              : null
          }
          deltaFormat="currency"
        />
        <MetricRow
          icon={Clock}
          label="Payback period"
          value={`${formatNumber(scenario.paybackYears, 1)} years`}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.paybackYears,
                  baseline.paybackYears,
                  "lower",
                )
              : null
          }
          deltaFormat="duration"
        />
        <MetricRow
          icon={Leaf}
          label="CO₂ reduction (annual)"
          value={`${formatNumber(scenario.annualCO2ReductionTons, 1)} tons`}
          delta={
            isModified && baseline
              ? computeDelta(
                  scenario.annualCO2ReductionTons,
                  baseline.annualCO2ReductionTons,
                  "higher",
                )
              : null
          }
          deltaFormat="number"
        />
        {scenario.batteryCapacityKWh > 0 && (
          <MetricRow
            icon={Battery}
            label="Battery"
            value={`${formatNumber(scenario.batteryCapacityKWh)} kWh · ${formatCurrency(scenario.batteryCost, { compact: true })}`}
            delta={
              isModified && baseline
                ? computeDelta(
                    scenario.batteryCapacityKWh,
                    baseline.batteryCapacityKWh,
                    "neutral",
                  )
                : null
            }
            deltaFormat="number"
          />
        )}
      </div>
    </Card>
  );
}

function ComparisonChart({
  current,
  modified,
}: {
  current: ScenarioResult;
  modified: ScenarioResult;
}) {
  const savingsMax = Math.max(current.annualSavings, modified.annualSavings, 1);
  const genMax = Math.max(
    current.annualGenerationKWh,
    modified.annualGenerationKWh,
    1,
  );
  const co2Max = Math.max(
    current.annualCO2ReductionTons,
    modified.annualCO2ReductionTons,
    0.1,
  );

  const data = [
    {
      metric: "Annual Savings",
      Current: +((current.annualSavings / savingsMax) * 100).toFixed(1),
      Mine: +((modified.annualSavings / savingsMax) * 100).toFixed(1),
      currentValue: formatCurrency(current.annualSavings, { compact: true }),
      mineValue: formatCurrency(modified.annualSavings, { compact: true }),
    },
    {
      metric: "Annual Gen",
      Current: +((current.annualGenerationKWh / genMax) * 100).toFixed(1),
      Mine: +((modified.annualGenerationKWh / genMax) * 100).toFixed(1),
      currentValue: `${formatNumber(current.annualGenerationKWh)} kWh`,
      mineValue: `${formatNumber(modified.annualGenerationKWh)} kWh`,
    },
    {
      metric: "CO₂ (tons)",
      Current: +((current.annualCO2ReductionTons / co2Max) * 100).toFixed(1),
      Mine: +((modified.annualCO2ReductionTons / co2Max) * 100).toFixed(1),
      currentValue: `${formatNumber(current.annualCO2ReductionTons, 1)} t`,
      mineValue: `${formatNumber(modified.annualCO2ReductionTons, 1)} t`,
    },
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Comparison chart</h3>
        <span className="text-xs text-muted-foreground">
          (normalized to the better of the two scenarios — taller bar = better)
        </span>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              domain={[0, 100]}
              unit="%"
            />
            <RTooltip
              content={<ChartTooltip />}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(v) =>
                v === "Current" ? "Current setup" : "My scenario"
              }
            />
            <Bar
              dataKey="Current"
              fill="var(--chart-3)"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
            <Bar
              dataKey="Mine"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: "var(--chart-3)" }}
        />
        <span className="text-muted-foreground">Current setup:</span>
        <span className="font-semibold">{row.currentValue}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: "var(--primary)" }}
        />
        <span className="text-muted-foreground">My scenario:</span>
        <span className="font-semibold">{row.mineValue}</span>
      </div>
    </div>
  );
}
