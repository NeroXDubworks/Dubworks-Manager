-- Limita a tabela de documentos comerciais ao mínimo necessário.
-- As concessões padrão no projeto dão privilégios de UPDATE/DELETE ao
-- papel authenticated; retirar explicitamente, além da proteção de RLS.
revoke all privileges on table public.crm_documentos_gerados from authenticated, anon, public;
grant select, insert on table public.crm_documentos_gerados to authenticated;