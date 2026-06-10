begin;

create extension if not exists pgcrypto;

create type public.organization_role as enum ('OWNER', 'MANAGER', 'EXECUTIVE', 'ADMIN');
create type public.lead_source as enum ('PHONE', 'MISSED_CALL', 'WHATSAPP', 'WEBSITE', 'META', 'GOOGLE', 'EMAIL', 'PORTAL', 'MANUAL');
create type public.lead_status as enum ('NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT_SCHEDULED', 'SITE_VISITED', 'BOOKED', 'LOST', 'NURTURE');
create type public.buyer_type as enum ('FAMILY_BUYER', 'INVESTOR', 'FIRST_TIME_BUYER', 'NRI', 'COMPARISON_SHOPPER', 'UNKNOWN');
create type public.purchase_timeline as enum ('IMMEDIATE', 'WITHIN_3_MONTHS', 'THREE_TO_SIX_MONTHS', 'SIX_TO_TWELVE_MONTHS', 'LONG_TERM', 'UNKNOWN');
create type public.lead_priority as enum ('HOT', 'WARM', 'NURTURE', 'COLD');
create type public.conversation_channel as enum ('CALL', 'WHATSAPP', 'EMAIL', 'FORM', 'MANUAL');
create type public.handoff_reason as enum ('HOT_LEAD', 'SITE_VISIT_REQUEST', 'PRICE_NEGOTIATION', 'LEGAL_RERA_QUERY', 'BOOKING_REQUEST', 'HIGH_BUDGET_BUYER', 'ANGRY_BUYER', 'HUMAN_REQUESTED', 'COMPETITOR_COMPARISON');
create type public.handoff_status as enum ('PENDING', 'CONTACTED', 'ESCALATED', 'RESOLVED');
create type public.site_visit_status as enum ('REQUESTED', 'TENTATIVE', 'CONFIRMED', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED');
create type public.reminder_status as enum ('SENT', 'PENDING', 'SKIPPED');
create type public.followup_task_type as enum ('CALLBACK', 'SEND_BROCHURE', 'CONFIRM_VISIT', 'POST_VISIT_FEEDBACK', 'CUSTOM');
create type public.followup_task_status as enum ('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');
create type public.sla_event_type as enum ('FIRST_RESPONSE', 'FOLLOW_UP', 'SITE_VISIT_CONFIRMATION');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create unique index profiles_email_unique_ci on public.profiles (lower(email));

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 200),
  location text not null check (char_length(trim(location)) between 2 and 240),
  developer_name text not null check (char_length(trim(developer_name)) between 2 and 200),
  rera_number text not null,
  price_min bigint not null check (price_min >= 0),
  price_max bigint not null check (price_max >= price_min),
  possession_date date,
  description text not null default '',
  brochure_url text,
  floor_plan_url text,
  location_pin_url text,
  active boolean not null default true,
  amenities jsonb not null default '[]'::jsonb check (jsonb_typeof(amenities) = 'array'),
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  working_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rera_number),
  unique (organization_id, id)
);

create table public.organization_member_projects (
  organization_id uuid not null,
  membership_id uuid not null references public.organization_members(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, project_id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 200),
  phone text not null check (phone ~ '^\+?[0-9][0-9 ()-]{7,19}$'),
  email text,
  source public.lead_source not null,
  status public.lead_status not null default 'NEW',
  buyer_type public.buyer_type not null default 'UNKNOWN',
  apartment_preference text not null default '',
  budget_min bigint not null default 0 check (budget_min >= 0),
  budget_max bigint not null default 0 check (budget_max >= budget_min),
  purchase_timeline public.purchase_timeline not null default 'UNKNOWN',
  site_visit_interest boolean not null default false,
  score numeric(3,1) not null default 1 check (score between 1 and 10),
  priority public.lead_priority not null default 'COLD',
  assigned_to uuid references public.profiles(id) on delete set null,
  sla_deadline timestamptz,
  first_response_at timestamptz,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  ai_summary text,
  recommended_next_action text,
  key_questions jsonb not null default '[]'::jsonb check (jsonb_typeof(key_questions) = 'array'),
  objections jsonb not null default '[]'::jsonb check (jsonb_typeof(objections) = 'array'),
  is_after_hours boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete restrict,
  unique (organization_id, id)
);

create unique index leads_org_project_phone_unique
  on public.leads (organization_id, project_id, regexp_replace(phone, '\D', '', 'g'));

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  channel public.conversation_channel not null,
  transcript jsonb not null default '[]'::jsonb check (jsonb_typeof(transcript) = 'array'),
  summary text not null default '',
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  key_questions jsonb not null default '[]'::jsonb check (jsonb_typeof(key_questions) = 'array'),
  objections jsonb not null default '[]'::jsonb check (jsonb_typeof(objections) = 'array'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, lead_id) references public.leads(organization_id, id) on delete cascade
);

create table public.handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  reason public.handoff_reason not null,
  priority public.lead_priority not null,
  sla_deadline timestamptz not null,
  status public.handoff_status not null default 'PENDING',
  escalated_to uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, lead_id) references public.leads(organization_id, id) on delete cascade
);

create unique index handoffs_one_active_per_lead
  on public.handoffs (organization_id, lead_id)
  where status in ('PENDING', 'CONTACTED', 'ESCALATED');

create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  project_id uuid not null,
  preferred_date date not null,
  preferred_time time not null,
  visitors_count integer not null default 1 check (visitors_count between 1 and 20),
  buyer_location text,
  needs_directions boolean not null default false,
  family_attending boolean not null default false,
  status public.site_visit_status not null default 'REQUESTED',
  outcome text,
  reminder_status public.reminder_status not null default 'PENDING',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, lead_id) references public.leads(organization_id, id) on delete cascade,
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete restrict
);

create table public.followup_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  task_type public.followup_task_type not null,
  due_at timestamptz not null,
  status public.followup_task_status not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, lead_id) references public.leads(organization_id, id) on delete cascade
);

create table public.sla_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  handoff_id uuid references public.handoffs(id) on delete set null,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  event_type public.sla_event_type not null,
  due_at timestamptz not null,
  completed_at timestamptz,
  breached boolean not null default false,
  escalation_level integer not null default 0 check (escalation_level between 0 and 4),
  created_at timestamptz not null default now(),
  foreign key (organization_id, lead_id) references public.leads(organization_id, id) on delete cascade
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id uuid,
  action text not null check (char_length(trim(action)) between 2 and 120),
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index organization_members_profile_idx on public.organization_members(profile_id, active);
create index member_projects_org_project_idx on public.organization_member_projects(organization_id, project_id);
create index projects_org_created_idx on public.projects(organization_id, created_at desc);
create index leads_org_created_idx on public.leads(organization_id, created_at desc);
create index leads_project_idx on public.leads(organization_id, project_id);
create index leads_assigned_idx on public.leads(organization_id, assigned_to);
create index leads_status_idx on public.leads(organization_id, status);
create index leads_priority_idx on public.leads(organization_id, priority);
create index leads_sla_idx on public.leads(organization_id, sla_deadline) where sla_deadline is not null;
create index leads_phone_idx on public.leads(organization_id, phone);
create index leads_email_idx on public.leads(organization_id, lower(email)) where email is not null;
create index conversations_lead_idx on public.conversations(organization_id, lead_id, created_at);
create index handoffs_lead_idx on public.handoffs(organization_id, lead_id, created_at desc);
create index handoffs_assigned_idx on public.handoffs(organization_id, assigned_to, status);
create index site_visits_lead_idx on public.site_visits(organization_id, lead_id);
create index site_visits_project_date_idx on public.site_visits(organization_id, project_id, preferred_date);
create index site_visits_assigned_idx on public.site_visits(organization_id, assigned_to);
create index followup_tasks_assigned_due_idx on public.followup_tasks(organization_id, assigned_to, due_at);
create index followup_tasks_lead_idx on public.followup_tasks(organization_id, lead_id);
create index sla_events_due_idx on public.sla_events(organization_id, due_at, breached);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(organization_id, entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger organization_members_set_updated_at before update on public.organization_members
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();
create trigger handoffs_set_updated_at before update on public.handoffs
for each row execute function public.set_updated_at();
create trigger site_visits_set_updated_at before update on public.site_visits
for each row execute function public.set_updated_at();
create trigger followup_tasks_set_updated_at before update on public.followup_tasks
for each row execute function public.set_updated_at();

commit;
