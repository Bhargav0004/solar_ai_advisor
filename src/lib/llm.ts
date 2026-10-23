// LLM service layer for the personalized farmer report.
// Priority: 1) Groq API (GROQ_API_KEY)  2) z-ai-web-dev-sdk  3) deterministic template.
// The AI is deliberately instructed to stay NEUTRAL — it explains trade-offs,
// it never tells the farmer whether to give the land or not.

import type { EngineResult, LandInput } from '@/lib/solar/engine';
import { getLandType } from '@/lib/solar/regions';

export type ReportSource = 'groq' | 'solarai' | 'engine';

export interface ReportOutput {
  report: string;
  source: ReportSource;
}

const SYSTEM_PROMPT = `You are a neutral agricultural-finance analyst helping Indian farmers understand solar land-lease offers vs continuing agriculture.
STRICT RULES:
- NEVER tell the farmer whether to give the land or not. Never say "you should sign" or "you should reject".
- Present neutral financial and technical comparisons, risks, and the questions the farmer should clarify.
- Use simple language a farmer can understand. You may use a little conversational Hindi-English (Hinglish) phrasing for warmth, but keep numbers and technical terms in English.
- Use markdown with clear sections and a small table where useful.
- Base every number strictly on the JSON data provided. Do not invent numbers.
- End with a short disclaimer that this is an informational estimate, not financial or legal advice, and the decision rests with the farmer and family.
Keep the report under 600 words.`;

function buildUserPrompt(input: LandInput, r: EngineResult): string {
  const lt = getLandType(input.landType);
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const data = {
    farmer: {
      name: input.farmerName,
      land_acres: input.landAreaAcres,
      state: input.state,
      district: input.district || null,
      land_type: lt.label,
      current_agri_income_per_year: input.agriIncomeYearly,
      offered_solar_rent_per_year: input.solarRentYearly,
      rent_escalation_percent_per_year: input.escalationPercent ?? 0,
      contract_years: input.contractYears,
    },
    solar_energy: {
      estimated_capacity_kwp: r.solarEnergy.estimatedCapacityKwp,
      cuf: r.solarEnergy.cuf,
      year1_generation_kwh: r.solarEnergy.year1GenerationKwh,
      rent_per_acre: r.solarEnergy.rentPerAcre,
      market_rent_band_per_acre: [r.solarEnergy.marketRentMinPerAcre, r.solarEnergy.marketRentMaxPerAcre],
      rent_verdict: r.solarEnergy.rentVerdict,
    },
    agriculture: {
      projected_growth_per_year_percent: +(r.agriPrediction.adjustedGrowth * 100).toFixed(2),
      year1_income: r.agriPrediction.incomeSeries[r.agriPrediction.incomeSeries.length - 1 >= 0 ? 0 : 0],
      final_year_income: r.agriPrediction.incomeSeries[r.agriPrediction.incomeSeries.length - 1],
      dominant_crops: r.agriPrediction.dominantCrops,
      climate_risk_note: r.agriPrediction.riskNote,
    },
    comparison: {
      solar_cumulative: r.forecast.solarCumulative10y,
      agri_cumulative: r.forecast.agriCumulative10y,
      difference: r.forecast.difference,
      verdict: r.forecast.verdict,
      breakeven_year: r.forecast.breakevenYear,
      solar_npv: r.forecast.solarNpv,
      agri_npv: r.forecast.agriNpv,
      scenarios: r.forecast.scenarios.map((s) => ({ name: s.name, winner: s.winner, difference: s.difference })),
    },
    risk: {
      overall_score: r.riskAnalysis.overallScore,
      band: r.riskAnalysis.band,
      factors: r.riskAnalysis.factors.map((f) => ({ title: f.title, severity: f.severity, description: f.description })),
    },
    suitability: {
      score: r.suitability.score,
      band: r.suitability.band,
      summary: r.suitability.summary,
    },
  };

  return `Analyze this land assessment for farmer ${input.farmerName} and write the personalized comparison report.

DATA JSON:
${JSON.stringify(data, null, 1)}

Use these numbers (format money in Indian style). Structure:
## Namaste ${input.farmerName} — Land Analysis Snapshot
(one short neutral paragraph)
## Solar vs Farming — 10 Year View
(markdown table: Total income, NPV, yearly stability, effort required)
## Scenario Sensitivity
(2-3 bullets on how different assumptions change the picture, cite scenario winners)
## Key Risks to Understand
(3-4 bullets from risk factors with severity)
## Land Suitability for Solar
(1-2 lines: score ${r.suitability.score}/100, ${r.suitability.band})
## Questions to Ask Before Deciding
(4-5 sharp questions the farmer should ask the developer / himself)
## Reminder
(neutral disclaimer)`;
}

// ---------------------------------------------------------------- Groq

async function generateWithGroq(userPrompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 1400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error('[llm] Groq API error:', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.length > 100 ? content : null;
  } catch (err) {
    console.error('[llm] Groq call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------- z-ai-web-dev-sdk

async function generateWithZai(userPrompt: string): Promise<string | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 1400,
    });
    const content = completion?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.length > 100 ? content : null;
  } catch (err) {
    console.error('[llm] z-ai sdk call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------- Template fallback

export function buildTemplateReport(input: LandInput, r: EngineResult): string {
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const winner =
    r.forecast.verdict === 'solar_higher'
      ? `solar lease income is cumulatively higher by ${inr(Math.abs(r.forecast.difference))}`
      : r.forecast.verdict === 'agriculture_higher'
        ? `continuing agriculture is cumulatively higher by ${inr(Math.abs(r.forecast.difference))}`
        : 'both options are nearly equal (within 5%)';
  const scenarioWinners = r.forecast.scenarios.map((s) => `- **${s.name}**: ${s.winner === 'solar' ? 'solar better' : s.winner === 'agriculture' ? 'agriculture better' : 'nearly equal'} (gap ${inr(Math.abs(s.difference))})`).join('\n');
  const risks = r.riskAnalysis.factors.filter((f) => f.severity !== 'low').map((f) => `- **${f.title}** (${f.severity}): ${f.description}`).join('\n') || '- No high/medium risks flagged; still review contract clauses carefully.';

  return `## Namaste ${input.farmerName} — Land Analysis Snapshot

Your ${input.landAreaAcres} acres in ${input.state}${input.district ? ` (${input.district})` : ''} were analyzed for both options. Over the ${r.forecast.contractYears}-year period, ${winner}. A fixed rent gives stability and zero effort, while farming keeps land control and upside if crop prices or irrigation improve. Neither option is automatically "best" — it depends on your family's income needs and risk comfort.

## Solar vs Farming — 10 Year View

| Metric | Solar Lease | Continue Farming |
|---|---|---|
| Total income (${r.forecast.contractYears} yrs) | ${inr(r.forecast.solarCumulative10y)} | ${inr(r.forecast.agriCumulative10y)} |
| NPV @ ${Math.round(r.forecast.npvDiscountRate * 100)}% | ${inr(r.forecast.solarNpv)} | ${inr(r.forecast.agriNpv)} |
| Yearly stability | Fixed rent${(input.escalationPercent ?? 0) > 0 ? ` +${input.escalationPercent}% escalation` : ' (flat — inflation risk)'} | Varies with weather & prices |
| Effort | None | Full farming effort |

## Scenario Sensitivity
${scenarioWinners}

## Key Risks to Understand
${risks}

## Land Suitability for Solar
Score ${r.suitability.score}/100 (${r.suitability.band}). ${r.suitability.summary}

## Questions to Ask Before Deciding
1. Is there a yearly rent escalation clause, and is it linked to inflation?
2. Who pays for land restoration (decommissioning, topsoil) after the contract ends?
3. What happens to rent if the project is delayed or never commissioned?
4. Can family members continue living/using parts of the land during the lease?
5. If you continue farming, can you handle 2-3 bad climate years financially?

## Reminder
This report is an informational estimate based on regional averages and your inputs — not financial or legal advice. Please discuss with your family, a lawyer before signing any lease, and your local agriculture officer. The final decision is yours.`;
}

// ---------------------------------------------------------------- Public API

export async function generateFarmerReport(input: LandInput, engineResult: EngineResult): Promise<ReportOutput> {
  const userPrompt = buildUserPrompt(input, engineResult);

  const groq = await generateWithGroq(userPrompt);
  if (groq) return { report: groq, source: 'groq' };

  const zai = await generateWithZai(userPrompt);
  if (zai) return { report: zai, source: 'solarai' };

  return { report: buildTemplateReport(input, engineResult), source: 'engine' };
}
