begin;

alter table public.organization_members
  add constraint organization_members_org_id_unique
  unique (organization_id, id);

alter table public.organization_member_projects
  add constraint member_projects_membership_same_org_fk
  foreign key (organization_id, membership_id)
  references public.organization_members(organization_id, id)
  on delete cascade;

alter table public.leads
  add constraint leads_assignee_same_org_fk
  foreign key (organization_id, assigned_to)
  references public.organization_members(organization_id, profile_id)
  on delete restrict;

alter table public.handoffs
  add constraint handoffs_assignee_same_org_fk
  foreign key (organization_id, assigned_to)
  references public.organization_members(organization_id, profile_id)
  on delete restrict,
  add constraint handoffs_escalated_to_same_org_fk
  foreign key (organization_id, escalated_to)
  references public.organization_members(organization_id, profile_id)
  on delete restrict;

alter table public.site_visits
  add constraint site_visits_assignee_same_org_fk
  foreign key (organization_id, assigned_to)
  references public.organization_members(organization_id, profile_id)
  on delete restrict;

alter table public.followup_tasks
  add constraint followup_tasks_assignee_same_org_fk
  foreign key (organization_id, assigned_to)
  references public.organization_members(organization_id, profile_id)
  on delete restrict;

alter table public.sla_events
  add constraint sla_events_assignee_same_org_fk
  foreign key (organization_id, assigned_to)
  references public.organization_members(organization_id, profile_id)
  on delete restrict;

create or replace function public.protect_membership_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile_id uuid;
  actor_role public.organization_role;
  other_active_owners integer;
begin
  -- Administrative seed and invitation operations use the service role.
  if auth.uid() is null then
    return new;
  end if;

  actor_profile_id := public.current_profile_id();
  actor_role := public.current_organization_role(new.organization_id);

  if actor_role = 'OWNER' then
    null;
  elsif actor_role = 'ADMIN' and new.role in ('MANAGER', 'EXECUTIVE') then
    null;
  else
    raise exception 'membership role change is not permitted'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id
       or new.profile_id <> old.profile_id then
      raise exception 'membership identity fields are immutable'
        using errcode = '42501';
    end if;

    if old.profile_id = actor_profile_id and new.active = false then
      raise exception 'users cannot disable their own membership'
        using errcode = '42501';
    end if;

    if old.role = 'OWNER'
       and old.active = true
       and (new.role <> 'OWNER' or new.active = false) then
      select count(*)
      into other_active_owners
      from public.organization_members membership
      where membership.organization_id = old.organization_id
        and membership.role = 'OWNER'
        and membership.active = true
        and membership.id <> old.id;

      if other_active_owners = 0 then
        raise exception 'the organization must retain an active owner'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_protect_privileges
  on public.organization_members;
create trigger organization_members_protect_privileges
before insert or update on public.organization_members
for each row execute function public.protect_membership_privileges();

revoke all on function public.protect_membership_privileges() from public;

commit;
