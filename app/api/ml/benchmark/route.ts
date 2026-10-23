import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runBenchmark } from '@/lib/ml/train';

export const maxDuration = 120;

export async function GET() {
  try {
    const latest = await db.modelBenchmark.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!latest) return NextResponse.json({ ok: true, benchmark: null });
    const notes = JSON.parse(latest.notes || '{}');
    return NextResponse.json({
      ok: true,
      benchmark: {
        task: latest.task,
        datasetSize: latest.datasetSize,
        trainSize: latest.trainSize,
        testSize: latest.testSize,
        results: JSON.parse(latest.results),
        bestModel: latest.bestModel,
        featureImportance: notes.featureImportance ?? [],
        predictedVsActual: notes.predictedVsActual ?? [],
        lstmLossCurve: notes.lstmLossCurve ?? [],
        totalMs: notes.totalMs ?? 0,
        createdAt: latest.createdAt,
      },
    });
  } catch (err) {
    console.error('[api/ml/benchmark GET] error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to load benchmark' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const bench = runBenchmark();

    await db.modelBenchmark.create({
      data: {
        task: bench.task,
        datasetSize: bench.datasetSize,
        trainSize: bench.trainSize,
        testSize: bench.testSize,
        results: JSON.stringify(bench.results),
        bestModel: bench.bestModel,
        notes: JSON.stringify({
          featureImportance: bench.featureImportance,
          predictedVsActual: bench.predictedVsActual,
          lstmLossCurve: bench.lstmLossCurve,
          totalMs: bench.totalMs,
        }),
      },
    });

    return NextResponse.json({ ok: true, benchmark: bench });
  } catch (err) {
    console.error('[api/ml/benchmark] error:', err);
    return NextResponse.json({ ok: false, error: 'Benchmark training failed' }, { status: 500 });
  }
}
