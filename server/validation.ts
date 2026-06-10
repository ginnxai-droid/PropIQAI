import { z } from "zod";
import { roles } from "./authorization";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 ()-]{7,19}$/, "Enter a valid phone number.");

const email = z.string().trim().email().max(254);
const uuid = z.string().uuid();
const optionalUrl = z.union([z.string().url(), z.literal(""), z.null()]).optional();

const projectFields = z.object({
  name: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(240),
  developer_name: z.string().trim().min(2).max(200),
  rera_number: z.string().trim().min(3).max(100),
  price_min: z.coerce.number().int().nonnegative(),
  price_max: z.coerce.number().int().nonnegative(),
  possession_date: z.iso.date().nullable().optional(),
  description: z.string().trim().max(5000).default(""),
  brochure_url: optionalUrl,
  floor_plan_url: optionalUrl,
  location_pin_url: optionalUrl,
  active: z.boolean().default(true),
  amenities: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        answer: z.string().trim().min(1).max(2000),
      }),
    )
    .max(100)
    .default([]),
  working_hours: z.string().trim().max(120).nullable().optional(),
});

export const projectCreateSchema = projectFields
  .refine((value) => value.price_max >= value.price_min, {
    path: ["price_max"],
    message: "Maximum price must be greater than or equal to minimum price.",
  });

export const projectUpdateSchema = projectFields.partial().refine(
  (value) =>
    value.price_min === undefined ||
    value.price_max === undefined ||
    value.price_max >= value.price_min,
  {
    path: ["price_max"],
    message: "Maximum price must be greater than or equal to minimum price.",
  },
);

const leadFields = z.object({
  project_id: uuid,
  name: z.string().trim().min(2).max(200),
  phone,
  email: z.union([email, z.literal(""), z.null()]).optional(),
  source: z.enum([
    "PHONE",
    "MISSED_CALL",
    "WHATSAPP",
    "WEBSITE",
    "META",
    "GOOGLE",
    "EMAIL",
    "PORTAL",
    "MANUAL",
  ]),
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "SITE_VISIT_SCHEDULED",
      "SITE_VISITED",
      "BOOKED",
      "LOST",
      "NURTURE",
    ])
    .default("NEW"),
  buyer_type: z.enum([
    "FAMILY_BUYER",
    "INVESTOR",
    "FIRST_TIME_BUYER",
    "NRI",
    "COMPARISON_SHOPPER",
    "UNKNOWN",
  ]),
  apartment_preference: z.string().trim().max(120).default(""),
  budget_min: z.coerce.number().int().nonnegative(),
  budget_max: z.coerce.number().int().nonnegative(),
  purchase_timeline: z.enum([
    "IMMEDIATE",
    "WITHIN_3_MONTHS",
    "THREE_TO_SIX_MONTHS",
    "SIX_TO_TWELVE_MONTHS",
    "LONG_TERM",
    "UNKNOWN",
  ]),
  site_visit_interest: z.boolean().default(false),
  score: z.coerce.number().min(1).max(10),
  priority: z.enum(["HOT", "WARM", "NURTURE", "COLD"]),
  assigned_to: uuid.nullable().optional(),
  sla_deadline: z.iso.datetime().nullable().optional(),
  first_response_at: z.iso.datetime().nullable().optional(),
  last_contacted_at: z.iso.datetime().nullable().optional(),
  next_followup_at: z.iso.datetime().nullable().optional(),
  ai_summary: z.string().max(10000).nullable().optional(),
  recommended_next_action: z.string().max(5000).nullable().optional(),
  key_questions: z.array(z.string().max(1000)).max(100).default([]),
  objections: z.array(z.string().max(1000)).max(100).default([]),
  is_after_hours: z.boolean().default(false),
});

export const leadCreateSchema = leadFields
  .refine((value) => value.budget_max >= value.budget_min, {
    path: ["budget_max"],
    message: "Maximum budget must be greater than or equal to minimum budget.",
  });

export const leadUpdateSchema = leadFields
  .partial()
  .omit({
    project_id: true,
    assigned_to: true,
  })
  .refine(
    (value) =>
      value.budget_min === undefined ||
      value.budget_max === undefined ||
      value.budget_max >= value.budget_min,
    {
      path: ["budget_max"],
      message: "Maximum budget must be greater than or equal to minimum budget.",
    },
  );

export const assignmentSchema = z.object({
  assigned_to: uuid,
});

export const leadStatusSchema = z.object({
  status: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "SITE_VISIT_SCHEDULED",
    "SITE_VISITED",
    "BOOKED",
    "LOST",
    "NURTURE",
  ]),
});

export const conversationCreateSchema = z.object({
  channel: z.enum(["CALL", "WHATSAPP", "EMAIL", "FORM", "MANUAL"]),
  speaker: z.enum(["buyer", "ai", "human"]),
  text: z.string().trim().min(1).max(10000),
  summary: z.string().max(5000).default(""),
  sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
  key_questions: z.array(z.string().max(1000)).max(100).default([]),
  objections: z.array(z.string().max(1000)).max(100).default([]),
});

export const handoffCreateSchema = z.object({
  lead_id: uuid,
  assigned_to: uuid,
  reason: z.enum([
    "HOT_LEAD",
    "SITE_VISIT_REQUEST",
    "PRICE_NEGOTIATION",
    "LEGAL_RERA_QUERY",
    "BOOKING_REQUEST",
    "HIGH_BUDGET_BUYER",
    "ANGRY_BUYER",
    "HUMAN_REQUESTED",
    "COMPETITOR_COMPARISON",
  ]),
  priority: z.enum(["HOT", "WARM", "NURTURE", "COLD"]),
  sla_deadline: z.iso.datetime(),
});

export const siteVisitCreateSchema = z.object({
  lead_id: uuid,
  project_id: uuid,
  preferred_date: z.iso.date(),
  preferred_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  visitors_count: z.coerce.number().int().min(1).max(20),
  buyer_location: z.string().trim().max(500).nullable().optional(),
  needs_directions: z.boolean().default(false),
  family_attending: z.boolean().default(false),
  status: z
    .enum([
      "REQUESTED",
      "TENTATIVE",
      "CONFIRMED",
      "COMPLETED",
      "MISSED",
      "RESCHEDULED",
      "CANCELLED",
    ])
    .default("REQUESTED"),
  outcome: z.string().max(5000).nullable().optional(),
  reminder_status: z.enum(["SENT", "PENDING", "SKIPPED"]).default("PENDING"),
  assigned_to: uuid.nullable().optional(),
});

export const siteVisitUpdateSchema = siteVisitCreateSchema
  .partial()
  .omit({ lead_id: true, project_id: true });

export const taskCreateSchema = z.object({
  lead_id: uuid,
  assigned_to: uuid,
  task_type: z.enum([
    "CALLBACK",
    "SEND_BROCHURE",
    "CONFIRM_VISIT",
    "POST_VISIT_FEEDBACK",
    "CUSTOM",
  ]),
  due_at: z.iso.datetime(),
  status: z
    .enum(["PENDING", "COMPLETED", "OVERDUE", "CANCELLED"])
    .default("PENDING"),
  notes: z.string().max(5000).nullable().optional(),
});

export const taskUpdateSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE", "CANCELLED"]),
  notes: z.string().max(5000).nullable().optional(),
});

export const membershipUpdateSchema = z.object({
  role: z.enum(roles).optional(),
  active: z.boolean().optional(),
});

export const membershipCreateSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  email,
  phone: z.union([phone, z.literal(""), z.null()]).optional(),
  role: z.enum(roles),
  project_ids: z.array(uuid).max(100).default([]),
});
