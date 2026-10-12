-- SaarthiX: secure Patient Health QR, patient-owned health profile, medication list,
-- recovery notes, access requests/grants, audit log, and inventory-demand forecast.
-- Apply only after reviewing against the deployed schema. Never put raw QR tokens in tables.

begin;

create table if not exists public.patient_health_profiles (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  blood_group text,
  allergies text,
  chronic_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  consent_to_share boolean not null default false,
  share_mode text not null default 'off' check (share_mode in ('off','active_care')),
  updated_at timestamptz not null default now(),
  constraint health_profile_blood_group_check check (blood_group is null or blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'))
);

create table if not exists public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  medication_name text not null check (length(btrim(medication_name)) between 1 and 160),
  dose text not null check (length(btrim(dose)) between 1 and 120),
  instructions text,
  start_date date,
  end_date date,
  prescribed_by uuid references public.profiles(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.recovery_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  checkin_status text check (checkin_status in ('better','same','worse')),
  note text not null check (length(btrim(note)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.patient_qr_tokens (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.patient_access_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  grant_reason text not null default 'patient_consent',
  constraint access_grant_expiry_check check (expires_at > granted_at)
);

create unique index if not exists patient_access_grant_active_unique
  on public.patient_access_grants(patient_id, facility_id)
  where revoked_at is null;

create table if not exists public.patient_access_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_status text not null default 'pending' check (request_status in ('pending','approved','denied','cancelled','expired')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (patient_id, facility_id, requested_by, request_status)
);

create unique index if not exists medicine_demand_forecasts_unique_idx on public.medicine_demand_forecasts(facility_id, medicine_id, forecast_date, forecast_horizon);
create index if not exists patient_medications_patient_active_idx on public.patient_medications(patient_id, active);
create index if not exists recovery_notes_patient_created_idx on public.recovery_notes(patient_id, created_at desc);
create index if not exists access_requests_patient_status_idx on public.patient_access_requests(patient_id, request_status);

alter table public.patient_health_profiles enable row level security;
alter table public.patient_medications enable row level security;
alter table public.recovery_notes enable row level security;
alter table public.patient_qr_tokens enable row level security;
alter table public.patient_access_grants enable row level security;
alter table public.patient_access_requests enable row level security;

-- No direct client reads/writes to sensitive records or token/grant tables.
revoke all on public.patient_health_profiles, public.patient_medications, public.recovery_notes,
  public.patient_qr_tokens, public.patient_access_grants, public.patient_access_requests
  from anon, authenticated;

create or replace function public.my_health_record()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(h) from public.patient_health_profiles h where h.patient_id=v_id),
    'medications', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc)
       from public.patient_medications m where m.patient_id=v_id and m.active), '[]'::jsonb),
    'recovery_notes', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc)
       from public.recovery_notes n where n.patient_id=v_id), '[]'::jsonb),
    'access_grants', coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'facility_id',g.facility_id,
       'facility_name',f.name,'granted_at',g.granted_at,'expires_at',g.expires_at)
       order by g.granted_at desc)
       from public.patient_access_grants g join public.facilities f on f.id=g.facility_id
       where g.patient_id=v_id and g.revoked_at is null and g.expires_at > now()), '[]'::jsonb),
    'access_requests', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'facility_id',r.facility_id,
       'facility_name',f.name,'requested_by',r.requested_by,'request_status',r.request_status,'requested_at',r.requested_at)
       order by r.requested_at desc)
       from public.patient_access_requests r join public.facilities f on f.id=r.facility_id
       where r.patient_id=v_id and r.request_status='pending' and r.expires_at > now()), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_my_health_profile(
  _blood_group text, _allergies text, _chronic_conditions text,
  _emergency_contact_name text, _emergency_contact_phone text,
  _consent_to_share boolean, _share_mode text
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  if _share_mode not in ('off','active_care') then raise exception 'Invalid sharing option.'; end if;
  if _share_mode <> 'off' and not coalesce(_consent_to_share,false) then
    raise exception 'Consent is required before sharing.' using errcode='23514';
  end if;
  insert into public.patient_health_profiles(patient_id,blood_group,allergies,chronic_conditions,
    emergency_contact_name,emergency_contact_phone,consent_to_share,share_mode,updated_at)
  values(v_id,nullif(_blood_group,''),nullif(_allergies,''),nullif(_chronic_conditions,''),
    nullif(_emergency_contact_name,''),nullif(_emergency_contact_phone,''),coalesce(_consent_to_share,false),
    case when coalesce(_consent_to_share,false) then _share_mode else 'off' end,now())
  on conflict(patient_id) do update set blood_group=excluded.blood_group,allergies=excluded.allergies,
    chronic_conditions=excluded.chronic_conditions,emergency_contact_name=excluded.emergency_contact_name,
    emergency_contact_phone=excluded.emergency_contact_phone,consent_to_share=excluded.consent_to_share,
    share_mode=excluded.share_mode,updated_at=now();
  if not coalesce(_consent_to_share,false) or _share_mode='off' then
    update public.patient_access_grants set revoked_at=now()
      where patient_id=v_id and revoked_at is null;
  end if;
  return public.my_health_record();
end;
$$;

create or replace function public.regenerate_my_health_qr()
returns text
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid := auth.uid(); v_token text;
begin
  if v_id is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.patient_qr_tokens(patient_id,token_hash,created_at,revoked_at)
  values(v_id,encode(extensions.digest(v_token,'sha256'),'hex'),now(),null)
  on conflict(patient_id) do update set token_hash=excluded.token_hash,created_at=now(),revoked_at=null;
  return v_token;
end;
$$;

create or replace function public.revoke_my_health_qr()
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.patient_qr_tokens set revoked_at=now() where patient_id=auth.uid();
  update public.patient_access_grants set revoked_at=now() where patient_id=auth.uid() and revoked_at is null;
  return true;
end;
$$;

create or replace function public.request_patient_record_access(_qr_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_patient uuid; v_facility uuid; v_request uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  select t.patient_id into v_patient from public.patient_qr_tokens t
  where t.token_hash=encode(extensions.digest(_qr_token,'sha256'),'hex') and t.revoked_at is null;
  if v_patient is null then raise exception 'QR code is invalid or has been revoked.' using errcode='P0002'; end if;
  select fs.facility_id into v_facility from public.facility_staff fs
  where fs.user_id=auth.uid() and fs.is_active
  order by fs.created_at desc limit 1;
  if v_facility is null or not public.is_facility_staff(v_facility) then
    raise exception 'Verified facility staff access is required.' using errcode='42501';
  end if;
  if exists(select 1 from public.patient_access_grants g where g.patient_id=v_patient and g.facility_id=v_facility
     and g.revoked_at is null and g.expires_at > now()) then
    return null;
  end if;
  insert into public.patient_access_requests(patient_id,facility_id,requested_by,request_status,requested_at,expires_at)
  values(v_patient,v_facility,auth.uid(),'pending',now(),now()+interval '24 hours')
  on conflict(patient_id,facility_id,requested_by,request_status)
  do update set requested_at=now(),expires_at=now()+interval '24 hours',responded_at=null
  returning id into v_request;
  insert into public.notifications(user_id,type,title,message,related_entity_type,related_entity_id)
  values(v_patient,'health_record_access','Health record access requested',
    'A verified healthcare staff member has requested access to your health record. Review and approve or deny.',
    'patient_access_request',v_request);
  return v_request;
end;
$$;

create or replace function public.respond_patient_record_access(_request_id uuid, _allow boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare r public.patient_access_requests;
begin
  select * into r from public.patient_access_requests where id=_request_id and patient_id=auth.uid()
    and request_status='pending' and expires_at>now() for update;
  if not found then raise exception 'Request is unavailable or has expired.' using errcode='P0002'; end if;
  update public.patient_access_requests set request_status=case when _allow then 'approved' else 'denied' end,
    responded_at=now() where id=_request_id;
  if _allow then
    insert into public.patient_access_grants(patient_id,facility_id,granted_at,expires_at,grant_reason)
    values(r.patient_id,r.facility_id,now(),now()+interval '24 hours','patient_approved_request')
    on conflict do nothing;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_data)
  values(auth.uid(),case when _allow then 'health_record_access_approved' else 'health_record_access_denied' end,
    'patient_access_request',_request_id,jsonb_build_object('facility_id',r.facility_id,'requester',r.requested_by));
  return true;
end;
$$;

create or replace function public.revoke_patient_facility_access(_grant_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.patient_access_grants set revoked_at=now()
    where id=_grant_id and patient_id=auth.uid() and revoked_at is null;
  return found;
end;
$$;

create or replace function public.resolve_patient_health_qr(_qr_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_patient uuid; v_facility uuid; v_profile public.patient_health_profiles; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  select t.patient_id into v_patient from public.patient_qr_tokens t
  where t.token_hash=encode(extensions.digest(_qr_token,'sha256'),'hex') and t.revoked_at is null;
  if v_patient is null then raise exception 'QR code is invalid or has been revoked.' using errcode='P0002'; end if;
  select fs.facility_id into v_facility from public.facility_staff fs
    where fs.user_id=auth.uid() and fs.is_active order by fs.created_at desc limit 1;
  if v_facility is null or not public.is_facility_staff(v_facility) then
    raise exception 'Verified facility staff access is required.' using errcode='42501';
  end if;
  select * into v_profile from public.patient_health_profiles where patient_id=v_patient;
  if not found or not v_profile.consent_to_share or v_profile.share_mode <> 'active_care' then
    raise exception 'Patient has not enabled health record sharing.' using errcode='42501';
  end if;
  if not exists(select 1 from public.patient_access_grants g where g.patient_id=v_patient
      and g.facility_id=v_facility and g.revoked_at is null and g.expires_at>now()) then
    perform public.request_patient_record_access(_qr_token);
    return jsonb_build_object('access','requested','message','Patient approval requested; no health data returned.');
  end if;
  v_result := jsonb_build_object(
    'access','granted',
    'patient',(select jsonb_build_object('id',p.id,'full_name',p.full_name,'date_of_birth',p.date_of_birth,'gender',p.gender)
      from public.profiles p where p.id=v_patient),
    'health_profile',to_jsonb(v_profile),
    'medications',(select coalesce(jsonb_agg(jsonb_build_object('name',m.medication_name,'dose',m.dose,
       'instructions',m.instructions,'start_date',m.start_date,'end_date',m.end_date)
       order by m.created_at desc),'[]'::jsonb) from public.patient_medications m where m.patient_id=v_patient and m.active),
    'recovery_notes',(select coalesce(jsonb_agg(jsonb_build_object('status',n.checkin_status,'note',n.note,'created_at',n.created_at)
       order by n.created_at desc),'[]'::jsonb) from public.recovery_notes n where n.patient_id=v_patient)
  );
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_data)
  values(auth.uid(),'health_record_viewed','patient_health_profile',v_patient,jsonb_build_object('facility_id',v_facility));
  return v_result;
end;
$$;

create or replace function public.add_patient_medication(
  _patient_id uuid, _medication_name text, _dose text, _instructions text,
  _start_date date, _end_date date
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_facility uuid; v_id uuid;
begin
  select fs.facility_id into v_facility from public.facility_staff fs
    where fs.user_id=auth.uid() and fs.is_active order by fs.created_at desc limit 1;
  if v_facility is null or not public.is_facility_staff(v_facility) then
    raise exception 'Verified facility staff access is required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.patient_access_grants g where g.patient_id=_patient_id
      and g.facility_id=v_facility and g.revoked_at is null and g.expires_at>now()) then
    raise exception 'Patient has not granted this facility access.' using errcode='42501';
  end if;
  insert into public.patient_medications(patient_id,medication_name,dose,instructions,start_date,end_date,prescribed_by,facility_id)
  values(_patient_id,_medication_name,_dose,nullif(_instructions,''),_start_date,_end_date,auth.uid(),v_facility)
  returning id into v_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_data)
  values(auth.uid(),'health_record_medication_added','patient_medication',v_id,jsonb_build_object('patient_id',_patient_id,'facility_id',v_facility));
  return v_id;
end;
$$;

create or replace function public.add_patient_recovery_note(
  _patient_id uuid, _checkin_status text, _note text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_facility uuid; v_id uuid;
begin
  if _checkin_status not in ('better','same','worse') then raise exception 'Invalid recovery status.'; end if;
  select fs.facility_id into v_facility from public.facility_staff fs
    where fs.user_id=auth.uid() and fs.is_active order by fs.created_at desc limit 1;
  if v_facility is null or not public.is_facility_staff(v_facility) then
    raise exception 'Verified facility staff access is required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.patient_access_grants g where g.patient_id=_patient_id
      and g.facility_id=v_facility and g.revoked_at is null and g.expires_at>now()) then
    raise exception 'Patient has not granted this facility access.' using errcode='42501';
  end if;
  insert into public.recovery_notes(patient_id,author_user_id,facility_id,checkin_status,note)
  values(_patient_id,auth.uid(),v_facility,_checkin_status,_note) returning id into v_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_data)
  values(auth.uid(),'health_record_recovery_note_added','recovery_note',v_id,jsonb_build_object('patient_id',_patient_id,'facility_id',v_facility));
  return v_id;
end;
$$;

-- Forecast based on recorded inventory transactions, not fabricated demand.
-- It writes recommendations only; it never places orders or changes stock.
create or replace function public.refresh_medicine_demand_forecast(_facility_id uuid, _horizon_days integer default 7)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_count integer;
begin
  if not (public.is_facility_staff(_facility_id) or public.is_platform_admin()) then
    raise exception 'Facility staff permission required.' using errcode='42501';
  end if;
  if _horizon_days not between 1 and 30 then raise exception 'Horizon must be 1 to 30 days.'; end if;
  insert into public.medicine_demand_forecasts(facility_id,medicine_id,forecast_date,forecast_horizon,predicted_demand,model_version,generated_at)
  select _facility_id, inv.medicine_id, current_date + _horizon_days, _horizon_days::text || 'd',
    round((coalesce(sum(case when tx.transaction_type = 'stock_out' then abs(tx.quantity) else 0 end)
      filter (where tx.created_at >= now() - interval '30 days'),0) / 30.0) * _horizon_days, 2),
    'rolling-30-day-v1', now()
  from public.medicine_inventory inv
  left join public.inventory_transactions tx on tx.inventory_id=inv.id
  where inv.facility_id=_facility_id
  group by inv.medicine_id
  on conflict (facility_id, medicine_id, forecast_date, forecast_horizon)
  do update set predicted_demand = excluded.predicted_demand,
    model_version = excluded.model_version, generated_at = excluded.generated_at;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.my_health_record() from public, anon;
revoke all on function public.save_my_health_profile(text,text,text,text,text,boolean,text) from public, anon;
revoke all on function public.regenerate_my_health_qr() from public, anon;
revoke all on function public.revoke_my_health_qr() from public, anon;
revoke all on function public.request_patient_record_access(text) from public, anon;
revoke all on function public.respond_patient_record_access(uuid,boolean) from public, anon;
revoke all on function public.revoke_patient_facility_access(uuid) from public, anon;
revoke all on function public.resolve_patient_health_qr(text) from public, anon;
revoke all on function public.add_patient_medication(uuid,text,text,text,date,date) from public, anon;
revoke all on function public.add_patient_recovery_note(uuid,text,text) from public, anon;
revoke all on function public.refresh_medicine_demand_forecast(uuid,integer) from public, anon;
grant execute on function public.my_health_record() to authenticated;
grant execute on function public.save_my_health_profile(text,text,text,text,text,boolean,text) to authenticated;
grant execute on function public.regenerate_my_health_qr() to authenticated;
grant execute on function public.revoke_my_health_qr() to authenticated;
grant execute on function public.request_patient_record_access(text) to authenticated;
grant execute on function public.respond_patient_record_access(uuid,boolean) to authenticated;
grant execute on function public.revoke_patient_facility_access(uuid) to authenticated;
grant execute on function public.resolve_patient_health_qr(text) to authenticated;
grant execute on function public.add_patient_medication(uuid,text,text,text,date,date) to authenticated;
grant execute on function public.add_patient_recovery_note(uuid,text,text) to authenticated;
grant execute on function public.refresh_medicine_demand_forecast(uuid,integer) to authenticated;

commit;
