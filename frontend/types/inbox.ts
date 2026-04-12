export type InboxNotificationItem = {
  id: string;
  report_id: string;
  building_name: string;
  building_address: string;
  score_at_trigger: number;
  threshold: number;
  genome_archetype: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_company: string | null;
  run_label: string;
  run_at: string | null;
  read_at: string | null;
};
