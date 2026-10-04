-- DubWorks Manager — vincula cobranças de episódio à fila do WhatsApp
-- 2026-10-04

create or replace function public.enfileirar_lembrete_whatsapp(
  p_projeto_id bigint,
  p_semana integer,
  p_personagem text,
  p_dublador text,
  p_telefone text,
  p_mensagem text,
  p_tipo_lembrete text default 'manual'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_email text;
  v_cargo text;
  v_telefone text;
  v_membro_id text;
  v_chave text;
  v_id uuid;
  v_episodio_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  select lower(trim(coalesce(u.cargo, '')))
  into v_cargo
  from public.usuarios u
  where lower(trim(u.login)) = v_email
  limit 1;

  if v_cargo is null then
    raise exception 'Perfil do usuário não encontrado.';
  end if;

  if v_cargo <> 'diretoria' then
    raise exception 'Você não tem permissão para enviar lembretes pelo WhatsApp.';
  end if;

  if p_projeto_id is null then
    raise exception 'Projeto não informado.';
  end if;

  if p_semana is null or p_semana < 1 then
    raise exception 'Semana/episódio inválido.';
  end if;

  if trim(coalesce(p_personagem, '')) = '' then
    raise exception 'Personagem não informado.';
  end if;

  if trim(coalesce(p_mensagem, '')) = '' then
    raise exception 'Mensagem vazia.';
  end if;

  v_telefone := public.normalizar_telefone_br(p_telefone);

  if length(v_telefone) not in (10, 11) then
    raise exception 'Telefone inválido.';
  end if;

  if not exists (
    select 1
    from public.projetos p
    where p.id = p_projeto_id
  ) then
    raise exception 'Projeto não encontrado.';
  end if;

  if not exists (
    select 1
    from public.elenco e
    where e.projeto_id = p_projeto_id
      and public.normalizar_telefone_br(e.telefone_dublador) = v_telefone
      and lower(trim(e.personagem)) = lower(trim(p_personagem))
  ) then
    raise exception
      'O telefone informado não pertence a este personagem no elenco do projeto.';
  end if;

  select m.id::text
  into v_membro_id
  from public.membros m
  where public.normalizar_telefone_br(m.telefone) = v_telefone
  limit 1;

  if lower(coalesce(p_tipo_lembrete, 'manual')) = 'episodio_pendente' then
    select pe.id
    into v_episodio_id
    from public.projeto_episodios pe
    where pe.projeto_id = p_projeto_id
      and pe.numero = p_semana
    limit 1;
  end if;

  v_chave :=
      lower(coalesce(p_tipo_lembrete, 'manual'))
      || ':'
      || p_projeto_id::text
      || ':'
      || coalesce(v_episodio_id::text, p_semana::text)
      || ':'
      || v_telefone
      || ':'
      || md5(lower(trim(p_personagem)))
      || ':'
      || current_date::text;

  insert into public.whatsapp_queue (
    projeto_id,
    episodio_id,
    membro_id,
    telefone,
    mensagem,
    semana,
    personagem,
    dublador,
    tipo_lembrete,
    chave_unica,
    status,
    agendado_para
  )
  values (
    p_projeto_id::text,
    v_episodio_id,
    v_membro_id,
    '55' || v_telefone,
    trim(p_mensagem),
    p_semana,
    trim(p_personagem),
    trim(coalesce(p_dublador, '')),
    lower(coalesce(p_tipo_lembrete, 'manual')),
    v_chave,
    'pendente',
    now()
  )
  on conflict (chave_unica)
  do nothing
  returning id
  into v_id;

  if v_id is null then
    return jsonb_build_object(
      'ok', true,
      'duplicado', true,
      'episodio_id', v_episodio_id,
      'mensagem', 'Este lembrete já foi colocado na fila hoje.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicado', false,
    'id', v_id,
    'episodio_id', v_episodio_id,
    'telefone', '55' || v_telefone
  );
end;
$function$;
