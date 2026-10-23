"use client";

import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
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
  Users,
  ClipboardList,
  Zap,
  TrendingUp,
  Bot,
  CalendarClock,
  ShieldAlert,
  RefreshCw,
  Activity,
  PieChart as PieIcon,
  LineChart as LineIcon,
  BarChart3,
  Sun,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DashboardStats } from "@/types/solar";
import { formatNumber } from "@/lib/solar/helpers";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
};

function capitalize(s: string) {
  return PROPERTY_TYPE_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

export function AdminView() {
  const { user } = useApp();

  const { data, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get<{ stats: DashboardStats }>("/api/dashboard/stats");
      return res.stats;
    },
    retry: false,
  });

  // Guard: page.tsx already restricts, but be defensive.
  if (user && user.role !== "admin") {
    return <AccessDenied />;
  }

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide solar assessment analytics."
        action={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />
      <PageBody>
        {isError ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-medium">Couldn&apos;t load analytics</p>
                <p className="text-sm text-muted-foreground">
                  The admin stats endpoint returned an error. You may not have admin privileges.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard icon={Users} label="Total users" value={isLoading ? null : formatNumber(data?.totalUsers ?? 0)} color="bg-primary/10 text-primary" />
              <KpiCard icon={ClipboardList} label="Total assessments" value={isLoading ? null : formatNumber(data?.totalAssessments ?? 0)} color="bg-[var(--solar)]/15 text-[var(--solar-foreground)]" />
              <KpiCard icon={Zap} label="Avg capacity" value={isLoading ? null : `${formatNumber(data?.averageRecommendedCapacityKW ?? 0, 1)} kW`} color="bg-chart-3/15 text-foreground" />
              <KpiCard icon={TrendingUp} label="Avg suitability" value={isLoading ? null : `${formatNumber(data?.averageSuitabilityScore ?? 0, 1)}/100`} color="bg-primary/10 text-primary" />
              <KpiCard icon={Bot} label="AI conversations" value={isLoading ? null : formatNumber(data?.aiApiCalls ?? 0)} color="bg-chart-4/15 text-foreground" />
              <KpiCard icon={CalendarClock} label="Assessments (30d)" value={isLoading ? null : formatNumber(data?.assessmentsLast30Days ?? 0)} color="bg-chart-5/15 text-foreground" />
            </div>

            {/* Charts */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineIcon className="h-4 w-4 text-primary" /> Assessment activity
                  </CardTitle>
                  <CardDescription>New assessments created per day (last 14 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartFrame height={280} loading={isLoading} empty={(data?.assessmentsByDay?.length ?? 0) === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.assessmentsByDay ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => format(parseISO(d), "d MMM")}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          width={32}
                        />
                        <RTooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--foreground)",
                          }}
                          labelFormatter={(d) => format(parseISO(String(d)), "d MMM yyyy")}
                          formatter={(v: number) => [`${v} assessment${v === 1 ? "" : "s"}`, "Created"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          name="Assessments"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieIcon className="h-4 w-4 text-[var(--solar-foreground)]" /> Property types
                  </CardTitle>
                  <CardDescription>Distribution of assessments by property type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartFrame height={280} loading={isLoading} empty={(data?.propertyTypeBreakdown?.length ?? 0) === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(data?.propertyTypeBreakdown ?? []).map((p) => ({ ...p, label: capitalize(p.type) }))}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="var(--background)"
                          strokeWidth={2}
                        >
                          {(data?.propertyTypeBreakdown ?? []).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--foreground)",
                          }}
                          formatter={(v: number, n: string) => [`${v} assessment${v === 1 ? "" : "s"}`, n]}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" /> Most common locations
                  </CardTitle>
                  <CardDescription>Top 5 cities by number of assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartFrame
                    height={300}
                    loading={isLoading}
                    empty={(data?.mostCommonLocations?.length ?? 0) === 0}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data?.mostCommonLocations ?? []}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="location"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                        />
                        <RTooltip
                          cursor={{ fill: "var(--muted)" }}
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--foreground)",
                          }}
                          formatter={(v: number) => [`${v} assessment${v === 1 ? "" : "s"}`, "Count"]}
                        />
                        <Bar
                          dataKey="count"
                          name="Assessments"
                          radius={[0, 6, 6, 0]}
                        >
                          {(data?.mostCommonLocations ?? []).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

/* ---------------- sub components ---------------- */

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">
        {value === null ? <Skeleton className="h-7 w-16" /> : value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function ChartFrame({
  height,
  loading,
  empty,
  children,
}: {
  height: number;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />;
  }
  if (empty) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground"
        style={{ height }}
      >
        <Activity className="h-6 w-6 opacity-50" />
        <span>No data yet.</span>
      </div>
    );
  }
  return <div style={{ width: "100%", height }}>{children}</div>;
}

function AccessDenied() {
  const { navigate } = useApp();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You need an administrator account to view this page.
        </p>
      </div>
      <Button onClick={() => navigate("overview")} className="gap-1.5">
        <Sun className="h-4 w-4" /> Back to dashboard
      </Button>
    </div>
  );
}
