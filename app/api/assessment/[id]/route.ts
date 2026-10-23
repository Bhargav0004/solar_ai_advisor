/**
 * GET    /api/assessment/[id]  - return full AssessmentRecord (404 if not owned, unless admin)
 * DELETE /api/assessment/[id]  - delete if owned (or admin). 404 otherwise.
 */

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  handleError,
  jsonError,
  jsonOk,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import { mapAssessmentRecord } from "@/lib/solar/mapping";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const { id } = await params;
    const record = await db.assessment.findUnique({ where: { id } });
    if (!record) return jsonError(404, "Assessment not found.");

    if (record.userId !== user.id && user.role !== "admin") {
      // Treat as not-found to avoid leaking existence
      return jsonError(404, "Assessment not found.");
    }

    return jsonOk({ assessment: mapAssessmentRecord(record) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_GENERAL);
    if (rl) return rl;

    const { id } = await params;
    const record = await db.assessment.findUnique({ where: { id } });
    if (!record) return jsonError(404, "Assessment not found.");

    if (record.userId !== user.id && user.role !== "admin") {
      return jsonError(404, "Assessment not found.");
    }

    await db.assessment.delete({ where: { id } });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
