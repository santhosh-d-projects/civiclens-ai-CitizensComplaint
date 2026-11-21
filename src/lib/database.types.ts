// Hand-written database types for Complaint-Sathi (mirrors
// supabase/migrations/01_supabase_schema.sql + 02_additions.sql).
// The master prompt asks for `supabase gen types`; the CLI is not available
// in this environment, so these are maintained by hand and must be updated
// whenever the schema changes.
export type UserRole = "citizen" | "department_officer" | "admin";
export type DeptStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved"
  | "active"
  | "suspended"
  | "deactivated"
  | "rejected";
export type ComplaintStatus =
  | "submitted"
  | "received"
  | "in_progress"
  | "resolved"
  | "closed"
  | "reopened";
export type Severity = "low" | "medium" | "high" | "critical";

export type Ward = {
  id: number;
  name: string;
  zone: string;
};
export type Category = {
  id: number;
  slug: string;
  name: string;
  default_severity: Severity;
};
export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  created_at: string;
};
export type Department = {
  id: string;
  name: string;
  description: string | null;
  official_email: string;
  official_phone: string | null;
  applicant_name: string | null;
  status: DeptStatus;
  source: "applied" | "admin_created";
  previous_application_id: string | null;
  created_by: string | null;
  status_reason: string | null;
  status_changed_at: string;
  created_at: string;
};
export type DepartmentOfficer = {
  id: string;
  department_id: string;
  profile_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  invite_used_at: string | null;
  created_at: string;
};
export type DepartmentDocument = {
  id: string;
  department_id: string;
  name: string;
  file_path: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
};
export type Complaint = {
  id: string;
  ticket_no: string;
  citizen_id: string;
  title: string;
  description: string;
  language: string | null;
  category_id: number | null;
  severity: Severity;
  ai_category_id: number | null;
  ai_severity: Severity | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  ai_suggested_department_id: string | null;
  citizen_changed_suggestion: boolean;
  department_id: string;
  ward_id: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photo_paths: string[];
  status: ComplaintStatus;
  sla_due_at: string | null;
  resolution_note: string | null;
  resolution_photo_paths: string[];
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ComplaintEvent = {
  id: number;
  complaint_id: string;
  event: string;
  actor_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
export type ComplaintTransfer = {
  id: number;
  complaint_id: string;
  from_department_id: string;
  to_department_id: string;
  admin_id: string;
  reason: string;
  created_at: string;
};
export type AuditLogRow = {
  seq: number;
  event_id: string;
  ts: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  ip: string | null;
  device: string | null;
  meta: Record<string, unknown>;
  prev_hash: string;
  record_hash: string;
};
export type AuditKey = {
  key_id: string;
  public_key: string;
  algorithm: string;
  fingerprint: string;
  valid_from: string;
  valid_to: string | null;
  revoked_at: string | null;
};
export type AuditSignature = {
  audit_seq: number;
  key_id: string;
  signature: string;
  signed_at: string;
};
export type AiAnalysisLog = {
  id: number;
  user_id: string | null;
  complaint_id: string | null;
  provider: string;
  model: string;
  language: string | null;
  ward_id: number | null;
  category_slug: string | null;
  severity: Severity | null;
  confidence: number | null;
  source: string;
  latency_ms: number | null;
  created_at: string;
};
export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

// Minimal Database shape for the Supabase client generics (tables used
// with .from() get real typing; functions are called via .rpc with
// explicit argument types at the call site).
export interface Database {
  public: {
    Tables: {
      wards: { Row: Ward; Insert: Partial<Ward>; Update: Partial<Ward>; Relationships: [] };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category>; Relationships: [] };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      departments: { Row: Department; Insert: Partial<Department>; Update: Partial<Department>; Relationships: [] };
      department_wards: { Row: { department_id: string; ward_id: number }; Insert: Partial<{ department_id: string; ward_id: number }>; Update: Partial<{ department_id: string; ward_id: number }>; Relationships: [] };
      department_categories: { Row: { department_id: string; category_id: number }; Insert: Partial<{ department_id: string; category_id: number }>; Update: Partial<{ department_id: string; category_id: number }>; Relationships: [] };
      department_officers: { Row: DepartmentOfficer; Insert: Partial<DepartmentOfficer>; Update: Partial<DepartmentOfficer>; Relationships: [] };
      department_documents: { Row: DepartmentDocument; Insert: Partial<DepartmentDocument>; Update: Partial<DepartmentDocument>; Relationships: [] };
      complaints: { Row: Complaint; Insert: Partial<Complaint>; Update: Partial<Complaint>; Relationships: [] };
      complaint_events: { Row: ComplaintEvent; Insert: Partial<ComplaintEvent>; Update: Partial<ComplaintEvent>; Relationships: [] };
      complaint_transfers: { Row: ComplaintTransfer; Insert: Partial<ComplaintTransfer>; Update: Partial<ComplaintTransfer>; Relationships: [] };
      audit_log: { Row: AuditLogRow; Insert: Partial<AuditLogRow>; Update: Partial<AuditLogRow>; Relationships: [] };
      audit_keys: { Row: AuditKey; Insert: Partial<AuditKey>; Update: Partial<AuditKey>; Relationships: [] };
      audit_signatures: { Row: AuditSignature; Insert: Partial<AuditSignature>; Update: Partial<AuditSignature>; Relationships: [] };
      ai_analysis_log: { Row: AiAnalysisLog; Insert: Partial<AiAnalysisLog>; Update: Partial<AiAnalysisLog>; Relationships: [] };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
