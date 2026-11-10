import assert from "node:assert/strict";
import { gerarPdfMinutaContrato } from "../src/shared/crmContractPdf.js";

const dados = {
  contrato: {
    id: 22, versao: 1, titulo: "Contrato - Produção audiovisual",
    tipo_modelo: "servico_remunerado", status: "rascunho", objeto_escopo: "Produção, dublagem e edição de episódios",
    criado_em: "2026-11-10T14:00:00-03:00",
    arquivo_url: null,
  },
  cliente: { nome: "Empresa de Teste S.A.", tipo_pessoa: "pj", cpf_cnpj: "00.123.456/0001-78" },
  negociacao: { titulo: "Produção audiovisual", escopo: "Entregas semanais" },
};

const pdf = gerarPdfMinutaContrato(dados);
assert.equal(pdf.type, "application/pdf");
const buffer = Buffer.from(await pdf.arrayBuffer());
const raw = buffer.toString("latin1");
assert.ok(raw.startsWith("%PDF-1.4"));
assert.ok(raw.includes("DUBWORKS"));
assert.ok(raw.includes("MINUTA PARA REVIS"));
assert.ok(raw.includes("Empresa de Teste S.A."));
assert.ok(raw.includes("CPF/CNPJ"));
assert.ok(raw.includes("DOCUMENTO PRELIMINAR"));
assert.ok(raw.includes("NÃO ENVIAR"));
assert.ok(!raw.includes("CONTRATO ASSINADO"), "Não pode sugerir assinatura concluída.");
const offset = Number(raw.match(/startxref\n(\d+)/)?.[1]);
assert.equal(raw.slice(offset, offset + 4), "xref", "A tabela xref precisa apontar para o byte certo.");
const pages = Number(raw.match(/\/Type \/Pages \/Count (\d+)/)?.[1]);
assert.ok(pages >= 1);

const long = gerarPdfMinutaContrato({
  ...dados,
  contrato: { ...dados.contrato, objeto_escopo: "Gravação, edição, organização, entrega e revisão de material.\n".repeat(145) },
});
const longRaw = Buffer.from(await long.arrayBuffer()).toString("latin1");
assert.ok(Number(longRaw.match(/\/Type \/Pages \/Count (\d+)/)?.[1]) >= 2, "Escopo longo deve paginar.");
assert.throws(() => gerarPdfMinutaContrato({
  ...dados, contrato: { ...dados.contrato, status: "assinado" }
}), /não é mais rascunho/);

const gratis = gerarPdfMinutaContrato({
  contrato: { ...dados.contrato, tipo_modelo: "parceria_gratuita" },
  parceria: { nome_parceiro: "Parceiro sem fins lucrativos", natureza: "parceria" },
});
assert.ok(Buffer.from(await gratis.arrayBuffer()).toString("latin1").includes("Parceiro sem fins lucrativos"));
console.log("CRM contract PDF tests passed.");
