-- =====================================================================
-- SaarthiX — Phase 2 | Migration 006
-- medicines (§13), medicine_inventory (§14), inventory_transactions (§15)
-- Derived stock_status (§16) + transactional stock-update function (§37)
-- =====================================================================

-- ---------------------------------------------------------------------
-- medicines (master data — controlled by staff/admin, §13)
-- ---------------------------------------------------------------------
create table if not exists public.medicines (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  generic_name  text,
  strength      text,
  dosage_form   text,
  unit          text,
  is_active     boolean not null default true,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint medicines_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists medicines_name_idx      on public.medicines (name);
create index if not exists medicines_is_active_idx on public.medicines (is_active);

drop trigger if exists medicines_set_updated_at on public.medicines;
create trigger medicines_set_updated_at
  before update on public.medicines
  for each row execute function public.set_updated_at();

alter table public.medicines enable row level security;
alter table public.medicines force row level security;

-- Medicine master data is not public browsing data (§13: "do not allow
-- arbitrary public users to create medicines"), but any authenticated
-- staff/admin needs to look it up when stocking a facility.
drop policy if exists medicines_select_authenticated on public.medicines;
create policy medicines_select_authenticated
  on public.medicines for select
  to authenticated
  using (is_active or public.is_platform_admin());

drop policy if exists medicines_write_staff_admin on public.medicines;
create policy medicines_write_staff_admin
  on public.medicines for all
  to authenticated
  using (
    public.is_platform_admin()
    or exists (select 1 from public.facility_staff fs where fs.user_id = auth.uid() and fs.is_active)
  )
  with check (
    public.is_platform_admin()
    or exists (select 1 from public.facility_staff fs where fs.user_id = auth.uid() and fs.is_active)
  );

-- ---------------------------------------------------------------------
-- medicine_inventory (per-facility stock levels)
-- ---------------------------------------------------------------------
create table if not exists public.medicine_inventory (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade,
  medicine_id       uuid not null references public.medicines(id) on delete restrict,
  current_stock     numeric not null default 0,
  minimum_stock     numeric not null default 0,
  maximum_stock     numeric,
  unit              text,
  last_updated_by   uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint medicine_inventory_current_stock_nonneg check (current_stock >= 0),
  constraint medicine_inventory_minimum_stock_nonneg check (minimum_stock >= 0),
  constraint medicine_inventory_max_ge_min
    check (maximum_stock is null or maximum_stock >= minimum_stock),
  constraint medicine_inventory_unique_per_facility unique (facility_id, medicine_id)
);

create index if not exists medicine_inventory_facility_id_idx on public.medicine_inventory (facility_id);
create index if not exists medicine_inventory_medicine_id_idx on public.medicine_inventory (medicine_id);

drop trigger if exists medicine_inventory_set_updated_at on public.medicine_inventory;
create trigger medicine_inventory_set_updated_at
  before update on public.medicine_inventory
  for each row execute function public.set_updated_at();

-- Derived status — §16: never store a redundant status column.
create or replace function public.inventory_stock_status(
  _current_stock numeric,
  _minimum_stock numeric
)
returns public.stock_status
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when _current_stock <= 0 then 'out_of_stock'::public.stock_status
    when _current_stock <= _minimum_stock then 'low_stock'::public.stock_status
    else 'in_stock'::public.stock_status
  end;
$$;

-- Convenience view so the frontend can select status directly instead
-- of recomputing it (§30 patient-management shape, §23 dashboards).
create or replace view public.medicine_inventory_with_status
  with (security_invoker = true) as
select
  mi.*,
  public.inventory_stock_status(mi.current_stock, mi.minimum_stock) as stock_status
from public.medicine_inventory mi;

-- Row-level writes on medicine_inventory are blocked entirely (see the
-- policy below); all changes MUST go through public.adjust_inventory_stock
-- so a transaction record is always created (§15, §37).
create or replace function public.block_direct_inventory_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Inventory stock must be changed through public.adjust_inventory_stock(), not by direct write.'
    using errcode = '42501';
end;
$$;

drop trigger if exists medicine_inventory_block_stock_change on public.medicine_inventory;
create trigger medicine_inventory_block_stock_change
  before update of current_stock on public.medicine_inventory
  for each row
  when (new.current_stock is distinct from old.current_stock)
  execute function public.block_direct_inventory_write();

alter table public.medicine_inventory enable row level security;
alter table public.medicine_inventory force row level security;

drop policy if exists medicine_inventory_select_staff_admin on public.medicine_inventory;
create policy medicine_inventory_select_staff_admin
  on public.medicine_inventory for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- INSERT is allowed directly (creating a new inventory line at zero
-- stock is not a "stock change"); every subsequent stock change must
-- go through the function below.
drop policy if exists medicine_inventory_insert_staff_admin on public.medicine_inventory;
create policy medicine_inventory_insert_staff_admin
  on public.medicine_inventory for insert
  to authenticated
  with check (
    (public.is_facility_staff(facility_id) or public.is_platform_admin())
    and current_stock = 0
  );

drop policy if exists medicine_inventory_update_staff_admin on public.medicine_inventory;
create policy medicine_inventory_update_staff_admin
  on public.medicine_inventory for update
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- No DELETE policy: an inventory line is deactivated at the medicine
-- level, never deleted, so transaction history always stays valid.

-- ---------------------------------------------------------------------
-- inventory_transactions (append-only ledger, §15, §27)
-- ---------------------------------------------------------------------
create table if not exists public.inventory_transactions (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade,
  medicine_id       uuid not null references public.medicines(id) on delete restrict,
  inventory_id      uuid not null references public.medicine_inventory(id) on delete restrict,
  transaction_type  public.inventory_transaction_type not null,
  quantity          numeric not null,
  previous_stock    numeric not null,
  new_stock         numeric not null,
  reason            text,
  reference_id      uuid,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint inventory_transactions_quantity_positive check (quantity > 0),
  constraint inventory_transactions_previous_nonneg check (previous_stock >= 0),
  constraint inventory_transactions_new_nonneg check (new_stock >= 0)
);

create index if not exists inventory_transactions_facility_id_idx  on public.inventory_transactions (facility_id);
create index if not exists inventory_transactions_medicine_id_idx  on public.inventory_transactions (medicine_id);
create index if not exists inventory_transactions_inventory_id_idx on public.inventory_transactions (inventory_id);
create index if not exists inventory_transactions_created_at_idx   on public.inventory_transactions (created_at);

alter table public.inventory_transactions enable row level security;
alter table public.inventory_transactions force row level security;

drop policy if exists inventory_transactions_select_staff_admin on public.inventory_transactions;
create policy inventory_transactions_select_staff_admin
  on public.inventory_transactions for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- No INSERT/UPDATE/DELETE policy for any role: rows are written only
-- by public.adjust_inventory_stock() running as SECURITY DEFINER.
-- Append-only, exactly like audit_logs.

-- ---------------------------------------------------------------------
-- Transactional stock-update function (§37)
-- Single entry point for every stock change. Row-locks the inventory
-- line (FOR UPDATE) to prevent lost updates from concurrent staff,
-- validates non-negative stock, writes the new balance, and appends
-- the transaction record — all inside one function invocation, which
-- Postgres already wraps in an implicit transaction.
-- ---------------------------------------------------------------------
create or replace function public.adjust_inventory_stock(
  _inventory_id     uuid,
  _transaction_type public.inventory_transaction_type,
  _quantity         numeric,
  _reason           text default null,
  _reference_id     uuid default null,
  _increase         boolean default true
)
returns public.inventory_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventory   public.medicine_inventory;
  v_delta       numeric;
  v_new_stock   numeric;
  v_txn         public.inventory_transactions;
begin
  if _quantity <= 0 then
    raise exception 'Quantity must be greater than zero.' using errcode = '22003';
  end if;

  -- Lock the row so two simultaneous updates cannot both read the same
  -- current_stock and silently overwrite one another.
  select * into v_inventory
  from public.medicine_inventory
  where id = _inventory_id
  for update;

  if v_inventory.id is null then
    raise exception 'Inventory record not found.' using errcode = 'P0002';
  end if;

  if not (public.is_facility_staff(v_inventory.facility_id) or public.is_platform_admin()) then
    raise exception 'You are not authorized to update this facility''s inventory.'
      using errcode = '42501';
  end if;

  -- Direction by transaction type. 'adjustment' is the only type whose
  -- direction is caller-specified (_increase), since a physical stock
  -- count can correct the balance either up or down; every other type
  -- has one fixed, unambiguous direction so it cannot be misused to
  -- silently move stock the "wrong" way.
  v_delta := case
    when _transaction_type in ('stock_in', 'return') then _quantity
    when _transaction_type in ('stock_out', 'expiry') then -_quantity
    when _transaction_type = 'adjustment' then
      case when _increase then _quantity else -_quantity end
    else null
  end;

  if _transaction_type = 'adjustment' and (_reason is null or btrim(_reason) = '') then
    raise exception 'A reason is required for stock adjustments.' using errcode = '22004';
  end if;

  v_new_stock := v_inventory.current_stock + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock cannot go negative (current: %, requested change: %).',
      v_inventory.current_stock, v_delta
      using errcode = '23514';
  end if;

  if v_inventory.maximum_stock is not null and v_new_stock > v_inventory.maximum_stock then
    raise exception 'Stock would exceed the configured maximum (%).', v_inventory.maximum_stock
      using errcode = '23514';
  end if;

  update public.medicine_inventory
  set current_stock = v_new_stock,
      last_updated_by = auth.uid()
  where id = _inventory_id;

  insert into public.inventory_transactions (
    facility_id, medicine_id, inventory_id, transaction_type,
    quantity, previous_stock, new_stock, reason, reference_id, created_by
  ) values (
    v_inventory.facility_id, v_inventory.medicine_id, v_inventory.id, _transaction_type,
    _quantity, v_inventory.current_stock, v_new_stock, _reason, _reference_id, auth.uid()
  )
  returning * into v_txn;

  return v_txn;
end;
$$;

revoke all on function public.adjust_inventory_stock(
    uuid, public.inventory_transaction_type, numeric, text, uuid, boolean
  ) from public, anon;
grant execute on function public.adjust_inventory_stock(
    uuid, public.inventory_transaction_type, numeric, text, uuid, boolean
  ) to authenticated;

comment on function public.adjust_inventory_stock is
  'Only path for changing medicine_inventory.current_stock. Locks the row, validates bounds, and writes an inventory_transactions record atomically.';
