/**
 * Strongly typed models that mirror the Supabase schema (supabase/migrations).
 * Keep in sync with the migrations; regenerate with `supabase gen types` if you prefer
 * generated types — these hand-written models are what the service layer returns.
 */

export type UserRole =
  | "patient"
  | "hospital_staff"
  | "hospital_admin"
  | "referral_coordinator"
  | "government_admin"
  | "super_admin";

export type AvailabilityStatus = "available" | "limited" | "unavailable";
export type DoctorStatus = "active" | "inactive";
export type UrgencyLevel = "routine" | "moderate" | "urgent";
export type ReferralStatus = "pending" | "accepted" | "rejected" | "scheduled" | "completed" | "cancelled";
export type VisitStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type FollowupStatus = "scheduled" | "completed" | "missed" | "rescheduled" | "cancelled";
export type InventoryTransactionType = "stock_in" | "stock_out" | "adjustment" | "expiry" | "return";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type JourneyStage =
  | "need_submitted"
  | "assessment_completed"
  | "facility_identified"
  | "availability_confirmed"
  | "visit"
  | "referral"
  | "followup"
  | "completed";
export type JourneyStatus = "active" | "completed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  preferred_language: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: UserRole;
  granted_by: string | null;
  created_at: string;
}

export type OperatingHours = Record<string, { open: string; close: string; closed?: boolean } | string>;

export interface Facility {
  id: string;
  name: string;
  facility_type: string;
  registration_number: string | null;
  address: string;
  district: string;
  state: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  operating_hours: OperatingHours | null;
  is_verified: boolean;
  is_active: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacilityStaff {
  id: string;
  facility_id: string;
  user_id: string;
  designation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  facility_id: string;
  name: string;
  description: string | null;
  status: AvailabilityStatus;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacilityService {
  id: string;
  facility_id: string;
  name: string;
  description: string | null;
  status: AvailabilityStatus;
  last_verified_at: string | null;
  last_verified_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DiagnosticService = FacilityService;

export interface Doctor {
  id: string;
  facility_id: string;
  department_id: string | null;
  full_name: string;
  specialization: string | null;
  registration_number: string | null;
  qualification: string | null;
  phone: string | null;
  email: string | null;
  status: DoctorStatus;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  status: AvailabilityStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  unit: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicineInventory {
  id: string;
  facility_id: string;
  medicine_id: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number | null;
  unit: string | null;
  is_active: boolean;
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryLine extends MedicineInventory {
  medicine: Pick<Medicine, "id" | "name" | "generic_name" | "strength" | "dosage_form" | "unit"> | null;
  facility?: Pick<Facility, "id" | "name" | "district"> | null | undefined;
  stock_status: StockStatus;
}

export interface InventoryTransaction {
  id: string;
  facility_id: string;
  medicine_id: string;
  inventory_id: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AssessmentResponses {
  summary?: string;
  duration?: string;
  severity?: string;
  warning_signs?: string[];
  district?: string;
  state?: string;
  [key: string]: unknown;
}

export interface DecisionSupportOutput {
  rationale?: string;
  safety_flags?: string[];
  source?: string;
  model?: string | null;
  generated_at?: string;
  disclaimer?: string;
}

export interface Assessment {
  id: string;
  patient_id: string;
  assessment_type: string;
  symptom_summary: string | null;
  responses: AssessmentResponses;
  urgency_level: UrgencyLevel | null;
  recommended_care_level: string | null;
  recommended_department: string | null;
  decision_support_output: DecisionSupportOutput | null;
  disclaimer_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientJourney {
  id: string;
  patient_id: string;
  assessment_id: string | null;
  current_stage: JourneyStage;
  status: JourneyStatus;
  selected_facility_id: string | null;
  selected_department_id: string | null;
  availability_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacilityRef {
  id: string;
  name: string;
  district?: string;
  state?: string;
  facility_type?: string;
}

export interface Referral {
  id: string;
  patient_id: string;
  source_facility_id: string | null;
  destination_facility_id: string;
  department_id: string | null;
  assessment_id: string | null;
  reason: string;
  status: ReferralStatus;
  status_note: string | null;
  created_by: string | null;
  accepted_by: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralWithRefs extends Referral {
  source: FacilityRef | null;
  destination: FacilityRef | null;
  department: { id: string; name: string } | null;
}

export interface ReferralStatusHistory {
  id: string;
  referral_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  facility_id: string;
  referral_id: string | null;
  department_id: string | null;
  visit_date: string;
  status: VisitStatus;
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitWithRefs extends Visit {
  facility: FacilityRef | null;
  department: { id: string; name: string } | null;
}

export interface Followup {
  id: string;
  patient_id: string;
  visit_id: string | null;
  referral_id: string | null;
  scheduled_date: string;
  followup_type: string | null;
  instructions: string | null;
  status: FollowupStatus;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupWithRefs extends Followup {
  visit: { id: string; facility_id: string; visit_date: string; facility: FacilityRef | null } | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string } | null;
}

/** Minimum-necessary patient view returned by public.authorized_patients(). */
export interface PatientBrief {
  id: string;
  full_name: string;
  phone: string | null;
  gender: string | null;
  district: string | null;
  state: string | null;
}

export interface NamedStatus {
  name: string;
  status: AvailabilityStatus;
}

export interface FacilitySummary {
  facility_id: string;
  name: string;
  facility_type: string;
  address: string;
  district: string;
  state: string;
  phone: string | null;
  is_verified: boolean;
  distance_km: number | null;
  departments: NamedStatus[];
  services: NamedStatus[];
  diagnostics: NamedStatus[];
  available_doctor_slots: number;
  last_updated_at: string | null;
}

export interface MedicineAvailability {
  medicine_id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  stock_status: StockStatus;
  updated_at: string;
}

export interface DoctorSlot {
  doctor_id: string;
  full_name: string;
  specialization: string | null;
  department_name: string | null;
  availability_date: string;
  start_time: string;
  end_time: string;
  status: AvailabilityStatus;
}

export interface UserWithRoles extends Profile {
  roles: UserRole[];
}
