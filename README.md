# ☀️ SolarAI — AI Solar Energy Advisor

A complete, modern, responsive, AI-powered web application that helps homeowners and businesses determine whether installing a solar energy system is suitable for them.

SolarAI combines a **deterministic calculation engine** with **AI-generated analysis** to recommend the right solar system size, estimate savings, payback period, and CO₂ impact — then explains it all in plain language.

> **Architecture principle (critical):** The AI **never** performs critical mathematical calculations. All numbers (capacity, generation, savings, payback, CO₂, suitability score) are computed by a transparent backend engine. The AI only explains and adds qualitative insights based on those pre-computed values.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) |
| Charts | **Recharts** |
| Icons | **Lucide React** |
| Database | **Prisma ORM** + **SQLite** |
| Auth | **JWT** (`jsonwebtoken`) + **bcryptjs** (httpOnly cookies) |
| State | **Zustand** (client) + **TanStack Query** (server) |
| AI | **z-ai-web-dev-sdk** (modular, swappable to Gemini/OpenAI) |
| Weather | **Open-Meteo API** (free, no key required) |
| Animations | **Framer Motion** |

---

## 🔑 APIs Used & Required

### 1. AI API — `z-ai-web-dev-sdk` (default, NO KEY NEEDED)

The app uses the built-in `z-ai-web-dev-sdk` package for all AI features:
- **AI Assessment Analysis** (`POST /api/assessment` → calls `analyzeAssessment()`)
- **AI Energy Advisor Chat** (`POST /api/ai/chat` → calls `chatAboutAssessment()`)

**No API key is required** — the SDK works out of the box in this environment.

#### Want to use Google Gemini instead?

The AI layer is modular (`src/lib/ai/index.ts`). To swap providers:
1. Set `GEMINI_API_KEY` in `.env`
2. Implement the `AIProvider` interface with the Gemini SDK
3. Point `getProvider()` to your new provider

```typescript
interface AIProvider {
  complete(messages: { role: string; content: string }[]): Promise<string>;
}
```

### 2. Weather / Solar Data API — Open-Meteo (FREE, NO KEY NEEDED)

The app uses the **free Open-Meteo API** for:
- **Geocoding** — city → latitude/longitude
- **Solar radiation** — shortwave_radiation_sum → peak sun hours estimate
- **Current weather** — temperature, cloud cover, weather code
- **Sunrise/sunset**

**No API key required.** The app gracefully falls back to deterministic seasonal estimates if the API is unavailable, and clearly flags "Estimated data" in the UI.

**Endpoints used:**
- `https://geocoding-api.open-meteo.com/v1/search`
- `https://api.open-meteo.com/v1/forecast`

### 3. Database — SQLite (NO EXTERNAL SERVICE NEEDED)

Uses a local SQLite file (`db/custom.db`) via Prisma. No MongoDB/MySQL/Redis required.

### Summary: What API keys do you need?

| API | Key Required? | Purpose |
|-----|--------------|---------|
| z-ai-web-dev-sdk | ❌ No | AI analysis & chat (default) |
| Open-Meteo | ❌ No | Weather & solar data |
| SQLite/Prisma | ❌ No | Database (local file) |
| Google Gemini | ⚠️ Optional | Only if you swap the AI provider |
| OpenWeatherMap | ⚠️ Optional | Only if you swap the weather provider |

**👉 You can run the entire app with ZERO external API keys.**

---

## 🚀 Setup & Run Instructions

### Prerequisites
- **Node.js 18+** or **Bun** (recommended)
- npm/pnpm/yarn/bun

### Installation

```bash
# 1. Install dependencies
bun install    # or: npm install

# 2. Copy environment file
cp .env.example .env
# (Edit .env to set a strong JWT_SECRET for production)

# 3. Initialize the database
bun run db:push    # or: npx prisma db push

# 4. (Optional) Seed admin & demo users
bun run scripts/seed-admin.ts
```

### Running the dev server

```bash
bun run dev    # or: npm run dev
```

Open `http://localhost:3000` in your browser.

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@solarai.com` | `admin123` |
| User | `demo@solarai.com` | `demo123` |

---

## 🗂️ Project Structure

```
solarai/
├── prisma/
│   └── schema.prisma              # User, Assessment, AIConversation models
├── scripts/
│   └── seed-admin.ts              # Seed admin & demo users
├── src/
│   ├── app/
│   │   ├── api/                   # REST API routes (Next.js Route Handlers)
│   │   │   ├── auth/              # register, login, logout, me
│   │   │   ├── assessment/        # CRUD + recalculate
│   │   │   ├── solar/             # calculate, simulate
│   │   │   ├── ai/                # analyze, chat
│   │   │   ├── weather/           # weather proxy
│   │   │   └── dashboard/         # admin stats
│   │   ├── globals.css            # Tailwind + theme (green/solar/navy)
│   │   ├── layout.tsx
│   │   └── page.tsx               # SPA router (view-based navigation)
│   ├── components/
│   │   ├── providers/             # React Query + Theme providers
│   │   ├── solar/
│   │   │   ├── landing-view.tsx
│   │   │   ├── auth-view.tsx
│   │   │   ├── dashboard-shell.tsx
│   │   │   └── views/             # All dashboard views
│   │   └── ui/                    # shadcn/ui components
│   ├── lib/
│   │   ├── ai/                    # Modular AI service (z-ai-web-dev-sdk)
│   │   ├── auth/                  # JWT + bcrypt + cookie helpers
│   │   ├── solar/
│   │   │   ├── config.ts          # ⭐ ALL assumptions centralized here
│   │   │   ├── engine.ts          # ⭐ DETERMINISTIC calculation engine
│   │   │   ├── helpers.ts         # Serialization & formatting
│   │   │   ├── mapping.ts         # Prisma ↔ AssessmentRecord mapping
│   │   │   └── validation.ts      # Zod-style input validators
│   │   ├── weather/               # Open-Meteo integration + fallback
│   │   ├── api-client.ts          # Frontend fetch wrapper
│   │   ├── api-response.ts        # Backend JSON helpers + security headers
│   │   ├── rate-limit.ts          # In-memory IP rate limiter
│   │   ├── db.ts                  # Prisma client singleton
│   │   └── utils.ts
│   ├── store/
│   │   └── app-store.ts           # Zustand store (auth + navigation)
│   └── types/
│       └── solar.ts               # All shared TypeScript types
├── .env.example
├── package.json
└── README.md
```

---

## 🔌 REST API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login (sets httpOnly cookie) |
| `POST` | `/api/auth/logout` | Logout (clears cookie) |
| `GET` | `/api/auth/me` | Get current user |

### Assessments (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/assessment` | Create assessment (weather→calculate→AI→save) |
| `GET` | `/api/assessment/history` | List user's assessments |
| `GET` | `/api/assessment/[id]` | Get full assessment |
| `DELETE` | `/api/assessment/[id]` | Delete assessment |
| `POST` | `/api/assessment/[id]/recalculate` | Re-run with fresh weather |

### Solar (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/solar/calculate` | Preview calculation (no save, no AI) |
| `POST` | `/api/solar/simulate` | What-if scenario simulation |

### AI (auth required, rate-limited 15/min)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/analyze` | Generate/refresh AI recommendation |
| `POST` | `/api/ai/chat` | Conversational AI advisor |

### Weather (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/weather?city=&state=&country=` | Weather + solar data |

### Admin (admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats` | Platform analytics |

---

## 🧮 Calculation Engine

All math happens in `src/lib/solar/engine.ts` — a pure, deterministic module. The AI never touches these calculations.

### What it computes
- **Consumption** — from bill (using configurable tariff), or appliances, or user-provided kWh
- **Solar capacity** — `targetMonthlyGeneration / (sunlightHours × 30 × derating × orientation × shading × panelEfficiency)`
- **Generation** — daily / monthly / annual, with seasonal monthly distribution
- **Panels** — count + required roof area vs available area → `Sufficient` / `Limited` / `Insufficient`
- **Cost** — `capacity × cost-per-kW` (min/max/avg bands per property type)
- **Savings** — monthly (blended self-consumed + exported tariff), annual, lifetime (with degradation + tariff escalation)
- **Payback** — `installationCost / annualSavings`
- **CO₂** — `annualGeneration × gridEmissionFactor` (annual + lifetime)
- **Suitability score (0–100)** — weighted: roof (25%), solar resource (20%), budget (20%), energy demand (20%), shading (15%)
- **Battery recommendation** — based on surplus generation & evening dependency

### All assumptions are centralized
See `src/lib/solar/config.ts` — tariffs, panel specs, costs, emission factors, derating, weights, rate limits. Nothing is hard-coded elsewhere.

---

## 🛡️ Security

- ✅ JWT in **httpOnly cookies** (not accessible to client JS)
- ✅ **bcrypt** password hashing (salt rounds = 10)
- ✅ **Input validation** on every route (zod-style validators)
- ✅ **Rate limiting** (10/min auth, 15/min AI, 60/min general)
- ✅ **Security headers** on every response (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store`)
- ✅ **Ownership checks** on all assessment operations (admin bypasses)
- ✅ **AI prompt injection protection** — system prompt constrains the AI; responses are validated; safe fallbacks on invalid JSON
- ✅ **No secrets exposed to frontend** — all API keys stay server-side
- ✅ **No stack traces** leaked in error responses

---

## 📱 Responsive Design

- Mobile-first, works on desktop / laptop / tablet / mobile
- No horizontal scroll, no broken cards, no overlapping elements
- Sticky footer, accessible (ARIA labels, semantic HTML, keyboard nav)
- Charts use `ResponsiveContainer` — resize gracefully

---

## 🎨 Design

- **Green primary** (renewable-energy theme)
- **Solar yellow** accent
- **Dark navy** text
- White/light backgrounds, soft cards, rounded corners, subtle shadows
- Clean SaaS-product aesthetic — no overused gradients or glassmorphism

---

## ⚠️ Disclaimer

All financial, generation, and environmental values are **estimates** based on configurable assumptions. Actual results vary with location, weather, equipment, and installation quality. **Always verify with a qualified solar professional** before making investment decisions.

---

## 📄 License

This project is provided as-is for educational/demonstration purposes.
