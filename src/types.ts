export enum Role {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  EXECUTIVE = "EXECUTIVE",
  ADMIN = "ADMIN",
}

export enum LeadSource {
  PHONE = "PHONE",
  MISSED_CALL = "MISSED_CALL",
  WHATSAPP = "WHATSAPP",
  WEBSITE = "WEBSITE",
  META = "META",
  GOOGLE = "GOOGLE",
  EMAIL = "EMAIL",
  PORTAL = "PORTAL",
  MANUAL = "MANUAL",
}

export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  SITE_VISIT_SCHEDULED = "SITE_VISIT_SCHEDULED",
  SITE_VISITED = "SITE_VISITED",
  BOOKED = "BOOKED",
  LOST = "LOST",
  NURTURE = "NURTURE",
}

export enum BuyerType {
  FAMILY_BUYER = "FAMILY_BUYER",
  INVESTOR = "INVESTOR",
  FIRST_TIME_BUYER = "FIRST_TIME_BUYER",
  NRI = "NRI",
  COMPARISON_SHOPPER = "COMPARISON_SHOPPER",
  UNKNOWN = "UNKNOWN",
}

export enum PurchaseTimeline {
  IMMEDIATE = "IMMEDIATE",
  WITHIN_3_MONTHS = "WITHIN_3_MONTHS",
  THREE_TO_SIX_MONTHS = "THREE_TO_SIX_MONTHS",
  SIX_TO_TWELVE_MONTHS = "SIX_TO_TWELVE_MONTHS",
  LONG_TERM = "LONG_TERM",
  UNKNOWN = "UNKNOWN",
}

export enum Priority {
  HOT = "HOT",
  WARM = "WARM",
  NURTURE = "NURTURE",
  COLD = "COLD",
}

export type EngagementQuality = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type CallbackResponsiveness =
  | "RESPONSIVE"
  | "DELAYED"
  | "UNRESPONSIVE"
  | "UNKNOWN";

export interface HandoffSignals {
  price_negotiation?: boolean;
  booking_request?: boolean;
  compliance_question?: boolean;
  angry_or_confused?: boolean;
  human_requested?: boolean;
  serious_competitor_comparison?: boolean;
}

export interface ScoreComponent {
  normalized: number;
  weight: number;
  contribution: number;
}

export enum Channel {
  CALL = "CALL",
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  FORM = "FORM",
  MANUAL = "MANUAL",
}

export enum HandoffReason {
  HOT_LEAD = "HOT_LEAD",
  SITE_VISIT_REQUEST = "SITE_VISIT_REQUEST",
  PRICE_NEGOTIATION = "PRICE_NEGOTIATION",
  LEGAL_RERA_QUERY = "LEGAL_RERA_QUERY",
  BOOKING_REQUEST = "BOOKING_REQUEST",
  HIGH_BUDGET_BUYER = "HIGH_BUDGET_BUYER",
  ANGRY_BUYER = "ANGRY_BUYER",
  HUMAN_REQUESTED = "HUMAN_REQUESTED",
  COMPETITOR_COMPARISON = "COMPETITOR_COMPARISON",
}

export enum SiteVisitStatus {
  REQUESTED = "REQUESTED",
  TENTATIVE = "TENTATIVE",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
  RESCHEDULED = "RESCHEDULED",
  CANCELLED = "CANCELLED",
}

export interface Project {
  id: string;
  name: string;
  location: string;
  developer_name: string;
  rera_number: string;
  price_min: number; // in INR
  price_max: number; // in INR
  possession_date: string;
  description: string;
  brochure_url?: string;
  location_pin_url?: string;
  floor_plan_url?: string;
  active: boolean;
  amenities: string[];
  faqs: { question: string; answer: string }[];
  working_hours?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
  project_assignments: string[]; // Project IDs
  max_hot_leads_per_day: number;
  current_active_leads?: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  project_id: string;
  status: LeadStatus;
  buyer_type: BuyerType;
  apartment_preference: string; // e.g. "2BHK", "3BHK", "Penthouse"
  budget_min: number; // in INR
  budget_max: number; // in INR
  purchase_timeline: PurchaseTimeline;
  site_visit_interest: boolean;
  engagement_quality: EngagementQuality;
  callback_responsiveness: CallbackResponsiveness;
  handoff_signals: HandoffSignals;
  score: number; // 1 to 10
  priority: Priority;
  score_components: Record<string, ScoreComponent>;
  scoring_version: string;
  score_explanation: string;
  recalculated_at?: string;
  assigned_to?: string; // User ID
  sla_deadline?: string; // ISO date string
  first_response_at?: string;
  last_contacted_at?: string;
  next_followup_at?: string;
  ai_summary?: string;
  recommended_next_action?: string;
  key_questions?: string[];
  objections?: string[];
  created_at: string;
  updated_at: string;
  isAfterHours?: boolean;
}

export interface Conversation {
  id: string;
  lead_id: string;
  channel: Channel;
  transcript: { speaker: "buyer" | "ai" | "human"; text: string; time: string }[];
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  key_questions: string[];
  objections: string[];
  created_at: string;
}

export interface Handoff {
  id: string;
  lead_id: string;
  assigned_to: string; // User ID
  reason: HandoffReason;
  priority: Priority;
  sla_deadline: string;
  status: "PENDING" | "CONTACTED" | "ESCALATED" | "RESOLVED";
  escalation_level: number;
  escalated_to?: string; // User ID (Manager)
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  project_id: string;
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string; // HH:MM
  visitors_count: number;
  buyer_location?: string;
  needs_directions: boolean;
  family_attending: boolean;
  status: SiteVisitStatus;
  outcome?: string; // note of what happened
  reminder_status: "SENT" | "PENDING" | "SKIPPED";
  created_at: string;
  updated_at: string;
}

export interface SlaEvent {
  id: string;
  lead_id: string;
  handoff_id?: string;
  assigned_to: string; // User ID
  event_type: "FIRST_RESPONSE" | "FOLLOW_UP" | "SITE_VISIT_CONFIRMATION";
  due_at: string;
  completed_at?: string;
  breached: boolean;
  escalation_level: number; // 0: None, 1: Ex, 2: Mgr, 3: Exec Head
  created_at: string;
}

export interface FollowupTask {
  id: string;
  lead_id: string;
  assigned_to: string; // User ID
  task_type: "CALLBACK" | "SEND_BROCHURE" | "CONFIRM_VISIT" | "POST_VISIT_FEEDBACK" | "CUSTOM";
  due_at: string;
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  notes?: string;
  site_visit_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  type: "LEAD_CREATED" | "CONVERSATION" | "HANDOFF" | "SITE_VISIT" | "TASK" | "SLA" | "AUDIT";
  occurred_at: string;
  title: string;
  data: Record<string, unknown>;
}
