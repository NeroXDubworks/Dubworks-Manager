import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "../mobile-first.css";

import type {
  AvaliacaoSelecao,
  Cargo,
  ChavePermissao,
  ElencoItem,
  EntregaProducao,
  Membro,
  Projeto,
  ProjetoSemana,
  RelatorioMes,
  RespostaSelecao,
  RespostaTreinamento,
  StatusMembro,
  StatusSelecao,
  TrainingStatus,
  Usuario,
} from "../types";

import {
  LOGO_URL,
  estilos,
  permissoesDisponiveis,
} from "../config/appConfig";
import { modulosTreinamentoLider } from "../data/trainingModules";
import { elencoVazio, projetoVazio } from "../data/defaults";
import {
  normalizar,
  cargoLabel,
  statusTreinamentoLabel,
  statusMembroLabel,
  corStatusMembro,
  statusPadraoPorCargo,
  permissaoPadraoPorCargo,
  temAcesso,
  permissoesPadraoUsuario,
  podeVerProjeto,
  podeEditarProjeto,
  podeCriarProjeto,
  podeSubirVideoEditor,
  podeGerenciarUsuarios,
  podeGerenciarMembros,
  podeGerenciarTreinamentos,
  podeVerNotificacoesGerais,
  podeExcluirUsuario,
  cargosPermitidosParaCriar,
  corStatus,
  numeroSemanaEntrega,
  labelSemana,
  escaparCSV,
  mapUsuarioDb,
  mapProjetoDb,
  mapMembroDb,
  criarEstruturaDriveViaFunction,
  copiarFormulariosViaAppsScript,
  extrairGoogleFileId,
  extrairGoogleFolderId,
  converterDriveParaPreview,
  lerRespostasSelecaoViaAppsScript,
  salvarAvaliacaoSelecaoBanco,
  carregarAvaliacoesSelecaoBanco,
  lerRespostasEntregasViaEdge,
  salvarEntregasProducaoBanco,
  carregarEntregasProducaoBanco,
  atualizarStatusEntregaBanco,
  carregarSemanasProjetoBanco,
  garantirSemanaProjetoBanco,
  concluirSemanaProjetoBanco,
  salvarRespostaTreinamentoBanco,
  carregarRespostasTreinamentoBanco,
  carregarUsuariosBanco,
  carregarMembrosBanco,
  atualizarStatusMembroBanco,
  buscarPerfilPorEmail,
  carregarProjetosBanco,
  criarProjetoBanco,
  atualizarProjetoBanco,
  atualizarArquivamentoProjetoBanco,
  salvarElencoProjetoBanco,
  gerarIdTemporario,
  comTimeout,
  parseDataFlex,
  chaveMes,
  formatarMesLabel,
  formatarDataBR,
  gerarMesesEntre,
  extrairLinksDrive,
  salvarLinksDriveEmObservacoes,
  calcularRelatorioEntradaSaida
} from "../services/appServices";

export default function DubworksManager() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [query, setQuery] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Projeto | null>(null);
  const [mostrarNovoProjeto, setMostrarNovoProjeto] = useState(false);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [mostrarFormNovoUsuario, setMostrarFormNovoUsuario] = useState(false);
  const [mostrarMembros, setMostrarMembros] = useState(false);
  const [mostrarFerramentas, setMostrarFerramentas] = useState(false);
  const [categoriaFerramentas, setCategoriaFerramentas] = useState<
    "consultas" | "servicos" | "relatorios" | "financeiro"
  >("consultas");
  const [mostrarCentralAjuda, setMostrarCentralAjuda] = useState(false);
  const [mostrarRelatorios, setMostrarRelatorios] = useState(false);
  const [mostrarTreinamentos, setMostrarTreinamentos] = useState(false);
  const [moduloTreinamentoAtivo, setModuloTreinamentoAtivo] =
    useState("papel-lider");
  const [checklistTreinamento, setChecklistTreinamento] = useState<
    Record<string, boolean>
  >({});
  const [respostasTreinamento, setRespostasTreinamento] = useState<
    Record<string, number>
  >({});
  const [respostasTreinamentoSalvas, setRespostasTreinamentoSalvas] = useState<
    RespostaTreinamento[]
  >([]);
  const [carregandoRespostasTreinamento, setCarregandoRespostasTreinamento] =
    useState(false);
  const [mostrarResultadosTreinamento, setMostrarResultadosTreinamento] =
    useState(false);
  const [avaliacaoLider, setAvaliacaoLider] = useState({
    lider: "",
    projeto: "",
    nota: "10",
    status: "em_treinamento",
    observacoes: "",
  });
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [queryMembros, setQueryMembros] = useState("");
  const [membroSelecionadoId, setMembroSelecionadoId] = useState<number | null>(
    null
  );
  const [registroSemanalTexto, setRegistroSemanalTexto] = useState("");
  const [abaProjeto, setAbaProjeto] = useState<
    | "informacoes"
    | "selecao"
    | "elenco"
    | "registros"
    | "drive"
    | "atividades"
    | "historico"
  >("informacoes");
  const [carregando, setCarregando] = useState(true);
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [larguraTela, setLarguraTela] = useState(
    typeof window === "undefined" ? 1200 : window.innerWidth
  );

  const isMobile = larguraTela <= 768;
  const isTablet = larguraTela <= 1100;
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const [novoProjeto, setNovoProjeto] = useState<Projeto>(projetoVazio);
  const [novoUsuario, setNovoUsuario] = useState<Usuario>({
    nome: "",
    login: "",
    senha: "",
    cargo: "lider",
    vinculo: "",
    training_status: "nao_aplicavel",
    ...permissoesPadraoUsuario("lider"),
  });
  const [novoElencoProjeto, setNovoElencoProjeto] =
    useState<ElencoItem>(elencoVazio);
  const [novoElencoRascunho, setNovoElencoRascunho] =
    useState<ElencoItem>(elencoVazio);
  const [criandoEstruturaDrive, setCriandoEstruturaDrive] = useState(false);
  const [respostasSelecao, setRespostasSelecao] = useState<RespostaSelecao[]>(
    []
  );
  const [respostaSelecaoAtivaId, setRespostaSelecaoAtivaId] = useState<
    string | null
  >(null);
  const [sincronizandoSelecao, setSincronizandoSelecao] = useState(false);
  const [statusSelecaoPorId, setStatusSelecaoPorId] = useState<
    Record<string, StatusSelecao>
  >({});
  const [comentarioSelecaoPorId, setComentarioSelecaoPorId] = useState<
    Record<string, string>
  >({});
  const [avaliacoesSelecaoSalvas, setAvaliacoesSelecaoSalvas] = useState<
    AvaliacaoSelecao[]
  >([]);
  const [salvandoAvaliacaoSelecao, setSalvandoAvaliacaoSelecao] =
    useState(false);
  const [entregasProducao, setEntregasProducao] = useState<EntregaProducao[]>(
    []
  );
  const [sincronizandoEntregas, setSincronizandoEntregas] = useState(false);
  const [semanasProjeto, setSemanasProjeto] = useState<ProjetoSemana[]>([]);
  const [semanaFiltroProducao, setSemanaFiltroProducao] = useState(1);
  const [liberandoSemana, setLiberandoSemana] = useState(false);

  useEffect(() => {
    function atualizarLargura() {
      setLarguraTela(window.innerWidth);
    }

    atualizarLargura();
    window.addEventListener("resize", atualizarLargura);
    return () => window.removeEventListener("resize", atualizarLargura);
  }, []);

  async function carregarAvaliacoesSelecaoProjeto(projeto: Projeto) {
    const avaliacoes = await carregarAvaliacoesSelecaoBanco(projeto.ID);
    setAvaliacoesSelecaoSalvas(avaliacoes);

    const statusMap: Record<string, StatusSelecao> = {};
    const comentarioMap: Record<string, string> = {};

    avaliacoes.forEach((item) => {
      statusMap[item.resposta_id] = item.status;
      comentarioMap[item.resposta_id] = item.comentario_lider || "";
    });

    setStatusSelecaoPorId((anterior) => ({
      ...anterior,
      ...statusMap,
    }));

    setComentarioSelecaoPorId((anterior) => ({
      ...anterior,
      ...comentarioMap,
    }));
  }

  async function salvarAvaliacaoSelecaoAtual(
    projeto: Projeto,
    resposta: RespostaSelecao | null,
    status: StatusSelecao,
    comentario: string
  ) {
    if (!resposta) {
      alert("Selecione uma resposta primeiro.");
      return false;
    }

    if (!projeto?.ID) {
      alert("Projeto inválido.");
      return false;
    }

    setSalvandoAvaliacaoSelecao(true);

    try {
      const ok = await salvarAvaliacaoSelecaoBanco({
        projeto_id: Number(projeto.ID),
        resposta_id: resposta.id,
        linha: resposta.linha ?? null,
        nome: resposta.nome || "",
        telefone: resposta.telefone || "",
        personagem: resposta.personagem || "",
        semana: resposta.semana || "Semana 01",
        video_url: resposta.videoUrl || "",
        comentario_membro: resposta.comentario || "",
        status,
        comentario_lider: comentario || "",
        avaliado_por: usuarioLogado?.nome || usuarioLogado?.login || "Sistema",
      });

      if (!ok) {
        alert("Não consegui salvar a avaliação no Supabase.");
        return false;
      }

      setStatusSelecaoPorId((anterior) => ({
        ...anterior,
        [resposta.id]: status,
      }));

      setComentarioSelecaoPorId((anterior) => ({
        ...anterior,
        [resposta.id]: comentario || "",
      }));

      await carregarAvaliacoesSelecaoProjeto(projeto);

      return true;
    } finally {
      setSalvandoAvaliacaoSelecao(false);
    }
  }

  async function sincronizarRespostasSelecao(projeto: Projeto) {
    const links = extrairLinksDrive(projeto.Observacoes);
    const planilhaSelecao = links.planilhaSelecao || "";
    const pastaRespostasSelecao = links.respostasSelecao || links.selecao || "";

    if (!planilhaSelecao && !pastaRespostasSelecao) {
      alert(
        "Ainda não encontrei a planilha nem a pasta de respostas da seleção neste projeto. Crie a estrutura do Drive novamente em um projeto teste."
      );
      return;
    }

    try {
      setSincronizandoSelecao(true);
      const respostas = await lerRespostasSelecaoViaAppsScript(
        planilhaSelecao,
        pastaRespostasSelecao
      );

      setRespostasSelecao(respostas);
      await carregarAvaliacoesSelecaoProjeto(projeto);

      if (respostas.length) {
        setRespostaSelecaoAtivaId(respostas[0].id);
      } else {
        setRespostaSelecaoAtivaId(null);
      }

      alert(
        `Sincronização concluída. ${respostas.length} resposta(s) importada(s).`
      );
    } catch (err: any) {
      console.error("Erro ao sincronizar respostas da seleção:", err);
      alert(`Erro ao sincronizar respostas: ${err?.message || String(err)}`);
    } finally {
      setSincronizandoSelecao(false);
    }
  }

  async function adicionarRespostaSelecaoAoElenco(
    resposta?: RespostaSelecao | null
  ) {
    if (!projetoPainel || !resposta) {
      alert("Selecione uma resposta primeiro.");
      return;
    }

    if (!resposta.personagem || !resposta.nome) {
      alert(
        "A resposta precisa ter personagem e nome do membro para entrar no elenco."
      );
      return;
    }

    const jaTemPersonagem = projetoPainel.Elenco.some(
      (item) => normalizar(item.personagem) === normalizar(resposta.personagem)
    );

    if (jaTemPersonagem) {
      const confirmar = window.confirm(
        `Já existe alguém registrado para ${resposta.personagem}. Deseja substituir pelo membro ${resposta.nome}?`
      );

      if (!confirmar) return;
    }

    const novoElenco = [
      ...projetoPainel.Elenco.filter(
        (item) =>
          normalizar(item.personagem) !== normalizar(resposta.personagem)
      ),
      {
        id: gerarIdTemporario(),
        personagem: resposta.personagem,
        dublador: resposta.nome,
        telefone_dublador: resposta.telefone || "",
        funcao: "Dublador",
      },
    ];

    const ok = await salvarElencoProjetoBanco(projetoPainel.ID, novoElenco);

    if (!ok) {
      alert("Não consegui salvar o elenco no banco.");
      return;
    }

    await salvarAvaliacaoSelecaoAtual(
      projetoPainel,
      resposta,
      "aprovado",
      comentarioSelecaoPorId[resposta.id] || ""
    );

    await recarregarProjetos();
    alert(
      `${resposta.nome} foi aprovado(a) e adicionado(a) ao elenco como ${resposta.personagem}.`
    );
  }

  async function carregarSemanasProjeto(projeto: Projeto) {
    let semanas = await carregarSemanasProjetoBanco(projeto.ID);

    if (!semanas.length) {
      await garantirSemanaProjetoBanco(
        projeto.ID,
        1,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );
      semanas = await carregarSemanasProjetoBanco(projeto.ID);
    }

    setSemanasProjeto(semanas);

    const semanaAberta =
      semanas.find((item) => item.status === "aberta") ||
      semanas[semanas.length - 1];

    if (semanaAberta?.semana) {
      setSemanaFiltroProducao(semanaAberta.semana);
    }

    return semanas;
  }

  async function carregarEntregasProducaoProjeto(projeto: Projeto) {
    const entregas = await carregarEntregasProducaoBanco(projeto.ID);
    setEntregasProducao(entregas);
    await carregarSemanasProjeto(projeto);
    return entregas;
  }

  function todosEntregaramSemana(
    projeto: Projeto,
    entregas: EntregaProducao[],
    semana: number
  ) {
    const elenco = (projeto.Elenco || []).filter(
      (item) => item.personagem && item.dublador
    );

    if (!elenco.length) return false;

    return elenco.every((personagem) =>
      entregas.some(
        (entrega) =>
          normalizar(entrega.personagem) ===
            normalizar(personagem.personagem) &&
          numeroSemanaEntrega(entrega.semana) === semana
      )
    );
  }

  async function verificarLiberacaoAutomaticaSemana(
    projeto: Projeto,
    entregas: EntregaProducao[]
  ) {
    const semanas = await carregarSemanasProjeto(projeto);
    const aberta =
      semanas.find((item) => item.status === "aberta") ||
      semanas[semanas.length - 1];

    const semanaAtual = aberta?.semana || 1;

    if (!todosEntregaramSemana(projeto, entregas, semanaAtual)) {
      return;
    }

    const confirmar = window.confirm(
      `Todos os dubladores entregaram a ${labelSemana(
        semanaAtual
      )}. Deseja concluir esta semana e liberar a ${labelSemana(
        semanaAtual + 1
      )}?`
    );

    if (!confirmar) return;

    setLiberandoSemana(true);

    try {
      const ok = await concluirSemanaProjetoBanco(
        projeto.ID,
        semanaAtual,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui liberar a próxima semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      setSemanaFiltroProducao(semanaAtual + 1);
      alert(`${labelSemana(semanaAtual + 1)} liberada automaticamente.`);
    } finally {
      setLiberandoSemana(false);
    }
  }

  async function sincronizarEntregasProducao(projeto: Projeto) {
    const links = extrairLinksDrive(projeto.Observacoes);
    const planilhaEntregas = links.planilhaEntregas || "";
    const pastaEntregas = links.entregasProjeto || links.projeto || "";

    if (!planilhaEntregas && !pastaEntregas) {
      alert(
        "Ainda não encontrei a planilha nem a pasta de entregas deste projeto."
      );
      return;
    }

    try {
      setSincronizandoEntregas(true);

      const respostas = await lerRespostasEntregasViaEdge(
        planilhaEntregas,
        pastaEntregas
      );

      const entregasComProjeto = respostas.map((item) => ({
        ...item,
        projeto_id: Number(projeto.ID),
      }));

      const ok = await salvarEntregasProducaoBanco(
        projeto.ID,
        entregasComProjeto
      );

      if (!ok) {
        alert("Não consegui salvar as entregas no Supabase.");
        return;
      }

      const entregasAtualizadas = await carregarEntregasProducaoProjeto(
        projeto
      );
      await verificarLiberacaoAutomaticaSemana(projeto, entregasAtualizadas);

      alert(
        `Sincronização concluída. ${respostas.length} entrega(s) importada(s).`
      );
    } catch (err: any) {
      console.error("Erro ao sincronizar entregas:", err);
      alert(`Erro ao sincronizar entregas: ${err?.message || String(err)}`);
    } finally {
      setSincronizandoEntregas(false);
    }
  }

  async function alterarStatusEntrega(
    entrega: EntregaProducao,
    status: "pendente" | "aprovado" | "regravacao"
  ) {
    if (!entrega.id) {
      alert("Entrega ainda não foi salva no Supabase.");
      return;
    }

    const ok = await atualizarStatusEntregaBanco(
      entrega.id,
      status,
      usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
    );

    if (!ok) {
      alert("Não consegui atualizar o status da entrega.");
      return;
    }

    setEntregasProducao((anteriores) =>
      anteriores.map((item) =>
        item.id === entrega.id ? { ...item, status } : item
      )
    );
  }

  function renderAbaSelecaoVisual(projeto: Projeto) {
    const links = extrairLinksDrive(projeto.Observacoes);

    const temFormulario = Boolean(links.formSelecao || links.respostasSelecao);
    const respostaAtiva =
      respostasSelecao.find((item) => item.id === respostaSelecaoAtivaId) ||
      respostasSelecao[0] ||
      null;

    const statusAtual: StatusSelecao =
      (respostaAtiva && statusSelecaoPorId[respostaAtiva.id]) ||
      respostaAtiva?.status ||
      "pendente";

    const comentarioAtual =
      (respostaAtiva && comentarioSelecaoPorId[respostaAtiva.id]) || "";

    const respostasComStatus = respostasSelecao.map((item) => ({
      ...item,
      statusFinal: statusSelecaoPorId[item.id] || item.status || "pendente",
    }));

    const totalPendentes = respostasComStatus.filter(
      (item) => item.statusFinal === "pendente"
    ).length;
    const totalAprovados = respostasComStatus.filter(
      (item) => item.statusFinal === "aprovado"
    ).length;
    const totalReprovados = respostasComStatus.filter(
      (item) => item.statusFinal === "reprovado"
    ).length;

    const previewUrl = respostaAtiva?.videoUrl
      ? converterDriveParaPreview(respostaAtiva.videoUrl)
      : "";

    function atualizarStatus(status: StatusSelecao) {
      if (!respostaAtiva) {
        alert("Selecione uma resposta primeiro.");
        return;
      }

      setStatusSelecaoPorId((anterior) => ({
        ...anterior,
        [respostaAtiva.id]: status,
      }));
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={tituloCardDarkStyle}>🎭 Seleção de Personagens</h2>
              <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                Respostas do formulário de seleção. O líder analisa os testes,
                aprova/reprova candidatos e adiciona aprovados ao elenco
                oficial.
              </p>
            </div>

            <button
              type="button"
              style={botaoPrimarioStyle}
              disabled={sincronizandoSelecao}
              onClick={() => sincronizarRespostasSelecao(projeto)}
            >
              {sincronizandoSelecao
                ? "Sincronizando..."
                : "Sincronizar respostas"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            {[
              ["Pendentes", String(totalPendentes)],
              ["Selecionados", String(totalAprovados)],
              ["Não selecionados", String(totalReprovados)],
              ["Formulário", temFormulario ? "Ativo" : "Pendente"],
            ].map(([label, valor]) => (
              <div
                key={label}
                style={{
                  background: "rgba(2, 6, 23, 0.55)",
                  border: "1px solid rgba(148, 163, 184, 0.24)",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
                <strong style={{ color: "#f8fafc", fontSize: 20 }}>
                  {valor}
                </strong>
              </div>
            ))}
          </div>

          {respostasSelecao.length > 0 && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <strong style={{ color: "#f8fafc" }}>Respostas importadas</strong>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {respostasSelecao.map((item) => {
                  const ativo = respostaAtiva?.id === item.id;
                  const statusItem =
                    statusSelecaoPorId[item.id] || item.status || "pendente";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRespostaSelecaoAtivaId(item.id)}
                      style={{
                        textAlign: "left",
                        border: ativo
                          ? "1px solid rgba(56, 189, 248, 0.55)"
                          : "1px solid rgba(148, 163, 184, 0.18)",
                        background: ativo
                          ? "rgba(56, 189, 248, 0.12)"
                          : "rgba(2, 6, 23, 0.42)",
                        borderRadius: 12,
                        padding: 12,
                        color: "#f8fafc",
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "1.2fr 1.2fr 0.8fr 0.7fr",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <span>
                        <strong>
                          {item.personagem || "Personagem não informado"}
                        </strong>
                        <br />
                        <small style={{ color: "#94a3b8" }}>
                          {item.nome || "Nome não informado"}
                        </small>
                      </span>

                      <span style={{ color: "#cbd5e1" }}>
                        {item.telefone || "Sem número"}
                      </span>

                      <span style={{ color: "#cbd5e1" }}>
                        {item.timestamp || "Sem data"}
                      </span>

                      <span
                        style={{
                          justifySelf: isMobile ? "start" : "end",
                          borderRadius: 999,
                          padding: "5px 10px",
                          background:
                            statusItem === "aprovado"
                              ? "rgba(34, 197, 94, 0.16)"
                              : statusItem === "reprovado"
                              ? "rgba(248, 113, 113, 0.16)"
                              : "rgba(245, 158, 11, 0.15)",
                          color:
                            statusItem === "aprovado"
                              ? "#86efac"
                              : statusItem === "reprovado"
                              ? "#fecaca"
                              : "#fbbf24",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {statusItem === "aprovado"
                          ? "Selecionado"
                          : statusItem === "reprovado"
                          ? "Não selecionado"
                          : "Pendente"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            ...painelDarkStyle,
            padding: 18,
            border: "1px solid rgba(56, 189, 248, 0.20)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(280px, 0.95fr) minmax(280px, 1fr) minmax(280px, 1fr)",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Pré-visualização do envio
              </h2>

              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "rgba(2, 6, 23, 0.64)",
                  border: "1px solid rgba(56, 189, 248, 0.16)",
                  minHeight: 210,
                  display: "grid",
                  placeItems: "center",
                  color: "#94a3b8",
                }}
              >
                {previewUrl ? (
                  <iframe
                    title="Pré-visualização do envio"
                    src={previewUrl}
                    allow="autoplay"
                    style={{
                      width: "100%",
                      height: 260,
                      border: 0,
                      background: "#020617",
                    }}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: 22 }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        margin: "0 auto 12px",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(56, 189, 248, 0.12)",
                        border: "1px solid rgba(56, 189, 248, 0.18)",
                        color: "#38bdf8",
                        fontSize: 26,
                      }}
                    >
                      ▶
                    </div>

                    <strong style={{ color: "#f8fafc" }}>
                      Nenhum envio selecionado
                    </strong>

                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: "#94a3b8",
                      }}
                    >
                      Sincronize e selecione uma resposta para assistir ao vídeo
                      aqui.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                style={{
                  marginTop: 12,
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontWeight: 700,
                  cursor: respostaAtiva?.videoUrl ? "pointer" : "not-allowed",
                  padding: 0,
                  opacity: respostaAtiva?.videoUrl ? 1 : 0.5,
                }}
                disabled={!respostaAtiva?.videoUrl}
                onClick={() => {
                  if (respostaAtiva?.videoUrl) {
                    window.open(respostaAtiva.videoUrl, "_blank");
                  }
                }}
              >
                Abrir em nova aba ↗
              </button>
            </div>

            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Detalhes do envio
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  color: "#cbd5e1",
                  fontSize: 13,
                }}
              >
                {[
                  ["Membro", respostaAtiva?.nome || "Nenhum envio selecionado"],
                  ["Número", respostaAtiva?.telefone || "—"],
                  ["Personagem", respostaAtiva?.personagem || "—"],
                  ["Data de envio", respostaAtiva?.timestamp || "—"],
                  ["Tipo", "Seleção"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "118px 1fr",
                      gap: 10,
                    }}
                  >
                    <span style={{ color: "#94a3b8" }}>{label}:</span>
                    <strong style={{ color: "#f8fafc" }}>{value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Comentário do membro:
                </div>

                <div
                  style={{
                    minHeight: 74,
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(2, 6, 23, 0.56)",
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    color: "#cbd5e1",
                    fontSize: 13,
                  }}
                >
                  {respostaAtiva?.comentario ||
                    "O comentário enviado pelo membro aparecerá aqui."}
                </div>
              </div>

              <button
                type="button"
                style={{
                  marginTop: 16,
                  border: "1px solid rgba(56, 189, 248, 0.28)",
                  color: "#dbeafe",
                  background: "rgba(56, 189, 248, 0.08)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: respostaAtiva ? "pointer" : "not-allowed",
                  opacity: respostaAtiva ? 1 : 0.5,
                }}
                disabled={!respostaAtiva}
                onClick={() => adicionarRespostaSelecaoAoElenco(respostaAtiva)}
              >
                👥 Adicionar ao elenco manualmente
              </button>
            </div>

            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Avaliação do líder
              </h2>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Status da seleção
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <button
                  type="button"
                  onClick={async () => {
                    atualizarStatus("aprovado");
                    if (projetoPainel && respostaAtiva) {
                      const ok = await salvarAvaliacaoSelecaoAtual(
                        projetoPainel,
                        respostaAtiva,
                        "aprovado",
                        comentarioAtual
                      );

                      if (ok) {
                        await adicionarRespostaSelecaoAoElenco(respostaAtiva);
                      }
                    }
                  }}
                  style={{
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#dcfce7",
                    background:
                      statusAtual === "aprovado"
                        ? "rgba(22, 163, 74, 0.42)"
                        : "rgba(22, 163, 74, 0.22)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✓ Aprovar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    atualizarStatus("reprovado");
                    if (projetoPainel && respostaAtiva) {
                      await salvarAvaliacaoSelecaoAtual(
                        projetoPainel,
                        respostaAtiva,
                        "reprovado",
                        comentarioAtual
                      );
                    }
                  }}
                  style={{
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    color: "#fee2e2",
                    background:
                      statusAtual === "reprovado"
                        ? "rgba(220, 38, 38, 0.42)"
                        : "rgba(220, 38, 38, 0.20)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✕ Reprovar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    atualizarStatus("pendente");
                    if (projetoPainel && respostaAtiva) {
                      await salvarAvaliacaoSelecaoAtual(
                        projetoPainel,
                        respostaAtiva,
                        "pendente",
                        comentarioAtual
                      );
                    }
                  }}
                  style={{
                    border: "1px solid rgba(245, 158, 11, 0.40)",
                    color: "#fde68a",
                    background:
                      statusAtual === "pendente"
                        ? "rgba(120, 53, 15, 0.48)"
                        : "rgba(120, 53, 15, 0.28)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ◷ Pendente
                </button>
              </div>

              <label
                style={{
                  display: "block",
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Comentário do líder
              </label>

              <textarea
                placeholder="Deixe uma observação sobre o teste..."
                value={comentarioAtual}
                onChange={(e) => {
                  if (!respostaAtiva) return;
                  setComentarioSelecaoPorId((anterior) => ({
                    ...anterior,
                    [respostaAtiva.id]: e.target.value,
                  }));
                }}
                style={{
                  width: "100%",
                  minHeight: 112,
                  resize: "vertical",
                  boxSizing: "border-box",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(2, 6, 23, 0.64)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  color: "#f8fafc",
                  outline: "none",
                }}
              />

              <button
                type="button"
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "1px solid rgba(56, 189, 248, 0.30)",
                  color: "#06121f",
                  background: "linear-gradient(135deg, #bfdbfe, #3b82f6)",
                  borderRadius: 12,
                  padding: "13px 16px",
                  fontWeight: 900,
                  cursor: respostaAtiva ? "pointer" : "not-allowed",
                  opacity: respostaAtiva ? 1 : 0.5,
                }}
                disabled={!respostaAtiva || salvandoAvaliacaoSelecao}
                onClick={async () => {
                  if (!respostaAtiva || !projetoPainel) return;

                  const ok = await salvarAvaliacaoSelecaoAtual(
                    projetoPainel,
                    respostaAtiva,
                    statusAtual,
                    comentarioAtual
                  );

                  if (ok) {
                    alert("Avaliação salva no Supabase.");
                  }
                }}
              >
                {salvandoAvaliacaoSelecao ? "Salvando..." : "Salvar avaliação"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function recarregarProjetos() {
    try {
      setCarregando(true);
      const lista = await comTimeout(
        carregarProjetosBanco(mostrarArquivados),
        20000,
        "A busca dos projetos demorou demais."
      );
      setProjetos(lista);
    } catch (err) {
      console.error("Erro ao recarregar projetos:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function recarregarUsuarios() {
    try {
      const lista = await comTimeout(
        carregarUsuariosBanco(),
        20000,
        "A busca dos usuários demorou demais."
      );
      setUsuarios(lista);
    } catch (err) {
      console.error("Erro ao recarregar usuários:", err);
    }
  }

  async function recarregarMembros() {
    if (!podeGerenciarMembros(usuarioLogado)) return;

    try {
      const lista = await comTimeout(
        carregarMembrosBanco(),
        20000,
        "A busca dos membros demorou demais."
      );
      setMembros(lista);
    } catch (err) {
      console.error("Erro ao recarregar membros:", err);
    }
  }

  useEffect(() => {
    async function restaurarSessaoERecarregar() {
      try {
        const usuarioSalvo = localStorage.getItem("dubworks_usuario");
        if (usuarioSalvo && !usuarioLogado) {
          try {
            setUsuarioLogado(JSON.parse(usuarioSalvo));
          } catch {
            localStorage.removeItem("dubworks_usuario");
          }
        }

        await recarregarProjetos();
        await recarregarUsuarios();

        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email?.trim().toLowerCase();

        if (!email) {
          return;
        }

        const perfil = await buscarPerfilPorEmail(email);
        if (perfil) {
          setUsuarioLogado(perfil);
          localStorage.setItem("dubworks_usuario", JSON.stringify(perfil));
          if (podeGerenciarMembros(perfil)) {
            carregarMembrosBanco()
              .then(setMembros)
              .catch((err) => console.error("Erro ao carregar membros:", err));
          }
        }
      } catch (err) {
        console.error("Erro ao restaurar sessão:", err);
      }
    }

    restaurarSessaoERecarregar();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        const email = session?.user?.email?.trim().toLowerCase();

        if (!email) {
          return;
        }

        const perfil = await buscarPerfilPorEmail(email);
        if (perfil) {
          setUsuarioLogado(perfil);
          localStorage.setItem("dubworks_usuario", JSON.stringify(perfil));
          if (podeGerenciarMembros(perfil)) {
            carregarMembrosBanco()
              .then(setMembros)
              .catch((err) => console.error("Erro ao carregar membros:", err));
          }
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [mostrarArquivados]);

  useEffect(() => {
    if (!mostrarNovoProjeto || !usuarioLogado) return;

    if (
      usuarioLogado.cargo === "lider" ||
      usuarioLogado.cargo === "lider_treinamento"
    ) {
      setNovoProjeto((anterior) => ({
        ...anterior,
        Lider: usuarioLogado.vinculo || usuarioLogado.nome,
      }));
    }
  }, [mostrarNovoProjeto, usuarioLogado]);

  useEffect(() => {
    const permitidos = cargosPermitidosParaCriar(usuarioLogado);
    if (!permitidos.length) return;
    if (permitidos.indexOf(novoUsuario.cargo) === -1) {
      setNovoUsuario((anterior) => ({
        ...anterior,
        cargo: permitidos[0],
        training_status: statusPadraoPorCargo(permitidos[0]),
        ...permissoesPadraoUsuario(permitidos[0]),
      }));
    }
  }, [usuarioLogado, novoUsuario.cargo]);

  const projetosVisiveis = useMemo(() => {
    if (!usuarioLogado) return [];
    return projetos.filter((p) => podeVerProjeto(usuarioLogado, p));
  }, [projetos, usuarioLogado]);

  const statusUnicos = useMemo(() => {
    return Array.from(
      new Set(projetosVisiveis.map((p) => p.Status).filter(Boolean))
    );
  }, [projetosVisiveis]);

  const filtrados = useMemo(() => {
    return projetosVisiveis.filter((p) => {
      const termo = query.toLowerCase();
      const camposBusca = [
        p.ID,
        p.Projeto,
        p.Tipo,
        p.Genero,
        p.Prioridade,
        p.Status,
        p.Lider,
        p.Editor,
        p.Dupla,
        ...p.Elenco.map(
          (item) => `${item.personagem} ${item.dublador} ${item.funcao}`
        ),
      ]
        .join(" ")
        .toLowerCase();

      const busca = camposBusca.indexOf(termo) !== -1;
      const statusOk = statusFiltro === "Todos" || p.Status === statusFiltro;
      return busca && statusOk;
    });
  }, [projetosVisiveis, query, statusFiltro]);

  const selecionado = useMemo(() => {
    return projetos.find((p) => p.ID === selecionadoId) || null;
  }, [projetos, selecionadoId]);

  useEffect(() => {
    if (selecionado) {
      setRascunho({ ...selecionado, Elenco: [...selecionado.Elenco] });
    } else {
      setRascunho(null);
    }
  }, [selecionado]);

  const rankingDubladores = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nome: string;
        totalProjetos: number;
        totalPapeis: number;
        projetosUnicos: Set<string>;
      }
    >();

    projetos.forEach((projeto) => {
      projeto.Elenco.forEach((item) => {
        const chave = normalizar(item.dublador);
        if (!chave) return;
        if (!mapa.has(chave)) {
          mapa.set(chave, {
            nome: item.dublador,
            totalProjetos: 0,
            totalPapeis: 0,
            projetosUnicos: new Set<string>(),
          });
        }
        const registro = mapa.get(chave)!;
        registro.totalPapeis += 1;
        registro.projetosUnicos.add(projeto.ID);
      });
    });

    return Array.from(mapa.values())
      .map((item) => ({
        nome: item.nome,
        totalProjetos: item.projetosUnicos.size,
        totalPapeis: item.totalPapeis,
      }))
      .sort((a, b) => {
        if (b.totalProjetos !== a.totalProjetos)
          return b.totalProjetos - a.totalProjetos;
        return b.totalPapeis - a.totalPapeis;
      });
  }, [projetos]);

  const usuariosVisiveis = useMemo(() => {
    if (!usuarioLogado) return [];
    if (usuarioLogado.cargo === "diretoria") return usuarios;
    if (usuarioLogado.cargo === "adm") {
      return usuarios.filter((u) => u.cargo !== "diretoria");
    }
    if (usuarioLogado.cargo === "adm_treinamento") {
      return usuarios.filter((u) => u.cargo === "lider_treinamento");
    }
    return [];
  }, [usuarios, usuarioLogado]);

  const membrosFiltrados = useMemo(() => {
    const termo = normalizar(queryMembros);
    if (!termo) return membros;

    const statusDireto: Record<string, StatusMembro> = {
      "na comunidade": "na_comunidade",
      ativo: "na_comunidade",
      ativos: "na_comunidade",
      saiu: "saiu",
      sairam: "saiu",
      saíram: "saiu",
      banido: "banido",
      banidos: "banido",
      pausado: "pausado",
      pausados: "pausado",
    };

    if (statusDireto[termo]) {
      return membros.filter((m) => m.status === statusDireto[termo]);
    }

    return membros.filter((m) =>
      [
        m.nome,
        m.telefone,
        m.email,
        m.habilidades || "",
        m.motivacao || "",
        m.observacao || "",
        statusMembroLabel(m.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [membros, queryMembros]);

  const relatorioEntradaSaida = useMemo(() => {
    return calcularRelatorioEntradaSaida(membros);
  }, [membros]);

  const totalMembrosAtivos = membros.filter(
    (m) => m.status === "na_comunidade"
  ).length;
  const totalMembrosSaida = membros.filter((m) => m.status === "saiu").length;

  const totalProjetos = projetosVisiveis.length;
  const totalAtivos = projetosVisiveis.filter(
    (p) =>
      ["finalizado", "concluida", "concluído"].indexOf(normalizar(p.Status)) ===
      -1
  ).length;
  const totalFinalizados = projetosVisiveis.filter(
    (p) =>
      ["finalizado", "concluida", "concluído"].indexOf(normalizar(p.Status)) !==
      -1
  ).length;
  const totalElenco = projetosVisiveis.reduce(
    (acc, projeto) => acc + projeto.Elenco.length,
    0
  );
  const totalTreinamento = usuarios.filter(
    (u) => u.cargo === "lider_treinamento"
  ).length;

  const moduloSelecionadoTreinamento =
    modulosTreinamentoLider.find((m) => m.id === moduloTreinamentoAtivo) ||
    modulosTreinamentoLider[0];

  const totalPerguntasTreinamento = modulosTreinamentoLider.filter(
    (modulo) => modulo.pergunta
  ).length;

  const respostasCorretasTreinamento = modulosTreinamentoLider.filter(
    (modulo) =>
      modulo.pergunta &&
      respostasTreinamento[modulo.id] === modulo.pergunta.correta
  ).length;

  const progressoTreinamento = totalPerguntasTreinamento
    ? Math.round(
        (respostasCorretasTreinamento / totalPerguntasTreinamento) * 100
      )
    : 0;

  function responderPerguntaTreinamento(
    moduloId: string,
    alternativaIndex: number
  ) {
    setRespostasTreinamento((atual) => ({
      ...atual,
      [moduloId]: alternativaIndex,
    }));
  }

  async function recarregarRespostasTreinamento() {
    if (!usuarioLogado) return;
    if (!podeGerenciarTreinamentos(usuarioLogado)) return;

    try {
      setCarregandoRespostasTreinamento(true);
      const lista = await carregarRespostasTreinamentoBanco();
      setRespostasTreinamentoSalvas(lista);
    } catch (err) {
      console.error("Erro ao carregar respostas do treinamento:", err);
    } finally {
      setCarregandoRespostasTreinamento(false);
    }
  }

  async function enviarRespostaTreinamento(modulo: ModuloTreinamento) {
    if (!usuarioLogado || !modulo.pergunta) return;

    const alternativaMarcada = respostasTreinamento[modulo.id];

    if (alternativaMarcada === undefined) {
      alert("Escolha uma alternativa antes de enviar.");
      return;
    }

    const resposta: RespostaTreinamento = {
      usuario_login: usuarioLogado.login,
      usuario_nome: usuarioLogado.nome,
      usuario_cargo: usuarioLogado.cargo,
      modulo_id: modulo.id,
      modulo_titulo: modulo.titulo,
      pergunta: modulo.pergunta.pergunta,
      alternativa_marcada: alternativaMarcada,
      alternativa_texto: modulo.pergunta.alternativas[alternativaMarcada] || "",
      alternativa_correta: modulo.pergunta.correta,
      correta: alternativaMarcada === modulo.pergunta.correta,
      explicacao: modulo.pergunta.explicacao,
    };

    const ok = await salvarRespostaTreinamentoBanco(resposta);

    if (!ok) {
      alert(
        "Não consegui salvar a resposta. Confira se a tabela treinamento_respostas existe no Supabase."
      );
      return;
    }

    alert("Resposta enviada para avaliação da diretoria.");
    await recarregarRespostasTreinamento();
  }

  async function fazerLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setCarregandoLogin(true);
      setErroLogin("");

      const email = login.trim().toLowerCase();

      if (!email || !senha) {
        setErroLogin("Digite seu e-mail e sua senha.");
        return;
      }

      const { data, error } = (await comTimeout(
        supabase.auth.signInWithPassword({
          email,
          password: senha,
        }),
        20000,
        "O login demorou demais para responder."
      )) as any;

      if (error || !data.user?.email) {
        console.error("Erro no login:", error);
        setErroLogin("Login ou senha inválidos.");
        return;
      }

      const perfil = await buscarPerfilPorEmail(data.user.email);

      if (!perfil) {
        await supabase.auth.signOut();
        setErroLogin(
          "Login autorizado, mas esse e-mail ainda não tem perfil na tabela usuarios. Confira o cadastro no Supabase."
        );
        return;
      }

      setUsuarioLogado(perfil);
      localStorage.setItem("dubworks_usuario", JSON.stringify(perfil));
      setErroLogin("");
      setSelecionadoId(null);

      // Recarrega os dados depois de liberar a entrada.
      // Assim o botão não fica preso em "Entrando..." se alguma consulta demorar.
      setTimeout(() => {
        recarregarProjetos();
        recarregarUsuarios();
        if (podeGerenciarMembros(perfil)) {
          carregarMembrosBanco()
            .then(setMembros)
            .catch((err) => console.error("Erro ao carregar membros:", err));
        }
      }, 0);
    } catch (err: any) {
      console.error("Erro inesperado no login:", err);
      setErroLogin(
        err?.message || "Erro de conexão com o servidor. Tente novamente."
      );
    } finally {
      setCarregandoLogin(false);
    }
  }

  async function enviarRecuperacaoSenha() {
    const email = login.trim().toLowerCase();

    if (!email) {
      setErroLogin("Digite seu e-mail no campo de login primeiro.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://dubworks-manager-teste.vercel.app/",
    });

    if (error) {
      console.error("Erro ao enviar recuperação de senha:", error);
      setErroLogin(
        "Não consegui enviar o e-mail de recuperação. Confira o e-mail e tente novamente."
      );
      return;
    }

    setErroLogin("Enviamos um link de recuperação para o seu e-mail.");
  }

  async function sair() {
    await supabase.auth.signOut();
    localStorage.removeItem("dubworks_usuario");
    setUsuarioLogado(null);
    setLogin("");
    setSenha("");
    setErroLogin("");
    setSelecionadoId(null);
    setRascunho(null);
  }

  function atualizarCampo(campo: keyof Projeto, valor: string) {
    if (!rascunho) return;
    setRascunho({ ...rascunho, [campo]: valor });
  }

  function limparFormularioProjeto() {
    setNovoProjeto({
      ...projetoVazio,
      Lider:
        usuarioLogado &&
        (usuarioLogado.cargo === "lider" ||
          usuarioLogado.cargo === "lider_treinamento")
          ? usuarioLogado.vinculo || usuarioLogado.nome
          : "",
    });
    setNovoElencoProjeto(elencoVazio);
  }

  async function criarProjeto() {
    if (!usuarioLogado || !podeCriarProjeto(usuarioLogado)) return;

    if (!novoProjeto.Projeto.trim()) {
      alert("Preencha pelo menos o nome do projeto.");
      return;
    }

    const projetoParaSalvar: Projeto = {
      ...novoProjeto,
      Lider:
        usuarioLogado.cargo === "lider" ||
        usuarioLogado.cargo === "lider_treinamento"
          ? usuarioLogado.vinculo || usuarioLogado.nome
          : novoProjeto.Lider,
    };

    const projetoParaSalvarComHistorico: Projeto = {
      ...projetoParaSalvar,
      Registro_Semanal: [
        projetoParaSalvar.Registro_Semanal || "",
        `[${new Date().toLocaleString("pt-BR")}] ${
          usuarioLogado.nome
        }: Criou o projeto.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const projetoId = await criarProjetoBanco(projetoParaSalvarComHistorico);
    if (!projetoId) {
      alert("Erro ao salvar no banco.");
      return;
    }

    const elencoOk = await salvarElencoProjetoBanco(
      projetoId,
      projetoParaSalvarComHistorico.Elenco
    );

    if (!elencoOk) alert("Projeto salvo, mas houve erro ao salvar o elenco.");

    await recarregarProjetos();
    setMostrarNovoProjeto(false);
    limparFormularioProjeto();
    setSelecionadoId(projetoId);
    alert("Projeto salvo no banco 🚀");
  }

  function registrarHistoricoProjeto(texto: string) {
    if (!rascunho) return;

    const agora = new Date().toLocaleString("pt-BR");
    const autor = usuarioLogado?.nome || "Sistema";
    const linha = `[${agora}] ${autor}: ${texto}`;

    setRascunho({
      ...rascunho,
      Registro_Semanal: [rascunho.Registro_Semanal || "", linha]
        .filter(Boolean)
        .join("\n"),
    });
  }

  async function criarEstruturaDriveProjeto() {
    if (!rascunho || !projetoPainel) return;

    if (!podeEditarProjeto(usuarioLogado, projetoPainel)) {
      alert("Você não tem permissão para criar pastas neste projeto.");
      return;
    }

    const linksAtuais = extrairLinksDrive(rascunho.Observacoes);

    if (
      linksAtuais.pasta ||
      linksAtuais.selecao ||
      linksAtuais.projeto ||
      linksAtuais.finalizados
    ) {
      const confirmar = window.confirm(
        "Este projeto já possui links do Drive cadastrados. Deseja continuar mesmo assim?"
      );

      if (!confirmar) return;
    }

    try {
      setCriandoEstruturaDrive(true);

      const resultado = await criarEstruturaDriveViaFunction(
        `[Projeto] ${rascunho.Projeto || projetoPainel.Projeto || "Sem nome"}`,
        rascunho.Lider || projetoPainel.Lider || "",
        rascunho.Editor || projetoPainel.Editor || ""
      );

      if (
        !resultado.pasta &&
        !resultado.selecao &&
        !resultado.projeto &&
        !resultado.finalizados &&
        !resultado.falasTeste &&
        !resultado.respostasSelecao &&
        !resultado.cortesProjeto &&
        !resultado.Advertencia &&
        !resultado.entregasProjeto
      ) {
        console.error("Retorno inesperado da função do Drive:", resultado);
        alert(
          "A função respondeu, mas não retornou os links das pastas. Verifique os logs da Edge Function no Supabase."
        );
        return;
      }

      const novosLinks = {
        ...linksAtuais,
        pasta: resultado.pasta || linksAtuais.pasta || "",
        selecao: resultado.selecao || linksAtuais.selecao || "",
        projeto: resultado.projeto || linksAtuais.projeto || "",
        finalizados: resultado.finalizados || linksAtuais.finalizados || "",
        falasTeste: resultado.falasTeste || linksAtuais.falasTeste || "",
        respostasSelecao:
          resultado.respostasSelecao || linksAtuais.respostasSelecao || "",
        cortesProjeto:
          resultado.cortesProjeto || linksAtuais.cortesProjeto || "",
        Advertencia: resultado.Advertencia,
        entregasProjeto:
          resultado.entregasProjeto || linksAtuais.entregasProjeto || "",
        formSelecao: resultado.formSelecao || linksAtuais.formSelecao || "",
        formEntregas: resultado.formEntregas || linksAtuais.formEntregas || "",
        planilhaSelecao:
          resultado.planilhaSelecao || linksAtuais.planilhaSelecao || "",
        planilhaEntregas:
          resultado.planilhaEntregas || linksAtuais.planilhaEntregas || "",
      };

      const projetoComLinks: Projeto = {
        ...rascunho,
        Observacoes: salvarLinksDriveEmObservacoes(
          rascunho.Observacoes,
          novosLinks
        ),
      };

      const projetoComHistorico = aplicarHistoricoAutomatico(
        projetoPainel,
        projetoComLinks,
        "criou estrutura oficial no Google Drive"
      );

      const ok = await atualizarProjetoBanco(projetoComHistorico);

      if (!ok) {
        alert(
          "A estrutura foi criada, mas houve erro ao salvar os links no banco."
        );
        return;
      }

      setRascunho(projetoComHistorico);
      await recarregarProjetos();
      alert("Estrutura do Drive criada e links salvos no projeto.");
    } catch (err: any) {
      console.error("Erro ao criar estrutura no Drive:", err);
      alert(
        `Erro ao criar estrutura no Drive: ${
          err?.message || String(err) || "erro desconhecido"
        }`
      );
    } finally {
      setCriandoEstruturaDrive(false);
    }
  }

  async function salvarLinksDriveComHistorico() {
    if (!rascunho || !projetoPainel) return;

    const linksAtuais = extrairLinksDrive(rascunho.Observacoes);
    const linksAntigos = extrairLinksDrive(projetoPainel.Observacoes);

    const alterados: string[] = [];

    if ((linksAtuais.pasta || "") !== (linksAntigos.pasta || "")) {
      alterados.push("Pasta Principal");
    }

    if (
      (linksAtuais.selecao || linksAtuais.videos || "") !==
      (linksAntigos.selecao || linksAntigos.videos || "")
    ) {
      alterados.push("1 | Seleção");
    }

    if (
      (linksAtuais.projeto || linksAtuais.cortes || "") !==
      (linksAntigos.projeto || linksAntigos.cortes || "")
    ) {
      alterados.push("2 | Projeto");
    }

    if ((linksAtuais.finalizados || "") !== (linksAntigos.finalizados || "")) {
      alterados.push("Finalizados");
    }

    if (alterados.length) {
      const agora = new Date().toLocaleString("pt-BR");
      const autor = usuarioLogado?.nome || "Sistema";
      const linha = `[${agora}] ${autor}: Atualizou links do Drive (${alterados.join(
        ", "
      )}).`;

      const projetoComHistorico: Projeto = aplicarHistoricoAutomatico(
        projetoPainel,
        rascunho,
        `atualizou links do Drive (${alterados.join(", ")})`
      );

      setRascunho(projetoComHistorico);

      const ok = await atualizarProjetoBanco(projetoComHistorico);

      if (!ok) {
        alert("Erro ao salvar os links no banco.");
        return;
      }

      await recarregarProjetos();
      alert("Links salvos e histórico registrado.");
      return;
    }

    await salvarAlteracoes();
  }

  function descreverAlteracoesProjeto(antes: Projeto, depois: Projeto) {
    const alteracoes: string[] = [];

    const campos: { chave: keyof Projeto; label: string }[] = [
      { chave: "Projeto", label: "nome do projeto" },
      { chave: "Tipo", label: "tipo" },
      { chave: "Genero", label: "gênero" },
      { chave: "Prioridade", label: "prioridade" },
      { chave: "Dupla", label: "dupla" },
      { chave: "Lider", label: "líder" },
      { chave: "Telefone_Lider", label: "telefone do líder" },
      { chave: "Editor", label: "editor" },
      { chave: "Telefone_Editor", label: "telefone do editor" },
      { chave: "Status", label: "status" },
      { chave: "Data_Inicio", label: "data de início" },
      { chave: "Video_Editor_Link", label: "link do vídeo do editor" },
      { chave: "Capa_URL", label: "capa do projeto" },
      { chave: "Observacoes", label: "observações/links do Drive" },
    ];

    campos.forEach((campo) => {
      const valorAntes = String((antes as any)[campo.chave] || "").trim();
      const valorDepois = String((depois as any)[campo.chave] || "").trim();

      if (valorAntes !== valorDepois) {
        alteracoes.push(campo.label);
      }
    });

    const elencoAntes = (antes.Elenco || [])
      .map(
        (item) =>
          `${item.personagem}|${item.dublador}|${
            item.telefone_dublador || ""
          }|${item.funcao}`
      )
      .join(";;");

    const elencoDepois = (depois.Elenco || [])
      .map(
        (item) =>
          `${item.personagem}|${item.dublador}|${
            item.telefone_dublador || ""
          }|${item.funcao}`
      )
      .join(";;");

    if (elencoAntes !== elencoDepois) {
      alteracoes.push("elenco");
    }

    return alteracoes;
  }

  function aplicarHistoricoAutomatico(
    projetoAntes: Projeto,
    projetoDepois: Projeto,
    acaoManual?: string
  ) {
    const alteracoes = acaoManual
      ? [acaoManual]
      : descreverAlteracoesProjeto(projetoAntes, projetoDepois);

    if (!alteracoes.length) return projetoDepois;

    const agora = new Date().toLocaleString("pt-BR");
    const autor = usuarioLogado?.nome || "Sistema";
    const linha = `[${agora}] ${autor}: Atualizou ${alteracoes.join(", ")}.`;

    return {
      ...projetoDepois,
      Registro_Semanal: [projetoDepois.Registro_Semanal || "", linha]
        .filter(Boolean)
        .join("\n"),
    };
  }

  async function salvarAlteracoes() {
    if (!rascunho || !selecionado || !usuarioLogado) return;

    const podeEditar = podeEditarProjeto(usuarioLogado, selecionado);
    const podeVideo = podeSubirVideoEditor(usuarioLogado, selecionado);
    if (!podeEditar && !podeVideo) return;

    if (!podeEditar && podeVideo) {
      const projetoVideoBase: Projeto = {
        ...selecionado,
        Video_Editor_Link: rascunho.Video_Editor_Link || "",
        Observacoes: rascunho.Observacoes || "",
      };

      const projetoVideo = aplicarHistoricoAutomatico(
        selecionado,
        projetoVideoBase
      );

      const ok = await atualizarProjetoBanco(projetoVideo);
      if (!ok) {
        alert("Erro ao salvar no banco.");
        return;
      }

      await recarregarProjetos();
      alert("Alterações salvas com sucesso.");
      return;
    }

    const projetoFinal: Projeto = {
      ...rascunho,
      Lider:
        usuarioLogado.cargo === "lider" ||
        usuarioLogado.cargo === "lider_treinamento"
          ? usuarioLogado.vinculo || usuarioLogado.nome
          : rascunho.Lider,
    };

    const projetoFinalComHistorico = aplicarHistoricoAutomatico(
      selecionado,
      projetoFinal
    );

    const projetoOk = await atualizarProjetoBanco(projetoFinalComHistorico);
    if (!projetoOk) {
      alert("Erro ao salvar o projeto no banco.");
      return;
    }

    const elencoOk = await salvarElencoProjetoBanco(
      projetoFinalComHistorico.ID,
      projetoFinalComHistorico.Elenco.filter(
        (item) => item.personagem.trim() || item.dublador.trim()
      )
    );
    if (!elencoOk) {
      alert("Projeto salvo, mas houve erro ao salvar o elenco.");
      return;
    }

    await recarregarProjetos();
    alert("Alterações salvas com sucesso.");
  }

  async function salvarElencoAtual() {
    if (!rascunho || !selecionado || !usuarioLogado) return;

    if (!podeEditarProjeto(usuarioLogado, selecionado)) {
      alert("Você não tem permissão para alterar o elenco deste projeto.");
      return;
    }

    const elencoFiltrado = (rascunho.Elenco || []).filter(
      (item) => item.personagem.trim() || item.dublador.trim()
    );

    const projetoComElenco: Projeto = {
      ...rascunho,
      Elenco: elencoFiltrado,
    };

    const projetoComHistorico = aplicarHistoricoAutomatico(
      selecionado,
      projetoComElenco,
      "atualizou o elenco"
    );

    const projetoOk = await atualizarProjetoBanco(projetoComHistorico);

    if (!projetoOk) {
      alert("Erro ao salvar o projeto no banco.");
      return;
    }

    const elencoOk = await salvarElencoProjetoBanco(
      projetoComHistorico.ID,
      projetoComHistorico.Elenco
    );

    if (!elencoOk) {
      alert("Projeto salvo, mas houve erro ao salvar o elenco.");
      return;
    }

    setRascunho(projetoComHistorico);
    await recarregarProjetos();
    alert("Elenco salvo com sucesso.");
  }

  async function criarUsuario() {
    if (!usuarioLogado || !podeGerenciarUsuarios(usuarioLogado)) return;

    const permitidos = cargosPermitidosParaCriar(usuarioLogado);
    if (permitidos.indexOf(novoUsuario.cargo) === -1) {
      alert("Você não tem permissão para criar esse tipo de usuário.");
      return;
    }

    if (!novoUsuario.nome.trim() || !novoUsuario.login.trim()) {
      alert("Preencha nome e e-mail/login.");
      return;
    }

    const email = novoUsuario.login.trim().toLowerCase();
    if (usuarios.some((u) => normalizar(u.login) === email)) {
      alert("Já existe um perfil com esse login.");
      return;
    }

    const payload = {
      nome: novoUsuario.nome.trim(),
      login: email,
      cargo: novoUsuario.cargo,
      vinculo: novoUsuario.vinculo.trim(),
      training_status:
        novoUsuario.cargo === "lider_treinamento"
          ? novoUsuario.training_status || "em_andamento"
          : "nao_aplicavel",
      criado_por: usuarioLogado.login,
      ...permissoesDisponiveis.reduce((acc, item) => {
        acc[item.chave] = Boolean(novoUsuario[item.chave]);
        return acc;
      }, {} as Record<ChavePermissao, boolean>),
    };

    const { error } = await supabase.from("usuarios").insert([payload]);

    if (error) {
      console.error("Erro ao criar perfil:", error);
      alert("Erro ao criar perfil na tabela usuarios.");
      return;
    }

    await recarregarUsuarios();
    const cargoInicial = permitidos[0] || "lider";
    setNovoUsuario({
      nome: "",
      login: "",
      senha: "",
      cargo: cargoInicial,
      vinculo: "",
      training_status: statusPadraoPorCargo(cargoInicial),
      ...permissoesPadraoUsuario(cargoInicial),
    });

    alert(
      "Perfil criado com sucesso. Lembre-se: o login real também precisa existir em Authentication > Users."
    );
  }

  async function excluirUsuario(alvo: Usuario) {
    if (!usuarioLogado || !podeExcluirUsuario(usuarioLogado, alvo)) {
      alert("Você não tem permissão para excluir esse usuário.");
      return;
    }

    if (normalizar(alvo.login) === normalizar(usuarioLogado.login)) {
      alert("Você não pode excluir o próprio usuário logado.");
      return;
    }

    const confirmar = confirm(`Excluir o perfil de ${alvo.nome}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao excluir perfil:", error);
      alert("Erro ao excluir perfil.");
      return;
    }

    await recarregarUsuarios();
  }

  async function atualizarTrainingStatus(
    alvo: Usuario,
    status: TrainingStatus
  ) {
    if (!usuarioLogado || !podeGerenciarTreinamentos(usuarioLogado)) return;
    if (
      usuarioLogado.cargo === "adm_treinamento" &&
      alvo.cargo !== "lider_treinamento"
    ) {
      alert("ADM treinamento só pode alterar líderes em treinamento.");
      return;
    }

    const { error } = await supabase
      .from("usuarios")
      .update({ training_status: status })
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao atualizar treinamento:", error);
      alert("Erro ao atualizar status de treinamento.");
      return;
    }

    await recarregarUsuarios();
  }

  async function concluirTreinamento(alvo: Usuario) {
    if (!usuarioLogado || !podeGerenciarTreinamentos(usuarioLogado)) return;

    const { error } = await supabase
      .from("usuarios")
      .update({ cargo: "lider", training_status: "concluido" })
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao concluir treinamento:", error);
      alert("Erro ao concluir treinamento.");
      return;
    }

    await recarregarUsuarios();
    alert("Treinamento concluído e usuário alterado para líder.");
  }

  async function alterarArquivamentoProjeto(arquivado: boolean) {
    if (!usuarioLogado || usuarioLogado.cargo !== "diretoria" || !selecionado)
      return;

    const acao = arquivado ? "arquivar" : "reativar";
    const confirmar = confirm(`Tem certeza que deseja ${acao} este projeto?`);
    if (!confirmar) return;

    const projetoComHistoricoArquivamento: Projeto = aplicarHistoricoAutomatico(
      selecionado,
      { ...selecionado, Arquivado: arquivado },
      arquivado ? "arquivou o projeto" : "reativou o projeto"
    );

    await atualizarProjetoBanco(projetoComHistoricoArquivamento);

    const ok = await atualizarArquivamentoProjetoBanco(
      selecionado.ID,
      arquivado
    );
    if (!ok) {
      alert("Não consegui alterar o status de arquivamento do projeto.");
      return;
    }

    setSelecionadoId(null);
    setRascunho(null);
    await recarregarProjetos();
    alert(arquivado ? "Projeto arquivado." : "Projeto reativado.");
  }

  function adicionarElencoNovoProjeto() {
    if (
      !novoElencoProjeto.personagem.trim() ||
      !novoElencoProjeto.dublador.trim()
    ) {
      alert("Preencha personagem e dublador.");
      return;
    }

    setNovoProjeto((anterior) => ({
      ...anterior,
      Elenco: [
        ...anterior.Elenco,
        { ...novoElencoProjeto, id: gerarIdTemporario() },
      ],
    }));

    setNovoElencoProjeto(elencoVazio);
  }

  function removerElencoNovoProjeto(id: string) {
    setNovoProjeto((anterior) => ({
      ...anterior,
      Elenco: anterior.Elenco.filter((item) => item.id !== id),
    }));
  }

  function removerElencoRascunho(id: string) {
    if (!rascunho) return;
    setRascunho({
      ...rascunho,
      Elenco: rascunho.Elenco.filter((item) => item.id !== id),
    });
  }

  function adicionarElencoRascunho() {
    if (!rascunho) return;

    const novoItem: ElencoItem = {
      id: `novo-${Date.now()}`,
      personagem: "",
      dublador: "",
      funcao: "",
    };

    setRascunho({
      ...rascunho,
      Elenco: [...(rascunho.Elenco || []), novoItem],
    });
  }

  function atualizarElencoRascunho(
    index: number,
    campo: keyof ElencoItem,
    valor: string
  ) {
    if (!rascunho) return;

    const novoElenco = [...(rascunho.Elenco || [])];
    novoElenco[index] = {
      ...novoElenco[index],
      [campo]: valor,
    };

    setRascunho({
      ...rascunho,
      Elenco: novoElenco,
    });
  }

  async function excluirElencoRascunho(item: ElencoItem, index: number) {
    if (!rascunho) return;

    const confirmar = confirm(
      `Remover ${item.personagem || "este personagem"} do elenco?`
    );
    if (!confirmar) return;

    const novoElenco = rascunho.Elenco.filter((_, i) => i !== index);

    setRascunho({
      ...rascunho,
      Elenco: novoElenco,
    });

    const idNumerico = Number(item.id);

    if (item.id && !Number.isNaN(idNumerico)) {
      const { error } = await supabase
        .from("elenco")
        .delete()
        .eq("id", idNumerico);

      if (error) {
        console.error("Erro ao excluir elenco:", error);
        alert(
          "Não consegui excluir no banco. Clique em Atualizar para tentar salvar a alteração."
        );
        return;
      }

      await recarregarProjetos();
    }
  }

  async function atualizarPermissaoUsuario(
    alvo: Usuario,
    chave: ChavePermissao,
    valor: boolean
  ) {
    if (!alvo.id || !podeGerenciarUsuarios(usuarioLogado)) return;

    if (alvo.cargo === "diretoria" && usuarioLogado?.cargo !== "diretoria") {
      alert("Somente diretoria pode alterar permissões de outra diretoria.");
      return;
    }

    const { error } = await supabase
      .from("usuarios")
      .update({ [chave]: valor })
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao atualizar permissão:", error);
      alert("Não consegui atualizar a permissão.");
      return;
    }

    setUsuarios((lista) =>
      lista.map((u) => (u.id === alvo.id ? { ...u, [chave]: valor } : u))
    );
  }

  function abrirTelaTreinamentos() {
    setMostrarTreinamentos(true);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setSelecionadoId(null);
    setRascunho(null);
  }

  function exportarProjetosCSV() {
    const cabecalhos = [
      "ID",
      "Projeto",
      "Tipo",
      "Genero",
      "Prioridade",
      "Dupla",
      "Lider",
      "Telefone_Lider",
      "Editor",
      "Telefone_Editor",
      "Status",
      "Data_Inicio",
      "Video_Editor_Link",
      "Registro_Semanal",
      "Observacoes",
      "Capa_URL",
      "Arquivado",
      "Qtd_Elenco",
    ];

    const linhas = filtrados.map((p) =>
      [
        p.ID,
        p.Projeto,
        p.Tipo,
        p.Genero,
        p.Prioridade,
        p.Dupla,
        p.Lider,
        p.Telefone_Lider,
        p.Editor,
        p.Telefone_Editor,
        p.Status,
        p.Data_Inicio,
        p.Video_Editor_Link,
        p.Registro_Semanal,
        p.Observacoes,
        p.Capa_URL,
        p.Arquivado ? "Sim" : "Não",
        String(p.Elenco.length),
      ]
        .map(escaparCSV)
        .join(";")
    );

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projetos_dubworks_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarElencoCSV() {
    const cabecalhos = [
      "Projeto",
      "ID_Projeto",
      "Personagem",
      "Dublador",
      "Funcao",
      "Qtd_Projetos_Dublador",
      "Qtd_Papeis_Dublador",
    ];

    const linhas: string[] = [];
    filtrados.forEach((projeto) => {
      projeto.Elenco.forEach((item) => {
        const ranking = rankingDubladores.find(
          (r) => normalizar(r.nome) === normalizar(item.dublador)
        );

        linhas.push(
          [
            projeto.Projeto,
            projeto.ID,
            item.personagem,
            item.dublador,
            item.funcao,
            String(ranking?.totalProjetos || 0),
            String(ranking?.totalPapeis || 0),
          ]
            .map(escaparCSV)
            .join(";")
        );
      });
    });

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elenco_dubworks_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function alterarStatusMembro(membro: Membro, status: StatusMembro) {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return;

    const confirmar = confirm(
      `Alterar status de ${membro.nome} para "${statusMembroLabel(status)}"?`
    );
    if (!confirmar) return;

    const ok = await atualizarStatusMembroBanco(
      membro.id,
      status,
      membro.observacao
    );

    if (!ok) {
      alert("Não consegui atualizar o membro.");
      return;
    }

    await recarregarMembros();
  }

  async function atualizarMembroCampo(
    membro: Membro,
    campo: "data_entrada" | "data_saida" | "observacao",
    valor: string
  ) {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return;

    const payload: any = { [campo]: valor || null };
    const { error } = await supabase
      .from("membros")
      .update(payload)
      .eq("id", membro.id);

    if (error) {
      console.error("Erro ao atualizar membro:", error);
      alert("Não consegui atualizar o membro.");
      return;
    }

    setMembros((lista) =>
      lista.map((item) =>
        item.id === membro.id ? { ...item, [campo]: valor || null } : item
      )
    );
  }

  function exportarMembrosCSV() {
    const cabecalhos = [
      "Nome",
      "Telefone",
      "Email",
      "Idade",
      "Data_Entrada",
      "Status",
      "Data_Saida",
      "Habilidades",
      "Observacao",
    ];

    const linhas = membrosFiltrados.map((m) =>
      [
        m.nome,
        m.telefone,
        m.email,
        String(m.idade || ""),
        formatarDataBR(m.data_entrada),
        statusMembroLabel(m.status),
        formatarDataBR(m.data_saida),
        m.habilidades || "",
        m.observacao || "",
      ]
        .map(escaparCSV)
        .join(";")
    );

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `membros_dubworks_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarRelatorioEntradaSaidaCSV() {
    const cabecalhos = [
      "Mês",
      "Total inicial",
      "Entradas",
      "Saídas",
      "Crescimento",
      "Total final",
    ];

    const linhas = relatorioEntradaSaida.map((r) =>
      [
        r.mesLabel,
        String(r.totalInicial),
        String(r.entradas),
        String(r.saidas),
        String(r.crescimento),
        String(r.totalFinal),
      ]
        .map(escaparCSV)
        .join(";")
    );

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_entrada_saida_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!usuarioLogado) {
    return (
      <div
        style={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 18% 68%, rgba(37, 99, 235, 0.45), transparent 22%), radial-gradient(circle at 75% 28%, rgba(14, 165, 233, 0.36), transparent 24%), linear-gradient(135deg, #020617 0%, #111827 48%, #07152f 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? 18 : 24,
          fontFamily: "Arial, sans-serif",
          color: "#f8fafc",
        }}
      >
        <style>{estilosAnimacao}</style>

        <div
          style={{
            position: "absolute",
            width: isMobile ? 170 : 260,
            height: isMobile ? 170 : 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 68% 26%, #7dd3fc 0%, #1d4ed8 34%, #020617 82%)",
            top: isMobile ? 18 : 38,
            left: isMobile ? "54%" : "50%",
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 0 46px rgba(59, 130, 246, 0.55))",
            animation: "dwFloat 7s ease-in-out infinite",
            opacity: 0.98,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: isMobile ? 150 : 230,
            height: isMobile ? 150 : 230,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 70% 28%, #38bdf8 0%, #2563eb 38%, #050816 84%)",
            right: isMobile ? -70 : "12%",
            top: isMobile ? 170 : "29%",
            filter: "drop-shadow(0 0 42px rgba(59, 130, 246, 0.45))",
            animation: "dwFloat 8s ease-in-out infinite reverse",
            opacity: 0.82,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: isMobile ? 170 : 260,
            height: isMobile ? 170 : 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 70% 28%, #60a5fa 0%, #1d4ed8 36%, #020617 86%)",
            left: isMobile ? -92 : "12%",
            bottom: isMobile ? 74 : "14%",
            filter: "drop-shadow(0 0 42px rgba(37, 99, 235, 0.45))",
            animation: "dwFloat 9s ease-in-out infinite",
            opacity: 0.78,
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: isMobile ? "100%" : 620,
            padding: isMobile ? "82px 20px 24px" : "92px 58px 42px",
            borderRadius: isMobile ? 30 : 34,
            border: "1px solid rgba(191, 219, 254, 0.42)",
            background:
              "linear-gradient(145deg, rgba(15, 23, 42, 0.72), rgba(30, 41, 59, 0.52))",
            backdropFilter: "blur(18px)",
            boxShadow:
              "0 34px 110px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 70px rgba(37, 99, 235, 0.18)",
            overflow: "hidden",
            animation: "dwFadeUp .65s ease both",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.10), transparent)",
              animation: "dwScan 5.6s linear infinite",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <img
              src={LOGO_URL}
              alt="DubWorks"
              style={{
                width: isMobile ? 122 : 152,
                height: "auto",
                display: "block",
                margin: "0 auto 20px",
                filter: "drop-shadow(0 0 18px rgba(96, 165, 250, 0.32))",
              }}
            />

            <div
              style={{
                textAlign: "center",
                letterSpacing: 3,
                fontSize: isMobile ? 15 : 17,
                color: "#93c5fd",
                fontWeight: 800,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Acesso interno
            </div>

            <h1
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: isMobile ? 30 : 40,
                lineHeight: 1.05,
                color: "#f8fafc",
                textShadow: "0 0 28px rgba(59, 130, 246, 0.30)",
              }}
            >
              DubWorks Manager
            </h1>

            <p
              style={{
                textAlign: "center",
                marginTop: 10,
                marginBottom: isMobile ? 22 : 30,
                color: "#cbd5e1",
                fontSize: isMobile ? 14 : 15,
              }}
            >
              Central tecnológica de gerenciamento da DubWorks
            </p>

            <form onSubmit={fazerLogin}>
              <label style={{ ...labelStyle, color: "#cbd5e1" }}>E-mail</label>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu e-mail"
                style={{
                  ...inputStyle,
                  marginBottom: 16,
                  background: "rgba(15, 23, 42, 0.72)",
                  border: "1px solid rgba(147, 197, 253, 0.32)",
                  color: "#f8fafc",
                  boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.05)",
                }}
              />

              <label style={{ ...labelStyle, color: "#cbd5e1" }}>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                style={{
                  ...inputStyle,
                  marginBottom: 16,
                  background: "rgba(15, 23, 42, 0.72)",
                  border: "1px solid rgba(147, 197, 253, 0.32)",
                  color: "#f8fafc",
                  boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.05)",
                }}
              />

              {erroLogin && (
                <div
                  style={{
                    background: "rgba(127, 29, 29, 0.35)",
                    color: "#fecaca",
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    padding: 12,
                    borderRadius: 14,
                    marginBottom: 16,
                  }}
                >
                  {erroLogin}
                </div>
              )}

              <button
                type="submit"
                disabled={carregandoLogin}
                style={{
                  ...botaoPrimarioStyleGrande,
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
                  boxShadow:
                    "0 18px 40px rgba(37, 99, 235, 0.38), 0 0 24px rgba(14, 165, 233, 0.22)",
                  letterSpacing: 0.4,
                }}
              >
                {carregandoLogin ? "Entrando..." : "Entrar no sistema"}
              </button>

              <button
                type="button"
                onClick={enviarRecuperacaoSenha}
                style={{
                  marginTop: 14,
                  background: "transparent",
                  border: "none",
                  color: "#93c5fd",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                  padding: 10,
                }}
              >
                Esqueci minha senha
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const telaAtual = mostrarTreinamentos
    ? "treinamentos"
    : mostrarMembros
    ? "membros"
    : mostrarUsuarios
    ? "usuarios"
    : mostrarRelatorios
    ? "relatorios"
    : "projetos";

  const projetoPainel = selecionado || null;

  const projetoDrive = rascunho || projetoPainel;
  const driveSalvo = extrairLinksDrive(projetoDrive?.Observacoes);

  const driveLinks: {
    chave: "pasta" | "selecao" | "projeto" | "finalizados";
    titulo: string;
    descricao: string;
    icone: string;
    cor: string;
    link: string;
  }[] = [
    {
      chave: "pasta",
      titulo: "Pasta Principal",
      descricao: "Pasta principal do projeto com toda a estrutura oficial.",
      icone: "📁",
      cor: "#2563eb",
      link: driveSalvo.pasta || "",
    },
    {
      chave: "selecao",
      titulo: "1 | Seleção",
      descricao:
        "Falas teste, formulário de seleção, testes enviados e resultado.",
      icone: "🎙️",
      cor: "#7c3aed",
      link: driveSalvo.selecao || driveSalvo.videos || "",
    },
    {
      chave: "projeto",
      titulo: "2 | Projeto",
      descricao:
        "Cortes, cenas, áudios recebidos, edição e materiais em andamento.",
      icone: "🧩",
      cor: "#16a34a",
      link: driveSalvo.projeto || driveSalvo.cortes || "",
    },
    {
      chave: "finalizados",
      titulo: "3 | Finalizado",
      descricao:
        "Vídeo final, créditos, thumbs, capas, renders e arquivos concluídos.",
      icone: "🎬",
      cor: "#f97316",
      link: driveSalvo.finalizados || "",
    },
  ];

  const historicoProjetoDemo = [
    {
      usuario: "Sistema",
      acao: "alterou o link da pasta principal",
      data: "Hoje, 14:20",
    },
    {
      usuario: "Sistema",
      acao: "incluiu um novo teste de vídeo",
      data: "Hoje, 13:05",
    },
    {
      usuario: usuarioLogado?.nome || "Sistema",
      acao: "atualizou as informações do projeto",
      data: "Ontem, 18:42",
    },
  ];

  // TODO SUPABASE:
  // Estas notificações deverão ser geradas automaticamente
  // com base nas ações reais dos usuários.
  // Exemplo:
  // criar projeto, alterar link, enviar relatório, adicionar elenco etc.

  const notificacoesProjeto = projetoPainel
    ? [
        {
          usuario: usuarioLogado?.nome || "Sistema",
          acao: `acessou/atualizou o projeto ${projetoPainel.Projeto}`,
          data: new Date().toLocaleString("pt-BR"),
          tipo: "Projeto",
          projetoId: projetoPainel.ID,
          lider: projetoPainel.Lider,
          editor: projetoPainel.Editor,
        },
      ].filter((notificacao) => {
        if (!usuarioLogado || !projetoPainel) return false;

        if (
          usuarioLogado.cargo === "diretoria" ||
          usuarioLogado.cargo === "adm"
        ) {
          return notificacao.projetoId === projetoPainel.ID;
        }

        const vinculo = normalizar(
          usuarioLogado.vinculo || usuarioLogado.nome || usuarioLogado.login
        );

        if (
          usuarioLogado.cargo === "lider" ||
          usuarioLogado.cargo === "lider_treinamento"
        ) {
          return (
            notificacao.projetoId === projetoPainel.ID &&
            normalizar(notificacao.lider) === vinculo
          );
        }

        if (usuarioLogado.cargo === "editor") {
          return (
            notificacao.projetoId === projetoPainel.ID &&
            normalizar(notificacao.editor) === vinculo
          );
        }

        return false;
      })
    : [];

  function abrirLink(link?: string) {
    if (!link) {
      alert("Link ainda não cadastrado.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  const membroSelecionado =
    membros.find((m) => m.id === membroSelecionadoId) || null;

  function cargoMembro(membro: Membro | null) {
    if (!membro) return "Membro";
    const alvo = normalizar(membro.email || membro.nome);
    const perfil = usuarios.find(
      (u) =>
        normalizar(u.login) === alvo ||
        normalizar(u.nome) === normalizar(membro.nome)
    );
    return perfil ? cargoLabel(perfil.cargo) : "Membro";
  }

  async function salvarRegistroSemanalProjeto() {
    if (!projetoPainel || !registroSemanalTexto.trim()) {
      alert("Selecione um projeto e escreva o registro semanal.");
      return;
    }

    const agora = new Date();
    const carimbo = agora.toLocaleString("pt-BR");
    const autor = usuarioLogado?.nome || "Usuário";
    const novoRegistro = `[${carimbo}] ${autor}: ${registroSemanalTexto.trim()}`;
    const registroAnterior = projetoPainel.Registro_Semanal || "";
    const projetoAtualizado: Projeto = {
      ...projetoPainel,
      Registro_Semanal: [novoRegistro, registroAnterior]
        .filter(Boolean)
        .join("\n\n"),
    };

    const ok = await atualizarProjetoBanco(projetoAtualizado);
    if (!ok) {
      alert("Não consegui salvar o registro semanal.");
      return;
    }

    setRegistroSemanalTexto("");
    await recarregarProjetos();
    alert("Registro semanal salvo com data e hora.");
  }

  const SidebarItem = ({
    id,
    label,
    icon,
    onClick,
  }: {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
  }) => {
    const ativo = telaAtual === id;
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          border: "none",
          borderRadius: 14,
          padding: "14px 16px",
          cursor: "pointer",
          color: ativo ? "#38bdf8" : "#cbd5e1",
          background: ativo
            ? "linear-gradient(90deg, rgba(37,99,235,0.24), rgba(14,165,233,0.08))"
            : "transparent",
          textAlign: "left",
          fontWeight: ativo ? 800 : 700,
          fontSize: 15,
        }}
      >
        <span style={{ fontSize: 19, width: 22, textAlign: "center" }}>
          {icon}
        </span>
        {label}
      </button>
    );
  };

  const MiniStat = ({
    icon,
    value,
    label,
    color,
  }: {
    icon: string;
    value: string;
    label: string;
    color: string;
  }) => (
    <div
      style={{
        background: "rgba(2,6,23,0.55)",
        border: "1px solid rgba(148,163,184,0.16)",
        borderRadius: 14,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: `${color}22`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc" }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
      </div>
    </div>
  );

  const ProjectList = () => (
    <div
      style={{
        ...painelDarkStyle,
        minHeight: 240,
        overflow: "hidden",
      }}
    >
      <div style={painelHeaderStyle}>
        <h2 style={tituloCardDarkStyle}>Projetos ativos</h2>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>
          {filtrados.length} projeto(s)
        </span>
      </div>

      {isMobile ? (
        <div className="dw-mobile-project-list">
          {filtrados.slice(0, 35).map((p) => {
            const statusCor = corStatus(p.Status);
            const ativo = p.ID === projetoPainel?.ID;

            return (
              <button
                key={p.ID}
                type="button"
                className={
                  ativo
                    ? "dw-mobile-project-card active"
                    : "dw-mobile-project-card"
                }
                onClick={() => setSelecionadoId(p.ID)}
              >
                <div className="dw-mobile-project-cover">
                  {p.Capa_URL ? (
                    <img src={p.Capa_URL} alt={p.Projeto} />
                  ) : (
                    <span>📁</span>
                  )}
                </div>

                <div className="dw-mobile-project-content">
                  <div className="dw-mobile-project-title">
                    <strong>{p.Projeto || "Projeto sem nome"}</strong>
                    <span>#{p.ID}</span>
                  </div>

                  <div className="dw-mobile-project-badges">
                    <span className="dw-chip dw-chip-blue">
                      {p.Tipo || "-"}
                    </span>
                    <span className="dw-chip dw-chip-red">
                      {p.Prioridade || "-"}
                    </span>
                    <span
                      className="dw-chip"
                      style={{
                        background: statusCor.bg,
                        color: statusCor.color,
                      }}
                    >
                      {p.Status || "Sem status"}
                    </span>
                  </div>

                  <div className="dw-mobile-project-meta">
                    <span>
                      <b>Gênero:</b> {p.Genero || "-"}
                    </span>
                    <span>
                      <b>Líder:</b> {p.Lider || "-"}
                    </span>
                    <span>
                      <b>Editor:</b> {p.Editor || "-"}
                    </span>
                    <span>
                      <b>Elenco:</b> {p.Elenco.length} registro(s)
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}
          >
            <thead>
              <tr>
                {[
                  "ID",
                  "Projeto",
                  "Tipo",
                  "Gênero",
                  "Prioridade",
                  "Status",
                  "Líder",
                  "Editor",
                ].map((h) => (
                  <th key={h} style={tabelaHeaderDarkStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 35).map((p) => {
                const statusCor = corStatus(p.Status);
                const ativo = p.ID === projetoPainel?.ID;
                return (
                  <tr
                    key={p.ID}
                    onClick={() => setSelecionadoId(p.ID)}
                    style={{
                      cursor: "pointer",
                      background: ativo
                        ? "rgba(37,99,235,0.18)"
                        : "transparent",
                      borderBottom: "1px solid rgba(148,163,184,0.10)",
                    }}
                  >
                    <td style={tabelaCellDarkStyle}>{p.ID}</td>
                    <td
                      style={{
                        ...tabelaCellDarkStyle,
                        fontWeight: 800,
                        color: "#f8fafc",
                      }}
                    >
                      {p.Projeto}
                      <div
                        style={{
                          color: "#94a3b8",
                          fontWeight: 500,
                          fontSize: 12,
                        }}
                      >
                        {p.Elenco.length} registro(s) de elenco
                      </div>
                    </td>
                    <td style={tabelaCellDarkStyle}>{p.Tipo || "-"}</td>
                    <td style={tabelaCellDarkStyle}>{p.Genero || "-"}</td>
                    <td style={tabelaCellDarkStyle}>{p.Prioridade || "-"}</td>
                    <td style={tabelaCellDarkStyle}>
                      <span
                        style={{
                          background: statusCor.bg,
                          color: statusCor.color,
                          border: "1px solid rgba(148,163,184,0.12)",
                          padding: "6px 10px",
                          borderRadius: 10,
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {p.Status || "Sem status"}
                      </span>
                    </td>
                    <td style={tabelaCellDarkStyle}>{p.Lider || "-"}</td>
                    <td style={tabelaCellDarkStyle}>{p.Editor || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const ProjectDetails = () => {
    if (!projetoPainel) {
      return (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Nenhum projeto selecionado</h2>
          <p style={{ color: "#94a3b8" }}>
            Selecione um projeto na lista ou crie um novo projeto.
          </p>
        </div>
      );
    }

    const statusCor = corStatus(projetoPainel.Status);
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            background: projetoPainel.Capa_URL
              ? `linear-gradient(rgba(2,6,23,0.25), rgba(2,6,23,0.72)), url(${projetoPainel.Capa_URL}) center/cover`
              : "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.68))",
            border: "1px solid rgba(56,189,248,0.24)",
            borderRadius: 22,
            padding: 38,
            minHeight: 170,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            boxShadow: "0 22px 60px rgba(37,99,235,0.22)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: 26,
              textShadow: "0 2px 18px rgba(0,0,0,0.48)",
            }}
          >
            {projetoPainel.Projeto}
          </h2>
        </div>

        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1 style={{ margin: 0, color: "#dbeafe", fontSize: 26 }}>
                {projetoPainel.Projeto}
              </h1>
              <div style={{ color: "#94a3b8", marginTop: 6 }}>
                ID: {projetoPainel.ID}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setSelecionadoId(null);
                  setRascunho(null);
                  setAbaProjeto("informacoes");
                }}
                style={botaoSecundarioStyle}
              >
                Fechar projeto
              </button>
              {!rascunho || rascunho.ID !== projetoPainel.ID ? (
                <>
                  <button
                    onClick={() => setSelecionadoId(projetoPainel.ID)}
                    style={botaoSecundarioStyle}
                  >
                    Editar informações
                  </button>
                  {isMobile && (
                    <button
                      onClick={() => setSelecionadoId(projetoPainel.ID)}
                      style={botaoPrimarioStyle}
                    >
                      Alterar capa
                    </button>
                  )}
                </>
              ) : (
                <button onClick={salvarAlteracoes} style={botaoPrimarioStyle}>
                  Salvar alterações
                </button>
              )}
            </div>
          </div>

          {rascunho && rascunho.ID === projetoPainel.ID ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginTop: 22,
              }}
            >
              {[
                ["Projeto", "Projeto"],
                ["Tipo", "Tipo"],
                ["Gênero", "Genero"],
                ["Prioridade", "Prioridade"],
                ["Status", "Status"],
                ["Líder", "Lider"],
                ["Editor", "Editor"],
                ["Data de início", "Data_Inicio"],
                ["Capa do projeto (URL)", "Capa_URL"],
              ].map(([label, campo]) =>
                campo === "Capa_URL" ? (
                  <div key={campo}>
                    <label style={labelStyle}>{label}</label>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        background: "rgba(2, 6, 23, 0.42)",
                        border: "1px solid rgba(56, 189, 248, 0.16)",
                        borderRadius: 16,
                        padding: isMobile ? 12 : 14,
                        overflow: "visible",
                      }}
                    >
                      {String((rascunho as any)[campo] || "").trim() ? (
                        <div
                          style={{
                            height: isMobile ? 150 : 180,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: "1px solid rgba(148, 163, 184, 0.16)",
                            background: `linear-gradient(rgba(2,6,23,0.18), rgba(2,6,23,0.58)), url(${String(
                              (rascunho as any)[campo] || ""
                            )}) center/cover`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: isMobile ? 120 : 150,
                            borderRadius: 14,
                            border: "1px dashed rgba(148, 163, 184, 0.28)",
                            background: "rgba(15, 23, 42, 0.55)",
                            color: "#94a3b8",
                            display: "grid",
                            placeItems: "center",
                            textAlign: "center",
                            padding: 16,
                          }}
                        >
                          Cole o link da imagem da capa aqui embaixo.
                        </div>
                      )}

                      <input
                        value={String((rascunho as any)[campo] || "")}
                        onChange={(e) =>
                          atualizarCampo(campo as keyof Projeto, e.target.value)
                        }
                        placeholder="Cole aqui o link da imagem da capa"
                        inputMode="url"
                        autoComplete="off"
                        style={{
                          ...inputStyle,
                          minHeight: isMobile ? 48 : inputStyle.minHeight,
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          style={botaoSecundarioStyle}
                          onClick={async () => {
                            try {
                              const texto =
                                await navigator.clipboard.readText();
                              if (!texto.trim()) {
                                alert("Não encontrei nenhum link copiado.");
                                return;
                              }
                              atualizarCampo("Capa_URL", texto.trim());
                            } catch (erro) {
                              alert(
                                "Não consegui acessar a área de transferência. Cole o link manualmente no campo."
                              );
                            }
                          }}
                        >
                          Colar link da capa
                        </button>

                        <button
                          type="button"
                          style={botaoSecundarioStyle}
                          onClick={() => atualizarCampo("Capa_URL", "")}
                        >
                          Remover capa
                        </button>
                      </div>

                      <div style={{ color: "#94a3b8", fontSize: 12 }}>
                        No celular, copie o link da imagem e toque em “Colar
                        link da capa”. Depois clique em “Salvar alterações”.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={campo}>
                    <label style={labelStyle}>{label}</label>
                    <input
                      value={String((rascunho as any)[campo] || "")}
                      onChange={(e) =>
                        atualizarCampo(campo as keyof Projeto, e.target.value)
                      }
                      style={inputStyle}
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginTop: 22,
              }}
            >
              {[
                ["Tipo", projetoPainel.Tipo],
                ["Gênero", projetoPainel.Genero],
                ["Prioridade", projetoPainel.Prioridade],
                ["Líder", projetoPainel.Lider],
                ["Editor", projetoPainel.Editor],
                ["Data de início", formatarDataBR(projetoPainel.Data_Inicio)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>{label}</div>
                  <div
                    style={{ color: "#f8fafc", fontWeight: 800, marginTop: 4 }}
                  >
                    {value || "-"}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Status</div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    background: statusCor.bg,
                    color: statusCor.color,
                    border: "1px solid rgba(148,163,184,0.12)",
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontWeight: 900,
                  }}
                >
                  {projetoPainel.Status || "Sem status"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const DrivePanel = () => (
    <div style={painelDarkStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            style={{
              ...tituloCardDarkStyle,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>📁</span> Arquivos do Drive
          </h2>
          <p style={{ color: "#94a3b8", margin: "8px 0 0" }}>
            Crie a estrutura oficial no Google Drive ou cole os links
            manualmente. Estrutura: 1 | Seleção, 2 | Projeto e 3 | Finalizado.
          </p>
        </div>

        {projetoPainel && podeEditarProjeto(usuarioLogado, projetoPainel) && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={criarEstruturaDriveProjeto}
              disabled={criandoEstruturaDrive}
              style={{
                ...botaoPrimarioStyle,
                opacity: criandoEstruturaDrive ? 0.7 : 1,
                cursor: criandoEstruturaDrive ? "not-allowed" : "pointer",
              }}
            >
              {criandoEstruturaDrive
                ? "Criando estrutura..."
                : "Criar estrutura no Drive"}
            </button>

            <button
              onClick={salvarLinksDriveComHistorico}
              style={botaoSecundarioStyle}
            >
              Salvar links
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(56,189,248,.25)",
          background: "rgba(14,165,233,.08)",
          color: "#cbd5e1",
          marginBottom: 16,
        }}
      >
        <strong style={{ color: "#f8fafc" }}>
          Integração Google Drive — Beta
        </strong>
        <br />O botão cria a pasta principal do projeto e as subpastas oficiais:
        <strong> 1 | Seleção</strong>, <strong>2 | Projeto</strong> e{" "}
        <strong>3 | Finalizado</strong>. Se a função do Supabase ainda não
        estiver configurada, o app apenas avisará sem quebrar o sistema.
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {driveLinks.map((item) => (
          <div
            key={item.titulo}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "48px 1fr" : "56px 1fr auto",
              gap: 14,
              alignItems: "center",
              padding: "14px 0",
              borderTop: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: `${item.cor}22`,
                color: item.cor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {item.icone}
            </div>

            <div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                {item.titulo}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                {item.descricao}
              </div>

              <input
                placeholder="Cole o link desta pasta aqui"
                value={item.link || ""}
                onChange={(e) => {
                  if (!rascunho) return;

                  const linksAtuais = extrairLinksDrive(rascunho.Observacoes);
                  const novosLinks = {
                    ...linksAtuais,
                    [item.chave]: e.target.value,
                  };

                  setRascunho({
                    ...rascunho,
                    Observacoes: salvarLinksDriveEmObservacoes(
                      rascunho.Observacoes,
                      novosLinks
                    ),
                  });
                }}
                disabled={
                  !projetoPainel ||
                  !podeEditarProjeto(usuarioLogado, projetoPainel)
                }
                style={{
                  ...inputStyle,
                  marginTop: 10,
                  color: "#38bdf8",
                  border: "1px solid rgba(37,99,235,0.45)",
                }}
              />

              {!podeEditarProjeto(usuarioLogado, projetoPainel) && (
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                  Você pode visualizar este link, mas não tem permissão para
                  editar.
                </div>
              )}

              {isMobile && (
                <button
                  onClick={() => abrirLink(item.link || "")}
                  style={{ ...botaoSecundarioStyle, marginTop: 10 }}
                >
                  Abrir ↗
                </button>
              )}
            </div>

            {!isMobile && (
              <button
                onClick={() => abrirLink(item.link || "")}
                style={botaoSecundarioStyle}
              >
                Abrir ↗
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const MembersPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={pageHeaderDarkStyle}>
        <div>
          <div style={breadcrumbDarkStyle}>Membros</div>
          <h1 style={pageTitleDarkStyle}>Central de Membros</h1>
        </div>
        <button
          onClick={async () => {
            await recarregarMembros();
            alert("Membros atualizados.");
          }}
          style={botaoPrimarioStyle}
        >
          Atualizar membros
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <MiniStat
          icon="👥"
          value={String(membros.length)}
          label="Total de membros"
          color="#38bdf8"
        />
        <MiniStat
          icon="✅"
          value={String(totalMembrosAtivos)}
          label="Na comunidade"
          color="#22c55e"
        />
        <MiniStat
          icon="↪"
          value={String(totalMembrosSaida)}
          label="Saíram"
          color="#f97316"
        />
        <MiniStat
          icon="📈"
          value={String(
            relatorioEntradaSaida[relatorioEntradaSaida.length - 1]
              ?.totalFinal || 0
          )}
          label="Crescimento"
          color="#a78bfa"
        />
      </div>

      {membroSelecionado && (
        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={tituloCardDarkStyle}>{membroSelecionado.nome}</h2>
              <p style={{ color: "#94a3b8", marginTop: 6 }}>
                Pré-visualização do membro selecionado
              </p>
            </div>
            <button
              onClick={() => setMembroSelecionadoId(null)}
              style={botaoSecundarioStyle}
            >
              Fechar membro
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 14,
              marginTop: 18,
            }}
          >
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Perfil/Cargo</div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                {cargoMembro(membroSelecionado)}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Telefone</div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                {membroSelecionado.telefone || "-"}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>E-mail</div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                {membroSelecionado.email || "-"}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Idade</div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                {membroSelecionado.idade || "-"}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Entrada</div>
              <input
                type="date"
                value={membroSelecionado.data_entrada || ""}
                onChange={(e) =>
                  atualizarMembroCampo(
                    membroSelecionado,
                    "data_entrada",
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Status</div>
              <select
                value={membroSelecionado.status}
                onChange={(e) =>
                  alterarStatusMembro(
                    membroSelecionado,
                    e.target.value as StatusMembro
                  )
                }
                style={inputStyle}
              >
                <option value="na_comunidade">Na comunidade</option>
                <option value="saiu">Saiu</option>
                <option value="banido">Banido</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Saída</div>
              <input
                type="date"
                value={membroSelecionado.data_saida || ""}
                onChange={(e) =>
                  atualizarMembroCampo(
                    membroSelecionado,
                    "data_saida",
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Habilidades</div>
            <div style={{ color: "#cbd5e1", marginTop: 6 }}>
              {membroSelecionado.habilidades || "Não informado."}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Observações</div>
            <textarea
              value={membroSelecionado.observacao || ""}
              onChange={(e) =>
                setMembros((lista) =>
                  lista.map((item) =>
                    item.id === membroSelecionado.id
                      ? { ...item, observacao: e.target.value }
                      : item
                  )
                )
              }
              onBlur={(e) =>
                atualizarMembroCampo(
                  membroSelecionado,
                  "observacao",
                  e.target.value
                )
              }
              style={{ ...textareaStyle, minHeight: 90, marginTop: 6 }}
            />
          </div>
        </div>
      )}

      <div style={painelDarkStyle}>
        <input
          placeholder="Buscar por nome, telefone, e-mail, status ou observação..."
          value={queryMembros}
          onChange={(e) => setQueryMembros(e.target.value)}
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
          >
            <thead>
              <tr>
                {[
                  "Nome",
                  "Telefone",
                  "E-mail",
                  "Idade",
                  "Entrada",
                  "Status",
                  "Saída",
                ].map((h) => (
                  <th key={h} style={tabelaHeaderDarkStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membrosFiltrados.slice(0, 80).map((m) => {
                const cor = corStatusMembro(m.status);
                return (
                  <tr
                    key={m.id || m.nome}
                    onClick={() => setMembroSelecionadoId(m.id || null)}
                    style={{
                      borderBottom: "1px solid rgba(148,163,184,0.10)",
                      cursor: "pointer",
                      background:
                        membroSelecionadoId === m.id
                          ? "rgba(37,99,235,0.18)"
                          : "transparent",
                    }}
                  >
                    <td style={{ ...tabelaCellDarkStyle, fontWeight: 800 }}>
                      {m.nome}
                    </td>
                    <td style={tabelaCellDarkStyle}>{m.telefone || "-"}</td>
                    <td style={tabelaCellDarkStyle}>{m.email || "-"}</td>
                    <td style={tabelaCellDarkStyle}>{m.idade || "-"}</td>
                    <td style={tabelaCellDarkStyle}>
                      {formatarDataBR(m.data_entrada) || "-"}
                    </td>
                    <td style={tabelaCellDarkStyle}>
                      <span
                        style={{
                          background: cor.bg,
                          color: cor.color,
                          padding: "7px 10px",
                          borderRadius: 10,
                          fontWeight: 900,
                        }}
                      >
                        {statusMembroLabel(m.status)}
                      </span>
                    </td>
                    <td style={tabelaCellDarkStyle}>
                      {formatarDataBR(m.data_saida) || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {membrosFiltrados.length > 80 && (
            <div style={{ color: "#94a3b8", marginTop: 12, fontSize: 13 }}>
              Mostrando 80 de {membrosFiltrados.length}. Use a busca para
              filtrar.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const UsersPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          ...painelDarkStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
        }}
      >
        <div>
          <h2 style={tituloCardDarkStyle}>Controle de Usuários e Permissões</h2>
          <p style={{ color: "#94a3b8", marginTop: 6 }}>
            Gerencie cargos, permissões e acessos internos do sistema.
          </p>
        </div>

        <button
          onClick={() => setMostrarFormNovoUsuario((valor) => !valor)}
          style={botaoPrimarioStyle}
        >
          + Novo usuário
        </button>
      </div>

      {mostrarFormNovoUsuario && (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Novo usuário</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap: 14,
              marginTop: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                value={novoUsuario.nome}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>E-mail/Login</label>
              <input
                value={novoUsuario.login}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, login: e.target.value })
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cargo</label>
              <select
                value={novoUsuario.cargo}
                onChange={(e) => {
                  const cargo = e.target.value as Cargo;
                  setNovoUsuario({
                    ...novoUsuario,
                    cargo,
                    training_status: statusPadraoPorCargo(cargo),
                    ...permissoesPadraoUsuario(cargo),
                  });
                }}
                style={inputStyle}
              >
                {cargosPermitidosParaCriar(usuarioLogado).map((cargo) => (
                  <option key={cargo} value={cargo}>
                    {cargoLabel(cargo)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Vínculo</label>
              <input
                value={novoUsuario.vinculo}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, vinculo: e.target.value })
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 10,
              marginTop: 16,
            }}
          >
            {permissoesDisponiveis.map((item) => (
              <label
                key={item.chave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#cbd5e1",
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(novoUsuario[item.chave])}
                  onChange={(e) =>
                    setNovoUsuario({
                      ...novoUsuario,
                      [item.chave]: e.target.checked,
                    })
                  }
                />
                {item.label}
              </label>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <button onClick={criarUsuario} style={botaoPrimarioStyle}>
              Salvar usuário
            </button>
            <button
              onClick={() => setMostrarFormNovoUsuario(false)}
              style={botaoSecundarioStyle}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          ...painelDarkStyle,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Usuário",
                "Cargo",
                "Projetos",
                "Membros",
                "Usuários",
                "Relatórios",
              ].map((titulo) => (
                <th
                  key={titulo}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    color: "#94a3b8",
                    fontSize: 13,
                    borderBottom: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id || usuario.login}>
                <td
                  style={{
                    padding: 14,
                    borderBottom: "1px solid rgba(148,163,184,0.08)",
                  }}
                >
                  <div style={{ color: "#f8fafc", fontWeight: 700 }}>
                    {usuario.nome}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    @{usuario.login}
                  </div>
                </td>

                <td style={{ padding: 14, color: "#cbd5e1" }}>
                  {usuario.cargo}
                </td>

                {(
                  [
                    "acesso_projetos",
                    "acesso_membros",
                    "acesso_usuarios",
                    "acesso_relatorios_projetos",
                  ] as ChavePermissao[]
                ).map((chave) => {
                  const permitido = temAcesso(usuario, chave);
                  return (
                    <td
                      key={chave}
                      style={{
                        padding: 14,
                        color: permitido ? "#22c55e" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={permitido}
                          disabled={!podeGerenciarUsuarios(usuarioLogado)}
                          onChange={(e) =>
                            atualizarPermissaoUsuario(
                              usuario,
                              chave,
                              e.target.checked
                            )
                          }
                        />
                        {permitido ? "Permitido" : "Bloqueado"}
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={pageHeaderDarkStyle}>
        <div>
          <div style={breadcrumbDarkStyle}>Usuários</div>
          <h1 style={pageTitleDarkStyle}>Acessos e Permissões</h1>
        </div>
        <button onClick={recarregarUsuarios} style={botaoPrimarioStyle}>
          Atualizar
        </button>
      </div>

      <div style={painelDarkStyle}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}
          >
            <thead>
              <tr>
                {["Nome", "Login", "Cargo", "Vínculo", "Treinamento"].map(
                  (h) => (
                    <th key={h} style={tabelaHeaderDarkStyle}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {usuariosVisiveis.map((u) => (
                <tr
                  key={u.id || u.login}
                  style={{ borderBottom: "1px solid rgba(148,163,184,0.10)" }}
                >
                  <td style={{ ...tabelaCellDarkStyle, fontWeight: 800 }}>
                    {u.nome}
                  </td>
                  <td style={tabelaCellDarkStyle}>{u.login}</td>
                  <td style={tabelaCellDarkStyle}>{cargoLabel(u.cargo)}</td>
                  <td style={tabelaCellDarkStyle}>{u.vinculo || "-"}</td>
                  <td style={tabelaCellDarkStyle}>
                    {statusTreinamentoLabel(u.training_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ReportsPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={pageHeaderDarkStyle}>
        <div>
          <div style={breadcrumbDarkStyle}>Relatórios</div>
          <h1 style={pageTitleDarkStyle}>Exportações e Indicadores</h1>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <button onClick={exportarProjetosCSV} style={reportCardDarkStyle}>
          📌 Exportar Projetos
        </button>
        <button onClick={exportarElencoCSV} style={reportCardDarkStyle}>
          🎙️ Exportar Elenco
        </button>
        {podeGerenciarMembros(usuarioLogado) && (
          <button onClick={exportarMembrosCSV} style={reportCardDarkStyle}>
            👥 Exportar Membros
          </button>
        )}
        {podeGerenciarMembros(usuarioLogado) && (
          <button
            onClick={exportarRelatorioEntradaSaidaCSV}
            style={reportCardDarkStyle}
          >
            📊 Entrada e Saída
          </button>
        )}
      </div>
    </div>
  );

  const cardDarkStyle: React.CSSProperties = {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,.22)",
    background: "rgba(15,23,42,.72)",
    boxShadow: "0 18px 45px rgba(0,0,0,.18)",
  };

  const TrainingPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={pageHeaderDarkStyle}>
        <div>
          <div style={breadcrumbDarkStyle}>
            Treinamentos › Formação de Líderes
          </div>
          <h1 style={pageTitleDarkStyle}>Treinamento de Líderes</h1>
          <p style={{ color: "#94a3b8", margin: 0 }}>
            Área interna para formar, acompanhar e avaliar líderes de projetos
            da DubWorks.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {podeGerenciarTreinamentos(usuarioLogado) && (
            <button
              onClick={() => {
                setMostrarResultadosTreinamento(!mostrarResultadosTreinamento);
                recarregarRespostasTreinamento();
              }}
              style={botaoSecundarioGrandeStyle}
            >
              {mostrarResultadosTreinamento
                ? "Ver módulos"
                : "Resultados das respostas"}
            </button>
          )}

          <button
            onClick={() => {
              setMostrarTreinamentos(false);
              setMostrarRelatorios(false);
              setMostrarUsuarios(false);
              setMostrarMembros(false);
            }}
            style={botaoSecundarioGrandeStyle}
          >
            Voltar aos projetos
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Progresso geral</div>
          <strong style={{ fontSize: 34, color: "#f8fafc" }}>
            {progressoTreinamento}%
          </strong>
        </div>
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Módulos</div>
          <strong style={{ fontSize: 34, color: "#f8fafc" }}>
            {modulosTreinamentoLider.length}
          </strong>
        </div>
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Questões corretas</div>
          <strong style={{ fontSize: 34, color: "#f8fafc" }}>
            {respostasCorretasTreinamento}/{totalPerguntasTreinamento}
          </strong>
        </div>
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Status</div>
          <strong style={{ fontSize: 22, color: "#38bdf8" }}>
            {progressoTreinamento >= 100 ? "Concluído" : "Em andamento"}
          </strong>
        </div>
      </div>

      {mostrarResultadosTreinamento &&
      podeGerenciarTreinamentos(usuarioLogado) ? (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Resultados do treinamento</h2>
          <p style={{ color: "#94a3b8" }}>
            Aqui a diretoria acompanha as respostas enviadas pelos líderes em
            treinamento.
          </p>

          <button
            type="button"
            onClick={recarregarRespostasTreinamento}
            style={botaoSecundarioGrandeStyle}
          >
            Atualizar respostas
          </button>

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {carregandoRespostasTreinamento && (
              <p style={{ color: "#94a3b8" }}>Carregando respostas...</p>
            )}

            {!carregandoRespostasTreinamento &&
              respostasTreinamentoSalvas.length === 0 && (
                <p style={{ color: "#94a3b8" }}>
                  Nenhuma resposta enviada ainda.
                </p>
              )}

            {!carregandoRespostasTreinamento &&
              respostasTreinamentoSalvas.map((resposta) => (
                <div
                  key={`${resposta.id || resposta.usuario_login}-${
                    resposta.modulo_id
                  }-${resposta.data_resposta}`}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: resposta.correta
                      ? "1px solid rgba(34,197,94,.35)"
                      : "1px solid rgba(248,113,113,.35)",
                    background: resposta.correta
                      ? "rgba(34,197,94,.08)"
                      : "rgba(248,113,113,.08)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                    {resposta.usuario_nome || resposta.usuario_login} •{" "}
                    {resposta.modulo_titulo}
                  </div>

                  <div style={{ color: "#94a3b8" }}>
                    {resposta.data_resposta
                      ? new Date(resposta.data_resposta).toLocaleString("pt-BR")
                      : "Sem data registrada"}
                  </div>

                  <div style={{ color: "#cbd5e1" }}>
                    <strong>Pergunta:</strong> {resposta.pergunta}
                  </div>

                  <div style={{ color: "#cbd5e1" }}>
                    <strong>Resposta marcada:</strong>{" "}
                    {String.fromCharCode(65 + resposta.alternativa_marcada)}){" "}
                    {resposta.alternativa_texto}
                  </div>

                  <div
                    style={{
                      color: resposta.correta ? "#86efac" : "#fca5a5",
                      fontWeight: 900,
                    }}
                  >
                    {resposta.correta ? "Correta" : "Incorreta"}
                  </div>

                  <div style={{ color: "#94a3b8" }}>
                    <strong>Explicação:</strong> {resposta.explicacao}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "340px 1fr",
            gap: 18,
          }}
        >
          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>Módulos do treinamento</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {modulosTreinamentoLider.map((modulo) => (
                <button
                  key={modulo.id}
                  type="button"
                  onClick={() => setModuloTreinamentoAtivo(modulo.id)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border:
                      moduloTreinamentoAtivo === modulo.id
                        ? "1px solid rgba(56,189,248,.65)"
                        : "1px solid rgba(148,163,184,.18)",
                    background:
                      moduloTreinamentoAtivo === modulo.id
                        ? "rgba(14,165,233,.16)"
                        : "rgba(15,23,42,.42)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {modulo.titulo}
                </button>
              ))}
            </div>
          </div>

          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>
              {moduloSelecionadoTreinamento.titulo}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 16 }}>
              {moduloSelecionadoTreinamento.descricao}
            </p>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <h3 style={{ color: "#f8fafc", margin: 0 }}>Conteúdo</h3>
              {moduloSelecionadoTreinamento.conteudos.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,.18)",
                    background: "rgba(2,6,23,.34)",
                    color: "#cbd5e1",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {moduloSelecionadoTreinamento.pergunta && (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                <h3 style={{ color: "#f8fafc", margin: 0 }}>
                  Pergunta para concluir o módulo
                </h3>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(56,189,248,.25)",
                    background: "rgba(14,165,233,.10)",
                    color: "#f8fafc",
                    fontWeight: 800,
                  }}
                >
                  {moduloSelecionadoTreinamento.pergunta.pergunta}
                </div>

                {moduloSelecionadoTreinamento.pergunta.alternativas.map(
                  (alternativa, index) => {
                    const selecionada =
                      respostasTreinamento[moduloSelecionadoTreinamento.id] ===
                      index;
                    const correta =
                      moduloSelecionadoTreinamento.pergunta?.correta === index;
                    const respondida =
                      respostasTreinamento[moduloSelecionadoTreinamento.id] !==
                      undefined;

                    return (
                      <button
                        key={`${moduloSelecionadoTreinamento.id}-${index}`}
                        type="button"
                        onClick={() =>
                          responderPerguntaTreinamento(
                            moduloSelecionadoTreinamento.id,
                            index
                          )
                        }
                        style={{
                          textAlign: "left",
                          padding: 16,
                          borderRadius: 16,
                          cursor: "pointer",
                          border: selecionada
                            ? correta
                              ? "1px solid rgba(34,197,94,.75)"
                              : "1px solid rgba(248,113,113,.75)"
                            : "1px solid rgba(148,163,184,.18)",
                          background: selecionada
                            ? correta
                              ? "rgba(34,197,94,.16)"
                              : "rgba(248,113,113,.14)"
                            : "rgba(15,23,42,.42)",
                          color: "#f8fafc",
                          fontWeight: 700,
                        }}
                      >
                        {String.fromCharCode(65 + index)}) {alternativa}
                      </button>
                    );
                  }
                )}

                {respostasTreinamento[moduloSelecionadoTreinamento.id] !==
                  undefined && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      border:
                        respostasTreinamento[
                          moduloSelecionadoTreinamento.id
                        ] === moduloSelecionadoTreinamento.pergunta.correta
                          ? "1px solid rgba(34,197,94,.45)"
                          : "1px solid rgba(248,113,113,.45)",
                      background:
                        respostasTreinamento[
                          moduloSelecionadoTreinamento.id
                        ] === moduloSelecionadoTreinamento.pergunta.correta
                          ? "rgba(34,197,94,.10)"
                          : "rgba(248,113,113,.10)",
                      color: "#cbd5e1",
                    }}
                  >
                    <strong style={{ color: "#f8fafc" }}>
                      {respostasTreinamento[moduloSelecionadoTreinamento.id] ===
                      moduloSelecionadoTreinamento.pergunta.correta
                        ? "Resposta correta. Módulo concluído."
                        : "Resposta incorreta. Revise o conteúdo deste módulo."}
                    </strong>
                    <br />
                    {moduloSelecionadoTreinamento.pergunta.explicacao}
                  </div>
                )}

                {respostasTreinamento[moduloSelecionadoTreinamento.id] !==
                  undefined && (
                  <button
                    type="button"
                    onClick={() =>
                      enviarRespostaTreinamento(moduloSelecionadoTreinamento)
                    }
                    style={{
                      background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                      border: "none",
                      color: "#fff",
                      borderRadius: 14,
                      padding: "14px 18px",
                      cursor: "pointer",
                      fontWeight: 900,
                      boxShadow: "0 0 25px rgba(37,99,235,.35)",
                    }}
                  >
                    Enviar resposta para diretoria
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={painelDarkStyle}>
        <h2 style={tituloCardDarkStyle}>Avaliação manual do líder</h2>
        <p style={{ color: "#94a3b8" }}>
          Área para a diretoria registrar uma avaliação simples do líder em
          treinamento. Nesta versão, os dados ficam na tela; depois podemos
          salvar no Supabase.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Líder avaliado</label>
            <input
              value={avaliacaoLider.lider}
              onChange={(e) =>
                setAvaliacaoLider({ ...avaliacaoLider, lider: e.target.value })
              }
              placeholder="Nome do líder"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Projeto relacionado</label>
            <input
              value={avaliacaoLider.projeto}
              onChange={(e) =>
                setAvaliacaoLider({
                  ...avaliacaoLider,
                  projeto: e.target.value,
                })
              }
              placeholder="Nome do projeto"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Nota</label>
            <input
              value={avaliacaoLider.nota}
              onChange={(e) =>
                setAvaliacaoLider({ ...avaliacaoLider, nota: e.target.value })
              }
              placeholder="0 a 10"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={avaliacaoLider.status}
              onChange={(e) =>
                setAvaliacaoLider({ ...avaliacaoLider, status: e.target.value })
              }
              style={inputStyle}
            >
              <option value="em_treinamento">Em treinamento</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
              <option value="pausado">Pausado</option>
              <option value="atencao">Atenção</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Observações da diretoria</label>
          <textarea
            value={avaliacaoLider.observacoes}
            onChange={(e) =>
              setAvaliacaoLider({
                ...avaliacaoLider,
                observacoes: e.target.value,
              })
            }
            placeholder="Pontos positivos, pontos a melhorar e orientações..."
            style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(56,189,248,.25)",
            background: "rgba(14,165,233,.10)",
            color: "#cbd5e1",
          }}
        >
          <strong style={{ color: "#f8fafc" }}>Resumo da avaliação:</strong>
          <br />
          Líder: {avaliacaoLider.lider || "Não informado"} • Projeto:{" "}
          {avaliacaoLider.projeto || "Não informado"} • Nota:{" "}
          {avaliacaoLider.nota || "-"} • Status: {avaliacaoLider.status}
        </div>
      </div>
    </div>
  );

  const ProjectsPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={pageHeaderDarkStyle}>
        <div>
          <div style={breadcrumbDarkStyle}>Projetos › Detalhes do Projeto</div>
          <h1 style={pageTitleDarkStyle}>
            {projetoPainel?.Projeto || "Projetos"}
            {projetoPainel && (
              <span
                style={{
                  marginLeft: 12,
                  fontSize: 14,
                  color: "#38bdf8",
                  background: "rgba(37,99,235,0.22)",
                  border: "1px solid rgba(56,189,248,0.18)",
                  padding: "8px 10px",
                  borderRadius: 10,
                  verticalAlign: "middle",
                }}
              >
                Projeto Ativo
              </span>
            )}
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!isMobile && (
            <button
              onClick={() => setAbaProjeto("atividades")}
              style={botaoSecundarioStyle}
              title="Central de notificações da diretoria"
            >
              🔔 Notificações ({notificacoesProjeto.length})
            </button>
          )}
          {projetoPainel && (
            <button
              onClick={() => {
                setSelecionadoId(null);
                setRascunho(null);
                setAbaProjeto("informacoes");
              }}
              style={botaoSecundarioStyle}
            >
              Fechar visualização
            </button>
          )}
          {projetoPainel && usuarioLogado?.cargo === "diretoria" && (
            <button
              onClick={() =>
                alterarArquivamentoProjeto(!projetoPainel.Arquivado)
              }
              style={botaoSecundarioStyle}
            >
              {projetoPainel.Arquivado ? "Desarquivar" : "Arquivar"}
            </button>
          )}
          {podeCriarProjeto(usuarioLogado) && (
            <button
              onClick={() => {
                limparFormularioProjeto();
                setMostrarNovoProjeto(true);
              }}
              style={botaoPrimarioStyle}
            >
              Novo projeto
            </button>
          )}
          <button
            onClick={async () => {
              await recarregarProjetos();
              alert("Projetos atualizados.");
            }}
            style={botaoSecundarioStyle}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div
        style={{
          ...painelDarkStyle,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 220px",
          gap: 12,
          padding: 14,
        }}
      >
        <input
          placeholder="Buscar por ID, projeto, líder, editor, gênero ou personagem..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          style={inputStyle}
        >
          <option>Todos</option>
          {statusUnicos.map((status, i) => (
            <option key={`${status}-${i}`}>{status}</option>
          ))}
        </select>
      </div>

      {!projetoPainel && ProjectList()}

      {!projetoPainel && (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Selecione um projeto</h2>
          <p style={{ color: "#94a3b8" }}>
            Clique em um projeto da lista acima para abrir a visualização.
          </p>
        </div>
      )}

      {projetoPainel && (
        <div style={tabsDarkStyle}>
          {[
            ["informacoes", "ⓘ Informações"],
            ["selecao", "🎭 Seleção"],
            ["elenco", "🎬 Produção"],
            ["registros", "▣ Registros Semanais"],
            ["drive", "📁 Arquivos do Drive"],
            ["atividades", "↔ Atividades"],
            ["historico", "◷ Histórico"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAbaProjeto(id as any)}
              style={{
                ...tabButtonDarkStyle,
                background:
                  abaProjeto === id ? "rgba(37,99,235,0.22)" : "transparent",
                color: abaProjeto === id ? "#38bdf8" : "#cbd5e1",
                borderBottom:
                  abaProjeto === id
                    ? "2px solid #38bdf8"
                    : "2px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {abaProjeto === "informacoes" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 0.95fr",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            {ProjectDetails()}
            <div style={painelDarkStyle}>
              <h2 style={tituloCardDarkStyle}>▣ Observações</h2>
              <div
                style={{
                  background: "rgba(2,6,23,0.56)",
                  border: "1px solid rgba(148,163,184,0.14)",
                  borderRadius: 12,
                  minHeight: 84,
                  padding: 14,
                  color: "#f8fafc",
                  whiteSpace: "pre-wrap",
                }}
              >
                {projetoPainel?.Observacoes || "Sem observações cadastradas."}
              </div>
            </div>
          </div>
          {DrivePanel()}
        </div>
      )}

      {abaProjeto === "selecao" &&
        projetoPainel &&
        renderAbaSelecaoVisual(projetoPainel)}

      {abaProjeto === "elenco" && (
        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={tituloCardDarkStyle}>
                Produção e entregas por personagem
              </h2>

              <p style={{ color: "#94a3b8" }}>
                Nesta área o elenco aprovado vira acompanhamento de produção e
                entregas semanais.
              </p>
            </div>

            {rascunho && podeEditarProjeto(usuarioLogado, projetoPainel) && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={adicionarElencoRascunho}
                  style={{
                    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 14,
                    padding: "12px 18px",
                    cursor: "pointer",
                    fontWeight: 800,
                    boxShadow: "0 0 25px rgba(37,99,235,.35)",
                  }}
                >
                  + Adicionar personagem
                </button>

                <button
                  type="button"
                  onClick={salvarElencoAtual}
                  style={{
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 14,
                    padding: "12px 18px",
                    cursor: "pointer",
                    fontWeight: 800,
                    boxShadow: "0 0 25px rgba(34,197,94,.28)",
                  }}
                >
                  Salvar elenco
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {[
                [
                  "Personagens ativos",
                  String(((rascunho || projetoPainel)?.Elenco || []).length),
                ],
                [
                  "Entregas pendentes",
                  String(
                    ((rascunho || projetoPainel)?.Elenco || []).filter(
                      (item) =>
                        !item.status_entrega ||
                        item.status_entrega === "pendente"
                    ).length
                  ),
                ],
                [
                  "Entregas aprovadas",
                  String(
                    ((rascunho || projetoPainel)?.Elenco || []).filter(
                      (item) => item.status_entrega === "aprovado"
                    ).length
                  ),
                ],
                [
                  "Regravações",
                  String(
                    ((rascunho || projetoPainel)?.Elenco || []).filter(
                      (item) => item.status_entrega === "regravacao"
                    ).length
                  ),
                ],
              ].map(([label, valor]) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(2, 6, 23, 0.55)",
                    border: "1px solid rgba(148, 163, 184, 0.20)",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>

                  <strong
                    style={{
                      color: "#f8fafc",
                      fontSize: 20,
                    }}
                  >
                    {valor}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(2, 6, 23, 0.42)",
                border: "1px solid rgba(56, 189, 248, 0.16)",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ ...tituloCardDarkStyle, margin: 0 }}>
                  🎬 Painel de Produção
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  Controle semanal das entregas dos dubladores aprovados.
                </p>
              </div>

              <button
                type="button"
                style={botaoPrimarioStyle}
                disabled={sincronizandoEntregas || liberandoSemana}
                onClick={() => {
                  if (projetoPainel) {
                    sincronizarEntregasProducao(projetoPainel);
                  }
                }}
              >
                {sincronizandoEntregas
                  ? "Sincronizando..."
                  : liberandoSemana
                  ? "Liberando semana..."
                  : "Sincronizar entregas"}
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              background: "rgba(2, 6, 23, 0.42)",
              border: "1px solid rgba(56, 189, 248, 0.18)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ ...tituloCardDarkStyle, margin: 0 }}>
                  📦 Entregas oficiais
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  Acompanhamento por semana do projeto oficial.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={semanaFiltroProducao}
                  onChange={(e) =>
                    setSemanaFiltroProducao(Number(e.target.value))
                  }
                  style={inputStyle}
                >
                  {Array.from(
                    new Set([
                      1,
                      ...semanasProjeto.map((item) => item.semana),
                      ...entregasProducao.map((item) =>
                        numeroSemanaEntrega(item.semana)
                      ),
                    ])
                  )
                    .sort((a, b) => a - b)
                    .map((semana) => (
                      <option key={semana} value={semana}>
                        {labelSemana(semana)}
                      </option>
                    ))}
                </select>

                <span
                  style={{
                    borderRadius: 999,
                    padding: "9px 12px",
                    background: "rgba(56, 189, 248, 0.12)",
                    color: "#7dd3fc",
                    border: "1px solid rgba(56, 189, 248, 0.22)",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {(() => {
                    const semana = semanasProjeto.find(
                      (item) => item.semana === semanaFiltroProducao
                    );
                    return semana?.status === "concluida"
                      ? "Semana concluída"
                      : "Semana aberta";
                  })()}
                </span>
              </div>
            </div>

            {(() => {
              const elenco = (rascunho || projetoPainel)?.Elenco || [];
              const entregasSemana = entregasProducao.filter(
                (entrega) =>
                  numeroSemanaEntrega(entrega.semana) === semanaFiltroProducao
              );
              const totalElenco = elenco.length;
              const totalEntregues = elenco.filter((item) =>
                entregasSemana.some(
                  (entrega) =>
                    normalizar(entrega.personagem) ===
                    normalizar(item.personagem)
                )
              ).length;
              const totalPendentes = Math.max(totalElenco - totalEntregues, 0);
              const progresso =
                totalElenco > 0
                  ? Math.round((totalEntregues / totalElenco) * 100)
                  : 0;

              return (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(4, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[
                      ["Elenco oficial", String(totalElenco)],
                      ["Entregues", String(totalEntregues)],
                      ["Pendentes", String(totalPendentes)],
                      ["Progresso", `${progresso}%`],
                    ].map(([label, valor]) => (
                      <div
                        key={label}
                        style={{
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.16)",
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          {label}
                        </div>
                        <strong style={{ color: "#f8fafc", fontSize: 20 }}>
                          {valor}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(15, 23, 42, 0.85)",
                      overflow: "hidden",
                      border: "1px solid rgba(148, 163, 184, 0.16)",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progresso}%`,
                        background: "linear-gradient(135deg, #22c55e, #38bdf8)",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {elenco.map((item, index) => {
                      const entrega = entregasSemana.find(
                        (envio) =>
                          normalizar(envio.personagem) ===
                          normalizar(item.personagem)
                      );

                      return (
                        <div
                          key={item.id || index}
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "1fr 1fr 0.9fr 1fr 1fr",
                            gap: 12,
                            alignItems: "center",
                            background: "rgba(15, 23, 42, 0.70)",
                            border: "1px solid rgba(148, 163, 184, 0.14)",
                            borderRadius: 14,
                            padding: 14,
                          }}
                        >
                          <div>
                            <div style={{ color: "#94a3b8", fontSize: 11 }}>
                              Personagem
                            </div>
                            <strong style={{ color: "#f8fafc" }}>
                              {item.personagem || "-"}
                            </strong>
                          </div>

                          <div>
                            <div style={{ color: "#94a3b8", fontSize: 11 }}>
                              Dublador
                            </div>
                            <strong style={{ color: "#f8fafc" }}>
                              {item.dublador || "-"}
                            </strong>
                          </div>

                          <div>
                            <span
                              style={{
                                borderRadius: 999,
                                padding: "6px 10px",
                                background: entrega
                                  ? "rgba(34, 197, 94, 0.14)"
                                  : "rgba(245, 158, 11, 0.14)",
                                color: entrega ? "#86efac" : "#fde68a",
                                border: "1px solid rgba(148, 163, 184, 0.14)",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {entrega ? "Entregue" : "Pendente"}
                            </span>
                          </div>

                          <div>
                            {entrega?.video_url ? (
                              <a
                                href={entrega.video_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#38bdf8",
                                  fontWeight: 800,
                                  textDecoration: "none",
                                }}
                              >
                                Abrir envio ↗
                              </a>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>
                                Sem envio
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {entrega ? (
                              <>
                                <button
                                  type="button"
                                  style={botaoSecundarioStyle}
                                  onClick={() =>
                                    alterarStatusEntrega(entrega, "aprovado")
                                  }
                                >
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  style={botaoSecundarioStyle}
                                  onClick={() =>
                                    alterarStatusEntrega(entrega, "regravacao")
                                  }
                                >
                                  Regravar
                                </button>
                              </>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                                Aguardando envio
                              </span>
                            )}
                          </div>

                          {entrega?.video_url && (
                            <div
                              style={{
                                gridColumn: isMobile ? "1" : "1 / -1",
                                background: "rgba(2, 6, 23, 0.62)",
                                border: "1px solid rgba(56, 189, 248, 0.16)",
                                borderRadius: 14,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                  flexWrap: "wrap",
                                  padding: "10px 12px",
                                  borderBottom:
                                    "1px solid rgba(148, 163, 184, 0.12)",
                                }}
                              >
                                <strong style={{ color: "#dbeafe" }}>
                                  ▶ Prévia do vídeo —{" "}
                                  {item.personagem || "Entrega"}
                                </strong>

                                <button
                                  type="button"
                                  style={{
                                    ...botaoSecundarioStyle,
                                    padding: "8px 12px",
                                  }}
                                  onClick={() =>
                                    window.open(
                                      entrega.video_url,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  Abrir em nova aba ↗
                                </button>
                              </div>

                              <iframe
                                title={`Prévia da entrega de ${
                                  item.personagem || "personagem"
                                }`}
                                src={converterDriveParaPreview(
                                  entrega.video_url
                                )}
                                allow="autoplay"
                                style={{
                                  width: "100%",
                                  height: isMobile ? 220 : 320,
                                  border: 0,
                                  display: "block",
                                  background: "#020617",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {((rascunho || projetoPainel)?.Elenco || []).length ? (
              (rascunho || projetoPainel)!.Elenco.map((item, index) => (
                <div
                  key={item.id || index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1.4fr",
                    gap: 12,
                    alignItems: "center",
                    background: "rgba(2,6,23,0.48)",
                    border: "1px solid rgba(148,163,184,0.12)",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Personagem
                    </div>
                    {rascunho &&
                    podeEditarProjeto(usuarioLogado, projetoPainel) ? (
                      <input
                        value={item.personagem || ""}
                        onChange={(e) =>
                          atualizarElencoRascunho(
                            index,
                            "personagem",
                            e.target.value
                          )
                        }
                        placeholder="Nome do personagem"
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                        {item.personagem || "-"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Dublador
                    </div>
                    {rascunho &&
                    podeEditarProjeto(usuarioLogado, projetoPainel) ? (
                      <input
                        value={item.dublador || ""}
                        onChange={(e) =>
                          atualizarElencoRascunho(
                            index,
                            "dublador",
                            e.target.value
                          )
                        }
                        placeholder="Nome do dublador"
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                        {item.dublador || "-"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Telefone do dublador
                    </div>
                    {rascunho &&
                    podeEditarProjeto(usuarioLogado, projetoPainel) ? (
                      <input
                        value={item.telefone_dublador || ""}
                        onChange={(e) =>
                          atualizarElencoRascunho(
                            index,
                            "telefone_dublador" as any,
                            e.target.value
                          )
                        }
                        placeholder="Número do dublador"
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                        {item.telefone_dublador || "-"}
                      </div>
                    )}
                  </div>

                  <input
                    placeholder="Link do vídeo/teste deste personagem"
                    value={(item as any).video_link || ""}
                    readOnly
                    style={inputStyle}
                  />

                  {rascunho &&
                    podeEditarProjeto(usuarioLogado, projetoPainel) && (
                      <button
                        type="button"
                        onClick={() => excluirElencoRascunho(item, index)}
                        style={{
                          marginTop: 10,
                          background: "rgba(220,38,38,0.15)",
                          border: "1px solid rgba(248,113,113,0.28)",
                          color: "#fca5a5",
                          borderRadius: 12,
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Remover personagem
                      </button>
                    )}
                </div>
              ))
            ) : (
              <div style={{ color: "#94a3b8" }}>
                Nenhum elenco cadastrado neste projeto.
              </div>
            )}
          </div>
        </div>
      )}

      {abaProjeto === "drive" && <DrivePanel />}

      {abaProjeto === "registros" &&
        (projetoPainel ? (
          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>
              ▣ Registros Semanais — {projetoPainel.Projeto}
            </h2>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              Cada registro salvo recebe automaticamente nome, data e hora.
            </p>

            {(podeEditarProjeto(usuarioLogado, projetoPainel) ||
              usuarioLogado?.cargo === "diretoria" ||
              usuarioLogado?.cargo === "adm") && (
              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                <textarea
                  placeholder="Escreva o registro semanal do projeto..."
                  value={registroSemanalTexto}
                  onChange={(e) => setRegistroSemanalTexto(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 110 }}
                />
                <button
                  onClick={salvarRegistroSemanalProjeto}
                  style={botaoPrimarioStyle}
                >
                  Salvar registro semanal
                </button>
              </div>
            )}

            <div
              style={{
                marginTop: 22,
                background: "rgba(2,6,23,0.54)",
                border: "1px solid rgba(148,163,184,0.14)",
                borderRadius: 14,
                padding: 16,
                color: "#cbd5e1",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {projetoPainel.Registro_Semanal ||
                "Nenhum registro semanal cadastrado."}
            </div>
          </div>
        ) : (
          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>▣ Registros Semanais</h2>
            <p style={{ color: "#94a3b8" }}>
              Selecione um projeto para incluir ou visualizar registros.
            </p>
          </div>
        ))}

      {abaProjeto === "atividades" && (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>🔔 Atividades do Projeto</h2>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>
            Aqui aparecem somente atividades vinculadas ao projeto selecionado e
            ao seu acesso.
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {notificacoesProjeto.map((item, index) => (
              <div
                key={`${item.usuario}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                  gap: 10,
                  background: "rgba(2,6,23,0.54)",
                  border: "1px solid rgba(56,189,248,0.14)",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div>
                  <strong style={{ color: "#f8fafc" }}>{item.usuario}</strong>
                  <span style={{ color: "#cbd5e1" }}> - {item.acao}</span>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                    {item.tipo}
                  </div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>
                  {item.data}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {abaProjeto === "historico" &&
        (projetoPainel ? (
          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>
              ◷ Histórico de Alterações — {projetoPainel.Projeto}
            </h2>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              Histórico vinculado a este projeto. Toda ação salva fica
              registrada aqui com data, hora e usuário.
            </p>
            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {(projetoPainel.Registro_Semanal
                ? projetoPainel.Registro_Semanal.split("\n\n").filter(Boolean)
                : []
              ).map((item, index) => (
                <div
                  key={`${projetoPainel.ID}-historico-${index}`}
                  style={{
                    background: "rgba(2,6,23,0.54)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    borderRadius: 14,
                    padding: 14,
                    color: "#cbd5e1",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item}
                </div>
              ))}
              {!projetoPainel.Registro_Semanal && (
                <div style={{ color: "#94a3b8" }}>
                  Nenhum histórico salvo para este projeto ainda.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>◷ Histórico de Alterações</h2>
            <p style={{ color: "#94a3b8" }}>
              Selecione um projeto para visualizar o histórico dele.
            </p>
          </div>
        ))}

      {projetoPainel && ProjectList()}

      <div style={painelDarkStyle}>
        <h2 style={tituloCardDarkStyle}>Estatísticas do Projeto</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(5, 1fr)",
            gap: 14,
            marginTop: 18,
          }}
        >
          <MiniStat
            icon="👥"
            value={String(projetoPainel?.Elenco.length || 0)}
            label="Membros no Elenco"
            color="#3b82f6"
          />
          <MiniStat
            icon="🎙️"
            value={String(projetoPainel?.Elenco.length || 0)}
            label="Vídeos/Testes"
            color="#8b5cf6"
          />
          <MiniStat
            icon="🎬"
            value={
              projetoPainel?.Status?.toLowerCase().includes("final")
                ? "01"
                : "00"
            }
            label="Episódios Finalizados"
            color="#22c55e"
          />
          <MiniStat
            icon="🕒"
            value={projetoPainel?.Registro_Semanal ? "01" : "00"}
            label="Registros Semanais"
            color="#f97316"
          />
          <MiniStat
            icon="📈"
            value="85%"
            label="Progresso Geral"
            color="#14b8a6"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 18% 0%, rgba(37,99,235,0.16), transparent 30%), radial-gradient(circle at 95% 12%, rgba(14,165,233,0.08), transparent 32%), #050816",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <style>{estilosAnimacao}</style>

      {isMobile && (
        <div className="dw-mobile-topbar">
          <button
            type="button"
            className="dw-mobile-menu-button"
            onClick={() => setMenuMobileAberto(true)}
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <div className="dw-mobile-brand">
            <img src={LOGO_URL} alt="DubWorks" />
            <span>MANAGER</span>
          </div>

          <button type="button" className="dw-mobile-notify-button">
            🔔
          </button>
        </div>
      )}

      {isMobile && menuMobileAberto && (
        <div
          className="dw-mobile-drawer-backdrop"
          onClick={() => setMenuMobileAberto(false)}
        >
          <div
            className="dw-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dw-mobile-drawer-head">
              <img src={LOGO_URL} alt="DubWorks" />
              <button
                type="button"
                onClick={() => setMenuMobileAberto(false)}
                aria-label="Fechar menu"
              >
                ×
              </button>
            </div>

            <div className="dw-mobile-user-card">
              <div style={{ ...avatarStyle, width: 44, height: 44 }}>
                {usuarioLogado.nome?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <strong>{usuarioLogado.nome}</strong>
                <span>{cargoLabel(usuarioLogado.cargo)}</span>
              </div>
            </div>

            <nav className="dw-mobile-drawer-nav">
              <button
                type="button"
                className={telaAtual === "projetos" ? "active" : ""}
                onClick={() => {
                  setMostrarMembros(false);
                  setMostrarUsuarios(false);
                  setMostrarRelatorios(false);
                  setMostrarTreinamentos(false);
                  setMostrarFormNovoUsuario(false);
                  setMenuMobileAberto(false);
                }}
              >
                ▣ Projetos
              </button>

              {temAcesso(usuarioLogado, "acesso_membros") && (
                <button
                  type="button"
                  className={telaAtual === "membros" ? "active" : ""}
                  onClick={() => {
                    setMostrarMembros(true);
                    setMostrarUsuarios(false);
                    setMostrarRelatorios(false);
                    setMostrarTreinamentos(false);
                    setMostrarFormNovoUsuario(false);
                    recarregarMembros();
                    setMenuMobileAberto(false);
                  }}
                >
                  👥 Membros
                </button>
              )}

              {temAcesso(usuarioLogado, "acesso_usuarios") && (
                <button
                  type="button"
                  className={telaAtual === "usuarios" ? "active" : ""}
                  onClick={() => {
                    setMostrarUsuarios(true);
                    setMostrarMembros(false);
                    setMostrarRelatorios(false);
                    setMostrarTreinamentos(false);
                    setMenuMobileAberto(false);
                  }}
                >
                  ♙ Usuários
                </button>
              )}

              <button
                type="button"
                className={telaAtual === "relatorios" ? "active" : ""}
                onClick={() => {
                  setMostrarRelatorios(true);
                  setMostrarMembros(false);
                  setMostrarUsuarios(false);
                  setMostrarTreinamentos(false);
                  setMostrarFormNovoUsuario(false);
                  setMenuMobileAberto(false);
                }}
              >
                ▥ Relatórios
              </button>

              <button
                type="button"
                className={telaAtual === "treinamentos" ? "active" : ""}
                onClick={() => {
                  abrirTelaTreinamentos();
                  setMenuMobileAberto(false);
                }}
              >
                ◇ Treinamentos
              </button>

              <button type="button" className="danger" onClick={sair}>
                ⇢ Sair
              </button>
            </nav>
          </div>
        </div>
      )}

      <aside
        style={{
          width: isMobile ? "100%" : 250,
          minHeight: isMobile ? "auto" : "100vh",
          position: isMobile ? "relative" : "sticky",
          top: 0,
          alignSelf: "flex-start",
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(15,23,42,0.94))",
          borderRight: isMobile ? "none" : "1px solid rgba(148,163,184,0.16)",
          borderBottom: isMobile ? "1px solid rgba(148,163,184,0.16)" : "none",
          display: isMobile ? "none" : "flex",
          flexDirection: isMobile ? "row" : "column",
          alignItems: isMobile ? "center" : "stretch",
          overflowX: isMobile ? "auto" : "visible",
          padding: isMobile ? "12px 10px" : "28px 16px",
          gap: isMobile ? 10 : 22,
        }}
      >
        <div style={{ padding: isMobile ? 0 : "0 10px" }}>
          <img
            src={LOGO_URL}
            alt="DubWorks"
            style={{
              width: isMobile ? 58 : 150,
              height: "auto",
              filter: "drop-shadow(0 0 18px rgba(56,189,248,0.18))",
            }}
          />
          {!isMobile && (
            <div
              style={{
                color: "#38bdf8",
                fontWeight: 900,
                letterSpacing: 3,
                fontSize: 11,
                marginLeft: 58,
                marginTop: -8,
              }}
            >
              MANAGER
            </div>
          )}
        </div>

        <nav
          style={{
            display: isMobile ? "flex" : "grid",
            gap: 8,
            flex: isMobile ? 1 : undefined,
            overflowX: isMobile ? "auto" : "visible",
          }}
        >
          {!isMobile && <div style={sideSectionDarkStyle}>MENU</div>}
          <SidebarItem
            id="projetos"
            label={isMobile ? "" : "Projetos"}
            icon="▣"
            onClick={() => {
              setMostrarMembros(false);
              setMostrarUsuarios(false);
              setMostrarRelatorios(false);
              setMostrarFormNovoUsuario(false);
            }}
          />
          {temAcesso(usuarioLogado, "acesso_membros") && (
            <SidebarItem
              id="membros"
              label={isMobile ? "" : "Membros"}
              icon="👥"
              onClick={() => {
                setMostrarMembros(true);
                setMostrarUsuarios(false);
                setMostrarRelatorios(false);
                setMostrarFormNovoUsuario(false);
                recarregarMembros();
              }}
            />
          )}
          {temAcesso(usuarioLogado, "acesso_usuarios") && (
            <SidebarItem
              id="usuarios"
              label={isMobile ? "" : "Usuários"}
              icon="♙"
              onClick={() => {
                setMostrarUsuarios(true);
                setMostrarMembros(false);
                setMostrarRelatorios(false);
              }}
            />
          )}
          <SidebarItem
            id="relatorios"
            label={isMobile ? "" : "Relatórios"}
            icon="▥"
            onClick={() => {
              setMostrarRelatorios(true);
              setMostrarMembros(false);
              setMostrarUsuarios(false);
              setMostrarFormNovoUsuario(false);
            }}
          />
          {!isMobile && (
            <SidebarItem
              id="treinamentos"
              label="Treinamentos"
              icon="◇"
              onClick={abrirTelaTreinamentos}
            />
          )}
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
          {!isMobile && <div style={sideSectionDarkStyle}>CONFIGURAÇÕES</div>}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 10px",
                color: "#cbd5e1",
              }}
            >
              <div style={{ ...avatarStyle, width: 44, height: 44 }}>
                {usuarioLogado.nome?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, color: "#f8fafc" }}>
                  {usuarioLogado.nome}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>
                  {cargoLabel(usuarioLogado.cargo)}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={sair}
            style={{ ...menuTopoStyle, textAlign: "left" }}
          >
            {isMobile ? "⇢" : "⇢  Sair"}
          </button>
        </div>
      </aside>

      <main
        className="dw-main-content"
        style={{ flex: 1, padding: isMobile ? 14 : 26, minWidth: 0 }}
      >
        {telaAtual === "treinamentos"
          ? TrainingPage()
          : telaAtual === "membros"
          ? MembersPage()
          : telaAtual === "usuarios"
          ? UsersPage()
          : telaAtual === "relatorios"
          ? ReportsPage()
          : ProjectsPage()}
      </main>

      {mostrarNovoProjeto && (
        <Modal
          titulo="Novo projeto"
          onClose={() => {
            setMostrarNovoProjeto(false);
            limparFormularioProjeto();
          }}
          largo
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              {[
                ["Nome do projeto", "Projeto"],
                ["Tipo", "Tipo"],
                ["Gênero", "Genero"],
                ["Prioridade", "Prioridade"],
                ["Dupla", "Dupla"],
                ["Líder", "Lider"],
                ["Telefone do líder", "Telefone_Lider"],
                ["Editor", "Editor"],
                ["Telefone do editor", "Telefone_Editor"],
                ["Status", "Status"],
                ["Data de início", "Data_Inicio"],
                ["Capa do projeto (URL)", "Capa_URL"],
              ].map(([label, campo]) => (
                <div key={campo}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    value={String((novoProjeto as any)[campo] || "")}
                    onChange={(e) =>
                      setNovoProjeto((anterior) => ({
                        ...anterior,
                        [campo]: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <div>
              <label style={labelStyle}>Observações</label>
              <textarea
                value={novoProjeto.Observacoes || ""}
                onChange={(e) =>
                  setNovoProjeto((anterior) => ({
                    ...anterior,
                    Observacoes: e.target.value,
                  }))
                }
                style={{ ...textareaStyle, minHeight: 100 }}
                placeholder="Observações iniciais do projeto..."
              />
            </div>

            <div style={painelDarkStyle}>
              <h3 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Elenco inicial
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                <input
                  placeholder="Personagem"
                  value={novoElencoProjeto.personagem}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      personagem: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="Dublador"
                  value={novoElencoProjeto.dublador}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      dublador: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="Função"
                  value={novoElencoProjeto.funcao}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      funcao: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <button
                  onClick={adicionarElencoNovoProjeto}
                  style={botaoSecundarioStyle}
                >
                  Adicionar
                </button>
              </div>

              {novoProjeto.Elenco.length > 0 && (
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  {novoProjeto.Elenco.map((item, index) => (
                    <div
                      key={item.id || index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        background: "rgba(2,6,23,0.54)",
                        border: "1px solid rgba(148,163,184,0.12)",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div>
                        <strong>{item.personagem}</strong>
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          — {item.dublador}{" "}
                          {item.funcao ? `(${item.funcao})` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => removerElencoNovoProjeto(item.id)}
                        style={botaoSecundarioStyle}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  setMostrarNovoProjeto(false);
                  limparFormularioProjeto();
                }}
                style={botaoSecundarioStyle}
              >
                Cancelar
              </button>
              <button onClick={criarProjeto} style={botaoPrimarioStyle}>
                Criar projeto
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const painelDarkStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(2,6,23,0.82))",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 24px 70px rgba(0,0,0,0.26)",
};

const painelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 14,
  borderBottom: "1px solid rgba(148,163,184,0.12)",
};

const tituloCardDarkStyle: React.CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 900,
};

const pageHeaderDarkStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 4,
};

const breadcrumbDarkStyle: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 14,
  marginBottom: 10,
};

const pageTitleDarkStyle: React.CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 32,
  lineHeight: 1.1,
  fontWeight: 900,
};

const tabsDarkStyle: React.CSSProperties = {
  display: "flex",
  overflowX: "auto",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 14,
  background: "rgba(15,23,42,0.58)",
};

const tabButtonDarkStyle: React.CSSProperties = {
  border: "none",
  padding: "15px 22px",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const tabelaHeaderDarkStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  color: "#e2e8f0",
  fontSize: 13,
  background: "rgba(15,23,42,0.68)",
  borderBottom: "1px solid rgba(148,163,184,0.14)",
};

const tabelaCellDarkStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "#cbd5e1",
  verticalAlign: "top",
};

const sideSectionDarkStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  letterSpacing: 1,
  fontWeight: 900,
  padding: "0 10px 6px",
};

const reportCardDarkStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(2,6,23,0.82))",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 18,
  padding: 20,
  minHeight: 120,
  color: "#f8fafc",
  textAlign: "left",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 24px 70px rgba(0,0,0,0.26)",
};

function MenuCategoriaBloco({
  titulo,
  ativo,
  onClick,
  children,
}: {
  titulo: string;
  ativo: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${ativo ? estilos.borda : "transparent"}`,
        borderRadius: 16,
        background: ativo ? "rgba(56,189,248,0.14)" : "rgba(15,23,42,0.96)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={ativo ? megaCategoriaAtivaStyle : megaCategoriaBotaoStyle}
      >
        <span>{titulo}</span>
        <span>{ativo ? "⌄" : "›"}</span>
      </button>

      {ativo && (
        <div
          style={{
            display: "grid",
            gap: 6,
            padding: "0 14px 14px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SubmenuAcao({
  titulo,
  onClick,
}: {
  titulo: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={submenuAcaoStyle}>
      {titulo}
    </button>
  );
}

function MenuFerramentaItem({
  titulo,
  descricao,
  onClick,
}: {
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={megaItemStyle}>
      <div style={{ fontWeight: 900, color: estilos.azulEscuro, fontSize: 18 }}>
        {titulo}
      </div>
      <div
        style={{ color: estilos.textoSuave, marginTop: 5, lineHeight: 1.35 }}
      >
        {descricao}
      </div>
    </button>
  );
}

function RelatorioCard({
  titulo,
  texto,
  botao,
  onClick,
}: {
  titulo: string;
  texto: string;
  botao: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${estilos.borda}`,
        borderRadius: 18,
        padding: 22,
        background: "rgba(15, 23, 42, 0.82)",
        minHeight: 150,
        boxShadow: "0 12px 28px rgba(13, 71, 161, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div>
        <div
          style={{ fontWeight: 900, color: estilos.azulEscuro, fontSize: 20 }}
        >
          {titulo}
        </div>
        <div
          style={{ color: estilos.textoSuave, marginTop: 8, lineHeight: 1.4 }}
        >
          {texto}
        </div>
      </div>
      <button onClick={onClick} style={botaoPrimarioStyle}>
        {botao}
      </button>
    </div>
  );
}

function AjudaCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div
      style={{
        border: `1px solid ${estilos.borda}`,
        borderRadius: 18,
        padding: 22,
        background: "rgba(15, 23, 42, 0.82)",
        minHeight: 130,
        boxShadow: "0 12px 28px rgba(13, 71, 161, 0.08)",
      }}
    >
      <div style={{ fontWeight: 900, color: estilos.azulEscuro, fontSize: 19 }}>
        {titulo}
      </div>
      <div
        style={{ color: estilos.textoSuave, marginTop: 8, lineHeight: 1.45 }}
      >
        {texto}
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...inputStyle,
          background: disabled ? "#f4f6f8" : "rgba(15,23,42,0.96)",
        }}
      />
    </div>
  );
}

function Modal({
  titulo,
  onClose,
  children,
  largo,
}: {
  titulo: string;
  onClose: () => void;
  children?: React.ReactNode;
  largo?: boolean;
}) {
  return (
    <div style={overlayStyle}>
      <div
        style={{
          width: "100%",
          maxWidth: largo ? 980 : 860,
          background: "rgba(15, 23, 42, 0.82)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 30px 80px rgba(11, 61, 145, 0.25)",
          border: `1px solid ${estilos.borda}`,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 30, color: estilos.azulEscuro }}>
            {titulo}
          </h2>
          <button onClick={onClose} style={botaoSecundarioStyle}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96))",
        border: "1px solid rgba(56,189,248,0.18)",
        boxShadow:
          "0 18px 42px rgba(0,0,0,0.32), 0 0 28px rgba(56,189,248,0.10)",
      }}
    >
      <div style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 12 }}>
        {titulo}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: "#dbeafe" }}>
        {valor}
      </div>
    </div>
  );
}

function InfoPermissao({
  podeEditar,
  podeVideo,
}: {
  podeEditar: boolean;
  podeVideo: boolean;
}) {
  let texto = "Você só pode visualizar este projeto.";
  if (podeEditar) texto = "Você pode editar este projeto.";
  if (!podeEditar && podeVideo)
    texto =
      "Você pode visualizar este projeto e subir somente o vídeo do editor.";

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 14,
        background: "rgba(15,23,42,0.78)",
        border: `1px solid ${estilos.borda}`,
        color: estilos.texto,
        fontSize: 14,
        lineHeight: 1.6,
        fontWeight: 700,
      }}
    >
      {texto}
    </div>
  );
}

const estilosAnimacao = `
@keyframes dwFloat {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -16px, 0) scale(1.025); }
}

@keyframes dwFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes dwPulse {
  0%, 100% { transform: scale(1); opacity: 0.84; }
  50% { transform: scale(1.06); opacity: 1; }
}

@keyframes dwScan {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}

button, input, select, textarea {
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
}

button:hover {
  transform: translateY(-1px);
}

input::placeholder, textarea::placeholder {
  color: rgba(203, 213, 225, 0.56);
}

select {
  background: rgba(2, 6, 23, 0.88) !important;
  color: #f8fafc !important;
  border-color: rgba(148, 163, 184, 0.24) !important;
}

option {
  background: #020617;
  color: #f8fafc;
}

table {
  background: rgba(15, 23, 42, 0.86) !important;
  color: #f8fafc !important;
}

thead, tbody, tr, th, td {
  color: #f8fafc !important;
  border-color: rgba(148, 163, 184, 0.18) !important;
}

tr {
  transition: background .18s ease;
}

tr:hover {
  background: rgba(56, 189, 248, 0.08) !important;
}

* {
  scrollbar-color: rgba(56, 189, 248, .55) rgba(15, 23, 42, .85);
}
`;

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.94))",
  border: `1px solid ${estilos.borda}`,
  borderRadius: 22,
  padding: 18,
  boxShadow:
    "0 18px 45px rgba(0, 0, 0, 0.30), 0 0 28px rgba(56, 189, 248, 0.08)",
  backdropFilter: "blur(14px)",
  animation: "dwFadeUp .45s ease both",
};

const secaoTituloStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: estilos.azulEscuro,
  marginBottom: 14,
};

const thStyle: React.CSSProperties = {
  padding: "15px 14px",
  fontSize: 14,
  color: estilos.azulEscuro,
  borderBottom: `1px solid ${estilos.borda}`,
};

const tdStyle: React.CSSProperties = {
  padding: "15px 14px",
  fontSize: 14,
  verticalAlign: "top",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 700,
  color: estilos.textoSuave,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 13,
  borderRadius: 14,
  border: `1px solid ${estilos.borda}`,
  background: "rgba(2, 6, 23, 0.88)",
  color: estilos.texto,
  fontSize: 15,
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 13,
  borderRadius: 14,
  border: `1px solid ${estilos.borda}`,
  background: "rgba(2, 6, 23, 0.88)",
  color: estilos.texto,
  fontSize: 15,
  resize: "vertical",
  outline: "none",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(8, 33, 79, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 40,
};

const submenuAcaoStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "rgba(15, 23, 42, 0.82)",
  color: estilos.texto,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const menuTopoStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: estilos.texto,
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 8px",
  fontSize: 15,
};

const avatarStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #dbeafe, #1366d9)",
  color: "rgba(15,23,42,0.96)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 18,
  boxShadow: "0 8px 20px rgba(19, 102, 217, 0.20)",
};

const megaCategoriaStyle: React.CSSProperties = {
  padding: "18px 22px",
  borderRadius: 14,
  fontWeight: 900,
  color: estilos.texto,
  background: "rgba(15, 23, 42, 0.88)",
  border: `1px solid ${estilos.borda}`,
};

const megaCategoriaBotaoStyle: React.CSSProperties = {
  ...megaCategoriaStyle,
  textAlign: "left",
  cursor: "pointer",
};

const megaCategoriaAtivaStyle: React.CSSProperties = {
  ...megaCategoriaBotaoStyle,
  color: estilos.azul,
  background: "rgba(59, 130, 246, 0.16)",
};

const megaItemStyle: React.CSSProperties = {
  textAlign: "left",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "14px 4px",
};

const botaoPrimarioStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #dbeafe, #1366d9)",
  color: "rgba(15,23,42,0.96)",
  border: "none",
  borderRadius: 14,
  padding: "11px 16px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 8px 20px rgba(19, 102, 217, 0.22)",
};

const botaoPrimarioStyleGrande: React.CSSProperties = {
  width: "100%",
  background: "linear-gradient(135deg, #dbeafe, #1366d9)",
  color: "rgba(15,23,42,0.96)",
  border: "none",
  borderRadius: 16,
  padding: 16,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(19, 102, 217, 0.22)",
};

const botaoSecundarioStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: `1px solid ${estilos.borda}`,
  borderRadius: 14,
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: 700,
  color: estilos.azulEscuro,
};

const botaoSecundarioGrandeStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: `1px solid ${estilos.borda}`,
  borderRadius: 14,
  padding: 14,
  cursor: "pointer",
  fontWeight: 700,
  color: estilos.azulEscuro,
};
