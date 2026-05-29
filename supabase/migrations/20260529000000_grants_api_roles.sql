-- ============================================================================
-- Grants padrão das roles de API no schema public (2026-05-29).
-- O schema foi aplicado via pooler como `postgres`, e os auto-grants do Supabase
-- (ALTER DEFAULT PRIVILEGES) não dispararam — as 85 tabelas ficaram sem DML para
-- anon/authenticated/service_role. Esta migration reaplica o padrão Supabase.
-- A RLS (ativa em 100% das tabelas) continua sendo a camada de segurança de
-- anon/authenticated; service_role bypassa RLS (uso server-only).
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- service_role: acesso total (server-only)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- anon / authenticated: DML gated por RLS
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Objetos futuros criados por postgres
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
