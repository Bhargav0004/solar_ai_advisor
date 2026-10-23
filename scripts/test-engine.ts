// Quick smoke test of the analysis engine + ML benchmark
import { runAnalysis } from '../src/lib/solar/engine';
import { runBenchmark } from '../src/lib/ml/train';

const result = runAnalysis({
  farmerName: 'Test Farmer',
  landAreaAcres: 5,
  state: 'Rajasthan',
  landType: 'semi_fertile',
  agriIncomeYearly: 180000,
  solarRentYearly: 300000,
  contractYears: 10,
  escalationPercent: 0,
});

console.log('=== ENGINE TEST ===');
console.log('Solar capacity:', result.solarEnergy.estimatedCapacityKwp, 'kWp, year-1 gen:', result.solarEnergy.year1GenerationKwh, 'kWh');
console.log('Rent/acre:', result.solarEnergy.rentPerAcre, 'market band:', result.solarEnergy.marketRentMinPerAcre, '-', result.solarEnergy.marketRentMaxPerAcre, 'verdict:', result.solarEnergy.rentVerdict);
console.log('Agri growth:', result.agriPrediction.adjustedGrowth, 'year1:', result.agriPrediction.incomeSeries[0], 'year10:', result.agriPrediction.incomeSeries[9]);
console.log('10y solar:', result.forecast.solarCumulative10y, '10y agri:', result.forecast.agriCumulative10y, 'verdict:', result.forecast.verdict, 'breakeven:', result.forecast.breakevenYear);
console.log('Risk score:', result.riskAnalysis.overallScore, result.riskAnalysis.band, '| Suitability:', result.suitability.score, result.suitability.band);
console.log('Scenarios:', result.forecast.scenarios.map((s) => `${s.name}: ${s.winner}`).join(' | '));

console.log('\n=== ML BENCHMARK TEST ===');
const bench = runBenchmark();
console.log('Dataset:', bench.datasetSize, 'train:', bench.trainSize, 'test:', bench.testSize, 'total ms:', bench.totalMs);
for (const r of bench.results) {
  console.log(`${r.model.padEnd(18)} MAE=${r.mae} RMSE=${r.rmse} R2=${r.r2} (${r.trainMs}ms)`);
}
console.log('Best:', bench.bestModel);
console.log('Top features:', bench.featureImportance.slice(0, 3).map((f) => `${f.feature}=${f.importance}`).join(', '));
console.log('LSTM loss curve:', bench.lstmLossCurve.slice(0, 4).map((p) => p.loss).join(' -> '));
