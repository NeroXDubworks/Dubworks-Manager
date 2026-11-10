// Geração de PDF A4 no navegador, sem serviços externos nem dependências.
// O documento usa apenas dados comerciais; custos internos e justificativas NÃO são exportados.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const LEFT = 48;
const RIGHT = PAGE_W - 48;
const WIDTH = RIGHT - LEFT;
const ROXO = [0.30, 0.16, 0.52];
const CINZA = [0.35, 0.39, 0.46];
const PRETO = [0.13, 0.17, 0.24];

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(value) {
  if (!value) return "";
  const data = String(value).slice(0, 10);
  const parts = data.split("-");
  return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : data;
}

function pdfText(value) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapePdf(value) {
  return pdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// WinAnsi (CP1252) permite acentos do português nas fontes-padrão do PDF.
const cp1252 = {
  0x20ac: 128, 0x201a: 130, 0x0192: 131, 0x201e: 132, 0x2026: 133,
  0x2020: 134, 0x2021: 135, 0x02c6: 136, 0x2030: 137, 0x0160: 138,
  0x2039: 139, 0x0152: 140, 0x017d: 142, 0x2018: 145, 0x2019: 146,
  0x201c: 147, 0x201d: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151,
  0x02dc: 152, 0x2122: 153, 0x0161: 154, 0x203a: 155, 0x0153: 156,
  0x017e: 158, 0x0178: 159,
};

function encodeBytes(text) {
  const out = [];
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp <= 255) out.push(cp);
    else out.push(cp1252[cp] ?? 63);
  }
  return new Uint8Array(out);
}

function wrap(value, approxChars) {
  const result = [];
  for (const paragraph of String(value ?? "").split(/\r?\n/)) {
    if (!paragraph.trim()) { result.push(""); continue; }
    let current = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const chunks = [];
      for (let pos = 0; pos < word.length; pos += approxChars) chunks.push(word.slice(pos, pos + approxChars));
      for (const chunk of chunks) {
        if (current && current.length + chunk.length + 1 > approxChars) {
          result.push(current);
          current = "";
        }
        current += (current ? " " : "") + chunk;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

function rgb(c) { return c.map(n => n.toFixed(3)).join(" "); }
function filenameSafe(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "cliente";
}

export function gerarPdfProposta({ proposta, cliente, negociacao, itens }) {
  if (!proposta || !cliente) throw new Error("Dados da proposta ou do cliente indisponíveis.");
  const pages = [[]];
  let pageIndex = 0;
  let y = PAGE_H - 48;
  const push = cmd => pages[pageIndex].push(cmd);

  function linha(x1, y1, x2, y2, cor = [0.83, 0.85, 0.90], grossura = 0.7) {
    push(rgb(cor) + " RG " + grossura + " w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
  }
  function retangulo(x, top, w, h, cor) {
    push(rgb(cor) + " rg " + x + " " + (top - h) + " " + w + " " + h + " re f");
  }
  function texto(value, x, top, tam = 10, forte = false, cor = PRETO) {
    push("BT /" + (forte ? "F2" : "F1") + " " + tam + " Tf " + rgb(cor) +
      " rg 1 0 0 1 " + x + " " + top + " Tm (" + escapePdf(value) + ") Tj ET");
  }
  function cabecalho(continuacao = false) {
    retangulo(0, PAGE_H, PAGE_W, 11, ROXO);
    texto("DUBWORKS", LEFT, PAGE_H - 53, 17, true, ROXO);
    texto("PROPOSTA COMERCIAL", LEFT + 133, PAGE_H - 53, 9, true, CINZA);
    linha(LEFT, PAGE_H - 69, RIGHT, PAGE_H - 69);
    y = PAGE_H - 94;
    if (continuacao) {
      texto("Proposta nº " + proposta.id + " | Versão " + proposta.versao + " - continuação", LEFT, y, 9, false, CINZA);
      y -= 27;
    }
  }
  function paginaNova() {
    pages.push([]);
    pageIndex += 1;
    cabecalho(true);
  }
  function espaco(altura) { if (y - altura < 74) paginaNova(); }
  function separador() { espaco(12); linha(LEFT, y, RIGHT, y); y -= 18; }
  function tituloSecao(titulo) {
    espaco(38);
    texto(titulo.toUpperCase(), LEFT, y, 10, true, ROXO);
    y -= 18;
  }
  function paragrafo(value, opts = {}) {
    const fontSize = opts.fontSize || 10;
    const lineHeight = opts.lineHeight || 15;
    const maxChars = opts.maxChars || 89;
    for (const row of wrap(value, maxChars)) {
      espaco(lineHeight);
      if (row) texto(row, LEFT, y, fontSize, Boolean(opts.bold), opts.cor || PRETO);
      y -= lineHeight;
    }
  }
  function campo(rotulo, valor) {
    if (!String(valor ?? "").trim()) return;
    espaco(22);
    texto(rotulo.toUpperCase(), LEFT, y, 8, true, CINZA);
    y -= 14;
    paragrafo(valor, { fontSize: 10, lineHeight: 15 });
    y -= 7;
  }

  cabecalho();
  texto(proposta.titulo || negociacao?.titulo || "Proposta de serviços", LEFT, y, 16, true, PRETO);
  y -= 23;
  texto("Proposta nº " + proposta.id + " | Versão " + proposta.versao, LEFT, y, 9, false, CINZA);
  texto("Emissão: " + dataBr(proposta.criado_em || new Date().toISOString()), 354, y, 9, false, CINZA);
  y -= 22;
  const documentoRascunho = !["aprovada", "enviada", "aceita"].includes(proposta.status);
  if (documentoRascunho) {
    retangulo(LEFT, y + 9, WIDTH, 24, [0.99, 0.94, 0.82]);
    texto("RASCUNHO - NÃO ENVIAR AO CLIENTE SEM APROVAÇÃO", LEFT + 9, y - 6, 9, true, [0.51, 0.33, 0.08]);
    y -= 31;
  }
  separador();
  tituloSecao("Cliente");
  campo("Nome / razão social", cliente.nome);
  if (cliente.cpf_cnpj) campo(cliente.tipo_pessoa === "pf" ? "CPF" : "CNPJ", cliente.cpf_cnpj);
  if (negociacao?.titulo) campo("Projeto / negociação", negociacao.titulo);

  tituloSecao("Objeto e escopo");
  paragrafo(proposta.descricao_escopo || negociacao?.escopo || "Escopo a definir.");
  y -= 11;

  tituloSecao("Serviços contemplados");
  const modoPersonalizado = proposta.modo_preco === "personalizado";
  if (!itens?.length) paragrafo("Os itens desta proposta não estão disponíveis para consulta.");
  for (const item of itens || []) {
    const titulo = item.descricao || "Serviço";
    const qtd = Number(item.quantidade || 0);
    const unidade = item.unidade || "unidade";
    const linhas = wrap(titulo, modoPersonalizado ? 78 : 66);
    const altura = Math.max(56, linhas.length * 15 + (modoPersonalizado ? 19 : 32));
    espaco(altura + 6);
    retangulo(LEFT, y + 12, WIDTH, altura, [0.963, 0.964, 0.983]);
    let itemY = y - 4;
    for (const row of linhas) {
      texto(row, LEFT + 11, itemY, 10, true);
      itemY -= 15;
    }
    texto("Quantidade: " + qtd.toLocaleString("pt-BR") + " " + unidade, LEFT + 11, itemY - 2, 9, false, CINZA);
    if (!modoPersonalizado) {
      const unitario = Number(item.preco_unitario || 0);
      texto("Unitário: " + money(unitario) + "    Subtotal: " + money(qtd * unitario),
        LEFT + 11, itemY - 16, 9, false, CINZA);
    }
    y -= altura + 7;
  }
  espaco(56);
  separador();
  retangulo(LEFT, y + 10, WIDTH, 43, ROXO);
  texto("VALOR TOTAL DA PROPOSTA", LEFT + 13, y - 10, 10, true, [1, 1, 1]);
  texto(money(proposta.valor_negociado), RIGHT - 155, y - 10, 13, true, [1, 1, 1]);
  y -= 57;
  if (proposta.condicoes_pagamento || proposta.validade_em) {
    tituloSecao("Condições comerciais");
    if (proposta.condicoes_pagamento) campo("Pagamento", proposta.condicoes_pagamento);
    if (proposta.validade_em) campo("Validade da proposta", dataBr(proposta.validade_em));
  }
  y -= 9;
  separador();
  paragrafo("Este documento apresenta o escopo e os valores comerciais da proposta. Ajustes ou serviços adicionais deverão ser acordados entre as partes.", {
    fontSize: 8.5, lineHeight: 13, cor: CINZA, maxChars: 101,
  });

  // Rodapé consistente em todas as páginas, mesmo com muitos serviços.
  pages.forEach((commands, i) => {
    commands.push(rgb([0.83, 0.85, 0.90]) + " RG .7 w " + LEFT + " 56 m " + RIGHT + " 56 l S");
    commands.push("BT /F1 8 Tf " + rgb(CINZA) + " rg 1 0 0 1 " + LEFT + " 42 Tm (DubWorks  |  Proposta " +
      escapePdf("#" + proposta.id + " - v" + proposta.versao) + ") Tj ET");
    commands.push("BT /F1 8 Tf " + rgb(CINZA) + " rg 1 0 0 1 " + (RIGHT - 71) + " 42 Tm (Página " +
      (i + 1) + " de " + pages.length + ") Tj ET");
  });

  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Count " + pages.length + " /Kids [" +
    pages.map((_, i) => (5 + i * 2) + " 0 R").join(" ") + "] >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((commands, i) => {
    const pageObject = 5 + i * 2;
    const streamObject = pageObject + 1;
    objects[pageObject] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PAGE_W + " " + PAGE_H +
      "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + streamObject + " 0 R >>";
    const stream = encodeBytes(commands.join("\n") + "\n");
    objects[streamObject] = { stream };
  });
  const fragments = [];
  const offsets = [0];
  let offset = 0;
  function add(textOrBytes) {
    const bytes = typeof textOrBytes === "string" ? encodeBytes(textOrBytes) : textOrBytes;
    fragments.push(bytes);
    offset += bytes.length;
  }
  add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  for (let n = 1; n < objects.length; n++) {
    offsets[n] = offset;
    add(n + " 0 obj\n");
    const obj = objects[n];
    if (typeof obj === "string") add(obj + "\n");
    else {
      add("<< /Length " + obj.stream.length + " >>\nstream\n");
      add(obj.stream);
      add("endstream\n");
    }
    add("endobj\n");
  }
  const xref = offset;
  add("xref\n0 " + objects.length + "\n0000000000 65535 f \n");
  for (let n = 1; n < objects.length; n++) add(String(offsets[n]).padStart(10, "0") + " 00000 n \n");
  add("trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
  return new Blob(fragments, { type: "application/pdf" });
}

export function baixarPdfProposta(dados) {
  const blob = gerarPdfProposta(dados);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "DubWorks-Proposta-" + dados.proposta.id + "-v" + dados.proposta.versao +
    "-" + filenameSafe(dados.cliente.nome) + ".pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
