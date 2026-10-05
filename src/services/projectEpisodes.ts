import { supabase } from "../lib/supabase";
import type { ElencoItem, EntregaProducao } from "../types";

export type EpisodioStatus =
  | "nao_iniciado"
  | "aguardando"
  | "em_producao"
  | "pausado"
  | "finalizado";

export type ProjetoEpisodio = {
  id: number;
  projeto_id: number;
  numero: number;
  titulo: string;
  descricao?: string | null;
  status: EpisodioStatus;
  prazo_em?: string | null;
  data_inicio?: string | null;
  data_conclusao?: string | null;
  finalizacao_manual?: boolean;
  registro_legado?: boolean;
  observacoes?: string | null;
  pasta_drive_id?: string | null;
  pasta_cortes_id?: string | null;
  pasta_entregas_id?: string | null;
  pasta_finalizado_id?: string | null;
  criado_por?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type EpisodioElenco = {
  id: number;
  projeto_id: number;
  episodio_id: number;
  elenco_id?: number | null;
  personagem: string;
  dublador?: string | null;
  telefone?: string | null;
  status?: string | null;
  substitui_elenco_id?: number | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type SelecaoVaga = {
  id: number;
  projeto_id: number;
  episodio_id?: number | null;
  episodio_elenco_id?: number | null;
  personagem: string;
  tipo: "normal" | "emergencial";
  motivo?: string | null;
  dublador_anterior_id?: number | null;
  status: "aberta" | "avaliacao" | "encerrada";
  prazo?: string | null;
  escopo_aprovacao?: string | null;
  criada_por?: string | null;
  criada_em?: string | null;
};

export type EscopoAprovacaoSelecao =
  | "somente_episodio"
  | "a_partir_episodio"
  | "projeto_diante";

export type EpisodioHistorico = {
  id: number;
  projeto_id: number;
  episodio_id: number;
  tipo: string;
  descricao: string;
  usuario?: string | null;
  dados?: Record<string, unknown> | null;
  criado_em?: string | null;
};

function projetoNumero(projetoId: string | number) {
  const numero = Number(projetoId);
  if (!Number.isFinite(numero)) {
    throw new Error("Projeto inválido.");
  }
  return numero;
}

export async function criarEstruturaDriveEpisodio(params: {
  projectFolderId: string;
  finalizadosFolderId: string;
  numero: number;
  titulo?: string;
}) {
  const { data, error } = await supabase.functions.invoke(
    "google-drive-create-structure",
    {
      body: {
        action: "criar_estrutura_episodio",
        projectFolderId: params.projectFolderId,
        finalizadosFolderId: params.finalizadosFolderId,
        numero: params.numero,
        titulo: params.titulo || "",
      },
    }
  );

  if (error) throw error;
  if (!data || data.error || data.ok === false) {
    throw new Error(
      String(data?.error || data?.message || "Falha ao criar pastas do episódio.")
    );
  }

  return data as {
    ok: true;
    episodioId: string;
    episodio: string;
    cortesId: string;
    cortes: string;
    entregasId: string;
    entregas: string;
    finalizadoId: string;
    finalizado: string;
  };
}

async function moverEstruturaDriveEpisodio(
  action: "finalizar_episodio" | "reabrir_episodio",
  episodio: ProjetoEpisodio
) {
  if (!episodio.pasta_drive_id || !episodio.pasta_finalizado_id) {
    return { ok: true, movidos: 0, legadoSemPastas: true };
  }

  const { data, error } = await supabase.functions.invoke(
    "google-drive-create-structure",
    {
      body: {
        action,
        pastaDriveId: episodio.pasta_drive_id,
        pastaFinalizadoId: episodio.pasta_finalizado_id,
      },
    }
  );

  if (error) throw error;
  if (!data || data.error || data.ok === false) {
    throw new Error(
      String(
        data?.error ||
          data?.message ||
          "Não foi possível mover os arquivos do episódio no Google Drive."
      )
    );
  }

  return data;
}

export async function iniciarProducaoEpisodio(
  episodio: ProjetoEpisodio,
  usuario?: string
) {
  const atualizado = await atualizarEpisodioProjeto(episodio.id, {
    status: "em_producao",
    data_inicio:
      episodio.data_inicio || new Date().toISOString().slice(0, 10),
  });

  await registrarHistoricoEpisodio({
    projetoId: episodio.projeto_id,
    episodioId: episodio.id,
    tipo: "producao_iniciada",
    descricao: "Produção do episódio iniciada.",
    usuario,
  });

  return atualizado;
}

export async function carregarEpisodiosProjeto(
  projetoId: string | number
): Promise<ProjetoEpisodio[]> {
  const { data, error } = await supabase
    .from("projeto_episodios")
    .select("*")
    .eq("projeto_id", projetoNumero(projetoId))
    .order("numero", { ascending: true });

  if (error) throw error;
  return (data || []) as ProjetoEpisodio[];
}

export async function criarEpisodioProjeto(params: {
  projetoId: string | number;
  numero: number;
  titulo: string;
  descricao?: string;
  prazoEm?: string;
  criadoPor?: string;
}) {
  const payload = {
    projeto_id: projetoNumero(params.projetoId),
    numero: params.numero,
    titulo: params.titulo.trim() || "Sem título",
    descricao: params.descricao?.trim() || null,
    prazo_em: params.prazoEm || null,
    status: "nao_iniciado",
    criado_por: params.criadoPor?.trim() || null,
  };

  const { data, error } = await supabase
    .from("projeto_episodios")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  await registrarHistoricoEpisodio({
    projetoId: params.projetoId,
    episodioId: data.id,
    tipo: "episodio_criado",
    descricao: "Episódio " + params.numero + " criado.",
    usuario: params.criadoPor,
  });

  return data as ProjetoEpisodio;
}

export async function atualizarEpisodioProjeto(
  episodioId: number,
  patch: Partial<
    Pick<
      ProjetoEpisodio,
      | "titulo"
      | "descricao"
      | "status"
      | "prazo_em"
      | "data_inicio"
      | "data_conclusao"
      | "observacoes"
      | "finalizacao_manual"
      | "registro_legado"
      | "pasta_drive_id"
      | "pasta_cortes_id"
      | "pasta_entregas_id"
      | "pasta_finalizado_id"
    >
  >
) {
  const { data, error } = await supabase
    .from("projeto_episodios")
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq("id", episodioId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ProjetoEpisodio;
}

export async function finalizarEpisodioProjeto(params: {
  episodio: ProjetoEpisodio;
  usuario?: string;
  legado?: boolean;
  dataConclusao?: string;
  observacao?: string;
}) {
  const dataConclusao =
    params.dataConclusao || new Date().toISOString().slice(0, 10);

  if (!params.legado) {
    await moverEstruturaDriveEpisodio("finalizar_episodio", params.episodio);
  }

  const atualizado = await atualizarEpisodioProjeto(params.episodio.id, {
    status: "finalizado",
    data_conclusao: dataConclusao,
    finalizacao_manual: true,
    registro_legado: Boolean(params.legado),
    observacoes:
      params.observacao?.trim() || params.episodio.observacoes || null,
  });

  await registrarHistoricoEpisodio({
    projetoId: params.episodio.projeto_id,
    episodioId: params.episodio.id,
    tipo: params.legado ? "finalizacao_legado" : "finalizacao_manual",
    descricao: params.legado
      ? "Episódio marcado como concluído (registro legado)."
      : "Episódio marcado como concluído manualmente.",
    usuario: params.usuario,
    dados: { data_conclusao: dataConclusao },
  });

  return atualizado;
}

export async function reabrirEpisodioProjeto(
  episodio: ProjetoEpisodio,
  usuario?: string
) {
  if (!episodio.registro_legado) {
    await moverEstruturaDriveEpisodio("reabrir_episodio", episodio);
  }

  const atualizado = await atualizarEpisodioProjeto(episodio.id, {
    status: "em_producao",
    data_conclusao: null,
    finalizacao_manual: false,
  });

  await registrarHistoricoEpisodio({
    projetoId: episodio.projeto_id,
    episodioId: episodio.id,
    tipo: "episodio_reaberto",
    descricao: "Episódio reaberto para produção.",
    usuario,
  });

  return atualizado;
}

export async function carregarElencoEpisodio(
  episodioId: number
): Promise<EpisodioElenco[]> {
  const { data, error } = await supabase
    .from("episodio_elenco")
    .select("*")
    .eq("episodio_id", episodioId)
    .order("id", { ascending: true });

  if (error) throw error;
  return (data || []) as EpisodioElenco[];
}

export async function adicionarElencoAoEpisodio(params: {
  projetoId: string | number;
  episodioId: number;
  item: ElencoItem;
  usuario?: string;
}) {
  const elencoId = Number(params.item.id);
  const payload = {
    projeto_id: projetoNumero(params.projetoId),
    episodio_id: params.episodioId,
    elenco_id: Number.isFinite(elencoId) ? elencoId : null,
    personagem: String(params.item.personagem || "").trim(),
    dublador: String(params.item.dublador || "").trim() || null,
    telefone: String(params.item.telefone_dublador || "").trim() || null,
    status: params.item.dublador?.trim() ? "pendente" : "em_selecao",
  };

  if (!payload.personagem) throw new Error("Personagem não informado.");

  const { data, error } = await supabase
    .from("episodio_elenco")
    .upsert(payload, { onConflict: "episodio_id,personagem" })
    .select("*")
    .single();

  if (error) throw error;

  await registrarHistoricoEpisodio({
    projetoId: params.projetoId,
    episodioId: params.episodioId,
    tipo: "elenco_adicionado",
    descricao: "Personagem " + payload.personagem + " adicionado ao episódio.",
    usuario: params.usuario,
    dados: { personagem: payload.personagem, dublador: payload.dublador },
  });

  return data as EpisodioElenco;
}

export async function removerElencoDoEpisodio(params: {
  episodioElencoId: number;
  projetoId: string | number;
  episodioId: number;
  personagem?: string;
  usuario?: string;
}) {
  const { error } = await supabase
    .from("episodio_elenco")
    .delete()
    .eq("id", params.episodioElencoId);

  if (error) throw error;

  await registrarHistoricoEpisodio({
    projetoId: params.projetoId,
    episodioId: params.episodioId,
    tipo: "elenco_removido",
    descricao:
      "Personagem " + (params.personagem || "sem identificação") + " removido do episódio.",
    usuario: params.usuario,
    dados: { personagem: params.personagem || null },
  });
}

export async function carregarEntregasEpisodio(
  episodioId: number
): Promise<EntregaProducao[]> {
  const { data, error } = await supabase
    .from("entregas_producao")
    .select("*")
    .eq("episodio_id", episodioId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return (data || []) as EntregaProducao[];
}

export async function carregarVagasEpisodio(
  episodioId: number
): Promise<SelecaoVaga[]> {
  const { data, error } = await supabase
    .from("selecao_vagas")
    .select("*")
    .eq("episodio_id", episodioId)
    .order("criada_em", { ascending: false });

  if (error) throw error;
  return (data || []) as SelecaoVaga[];
}

export async function abrirSelecaoEmergencial(params: {
  projetoId: string | number;
  episodioId: number;
  episodioElencoId?: number;
  personagem: string;
  motivo: string;
  prazo?: string;
  criadaPor?: string;
  dubladorAnteriorId?: number | null;
}) {
  const payload = {
    projeto_id: projetoNumero(params.projetoId),
    episodio_id: params.episodioId,
    episodio_elenco_id: params.episodioElencoId || null,
    personagem: params.personagem.trim(),
    tipo: "emergencial",
    motivo: params.motivo.trim() || "Substituição emergencial.",
    dublador_anterior_id: params.dubladorAnteriorId || null,
    status: "aberta",
    prazo: params.prazo || null,
    criada_por: params.criadaPor?.trim() || null,
  };

  const { data, error } = await supabase
    .from("selecao_vagas")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  await registrarHistoricoEpisodio({
    projetoId: params.projetoId,
    episodioId: params.episodioId,
    tipo: "selecao_emergencial",
    descricao:
      "Seleção emergencial aberta para " + params.personagem + ".",
    usuario: params.criadaPor,
    dados: { motivo: payload.motivo, prazo: payload.prazo },
  });

  return data as SelecaoVaga;
}

export async function marcarSelecaoEmAvaliacao(params: {
  vaga: SelecaoVaga;
  usuario?: string;
}) {
  const { data, error } = await supabase
    .from("selecao_vagas")
    .update({ status: "avaliacao" })
    .eq("id", params.vaga.id)
    .select("*")
    .single();

  if (error) throw error;

  if (params.vaga.episodio_id) {
    await registrarHistoricoEpisodio({
      projetoId: params.vaga.projeto_id,
      episodioId: params.vaga.episodio_id,
      tipo: "selecao_em_avaliacao",
      descricao:
        "Seleção de " + params.vaga.personagem + " movida para avaliação.",
      usuario: params.usuario,
    });
  }

  return data as SelecaoVaga;
}

export async function encerrarSelecaoSemSubstituicao(params: {
  vaga: SelecaoVaga;
  usuario?: string;
}) {
  const { data, error } = await supabase
    .from("selecao_vagas")
    .update({ status: "encerrada", escopo_aprovacao: null })
    .eq("id", params.vaga.id)
    .select("*")
    .single();

  if (error) throw error;

  if (params.vaga.episodio_id) {
    await registrarHistoricoEpisodio({
      projetoId: params.vaga.projeto_id,
      episodioId: params.vaga.episodio_id,
      tipo: "selecao_encerrada_sem_substituicao",
      descricao:
        "Seleção de " +
        params.vaga.personagem +
        " encerrada sem substituição aprovada.",
      usuario: params.usuario,
    });
  }

  return data as SelecaoVaga;
}

export async function aprovarSelecaoEmergencial(params: {
  vaga: SelecaoVaga;
  dublador: string;
  telefone?: string;
  escopo: EscopoAprovacaoSelecao;
  usuario?: string;
}) {
  const dublador = String(params.dublador || "").trim();
  const telefone = String(params.telefone || "").trim();
  const personagem = String(params.vaga.personagem || "").trim();

  if (!dublador) throw new Error("Informe o dublador aprovado.");
  if (!personagem) throw new Error("A vaga não possui personagem.");
  if (!params.vaga.episodio_id) {
    throw new Error("A seleção emergencial não está vinculada a um episódio.");
  }

  const { data: episodioAtual, error: erroEpisodio } = await supabase
    .from("projeto_episodios")
    .select("id,numero")
    .eq("id", params.vaga.episodio_id)
    .eq("projeto_id", params.vaga.projeto_id)
    .single();

  if (erroEpisodio || !episodioAtual) {
    throw erroEpisodio || new Error("Episódio da seleção não encontrado.");
  }

  const { data: linhaAtual, error: erroLinhaAtual } = await supabase
    .from("episodio_elenco")
    .select("id,elenco_id,personagem,dublador,telefone")
    .eq("id", params.vaga.episodio_elenco_id || -1)
    .maybeSingle();

  if (erroLinhaAtual) throw erroLinhaAtual;

  const dubladorAnterior = String(linhaAtual?.dublador || "").trim();
  const telefoneAnterior = String(linhaAtual?.telefone || "").trim();

  let episodiosAlvo = [Number(params.vaga.episodio_id)];

  if (params.escopo !== "somente_episodio") {
    const { data: futuros, error: erroFuturos } = await supabase
      .from("projeto_episodios")
      .select("id,numero")
      .eq("projeto_id", params.vaga.projeto_id)
      .gte("numero", Number(episodioAtual.numero));

    if (erroFuturos) throw erroFuturos;
    episodiosAlvo = (futuros || []).map((item: any) => Number(item.id));
  }

  const { data: elencoEpisodios, error: erroElencoEpisodios } = await supabase
    .from("episodio_elenco")
    .select("id,episodio_id,personagem,elenco_id")
    .eq("projeto_id", params.vaga.projeto_id)
    .in("episodio_id", episodiosAlvo);

  if (erroElencoEpisodios) throw erroElencoEpisodios;

  const normalizarPersonagem = (valor: unknown) =>
    String(valor || "")
      .trim()
      .toLocaleLowerCase("pt-BR");

  const idsAlvo = (elencoEpisodios || [])
    .filter(
      (item: any) =>
        normalizarPersonagem(item.personagem) ===
        normalizarPersonagem(personagem)
    )
    .map((item: any) => Number(item.id));

  if (
    params.vaga.episodio_elenco_id &&
    !idsAlvo.includes(Number(params.vaga.episodio_elenco_id))
  ) {
    idsAlvo.push(Number(params.vaga.episodio_elenco_id));
  }

  if (!idsAlvo.length) {
    throw new Error(
      "Não encontrei o personagem no elenco do episódio para aplicar a substituição."
    );
  }

  const substituiElencoId =
    Number(params.vaga.dublador_anterior_id || linhaAtual?.elenco_id || 0) ||
    null;

  const { error: erroAtualizarEpisodios } = await supabase
    .from("episodio_elenco")
    .update({
      dublador,
      telefone: telefone || null,
      status: "pendente",
      substitui_elenco_id: substituiElencoId,
      atualizado_em: new Date().toISOString(),
    })
    .in("id", idsAlvo);

  if (erroAtualizarEpisodios) throw erroAtualizarEpisodios;

  if (params.escopo === "projeto_diante") {
    let elencoProjetoId = substituiElencoId;

    if (!elencoProjetoId) {
      const { data: candidatos, error: erroCandidatos } = await supabase
        .from("elenco")
        .select("id,personagem")
        .eq("projeto_id", params.vaga.projeto_id)
        .eq("ativo", true);

      if (erroCandidatos) throw erroCandidatos;

      const encontrado = (candidatos || []).find(
        (item: any) =>
          normalizarPersonagem(item.personagem) ===
          normalizarPersonagem(personagem)
      );
      elencoProjetoId = encontrado ? Number(encontrado.id) : null;
    }

    if (!elencoProjetoId) {
      throw new Error(
        "Não encontrei o personagem no Banco do Projeto para aplicar o novo dublador."
      );
    }

    const { error: erroBancoProjeto } = await supabase
      .from("elenco")
      .update({
        dublador,
        telefone_dublador: telefone,
      })
      .eq("id", elencoProjetoId)
      .eq("projeto_id", params.vaga.projeto_id)
      .eq("ativo", true);

    if (erroBancoProjeto) throw erroBancoProjeto;
  }

  const { data: vagaAtualizada, error: erroVaga } = await supabase
    .from("selecao_vagas")
    .update({
      status: "encerrada",
      escopo_aprovacao: params.escopo,
    })
    .eq("id", params.vaga.id)
    .select("*")
    .single();

  if (erroVaga) throw erroVaga;

  await registrarHistoricoEpisodio({
    projetoId: params.vaga.projeto_id,
    episodioId: params.vaga.episodio_id,
    tipo: "substituicao_aprovada",
    descricao:
      "Substituição aprovada para " +
      personagem +
      ": " +
      (dubladorAnterior || "sem dublador anterior") +
      " → " +
      dublador +
      ".",
    usuario: params.usuario,
    dados: {
      vaga_id: params.vaga.id,
      personagem,
      dublador_anterior: dubladorAnterior || null,
      telefone_anterior: telefoneAnterior || null,
      dublador_aprovado: dublador,
      telefone_aprovado: telefone || null,
      escopo: params.escopo,
      episodios_afetados: episodiosAlvo,
    },
  });

  return vagaAtualizada as SelecaoVaga;
}

export async function carregarHistoricoEpisodio(
  episodioId: number
): Promise<EpisodioHistorico[]> {
  const { data, error } = await supabase
    .from("episodio_historico")
    .select("*")
    .eq("episodio_id", episodioId)
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as EpisodioHistorico[];
}

export async function registrarHistoricoEpisodio(params: {
  projetoId: string | number;
  episodioId: number;
  tipo: string;
  descricao: string;
  usuario?: string;
  dados?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("episodio_historico").insert({
    projeto_id: projetoNumero(params.projetoId),
    episodio_id: params.episodioId,
    tipo: params.tipo,
    descricao: params.descricao,
    usuario: params.usuario?.trim() || null,
    dados: params.dados || {},
  });

  if (error) throw error;
}

export function resumoEntregasEpisodio(
  elenco: EpisodioElenco[],
  entregas: EntregaProducao[]
) {
  const porPersonagem = new Map<string, EntregaProducao[]>();

  entregas.forEach((entrega) => {
    const chave = String(entrega.personagem || "")
      .trim()
      .toLocaleLowerCase("pt-BR");
    if (!chave) return;
    const lista = porPersonagem.get(chave) || [];
    lista.push(entrega);
    porPersonagem.set(chave, lista);
  });

  const situacoes = elenco.map((item) => {
    const chave = String(item.personagem || "")
      .trim()
      .toLocaleLowerCase("pt-BR");
    const envios = porPersonagem.get(chave) || [];
    const aprovado = envios.some((item) => item.status === "aprovado");
    const regravacao = envios.some((item) => item.status === "regravacao");
    const aguardando = envios.some((item) => item.status === "pendente");

    return {
      ...item,
      entregas: envios,
      aprovado,
      regravacao,
      aguardando,
      pendente: !aprovado,
    };
  });

  const previstos = elenco.length;
  const entregaram = situacoes.filter((item) => item.entregas.length > 0).length;
  const aprovados = situacoes.filter((item) => item.aprovado).length;
  const regravacoes = situacoes.filter((item) => item.regravacao).length;
  const aguardandoAnalise = situacoes.filter((item) => item.aguardando).length;
  const naoEntregaram = Math.max(0, previstos - entregaram);

  return {
    previstos,
    entregaram,
    aprovados,
    regravacoes,
    aguardandoAnalise,
    naoEntregaram,
    progressoRecebimento: previstos
      ? Math.round((entregaram / previstos) * 100)
      : 0,
    progressoAprovacao: previstos
      ? Math.round((aprovados / previstos) * 100)
      : 0,
    situacoes,
  };
}
