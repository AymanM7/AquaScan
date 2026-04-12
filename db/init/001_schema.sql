-- PostGIS required for GEOMETRY columns (Phase 00 schema assumes PostGIS enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Core building data
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polygon GEOMETRY(POLYGON, 4326) NOT NULL,
  centroid GEOMETRY(POINT, 4326) NOT NULL,
  state VARCHAR(2) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  zip VARCHAR(10),
  sector VARCHAR(50),         -- 'Data Center','Logistics','Manufacturing','Hospital','University'
  roof_sqft INTEGER NOT NULL,
  effective_catchment_sqft INTEGER,    -- gross minus obstructions (HVAC, skylights)
  usable_footprint_sqft INTEGER,      -- after setbacks & access paths
  area_confidence FLOAT,       -- 0.0–1.0
  name VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_buildings_state ON buildings(state);
CREATE INDEX idx_buildings_polygon ON buildings USING GIST(polygon);

-- Computer vision results
CREATE TABLE cv_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  ct_detected BOOLEAN DEFAULT FALSE,
  ct_confidence FLOAT,          -- 0.0–1.0
  ct_count INTEGER DEFAULT 0,   -- number of cooling towers
  ct_type VARCHAR(100),         -- 'Induced-Draft Rectangular','Cross-Flow','Forced-Draft'
  ct_arrangement VARCHAR(100),  -- 'Clustered, NW corner','Distributed'
  ct_demand_tier VARCHAR(20),   -- 'High','Medium','None'
  est_cooling_consumption_gal_yr FLOAT,  -- estimated annual cooling water
  ct_boxes JSONB,               -- [{x,y,w,h,confidence}, ...]
  roof_mask_url TEXT,
  roof_confidence FLOAT,
  effective_mask_url TEXT,       -- mask for effective catchment
  usable_mask_url TEXT,          -- mask for usable footprint
  imagery_source VARCHAR(50),   -- 'NAIP','Sentinel-2'
  analysis_date DATE,
  raw_chip_url TEXT,
  masked_chip_url TEXT,
  gemini_analysis_text TEXT
);

-- Climate and environmental data
CREATE TABLE climate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  annual_rain_inches FLOAT,
  drought_score INTEGER,        -- 0–4 (D0–D4)
  drought_label VARCHAR(10),    -- 'None','D0','D1','D2','D3','D4'
  flood_zone VARCHAR(10),       -- 'AE','X','AO', etc.
  fema_class VARCHAR(50),
  fema_flood_risk FLOAT,        -- 0.0–1.0
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial and utility data
CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  city_id VARCHAR(50),
  water_rate_per_kgal FLOAT,
  sewer_rate_per_kgal FLOAT,
  stormwater_fee_annual FLOAT,
  stormwater_eru_rate FLOAT,
  utility_source TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- City incentive adapters
CREATE TABLE incentive_adapters (
  city_id VARCHAR(50) PRIMARY KEY,
  city_name VARCHAR(100),
  state VARCHAR(2),
  rebate_usd INTEGER,
  mandate_threshold_sqft INTEGER,
  sales_tax_exempt BOOLEAN,
  property_tax_exempt BOOLEAN,
  stormwater_credit_pct FLOAT,
  green_infra_grant_max INTEGER,
  program_name TEXT,
  description TEXT,
  adapter_json JSONB
);

-- Corporate and ESG data
CREATE TABLE corporate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  owner_name TEXT,
  sec_cik VARCHAR(20),
  esg_score FLOAT,
  water_mentions INTEGER,
  filing_year INTEGER,
  leed_certified BOOLEAN,
  leed_level VARCHAR(20),
  esg_accelerator BOOLEAN DEFAULT FALSE,  -- >5 water mentions
  ticker VARCHAR(10),
  corporate_parent TEXT
);

-- Computed viability scores
CREATE TABLE viability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) UNIQUE,
  final_score FLOAT NOT NULL,             -- 0–100, confidence-adjusted
  score_raw FLOAT,                        -- pre-confidence-adjustment
  physical_score FLOAT,                   -- 0–40
  economic_score FLOAT,                   -- 0–35
  strategic_score FLOAT,                  -- 0–25
  wrai FLOAT,                             -- 0–100 Water Resilience Alpha Index
  genome_archetype VARCHAR(100),
  confidence_composite FLOAT,
  last_computed TIMESTAMPTZ DEFAULT NOW()
);

-- Alert/shock events
CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,  -- 'drought','ordinance','rate','sec','incentive'
  state VARCHAR(2),
  city VARCHAR(100),
  building_ids UUID[],
  score_delta FLOAT,
  description TEXT,
  source TEXT,
  event_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (onboarding config)
CREATE TABLE user_settings (
  user_id VARCHAR(200) PRIMARY KEY,  -- Auth0 user ID
  territory VARCHAR(50) DEFAULT 'DFW',
  cadence VARCHAR(20) DEFAULT 'weekly',  -- 'daily','weekly','biweekly'
  score_threshold INTEGER DEFAULT 75,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  rep_zip VARCHAR(10),
  notification_email BOOLEAN DEFAULT TRUE,
  voice_model VARCHAR(50) DEFAULT 'rachel',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation run history
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(200) REFERENCES user_settings(user_id),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  buildings_scanned INTEGER,
  crossings_count INTEGER,
  reports_dispatched INTEGER,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending','running','completed','failed'
  error_message TEXT,
  completed_at TIMESTAMPTZ
);

-- Automation intelligence reports
CREATE TABLE automation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES automation_runs(id),
  building_id UUID REFERENCES buildings(id),
  score_at_trigger FLOAT NOT NULL,
  sonar_raw_json JSONB,
  ownership_data JSONB,
  contact_data JSONB,
  outreach_scripts JSONB,   -- {cold_email, linkedin, phone}
  routed_to_rep_id VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rep notification inbox
CREATE TABLE rep_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES automation_reports(id),
  rep_id VARCHAR(200),
  read_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  action_type VARCHAR(50),  -- 'approved','rejected','sent'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ElevenLabs login debriefs
CREATE TABLE login_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(200) REFERENCES user_settings(user_id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  script_text TEXT NOT NULL,
  elevenlabs_audio_url TEXT,
  played_at TIMESTAMPTZ
);

-- Per-building incentive stack (aggregated applicable programs)
CREATE TABLE incentive_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  applicable_programs JSONB NOT NULL DEFAULT '[]',  -- [{program_name, type, value, eligibility, source_url}]
  combined_estimate_usd FLOAT DEFAULT 0,
  stack_generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Texas reference case (Grundfos CBS Brookshire)
CREATE TABLE texas_reference_case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(200) NOT NULL,
  project_value_usd FLOAT NOT NULL,
  abatement_pct FLOAT NOT NULL,
  abatement_years INTEGER NOT NULL,
  county_tax_rate FLOAT NOT NULL,
  annual_savings_usd FLOAT NOT NULL,
  total_savings_usd FLOAT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
