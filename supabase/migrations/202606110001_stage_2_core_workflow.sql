begin;

alter table public.leads
  add column engagement_quality text not null default 'UNKNOWN'
    check (engagement_quality in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  add column callback_responsiveness text not null default 'UNKNOWN'
    check (callback_responsiveness in ('RESPONSIVE', 'DELAYED', 'UNRESPONSIVE', 'UNKNOWN')),
  add column handoff_signals jsonb not null default '{}'::jsonb
    check (jsonb_typeof(handoff_signals) = 'object'),
  add column score_components jsonb not null default '{}'::jsonb
    check (jsonb_typeof(score_components) = 'object'),
  add column scoring_version text not null default 'stage-2-v1',
  add column score_explanation text not null default '',
  add column recalculated_at timestamptz;

alter table public.handoffs
  add column escalation_level integer not null default 0
    check (escalation_level between 0 and 4);

alter table public.followup_tasks
  add column site_visit_id uuid references public.site_visits(id) on delete cascade;

drop index if exists public.handoffs_one_active_per_lead;

create unique index handoffs_one_active_reason_per_lead
  on public.handoffs (organization_id, lead_id, reason)
  where status in ('PENDING', 'CONTACTED', 'ESCALATED');

create unique index followup_tasks_one_post_visit_per_visit
  on public.followup_tasks (organization_id, site_visit_id, task_type)
  where site_visit_id is not null and task_type = 'POST_VISIT_FEEDBACK';

create index leads_scoring_priority_idx
  on public.leads (organization_id, priority, recalculated_at desc);

create index handoffs_escalation_idx
  on public.handoffs (organization_id, escalation_level, sla_deadline)
  where status in ('PENDING', 'CONTACTED', 'ESCALATED');

create index followup_tasks_site_visit_idx
  on public.followup_tasks (organization_id, site_visit_id)
  where site_visit_id is not null;

create or replace function public.assign_lead_secure(
  target_lead_id uuid,
  target_profile_id uuid
)
returns public.leads
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_lead public.leads;
  updated_lead public.leads;
  actor_id uuid;
begin
  actor_id := public.current_profile_id();

  select *
  into current_lead
  from public.leads
  where id = target_lead_id
  for update;

  if current_lead.id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;

  if not public.has_organization_role(
    current_lead.organization_id,
    array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]
  ) then
    raise exception 'lead assignment is not permitted' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = current_lead.organization_id
      and membership.profile_id = target_profile_id
      and membership.active = true
      and membership.role in ('MANAGER', 'EXECUTIVE')
  ) then
    raise exception 'assignee is not an active organization sales member'
      using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.organization_member_projects assignment
    join public.organization_members membership
      on membership.id = assignment.membership_id
     and membership.organization_id = assignment.organization_id
    where assignment.organization_id = current_lead.organization_id
      and assignment.project_id = current_lead.project_id
      and membership.profile_id = target_profile_id
      and membership.active = true
  ) then
    raise exception 'assignee is not permitted for the lead project'
      using errcode = '42501';
  end if;

  update public.leads
  set assigned_to = target_profile_id
  where id = target_lead_id
  returning * into updated_lead;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
  )
  values (
    current_lead.organization_id,
    actor_id,
    'lead',
    current_lead.id,
    'LEAD_ASSIGNED',
    jsonb_build_object('assigned_to', current_lead.assigned_to),
    jsonb_build_object('assigned_to', target_profile_id)
  );

  return updated_lead;
end;
$$;

revoke all on function public.assign_lead_secure(uuid, uuid) from public;
grant execute on function public.assign_lead_secure(uuid, uuid) to authenticated;

commit;
