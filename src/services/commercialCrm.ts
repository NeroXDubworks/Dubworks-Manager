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
  condicoes_pagamento: string | null;
  validade_em: string | null;
  campos_pdf: Record<string, string>;
  status: string;
  criado_em: string;
};
export type CrmPropostaItem = {
  id: number;
  proposta_id: number;
  servico_id: number | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
};

/** Campos que existem nos modelos oficiais: ignorar chaves inesperadas do cliente. */
const CHAVES_PDF_PROPOSTA = new Set([
  "etapa_1","etapa_2","etapa_3","entregaveis","revisoes",
  "inicio","entrega","contato","responsavel",
]);
const CHAVES_PDF_CONTRATO = new Set([
  "prestadora_razao","prestadora_documento","prestadora_endereco",
  "prestadora_representante","prestadora_email","cliente_endereco",
  "cliente_representante","cliente_email","anexo_responsavel",
  "anexo_entregas","anexo_etapas","anexo_parcelas","anexo_despesas",
  "anexo_pagamento","anexo_revisoes","anexo_direitos","anexo_creditos",
  "anexo_observacoes",
]);
export type TipoDocumentoCrm = "proposta" | "contrato";
export type DocumentoGeradoCrm = {
  id: number;
  tipo: TipoDocumentoCrm;
  proposta_id: number | null;
  contrato_id: number | null;
  nome_arquivo: string;
  criado_em: string;
  drive_url: string | null;
  drive_file_id: string | null;
  sha256: string | null;
};

export async function salvarCamposPdfCrm(
  tipo: TipoDocumentoCrm, id: number, status: string, campos: Record<string, string>
): Promise<Record<string, string>> {
  if (!["rascunho","em_revisao"].includes(status)) {
    throw new Error("Campos comerciais já aprovados são imutáveis. Crie uma nova versão.");
  }
  const allowed = tipo === "proposta" ? CHAVES_PDF_PROPOSTA : CHAVES_PDF_CONTRATO;
  const limpos: Record<string, string> = {};
  for (const [chave, raw] of Object.entries(campos)) {
    if (!allowed.has(chave)) continue;
    const valor = String(raw ?? "").trim();
    if (valor.length > 6000) throw new Error("Campo " + chave + " ultrapassa 6.000 caracteres.");
    if (valor) limpos[chave] = valor;
  }
  const table = tipo === "proposta" ? "crm_propostas" : "crm_contratos";
  const { data, error } = await supabase.from(table)
    .update({ campos_pdf: limpos }).eq("id", id)
    .eq("status", status).select("campos_pdf").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("A versão/status mudou; reabra o documento para editar.");
  return (data.campos_pdf || {}) as Record<string, string>;
}

export async function vincularContratoPropostaCrm(
  contratoId: number, propostaId: number, statusAtual: string
) {
  if (!["rascunho","em_revisao"].includes(statusAtual)) {
    throw new Error("Contrato já aprovado: vínculo não pode ser alterado.");
  }
  const { data, error } = await supabase.from("crm_contratos")
    .update({ proposta_id: propostaId })
    .eq("id", contratoId).eq("status", statusAtual)
    .select("id,proposta_id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Contrato alterado por outra pessoa. Atualize a negociação.");
  return data;
}

function arrayBufferBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let texto = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    texto += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(texto);
}

export async function arquivarPdfCrm(params: {
  tipo: TipoDocumentoCrm; id: number; blob: Blob; nomeArquivo: string;
  campos: Record<string, string>;
}): Promise<DocumentoGeradoCrm> {
  if (params.blob.type !== "application/pdf") {
    throw new Error("Apenas PDF oficial pode ser arquivado.");
  }
  const buffer = await params.blob.arrayBuffer();
  if (buffer.byteLength < 20000 || buffer.byteLength > 2900000) {
    throw new Error("Tamanho inválido do PDF para armazenamento no CRM.");
  }
  const raw = new Uint8Array(buffer);
  if (new TextDecoder().decode(raw.slice(0, 5)) !== "%PDF-") {
    throw new Error("Arquivo gerado não é um PDF íntegro.");
  }
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const sha256 = Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
  const { data, error } = await supabase.from("crm_documentos_gerados").insert({
    tipo: params.tipo,
    proposta_id: params.tipo === "proposta" ? params.id : null,
    contrato_id: params.tipo === "contrato" ? params.id : null,
    nome_arquivo: params.nomeArquivo,
    conteudo_base64: arrayBufferBase64(buffer),
    sha256,
    campos_snapshot: params.campos,
  }).select("id,tipo,proposta_id,contrato_id,nome_arquivo,criado_em,drive_url,drive_file_id,sha256").single();
  if (error) throw error;
  return data as DocumentoGeradoCrm;
}

export async function listarDocumentosCrm(tipo: TipoDocumentoCrm, id: number): Promise<DocumentoGeradoCrm[]> {
  const col = tipo === "proposta" ? "proposta_id" : "contrato_id";
  const { data, error } = await supabase.from("crm_documentos_gerados")
    .select("id,tipo,proposta_id,contrato_id,nome_arquivo,criado_em,drive_url,drive_file_id,sha256")
    .eq(col, id).order("id", { ascending: false }).limit(70);
  if (error) throw error;
  return (data || []) as DocumentoGeradoCrm[];
}

export async function sincronizarDocumentoDriveCrm(documentoId: number): Promise<{drive_url: string; drive_file_id: string}> {
  const { data, error } = await supabase.functions.invoke("crm-drive-archive", {
    body: { documentId: documentoId },
  });
  if (error) {
    let mensagem = String(error.message || "Falha na conexão com o Google Drive.");
    const response = (error as any).context;
    if (response && typeof response.json === "function") {
      try {
        const payload = await response.json();
        if (payload?.error) mensagem = String(payload.error);
      } catch { /* keep generic error */ }
    }
    throw new Error(mensagem);
  }
  if (!data?.ok || !data?.drive_url || !data?.drive_file_id) {
    throw new Error(String(data?.error || "O Drive não confirmou o arquivo."));
  }
  return { drive_url: String(data.drive_url), drive_file_id: String(data.drive_file_id) };
}

export async function baixarDocumentoArquivadoCrm(documentoId: number): Promise<Blob> {
  const { data, error } = await supabase.from("crm_documentos_gerados")
    .select("conteudo_base64").eq("id", documentoId).single();
  if (error) throw error;
  const b64 = String(data?.conteudo_base64 || "");
  if (!b64.startsWith("JVBERi0x")) throw new Error("Arquivo PDF arquivado inválido.");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}

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

export async function listarItensPropostaCrm(propostaId: number): Promise<CrmPropostaItem[]> {
  const { data, error } = await supabase.from("crm_proposta_itens").select("*")
    .eq("proposta_id", propostaId).order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as CrmPropostaItem[];
}

export async function atualizarCondicoesPropostaCrm(
  propostaId: number, statusAtual: string, condicoesPagamento: string, validadeEm: string
) {
  if (!["rascunho", "em_revisao"].includes(statusAtual)) {
    throw new Error("As condições de uma proposta já aprovada não podem ser alteradas.");
  }
  const { data, error } = await supabase.from("crm_propostas")
    .update({
      condicoes_pagamento: condicoesPagamento.trim() || null,
      validade_em: validadeEm || null,
    })
    .eq("id", propostaId).eq("status", statusAtual)
    .select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("A proposta mudou de status. Recarregue antes de salvar.");
  return data;
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
  propostaId?: number;
  titulo: string; objetoEscopo: string;
  tipoModelo: "servico_gratuito" | "servico_remunerado" | "parceria_gratuita" | "parceria_remunerada";
}) {
  if (Boolean(params.negociacaoId) === Boolean(params.parceriaGratuitaId)) {
    throw new Error("Informe uma negociação remunerada ou uma parceria gratuita.");
  }
  if (params.negociacaoId && !params.propostaId) {
    throw new Error("Escolha uma proposta aceita antes de criar o contrato remunerado.");
  }
  if (params.parceriaGratuitaId && params.propostaId) {
    throw new Error("Parceria gratuita não deve ter proposta remunerada.");
  }
  const chave = params.negociacaoId ? "negociacao_id" : "parceria_gratuita_id";
  const contraparteId = params.negociacaoId || params.parceriaGratuitaId;
  const { data: versoes, error: erroVersao } = await supabase.from("crm_contratos")
    .select("versao").eq(chave, contraparteId)
    .order("versao", { ascending: false }).limit(1);
  if (erroVersao) throw erroVersao;
  const versao = Number(versoes?.[0]?.versao || 0) + 1;
  const { data, error } = await supabase.from("crm_contratos").insert({
    negociacao_id: params.negociacaoId ?? null,
    parceria_gratuita_id: params.parceriaGratuitaId ?? null,
    proposta_id: params.propostaId ?? null,
    versao,
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
