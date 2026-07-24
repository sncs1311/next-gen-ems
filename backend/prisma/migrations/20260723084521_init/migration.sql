-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "incident_number" VARCHAR(30) NOT NULL,
    "asset_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "project_id" TEXT,
    "yard_location_id" TEXT,
    "transfer_request_id" TEXT,
    "incident_type" VARCHAR(50) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reported_by" TEXT NOT NULL,
    "third_party_involved" BOOLEAN NOT NULL DEFAULT false,
    "third_party_vehicle_plate" VARCHAR(30),
    "third_party_company" VARCHAR(200),
    "third_party_driver_name" VARCHAR(200),
    "third_party_insurance_details" TEXT,
    "personal_injury_occurred" BOOLEAN NOT NULL DEFAULT false,
    "injured_persons_details" TEXT,
    "medical_attention_required" BOOLEAN NOT NULL DEFAULT false,
    "hospitalization_occurred" BOOLEAN NOT NULL DEFAULT false,
    "medical_facility" VARCHAR(300),
    "police_report_number" VARCHAR(100),
    "insurance_claim_number" VARCHAR(100),
    "estimated_damage_cost" DECIMAL(12,2),
    "estimated_third_party_claim" DECIMAL(12,2),
    "root_cause_category" VARCHAR(50),
    "root_cause_description" TEXT,
    "corrective_action" TEXT,
    "investigated_by" TEXT,
    "investigation_start_date" DATE,
    "closure_date" DATE,
    "incident_status" VARCHAR(20) NOT NULL DEFAULT 'Open',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentMedia" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "media_type" VARCHAR(20) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "mime_type" VARCHAR(100),
    "caption" VARCHAR(300),
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetKPISnapshot" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "utilization_rate_percent" DECIMAL(5,2),
    "total_available_hours" DECIMAL(8,2),
    "total_productive_hours" DECIMAL(8,2),
    "total_downtime_hours" DECIMAL(8,2),
    "mtbf_hours" DECIMAL(8,2),
    "mttr_hours" DECIMAL(6,2),
    "breakdown_count" INTEGER,
    "total_fuel_liters" DECIMAL(10,2),
    "total_fuel_cost" DECIMAL(12,2),
    "total_maintenance_cost" DECIMAL(12,2),
    "total_preventive_cost" DECIMAL(12,2),
    "total_corrective_cost" DECIMAL(12,2),
    "total_cost_of_ownership" DECIMAL(15,2),
    "cumulative_repair_cost" DECIMAL(15,2),
    "repair_to_book_value_ratio" DECIMAL(5,4),
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetKPISnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictiveMaintenanceScore" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "risk_category" VARCHAR(10) NOT NULL,
    "top_feature_1" VARCHAR(100),
    "top_feature_2" VARCHAR(100),
    "top_feature_3" VARCHAR(100),
    "recommended_action" TEXT,
    "hours_since_last_service" DECIMAL(8,2),
    "breakdowns_last_90_days" INTEGER,
    "fuel_anomalies_last_30_days" INTEGER,
    "overdue_maintenance_flag" BOOLEAN,
    "asset_age_years" DECIMAL(4,1),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "model_version" VARCHAR(20) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictiveMaintenanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelForecast" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "forecast_type" VARCHAR(10) NOT NULL,
    "forecast_period_start" DATE NOT NULL,
    "forecast_period_end" DATE NOT NULL,
    "predicted_volume_liters" DECIMAL(10,2) NOT NULL,
    "confidence_lower" DECIMAL(10,2) NOT NULL,
    "confidence_upper" DECIMAL(10,2) NOT NULL,
    "active_equipment_count" INTEGER,
    "activity_intensity" INTEGER,
    "actual_volume_liters" DECIMAL(10,2),
    "forecast_error" DECIMAL(10,2),
    "model_version" VARCHAR(20) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementAlert" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "trigger_date" DATE NOT NULL,
    "cumulative_repair_cost" DECIMAL(15,2) NOT NULL,
    "current_book_value" DECIMAL(15,2) NOT NULL,
    "repair_to_book_value_ratio" DECIMAL(5,4) NOT NULL,
    "alert_threshold_triggered" DECIMAL(5,4) NOT NULL,
    "alert_level" VARCHAR(10) NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "alert_status" VARCHAR(20) NOT NULL DEFAULT 'Open',
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "action_taken" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "alert_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(10) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_display_name" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "action_required" TEXT,
    "routed_to_role" VARCHAR(30) NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "auto_resolved" BOOLEAN NOT NULL DEFAULT false,
    "auto_resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" TEXT NOT NULL,
    "operation" VARCHAR(15) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "session_id" VARCHAR(100),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "category_code" VARCHAR(20) NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSubType" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sub_type_code" VARCHAR(20) NOT NULL,
    "sub_type_name" VARCHAR(100) NOT NULL,
    "requires_certification" BOOLEAN NOT NULL DEFAULT false,
    "requires_gulf_registration" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetSubType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "asset_number" VARCHAR(20) NOT NULL,
    "sub_type_id" TEXT NOT NULL,
    "make" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "year_of_manufacture" INTEGER NOT NULL,
    "ownership_type" VARCHAR(20) NOT NULL,
    "current_status" VARCHAR(30) NOT NULL DEFAULT 'Idle',
    "current_project_id" TEXT,
    "current_operator_id" TEXT,
    "cumulative_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cumulative_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "color" VARCHAR(50),
    "notes" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineSpecification" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "engine_make" VARCHAR(100) NOT NULL,
    "engine_model" VARCHAR(100) NOT NULL,
    "engine_serial_number" VARCHAR(100) NOT NULL,
    "chassis_serial_number" VARCHAR(100) NOT NULL,
    "fuel_type" VARCHAR(20) NOT NULL,
    "displacement_liters" DECIMAL(4,1),
    "engine_configuration" VARCHAR(50),
    "rated_horsepower" INTEGER,
    "rated_torque_nm" INTEGER,
    "emission_standard" VARCHAR(30),
    "transmission_type" VARCHAR(30),
    "drive_configuration" VARCHAR(30),
    "cooling_system" VARCHAR(20),
    "fuel_tank_capacity_liters" DECIMAL(6,1) NOT NULL,
    "service_interval_oil_hours" INTEGER,
    "service_interval_oil_filter_hours" INTEGER,
    "service_interval_air_filter_hours" INTEGER,
    "service_interval_fuel_filter_hours" INTEGER,
    "service_interval_hydraulic_oil_hours" INTEGER,
    "service_interval_greasing_hours" INTEGER,
    "service_interval_full_inspection_hours" INTEGER,
    "service_interval_km" INTEGER,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "replaced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GulfRegistration" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "country_of_registration" VARCHAR(10) NOT NULL,
    "plate_number" VARCHAR(30) NOT NULL,
    "registration_cert_number" VARCHAR(100) NOT NULL,
    "registration_expiry_date" DATE NOT NULL,
    "traffic_file_number" VARCHAR(100),
    "last_inspection_date" DATE,
    "next_inspection_due_date" DATE,
    "roadworthy_certificate_number" VARCHAR(100),
    "export_cert_number" VARCHAR(100),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GulfRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "vendor_code" VARCHAR(20) NOT NULL,
    "vendor_name" VARCHAR(200) NOT NULL,
    "vendor_type" VARCHAR(50) NOT NULL,
    "contact_person" VARCHAR(100),
    "contact_phone" VARCHAR(30),
    "contact_email" VARCHAR(150),
    "address" TEXT,
    "country" VARCHAR(100),
    "trade_license_number" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "performance_score" DECIMAL(3,1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "purchase_order_number" VARCHAR(100) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_price_local" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(5) NOT NULL,
    "purchase_price_usd" DECIMAL(15,2),
    "depreciation_method" VARCHAR(30) NOT NULL,
    "useful_life_years" INTEGER NOT NULL,
    "residual_value" DECIMAL(15,2) NOT NULL,
    "capitalization_date" DATE NOT NULL,
    "current_book_value" DECIMAL(15,2) NOT NULL,
    "funding_source" VARCHAR(30) NOT NULL,
    "lessor_name" VARCHAR(200),
    "lease_monthly_payment" DECIMAL(12,2),
    "lease_end_date" DATE,
    "invoice_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "policy_number" VARCHAR(100) NOT NULL,
    "policy_type" VARCHAR(50) NOT NULL,
    "coverage_start_date" DATE NOT NULL,
    "coverage_end_date" DATE NOT NULL,
    "premium_amount" DECIMAL(12,2) NOT NULL,
    "premium_currency" VARCHAR(5) NOT NULL,
    "insured_value" DECIMAL(15,2) NOT NULL,
    "broker_name" VARCHAR(200),
    "broker_contact" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetInsuranceCoverage" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetInsuranceCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreRecord" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "tyre_serial_number" VARCHAR(100) NOT NULL,
    "tyre_brand" VARCHAR(100),
    "tyre_size" VARCHAR(50),
    "wheel_position" VARCHAR(30) NOT NULL,
    "installation_date" DATE NOT NULL,
    "installation_meter_km" DECIMAL(10,2),
    "installation_hour_meter" DECIMAL(10,2),
    "tread_depth_at_install_mm" DECIMAL(4,1),
    "current_status" VARCHAR(20) NOT NULL DEFAULT 'Fitted',
    "removal_date" DATE,
    "removal_meter_km" DECIMAL(10,2),
    "tread_depth_at_removal_mm" DECIMAL(4,1),
    "removal_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TyreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryRecord" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "battery_serial" VARCHAR(100),
    "battery_brand" VARCHAR(100),
    "battery_spec" VARCHAR(100),
    "installation_date" DATE NOT NULL,
    "removal_date" DATE,
    "removal_reason" VARCHAR(200),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatteryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCertification" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "certificate_number" VARCHAR(100) NOT NULL,
    "certificate_type" VARCHAR(100) NOT NULL,
    "test_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "safe_working_load" VARCHAR(50) NOT NULL,
    "inspector_name" VARCHAR(200),
    "certifying_body" VARCHAR(200) NOT NULL,
    "certificate_doc_url" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAttachment" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "role_code" VARCHAR(30) NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employee_code" VARCHAR(30) NOT NULL,
    "role_id" TEXT NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "nationality" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "job_title" VARCHAR(150) NOT NULL,
    "department" VARCHAR(100),
    "email" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30),
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "medical_cert_number" VARCHAR(100) NOT NULL,
    "medical_cert_expiry" DATE NOT NULL,
    "years_of_experience" INTEGER,
    "previous_employer" VARCHAR(200),
    "emergency_contact_name" VARCHAR(200),
    "emergency_contact_phone" VARCHAR(30),
    "emergency_contact_relation" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLicense" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "license_number" VARCHAR(100) NOT NULL,
    "license_category" VARCHAR(50) NOT NULL,
    "issuing_authority" VARCHAR(200) NOT NULL,
    "issuing_country" VARCHAR(10) NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "renewed_from_license_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverTrainingRecord" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "training_type" VARCHAR(100) NOT NULL,
    "training_provider" VARCHAR(200),
    "training_date" DATE NOT NULL,
    "certificate_number" VARCHAR(100),
    "expiry_date" DATE,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverTrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverBehaviorScore" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "incident_score" DECIMAL(5,2) NOT NULL,
    "fuel_score" DECIMAL(5,2) NOT NULL,
    "breakdown_attribution_score" DECIMAL(5,2) NOT NULL,
    "compliance_score" DECIMAL(5,2) NOT NULL,
    "composite_score" DECIMAL(5,2) NOT NULL,
    "risk_category" VARCHAR(10) NOT NULL,
    "incidents_last_90_days" INTEGER NOT NULL DEFAULT 0,
    "fuel_anomalies_last_30_days" INTEGER NOT NULL DEFAULT 0,
    "breakdowns_attributed_last_90_days" INTEGER NOT NULL DEFAULT 0,
    "last_computed_at" TIMESTAMP(3) NOT NULL,
    "model_version" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverBehaviorScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverBehaviorScoreHistory" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "composite_score" DECIMAL(5,2) NOT NULL,
    "risk_category" VARCHAR(10) NOT NULL,
    "incident_score" DECIMAL(5,2) NOT NULL,
    "fuel_score" DECIMAL(5,2) NOT NULL,
    "breakdown_attribution_score" DECIMAL(5,2) NOT NULL,
    "compliance_score" DECIMAL(5,2) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "model_version" VARCHAR(20) NOT NULL,

    CONSTRAINT "DriverBehaviorScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventiveMaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "service_type" VARCHAR(100) NOT NULL,
    "interval_hours" INTEGER,
    "interval_km" INTEGER,
    "last_service_date" DATE,
    "last_service_meter_hours" DECIMAL(10,2),
    "last_service_meter_km" DECIMAL(10,2),
    "next_due_date" DATE,
    "next_due_hours" DECIMAL(10,2),
    "next_due_km" DECIMAL(10,2),
    "overdue_status" VARCHAR(20) NOT NULL DEFAULT 'OK',
    "last_job_card_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventiveMaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceJobCard" (
    "id" TEXT NOT NULL,
    "job_card_number" VARCHAR(30) NOT NULL,
    "asset_id" TEXT NOT NULL,
    "job_card_type" VARCHAR(20) NOT NULL,
    "service_type" VARCHAR(100),
    "fault_description" TEXT,
    "fault_category" VARCHAR(50),
    "status" VARCHAR(40) NOT NULL DEFAULT 'Open',
    "workshop_type" VARCHAR(20) NOT NULL,
    "vendor_id" TEXT,
    "vendor_invoice_reference" VARCHAR(100),
    "project_id" TEXT,
    "yard_location_id" TEXT,
    "meter_reading_at_open_hours" DECIMAL(10,2),
    "meter_reading_at_open_km" DECIMAL(10,2),
    "meter_reading_at_close_hours" DECIMAL(10,2),
    "meter_reading_at_close_km" DECIMAL(10,2),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parts_pending_since" TIMESTAMP(3),
    "parts_expected_by" DATE,
    "completed_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "total_parts_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approval_remarks" TEXT,
    "breakdown_log_id" TEXT,
    "preventive_schedule_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceJobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCardPart" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "spare_part_id" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "part_condition" VARCHAR(20) NOT NULL DEFAULT 'New',
    "warranty_claim" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCardPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCardLabor" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "hours_worked" DECIMAL(4,2) NOT NULL,
    "labor_rate_per_hour" DECIMAL(8,2) NOT NULL,
    "total_labor_cost" DECIMAL(10,2) NOT NULL,
    "work_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCardLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownLog" (
    "id" TEXT NOT NULL,
    "breakdown_number" VARCHAR(30) NOT NULL,
    "asset_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "project_id" TEXT,
    "yard_location_id" TEXT,
    "transfer_request_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reported_by" TEXT NOT NULL,
    "symptom_description" TEXT NOT NULL,
    "fault_category" VARCHAR(50) NOT NULL,
    "asset_self_recovered" BOOLEAN NOT NULL DEFAULT false,
    "recovery_vehicle_required" BOOLEAN NOT NULL DEFAULT false,
    "response_time_minutes" INTEGER,
    "is_repeat_failure" BOOLEAN NOT NULL DEFAULT false,
    "warranty_claim_applicable" BOOLEAN NOT NULL DEFAULT false,
    "root_cause" VARCHAR(200),
    "root_cause_category" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakdownLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairWarranty" (
    "id" TEXT NOT NULL,
    "job_card_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "warranty_description" TEXT NOT NULL,
    "warranty_start_date" DATE NOT NULL,
    "warranty_end_date" DATE NOT NULL,
    "scope_of_coverage" TEXT,
    "vendor_contact_for_claims" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "claimed_at" TIMESTAMP(3),
    "claim_outcome" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "transfer_number" VARCHAR(30) NOT NULL,
    "asset_id" TEXT NOT NULL,
    "source_project_id" TEXT,
    "source_yard_id" TEXT,
    "destination_project_id" TEXT,
    "destination_yard_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_by_date" DATE,
    "transfer_reason" VARCHAR(50) NOT NULL,
    "reason_details" TEXT,
    "current_status" VARCHAR(40) NOT NULL DEFAULT 'Pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_remarks" TEXT,
    "rejection_reason" TEXT,
    "gate_pass_number" VARCHAR(100),
    "departure_date" TIMESTAMP(3),
    "arrival_date" TIMESTAMP(3),
    "driver_id" TEXT,
    "transporter_company" VARCHAR(200),
    "transporter_vehicle_plate" VARCHAR(30),
    "transporter_driver_name" VARCHAR(200),
    "waybill_number" VARCHAR(100),
    "carnet_de_passage_number" VARCHAR(100),
    "export_cert_reference" VARCHAR(100),
    "customs_clearance_reference" VARCHAR(100),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferStateHistory" (
    "id" TEXT NOT NULL,
    "transfer_request_id" TEXT NOT NULL,
    "from_status" VARCHAR(40),
    "to_status" VARCHAR(40) NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "TransferStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferInspection" (
    "id" TEXT NOT NULL,
    "transfer_request_id" TEXT NOT NULL,
    "inspection_type" VARCHAR(20) NOT NULL,
    "inspection_date" TIMESTAMP(3) NOT NULL,
    "inspected_by" TEXT NOT NULL,
    "tyre_condition" VARCHAR(10) NOT NULL,
    "tyre_condition_remark" TEXT,
    "lights_operational" VARCHAR(10) NOT NULL,
    "fluid_levels_checked" VARCHAR(10) NOT NULL,
    "body_damage_noted" BOOLEAN NOT NULL DEFAULT false,
    "body_damage_description" TEXT,
    "fuel_level_percent" INTEGER,
    "meter_reading_hours" DECIMAL(10,2),
    "meter_reading_km" DECIMAL(10,2),
    "overall_condition" VARCHAR(10) NOT NULL,
    "photos_attached" BOOLEAN NOT NULL DEFAULT false,
    "general_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "project_code" VARCHAR(30) NOT NULL,
    "project_name" VARCHAR(300) NOT NULL,
    "client_name" VARCHAR(200) NOT NULL,
    "sector" VARCHAR(50) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(10) NOT NULL,
    "site_gps_lat" DECIMAL(10,7),
    "site_gps_lng" DECIMAL(10,7),
    "start_date" DATE NOT NULL,
    "planned_completion_date" DATE NOT NULL,
    "actual_completion_date" DATE,
    "project_manager_id" TEXT NOT NULL,
    "project_status" VARCHAR(30) NOT NULL DEFAULT 'Mobilization',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseYardLocation" (
    "id" TEXT NOT NULL,
    "location_code" VARCHAR(20) NOT NULL,
    "location_name" VARCHAR(200) NOT NULL,
    "location_type" VARCHAR(30) NOT NULL,
    "city" VARCHAR(100),
    "country" VARCHAR(10),
    "gps_lat" DECIMAL(10,7),
    "gps_lng" DECIMAL(10,7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseYardLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSiteEngineerAssignment" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "assigned_from" DATE NOT NULL,
    "assigned_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSiteEngineerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSiteAssignment" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "project_id" TEXT,
    "yard_location_id" TEXT,
    "assigned_from" TIMESTAMP(3) NOT NULL,
    "assigned_to" TIMESTAMP(3),
    "assigned_by" TEXT NOT NULL,
    "transfer_request_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "AssetSiteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetOperatorAssignment" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "project_id" TEXT,
    "shift" VARCHAR(10) NOT NULL,
    "assignment_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "assigned_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetOperatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteFuelTank" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tank_code" VARCHAR(30) NOT NULL,
    "fuel_type" VARCHAR(20) NOT NULL,
    "capacity_liters" DECIMAL(10,2) NOT NULL,
    "current_balance_liters" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "location_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteFuelTank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteFuelDelivery" (
    "id" TEXT NOT NULL,
    "tank_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "delivery_date" DATE NOT NULL,
    "quantity_liters" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(8,4) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(5) NOT NULL,
    "delivery_note_number" VARCHAR(100),
    "po_reference" VARCHAR(100),
    "received_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteFuelDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tank_id" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL,
    "fuel_type" VARCHAR(20) NOT NULL,
    "quantity_liters" DECIMAL(8,2) NOT NULL,
    "meter_reading_km" DECIMAL(10,2),
    "meter_reading_hours" DECIMAL(10,2),
    "fuel_source" VARCHAR(30) NOT NULL,
    "voucher_reference" VARCHAR(100),
    "unit_price" DECIMAL(8,4),
    "total_cost" DECIMAL(12,2),
    "currency" VARCHAR(5),
    "calculated_efficiency" DECIMAL(8,4),
    "rolling_avg_efficiency" DECIMAL(8,4),
    "is_correction" BOOLEAN NOT NULL DEFAULT false,
    "corrects_log_id" TEXT,
    "entered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelAnomaly" (
    "id" TEXT NOT NULL,
    "fuel_log_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "anomaly_type" VARCHAR(50) NOT NULL,
    "expected_min" DECIMAL(8,4) NOT NULL,
    "expected_max" DECIMAL(8,4) NOT NULL,
    "actual_value" DECIMAL(8,4) NOT NULL,
    "deviation_percent" DECIMAL(6,2) NOT NULL,
    "alert_generated" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "resolution" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilizationLog" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "shift" VARCHAR(10) NOT NULL,
    "available_hours" DECIMAL(4,2) NOT NULL,
    "productive_hours" DECIMAL(4,2) NOT NULL,
    "idle_hours" DECIMAL(4,2) NOT NULL,
    "downtime_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "utilization_rate" DECIMAL(5,2) NOT NULL,
    "opening_hour_meter" DECIMAL(10,2),
    "closing_hour_meter" DECIMAL(10,2),
    "operator_remarks" TEXT,
    "entered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilizationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "part_number" VARCHAR(100) NOT NULL,
    "part_description" VARCHAR(300) NOT NULL,
    "part_category" VARCHAR(100),
    "compatible_sub_types" TEXT,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "oem_part_number" VARCHAR(100),
    "reorder_level" DECIMAL(8,2),
    "current_stock" DECIMAL(8,2) DEFAULT 0,
    "unit_cost_estimate" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti");

-- CreateIndex
CREATE INDEX "RefreshToken_employee_id_idx" ON "RefreshToken"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentReport_incident_number_key" ON "IncidentReport"("incident_number");

-- CreateIndex
CREATE INDEX "SystemAlert_entity_type_entity_id_is_acknowledged_idx" ON "SystemAlert"("entity_type", "entity_id", "is_acknowledged");

-- CreateIndex
CREATE INDEX "AuditLog_table_name_record_id_changed_at_idx" ON "AuditLog"("table_name", "record_id", "changed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_category_code_key" ON "AssetCategory"("category_code");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSubType_sub_type_code_key" ON "AssetSubType"("sub_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_asset_number_key" ON "Asset"("asset_number");

-- CreateIndex
CREATE UNIQUE INDEX "EngineSpecification_asset_id_key" ON "EngineSpecification"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "EngineSpecification_engine_serial_number_key" ON "EngineSpecification"("engine_serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "EngineSpecification_chassis_serial_number_key" ON "EngineSpecification"("chassis_serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "GulfRegistration_asset_id_key" ON "GulfRegistration"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "GulfRegistration_plate_number_key" ON "GulfRegistration"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendor_code_key" ON "Vendor"("vendor_code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRecord_asset_id_key" ON "PurchaseRecord"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_policy_number_key" ON "InsurancePolicy"("policy_number");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCertification_certificate_number_key" ON "EquipmentCertification"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "Role_role_code_key" ON "Role"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_code_key" ON "Employee"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_employee_id_key" ON "Driver"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "DriverBehaviorScore_driver_id_key" ON "DriverBehaviorScore"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceJobCard_job_card_number_key" ON "MaintenanceJobCard"("job_card_number");

-- CreateIndex
CREATE INDEX "MaintenanceJobCard_asset_id_opened_at_idx" ON "MaintenanceJobCard"("asset_id", "opened_at" DESC);

-- CreateIndex
CREATE INDEX "MaintenanceJobCard_status_idx" ON "MaintenanceJobCard"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BreakdownLog_breakdown_number_key" ON "BreakdownLog"("breakdown_number");

-- CreateIndex
CREATE INDEX "BreakdownLog_asset_id_occurred_at_idx" ON "BreakdownLog"("asset_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "BreakdownLog_driver_id_occurred_at_idx" ON "BreakdownLog"("driver_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RepairWarranty_job_card_id_key" ON "RepairWarranty"("job_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequest_transfer_number_key" ON "TransferRequest"("transfer_number");

-- CreateIndex
CREATE INDEX "TransferRequest_current_status_idx" ON "TransferRequest"("current_status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_project_code_key" ON "Project"("project_code");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseYardLocation_location_code_key" ON "WarehouseYardLocation"("location_code");

-- CreateIndex
CREATE INDEX "AssetSiteAssignment_asset_id_assigned_from_idx" ON "AssetSiteAssignment"("asset_id", "assigned_from" DESC);

-- CreateIndex
CREATE INDEX "AssetSiteAssignment_project_id_idx" ON "AssetSiteAssignment"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteFuelTank_tank_code_key" ON "SiteFuelTank"("tank_code");

-- CreateIndex
CREATE INDEX "FuelLog_asset_id_logged_at_idx" ON "FuelLog"("asset_id", "logged_at" DESC);

-- CreateIndex
CREATE INDEX "FuelLog_project_id_logged_at_idx" ON "FuelLog"("project_id", "logged_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "FuelAnomaly_fuel_log_id_key" ON "FuelAnomaly"("fuel_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_part_number_key" ON "SparePart"("part_number");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_yard_location_id_fkey" FOREIGN KEY ("yard_location_id") REFERENCES "WarehouseYardLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_investigated_by_fkey" FOREIGN KEY ("investigated_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMedia" ADD CONSTRAINT "IncidentMedia_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "IncidentReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMedia" ADD CONSTRAINT "IncidentMedia_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetKPISnapshot" ADD CONSTRAINT "AssetKPISnapshot_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictiveMaintenanceScore" ADD CONSTRAINT "PredictiveMaintenanceScore_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelForecast" ADD CONSTRAINT "FuelForecast_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementAlert" ADD CONSTRAINT "ReplacementAlert_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementAlert" ADD CONSTRAINT "ReplacementAlert_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSubType" ADD CONSTRAINT "AssetSubType_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "AssetSubType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_current_project_id_fkey" FOREIGN KEY ("current_project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_current_operator_id_fkey" FOREIGN KEY ("current_operator_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineSpecification" ADD CONSTRAINT "EngineSpecification_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GulfRegistration" ADD CONSTRAINT "GulfRegistration_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetInsuranceCoverage" ADD CONSTRAINT "AssetInsuranceCoverage_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetInsuranceCoverage" ADD CONSTRAINT "AssetInsuranceCoverage_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreRecord" ADD CONSTRAINT "TyreRecord_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryRecord" ADD CONSTRAINT "BatteryRecord_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCertification" ADD CONSTRAINT "EquipmentCertification_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCertification" ADD CONSTRAINT "EquipmentCertification_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAttachment" ADD CONSTRAINT "DocumentAttachment_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_renewed_from_license_id_fkey" FOREIGN KEY ("renewed_from_license_id") REFERENCES "DriverLicense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTrainingRecord" ADD CONSTRAINT "DriverTrainingRecord_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverBehaviorScore" ADD CONSTRAINT "DriverBehaviorScore_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverBehaviorScoreHistory" ADD CONSTRAINT "DriverBehaviorScoreHistory_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveMaintenanceSchedule" ADD CONSTRAINT "PreventiveMaintenanceSchedule_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveMaintenanceSchedule" ADD CONSTRAINT "PreventiveMaintenanceSchedule_last_job_card_id_fkey" FOREIGN KEY ("last_job_card_id") REFERENCES "MaintenanceJobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_yard_location_id_fkey" FOREIGN KEY ("yard_location_id") REFERENCES "WarehouseYardLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_breakdown_log_id_fkey" FOREIGN KEY ("breakdown_log_id") REFERENCES "BreakdownLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJobCard" ADD CONSTRAINT "MaintenanceJobCard_preventive_schedule_id_fkey" FOREIGN KEY ("preventive_schedule_id") REFERENCES "PreventiveMaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardPart" ADD CONSTRAINT "JobCardPart_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "MaintenanceJobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardPart" ADD CONSTRAINT "JobCardPart_spare_part_id_fkey" FOREIGN KEY ("spare_part_id") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardLabor" ADD CONSTRAINT "JobCardLabor_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "MaintenanceJobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardLabor" ADD CONSTRAINT "JobCardLabor_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownLog" ADD CONSTRAINT "BreakdownLog_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownLog" ADD CONSTRAINT "BreakdownLog_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownLog" ADD CONSTRAINT "BreakdownLog_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownLog" ADD CONSTRAINT "BreakdownLog_yard_location_id_fkey" FOREIGN KEY ("yard_location_id") REFERENCES "WarehouseYardLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownLog" ADD CONSTRAINT "BreakdownLog_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairWarranty" ADD CONSTRAINT "RepairWarranty_job_card_id_fkey" FOREIGN KEY ("job_card_id") REFERENCES "MaintenanceJobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairWarranty" ADD CONSTRAINT "RepairWarranty_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_source_yard_id_fkey" FOREIGN KEY ("source_yard_id") REFERENCES "WarehouseYardLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_destination_project_id_fkey" FOREIGN KEY ("destination_project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_destination_yard_id_fkey" FOREIGN KEY ("destination_yard_id") REFERENCES "WarehouseYardLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferStateHistory" ADD CONSTRAINT "TransferStateHistory_transfer_request_id_fkey" FOREIGN KEY ("transfer_request_id") REFERENCES "TransferRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferStateHistory" ADD CONSTRAINT "TransferStateHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferInspection" ADD CONSTRAINT "TransferInspection_transfer_request_id_fkey" FOREIGN KEY ("transfer_request_id") REFERENCES "TransferRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferInspection" ADD CONSTRAINT "TransferInspection_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSiteEngineerAssignment" ADD CONSTRAINT "ProjectSiteEngineerAssignment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSiteEngineerAssignment" ADD CONSTRAINT "ProjectSiteEngineerAssignment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSiteAssignment" ADD CONSTRAINT "AssetSiteAssignment_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSiteAssignment" ADD CONSTRAINT "AssetSiteAssignment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSiteAssignment" ADD CONSTRAINT "AssetSiteAssignment_yard_location_id_fkey" FOREIGN KEY ("yard_location_id") REFERENCES "WarehouseYardLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSiteAssignment" ADD CONSTRAINT "AssetSiteAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetOperatorAssignment" ADD CONSTRAINT "AssetOperatorAssignment_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetOperatorAssignment" ADD CONSTRAINT "AssetOperatorAssignment_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetOperatorAssignment" ADD CONSTRAINT "AssetOperatorAssignment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetOperatorAssignment" ADD CONSTRAINT "AssetOperatorAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteFuelTank" ADD CONSTRAINT "SiteFuelTank_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteFuelDelivery" ADD CONSTRAINT "SiteFuelDelivery_tank_id_fkey" FOREIGN KEY ("tank_id") REFERENCES "SiteFuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteFuelDelivery" ADD CONSTRAINT "SiteFuelDelivery_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteFuelDelivery" ADD CONSTRAINT "SiteFuelDelivery_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_tank_id_fkey" FOREIGN KEY ("tank_id") REFERENCES "SiteFuelTank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_corrects_log_id_fkey" FOREIGN KEY ("corrects_log_id") REFERENCES "FuelLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelAnomaly" ADD CONSTRAINT "FuelAnomaly_fuel_log_id_fkey" FOREIGN KEY ("fuel_log_id") REFERENCES "FuelLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelAnomaly" ADD CONSTRAINT "FuelAnomaly_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelAnomaly" ADD CONSTRAINT "FuelAnomaly_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizationLog" ADD CONSTRAINT "UtilizationLog_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizationLog" ADD CONSTRAINT "UtilizationLog_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizationLog" ADD CONSTRAINT "UtilizationLog_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizationLog" ADD CONSTRAINT "UtilizationLog_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
