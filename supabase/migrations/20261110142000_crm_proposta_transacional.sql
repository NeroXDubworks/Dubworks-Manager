-- Geração transacional de propostas, com itens e valores calculados pelo servidor.
-- SECURITY INVOKER = respeita as policies RLS de CRM.

create or replace function public.dw_crm_criar_proposta(
  p_negociacao_id bigint,
  p_titulo text,
  p_escopo text,
  p_itens jsonb,
  p_valor_manual numeric default null,
  p_custo_interno numeric default null,
  p_justificativa text default null
)
returns bigint language plpgsql security invoker set search_path = ''
as $$
declare
  row_item jsonb;
  qtd numeric;
  preco numeric;
  referencia numeric := 0;
  total numeric;
  v_modo text;
  v_proposta bigint;
  v_versao integer;
begin
  if not app_private.can_manage_crm() then
    raise exception 'Permissão comercial insuficiente' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_titulo,'')), '') is null then
    raise exception 'Título obrigatório';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe pelo menos um serviço';
  end if;
  if not exists (select 1 from public.crm_negociacoes where id = p_negociacao_id) then
    raise exception 'Negociação não encontrada';
  end if;

  for row_item in select value from jsonb_array_elements(p_itens) as value loop
    if nullif(btrim(coalesce(row_item ->> 'descricao','')), '') is null then
      raise exception 'Descrição do serviço obrigatória';
    end if;
    qtd := (row_item ->> 'quantidade')::numeric;
    preco := (row_item ->> 'preco_unitario')::numeric;
    if qtd <= 0 or preco < 0 or qtd is null or preco is null then
      raise exception 'Quantidade ou preço inválido';
    end if;
    referencia := referencia + round(qtd * preco, 2);
  end loop;

  referencia := round(referencia, 2);
  if p_valor_manual is not null and (p_valor_manual < 0 or p_valor_manual > 999999999999.99) then
    raise exception 'Valor personalizado inválido';
  end if;
  if p_custo_interno is not null and p_custo_interno < 0 then
    raise exception 'Custo interno inválido';
  end if;
  if p_valor_manual is not null and nullif(btrim(coalesce(p_justificativa,'')), '') is null then
    raise exception 'Informe justificativa do preço personalizado';
  end if;

  total := coalesce(round(p_valor_manual,2), referencia);
  v_modo := case when p_valor_manual is not null then 'personalizado' else 'automatico' end;

  select coalesce(max(versao),0) + 1 into v_versao from public.crm_propostas
  where negociacao_id = p_negociacao_id;

  insert into public.crm_propostas (
    negociacao_id,versao,titulo,descricao_escopo,modo_preco,
    valor_referencia,valor_negociado,custo_interno_estimado,justificativa_valor
  ) values (
    p_negociacao_id,v_versao,btrim(p_titulo),p_escopo,v_modo,
    referencia,total,p_custo_interno,p_justificativa
  ) returning id into v_proposta;

  for row_item in select value from jsonb_array_elements(p_itens) as value loop
    insert into public.crm_proposta_itens (
      proposta_id,servico_id,descricao,unidade,quantidade,preco_unitario
    ) values (
      v_proposta,
      nullif(row_item ->> 'servico_id','')::bigint,
      btrim(row_item ->> 'descricao'),
      coalesce(nullif(btrim(row_item ->> 'unidade'),''),'projeto'),
      (row_item ->> 'quantidade')::numeric,
      round((row_item ->> 'preco_unitario')::numeric,2)
    );
  end loop;

  return v_proposta;
end;
$$;

revoke execute on function public.dw_crm_criar_proposta(bigint,text,text,jsonb,numeric,numeric,text)
from public, anon;
grant execute on function public.dw_crm_criar_proposta(bigint,text,text,jsonb,numeric,numeric,text)
to authenticated;

-- Documentos assinados são imutáveis: correção posterior exige nova versão/aditivo.
create or replace function public.dw_crm_bloquear_contrato_assinado()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status = 'assinado' then
    raise exception 'Contrato já assinado: crie um aditivo ou nova versão'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists dw_crm_contrato_assinado_immutavel on public.crm_contratos;
create trigger dw_crm_contrato_assinado_immutavel
before update on public.crm_contratos
for each row execute function public.dw_crm_bloquear_contrato_assinado();

create or replace function public.dw_crm_bloquear_proposta_aceita()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status = 'aceita' then
    raise exception 'Proposta aceita: crie uma nova versão para alterações'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists dw_crm_proposta_aceita_immutavel on public.crm_propostas;
create trigger dw_crm_proposta_aceita_immutavel
before update on public.crm_propostas
for each row execute function public.dw_crm_bloquear_proposta_aceita();
