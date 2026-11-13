-- Integração atividade -> notificações. Ações administrativas permanecem no histórico.
-- Regravações geram um único aviso por registro/destinatário, sem retroagir
-- nem notificar aprovações e associações antigas.
alter table public.notificacoes
  add column if not exists historico_id bigint references public.episodio_historico(id) on delete set null;

alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes
  add constraint notificacoes_tipo_check check (
    tipo in ('mensagem', 'mencao', 'resposta', 'entrega_semana', 'regravacao_solicitada')
  );

create unique index if not exists notificacoes_historico_destinatario_unico
  on public.notificacoes(destinatario_login, historico_id)
  where historico_id is not null;

create index if not exists episodio_historico_projeto_atividade_idx
  on public.episodio_historico(projeto_id, criado_em desc, id desc);

create or replace function app_private.dw_avisar_regravacao()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  v_projeto text;
  v_numero integer;
begin
  if new.tipo <> 'regravacao_solicitada' then
    return new;
  end if;

  select p.projeto, e.numero into v_projeto, v_numero
    from public.projeto_episodios e
    join public.projetos p on p.id = e.projeto_id
    where e.id = new.episodio_id and e.projeto_id = new.projeto_id;

  if not found then
    return new;
  end if;

  insert into public.notificacoes (
    destinatario_login, tipo, canal_id, mensagem_id,
    autor_login, autor_nome, titulo, texto_preview,
    projeto_id, episodio_id, historico_id
  )
  select
    lower(btrim(u.login)),
    'regravacao_solicitada', null, null,
    '', coalesce(nullif(btrim(new.usuario), ''), 'Produção'),
    'Regravação · ' || coalesce(v_projeto, 'Projeto') ||
      ' · EP ' || lpad(v_numero::text, 2, '0'),
    left(new.descricao, 400),
    new.projeto_id, new.episodio_id, new.id
  from public.usuarios u
  where lower(btrim(coalesce(u.cargo, ''))) in ('diretoria', 'adm')
    and coalesce(u.acesso_revogado, false) = false
    and nullif(btrim(coalesce(u.login, '')), '') is not null
  on conflict (destinatario_login, historico_id)
    where historico_id is not null do nothing;

  return new;
end;
$function$;

revoke all on function app_private.dw_avisar_regravacao()
  from public, anon, authenticated;

drop trigger if exists dw_notificar_regravacao on public.episodio_historico;
create trigger dw_notificar_regravacao
after insert on public.episodio_historico
for each row execute function app_private.dw_avisar_regravacao();
