-- Fluxo interno: documentos externos têm revisão jurídica/humana antes de assinatura.
-- Jamais considerar um contrato gerado/arquivado como assinado automaticamente.

alter table public.crm_contratos
  add constraint crm_contratos_modelo_compativel
  check (
    (negociacao_id is not null and tipo_modelo in ('servico_remunerado','parceria_remunerada'))
    or (parceria_gratuita_id is not null and tipo_modelo in ('servico_gratuito','parceria_gratuita'))
  );

create or replace function public.dw_crm_validar_status_contrato()
returns trigger language plpgsql set search_path = ''
as $$
declare
  cargo text;
begin
  cargo := app_private.current_profile() ->> 'cargo';

  if old.status in ('aprovado','enviado','aguardando_assinatura')
    and (new.objeto_escopo is distinct from old.objeto_escopo or
         new.tipo_modelo is distinct from old.tipo_modelo or
         (new.arquivo_url is distinct from old.arquivo_url
            and not (old.status = 'aguardando_assinatura' and new.status = 'assinado'))) then
      raise exception 'Documento aprovado/enviado não pode ser alterado; crie nova versão'
        using errcode = '23514';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'rascunho' and new.status in ('em_revisao','cancelado'))
      or (old.status = 'em_revisao' and new.status in ('aprovado','rascunho','cancelado'))
      or (old.status = 'aprovado' and new.status in ('enviado','cancelado'))
      or (old.status = 'enviado' and new.status in ('aguardando_assinatura','cancelado'))
      or (old.status = 'aguardando_assinatura' and new.status in ('assinado','cancelado'))
    ) then
      raise exception 'Transição de status inválida para contrato'
        using errcode = '23514';
    end if;
    if new.status = 'aprovado' then
      if cargo <> 'diretoria' then
        raise exception 'Somente a diretoria pode aprovar contratos'
          using errcode = '42501';
      end if;
      if nullif(btrim(coalesce(new.arquivo_url,'')),'') is null then
        raise exception 'Anexe o documento revisado antes de aprovar o contrato';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists dw_crm_status_contrato_tr on public.crm_contratos;
create trigger dw_crm_status_contrato_tr
before update on public.crm_contratos
for each row execute function public.dw_crm_validar_status_contrato();

-- Propostas também têm de ser aprovadas pela Diretoria antes de enviadas.
create or replace function public.dw_crm_validar_aprovacao_proposta()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status in ('aprovada','enviada','aceita') and old.status not in ('aprovada','enviada','aceita')
     and (app_private.current_profile() ->> 'cargo') <> 'diretoria' then
    raise exception 'Somente a diretoria pode aprovar proposta comercial'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists dw_crm_validar_aprovacao_proposta_tr on public.crm_propostas;
create trigger dw_crm_validar_aprovacao_proposta_tr
before update on public.crm_propostas
for each row execute function public.dw_crm_validar_aprovacao_proposta();
