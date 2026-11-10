import assert from "node:assert/strict";
import { gerarPdfProposta } from "../src/shared/crmProposalPdf.js";

const entrada = {
  cliente: { nome: "Cliente de Teste Ltda", tipo_pessoa: "pj", cpf_cnpj: "00.000.000/0001-00" },
  negociacao: { titulo: "Dublagem em português", escopo: "Produção de áudio" },
  proposta: {
    id: 17, versao: 1, titulo: "Proposta de dublagem",
    criado_em: "2026-11-10T12:00:00Z", modo_preco: "personalizado", status: "aceita",
    descricao_escopo: "Dublagem e edição para vídeos", valor_negociado: 690,
    custo_interno_estimado: 100, justificativa_valor: "Informação confidencial",
    condicoes_pagamento: "50% na aprovação e 50% na entrega", validade_em: "2026-12-10",
  },
  itens: [{ id: 1, descricao: "Pacote de dublagem e edição", quantidade: 1, unidade: "projeto", preco_unitario: 9000 }],
};

const pdf = gerarPdfProposta(entrada);
assert.equal(pdf.type, "application/pdf");
const bytes = Buffer.from(await pdf.arrayBuffer());
const content = bytes.toString("latin1");
assert.ok(content.startsWith("%PDF-1.4"));
assert.ok(content.includes("DUBWORKS"));
assert.ok(content.includes("Cliente de Teste Ltda"));
assert.ok(content.includes("690,00"));
assert.ok(content.includes("50% na aprovação"));
assert.ok(!content.includes("9.000,00"), "Preço de referência nunca deve aparecer em proposta personalizada.");
assert.ok(!content.includes("Informação confidencial"), "Justificativa interna não deve vazar.");
assert.ok(!content.includes("RASCUNHO -"), "Uma proposta aceita não deve ter marca d'água de rascunho.");

const xref = Number(content.match(/startxref\n(\d+)/)?.[1]);
assert.equal(content.slice(xref, xref + 4), "xref", "A tabela xref deve apontar para o byte correto.");

const many = gerarPdfProposta({
  ...entrada,
  proposta: { ...entrada.proposta, status: "rascunho", modo_preco: "automatico" },
  itens: Array.from({ length: 36 }, (_, i) => ({
    id: i + 1, descricao: "Serviço de edição e dublagem com cenas para revisão e entrega " + i,
    quantidade: 2, unidade: "episodio", preco_unitario: 120,
  })),
});
const manyContent = Buffer.from(await many.arrayBuffer()).toString("latin1");
assert.ok(manyContent.includes("/Count 3") || /\/Count [4-9]/.test(manyContent), "Documento extenso deve paginar.");
assert.ok(manyContent.includes("RASCUNHO -"), "Rascunhos precisam de aviso no PDF.");
assert.ok(manyContent.includes("120,00"), "Propostas automáticas devem apresentar preço unitário.");
console.log("CRM proposal PDF tests passed");
