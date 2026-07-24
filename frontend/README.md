# EMS Frontend — Phase 2

## Setup

```bash
npm install
copy .env.local.example .env.local   # Windows
# or: cp .env.local.example .env.local  (Mac/Linux)
npm run dev
```

Then open http://localhost:3000 — you'll be redirected to /login.
Log in with: admin@ems.local / (the password you set during seed)

The backend must be running on port 4000 first.

## What's built

| Route | Description |
|---|---|
| /login | Login page, JWT auth |
| /dashboard | Fleet overview, KPI cards, quick actions |
| /assets | Asset list with search/filter (FR-AR-007) |
| /assets/[id] | Asset detail with engine spec, registration, certs (FR-AR-008) |
| /assets/new | Asset registration form (FR-AR-001) |
| /drivers | Driver list with risk badges (FR-DR-007) |
| /fuel/new | Fuel log entry form with anomaly feedback (FR-FM-001) |
| /transfers/new | Transfer request submission (FR-ET-001) |
| /incidents/new | Incident report form (FR-IM-001) |
| /projects, /fuel, /maintenance, /transfers, /incidents | List stubs — data loads, full table views in next build |
| /admin | Admin section placeholder |

## Design
- Navy sidebar (#0F1923), amber primary (#F59E0B)
- JetBrains Mono for all asset/job codes (signature element)
- Tailwind CSS, no component library dependency
- Access token in memory only (not localStorage) per SRS §4.7
- Refresh token in httpOnly cookie, auto-refreshes on 401
