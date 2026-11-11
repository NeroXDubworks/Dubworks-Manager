-- Bloqueios de aprovação/envio: verificam dados persistidos e documentos, nunca inventam campos.
-- Apenas transições de status são verificadas; históricos existentes continuam intactos.
create or replace function public.dw_crm_validar_documento_para_envio()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  faltas text[] := array[]::text[];
  chave text;
begin
  if old.status is not distinct from new.status then return new; end if;

  if tg_table_name = 'crm_propostas'
     and new.status in ('aprovada','enviada') then
    if btrim(coalesce(new.descricao_escopo,'')) = '' then
      faltas := array_append(faltas,'escopo');
    end if;
    if coalesce(new.valor_negociado,0) <= 0 then
      faltas := array_append(faltas,'valor negociado');
    end if;
    if btrim(coalesce(new.condicoes_pagamento,'')) = '' then
      faltas := array_append(faltas,'condições de pagamento');
    end if;
    if new.validade_em is null or new.validade_em < current_date then
      faltas := array_append(faltas,'validade futura');
    end if;
    foreach chave in array array['entregaveis','revisoes','entrega','contato','responsavel'] loop
      if btrim(coalesce(new.campos_pdf ->> chave,'')) = '' then
        faltas := array_append(faltas,chave);
      end if;
    end loop;
    if array_length(faltas,1) is not null then
      raise exception 'Proposta incompleta: %', array_to_string(faltas,', ')
        using errcode='23514';
    end if;
    if new.status='enviada' and not exists (
      select 1 from public.crm_documentos_gerados d
      where d.tipo='proposta' and d.proposta_id=new.id
        and d.criado_em >= coalesce(new.aprovado_em,'1970-01-01'::timestamptz)
    ) then
      raise exception 'Gere e arquive o PDF oficial aprovado antes de marcar a proposta como enviada.'
        using errcode='23514';
    end if;
  end if;

  if tg_table_name = 'crm_contratos'
     and new.status in ('aprovado','enviado') then
    if btrim(coalesce(new.objeto_escopo,'')) = '' then
      faltas := array_append(faltas,'objeto/escopo');
    end if;
    if coalesce(new.arquivo_url,'') !~* '^https://[^[:space:]]+' then
      faltas := array_append(faltas,'link HTTPS do documento revisado');
    end if;
    foreach chave in array array[
      'prestadora_razao','prestadora_documento','prestadora_endereco',
      'prestadora_representante','cliente_endereco','cliente_representante',
      'anexo_entregas','anexo_etapas','anexo_direitos'
    ] loop
      if btrim(coalesce(new.campos_pdf ->> chave,'')) = '' then
        faltas := array_append(faltas,chave);
      end if;
    end loop;
    if array_length(faltas,1) is not null then
      raise exception 'Contrato incompleto: %', array_to_string(faltas,', ')
        using errcode='23514';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists dw_crm_validar_envio_proposta on public.crm_propostas;
create trigger dw_crm_validar_envio_proposta
before update of status on public.crm_propostas
for each row execute function public.dw_crm_validar_documento_para_envio();

drop trigger if exists dw_crm_validar_envio_contrato on public.crm_contratos;
create trigger dw_crm_validar_envio_contrato
before update of status on public.crm_contratos
for each row execute function public.dw_crm_validar_documento_para_envio();

comment on function public.dw_crm_validar_documento_para_envio() is
  'Exige dados verificáveis para aprovação/envio e um PDF de proposta arquivado após aprovação; não altera históricos.';
