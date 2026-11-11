// Validação preventiva para a interface. O Supabase repete as regras
// críticas em triggers para impedir o avanço por chamadas externas.
const obrigatoriosProposta = {
  entregaveis: "Entregáveis e formatos",
  revisoes: "Quantidade de revisões",
  entrega: "Prazo de entrega",
  contato: "Contato comercial",
  responsavel: "Responsável pela aprovação",
};
const obrigatoriosContrato = {
  prestadora_razao: "Razão social / nome da prestadora",
  prestadora_documento: "CPF / CNPJ da prestadora",
  prestadora_endereco: "Endereço da prestadora",
  prestadora_representante: "Representante da prestadora",
  cliente_endereco: "Endereço do cliente",
  cliente_representante: "Representante do cliente",
  anexo_entregas: "Entregas do contrato",
  anexo_etapas: "Etapas e cronograma",
  anexo_direitos: "Direitos e licenças de uso",
};
const vazio = x => !String(x ?? "").trim();
function missing(obj, labels) {
  return Object.entries(labels).filter(([k]) => vazio(obj?.[k])).map(([, label]) => label);
}
export function pendenciasProposta(proposta) {
  const result = [];
  if (!proposta) return ["Proposta não carregada"];
  if (vazio(proposta.descricao_escopo)) result.push("Descrição do escopo");
  if (!(Number(proposta.valor_negociado) > 0)) result.push("Valor negociado positivo");
  if (vazio(proposta.condicoes_pagamento)) result.push("Condições de pagamento");
  const validade = String(proposta.validade_em || "").slice(0, 10);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validade) || validade < today) result.push("Validade atual da proposta");
  result.push(...missing(proposta.campos_pdf, obrigatoriosProposta));
  return result;
}
export function pendenciasContrato(contrato) {
  const result = [];
  if (!contrato) return ["Contrato não carregado"];
  if (contrato.negociacao_id != null && !contrato.proposta_id) result.push("Proposta aceita vinculada");
  if (vazio(contrato.objeto_escopo)) result.push("Objeto/escopo do contrato");
  if (!/^https:\/\/\S+/i.test(String(contrato.arquivo_url || ""))) result.push("Link HTTPS do documento revisado");
  result.push(...missing(contrato.campos_pdf, obrigatoriosContrato));
  return result;
}
export const camposObrigatoriosContrato = Object.keys(obrigatoriosContrato);
