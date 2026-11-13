import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { converterDriveParaPreview, atualizarStatusEntregaBanco, carregarParticipantesSemanaBanco, type ParticipanteSemanaProjeto } from "../services/appServices";
import { registrarHistoricoEpisodio } from "../services/projectEpisodes";
import {
  alterarStatusCorte,
  listarEntregasSemEpisodio,
  vincularEntregaAoEpisodio,
  criarCorteEpisodio,
  listarCortesEpisodio,
  listarEntregasParaCortes,
  vincularEntregaAoCorte,
  type CorteEpisodio,
  type CorteStatus,
  type EntregaCorte,
} from "../services/episodeCuts";
import { cutLabel, deliveryWeekNumbers, formatCutDuration, parseCutDuration, sumCutDurations } from "../shared/weekCuts.js";

type Props = {
  projetoId: number;
  episodioId: number;
  podeEditar: boolean;
  usuarioNome: string;
  /** Registros da hierarquia anterior criada pela Giovanna, sem migração automática. */
  subdivisoesExistentes?: Array<{ id: number; numero: number; titulo: string; status: string }>;
  onSemanaCriada?: () => Promise<void> | void;
  onEntregaAvaliada?: () => Promise<void> | void;
  atualizarChave?: number;
};

const painel: React.CSSProperties = {
  border: "1px solid rgba(139,92,246,.24)",
  borderRadius: 16,
  padding: 16,
  background: "linear-gradient(135deg, rgba(15,23,42,.96), rgba(20,15,41,.9))",
};
const campo: React.CSSProperties = {
  width: "100%", padding: "10px 12px", minHeight: 40,
  border: "1px solid rgba(148,163,184,.27)", borderRadius: 10,
  background: "#0b1020", color: "#f8fafc",
};
const botao: React.CSSProperties = {
  padding: "9px 13px", borderRadius: 10, cursor: "pointer",
  border: "1px solid rgba(139,92,246,.5)", background: "rgba(124,58,237,.25)", color: "#f5f3ff",
};
const texto: React.CSSProperties = { color: "#94a3b8", fontSize: 13 };
const estados: Record<CorteStatus, string> = {
  nao_iniciada: "Não iniciada", em_andamento: "Em andamento", pausada: "Pausada", concluida: "Concluída",
};
const statusOpcoes: CorteStatus[] = ["nao_iniciada", "em_andamento", "pausada", "concluida"];
const inicial = { duracao: "05:00", observacao: "", prazoEm: "", videoBaseUrl: "", trilhaUrl: "" };

/** Exibe semanas antigas dentro do EP a partir de entregas que JÁ possuem episodio_id correto. */
function semanasDoEpisodio(cortes: CorteEpisodio[], entregas: EntregaCorte[]): number[] {
  const numeros = new Set(cortes.map((c) => c.semana));
  entregas.forEach((e) => {
    if (e.episodio_corte_id != null) {
      const corte = cortes.find((c) => c.id === e.episodio_corte_id);
      if (corte) numeros.add(corte.semana);
    } else {
      deliveryWeekNumbers(e.semana).forEach((numero: number) => numeros.add(numero));
    }
  });
  return [...numeros].sort((a, b) => a - b);
}


export default function EpisodeWeeksPanel({ projetoId, episodioId, podeEditar, usuarioNome, subdivisoesExistentes = [], onSemanaCriada, onEntregaAvaliada, atualizarChave = 0 }: Props) {
  const [cortes, setCortes] = useState<CorteEpisodio[]>([]);
  const [entregas, setEntregas] = useState<EntregaCorte[]>([]);
  const [entregasSemEpisodio, setEntregasSemEpisodio] = useState<EntregaCorte[]>([]);
  const [participantesHistoricos, setParticipantesHistoricos] = useState<ParticipanteSemanaProjeto[]>([]);
  const [semanaSelecionada, setSemanaSelecionada] = useState<number | null>(null);
  const [entregaSelecionadaId, setEntregaSelecionadaId] = useState<number | null>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novo, setNovo] = useState(inicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function recarregar() {
    const [listaCortes, listaEntregas, semEpisodio] = await Promise.all([
      listarCortesEpisodio(projetoId, episodioId),
      listarEntregasParaCortes(projetoId, episodioId),
      listarEntregasSemEpisodio(projetoId),
    ]);
    setCortes(listaCortes);
    setEntregas(listaEntregas);
    setEntregasSemEpisodio(semEpisodio);
    const numeros = semanasDoEpisodio(listaCortes, listaEntregas);
    setSemanaSelecionada(semana =>
      semana && numeros.includes(semana) ? semana : numeros[0] || null
    );
  }

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setCortes([]);
    setEntregas([]);
    setEntregasSemEpisodio([]);
    setSemanaSelecionada(null);
    setEntregaSelecionadaId(null);
    setMostrarNovo(false);
    setErro("");
    Promise.all([
      listarCortesEpisodio(projetoId, episodioId),
      listarEntregasParaCortes(projetoId, episodioId),
      listarEntregasSemEpisodio(projetoId),
    ]).then(([listaCortes, listaEntregas, semEpisodio]) => {
      if (!ativo) return;
      setCortes(listaCortes);
      setEntregas(listaEntregas);
      setEntregasSemEpisodio(semEpisodio);
      setSemanaSelecionada(semanasDoEpisodio(listaCortes, listaEntregas)[0] || null);
    }).catch((e: any) => {
      if (ativo) setErro(e?.message || "Não foi possível carregar as semanas deste episódio.");
    }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [projetoId, episodioId, atualizarChave]);

  const semanas = useMemo(() => semanasDoEpisodio(cortes, entregas), [cortes, entregas]);
  const semanaAtual = semanaSelecionada && semanas.includes(semanaSelecionada)
    ? semanaSelecionada : semanas[0] || null;
  const proximaSemana = Math.max(0, ...semanas) + 1;
  const selecionado = cortes.find(c => c.semana === semanaAtual) || null;
  const entregasDaSemana = useMemo(() => entregas.filter((e) => {
    if (semanaAtual === null) return false;
    if (e.episodio_corte_id != null) {
      return cortes.some((c) => c.id === e.episodio_corte_id && c.semana === semanaAtual);
    }
    return deliveryWeekNumbers(e.semana).includes(semanaAtual);
  }), [entregas, cortes, semanaAtual]);
  const entregaEmFoco = entregasDaSemana.find(e => e.id === entregaSelecionadaId)
    || entregasDaSemana[0] || null;

  // O elenco de "projeto_semanas" não possui episodio_id. Só o exibimos
  // quando ESTA semana foi identificada pelas entregas vinculadas ao EP e
  // não existe um corte novo com o mesmo número (caso de EP 02).
  useEffect(() => {
    let ativo = true;
    setParticipantesHistoricos([]);
    if (semanaAtual == null || selecionado || !entregasDaSemana.length) return;
    carregarParticipantesSemanaBanco(String(projetoId), semanaAtual)
      .then((lista) => { if (ativo) setParticipantesHistoricos(lista); })
      .catch((e) => { if (ativo) console.warn("Não foi possível carregar o elenco histórico:", e); });
    return () => { ativo = false; };
  }, [projetoId, episodioId, semanaAtual, selecionado?.id, entregasDaSemana.length]);

  function normalizarPersonagem(value?: string | null) {
    return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
  }


  async function criar(event: React.FormEvent) {
    event.preventDefault();
    if (!podeEditar || salvando || subdivisoesExistentes.length) return;
    const segundos = parseCutDuration(novo.duracao);
    if (segundos === null) {
      setErro("Duração inválida. Use MM:SS (ex.: 04:48) ou HH:MM:SS.");
      return;
    }
    const numero = proximaSemana;
    setSalvando(true);
    setErro("");
    try {
      const criado = await criarCorteEpisodio({
        projetoId, episodioId, semana: numero, duracaoSegundos: segundos,
        usuario: usuarioNome, observacao: novo.observacao,
        prazoEm: novo.prazoEm || undefined,
        videoBaseUrl: novo.videoBaseUrl, trilhaUrl: novo.trilhaUrl,
      });
      setMostrarNovo(false);
      setNovo(inicial);
      await recarregar();
      setSemanaSelecionada(criado.semana);
      if (onSemanaCriada) {
        try { await onSemanaCriada(); }
        catch (erro: any) { setErro("Semana cadastrada, mas o Forms não foi atualizado: " + (erro?.message || "erro de integração")); }
      }
    } catch (e: any) {
      setErro(e?.message || "Erro ao cadastrar semana.");
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(corte: CorteEpisodio, status: CorteStatus) {
    if (!podeEditar || salvando || status === corte.status) return;
    let motivoPausa = "";
    if (status === "pausada") {
      const informado = window.prompt("Qual é o motivo da pausa?", corte.motivo_pausa || "");
      if (informado === null) return;
      motivoPausa = informado.trim();
      if (!motivoPausa) {
        setErro("A pausa precisa de uma justificativa.");
        return;
      }
    }
    setSalvando(true);
    setErro("");
    try {
      await alterarStatusCorte({ projetoId, episodioId, corteId: corte.id, status, motivoPausa, usuario: usuarioNome });
      await recarregar();
    } catch (e: any) {
      setErro(e?.message || "Não foi possível atualizar a semana.");
    } finally {
      setSalvando(false);
    }
  }

  async function vincular(entrega: EntregaCorte) {
    if (!podeEditar || !selecionado || salvando) return;
    if (!window.confirm(`Confirmar vínculo da entrega de ${entrega.personagem || entrega.dublador || "dublador"} a ${cutLabel(selecionado.semana)} deste episódio?`)) return;
    setSalvando(true);
    setErro("");
    try {
      await vincularEntregaAoCorte({
        entregaId: entrega.id, projetoId, episodioId, corteId: selecionado.id,
      });
      await recarregar();
    } catch (e: any) {
      setErro(e?.message || "Não foi possível vincular a entrega.");
    } finally {
      setSalvando(false);
    }
  }

  async function associarAoEpisodio(entrega: EntregaCorte) {
    if (!podeEditar || salvando) return;
    if (!window.confirm(
      "Associar a gravação de " + (entrega.personagem || entrega.dublador || "participante") +
      " (" + (entrega.semana || "sem semana") + ") ao episódio selecionado? " +
      "Isso NÃO apagará a avaliação e não irá alterar as respostas do Google Forms."
    )) return;
    setSalvando(true);
    setErro("");
    try {
      await vincularEntregaAoEpisodio({ entregaId: entrega.id, projetoId, episodioId });
      await registrarHistoricoEpisodio({
        projetoId, episodioId, tipo: "entrega_legada_associada",
        descricao: "Entrega histórica associada manualmente: " +
          (entrega.personagem || entrega.dublador || "participante") + " — " +
          (entrega.semana || "sem semana") + ".",
        usuario: usuarioNome, dados: { entrega_id: entrega.id },
      });
      await recarregar();
      if (onEntregaAvaliada) await onEntregaAvaliada();
    } catch (e: any) {
      setErro(e?.message || "Falha ao associar gravação ao episódio.");
    } finally {
      setSalvando(false);
    }
  }

  async function avaliarEntrega(entrega: EntregaCorte, status: "aprovado" | "regravacao") {
    if (!podeEditar || salvando) return;
    const comentario = window.prompt(
      status === "regravacao"
        ? "Explique ao dublador o que precisa ser regravado:"
        : "Observação da aprovação (opcional):",
      entrega.comentario_lider || ""
    );
    if (comentario === null) return;
    if (status === "regravacao" && !comentario.trim()) {
      setErro("Informe o motivo e as orientações para solicitar uma regravação.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const salvo = await atualizarStatusEntregaBanco(entrega.id, status, usuarioNome, comentario.trim());
      if (!salvo) throw new Error("O sistema não confirmou a avaliação da entrega.");
      await registrarHistoricoEpisodio({
        projetoId,
        episodioId,
        tipo: status === "aprovado" ? "entrega_aprovada" : "regravacao_solicitada",
        descricao: (status === "aprovado" ? "Entrega aprovada: " : "Regravação solicitada: ") +
          (entrega.personagem || "Personagem") + " — " + cutLabel(semanaAtual || 1) + ".",
        usuario: usuarioNome,
        dados: { entrega_id: entrega.id, corte_id: selecionado?.id || null, comentario: comentario.trim() },
      });
      await recarregar();
      if (onEntregaAvaliada) await onEntregaAvaliada();
    } catch (e: any) {
      setErro(e?.message || "Não foi possível avaliar a entrega.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section style={{ ...painel, display: "grid", gap: 14 }} aria-label="Semanas e cortes do episódio">
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h3 style={{ color: "#f8fafc", margin: 0 }}>📅 Semanas, gravações e avaliações deste episódio</h3>
          <p style={{ ...texto, margin: "6px 0 0" }}>
            Escolha uma semana para ver as falas, assistir às gravações e avaliar no mesmo lugar. Registros antigos já vinculados a este episódio são exibidos automaticamente.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#c4b5fd", fontWeight: 800 }}>
            {semanas.length} semana(s) · {cortes.length ? formatCutDuration(sumCutDurations(cortes)) : "Duração histórica não cadastrada"}
          </span>
          <button type="button" style={botao} disabled={carregando || salvando} onClick={() => {
            setCarregando(true); setErro("");
            void recarregar().catch((e: any) => setErro(e?.message || "Falha ao atualizar.")).finally(() => setCarregando(false));
          }}>↻ Atualizar</button>
          {podeEditar && <button type="button" style={botao} disabled={carregando || salvando || subdivisoesExistentes.length > 0} onClick={() => setMostrarNovo(true)}>+ Cadastrar semana</button>}
        </div>
      </div>

      {erro && <p role="alert" style={{ color: "#fda4af", margin: 0 }}>{erro}</p>}
      {subdivisoesExistentes.length > 0 && (
        <div style={{ padding: 11, border: "1px solid rgba(245,158,11,.35)", borderRadius: 10 }}>
          <strong style={{ color: "#fde68a" }}>Subdivisões já cadastradas ({subdivisoesExistentes.length})</strong>
          <p style={texto}>Estas subdivisões feitas anteriormente permanecem no banco. A criação de novas semanas está bloqueada neste episódio até conferirmos a correspondência, para não duplicar ou apagar o trabalho existente.</p>
          {subdivisoesExistentes.map(item => <div key={item.id} style={{ color: "#cbd5e1", fontSize: 13 }}>{item.titulo || `Item ${item.numero}`} · {item.status}</div>)}
        </div>
      )}

      {carregando && <p style={texto}>Carregando semanas e entregas...</p>}
      {!carregando && semanas.length === 0 && (
        <p style={texto}>Nenhuma semana vinculada a este episódio. Cadastre uma semana para iniciar a produção.</p>
      )}
      {semanas.length > 0 && (
        <div role="tablist" aria-label="Semanas deste episódio"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9 }}>
          {semanas.map((n) => {
            const corte = cortes.find((c) => c.semana === n);
            const quantidade = entregas.filter(e => e.episodio_corte_id != null
              ? corte?.id === e.episodio_corte_id
              : deliveryWeekNumbers(e.semana).includes(n)).length;
            return (
              <button key={n} type="button" role="tab" aria-selected={semanaAtual === n}
                onClick={() => { setSemanaSelecionada(n); setEntregaSelecionadaId(null); }}
                style={{ ...botao, textAlign: "left",
                  borderColor: semanaAtual === n ? "#a78bfa" : "rgba(139,92,246,.24)",
                  background: semanaAtual === n ? "rgba(124,58,237,.32)" : "rgba(2,6,23,.4)" }}>
                <strong style={{ display: "block", fontSize: 15 }}>{cutLabel(n)}</strong>
                <span style={{ ...texto, color: "#c4b5fd", display: "block", marginTop: 5 }}>
                  {corte ? formatCutDuration(corte.duracao_segundos) : "Histórico do episódio"}
                </span>
                <span style={{ ...texto, display: "block" }}>
                  {corte ? estados[corte.status] : "Sem corte novo"} · {quantidade} envio(s)
                </span>
              </button>
            );
          })}
        </div>
      )}
      {semanaAtual !== null && (
        <div style={{ background: "rgba(2,6,23,.42)", borderRadius: 12, padding: 14, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "#f8fafc", fontSize: 17 }}>{cutLabel(semanaAtual)}</strong>
              <div style={texto}>
                {selecionado
                  ? "Corte cadastrado · " + formatCutDuration(selecionado.duracao_segundos)
                  : "Semana histórica do episódio · gravações e avaliações preservadas"}
              </div>
              {selecionado?.motivo_pausa && <p style={texto}>Pausa: {selecionado.motivo_pausa}</p>}
              {selecionado?.observacao && <p style={texto}>{selecionado.observacao}</p>}
              {selecionado?.prazo_em && <p style={texto}>Prazo: {new Date(selecionado.prazo_em).toLocaleDateString("pt-BR")}</p>}
            </div>
            {podeEditar && selecionado && (
              <label style={{ ...texto, display: "grid", gap: 4 }}>
                Status do corte
                <select style={{ ...campo, minWidth: 165 }} disabled={salvando}
                  value={selecionado.status}
                  onChange={e => void mudarStatus(selecionado, e.target.value as CorteStatus)}>
                  {statusOpcoes.map(status => <option key={status} value={status}>{estados[status]}</option>)}
                </select>
              </label>
            )}
          </div>
          {selecionado && (selecionado.video_base_url || selecionado.trilha_url) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {selecionado.video_base_url && (
                <a style={{ color: "#c4b5fd" }} href={selecionado.video_base_url}
                  target="_blank" rel="noopener noreferrer">Vídeo-base ↗</a>
              )}
              {selecionado.trilha_url && (
                <a style={{ color: "#c4b5fd" }} href={selecionado.trilha_url}
                  target="_blank" rel="noopener noreferrer">Trilha/efeitos ↗</a>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "#cbd5e1", fontSize: 13 }}>
            <span>Recebidas: <strong>{entregasDaSemana.length}</strong></span>
            <span style={{ color: "#86efac" }}>Aprovadas: <strong>{entregasDaSemana.filter(e => e.status === "aprovado").length}</strong></span>
            <span style={{ color: "#fde68a" }}>Aguardando análise: <strong>{entregasDaSemana.filter(e => e.status === "pendente").length}</strong></span>
            <span style={{ color: "#fda4af" }}>Regravações: <strong>{entregasDaSemana.filter(e => e.status === "regravacao").length}</strong></span>
          </div>

          {participantesHistoricos.length > 0 && (
            <div style={{ borderRadius: 10, padding: 12, background: "rgba(15,23,42,.55)", border: "1px solid rgba(148,163,184,.15)" }}>
              <strong style={{ color: "#e2e8f0" }}>
                Elenco desta semana ({participantesHistoricos.length})
              </strong>
              <p style={{ ...texto, margin: "5px 0 10px" }}>
                Escala original preservada. Entregas e avaliação pertencem ao EP selecionado.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 7 }}>
                {participantesHistoricos.map((p) => {
                  const daPessoa = entregasDaSemana.filter(e =>
                    normalizarPersonagem(e.personagem) === normalizarPersonagem(p.personagem)
                  );
                  const statusPessoa = daPessoa.some(e => e.status === "aprovado") ? "Aprovado" :
                    daPessoa.some(e => e.status === "regravacao") ? "Regravação" :
                    daPessoa.length ? "Aguardando análise" : "Sem entrega vinculada";
                  return (
                    <div key={p.id} style={{ padding: 8, borderRadius: 9, background: "rgba(2,6,23,.55)" }}>
                      <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12 }}>{p.personagem}</div>
                      <div style={texto}>{p.dublador || "Sem dublador"}</div>
                      <div style={{ ...texto, marginTop: 4,
                        color: statusPessoa === "Aprovado" ? "#86efac" :
                          statusPessoa === "Regravação" ? "#fda4af" : "#fde68a" }}>
                        {statusPessoa}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 14 }}>
            <div style={{ display: "grid", gap: 7, alignContent: "start" }}>
              <strong style={{ color: "#f8fafc" }}>Gravações desta semana</strong>
              {entregasDaSemana.map(entrega => (
                <button key={entrega.id} type="button" onClick={() => setEntregaSelecionadaId(entrega.id)}
                  style={{ ...botao, width: "100%", textAlign: "left",
                    background: entregaEmFoco?.id === entrega.id ? "rgba(37,99,235,.22)" : "rgba(2,6,23,.4)",
                    borderColor: entregaEmFoco?.id === entrega.id ? "#38bdf8" : "rgba(148,163,184,.16)" }}>
                  <span style={{ display: "block", fontWeight: 700 }}>
                    {entrega.personagem || "Personagem"} — {entrega.dublador || "Dublador"}
                  </span>
                  <span style={{ ...texto, color: entrega.status === "aprovado" ? "#86efac" : entrega.status === "regravacao" ? "#fda4af" : "#fde68a" }}>
                    {entrega.status === "aprovado" ? "Aprovado" : entrega.status === "regravacao" ? "Regravação" : "Aguardando análise"}
                  </span>
                </button>
              ))}
              {!entregasDaSemana.length && <p style={texto}>Nenhuma gravação recebida nesta semana.</p>}
            </div>
            <div style={{ background: "rgba(15,23,42,.7)", borderRadius: 12, padding: 13, display: "grid", gap: 9, alignContent: "start" }}>
              <strong style={{ color: "#f8fafc" }}>Prévia e avaliação</strong>
              {entregaEmFoco ? (
                <>
                  <div style={{ color: "#e2e8f0", fontWeight: 700 }}>
                    {entregaEmFoco.personagem || "Personagem"} — {entregaEmFoco.dublador || "Dublador"}
                  </div>
                  {entregaEmFoco.data_envio && <span style={texto}>Enviado em: {entregaEmFoco.data_envio}</span>}
                  {entregaEmFoco.telefone && <span style={texto}>Contato: {entregaEmFoco.telefone}</span>}
                  {entregaEmFoco.comentario && <span style={texto}>Comentário: {entregaEmFoco.comentario}</span>}
                  {entregaEmFoco.comentario_lider && <span style={texto}>Avaliação: {entregaEmFoco.comentario_lider}</span>}
                  {entregaEmFoco.video_url ? (
                    <>
                      <iframe src={converterDriveParaPreview(entregaEmFoco.video_url)}
                        title={"Gravação de " + (entregaEmFoco.personagem || entregaEmFoco.dublador || "participante")}
                        style={{ border: 0, width: "100%", minHeight: 225, borderRadius: 10 }}
                        allow="fullscreen" />
                      <a style={{ color: "#c4b5fd" }} href={entregaEmFoco.video_url}
                        target="_blank" rel="noopener noreferrer">Abrir arquivo original ↗</a>
                    </>
                  ) : <span style={texto}>Arquivo não localizado na resposta.</span>}
                  {podeEditar && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={{ ...botao, background: "rgba(22,163,74,.2)" }}
                        disabled={salvando} onClick={() => void avaliarEntrega(entregaEmFoco, "aprovado")}>
                        ✓ Aprovar
                      </button>
                      <button type="button" style={{ ...botao, background: "rgba(190,24,93,.2)" }}
                        disabled={salvando} onClick={() => void avaliarEntrega(entregaEmFoco, "regravacao")}>
                        ↻ Solicitar regravação
                      </button>
                      {selecionado && !entregaEmFoco.episodio_corte_id &&
                        deliveryWeekNumbers(entregaEmFoco.semana).length === 1 && (
                          <button type="button" style={botao} disabled={salvando}
                            onClick={() => void vincular(entregaEmFoco)}>
                            Vincular ao corte
                          </button>
                        )}
                    </div>
                  )}
                </>
              ) : <span style={texto}>Selecione uma gravação para conferir.</span>}
            </div>
          </div>
        </div>
      )}
      {entregasSemEpisodio.length > 0 && (
        <div style={{ borderRadius: 12, padding: 14, border: "1px solid rgba(245,158,11,.3)", background: "rgba(245,158,11,.06)" }}>
          <strong style={{ color: "#fde68a" }}>
            Entregas sem episódio definido ({entregasSemEpisodio.length})
          </strong>
          <p style={{ ...texto, margin: "7px 0" }}>
            Estes registros pertencem ao projeto, mas ainda não indicam um EP.
            Verifique a gravação antes de associar; nenhuma associação é automática.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {entregasSemEpisodio.map(entrega => (
              <div key={entrega.id}
                style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
                  borderRadius: 9, padding: 9, background: "rgba(2,6,23,.45)" }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ color: "#e2e8f0", fontSize: 13 }}>
                    {entrega.personagem || "Personagem"} — {entrega.dublador || "Participante"}
                  </strong>
                  <span style={texto}>
                    {entrega.semana || "Semana não informada"} · {entrega.status === "aprovado" ? "Aprovada" : "Aguardando conferência"}
                  </span>
                  {entrega.video_url && <a style={{ color: "#c4b5fd", fontSize: 12 }}
                    href={entrega.video_url} target="_blank" rel="noopener noreferrer">Conferir gravação ↗</a>}
                </div>
                {podeEditar && (
                  <button type="button" style={botao} disabled={salvando}
                    onClick={() => void associarAoEpisodio(entrega)}>
                    Associar ao EP selecionado
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mostrarNovo && podeEditar && createPortal((
        <div role="presentation" style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, isolation: "isolate" }}
          onMouseDown={e => { if (e.target === e.currentTarget && !salvando) setMostrarNovo(false); }}>
          <form role="dialog" aria-modal="true" aria-label="Cadastrar semana" onSubmit={e => void criar(e)}
            style={{ ...painel, position: "relative", zIndex: 1, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", display: "grid", gap: 12, boxShadow: "0 30px 100px rgba(0,0,0,.85)", background: "#11162c" }}>
            <h3 style={{ color: "#f8fafc", margin: 0 }}>Cadastrar {cutLabel(proximaSemana)}</h3>
            <p style={{ ...texto, margin: 0 }}>Uma semana = um único corte. Informe sua duração real, mesmo que não tenha exatamente cinco minutos.</p>
            <label style={texto}>Duração (MM:SS) *
              <input style={campo} autoFocus required value={novo.duracao} placeholder="04:48" onChange={e => setNovo(s => ({ ...s, duracao: e.target.value }))} />
            </label>
            <label style={texto}>Prazo
              <input style={campo} type="date" value={novo.prazoEm} onChange={e => setNovo(s => ({ ...s, prazoEm: e.target.value }))} />
            </label>
            <label style={texto}>Link do vídeo-base (opcional)
              <input style={campo} type="url" value={novo.videoBaseUrl} placeholder="https://..." onChange={e => setNovo(s => ({ ...s, videoBaseUrl: e.target.value }))} />
            </label>
            <label style={texto}>Link da trilha/efeitos (opcional)
              <input style={campo} type="url" value={novo.trilhaUrl} placeholder="https://..." onChange={e => setNovo(s => ({ ...s, trilhaUrl: e.target.value }))} />
            </label>
            <label style={texto}>Observações
              <textarea style={{ ...campo, minHeight: 68 }} value={novo.observacao} onChange={e => setNovo(s => ({ ...s, observacao: e.target.value }))} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={botao} disabled={salvando} onClick={() => setMostrarNovo(false)}>Cancelar</button>
              <button type="submit" style={{ ...botao, background: "#6d28d9" }} disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar corte"}</button>
            </div>
          </form>
        </div>
      ), document.body)}
    </section>
  );
}
