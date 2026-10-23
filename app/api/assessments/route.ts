import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const assessments = await db.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        createdAt: true,
        farmerName: true,
        landAreaAcres: true,
        state: true,
        district: true,
        landType: true,
        agriIncomeYearly: true,
        solarRentYearly: true,
        contractYears: true,
        escalationPercent: true,
        reportSource: true,
      },
    });
    return NextResponse.json({ ok: true, assessments });
  } catch (err) {
    console.error('[api/assessments] error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to load history' }, { status: 500 });
  }
}
