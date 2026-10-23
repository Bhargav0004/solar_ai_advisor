"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/store/app-store";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Info,
  Home,
  Building2,
  Factory,
  Wand2,
  Sun,
  Zap,
  Gauge,
  RotateCcw,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import { formatCurrency, formatNumber, genId } from "@/lib/solar/helpers";
import type {
  Appliance,
  AssessmentInput,
  AssessmentRecord,
  CalculationResults,
  Orientation,
  PanelType,
  PropertyType,
  RoofType,
  Shading,
} from "@/types/solar";

// ---------------------------------------------------------------------------
// Static config / presets
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;
const STEP_TITLES = ["Basic information", "Roof information", "Solar preferences", "Appliances"];

const PROPERTY_OPTIONS: {
  value: PropertyType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  { value: "residential", label: "Residential", icon: Home, desc: "Home or apartment" },
  { value: "commercial", label: "Commercial", icon: Building2, desc: "Office or shop" },
  { value: "industrial", label: "Industrial", icon: Factory, desc: "Factory or warehouse" },
];

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "sloped", label: "Sloped" },
  { value: "metal", label: "Metal" },
  { value: "concrete", label: "Concrete" },
  { value: "other", label: "Other" },
];

const ORIENTATIONS: Orientation[] = [
  "North",
  "South",
  "East",
  "West",
  "South-East",
  "South-West",
  "Unknown",
];

const SHADINGS: Shading[] = ["None", "Low", "Medium", "High"];

const PANEL_OPTIONS: {
  value: PanelType;
  label: string;
  desc: string;
}[] = [
  { value: "monocrystalline", label: "Monocrystalline", desc: "Highest efficiency, premium" },
  { value: "polycrystalline", label: "Polycrystalline", desc: "Lower cost, slightly less efficient" },
  { value: "no-preference", label: "No preference", desc: "Let SolarAI decide" },
];

const OFFSET_PRESETS = ["50", "75", "100", "custom"];

const APPLIANCE_PRESETS: Record<string, number> = {
  "Air Conditioner": 1500,
  Refrigerator: 200,
  "Washing Machine": 500,
  Television: 120,
  Computer: 200,
  "Water Pump": 750,
  Lights: 60,
  Fans: 75,
  Microwave: 1000,
};

const PRESET_NAMES = Object.keys(APPLIANCE_PRESETS);

interface FormState {
  fullName: string;
  propertyType: PropertyType;
  city: string;
  state: string;
  country: string;
  monthlyBill: string;
  monthlyConsumption: string;
  roofArea: string;
  roofType: RoofType;
  orientation: Orientation;
  shading: Shading;
  sunlightHours: string;
  panelType: PanelType;
  budget: string;
  offsetChoice: string; // "50" | "75" | "100" | "custom"
  customOffset: string;
  appliances: Appliance[];
}

function initialForm(): FormState {
  return {
    fullName: "",
    propertyType: "residential",
    city: "",
    state: "",
    country: "India",
    monthlyBill: "",
    monthlyConsumption: "",
    roofArea: "",
    roofType: "flat",
    orientation: "South",
    shading: "Low",
    sunlightHours: "0",
    panelType: "monocrystalline",
    budget: "",
    offsetChoice: "100",
    customOffset: "80",
    appliances: [],
  };
}

function emptyAppliance(): Appliance {
  return {
    id: genId(),
    name: "",
    quantity: 1,
    wattage: 0,
    hoursPerDay: 0,
    daysPerMonth: 30,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildAssessmentInput(f: FormState): AssessmentInput {
  const offset =
    f.offsetChoice === "custom" ? Math.min(100, Math.max(0, num(f.customOffset))) : Number(f.offsetChoice);
  return {
    fullName: f.fullName.trim(),
    propertyType: f.propertyType,
    city: f.city.trim(),
    state: f.state.trim(),
    country: f.country.trim(),
    monthlyBill: num(f.monthlyBill),
    monthlyConsumption: f.monthlyConsumption.trim() ? num(f.monthlyConsumption) : null,
    roofArea: num(f.roofArea),
    roofType: f.roofType,
    orientation: f.orientation,
    shading: f.shading,
    sunlightHours: num(f.sunlightHours),
    panelType: f.panelType,
    budget: num(f.budget),
    energyOffset: offset,
    appliances: f.appliances
      .filter((a) => a.name.trim().length > 0)
      .map((a) => ({
        id: a.id,
        name: a.name.trim(),
        quantity: Math.max(0, a.quantity),
        wattage: Math.max(0, a.wattage),
        hoursPerDay: Math.min(24, Math.max(0, a.hoursPerDay)),
        daysPerMonth: Math.min(31, Math.max(0, a.daysPerMonth)),
      })),
  };
}

function applianceKWh(a: Appliance): number {
  return (a.wattage * a.quantity * a.hoursPerDay * a.daysPerMonth) / 1000;
}

// ---------------------------------------------------------------------------
// Sub-components (module-level to keep React hooks stable)
// ---------------------------------------------------------------------------

function StepHeader({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {STEP_TITLES.map((title, i) => {
          const idx = i + 1;
          const done = idx < step;
          const active = idx === step;
          return (
            <div key={title} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors " +
                    (active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground")
                  }
                >
                  {done ? "✓" : idx}
                </div>
                <span
                  className={
                    "hidden text-sm font-medium sm:inline " +
                    (active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground")
                  }
                >
                  {title}
                </span>
              </div>
              {idx < TOTAL_STEPS && (
                <div
                  className={
                    "mx-2 h-0.5 flex-1 rounded-full transition-colors " +
                    (done ? "bg-primary/40" : "bg-border")
                  }
                />
              )}
            </div>
          );
        })}
      </div>
      <Progress value={(step / TOTAL_STEPS) * 100} className="mt-4 h-1" />
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
  tooltip,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {children}
      </Label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="More info" className="text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-destructive">{children}</p>;
}

function CurrencyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        {SOLAR_CONFIG.CURRENCY_SYMBOL}
      </span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-7"
      />
    </div>
  );
}

function LivePreviewCard({
  loading,
  results,
  error,
}: {
  loading: boolean;
  results: CalculationResults | null;
  error: string | null;
}) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Live preview</CardTitle>
            <CardDescription className="text-xs">
              Estimated based on what you have entered so far
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating…
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground">{error}</p>
        ) : !results ? (
          <p className="text-xs text-muted-foreground">
            Fill in the basic and roof information to see a live estimate.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewStat
              icon={Sun}
              label="Capacity"
              value={`${formatNumber(results.recommendedCapacityKW, 2)} kW`}
            />
            <PreviewStat
              icon={Zap}
              label="Generation"
              value={`${formatNumber(results.monthlyGenerationKWh, 0)} kWh`}
            />
            <PreviewStat
              icon={Gauge}
              label="Suitability"
              value={`${results.suitabilityScore}/100`}
            />
            <PreviewStat
              icon={Wand2}
              label="Payback"
              value={`${formatNumber(results.paybackYears, 1)} yr`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function PropertyCard({
  option,
  checked,
  onSelect,
}: {
  option: (typeof PROPERTY_OPTIONS)[number];
  checked: boolean;
  onSelect: (v: PropertyType) => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-sm " +
        (checked
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/40")
      }
    >
      <div
        className={
          "grid h-10 w-10 place-items-center rounded-lg " +
          (checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
        }
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{option.label}</div>
        <div className="text-xs text-muted-foreground">{option.desc}</div>
      </div>
    </button>
  );
}

function PanelCard({
  option,
  checked,
  onSelect,
}: {
  option: (typeof PANEL_OPTIONS)[number];
  checked: boolean;
  onSelect: (v: PanelType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={
        "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all hover:shadow-sm " +
        (checked
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/40")
      }
    >
      <div className="text-sm font-semibold">{option.label}</div>
      <div className="text-xs text-muted-foreground">{option.desc}</div>
    </button>
  );
}

function ApplianceRow({
  appliance,
  index,
  onChange,
  onRemove,
}: {
  appliance: Appliance;
  index: number;
  onChange: (a: Appliance) => void;
  onRemove: () => void;
}) {
  const isPreset = PRESET_NAMES.includes(appliance.name);
  const kwh = applianceKWh(appliance);

  function updateName(name: string) {
    if (PRESET_NAMES.includes(name)) {
      onChange({ ...appliance, name, wattage: APPLIANCE_PRESETS[name] });
    } else {
      onChange({ ...appliance, name });
    }
  }

  return (
    <div className="grid grid-cols-12 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="col-span-12 md:col-span-3">
        <Label className="text-[10px] uppercase text-muted-foreground">Appliance</Label>
        <Select
          value={isPreset ? appliance.name : "__custom__"}
          onValueChange={(v) => {
            if (v === "__custom__") {
              onChange({ ...appliance, name: "" });
            } else {
              updateName(v);
            }
          }}
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Select or type" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_NAMES.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
            <SelectItem value="__custom__">+ Custom</SelectItem>
          </SelectContent>
        </Select>
        {!isPreset && (
          <Input
            className="mt-1"
            placeholder="Custom appliance name"
            value={appliance.name}
            onChange={(e) => onChange({ ...appliance, name: e.target.value })}
          />
        )}
      </div>
      <div className="col-span-4 md:col-span-2">
        <Label className="text-[10px] uppercase text-muted-foreground">Qty</Label>
        <Input
          type="number"
          min={0}
          step="1"
          className="mt-1"
          value={appliance.quantity}
          onChange={(e) => onChange({ ...appliance, quantity: num(e.target.value) })}
        />
      </div>
      <div className="col-span-4 md:col-span-2">
        <Label className="text-[10px] uppercase text-muted-foreground">Watts</Label>
        <Input
          type="number"
          min={0}
          step="any"
          className="mt-1"
          value={appliance.wattage}
          onChange={(e) => onChange({ ...appliance, wattage: num(e.target.value) })}
        />
      </div>
      <div className="col-span-4 md:col-span-2">
        <Label className="text-[10px] uppercase text-muted-foreground">Hrs/day</Label>
        <Input
          type="number"
          min={0}
          max={24}
          step="any"
          className="mt-1"
          value={appliance.hoursPerDay}
          onChange={(e) => onChange({ ...appliance, hoursPerDay: num(e.target.value) })}
        />
      </div>
      <div className="col-span-8 md:col-span-2">
        <Label className="text-[10px] uppercase text-muted-foreground">Days/mo</Label>
        <Input
          type="number"
          min={0}
          max={31}
          step="1"
          className="mt-1"
          value={appliance.daysPerMonth}
          onChange={(e) => onChange({ ...appliance, daysPerMonth: num(e.target.value) })}
        />
      </div>
      <div className="col-span-4 md:col-span-1 flex flex-col items-end justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove appliance ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <div className="text-right">
          <div className="text-[10px] uppercase text-muted-foreground">kWh/mo</div>
          <div className="text-sm font-semibold">{formatNumber(kwh, 1)}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function AssessmentView() {
  const { navigate, user } = useApp();
  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm(),
    fullName: user?.name || "",
  }));
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Live preview state
  const [preview, setPreview] = useState<CalculationResults | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSeqRef = useRef(0);

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateAppliance = useCallback((id: string, a: Appliance) => {
    setForm((prev) => ({
      ...prev,
      appliances: prev.appliances.map((x) => (x.id === id ? a : x)),
    }));
  }, []);

  const addAppliance = useCallback(() => {
    setForm((prev) => ({ ...prev, appliances: [...prev.appliances, emptyAppliance()] }));
  }, []);

  const removeAppliance = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, appliances: prev.appliances.filter((x) => x.id !== id) }));
  }, []);

  const applianceTotalKWh = useMemo(
    () => form.appliances.reduce((s, a) => s + applianceKWh(a), 0),
    [form.appliances],
  );

  // -------- Validation per step --------
  const validateStep = useCallback((s: number, f: FormState): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!f.fullName.trim()) e.fullName = "Full name is required.";
      if (!f.city.trim()) e.city = "City is required.";
      if (!f.state.trim()) e.state = "State is required.";
      if (!f.country.trim()) e.country = "Country is required.";
      if (!f.monthlyBill || num(f.monthlyBill) <= 0)
        e.monthlyBill = "Monthly bill must be greater than 0.";
      if (f.monthlyConsumption && num(f.monthlyConsumption) < 0)
        e.monthlyConsumption = "Must be 0 or greater.";
    }
    if (s === 2) {
      if (!f.roofArea || num(f.roofArea) <= 0)
        e.roofArea = "Roof area must be greater than 0.";
    }
    if (s === 3) {
      if (f.budget === "" || num(f.budget) < 0) e.budget = "Budget must be 0 or greater.";
      if (f.offsetChoice === "custom") {
        const co = num(f.customOffset);
        if (!Number.isFinite(co) || co < 0 || co > 100)
          e.customOffset = "Custom offset must be between 0 and 100.";
      }
      const sh = num(f.sunlightHours);
      if (sh < 0 || sh > 12) e.sunlightHours = "Sunlight hours must be between 0 and 12.";
    }
    return e;
  }, []);

  // -------- Live preview effect --------
 useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Only run preview once we have the minimum required data
    const step1Valid = Object.keys(validateStep(1, form)).length === 0;
    const step2Valid = Object.keys(validateStep(2, form)).length === 0;
    const valid = step1Valid && step2Valid;
    // All setState calls happen inside the timeout callback (async) to
    // avoid synchronous setState within the effect body.
    const delay = valid ? 700 : 0;
    debounceRef.current = setTimeout(async () => {
      const seq = ++previewSeqRef.current;
      if (!valid) {
        setPreview(null);
        setPreviewError(null);
        setPreviewLoading(false);
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const input = buildAssessmentInput(form);
        const data = await api.post<{ results: CalculationResults }>(
          "/api/solar/calculate",
          input,
        );
        if (seq !== previewSeqRef.current) return;
        setPreview(data.results);
        setPreviewLoading(false);
      } catch (err) {
        if (seq !== previewSeqRef.current) return;
        setPreviewLoading(false);
        if (err instanceof ApiError) {
          setPreviewError(err.message);
        } else {
          setPreviewError("Unable to compute preview.");
        }
      }
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, validateStep]);

  // -------- Navigation --------
  const goNext = useCallback(() => {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }
    setErrors({});
    if (step < TOTAL_STEPS) setStep(step + 1);
  }, [step, form, validateStep]);

  const goBack = useCallback(() => {
    setErrors({});
    if (step > 1) setStep(step - 1);
  }, [step]);

  const handleReset = useCallback(() => {
    setForm({ ...initialForm(), fullName: user?.name || "" });
    setStep(1);
    setErrors({});
    setPreview(null);
    toast.info("Form reset.");
  }, [user]);

  // -------- Submit --------
  const handleSubmit = useCallback(async () => {
    // Re-validate all steps
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const e = validateStep(s, form);
      if (Object.keys(e).length > 0) {
        setStep(s);
        setErrors(e);
        toast.error(`Please complete step ${s} before submitting.`);
        return;
      }
    }
    setErrors({});
    setSubmitting(true);
    try {
      const input = buildAssessmentInput(form);
      const record = await api.post<AssessmentRecord>("/api/assessment", input);
      toast.success("Assessment complete! Generating your results…");
      navigate("results", record.id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to submit assessment.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [form, validateStep, navigate]);

  const offsetValue =
    form.offsetChoice === "custom" ? num(form.customOffset) : Number(form.offsetChoice);
  const tariff = SOLAR_CONFIG.ELECTRICITY_TARIFF[form.propertyType];

  return (
    <>
      <PageHeader
        title="Solar Assessment"
        description="Answer a few questions to get your personalized solar recommendation."
        action={
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        }
      />
      <PageBody className="mx-auto max-w-4xl">
        <StepHeader step={step} />

        {/* STEP 1 — Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
              <CardDescription>Tell us about the property and your current electricity usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => update({ fullName: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                />
                <ErrorText>{errors.fullName}</ErrorText>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Property type</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PROPERTY_OPTIONS.map((opt) => (
                    <PropertyCard
                      key={opt.value}
                      option={opt}
                      checked={form.propertyType === opt.value}
                      onSelect={(v) => update({ propertyType: v })}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => update({ city: e.target.value })}
                    placeholder="e.g. Jaipur"
                  />
                  <ErrorText>{errors.city}</ErrorText>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="state">State</FieldLabel>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => update({ state: e.target.value })}
                    placeholder="e.g. Rajasthan"
                  />
                  <ErrorText>{errors.state}</ErrorText>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => update({ country: e.target.value })}
                    placeholder="India"
                  />
                  <ErrorText>{errors.country}</ErrorText>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="monthlyBill">Monthly electricity bill</FieldLabel>
                  <CurrencyInput
                    id="monthlyBill"
                    value={form.monthlyBill}
                    onChange={(v) => update({ monthlyBill: v })}
                    placeholder="e.g. 3500"
                  />
                  <ErrorText>{errors.monthlyBill}</ErrorText>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="monthlyConsumption">
                    Monthly consumption (kWh)
                  </FieldLabel>
                  <Input
                    id="monthlyConsumption"
                    type="number"
                    min={0}
                    step="any"
                    value={form.monthlyConsumption}
                    onChange={(e) => update({ monthlyConsumption: e.target.value })}
                    placeholder="Optional"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to estimate from your bill.
                  </p>
                  <ErrorText>{errors.monthlyConsumption}</ErrorText>
                </div>
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm">How consumption is estimated</AlertTitle>
                <AlertDescription className="text-xs">
                  If you enter only the bill, we estimate consumption using the average electricity
                  tariff ({formatCurrency(tariff)}/kWh for {form.propertyType} properties in India).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — Roof Information */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Roof information</CardTitle>
              <CardDescription>
                Details about your roof affect how much solar you can install and how much it will generate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="roofArea">Roof area (sq ft)</FieldLabel>
                <Input
                  id="roofArea"
                  type="number"
                  min={0}
                  step="any"
                  value={form.roofArea}
                  onChange={(e) => update({ roofArea: e.target.value })}
                  placeholder="e.g. 800"
                />
                <ErrorText>{errors.roofArea}</ErrorText>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel>Roof type</FieldLabel>
                  <Select
                    value={form.roofType}
                    onValueChange={(v) => update({ roofType: v as RoofType })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOF_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    tooltip="South-facing roofs receive the most sunlight in the Northern Hemisphere."
                  >
                    Roof orientation
                  </FieldLabel>
                  <Select
                    value={form.orientation}
                    onValueChange={(v) => update({ orientation: v as Orientation })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIENTATIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel tooltip="Shading from trees, buildings, or chimneys reduces solar output.">
                    Shading
                  </FieldLabel>
                  <Select
                    value={form.shading}
                    onValueChange={(v) => update({ shading: v as Shading })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHADINGS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Solar Preferences */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Solar preferences</CardTitle>
              <CardDescription>
                Help us tailor your recommendation to your budget and goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="sunlightHours" tooltip="Peak sun hours are the equivalent hours of full-strength sunlight per day.">
                  Average sunlight hours per day
                </FieldLabel>
                <Input
                  id="sunlightHours"
                  type="number"
                  min={0}
                  max={12}
                  step="0.1"
                  value={form.sunlightHours}
                  onChange={(e) => update({ sunlightHours: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 to auto-fetch from live weather data for your location.
                </p>
                <ErrorText>{errors.sunlightHours}</ErrorText>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Preferred panel type</FieldLabel>
                <RadioGroup
                  value={form.panelType}
                  onValueChange={(v) => update({ panelType: v as PanelType })}
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {PANEL_OPTIONS.map((opt) => (
                    <Label
                      key={opt.value}
                      htmlFor={`panel-${opt.value}`}
                      className={
                        "cursor-pointer rounded-xl border p-4 transition-all " +
                        (form.panelType === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id={`panel-${opt.value}`} value={opt.value} />
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="budget">Available budget</FieldLabel>
                  <CurrencyInput
                    id="budget"
                    value={form.budget}
                    onChange={(v) => update({ budget: v })}
                    placeholder="e.g. 150000"
                  />
                  <ErrorText>{errors.budget}</ErrorText>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Desired energy offset</FieldLabel>
                  <Select
                    value={form.offsetChoice}
                    onValueChange={(v) => update({ offsetChoice: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFSET_PRESETS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o === "custom" ? "Custom" : `${o}%`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.offsetChoice === "custom" && (
                    <div className="mt-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={form.customOffset}
                        onChange={(e) => update({ customOffset: e.target.value })}
                        placeholder="e.g. 80"
                      />
                      <ErrorText>{errors.customOffset}</ErrorText>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Target: <span className="font-medium text-foreground">{offsetValue}%</span> of
                    your consumption covered by solar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Appliances */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Appliances</CardTitle>
                  <CardDescription>
                    Add the major appliances in your property to refine the consumption estimate.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Plug className="h-3 w-3" />
                  {formatNumber(applianceTotalKWh, 1)} kWh/mo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.appliances.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Plug className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">No appliances added yet</p>
                  <p className="text-xs text-muted-foreground">
                    Adding appliances is optional but improves accuracy.
                  </p>
                </div>
              ) : (
                form.appliances.map((a, i) => (
                  <ApplianceRow
                    key={a.id}
                    appliance={a}
                    index={i}
                    onChange={(updated) => updateAppliance(a.id, updated)}
                    onRemove={() => removeAppliance(a.id)}
                  />
                ))
              )}

              <Button type="button" variant="outline" onClick={addAppliance} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Add appliance
              </Button>

              <p className="text-xs text-muted-foreground">
                Appliance data helps refine your consumption estimate. The total above is the
                estimated monthly kWh from your listed appliances.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Live preview */}
        {step >= 1 && step <= 3 && (
          <div className="mt-4">
            <LivePreviewCard loading={previewLoading} results={preview} error={previewError} />
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={goBack} disabled={step === 1} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Step {step} of {TOTAL_STEPS}
            </span>
            {step < TOTAL_STEPS ? (
              <Button onClick={goNext} className="gap-1.5">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {submitting ? "Analyzing…" : "Analyze with AI"}
              </Button>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
