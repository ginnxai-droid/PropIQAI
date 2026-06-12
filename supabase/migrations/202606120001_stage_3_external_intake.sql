begin;

alter table public.leads
  add column intake_channel text,
  add column campaign text,
  add column preferred_location text,
  add column received_at timestamptz,
  add column business_hours_version text,
  add column ai_qualification_status text not null default 'NOT_AVAILABLE'
    check (ai_qualification_status in ('PENDING', 'COMPLETED', 'FAILED', 'NOT_AVAILABLE')),
  add column ai_confidence numeric(4,3)
    check (ai_confidence is null or ai_confidence between 0 and 1),
  add column ai_signals jsonb not null default '{}'::jsonb
    check (jsonb_typeof(ai_signals) = 'object'),
  add column is_duplicate boolean not null default false,
  add column duplicate_of_lead_id uuid references public.leads(id) on delete set null;

create table public.lead_intake_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid,
  duplicate_of_lead_id uuid,
  provider text not null check (char_length(trim(provider)) between 2 and 80),
  channel text not null check (char_length(trim(channel)) between 2 and 80),
  event_type text not null default 'LEAD_RECEIVED'
    check (char_length(trim(event_type)) between 2 and 80),
  source public.lead_source not null,
  campaign text,
  received_at timestamptz not null,
  normalized_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(normalized_payload) = 'object'),
  raw_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(raw_payload) = 'object'),
  processing_status text not null
    check (processing_status in ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED')),
  ai_status text not null default 'NOT_AVAILABLE'
    check (ai_status in ('PENDING', 'COMPLETED', 'FAILED', 'NOT_AVAILABLE')),
  error_message text,
  created_at timestamptz not null default now(),
  foreign key (lead_id) references public.leads(id) on delete set null,
  foreign key (duplicate_of_lead_id) references public.leads(id) on delete set null
);

create table public.lead_duplicate_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intake_event_id uuid not null references public.lead_intake_events(id) on delete cascade,
  existing_lead_id uuid not null,
  match_reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(match_reasons) = 'array'),
  created_at timestamptz not null default now(),
  foreign key (existing_lead_id) references public.leads(id) on delete cascade
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (char_length(trim(provider)) between 2 and 80),
  channel text not null check (char_length(trim(channel)) between 2 and 80),
  event_type text not null check (char_length(trim(event_type)) between 2 and 80),
  received_at timestamptz not null,
  processing_status text not null
    check (processing_status in ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED')),
  error_message text,
  retry_count integer not null default 0 check (retry_count between 0 and 20),
  raw_payload_reference uuid references public.lead_intake_events(id) on delete set null,
  lead_id uuid,
  duplicate_of_lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id) references public.leads(id) on delete set null,
  foreign key (duplicate_of_lead_id) references public.leads(id) on delete set null
);

create table public.internal_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid,
  alert_type text not null check (
    alert_type in (
      'HOT_LEAD',
      'PRIORITY_HOT_LEAD',
      'SLA_DUE_SOON',
      'SLA_BREACHED',
      'MANAGER_ESCALATION',
      'AFTER_HOURS_HIGH_INTENT',
      'DUPLICATE_LEAD_DETECTED',
      'ASSIGNMENT_REQUIRED'
    )
  ),
  severity text not null check (severity in ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  assigned_role public.organization_role not null default 'MANAGER',
  message text not null check (char_length(trim(message)) between 2 and 1000),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id) references public.leads(id) on delete cascade
);

create index leads_intake_received_idx
  on public.leads (organization_id, received_at desc)
  where received_at is not null;
create index leads_ai_status_idx
  on public.leads (organization_id, ai_qualification_status, received_at desc);
create index leads_duplicate_idx
  on public.leads (organization_id, is_duplicate, received_at desc);
create index intake_events_org_received_idx
  on public.lead_intake_events (organization_id, received_at desc);
create index intake_events_lead_idx
  on public.lead_intake_events (organization_id, lead_id, created_at desc);
create index duplicate_events_existing_idx
  on public.lead_duplicate_events (organization_id, existing_lead_id, created_at desc);
create index integration_events_org_received_idx
  on public.integration_events (organization_id, received_at desc);
create index integration_events_status_idx
  on public.integration_events (organization_id, processing_status, created_at desc);
create index internal_alerts_queue_idx
  on public.internal_alerts (organization_id, status, severity, created_at desc);
create index internal_alerts_lead_idx
  on public.internal_alerts (organization_id, lead_id, created_at desc);

create unique index internal_alerts_one_active_type_per_lead
  on public.internal_alerts (organization_id, lead_id, alert_type)
  where lead_id is not null and status in ('OPEN', 'ACKNOWLEDGED');

create trigger integration_events_set_updated_at
before update on public.integration_events
for each row execute function public.set_updated_at();

create trigger internal_alerts_set_updated_at
before update on public.internal_alerts
for each row execute function public.set_updated_at();

alter table public.lead_intake_events enable row level security;
alter table public.lead_duplicate_events enable row level security;
alter table public.integration_events enable row level security;
alter table public.internal_alerts enable row level security;

create policy internal_alerts_select_permitted on public.internal_alerts
for select to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]
  )
  or (
    public.current_organization_role(organization_id) = 'EXECUTIVE'
    and lead_id is not null
    and public.can_access_lead(organization_id, lead_id)
  )
);

create policy internal_alerts_update_management on public.internal_alerts
for update to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]
  )
);

grant select, update on public.internal_alerts to authenticated;

revoke all on public.lead_intake_events from authenticated;
revoke all on public.lead_duplicate_events from authenticated;
revoke all on public.integration_events from authenticated;
revoke insert, delete, truncate on public.internal_alerts from authenticated;

commit;
