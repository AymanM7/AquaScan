export type OwnershipRow = {
  field: string;
  value: string;
  confidence: string;
  source: string;
};

export type ContactData = {
  name: string;
  title: string;
  company: string;
  email?: string | null;
  linkedin?: string | null;
};

export type AutomationReportDetail = {
  id: string;
  building_id: string;
  building_name: string;
  building_address: string;
  score_at_trigger: number;
  genome_archetype: string;
  run_at: string;
  threshold_at_trigger: number;
  routed_to_rep_id: string | null;
  ownership: OwnershipRow[];
  contact: ContactData;
  recent_news: string | null;
  esg_commitments: string | null;
  roof_sqft: number;
  annual_gallons: number;
  payback_years: number;
  ct_detected: boolean;
  drought_label: string;
  applicable_incentives: string;
  outreach_scripts: {
    cold_email: { subject: string; body: string };
    linkedin: string;
    phone: string;
  };
  score_rationale: {
    overall_line: string;
    pillars: { label: string; score: number; max_points: number; detail: string }[];
    why_now: { icon: string; label: string; points: number; timing: string }[];
    counterfactual_line: string;
  };
};
