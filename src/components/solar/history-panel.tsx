'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { History, Eye } from 'lucide-react';
import { INR, type AssessmentRow } from '@/lib/types';
import { Button } from '@/components/ui/button';

export function HistoryPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/assessments');
        const json = await res.json();
        if (json.ok) setRows(json.assessments);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-green-700" /> Assessment History
        </CardTitle>
        <CardDescription>Last 25 analyses saved in the database </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading history...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No assessments yet — fill the form in the &quot;Analyze Land&quot; tab to create your first report.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead className="text-right">Area</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Farm Income</TableHead>
                  <TableHead className="text-right">Solar Rent</TableHead>
                  <TableHead className="text-right">Contract</TableHead>
                  <TableHead className="text-center">Report By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell className="text-sm font-medium">{r.farmerName}</TableCell>
                    <TableCell className="text-right text-sm">{r.landAreaAcres} ac</TableCell>
                    <TableCell className="text-sm">
                      {r.state}
                      {r.district ? <span className="text-muted-foreground text-xs"> · {r.district}</span> : null}
                    </TableCell>
                    <TableCell className="text-right text-sm">{INR(r.agriIncomeYearly)}</TableCell>
                    <TableCell className="text-right text-sm">{INR(r.solarRentYearly)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {r.contractYears} yrs
                      {r.escalationPercent > 0 && <span className="text-xs text-muted-foreground"> +{r.escalationPercent}%</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">{r.reportSource}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Small helper dialog for future detail view (kept minimal)
export function HistoryDetailDialog({ row }: { row: AssessmentRow }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.farmerName}&apos;s assessment</DialogTitle>
          <DialogDescription>
            {row.landAreaAcres} acres · {row.state} · {row.contractYears} years · rent {INR(row.solarRentYearly)}/yr
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
