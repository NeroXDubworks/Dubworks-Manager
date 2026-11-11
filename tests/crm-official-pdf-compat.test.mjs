import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
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
  // Poppler é opcional no runner. O teste primário (PDF completo, xref
  // tradicional, leitura e páginas reais pelo pdf-lib) roda sempre.
  const revisado = await pdfLib.PDFDocument.load(output);
  const count = revisado.getPageCount();
  assert.ok(count >= expectedMinimumPages, kind + ": páginas inválidas no PDF.");

  const pdfinfoAvailable = !spawnSync("pdfinfo", ["-v"], { encoding: "utf8" }).error;
  const pdftotextAvailable = !spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error;
  if (pdfinfoAvailable && pdftotextAvailable) {
    const infoResult = spawnSync("pdfinfo", [savedPath], { encoding: "utf8", timeout: 30000 });
    assert.equal(infoResult.status, 0, kind + ": pdfinfo falhou: " + infoResult.stderr);
    assert.doesNotMatch(infoResult.stderr || "", /Internal Error|xref|syntax error|reconstruct|couldn.t read/i,
      kind + ": há referências internas inválidas.");
    const countPoppler = Number(infoResult.stdout.match(/Pages:\s+(\d+)/)?.[1]);
    assert.equal(countPoppler, count, kind + ": leitores discordam sobre o número de páginas.");
    const textResult = spawnSync("pdftotext", ["-layout", savedPath, "-"], { encoding: "utf8", timeout: 30000 });
    assert.equal(textResult.status, 0, kind + ": pdftotext falhou: " + textResult.stderr);
    assert.doesNotMatch(textResult.stderr || "", /Internal Error|xref|syntax error|reconstruct|couldn.t read/i,
      kind + ": erros ao extrair texto.");
    const text = textResult.stdout;
    assert.match(text, /DUBWORKS/i, kind + ": título do modelo ausente");
    assert.match(text, /Cliente Teste/, kind + ": cliente não renderizado");
    if (kind === "proposta") assert.match(text, /690,00/, "valor negociado ausente");
    if (kind === "contrato") assert.match(text, /PRESTADORA/, "cláusulas do contrato ausentes");
  } else {
    console.log("Poppler não disponível neste runner; PDF validado pelo pdf-lib sem depender de apt externo.");
  }
  assert.equal(revisado.getPageCount(), count);
  assert.equal(revisado.getForm().getFields().length, 0,
    kind + ": o PDF final não deve conter campos AcroForm editáveis");
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
  console.log("PDF oficial: validação estrutural concluída.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
