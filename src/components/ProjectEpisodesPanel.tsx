import React, { useEffect, useMemo, useState } from "react";
import type { ElencoItem, Projeto } from "../types";
import {
  enfileirarLembreteWhatsapp,
  extrairGoogleFolderId,
  extrairLinksDrive,
} from "../services/appServices";
import {
  adicionarElencoAoEpisodio,
  abrirSelecaoEmergencial,
  carregarElencoEpisodio,
  carregarEntregasEpisodio,
  carregarEpisodiosProjeto,
  carregarHistoricoEpisodio,
  carregarVagasEpisodio,
  criarEpisodioProjeto,
  criarEstruturaDriveEpisodio,
  finalizarEpisodioProjeto,
  reabrirEpisodioProjeto,
  removerElencoDoEpisodio,
  resumoEntregasEpisodio,
  atualizarEpisodioProjeto,
  type EpisodioElenco,
  type EpisodioHistorico,
  type ProjetoEpisodio,
  type SelecaoVaga,
} from "../services/projectEpisodes";

type Props = {
  projeto: Projeto;
  usuarioNome?: string;
  podeEditar?: boolean;
};

const card: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: 16,
  background: "linear-gradient(145deg, rgba(15,23,42,.92), rgba(2,6,23,.86))",
  padding: 16,
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,.2)",
  background: "rgba(2,6,23,.72)",
  color: "#f8fafc",
  padding: "9px 11px",
  outline: "none",
};

const primary: React.CSSProperties = {
  border: "1px solid rgba(139,92,246,.45)",
  borderRadius: 10,
  background: "linear-gradient(135deg,#6d28d9,#7c3aed)",
  color: "#fff",
  padding: "9px 13px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondary: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,.22)",
  borderRadius: 10,
  background: "rgba(15,23,42,.72)",
  color: "#cbd5e1",
  padding: "9px 13px",
  fontWeight: 800,
  cursor: "pointer",
};

function statusLabel(status?: string | null) {
  switch (status) {
    case "finalizado":
      return "Finalizado";
    case "em_producao":
      return "Em produção";
    case "pausado":
      return "Pausado";
    case "aguardando":
      return "Aguardando";
    default:
      return "Não iniciado";
  }
}

function statusStyle(status?: string | null): React.CSSProperties {
  const mapa: Record<string, { color: string; bg: string }> = {
    finalizado: { color: "#86efac", bg: "rgba(34,197,94,.14)" },
    em_producao: { color: "#93c5fd", bg: "rgba(59,130,246,.14)" },
    pausado: { color: "#fda4af", bg: "rgba(244,63,94,.14)" },
    aguardando: { color: "#fde68a", bg: "rgba(245,158,11,.14)" },
    nao_iniciado: { color: "#cbd5e1", bg: "rgba(100,116,139,.15)" },
  };
  const item = mapa[String(status || "nao_iniciado")] || mapa.nao_iniciado;
  return {
    color: item.color,
    background: item.bg,
    borderRadius: 999,
    padding: "5px 9px",
    fontWeight: 800,
    fontSize: 12,
    display: "inline-flex",
  };
}

function dataBR(valor?: string | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
}

export default function ProjectEpisodesPanel({
  projeto,
  usuarioNome = "Sistema",
  podeEditar = false,
}: Props) {
  const [episodios, setEpisodios] = useState<ProjetoEpisodio[]>([]);
  const [episodioId, setEpisodioId] = useState<number | null>(null);
  const [elenco, setElenco] = useState<EpisodioElenco[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [vagas, setVagas] = useState<SelecaoVaga[]>([]);
  const [historico, setHistorico] = useState<EpisodioHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novo, setNovo] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
  });
  const [elencoIdAdicionar, setElencoIdAdicionar] = useState("");
  const [busca, setBusca] = useState("");

  const episodio = useMemo(
    () => episodios.find((item) => item.id === episodioId) || null,
    [episodios, episodioId]
  );

  const resumo = useMemo(
    () => resumoEntregasEpisodio(elenco, entregas),
    [elenco, entregas]
  );

  const disponiveis = useMemo(() => {
    const usados = new Set(
      elenco.map((item) =>
        String(item.personagem || "").trim().toLocaleLowerCase("pt-BR")
      )
    );

    return (projeto.Elenco || []).filter(
      (item) =>
        item.personagem?.trim() &&
        !usados.has(
          String(item.personagem).trim().toLocaleLowerCase("pt-BR")
        )
    );
  }, [projeto.Elenco, elenco]);

  const episodiosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return episodios;
    return episodios.filter((item) =>
      [item.numero, item.titulo, statusLabel(item.status)]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo)
    );
  }, [episodios, busca]);

  async function recarregarEpisodios(preferirId?: number | null) {
    try {
      setCarregando(true);
      setErro("");
      const lista = await carregarEpisodiosProjeto(projeto.ID);
      setEpisodios(lista);

      const preferido =
        (preferirId && lista.find((item) => item.id === preferirId)) ||
        (episodioId && lista.find((item) => item.id === episodioId)) ||
        lista.find((item) => item.status === "em_producao") ||
        lista[0] ||
        null;

      setEpisodioId(preferido?.id || null);
    } catch (e: any) {
      setErro(
        e?.message?.includes("projeto_episodios")
          ? "A estrutura de episódios ainda não foi aplicada no Supabase. Rode a migration incluída neste commit."
          : e?.message || "Não foi possível carregar os episódios."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function recarregarDetalhes(id: number) {
    try {
      setCarregando(true);
      setErro("");
      const [elencoAtual, entregasAtuais, vagasAtuais, historicoAtual] =
        await Promise.all([
          carregarElencoEpisodio(id),
          carregarEntregasEpisodio(id),
          carregarVagasEpisodio(id),
          carregarHistoricoEpisodio(id),
        ]);

      setElenco(elencoAtual);
      setEntregas(entregasAtuais);
      setVagas(vagasAtuais);
      setHistorico(historicoAtual);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível carregar os dados do episódio.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setEpisodioId(null);
    void recarregarEpisodios(null);
  }, [projeto.ID]);

  useEffect(() => {
    if (!episodioId) {
      setElenco([]);
      setEntregas([]);
      setVagas([]);
      setHistorico([]);
      return;
    }
    void recarregarDetalhes(episodioId);
  }, [episodioId]);

  async function criarEpisodio() {
    if (!podeEditar) return;
    if (!novo.titulo.trim()) {
      alert("Informe o título do episódio.");
      return;
    }

    try {
      const numero =
        episodios.reduce((maior, item) => Math.max(maior, item.numero), 0) + 1;
      let criado = await criarEpisodioProjeto({
        projetoId: projeto.ID,
        numero,
        titulo: novo.titulo,
        descricao: novo.descricao,
        prazoEm: novo.prazo || undefined,
        criadoPor: usuarioNome,
      });

      try {
        const links = extrairLinksDrive(projeto.Observacoes || "");
        const projectFolderId = extrairGoogleFolderId(links.projeto || "");
        const finalizadosFolderId = extrairGoogleFolderId(
          links.finalizados || ""
        );

        if (projectFolderId && finalizadosFolderId) {
          const drive = await criarEstruturaDriveEpisodio({
            projectFolderId,
            finalizadosFolderId,
            numero,
            titulo: novo.titulo,
          });

          criado = await atualizarEpisodioProjeto(criado.id, {
            pasta_drive_id: drive.episodioId,
            pasta_cortes_id: drive.cortesId,
            pasta_entregas_id: drive.entregasId,
            pasta_finalizado_id: drive.finalizadoId,
          });
        }
      } catch (erro) {
        console.warn(
          "Episódio criado, mas as pastas do Drive não puderam ser criadas:",
          erro
        );
      }

      setNovo({ titulo: "", descricao: "", prazo: "" });
      setMostrarNovo(false);
      await recarregarEpisodios(criado.id);
    } catch (e: any) {
      alert(e?.message || "Não foi possível criar o episódio.");
    }
  }

  async function adicionarPersonagem() {
    if (!podeEditar || !episodio || !elencoIdAdicionar) return;

    const item = (projeto.Elenco || []).find(
      (elencoItem) => String(elencoItem.id) === String(elencoIdAdicionar)
    );
    if (!item) return;

    try {
      await adicionarElencoAoEpisodio({
        projetoId: projeto.ID,
        episodioId: episodio.id,
        item,
      });
      setElencoIdAdicionar("");
      await recarregarDetalhes(episodio.id);
    } catch (e: any) {
      alert(e?.message || "Não foi possível adicionar o personagem.");
    }
  }

  async function abrirEmergencial(item: EpisodioElenco) {
    if (!podeEditar || !episodio) return;
    const motivo =
      window.prompt(
        "Motivo da seleção emergencial:",
        "Saída do dublador original."
      ) || "";
    if (!motivo.trim()) return;

    const prazo =
      window.prompt("Prazo da seleção (AAAA-MM-DD, opcional):", "") || "";

    try {
      await abrirSelecaoEmergencial({
        projetoId: projeto.ID,
        episodioId: episodio.id,
        episodioElencoId: item.id,
        personagem: item.personagem,
        motivo,
        prazo: prazo || undefined,
        criadaPor: usuarioNome,
        dubladorAnteriorId: item.elenco_id || null,
      });
      await recarregarDetalhes(episodio.id);
      alert("Seleção emergencial aberta.");
    } catch (e: any) {
      alert(e?.message || "Não foi possível abrir a seleção emergencial.");
    }
  }

  async function marcarConcluido() {
    if (!podeEditar || !episodio) return;

    const legado =
      entregas.length === 0 &&
      window.confirm(
        "Este episódio não possui entregas registradas. Ele foi produzido antes do Manager?\n\nOK = registrar como legado\nCancelar = concluir normalmente"
      );

    const dataReal =
      legado
        ? window.prompt(
            "Data real de conclusão (AAAA-MM-DD, opcional):",
            episodio.data_conclusao || ""
          ) || ""
        : "";

    const observacao =
      legado
        ? window.prompt(
            "Observação do registro legado (opcional):",
            "Produzido antes da implantação do DubWorks Manager."
          ) || ""
        : "";

    if (
      !window.confirm(
        legado
          ? "Confirmar o episódio como Finalizado • Registro legado?"
          : "Confirmar este episódio como concluído?"
      )
    ) {
      return;
    }

    try {
      await finalizarEpisodioProjeto({
        episodio,
        usuario: usuarioNome,
        legado,
        dataConclusao: dataReal || undefined,
        observacao: observacao || undefined,
      });
      await recarregarEpisodios(episodio.id);
      await recarregarDetalhes(episodio.id);
    } catch (e: any) {
      alert(e?.message || "Não foi possível concluir o episódio.");
    }
  }

  async function reabrir() {
    if (!podeEditar || !episodio) return;
    if (!window.confirm("Reabrir este episódio para produção?")) return;

    try {
      await reabrirEpisodioProjeto(episodio, usuarioNome);
      await recarregarEpisodios(episodio.id);
      await recarregarDetalhes(episodio.id);
    } catch (e: any) {
      alert(e?.message || "Não foi possível reabrir o episódio.");
    }
  }

  async function iniciarProducao() {
    if (!podeEditar || !episodio) return;
    try {
      await atualizarEpisodioProjeto(episodio.id, {
        status: "em_producao",
        data_inicio:
          episodio.data_inicio || new Date().toISOString().slice(0, 10),
      });
      await recarregarEpisodios(episodio.id);
    } catch (e: any) {
      alert(e?.message || "Não foi possível iniciar a produção.");
    }
  }

  async function cobrarPendentes() {
    if (!episodio) return;

    const pendentes = resumo.situacoes.filter(
      (item) => item.pendente && item.telefone?.trim()
    );

    if (!pendentes.length) {
      alert("Não há dubladores pendentes com telefone cadastrado.");
      return;
    }

    if (
      !window.confirm(
        "Enviar cobrança pelo bot para " +
          pendentes.length +
          " pendente(s) do EP " +
          String(episodio.numero).padStart(2, "0") +
          "?"
      )
    ) {
      return;
    }

    let enviados = 0;
    let falhas = 0;

    for (const item of pendentes) {
      try {
        await enfileirarLembreteWhatsapp({
          projetoId: projeto.ID,
          semana: episodio.numero,
          personagem: item.personagem,
          dublador: item.dublador || "",
          telefone: item.telefone || "",
          tipoLembrete: "episodio_pendente",
          mensagem:
            "Olá, " +
            (item.dublador || "tudo bem") +
            "! Passando para lembrar que a entrega de " +
            item.personagem +
            " no episódio " +
            String(episodio.numero).padStart(2, "0") +
            " de " +
            projeto.Projeto +
            " ainda está pendente. Se já enviou, pode desconsiderar esta mensagem. 💜",
        });
        enviados += 1;
      } catch {
        falhas += 1;
      }
    }

    alert(
      "Cobrança colocada na fila. Enviados: " +
        enviados +
        (falhas ? " • Falhas: " + falhas : "")
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {erro && (
        <div
          style={{
            ...card,
            borderColor: "rgba(248,113,113,.35)",
            color: "#fecaca",
          }}
        >
          {erro}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 320px) minmax(0, 1fr)",
          gap: 16,
        }}
        className="dw-episodes-layout"
      >
        <aside style={{ ...card, padding: 12, alignSelf: "start" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div>
              <strong style={{ color: "#f8fafc", fontSize: 18 }}>
                Episódios
              </strong>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {episodios.length} cadastrado(s)
              </div>
            </div>
            {podeEditar && (
              <button style={primary} onClick={() => setMostrarNovo(true)}>
                + Novo
              </button>
            )}
          </div>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar episódio..."
            style={{ ...input, marginBottom: 10 }}
          />

          {mostrarNovo && (
            <div
              style={{
                display: "grid",
                gap: 8,
                padding: 10,
                marginBottom: 10,
                borderRadius: 12,
                background: "rgba(124,58,237,.08)",
                border: "1px solid rgba(139,92,246,.2)",
              }}
            >
              <input
                style={input}
                placeholder="Título do episódio"
                value={novo.titulo}
                onChange={(e) =>
                  setNovo((anterior) => ({
                    ...anterior,
                    titulo: e.target.value,
                  }))
                }
              />
              <textarea
                style={{ ...input, minHeight: 70 }}
                placeholder="Descrição"
                value={novo.descricao}
                onChange={(e) =>
                  setNovo((anterior) => ({
                    ...anterior,
                    descricao: e.target.value,
                  }))
                }
              />
              <input
                style={input}
                type="date"
                value={novo.prazo}
                onChange={(e) =>
                  setNovo((anterior) => ({
                    ...anterior,
                    prazo: e.target.value,
                  }))
                }
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button style={primary} onClick={criarEpisodio}>
                  Criar
                </button>
                <button style={secondary} onClick={() => setMostrarNovo(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            {episodiosFiltrados.map((item) => {
              const ativo = item.id === episodioId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEpisodioId(item.id)}
                  style={{
                    border: ativo
                      ? "1px solid rgba(139,92,246,.7)"
                      : "1px solid rgba(148,163,184,.12)",
                    borderRadius: 12,
                    background: ativo
                      ? "rgba(124,58,237,.16)"
                      : "rgba(2,6,23,.45)",
                    padding: 11,
                    textAlign: "left",
                    color: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800 }}
                      >
                        EP {String(item.numero).padStart(2, "0")}
                      </div>
                      <strong>{item.titulo || "Sem título"}</strong>
                    </div>
                    <span style={statusStyle(item.status)}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ display: "grid", gap: 14, minWidth: 0 }}>
          {!episodio ? (
            <div style={card}>
              <strong style={{ color: "#f8fafc" }}>
                {carregando
                  ? "Carregando episódios..."
                  : "Selecione ou crie um episódio."}
              </strong>
            </div>
          ) : (
            <>
              <div style={card}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      EP {String(episodio.numero).padStart(2, "0")}
                    </div>
                    <h2 style={{ margin: "3px 0 5px", color: "#f8fafc" }}>
                      {episodio.titulo}
                    </h2>
                    <span style={statusStyle(episodio.status)}>
                      {statusLabel(episodio.status)}
                    </span>
                    {episodio.registro_legado && (
                      <span
                        style={{
                          ...statusStyle("aguardando"),
                          marginLeft: 8,
                        }}
                      >
                        Registro legado
                      </span>
                    )}
                  </div>

                  {podeEditar && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {episodio.status === "nao_iniciado" && (
                        <button style={secondary} onClick={iniciarProducao}>
                          Iniciar produção
                        </button>
                      )}
                      {episodio.status === "finalizado" ? (
                        <button style={secondary} onClick={reabrir}>
                          Reabrir episódio
                        </button>
                      ) : (
                        <button style={primary} onClick={marcarConcluido}>
                          ✓ Marcar como concluído
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  {[
                    ["Prazo", dataBR(episodio.prazo_em)],
                    ["Início", dataBR(episodio.data_inicio)],
                    ["Conclusão", dataBR(episodio.data_conclusao)],
                    ["Previstos", String(resumo.previstos)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding: 11,
                        borderRadius: 11,
                        background: "rgba(2,6,23,.48)",
                        border: "1px solid rgba(148,163,184,.1)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 11 }}>{label}</div>
                      <strong style={{ color: "#e2e8f0" }}>{value}</strong>
                    </div>
                  ))}
                </div>

                {episodio.descricao && (
                  <p style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
                    {episodio.descricao}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Previstos", resumo.previstos, "#c4b5fd"],
                  ["Entregaram", resumo.entregaram, "#86efac"],
                  ["Não entregaram", resumo.naoEntregaram, "#fda4af"],
                  ["Aguardando análise", resumo.aguardandoAnalise, "#fde68a"],
                  ["Aprovados", resumo.aprovados, "#6ee7b7"],
                  ["Regravações", resumo.regravacoes, "#fb7185"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} style={card}>
                    <div style={{ color: "#64748b", fontSize: 11 }}>{label}</div>
                    <div
                      style={{
                        color: String(color),
                        fontSize: 24,
                        fontWeight: 900,
                        marginTop: 4,
                      }}
                    >
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={card}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "end",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: "#f8fafc" }}>
                      Personagens do episódio
                    </strong>
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      O Banco do Projeto continua intacto; aqui entra apenas quem
                      participa deste episódio.
                    </div>
                  </div>

                  {podeEditar && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        style={{ ...input, minWidth: 190 }}
                        value={elencoIdAdicionar}
                        onChange={(e) => setElencoIdAdicionar(e.target.value)}
                      >
                        <option value="">Adicionar personagem...</option>
                        {disponiveis.map((item: ElencoItem) => (
                          <option key={item.id} value={item.id}>
                            {item.personagem}
                            {item.dublador ? " — " + item.dublador : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        style={primary}
                        disabled={!elencoIdAdicionar}
                        onClick={adicionarPersonagem}
                      >
                        Adicionar
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 760,
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Personagem",
                          "Dublador",
                          "Telefone",
                          "Situação",
                          "Entregas",
                          "Ações",
                        ].map((item) => (
                          <th
                            key={item}
                            style={{
                              textAlign: "left",
                              color: "#64748b",
                              fontSize: 11,
                              padding: 9,
                              borderBottom: "1px solid rgba(148,163,184,.12)",
                            }}
                          >
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.situacoes.map((item) => (
                        <tr key={item.id}>
                          <td style={{ padding: 9, color: "#f8fafc" }}>
                            <strong>{item.personagem}</strong>
                          </td>
                          <td style={{ padding: 9, color: "#cbd5e1" }}>
                            {item.dublador || "A definir"}
                          </td>
                          <td style={{ padding: 9, color: "#94a3b8" }}>
                            {item.telefone || "—"}
                          </td>
                          <td style={{ padding: 9 }}>
                            <span
                              style={statusStyle(
                                item.aprovado
                                  ? "finalizado"
                                  : item.regravacao
                                  ? "pausado"
                                  : item.entregas.length
                                  ? "em_producao"
                                  : item.status === "em_selecao"
                                  ? "aguardando"
                                  : "nao_iniciado"
                              )}
                            >
                              {item.aprovado
                                ? "Aprovado"
                                : item.regravacao
                                ? "Regravação"
                                : item.entregas.length
                                ? "Entregue"
                                : item.status === "em_selecao"
                                ? "Em seleção"
                                : "Pendente"}
                            </span>
                          </td>
                          <td style={{ padding: 9, color: "#cbd5e1" }}>
                            {item.entregas.length}
                          </td>
                          <td style={{ padding: 9 }}>
                            <div style={{ display: "flex", gap: 7 }}>
                              {podeEditar && (
                                <button
                                  style={secondary}
                                  onClick={() => abrirEmergencial(item)}
                                >
                                  Seleção emergencial
                                </button>
                              )}
                              {podeEditar && (
                                <button
                                  style={{
                                    ...secondary,
                                    color: "#fda4af",
                                  }}
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        "Retirar " +
                                          item.personagem +
                                          " apenas deste episódio?"
                                      )
                                    )
                                      return;
                                    await removerElencoDoEpisodio(item.id);
                                    await recarregarDetalhes(episodio.id);
                                  }}
                                >
                                  Retirar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1.45fr) minmax(250px,.75fr)",
                  gap: 14,
                }}
                className="dw-episode-bottom-grid"
              >
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={card}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ color: "#f8fafc" }}>
                        Entregas do episódio
                      </strong>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>
                        {resumo.entregaram}/{resumo.previstos} receberam
                      </span>
                    </div>

                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(148,163,184,.12)",
                        overflow: "hidden",
                        margin: "10px 0 14px",
                      }}
                    >
                      <div
                        style={{
                          width: resumo.progressoRecebimento + "%",
                          height: "100%",
                          background:
                            "linear-gradient(90deg,#7c3aed,#8b5cf6)",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 7 }}>
                      {entregas.slice(0, 8).map((entrega: any) => (
                        <div
                          key={entrega.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr auto",
                            gap: 10,
                            padding: 9,
                            borderRadius: 9,
                            background: "rgba(2,6,23,.42)",
                          }}
                        >
                          <span style={{ color: "#e2e8f0" }}>
                            {entrega.personagem || "Personagem"}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            {entrega.dublador || "—"}
                          </span>
                          <span
                            style={{
                              color:
                                entrega.status === "aprovado"
                                  ? "#86efac"
                                  : entrega.status === "regravacao"
                                  ? "#fda4af"
                                  : "#fde68a",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {entrega.status || "pendente"}
                          </span>
                        </div>
                      ))}
                      {!entregas.length && (
                        <span style={{ color: "#64748b" }}>
                          Nenhuma entrega vinculada a este episódio.
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={card}>
                    <strong style={{ color: "#f8fafc" }}>
                      Seleções do episódio
                    </strong>
                    <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
                      {vagas.map((vaga) => (
                        <div
                          key={vaga.id}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            background: "rgba(2,6,23,.42)",
                          }}
                        >
                          <strong style={{ color: "#e2e8f0" }}>
                            {vaga.personagem}
                          </strong>
                          <span style={{ color: "#a78bfa", marginLeft: 8 }}>
                            {vaga.tipo === "emergencial"
                              ? "Emergencial"
                              : "Normal"}
                          </span>
                          <div style={{ color: "#64748b", fontSize: 11 }}>
                            {vaga.motivo || "Sem motivo informado"} ·{" "}
                            {vaga.status}
                          </div>
                        </div>
                      ))}
                      {!vagas.length && (
                        <span style={{ color: "#64748b" }}>
                          Nenhuma seleção vinculada ao episódio.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14, alignSelf: "start" }}>
                  <div style={card}>
                    <strong style={{ color: "#f8fafc" }}>
                      Quem está pendente
                    </strong>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {resumo.situacoes
                        .filter((item) => item.pendente)
                        .map((item) => (
                          <div
                            key={item.id}
                            style={{
                              padding: 9,
                              borderRadius: 9,
                              background: "rgba(2,6,23,.42)",
                            }}
                          >
                            <strong style={{ color: "#e2e8f0" }}>
                              {item.personagem}
                            </strong>
                            <div style={{ color: "#94a3b8", fontSize: 12 }}>
                              {item.dublador || "A definir"} ·{" "}
                              {item.telefone || "sem telefone"}
                            </div>
                          </div>
                        ))}
                      {!resumo.situacoes.some((item) => item.pendente) && (
                        <span style={{ color: "#86efac" }}>
                          Ninguém pendente 🎉
                        </span>
                      )}
                    </div>

                    <button
                      style={{ ...primary, width: "100%", marginTop: 12 }}
                      onClick={cobrarPendentes}
                    >
                      💬 Cobrar pendentes pelo bot
                    </button>
                  </div>

                  <div style={card}>
                    <strong style={{ color: "#f8fafc" }}>
                      Histórico do episódio
                    </strong>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {historico.slice(0, 8).map((item) => (
                        <div
                          key={item.id}
                          style={{
                            paddingLeft: 10,
                            borderLeft: "2px solid #7c3aed",
                          }}
                        >
                          <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                            {item.descricao}
                          </div>
                          <div style={{ color: "#64748b", fontSize: 10 }}>
                            {item.usuario || "Sistema"} ·{" "}
                            {item.criado_em
                              ? new Date(item.criado_em).toLocaleString("pt-BR")
                              : ""}
                          </div>
                        </div>
                      ))}
                      {!historico.length && (
                        <span style={{ color: "#64748b" }}>
                          Sem histórico ainda.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .dw-episodes-layout,
          .dw-episode-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
