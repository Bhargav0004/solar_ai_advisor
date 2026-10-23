/**
 * GET /api/dashboard/stats  (admin only)
 * Aggregated platform statistics for the admin dashboard.
 */

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  handleError,
  jsonError,
  jsonOk,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import type { DashboardStats } from "@/types/solar";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    // Counts + averages in parallel
    const [
      totalUsers,
      totalAssessments,
      avgCapacityAgg,
      avgSuitabilityAgg,
      aiApiCalls,
      assessmentsLast30,
      recentAssessments,
      allAssessmentsForBreakdown,
    ] = await Promise.all([
      db.user.count(),
      db.assessment.count(),
      db.assessment.aggregate({ _avg: { recommendedCapacity: true } }),
      db.assessment.aggregate({ _avg: { suitabilityScore: true } }),
      db.aIConversation.count(),
      db.assessment.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      // Last 14 days for the by-day chart
      db.assessment.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true, propertyType: true, city: true, state: true },
      }),
      // All assessments for property-type / location breakdowns
      db.assessment.findMany({
        select: { propertyType: true, city: true, state: true },
      }),
    ]);

    // assessmentsByDay: last 14 days, { date, count }
    const byDayMap = new Map<string, number>();
    const today = startOfDay(new Date());
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      byDayMap.set(isoDate(d), 0);
    }
    for (const a of recentAssessments) {
      const key = isoDate(startOfDay(a.createdAt));
      if (byDayMap.has(key)) byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
    }
    const assessmentsByDay = Array.from(byDayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // mostCommonLocations: top 5 by "city, state"
    const locCounts = new Map<string, number>();
    for (const a of allAssessmentsForBreakdown) {
      const key = `${a.city}, ${a.state}`.trim();
      locCounts.set(key, (locCounts.get(key) ?? 0) + 1);
    }
    const mostCommonLocations = Array.from(locCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // propertyTypeBreakdown
    const ptCounts = new Map<string, number>();
    for (const a of allAssessmentsForBreakdown) {
      ptCounts.set(a.propertyType, (ptCounts.get(a.propertyType) ?? 0) + 1);
    }
    const propertyTypeBreakdown = Array.from(ptCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const stats: DashboardStats = {
      totalUsers,
      totalAssessments,
      averageRecommendedCapacityKW:
        avgCapacityAgg._avg.recommendedCapacity != null
          ? Math.round(avgCapacityAgg._avg.recommendedCapacity * 100) / 100
          : 0,
      averageSuitabilityScore:
        avgSuitabilityAgg._avg.suitabilityScore != null
          ? Math.round(avgSuitabilityAgg._avg.suitabilityScore * 100) / 100
          : 0,
      mostCommonLocations,
      assessmentsLast30Days: assessmentsLast30,
      assessmentsByDay,
      aiApiCalls,
      propertyTypeBreakdown,
    };

    return jsonOk({ stats });
  } catch (err) {
    // requireAdmin throws FORBIDDEN → handleError maps to 403
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return jsonError(403, "Admin access required.");
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return jsonError(401, "Please sign in to continue.");
    }
    return handleError(err);
  }
}
