begin;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function public.has_active_membership(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.organization_id = target_organization_id
      and membership.profile_id = public.current_profile_id()
      and membership.active = true
      and organization.active = true
  )
$$;

create or replace function public.current_organization_role(target_organization_id uuid)
returns public.organization_role
language sql
stable
security definer
set search_path = public
as $$
  select membership.role
  from public.organization_members membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.organization_id = target_organization_id
    and membership.profile_id = public.current_profile_id()
    and membership.active = true
    and organization.active = true
  limit 1
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_membership(target_organization_id)
    and public.current_organization_role(target_organization_id) = any(allowed_roles)
$$;

create or replace function public.can_access_project(
  target_organization_id uuid,
  target_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_organization_role(
      target_organization_id,
      array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]
    )
    or exists (
      select 1
      from public.organization_member_projects assignment
      join public.organization_members membership on membership.id = assignment.membership_id
      where assignment.organization_id = target_organization_id
        and assignment.project_id = target_project_id
        and membership.profile_id = public.current_profile_id()
        and membership.active = true
        and membership.role = 'EXECUTIVE'
    )
$$;

create or replace function public.can_access_lead(
  target_organization_id uuid,
  target_lead_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads lead
    where lead.organization_id = target_organization_id
      and lead.id = target_lead_id
      and (
        public.has_organization_role(
          target_organization_id,
          array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]
        )
        or (
          public.current_organization_role(target_organization_id) = 'EXECUTIVE'
          and (
            lead.assigned_to = public.current_profile_id()
            or public.can_access_project(target_organization_id, lead.project_id)
          )
        )
      )
  )
$$;

revoke all on function public.current_profile_id() from public;
revoke all on function public.has_active_membership(uuid) from public;
revoke all on function public.current_organization_role(uuid) from public;
revoke all on function public.has_organization_role(uuid, public.organization_role[]) from public;
revoke all on function public.can_access_project(uuid, uuid) from public;
revoke all on function public.can_access_lead(uuid, uuid) from public;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.has_active_membership(uuid) to authenticated;
grant execute on function public.current_organization_role(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.organization_role[]) to authenticated;
grant execute on function public.can_access_project(uuid, uuid) to authenticated;
grant execute on function public.can_access_lead(uuid, uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_member_projects enable row level security;
alter table public.projects enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.handoffs enable row level security;
alter table public.site_visits enable row level security;
alter table public.followup_tasks enable row level security;
alter table public.sla_events enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select_member on public.organizations
for select to authenticated
using (public.has_active_membership(id));

create policy organizations_update_owner_admin on public.organizations
for update to authenticated
using (public.has_organization_role(id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_organization_role(id, array['OWNER', 'ADMIN']::public.organization_role[]));

create policy profiles_select_self_or_org_member on public.profiles
for select to authenticated
using (
  id = public.current_profile_id()
  or exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.profile_id = public.current_profile_id()
      and mine.active = true
      and theirs.profile_id = profiles.id
      and theirs.active = true
  )
);

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = public.current_profile_id())
with check (id = public.current_profile_id() and active = true);

create policy organization_members_select_member on public.organization_members
for select to authenticated
using (public.has_active_membership(organization_id));

create policy organization_members_insert_owner_admin on public.organization_members
for insert to authenticated
with check (public.has_organization_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

create policy organization_members_update_owner_admin on public.organization_members
for update to authenticated
using (public.has_organization_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

create policy member_projects_select_member on public.organization_member_projects
for select to authenticated
using (public.has_active_membership(organization_id));

create policy member_projects_manage_owner_manager_admin on public.organization_member_projects
for all to authenticated
using (public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]));

create policy projects_select_permitted on public.projects
for select to authenticated
using (public.can_access_project(organization_id, id));

create policy projects_insert_owner_admin on public.projects
for insert to authenticated
with check (public.has_organization_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

create policy projects_update_owner_admin on public.projects
for update to authenticated
using (public.has_organization_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

create policy leads_select_permitted on public.leads
for select to authenticated
using (public.can_access_lead(organization_id, id));

create policy leads_insert_management on public.leads
for insert to authenticated
with check (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  and public.can_access_project(organization_id, project_id)
);

create policy leads_update_permitted on public.leads
for update to authenticated
using (public.can_access_lead(organization_id, id))
with check (public.can_access_lead(organization_id, id));

create policy conversations_select_lead_access on public.conversations
for select to authenticated
using (public.can_access_lead(organization_id, lead_id));

create policy conversations_insert_lead_access on public.conversations
for insert to authenticated
with check (
  public.can_access_lead(organization_id, lead_id)
  and created_by = public.current_profile_id()
);

create policy handoffs_select_lead_access on public.handoffs
for select to authenticated
using (public.can_access_lead(organization_id, lead_id));

create policy handoffs_manage_management on public.handoffs
for all to authenticated
using (public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]))
with check (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  and public.can_access_lead(organization_id, lead_id)
);

create policy site_visits_select_lead_access on public.site_visits
for select to authenticated
using (public.can_access_lead(organization_id, lead_id));

create policy site_visits_insert_lead_access on public.site_visits
for insert to authenticated
with check (
  public.can_access_lead(organization_id, lead_id)
  and public.can_access_project(organization_id, project_id)
  and (
    public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
    or assigned_to = public.current_profile_id()
  )
);

create policy site_visits_update_lead_access on public.site_visits
for update to authenticated
using (
  public.can_access_lead(organization_id, lead_id)
  and (
    public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
    or assigned_to = public.current_profile_id()
  )
)
with check (
  public.can_access_lead(organization_id, lead_id)
  and (
    public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
    or assigned_to = public.current_profile_id()
  )
);

create policy followup_tasks_select_permitted on public.followup_tasks
for select to authenticated
using (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  or assigned_to = public.current_profile_id()
);

create policy followup_tasks_insert_management on public.followup_tasks
for insert to authenticated
with check (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  and public.can_access_lead(organization_id, lead_id)
);

create policy followup_tasks_update_assignee_or_management on public.followup_tasks
for update to authenticated
using (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  or assigned_to = public.current_profile_id()
)
with check (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  or assigned_to = public.current_profile_id()
);

create policy sla_events_select_management_or_assignee on public.sla_events
for select to authenticated
using (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  or assigned_to = public.current_profile_id()
);

create policy sla_events_insert_management on public.sla_events
for insert to authenticated
with check (
  public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[])
  and public.can_access_lead(organization_id, lead_id)
);

create policy sla_events_update_management on public.sla_events
for update to authenticated
using (public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]));

create policy audit_logs_select_owner_manager_admin on public.audit_logs
for select to authenticated
using (public.has_organization_role(organization_id, array['OWNER', 'MANAGER', 'ADMIN']::public.organization_role[]));

create policy audit_logs_insert_actor on public.audit_logs
for insert to authenticated
with check (
  public.has_active_membership(organization_id)
  and actor_profile_id = public.current_profile_id()
);

create or replace function public.protect_executive_lead_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.current_organization_role(old.organization_id) = 'EXECUTIVE' then
    if new.organization_id <> old.organization_id
      or new.project_id <> old.project_id
      or new.assigned_to is distinct from old.assigned_to
      or new.score <> old.score
      or new.priority <> old.priority
      or new.name <> old.name
      or new.phone <> old.phone
      or new.email is distinct from old.email
    then
      raise exception 'executives cannot modify protected lead fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_protect_executive_updates
before update on public.leads
for each row execute function public.protect_executive_lead_updates();

revoke update, delete, truncate on public.audit_logs from authenticated;
revoke delete, truncate on public.organizations, public.profiles, public.organization_members,
  public.organization_member_projects, public.projects, public.leads, public.conversations,
  public.handoffs, public.site_visits, public.followup_tasks, public.sla_events from authenticated;

commit;
