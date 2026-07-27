import { supabase } from "../lib/supabase";
import { FORMS_COPIER_URL, permissoesDisponiveis } from "../config/appConfig";
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
  TrainingStatus,
  Usuario,
  DriveStructureResult,
} from "../types";

export function normalizar(valor?: string) {
  return (valor || "").trim().toLowerCase();
}

export function cargoLabel(cargo: Cargo) {
  const labels: Record<Cargo, string> = {
    diretoria: "Diretoria",
    adm: "ADM",
    adm_treinamento: "ADM Treinamento",
    lider: "Líder",
    lider_treinamento: "Líder em treinamento",
    editor: "Editor",
    membro: "Membro",
  };
  return labels[cargo] || cargo;
}

export function statusTreinamentoLabel(status?: TrainingStatus) {
  const labels: Record<TrainingStatus, string> = {
    nao_aplicavel: "Não aplicável",
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    reprovado: "Reprovado",
  };
  return labels[status || "nao_aplicavel"];
}

export function statusMembroLabel(status?: StatusMembro) {
  const labels: Record<StatusMembro, string> = {
    na_comunidade: "Na comunidade",
    saiu: "Saiu",
    banido: "Banido",
    pausado: "Pausado",
  };
  return labels[status || "na_comunidade"];
}

export function corStatusMembro(status?: StatusMembro) {
  const s = status || "na_comunidade";
  if (s === "na_comunidade")
    return { bg: "rgba(8,116,67,0.22)", color: "#087443" };
  if (s === "saiu") return { bg: "rgba(180,83,9,0.22)", color: "#f59e0b" };
  if (s === "banido") return { bg: "rgba(194,65,12,0.22)", color: "#fb7185" };
  return { bg: "rgba(37,99,235,0.20)", color: "#93c5fd" };
}

export function statusPadraoPorCargo(cargo: Cargo): TrainingStatus {
  return cargo === "lider_treinamento" ? "em_andamento" : "nao_aplicavel";
}

export function permissaoPadraoPorCargo(cargo: Cargo, chave: ChavePermissao) {
  if (cargo === "diretoria") return true;

  if (cargo === "adm") {
    return [
      "acesso_projetos",
      "acesso_membros",
      "acesso_usuarios",
      "acesso_relatorios_projetos",
      "acesso_relatorios_elenco",
      "acesso_exportacoes",
    ].includes(chave);
  }

  if (cargo === "adm_treinamento") {
    return ["acesso_usuarios", "acesso_treinamentos"].includes(chave);
  }

  if (cargo === "lider" || cargo === "lider_treinamento") {
    return [
      "acesso_projetos",
      "acesso_relatorios_elenco",
      "acesso_exportacoes",
    ].includes(chave);
  }

  if (cargo === "editor") {
    return ["acesso_projetos"].includes(chave);
  }

  return false;
}

export function temAcesso(usuario: Usuario | null, chave: ChavePermissao) {
  if (!usuario) return false;
  if (usuario.cargo === "diretoria") return true;

  const valor = usuario[chave];
  if (typeof valor === "boolean") return valor;

  return permissaoPadraoPorCargo(usuario.cargo, chave);
}

export function permissoesPadraoUsuario(cargo: Cargo) {
  return permissoesDisponiveis.reduce((acc, item) => {
    acc[item.chave] = permissaoPadraoPorCargo(cargo, item.chave);
    return acc;
  }, {} as Record<ChavePermissao, boolean>);
}

export function podeVerProjeto(usuario: Usuario | null, projeto: Projeto) {
  if (!usuario) return false;

  const cargo = normalizar(usuario.cargo);
  const vinculo = normalizar(usuario.vinculo);
  const login = normalizar(usuario.login);
  const nome = normalizar(usuario.nome);
  const lider = normalizar(projeto.Lider);
  const editor = normalizar(projeto.Editor);

  if (["diretoria", "adm", "adm_treinamento"].indexOf(cargo) !== -1) {
    return true;
  }

  if (cargo === "lider" || cargo === "lider_treinamento") {
    return lider === vinculo || lider === login || lider === nome;
  }

  if (cargo === "editor") {
    return editor === vinculo || editor === login || editor === nome;
  }

  return false;
}

export function podeEditarProjeto(usuario: Usuario | null, projeto: Projeto | null) {
  if (!usuario || !projeto) return false;

  const cargo = normalizar(usuario.cargo);
  const vinculo = normalizar(usuario.vinculo);
  const login = normalizar(usuario.login);
  const nome = normalizar(usuario.nome);
  const lider = normalizar(projeto.Lider);

  if (cargo === "diretoria" || cargo === "adm") return true;

  if (cargo === "lider" || cargo === "lider_treinamento") {
    return lider === vinculo || lider === login || lider === nome;
  }

  return false;
}

export function podeCriarProjeto(usuario: Usuario | null) {
  if (!usuario) return false;
  return (
    ["diretoria", "adm", "lider", "lider_treinamento"].indexOf(
      usuario.cargo
    ) !== -1
  );
}

export function podeSubirVideoEditor(
  usuario: Usuario | null,
  projeto: Projeto | null
) {
  if (!usuario || !projeto) return false;

  const cargo = normalizar(usuario.cargo);
  const vinculo = normalizar(usuario.vinculo);
  const login = normalizar(usuario.login);
  const nome = normalizar(usuario.nome);
  const editor = normalizar(projeto.Editor);

  if (["diretoria", "adm"].indexOf(cargo) !== -1) return true;
  if (cargo === "editor") {
    return editor === vinculo || editor === login || editor === nome;
  }
  return false;
}

export function podeGerenciarUsuarios(usuario: Usuario | null) {
  return temAcesso(usuario, "acesso_usuarios");
}

export function podeGerenciarMembros(usuario: Usuario | null) {
  return temAcesso(usuario, "acesso_membros");
}

export function podeGerenciarTreinamentos(usuario: Usuario | null) {
  return temAcesso(usuario, "acesso_treinamentos");
}

export function podeVerNotificacoesGerais(usuario: Usuario | null) {
  if (!usuario) return false;
  return usuario.cargo === "diretoria" || usuario.cargo === "adm";
}

export function podeExcluirUsuario(usuarioLogado: Usuario | null, alvo: Usuario) {
  if (!usuarioLogado) return false;
  if (alvo.cargo === "diretoria" && usuarioLogado.cargo !== "diretoria")
    return false;
  if (usuarioLogado.cargo === "diretoria") return true;
  if (usuarioLogado.cargo === "adm") return alvo.cargo !== "diretoria";
  if (usuarioLogado.cargo === "adm_treinamento") {
    return alvo.cargo === "lider_treinamento";
  }
  return false;
}

export function cargosPermitidosParaCriar(usuario: Usuario | null): Cargo[] {
  if (!usuario) return [];
  if (usuario.cargo === "diretoria") {
    return [
      "diretoria",
      "adm",
      "adm_treinamento",
      "lider",
      "lider_treinamento",
      "editor",
      "membro",
    ];
  }
  if (usuario.cargo === "adm") {
    return ["lider", "lider_treinamento", "editor", "membro"];
  }
  if (usuario.cargo === "adm_treinamento") {
    return ["lider_treinamento"];
  }
  return [];
}

export function corStatus(status: string) {
  const s = normalizar(status);
  if (s.indexOf("conclu") !== -1 || s.indexOf("final") !== -1) {
    return { bg: "rgba(8,116,67,0.22)", color: "#087443" };
  }
  if (s.indexOf("exec") !== -1 || s.indexOf("andamento") !== -1) {
    return { bg: "rgba(37,99,235,0.20)", color: "#93c5fd" };
  }
  if (s.indexOf("interromp") !== -1 || s.indexOf("paus") !== -1) {
    return { bg: "rgba(194,65,12,0.22)", color: "#fb7185" };
  }
  if (s.indexOf("stand") !== -1) {
    return { bg: "rgba(37,99,235,0.20)", color: "#93c5fd" };
  }
  return { bg: "rgba(30,41,59,0.80)", color: "#cbd5e1" };
}

export function numeroSemanaEntrega(valor?: string | number | null) {
  const texto = String(valor || "").trim();
  if (!texto) return 1;

  const match = texto.match(/\d+/);
  if (!match) return 1;

  const numero = Number(match[0]);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

export function labelSemana(numero: number) {
  return `Semana ${String(numero).padStart(2, "0")}`;
}

export function escaparCSV(valor?: string) {
  const texto = String(valor || "").replace(/"/g, '""');
  return `"${texto}"`;
}

export function mapUsuarioDb(item: any): Usuario {
  return {
    id: item.id,
    nome: item.nome || "",
    login: item.login || "",
    senha: item.senha || null,
    cargo: normalizar(item.cargo) as Cargo,
    vinculo: item.vinculo || "",
    training_status: (item.training_status ||
      "nao_aplicavel") as TrainingStatus,
    criado_por: item.criado_por || null,
    data_criacao: item.data_criacao || null,
    acesso_projetos: item.acesso_projetos ?? null,
    acesso_membros: item.acesso_membros ?? null,
    acesso_usuarios: item.acesso_usuarios ?? null,
    acesso_relatorios_projetos: item.acesso_relatorios_projetos ?? null,
    acesso_relatorios_elenco: item.acesso_relatorios_elenco ?? null,
    acesso_relatorios_membros: item.acesso_relatorios_membros ?? null,
    acesso_relatorios_entrada_saida:
      item.acesso_relatorios_entrada_saida ?? null,
    acesso_exportacoes: item.acesso_exportacoes ?? null,
    acesso_treinamentos: item.acesso_treinamentos ?? null,
  };
}

export function mapProjetoDb(item: any, elenco: ElencoItem[]): Projeto {
  return {
    ID: String(item.id),
    Projeto: item.projeto || "",
    Tipo: item.tipo || "",
    Genero: item.genero || "",
    Prioridade: item.prioridade || "",
    Dupla: item.dupla || "",
    Lider: item.lider || "",
    Telefone_Lider: item.telefone_lider || "",
    Editor: item.editor || "",
    Telefone_Editor: item.telefone_editor || "",
    Status: item.status || "",
    Data_Inicio: item.data_inicio || "",
    Video_Editor_Link: item.video_editor_link || "",
    Registro_Semanal: item.registro_semanal || "",
    Observacoes: item.observacoes || "",
    Capa_URL: item.capa_url || "",
    Drive_Pasta_Link: item.drive_pasta_link || item.Drive_Pasta_Link || "",
    Drive_Videos_Link: item.drive_videos_link || item.Drive_Videos_Link || "",
    Drive_Cortes_Link: item.drive_cortes_link || item.Drive_Cortes_Link || "",
    Drive_Final_Link: item.drive_final_link || item.Drive_Final_Link || "",
    Arquivado: Boolean(item.arquivado),
    Elenco: elenco,
  };
}

export function mapMembroDb(item: any): Membro {
  return {
    id: item.id,
    nome: item.nome || "",
    telefone: item.telefone || "",
    email: item.email || "",
    data_nascimento: item.data_nascimento || null,
    idade: item.idade ?? null,
    habilidades: item.habilidades || "",
    motivacao: item.motivacao || "",
    status: (item.status_comunidade ||
      item.status ||
      "na_comunidade") as StatusMembro,
    data_entrada: item.data_entrada || null,
    data_saida: item.data_saida || null,
    observacao: item.observacao || "",
  };
}

export async function criarEstruturaDriveViaFunction(
  projetoNome: string,
  leaderEmail = "",
  editorEmail = ""
): Promise<DriveStructureResult> {
  const response = await fetch(
    "https://omgjbafqukpzdhhpdlaa.supabase.co/functions/v1/google-drive-create-structure",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT",
        Authorization: "Bearer sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT",
      },
      body: JSON.stringify({
        projectName: projetoNome,
        leaderEmail,
        editorEmail,
        folders: ["1 | Seleção", "2 | Projeto", "3 | Finalizado"],
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Erro da Edge Function Google Drive:", data);
    throw new Error(
      data?.error ||
        data?.message ||
        `Edge Function retornou erro HTTP ${response.status}`
    );
  }

  if (!data) {
    throw new Error("A Edge Function não retornou dados.");
  }

  if (data.error) {
    console.error("Erro retornado pela Edge Function:", data);
    throw new Error(String(data.error));
  }

  return data as DriveStructureResult;
}

export async function copiarFormulariosViaAppsScript(
  projetoNome: string,
  respostasSelecaoFolderId?: string,
  entregasFolderId?: string
): Promise<Partial<DriveStructureResult>> {
  if (!respostasSelecaoFolderId || !entregasFolderId) {
    console.warn("Pastas para formulários ausentes:", {
      respostasSelecaoFolderId,
      entregasFolderId,
    });
    return {};
  }

  const response = await fetch(FORMS_COPIER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      projectName: projetoNome,
      respostasSelecaoFolderId,
      entregasFolderId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Erro ao chamar Apps Script dos formulários:", data);
    throw new Error(
      data?.error ||
        data?.message ||
        `Apps Script retornou erro HTTP ${response.status}`
    );
  }

  if (!data) {
    throw new Error("O Apps Script não retornou dados.");
  }

  if (data.error) {
    console.error("Erro retornado pelo Apps Script:", data);
    throw new Error(String(data.error));
  }

  return {
    formSelecao: data.formSelecao?.editUrl || data.formSelecao?.viewUrl || "",
    formSelecaoId: data.formSelecao?.id || "",
    formEntregas:
      data.formEntregas?.editUrl || data.formEntregas?.viewUrl || "",
    formEntregasId: data.formEntregas?.id || "",
    planilhaSelecao: data.planilhaSelecao?.url || "",
    planilhaSelecaoId: data.planilhaSelecao?.id || "",
    planilhaEntregas: data.planilhaEntregas?.url || "",
    planilhaEntregasId: data.planilhaEntregas?.id || "",
  };
}

export function extrairGoogleFileId(urlOuId?: string) {
  const texto = String(urlOuId || "").trim();
  if (!texto) return "";

  const matchD = texto.match(/\/d\/([^/]+)/);
  if (matchD?.[1]) return matchD[1];

  const matchId = texto.match(/[?&]id=([^&]+)/);
  if (matchId?.[1]) return matchId[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(texto)) return texto;

  return "";
}

export function extrairGoogleFolderId(urlOuId?: string) {
  const texto = String(urlOuId || "").trim();
  if (!texto) return "";

  const matchFolders = texto.match(/\/folders\/([^/?]+)/);
  if (matchFolders?.[1]) return matchFolders[1];

  const matchId = texto.match(/[?&]id=([^&]+)/);
  if (matchId?.[1]) return matchId[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(texto)) return texto;

  return "";
}

export function converterDriveParaPreview(url?: string) {
  const id = extrairGoogleFileId(url);
  if (!id) return String(url || "");
  return `https://drive.google.com/file/d/${id}/preview`;
}

export async function lerRespostasSelecaoViaAppsScript(
  planilhaSelecaoIdOuUrl: string,
  pastaRespostasSelecaoIdOuUrl = ""
): Promise<RespostaSelecao[]> {
  const spreadsheetId = extrairGoogleFileId(planilhaSelecaoIdOuUrl);
  const folderId = extrairGoogleFolderId(pastaRespostasSelecaoIdOuUrl);

  if (!spreadsheetId && !folderId) {
    throw new Error(
      "Não encontrei a planilha de seleção nem a pasta de respostas neste projeto."
    );
  }

  const response = await fetch(
    "https://omgjbafqukpzdhhpdlaa.supabase.co/functions/v1/google-drive-create-structure",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT",
        Authorization: "Bearer sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT",
      },
      body: JSON.stringify({
        action: "ler_respostas_selecao",
        spreadsheetId,
        folderId,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Erro ao ler respostas pela Edge Function:", data);
    throw new Error(
      data?.error ||
        data?.message ||
        `Edge Function retornou erro HTTP ${response.status}`
    );
  }

  if (!data) {
    throw new Error("A Edge Function não retornou dados.");
  }

  if (data.error) {
    console.error("Erro retornado pela Edge Function:", data);
    throw new Error(String(data.error));
  }

  return (data.respostas || []).map((item: any, index: number) => ({
    id: String(item.id || item.linha || index + 1),
    linha: Number(item.linha || index + 2),
    timestamp: item.timestamp || item.data || "",
    nome: item.nome || item.membro || "",
    telefone: item.telefone || item.numero || item.whatsapp || "",
    personagem: item.personagem || "",
    semana: item.semana || "Semana 01",
    videoUrl: item.videoUrl || item.video || item.envio || item.link || "",
    comentario: item.comentario || item.observacao || "",
    status: (item.status || "pendente") as StatusSelecao,
  }));
}

export async function salvarAvaliacaoSelecaoBanco(
  avaliacao: AvaliacaoSelecao
): Promise<boolean> {
  const payload = {
    projeto_id: avaliacao.projeto_id,
    resposta_id: avaliacao.resposta_id,
    linha: avaliacao.linha ?? null,
    nome: avaliacao.nome,
    telefone: avaliacao.telefone,
    personagem: avaliacao.personagem,
    semana: avaliacao.semana,
    video_url: avaliacao.video_url,
    comentario_membro: avaliacao.comentario_membro,
    status: avaliacao.status,
    comentario_lider: avaliacao.comentario_lider,
    avaliado_por: avaliacao.avaliado_por,
  };

  const { error } = await supabase.from("selecao_avaliacoes").upsert(payload, {
    onConflict: "projeto_id,resposta_id",
  });

  if (error) {
    console.error("Erro ao salvar avaliação da seleção:", error);
    return false;
  }

  return true;
}

export async function carregarAvaliacoesSelecaoBanco(
  projetoId: string
): Promise<AvaliacaoSelecao[]> {
  const { data, error } = await supabase
    .from("selecao_avaliacoes")
    .select("*")
    .eq("projeto_id", Number(projetoId))
    .order("data_avaliacao", { ascending: false });

  if (error) {
    console.error("Erro ao carregar avaliações da seleção:", error);
    return [];
  }

  return (data || []) as AvaliacaoSelecao[];
}

export async function lerRespostasEntregasViaEdge(
  planilhaEntregasIdOuUrl: string,
  pastaEntregasIdOuUrl = ""
): Promise<EntregaProducao[]> {
  const spreadsheetId = extrairGoogleFileId(planilhaEntregasIdOuUrl);
  const folderId = extrairGoogleFolderId(pastaEntregasIdOuUrl);

  if (!spreadsheetId && !folderId) {
    throw new Error(
      "Não encontrei a planilha nem a pasta de entregas neste projeto."
    );
  }

  const response = await fetch(
    "https://omgjbafqukpzdhhpdlaa.supabase.co/functions/v1/google-drive-create-structure",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT",
        Authorization: "Bearer sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT",
      },
      body: JSON.stringify({
        action: "ler_respostas_entregas",
        spreadsheetId,
        folderId,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Erro ao ler entregas pela Edge Function:", data);
    throw new Error(
      data?.error ||
        data?.message ||
        `Edge Function retornou erro HTTP ${response.status}`
    );
  }

  if (!data) throw new Error("A Edge Function não retornou dados.");
  if (data.error) throw new Error(String(data.error));

  return (data.respostas || []).map((item: any, index: number) => ({
    projeto_id: 0,
    resposta_id: String(item.id || item.linha || index + 1),
    linha: Number(item.linha || index + 2),
    personagem: item.personagem || "",
    dublador: item.dublador || item.nome || item.membro || "",
    telefone: item.telefone || item.numero || item.whatsapp || "",
    semana: item.semana || "Semana 01",
    video_url: item.videoUrl || item.video || item.envio || item.link || "",
    comentario: item.comentario || item.observacao || "",
    status: (item.status || "pendente") as
      | "pendente"
      | "aprovado"
      | "regravacao",
    data_envio: item.timestamp || item.data || "",
  }));
}

export async function salvarEntregasProducaoBanco(
  projetoId: string,
  entregas: EntregaProducao[]
): Promise<boolean> {
  if (!entregas.length) return true;

  const payload = entregas.map((item) => ({
    projeto_id: Number(projetoId),
    resposta_id: item.resposta_id,
    linha: item.linha ?? null,
    personagem: item.personagem,
    dublador: item.dublador,
    telefone: item.telefone,
    semana: item.semana,
    video_url: item.video_url,
    comentario: item.comentario,
    status: item.status || "pendente",
    data_envio: item.data_envio || "",
  }));

  const { error } = await supabase
    .from("entregas_producao")
    .upsert(payload, { onConflict: "projeto_id,resposta_id" });

  if (error) {
    console.error("Erro ao salvar entregas de produção:", error);
    return false;
  }

  return true;
}

export async function carregarEntregasProducaoBanco(
  projetoId: string
): Promise<EntregaProducao[]> {
  const { data, error } = await supabase
    .from("entregas_producao")
    .select("*")
    .eq("projeto_id", Number(projetoId))
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar entregas de produção:", error);
    return [];
  }

  return (data || []) as EntregaProducao[];
}

export async function atualizarStatusEntregaBanco(
  entregaId: number,
  status: "pendente" | "aprovado" | "regravacao",
  avaliadoPor: string
): Promise<boolean> {
  const { error } = await supabase
    .from("entregas_producao")
    .update({
      status,
      avaliado_por: avaliadoPor,
      data_avaliacao: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", entregaId);

  if (error) {
    console.error("Erro ao atualizar status da entrega:", error);
    return false;
  }

  return true;
}

export async function carregarSemanasProjetoBanco(
  projetoId: string
): Promise<ProjetoSemana[]> {
  const { data, error } = await supabase
    .from("projeto_semanas")
    .select("*")
    .eq("projeto_id", Number(projetoId))
    .order("semana", { ascending: true });

  if (error) {
    console.error("Erro ao carregar semanas do projeto:", error);
    return [];
  }

  return (data || []) as ProjetoSemana[];
}

export async function garantirSemanaProjetoBanco(
  projetoId: string,
  semana = 1,
  usuario = "Sistema"
): Promise<boolean> {
  const { error } = await supabase.from("projeto_semanas").upsert(
    {
      projeto_id: Number(projetoId),
      semana,
      status: "aberta",
      liberada_por: usuario,
    },
    { onConflict: "projeto_id,semana" }
  );

  if (error) {
    console.error("Erro ao garantir semana do projeto:", error);
    return false;
  }

  return true;
}

export async function concluirSemanaProjetoBanco(
  projetoId: string,
  semana: number,
  usuario = "Sistema"
): Promise<boolean> {
  const { error: erroFechar } = await supabase
    .from("projeto_semanas")
    .update({
      status: "concluida",
      fechada_em: new Date().toISOString(),
      liberada_por: usuario,
    })
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana);

  if (erroFechar) {
    console.error("Erro ao concluir semana:", erroFechar);
    return false;
  }

  const { error: erroAbrir } = await supabase.from("projeto_semanas").upsert(
    {
      projeto_id: Number(projetoId),
      semana: semana + 1,
      status: "aberta",
      liberada_por: usuario,
    },
    { onConflict: "projeto_id,semana" }
  );

  if (erroAbrir) {
    console.error("Erro ao liberar próxima semana:", erroAbrir);
    return false;
  }

  return true;
}

export async function salvarRespostaTreinamentoBanco(
  resposta: RespostaTreinamento
): Promise<boolean> {
  const { error } = await supabase.from("treinamento_respostas").insert([
    {
      usuario_login: resposta.usuario_login,
      usuario_nome: resposta.usuario_nome,
      usuario_cargo: resposta.usuario_cargo,
      modulo_id: resposta.modulo_id,
      modulo_titulo: resposta.modulo_titulo,
      pergunta: resposta.pergunta,
      alternativa_marcada: resposta.alternativa_marcada,
      alternativa_texto: resposta.alternativa_texto,
      alternativa_correta: resposta.alternativa_correta,
      correta: resposta.correta,
      explicacao: resposta.explicacao,
    },
  ]);

  if (error) {
    console.error("Erro ao salvar resposta do treinamento:", error);
    return false;
  }

  return true;
}

export async function carregarRespostasTreinamentoBanco(): Promise<
  RespostaTreinamento[]
> {
  const { data, error } = await supabase
    .from("treinamento_respostas")
    .select("*")
    .order("data_resposta", { ascending: false });

  if (error) {
    console.error("Erro ao buscar respostas do treinamento:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    usuario_login: item.usuario_login || "",
    usuario_nome: item.usuario_nome || "",
    usuario_cargo: item.usuario_cargo || "",
    modulo_id: item.modulo_id || "",
    modulo_titulo: item.modulo_titulo || "",
    pergunta: item.pergunta || "",
    alternativa_marcada: Number(item.alternativa_marcada ?? -1),
    alternativa_texto: item.alternativa_texto || "",
    alternativa_correta: Number(item.alternativa_correta ?? -1),
    correta: Boolean(item.correta),
    explicacao: item.explicacao || "",
    data_resposta: item.data_resposta || null,
  }));
}

export async function carregarUsuariosBanco(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }

  return (data || []).map(mapUsuarioDb);
}

export async function carregarMembrosBanco(): Promise<Membro[]> {
  const { data, error } = await supabase
    .from("membros")
    .select("*")
    .order("data_entrada", { ascending: false });

  if (error) {
    console.error("Erro ao buscar membros:", error);
    return [];
  }

  return (data || []).map(mapMembroDb);
}

export async function atualizarStatusMembroBanco(
  membroId: number,
  status: StatusMembro,
  observacaoAtual?: string | null
): Promise<boolean> {
  const hoje = new Date().toISOString().slice(0, 10);
  const observacaoAutomatica =
    status === "na_comunidade"
      ? `Retornou/permanece na comunidade em ${formatarDataBR(hoje)}.`
      : `${statusMembroLabel(status)} em ${formatarDataBR(hoje)}.`;

  const observacaoFinal = [observacaoAtual || "", observacaoAutomatica]
    .filter(Boolean)
    .join("\n");

  const payload: any = {
    status_comunidade: status,
    observacao: observacaoFinal,
  };

  if (status === "na_comunidade") {
    payload.data_saida = null;
  } else {
    payload.data_saida = hoje;
  }

  const { error } = await supabase
    .from("membros")
    .update(payload)
    .eq("id", membroId);

  if (error) {
    console.error("Erro ao atualizar membro:", error);
    return false;
  }

  return true;
}

export async function buscarPerfilPorEmail(email: string): Promise<Usuario | null> {
  const emailNormalizado = normalizar(email);

  if (!emailNormalizado) return null;

  const { data, error } = (await comTimeout(
    supabase
      .from("usuarios")
      .select("*")
      .eq("login", emailNormalizado)
      .maybeSingle(),
    15000,
    "A busca do perfil demorou demais."
  )) as any;

  if (error) {
    console.error("Perfil não encontrado:", error);
    return null;
  }

  if (!data) return null;

  return mapUsuarioDb(data);
}

export async function carregarProjetosBanco(
  mostrarArquivados = false
): Promise<Projeto[]> {
  const { data: projetosDb, error: erroProjetos } = await supabase
    .from("projetos")
    .select("*")
    .eq("arquivado", mostrarArquivados)
    .order("id", { ascending: false });

  if (erroProjetos) {
    console.error("Erro ao buscar projetos:", erroProjetos);
    return [];
  }

  const { data: elencoDb, error: erroElenco } = await supabase
    .from("elenco")
    .select("*")
    .order("id", { ascending: true });

  if (erroElenco) {
    console.error("Erro ao buscar elenco:", erroElenco);
    return [];
  }

  const elencoPorProjeto = new Map<string, ElencoItem[]>();

  (elencoDb || []).forEach((item: any) => {
    const projetoId = String(item.projeto_id);
    if (!elencoPorProjeto.has(projetoId)) {
      elencoPorProjeto.set(projetoId, []);
    }

    elencoPorProjeto.get(projetoId)!.push({
      id: String(item.id),
      personagem: item.personagem || "",
      dublador: item.dublador || "",
      telefone_dublador: item.telefone_dublador || "",
      funcao: item.funcao || "",
      status_entrega: item.status_entrega || "pendente",
      semana_atual: item.semana_atual || "Semana 01",
      video_entrega: item.video_entrega || "",
    });
  });

  return (projetosDb || []).map((item: any) =>
    mapProjetoDb(item, elencoPorProjeto.get(String(item.id)) || [])
  );
}

export async function criarProjetoBanco(projeto: Projeto): Promise<string | null> {
  const { data, error } = await supabase
    .from("projetos")
    .insert([
      {
        projeto: projeto.Projeto,
        tipo: projeto.Tipo,
        genero: projeto.Genero,
        prioridade: projeto.Prioridade,
        dupla: projeto.Dupla,
        lider: projeto.Lider,
        telefone_lider: projeto.Telefone_Lider,
        editor: projeto.Editor,
        telefone_editor: projeto.Telefone_Editor,
        status: projeto.Status,
        data_inicio: projeto.Data_Inicio,
        video_editor_link: projeto.Video_Editor_Link,
        registro_semanal: projeto.Registro_Semanal,
        observacoes: projeto.Observacoes || "",
        capa_url: projeto.Capa_URL,
        arquivado: projeto.Arquivado || false,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar projeto:", error);
    return null;
  }

  return String(data.id);
}

export async function atualizarProjetoBanco(projeto: Projeto): Promise<boolean> {
  const { error } = await supabase
    .from("projetos")
    .update({
      projeto: projeto.Projeto,
      tipo: projeto.Tipo,
      genero: projeto.Genero,
      prioridade: projeto.Prioridade,
      dupla: projeto.Dupla,
      lider: projeto.Lider,
      telefone_lider: projeto.Telefone_Lider,
      editor: projeto.Editor,
      telefone_editor: projeto.Telefone_Editor,
      status: projeto.Status,
      data_inicio: projeto.Data_Inicio,
      video_editor_link: projeto.Video_Editor_Link,
      registro_semanal: projeto.Registro_Semanal,
      observacoes: projeto.Observacoes || "",
      capa_url: projeto.Capa_URL,
      arquivado: projeto.Arquivado || false,
    })
    .eq("id", Number(projeto.ID));

  if (error) {
    console.error("Erro ao atualizar projeto:", error);
    return false;
  }

  return true;
}

export async function atualizarArquivamentoProjetoBanco(
  projetoId: string,
  arquivado: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("projetos")
    .update({ arquivado })
    .eq("id", Number(projetoId));

  if (error) {
    console.error("Erro ao alterar arquivamento:", error);
    return false;
  }

  return true;
}

export async function salvarElencoProjetoBanco(
  projetoId: string,
  elenco: ElencoItem[]
): Promise<boolean> {
  const { error: erroDelete } = await supabase
    .from("elenco")
    .delete()
    .eq("projeto_id", Number(projetoId));

  if (erroDelete) {
    console.error("Erro ao limpar elenco:", erroDelete);
    return false;
  }

  if (!elenco.length) return true;

  const payload = elenco.map((item) => ({
    projeto_id: Number(projetoId),
    personagem: item.personagem,
    dublador: item.dublador,
    telefone_dublador: item.telefone_dublador || "",
    funcao: item.funcao || "",
  }));

  const { error: erroInsert } = await supabase.from("elenco").insert(payload);

  if (erroInsert) {
    console.error("Erro ao salvar elenco:", erroInsert);
    return false;
  }

  return true;
}

export function gerarIdTemporario() {
  return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function comTimeout<T>(
  promessa: PromiseLike<T>,
  ms = 15000,
  mensagem = "Tempo limite excedido"
): Promise<T> {
  return Promise.race([
    Promise.resolve(promessa),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(mensagem)), ms)
    ),
  ]);
}

export function parseDataFlex(valor?: string | null): Date | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const isoSimples = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoSimples) {
    const [, ano, mes, dia] = isoSimples;
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }

  const dataIso = new Date(texto);
  if (!Number.isNaN(dataIso.getTime())) return dataIso;

  const partes = texto.split(/[\/\s:-]+/).map(Number);
  if (partes.length >= 3) {
    const [dia, mes, ano] = partes;
    if (dia && mes && ano) {
      const data = new Date(ano, mes - 1, dia);
      if (!Number.isNaN(data.getTime())) return data;
    }
  }

  return null;
}

export function chaveMes(valor?: string | null): string {
  const data = parseDataFlex(valor);
  if (!data) return "";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function formatarMesLabel(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  const data = new Date(ano, mes - 1, 1);
  const nome = data.toLocaleDateString("pt-BR", { month: "long" });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} / ${ano}`;
}

export function formatarDataBR(valor?: string | null) {
  const data = parseDataFlex(valor);
  if (!data) return "";
  return data.toLocaleDateString("pt-BR");
}

export function gerarMesesEntre(inicio: string, fim: string) {
  const [anoInicio, mesInicio] = inicio.split("-").map(Number);
  const [anoFim, mesFim] = fim.split("-").map(Number);
  const meses: string[] = [];
  const data = new Date(anoInicio, mesInicio - 1, 1);
  const limite = new Date(anoFim, mesFim - 1, 1);

  while (data <= limite) {
    meses.push(
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    );
    data.setMonth(data.getMonth() + 1);
  }

  return meses;
}

export function extrairLinksDrive(observacoes?: string) {
  const texto = observacoes || "";
  const inicio = texto.indexOf("[[DRIVE_LINKS]]");
  const fim = texto.indexOf("[[/DRIVE_LINKS]]");

  if (inicio === -1 || fim === -1) {
    return {
      pasta: "",
      selecao: "",
      projeto: "",
      videos: "",
      cortes: "",
      finalizados: "",
      falasTeste: "",
      respostasSelecao: "",
      cortesProjeto: "",
      entregasProjeto: "",
      formSelecao: "",
      formEntregas: "",
      planilhaSelecao: "",
      planilhaEntregas: "",
    };
  }

  try {
    const json = texto.slice(inicio + "[[DRIVE_LINKS]]".length, fim).trim();

    return {
      pasta: "",
      selecao: "",
      projeto: "",
      videos: "",
      cortes: "",
      finalizados: "",
      falasTeste: "",
      respostasSelecao: "",
      cortesProjeto: "",
      entregasProjeto: "",
      formSelecao: "",
      formEntregas: "",
      planilhaSelecao: "",
      planilhaEntregas: "",
      ...JSON.parse(json),
    };
  } catch {
    return {
      pasta: "",
      selecao: "",
      projeto: "",
      videos: "",
      cortes: "",
      finalizados: "",
      falasTeste: "",
      respostasSelecao: "",
      cortesProjeto: "",
      entregasProjeto: "",
      formSelecao: "",
      formEntregas: "",
      planilhaSelecao: "",
      planilhaEntregas: "",
    };
  }
}

export function salvarLinksDriveEmObservacoes(observacoes: string, links: any) {
  const base = (observacoes || "")
    .replace(/\[\[DRIVE_LINKS\]\][\s\S]*?\[\[\/DRIVE_LINKS\]\]/g, "")
    .trim();

  const bloco = `[[DRIVE_LINKS]]
${JSON.stringify(links, null, 2)}
[[/DRIVE_LINKS]]`;

  return [base, bloco].filter(Boolean).join("\n\n");
}

export function calcularRelatorioEntradaSaida(membros: Membro[]): RelatorioMes[] {
  const chaves = membros
    .flatMap((m) => [chaveMes(m.data_entrada), chaveMes(m.data_saida)])
    .filter(Boolean)
    .sort();

  if (!chaves.length) return [];

  const meses = gerarMesesEntre(chaves[0], chaves[chaves.length - 1]);
  let totalInicial = 0;

  return meses.map((mes) => {
    const entradas = membros.filter(
      (m) => chaveMes(m.data_entrada) === mes
    ).length;
    const saidas = membros.filter((m) => chaveMes(m.data_saida) === mes).length;
    const crescimento = entradas - saidas;
    const totalFinal = totalInicial + crescimento;

    const linha = {
      mes,
      mesLabel: formatarMesLabel(mes),
      totalInicial,
      entradas,
      saidas,
      crescimento,
      totalFinal,
    };

    totalInicial = totalFinal;
    return linha;
  });
}

