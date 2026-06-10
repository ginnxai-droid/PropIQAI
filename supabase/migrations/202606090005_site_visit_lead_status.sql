create or replace function public.sync_lead_status_from_site_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'COMPLETED' then
    update public.leads
    set status = 'SITE_VISITED'
    where id = new.lead_id
      and organization_id = new.organization_id
      and status not in ('BOOKED', 'LOST');
  elsif tg_op = 'INSERT'
     or old.status is distinct from new.status then
    if new.status in ('REQUESTED', 'TENTATIVE', 'CONFIRMED', 'RESCHEDULED') then
      update public.leads
      set status = 'SITE_VISIT_SCHEDULED'
      where id = new.lead_id
        and organization_id = new.organization_id
        and status not in ('BOOKED', 'LOST', 'SITE_VISITED');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists site_visit_lead_status_sync on public.site_visits;
create trigger site_visit_lead_status_sync
after insert or update of status on public.site_visits
for each row execute function public.sync_lead_status_from_site_visit();

revoke all on function public.sync_lead_status_from_site_visit() from public;
