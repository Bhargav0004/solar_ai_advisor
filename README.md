# SolarLand AI — Solar Land & Farmer Revenue Planning System

AI-based predictive system for **agricultural land-to-solar conversion and long-term revenue analysis**.
Farmers enter their land details and a solar lease offer; the system builds a **neutral** financial &
technical comparison — solar energy prediction, 10-year revenue forecast, contract risk analysis, land
suitability, and a personalized AI report. It **never decides for the farmer** — the final decision is
always the farmer's own.

---

## ✨ Features

| Module | What it does |
|---|---|
| ☀️ Solar energy prediction | Capacity estimate (~250 kWp/acre), state-wise GHI/CUF, yearly generation series with degradation |
| 🌾 Agricultural income prediction | Climate-adjusted growth model with optimistic/expected/pessimistic bands |
| 💰 Solar vs Agriculture comparison | Year-by-year cumulative revenue, NPV @ 8% discount, break-even year |
| 📈 10-year forecast | 6 scenarios (rent escalation × farm growth) with sensitivity table |
| ⚠️ Contract risk analysis | 6 weighted risk factors (lock-in, escalation, counterparty, restoration, policy, opportunity cost) → 0–100 score |
| 🗺️ Land suitability | 4-factor weighted score (insolation, land type, area, rent fairness) |
| 📊 Personalized AI report | Neutral markdown report via **Groq API** (Llama 3.3 70B), with layered fallbacks |
| 🧪 ML Research Lab | From-scratch implementations of **Linear Regression, Random Forest, Gradient Boosting (XGBoost-style), LSTM** with MAE / RMSE / R² benchmark on a generated 720-record dataset |
| 🗂 History | All assessments saved to database (Prisma + SQLite), reloadable any time |

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Charts**: Recharts
- **Database**: Prisma ORM + SQLite (file-based, zero setup)
- **AI**: Groq API (`llama-3.3-70b-versatile`) — optional, falls back to deterministic engine report if no key
- **ML**: Custom TypeScript implementations (no Python needed) — Ridge/OLS regression, CART + Random Forest, Gradient Boosting, real LSTM with manual BPTT + Adam

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** (or Bun 1.0+)
- A free **Groq API key** (optional but recommended) → https://console.groq.com

### 1. Install dependencies

```bash
npm install
# or: bun install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./db/custom.db"

# Optional — enables live Groq LLM reports (falls back to engine report without it)
GROQ_API_KEY="gsk_your_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"
```

### 3. Create the database

```bash
npm run db:push
# or: npx prisma db push --accept-data-loss
```

This creates the SQLite database with `Assessment` and `ModelBenchmark` tables.

### 4. Run the app

```bash
npm run dev
```

Open **http://localhost:3000** — you'll see the SolarLand AI app with 4 tabs:
1. **Analyze Land** — enter land details (or click "Load sample data")
2. **Results Dashboard** — KPIs, forecast charts, scenarios, risk, suitability, AI report
3. **ML Research Lab** — run the 4-model benchmark (MAE / RMSE / R²)
4. **History** — reload past assessments

### Production build

```bash
npm run build
npm start
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Run full analysis: solar engine + agri prediction + forecast + risk + suitability + LLM report. Saves to DB |
| `GET` | `/api/assessments` | List saved assessments (history) |
| `POST` | `/api/ml/benchmark` | Train & benchmark LR / RF / GBM / LSTM on the generated dataset |
| `GET` | `/api/ml/benchmark` | Get latest saved benchmark run |
| `GET` | `/api` | Health check |

### Example request

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "farmerName": "Ramesh",
    "landAreaAcres": 5,
    "state": "Rajasthan",
    "district": "Jodhpur",
    "landType": "barren",
    "agriIncomeYearly": 150000,
    "solarRentYearly": 200000,
    "contractYears": 10,
    "escalationPercent": 5
  }'
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Main single-page app (4 tabs)
│   ├── layout.tsx                   # Root layout + metadata
│   └── api/
│       ├── analyze/route.ts         # POST — full analysis pipeline
│       ├── assessments/route.ts     # GET  — history
│       └── ml/benchmark/route.ts    # POST/GET — ML benchmark
├── components/solar/
│   ├── land-form.tsx                # Farmer input form + validation
│   ├── results-dashboard.tsx        # KPI cards, charts, scenarios, risk, suitability
│   ├── ml-lab.tsx                   # ML research lab UI + 4 charts
│   └── history-panel.tsx            # Saved assessments
├── lib/
│   ├── solar/
│   │   ├── engine.ts                # ☀️ Core analysis engine (energy, income, forecast, NPV, risk, suitability)
│   │   └── regions.ts               # 21 Indian states: GHI, CUF, rainfall, volatility, crops
│   ├── ml/
│   │   ├── dataset.ts               # Seeded synthetic dataset generator (720 records, 7 features)
│   │   ├── models.ts                # Linear Regression, Random Forest, Gradient Boosting
│   │   ├── lstm.ts                  # Real LSTM (hidden state, manual BPTT + Adam)
│   │   └── train.ts                 # Benchmark orchestrator (identical train/test split, no leakage)
│   ├── llm.ts                       # Groq API → z-ai-sdk → engine fallback (neutral system prompt)
│   ├── db.ts                        # Prisma client singleton
│   └── types.ts                     # Shared TypeScript types
prisma/schema.prisma                 # Assessment + ModelBenchmark models
scripts/test-engine.ts               # Engine sanity test script
```

---

## 🧠 How the AI layer works (honest data policy)

1. **Deterministic engine first** — all financial/energy numbers come from transparent, explainable
   formulas (capacity × CUF, growth-adjusted income, NPV, weighted risk scoring). No black box.
2. **Groq LLM writes the narrative** — the engine's computed numbers are sent to Groq
   (`llama-3.3-70b-versatile`) with a **strict neutral system prompt**: it must present both sides
   equally and never tell the farmer whether to convert the land.
3. **Layered fallbacks** — if no `GROQ_API_KEY` is set (or the API fails), a deterministic template
   report is generated instead, so the app always works offline.
4. **LLM knowledge is never used for market rates** — current figures come only from farmer inputs.

---

## ⚖️ Neutrality disclaimer

This system provides **financial and technical comparisons for educational purposes only**.
It does **not** recommend converting or not converting agricultural land, and it is not legal,
financial, or agricultural advice. Farmers should consult experts and verify all contract terms
before signing. The final decision always rests with the farmer.

---

## 📜 License

MIT — free to use, modify and build upon.
