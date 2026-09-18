-- =====================================================================
-- SaarthiX — Phase 2 | Migration 003
-- user_roles (§5) + authorization helper functions (§35)
-- + RLS policies for profiles and user_roles (§28, §29, §34)
-- =====================================================================

create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.user_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint user_roles_user_role_unique unique (user_id, role)
);

comment on table public.user_roles is
  'Single source of truth for authorization. Never read a role from the client.';

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx    on public.user_roles (role);

-- =====================================================================
-- Authorization helpers
-- SECURITY DEFINER so they can read user_roles without triggering the
-- RLS policies that themselves call these functions (no recursion).
-- search_path is pinned to '' and every object is schema-qualified.
-- =====================================================================

create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role    = _role
  );
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role    = any(_roles)
  );
$$;

-- Current caller's roles, as an array. Used by the frontend session layer.
create or replace function public.current_user_roles()
returns public.user_role[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(ur.role order by ur.role), '{}'::public.user_role[])
  from public.user_roles ur
  where ur.user_id = auth.uid();
$$;

-- Platform-level administrator (government_admin or super_admin).
create or replace function public.is_platform_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_any_role(
    _user_id,
    array['government_admin', 'super_admin']::public.user_role[]
  );
$$;

create or replace function public.is_super_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(_user_id, 'super_admin');
$$;

create or replace function public.is_referral_coordinator(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(_user_id, 'referral_coordinator');
$$;

revoke all on function public.has_role(uuid, public.user_role)        from public, anon;
revoke all on function public.has_any_role(uuid, public.user_role[])  from public, anon;
revoke all on function public.current_user_roles()                    from public, anon;
revoke all on function public.is_platform_admin(uuid)                 from public, anon;
revoke all on function public.is_super_admin(uuid)                    from public, anon;
revoke all on function public.is_referral_coordinator(uuid)           from public, anon;

grant execute on function public.has_role(uuid, public.user_role)       to authenticated;
grant execute on function public.has_any_role(uuid, public.user_role[]) to authenticated;
grant execute on function public.current_user_roles()                   to authenticated;
grant execute on function public.is_platform_admin(uuid)                to authenticated;
grant execute on function public.is_super_admin(uuid)                   to authenticated;
grant execute on function public.is_referral_coordinator(uuid)          to authenticated;

-- =====================================================================
-- Role grant guard (§34, §39)
-- Only a super_admin may grant or revoke privileged roles.
-- government_admin may grant operational roles but never admin roles.
-- Nobody may grant a role to themselves.
-- =====================================================================
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role  public.user_role := coalesce(new.role, old.role);
begin
  -- No authenticated actor => trusted server context (service role,
  -- handle_new_user trigger, SQL editor bootstrap). Allow.
  if v_actor is null then
    return coalesce(new, old);
  end if;

  if v_role in ('government_admin', 'super_admin') then
    if not public.is_super_admin(v_actor) then
      raise exception 'Only a super administrator can manage privileged roles.'
        using errcode = '42501';
    end if;
  else
    if not public.is_platform_admin(v_actor) then
      raise exception 'You are not authorized to manage user roles.'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' and new.user_id = v_actor then
    raise exception 'You cannot assign a role to your own account.'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.granted_by := v_actor;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists user_roles_guard_change on public.user_roles;
create trigger user_roles_guard_change
  before insert or update or delete on public.user_roles
  for each row execute function public.guard_role_change();

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

-- ---------------------------------------------------------------------
-- user_roles policies
-- ---------------------------------------------------------------------
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_roles_select_admin on public.user_roles;
create policy user_roles_select_admin
  on public.user_roles for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists user_roles_insert_admin on public.user_roles;
create policy user_roles_insert_admin
  on public.user_roles for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists user_roles_delete_admin on public.user_roles;
create policy user_roles_delete_admin
  on public.user_roles for delete
  to authenticated
  using (public.is_platform_admin());

-- No UPDATE policy: a role is granted or revoked, never mutated in place.

-- ---------------------------------------------------------------------
-- profiles policies (deferred from migration 002)
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and is_active)
  with check (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
  on public.profiles for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- No INSERT policy: profiles are created only by the auth trigger.
-- No DELETE policy: account deletion cascades from auth.users.
-- Facility-staff and coordinator visibility into patient profiles is
-- added in a later migration, scoped to an active referral or visit.
