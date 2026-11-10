import { supabase } from "../lib/supabase";
import { legacyDeliveryIsCandidate } from "../shared/weekCuts.js";

export type CorteStatus = "nao_iniciada" | "em_andamento" | "pausada" | "concluida";

export type CorteEpisodio = {
  id: number;
  projeto_id: number;
  episodio_id: number;
  semana: number;
  duracao_segundos: number;
  status: CorteStatus;
  motivo_pausa: string | null;
  observacao: string | null;
  prazo_em: string | null;
  video_base_url: string | null;
  trilha_url: string | null;
  criado_por: string | null;
};

export type EntregaCorte = {
  id: number;
  projeto_id: number;
  episodio_id: number | null;
  episodio_corte_id?: number | null;
  semana?: string | null;
  personagem?: string | null;
  dublador?: string | null;
  telefone?: string | null;
  status?: string | null;
  video_url?: string | null;
  comentario?: string | null;
  comentario_lider?: string | null;
  data_envio?: string | null;
};

function inteiroPositivo(value: number, campo: string) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${campo} inválido.`);
  return value;
}

export async function listarCortesEpisodio(projetoId: number, episodioId: number) {
  inteiroPositivo(projetoId, "Projeto");
  inteiroPositivo(episodioId, "Episódio");
  const { data, error } = await supabase.from("episodio_cortes")
    .select("*")
    .eq("projeto_id", projetoId)
    .eq("episodio_id", episodioId)
    .order("semana", { ascending: true });
  if (error) throw error;
  return (data || []) as CorteEpisodio[];
}

export async function criarCorteEpisodio(params: {
  projetoId: number;
  episodioId: number;
  semana: number;
  duracaoSegundos: number;
  usuario: string;
  observacao?: string;
  prazoEm?: string;
  videoBaseUrl?: string;
  trilhaUrl?: string;
}) {
  inteiroPositivo(params.projetoId, "Projeto");
  inteiroPositivo(params.episodioId, "Episódio");
  inteiroPositivo(params.semana, "Semana");
  if (!Number.isInteger(params.duracaoSegundos) || params.duracaoSegundos < 1 || params.duracaoSegundos > 86400) {
    throw new Error("Informe a duração real do corte (até 24 horas).");
  }
  const { data, error } = await supabase.from("episodio_cortes")
    .insert({
      projeto_id: params.projetoId,
      episodio_id: params.episodioId,
      semana: params.semana,
      duracao_segundos: params.duracaoSegundos,
      status: "nao_iniciada",
      observacao: params.observacao?.trim() || null,
      prazo_em: params.prazoEm || null,
      video_base_url: params.videoBaseUrl?.trim() || null,
      trilha_url: params.trilhaUrl?.trim() || null,
      criado_por: params.usuario,
      atualizado_por: params.usuario,
    })
    .select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error("Essa semana já foi cadastrada neste episódio. Atualize a lista.");
    throw error;
  }
  return data as CorteEpisodio;
}

export async function alterarStatusCorte(params: {
  projetoId: number;
  episodioId: number;
  corteId: number;
  status: CorteStatus;
  motivoPausa?: string;
  usuario: string;
}) {
  if (!["nao_iniciada", "em_andamento", "pausada", "concluida"].includes(params.status)) {
    throw new Error("Status inválido.");
  }
  if (params.status === "pausada" && !params.motivoPausa?.trim()) {
    throw new Error("Informe o motivo da pausa.");
  }
  const { data, error } = await supabase.from("episodio_cortes")
    .update({
      status: params.status,
      motivo_pausa: params.status === "pausada" ? params.motivoPausa!.trim() : null,
      atualizado_por: params.usuario,
    })
    .eq("id", params.corteId)
    .eq("projeto_id", params.projetoId)
    .eq("episodio_id", params.episodioId)
    .select("*").single();
  if (error) throw error;
  return data as CorteEpisodio;
}

export async function listarEntregasParaCortes(projetoId: number, episodioId: number) {
  const { data, error } = await supabase.from("entregas_producao")
    .select("id,projeto_id,episodio_id,episodio_corte_id,semana,personagem,dublador,telefone,status,video_url,comentario,comentario_lider,data_envio")
    .eq("projeto_id", projetoId)
    .eq("episodio_id", episodioId);
  if (error) throw error;
  return (data || []) as EntregaCorte[];
}

export function candidatasLegadasPorCorte(entregas: EntregaCorte[], corte: CorteEpisodio) {
  return entregas.filter((entrega) => legacyDeliveryIsCandidate(entrega, corte));
}

/** Vinculação explícita por clique do responsável; nunca altere em lote por texto ambíguo. */
export async function vincularEntregaAoCorte(params: {
  entregaId: number;
  projetoId: number;
  episodioId: number;
  corteId: number;
}) {
  const { data, error } = await supabase.from("entregas_producao")
    .update({ episodio_corte_id: params.corteId })
    .eq("id", params.entregaId)
    .eq("projeto_id", params.projetoId)
    .eq("episodio_id", params.episodioId)
    .is("episodio_corte_id", null)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Essa entrega não está disponível para vinculação. Recarregue a lista.");
  return true;
}
