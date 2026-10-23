"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sun, Star, Battery, Zap, Shield, Clock, CheckCircle2, TrendingDown,
  Award, Sparkles, Wallet, ArrowLeft, Info, Tag, Wrench, Monitor,
} from "lucide-react";
import type { AssessmentRecord, PlansRecommendation, ScoredPlan } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/solar/helpers";

export function PlansView() {
  const { currentAssessmentId, navigate } = useApp();
  const [includeBattery, setIncludeBattery] = useState(true);

  const { data: assessmentData, isLoading: assessmentLoading } = useQuery({
    queryKey: ["assessment", currentAssessmentId],
    queryFn: () =>
      api
        .get<{ assessment: AssessmentRecord }>(`/api/assessment/${currentAssessmentId}`)
        .then((d) => d.assessment),
    enabled: !!currentAssessmentId,
  });

  const assessment = assessmentData;

  const { data: plansData, isLoading: plansLoading, error } = useQuery({
    queryKey: ["solar-plans", currentAssessmentId, includeBattery],
    queryFn: () =>
      api.post<{ recommendation: PlansRecommendation }>("/api/solar/plans", {
        assessmentId: currentAssessmentId,
        includeBattery,
      }),
    enabled: !!currentAssessmentId,
  });

  const recommendation = plansData?.recommendation;

  if (!currentAssessmentId) {
    return (
      <>
        <PageHeader title="Solar Company Plans" description="Compare the best solar installation plans for your assessment." />
        <PageBody>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">No assessment selected</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Run a solar assessment first to get matched with the best company plans for your needs.
                </p>
              </div>
              <Button onClick={() => navigate("assessment")} className="gap-2">
                <Sun className="h-4 w-4" /> Start an assessment
              </Button>
            </CardContent>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Solar Company Plans"
        description="Best & cheapest plans matched to your assessment"
        action={
          <Button variant="outline" onClick={() => navigate("results", currentAssessmentId)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-5">
        {assessment && (
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat icon={Zap} label="Capacity" value={`${formatNumber(assessment.calculationResults.recommendedCapacityKW, 1)} kW`} />
              <SummaryStat icon={Wallet} label="Your budget" value={formatCurrency(assessment.budget, { compact: true })} />
              <SummaryStat icon={Sun} label="Monthly gen" value={`${formatNumber(assessment.calculationResults.monthlyGenerationKWh)} kWh`} />
              <SummaryStat icon={Star} label="Suitability" value={`${assessment.calculationResults.suitabilityScore}/100`} />
            </div>
          </Card>
        )}

        <Card className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--solar)]/15">
              <Battery className="h-4 w-4 text-[var(--solar-foreground)]" />
            </div>
            <div>
              <Label htmlFor="battery-toggle" className="text-sm font-medium cursor-pointer">Include battery plans</Label>
              <p className="text-xs text-muted-foreground">Show plans that come with battery storage</p>
            </div>
          </div>
          <Switch id="battery-toggle" checked={includeBattery} onCheckedChange={setIncludeBattery} />
        </Card>

        {(plansLoading || assessmentLoading) && (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not load plans</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {recommendation && recommendation.totalMatches > 0 && (
          <>
            <div>
              <h2 className="mb-1 text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" /> Top Picks For You
              </h2>
              <p className="text-sm text-muted-foreground">Based on your {formatNumber(assessment?.calculationResults.recommendedCapacityKW || 0, 1)} kW system and {formatCurrency(assessment?.budget || 0, { compact: true })} budget</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {recommendation.cheapest && (
                <TopPickCard type="cheapest" scored={recommendation.cheapest} capacity={assessment?.calculationResults.recommendedCapacityKW || 0} />
              )}
              {recommendation.bestValue && recommendation.bestValue !== recommendation.cheapest && (
                <TopPickCard type="bestValue" scored={recommendation.bestValue} capacity={assessment?.calculationResults.recommendedCapacityKW || 0} />
              )}
              {recommendation.bestOverall && recommendation.bestOverall !== recommendation.cheapest && recommendation.bestOverall !== recommendation.bestValue && (
                <TopPickCard type="bestOverall" scored={recommendation.bestOverall} capacity={assessment?.calculationResults.recommendedCapacityKW || 0} />
              )}
            </div>

            <div className="mt-4">
              <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" /> All Matched Plans ({recommendation.totalMatches})
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {recommendation.allPlans.map((sp, i) => (
                  <PlanCard key={sp.plan.id} scored={sp} rank={i + 1} capacity={assessment?.calculationResults.recommendedCapacityKW || 0} />
                ))}
              </div>
            </div>

            <Alert className="mt-4 border-primary/30 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-sm">How we match plans</AlertTitle>
              <AlertDescription className="text-xs">
                Plans are matched by your recommended capacity ({formatNumber(assessment?.calculationResults.recommendedCapacityKW || 0, 1)} kW), budget, panel preference, and location.
                <strong> Cheapest</strong> = lowest total price · <strong>Best Value</strong> = best quality-per-rupee (rating, warranty, efficiency) · <strong>Best Overall</strong> = balanced score of value + budget fit + rating.
                Prices are indicative estimates — request quotes from installers for final pricing.
              </AlertDescription>
            </Alert>
          </>
        )}

        {recommendation && recommendation.totalMatches === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No plans match your capacity</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Try adjusting your assessment — your recommended system size may be outside the range of available plans.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function TopPickCard({ type, scored, capacity }: { type: "cheapest" | "bestValue" | "bestOverall"; scored: ScoredPlan; capacity: number }) {
  const config = {
    cheapest: { label: "Cheapest Plan", icon: TrendingDown, color: "bg-primary/10 text-primary border-primary/30", badge: "Lowest Price" },
    bestValue: { label: "Best Value", icon: Sparkles, color: "bg-[var(--solar)]/15 text-[var(--solar-foreground)] border-[var(--solar)]/30", badge: "Most Value" },
    bestOverall: { label: "Best Overall", icon: Award, color: "bg-chart-3/15 text-foreground border-chart-3/30", badge: "Top Pick" },
  }[type];

  const { plan } = scored;

  return (
    <Card className={`relative overflow-hidden border-2 ${config.color.split(" ").pop()}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.color.split(" ")[0]}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${config.color}`}>
              <config.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">{config.label}</div>
              <div className="text-sm font-bold">{config.badge}</div>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">{plan.tier}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg text-white text-xs font-bold" style={{ backgroundColor: plan.brandColor }}>
            {plan.companyInitials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{plan.company}</div>
            <div className="text-xs text-muted-foreground truncate">{plan.planName}</div>
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold">{formatCurrency(scored.totalPrice, { compact: true })}</span>
          <span className="text-xs text-muted-foreground">total for {formatNumber(capacity, 1)} kW</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[var(--solar)] text-[var(--solar)]" />
            {plan.rating} ({plan.reviewsCount.toLocaleString("en-IN")})
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> {plan.warrantyYears}y warranty
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scored.badges.slice(0, 3).map((b) => (
            <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
          ))}
        </div>
        {scored.emiPerMonth > 0 && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground">EMI from </span>
            <span className="font-semibold">{formatCurrency(scored.emiPerMonth)}/mo</span>
            <span className="text-muted-foreground"> · {plan.emiRatePct}% p.a.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanCard({ scored, rank, capacity }: { scored: ScoredPlan; rank: number; capacity: number }) {
  const { plan } = scored;
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white text-sm font-bold" style={{ backgroundColor: plan.brandColor }}>
              {plan.companyInitials}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{plan.planName}</CardTitle>
              <CardDescription className="truncate">{plan.company}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={rank <= 3 ? "default" : "secondary"} className="text-[10px]">#{rank}</Badge>
            <div className="flex items-center gap-0.5 text-xs">
              <Star className="h-3 w-3 fill-[var(--solar)] text-[var(--solar)]" />
              <span className="font-medium">{plan.rating}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between rounded-lg bg-muted/40 px-3 py-2.5">
          <div>
            <div className="text-xs text-muted-foreground">Total price</div>
            <div className="text-xl font-bold">{formatCurrency(scored.totalPrice)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">₹/kW</div>
            <div className="text-sm font-medium">{formatCurrency(plan.pricePerKW)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {scored.withinBudget ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary font-medium">Within your budget</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive font-medium">{formatCurrency(scored.totalPrice)} — over budget</span>
            </>
          )}
          <span className="ml-auto text-muted-foreground">Overall: <span className="font-semibold text-foreground">{scored.overallScore}/100</span></span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SpecRow icon={Sun} label="Panels" value={`${plan.panelWattage}W ${plan.panelType.slice(0, 4)}`} />
          <SpecRow icon={Zap} label="Inverter" value={`${plan.inverterType} (${plan.inverterBrand.split(" ")[0]})`} />
          <SpecRow icon={Shield} label="Warranty" value={`${plan.warrantyYears}y (${plan.performanceWarrantyYears}y perf)`} />
          <SpecRow icon={Clock} label="Install time" value={`${plan.installationDays} days`} />
          {plan.batteryIncluded && <SpecRow icon={Battery} label="Battery" value={`${plan.batteryCapacityKWh} kWh`} />}
          <SpecRow icon={Monitor} label="Monitoring" value={`${plan.freeMonitoringYears}y free`} />
          <SpecRow icon={Wrench} label="Maintenance" value={`${plan.freeMaintenanceYears}y free`} />
          <SpecRow icon={Tag} label="Efficiency" value={`${plan.panelEfficiencyPct}%`} />
        </div>
        {scored.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {scored.badges.map((b) => <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>)}
          </div>
        )}
        {scored.emiPerMonth > 0 && (
          <div className="text-xs text-muted-foreground">EMI from <span className="font-semibold text-foreground">{formatCurrency(scored.emiPerMonth)}/month</span> for 5 years @ {plan.emiRatePct}% p.a.</div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs" onClick={() => setExpanded((v) => !v)}>
          <span>{expanded ? "Hide" : "Show"} features ({plan.features.length})</span>
          <Info className="h-3.5 w-3.5" />
        </Button>
        {expanded && (
          <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
        <Separator />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5"><Tag className="h-3.5 w-3.5" /> Request Quote</Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Compare</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SpecRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1.5">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-xs font-medium truncate">{value}</div>
      </div>
    </div>
  );
}