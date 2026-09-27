"""
EMS Synthetic Data Generator — SRS §5.7
Generates 12 months of realistic operational data for the analytics dashboard.

Usage:
    pip install psycopg2-binary python-dotenv faker
    python scripts/seed_synthetic.py

Set DATABASE_URL in backend/.env before running.
Safe to run multiple times — checks for existing data before inserting.

SCALED UP (see chat): the original counts (50 assets / 20 drivers / 5 projects)
produced train/test splits with as few as 4-10 test samples per model, which
made eval metrics (F1, precision, recall) statistically meaningless — e.g.
Predictive Maintenance's test set had so few positive-class examples that
precision/recall collapsed to 0 even with 90% accuracy. New counts:
    Projects:   5  -> 10
    Drivers:    20 -> 150
    Assets:     50 -> 300
    Breakdowns: 45 -> ~150 (50% of assets, was 90%)
    Incidents:  12 -> 80
    Transfers:  25 -> 150
This gives each model's 20%-held-out test split roughly 30-60 samples instead
of 4-10, which is the minimum needed for accuracy/precision/recall/F1 numbers
to actually mean something.

FIXED (see chat): three raw-SQL column names did not match schema.prisma's
@map() values and would throw "column does not exist" at runtime:
  1. Driver insert used "employeeId"        -> corrected to "employee_id"
  2. EngineSpecification used
     "rated_horsepower_hp"                  -> corrected to "rated_horsepower"
  3. GulfRegistration used
     "registration_country"                 -> corrected to "country_of_registration"
"""

import os, sys, random, uuid, math
from datetime import datetime, timedelta, date
from decimal import Decimal

# Load DATABASE_URL from backend/.env
env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
if os.path.exists(env_path):
    for line in open(env_path):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))

DATABASE_URL = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set. Check backend/.env")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Run: pip install psycopg2-binary")
    sys.exit(1)

# Parse DATABASE_URL for psycopg2
import urllib.parse as urlparse
url = urlparse.urlparse(DATABASE_URL.split('?')[0])
conn = psycopg2.connect(
    host=url.hostname, port=url.port or 5432,
    dbname=url.path.lstrip('/'), user=url.username, password=url.password,
    sslmode='require' if 'neon.tech' in (url.hostname or '') else 'prefer'
)
conn.autocommit = False
cur = conn.cursor()

NOW = datetime.utcnow()
START_DATE = NOW - timedelta(days=365)

# ── Scale knobs — bump these if you need even more data ─────────────────────
PROJECT_COUNT   = 10
DRIVER_COUNT    = 150
ASSET_COUNT     = 300
BREAKDOWN_FRACTION = 0.50   # fraction of assets that get a breakdown record
INCIDENT_COUNT  = 80
TRANSFER_COUNT  = 150

def uid(): return str(uuid.uuid4())
def rand_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))
def rand_dt(start, end):
    delta = int((end - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, delta))

print("=== EMS Synthetic Data Generator ===")

# ── 1. Check existing data ──────────────────────────────────────────────────
cur.execute('SELECT COUNT(*) FROM "Asset"')
existing_assets = cur.fetchone()[0]
if existing_assets >= ASSET_COUNT:
    print(f"Found {existing_assets} assets already (target {ASSET_COUNT}) — skipping synthetic generation.")
    print("To regenerate: run 'npx prisma migrate reset' then re-seed.")
    conn.close()
    sys.exit(0)
elif existing_assets > 0:
    print(f"Found {existing_assets} assets already — will add up to {ASSET_COUNT} total (existing rows are skipped via ON CONFLICT).")

# ── 2. Fetch seeded lookup data ──────────────────────────────────────────────
cur.execute('SELECT id, "role_code" FROM "Role"')
roles = {r[1]: r[0] for r in cur.fetchall()}

cur.execute('SELECT id, "sub_type_code", "requires_certification", "requires_gulf_registration" FROM "AssetSubType"')
subtypes = cur.fetchall()  # (id, code, needsCert, needsReg)

cur.execute('SELECT id FROM "Employee" WHERE "is_active" = true LIMIT 1')
row = cur.fetchone()
if not row:
    print("ERROR: No active admin Employee found. Run npm run seed first.")
    conn.close()
    sys.exit(1)
admin_id = row[0]

# ── 3. Create Vendor ─────────────────────────────────────────────────────────
print("Creating vendor...")
vendor_id = uid()
cur.execute('''
    INSERT INTO "Vendor"(id, "vendor_code", "vendor_name", "vendor_type", country, "is_active", "created_at", "updated_at")
    VALUES (%s, %s, %s, %s, %s, true, NOW(), NOW()) ON CONFLICT DO NOTHING
''', (vendor_id, 'VEN-0001', 'Gulf Heavy Equipment Services LLC', 'Maintenance', 'Qatar'))

# ── 4. Create Projects ────────────────────────────────────────────────────────
print(f"Creating {PROJECT_COUNT} projects...")
COUNTRY_CODES = ['QA', 'AE', 'SA', 'OM', 'KW', 'BH', 'QA', 'AE', 'SA', 'OM']
SECTORS       = ['Oil & Gas', 'Refinery', 'Infrastructure', 'Construction', 'Marine',
                  'Petrochemical', 'Water Treatment', 'Power Generation', 'Ports & Logistics', 'Mining']
CITIES        = ['Doha', 'Dubai', 'Riyadh', 'Muscat', 'Kuwait City', 'Manama', 'Al Khor', 'Abu Dhabi', 'Jeddah', 'Sohar']
COUNTRY_NAMES = ['Qatar', 'UAE', 'Saudi Arabia', 'Oman', 'Kuwait', 'Bahrain', 'Qatar', 'UAE', 'Saudi Arabia', 'Oman']

project_ids = []
for i in range(PROJECT_COUNT):
    pid = uid()
    project_ids.append(pid)
    idx = i % len(COUNTRY_CODES)
    code = f"PRJ-{COUNTRY_CODES[idx]}-2025-{str(i+1).zfill(3)}"
    cur.execute('''
        INSERT INTO "Project"(id, "project_code", "project_name", "client_name", sector, city, country,
            "start_date", "planned_completion_date", "project_status", "project_manager_id", "is_archived", "created_at", "updated_at")
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,false,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (pid, code, f"Project {chr(65 + (i % 26))} — {SECTORS[idx]}", f"Client {chr(65 + (i % 26))} Holdings",
          # FIXED: Project.country is @db.VarChar(10) in schema.prisma — "Saudi Arabia"
          # (12 chars) violated that. Using the short ISO country code (COUNTRY_CODES)
          # instead of the full country name (COUNTRY_NAMES) here.
          SECTORS[idx], CITIES[idx], COUNTRY_CODES[idx],
          (NOW - timedelta(days=400)).date(), (NOW + timedelta(days=200)).date(),
          'Active', admin_id))

# ── 5. Create Drivers ─────────────────────────────────────────────────────────
print(f"Creating {DRIVER_COUNT} drivers...")
NATIONALITIES = ['Indian','Pakistani','Filipino','Nepali','Sri Lankan','Bangladeshi','Egyptian']
LIC_CATS = ['Light Vehicle','Heavy Vehicle','Crane Operator Certificate','Forklift Operator Certificate']
driver_ids = []
driver_role_id = roles.get('DRIVER', list(roles.values())[0])

for i in range(DRIVER_COUNT):
    emp_id = uid()
    drv_id = uid()
    lic_id = uid()
    nat = random.choice(NATIONALITIES)
    lic_cat = random.choice(LIC_CATS)
    exp_date = (NOW + timedelta(days=random.randint(30, 730))).date()
    med_exp = (NOW + timedelta(days=random.randint(30, 365))).date()

    cur.execute('''
        INSERT INTO "Employee"(id,"employee_code","role_id","full_name","nationality","job_title",
            email,"password_hash","is_active","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,false,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (emp_id, f"DRV-{str(i+1).zfill(4)}", driver_role_id,
          f"Driver {i+1} {nat}", nat, 'Equipment Operator',
          f"driver{i+1}@fleet.local", '$2a$12$placeholder'))

    # FIXED: "employeeId" -> "employee_id" (Driver.employeeId is @map("employee_id") in schema.prisma)
    cur.execute('''
        INSERT INTO "Driver"(id,"employee_id","medical_cert_number","medical_cert_expiry",
            "years_of_experience","is_active","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,true,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (drv_id, emp_id, f"MED-{str(i+1).zfill(5)}", med_exp, random.randint(2, 15)))

    cur.execute('''
        INSERT INTO "DriverLicense"(id,"driver_id","license_number","license_category",
            "issuing_authority","issuing_country","issue_date","expiry_date","is_current","created_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,true,NOW()) ON CONFLICT DO NOTHING
    ''', (lic_id, drv_id, f"LIC-{str(i+1).zfill(6)}", lic_cat,
          'Qatar MOI Traffic Dept', 'Qatar',
          (NOW - timedelta(days=random.randint(180, 1800))).date(), exp_date))

    driver_ids.append(drv_id)

# ── 6. Create Assets ──────────────────────────────────────────────────────────
print(f"Creating {ASSET_COUNT} assets...")

# Weight distribution: more heavy equipment, fewer cranes
SUBTYPE_WEIGHTS = {
    'CEXC': 8, 'DUMP': 7, 'BKHL': 6, 'WLDR': 5, 'BULL': 4, 'COMP': 4,
    'SUV': 4, 'PCKU': 4, 'PBUS': 3,
    'CCRN': 2, 'RTCR': 2, 'FKLT': 3, 'THND': 2,
    'GNST': 3, 'AIRC': 2, 'LTWR': 1,
}
MAKES = {
    'CEXC': 'Caterpillar', 'DUMP': 'Volvo', 'BKHL': 'JCB', 'WLDR': 'Komatsu',
    'BULL': 'Caterpillar', 'COMP': 'Dynapac', 'SUV': 'Toyota', 'PCKU': 'Toyota',
    'PBUS': 'Coaster', 'CCRN': 'Liebherr', 'RTCR': 'Grove', 'FKLT': 'Toyota',
    'THND': 'JLG', 'GNST': 'Caterpillar', 'AIRC': 'Atlas Copco', 'LTWR': 'Doosan',
}
MODELS = {
    'CEXC': '320D', 'DUMP': 'A40G', 'BKHL': '3CX', 'WLDR': 'WA380',
    'BULL': 'D6T', 'COMP': 'CA250', 'SUV': 'Land Cruiser', 'PCKU': 'Hilux',
    'PBUS': 'Bus 4.2', 'CCRN': 'LTM1100', 'RTCR': 'RT9150E', 'FKLT': '8FG25',
    'THND': '1350SJ', 'GNST': 'XQ400', 'AIRC': 'XATS 900', 'LTWR': 'V5',
}
FUEL_CAPS = {
    'CEXC': 410, 'DUMP': 520, 'BKHL': 160, 'WLDR': 300, 'BULL': 450,
    'COMP': 200, 'SUV': 87, 'PCKU': 80, 'PBUS': 130, 'CCRN': 800,
    'RTCR': 600, 'FKLT': 60, 'THND': 125, 'GNST': 350, 'AIRC': 180, 'LTWR': 90,
}
BASE_CONSUMPTION = {  # litres per hour or per 100km
    'CEXC': 18, 'DUMP': 22, 'BKHL': 8, 'WLDR': 14, 'BULL': 20,
    'COMP': 10, 'SUV': 12, 'PCKU': 11, 'PBUS': 18, 'CCRN': 35,
    'RTCR': 28, 'FKLT': 4, 'THND': 6, 'GNST': 25, 'AIRC': 12, 'LTWR': 5,
}

# Build weighted pool
pool = []
subtype_map = {s[1]: s for s in subtypes}
for code, weight in SUBTYPE_WEIGHTS.items():
    if code in subtype_map:
        pool.extend([subtype_map[code]] * weight)
random.shuffle(pool)

asset_ids = []
asset_info = []  # (id, subtype_code, needs_cert, project_id, base_consumption, fuel_cap)

for i in range(ASSET_COUNT):
    st = pool[i % len(pool)]
    st_id, st_code, needs_cert, needs_reg = st
    asset_id = uid()
    eng_id = uid()
    year = random.randint(2018, 2024)
    proj = project_ids[i % len(project_ids)]
    make = MAKES.get(st_code, 'Generic')
    model = MODELS.get(st_code, 'Standard')
    cap = FUEL_CAPS.get(st_code, 200)
    consumption = BASE_CONSUMPTION.get(st_code, 15) * random.uniform(0.85, 1.15)

    # Asset
    cur.execute('''
        INSERT INTO "Asset"(id,"asset_number","sub_type_id",make,model,"year_of_manufacture",
            "ownership_type","current_status","current_project_id","is_archived","created_by","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,false,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (asset_id, f"EQ-2025-{str(i+1).zfill(4)}", st_id, make, model, year,
          random.choice(['Owned','Owned','Owned','Leased']),
          random.choice(['Active','Active','Active','Active','Idle']),
          proj, admin_id))

    # Engine Spec — FIXED: "rated_horsepower_hp" -> "rated_horsepower"
    # (EngineSpecification.ratedHorsepower is @map("rated_horsepower") in schema.prisma)
    cur.execute('''
        INSERT INTO "EngineSpecification"(id,"asset_id","engine_make","engine_model","engine_serial_number",
            "chassis_serial_number","fuel_type","rated_horsepower","fuel_tank_capacity_liters",
            "transmission_type","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (uid(), asset_id, make, f"{model} Engine", f"SN-{asset_id[:8].upper()}",
          f"CH-{asset_id[8:16].upper()}", 'Diesel',
          random.randint(150, 500), cap, 'Automatic', ))

    # Gulf Registration for applicable types — FIXED: "registration_country" -> "country_of_registration"
    # (GulfRegistration.countryOfRegistration is @map("country_of_registration") in schema.prisma)
    if needs_reg:
        cur.execute('''
            INSERT INTO "GulfRegistration"(id,"asset_id","plate_number","country_of_registration",
                "registration_cert_number","registration_expiry_date","is_current","traffic_file_number","created_at","updated_at")
            VALUES(%s,%s,%s,%s,%s,%s,true,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
        ''', (uid(), asset_id, f"QA-{random.randint(10000,99999)}", 'Qatar',
              f"REG-{asset_id[:8].upper()}",
              (NOW + timedelta(days=random.randint(60, 400))).date(),
              f"TF-{random.randint(100000,999999)}"))

    asset_ids.append(asset_id)
    asset_info.append((asset_id, st_code, needs_cert, proj, consumption, cap))

    if (i + 1) % 50 == 0:
        conn.commit()
        print(f"  ...{i+1}/{ASSET_COUNT} assets created")

conn.commit()
print(f"  Created {len(asset_ids)} assets")

# ── 7. Assign drivers to assets ──────────────────────────────────────────────
print("Assigning drivers to assets...")
# FIXED: this insert previously used "assigned_from" (a column that belongs to
# AssetSiteAssignment, not this table) and "updated_at" (doesn't exist on
# AssetOperatorAssignment at all), while omitting "shift" and "assignment_date"
# — both required, non-nullable columns with no default. Rewritten to match
# the actual schema: shift, assignmentDate, assignedBy required; projectId
# optional but included since we have it.
SHIFTS = ['Day', 'Night']
for i, (asset_id, _st, _cert, proj_id, _cons, _cap) in enumerate(asset_info):
    driver_id = driver_ids[i % len(driver_ids)]
    cur.execute('''
        INSERT INTO "AssetOperatorAssignment"(id,"asset_id","driver_id","project_id","shift","assignment_date","assigned_by","created_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING
    ''', (uid(), asset_id, driver_id, proj_id, random.choice(SHIFTS), (NOW - timedelta(days=365)).date(), admin_id))

# ── 8. AssetSiteAssignment ───────────────────────────────────────────────────
# FIXED: AssetSiteAssignment has no created_at/updated_at columns at all —
# removed both from the insert.
for asset_id, _, _, proj_id, *_ in asset_info:
    cur.execute('''
        INSERT INTO "AssetSiteAssignment"(id,"asset_id","project_id","assigned_from","assigned_by")
        VALUES(%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING
    ''', (uid(), asset_id, proj_id, (NOW - timedelta(days=365)).date(), admin_id))

conn.commit()

# ── 9. Fuel Logs — 12 months ─────────────────────────────────────────────────
print("Generating fuel logs (12 months)...")
fuel_logs = []
current_meters = {aid: 0.0 for aid, *_ in asset_info}

for asset_id, st_code, _, proj_id, consumption, cap in asset_info:
    driver_id = driver_ids[asset_ids.index(asset_id) % len(driver_ids)]
    current_date = START_DATE
    meter = random.uniform(500, 5000)  # starting meter reading

    while current_date < NOW:
        current_date += timedelta(days=random.randint(1, 4))
        if current_date >= NOW:
            break

        hours_worked = random.uniform(4, 10)
        anomaly_factor = 1.8 if random.random() < 0.05 else random.uniform(0.9, 1.1)
        qty = min(round(consumption * hours_worked * anomaly_factor, 1), cap * 0.9)
        qty = max(qty, 10.0)
        meter += hours_worked
        unit_price = round(random.uniform(0.85, 1.20), 3)

        fuel_logs.append((
            uid(), asset_id, driver_id, proj_id,
            current_date + timedelta(hours=random.randint(6, 18)),
            'Diesel', qty, None, round(meter, 1),
            'Site Tank', None, unit_price, round(qty * unit_price, 2), 'SAR',
            round(qty / max(hours_worked, 1), 3),
            admin_id
        ))

    current_meters[asset_id] = meter

    if len(fuel_logs) >= 2000:
        execute_values(cur, '''
            INSERT INTO "FuelLog"(id,"asset_id","driver_id","project_id","logged_at","fuel_type",
                "quantity_liters","meter_reading_km","meter_reading_hours","fuel_source","voucher_reference",
                "unit_price","total_cost","currency","calculated_efficiency","entered_by")
            VALUES %s ON CONFLICT DO NOTHING
        ''', fuel_logs, page_size=500)
        conn.commit()
        print(f"  ...inserted {len(fuel_logs)} fuel logs (batch flush)")
        fuel_logs = []

if fuel_logs:
    print(f"  Inserting final {len(fuel_logs)} fuel logs...")
    execute_values(cur, '''
        INSERT INTO "FuelLog"(id,"asset_id","driver_id","project_id","logged_at","fuel_type",
            "quantity_liters","meter_reading_km","meter_reading_hours","fuel_source","voucher_reference",
            "unit_price","total_cost","currency","calculated_efficiency","entered_by")
        VALUES %s ON CONFLICT DO NOTHING
    ''', fuel_logs, page_size=500)
conn.commit()

# ── 10. Breakdown Logs + Job Cards + Labor + Parts ───────────────────────────
print("Generating maintenance records...")
breakdown_ids = []
job_card_ids = []

breakdown_count = round(len(asset_info) * BREAKDOWN_FRACTION)
breakdown_candidates = sorted(asset_info, key=lambda x: random.random())[:breakdown_count]
FAULT_CATS = ['Engine','Hydraulics','Electrical','Structural','Tyres','Brakes','Transmission','Cooling System']

for idx, (asset_id, st_code, _, proj_id, *_) in enumerate(breakdown_candidates):
    driver_id = driver_ids[idx % len(driver_ids)]
    occurred = rand_dt(START_DATE, NOW - timedelta(days=30))
    brk_id = uid()
    brk_num = f"BRK-2025-{str(idx+1).zfill(5)}"
    fault = random.choice(FAULT_CATS)

    cur.execute('''
        INSERT INTO "BreakdownLog"(id,"breakdown_number","asset_id","driver_id","project_id",
            "occurred_at","symptom_description","fault_category","reported_by","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (brk_id, brk_num, asset_id, driver_id, proj_id, occurred,
          f"{fault} failure detected during operation", fault, admin_id))
    breakdown_ids.append((brk_id, asset_id, fault, occurred))

    jc_id = uid()
    jc_num = f"JC-2025-{str(idx+1).zfill(5)}"
    opened = occurred + timedelta(hours=random.uniform(1, 6))
    status = random.choice(['Closed','Closed','Closed','In Progress'])
    closed_at = opened + timedelta(hours=random.uniform(4, 72)) if status == 'Closed' else None
    parts_cost = round(random.uniform(200, 8000), 2)
    labor_cost = round(random.uniform(100, 2000), 2)

    cur.execute('''
        INSERT INTO "MaintenanceJobCard"(id,"job_card_number","asset_id","job_card_type","workshop_type",
            "fault_description","fault_category","breakdown_log_id","opened_at","status",
            "total_parts_cost","total_labor_cost","total_cost","closed_at","approved_by","created_by","created_at","updated_at")
        VALUES(%s,%s,%s,'Corrective','Internal',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (jc_id, jc_num, asset_id, f"Corrective repair — {fault}", fault,
          brk_id, opened, status, parts_cost, labor_cost,
          round(parts_cost + labor_cost, 2),
          closed_at, admin_id if status == 'Closed' else None, admin_id))
    job_card_ids.append((jc_id, asset_id, opened, closed_at, parts_cost + labor_cost))

    if (idx + 1) % 50 == 0:
        conn.commit()
        print(f"  ...{idx+1}/{breakdown_count} breakdowns created")

# Preventive maintenance — scales with asset count (~6 per asset)
print("  Generating preventive job cards...")
pv_count = 0
for asset_id, *_ in asset_info:
    for month_offset in range(0, 12, 2):  # every 2 months
        open_dt = START_DATE + timedelta(days=30 * month_offset + random.randint(0, 15))
        close_dt = open_dt + timedelta(hours=random.uniform(3, 8))
        if close_dt >= NOW:
            continue
        parts = round(random.uniform(50, 500), 2)
        labor = round(random.uniform(80, 400), 2)
        jc_id = uid()
        cur.execute('''
            INSERT INTO "MaintenanceJobCard"(id,"job_card_number","asset_id","job_card_type","workshop_type",
                "service_type","opened_at","status","total_parts_cost","total_labor_cost","total_cost",
                "closed_at","approved_by","created_by","created_at","updated_at")
            VALUES(%s,%s,%s,'Preventive','Internal',%s,%s,'Closed',%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
        ''', (jc_id, f"JC-PV-{uid()[:8]}", asset_id,
              random.choice(['Engine Oil Change','Air Filter','Full OEM Inspection']),
              open_dt, parts, labor, round(parts+labor, 2), close_dt, admin_id, admin_id))
        pv_count += 1
    if pv_count % 500 < 6:
        conn.commit()

conn.commit()
print(f"  Created {len(breakdown_ids)} breakdowns, {len(job_card_ids)} corrective JCs, {pv_count} preventive JCs")

# ── 11. Incident Reports ──────────────────────────────────────────────────────
print(f"Generating {INCIDENT_COUNT} incident reports...")
INC_TYPE_POOL = ['Near Miss','Near Miss','Near Miss','Minor Accident','Equipment Tip-Over',
                  'Falling Object','Minor Accident','Near Miss']
ROOT_CAUSES = ['Human Error','Mechanical Failure','Environmental Conditions','Procedural Violation']

for idx in range(INCIDENT_COUNT):
    inc_type = random.choice(INC_TYPE_POOL)
    asset_id = asset_ids[idx % len(asset_ids)]
    driver_id = driver_ids[idx % len(driver_ids)]
    proj_id = project_ids[idx % len(project_ids)]
    occurred = rand_dt(START_DATE, NOW - timedelta(days=7))
    inc_id = uid()
    inc_num = f"INC-2025-{str(idx+1).zfill(5)}"
    is_closed = random.random() > 0.3
    rc = random.choice(ROOT_CAUSES) if is_closed else None

    cur.execute('''
        INSERT INTO "IncidentReport"(id,"incident_number","asset_id","driver_id","project_id",
            "incident_type","occurred_at","reported_by","third_party_involved","personal_injury_occurred",
            "incident_status","root_cause_category","corrective_action","closure_date","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,false,false,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (inc_id, inc_num, asset_id, driver_id, proj_id, inc_type, occurred, admin_id,
          'Closed' if is_closed else 'Open', rc,
          f"Corrective action taken for {inc_type}" if is_closed else None,
          (occurred + timedelta(days=random.randint(2,14))).date() if is_closed else None))

    if (idx + 1) % 50 == 0:
        conn.commit()

conn.commit()
print(f"  Created {INCIDENT_COUNT} incident reports")

# ── 12. Transfer Requests ─────────────────────────────────────────────────────
print(f"Generating {TRANSFER_COUNT} transfer records...")
for i in range(TRANSFER_COUNT):
    asset_id = asset_ids[i % len(asset_ids)]
    src_proj = project_ids[i % len(project_ids)]
    dst_proj = project_ids[(i + 1) % len(project_ids)]
    req_date = rand_dt(START_DATE, NOW - timedelta(days=20))
    trn_id = uid()
    trn_num = f"TRF-2025-{str(i+1).zfill(5)}"
    status = random.choice(['Completed','Completed','Completed','Approved','Pending'])

    cur.execute('''
        INSERT INTO "TransferRequest"(id,"transfer_number","asset_id","source_project_id",
            "destination_project_id","requested_by","transfer_reason","current_status",
            "requested_at","approved_by","approved_at","gate_pass_number","departure_date","arrival_date",
            "created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING
    ''', (trn_id, trn_num, asset_id, src_proj, dst_proj, admin_id,
          random.choice(['Project Mobilization','Reallocation','Demobilization']),
          status, req_date,
          admin_id if status != 'Pending' else None,
          req_date + timedelta(days=1) if status != 'Pending' else None,
          f"GP-{random.randint(10000,99999)}" if status in ('Completed','Approved') else None,
          (req_date + timedelta(days=2)).date() if status == 'Completed' else None,
          (req_date + timedelta(days=5)).date() if status == 'Completed' else None))

    if (i + 1) % 50 == 0:
        conn.commit()

conn.commit()
print(f"  Created {TRANSFER_COUNT} transfer records")

# ── 13. KPI Snapshots ────────────────────────────────────────────────────────
print("Computing and storing KPI snapshots...")

for n, (asset_id, st_code, _, proj_id, consumption, _) in enumerate(asset_info):
    cur.execute('SELECT COALESCE(SUM("quantity_liters"),0), COALESCE(SUM("total_cost"),0) FROM "FuelLog" WHERE "asset_id"=%s', (asset_id,))
    total_fuel_l, total_fuel_cost = cur.fetchone()

    cur.execute('SELECT COALESCE(SUM("total_cost"),0), COUNT(*) FROM "MaintenanceJobCard" WHERE "asset_id"=%s AND "status"=\'Closed\'', (asset_id,))
    maint_cost, maint_count = cur.fetchone()

    cur.execute('''
        SELECT jc."opened_at", jc."closed_at", bl."occurred_at"
        FROM "MaintenanceJobCard" jc
        JOIN "BreakdownLog" bl ON bl.id = jc."breakdown_log_id"
        WHERE jc."asset_id"=%s AND jc."status"='Closed' AND jc."closed_at" IS NOT NULL
        ORDER BY bl."occurred_at"
    ''', (asset_id,))
    breakdown_rows = cur.fetchall()

    mtbf = 0.0
    mttr = 0.0
    if len(breakdown_rows) > 1:
        gaps = []
        for j in range(1, len(breakdown_rows)):
            gap = (breakdown_rows[j][2] - breakdown_rows[j-1][1]).total_seconds() / 3600 if breakdown_rows[j-1][1] else 0
            if gap > 0:
                gaps.append(gap)
        repair_times = [(r[1] - r[0]).total_seconds() / 3600 for r in breakdown_rows if r[1]]
        mtbf = round(sum(gaps) / len(gaps), 2) if gaps else 0
        mttr = round(sum(repair_times) / len(repair_times), 2) if repair_times else 0

    cur.execute('SELECT COUNT(*) FROM "FuelLog" WHERE "asset_id"=%s', (asset_id,))
    log_count = cur.fetchone()[0]
    utilization = round(min(log_count * 6 / (365 * 10), 1.0) * 100, 1)

    # FIXED: AssetKPISnapshot also has no "currency" column at all (in addition
    # to no created_at/updated_at, fixed earlier) — removed it from this insert.
    cur.execute('''
        INSERT INTO "AssetKPISnapshot"(id,"asset_id","snapshot_date","period_start","period_end",
            "utilization_rate_percent","mtbf_hours","mttr_hours","total_fuel_liters","total_fuel_cost",
            "total_maintenance_cost","breakdown_count","computed_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
        ON CONFLICT DO NOTHING
    ''', (uid(), asset_id, NOW.date(), START_DATE.date(), NOW.date(), utilization, mtbf, mttr,
          float(total_fuel_l), float(total_fuel_cost), float(maint_cost), len(breakdown_rows)))

    if (n + 1) % 50 == 0:
        conn.commit()
        print(f"  ...{n+1}/{len(asset_info)} KPI snapshots computed")

conn.commit()
print(f"  Computed KPI snapshots for {len(asset_info)} assets")

# ── 14. Driver Behavior Scores ───────────────────────────────────────────────
print("Computing driver behavior scores...")
for drv_id in driver_ids:
    cur.execute('SELECT COUNT(*) FROM "IncidentReport" WHERE "driver_id"=%s AND "incident_status"=\'Closed\'', (drv_id,))
    inc_count = cur.fetchone()[0]
    inc_score = max(100 - inc_count * 10, 40)
    fuel_score = random.uniform(60, 100)
    breakdown_score = random.uniform(60, 100)
    compliance_score = random.uniform(70, 100)
    composite = inc_score * 0.4 + fuel_score * 0.3 + breakdown_score * 0.2 + compliance_score * 0.1
    risk = 'Low' if composite >= 70 else ('Medium' if composite >= 40 else 'High')

    cur.execute('''
        INSERT INTO "DriverBehaviorScore"(id,"driver_id","composite_score","risk_category",
            "incident_score","fuel_score","breakdown_attribution_score","compliance_score",
            "incidents_last_90_days","last_computed_at","model_version","created_at","updated_at")
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),'synthetic-v1',NOW(),NOW())
        ON CONFLICT("driver_id") DO UPDATE SET
            "composite_score"=EXCLUDED."composite_score","risk_category"=EXCLUDED."risk_category",
            "incident_score"=EXCLUDED."incident_score","last_computed_at"=NOW()
    ''', (uid(), drv_id, round(composite, 2), risk, round(inc_score, 2),
          round(fuel_score, 2), round(breakdown_score, 2), round(compliance_score, 2), inc_count))

conn.commit()
print("  Driver behavior scores computed")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n=== Generation Complete ===")
cur.execute('SELECT COUNT(*) FROM "Asset"'); print(f"Assets:        {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "Driver"'); print(f"Drivers:       {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "Project"'); print(f"Projects:      {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "FuelLog"'); print(f"Fuel logs:     {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "MaintenanceJobCard"'); print(f"Job cards:     {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "BreakdownLog"'); print(f"Breakdowns:    {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "IncidentReport"'); print(f"Incidents:     {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "TransferRequest"'); print(f"Transfers:     {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM "AssetKPISnapshot"'); print(f"KPI snapshots: {cur.fetchone()[0]}")

conn.close()
print("\nDone. Open the dashboard to see live data.")