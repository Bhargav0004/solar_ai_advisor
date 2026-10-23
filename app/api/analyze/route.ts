import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runAnalysis, type LandInput } from '@/lib/solar/engine';
import { generateFarmerReport } from '@/lib/llm';

export const maxDuration = 60;

interface AnalyzeBody {
  farmerName?: string;
  landAreaAcres?: number;
  state?: string;
  district?: string;
  landType?: string;
  agriIncomeYearly?: number;
  solarRentYearly?: number;
  contractYears?: number;
  solarGeneration?: number | null;
  escalationPercent?: number;
  save?: boolean;
}

function validate(body: AnalyzeBody): { errors: string[]; input: LandInput } {
  const errors: string[] = [];
  const farmerName = (body.farmerName ?? '').trim();
  const landAreaAcres = Number(body.landAreaAcres);
  const agriIncomeYearly = Number(body.agriIncomeYearly);
  const solarRentYearly = Number(body.solarRentYearly);
  const contractYears = Number(body.contractYears);
  const escalationPercent = Number(body.escalationPercent ?? 0);
  const state = body.state ?? '';
  const landType = body.landType ?? '';

  if (!farmerName) errors.push('Farmer name is required');
  if (!state) errors.push('State is required');
  if (!landType) errors.push('Land type is required');
  if (!Number.isFinite(landAreaAcres) || landAreaAcres <= 0 || landAreaAcres > 1000) errors.push('Land area must be between 0 and 1000 acres');
  if (!Number.isFinite(agriIncomeYearly) || agriIncomeYearly < 0) errors.push('Agricultural income must be 0 or more');
  if (!Number.isFinite(solarRentYearly) || solarRentYearly < 0) errors.push('Solar rent must be 0 or more');
  if (!Number.isFinite(contractYears) || contractYears < 1 || contractYears > 35) errors.push('Contract duration must be 1-35 years');
  if (!Number.isFinite(escalationPercent) || escalationPercent < 0 || escalationPercent > 15) errors.push('Escalation must be 0-15%');

  return {
    errors,
    input: {
      farmerName,
      landAreaAcres,
      state,
      district: body.district?.trim() || undefined,
      landType,
      agriIncomeYearly,
      solarRentYearly,
      contractYears: Math.round(contractYears),
      solarGeneration: body.solarGeneration ? Number(body.solarGeneration) : null,
      escalationPercent,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    const { errors, input } = validate(body);
    if (errors.length) {
      return NextResponse.json({ ok: false, error: errors.join('; ') }, { status: 400 });
    }

    // 1) Deterministic analysis engine
    const engineResult = runAnalysis(input);

    // 2) AI personalized report (Groq -> z-ai sdk -> template)
    const { report, source } = await generateFarmerReport(input, engineResult);

    // 3) Persist (optional flag so users can preview without saving)
    let id: string | null = null;
    if (body.save !== false) {
      const saved = await db.assessment.create({
        data: {
          farmerName: input.farmerName,
          landAreaAcres: input.landAreaAcres,
          state: input.state,
          district: input.district ?? null,
          landType: input.landType,
          agriIncomeYearly: input.agriIncomeYearly,
          solarRentYearly: input.solarRentYearly,
          contractYears: input.contractYears,
          solarGeneration: input.solarGeneration ?? null,
          escalationPercent: input.escalationPercent ?? 0,
          solarEnergy: JSON.stringify(engineResult.solarEnergy),
          agriPrediction: JSON.stringify(engineResult.agriPrediction),
          forecast: JSON.stringify(engineResult.forecast),
          riskAnalysis: JSON.stringify(engineResult.riskAnalysis),
          suitability: JSON.stringify(engineResult.suitability),
          aiReport: report,
          reportSource: source,
        },
      });
      id = saved.id;
    }

    return NextResponse.json({
      ok: true,
      id,
      reportSource: source,
      input,
      region: { state: engineResult.region.state, ghi: engineResult.region.ghi, cuf: engineResult.region.cuf, rainfallMm: engineResult.region.rainfallMm },
      solarEnergy: engineResult.solarEnergy,
      agriPrediction: engineResult.agriPrediction,
      forecast: engineResult.forecast,
      riskAnalysis: engineResult.riskAnalysis,
      suitability: engineResult.suitability,
      aiReport: report,
    });
  } catch (err) {
    console.error('[api/analyze] error:', err);
    return NextResponse.json({ ok: false, error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
