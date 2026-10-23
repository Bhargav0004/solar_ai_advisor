"use client";

import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  TrendingUp,
  Wallet,
  LogOut,
  Sun,
  Info,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { AssessmentRecord } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/solar/helpers";

type HistoryItem = Pick<
  AssessmentRecord,
  "id" | "propertyType" | "city" | "state" | "suitabilityScore" | "recommendedCapacity" | "estimatedAnnualSavings" | "createdAt"
>;

function getInitials(name?: string) {
  return (name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileView() {
  const { user, logout, navigate } = useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment-history"],
    queryFn: () => api.get<{ assessments: HistoryItem[] }>("/api/assessment/history"),
  });

  const items = data?.assessments ?? [];
  const total = items.length;
  const avgScore = total > 0 ? Math.round(items.reduce((s, a) => s + (a.suitabilityScore || 0), 0) / total) : 0;
  const totalSavings = items.reduce((s, a) => s + (a.estimatedAnnualSavings || 0), 0);

  return (
    <>
      <PageHeader title="Profile & Settings" description="Manage your account and preferences." />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Your SolarAI account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-lg font-semibold">{user?.name}</span>
                    {user?.role === "admin" ? (
                      <Badge className="gap-1 bg-[var(--solar)] text-[var(--solar-foreground)]">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserIcon className="h-3 w-3" /> User
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> <span className="truncate">{user?.email}</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">User ID</div>
                  <div className="mt-0.5 truncate font-mono text-xs">{user?.id}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Member since</div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-medium">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    {user?.createdAt ? format(new Date(user.createdAt), "d MMM yyyy") : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your activity</CardTitle>
              <CardDescription>Aggregated across all your assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile icon={ClipboardList} label="Assessments" value={formatNumber(total)} />
                  <StatTile icon={TrendingUp} label="Avg suitability" value={total > 0 ? `${avgScore}/100` : "—"} />
                  <StatTile icon={Wallet} label="Annual savings" value={total > 0 ? formatCurrency(totalSavings, { compact: true }) : "—"} />
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Estimated annual savings is the sum of projected yearly savings across all your assessments.
              </p>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>Default settings used by SolarAI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Currency</div>
                    <div className="text-xs text-muted-foreground">Indian Rupee (₹)</div>
                  </div>
                </div>
                <Badge variant="outline">Locked</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Tariffs &amp; costs</div>
                    <div className="text-xs text-muted-foreground">India benchmarks (MNRE-aligned)</div>
                  </div>
                </div>
                <Badge variant="outline">Locked</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                SolarAI uses India-specific solar tariffs, installation cost bands and grid emission factors. These assumptions power every calculation and cannot be changed per user.
              </p>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About SolarAI</CardTitle>
              <CardDescription>What this app does — and what it doesn&apos;t</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  SolarAI combines a deterministic solar calculation engine with fresh weather data and AI-generated recommendations to estimate the solar potential of any property.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--solar-foreground)]" />
                <span>
                  <strong className="text-foreground">Disclaimer:</strong> Estimates are informational only and depend on assumptions like tariff rates, weather conditions and roof geometry. Always verify with a qualified solar professional before making investment decisions.
                </span>
              </div>
              <Separator />
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => navigate("history")}>
                <ClipboardList className="h-3.5 w-3.5" /> View assessment history
              </Button>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="lg:col-span-2 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <LogOut className="h-4 w-4" /> Danger zone
              </CardTitle>
              <CardDescription>Sign out of your SolarAI account on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">Sign out</div>
                  <div className="text-xs text-muted-foreground">
                    You can sign back in any time with your email and password.
                  </div>
                </div>
                <Button variant="destructive" className="gap-1.5" onClick={() => logout()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

/* ---------------- sub components ---------------- */

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
