'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LandForm, type FormValues } from '@/components/solar/land-form';
import { ResultsDashboard } from '@/components/solar/results-dashboard';
import { MlLab } from '@/components/solar/ml-lab';
import { HistoryPanel } from '@/components/solar/history-panel';
import { Sun, Wheat, Sparkles, AlertTriangle } from 'lucide-react';
import type { AnalysisResponse } from '@/lib/types';

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const handleAnalyze = async (form: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerName: form.farmerName,
          landAreaAcres: Number(form.landAreaAcres),
          state: form.state,
          district: form.district,
          landType: form.landType,
          agriIncomeYearly: Number(form.agriIncomeYearly),
          solarRentYearly: Number(form.solarRentYearly),
          contractYears: Number(form.contractYears),
          escalationPercent: Number(form.escalationPercent || 0),
          solarGeneration: form.solarGeneration ? Number(form.solarGeneration) : null,
        }),
      });
      const json = (await res.json()) as AnalysisResponse;
      if (!json.ok) throw new Error(json.error || 'Analysis failed');
      setAnalysis(json);
      setHistoryKey((k) => k + 1);
      // scroll to results on mobile
      setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Sun className="h-6 w-6 text-amber-300" />
                <Wheat className="h-4 w-4 text-green-100 absolute bottom-1.5 right-1.5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">SolarLand AI</h1>
                <p className="text-xs sm:text-sm text-green-100">
                  AI-Based Solar Land &amp; Farmer Revenue Planning System · ज़मीन का सही उपयोग, समझदार फ़ैसला
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">Groq LLM Ready</span>
              <span className="rounded-full bg-white/15 px-3 py-1">4 ML Models</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <section className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              { icon: Sun, title: 'Solar Energy Prediction', desc: 'Capacity, CUF & generation estimate from your region\u2019s irradiance profile' },
              { icon: Wheat, title: 'Agriculture Income Prediction', desc: 'Climate-adjusted 10-year farm income projection with optimistic & pessimistic bands' },
              { icon: Sparkles, title: 'AI Neutral Comparison', desc: '10-year forecast, NPV, scenario sensitivity, contract risk & personalized report' },
            ].map((f) => (
              <div key={f.title} className="flex gap-3 items-start">
                <f.icon className="h-5 w-5 text-green-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="analyze" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="analyze" className="text-sm">Analyze Land</TabsTrigger>
            <TabsTrigger value="research" className="text-sm">ML Research Lab</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
          </TabsList>

          {/* Analyze tab */}
          <TabsContent value="analyze" className="space-y-6 mt-4">
            <LandForm onSubmit={handleAnalyze} loading={loading} />

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {loading && (
              <div className="rounded-xl border border-green-100 bg-white p-8 text-center space-y-3">
                <div className="mx-auto h-10 w-10 rounded-full border-4 border-green-200 border-t-green-700 animate-spin" />
                <p className="text-sm font-medium">Running AI analysis...</p>
                <p className="text-xs text-muted-foreground">Solar prediction · farm income model · 10-year forecast · risk engine · AI report</p>
              </div>
            )}

            <div id="results-section">
              {analysis && !loading && <ResultsDashboard data={analysis} />}
            </div>
          </TabsContent>

          {/* Research tab */}
          <TabsContent value="research" className="mt-4">
            <MlLab />
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="mt-4">
            <HistoryPanel refreshKey={historyKey} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer — sticky bottom via mt-auto */}
      <footer className="mt-auto bg-green-900 text-green-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>SolarLand AI — neutral financial &amp; technical comparison for farmers. Not financial or legal advice.</p>
          {/* <p>MERN-style stack: Next.js (React + Node) · Prisma DB · Groq LLM · Custom ML engine</p> */}
        </div>
      </footer>
    </div>
  );
}
