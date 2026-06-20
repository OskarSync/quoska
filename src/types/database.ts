// Database row types matching the Supabase schema exactly.
// Reference: supabase/migrations/

export interface Tenant {
  id: string;
  name: string;
  plan: "free" | "team" | "pro";
  stripe_customer_id: string | null;
  bundesland: string | null;
  setup_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  target_hours_week: number;
  bundesland: string | null;
  invitation_token: string | null;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TimeEntry {
  id: string;
  tenant_id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  status: "running" | "paused" | "completed";
  notes: string | null;
  // Optional: a time entry may have no project assigned (DB column defaults to NULL).
  // Made optional so legacy mocks and freshly-created entries are valid.
  project_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BreakSession {
  id: string;
  tenant_id: string;
  time_entry_id: string;
  break_start: string;
  break_end: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryAudit {
  id: string;
  time_entry_id: string;
  tenant_id: string;
  changed_by: string | null;
  action: "create" | "update" | "delete" | "pause" | "resume";
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_at: string;
}

export interface CorrectionRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  time_entry_id: string;
  proposed_change: Record<string, unknown> | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  bundesland: string;
  created_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  employee_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SubscriptionEvent {
  id: string;
  tenant_id: string;
  stripe_event_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  processed: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  type: "urlaub" | "sonderurlaub" | "unbezahlt";
  start_date: string;
  end_date: string;
  work_days_count: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LeaveEntitlement {
  id: string;
  tenant_id: string;
  employee_id: string;
  year: number;
  total_days: number;
  carried_over: number;
  created_at: string;
  updated_at: string;
}

export interface SickEntry {
  id: string;
  tenant_id: string;
  employee_id: string;
  start_date: string;
  end_date: string | null;
  work_days_count: number | null;
  au_certificate_url: string | null;
  au_uploaded_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  customer_name: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectAssignment {
  id: string;
  tenant_id: string;
  project_id: string;
  employee_id: string;
  created_at: string;
}
