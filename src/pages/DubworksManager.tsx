import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "../mobile-first.css";
import CortesPage from "./CortesPage";

import type {
  AvaliacaoSelecao,
  Cargo,
  ChavePermissao,
  ElencoItem,
  EntregaProducao,
  Membro,
  ModuloTreinamento,
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
  calcularRelatorioEntradaSaida,
  enfileirarLembreteWhatsapp,
  criarProximaSemanaProjetoBanco,
  fecharSemanaProjetoBanco,
  carregarParticipantesSemanaBanco,
  adicionarElencoSemanaBanco,
  removerElencoSemanaBanco,
  reabrirPapelProjetoBanco,
  carregarCanaisChat,
  carregarMensagensChat,
  enviarMensagemChat,
  marcarCanalComoLido,
  carregarParticipantesChat,
  adicionarParticipantesChat,
  garantirCanalProjeto,
  abrirConversaDireta,
  assinarMensagensChat,
  carregarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  salvarMencoesMensagem,
  assinarNotificacoes,
  carregarAnexosChat,
  enviarAnexosChat,
  assinarAnexosChat,
  editarMensagemChat,
  excluirMensagemChat,
  substituirMencoesMensagem,
  carregarPreferenciasChat,
  definirChatSilenciado,
  carregarAdvertenciasPlanilha,
  telefonesAdvertenciaEquivalentes,
  ADVERTENCIAS_FORM_URL,
  carregarAgendaEventosBanco,
  criarAgendaEventoBanco,
  atualizarAgendaEventoBanco,
  excluirAgendaEventoBanco,
  type AdvertenciaPlanilha,
  type AgendaEvento,
  type ChatCanal,
  type ChatMensagem,
  type ChatParticipante,
  type ChatAnexo,
  type ChatPreferencia,
  type NotificacaoChat,
  type ParticipanteSemanaProjeto,
} from "../services/appServices";

const STATUS_PROJETO_OPCOES: string[] = [
  "Aguardando início",
  "Seleção",
  "Em andamento",
  "Em edição",
  "Pausado",
  "Stand-by",
  "Finalizado",
];

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
  const [mostrarAdvertencias, setMostrarAdvertencias] = useState(false);
  const [advertencias, setAdvertencias] = useState<AdvertenciaPlanilha[]>([]);
  const [carregandoAdvertencias, setCarregandoAdvertencias] = useState(false);
  const [erroAdvertencias, setErroAdvertencias] = useState("");
  const [queryAdvertencias, setQueryAdvertencias] = useState("");
  const [advertenciaSelecionada, setAdvertenciaSelecionada] =
    useState<AdvertenciaPlanilha | null>(null);
  const [mostrarFerramentas, setMostrarFerramentas] = useState(false);
  const [categoriaFerramentas, setCategoriaFerramentas] = useState<
    "inicio" | "calendario" | "chat" | "ia" | "editor"
  >("inicio");
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
  const [mensagemIA, setMensagemIA] = useState("");
  const [historicoIA, setHistoricoIA] = useState<
    { autor: "usuario" | "ia"; texto: string }[]
  >([]);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [acaoPendenteIA, setAcaoPendenteIA] = useState<{
    tipo: "atualizar_projeto";
    projeto_id: string;
    projeto: string;
    campo: "Status" | "Prioridade" | "Lider" | "Editor" | "Data_Inicio";
    valor_atual: string;
    novo_valor: string;
  } | null>(null);
  const [salvandoAcaoIA, setSalvandoAcaoIA] = useState(false);

  // ==========================
  // CHAT INTERNO
  // ==========================
  const [canaisChat, setCanaisChat] = useState<ChatCanal[]>([]);
  const [participantesChat, setParticipantesChat] = useState<ChatParticipante[]>([]);
  const [canalChatAtivoId, setCanalChatAtivoId] = useState<string | null>(null);
  const [mensagensChat, setMensagensChat] = useState<ChatMensagem[]>([]);
  const [mensagemChat, setMensagemChat] = useState("");
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [carregandoMensagensChat, setCarregandoMensagensChat] = useState(false);
  const [enviandoMensagemChat, setEnviandoMensagemChat] = useState(false);
  const [erroChat, setErroChat] = useState("");
  const [painelInfoChatAberto, setPainelInfoChatAberto] = useState(true);
  const [mensagemRespondendoChat, setMensagemRespondendoChat] =
    useState<ChatMensagem | null>(null);
  const [mostrarAdicionarPessoasChat, setMostrarAdicionarPessoasChat] =
    useState(false);
  const [buscaPessoasChat, setBuscaPessoasChat] = useState("");
  const [pessoasSelecionadasChat, setPessoasSelecionadasChat] = useState<
    string[]
  >([]);
  const [adicionandoPessoasChat, setAdicionandoPessoasChat] = useState(false);
  const [menuChatAberto, setMenuChatAberto] = useState(false);
  const [menuMensagemAbertoId, setMenuMensagemAbertoId] =
    useState<number | null>(null);
  const [mensagemEditandoChat, setMensagemEditandoChat] =
    useState<ChatMensagem | null>(null);
  const [textoEdicaoMensagemChat, setTextoEdicaoMensagemChat] = useState("");
  const [salvandoEdicaoMensagemChat, setSalvandoEdicaoMensagemChat] =
    useState(false);
  const [preferenciasChat, setPreferenciasChat] = useState<ChatPreferencia[]>(
    []
  );
  const [alterandoSilencioChat, setAlterandoSilencioChat] = useState(false);

  // ==========================
  // NOTIFICAÇÕES E MENÇÕES
  // ==========================
  const [notificacoesChat, setNotificacoesChat] = useState<NotificacaoChat[]>([]);
  const [mostrarNotificacoesChat, setMostrarNotificacoesChat] = useState(false);
  const [carregandoNotificacoesChat, setCarregandoNotificacoesChat] =
    useState(false);
  const [toastNotificacaoChat, setToastNotificacaoChat] =
    useState<NotificacaoChat | null>(null);
  const [mensagemChatDestacadaId, setMensagemChatDestacadaId] =
    useState<number | null>(null);
  const [mencoesPendentesChat, setMencoesPendentesChat] = useState<
    { login: string; nome: string }[]
  >([]);

  // ==========================
  // ANEXOS DO CHAT
  // ==========================
  const [anexosChat, setAnexosChat] = useState<ChatAnexo[]>([]);
  const [arquivosChatSelecionados, setArquivosChatSelecionados] = useState<
    File[]
  >([]);
  const [enviandoAnexosChat, setEnviandoAnexosChat] = useState(false);
  const inputAnexoChatRef = useRef<HTMLInputElement | null>(null);

  const timerToastNotificacaoRef = useRef<number | null>(null);
  const timerFocoNotificacaoRef = useRef<number | null>(null);

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
  const [enviandoLembretesWhatsapp, setEnviandoLembretesWhatsapp] =
    useState(false);
  const [participantesSemanaProjeto, setParticipantesSemanaProjeto] = useState<
    ParticipanteSemanaProjeto[]
  >([]);
  const [carregandoParticipantesSemana, setCarregandoParticipantesSemana] =
    useState(false);
  const [mostrarAdicionarSemana, setMostrarAdicionarSemana] = useState(false);
  const [criandoSemanaProjeto, setCriandoSemanaProjeto] = useState(false);
  const [alterandoParticipanteSemana, setAlterandoParticipanteSemana] =
    useState(false);
  const [reabrindoPapelId, setReabrindoPapelId] = useState<string | null>(null);

  // ==========================
  // SINCRONIZAÇÃO AUTOMÁTICA
  // ==========================
  const [statusSincronizacaoAutomatica, setStatusSincronizacaoAutomatica] =
    useState<"idle" | "sincronizando" | "ok" | "erro">("idle");
  const [mensagemSincronizacaoAutomatica, setMensagemSincronizacaoAutomatica] =
    useState("");
  const ultimaSincronizacaoAutomaticaRef = useRef<{
    projetoId: string;
    momento: number;
  } | null>(null);

  // ==========================
  // ESTATÍSTICAS GERAIS
  // ==========================
  const [resumoMidiasPorProjeto, setResumoMidiasPorProjeto] = useState<
    Record<string, { entregas: number; testes: number }>
  >({});

  // ==========================
  // AGENDA / CALENDÁRIO
  // ==========================
  const [agendaEventos, setAgendaEventos] = useState<AgendaEvento[]>([]);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [salvandoAgenda, setSalvandoAgenda] = useState(false);
  const [visualizacaoAgenda, setVisualizacaoAgenda] = useState<
    "mes" | "semana" | "agenda"
  >("mes");
  const [dataReferenciaAgenda, setDataReferenciaAgenda] = useState(new Date());
  const [modoModalAgenda, setModoModalAgenda] = useState<
    "novo" | "visualizar" | "editar" | null
  >(null);
  const [eventoAgendaSelecionado, setEventoAgendaSelecionado] =
    useState<AgendaEvento | null>(null);
  const [agendaForm, setAgendaForm] = useState({
    titulo: "",
    descricao: "",
    inicio: "",
    fim: "",
    dia_inteiro: false,
    tipo: "compromisso",
    link_reuniao: "",
    projeto_id: "",
  });

  useEffect(() => {
    function atualizarLargura() {
      setLarguraTela(window.innerWidth);
    }

    atualizarLargura();
    window.addEventListener("resize", atualizarLargura);
    return () => window.removeEventListener("resize", atualizarLargura);
  }, []);

  async function enviarMensagemIA() {
    const novaMensagem = mensagemIA.trim();

    if (!novaMensagem || carregandoIA) return;

    setHistoricoIA((anterior) => [
      ...anterior,
      {
        autor: "usuario",
        texto: novaMensagem,
      },
    ]);

    setMensagemIA("");
    setAcaoPendenteIA(null);
    setCarregandoIA(true);

    try {
      const resposta = await fetch("/api/ia/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensagem: novaMensagem,

          projetos: projetosVisiveis.map((projeto) => {
            const linksDrive = extrairLinksDrive(projeto.Observacoes || "");

            const liderNormalizado = normalizar(projeto.Lider || "");

            const perfilLider =
              usuarios.find((usuario) =>
                [usuario.login, usuario.nome, usuario.vinculo].some(
                  (valor) =>
                    Boolean(valor) &&
                    normalizar(valor || "") === liderNormalizado
                )
              ) || null;

            const personagensSelecao = Array.from(
              new Set(
                (projeto.Elenco || [])
                  .map((item) => String(item.personagem || "").trim())
                  .filter(Boolean)
              )
            );

            return {
              id: String(projeto.ID),
              projeto: projeto.Projeto || "",
              status: projeto.Status || "",
              tipo: projeto.Tipo || "",
              genero: projeto.Genero || "",
              prioridade: projeto.Prioridade || "",
              lider: projeto.Lider || "",
              lider_nome: perfilLider?.nome || projeto.Lider || "",
              editor: projeto.Editor || "",
              data_inicio: projeto.Data_Inicio || "",
              ultimos_registros: (projeto.Registro_Semanal || "")
                .split("\\n")
                .slice(-10)
                .join("\\n"),

              // Dados objetivos usados para montar o modelo oficial de seleção.
              // O backend calcula o prazo padrão de 7 dias.
              personagens_selecao: personagensSelecao,
              link_falas_teste: linksDrive.falasTeste || "",
              link_formulario_selecao: linksDrive.formSelecao || "",

              // A IA recebe somente o elenco oficial já registrado no projeto.
              // No fluxo atual do Manager, candidatos aprovados são adicionados
              // ao Elenco do projeto. Assim, a IA não precisa decidir quem foi
              // aprovado: ela apenas organiza os dados oficiais do sistema.
              aprovados: (projeto.Elenco || [])
                .filter(
                  (item) =>
                    Boolean(item.personagem?.trim()) &&
                    Boolean(item.dublador?.trim())
                )
                .map((item) => ({
                  personagem: item.personagem || "",
                  dublador: item.dublador || "",
                  telefone: item.telefone_dublador || "",
                  funcao: item.funcao || "Dublador",
                })),
            };
          }),
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.detail || "Não foi possível consultar a IA."
        );
      }

      if (!dados?.resposta) {
        throw new Error("A IA não retornou nenhuma resposta.");
      }

      setHistoricoIA((anterior) => [
        ...anterior,
        {
          autor: "ia",
          texto: String(dados.resposta),
        },
      ]);

      if (
        dados?.acao?.tipo === "atualizar_projeto" &&
        dados?.acao?.projeto_id &&
        dados?.acao?.campo &&
        dados?.acao?.novo_valor !== undefined
      ) {
        setAcaoPendenteIA({
          tipo: "atualizar_projeto",
          projeto_id: String(dados.acao.projeto_id),
          projeto: String(dados.acao.projeto || ""),
          campo: dados.acao.campo,
          valor_atual: String(dados.acao.valor_atual || ""),
          novo_valor: String(dados.acao.novo_valor || ""),
        });
      }
    } catch (erro) {
      console.error("Erro ao consultar a IA:", erro);

      setHistoricoIA((anterior) => [
        ...anterior,
        {
          autor: "ia",
          texto:
            erro instanceof Error
              ? `Erro: ${erro.message}`
              : "Não consegui me conectar à IA.",
        },
      ]);
    } finally {
      setCarregandoIA(false);
    }
  }

  async function confirmarAcaoIA() {
    if (!acaoPendenteIA || salvandoAcaoIA || !usuarioLogado) return;

    const projetoAlvo =
      projetosVisiveis.find(
        (projeto) => String(projeto.ID) === String(acaoPendenteIA.projeto_id)
      ) || null;

    if (!projetoAlvo) {
      alert(
        "O projeto da alteração não está mais disponível para este usuário."
      );
      setAcaoPendenteIA(null);
      return;
    }

    if (!podeEditarProjeto(usuarioLogado, projetoAlvo)) {
      alert("Você não tem permissão para alterar este projeto.");
      setAcaoPendenteIA(null);
      return;
    }

    if (
      acaoPendenteIA.campo === "Lider" &&
      (usuarioLogado.cargo === "lider" ||
        usuarioLogado.cargo === "lider_treinamento")
    ) {
      alert("Seu perfil não tem permissão para trocar o líder do projeto.");
      setAcaoPendenteIA(null);
      return;
    }

    const valorAtualReal = String(
      (projetoAlvo as any)[acaoPendenteIA.campo] || ""
    ).trim();

    if (valorAtualReal !== String(acaoPendenteIA.valor_atual || "").trim()) {
      alert(
        "O projeto foi alterado depois da proposta da IA. Peça a alteração novamente para usar os dados atuais."
      );
      setAcaoPendenteIA(null);
      await recarregarProjetos();
      return;
    }

    const novoValor = String(acaoPendenteIA.novo_valor || "").trim();

    if (!novoValor) {
      alert("A IA não informou um novo valor válido.");
      setAcaoPendenteIA(null);
      return;
    }

    const projetoAtualizado: Projeto = {
      ...projetoAlvo,
      [acaoPendenteIA.campo]: novoValor,
    };

    const nomeCampo: Record<
      "Status" | "Prioridade" | "Lider" | "Editor" | "Data_Inicio",
      string
    > = {
      Status: "status",
      Prioridade: "prioridade",
      Lider: "líder",
      Editor: "editor",
      Data_Inicio: "data de início",
    };

    const descricaoHistorico = `via IA o ${
      nomeCampo[acaoPendenteIA.campo]
    } de "${valorAtualReal || "vazio"}" para "${novoValor}"`;

    const projetoComHistorico = aplicarHistoricoAutomatico(
      projetoAlvo,
      projetoAtualizado,
      descricaoHistorico
    );

    try {
      setSalvandoAcaoIA(true);

      const ok = await atualizarProjetoBanco(projetoComHistorico);

      if (!ok) {
        alert("Não consegui salvar a alteração no banco.");
        return;
      }

      await recarregarProjetos();

      setHistoricoIA((anterior) => [
        ...anterior,
        {
          autor: "ia",
          texto: `✓ Alteração confirmada. ${projetoAlvo.Projeto}: ${
            nomeCampo[acaoPendenteIA.campo]
          } atualizado de "${valorAtualReal || "vazio"}" para "${novoValor}".`,
        },
      ]);

      setAcaoPendenteIA(null);
    } catch (erro) {
      console.error("Erro ao executar alteração proposta pela IA:", erro);
      alert(
        erro instanceof Error
          ? `Erro ao salvar alteração: ${erro.message}`
          : "Erro ao salvar alteração."
      );
    } finally {
      setSalvandoAcaoIA(false);
    }
  }

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

  async function sincronizarProjetoAutomaticamente(projeto: Projeto) {
    const agora = Date.now();
    const ultima = ultimaSincronizacaoAutomaticaRef.current;

    // Evita chamada duplicada do StrictMode/HMR em poucos segundos.
    if (
      ultima?.projetoId === String(projeto.ID) &&
      agora - ultima.momento < 3000
    ) {
      return;
    }

    ultimaSincronizacaoAutomaticaRef.current = {
      projetoId: String(projeto.ID),
      momento: agora,
    };

    setStatusSincronizacaoAutomatica("sincronizando");
    setMensagemSincronizacaoAutomatica("Sincronizando formulários...");

    const links = extrairLinksDrive(projeto.Observacoes);
    let fontesEncontradas = 0;
    const erros: string[] = [];

    // Seleção: sincronização silenciosa, sem alert.
    if (links.planilhaSelecao || links.respostasSelecao || links.selecao) {
      fontesEncontradas += 1;
      try {
        setSincronizandoSelecao(true);
        const respostas = await lerRespostasSelecaoViaAppsScript(
          links.planilhaSelecao || "",
          links.respostasSelecao || links.selecao || ""
        );

        setRespostasSelecao(respostas);
        await carregarAvaliacoesSelecaoProjeto(projeto);
        setRespostaSelecaoAtivaId(respostas[0]?.id || null);

        setResumoMidiasPorProjeto((anterior) => ({
          ...anterior,
          [String(projeto.ID)]: {
            entregas:
              anterior[String(projeto.ID)]?.entregas ||
              entregasProducao.length ||
              0,
            testes: respostas.length,
          },
        }));
      } catch (erro: any) {
        console.error("Erro na sincronização automática da seleção:", erro);
        erros.push(`Seleção: ${erro?.message || String(erro)}`);
      } finally {
        setSincronizandoSelecao(false);
      }
    }

    // Entregas: sincronização silenciosa e sem concluir semana automaticamente.
    if (links.planilhaEntregas || links.entregasProjeto || links.projeto) {
      fontesEncontradas += 1;
      try {
        setSincronizandoEntregas(true);
        const respostas = await lerRespostasEntregasViaEdge(
          links.planilhaEntregas || "",
          links.entregasProjeto || links.projeto || ""
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
          throw new Error("Não foi possível salvar as entregas no Supabase.");
        }

        const entregasAtualizadas = await carregarEntregasProducaoBanco(
          projeto.ID
        );
        setEntregasProducao(entregasAtualizadas);

        setResumoMidiasPorProjeto((anterior) => ({
          ...anterior,
          [String(projeto.ID)]: {
            testes:
              anterior[String(projeto.ID)]?.testes ||
              respostasSelecao.length ||
              0,
            entregas: entregasAtualizadas.length,
          },
        }));
      } catch (erro: any) {
        console.error("Erro na sincronização automática das entregas:", erro);
        erros.push(`Entregas: ${erro?.message || String(erro)}`);
      } finally {
        setSincronizandoEntregas(false);
      }
    }

    if (!fontesEncontradas) {
      setStatusSincronizacaoAutomatica("ok");
      setMensagemSincronizacaoAutomatica("Sem formulários vinculados");
      return;
    }

    if (erros.length) {
      setStatusSincronizacaoAutomatica("erro");
      setMensagemSincronizacaoAutomatica(
        "Projeto aberto com os últimos dados salvos"
      );
      return;
    }

    setStatusSincronizacaoAutomatica("ok");
    setMensagemSincronizacaoAutomatica("Formulários atualizados");
  }

  function paraDatetimeLocal(valor?: string | null) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";

    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function datetimeLocalParaIso(valor?: string) {
    if (!valor) return "";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "" : data.toISOString();
  }

  async function carregarAgendaAtual() {
    try {
      setCarregandoAgenda(true);
      const eventos = await carregarAgendaEventosBanco();
      setAgendaEventos(eventos);
      return eventos;
    } catch (erro) {
      console.error("Erro ao carregar a agenda:", erro);
      return [];
    } finally {
      setCarregandoAgenda(false);
    }
  }

  function abrirNovoCompromissoAgenda(dataBase?: Date) {
    const inicioBase = dataBase ? new Date(dataBase) : new Date();

    if (!dataBase) {
      inicioBase.setMinutes(0, 0, 0);
      if (inicioBase.getHours() < 8) inicioBase.setHours(9);
    } else {
      inicioBase.setHours(9, 0, 0, 0);
    }

    const fimBase = new Date(inicioBase.getTime() + 60 * 60 * 1000);

    setEventoAgendaSelecionado(null);
    setAgendaForm({
      titulo: "",
      descricao: "",
      inicio: paraDatetimeLocal(inicioBase.toISOString()),
      fim: paraDatetimeLocal(fimBase.toISOString()),
      dia_inteiro: false,
      tipo: "compromisso",
      link_reuniao: "",
      projeto_id: projetoPainel?.ID || "",
    });
    setModoModalAgenda("novo");
  }

  function visualizarCompromissoAgenda(evento: AgendaEvento) {
    setEventoAgendaSelecionado(evento);
    setModoModalAgenda("visualizar");
  }

  function editarCompromissoAgenda(evento: AgendaEvento) {
    setEventoAgendaSelecionado(evento);
    setAgendaForm({
      titulo: evento.titulo || "",
      descricao: evento.descricao || "",
      inicio: paraDatetimeLocal(evento.inicio),
      fim: paraDatetimeLocal(evento.fim),
      dia_inteiro: Boolean(evento.dia_inteiro),
      tipo: evento.tipo || "compromisso",
      link_reuniao: evento.link_reuniao || "",
      projeto_id: evento.projeto_id ? String(evento.projeto_id) : "",
    });
    setModoModalAgenda("editar");
  }

  async function salvarCompromissoAgenda() {
    if (!agendaForm.titulo.trim()) {
      alert("Informe o título do compromisso.");
      return;
    }

    if (!agendaForm.inicio) {
      alert("Informe a data e o horário de início.");
      return;
    }

    const inicio = datetimeLocalParaIso(agendaForm.inicio);
    const fim = datetimeLocalParaIso(agendaForm.fim);

    if (!inicio) {
      alert("A data de início é inválida.");
      return;
    }

    if (fim && new Date(fim).getTime() < new Date(inicio).getTime()) {
      alert("O término não pode ser anterior ao início.");
      return;
    }

    try {
      setSalvandoAgenda(true);

      const payload = {
        titulo: agendaForm.titulo,
        descricao: agendaForm.descricao,
        inicio,
        fim: fim || null,
        dia_inteiro: agendaForm.dia_inteiro,
        tipo: agendaForm.tipo,
        link_reuniao: agendaForm.link_reuniao,
        projeto_id: agendaForm.projeto_id || null,
        criado_por:
          usuarioLogado?.nome || usuarioLogado?.login || "Sistema",
      };

      if (modoModalAgenda === "editar" && eventoAgendaSelecionado) {
        await atualizarAgendaEventoBanco(
          eventoAgendaSelecionado.id,
          payload
        );
      } else {
        await criarAgendaEventoBanco(payload);
      }

      await carregarAgendaAtual();
      setModoModalAgenda(null);
      setEventoAgendaSelecionado(null);
    } catch (erro: any) {
      alert(
        `Não consegui salvar o compromisso: ${
          erro?.message || String(erro)
        }`
      );
    } finally {
      setSalvandoAgenda(false);
    }
  }

  async function excluirCompromissoAgenda(evento: AgendaEvento) {
    const confirmar = window.confirm(
      `Excluir o compromisso "${evento.titulo}"?`
    );

    if (!confirmar) return;

    try {
      setSalvandoAgenda(true);
      await excluirAgendaEventoBanco(evento.id);
      await carregarAgendaAtual();
      setModoModalAgenda(null);
      setEventoAgendaSelecionado(null);
    } catch (erro: any) {
      alert(
        `Não consegui excluir o compromisso: ${
          erro?.message || String(erro)
        }`
      );
    } finally {
      setSalvandoAgenda(false);
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
        "A resposta precisa ter personagem e nome do membro para entrar no Banco do Projeto."
      );
      return;
    }

    const existente = (projetoPainel.Elenco || []).find(
      (item) => normalizar(item.personagem) === normalizar(resposta.personagem)
    );

    if (existente?.dublador?.trim()) {
      const confirmar = window.confirm(
        `Já existe alguém registrado para ${resposta.personagem}: ${existente.dublador}. Deseja substituir por ${resposta.nome}? O histórico das semanas anteriores será preservado.`
      );

      if (!confirmar) return;
    }

    const novoElenco = existente
      ? (projetoPainel.Elenco || []).map((item) =>
          item.id === existente.id
            ? {
                ...item,
                personagem: resposta.personagem,
                dublador: resposta.nome,
                telefone_dublador: resposta.telefone || "",
                funcao: item.funcao || "Dublador",
              }
            : item
        )
      : [
          ...(projetoPainel.Elenco || []),
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
      alert("Não consegui salvar o Banco do Projeto.");
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
      `${resposta.nome} foi aprovado(a) para ${resposta.personagem} e vinculado(a) ao Banco do Projeto.`
    );
  }

  async function carregarSemanasProjeto(projeto: Projeto) {
    const semanas = await carregarSemanasProjetoBanco(projeto.ID);
    setSemanasProjeto(semanas);

    if (!semanas.length) {
      setSemanaFiltroProducao(1);
      setParticipantesSemanaProjeto([]);
      return semanas;
    }

    const semanaAtual =
      semanas.find((item) => item.semana === semanaFiltroProducao) ||
      semanas.find((item) => item.status === "aberta") ||
      semanas[semanas.length - 1];

    if (semanaAtual?.semana) {
      setSemanaFiltroProducao(semanaAtual.semana);
      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaAtual.semana
      );
    }

    return semanas;
  }

  async function carregarParticipantesSemanaProjetoBancoLocal(
    projeto: Projeto,
    semana: number
  ) {
    if (!projeto?.ID || !semana) {
      setParticipantesSemanaProjeto([]);
      return [];
    }

    try {
      setCarregandoParticipantesSemana(true);
      const participantes = await carregarParticipantesSemanaBanco(
        projeto.ID,
        semana
      );
      setParticipantesSemanaProjeto(participantes);
      return participantes;
    } catch (erro) {
      console.error("Erro ao carregar participantes da semana:", erro);
      setParticipantesSemanaProjeto([]);
      return [];
    } finally {
      setCarregandoParticipantesSemana(false);
    }
  }

  async function carregarEntregasProducaoProjeto(projeto: Projeto) {
    const entregas = await carregarEntregasProducaoBanco(projeto.ID);
    setEntregasProducao(entregas);
    await carregarSemanasProjeto(projeto);
    return entregas;
  }

  function todosEntregaramSemana(
    participantes: ParticipanteSemanaProjeto[],
    entregas: EntregaProducao[],
    semana: number
  ) {
    const participantesComDublador = participantes.filter(
      (item) => item.personagem?.trim() && item.dublador?.trim()
    );

    if (!participantesComDublador.length) return false;

    return participantesComDublador.every((personagem) =>
      entregas.some(
        (entrega) =>
          normalizar(entrega.personagem) ===
            normalizar(personagem.personagem) &&
          numeroSemanaEntrega(entrega.semana) === semana
      )
    );
  }

  async function criarNovaSemanaProjeto(projeto: Projeto) {
    if (!podeEditarProjeto(usuarioLogado, projeto) || criandoSemanaProjeto) {
      return;
    }

    try {
      setCriandoSemanaProjeto(true);
      const criada = await criarProximaSemanaProjetoBanco(
        projeto.ID,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!criada) {
        alert("Não consegui criar a próxima semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      setSemanaFiltroProducao(criada.semana);
      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        criada.semana
      );
      alert(`${labelSemana(criada.semana)} criada com sucesso.`);
    } finally {
      setCriandoSemanaProjeto(false);
    }
  }

  async function concluirSemanaAtualProjeto(projeto: Projeto) {
    const semana = semanasProjeto.find(
      (item) => item.semana === semanaFiltroProducao
    );

    if (!semana) {
      alert("Crie uma semana antes de concluí-la.");
      return;
    }

    if (semana.status === "concluida") {
      alert("Esta semana já está concluída.");
      return;
    }

    const confirmar = window.confirm(
      `Concluir ${labelSemana(semanaFiltroProducao)}? Depois de concluída, os participantes desta semana ficam preservados como histórico.`
    );

    if (!confirmar) return;

    setLiberandoSemana(true);

    try {
      const ok = await fecharSemanaProjetoBanco(
        projeto.ID,
        semanaFiltroProducao,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui concluir esta semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      alert(`${labelSemana(semanaFiltroProducao)} concluída.`);
    } finally {
      setLiberandoSemana(false);
    }
  }

  async function adicionarParticipanteNaSemana(
    projeto: Projeto,
    item: ElencoItem
  ) {
    if (!item.id || !item.dublador?.trim()) {
      alert("Defina um dublador antes de adicionar este personagem à semana.");
      return;
    }

    try {
      setAlterandoParticipanteSemana(true);
      const ok = await adicionarElencoSemanaBanco(
        projeto.ID,
        semanaFiltroProducao,
        item.id,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui adicionar este dublador à semana.");
        return;
      }

      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaFiltroProducao
      );
    } finally {
      setAlterandoParticipanteSemana(false);
    }
  }

  async function removerParticipanteDaSemana(
    projeto: Projeto,
    participante: ParticipanteSemanaProjeto
  ) {
    const confirmar = window.confirm(
      `Remover ${participante.personagem} — ${participante.dublador} somente da ${labelSemana(
        semanaFiltroProducao
      )}? O Banco do Projeto e as semanas anteriores não serão alterados.`
    );

    if (!confirmar) return;

    try {
      setAlterandoParticipanteSemana(true);
      const ok = await removerElencoSemanaBanco(
        projeto.ID,
        semanaFiltroProducao,
        participante.elenco_id
      );

      if (!ok) {
        alert("Não consegui remover este participante da semana.");
        return;
      }

      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaFiltroProducao
      );
    } finally {
      setAlterandoParticipanteSemana(false);
    }
  }

  async function reabrirPapelProjeto(item: ElencoItem) {
    if (!projetoPainel || !item.id || reabrindoPapelId) return;

    const confirmar = window.confirm(
      `Reabrir o papel de ${item.personagem}? ${item.dublador || "O dublador atual"} deixará de ser a escalação ativa, mas continuará registrado(a) nas semanas anteriores.`
    );

    if (!confirmar) return;

    try {
      setReabrindoPapelId(String(item.id));
      const novoId = await reabrirPapelProjetoBanco(
        projetoPainel.ID,
        item.id,
        `Papel reaberto por ${
          usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
        }.`
      );

      if (!novoId) {
        alert("Não consegui reabrir este papel.");
        return;
      }

      await recarregarProjetos();
      alert(
        `${item.personagem} foi reaberto. As semanas anteriores continuam com ${item.dublador || "a escalação anterior"}.`
      );
    } finally {
      setReabrindoPapelId(null);
    }
  }

  async function verificarLiberacaoAutomaticaSemana(
    projeto: Projeto,
    entregas: EntregaProducao[]
  ) {
    const semanas = await carregarSemanasProjeto(projeto);
    const aberta =
      semanas.find((item) => item.status === "aberta") ||
      semanas[semanas.length - 1];

    if (!aberta) return;

    const semanaAtual = aberta.semana || 1;
    const participantes = await carregarParticipantesSemanaBanco(
      projeto.ID,
      semanaAtual
    );

    if (!todosEntregaramSemana(participantes, entregas, semanaAtual)) {
      return;
    }

    const confirmar = window.confirm(
      `Todos os participantes da ${labelSemana(
        semanaAtual
      )} entregaram. Deseja concluir esta semana? A próxima semana será criada somente quando você clicar em "Criar Semana".`
    );

    if (!confirmar) return;

    setLiberandoSemana(true);

    try {
      const ok = await fecharSemanaProjetoBanco(
        projeto.ID,
        semanaAtual,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui concluir a semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      alert(`${labelSemana(semanaAtual)} concluída.`);
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

  async function enviarLembretesWhatsappPendentes(projeto: Projeto) {
    if (usuarioLogado?.cargo !== "diretoria") {
      alert("Somente a Diretoria pode enviar lembretes pelo WhatsApp.");
      return;
    }

    if (enviandoLembretesWhatsapp) return;

    let participantes = await carregarParticipantesSemanaBanco(
      projeto.ID,
      semanaFiltroProducao
    );

    // Compatibilidade com projetos que já existiam antes do novo modelo
    // Banco do Projeto + participantes por semana.
    // Se a semana ainda não tiver ninguém vinculado, oferecemos migrar
    // os dubladores ativos do Banco do Projeto para ESTA semana.
    if (!participantes.length) {
      const elencoAtivo = (projeto.Elenco || []).filter(
        (item) =>
          Boolean(item.id) &&
          Boolean(item.personagem?.trim()) &&
          Boolean(item.dublador?.trim())
      );

      if (!elencoAtivo.length) {
        alert(
          `${labelSemana(
            semanaFiltroProducao
          )} ainda não tem participantes e o Banco do Projeto não possui dubladores escalados para adicionar.`
        );
        return;
      }

      const migrar = window.confirm(
        `${labelSemana(
          semanaFiltroProducao
        )} ainda não tem participantes vinculados.\n\nDeseja adicionar os ${elencoAtivo.length} dublador(es) atualmente escalados no Banco do Projeto a esta semana e continuar com o envio dos pendentes?`
      );

      if (!migrar) return;

      setEnviandoLembretesWhatsapp(true);

      try {
        let adicionados = 0;
        const falhasMigracao: string[] = [];

        for (const item of elencoAtivo) {
          const ok = await adicionarElencoSemanaBanco(
            projeto.ID,
            semanaFiltroProducao,
            item.id!,
            usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
          );

          if (ok) {
            adicionados += 1;
          } else {
            falhasMigracao.push(
              `${item.personagem} — ${item.dublador}`
            );
          }
        }

        participantes = await carregarParticipantesSemanaBanco(
          projeto.ID,
          semanaFiltroProducao
        );

        setParticipantesSemanaProjeto(participantes);

        if (!participantes.length) {
          alert(
            "Não consegui vincular nenhum dublador a esta semana. O envio foi cancelado."
          );
          return;
        }

        if (falhasMigracao.length) {
          alert(
            `${adicionados} participante(s) foram vinculados à semana.\n\nNão consegui vincular: ${falhasMigracao
              .slice(0, 6)
              .join(", ")}.\n\nO envio continuará apenas para os participantes vinculados com sucesso.`
          );
        }
      } finally {
        setEnviandoLembretesWhatsapp(false);
      }
    }

    const elenco = participantes.filter(
      (item) =>
        Boolean(item.personagem?.trim()) &&
        Boolean(item.dublador?.trim())
    );

    if (!elenco.length) {
      alert(
        `Nenhum dublador válido foi encontrado na ${labelSemana(
          semanaFiltroProducao
        )}.`
      );
      return;
    }

    const entregasSemana = entregasProducao.filter(
      (entrega) =>
        numeroSemanaEntrega(entrega.semana) === semanaFiltroProducao
    );

    const pendentes = elenco.filter(
      (item) =>
        !entregasSemana.some(
          (entrega) =>
            normalizar(entrega.personagem) ===
            normalizar(item.personagem)
        )
    );

    if (!pendentes.length) {
      alert(`Não há pendências na ${labelSemana(semanaFiltroProducao)}.`);
      return;
    }

    const comTelefone = pendentes.filter((item) =>
      Boolean(item.telefone_dublador?.trim())
    );

    const semTelefone = pendentes.filter(
      (item) => !item.telefone_dublador?.trim()
    );

    if (!comTelefone.length) {
      alert(
        `Há ${pendentes.length} pendência(s), mas nenhum dublador pendente tem telefone cadastrado para esta semana.`
      );
      return;
    }

    const avisoSemTelefone = semTelefone.length
      ? `\n\n${semTelefone.length} pendente(s) sem telefone será(ão) ignorado(s).`
      : "";

    const confirmar = window.confirm(
      `Enviar lembrete pelo WhatsApp para ${comTelefone.length} pendente(s) de ${projeto.Projeto} — ${labelSemana(
        semanaFiltroProducao
      )}?${avisoSemTelefone}\n\nSomente os participantes cadastrados nesta semana serão cobrados.`
    );

    if (!confirmar) return;

    setEnviandoLembretesWhatsapp(true);

    let enfileirados = 0;
    let duplicados = 0;
    const falhas: string[] = [];

    try {
      for (const item of comTelefone) {
        const mensagem = [
          `Olá, ${item.dublador}! 🎙️`,
          "",
          `Passando para lembrar da sua entrega de ${item.personagem} no projeto ${projeto.Projeto}.`,
          `${labelSemana(semanaFiltroProducao)}.`,
          "",
          "Caso você já tenha realizado a entrega, desconsidere esta mensagem.",
          "",
          "— DubWorks",
        ].join("\n");

        try {
          const resultado = await enfileirarLembreteWhatsapp({
            projetoId: projeto.ID,
            semana: semanaFiltroProducao,
            personagem: item.personagem,
            dublador: item.dublador,
            telefone: item.telefone_dublador || "",
            mensagem,
            tipoLembrete: "manual",
          });

          if (resultado.duplicado) {
            duplicados += 1;
          } else if (resultado.ok) {
            enfileirados += 1;
          } else {
            falhas.push(
              `${item.dublador} — ${item.personagem}: ${
                resultado.mensagem || "erro desconhecido"
              }`
            );
          }
        } catch (err: any) {
          falhas.push(
            `${item.dublador} — ${item.personagem}: ${
              err?.message || String(err)
            }`
          );
        }
      }

      const resumo = [
        `Lembretes processados para ${projeto.Projeto}.`,
        "",
        `Na fila para envio: ${enfileirados}`,
        `Já enviados/enfileirados hoje: ${duplicados}`,
        `Sem telefone: ${semTelefone.length}`,
        `Falhas: ${falhas.length}`,
      ];

      if (falhas.length) {
        resumo.push("", "Falhas:", ...falhas.slice(0, 6));
      }

      resumo.push(
        "",
        "O agente do WhatsApp enviará as mensagens automaticamente."
      );

      alert(resumo.join("\n"));
    } finally {
      setEnviandoLembretesWhatsapp(false);
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

  function iniciaisChat(nome?: string) {
    const partes = String(nome || "U").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "U";
    if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
    return `${partes[0][0] || ""}${partes[partes.length - 1][0] || ""}`
      .toUpperCase()
      .slice(0, 2);
  }

  function formatarHoraChat(valor?: string | null) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatarDataChat(valor?: string | null) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";
    const hoje = new Date();

    if (
      data.getDate() === hoje.getDate() &&
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    ) {
      return "Hoje";
    }

    return data.toLocaleDateString("pt-BR");
  }

  function usuarioPorReferenciaChat(referencia?: string | null) {
    const alvo = normalizar(referencia || "");
    if (!alvo) return null;

    return (
      usuarios.find((usuario) =>
        [usuario.login, usuario.nome, usuario.vinculo].some(
          (valor) => Boolean(valor) && normalizar(valor || "") === alvo
        )
      ) || null
    );
  }

  function canalChatPermitido(
    canal: ChatCanal,
    participantes: ChatParticipante[] = participantesChat
  ) {
    if (!usuarioLogado) return false;

    if (canal.tipo === "geral") return true;

    if (canal.tipo === "diretoria") {
      return usuarioLogado.cargo === "diretoria";
    }

    if (canal.tipo === "lideres") {
      return ["diretoria", "lider", "lider_treinamento"].includes(
        usuarioLogado.cargo
      );
    }

    if (canal.tipo === "projeto") {
      return projetosVisiveis.some(
        (projeto) => Number(projeto.ID) === Number(canal.projeto_id)
      );
    }

    if (canal.tipo === "direta") {
      const loginAtual = normalizar(usuarioLogado.login);
      return participantes.some(
        (participante) =>
          participante.canal_id === canal.id &&
          normalizar(participante.usuario_login) === loginAtual
      );
    }

    return false;
  }

  function nomeCanalChat(canal?: ChatCanal | null) {
    if (!canal) return "Chat da equipe";
    if (canal.tipo !== "direta") return canal.nome || "Canal";

    const loginAtual = normalizar(usuarioLogado?.login);

    const outros = participantesChat
      .filter(
        (participante) =>
          participante.canal_id === canal.id &&
          normalizar(participante.usuario_login) !== loginAtual
      )
      .map((participante) => {
        const perfil =
          usuarios.find(
            (usuario) =>
              normalizar(usuario.login) ===
              normalizar(participante.usuario_login)
          ) || null;

        return perfil?.nome || participante.usuario_login || "Usuário";
      });

    if (!outros.length) return "Conversa direta";
    if (outros.length <= 3) return outros.join(", ");

    return `${outros.slice(0, 2).join(", ")} +${outros.length - 2}`;
  }

  async function recarregarEstruturaChat(preferirCanalId?: string | null) {
    if (!usuarioLogado) return;

    const [canais, participantes] = await Promise.all([
      carregarCanaisChat(),
      carregarParticipantesChat(),
    ]);

    setCanaisChat(canais);
    setParticipantesChat(participantes);

    const permitidos = canais.filter((canal) =>
      canalChatPermitido(canal, participantes)
    );

    const escolhido =
      (preferirCanalId &&
        permitidos.find((canal) => canal.id === preferirCanalId)) ||
      (canalChatAtivoId &&
        permitidos.find((canal) => canal.id === canalChatAtivoId)) ||
      permitidos.find((canal) => canal.tipo === "geral") ||
      permitidos[0] ||
      null;

    setCanalChatAtivoId(escolhido?.id || null);
  }

  async function abrirCanalProjetoChat(projeto: Projeto) {
    if (!usuarioLogado) return;

    setErroChat("");

    let canal =
      canaisChat.find(
        (item) =>
          item.tipo === "projeto" &&
          Number(item.projeto_id) === Number(projeto.ID)
      ) || null;

    if (!canal) {
      canal = await garantirCanalProjeto(
        projeto.ID,
        projeto.Projeto || `Projeto ${projeto.ID}`,
        usuarioLogado.login || usuarioLogado.nome || "Sistema"
      );
    }

    if (!canal) {
      setErroChat("Não consegui abrir o canal deste projeto.");
      return;
    }

    await recarregarEstruturaChat(canal.id);
  }

  async function abrirConversaDiretaChat(outroUsuario: Usuario) {
    if (!usuarioLogado) return;

    setErroChat("");

    const canal = await abrirConversaDireta(usuarioLogado, outroUsuario);

    if (!canal) {
      setErroChat("Não consegui abrir a conversa direta.");
      return;
    }

    await recarregarEstruturaChat(canal.id);
  }

  function abrirAdicionarPessoasChat() {
    if (!canalChatAtivoId) return;

    setBuscaPessoasChat("");
    setPessoasSelecionadasChat([]);
    setMostrarAdicionarPessoasChat(true);
  }

  async function confirmarAdicionarPessoasChat() {
    if (
      !canalChatAtivoId ||
      !pessoasSelecionadasChat.length ||
      adicionandoPessoasChat
    ) {
      return;
    }

    try {
      setAdicionandoPessoasChat(true);
      setErroChat("");

      const ok = await adicionarParticipantesChat(
        canalChatAtivoId,
        pessoasSelecionadasChat
      );

      if (!ok) {
        setErroChat("Não consegui adicionar as pessoas à conversa.");
        return;
      }

      await recarregarEstruturaChat(canalChatAtivoId);
      setMostrarAdicionarPessoasChat(false);
      setPessoasSelecionadasChat([]);
      setBuscaPessoasChat("");
    } finally {
      setAdicionandoPessoasChat(false);
    }
  }

  function responderMensagemChat(mensagem: ChatMensagem) {
    if (mensagem.excluido_em) return;

    setMensagemRespondendoChat(mensagem);

    window.setTimeout(() => {
      document.getElementById("dubworks-chat-composer")?.focus();
    }, 20);
  }

  function extrairLoginsMencionadosTextoChat(textoMensagem: string) {
    const textoNormalizado = String(textoMensagem || "").toLocaleLowerCase(
      "pt-BR"
    );

    return Array.from(
      new Set(
        usuarios
          .filter((usuario) => {
            const login = normalizar(usuario.login);
            const nome = String(usuario.nome || "")
              .trim()
              .toLocaleLowerCase("pt-BR");

            if (!login) return false;

            return (
              textoNormalizado.includes(`@${login}`) ||
              (nome && textoNormalizado.includes(`@${nome}`))
            );
          })
          .map((usuario) => normalizar(usuario.login))
          .filter(
            (login) =>
              Boolean(login) &&
              login !== normalizar(usuarioLogado?.login)
          )
      )
    );
  }

  function iniciarEdicaoMensagemChat(mensagem: ChatMensagem) {
    if (mensagem.excluido_em) return;

    setMenuMensagemAbertoId(null);
    setMensagemEditandoChat(mensagem);
    setTextoEdicaoMensagemChat(mensagem.mensagem || "");

    window.setTimeout(() => {
      document
        .getElementById(`chat-editar-${mensagem.id}`)
        ?.focus();
    }, 20);
  }

  function cancelarEdicaoMensagemChat() {
    setMensagemEditandoChat(null);
    setTextoEdicaoMensagemChat("");
    setSalvandoEdicaoMensagemChat(false);
  }

  async function salvarEdicaoMensagemChatAtual() {
    if (
      !usuarioLogado ||
      !mensagemEditandoChat ||
      salvandoEdicaoMensagemChat
    ) {
      return;
    }

    const novoTexto = textoEdicaoMensagemChat.trim();

    if (!novoTexto) {
      alert("A mensagem não pode ficar vazia.");
      return;
    }

    try {
      setSalvandoEdicaoMensagemChat(true);
      setErroChat("");

      const atualizada = await editarMensagemChat(
        mensagemEditandoChat.id,
        usuarioLogado,
        novoTexto
      );

      if (!atualizada) {
        setErroChat("Não consegui editar a mensagem.");
        return;
      }

      const mencoes = extrairLoginsMencionadosTextoChat(novoTexto);

      const mencoesOk = await substituirMencoesMensagem(
        atualizada.id,
        mencoes
      );

      if (!mencoesOk) {
        console.warn(
          "A mensagem foi editada, mas não consegui atualizar todas as menções."
        );
      }

      setMensagensChat((anteriores) =>
        anteriores.map((item) =>
          item.id === atualizada.id ? atualizada : item
        )
      );

      cancelarEdicaoMensagemChat();
    } finally {
      setSalvandoEdicaoMensagemChat(false);
    }
  }

  async function excluirMensagemChatAtual(mensagem: ChatMensagem) {
    if (!usuarioLogado || mensagem.excluido_em) return;

    const confirmar = window.confirm(
      "Excluir esta mensagem? Os anexos desta mensagem também serão removidos."
    );

    if (!confirmar) return;

    setMenuMensagemAbertoId(null);
    setErroChat("");

    const excluida = await excluirMensagemChat(
      mensagem.id,
      usuarioLogado
    );

    if (!excluida) {
      setErroChat("Não consegui excluir a mensagem.");
      return;
    }

    setMensagensChat((anteriores) =>
      anteriores.map((item) =>
        item.id === excluida.id ? excluida : item
      )
    );

    setAnexosChat((anteriores) =>
      anteriores.filter(
        (anexo) => anexo.mensagem_id !== mensagem.id
      )
    );

    if (mensagemRespondendoChat?.id === mensagem.id) {
      setMensagemRespondendoChat(null);
    }

    if (mensagemEditandoChat?.id === mensagem.id) {
      cancelarEdicaoMensagemChat();
    }
  }

  async function alternarSilenciarCanalChat() {
    if (
      !usuarioLogado?.login ||
      !canalChatAtivoId ||
      alterandoSilencioChat
    ) {
      return;
    }

    const preferenciaAtual = preferenciasChat.find(
      (item) => item.canal_id === canalChatAtivoId
    );

    const novoValor = !Boolean(preferenciaAtual?.silenciado);

    try {
      setAlterandoSilencioChat(true);

      const ok = await definirChatSilenciado(
        canalChatAtivoId,
        usuarioLogado.login,
        novoValor
      );

      if (!ok) {
        setErroChat("Não consegui alterar as notificações deste chat.");
        return;
      }

      setPreferenciasChat((anteriores) => {
        const agora = new Date().toISOString();
        const existe = anteriores.some(
          (item) => item.canal_id === canalChatAtivoId
        );

        if (existe) {
          return anteriores.map((item) =>
            item.canal_id === canalChatAtivoId
              ? {
                  ...item,
                  silenciado: novoValor,
                  updated_at: agora,
                }
              : item
          );
        }

        return [
          ...anteriores,
          {
            canal_id: canalChatAtivoId,
            usuario_login: usuarioLogado.login,
            silenciado: novoValor,
            updated_at: agora,
          },
        ];
      });
    } finally {
      setAlterandoSilencioChat(false);
    }
  }

  function selecionarMencaoChat(usuario: Usuario) {
    const nomeExibicao = String(usuario.nome || usuario.login || "").trim();
    const loginUsuario = normalizar(usuario.login);

    if (!nomeExibicao || !loginUsuario) return;

    setMensagemChat((atual) =>
      atual.replace(
        /(^|\s)@([^\s@]*)$/,
        (_trecho, prefixo: string) => `${prefixo}@${nomeExibicao} `
      )
    );

    setMencoesPendentesChat((anteriores) =>
      anteriores.some(
        (item) => normalizar(item.login) === loginUsuario
      )
        ? anteriores
        : [
            ...anteriores,
            {
              login: usuario.login,
              nome: nomeExibicao,
            },
          ]
    );

    window.setTimeout(() => {
      document.getElementById("dubworks-chat-composer")?.focus();
    }, 20);
  }

  function atualizarTextoMensagemChat(novoTexto: string) {
    setMensagemChat(novoTexto);

    setMencoesPendentesChat((anteriores) =>
      anteriores.filter((mencao) =>
        novoTexto
          .toLocaleLowerCase("pt-BR")
          .includes(`@${mencao.nome.toLocaleLowerCase("pt-BR")}`)
      )
    );
  }

  const quantidadeNotificacoesNaoLidas = notificacoesChat.filter(
    (notificacao) => !notificacao.lida
  ).length;

  function atualizarNotificacaoLocal(notificacaoAtualizada: NotificacaoChat) {
    setNotificacoesChat((anteriores) => {
      const existe = anteriores.some(
        (item) => item.id === notificacaoAtualizada.id
      );

      if (!existe) {
        return [notificacaoAtualizada, ...anteriores]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 100);
      }

      return anteriores
        .map((item) =>
          item.id === notificacaoAtualizada.id
            ? notificacaoAtualizada
            : item
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    });
  }

  async function abrirNotificacaoChat(notificacao: NotificacaoChat) {
    setMostrarNotificacoesChat(false);
    setToastNotificacaoChat(null);

    if (!notificacao.lida) {
      const ok = await marcarNotificacaoComoLida(notificacao.id);

      if (ok) {
        atualizarNotificacaoLocal({
          ...notificacao,
          lida: true,
          lida_em: new Date().toISOString(),
        });
      }
    }

    if (!notificacao.canal_id) return;

    setMostrarFerramentas(true);
    setCategoriaFerramentas("chat");
    setMostrarTreinamentos(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setMostrarFormNovoUsuario(false);
    setMenuMobileAberto(false);

    setCanalChatAtivoId(notificacao.canal_id);

    if (notificacao.mensagem_id) {
      setMensagemChatDestacadaId(notificacao.mensagem_id);

      if (timerFocoNotificacaoRef.current) {
        window.clearTimeout(timerFocoNotificacaoRef.current);
      }

      timerFocoNotificacaoRef.current = window.setTimeout(() => {
        document
          .getElementById(
            `chat-mensagem-${notificacao.mensagem_id}`
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

        timerFocoNotificacaoRef.current = window.setTimeout(() => {
          setMensagemChatDestacadaId(null);
        }, 2600);
      }, 650);
    }
  }

  async function marcarTodasNotificacoesLidasAtual() {
    if (!usuarioLogado?.login || !quantidadeNotificacoesNaoLidas) return;

    const ok = await marcarTodasNotificacoesComoLidas(usuarioLogado.login);

    if (!ok) return;

    const agora = new Date().toISOString();

    setNotificacoesChat((anteriores) =>
      anteriores.map((item) => ({
        ...item,
        lida: true,
        lida_em: item.lida_em || agora,
      }))
    );
  }

  function formatarTamanhoAnexoChat(bytes?: number) {
    const tamanho = Number(bytes || 0);

    if (tamanho < 1024) return `${tamanho} B`;
    if (tamanho < 1024 * 1024) {
      return `${(tamanho / 1024).toFixed(1)} KB`;
    }

    return `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
  }

  function selecionarArquivosChat(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const novos = Array.from(event.target.files || []);
    event.target.value = "";

    if (!novos.length) return;

    const combinado = [...arquivosChatSelecionados, ...novos];

    if (combinado.length > 5) {
      alert("Você pode anexar no máximo 5 arquivos por mensagem.");
      return;
    }

    const acimaDoLimite = combinado.find(
      (arquivo) => arquivo.size > 25 * 1024 * 1024
    );

    if (acimaDoLimite) {
      alert(
        `${acimaDoLimite.name} ultrapassa o limite de 25 MB por arquivo.`
      );
      return;
    }

    const total = combinado.reduce(
      (soma, arquivo) => soma + arquivo.size,
      0
    );

    if (total > 50 * 1024 * 1024) {
      alert("Os anexos da mensagem não podem ultrapassar 50 MB no total.");
      return;
    }

    setArquivosChatSelecionados(combinado);
  }

  function removerArquivoChatSelecionado(indice: number) {
    setArquivosChatSelecionados((anteriores) =>
      anteriores.filter((_, index) => index !== indice)
    );
  }

  async function enviarMensagemChatAtual() {
    const temTexto = Boolean(mensagemChat.trim());
    const temAnexo = arquivosChatSelecionados.length > 0;

    if (
      !usuarioLogado ||
      !canalChatAtivoId ||
      (!temTexto && !temAnexo) ||
      enviandoMensagemChat ||
      enviandoAnexosChat
    ) {
      return;
    }

    const arquivosParaEnviar = [...arquivosChatSelecionados];

    const textoMensagem =
      mensagemChat.trim() ||
      (arquivosParaEnviar.length === 1
        ? "📎 Enviou um anexo."
        : `📎 Enviou ${arquivosParaEnviar.length} anexos.`);
    const loginsMencionados = Array.from(
      new Set([
        ...mencoesPendentesChat
          .map((mencao) => normalizar(mencao.login))
          .filter(Boolean),
        ...extrairLoginsMencionadosTextoChat(textoMensagem),
      ])
    ).filter(
      (loginMencionado) =>
        Boolean(loginMencionado) &&
        loginMencionado !== normalizar(usuarioLogado.login)
    );

    try {
      setEnviandoMensagemChat(true);
      setErroChat("");

      const enviada = await enviarMensagemChat(
        canalChatAtivoId,
        usuarioLogado,
        textoMensagem,
        mensagemRespondendoChat?.id || null
      );

      if (!enviada) {
        setErroChat("Não consegui enviar a mensagem.");
        return;
      }

      if (loginsMencionados.length) {
        const mencoesOk = await salvarMencoesMensagem(
          enviada.id,
          loginsMencionados
        );

        if (!mencoesOk) {
          console.warn(
            "A mensagem foi enviada, mas não foi possível registrar todas as menções."
          );
        }
      }

      if (arquivosParaEnviar.length) {
        try {
          setEnviandoAnexosChat(true);

          const anexosEnviados = await enviarAnexosChat(
            enviada.id,
            canalChatAtivoId,
            usuarioLogado,
            arquivosParaEnviar
          );

          setAnexosChat((anteriores) => {
            const mapa = new Map<number, ChatAnexo>();

            [...anteriores, ...anexosEnviados].forEach((anexo) => {
              mapa.set(anexo.id, anexo);
            });

            return Array.from(mapa.values()).sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });

          setArquivosChatSelecionados([]);
        } catch (erro) {
          console.error("Erro ao enviar anexos:", erro);

          setErroChat(
            erro instanceof Error
              ? `A mensagem foi enviada, mas o anexo falhou: ${erro.message}`
              : "A mensagem foi enviada, mas não consegui enviar o anexo."
          );
        } finally {
          setEnviandoAnexosChat(false);
        }
      }

      setMensagemChat("");
      setMencoesPendentesChat([]);
      setMensagemRespondendoChat(null);

      setMensagensChat((anteriores) =>
        anteriores.some((item) => item.id === enviada.id)
          ? anteriores
          : [...anteriores, enviada]
      );

      await marcarCanalComoLido(canalChatAtivoId, usuarioLogado.login);
    } finally {
      setEnviandoMensagemChat(false);
    }
  }

  useEffect(() => {
    if (categoriaFerramentas !== "chat" || !usuarioLogado) return;

    let cancelado = false;

    async function iniciarChat() {
      try {
        setCarregandoChat(true);
        setErroChat("");

        const [canais, participantes] = await Promise.all([
          carregarCanaisChat(),
          carregarParticipantesChat(),
        ]);

        if (cancelado) return;

        setCanaisChat(canais);
        setParticipantesChat(participantes);

        const permitidos = canais.filter((canal) =>
          canalChatPermitido(canal, participantes)
        );

        setCanalChatAtivoId((atual) => {
          if (atual && permitidos.some((canal) => canal.id === atual)) {
            return atual;
          }

          return (
            permitidos.find((canal) => canal.tipo === "geral")?.id ||
            permitidos[0]?.id ||
            null
          );
        });
      } catch (erro) {
        console.error("Erro ao iniciar chat:", erro);
        if (!cancelado) {
          setErroChat(
            "Não consegui carregar o chat. Confira as tabelas do chat no Supabase."
          );
        }
      } finally {
        if (!cancelado) setCarregandoChat(false);
      }
    }

    iniciarChat();

    return () => {
      cancelado = true;
    };
  }, [
    categoriaFerramentas,
    usuarioLogado?.login,
    usuarioLogado?.cargo,
    projetosVisiveis,
  ]);

  useEffect(() => {
    if (
      categoriaFerramentas !== "chat" ||
      !canalChatAtivoId ||
      !usuarioLogado
    ) {
      return;
    }

    let cancelado = false;

    async function carregarCanal() {
      try {
        setCarregandoMensagensChat(true);
        setErroChat("");

        const [mensagens, anexos] = await Promise.all([
          carregarMensagensChat(canalChatAtivoId, 150),
          carregarAnexosChat(canalChatAtivoId),
        ]);

        if (cancelado) return;

        setMensagensChat(mensagens);
        setAnexosChat(anexos);
        setMensagemRespondendoChat(null);
        setMensagemEditandoChat(null);
        setTextoEdicaoMensagemChat("");
        setMenuMensagemAbertoId(null);
        setMencoesPendentesChat([]);
        setArquivosChatSelecionados([]);
        await marcarCanalComoLido(canalChatAtivoId, usuarioLogado.login);
      } catch (erro) {
        console.error("Erro ao carregar mensagens do chat:", erro);
        if (!cancelado) {
          setErroChat("Não consegui carregar as mensagens deste canal.");
        }
      } finally {
        if (!cancelado) setCarregandoMensagensChat(false);
      }
    }

    carregarCanal();

    const cancelarRealtime = assinarMensagensChat(
      canalChatAtivoId,
      (novaMensagem) => {
        if (cancelado) return;

        setMensagensChat((anteriores) =>
          anteriores.some((item) => item.id === novaMensagem.id)
            ? anteriores.map((item) =>
                item.id === novaMensagem.id ? novaMensagem : item
              )
            : [...anteriores, novaMensagem]
        );

        if (novaMensagem.excluido_em) {
          setAnexosChat((anteriores) =>
            anteriores.filter(
              (anexo) => anexo.mensagem_id !== novaMensagem.id
            )
          );
        }

        void marcarCanalComoLido(canalChatAtivoId, usuarioLogado.login);
      }
    );

    const cancelarRealtimeAnexos = assinarAnexosChat(
      canalChatAtivoId,
      (novoAnexo) => {
        if (cancelado) return;

        setAnexosChat((anteriores) =>
          anteriores.some((item) => item.id === novoAnexo.id)
            ? anteriores.map((item) =>
                item.id === novoAnexo.id ? novoAnexo : item
              )
            : [...anteriores, novoAnexo]
        );
      }
    );

    return () => {
      cancelado = true;
      cancelarRealtime();
      cancelarRealtimeAnexos();
    };
  }, [
    categoriaFerramentas,
    canalChatAtivoId,
    usuarioLogado?.login,
  ]);

  useEffect(() => {
    if (categoriaFerramentas !== "chat" || !canalChatAtivoId) return;

    // Quando o usuário abriu uma notificação, não joga a tela para o fim
    // antes de tentar localizar a mensagem destacada.
    if (mensagemChatDestacadaId) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById("dubworks-chat-fim")
        ?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [
    categoriaFerramentas,
    canalChatAtivoId,
    mensagensChat.length,
    mensagemChatDestacadaId,
  ]);

  useEffect(() => {
    const loginAtual = normalizar(usuarioLogado?.login);

    if (!loginAtual) {
      setNotificacoesChat([]);
      return;
    }

    let cancelado = false;

    async function iniciarNotificacoes() {
      try {
        setCarregandoNotificacoesChat(true);

        const lista = await carregarNotificacoes(loginAtual, 100);

        if (cancelado) return;

        setNotificacoesChat(lista);
      } catch (erro) {
        console.error("Erro ao iniciar notificações do chat:", erro);
      } finally {
        if (!cancelado) {
          setCarregandoNotificacoesChat(false);
        }
      }
    }

    iniciarNotificacoes();

    const cancelarRealtime = assinarNotificacoes(
      loginAtual,
      (notificacao) => {
        if (cancelado) return;

        atualizarNotificacaoLocal(notificacao);

        // A menção é criada logo após a mensagem. Um pequeno atraso permite
        // que o UPDATE de "mensagem" -> "mencao" chegue antes do toast.
        if (!notificacao.lida) {
          if (timerToastNotificacaoRef.current) {
            window.clearTimeout(timerToastNotificacaoRef.current);
          }

          timerToastNotificacaoRef.current = window.setTimeout(async () => {
            if (cancelado) return;

            const listaAtualizada = await carregarNotificacoes(
              loginAtual,
              100
            );

            if (cancelado) return;

            setNotificacoesChat(listaAtualizada);

            const maisAtual =
              listaAtualizada.find(
                (item) => item.id === notificacao.id
              ) || notificacao;

            if (!maisAtual.lida) {
              setToastNotificacaoChat(maisAtual);
            }
          }, 320);
        }
      }
    );

    return () => {
      cancelado = true;
      cancelarRealtime();

      if (timerToastNotificacaoRef.current) {
        window.clearTimeout(timerToastNotificacaoRef.current);
        timerToastNotificacaoRef.current = null;
      }
    };
  }, [usuarioLogado?.login]);

  useEffect(() => {
    if (!toastNotificacaoChat) return;

    const timer = window.setTimeout(() => {
      setToastNotificacaoChat(null);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [toastNotificacaoChat?.id, toastNotificacaoChat?.tipo]);

  useEffect(() => {
    return () => {
      if (timerFocoNotificacaoRef.current) {
        window.clearTimeout(timerFocoNotificacaoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loginAtual = normalizar(usuarioLogado?.login);

    if (!loginAtual) {
      setPreferenciasChat([]);
      return;
    }

    let cancelado = false;

    carregarPreferenciasChat(loginAtual)
      .then((lista) => {
        if (!cancelado) {
          setPreferenciasChat(lista);
        }
      })
      .catch((erro) => {
        console.error(
          "Erro ao carregar preferências de chat:",
          erro
        );
      });

    return () => {
      cancelado = true;
    };
  }, [usuarioLogado?.login]);

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


  const projetoPainel = selecionado || null;

  const estatisticasCards = useMemo(() => {
    const baseProjetos = projetoPainel ? [projetoPainel] : projetosVisiveis;

    const contarRegistros = (projeto: Projeto) =>
      (projeto.Registro_Semanal || "")
        .split("\n\n")
        .map((item) => item.trim())
        .filter(Boolean).length;

    const progressoPorStatus = (status?: string) => {
      const valor = normalizar(status || "");

      if (valor.includes("final")) return 100;
      if (valor.includes("edi")) return 85;
      if (valor.includes("andamento")) return 60;
      if (valor.includes("sele")) return 35;
      if (valor.includes("aguard")) return 15;
      if (valor.includes("paus") || valor.includes("stand")) return 50;
      return 10;
    };

    const membrosElenco = baseProjetos.reduce(
      (total, projeto) =>
        total +
        (projeto.Elenco || []).filter((item) =>
          Boolean(item.dublador?.trim())
        ).length,
      0
    );

    const videosTestes = baseProjetos.reduce((total, projeto) => {
      const resumo =
        resumoMidiasPorProjeto[String(projeto.ID)] || {
          entregas: 0,
          testes: 0,
        };

      if (projetoPainel && String(projeto.ID) === String(projetoPainel.ID)) {
        return (
          total +
          Math.max(resumo.testes, respostasSelecao.length) +
          Math.max(resumo.entregas, entregasProducao.length)
        );
      }

      return total + resumo.testes + resumo.entregas;
    }, 0);

    const finalizados = baseProjetos.filter((projeto) =>
      normalizar(projeto.Status || "").includes("final")
    ).length;

    const registros = baseProjetos.reduce(
      (total, projeto) => total + contarRegistros(projeto),
      0
    );

    const progresso = baseProjetos.length
      ? Math.round(
          baseProjetos.reduce(
            (total, projeto) =>
              total + progressoPorStatus(projeto.Status),
            0
          ) / baseProjetos.length
        )
      : 0;

    return {
      membrosElenco,
      videosTestes,
      finalizados,
      registros,
      progresso,
    };
  }, [
    projetoPainel,
    projetosVisiveis,
    resumoMidiasPorProjeto,
    respostasSelecao.length,
    entregasProducao.length,
  ]);

  useEffect(() => {
    if (!projetoPainel?.ID) {
      setSemanasProjeto([]);
      setParticipantesSemanaProjeto([]);
      setEntregasProducao([]);
      setRespostasSelecao([]);
      setRespostaSelecaoAtivaId(null);
      setStatusSincronizacaoAutomatica("idle");
      setMensagemSincronizacaoAutomatica("");
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const [entregas, semanas] = await Promise.all([
          carregarEntregasProducaoBanco(projetoPainel.ID),
          carregarSemanasProjetoBanco(projetoPainel.ID),
        ]);

        if (cancelado) return;

        setEntregasProducao(entregas);
        setSemanasProjeto(semanas);

        const semanaPreferida =
          semanas.find((item) => item.status === "aberta") ||
          semanas[semanas.length - 1];

        if (semanaPreferida?.semana) {
          setSemanaFiltroProducao(semanaPreferida.semana);
          await carregarParticipantesSemanaProjetoBancoLocal(
            projetoPainel,
            semanaPreferida.semana
          );
        } else {
          setSemanaFiltroProducao(1);
          setParticipantesSemanaProjeto([]);
        }

        if (!cancelado) {
          await sincronizarProjetoAutomaticamente(projetoPainel);
        }
      } catch (erro) {
        console.error("Erro ao abrir o projeto:", erro);
        if (!cancelado) {
          setStatusSincronizacaoAutomatica("erro");
          setMensagemSincronizacaoAutomatica(
            "Projeto aberto com os últimos dados salvos"
          );
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [projetoPainel?.ID]);

  useEffect(() => {
    if (!projetoPainel?.ID || !semanasProjeto.length) {
      if (!semanasProjeto.length) setParticipantesSemanaProjeto([]);
      return;
    }

    void carregarParticipantesSemanaProjetoBancoLocal(
      projetoPainel,
      semanaFiltroProducao
    );
  }, [projetoPainel?.ID, semanaFiltroProducao]);

  useEffect(() => {
    const ids = projetosVisiveis
      .map((projeto) => Number(projeto.ID))
      .filter((id) => Number.isFinite(id));

    if (!ids.length) {
      setResumoMidiasPorProjeto({});
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const [entregasResultado, selecaoResultado] = await Promise.all([
          supabase
            .from("entregas_producao")
            .select("projeto_id")
            .in("projeto_id", ids),
          supabase
            .from("selecao_avaliacoes")
            .select("projeto_id")
            .in("projeto_id", ids),
        ]);

        if (cancelado) return;

        const resumo: Record<
          string,
          { entregas: number; testes: number }
        > = {};

        ids.forEach((id) => {
          resumo[String(id)] = { entregas: 0, testes: 0 };
        });

        if (!entregasResultado.error) {
          (entregasResultado.data || []).forEach((item: any) => {
            const chave = String(item.projeto_id);
            if (!resumo[chave]) {
              resumo[chave] = { entregas: 0, testes: 0 };
            }
            resumo[chave].entregas += 1;
          });
        }

        if (!selecaoResultado.error) {
          (selecaoResultado.data || []).forEach((item: any) => {
            const chave = String(item.projeto_id);
            if (!resumo[chave]) {
              resumo[chave] = { entregas: 0, testes: 0 };
            }
            resumo[chave].testes += 1;
          });
        }

        setResumoMidiasPorProjeto((anterior) => {
          const combinado = { ...resumo };

          Object.entries(anterior).forEach(([chave, valor]) => {
            if (!combinado[chave]) combinado[chave] = valor;
            else {
              combinado[chave] = {
                entregas: Math.max(
                  combinado[chave].entregas,
                  valor.entregas
                ),
                testes: Math.max(
                  combinado[chave].testes,
                  valor.testes
                ),
              };
            }
          });

          return combinado;
        });
      } catch (erro) {
        console.error("Erro ao carregar resumo das estatísticas:", erro);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [projetosVisiveis]);

  useEffect(() => {
    if (
      !usuarioLogado ||
      !mostrarFerramentas ||
      categoriaFerramentas !== "calendario"
    ) {
      return;
    }

    void carregarAgendaAtual();
  }, [
    usuarioLogado?.login,
    mostrarFerramentas,
    categoriaFerramentas,
  ]);

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
    if (!novoElencoProjeto.personagem.trim()) {
      alert("Preencha o nome do personagem.");
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
      `Retirar ${item.personagem || "este personagem"} do Banco do Projeto? O histórico das semanas anteriores será preservado quando você salvar.`
    );
    if (!confirmar) return;

    const novoElenco = rascunho.Elenco.filter((_, i) => i !== index);

    setRascunho({
      ...rascunho,
      Elenco: novoElenco,
    });
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

  const podeVerAdvertencias =
    usuarioLogado?.cargo === "diretoria" || usuarioLogado?.cargo === "adm";

  function membroDaAdvertencia(advertencia: AdvertenciaPlanilha) {
    return (
      membros.find((membro) =>
        telefonesAdvertenciaEquivalentes(
          membro.telefone,
          advertencia.advertido_telefone
        )
      ) || null
    );
  }

  async function recarregarAdvertencias() {
    if (!podeVerAdvertencias) return;

    try {
      setCarregandoAdvertencias(true);
      setErroAdvertencias("");

      const [listaAdvertencias] = await Promise.all([
        carregarAdvertenciasPlanilha(),
        membros.length ? Promise.resolve(membros) : recarregarMembros(),
      ]);

      setAdvertencias(listaAdvertencias);
    } catch (erro) {
      console.error("Erro ao carregar advertências:", erro);
      setErroAdvertencias(
        erro instanceof Error
          ? erro.message
          : "Não consegui carregar as advertências."
      );
    } finally {
      setCarregandoAdvertencias(false);
    }
  }

  function abrirTelaAdvertencias() {
    if (!podeVerAdvertencias) {
      alert("Seu cargo não possui acesso às advertências.");
      return;
    }

    setMostrarAdvertencias(true);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarTreinamentos(false);
    setMostrarFerramentas(false);
    setMostrarFormNovoUsuario(false);
    setMenuMobileAberto(false);

    void recarregarAdvertencias();
  }

  function abrirTelaTreinamentos() {
    setMostrarTreinamentos(true);
    setMostrarAdvertencias(false);
    setMostrarFerramentas(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setSelecionadoId(null);
    setRascunho(null);
  }

  function abrirTelaFerramentas() {
    setMostrarFerramentas(true);
    setCategoriaFerramentas("inicio");
    setMostrarTreinamentos(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setMostrarFormNovoUsuario(false);
    setMenuMobileAberto(false);
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

  const telaAtual = mostrarFerramentas
    ? "ferramentas"
    : mostrarTreinamentos
    ? "treinamentos"
    : mostrarAdvertencias
    ? "advertencias"
    : mostrarMembros
    ? "membros"
    : mostrarUsuarios
    ? "usuarios"
    : mostrarRelatorios
    ? "relatorios"
    : "projetos";
  const projetoDrive = rascunho || projetoPainel;
  const driveSalvo = extrairLinksDrive(projetoDrive?.Observacoes);

  const observacoesVisiveis = (projetoPainel?.Observacoes || "")
    .replace(/\[\[DRIVE_LINKS\]\][\s\S]*?\[\[\/DRIVE_LINKS\]\]/g, "")
    .trim();

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
                    {campo === "Status" ? (
                      <select
                        value={String((rascunho as any)[campo] || "")}
                        onChange={(e) =>
                          atualizarCampo(
                            campo as keyof Projeto,
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      >
                        <option value="">Selecione o status</option>
                        {!STATUS_PROJETO_OPCOES.includes(
                          String((rascunho as any)[campo] || "")
                        ) &&
                          String((rascunho as any)[campo] || "").trim() && (
                            <option
                              value={String((rascunho as any)[campo] || "")}
                            >
                              {String((rascunho as any)[campo] || "")}
                            </option>
                          )}
                        {STATUS_PROJETO_OPCOES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={String((rascunho as any)[campo] || "")}
                        onChange={(e) =>
                          atualizarCampo(
                            campo as keyof Projeto,
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    )}
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

  const AdvertenciasPage = () => {
    if (!podeVerAdvertencias) {
      return (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>⚠ Advertências</h2>
          <p style={{ color: "#94a3b8", marginBottom: 0 }}>
            Seu cargo não possui acesso a este módulo.
          </p>
        </div>
      );
    }

    const termo = normalizar(queryAdvertencias);

    const listaFiltrada = advertencias.filter((advertencia) => {
      if (!termo) return true;

      const membro = membroDaAdvertencia(advertencia);

      return [
        advertencia.moderador_telefone,
        advertencia.advertido_telefone,
        advertencia.descricao,
        advertencia.valor,
        advertencia.data_ocorrencia,
        advertencia.timestamp,
        membro?.nome || "",
        membro?.email || "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });

    const advertidosUnicos = new Set(
      advertencias
        .map((item) =>
          String(item.advertido_telefone || "").replace(/\D/g, "")
        )
        .filter(Boolean)
    ).size;

    const totalProvas = advertencias.reduce(
      (total, item) => total + item.provas.length,
      0
    );

    const comPontuacao = advertencias.filter(
      (item) => Number(String(item.valor || "").replace(",", ".")) > 0
    ).length;

    const cardMetrica = (
      titulo: string,
      valor: string | number,
      detalhe: string,
      icone: string
    ) => (
      <div
        style={{
          borderRadius: 16,
          padding: 18,
          border: "1px solid rgba(96,165,250,.16)",
          background:
            "linear-gradient(145deg, rgba(15,23,42,.88), rgba(8,18,34,.80))",
          boxShadow: "0 14px 34px rgba(0,0,0,.16)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: "#60a5fa",
            fontSize: 18,
            marginBottom: 10,
          }}
        >
          {icone}
        </div>
        <div
          style={{
            color: "#f8fafc",
            fontSize: 25,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {valor}
        </div>
        <div
          style={{
            color: "#e2e8f0",
            fontSize: 12,
            fontWeight: 900,
            marginTop: 8,
          }}
        >
          {titulo}
        </div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
          {detalhe}
        </div>
      </div>
    );

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            ...painelDarkStyle,
            padding: isMobile ? 16 : 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: isMobile ? "stretch" : "center",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <div>
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: ".12em",
                  marginBottom: 6,
                }}
              >
                CONDUTA
              </div>
              <h1
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  fontSize: isMobile ? 24 : 30,
                }}
              >
                ⚠ Advertências
              </h1>
              <p
                style={{
                  color: "#94a3b8",
                  margin: "7px 0 0",
                  maxWidth: 720,
                  lineHeight: 1.5,
                }}
              >
                Gerenciamento interno de advertências.
            
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  window.open(
                    ADVERTENCIAS_FORM_URL,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                style={botaoSecundarioStyle}
              >
                ＋ Abrir formulário
              </button>

              <button
                type="button"
                onClick={() => void recarregarAdvertencias()}
                disabled={carregandoAdvertencias}
                style={botaoPrimarioStyle}
              >
                {carregandoAdvertencias ? "Sincronizando..." : "↻ Sincronizar"}
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(4, minmax(170px, 220px))",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {cardMetrica(
            "Registros",
            advertencias.length,
            "linhas lidas da planilha",
            "▤"
          )}
          {cardMetrica(
            "Advertidos",
            advertidosUnicos,
            "telefones diferentes",
            "👥"
          )}
          {cardMetrica(
            "Com pontuação",
            comPontuacao,
            "registros com valor acima de zero",
            "⚠"
          )}
          {cardMetrica(
            "Provas",
            totalProvas,
            "arquivos vinculados no Drive",
            "📎"
          )}
        </div>

        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: isMobile ? "stretch" : "center",
              flexDirection: isMobile ? "column" : "row",
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 4 }}>
                Histórico de advertências
              </h2>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {listaFiltrada.length} registro(s) exibido(s)
              </div>
            </div>

            <input
              value={queryAdvertencias}
              onChange={(event) =>
                setQueryAdvertencias(event.target.value)
              }
              placeholder="Buscar membro, telefone, moderador ou ocorrência..."
              style={{
                ...inputStyle,
                width: isMobile ? "100%" : 390,
                margin: 0,
              }}
            />
          </div>

          {erroAdvertencias && (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(248,113,113,.26)",
                background: "rgba(127,29,29,.18)",
                color: "#fecaca",
                padding: 12,
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              {erroAdvertencias}
            </div>
          )}

          {!carregandoAdvertencias &&
            !erroAdvertencias &&
            !advertencias.length && (
              <div
                style={{
                  padding: "30px 16px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                Clique em <strong>Sincronizar</strong> para carregar os
                registros do formulário.
              </div>
            )}

          {carregandoAdvertencias && (
            <div
              style={{
                padding: "30px 16px",
                textAlign: "center",
                color: "#93c5fd",
              }}
            >
              Lendo a aba ADVERTÊNCIAS...
            </div>
          )}

          {!carregandoAdvertencias && listaFiltrada.length > 0 && (
            <div style={{ display: "grid", gap: 9 }}>
              {listaFiltrada.map((advertencia) => {
                const membro = membroDaAdvertencia(advertencia);
                const pontos = String(advertencia.valor || "").trim();

                return (
                  <button
                    type="button"
                    key={`${advertencia.id}-${advertencia.linha}`}
                    onClick={() =>
                      setAdvertenciaSelecionada(advertencia)
                    }
                    style={{
                      width: "100%",
                      borderRadius: 13,
                      border: "1px solid rgba(148,163,184,.12)",
                      background: "rgba(2,6,23,.34)",
                      padding: isMobile ? 12 : 14,
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "minmax(190px, 1.1fr) minmax(260px, 2.1fr) 110px 120px",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: membro ? "#f8fafc" : "#cbd5e1",
                          fontWeight: 900,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {membro?.nome || "Membro não vinculado"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        {advertencia.advertido_telefone || "Sem telefone"}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: 12,
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: isMobile ? 3 : 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {advertencia.descricao || "Sem descrição"}
                    </div>

                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "5px 9px",
                          background:
                            Number(String(pontos || "0").replace(",", ".")) > 0
                              ? "rgba(245,158,11,.12)"
                              : "rgba(59,130,246,.10)",
                          border:
                            Number(String(pontos || "0").replace(",", ".")) > 0
                              ? "1px solid rgba(245,158,11,.26)"
                              : "1px solid rgba(59,130,246,.20)",
                          color:
                            Number(String(pontos || "0").replace(",", ".")) > 0
                              ? "#fbbf24"
                              : "#93c5fd",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {pontos || "0"} ponto(s)
                      </span>
                    </div>

                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 11,
                      }}
                    >
                      <div>
                        {advertencia.data_ocorrencia ||
                          advertencia.timestamp.split(" ")[0] ||
                          "—"}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        📎 {advertencia.provas.length}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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

  const ToolsPage = () => {
    const ferramentas = [
      {
        id: "calendario" as const,
        icon: "📅",
        titulo: "Calendário",
        descricao:
          "Acompanhe datas de início, entregas, reuniões e compromissos da produção.",
        acao: "Abrir calendário",
        status: "Disponível",
      },
      {
        id: "chat" as const,
        icon: "💬",
        titulo: "Chat da equipe",
        descricao:
          "Espaço interno para a equipe conversar sem depender de mensagens espalhadas.",
        acao: "Abrir chat",
        status: "Disponível",
      },
      {
        id: "ia" as const,
        icon: "✦",
        titulo: "Assistente IA",
        descricao:
          "Área para organizar ideias, revisar textos e apoiar o planejamento dos projetos.",
        acao: "Abrir assistente",
        status: "Disponível",
      },
      {
        id: "editor" as const,
        icon: "✂",
        titulo: "Editor de vídeo",
        descricao:
          "Envie o episódio, marque os tempos e organize a lista de cortes do projeto.",
        acao: "Abrir editor",
        status: "Disponível",
      },
    ];

    const ferramentaAtiva = ferramentas.find(
      (item) => item.id === categoriaFerramentas
    );

    const cardFerramentaStyle: React.CSSProperties = {
      ...painelDarkStyle,
      minHeight: 220,
      padding: 22,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 18,
      overflow: "hidden",
    };

    const voltarFerramentas = () => setCategoriaFerramentas("inicio");

    const projetosDoCalendario = projetosVisiveis
      .map((projeto) => ({
        projeto,
        data: parseDataFlex(projeto.Data_Inicio),
      }))
      .filter(
        (
          item
        ): item is {
          projeto: Projeto;
          data: Date;
        } => Boolean(item.data)
      )
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    const hojeCalendario = new Date();
    const anoCalendario = hojeCalendario.getFullYear();
    const mesCalendario = hojeCalendario.getMonth();
    const primeiroDiaSemana = new Date(
      anoCalendario,
      mesCalendario,
      1
    ).getDay();
    const totalDiasMes = new Date(
      anoCalendario,
      mesCalendario + 1,
      0
    ).getDate();

    const diasCalendario = Array.from(
      { length: primeiroDiaSemana + totalDiasMes },
      (_, indice) =>
        indice < primeiroDiaSemana ? null : indice - primeiroDiaSemana + 1
    );

    const nomeMesCalendario = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(hojeCalendario);

    function renderCabecalhoFerramenta() {
      return (
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>
              Ferramentas › {ferramentaAtiva?.titulo || ""}
            </div>
            <h1 style={pageTitleDarkStyle}>
              {ferramentaAtiva?.icon} {ferramentaAtiva?.titulo}
            </h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              {ferramentaAtiva?.descricao}
            </p>
          </div>

          <button
            type="button"
            onClick={voltarFerramentas}
            style={botaoSecundarioGrandeStyle}
          >
            ← Voltar às ferramentas
          </button>
        </div>
      );
    }

    if (categoriaFerramentas === "editor") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <button
            type="button"
            onClick={voltarFerramentas}
            style={{
              ...botaoSecundarioStyle,
              width: "fit-content",
            }}
          >
            ← Voltar às ferramentas
          </button>

          <CortesPage />
        </div>
      );
    }

    if (categoriaFerramentas === "calendario") {
      const projetosDoCalendarioAtual = projetosVisiveis
        .map((projeto) => ({
          projeto,
          data: parseDataFlex(projeto.Data_Inicio),
        }))
        .filter(
          (
            item
          ): item is {
            projeto: Projeto;
            data: Date;
          } => Boolean(item.data)
        );

      const eventosCombinados = [
        ...agendaEventos.map((evento) => ({
          id: `agenda-${evento.id}`,
          tipo: "agenda" as const,
          titulo: evento.titulo,
          inicio: new Date(evento.inicio),
          fim: evento.fim ? new Date(evento.fim) : null,
          evento,
          projeto: evento.projeto_id
            ? projetosVisiveis.find(
                (projeto) =>
                  Number(projeto.ID) === Number(evento.projeto_id)
              ) || null
            : null,
        })),
        ...projetosDoCalendarioAtual.map(({ projeto, data }) => ({
          id: `projeto-${projeto.ID}`,
          tipo: "projeto" as const,
          titulo: projeto.Projeto,
          inicio: data,
          fim: null,
          evento: null,
          projeto,
        })),
      ]
        .filter((item) => !Number.isNaN(item.inicio.getTime()))
        .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

      const anoCalendario = dataReferenciaAgenda.getFullYear();
      const mesCalendario = dataReferenciaAgenda.getMonth();
      const primeiroDiaSemana = new Date(
        anoCalendario,
        mesCalendario,
        1
      ).getDay();
      const totalDiasMes = new Date(
        anoCalendario,
        mesCalendario + 1,
        0
      ).getDate();

      const diasCalendario = Array.from(
        { length: primeiroDiaSemana + totalDiasMes },
        (_, indice) =>
          indice < primeiroDiaSemana
            ? null
            : indice - primeiroDiaSemana + 1
      );

      const nomeMesCalendario = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(dataReferenciaAgenda);

      const referenciaSemana = new Date(dataReferenciaAgenda);
      const deslocamentoSegunda = (referenciaSemana.getDay() + 6) % 7;
      referenciaSemana.setDate(
        referenciaSemana.getDate() - deslocamentoSegunda
      );
      referenciaSemana.setHours(0, 0, 0, 0);

      const diasSemanaAgenda = Array.from({ length: 7 }, (_, indice) => {
        const data = new Date(referenciaSemana);
        data.setDate(referenciaSemana.getDate() + indice);
        return data;
      });

      const mesmoDia = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      const formatarHoraAgenda = (data: Date) =>
        data.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

      const formatarPeriodoAgenda = (
        inicio: Date,
        fim?: Date | null
      ) => {
        const inicioTexto = formatarHoraAgenda(inicio);
        if (!fim || Number.isNaN(fim.getTime())) return inicioTexto;
        return `${inicioTexto} — ${formatarHoraAgenda(fim)}`;
      };

      const abrirItemCalendario = (item: (typeof eventosCombinados)[number]) => {
        if (item.tipo === "agenda" && item.evento) {
          visualizarCompromissoAgenda(item.evento);
          return;
        }

        if (item.projeto) {
          setSelecionadoId(item.projeto.ID);
          setMostrarFerramentas(false);
          setAbaProjeto("informacoes");
        }
      };

      const moverPeriodoAgenda = (direcao: -1 | 1) => {
        setDataReferenciaAgenda((anterior) => {
          const proxima = new Date(anterior);

          if (visualizacaoAgenda === "mes") {
            proxima.setMonth(proxima.getMonth() + direcao);
          } else if (visualizacaoAgenda === "semana") {
            proxima.setDate(proxima.getDate() + direcao * 7);
          } else {
            proxima.setMonth(proxima.getMonth() + direcao);
          }

          return proxima;
        });
      };

      const renderEventoCompacto = (
        item: (typeof eventosCombinados)[number]
      ) => (
        <button
          key={item.id}
          type="button"
          className="dw-calendar-event"
          onClick={() => abrirItemCalendario(item)}
          title={item.titulo}
          style={{
            width: "100%",
            border: item.tipo === "agenda"
              ? "1px solid rgba(56,189,248,.24)"
              : "1px solid rgba(139,92,246,.22)",
            borderRadius: 8,
            padding: "6px 7px",
            background:
              item.tipo === "agenda"
                ? "rgba(14,165,233,.14)"
                : "rgba(139,92,246,.14)",
            color:
              item.tipo === "agenda" ? "#bae6fd" : "#ddd6fe",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left",
          }}
        >
          {item.tipo === "agenda"
            ? `${formatarHoraAgenda(item.inicio)} · `
            : "Projeto · "}
          {item.titulo}
        </button>
      );

      return (
        <div style={{ display: "grid", gap: 18 }}>
          {renderCabecalhoFerramenta()}

          <div
            style={{
              ...painelDarkStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["mes", "Mês"],
                ["semana", "Semana"],
                ["agenda", "Agenda"],
              ].map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setVisualizacaoAgenda(
                      valor as "mes" | "semana" | "agenda"
                    )
                  }
                  style={{
                    ...botaoSecundarioStyle,
                    background:
                      visualizacaoAgenda === valor
                        ? "rgba(37,99,235,.24)"
                        : botaoSecundarioStyle.background,
                    border:
                      visualizacaoAgenda === valor
                        ? "1px solid rgba(96,165,250,.44)"
                        : botaoSecundarioStyle.border,
                    color:
                      visualizacaoAgenda === valor
                        ? "#dbeafe"
                        : botaoSecundarioStyle.color,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={botaoSecundarioStyle}
                onClick={() => moverPeriodoAgenda(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                style={botaoSecundarioStyle}
                onClick={() => setDataReferenciaAgenda(new Date())}
              >
                Hoje
              </button>
              <button
                type="button"
                style={botaoSecundarioStyle}
                onClick={() => moverPeriodoAgenda(1)}
              >
                ›
              </button>
              <button
                type="button"
                style={botaoPrimarioStyle}
                onClick={() => abrirNovoCompromissoAgenda()}
              >
                + Novo compromisso
              </button>
            </div>
          </div>

          {carregandoAgenda && (
            <div
              style={{
                ...painelDarkStyle,
                color: "#7dd3fc",
                fontSize: 13,
                animation: "dwPulse 1.2s ease-in-out infinite",
              }}
            >
              ↻ Atualizando agenda...
            </div>
          )}

          {visualizacaoAgenda === "mes" && (
            <div style={painelDarkStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    CALENDÁRIO
                  </div>
                  <h2
                    style={{
                      ...tituloCardDarkStyle,
                      textTransform: "capitalize",
                      marginTop: 4,
                    }}
                  >
                    {nomeMesCalendario}
                  </h2>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "7px 11px",
                    background: "rgba(56,189,248,0.12)",
                    border: "1px solid rgba(56,189,248,0.22)",
                    color: "#7dd3fc",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {agendaEventos.length} compromisso(s)
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (diaSemana) => (
                    <div
                      key={diaSemana}
                      style={{
                        color: "#64748b",
                        fontSize: 11,
                        fontWeight: 900,
                        textAlign: "center",
                        padding: "4px 0 7px",
                      }}
                    >
                      {diaSemana}
                    </div>
                  )
                )}

                {diasCalendario.map((dia, indice) => {
                  if (!dia) {
                    return <div key={`vazio-${indice}`} />;
                  }

                  const dataDia = new Date(
                    anoCalendario,
                    mesCalendario,
                    dia
                  );

                  const eventosDia = eventosCombinados.filter((item) =>
                    mesmoDia(item.inicio, dataDia)
                  );

                  const ehHoje = mesmoDia(dataDia, new Date());

                  return (
                    <div
                      key={dia}
                      onDoubleClick={() =>
                        abrirNovoCompromissoAgenda(dataDia)
                      }
                      style={{
                        minHeight: isMobile ? 74 : 118,
                        borderRadius: 12,
                        padding: isMobile ? 7 : 9,
                        background: ehHoje
                          ? "rgba(14,165,233,0.15)"
                          : "rgba(2,6,23,0.48)",
                        border: ehHoje
                          ? "1px solid rgba(56,189,248,0.48)"
                          : "1px solid rgba(148,163,184,0.14)",
                        overflow: "hidden",
                        transition:
                          "transform .16s ease, border-color .16s ease, background .16s ease",
                      }}
                    >
                      <strong
                        style={{
                          color: ehHoje ? "#7dd3fc" : "#e2e8f0",
                          fontSize: 12,
                        }}
                      >
                        {dia}
                      </strong>

                      <div
                        style={{
                          display: "grid",
                          gap: 4,
                          marginTop: 7,
                        }}
                      >
                        {eventosDia.slice(0, isMobile ? 2 : 4).map(
                          renderEventoCompacto
                        )}
                        {eventosDia.length > (isMobile ? 2 : 4) && (
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: 9,
                              paddingLeft: 4,
                            }}
                          >
                            +{eventosDia.length - (isMobile ? 2 : 4)} evento(s)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 11,
                  marginTop: 12,
                }}
              >
                Dica: dê dois cliques em um dia para criar um compromisso
                naquela data.
              </div>
            </div>
          )}

          {visualizacaoAgenda === "semana" && (
            <div style={painelDarkStyle}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  SEMANA
                </div>
                <h2 style={{ ...tituloCardDarkStyle, marginTop: 4 }}>
                  {diasSemanaAgenda[0].toLocaleDateString("pt-BR")} —{" "}
                  {diasSemanaAgenda[6].toLocaleDateString("pt-BR")}
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet
                    ? "1fr"
                    : "repeat(7, minmax(150px, 1fr))",
                  gap: 10,
                  overflowX: "auto",
                }}
              >
                {diasSemanaAgenda.map((data) => {
                  const eventosDia = eventosCombinados.filter((item) =>
                    mesmoDia(item.inicio, data)
                  );
                  const ehHoje = mesmoDia(data, new Date());

                  return (
                    <div
                      key={data.toISOString()}
                      style={{
                        minHeight: 260,
                        borderRadius: 14,
                        padding: 11,
                        background: ehHoje
                          ? "rgba(14,165,233,.10)"
                          : "rgba(2,6,23,.46)",
                        border: ehHoje
                          ? "1px solid rgba(56,189,248,.34)"
                          : "1px solid rgba(148,163,184,.14)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => abrirNovoCompromissoAgenda(data)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: 0,
                          background: "transparent",
                          color: "#f8fafc",
                          cursor: "pointer",
                          padding: "0 0 10px",
                        }}
                        title="Criar compromisso neste dia"
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 10,
                            textTransform: "uppercase",
                          }}
                        >
                          {data.toLocaleDateString("pt-BR", {
                            weekday: "short",
                          })}
                        </div>
                        <strong style={{ fontSize: 17 }}>
                          {data.getDate()}
                        </strong>
                      </button>

                      <div style={{ display: "grid", gap: 7 }}>
                        {eventosDia.length ? (
                          eventosDia.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => abrirItemCalendario(item)}
                              style={{
                                textAlign: "left",
                                borderRadius: 10,
                                padding: 9,
                                border:
                                  item.tipo === "agenda"
                                    ? "1px solid rgba(56,189,248,.20)"
                                    : "1px solid rgba(139,92,246,.20)",
                                background:
                                  item.tipo === "agenda"
                                    ? "rgba(14,165,233,.12)"
                                    : "rgba(139,92,246,.12)",
                                color: "#f8fafc",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  color:
                                    item.tipo === "agenda"
                                      ? "#7dd3fc"
                                      : "#c4b5fd",
                                  fontSize: 10,
                                  fontWeight: 900,
                                }}
                              >
                                {item.tipo === "agenda"
                                  ? formatarPeriodoAgenda(
                                      item.inicio,
                                      item.fim
                                    )
                                  : "INÍCIO DO PROJETO"}
                              </div>
                              <strong
                                style={{
                                  display: "block",
                                  marginTop: 4,
                                  fontSize: 12,
                                }}
                              >
                                {item.titulo}
                              </strong>
                            </button>
                          ))
                        ) : (
                          <div
                            style={{
                              color: "#475569",
                              fontSize: 11,
                              paddingTop: 10,
                            }}
                          >
                            Sem compromissos.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visualizacaoAgenda === "agenda" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet
                  ? "1fr"
                  : "minmax(0,1.5fr) minmax(280px,.65fr)",
                gap: 18,
                alignItems: "start",
              }}
            >
              <div style={{ ...painelDarkStyle, display: "grid", gap: 12 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    PRÓXIMOS EVENTOS
                  </div>
                  <h2 style={{ ...tituloCardDarkStyle, marginTop: 4 }}>
                    Minha agenda
                  </h2>
                </div>

                {eventosCombinados.length ? (
                  eventosCombinados.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => abrirItemCalendario(item)}
                      style={{
                        textAlign: "left",
                        borderRadius: 13,
                        padding: 13,
                        border:
                          item.tipo === "agenda"
                            ? "1px solid rgba(56,189,248,.18)"
                            : "1px solid rgba(139,92,246,.18)",
                        background: "rgba(2,6,23,.46)",
                        color: "#f8fafc",
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "110px 1fr auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#7dd3fc", fontSize: 12 }}>
                          {item.inicio.toLocaleDateString("pt-BR")}
                        </strong>
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 10,
                            marginTop: 3,
                          }}
                        >
                          {item.tipo === "agenda"
                            ? formatarPeriodoAgenda(item.inicio, item.fim)
                            : "Projeto"}
                        </div>
                      </div>

                      <div>
                        <strong>{item.titulo}</strong>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 11,
                            marginTop: 3,
                          }}
                        >
                          {item.tipo === "agenda"
                            ? item.projeto?.Projeto || "Compromisso geral"
                            : item.projeto?.Status || "Projeto"}
                        </div>
                      </div>

                      <span style={{ color: "#64748b" }}>›</span>
                    </button>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,.14)",
                      background: "rgba(2,6,23,.46)",
                      color: "#94a3b8",
                    }}
                  >
                    Nenhum compromisso cadastrado.
                  </div>
                )}
              </div>

              <div style={{ ...painelDarkStyle, display: "grid", gap: 12 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    AÇÕES RÁPIDAS
                  </div>
                  <h2 style={{ ...tituloCardDarkStyle, marginTop: 4 }}>
                    Agenda
                  </h2>
                </div>

                <button
                  type="button"
                  style={botaoPrimarioStyle}
                  onClick={() => abrirNovoCompromissoAgenda()}
                >
                  + Novo compromisso
                </button>

                <button
                  type="button"
                  style={botaoSecundarioStyle}
                  onClick={() => void carregarAgendaAtual()}
                >
                  ↻ Atualizar agenda
                </button>

                <div
                  style={{
                    borderRadius: 12,
                    padding: 13,
                    background: "rgba(2,6,23,.42)",
                    border: "1px solid rgba(148,163,184,.12)",
                    color: "#94a3b8",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Reuniões, gravações e compromissos ficam salvos no
                  Supabase. As datas de início dos projetos também aparecem
                  aqui automaticamente.
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (categoriaFerramentas === "chat") {
      const canaisFixos = canaisChat.filter(
        (canal) =>
          ["geral", "diretoria", "lideres"].includes(canal.tipo) &&
          canalChatPermitido(canal)
      );

      const canalAtivo =
        canaisChat.find((canal) => canal.id === canalChatAtivoId) || null;

      const projetoCanalAtivo =
        canalAtivo?.tipo === "projeto"
          ? projetosVisiveis.find(
              (projeto) =>
                Number(projeto.ID) === Number(canalAtivo.projeto_id)
            ) || null
          : null;

      const usuariosDiretaAtiva =
        canalAtivo?.tipo === "direta"
          ? participantesChat
              .filter(
                (item) =>
                  item.canal_id === canalAtivo.id &&
                  normalizar(item.usuario_login) !==
                    normalizar(usuarioLogado?.login)
              )
              .map(
                (item) =>
                  usuarios.find(
                    (usuario) =>
                      normalizar(usuario.login) ===
                      normalizar(item.usuario_login)
                  ) || null
              )
              .filter((usuario): usuario is Usuario => Boolean(usuario))
          : [];

      const outroUsuarioDireta = usuariosDiretaAtiva[0] || null;

      const perfilLiderChat = projetoCanalAtivo
        ? usuarioPorReferenciaChat(projetoCanalAtivo.Lider)
        : null;

      const perfilEditorChat = projetoCanalAtivo
        ? usuarioPorReferenciaChat(projetoCanalAtivo.Editor)
        : null;

      const linksProjetoChat = projetoCanalAtivo
        ? extrairLinksDrive(projetoCanalAtivo.Observacoes || "")
        : null;

      const usuariosDiretos = usuarios
        .filter(
          (usuario) =>
            normalizar(usuario.login) !== normalizar(usuarioLogado?.login)
        )
        .sort((a, b) =>
          String(a.nome || a.login).localeCompare(
            String(b.nome || b.login),
            "pt-BR"
          )
        );

      const tituloCanal = nomeCanalChat(canalAtivo);

      const matchMencaoChat = mensagemChat.match(
        /(?:^|\s)@([^\s@]*)$/
      );

      const termoMencaoChat = normalizar(
        matchMencaoChat?.[1] || ""
      );

      const usuariosMencionaveisChat = canalAtivo
        ? usuarios
            .filter(
              (usuario) =>
                normalizar(usuario.login) !==
                normalizar(usuarioLogado?.login)
            )
            .filter((usuario) => {
              if (canalAtivo.tipo === "geral") return true;

              if (canalAtivo.tipo === "diretoria") {
                return usuario.cargo === "diretoria";
              }

              if (canalAtivo.tipo === "lideres") {
                return [
                  "diretoria",
                  "lider",
                  "lider_treinamento",
                ].includes(usuario.cargo);
              }

              if (canalAtivo.tipo === "projeto") {
                const projeto = projetos.find(
                  (item) =>
                    Number(item.ID) === Number(canalAtivo.projeto_id)
                );

                return projeto ? podeVerProjeto(usuario, projeto) : false;
              }

              if (canalAtivo.tipo === "direta") {
                return participantesChat.some(
                  (participante) =>
                    participante.canal_id === canalAtivo.id &&
                    normalizar(participante.usuario_login) ===
                      normalizar(usuario.login)
                );
              }

              return false;
            })
            .filter((usuario) => {
              if (!matchMencaoChat) return false;
              if (!termoMencaoChat) return true;

              return [
                usuario.nome,
                usuario.login,
                cargoLabel(usuario.cargo),
              ]
                .map((valor) => normalizar(valor || ""))
                .some((valor) => valor.includes(termoMencaoChat));
            })
            .slice(0, 7)
        : [];

      const canalChatSilenciado = Boolean(
        canalAtivo &&
          preferenciasChat.find(
            (item) => item.canal_id === canalAtivo.id
          )?.silenciado
      );

      const subtituloCanal = projetoCanalAtivo
        ? "Discussões da equipe do projeto"
        : canalAtivo?.tipo === "direta"
        ? usuariosDiretaAtiva.length > 1
          ? `Conversa em grupo · ${usuariosDiretaAtiva.length + 1} pessoas`
          : outroUsuarioDireta
          ? cargoLabel(outroUsuarioDireta.cargo)
          : "Conversa direta"
        : canalAtivo?.tipo === "diretoria"
        ? "Canal reservado para a diretoria"
        : canalAtivo?.tipo === "lideres"
        ? "Canal da liderança de projetos"
        : "Canal geral da equipe DubWorks";

      const equipePainel: Usuario[] = projetoCanalAtivo
        ? [perfilLiderChat, perfilEditorChat]
            .filter((item): item is Usuario => Boolean(item))
            .filter(
              (item, indice, lista) =>
                lista.findIndex(
                  (outro) =>
                    normalizar(outro.login) === normalizar(item.login)
                ) === indice
            )
        : canalAtivo?.tipo === "direta"
        ? usuariosDiretaAtiva
        : canalAtivo?.tipo === "diretoria"
        ? usuarios.filter((usuario) => usuario.cargo === "diretoria")
        : canalAtivo?.tipo === "lideres"
        ? usuarios.filter((usuario) =>
            ["diretoria", "lider", "lider_treinamento"].includes(
              usuario.cargo
            )
          )
        : usuarios;

      const colunasChat =
        !isTablet && painelInfoChatAberto
          ? "minmax(0, 1fr) 300px"
          : "minmax(0, 1fr)";

      return (
        <div style={{ display: "grid", gap: 18 }}>
          {renderCabecalhoFerramenta()}

          {erroChat && (
            <div
              style={{
                borderRadius: 12,
                padding: "11px 14px",
                background: "rgba(248,113,113,0.10)",
                border: "1px solid rgba(248,113,113,0.24)",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {erroChat}
            </div>
          )}

          <div
            style={{
              minHeight: isMobile ? 760 : 650,
              display: "grid",
              gridTemplateColumns: colunasChat,
              overflow: "hidden",
              position: "relative",
              borderRadius: 18,
              border: "1px solid rgba(59,130,246,0.20)",
              background:
                "linear-gradient(180deg, rgba(7,16,31,0.98), rgba(7,18,35,0.96))",
              boxShadow: "0 22px 55px rgba(0,0,0,0.24)",
            }}
          >
            {menuChatAberto && (
              <>
                <button
                  type="button"
                  aria-label="Fechar menu de conversas"
                  onClick={() => setMenuChatAberto(false)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 50,
                    border: "none",
                    background: "rgba(2,6,23,.54)",
                    backdropFilter: "blur(2px)",
                    cursor: "default",
                  }}
                />
            <aside
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: isMobile ? "min(86vw, 320px)" : 285,
                minWidth: 0,
                padding: 14,
                overflowY: "auto",
                zIndex: 60,
                borderRight: "1px solid rgba(96,165,250,0.22)",
                background: "rgba(8,18,34,0.985)",
                boxShadow: "22px 0 55px rgba(0,0,0,.44)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".08em",
                    }}
                  >
                    CONVERSAS
                  </div>
                  <strong style={{ color: "#f8fafc" }}>Chat da equipe</strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    title={
                      carregandoChat
                        ? "Carregando chat"
                        : "Conectado ao Supabase"
                    }
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: carregandoChat ? "#f59e0b" : "#22c55e",
                      boxShadow: carregandoChat
                        ? "0 0 12px rgba(245,158,11,.6)"
                        : "0 0 12px rgba(34,197,94,.6)",
                    }}
                  />

                  <button
                    type="button"
                    title="Fechar menu"
                    onClick={() => setMenuChatAberto(false)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      border: "1px solid rgba(148,163,184,.14)",
                      background: "rgba(15,23,42,.68)",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: 17,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 5 }}>
                {canaisFixos.map((canal) => {
                  const ativo = canal.id === canalChatAtivoId;

                  return (
                    <button
                      key={canal.id}
                      type="button"
                      onClick={() => {
                        setCanalChatAtivoId(canal.id);
                        setMenuChatAberto(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 11px",
                        borderRadius: 10,
                        border: ativo
                          ? "1px solid rgba(59,130,246,.55)"
                          : "1px solid transparent",
                        background: ativo
                          ? "linear-gradient(90deg, rgba(37,99,235,.28), rgba(14,165,233,.10))"
                          : "transparent",
                        color: ativo ? "#e0f2fe" : "#cbd5e1",
                        cursor: "pointer",
                        textAlign: "left",
                        fontWeight: ativo ? 900 : 700,
                      }}
                    >
                      <span
                        style={{
                          color: ativo ? "#60a5fa" : "#64748b",
                          marginRight: 9,
                        }}
                      >
                        {canal.tipo === "diretoria"
                          ? "◆"
                          : canal.tipo === "lideres"
                          ? "♛"
                          : "#"}
                      </span>
                      {canal.nome}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  margin: "18px 4px 8px",
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                }}
              >
                PROJETOS
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 5,
                  maxHeight: 190,
                  overflowY: "auto",
                  paddingRight: 3,
                }}
              >
                {projetosVisiveis
                  .slice()
                  .sort((a, b) =>
                    String(a.Projeto || "").localeCompare(
                      String(b.Projeto || ""),
                      "pt-BR"
                    )
                  )
                  .map((projeto) => {
                    const canalProjeto = canaisChat.find(
                      (canal) =>
                        canal.tipo === "projeto" &&
                        Number(canal.projeto_id) === Number(projeto.ID)
                    );

                    const ativo =
                      canalProjeto?.id === canalChatAtivoId ||
                      projetoCanalAtivo?.ID === projeto.ID;

                    return (
                      <button
                        key={projeto.ID}
                        type="button"
                        onClick={() => {
                          setMenuChatAberto(false);
                          void abrirCanalProjetoChat(projeto);
                        }}
                        style={{
                          width: "100%",
                          padding: "9px 11px",
                          borderRadius: 10,
                          border: ativo
                            ? "1px solid rgba(59,130,246,.55)"
                            : "1px solid transparent",
                          background: ativo
                            ? "linear-gradient(90deg, rgba(37,99,235,.30), rgba(14,165,233,.10))"
                            : "transparent",
                          color: ativo ? "#e0f2fe" : "#cbd5e1",
                          cursor: "pointer",
                          textAlign: "left",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: ativo ? 900 : 700,
                        }}
                      >
                        <span
                          style={{
                            color: ativo ? "#60a5fa" : "#64748b",
                            marginRight: 9,
                          }}
                        >
                          #
                        </span>
                        {projeto.Projeto || `Projeto ${projeto.ID}`}
                      </button>
                    );
                  })}
              </div>

              <div
                style={{
                  margin: "18px 4px 8px",
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                }}
              >
                DIRETAS
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 5,
                  maxHeight: 190,
                  overflowY: "auto",
                  paddingRight: 3,
                }}
              >
                {usuariosDiretos.map((usuario) => {
                  const conversaExistente = canaisChat.find(
                    (canal) =>
                      canal.tipo === "direta" &&
                      participantesChat.some(
                        (participante) =>
                          participante.canal_id === canal.id &&
                          normalizar(participante.usuario_login) ===
                            normalizar(usuario.login)
                      ) &&
                      participantesChat.some(
                        (participante) =>
                          participante.canal_id === canal.id &&
                          normalizar(participante.usuario_login) ===
                            normalizar(usuarioLogado?.login)
                      )
                  );

                  const ativo =
                    conversaExistente?.id === canalChatAtivoId &&
                    canalAtivo?.tipo === "direta";

                  return (
                    <button
                      key={usuario.login || usuario.nome}
                      type="button"
                      onClick={() => {
                        setMenuChatAberto(false);
                        void abrirConversaDiretaChat(usuario);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "8px 9px",
                        borderRadius: 10,
                        border: ativo
                          ? "1px solid rgba(59,130,246,.45)"
                          : "1px solid transparent",
                        background: ativo
                          ? "rgba(37,99,235,.18)"
                          : "transparent",
                        color: "#cbd5e1",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          background:
                            "linear-gradient(135deg, rgba(59,130,246,.9), rgba(124,58,237,.88))",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {iniciaisChat(usuario.nome || usuario.login)}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: ativo ? "#f8fafc" : "#cbd5e1",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {usuario.nome || usuario.login}
                        </strong>
                        <small style={{ color: "#64748b" }}>
                          {cargoLabel(usuario.cargo)}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
              </>
            )}

            <section
              style={{
                minWidth: 0,
                minHeight: isMobile ? 560 : 650,
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                background:
                  "radial-gradient(circle at 50% 0%, rgba(37,99,235,.08), transparent 32%), rgba(5,14,28,.84)",
              }}
            >
              <header
                style={{
                  minHeight: 72,
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(148,163,184,.13)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  title="Abrir conversas"
                  aria-label="Abrir menu de conversas"
                  onClick={() => setMenuChatAberto(true)}
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 10,
                    border: "1px solid rgba(96,165,250,.22)",
                    background: "rgba(37,99,235,.12)",
                    color: "#bfdbfe",
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                >
                  ☰
                </button>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <span
                      style={{
                        color:
                          canalAtivo?.tipo === "direta"
                            ? "#a78bfa"
                            : "#60a5fa",
                        fontSize: 22,
                        fontWeight: 900,
                      }}
                    >
                      {canalAtivo?.tipo === "direta" ? "●" : "#"}
                    </span>
                    <h2
                      style={{
                        margin: 0,
                        color: "#f8fafc",
                        fontSize: 20,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tituloCanal}
                    </h2>
                  </div>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                      marginTop: 3,
                      paddingLeft: 29,
                    }}
                  >
                    {subtituloCanal}
                  </div>
                </div>

                {canalAtivo && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      title={
                        canalChatSilenciado
                          ? "Ativar notificações de novas mensagens"
                          : "Silenciar novas mensagens deste chat"
                      }
                      onClick={alternarSilenciarCanalChat}
                      disabled={alterandoSilencioChat}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: canalChatSilenciado
                          ? "1px solid rgba(245,158,11,.30)"
                          : "1px solid rgba(148,163,184,.18)",
                        background: canalChatSilenciado
                          ? "rgba(245,158,11,.11)"
                          : "rgba(15,23,42,.66)",
                        color: canalChatSilenciado
                          ? "#fbbf24"
                          : "#cbd5e1",
                        cursor: alterandoSilencioChat
                          ? "wait"
                          : "pointer",
                        opacity: alterandoSilencioChat ? 0.6 : 1,
                        fontSize: 15,
                      }}
                    >
                      {canalChatSilenciado ? "🔕" : "🔔"}
                    </button>

                    {canalAtivo.tipo === "direta" && (
                      <button
                        type="button"
                        title="Adicionar pessoas à conversa"
                        onClick={abrirAdicionarPessoasChat}
                        style={{
                          minHeight: 36,
                          borderRadius: 10,
                          border: "1px solid rgba(59,130,246,.24)",
                          background: "rgba(37,99,235,.12)",
                          color: "#bfdbfe",
                          cursor: "pointer",
                          padding: "0 11px",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        ＋ Pessoa
                      </button>
                    )}

                    {!isTablet && (
                      <button
                        type="button"
                        title="Informações do canal"
                        onClick={() =>
                          setPainelInfoChatAberto((anterior) => !anterior)
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,.18)",
                          background: "rgba(15,23,42,.66)",
                          color: "#cbd5e1",
                          cursor: "pointer",
                        }}
                      >
                        ⓘ
                      </button>
                    )}
                  </div>
                )}
              </header>

              <div
                style={{
                  minHeight: 0,
                  overflowY: "auto",
                  padding: isMobile ? 14 : "18px 22px",
                }}
              >
                {!canalAtivo ? (
                  <div
                    style={{
                      minHeight: 340,
                      display: "grid",
                      placeItems: "center",
                      color: "#64748b",
                      textAlign: "center",
                    }}
                  >
                    {carregandoChat
                      ? "Carregando canais..."
                      : "Selecione uma conversa para começar."}
                  </div>
                ) : carregandoMensagensChat ? (
                  <div
                    style={{
                      minHeight: 340,
                      display: "grid",
                      placeItems: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Carregando mensagens...
                  </div>
                ) : mensagensChat.length === 0 ? (
                  <div
                    style={{
                      minHeight: 340,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 42, marginBottom: 10 }}>💬</div>
                      <strong style={{ color: "#f8fafc" }}>
                        Comece a conversa
                      </strong>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 5,
                        }}
                      >
                        Ainda não há mensagens neste canal.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 15 }}>
                    {mensagensChat.map((mensagem, indice) => {
                      const anterior = indice > 0 ? mensagensChat[indice - 1] : null;
                      const dataAtual = formatarDataChat(mensagem.created_at);
                      const dataAnterior = formatarDataChat(anterior?.created_at);
                      const mostrarData =
                        indice === 0 || dataAtual !== dataAnterior;

                      const minhaMensagem =
                        normalizar(mensagem.usuario_login) ===
                        normalizar(usuarioLogado?.login);

                      const mensagemExcluida = Boolean(
                        mensagem.excluido_em
                      );

                      const editandoEstaMensagem =
                        mensagemEditandoChat?.id === mensagem.id;

                      const mensagemCitada = mensagem.resposta_a_id
                        ? mensagensChat.find(
                            (item) => item.id === mensagem.resposta_a_id
                          ) || null
                        : null;

                      return (
                        <React.Fragment key={mensagem.id}>
                          {mostrarData && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                color: "#64748b",
                                fontSize: 11,
                              }}
                            >
                              <div
                                style={{
                                  height: 1,
                                  flex: 1,
                                  background: "rgba(148,163,184,.12)",
                                }}
                              />
                              <span>{dataAtual}</span>
                              <div
                                style={{
                                  height: 1,
                                  flex: 1,
                                  background: "rgba(148,163,184,.12)",
                                }}
                              />
                            </div>
                          )}

                          <div
                            id={`chat-mensagem-${mensagem.id}`}
                            style={{
                              display: "flex",
                              gap: 11,
                              alignItems: "flex-start",
                              justifyContent: minhaMensagem
                                ? "flex-end"
                                : "flex-start",
                              scrollMarginBlock: 120,
                            }}
                          >
                            {!minhaMensagem && (
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  flexShrink: 0,
                                  borderRadius: "50%",
                                  display: "grid",
                                  placeItems: "center",
                                  background:
                                    "linear-gradient(135deg, #2563eb, #7c3aed)",
                                  color: "#fff",
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                {iniciaisChat(
                                  mensagem.usuario_nome ||
                                    mensagem.usuario_login
                                )}
                              </div>
                            )}

                            <div
                              style={{
                                maxWidth: isMobile ? "86%" : "76%",
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "baseline",
                                  justifyContent: minhaMensagem
                                    ? "flex-end"
                                    : "flex-start",
                                  marginBottom: 4,
                                }}
                              >
                                <strong
                                  style={{
                                    color: minhaMensagem
                                      ? "#7dd3fc"
                                      : "#c4b5fd",
                                    fontSize: 13,
                                  }}
                                >
                                  {minhaMensagem
                                    ? "Você"
                                    : mensagem.usuario_nome ||
                                      mensagem.usuario_login}
                                </strong>
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: 10,
                                  }}
                                >
                                  {formatarHoraChat(mensagem.created_at)}
                                  {mensagem.editado_em &&
                                  !mensagemExcluida
                                    ? " · editada"
                                    : ""}
                                </span>
                              </div>

                              {mensagemCitada && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    document
                                      .getElementById(
                                        `chat-mensagem-${mensagemCitada.id}`
                                      )
                                      ?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      })
                                  }
                                  title="Ir para a mensagem citada"
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    borderRadius: 10,
                                    border: "1px solid rgba(96,165,250,.18)",
                                    borderLeft: "3px solid rgba(96,165,250,.75)",
                                    background: "rgba(15,23,42,.58)",
                                    color: "#cbd5e1",
                                    padding: "7px 9px",
                                    marginBottom: 5,
                                    cursor: "pointer",
                                    overflow: "hidden",
                                  }}
                                >
                                  <strong
                                    style={{
                                      display: "block",
                                      color: "#7dd3fc",
                                      fontSize: 10,
                                      marginBottom: 2,
                                    }}
                                  >
                                    {mensagemCitada.usuario_nome ||
                                      mensagemCitada.usuario_login}
                                  </strong>
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: 11,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {mensagemCitada.excluido_em
                                      ? "Mensagem excluída"
                                      : mensagemCitada.mensagem}
                                  </span>
                                </button>
                              )}

                              <div
                                style={{
                                  borderRadius: minhaMensagem
                                    ? "15px 4px 15px 15px"
                                    : "4px 15px 15px 15px",
                                  padding: "11px 13px",
                                  background: minhaMensagem
                                    ? "linear-gradient(135deg, rgba(37,99,235,.30), rgba(14,165,233,.14))"
                                    : "rgba(15,30,52,.92)",
                                  border:
                                    mensagemChatDestacadaId === mensagem.id
                                      ? "1px solid rgba(96,165,250,.78)"
                                      : minhaMensagem
                                      ? "1px solid rgba(59,130,246,.28)"
                                      : "1px solid rgba(148,163,184,.13)",
                                  boxShadow:
                                    mensagemChatDestacadaId === mensagem.id
                                      ? "0 0 0 2px rgba(59,130,246,.18), 0 0 22px rgba(37,99,235,.30)"
                                      : "none",
                                  transform:
                                    mensagemChatDestacadaId === mensagem.id
                                      ? "scale(1.015)"
                                      : "scale(1)",
                                  transition:
                                    "border-color .2s ease, box-shadow .2s ease, transform .2s ease",
                                  color: "#e2e8f0",
                                  lineHeight: 1.5,
                                  fontSize: 13,
                                  whiteSpace: "pre-wrap",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {mensagemExcluida ? (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Mensagem excluída
                                  </span>
                                ) : editandoEstaMensagem ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      minWidth: isMobile ? 220 : 320,
                                    }}
                                  >
                                    <textarea
                                      id={`chat-editar-${mensagem.id}`}
                                      value={textoEdicaoMensagemChat}
                                      onChange={(event) =>
                                        setTextoEdicaoMensagemChat(
                                          event.target.value
                                        )
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                          event.preventDefault();
                                          cancelarEdicaoMensagemChat();
                                        }

                                        if (
                                          event.key === "Enter" &&
                                          (event.ctrlKey || event.metaKey)
                                        ) {
                                          event.preventDefault();
                                          void salvarEdicaoMensagemChatAtual();
                                        }
                                      }}
                                      style={{
                                        width: "100%",
                                        minHeight: 76,
                                        resize: "vertical",
                                        boxSizing: "border-box",
                                        borderRadius: 10,
                                        border:
                                          "1px solid rgba(96,165,250,.28)",
                                        background: "rgba(2,6,23,.58)",
                                        color: "#f8fafc",
                                        padding: 10,
                                        outline: "none",
                                        fontFamily: "inherit",
                                        lineHeight: 1.45,
                                      }}
                                    />

                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 7,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={cancelarEdicaoMensagemChat}
                                        disabled={salvandoEdicaoMensagemChat}
                                        style={{
                                          borderRadius: 8,
                                          border:
                                            "1px solid rgba(148,163,184,.16)",
                                          background:
                                            "rgba(15,23,42,.60)",
                                          color: "#cbd5e1",
                                          padding: "7px 10px",
                                          cursor: "pointer",
                                          fontSize: 11,
                                        }}
                                      >
                                        Cancelar
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void salvarEdicaoMensagemChatAtual()
                                        }
                                        disabled={
                                          salvandoEdicaoMensagemChat ||
                                          !textoEdicaoMensagemChat.trim()
                                        }
                                        style={{
                                          borderRadius: 8,
                                          border:
                                            "1px solid rgba(59,130,246,.30)",
                                          background:
                                            "linear-gradient(135deg, #2563eb, #0284c7)",
                                          color: "#fff",
                                          padding: "7px 11px",
                                          cursor:
                                            salvandoEdicaoMensagemChat
                                              ? "wait"
                                              : "pointer",
                                          fontWeight: 800,
                                          fontSize: 11,
                                        }}
                                      >
                                        {salvandoEdicaoMensagemChat
                                          ? "Salvando..."
                                          : "Salvar"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  mensagem.mensagem
                                )}
                              </div>

                              {!mensagemExcluida &&
                                anexosChat.some(
                                  (anexo) => anexo.mensagem_id === mensagem.id
                                ) && (
                                <div
                                  style={{
                                    display: "grid",
                                    gap: 8,
                                    marginTop: 7,
                                  }}
                                >
                                  {anexosChat
                                    .filter(
                                      (anexo) =>
                                        anexo.mensagem_id === mensagem.id
                                    )
                                    .map((anexo) => {
                                      const tipo = String(
                                        anexo.mime_type || ""
                                      ).toLowerCase();

                                      if (tipo.startsWith("image/")) {
                                        return (
                                          <button
                                            key={anexo.id}
                                            type="button"
                                            disabled={!anexo.url_temporaria}
                                            onClick={() => {
                                              if (anexo.url_temporaria) {
                                                window.open(
                                                  anexo.url_temporaria,
                                                  "_blank",
                                                  "noopener,noreferrer"
                                                );
                                              }
                                            }}
                                            style={{
                                              border: "none",
                                              padding: 0,
                                              background: "transparent",
                                              cursor: anexo.url_temporaria
                                                ? "pointer"
                                                : "default",
                                              textAlign: "left",
                                            }}
                                          >
                                            <img
                                              src={anexo.url_temporaria}
                                              alt={anexo.nome_arquivo}
                                              style={{
                                                display: "block",
                                                width: "min(360px, 100%)",
                                                maxHeight: 280,
                                                objectFit: "cover",
                                                borderRadius: 12,
                                                border:
                                                  "1px solid rgba(148,163,184,.16)",
                                                background:
                                                  "rgba(2,6,23,.55)",
                                              }}
                                            />
                                            <div
                                              style={{
                                                color: "#64748b",
                                                fontSize: 10,
                                                marginTop: 4,
                                              }}
                                            >
                                              {anexo.nome_arquivo} ·{" "}
                                              {formatarTamanhoAnexoChat(
                                                anexo.tamanho_bytes
                                              )}
                                            </div>
                                          </button>
                                        );
                                      }

                                      if (tipo.startsWith("audio/")) {
                                        return (
                                          <div
                                            key={anexo.id}
                                            style={{
                                              width: "min(380px, 100%)",
                                              padding: 9,
                                              borderRadius: 11,
                                              border:
                                                "1px solid rgba(148,163,184,.14)",
                                              background:
                                                "rgba(2,6,23,.42)",
                                            }}
                                          >
                                            <div
                                              style={{
                                                color: "#cbd5e1",
                                                fontSize: 11,
                                                marginBottom: 7,
                                              }}
                                            >
                                              🎵 {anexo.nome_arquivo}
                                            </div>
                                            <audio
                                              controls
                                              preload="metadata"
                                              src={anexo.url_temporaria}
                                              style={{
                                                width: "100%",
                                                height: 34,
                                              }}
                                            />
                                          </div>
                                        );
                                      }

                                      if (tipo.startsWith("video/")) {
                                        return (
                                          <div
                                            key={anexo.id}
                                            style={{
                                              width: "min(400px, 100%)",
                                            }}
                                          >
                                            <video
                                              controls
                                              preload="metadata"
                                              src={anexo.url_temporaria}
                                              style={{
                                                display: "block",
                                                width: "100%",
                                                maxHeight: 280,
                                                borderRadius: 12,
                                                border:
                                                  "1px solid rgba(148,163,184,.16)",
                                                background: "#020617",
                                              }}
                                            />
                                            <div
                                              style={{
                                                color: "#64748b",
                                                fontSize: 10,
                                                marginTop: 4,
                                              }}
                                            >
                                              {anexo.nome_arquivo} ·{" "}
                                              {formatarTamanhoAnexoChat(
                                                anexo.tamanho_bytes
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }

                                      const iconeArquivo =
                                        tipo.includes("pdf")
                                          ? "📕"
                                          : tipo.includes("zip") ||
                                            tipo.includes("rar") ||
                                            tipo.includes("7z")
                                          ? "🗜️"
                                          : tipo.includes("sheet") ||
                                            tipo.includes("excel")
                                          ? "📊"
                                          : tipo.includes("word") ||
                                            tipo.includes("document")
                                          ? "📘"
                                          : "📄";

                                      return (
                                        <button
                                          key={anexo.id}
                                          type="button"
                                          disabled={!anexo.url_temporaria}
                                          onClick={() => {
                                            if (anexo.url_temporaria) {
                                              window.open(
                                                anexo.url_temporaria,
                                                "_blank",
                                                "noopener,noreferrer"
                                              );
                                            }
                                          }}
                                          style={{
                                            width: "min(390px, 100%)",
                                            display: "grid",
                                            gridTemplateColumns:
                                              "38px minmax(0,1fr) auto",
                                            gap: 9,
                                            alignItems: "center",
                                            borderRadius: 11,
                                            border:
                                              "1px solid rgba(96,165,250,.16)",
                                            background:
                                              "rgba(15,30,52,.72)",
                                            color: "#e2e8f0",
                                            padding: "9px 10px",
                                            cursor: anexo.url_temporaria
                                              ? "pointer"
                                              : "not-allowed",
                                            textAlign: "left",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 22,
                                              textAlign: "center",
                                            }}
                                          >
                                            {iconeArquivo}
                                          </span>

                                          <span style={{ minWidth: 0 }}>
                                            <strong
                                              style={{
                                                display: "block",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                fontSize: 11,
                                              }}
                                            >
                                              {anexo.nome_arquivo}
                                            </strong>
                                            <small style={{ color: "#64748b" }}>
                                              {formatarTamanhoAnexoChat(
                                                anexo.tamanho_bytes
                                              )}
                                            </small>
                                          </span>

                                          <span
                                            style={{
                                              color: "#60a5fa",
                                              fontSize: 16,
                                            }}
                                          >
                                            ↗
                                          </span>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}

                              {!mensagemExcluida &&
                                !editandoEstaMensagem && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: minhaMensagem
                                        ? "flex-end"
                                        : "flex-start",
                                      alignItems: "center",
                                      gap: 2,
                                      marginTop: 4,
                                      position: "relative",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        responderMensagemChat(mensagem)
                                      }
                                      title="Responder com citação"
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#64748b",
                                        cursor: "pointer",
                                        fontSize: 11,
                                        padding: "3px 5px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      ↩ Responder
                                    </button>

                                    {minhaMensagem && (
                                      <>
                                        <button
                                          type="button"
                                          title="Mais opções"
                                          onClick={() =>
                                            setMenuMensagemAbertoId(
                                              (atual) =>
                                                atual === mensagem.id
                                                  ? null
                                                  : mensagem.id
                                            )
                                          }
                                          style={{
                                            width: 27,
                                            height: 25,
                                            borderRadius: 7,
                                            border: "none",
                                            background: "transparent",
                                            color: "#64748b",
                                            cursor: "pointer",
                                            fontSize: 16,
                                            lineHeight: 1,
                                          }}
                                        >
                                          ⋯
                                        </button>

                                        {menuMensagemAbertoId ===
                                          mensagem.id && (
                                          <div
                                            style={{
                                              position: "absolute",
                                              right: 0,
                                              bottom: 30,
                                              width: 142,
                                              zIndex: 35,
                                              overflow: "hidden",
                                              borderRadius: 10,
                                              border:
                                                "1px solid rgba(148,163,184,.16)",
                                              background:
                                                "rgba(8,18,34,.99)",
                                              boxShadow:
                                                "0 16px 38px rgba(0,0,0,.38)",
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                iniciarEdicaoMensagemChat(
                                                  mensagem
                                                )
                                              }
                                              style={{
                                                width: "100%",
                                                border: "none",
                                                borderBottom:
                                                  "1px solid rgba(148,163,184,.08)",
                                                background: "transparent",
                                                color: "#e2e8f0",
                                                padding: "9px 11px",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                fontSize: 11,
                                              }}
                                            >
                                              ✎ Editar
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                void excluirMensagemChatAtual(
                                                  mensagem
                                                )
                                              }
                                              style={{
                                                width: "100%",
                                                border: "none",
                                                background: "transparent",
                                                color: "#fca5a5",
                                                padding: "9px 11px",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                fontSize: 11,
                                              }}
                                            >
                                              🗑 Excluir
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                            </div>

                            {minhaMensagem && (
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  flexShrink: 0,
                                  borderRadius: "50%",
                                  display: "grid",
                                  placeItems: "center",
                                  background:
                                    "linear-gradient(135deg, #0ea5e9, #2563eb)",
                                  color: "#fff",
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                {iniciaisChat(
                                  usuarioLogado?.nome ||
                                    usuarioLogado?.login
                                )}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    <div id="dubworks-chat-fim" />
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "12px 15px 15px",
                  borderTop: "1px solid rgba(148,163,184,.11)",
                  position: "relative",
                }}
              >
                {matchMencaoChat &&
                  usuariosMencionaveisChat.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 58,
                        right: 70,
                        bottom: mensagemRespondendoChat ? 132 : 91,
                        zIndex: 30,
                        borderRadius: 13,
                        overflow: "hidden",
                        border:
                          "1px solid rgba(96,165,250,.28)",
                        background:
                          "rgba(8,18,34,.98)",
                        boxShadow:
                          "0 18px 45px rgba(0,0,0,.38)",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 10px",
                          color: "#64748b",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: ".06em",
                          borderBottom:
                            "1px solid rgba(148,163,184,.12)",
                        }}
                      >
                        MENCIONAR PESSOA
                      </div>

                      {usuariosMencionaveisChat.map((usuario) => (
                        <button
                          key={usuario.login || usuario.nome}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selecionarMencaoChat(usuario);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: "none",
                            borderBottom:
                              "1px solid rgba(148,163,184,.08)",
                            padding: "9px 11px",
                            background: "transparent",
                            color: "#e2e8f0",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              flexShrink: 0,
                              display: "grid",
                              placeItems: "center",
                              background:
                                "linear-gradient(135deg, #2563eb, #7c3aed)",
                              color: "#fff",
                              fontWeight: 900,
                              fontSize: 11,
                            }}
                          >
                            {iniciaisChat(
                              usuario.nome || usuario.login
                            )}
                          </span>

                          <span style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                color: "#f8fafc",
                                fontSize: 12,
                              }}
                            >
                              {usuario.nome || usuario.login}
                            </strong>
                            <small style={{ color: "#64748b" }}>
                              {cargoLabel(usuario.cargo)}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                {mensagemRespondendoChat && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                      borderRadius: 11,
                      padding: "8px 10px",
                      border: "1px solid rgba(96,165,250,.20)",
                      borderLeft: "3px solid #60a5fa",
                      background: "rgba(15,23,42,.72)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          color: "#7dd3fc",
                          fontSize: 10,
                          fontWeight: 900,
                          marginBottom: 2,
                        }}
                      >
                        Respondendo a {mensagemRespondendoChat.usuario_nome ||
                          mensagemRespondendoChat.usuario_login}
                      </div>
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {mensagemRespondendoChat.excluido_em
                          ? "Mensagem excluída"
                          : mensagemRespondendoChat.mensagem}
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Cancelar resposta"
                      onClick={() => setMensagemRespondendoChat(null)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {arquivosChatSelecionados.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    {arquivosChatSelecionados.map((arquivo, indice) => (
                      <div
                        key={`${arquivo.name}-${arquivo.size}-${indice}`}
                        style={{
                          maxWidth: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          borderRadius: 10,
                          padding: "7px 8px",
                          border:
                            "1px solid rgba(96,165,250,.20)",
                          background: "rgba(15,30,52,.72)",
                        }}
                      >
                        <span>📎</span>
                        <span
                          style={{
                            minWidth: 0,
                            maxWidth: 220,
                            color: "#cbd5e1",
                            fontSize: 10,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {arquivo.name}
                        </span>
                        <span style={{ color: "#64748b", fontSize: 9 }}>
                          {formatarTamanhoAnexoChat(arquivo.size)}
                        </span>
                        <button
                          type="button"
                          title="Remover anexo"
                          onClick={() =>
                            removerArquivoChatSelecionado(indice)
                          }
                          disabled={enviandoAnexosChat}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#94a3b8",
                            cursor: enviandoAnexosChat
                              ? "not-allowed"
                              : "pointer",
                            padding: 2,
                            fontSize: 14,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={inputAnexoChatRef}
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
                  onChange={selecionarArquivosChat}
                  style={{ display: "none" }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0,1fr) auto auto",
                    gap: 8,
                    alignItems: "end",
                    borderRadius: 14,
                    padding: "7px 8px",
                    border: "1px solid rgba(59,130,246,.22)",
                    background: "rgba(9,22,41,.92)",
                  }}
                >
                  <button
                    type="button"
                    disabled={
                      !canalAtivo ||
                      enviandoMensagemChat ||
                      enviandoAnexosChat
                    }
                    title="Adicionar anexo"
                    onClick={() => inputAnexoChatRef.current?.click()}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color:
                        canalAtivo && !enviandoAnexosChat
                          ? "#cbd5e1"
                          : "#64748b",
                      cursor:
                        canalAtivo &&
                        !enviandoMensagemChat &&
                        !enviandoAnexosChat
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    📎
                  </button>

                  <textarea
                    id="dubworks-chat-composer"
                    value={mensagemChat}
                    disabled={!canalAtivo || enviandoMensagemChat || enviandoAnexosChat}
                    onChange={(event) => atualizarTextoMensagemChat(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !enviandoMensagemChat
                      ) {
                        event.preventDefault();
                        enviarMensagemChatAtual();
                      }
                    }}
                    placeholder={
                      canalAtivo
                        ? "Digite uma mensagem..."
                        : "Selecione uma conversa..."
                    }
                    style={{
                      width: "100%",
                      minHeight: 38,
                      maxHeight: 110,
                      resize: "vertical",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      padding: "9px 4px 7px",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />

                  <button
                    type="button"
                    title="Adicionar emoji"
                    disabled={!canalAtivo || enviandoMensagemChat}
                    onClick={() =>
                      setMensagemChat((anterior) => `${anterior} 😊`)
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color: "#cbd5e1",
                      cursor: canalAtivo ? "pointer" : "not-allowed",
                    }}
                  >
                    ☺
                  </button>

                  <button
                    type="button"
                    onClick={enviarMensagemChatAtual}
                    disabled={
                      !canalAtivo ||
                      (!mensagemChat.trim() &&
                        arquivosChatSelecionados.length === 0) ||
                      enviandoMensagemChat ||
                      enviandoAnexosChat
                    }
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      border: "1px solid rgba(59,130,246,.35)",
                      background:
                        canalAtivo &&
                        (mensagemChat.trim() ||
                          arquivosChatSelecionados.length > 0) &&
                        !enviandoMensagemChat &&
                        !enviandoAnexosChat
                          ? "linear-gradient(135deg, #2563eb, #0284c7)"
                          : "rgba(51,65,85,.45)",
                      color: "#fff",
                      cursor:
                        canalAtivo &&
                        (mensagemChat.trim() ||
                          arquivosChatSelecionados.length > 0) &&
                        !enviandoMensagemChat &&
                        !enviandoAnexosChat
                          ? "pointer"
                          : "not-allowed",
                      fontWeight: 900,
                    }}
                  >
                    {enviandoMensagemChat || enviandoAnexosChat ? "…" : "➤"}
                  </button>
                </div>

                <div
                  style={{
                    color: "#475569",
                    fontSize: 10,
                    marginTop: 6,
                    paddingLeft: 4,
                  }}
                >
                  Enter envia · Shift + Enter quebra a linha · @ menciona · Anexos: até 5 arquivos, 25 MB cada
                </div>
              </div>
            </section>

            {!isTablet && painelInfoChatAberto && (
              <aside
                style={{
                  minWidth: 0,
                  maxHeight: 650,
                  overflowY: "auto",
                  padding: 14,
                  borderLeft: "1px solid rgba(148,163,184,.14)",
                  background: "rgba(8,18,34,.78)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <strong style={{ color: "#f8fafc" }}>Sobre o canal</strong>
                  <button
                    type="button"
                    onClick={() => setPainelInfoChatAberto(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: 18,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(15,30,52,.76)",
                    border: "1px solid rgba(148,163,184,.13)",
                  }}
                >
                  {projetoCanalAtivo?.Capa_URL ? (
                    <img
                      src={projetoCanalAtivo.Capa_URL}
                      alt={projetoCanalAtivo.Projeto}
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 11,
                        marginBottom: 12,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        marginBottom: 10,
                        background: "rgba(37,99,235,.18)",
                        color: "#60a5fa",
                        fontWeight: 900,
                        fontSize: 20,
                      }}
                    >
                      {canalAtivo?.tipo === "direta"
                        ? iniciaisChat(
                            outroUsuarioDireta?.nome || tituloCanal
                          )
                        : "#"}
                    </div>
                  )}

                  <strong
                    style={{
                      display: "block",
                      color: "#f8fafc",
                      fontSize: 16,
                    }}
                  >
                    {tituloCanal}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      color: "#94a3b8",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {subtituloCanal}
                  </span>
                </div>

                {projetoCanalAtivo && (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        padding: 14,
                        background: "rgba(15,30,52,.72)",
                        border: "1px solid rgba(148,163,184,.13)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {[
                        ["Status", projetoCanalAtivo.Status || "—"],
                        [
                          "Líder",
                          perfilLiderChat?.nome ||
                            projetoCanalAtivo.Lider ||
                            "—",
                        ],
                        [
                          "Editor",
                          perfilEditorChat?.nome ||
                            projetoCanalAtivo.Editor ||
                            "—",
                        ],
                      ].map(([label, valor]) => (
                        <div
                          key={label}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "62px 1fr",
                            gap: 8,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: "#64748b" }}>{label}</span>
                          <strong
                            style={{
                              color:
                                label === "Status"
                                  ? "#7dd3fc"
                                  : "#e2e8f0",
                            }}
                          >
                            {valor}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelecionadoId(projetoCanalAtivo.ID);
                          setMostrarFerramentas(false);
                          setCategoriaFerramentas("inicio");
                        }}
                        style={{
                          minHeight: 52,
                          borderRadius: 11,
                          border: "1px solid rgba(59,130,246,.30)",
                          background: "rgba(37,99,235,.12)",
                          color: "#dbeafe",
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        ↗ Abrir projeto
                      </button>

                      <button
                        type="button"
                        disabled={
                          !(
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link
                          )
                        }
                        onClick={() => {
                          const link =
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link ||
                            "";

                          if (link) {
                            window.open(
                              link,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }
                        }}
                        style={{
                          minHeight: 52,
                          borderRadius: 11,
                          border: "1px solid rgba(59,130,246,.22)",
                          background: "rgba(15,23,42,.78)",
                          color: "#dbeafe",
                          cursor:
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link
                              ? "pointer"
                              : "not-allowed",
                          opacity:
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link
                              ? 1
                              : 0.45,
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        📁 Drive
                      </button>
                    </div>
                  </>
                )}

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(15,30,52,.72)",
                    border: "1px solid rgba(148,163,184,.13)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "#f8fafc", fontSize: 13 }}>
                      {projetoCanalAtivo ? "Equipe vinculada" : "Membros"}
                    </strong>
                    <span style={{ color: "#60a5fa", fontSize: 11 }}>
                      {equipePainel.length}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 9,
                      marginTop: 11,
                    }}
                  >
                    {equipePainel.slice(0, 12).map((usuario) => (
                      <div
                        key={usuario.login || usuario.nome}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            background:
                              "linear-gradient(135deg, #2563eb, #7c3aed)",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {iniciaisChat(usuario.nome || usuario.login)}
                        </span>

                        <span style={{ minWidth: 0 }}>
                          <strong
                            style={{
                              display: "block",
                              color: "#e2e8f0",
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {usuario.nome || usuario.login}
                          </strong>
                          <small style={{ color: "#64748b" }}>
                            {cargoLabel(usuario.cargo)}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      );
    }

    if (categoriaFerramentas === "ia") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          {renderCabecalhoFerramenta()}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTablet
                ? "1fr"
                : "minmax(0, 0.85fr) minmax(320px, 1.15fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div style={painelDarkStyle}>
              <label
                style={{
                  display: "block",
                  color: "#cbd5e1",
                  fontWeight: 800,
                  marginBottom: 10,
                }}
              >
                O que você quer pedir à IA?
              </label>

              <textarea
                value={mensagemIA}
                onChange={(event) => setMensagemIA(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey || event.metaKey) &&
                    !carregandoIA
                  ) {
                    event.preventDefault();
                    enviarMensagemIA();
                  }
                }}
                placeholder="Ex.: organize o cronograma deste projeto, revise um aviso de seleção ou monte uma lista de tarefas..."
                style={{
                  width: "100%",
                  minHeight: 220,
                  resize: "vertical",
                  boxSizing: "border-box",
                  borderRadius: 14,
                  padding: 14,
                  background: "rgba(2,6,23,0.62)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  color: "#f8fafc",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={enviarMensagemIA}
                disabled={!mensagemIA.trim() || carregandoIA}
                style={{
                  ...botaoPrimarioStyle,
                  width: "100%",
                  marginTop: 14,
                  opacity: mensagemIA.trim() && !carregandoIA ? 1 : 0.55,
                  cursor:
                    mensagemIA.trim() && !carregandoIA
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {carregandoIA ? "Consultando a IA..." : "Enviar para a IA"}
              </button>

              <div
                style={{
                  marginTop: 10,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                Dica: Ctrl + Enter também envia a mensagem.
              </div>
            </div>

            <div style={painelDarkStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2 style={{ ...tituloCardDarkStyle, marginBottom: 4 }}>
                    ✦ IA DubWorks
                  </h2>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    Assistente conectado ao Gemini
                  </div>
                </div>

                {historicoIA.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoricoIA([]);
                      setAcaoPendenteIA(null);
                    }}
                    style={{
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(15,23,42,0.65)",
                      color: "#cbd5e1",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Limpar conversa
                  </button>
                )}
              </div>

              {acaoPendenteIA && (
                <div
                  style={{
                    marginBottom: 14,
                    borderRadius: 14,
                    padding: 16,
                    background: "rgba(245,158,11,0.09)",
                    border: "1px solid rgba(245,158,11,0.32)",
                  }}
                >
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
                      <div
                        style={{
                          color: "#fbbf24",
                          fontSize: 12,
                          fontWeight: 900,
                          marginBottom: 5,
                        }}
                      >
                        ALTERAÇÃO AGUARDANDO CONFIRMAÇÃO
                      </div>

                      <strong style={{ color: "#f8fafc", fontSize: 16 }}>
                        {acaoPendenteIA.projeto}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.22)",
                        color: "#fde68a",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {acaoPendenteIA.campo}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "minmax(0, 1fr) 34px minmax(0, 1fr)",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(2,6,23,0.54)",
                        border: "1px solid rgba(148,163,184,0.14)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        Valor atual
                      </div>
                      <strong style={{ color: "#cbd5e1" }}>
                        {acaoPendenteIA.valor_atual || "Vazio"}
                      </strong>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        color: "#fbbf24",
                        fontWeight: 900,
                      }}
                    >
                      →
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.22)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        Novo valor
                      </div>
                      <strong style={{ color: "#86efac" }}>
                        {acaoPendenteIA.novo_valor}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      disabled={salvandoAcaoIA}
                      onClick={() => setAcaoPendenteIA(null)}
                      style={{
                        border: "1px solid rgba(148,163,184,0.20)",
                        background: "rgba(15,23,42,0.70)",
                        color: "#cbd5e1",
                        borderRadius: 10,
                        padding: "9px 12px",
                        fontWeight: 800,
                        cursor: salvandoAcaoIA ? "not-allowed" : "pointer",
                        opacity: salvandoAcaoIA ? 0.55 : 1,
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={salvandoAcaoIA}
                      onClick={confirmarAcaoIA}
                      style={{
                        ...botaoPrimarioStyle,
                        padding: "9px 14px",
                        opacity: salvandoAcaoIA ? 0.65 : 1,
                        cursor: salvandoAcaoIA ? "not-allowed" : "pointer",
                      }}
                    >
                      {salvandoAcaoIA
                        ? "Salvando alteração..."
                        : "Confirmar alteração"}
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  maxHeight: 520,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {historicoIA.length === 0 ? (
                  <div
                    style={{
                      minHeight: 220,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      borderRadius: 14,
                      padding: 24,
                      background: "rgba(2,6,23,0.42)",
                      border: "1px solid rgba(148,163,184,0.14)",
                      color: "#94a3b8",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 38, marginBottom: 10 }}>✦</div>
                      <strong style={{ color: "#f8fafc" }}>
                        IA DubWorks pronta
                      </strong>
                      <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
                        Envie uma mensagem para começar a conversa.
                      </p>
                    </div>
                  </div>
                ) : (
                  historicoIA.map((item, indice) => (
                    <div
                      key={`${item.autor}-${indice}`}
                      style={{
                        display: "flex",
                        justifyContent:
                          item.autor === "usuario" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "88%",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.55,
                          borderRadius:
                            item.autor === "usuario"
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                          padding: "12px 14px",
                          background:
                            item.autor === "usuario"
                              ? "linear-gradient(135deg, #2563eb, #0ea5e9)"
                              : "rgba(2,6,23,0.62)",
                          border:
                            item.autor === "usuario"
                              ? "1px solid rgba(56,189,248,0.22)"
                              : "1px solid rgba(148,163,184,0.16)",
                          color: "#f8fafc",
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 5,
                            color:
                              item.autor === "usuario"
                                ? "#dbeafe"
                                : "#38bdf8",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {item.autor === "usuario" ? "Você" : "IA DubWorks"}
                        </div>

                        {item.texto}
                      </div>
                    </div>
                  ))
                )}

                {carregandoIA && (
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    ✦ A IA está pensando...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>Ferramentas</div>
            <h1 style={pageTitleDarkStyle}>Central de Ferramentas</h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Recursos internos de comunicação, organização e produção da
              DubWorks.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 18,
          }}
        >
          {ferramentas.map((ferramenta) => (
            <div key={ferramenta.id} style={cardFerramentaStyle}>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(56,189,248,0.10)",
                      border: "1px solid rgba(56,189,248,0.18)",
                      fontSize: 27,
                    }}
                  >
                    {ferramenta.icon}
                  </div>

                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      background:
                        ferramenta.status === "Disponível"
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(245,158,11,0.10)",
                      border:
                        ferramenta.status === "Disponível"
                          ? "1px solid rgba(34,197,94,0.22)"
                          : "1px solid rgba(245,158,11,0.20)",
                      color:
                        ferramenta.status === "Disponível"
                          ? "#86efac"
                          : "#fde68a",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {ferramenta.status}
                  </span>
                </div>

                <h2
                  style={{
                    ...tituloCardDarkStyle,
                    fontSize: 22,
                    marginTop: 18,
                  }}
                >
                  {ferramenta.titulo}
                </h2>

                <p
                  style={{
                    color: "#94a3b8",
                    lineHeight: 1.5,
                    margin: "9px 0 0",
                  }}
                >
                  {ferramenta.descricao}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCategoriaFerramentas(ferramenta.id)}
                style={{
                  ...botaoPrimarioStyle,
                  width: "100%",
                  minHeight: 44,
                }}
              >
                {ferramenta.acao}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
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
          {projetoPainel && statusSincronizacaoAutomatica !== "idle" && (
            <div
              style={{
                marginTop: 7,
                color:
                  statusSincronizacaoAutomatica === "erro"
                    ? "#fbbf24"
                    : statusSincronizacaoAutomatica === "sincronizando"
                    ? "#7dd3fc"
                    : "#86efac",
                fontSize: 12,
                fontWeight: 700,
                animation:
                  statusSincronizacaoAutomatica === "sincronizando"
                    ? "dwPulse 1.2s ease-in-out infinite"
                    : undefined,
              }}
            >
              {statusSincronizacaoAutomatica === "sincronizando"
                ? "↻ "
                : statusSincronizacaoAutomatica === "ok"
                ? "✓ "
                : "⚠ "}
              {mensagemSincronizacaoAutomatica}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!isMobile && (
            <button
              onClick={() =>
                setMostrarNotificacoesChat((anterior) => !anterior)
              }
              style={{
                ...botaoSecundarioStyle,
                border: mostrarNotificacoesChat
                  ? "1px solid rgba(96,165,250,.52)"
                  : botaoSecundarioStyle.border,
                background: mostrarNotificacoesChat
                  ? "rgba(37,99,235,.18)"
                  : botaoSecundarioStyle.background,
              }}
              title="Abrir notificações"
            >
              🔔 Notificações ({quantidadeNotificacoesNaoLidas})
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

      <div style={painelDarkStyle}>
        <h2 style={tituloCardDarkStyle}>{projetoPainel ? "Estatísticas do Projeto" : "Estatísticas Gerais"}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "minmax(0, 1fr)"
              : isTablet
              ? "repeat(2, minmax(220px, 1fr))"
              : "repeat(5, minmax(180px, 220px))",
            justifyContent: "center",
            gap: 14,
            width: "100%",
            maxWidth: isMobile
              ? "100%"
              : isTablet
              ? 760
              : 1180,
            margin: "18px auto 0",
          }}
        >
          <MiniStat
            icon="👥"
            value={String(estatisticasCards.membrosElenco)}
            label="Membros no Elenco"
            color="#3b82f6"
          />
          <MiniStat
            icon="🎙️"
            value={String(estatisticasCards.videosTestes)}
            label="Vídeos/Testes"
            color="#8b5cf6"
          />
          <MiniStat
            icon="🎬"
            value={String(estatisticasCards.finalizados).padStart(2, "0")}
            label="Episódios Finalizados"
            color="#22c55e"
          />
          <MiniStat
            icon="🕒"
            value={String(estatisticasCards.registros).padStart(2, "0")}
            label="Registros Semanais"
            color="#f97316"
          />
          <MiniStat
            icon="📈"
            value={`${estatisticasCards.progresso}%`}
            label="Progresso Geral"
            color="#14b8a6"
          />
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
            ["elenco", "🎭 Banco & Semanas"],
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
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                {observacoesVisiveis || "Sem observações cadastradas."}
              </div>
            </div>
          </div>
          {DrivePanel()}
        </div>
      )}

      {abaProjeto === "selecao" &&
        projetoPainel &&
        renderAbaSelecaoVisual(projetoPainel)}

      {abaProjeto === "elenco" && projetoPainel && (
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              ...painelDarkStyle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              border: "1px solid rgba(56,189,248,0.20)",
            }}
          >
            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 4 }}>
                🎬 Produção e Entregas
              </h2>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                {semanasProjeto.length
                  ? `${labelSemana(semanaFiltroProducao)} • ${participantesSemanaProjeto.length} participante(s) nesta semana`
                  : "Crie a primeira semana para vincular participantes. A sincronização do formulário de entregas continua disponível."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={botaoPrimarioStyle}
                disabled={
                  sincronizandoEntregas ||
                  liberandoSemana ||
                  enviandoLembretesWhatsapp
                }
                onClick={() => sincronizarEntregasProducao(projetoPainel)}
              >
                {sincronizandoEntregas
                  ? "Sincronizando formulário..."
                  : "🔄 Sincronizar formulário de entregas"}
              </button>

              {usuarioLogado?.cargo === "diretoria" && (
                <button
                  type="button"
                  style={{
                    ...botaoSecundarioStyle,
                    color: "#86efac",
                    border: "1px solid rgba(34, 197, 94, 0.30)",
                    background: "rgba(34, 197, 94, 0.10)",
                  }}
                  disabled={
                    enviandoLembretesWhatsapp ||
                    sincronizandoEntregas ||
                    liberandoSemana
                  }
                  onClick={() =>
                    enviarLembretesWhatsappPendentes(projetoPainel)
                  }
                >
                  {enviandoLembretesWhatsapp
                    ? "📱 Colocando na fila..."
                    : "📱 Enviar pendentes"}
                </button>
              )}
            </div>
          </div>

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
                <h2 style={tituloCardDarkStyle}>🎭 Banco do Projeto</h2>
                <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                  Cadastre os personagens uma única vez. Dublador, telefone e
                  função podem ficar vazios até a escalação ser definida.
                </p>
              </div>

              {rascunho && podeEditarProjeto(usuarioLogado, projetoPainel) && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={adicionarElencoRascunho}
                    style={botaoPrimarioStyle}
                  >
                    + Adicionar personagem
                  </button>

                  <button
                    type="button"
                    onClick={salvarElencoAtual}
                    style={{
                      ...botaoSecundarioStyle,
                      color: "#86efac",
                      border: "1px solid rgba(34, 197, 94, 0.30)",
                      background: "rgba(34, 197, 94, 0.10)",
                    }}
                  >
                    Salvar Banco do Projeto
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const banco = (rascunho || projetoPainel)?.Elenco || [];
              const comDublador = banco.filter((item) =>
                Boolean(item.dublador?.trim())
              ).length;
              const papeisAbertos = banco.length - comDublador;
              const semTelefone = banco.filter(
                (item) => item.dublador?.trim() && !item.telefone_dublador?.trim()
              ).length;

              return (
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
                    ["Personagens", String(banco.length)],
                    ["Com dublador", String(comDublador)],
                    ["Papéis abertos", String(papeisAbertos)],
                    ["Sem telefone", String(semTelefone)],
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
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>
                        {label}
                      </div>
                      <strong style={{ color: "#f8fafc", fontSize: 20 }}>
                        {valor}
                      </strong>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {((rascunho || projetoPainel)?.Elenco || []).length ? (
                ((rascunho || projetoPainel)?.Elenco || []).map((item, index) => {
                  const podeEditarBanco =
                    Boolean(rascunho) &&
                    podeEditarProjeto(usuarioLogado, projetoPainel);

                  return (
                    <div
                      key={item.id || index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "1.1fr 1.1fr 1fr 0.9fr auto",
                        gap: 12,
                        alignItems: "end",
                        background: "rgba(2,6,23,0.48)",
                        border: "1px solid rgba(148,163,184,0.12)",
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          Personagem *
                        </div>
                        {podeEditarBanco ? (
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
                        {podeEditarBanco ? (
                          <input
                            value={item.dublador || ""}
                            onChange={(e) =>
                              atualizarElencoRascunho(
                                index,
                                "dublador",
                                e.target.value
                              )
                            }
                            placeholder="Pode ficar vazio"
                            style={inputStyle}
                          />
                        ) : (
                          <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                            {item.dublador || "Papel aberto"}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          Número / ID
                        </div>
                        {podeEditarBanco ? (
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

                      <div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          Função
                        </div>
                        {podeEditarBanco ? (
                          <input
                            value={item.funcao || ""}
                            onChange={(e) =>
                              atualizarElencoRascunho(
                                index,
                                "funcao",
                                e.target.value
                              )
                            }
                            placeholder="Opcional"
                            style={inputStyle}
                          />
                        ) : (
                          <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                            {item.funcao || "-"}
                          </div>
                        )}
                      </div>

                      {podeEditarBanco && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          {item.dublador?.trim() && item.id && (
                            <button
                              type="button"
                              disabled={reabrindoPapelId === String(item.id)}
                              onClick={() => reabrirPapelProjeto(item)}
                              style={{
                                ...botaoSecundarioStyle,
                                color: "#fde68a",
                                border: "1px solid rgba(245,158,11,0.30)",
                                background: "rgba(245,158,11,0.10)",
                              }}
                            >
                              {reabrindoPapelId === String(item.id)
                                ? "Reabrindo..."
                                : "Reabrir papel"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => excluirElencoRascunho(item, index)}
                            style={{
                              ...botaoSecundarioStyle,
                              color: "#fca5a5",
                              border: "1px solid rgba(248,113,113,0.28)",
                              background: "rgba(220,38,38,0.12)",
                            }}
                          >
                            Retirar do banco
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    color: "#94a3b8",
                    border: "1px dashed rgba(148,163,184,0.24)",
                    borderRadius: 14,
                    padding: 18,
                    textAlign: "center",
                  }}
                >
                  Nenhum personagem cadastrado. Você pode criar o banco mesmo
                  antes de escolher os dubladores.
                </div>
              )}
            </div>
          </div>

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
                <h2 style={tituloCardDarkStyle}>📅 Semanas do Projeto</h2>
                <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                  Cada semana possui seu próprio grupo de personagens. Alterações
                  futuras no elenco não modificam as semanas anteriores.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {podeEditarProjeto(usuarioLogado, projetoPainel) && (
                  <button
                    type="button"
                    onClick={() => criarNovaSemanaProjeto(projetoPainel)}
                    disabled={criandoSemanaProjeto}
                    style={botaoPrimarioStyle}
                  >
                    {criandoSemanaProjeto
                      ? "Criando..."
                      : semanasProjeto.length
                      ? "+ Criar próxima semana"
                      : "+ Criar Semana 01"}
                  </button>
                )}

                {semanasProjeto.length > 0 &&
                  podeEditarProjeto(usuarioLogado, projetoPainel) && (
                    <button
                      type="button"
                      onClick={() => setMostrarAdicionarSemana(true)}
                      disabled={
                        alterandoParticipanteSemana ||
                        semanasProjeto.find(
                          (item) => item.semana === semanaFiltroProducao
                        )?.status === "concluida"
                      }
                      style={botaoSecundarioStyle}
                    >
                      + Adicionar dublador à semana
                    </button>
                  )}
              </div>
            </div>

            {!semanasProjeto.length ? (
              <div
                style={{
                  marginTop: 18,
                  border: "1px dashed rgba(56,189,248,0.26)",
                  background: "rgba(56,189,248,0.06)",
                  borderRadius: 16,
                  padding: 22,
                  color: "#cbd5e1",
                  textAlign: "center",
                }}
              >
                Nenhuma semana foi criada ainda. A primeira será
                automaticamente a <strong>Semana 01</strong>.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginTop: 18,
                  }}
                >
                  <select
                    value={semanaFiltroProducao}
                    onChange={(e) =>
                      setSemanaFiltroProducao(Number(e.target.value))
                    }
                    style={inputStyle}
                  >
                    {semanasProjeto
                      .slice()
                      .sort((a, b) => a.semana - b.semana)
                      .map((semana) => (
                        <option key={semana.id || semana.semana} value={semana.semana}>
                          {labelSemana(semana.semana)}
                        </option>
                      ))}
                  </select>

                  {(() => {
                    const semanaAtual = semanasProjeto.find(
                      (item) => item.semana === semanaFiltroProducao
                    );
                    const prazo = String(Reflect.get(Object(semanaAtual || {}), "prazo_em") || "");

                    return (
                      <>
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "9px 12px",
                            background:
                              semanaAtual?.status === "concluida"
                                ? "rgba(34,197,94,0.12)"
                                : "rgba(56,189,248,0.12)",
                            color:
                              semanaAtual?.status === "concluida"
                                ? "#86efac"
                                : "#7dd3fc",
                            border: "1px solid rgba(148,163,184,0.20)",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {semanaAtual?.status === "concluida"
                            ? "Semana concluída"
                            : "Semana aberta"}
                        </span>

                        {prazo && (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>
                            Prazo: {new Date(prazo).toLocaleString("pt-BR")}
                          </span>
                        )}

                        {semanaAtual?.status !== "concluida" &&
                          podeEditarProjeto(usuarioLogado, projetoPainel) && (
                            <button
                              type="button"
                              disabled={liberandoSemana}
                              onClick={() =>
                                concluirSemanaAtualProjeto(projetoPainel)
                              }
                              style={botaoSecundarioStyle}
                            >
                              {liberandoSemana
                                ? "Concluindo..."
                                : "Concluir semana"}
                            </button>
                          )}
                      </>
                    );
                  })()}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: 16,
                    borderRadius: 16,
                    background: "rgba(2, 6, 23, 0.42)",
                    border: "1px solid rgba(56,189,248,0.16)",
                  }}
                >
                  <div>
                    <strong style={{ color: "#f8fafc" }}>
                      🎬 Produção — {labelSemana(semanaFiltroProducao)}
                    </strong>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                      {participantesSemanaProjeto.length} participante(s)
                      cadastrado(s) nesta semana.
                    </div>
                  </div>

                </div>

                {(() => {
                  const elenco = participantesSemanaProjeto;
                  const entregasSemana = entregasProducao.filter(
                    (entrega) =>
                      numeroSemanaEntrega(entrega.semana) ===
                      semanaFiltroProducao
                  );
                  const totalElenco = elenco.length;
                  const totalEntregues = elenco.filter((item) =>
                    entregasSemana.some(
                      (entrega) =>
                        normalizar(entrega.personagem) ===
                        normalizar(item.personagem)
                    )
                  ).length;
                  const totalPendentes = Math.max(
                    totalElenco - totalEntregues,
                    0
                  );
                  const progresso =
                    totalElenco > 0
                      ? Math.round((totalEntregues / totalElenco) * 100)
                      : 0;
                  const semanaConcluida =
                    semanasProjeto.find(
                      (item) => item.semana === semanaFiltroProducao
                    )?.status === "concluida";

                  return (
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
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
                          ["Na semana", String(totalElenco)],
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
                            <strong
                              style={{ color: "#f8fafc", fontSize: 20 }}
                            >
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
                            background:
                              "linear-gradient(135deg, #22c55e, #38bdf8)",
                          }}
                        />
                      </div>

                      {carregandoParticipantesSemana ? (
                        <div style={{ color: "#94a3b8", padding: 18 }}>
                          Carregando participantes da semana...
                        </div>
                      ) : elenco.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {elenco.map((item) => {
                            const entrega = entregasSemana.find(
                              (envio) =>
                                normalizar(envio.personagem) ===
                                normalizar(item.personagem)
                            );

                            return (
                              <div
                                key={item.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: isMobile
                                    ? "1fr"
                                    : "1fr 1fr 0.8fr 1fr 1.2fr",
                                  gap: 12,
                                  alignItems: "center",
                                  background: "rgba(15, 23, 42, 0.70)",
                                  border:
                                    "1px solid rgba(148, 163, 184, 0.14)",
                                  borderRadius: 14,
                                  padding: 14,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 11,
                                    }}
                                  >
                                    Personagem
                                  </div>
                                  <strong style={{ color: "#f8fafc" }}>
                                    {item.personagem || "-"}
                                  </strong>
                                </div>

                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 11,
                                    }}
                                  >
                                    Dublador
                                  </div>
                                  <strong style={{ color: "#f8fafc" }}>
                                    {item.dublador || "-"}
                                  </strong>
                                  <div
                                    style={{
                                      color: "#64748b",
                                      fontSize: 11,
                                      marginTop: 3,
                                    }}
                                  >
                                    {item.telefone_dublador || "Sem número"}
                                  </div>
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
                                      border:
                                        "1px solid rgba(148, 163, 184, 0.14)",
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
                                    justifyContent: isMobile
                                      ? "flex-start"
                                      : "flex-end",
                                  }}
                                >
                                  {entrega && (
                                    <>
                                      <button
                                        type="button"
                                        style={botaoSecundarioStyle}
                                        onClick={() =>
                                          alterarStatusEntrega(
                                            entrega,
                                            "aprovado"
                                          )
                                        }
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        type="button"
                                        style={botaoSecundarioStyle}
                                        onClick={() =>
                                          alterarStatusEntrega(
                                            entrega,
                                            "regravacao"
                                          )
                                        }
                                      >
                                        Regravar
                                      </button>
                                    </>
                                  )}

                                  {!semanaConcluida &&
                                    podeEditarProjeto(
                                      usuarioLogado,
                                      projetoPainel
                                    ) && (
                                      <button
                                        type="button"
                                        disabled={alterandoParticipanteSemana}
                                        onClick={() =>
                                          removerParticipanteDaSemana(
                                            projetoPainel,
                                            item
                                          )
                                        }
                                        style={{
                                          ...botaoSecundarioStyle,
                                          color: "#fca5a5",
                                          border:
                                            "1px solid rgba(248,113,113,0.28)",
                                          background:
                                            "rgba(220,38,38,0.10)",
                                        }}
                                      >
                                        Remover da semana
                                      </button>
                                    )}
                                </div>

                                {entrega?.video_url && (
                                  <div
                                    style={{
                                      gridColumn: isMobile ? "1" : "1 / -1",
                                      background: "rgba(2, 6, 23, 0.62)",
                                      border:
                                        "1px solid rgba(56, 189, 248, 0.16)",
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
                      ) : (
                        <div
                          style={{
                            border:
                              "1px dashed rgba(148,163,184,0.24)",
                            borderRadius: 14,
                            padding: 18,
                            color: "#94a3b8",
                            textAlign: "center",
                          }}
                        >
                          Nenhum personagem foi adicionado a esta semana.
                          Clique em <strong>Adicionar dublador à semana</strong>.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
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


      {mostrarNotificacoesChat && (
        <>
          <button
            type="button"
            aria-label="Fechar notificações"
            onClick={() => setMostrarNotificacoesChat(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1590,
              border: "none",
              background: "transparent",
              cursor: "default",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: isMobile ? 58 : 70,
              right: isMobile ? 10 : 22,
              left: isMobile ? 10 : "auto",
              width: isMobile ? "auto" : 390,
              maxHeight: "min(650px, calc(100vh - 90px))",
              zIndex: 1610,
              overflow: "hidden",
              borderRadius: 17,
              border: "1px solid rgba(96,165,250,.24)",
              background:
                "linear-gradient(180deg, rgba(8,18,34,.99), rgba(7,16,31,.99))",
              boxShadow: "0 28px 70px rgba(0,0,0,.46)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 15px",
                borderBottom:
                  "1px solid rgba(148,163,184,.12)",
              }}
            >
              <div>
                <strong
                  style={{
                    color: "#f8fafc",
                    fontSize: 15,
                  }}
                >
                  🔔 Notificações
                </strong>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {quantidadeNotificacoesNaoLidas} não lida(s)
                </div>
              </div>

              {quantidadeNotificacoesNaoLidas > 0 && (
                <button
                  type="button"
                  onClick={marcarTodasNotificacoesLidasAtual}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#60a5fa",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div
              style={{
                maxHeight: "560px",
                overflowY: "auto",
              }}
            >
              {carregandoNotificacoesChat ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  Carregando notificações...
                </div>
              ) : notificacoesChat.length ? (
                notificacoesChat.map((notificacao) => {
                  const icone =
                    notificacao.tipo === "mencao"
                      ? "@"
                      : notificacao.tipo === "resposta"
                      ? "↩"
                      : "💬";

                  return (
                    <button
                      key={notificacao.id}
                      type="button"
                      onClick={() =>
                        abrirNotificacaoChat(notificacao)
                      }
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom:
                          "1px solid rgba(148,163,184,.09)",
                        background: notificacao.lida
                          ? "transparent"
                          : "rgba(37,99,235,.10)",
                        padding: "12px 14px",
                        display: "grid",
                        gridTemplateColumns: "36px minmax(0,1fr) auto",
                        gap: 10,
                        textAlign: "left",
                        color: "#e2e8f0",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          display: "grid",
                          placeItems: "center",
                          background:
                            notificacao.tipo === "mencao"
                              ? "rgba(124,58,237,.22)"
                              : notificacao.tipo === "resposta"
                              ? "rgba(14,165,233,.18)"
                              : "rgba(37,99,235,.18)",
                          color:
                            notificacao.tipo === "mencao"
                              ? "#c4b5fd"
                              : "#7dd3fc",
                          fontWeight: 900,
                        }}
                      >
                        {icone}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: "#f8fafc",
                            fontSize: 12,
                          }}
                        >
                          {notificacao.titulo}
                        </strong>
                        <span
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            color: "#94a3b8",
                            fontSize: 11,
                            lineHeight: 1.45,
                            marginTop: 3,
                          }}
                        >
                          {notificacao.texto_preview ||
                            "Abra para visualizar a mensagem."}
                        </span>
                        <small
                          style={{
                            display: "block",
                            color: "#475569",
                            marginTop: 4,
                            fontSize: 9,
                          }}
                        >
                          {new Date(
                            notificacao.created_at
                          ).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </span>

                      {!notificacao.lida && (
                        <span
                          title="Não lida"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: "#3b82f6",
                            marginTop: 5,
                            boxShadow:
                              "0 0 10px rgba(59,130,246,.65)",
                          }}
                        />
                      )}
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: 28,
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 8 }}>
                    🔕
                  </div>
                  Nenhuma notificação ainda.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toastNotificacaoChat && !mostrarNotificacoesChat && (
        <button
          type="button"
          onClick={() =>
            abrirNotificacaoChat(toastNotificacaoChat)
          }
          style={{
            position: "fixed",
            top: isMobile ? 66 : 74,
            right: isMobile ? 10 : 22,
            left: isMobile ? 10 : "auto",
            width: isMobile ? "auto" : 360,
            zIndex: 1580,
            borderRadius: 15,
            border: "1px solid rgba(96,165,250,.28)",
            background: "rgba(8,18,34,.98)",
            boxShadow: "0 20px 55px rgba(0,0,0,.42)",
            padding: 12,
            display: "grid",
            gridTemplateColumns: "38px minmax(0,1fr) auto",
            gap: 10,
            textAlign: "left",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              background:
                toastNotificacaoChat.tipo === "mencao"
                  ? "rgba(124,58,237,.22)"
                  : "rgba(37,99,235,.20)",
              color: "#7dd3fc",
              fontWeight: 900,
            }}
          >
            {toastNotificacaoChat.tipo === "mencao"
              ? "@"
              : toastNotificacaoChat.tipo === "resposta"
              ? "↩"
              : "💬"}
          </span>

          <span style={{ minWidth: 0 }}>
            <strong
              style={{
                display: "block",
                color: "#f8fafc",
                fontSize: 12,
              }}
            >
              {toastNotificacaoChat.titulo}
            </strong>
            <span
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 11,
                marginTop: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {toastNotificacaoChat.texto_preview}
            </span>
          </span>

          <span
            onClick={(event) => {
              event.stopPropagation();
              setToastNotificacaoChat(null);
            }}
            style={{
              color: "#64748b",
              padding: 3,
              fontSize: 16,
            }}
          >
            ×
          </span>
        </button>
      )}

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

          <button
            type="button"
            className="dw-mobile-notify-button"
            onClick={() =>
              setMostrarNotificacoesChat((anterior) => !anterior)
            }
            aria-label="Abrir notificações"
            style={{ position: "relative" }}
          >
            🔔
            {quantidadeNotificacoesNaoLidas > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -5,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  padding: "0 4px",
                  display: "grid",
                  placeItems: "center",
                  background: "#2563eb",
                  color: "#fff",
                  border: "2px solid #050816",
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                {quantidadeNotificacoesNaoLidas > 99
                  ? "99+"
                  : quantidadeNotificacoesNaoLidas}
              </span>
            )}
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
                  setMostrarAdvertencias(false);
                  setMostrarUsuarios(false);
                  setMostrarRelatorios(false);
                  setMostrarTreinamentos(false);
                  setMostrarFerramentas(false);
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
                    setMostrarAdvertencias(false);
                    setMostrarUsuarios(false);
                    setMostrarRelatorios(false);
                    setMostrarTreinamentos(false);
                    setMostrarFerramentas(false);
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
                    setMostrarAdvertencias(false);
                    setMostrarMembros(false);
                    setMostrarRelatorios(false);
                    setMostrarTreinamentos(false);
                    setMostrarFerramentas(false);
                    setMenuMobileAberto(false);
                  }}
                >
                  ♙ Usuários
                </button>
              )}

              {podeVerAdvertencias && (
                <button
                  type="button"
                  className={telaAtual === "advertencias" ? "active" : ""}
                  onClick={abrirTelaAdvertencias}
                >
                  ⚠ Advertências
                </button>
              )}

              <button
                type="button"
                className={telaAtual === "relatorios" ? "active" : ""}
                onClick={() => {
                  setMostrarRelatorios(true);
                  setMostrarAdvertencias(false);
                  setMostrarMembros(false);
                  setMostrarUsuarios(false);
                  setMostrarTreinamentos(false);
                  setMostrarFerramentas(false);
                  setMostrarFormNovoUsuario(false);
                  setMenuMobileAberto(false);
                }}
              >
                ▥ Relatórios
              </button>

              <button
                type="button"
                className={telaAtual === "ferramentas" ? "active" : ""}
                onClick={abrirTelaFerramentas}
              >
                🧰 Ferramentas
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

      {!isMobile && (
        <button
          type="button"
          aria-label="Abrir menu principal"
          title="Abrir menu"
          onClick={() => setMenuMobileAberto(true)}
          style={{
            position: "fixed",
            top: 18,
            left: 22,
            zIndex: 1450,
            width: 44,
            height: 44,
            borderRadius: 13,
            border: "1px solid rgba(96,165,250,.28)",
            background: "rgba(8,18,34,.95)",
            color: "#e2e8f0",
            cursor: "pointer",
            boxShadow: "0 12px 32px rgba(0,0,0,.30)",
            fontSize: 19,
            fontWeight: 900,
          }}
        >
          ☰
        </button>
      )}

      {!isMobile && menuMobileAberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu principal"
            onClick={() => setMenuMobileAberto(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1490,
              border: "none",
              background: "rgba(2,6,23,.58)",
              backdropFilter: "blur(2px)",
              cursor: "default",
            }}
          />

          <aside
            style={{
              width: 270,
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 1500,
              boxSizing: "border-box",
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.995), rgba(15,23,42,0.985))",
              borderRight: "1px solid rgba(96,165,250,0.22)",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              overflowY: "auto",
              padding: "28px 16px",
              gap: 22,
              boxShadow: "24px 0 60px rgba(0,0,0,.46)",
            }}
          >
            <button
              type="button"
              aria-label="Fechar menu"
              title="Fechar menu"
              onClick={() => setMenuMobileAberto(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 15,
                width: 32,
                height: 32,
                borderRadius: 9,
                border: "1px solid rgba(148,163,184,.16)",
                background: "rgba(15,23,42,.76)",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 18,
                zIndex: 2,
              }}
            >
              ×
            </button>

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
              setMostrarAdvertencias(false);
              setMostrarUsuarios(false);
              setMostrarRelatorios(false);
              setMostrarTreinamentos(false);
              setMostrarFerramentas(false);
              setMostrarFormNovoUsuario(false);
              setMenuMobileAberto(false);
            }}
          />
          {temAcesso(usuarioLogado, "acesso_membros") && (
            <SidebarItem
              id="membros"
              label={isMobile ? "" : "Membros"}
              icon="👥"
              onClick={() => {
                setMostrarMembros(true);
                setMostrarAdvertencias(false);
                setMostrarUsuarios(false);
                setMostrarRelatorios(false);
                setMostrarTreinamentos(false);
                setMostrarFerramentas(false);
                setMostrarFormNovoUsuario(false);
                recarregarMembros();
                setMenuMobileAberto(false);
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
                setMostrarAdvertencias(false);
                setMostrarMembros(false);
                setMostrarRelatorios(false);
                setMostrarTreinamentos(false);
                setMostrarFerramentas(false);
                setMenuMobileAberto(false);
              }}
            />
          )}
          {podeVerAdvertencias && (
            <SidebarItem
              id="advertencias"
              label={isMobile ? "" : "Advertências"}
              icon="⚠"
              onClick={abrirTelaAdvertencias}
            />
          )}
          <SidebarItem
            id="relatorios"
            label={isMobile ? "" : "Relatórios"}
            icon="▥"
            onClick={() => {
              setMostrarRelatorios(true);
              setMostrarAdvertencias(false);
              setMostrarMembros(false);
              setMostrarUsuarios(false);
              setMostrarTreinamentos(false);
              setMostrarFerramentas(false);
              setMostrarFormNovoUsuario(false);
              setMenuMobileAberto(false);
            }}
          />
          {!isMobile && (
            <SidebarItem
              id="ferramentas"
              label="Ferramentas"
              icon="🧰"
              onClick={() => {
                abrirTelaFerramentas();
                setMenuMobileAberto(false);
              }}
            />
          )}
          {!isMobile && (
            <SidebarItem
              id="treinamentos"
              label="Treinamentos"
              icon="◇"
              onClick={() => {
                abrirTelaTreinamentos();
                setMenuMobileAberto(false);
              }}
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
        </>
      )}

      <main
        className="dw-main-content"
        style={{
          flex: 1,
          padding: isMobile ? 14 : "26px 26px 26px 82px",
          minWidth: 0,
        }}
      >
        {telaAtual === "ferramentas"
          ? ToolsPage()
          : telaAtual === "treinamentos"
          ? TrainingPage()
          : telaAtual === "advertencias"
          ? AdvertenciasPage()
          : telaAtual === "membros"
          ? MembersPage()
          : telaAtual === "usuarios"
          ? UsersPage()
          : telaAtual === "relatorios"
          ? ReportsPage()
          : ProjectsPage()}
      </main>

      {modoModalAgenda && (
        <Modal
          titulo={
            modoModalAgenda === "novo"
              ? "Novo compromisso"
              : modoModalAgenda === "editar"
              ? "Editar compromisso"
              : eventoAgendaSelecionado?.titulo || "Compromisso"
          }
          onClose={() => {
            setModoModalAgenda(null);
            setEventoAgendaSelecionado(null);
          }}
        >
          {modoModalAgenda === "visualizar" && eventoAgendaSelecionado ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0,1fr))",
                  gap: 12,
                }}
              >
                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>DATA E HORÁRIO</div>
                  <strong style={{ color: "#f8fafc" }}>
                    {new Date(
                      eventoAgendaSelecionado.inicio
                    ).toLocaleString("pt-BR")}
                  </strong>
                  {eventoAgendaSelecionado.fim && (
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      até{" "}
                      {new Date(
                        eventoAgendaSelecionado.fim
                      ).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>

                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>PROJETO</div>
                  <strong style={{ color: "#f8fafc" }}>
                    {eventoAgendaSelecionado.projeto_id
                      ? projetosVisiveis.find(
                          (projeto) =>
                            Number(projeto.ID) ===
                            Number(eventoAgendaSelecionado.projeto_id)
                        )?.Projeto || "Projeto não encontrado"
                      : "Compromisso geral"}
                  </strong>
                </div>
              </div>

              {eventoAgendaSelecionado.descricao && (
                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>DESCRIÇÃO</div>
                  <div
                    style={{
                      color: "#cbd5e1",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    {eventoAgendaSelecionado.descricao}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {eventoAgendaSelecionado.link_reuniao && (
                  <button
                    type="button"
                    style={botaoPrimarioStyle}
                    onClick={() =>
                      window.open(
                        eventoAgendaSelecionado.link_reuniao,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    🔗 Entrar na reunião
                  </button>
                )}

                <button
                  type="button"
                  style={botaoSecundarioStyle}
                  onClick={() =>
                    editarCompromissoAgenda(eventoAgendaSelecionado)
                  }
                >
                  ✎ Editar
                </button>

                <button
                  type="button"
                  style={{
                    ...botaoSecundarioStyle,
                    color: "#fecaca",
                    border: "1px solid rgba(248,113,113,.28)",
                    background: "rgba(127,29,29,.16)",
                  }}
                  disabled={salvandoAgenda}
                  onClick={() =>
                    excluirCompromissoAgenda(eventoAgendaSelecionado)
                  }
                >
                  Excluir
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input
                  value={agendaForm.titulo}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      titulo: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Reunião de Diretores"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Início *</label>
                  <input
                    type="datetime-local"
                    value={agendaForm.inicio}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        inicio: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Término</label>
                  <input
                    type="datetime-local"
                    value={agendaForm.fim}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        fim: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select
                    value={agendaForm.tipo}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        tipo: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="compromisso">Compromisso</option>
                    <option value="reuniao">Reunião</option>
                    <option value="gravacao">Gravação</option>
                    <option value="prazo">Prazo</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Projeto relacionado</label>
                  <select
                    value={agendaForm.projeto_id}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        projeto_id: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Nenhum / geral</option>
                    {projetosVisiveis.map((projeto) => (
                      <option key={projeto.ID} value={projeto.ID}>
                        {projeto.Projeto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Link da reunião</label>
                <input
                  value={agendaForm.link_reuniao}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      link_reuniao: e.target.value,
                    }))
                  }
                  placeholder="Meet, Teams, Zoom ou outro link"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  value={agendaForm.descricao}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Pauta, orientações ou observações..."
                  style={{ ...textareaStyle, minHeight: 120 }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "center",
                  color: "#cbd5e1",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={agendaForm.dia_inteiro}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      dia_inteiro: e.target.checked,
                    }))
                  }
                />
                Evento de dia inteiro
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={botaoSecundarioStyle}
                  disabled={salvandoAgenda}
                  onClick={() => {
                    setModoModalAgenda(null);
                    setEventoAgendaSelecionado(null);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  style={botaoPrimarioStyle}
                  disabled={salvandoAgenda}
                  onClick={salvarCompromissoAgenda}
                >
                  {salvandoAgenda
                    ? "Salvando..."
                    : modoModalAgenda === "editar"
                    ? "Salvar alterações"
                    : "Salvar compromisso"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {advertenciaSelecionada && (
        <Modal
          titulo={`Advertência — linha ${advertenciaSelecionada.linha}`}
          onClose={() => setAdvertenciaSelecionada(null)}
        >
          {(() => {
            const membro = membroDaAdvertencia(advertenciaSelecionada);
            const valor = String(advertenciaSelecionada.valor || "").trim();

            return (
              <div style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(2,6,23,.40)",
                      border: "1px solid rgba(148,163,184,.12)",
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 10 }}>
                      ADVERTIDO
                    </div>
                    <div
                      style={{
                        color: "#f8fafc",
                        fontWeight: 900,
                        marginTop: 5,
                      }}
                    >
                      {membro?.nome || "Membro não vinculado"}
                    </div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {advertenciaSelecionada.advertido_telefone || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(2,6,23,.40)",
                      border: "1px solid rgba(148,163,184,.12)",
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 10 }}>
                      MODERADOR
                    </div>
                    <div
                      style={{
                        color: "#f8fafc",
                        fontWeight: 900,
                        marginTop: 5,
                      }}
                    >
                      {advertenciaSelecionada.moderador_telefone || "—"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    [
                      "Dia da ocorrência",
                      advertenciaSelecionada.data_ocorrencia || "Não informado",
                    ],
                    [
                      "Registrada em",
                      advertenciaSelecionada.timestamp || "—",
                    ],
                    ["Valor / Pontos", valor || "0"],
                  ].map(([titulo, conteudo]) => (
                    <div
                      key={titulo}
                      style={{
                        borderRadius: 12,
                        padding: 11,
                        background: "rgba(15,23,42,.54)",
                        border: "1px solid rgba(148,163,184,.10)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 10 }}>
                        {titulo}
                      </div>
                      <div
                        style={{
                          color: "#e2e8f0",
                          fontWeight: 800,
                          marginTop: 5,
                          fontSize: 12,
                        }}
                      >
                        {conteudo}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    DESCRIÇÃO DA OCORRÊNCIA
                  </div>
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 13,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.55,
                      color: "#e2e8f0",
                      background: "rgba(2,6,23,.42)",
                      border: "1px solid rgba(148,163,184,.12)",
                    }}
                  >
                    {advertenciaSelecionada.descricao || "Sem descrição."}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    PROVAS ({advertenciaSelecionada.provas.length})
                  </div>

                  {advertenciaSelecionada.provas.length ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      {advertenciaSelecionada.provas.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          onClick={() =>
                            window.open(url, "_blank", "noopener,noreferrer")
                          }
                          style={{
                            borderRadius: 10,
                            padding: "10px 12px",
                            border: "1px solid rgba(59,130,246,.18)",
                            background: "rgba(37,99,235,.08)",
                            color: "#bfdbfe",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 12,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📎 Prova {index + 1} — abrir no Drive
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      Nenhum arquivo foi vinculado a este registro.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {mostrarAdicionarPessoasChat && canalChatAtivoId && (
        <Modal
          titulo="Adicionar pessoas à conversa"
          onClose={() => {
            if (adicionandoPessoasChat) return;
            setMostrarAdicionarPessoasChat(false);
            setBuscaPessoasChat("");
            setPessoasSelecionadasChat([]);
          }}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.5 }}>
              Selecione usuários do DubWorks Manager para incluir nesta conversa.
              O histórico continua no mesmo chat, como em uma conversa em grupo.
            </p>

            <input
              value={buscaPessoasChat}
              onChange={(event) => setBuscaPessoasChat(event.target.value)}
              placeholder="Buscar pessoa por nome, e-mail ou cargo..."
              style={inputStyle}
            />

            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: 340,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {usuarios
                .filter(
                  (usuario) =>
                    normalizar(usuario.login) !==
                    normalizar(usuarioLogado?.login)
                )
                .filter(
                  (usuario) =>
                    !participantesChat.some(
                      (participante) =>
                        participante.canal_id === canalChatAtivoId &&
                        normalizar(participante.usuario_login) ===
                          normalizar(usuario.login)
                    )
                )
                .filter((usuario) => {
                  const termo = normalizar(buscaPessoasChat);
                  if (!termo) return true;

                  return [
                    usuario.nome,
                    usuario.login,
                    cargoLabel(usuario.cargo),
                  ]
                    .map((valor) => normalizar(valor || ""))
                    .some((valor) => valor.includes(termo));
                })
                .map((usuario) => {
                  const selecionado = pessoasSelecionadasChat.some(
                    (loginSelecionado) =>
                      normalizar(loginSelecionado) ===
                      normalizar(usuario.login)
                  );

                  return (
                    <label
                      key={usuario.login || usuario.nome}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        borderRadius: 12,
                        padding: 11,
                        cursor: "pointer",
                        border: selecionado
                          ? "1px solid rgba(59,130,246,.45)"
                          : "1px solid rgba(148,163,184,.14)",
                        background: selecionado
                          ? "rgba(37,99,235,.13)"
                          : "rgba(2,6,23,.36)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() =>
                          setPessoasSelecionadasChat((anteriores) =>
                            selecionado
                              ? anteriores.filter(
                                  (loginSelecionado) =>
                                    normalizar(loginSelecionado) !==
                                    normalizar(usuario.login)
                                )
                              : [...anteriores, usuario.login]
                          )
                        }
                      />

                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background:
                            "linear-gradient(135deg, rgba(37,99,235,.9), rgba(124,58,237,.85))",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {iniciaisChat(usuario.nome || usuario.login)}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: "#f8fafc",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {usuario.nome || usuario.login}
                        </strong>
                        <small style={{ color: "#64748b" }}>
                          {cargoLabel(usuario.cargo)} · {usuario.login}
                        </small>
                      </span>
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={confirmarAdicionarPessoasChat}
              disabled={
                !pessoasSelecionadasChat.length || adicionandoPessoasChat
              }
              style={{
                ...botaoPrimarioStyle,
                width: "100%",
                opacity:
                  pessoasSelecionadasChat.length && !adicionandoPessoasChat
                    ? 1
                    : 0.5,
                cursor:
                  pessoasSelecionadasChat.length && !adicionandoPessoasChat
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {adicionandoPessoasChat
                ? "Adicionando..."
                : `Adicionar ${pessoasSelecionadasChat.length || ""} pessoa(s)`}
            </button>
          </div>
        </Modal>
      )}

      {mostrarAdicionarSemana && projetoPainel && (
        <Modal
          titulo={`Adicionar dublador à ${labelSemana(
            semanaFiltroProducao
          )}`}
          onClose={() => setMostrarAdicionarSemana(false)}
          largo
        >
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Selecione no Banco do Projeto quem participa desta semana. O
              vínculo guarda uma fotografia da escalação atual, então trocas
              futuras de dublador não alteram esta semana.
            </p>

            {((rascunho || projetoPainel)?.Elenco || []).length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {((rascunho || projetoPainel)?.Elenco || []).map(
                  (item, index) => {
                    const idBancoValido = Number.isFinite(Number(item.id));
                    const jaAdicionado =
                      idBancoValido &&
                      participantesSemanaProjeto.some(
                        (participante) =>
                          participante.elenco_id === Number(item.id)
                      );
                    const semDublador = !item.dublador?.trim();

                    return (
                      <div
                        key={item.id || index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "1.2fr 1.2fr 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          background: "rgba(2,6,23,0.54)",
                          border:
                            "1px solid rgba(148,163,184,0.14)",
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div>
                          <div
                            style={{ color: "#94a3b8", fontSize: 11 }}
                          >
                            Personagem
                          </div>
                          <strong style={{ color: "#f8fafc" }}>
                            {item.personagem || "-"}
                          </strong>
                        </div>

                        <div>
                          <div
                            style={{ color: "#94a3b8", fontSize: 11 }}
                          >
                            Dublador
                          </div>
                          <strong
                            style={{
                              color: semDublador ? "#fde68a" : "#f8fafc",
                            }}
                          >
                            {item.dublador || "Papel aberto"}
                          </strong>
                        </div>

                        <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                          {item.telefone_dublador || "Sem número"}
                        </div>

                        <button
                          type="button"
                          disabled={
                            jaAdicionado ||
                            semDublador ||
                            !idBancoValido ||
                            alterandoParticipanteSemana
                          }
                          onClick={async () => {
                            await adicionarParticipanteNaSemana(
                              projetoPainel,
                              item
                            );
                          }}
                          style={{
                            ...botaoPrimarioStyle,
                            opacity:
                              jaAdicionado || semDublador || !idBancoValido
                                ? 0.55
                                : 1,
                            cursor:
                              jaAdicionado || semDublador || !idBancoValido
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {jaAdicionado
                            ? "✓ Na semana"
                            : semDublador
                            ? "Sem dublador"
                            : !idBancoValido
                            ? "Salve o banco"
                            : "+ Adicionar"}
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div style={{ color: "#94a3b8" }}>
                O Banco do Projeto ainda está vazio.
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <button
                type="button"
                onClick={() => setMostrarAdicionarSemana(false)}
                style={botaoSecundarioStyle}
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                  {campo === "Status" ? (
                    <select
                      value={String((novoProjeto as any)[campo] || "")}
                      onChange={(e) =>
                        setNovoProjeto((anterior) => ({
                          ...anterior,
                          [campo]: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="">Selecione o status</option>
                      {STATUS_PROJETO_OPCOES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
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
                  )}
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
              <h3 style={{ ...tituloCardDarkStyle, marginBottom: 6 }}>
                Banco inicial de personagens
              </h3>
              <p style={{ color: "#94a3b8", margin: "0 0 14px" }}>
                Apenas o personagem é obrigatório. Dublador, número/ID e função
                podem ser definidos depois.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(5, minmax(0, 1fr))",
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
                  placeholder="Dublador (opcional)"
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
                  placeholder="Número / ID (opcional)"
                  value={novoElencoProjeto.telefone_dublador || ""}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      telefone_dublador: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="Função (opcional)"
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
                          — {item.dublador || "Papel aberto"}{" "}
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
    <div style={{ ...overlayStyle, animation: "dwFade .16s ease-out both" }}>
      <div
        style={{
          animation: "dwModalIn .18s ease-out both",
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
function AssistenteIA({
  aberto,
  onClose,
}: {
  aberto: boolean;
  onClose: () => void;
}) {
  const [mensagem, setMensagem] = React.useState("");
  const [resposta, setResposta] = React.useState("");

  async function enviarParaIA() {
    if (!mensagem.trim()) return;

    setResposta("Analisando...");

    try {
      const retorno = await fetch("http://localhost:8000/ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensagem,
        }),
      });

      const dados = await retorno.json();

      setResposta(dados.resposta);
    } catch (erro) {
      setResposta("Erro ao conectar com a IA.");
    }
  }

  if (!aberto) return null;

  return (
    <Modal titulo="Assistente IA DubWorks" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>

        <textarea
          placeholder="Pergunte algo para a IA..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          style={textareaStyle}
        />

        <button
          onClick={enviarParaIA}
          style={botaoPrimarioStyle}
        >
          Enviar para IA
        </button>


        {resposta && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(15,23,42,0.8)",
              border: `1px solid ${estilos.borda}`,
              color: estilos.texto,
              lineHeight: 1.5,
            }}
          >
            {resposta}
          </div>
        )}

      </div>
    </Modal>
  );
}
const agendaInfoCardStyle: React.CSSProperties = {
  borderRadius: 13,
  padding: 14,
  background: "rgba(2,6,23,.48)",
  border: "1px solid rgba(148,163,184,.14)",
};

const agendaInfoLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0.5,
  marginBottom: 6,
};

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

@keyframes dwPageIn {
  from { opacity: 0; transform: translateY(7px) scale(.995); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dwModalIn {
  from { opacity: 0; transform: translateY(12px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dwFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dw-main-content > * {
  animation: dwPageIn .20s ease-out both;
}

button, input, select, textarea {
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(1px) scale(.975);
  transition-duration: .07s;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid rgba(56, 189, 248, .55);
  outline-offset: 2px;
}

.dw-calendar-event:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 8px 20px rgba(0,0,0,.18);
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