import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import * as pdfLib from "pdf-lib";
import { renderizarPdfOficial } from "../src/shared/crmOfficialTemplates.js";

// Executa a mesma rotina usada pelo browser, com os modelos reais da DubWorks.
// pdfinfo é um parser independente do pdf-lib e detecta corrupção de xref,
// PDFs com zero páginas e falhas de serialização que o viewer do Drive tolera.
const originals = {
  proposta: readFileSync(new URL("../public/templates/DubWorks_Modelo_Proposta_Comercial.pdf", import.meta.url)),
  contrato: readFileSync(new URL("../public/templates/DubWorks_Modelo_Contrato_Prestacao_Servicos.pdf", import.meta.url)),
};
const dir = mkdtempSync(join(tmpdir(), "dw-pdf-test-"));
const cliente = { id: 4, nome: "Cliente Teste", tipo_pessoa: "pj", cpf_cnpj: "00.000.000/0001-00" };
const negociacao = { id: 2, titulo: "Campanha Bunnicula", escopo: "Dublagem e direção de voz de episódios." };
const proposta = {
  id: 4, versao: 3, status: "aceita", titulo: "Campanha Bunnicula",
  modo_preco: "personalizado", valor_negociado: 690, criado_em: "2026-11-10T14:30:00Z",
  descricao_escopo: "Dublagem e produção audiovisual.", validade_em: "2026-12-11",
  condicoes_pagamento: "50% na aprovação e 50% na entrega.",
};
const itens = [
  { id: 1, descricao: "Dublagem", unidade: "episodio", quantidade: 1, preco_unitario: 3000 },
  { id: 2, descricao: "Edição e tratamento de áudio", unidade: "episodio", quantidade: 1, preco_unitario: 3000 },
  { id: 3, descricao: "Direção de voz", unidade: "episodio", quantidade: 1, preco_unitario: 3000 },
  { id: 4, descricao: "Finalização", unidade: "episodio", quantidade: 1, preco_unitario: 3000 },
];

async function check(kind, data, expectedMinimumPages) {
  const bytes = originals[kind];
  const blob = await renderizarPdfOficial(kind, data, bytes, pdfLib);
  assert.equal(blob.type, "application/pdf");
  const output = Buffer.from(await blob.arrayBuffer());
  assert.ok(output.length > 20000, kind + ": não pode ser PDF vazio");
  assert.equal(output.subarray(0, 5).toString(), "%PDF-", kind + ": cabeçalho PDF inválido");
  const tail = output.subarray(-100).toString("latin1");
  assert.match(tail, /%%EOF\s*$/, kind + ": marcador EOF ausente");
  // A solução de compatibilidade precisa criar uma xref tradicional.
  assert.match(tail, /startxref\n\d+\n%%EOF/, kind + ": sem referência da tabela xref");
  const savedPath = join(dir, kind + ".pdf");
  writeFileSync(savedPath, output);
  const infoResult = spawnSync("pdfinfo", [savedPath], { encoding: "utf8", timeout: 30000 });
  assert.equal(infoResult.status, 0, kind + ": pdfinfo falhou: " + infoResult.stderr);
  assert.doesNotMatch(infoResult.stderr || "", /Internal Error|xref|syntax error|reconstruct|couldn.t read/i,
    kind + ": há referências internas inválidas no arquivo PDF");
  const info = infoResult.stdout;
  const count = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
  assert.ok(count >= expectedMinimumPages, kind + ": PDF inválido ou páginas ausentes: " + info);
  const textResult = spawnSync("pdftotext", ["-layout", savedPath, "-"], { encoding: "utf8", timeout: 30000 });
  assert.equal(textResult.status, 0, kind + ": pdftotext falhou: " + textResult.stderr);
  assert.doesNotMatch(textResult.stderr || "", /Internal Error|xref|syntax error|reconstruct|couldn.t read/i,
    kind + ": erros estruturais ao extrair o texto do PDF");
  const text = textResult.stdout;
  assert.match(text, /DUBWORKS/i, kind + ": logo/título do modelo ausente");
  assert.match(text, /Cliente Teste/, kind + ": cliente não renderizado");
  if (kind === "proposta") assert.match(text, /690,00/, "valor da proposta negociado ausente");
  if (kind === "contrato") assert.match(text, /PRESTADORA/, "cláusulas do contrato ausentes");
  // Conferência adicional usando o leitor da biblioteca, independente do pdfinfo.
  const revisado = await pdfLib.PDFDocument.load(output);
  assert.equal(revisado.getPageCount(), count);
  assert.ok(revisado.getForm().getFields().every(field => field.isReadOnly()),
    kind + ": campos do PDF devem ficar protegidos contra alterações casuais");
  console.log(kind + ": PDF íntegro e legível, " + count + " páginas, " + output.length + " bytes.");
}

try {
  await check("proposta", { proposta, cliente, negociacao, itens }, 4);
  await check("contrato", {
    contrato: {
      id: 11, versao: 1, status: "rascunho", tipo_modelo: "servico_remunerado",
      titulo: "Prestação de serviços", objeto_escopo: "Dublagem e edição",
      criado_em: "2026-11-10T14:30:00Z",
    },
    propostaAceita: proposta, cliente, negociacao,
  }, 9);
  console.log("PDF oficial: compatibilidade conferida com Poppler e pdf-lib.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
