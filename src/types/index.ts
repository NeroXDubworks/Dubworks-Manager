export type Cargo =
  | "diretoria"
  | "adm"
  | "adm_treinamento"
  | "lider"
  | "lider_treinamento"
  | "editor"
  | "membro";

export type TrainingStatus =
  | "nao_aplicavel"
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "reprovado";

export type StatusMembro = "na_comunidade" | "saiu" | "banido" | "pausado";

export type Usuario = {
  id?: number;
  nome: string;
  login: string;
  senha?: string | null;
  cargo: Cargo;
  vinculo: string;
  training_status?: TrainingStatus;
  criado_por?: string | null;
  data_criacao?: string | null;
  acesso_projetos?: boolean | null;
  acesso_membros?: boolean | null;
  acesso_usuarios?: boolean | null;
  acesso_relatorios_projetos?: boolean | null;
  acesso_relatorios_elenco?: boolean | null;
  acesso_relatorios_membros?: boolean | null;
  acesso_relatorios_entrada_saida?: boolean | null;
  acesso_exportacoes?: boolean | null;
  acesso_treinamentos?: boolean | null;
};

export type ChavePermissao =
  | "acesso_projetos"
  | "acesso_membros"
  | "acesso_usuarios"
  | "acesso_relatorios_projetos"
  | "acesso_relatorios_elenco"
  | "acesso_relatorios_membros"
  | "acesso_relatorios_entrada_saida"
  | "acesso_exportacoes"
  | "acesso_treinamentos";


export type ElencoItem = {
  id: string;
  personagem: string;
  dublador: string;
  telefone_dublador?: string;
  funcao: string;
  status_entrega?: string;
  semana_atual?: string;
  video_entrega?: string;
};

export type DriveStructureResult = {
  pasta?: string;
  selecao?: string;
  projeto?: string;
  finalizados?: string;
  falasTeste?: string;
  respostasSelecao?: string;
  cortesProjeto?: string;
  entregasProjeto?: string;
  formSelecao?: string;
  formEntregas?: string;
  planilhaSelecao?: string;
  planilhaEntregas?: string;

  pastaId?: string;
  selecaoId?: string;
  projetoId?: string;
  finalizadosId?: string;
  falasTesteId?: string;
  respostasSelecaoId?: string;
  cortesProjetoId?: string;
  entregasProjetoId?: string;
  formSelecaoId?: string;
  formEntregasId?: string;
  planilhaSelecaoId?: string;
  planilhaEntregasId?: string;
};

export type Projeto = {
  ID: string;
  Projeto: string;
  Tipo: string;
  Genero: string;
  Prioridade: string;
  Dupla: string;
  Lider: string;
  Telefone_Lider: string;
  Editor: string;
  Telefone_Editor: string;
  Status: string;
  Data_Inicio: string;
  Video_Editor_Link: string;
  Registro_Semanal: string;
  Observacoes: string;
  Capa_URL: string;
  Drive_Pasta_Link: string;
  Drive_Videos_Link: string;
  Drive_Cortes_Link: string;
  Drive_Final_Link: string;
  Arquivado: boolean;
  Elenco: ElencoItem[];
};

export type Membro = {
  id?: number;
  nome: string;
  telefone: string;
  email: string;
  data_nascimento?: string | null;
  idade?: number | null;
  habilidades?: string | null;
  motivacao?: string | null;
  status: StatusMembro;
  data_entrada?: string | null;
  data_saida?: string | null;
  observacao?: string | null;
};

export type StatusSelecao = "pendente" | "aprovado" | "reprovado";

export type RespostaSelecao = {
  id: string;
  projetoId?: string;
  linha?: number;
  timestamp: string;
  nome: string;
  telefone: string;
  personagem: string;
  semana: string;
  videoUrl: string;
  comentario: string;
  status: StatusSelecao;
};

export type AvaliacaoSelecao = {
  id?: number;
  projeto_id: number;
  resposta_id: string;
  linha?: number | null;
  nome: string;
  telefone: string;
  personagem: string;
  semana: string;
  video_url: string;
  comentario_membro: string;
  status: StatusSelecao;
  comentario_lider: string;
  avaliado_por: string;
  data_avaliacao?: string | null;
};

export type EntregaProducao = {
  id?: number;
  projeto_id: number;
  resposta_id: string;
  linha?: number | null;
  personagem: string;
  dublador: string;
  telefone: string;
  semana: string;
  video_url: string;
  comentario: string;
  status: "pendente" | "aprovado" | "regravacao";
  avaliado_por?: string | null;
  data_envio?: string | null;
  data_avaliacao?: string | null;
};

export type ProjetoSemana = {
  id?: number;
  projeto_id: number;
  semana: number;
  status: "aberta" | "concluida";
  aberta_em?: string | null;
  fechada_em?: string | null;
  liberada_por?: string | null;
  observacao?: string | null;
};

export type RelatorioMes = {
  mes: string;
  mesLabel: string;
  totalInicial: number;
  entradas: number;
  saidas: number;
  crescimento: number;
  totalFinal: number;
};

export type RespostaTreinamento = {
  id?: number;
  usuario_login: string;
  usuario_nome: string;
  usuario_cargo: string;
  modulo_id: string;
  modulo_titulo: string;
  pergunta: string;
  alternativa_marcada: number;
  alternativa_texto: string;
  alternativa_correta: number;
  correta: boolean;
  explicacao: string;
  data_resposta?: string | null;
};

export type PerguntaTreinamento = {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
};

export type ModuloTreinamento = {
  id: string;
  titulo: string;
  descricao: string;
  conteudos: string[];
  checklist: string[];
  pergunta?: PerguntaTreinamento;
};

