-- Notificações reais de entrega, vinculadas a projeto/episódio e sem alterar avisos do chat.
alter table public.notificacoes
  add column if not exists projeto_id bigint references public.projetos(id) on delete set null,
  add column if not exists episodio_id bigint references public.projeto_episodios(id) on delete set null,
  add column if not exists entrega_id bigint references public.entregas_producao(id) on delete set null;

alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('mensagem', 'mencao', 'resposta', 'entrega_semana'));

create unique index if not exists notificacoes_entrega_unica_por_destinatario
  on public.notificacoes (destinatario_login, entrega_id)
  where entrega_id is not null;
create index if not exists notificacoes_projeto_atividade_idx
  on public.notificacoes (projeto_id, created_at desc)
  where projeto_id is not null;

-- O emissor não possui INSERT direto em notificacoes: a gravação do
-- formulário é persistida em entregas_producao e este trigger gera o aviso.
create or replace function app_private.dw_avisar_nova_entrega()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_projeto text;
  v_episodio text;
  v_semana text;
begin
  -- Não gerar avisos por importações de planilhas antigas ou registros sem EP.
  -- Apenas submissões do formulário exclusivo e registrado para o episódio.
  if new.episodio_id is null
     or not exists (
       select 1 from public.projeto_episodios ep
       where ep.id = new.episodio_id
         and ep.projeto_id = new.projeto_id
         and ep.form_entregas_id is not null
         and new.resposta_id like ep.form_entregas_id || ':%'
     )
  then
    return new;
  end if;

  select p.projeto into v_projeto
  from public.projetos p where p.id = new.projeto_id;

  select 'EP ' || lpad(e.numero::text, 2, '0')
    into v_episodio
  from public.projeto_episodios e
  where e.id = new.episodio_id and e.projeto_id = new.projeto_id;

  v_semana := nullif(btrim(coalesce(new.semana, '')), '');

  insert into public.notificacoes (
    destinatario_login, tipo, canal_id, mensagem_id,
    autor_login, autor_nome, titulo, texto_preview,
    projeto_id, episodio_id, entrega_id
  )
  select
    lower(btrim(u.login)), 'entrega_semana', null, null,
    '', coalesce(nullif(btrim(new.dublador), ''), 'Dublador'),
    'Nova entrega · ' || coalesce(v_projeto, 'Projeto') ||
      case when v_episodio is not null then ' · ' || v_episodio else '' end,
    coalesce(nullif(btrim(new.dublador), ''), 'Um participante') ||
      ' enviou ' || coalesce(nullif(btrim(new.personagem), ''), 'uma gravação') ||
      case when v_semana is not null then ' (' || v_semana || ')' else '' end || '.',
    new.projeto_id, new.episodio_id, new.id
  from public.usuarios u
  where lower(btrim(coalesce(u.cargo, ''))) in ('diretoria', 'adm')
    and coalesce(u.acesso_revogado, false) = false
    and nullif(btrim(coalesce(u.login, '')), '') is not null
  on conflict (destinatario_login, entrega_id)
    where entrega_id is not null do nothing;

  return new;
end;
$function$;

drop trigger if exists dw_notificar_nova_entrega on public.entregas_producao;
create trigger dw_notificar_nova_entrega
after insert on public.entregas_producao
for each row execute function app_private.dw_avisar_nova_entrega();

-- Prevenir chamadas diretas: esta função deve ser executada apenas pelo trigger.
revoke all on function app_private.dw_avisar_nova_entrega() from public, anon, authenticated;
