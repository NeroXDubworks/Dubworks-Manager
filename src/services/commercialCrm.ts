import { supabase } from "../lib/supabase";
import { calculateProposal } from "../shared/crmPricing.js";

export type CrmCliente = {
  id: number;
  nome: string;
  tipo_pessoa: "pf" | "pj";
  cpf_cnpj: string | null;
  segmento: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
  historico_legado: boolean;
  cliente_desde: string | null;
  status: "ativo" | "inativo" | "encerrado";
};
export type CrmNegociacao = {
  id: number;
  cliente_id: number;
  titulo: string;
  natureza: "prestacao" | "parceria";
  modalidade_financeira: "remunerada";
  status: string;
  responsavel_dubworks: string | null;
  escopo: string | null;
  observacoes: string | null;
};
export type CrmServico = {
  id: number;
  nome: string;
  unidade: "minuto" | "episodio" | "corte" | "hora" | "projeto" | "unidade";
  preco_referencia: number;
  ativo: boolean;
};
export type CrmProposta = {
  id: number;
  negociacao_id: number;
  versao: number;
  titulo: string;
  descricao_escopo: string | null;
  modo_preco: "automatico" | "personalizado";
  valor_referencia: number;
  valor_negociado: number;
  custo_interno_estimado: number | null;
  justificativa_valor: string | null;
  status: string;
  criado_em: string;
};
export type ParceriaGratuita = {
  id: number;
  nome_parceiro: string;
  natureza: "parceria" | "prestacao";
  responsavel_dubworks: string | null;
  contato_nome: string | null;
  escopo: string | null;
  status: string;
};

export async function listarClientesCrm(): Promise<CrmCliente[]> {
  const { data, error } = await supabase.from("crm_clientes").select("*").order("nome");
  if (error) throw error;
  return (data || []) as CrmCliente[];
}

export async function criarClienteCrm(params: {
  nome: string; tipoPessoa: "pf" | "pj"; historicoLegado: boolean;
  cpfCnpj?: string; clienteDesde?: string; observacoes?: string;
}) {
  if (params.nome.trim().length < 2) throw new Error("Informe o nome do cliente.");
  const { data, error } = await supabase.from("crm_clientes")
    .insert({
      nome: params.nome.trim(), tipo_pessoa: params.tipoPessoa,
      cpf_cnpj: params.cpfCnpj?.trim() || null,
      historico_legado: params.historicoLegado,
      cliente_desde: params.clienteDesde || null,
      observacoes: params.observacoes?.trim() || null,
    }).select("*").single();
  if (error) throw error;
  return data as CrmCliente;
}

export async function listarNegociacoesCrm(clienteId: number): Promise<CrmNegociacao[]> {
  const { data, error } = await supabase.from("crm_negociacoes").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []) as CrmNegociacao[];
}

export async function criarNegociacaoCrm(params: {
  clienteId: number; titulo: string; natureza: "prestacao" | "parceria";
  responsavel: string; escopo: string;
}) {
  if (params.titulo.trim().length < 2) throw new Error("Informe o título da negociação.");
  const { data, error } = await supabase.from("crm_negociacoes").insert({
    cliente_id: params.clienteId, titulo: params.titulo.trim(),
    natureza: params.natureza, modalidade_financeira: "remunerada",
    responsavel_dubworks: params.responsavel,
    escopo: params.escopo.trim() || null,
  }).select("*").single();
  if (error) throw error;
  return data as CrmNegociacao;
}

export async function listarServicosCrm(): Promise<CrmServico[]> {
  const { data, error } = await supabase.from("crm_servicos").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data || []) as CrmServico[];
}

export async function criarServicoCrm(params: {
  nome: string; unidade: CrmServico["unidade"]; preco: number;
}) {
  if (!params.nome.trim()) throw new Error("Informe o serviço.");
  if (!Number.isFinite(params.preco) || params.preco < 0) throw new Error("Preço inválido.");
  const { data, error } = await supabase.from("crm_servicos").insert({
    nome: params.nome.trim(), unidade: params.unidade, preco_referencia: params.preco,
  }).select("*").single();
  if (error) throw error;
  return data as CrmServico;
}

export async function listarPropostasCrm(negociacaoId: number): Promise<CrmProposta[]> {
  const { data, error } = await supabase.from("crm_propostas").select("*")
    .eq("negociacao_id", negociacaoId).order("versao", { ascending: false });
  if (error) throw error;
  return (data || []) as CrmProposta[];
}

export async function criarPropostaCrm(params: {
  negociacaoId: number; titulo: string; descricaoEscopo: string;
  itens: Array<{ descricao: string; unidade: string; quantidade: number; preco_unitario: number; servico_id?: number | null }>;
  valorManual?: number | null; custoInterno?: number | null; justificativa?: string;
}) {
  if (!params.titulo.trim()) throw new Error("Informe o título da proposta.");
  if (!params.itens.length) throw new Error("Adicione pelo menos um serviço.");
  const calculo = calculateProposal(params.itens, params.valorManual);
  if (calculo.personalizado && !params.justificativa?.trim()) {
    throw new Error("Informe a justificativa para o valor personalizado.");
  }
  // Criação atômica por RPC: evita salvar uma proposta sem seus itens.
  const { data, error } = await supabase.rpc("dw_crm_criar_proposta", {
    p_negociacao_id: params.negociacaoId,
    p_titulo: params.titulo.trim(),
    p_escopo: params.descricaoEscopo.trim() || null,
    p_itens: params.itens,
    p_valor_manual: params.valorManual ?? null,
    p_custo_interno: params.custoInterno ?? null,
    p_justificativa: params.justificativa?.trim() || null,
  });
  if (error) throw error;
  return Number(data);
}

export async function listarParceriasGratuitas(): Promise<ParceriaGratuita[]> {
  const { data, error } = await supabase.from("crm_parcerias_gratuitas").select("*").order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []) as ParceriaGratuita[];
}

export async function criarParceriaGratuita(params: {
  nome: string; natureza: ParceriaGratuita["natureza"]; responsavel: string;
  contatoNome?: string; escopo?: string; historicoLegado?: boolean;
}) {
  if (params.nome.trim().length < 2) throw new Error("Informe o parceiro.");
  const { data, error } = await supabase.from("crm_parcerias_gratuitas").insert({
    nome_parceiro: params.nome.trim(),
    natureza: params.natureza,
    responsavel_dubworks: params.responsavel,
    contato_nome: params.contatoNome?.trim() || null,
    escopo: params.escopo?.trim() || null,
    historico_legado: Boolean(params.historicoLegado),
  }).select("*").single();
  if (error) throw error;
  return data as ParceriaGratuita;
}

export async function listarContratosCrm(negociacaoId: number) {
  const { data, error } = await supabase.from("crm_contratos").select("*")
    .eq("negociacao_id", negociacaoId).order("versao", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarRascunhoContratoCrm(params: {
  negociacaoId?: number; parceriaGratuitaId?: number;
  titulo: string; objetoEscopo: string;
  tipoModelo: "servico_gratuito" | "servico_remunerado" | "parceria_gratuita" | "parceria_remunerada";
}) {
  if (Boolean(params.negociacaoId) === Boolean(params.parceriaGratuitaId)) {
    throw new Error("Informe uma negociação remunerada ou uma parceria gratuita.");
  }
  const { data, error } = await supabase.from("crm_contratos").insert({
    negociacao_id: params.negociacaoId ?? null,
    parceria_gratuita_id: params.parceriaGratuitaId ?? null,
    versao: 1,
    titulo: params.titulo.trim(),
    objeto_escopo: params.objetoEscopo.trim() || null,
    tipo_modelo: params.tipoModelo,
    status: "rascunho",
  }).select("*").single();
  if (error) throw error;
  return data;
}

export type CrmContato = {
  id: number;
  cliente_id: number;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  principal: boolean;
};

export async function listarContatosCrm(clienteId: number): Promise<CrmContato[]> {
  const { data, error } = await supabase.from("crm_contatos").select("*")
    .eq("cliente_id", clienteId).order("principal", { ascending: false });
  if (error) throw error;
  return (data || []) as CrmContato[];
}

export async function adicionarContatoCrm(params: {
  clienteId: number; nome: string; cargo?: string; email?: string;
  telefone?: string; principal?: boolean;
}) {
  if (!params.nome.trim()) throw new Error("Informe o nome do contato.");
  const { data, error } = await supabase.from("crm_contatos").insert({
    cliente_id: params.clienteId, nome: params.nome.trim(),
    cargo: params.cargo?.trim() || null, email: params.email?.trim() || null,
    telefone: params.telefone?.trim() || null, principal: Boolean(params.principal),
  }).select("*").single();
  if (error) throw error;
  return data as CrmContato;
}
export async function listarContratosParceriaGratuita(parceriaId: number) {
  const { data, error } = await supabase.from("crm_contratos").select("*")
    .eq("parceria_gratuita_id", parceriaId).order("versao", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function registrarContratoAssinado(params: {
  contratoId: number; arquivoUrl: string; dataAssinaturaISO: string;
}) {
  if (!/^https:\/\//i.test(params.arquivoUrl.trim())) {
    throw new Error("Informe o link HTTPS do documento efetivamente assinado.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.dataAssinaturaISO)) {
    throw new Error("Informe a data da assinatura.");
  }
  const { data, error } = await supabase.from("crm_contratos")
    .update({
      arquivo_url: params.arquivoUrl.trim(), status: "assinado",
      assinaturas_confirmadas_em: params.dataAssinaturaISO,
    }).eq("id", params.contratoId).eq("status", "aguardando_assinatura").select("id").single();
  if (error) throw error;
  return data;
}

export async function anexarDocumentoContratoCrm(id: number, url: string) {
  if (!/^https:\/\//i.test(url.trim())) throw new Error("Informe o link HTTPS do PDF revisado.");
  const { data, error } = await supabase.from("crm_contratos")
    .update({ arquivo_url: url.trim() })
    .eq("id", id).in("status", ["rascunho","em_revisao"])
    .select("id").single();
  if (error) throw error;
  return data;
}

export async function alterarStatusContratoCrm(id: number, atual: string, proximo: string) {
  const { data, error } = await supabase.from("crm_contratos")
    .update({ status: proximo })
    .eq("id", id).eq("status", atual)
    .select("id,status").single();
  if (error) throw error;
  return data;
}

export async function alterarStatusPropostaCrm(id: number, atual: string, proximo: string, usuario: string) {
  const patch: Record<string, string> = { status: proximo };
  if (proximo === "aprovada") {
    patch.aprovado_por = usuario;
    patch.aprovado_em = new Date().toISOString();
  }
  const { data, error } = await supabase.from("crm_propostas").update(patch)
    .eq("id", id).eq("status", atual)
    .select("id,status").single();
  if (error) throw error;
  return data;
}
