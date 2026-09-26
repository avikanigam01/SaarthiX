-- =====================================================================
-- SaarthiX — base privilege grants
--
-- Row Level Security policies decide which ROWS a role may see or change.
-- They do NOT, by themselves, grant access to a table at all — Postgres
-- still checks a separate table-level GRANT first. This migration adds
-- that missing base grant for the `authenticated` role (the role every
-- signed-in Supabase user runs queries as), and sets default privileges
-- so any table, sequence or function created by a later migration gets
-- the same grant automatically, without needing this file to be repeated.
--
-- Safe to run more than once. Run after every earlier migration.
-- =====================================================================

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

-- Refresh PostgREST's schema cache so the new grants take effect immediately
-- instead of waiting for the next automatic reload.
notify pgrst, 'reload schema';
