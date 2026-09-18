-- =====================================================================
-- SaarthiX — Phase 2 | Migration 002
-- profiles (§4)
-- RLS policies for profiles are added in migration 003, after the
-- role helper functions exist.
-- =====================================================================

create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  full_name               text not null,
  phone                   text,
  email                   text,
  date_of_birth           date,
  gender                  text,
  address                 text,
  district                text,
  state                   text,
  preferred_language      text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint profiles_full_name_not_blank
    check (length(btrim(full_name)) > 0),

  constraint profiles_dob_sane
    check (date_of_birth is null or date_of_birth <= current_date),

  constraint profiles_phone_format
    check (phone is null or phone ~ '^[0-9+][0-9 ()-]{5,19}$'),

  constraint profiles_emergency_phone_format
    check (emergency_contact_phone is null
           or emergency_contact_phone ~ '^[0-9+][0-9 ()-]{5,19}$')
);

comment on table public.profiles is
  'Application profile for every authenticated user. Never stores a role column — see public.user_roles.';

create index if not exists profiles_district_idx on public.profiles (district);
create index if not exists profiles_is_active_idx on public.profiles (is_active);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- ---------------------------------------------------------------------
-- Protect immutable / privileged columns on self-update.
-- A user may edit their own contact details, never their own id,
-- created_at, or is_active flag.
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    new.id         := old.id;
    new.created_at := old.created_at;
    new.is_active  := old.is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- On signup, create the profile row and grant ONLY the 'patient' role.
-- Privileged roles are never self-assignable (§3, §49).
-- The role insert lives here so no client ever writes to user_roles.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
begin
  v_full_name := btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    concat_ws(' ',
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name'),
    ''
  ));

  if v_full_name = '' then
    v_full_name := split_part(coalesce(new.email, 'account'), '@', 1);
  end if;

  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    v_full_name,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'patient')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
