-- Facility directory provenance and safe source tracking.
-- Apply after the existing facilities migration.
begin;
alter table public.facilities
  add column if not exists source_url text,
  add column if not exists source_checked_at timestamptz,
  add column if not exists source_notes text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'facilities_source_url_length_check') then
    alter table public.facilities add constraint facilities_source_url_length_check
      check (source_url is null or length(source_url) <= 2048);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'facilities_source_notes_length_check') then
    alter table public.facilities add constraint facilities_source_notes_length_check
      check (source_notes is null or length(source_notes) <= 1000);
  end if;
end $$;

comment on column public.facilities.source_url is 'Public source used to verify directory facts; not proof of partnership.';
comment on column public.facilities.source_checked_at is 'Timestamp when the public source was checked.';
comment on column public.facilities.source_notes is 'Short note describing what the source supports.';
commit;
