-- CRM Comercial: campos persistentes, vínculo inequívoco e arquivo imutável de PDFs.
-- Não altera informações existentes, não toca nos módulos de projetos/Forms/Drive.
alter table public.crm_propostas
  add column if not exists campos_pdf jsonb not null default '{}'::jsonb;
alter table public.crm_contratos
  add column if not exists campos_pdf jsonb not null default '{}'::jsonb,
  add column if not exists proposta_id bigint references public.crm_propostas(id) on delete restrict;

alter table public.crm_propostas
  add constraint crm_propostas_campos_pdf_objeto
    check (jsonb_typeof(campos_pdf) = 'object' and pg_column_size(campos_pdf) <= 16384);
alter table public.crm_contratos
  add constraint crm_contratos_campos_pdf_objeto
    check (jsonb_typeof(campos_pdf) = 'object' and pg_column_size(campos_pdf) <= 16384);

create index if not exists crm_contratos_proposta_idx
  on public.crm_contratos (proposta_id) where proposta_id is not null;

create or replace function public.dw_crm_validar_proposta_contrato()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  proposta_valida boolean;
begin
  if tg_op = 'UPDATE' then
    if old.status not in ('rascunho', 'em_revisao') then
      if new.proposta_id is distinct from old.proposta_id
        or new.campos_pdf is distinct from old.campos_pdf then
        raise exception 'Contrato aprovado: crie nova versão para alterar vínculo ou campos';
      end if;
    end if;
  end if;

  if new.proposta_id is not null then
    if new.parceria_gratuita_id is not null or new.negociacao_id is null then
      raise exception 'Parceria gratuita não deve vincular proposta remunerada';
    end if;
    select exists (
      select 1 from public.crm_propostas p
      where p.id = new.proposta_id
        and p.negociacao_id = new.negociacao_id
        and p.status = 'aceita'
    ) into proposta_valida;
    if not proposta_valida then
      raise exception 'Vincule uma proposta aceita da mesma negociação';
    end if;
  end if;

  if new.negociacao_id is not null
    and new.tipo_modelo in ('servico_remunerado', 'parceria_remunerada')
    and new.status not in ('rascunho', 'cancelado')
    and new.proposta_id is null then
    raise exception 'Vincule a proposta aceita antes de enviar o contrato para revisão';
  end if;
  return new;
end
$$;

drop trigger if exists dw_crm_validar_proposta_contrato_trg on public.crm_contratos;
create trigger dw_crm_validar_proposta_contrato_trg
before insert or update on public.crm_contratos
for each row execute function public.dw_crm_validar_proposta_contrato();

create or replace function public.dw_crm_travar_campos_proposta_aprovada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status not in ('rascunho','em_revisao')
     and new.campos_pdf is distinct from old.campos_pdf then
    raise exception 'Campos de proposta aprovada não podem ser editados; crie nova versão';
  end if;
  return new;
end
$$;

drop trigger if exists dw_crm_travar_campos_proposta_aprovada_trg on public.crm_propostas;
create trigger dw_crm_travar_campos_proposta_aprovada_trg
before update on public.crm_propostas
for each row execute function public.dw_crm_travar_campos_proposta_aprovada();

-- Os documentos PDF são mantidos em uma tabela protegida por RLS.
-- A política ampla existente em storage.objects não permite isolamento
-- seguro de um novo bucket privado, portanto não usamos Storage aqui.
create table if not exists public.crm_documentos_gerados (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('proposta','contrato')),
  proposta_id bigint references public.crm_propostas(id) on delete restrict,
  contrato_id bigint references public.crm_contratos(id) on delete restrict,
  nome_arquivo text not null check (length(nome_arquivo) between 5 and 230),
  conteudo_base64 text not null check (
    length(conteudo_base64) between 200 and 4000000
    and left(conteudo_base64, 8) = 'JVBERi0x'
  ),
  campos_snapshot jsonb not null default '{}'::jsonb,
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  drive_file_id text,
  drive_url text,
  drive_sincronizado_em timestamptz,
  constraint crm_documentos_tipo_vinculo check (
    (tipo='proposta' and proposta_id is not null and contrato_id is null)
    or (tipo='contrato' and contrato_id is not null and proposta_id is null)
  ),
  constraint crm_documentos_snapshot_objeto check (jsonb_typeof(campos_snapshot) = 'object')
);

create index if not exists crm_documentos_proposta_idx
  on public.crm_documentos_gerados(proposta_id, id desc) where proposta_id is not null;
create index if not exists crm_documentos_contrato_idx
  on public.crm_documentos_gerados(contrato_id, id desc) where contrato_id is not null;

alter table public.crm_documentos_gerados enable row level security;
drop policy if exists crm_documentos_visualizar on public.crm_documentos_gerados;
create policy crm_documentos_visualizar on public.crm_documentos_gerados
for select to authenticated using ((select app_private.can_manage_crm()));
drop policy if exists crm_documentos_arquivar on public.crm_documentos_gerados;
create policy crm_documentos_arquivar on public.crm_documentos_gerados
for insert to authenticated with check (
  (select app_private.can_manage_crm()) and criado_por = (select auth.uid())
);

revoke all on public.crm_documentos_gerados from anon, public;
grant select, insert on public.crm_documentos_gerados to authenticated;
-- Não há DELETE/UPDATE por perfis de CRM, garantindo histórico imutável.
-- Service Role poderá preencher apenas metadados de sincronização Drive.

comment on table public.crm_documentos_gerados is
  'Arquivos PDF históricos do CRM, leitura restrita e somente novas inserções; campos de versão não são sobrescritos.';
