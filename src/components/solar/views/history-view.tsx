"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/store/app-store";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Trash2,
  RefreshCw,
  Eye,
  GitCompare,
  Plus,
  Sun,
  MapPin,
  Zap,
  TrendingUp,
  Leaf,
  Clock,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import type { AssessmentRecord } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/solar/helpers";

type HistoryItem = Pick<
  AssessmentRecord,
  | "id"
  | "propertyType"
  | "city"
  | "state"
  | "country"
  | "suitabilityScore"
  | "recommendedCapacity"
  | "estimatedAnnualSavings"
  | "createdAt"
>;

const COMPARE_MAX = 2;

export function HistoryView() {
  const { navigate } = useApp();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["assessment-history"],
    queryFn: () => api.get<{ assessments: HistoryItem[] }>("/api/assessment/history"),
  });

  const assessments = data?.assessments ?? [];

  const recalculateMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ assessment: AssessmentRecord }>(`/api/assessment/${id}/recalculate`),
    onSuccess: () => {
      toast.success("Assessment recalculated with fresh weather data.");
      void queryClient.invalidateQueries({ queryKey: ["assessment-history"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Recalculation failed.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/assessment/${id}`),
    onSuccess: () => {
      toast.success("Assessment deleted.");
      setDeleteId(null);
      setSelected((prev) => prev.filter((id) => id !== deleteId));
      void queryClient.invalidateQueries({ queryKey: ["assessment-history"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Delete failed.");
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= COMPARE_MAX) return prev;
      return [...prev, id];
    });
  }

  return (
    <>
      <PageHeader
        title="Assessment History"
        description="View, compare and manage your saved solar assessments."
        action={
          <Button onClick={() => navigate("assessment")} className="gap-2">
            <Plus className="h-4 w-4" /> New assessment
          </Button>
        }
      />
      <PageBody>
        {/* Compare bar */}
        {selected.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <GitCompare className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {selected.length} of {COMPARE_MAX} selected for comparison
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="gap-1">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button
                size="sm"
                disabled={selected.length !== COMPARE_MAX}
                onClick={() => setCompareOpen(true)}
                className="gap-1.5"
              >
                <GitCompare className="h-3.5 w-3.5" />
                {selected.length === COMPARE_MAX ? "Compare now" : `Select ${COMPARE_MAX - selected.length} more`}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <HistorySkeleton />
        ) : isError ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load your assessments.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Try again
              </Button>
            </CardContent>
          </Card>
        ) : assessments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <History className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">No assessments yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Run your first solar assessment to start tracking results here.
                </p>
              </div>
              <Button onClick={() => navigate("assessment")} className="mt-1 gap-2">
                <Plus className="h-4 w-4" /> Start assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 pl-4" />
                    <TableHead className="pl-0">Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Annual savings</TableHead>
                    <TableHead>Suitability</TableHead>
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => {
                    const isSel = selected.includes(a.id);
                    return (
                      <TableRow
                        key={a.id}
                        data-state={isSel ? "selected" : undefined}
                        className="group"
                      >
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggleSelect(a.id)}
                            disabled={!isSel && selected.length >= COMPARE_MAX}
                            aria-label={`Select ${a.propertyType} assessment for comparison`}
                          />
                        </TableCell>
                        <TableCell className="pl-0">
                          <div className="font-medium">{format(new Date(a.createdAt), "d MMM yyyy")}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium capitalize">{a.propertyType}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {a.city}, {a.state}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            {formatNumber(a.recommendedCapacity, 1)} kW
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(a.estimatedAnnualSavings, { compact: true })}
                          <span className="text-xs text-muted-foreground">/yr</span>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={a.suitabilityScore} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate("results", a.id)}
                              title="View results"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={recalculateMutation.isPending}
                              onClick={() => recalculateMutation.mutate(a.id)}
                              title="Recalculate"
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${recalculateMutation.isPending && recalculateMutation.variables === a.id ? "animate-spin" : ""}`}
                              />
                              <span className="sr-only">Recalculate</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteId(a.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {assessments.map((a) => {
                const isSel = selected.includes(a.id);
                return (
                  <Card key={a.id} data-state={isSel ? "selected" : undefined} className={`p-4 ${isSel ? "border-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggleSelect(a.id)}
                            disabled={!isSel && selected.length >= COMPARE_MAX}
                            aria-label="Select for comparison"
                          />
                          <span className="font-semibold capitalize">{a.propertyType}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {a.city}, {a.state}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {format(new Date(a.createdAt), "d MMM yyyy")}
                        </div>
                      </div>
                      <ScoreBadge score={a.suitabilityScore} />
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Capacity</div>
                        <div className="flex items-center gap-1 font-medium">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          {formatNumber(a.recommendedCapacity, 1)} kW
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Annual savings</div>
                        <div className="font-medium">{formatCurrency(a.estimatedAnnualSavings, { compact: true })}/yr</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => navigate("results", a.id)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={recalculateMutation.isPending}
                        onClick={() => recalculateMutation.mutate(a.id)}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${recalculateMutation.isPending && recalculateMutation.variables === a.id ? "animate-spin" : ""}`} />
                        Recalc
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </PageBody>

      {/* Compare dialog */}
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} ids={selected} />

      {/* Delete confirm dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete assessment?</DialogTitle>
            <DialogDescription>
              This permanently removes the assessment and its saved analysis. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="gap-1.5"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- sub components ---------------- */

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "bg-primary/10 text-primary border-primary/20"
      : score >= 50
        ? "bg-[var(--solar)]/15 text-[var(--solar-foreground)] border-[var(--solar)]/30"
        : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <Badge variant="outline" className={`tabular-nums ${cls}`}>
      {score}/100
    </Badge>
  );
}

function HistorySkeleton() {
  return (
    <Card className="hidden md:block">
      <div className="space-y-2 p-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <div className="grid gap-3 p-2 md:hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </Card>
  );
}

type CompareRecord = Pick<
  AssessmentRecord,
  | "id"
  | "propertyType"
  | "city"
  | "state"
  | "createdAt"
  | "recommendedCapacity"
  | "estimatedAnnualSavings"
  | "calculationResults"
>;

function CompareDialog({
  open,
  onOpenChange,
  ids,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ids: string[];
}) {
  const valid = ids.length === 2 && open;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["compare-assessments", ids[0], ids[1]],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        api.get<{ assessment: AssessmentRecord }>(`/api/assessment/${ids[0]}`),
        api.get<{ assessment: AssessmentRecord }>(`/api/assessment/${ids[1]}`),
      ]);
      return { a: a.assessment, b: b.assessment } as { a: CompareRecord; b: CompareRecord };
    },
    enabled: valid,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" /> Side-by-side comparison
          </DialogTitle>
          <DialogDescription>
            Comparing two assessments. The better value in each row is highlighted.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading assessments…
          </div>
        ) : isError || !data ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Couldn&apos;t load assessments for comparison.
          </div>
        ) : (
          <CompareTable a={data.a} b={data.b} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareTable({ a, b }: { a: CompareRecord; b: CompareRecord }) {
  const ra = a.calculationResults;
  const rb = b.calculationResults;

  const rows: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    a: string;
    b: string;
    winner: "a" | "b" | "tie";
  }[] = [
    {
      label: "Recommended capacity",
      icon: Zap,
      a: `${formatNumber(a.recommendedCapacity, 1)} kW`,
      b: `${formatNumber(b.recommendedCapacity, 1)} kW`,
      winner: a.recommendedCapacity === b.recommendedCapacity ? "tie" : a.recommendedCapacity > b.recommendedCapacity ? "a" : "b",
    },
    {
      label: "Annual generation",
      icon: Sun,
      a: `${formatNumber(ra.annualGenerationKWh)} kWh`,
      b: `${formatNumber(rb.annualGenerationKWh)} kWh`,
      winner: ra.annualGenerationKWh === rb.annualGenerationKWh ? "tie" : ra.annualGenerationKWh > rb.annualGenerationKWh ? "a" : "b",
    },
    {
      label: "Annual savings",
      icon: TrendingUp,
      a: formatCurrency(a.estimatedAnnualSavings),
      b: formatCurrency(b.estimatedAnnualSavings),
      winner: a.estimatedAnnualSavings === b.estimatedAnnualSavings ? "tie" : a.estimatedAnnualSavings > b.estimatedAnnualSavings ? "a" : "b",
    },
    {
      label: "Payback period",
      icon: Clock,
      a: `${formatNumber(ra.paybackYears, 1)} yrs`,
      b: `${formatNumber(rb.paybackYears, 1)} yrs`,
      winner: ra.paybackYears === rb.paybackYears ? "tie" : ra.paybackYears < rb.paybackYears ? "a" : "b",
    },
    {
      label: "CO₂ reduction (annual)",
      icon: Leaf,
      a: `${formatNumber(ra.annualCO2ReductionTons, 1)} t`,
      b: `${formatNumber(rb.annualCO2ReductionTons, 1)} t`,
      winner: ra.annualCO2ReductionTons === rb.annualCO2ReductionTons ? "tie" : ra.annualCO2ReductionTons > rb.annualCO2ReductionTons ? "a" : "b",
    },
    {
      label: "Suitability score",
      icon: CheckCircle2,
      a: `${a.calculationResults.suitabilityScore}/100`,
      b: `${b.calculationResults.suitabilityScore}/100`,
      winner:
        a.calculationResults.suitabilityScore === b.calculationResults.suitabilityScore
          ? "tie"
          : a.calculationResults.suitabilityScore > b.calculationResults.suitabilityScore
            ? "a"
            : "b",
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="px-3 py-2">Metric</div>
        <div className="px-3 py-2">
          <div className="truncate font-semibold capitalize text-foreground">{a.propertyType}</div>
          <div className="truncate text-[11px] font-normal normal-case text-muted-foreground">
            {a.city}, {a.state}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="truncate font-semibold capitalize text-foreground">{b.propertyType}</div>
          <div className="truncate text-[11px] font-normal normal-case text-muted-foreground">
            {b.city}, {b.state}
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1.4fr_1fr_1fr] items-center">
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <row.icon className="h-3.5 w-3.5" /> {row.label}
            </div>
            <div
              className={`px-3 py-2.5 text-sm font-medium ${
                row.winner === "a" ? "bg-primary/5 text-primary" : ""
              }`}
            >
              <span className="flex items-center gap-1.5">
                {row.winner === "a" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {row.a}
              </span>
            </div>
            <div
              className={`px-3 py-2.5 text-sm font-medium ${
                row.winner === "b" ? "bg-primary/5 text-primary" : ""
              }`}
            >
              <span className="flex items-center gap-1.5">
                {row.winner === "b" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {row.b}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
