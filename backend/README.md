# EMS Backend — Phase 2 (in progress)

## Setup (run this locally — Prisma needs real internet access to fetch its engine binaries)

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and JWT secrets
npx prisma generate         # generates the Prisma client — REQUIRED before anything else runs
npx prisma migrate dev --name init   # creates all 49 tables in Postgres
SEED_ADMIN_PASSWORD="yourpassword" npm run seed   # seeds Role, AssetCategory, AssetSubType + one admin login
npm run dev                 # starts the API on :4000
```

## What's built so far
- Full Prisma schema (49 models) generated from the Phase 1 data dictionaries — see the note
  at the top of `prisma/schema.prisma` for the one addition (`RefreshToken`) beyond the dictionary.
- Auth: login / logout / refresh, JWT access (8h) + refresh (7d, httpOnly cookie), bcrypt (cost 12).
- RBAC middleware (`src/middleware/auth.js`) enforced per-route.
- Asset Registry module (`src/modules/assets/`): create (FR-AR-001), search/filter (FR-AR-007),
  detail view with role-scoped financial fields (FR-AR-008, NFR-SEC-004), status transitions
  with the Under-Maintenance block and the lifting-equipment certification hard block
  (FR-AR-006, NFR-RC-002).

## Not built yet
Driver, Fuel, Maintenance, Transfer, Incident, Project, Analytics, Intelligence, and Admin
modules — same routes/controller/service pattern as `assets/`, not yet written.

## Known limitation from the build sandbox
This was built in a network-restricted sandbox that cannot reach `binaries.prisma.sh`, so
`prisma generate`/`migrate`/`validate` could not be run there. The schema was validated
statically (structure, bidirectional relations, full column-coverage diff against the source
dictionaries) but **not** by the actual Prisma compiler. Run `npx prisma validate` yourself
as the first step after `npm install`.

## Update — Drivers, Projects, Fuel modules added
- **Drivers** (`/api/drivers`): registration (FR-DR-001), license renewal (FR-DR-006),
  training records (FR-DR-003), search (FR-DR-007), plus exported eligibility helpers
  (`validateLicenseEligibility`, `checkHighRiskAssignment` — FR-DR-002/005) for the
  Transfer module's operator assignment endpoint to call once it's built.
- **Projects** (`/api/projects`): registration with auto `PRJ-[COUNTRY]-YYYY-NNN` codes
  (FR-PS-001), site engineer assignment (FR-PS-002), equipment summary (FR-PS-003),
  status transitions with the "assets still assigned" completion warning (FR-PS-004).
- **Fuel** (`/api/fuel`): log entry with tank-capacity validation, meter-progression
  check, efficiency calculation, and 30-day rolling anomaly detection all in one flow
  (FR-FM-001 to FR-FM-004), tank deliveries with running balance (FR-FM-005), and
  reconciliation reporting (FR-FM-006).

### Two flagged additions beyond the data dictionary (in addition to RefreshToken)
1. **`ROLES.DRIVER` role seed value** (`prisma/seed.js`, `src/config/roles.js`) — the
   dictionary's Role table has no code for drivers/operators, but `Driver.employee_id`
   is a mandatory FK to `Employee`, and `Employee.role_id` is mandatory too. Without
   some role, driver registration can't create the required Employee row at all. These
   Employee rows are created with `isActive: false` so they can never log in — they
   exist purely for identity linkage, matching the fact that no UML use case lists a
   Driver actor. Worth confirming with your mentors that this is the intended shape.
2. **FR-DR-005's "VIP vehicle" high-risk check is not implemented** — the SRS names
   Executive/Light Commercial VIP vehicles as a high-risk assignment category, but
   `AssetSubType` has no field distinguishing a VIP vehicle from a regular one. Only
   the two crane sub-types are enforced for now. This needs a dictionary/ERD decision
   (a boolean flag on AssetSubType or Asset?) before it can be built — not something
   I should guess at and add unilaterally.

## Update — Maintenance and Transfer modules added
- **Maintenance** (`/api/maintenance`): breakdown reporting (FR-MM-010, sets asset
  Under Maintenance immediately), job card creation with the Corrective-requires-
  breakdown and External-requires-vendor checks (FR-MM-003), parts/labor entry with
  auto-summed totals (FR-MM-004/005), status workflow (FR-MM-006), and a dedicated
  close-job-card flow requiring Supervisor sign-off + at least one parts/labor line
  (SRS §5.5) that recalculates the next preventive due date (FR-MM-007) and returns
  the asset to Idle if no other job card holds it down.
- **Transfers** (`/api/transfers`): request submission with duplicate-pending block
  (FR-ET-001), compliance check spanning Gulf Registration + Insurance + Driver
  License + open-job-card status (FR-ET-003, calls into the Maintenance module's
  `blockTransferIfUnderMaintenance`), approve/reject with override reason (FR-ET-002,
  NFR-RC-001), pre-departure inspection gate requiring a photo before dispatch
  (FR-ET-005), dispatch with gate pass (FR-ET-004), and arrival confirmation that
  flags transit damage by comparing inspection conditions and updates the asset's
  site assignment (FR-ET-006).

No new flagged additions in this round — both modules build entirely on tables
and business rules already in your dictionary and SRS.

## Update — Incident Management added (backend module set now complete for Phase 2 core ops)
- **Incidents** (`/api/incidents`): report creation with conditional third-party
  fields (FR-IM-001/002), HSE investigator assignment, root cause recording required
  before closure (FR-IM-005), the police-report hard block for Major Accident /
  Third-Party Property Damage (NFR-RC-003), driver behavior score impact on closure
  (FR-IM-006), and incident analytics (FR-IM-007).

### One flagged assumption
`riskCategoryFor()` in `incident.service.js` assumes a **higher** DriverBehaviorScore
composite means a **safer** driver (since FR-IM-006 subtracts points for bad events),
so the risk bands run opposite to the asset risk bands in FR-IL-002. The exact
numeric cutoffs (70/40 used here) aren't specified anywhere in the SRS text I had —
worth confirming with your mentors rather than treating as final.

## Backend module status: all 8 operational modules from the SRS are now built
(auth, assets, drivers, projects, fuel, maintenance, transfers, incidents).
Remaining per the SRS: Analytics Dashboard + Intelligence Layer (Phase 3/4 — need
the nightly batch job and, for Intelligence, the separate Python ML service) and
System Administration (users/config/lookup tables/audit log — smaller, could slot
into Phase 2 cleanup or Phase 5).
