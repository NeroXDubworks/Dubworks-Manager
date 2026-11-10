import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  camposPropostaOficial, camposContratoOficial,
} from "../src/shared/crmOfficialTemplates.js";
for (const filename of ["DubWorks_Modelo_Proposta_Comercial.pdf", "DubWorks_Modelo_Contrato_Prestacao_Servicos.pdf"]) {
  const bytes = readFileSync(new URL("../public/templates/" + filename, import.meta.url));
  assert.ok(bytes.length > 20000 && bytes.subarray(0, 5).toString() === "%PDF-", filename + " precisa ser um PDF real.");
}
const cliente = { nome: "Cliente teste", cpf_cnpj: "00.000.000/0001-00" };
const negociacao = { titulo: "Campanha A", escopo: "Áudio para três vídeos" };
const proposta = {
  id: 12, versao: 1, titulo: "Proposta", status: "aceita", modo_preco: "personalizado",
  valor_negociado: 690, criado_em: "2026-11-10T12:00:00Z", condicoes_pagamento: "50% na entrada",
};
const itens = Array.from({ length: 5 }, (_, i) => ({
  descricao: "Serviço " + (i + 1), quantidade: 1, unidade: "projeto", preco_unitario: 5000,
}));
const personalizada = camposPropostaOficial({ cliente, negociacao, proposta, itens });
assert.match(personalizada.fields.total, /690,00/);
assert.match(personalizada.fields.item_1, /Pacote fechado/);
assert.match(personalizada.fields.unit_1, /690,00/);
assert.equal(personalizada.fields.item_2, "");
assert.ok(personalizada.appendix[0].value.includes("Serviço 5"));
assert.ok(!personalizada.appendix[0].value.includes("5.000,00"), "Não expor referência em preço personalizado.");

const automatico = camposPropostaOficial({
  cliente, negociacao, proposta: { ...proposta, modo_preco: "automatico", valor_negociado: 25000 }, itens
});
assert.equal(automatico.fields.item_3, "Serviço 3");
assert.match(automatico.appendix[0].value, /Serviço 5/);
assert.match(automatico.appendix[0].value, /5\.000,00/);

const contrato = { id: 41, versao: 1, status: "rascunho", tipo_modelo: "servico_remunerado", objeto_escopo: "Produção audiovisual", criado_em: "2026-11-10" };
const remunerado = camposContratoOficial({ contrato, cliente, negociacao, propostaAceita: proposta });
assert.match(remunerado.fields.anexo_preco, /690,00/);
assert.match(remunerado.fields.anexo_proposta, /DW-0012/);
assert.equal(remunerado.fields.prestadora_razao, "", "Não presumir razão social da equipe DubWorks.");
assert.equal(remunerado.fields.assinatura_local_data, "", "Não presumir assinatura.");
assert.ok(remunerado.fields.status_contrato.includes("MINUTA"));

const gratis = camposContratoOficial({
  contrato: { ...contrato, tipo_modelo: "parceria_gratuita" },
  parceria: { nome_parceiro: "Parceria comunitária" },
  propostaAceita: proposta,
});
assert.equal(gratis.fields.anexo_modalidade, "Gratuita");
assert.equal(gratis.fields.anexo_proposta, "");
assert.match(gratis.fields.anexo_preco, /Gratuita/);
assert.throws(() => camposContratoOficial({
  contrato: { ...contrato, status: "assinado" }, cliente, negociacao,
}), /Contrato aprovado ou assinado/);
console.log("Templates oficiais CRM: testes aprovados.");
