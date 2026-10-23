"use client";

import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, ClipboardList, Bot, SlidersHorizontal, ArrowRight, TrendingUp, Zap, Leaf, Plus, Clock, Tag } from "lucide-react";
import type { AssessmentRecord } from "@/types/solar";
import { formatCurrency } from "@/lib/solar/helpers";

export function OverviewView() {
  const { user, navigate, currentAssessmentId } = useApp();
  const { data: history, isLoading } = useQuery({
    queryKey: ["assessment-history"],
    queryFn: () => api.get<{ assessments: Partial<AssessmentRecord>[] }>("/api/assessment/history"),
  });

  const recent = (history?.assessments || []).slice(0, 3);
  const totalAssessments = history?.assessments?.length || 0;
  const avgScore =
    history?.assessments && history.assessments.length > 0
      ? Math.round(history.assessments.reduce((s, a) => s + (a.suitabilityScore || 0), 0) / history.assessments.length)
      : 0;
  const avgCapacity =
    history?.assessments && history.assessments.length > 0
      ? (history.assessments.reduce((s, a) => s + (a.recommendedCapacity || 0), 0) / history.assessments.length).toFixed(1)
      : "0";

  const quickActions = [
    { label: "New Assessment", desc: "Analyze a new property", icon: ClipboardList, view: "assessment" as const, color: "bg-primary/10 text-primary" },
    { label: "AI Advisor", desc: "Ask your energy questions", icon: Bot, view: "advisor" as const, color: "bg-[var(--solar)]/15 text-[var(--solar-foreground)]", disabled: !currentAssessmentId },
    { label: "Solar Plans", desc: "Compare company plans", icon: Tag, view: "plans" as const, color: "bg-chart-5/15 text-foreground", disabled: !currentAssessmentId },   // ← ADD THIS LINE
    { label: "What-If Simulator", desc: "Compare solar scenarios", icon: SlidersHorizontal, view: "simulator" as const, color: "bg-chart-3/15 text-foreground", disabled: !currentAssessmentId },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || "there"} 👋`}
        description="Your solar energy command center"
        action={
          <Button onClick={() => navigate("assessment")} className="gap-2">
            <Plus className="h-4 w-4" /> New assessment
          </Button>
        }
      />
      <PageBody>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={ClipboardList} label="Total assessments" value={String(totalAssessments)} loading={isLoading} />
          <StatCard icon={TrendingUp} label="Avg suitability score" value={`${avgScore}/100`} loading={isLoading} />
          <StatCard icon={Zap} label="Avg system size" value={`${avgCapacity} kW`} loading={isLoading} />
        </div>

        {/* Quick actions */}
        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((a) => (
            <Card
              key={a.label}
              className={`cursor-pointer p-5 transition-all hover:shadow-md ${a.disabled ? "opacity-50" : "hover:-translate-y-0.5"}`}
              onClick={() => !a.disabled && navigate(a.view)}
            >
              <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${a.color}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{a.label}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{a.desc}</div>
              {a.disabled && <div className="mt-2 text-xs text-muted-foreground">Run an assessment first</div>}
            </Card>
          ))}
        </div>

        {/* Recent assessments */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent assessments</h2>
          {totalAssessments > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate("history")} className="gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : recent.length === 0 ? (
          <Card className="mt-3 border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                <Sun className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">No assessments yet</p>
                <p className="text-sm text-muted-foreground">Run your first solar assessment to see results here.</p>
              </div>
              <Button onClick={() => navigate("assessment")} className="gap-2">
                <Plus className="h-4 w-4" /> Start assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((a) => (
              <Card key={a.id} className="cursor-pointer p-4 transition-shadow hover:shadow-md" onClick={() => navigate("results", a.id!)}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium capitalize">{a.propertyType}</div>
                    <div className="truncate text-sm text-muted-foreground">{a.city}, {a.state}</div>
                  </div>
                  <ScoreBadge score={a.suitabilityScore || 0} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {a.recommendedCapacity} kW</span>
                  <span className="flex items-center gap-1"><Leaf className="h-3.5 w-3.5" /> {formatCurrency(a.estimatedAnnualSavings || 0, { compact: true })}/yr</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(a.createdAt as any).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

function StatCard({ icon: Icon, label, value, loading }: { icon: any; label: string; value: string; loading?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{loading ? "—" : value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-primary/10 text-primary" : score >= 50 ? "bg-[var(--solar)]/15 text-[var(--solar-foreground)]" : "bg-destructive/10 text-destructive";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{score}/100</span>;
}
