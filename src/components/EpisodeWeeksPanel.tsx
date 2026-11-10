import React, { useEffect, useMemo, useState } from "react";
import { converterDriveParaPreview } from "../services/appServices";
import {
  alterarStatusCorte,
  candidatasLegadasPorCorte,
  criarCorteEpisodio,
  listarCortesEpisodio,
  listarEntregasParaCortes,
  vincularEntregaAoCorte,
  type CorteEpisodio,
  type CorteStatus,
  type EntregaCorte,
} from "../services/episodeCuts";
import { cutLabel, formatCutDuration, parseCutDuration, sumCutDurations } from "../shared/weekCuts.js";

type Props = {
  projetoId: number;
  episodioId: number;
  podeEditar: boolean;
  usuarioNome: string;
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

export default function EpisodeWeeksPanel({ projetoId, episodioId, podeEditar, usuarioNome }: Props) {
  const [cortes, setCortes] = useState<CorteEpisodio[]>([]);
  const [entregas, setEntregas] = useState<EntregaCorte[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novo, setNovo] = useState(inicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function recarregar() {
    const [listaCortes, listaEntregas] = await Promise.all([
      listarCortesEpisodio(projetoId, episodioId),
      listarEntregasParaCortes(projetoId, episodioId),
    ]);
    setCortes(listaCortes);
    setEntregas(listaEntregas);
    setSelecionadoId(id =>
      id && listaCortes.some(item => item.id === id) ? id : listaCortes[0]?.id || null
    );
  }

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setCortes([]);
    setEntregas([]);
    setSelecionadoId(null);
    setMostrarNovo(false);
    setErro("");
    Promise.all([
      listarCortesEpisodio(projetoId, episodioId),
      listarEntregasParaCortes(projetoId, episodioId),
    ]).then(([listaCortes, listaEntregas]) => {
      if (!ativo) return;
      setCortes(listaCortes);
      setEntregas(listaEntregas);
      setSelecionadoId(listaCortes[0]?.id || null);
    }).catch((e: any) => {
      if (ativo) setErro(e?.message || "Não foi possível carregar as semanas. Verifique a migração.");
    }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [projetoId, episodioId]);

  const selecionado = cortes.find(c => c.id === selecionadoId) || null;
  const entregasVinculadas = useMemo(
    () => entregas.filter(e => selecionado && e.episodio_corte_id === selecionado.id),
    [entregas, selecionado]
  );
  const pendentesLegadas = useMemo(
    () => selecionado ? candidatasLegadasPorCorte(entregas, selecionado) : [],
    [entregas, selecionado]
  );

  async function criar(event: React.FormEvent) {
    event.preventDefault();
    if (!podeEditar || salvando) return;
    const segundos = parseCutDuration(novo.duracao);
    if (segundos === null) {
      setErro("Duração inválida. Use MM:SS (ex.: 04:48) ou HH:MM:SS.");
      return;
    }
    const numero = cortes.reduce((max, c) => Math.max(max, c.semana), 0) + 1;
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
      setSelecionadoId(criado.id);
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

  return (
    <section style={{ ...painel, display: "grid", gap: 14 }} aria-label="Semanas e cortes do episódio">
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h3 style={{ color: "#f8fafc", margin: 0 }}>📅 Banco e Semanas · Episódio</h3>
          <p style={{ ...texto, margin: "6px 0 0" }}>
            Cada semana é um único corte de duração real. Não altera semanas antigas do projeto.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#c4b5fd", fontWeight: 800 }}>
            {cortes.length} semana(s) · {formatCutDuration(sumCutDurations(cortes))}
          </span>
          <button type="button" style={botao} disabled={carregando || salvando} onClick={() => {
            setCarregando(true); setErro("");
            void recarregar().catch((e: any) => setErro(e?.message || "Falha ao atualizar.")).finally(() => setCarregando(false));
          }}>↻ Atualizar</button>
          {podeEditar && <button type="button" style={botao} disabled={carregando || salvando} onClick={() => setMostrarNovo(true)}>+ Cadastrar semana</button>}
        </div>
      </div>

      {erro && <p role="alert" style={{ color: "#fda4af", margin: 0 }}>{erro}</p>}
      {carregando && <p style={texto}>Carregando semanas e entregas...</p>}
      {!carregando && cortes.length === 0 && (
        <p style={texto}>Nenhuma semana/corte cadastrada neste episódio. As semanas legadas continuam preservadas.</p>
      )}

      {cortes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 9 }}>
          {cortes.map(corte => (
            <button key={corte.id} type="button" onClick={() => setSelecionadoId(corte.id)}
              style={{ ...botao, textAlign: "left", borderColor: selecionado?.id === corte.id ? "#a78bfa" : "rgba(139,92,246,.24)", background: selecionado?.id === corte.id ? "rgba(124,58,237,.27)" : "rgba(2,6,23,.4)" }}>
              <strong style={{ display: "block" }}>{cutLabel(corte.semana)}</strong>
              <span style={{ ...texto, color: "#c4b5fd" }}>{formatCutDuration(corte.duracao_segundos)}</span>
              <span style={{ ...texto, display: "block" }}>{estados[corte.status]}</span>
            </button>
          ))}
        </div>
      )}

      {selecionado && (
        <div style={{ background: "rgba(2,6,23,.42)", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "#f8fafc" }}>{cutLabel(selecionado.semana)} — {formatCutDuration(selecionado.duracao_segundos)}</strong>
              {selecionado.motivo_pausa && <p style={{ ...texto, margin: "4px 0" }}>Pausa: {selecionado.motivo_pausa}</p>}
              {selecionado.observacao && <p style={{ ...texto, margin: "4px 0" }}>{selecionado.observacao}</p>}
              {selecionado.prazo_em && <p style={{ ...texto, margin: "4px 0" }}>Prazo: {new Date(selecionado.prazo_em).toLocaleDateString("pt-BR")}</p>}
            </div>
            {podeEditar && (
              <label style={{ ...texto, display: "grid", gap: 4 }}>
                Situação
                <select style={{ ...campo, minWidth: 160 }} disabled={salvando} value={selecionado.status}
                  onChange={e => void mudarStatus(selecionado, e.target.value as CorteStatus)}>
                  {statusOpcoes.map(s => <option key={s} value={s}>{estados[s]}</option>)}
                </select>
              </label>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {selecionado.video_base_url && <a style={{ color: "#c4b5fd" }} href={selecionado.video_base_url} target="_blank" rel="noopener noreferrer">Vídeo-base ↗</a>}
            {selecionado.trilha_url && <a style={{ color: "#c4b5fd" }} href={selecionado.trilha_url} target="_blank" rel="noopener noreferrer">Trilha/efeitos ↗</a>}
          </div>

          <strong style={{ color: "#f8fafc" }}>Entregas vinculadas ({entregasVinculadas.length})</strong>
          {entregasVinculadas.map(entrega => (
            <div key={entrega.id} style={{ borderTop: "1px solid rgba(148,163,184,.15)", paddingTop: 10 }}>
              <strong style={{ color: "#e2e8f0" }}>{entrega.personagem || "Personagem"} — {entrega.dublador || "Sem nome"}</strong>
              <span style={{ ...texto, marginLeft: 9 }}>{entrega.status || "pendente"}</span>
              {entrega.telefone && <div style={texto}>Contato: {entrega.telefone}</div>}
              {entrega.comentario && <div style={texto}>Comentário: {entrega.comentario}</div>}
              {entrega.comentario_lider && <div style={texto}>Avaliação da liderança: {entrega.comentario_lider}</div>}
              {entrega.video_url ? (
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  <iframe src={converterDriveParaPreview(entrega.video_url)} title={`Entrega de ${entrega.personagem || entrega.dublador}`} style={{ border: 0, width: "100%", maxWidth: 550, height: 240, borderRadius: 10 }} allow="fullscreen" />
                  <a href={entrega.video_url} style={{ color: "#c4b5fd" }} target="_blank" rel="noopener noreferrer">Abrir vídeo original ↗</a>
                </div>
              ) : <p style={texto}>Vídeo não localizado no formulário.</p>}
            </div>
          ))}
          {!entregasVinculadas.length && <p style={texto}>Nenhuma entrega vinculada a este corte ainda.</p>}

          {pendentesLegadas.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(148,163,184,.15)", paddingTop: 10, display: "grid", gap: 8 }}>
              <strong style={{ color: "#fde68a" }}>Entregas antigas a conferir ({pendentesLegadas.length})</strong>
              <p style={{ ...texto, margin: 0 }}>Estas respostas já possuem episódio identificado e citam esta semana. Confirme individualmente antes de vinculá-las.</p>
              {pendentesLegadas.map(entrega => (
                <div key={entrega.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ color: "#cbd5e1" }}>{entrega.personagem || "Personagem"} — {entrega.dublador || "Sem nome"}</span>
                  {podeEditar && <button type="button" disabled={salvando} style={botao} onClick={() => void vincular(entrega)}>Vincular a {cutLabel(selecionado.semana)}</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mostrarNovo && podeEditar && (
        <div role="presentation" style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.8)", zIndex: 2500, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
          onMouseDown={e => { if (e.target === e.currentTarget && !salvando) setMostrarNovo(false); }}>
          <form role="dialog" aria-modal="true" aria-label="Cadastrar semana" onSubmit={e => void criar(e)}
            style={{ ...painel, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", display: "grid", gap: 12 }}>
            <h3 style={{ color: "#f8fafc", margin: 0 }}>Cadastrar {cutLabel(cortes.reduce((max, c) => Math.max(max, c.semana), 0) + 1)}</h3>
            <p style={{ ...texto, margin: 0 }}>Uma semana = um único corte. Informe sua duração real, mesmo que não tenha exatamente cinco minutos.</p>
            <label style={texto}>Duração (MM:SS) *
              <input style={campo} required value={novo.duracao} placeholder="04:48" onChange={e => setNovo(s => ({ ...s, duracao: e.target.value }))} />
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
      )}
    </section>
  );
}
