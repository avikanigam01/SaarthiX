-- SaarthiX Feature 2: live visit queue.
-- Existing visits are assigned a daily token; this migration does not create fake visits/patients.
begin;

alter table public.visits
  add column if not exists token_number integer,
  add column if not exists queue_date date,
  add column if not exists queue_status text not null default 'waiting',
  add column if not exists estimated_start_at timestamptz,
  add column if not exists called_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists skipped_count integer not null default 0;

alter table public.visits
  drop constraint if exists visits_queue_status_check;
alter table public.visits
  add constraint visits_queue_status_check
  check (queue_status in ('waiting','called','in_progress','completed','skipped','cancelled'));

alter table public.visits
  drop constraint if exists visits_queue_token_positive_check;
alter table public.visits
  add constraint visits_queue_token_positive_check
  check (token_number is null or token_number > 0);

alter table public.visits
  drop constraint if exists visits_queue_skipped_nonnegative_check;
alter table public.visits
  add constraint visits_queue_skipped_nonnegative_check
  check (skipped_count >= 0);

create table if not exists public.queue_settings (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  daily_limit integer not null default 40 check (daily_limit between 1 and 1000),
  avg_consult_minutes integer not null default 10 check (avg_consult_minutes between 1 and 180),
  start_time time not null default '09:00',
  is_paused boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create unique index if not exists queue_settings_scope_unique_idx
  on public.queue_settings (facility_id, coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.queue_counters (
  facility_id uuid not null references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  queue_date date not null,
  next_token integer not null default 1 check (next_token > 0),
  created_at timestamptz not null default now()
);
create unique index if not exists queue_counters_scope_unique_idx
  on public.queue_counters (facility_id, coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid), queue_date);

create index if not exists visits_queue_lookup_idx
  on public.visits (facility_id, department_id, queue_date, queue_status, token_number);
create unique index if not exists visits_queue_unique_token_idx
  on public.visits (facility_id, coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid), queue_date, token_number)
  where token_number is not null and queue_date is not null;

alter table public.queue_settings enable row level security;
alter table public.queue_settings force row level security;
alter table public.queue_counters enable row level security;
alter table public.queue_counters force row level security;

drop policy if exists queue_settings_read_active on public.queue_settings;
create policy queue_settings_read_active on public.queue_settings
  for select to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists queue_settings_manage_staff on public.queue_settings;
create policy queue_settings_manage_staff on public.queue_settings
  for all to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- Counters are only touched by security-definer RPCs, never directly by clients.
revoke all on public.queue_counters from anon, authenticated;
revoke insert, update, delete on public.queue_settings from anon, authenticated;
grant select on public.queue_settings to authenticated;
grant insert, update, delete on public.queue_settings to authenticated;

create or replace function public.queue_setting_for(_facility_id uuid, _department_id uuid)
returns public.queue_settings
language plpgsql stable security definer
set search_path = ''
as $$
declare v public.queue_settings;
begin
  select * into v from public.queue_settings
  where facility_id = _facility_id
    and department_id is not distinct from _department_id
  limit 1;
  if not found then
    v.id := null;
    v.facility_id := _facility_id;
    v.department_id := _department_id;
    v.daily_limit := 40;
    v.avg_consult_minutes := 10;
    v.start_time := '09:00'::time;
    v.is_paused := false;
  end if;
  return v;
end;
$$;
revoke all on function public.queue_setting_for(uuid, uuid) from public, anon, authenticated;

-- Assign one token per facility/department/day, safely serialized by advisory transaction lock.
create or replace function public.assign_visit_queue_token()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_day date;
  v_next integer;
  v_limit integer;
  v_paused boolean;
  v_setting public.queue_settings;
begin
  if new.status = 'cancelled' then
    new.queue_status := 'cancelled';
    return new;
  end if;
  v_day := (new.visit_date at time zone 'Asia/Kolkata')::date;
  if new.token_number is not null and new.queue_date is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    new.facility_id::text || ':' || coalesce(new.department_id::text, 'none') || ':' || v_day::text, 0
  ));

  select * into v_setting from public.queue_settings
  where facility_id = new.facility_id and department_id is not distinct from new.department_id
  limit 1;
  v_limit := coalesce(v_setting.daily_limit, 40);
  v_paused := coalesce(v_setting.is_paused, false);

  if v_paused then
    raise exception 'This department queue is paused. Please contact the facility.' using errcode = '55000';
  end if;

  insert into public.queue_counters(facility_id, department_id, queue_date, next_token)
  values (new.facility_id, new.department_id, v_day, 1)
  on conflict do nothing;

  select next_token into v_next from public.queue_counters
  where facility_id = new.facility_id and department_id is not distinct from new.department_id
    and queue_date = v_day for update;

  if v_next > v_limit then
    raise exception 'Daily queue limit reached. Choose another date or contact the facility.' using errcode = '54000';
  end if;

  update public.queue_counters
  set next_token = next_token + 1
  where facility_id = new.facility_id and department_id is not distinct from new.department_id
    and queue_date = v_day;

  new.token_number := v_next;
  new.queue_date := v_day;
  new.queue_status := 'waiting';
  return new;
end;
$$;

drop trigger if exists visits_assign_queue_token on public.visits;
create trigger visits_assign_queue_token
before insert on public.visits
for each row execute function public.assign_visit_queue_token();

-- Backfill tokens for existing real visits only. Rows that exceed the default daily limit
-- still receive a unique token; this preserves existing records rather than rejecting them.
do $$
declare r record; v_next integer;
begin
  for r in
    select id, facility_id, department_id, (visit_date at time zone 'Asia/Kolkata')::date as qday
    from public.visits
    where token_number is null
    order by facility_id, department_id, (visit_date at time zone 'Asia/Kolkata')::date, visit_date, created_at, id
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      r.facility_id::text || ':' || coalesce(r.department_id::text, 'none') || ':' || r.qday::text, 0
    ));
    insert into public.queue_counters(facility_id, department_id, queue_date, next_token)
    values (r.facility_id, r.department_id, r.qday, 1)
    on conflict do nothing;
    select next_token into v_next from public.queue_counters
      where facility_id = r.facility_id and department_id is not distinct from r.department_id
        and queue_date = r.qday for update;
    update public.visits set token_number = v_next, queue_date = r.qday,
      queue_status = case when status = 'completed' then 'completed'
                          when status = 'cancelled' then 'cancelled' else 'waiting' end
      where id = r.id;
    update public.queue_counters set next_token = v_next + 1
      where facility_id = r.facility_id and department_id is not distinct from r.department_id
        and queue_date = r.qday;
  end loop;
end $$;

create or replace function public.queue_recompute(_facility_id uuid, _department_id uuid, _queue_date date)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_avg integer; v_start time; v_token record; v_position integer;
begin
  select coalesce(q.avg_consult_minutes, 10), coalesce(q.start_time, '09:00'::time)
    into v_avg, v_start
  from (select 1) seed
  left join public.queue_settings q on q.facility_id = _facility_id
    and q.department_id is not distinct from _department_id;

  v_position := 0;
  for v_token in
    select id, queue_status
    from public.visits
    where facility_id = _facility_id and department_id is not distinct from _department_id
      and queue_date = _queue_date and queue_status in ('waiting','skipped','called')
    order by case when queue_status = 'called' then 0 else 1 end, token_number
  loop
    v_position := v_position + 1;
    update public.visits
    set estimated_start_at = ((_queue_date::timestamp + v_start) at time zone 'Asia/Kolkata')
      + make_interval(mins => greatest(v_position - 1, 0) * v_avg)
    where id = v_token.id;
  end loop;
end;
$$;
revoke all on function public.queue_recompute(uuid, uuid, date) from public, anon, authenticated;

create or replace function public.queue_call_next(_facility_id uuid, _department_id uuid, _queue_date date default (now() at time zone 'Asia/Kolkata')::date)
returns public.visits
language plpgsql security definer
set search_path = ''
as $$
declare v_visit public.visits;
begin
  if not (public.is_facility_staff(_facility_id) or public.is_platform_admin()) then
    raise exception 'Only this facility staff can call the queue.' using errcode = '42501';
  end if;
  if exists (select 1 from public.queue_settings q where q.facility_id = _facility_id
      and q.department_id is not distinct from _department_id and q.is_paused) then
    raise exception 'Queue is paused.' using errcode = '55000';
  end if;
  select * into v_visit from public.visits
  where facility_id = _facility_id and department_id is not distinct from _department_id
    and queue_date = _queue_date and queue_status in ('waiting','skipped')
  order by token_number
  limit 1 for update skip locked;
  if not found then raise exception 'No patients are waiting.' using errcode = 'P0002'; end if;
  update public.visits set queue_status = 'called', called_at = now(), status = 'scheduled'
    where id = v_visit.id returning * into v_visit;
  perform public.queue_recompute(_facility_id, _department_id, _queue_date);
  return v_visit;
end;
$$;

create or replace function public.queue_start(_visit_id uuid)
returns public.visits
language plpgsql security definer
set search_path = ''
as $$
declare v public.visits;
begin
  select * into v from public.visits where id = _visit_id for update;
  if not found then raise exception 'Visit not found.' using errcode = 'P0002'; end if;
  if not (public.is_facility_staff(v.facility_id) or public.is_platform_admin()) then
    raise exception 'Only this facility staff can start a visit.' using errcode = '42501';
  end if;
  if v.queue_status not in ('called','waiting','skipped') then
    raise exception 'This queue entry cannot be started.' using errcode = '55000';
  end if;
  update public.visits set queue_status = 'in_progress', status = 'in_progress'
    where id = _visit_id returning * into v;
  perform public.queue_recompute(v.facility_id, v.department_id, v.queue_date);
  return v;
end;
$$;

create or replace function public.queue_complete(_visit_id uuid)
returns public.visits
language plpgsql security definer
set search_path = ''
as $$
declare v public.visits;
begin
  select * into v from public.visits where id = _visit_id for update;
  if not found then raise exception 'Visit not found.' using errcode = 'P0002'; end if;
  if not (public.is_facility_staff(v.facility_id) or public.is_platform_admin()) then
    raise exception 'Only this facility staff can complete a visit.' using errcode = '42501';
  end if;
  if v.queue_status <> 'in_progress' then raise exception 'Start the visit before completing it.' using errcode = '55000'; end if;
  update public.visits set queue_status = 'completed', status = 'completed', completed_at = now()
    where id = _visit_id returning * into v;
  perform public.queue_recompute(v.facility_id, v.department_id, v.queue_date);
  return v;
end;
$$;

create or replace function public.queue_skip(_visit_id uuid)
returns public.visits
language plpgsql security definer
set search_path = ''
as $$
declare v public.visits;
begin
  select * into v from public.visits where id = _visit_id for update;
  if not found then raise exception 'Visit not found.' using errcode = 'P0002'; end if;
  if not (public.is_facility_staff(v.facility_id) or public.is_platform_admin()) then
    raise exception 'Only this facility staff can skip a queue entry.' using errcode = '42501';
  end if;
  if v.queue_status not in ('waiting','called') then raise exception 'This queue entry cannot be skipped.' using errcode = '55000'; end if;
  if v.skipped_count + 1 >= 2 then
    update public.visits set queue_status = 'cancelled', status = 'cancelled', skipped_count = skipped_count + 1
      where id = _visit_id returning * into v;
  else
    update public.visits set queue_status = 'skipped', skipped_count = skipped_count + 1
      where id = _visit_id returning * into v;
  end if;
  perform public.queue_recompute(v.facility_id, v.department_id, v.queue_date);
  return v;
end;
$$;

create or replace function public.queue_set_paused(_facility_id uuid, _department_id uuid, _paused boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if not (public.is_facility_staff(_facility_id) or public.is_platform_admin()) then
    raise exception 'Only this facility staff can pause the queue.' using errcode = '42501';
  end if;
  insert into public.queue_settings(facility_id, department_id, is_paused, updated_by)
  values (_facility_id, _department_id, _paused, auth.uid())
  on conflict do nothing;
  update public.queue_settings set is_paused = _paused, updated_by = auth.uid(), updated_at = now()
    where facility_id = _facility_id and department_id is not distinct from _department_id;
  return _paused;
end;
$$;

create or replace function public.get_my_queue_status(_visit_id uuid)
returns table (
  visit_id uuid, token_number integer, queue_date date, queue_status text,
  people_ahead integer, estimated_start_at timestamptz, facility_name text, department_name text
)
language plpgsql stable security definer
set search_path = ''
as $$
declare v public.visits;
begin
  select * into v from public.visits where id = _visit_id;
  if not found then raise exception 'Queue entry not found.' using errcode = 'P0002'; end if;
  if v.patient_id <> auth.uid() and not (public.is_facility_staff(v.facility_id) or public.is_platform_admin()) then
    raise exception 'You may only view your own queue status.' using errcode = '42501';
  end if;
  return query
  select v.id, v.token_number, v.queue_date, v.queue_status,
    (select count(*)::integer from public.visits ahead
     where ahead.facility_id = v.facility_id and ahead.department_id is not distinct from v.department_id
       and ahead.queue_date = v.queue_date and ahead.token_number < v.token_number
       and ahead.queue_status in ('waiting','skipped','called')),
    v.estimated_start_at, f.name, d.name
  from public.facilities f
  left join public.departments d on d.id = v.department_id
  where f.id = v.facility_id;
end;
$$;

grant execute on function public.queue_call_next(uuid, uuid, date) to authenticated;
grant execute on function public.queue_start(uuid) to authenticated;
grant execute on function public.queue_complete(uuid) to authenticated;
grant execute on function public.queue_skip(uuid) to authenticated;
grant execute on function public.queue_set_paused(uuid, uuid, boolean) to authenticated;
grant execute on function public.get_my_queue_status(uuid) to authenticated;

-- Existing realtime setup is reused; add visits to publication only if not already present.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visits'
     ) then
    alter publication supabase_realtime add table public.visits;
  end if;
exception when duplicate_object then null;
end $$;

commit;
