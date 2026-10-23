'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGIONS, LAND_TYPES } from '@/lib/solar/regions';
import { Loader2, Sparkles, ClipboardPaste } from 'lucide-react';

export interface FormValues {
  farmerName: string;
  landAreaAcres: string;
  state: string;
  district: string;
  landType: string;
  agriIncomeYearly: string;
  solarRentYearly: string;
  contractYears: string;
  escalationPercent: string;
  solarGeneration: string;
}

export const DEFAULT_FORM: FormValues = {
  farmerName: '',
  landAreaAcres: '',
  state: '',
  district: '',
  landType: '',
  agriIncomeYearly: '',
  solarRentYearly: '',
  contractYears: '10',
  escalationPercent: '0',
  solarGeneration: '',
};

const SAMPLE: FormValues = {
  farmerName: 'Ramesh Patil',
  landAreaAcres: '5',
  state: 'Rajasthan',
  district: 'Jodhpur',
  landType: 'semi_fertile',
  agriIncomeYearly: '180000',
  solarRentYearly: '300000',
  contractYears: '10',
  escalationPercent: '0',
  solarGeneration: '',
};

interface Props {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

export function LandForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (key: keyof FormValues) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.farmerName.trim()) errs.push('Farmer name is required');
    if (!form.state) errs.push('Please select your state');
    if (!form.landType) errs.push('Please select land type');
    const area = Number(form.landAreaAcres);
    if (!area || area <= 0) errs.push('Land area must be greater than 0');
    if (Number(form.agriIncomeYearly) < 0 || form.agriIncomeYearly === '') errs.push('Enter current agricultural income (0 or more)');
    if (Number(form.solarRentYearly) < 0 || form.solarRentYearly === '') errs.push('Enter offered solar rent (0 or more)');
    const yrs = Number(form.contractYears);
    if (!yrs || yrs < 1 || yrs > 35) errs.push('Contract duration must be 1-35 years');
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length === 0) onSubmit(form);
  };

  const numberField = (label: string, key: keyof FormValues, placeholder: string, hint?: string, optional = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-sm font-medium">
        {label} {!optional && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={key}
        type="number"
        inputMode="decimal"
        min={0}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => set(key)(e.target.value)}
        className="h-10"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Card id="analyze-form" className="shadow-sm border-green-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardPaste className="h-5 w-5 text-green-700" />
          Enter Your Land Details
        </CardTitle>
        <CardDescription>अपनी ज़मीन की जानकारी भरें — AI neutral comparison report बनाएगा</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="farmerName">
                Farmer Name <span className="text-red-500">*</span>
              </Label>
              <Input id="farmerName" placeholder="e.g. Ramesh Patil" value={form.farmerName} onChange={(e) => set('farmerName')(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>
                State <span className="text-red-500">*</span>
              </Label>
              <Select value={form.state} onValueChange={set('state')}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.values(REGIONS).map((r) => (
                    <SelectItem key={r.state} value={r.state}>
                      {r.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {numberField('Land Area (acres)', 'landAreaAcres', 'e.g. 5')}
            <div className="space-y-1.5">
              <Label htmlFor="district" className="text-sm font-medium">
                District <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input id="district" placeholder="e.g. Jodhpur" value={form.district} onChange={(e) => set('district')(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>
                Land Type <span className="text-red-500">*</span>
              </Label>
              <Select value={form.landType} onValueChange={set('landType')}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LAND_TYPES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {numberField('Current Agricultural Income (₹ / year)', 'agriIncomeYearly', 'e.g. 180000', 'Total net income from farming this land')}
            {numberField('Offered Solar Rent (₹ / year)', 'solarRentYearly', 'e.g. 300000', 'Total yearly rent offered by the solar company')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {numberField('Contract Duration (years)', 'contractYears', 'e.g. 10')}
            {numberField('Rent Escalation (% / year)', 'escalationPercent', 'e.g. 3', undefined, true)}
            {numberField('Expected Generation (kWh / year)', 'solarGeneration', 'auto-estimate', 'Leave blank to let AI estimate', true)}
          </div>

          {errors.length > 0 && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errors.map((e) => (
                <p key={e}>• {e}</p>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={loading} className="flex-1 h-11 bg-green-700 hover:bg-green-800 text-white">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Analyze My Land with AI
                </>
              )}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setForm(SAMPLE)}>
              Load Sample Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI historical/environmental data analyze karke neutral financial comparison deta hai — ye system aapko decision nahi deta, aapko decision lene ke liye clarity deta hai.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
