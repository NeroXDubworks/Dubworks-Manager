// Minuta informativa para revisão humana/jurídica. Não substitui um contrato final aprovado.
const PW = 595.28;
const PH = 841.89;
const X = 49;
const END = PW - 49;
const ROXO = [0.30, 0.16, 0.52];
const ESCURO = [0.16, 0.20, 0.27];
const CINZA = [0.39, 0.43, 0.49];
const CP1252 = {
  0x20ac:128,0x201a:130,0x0192:131,0x201e:132,0x2026:133,0x2020:134,0x2021:135,
  0x02c6:136,0x2030:137,0x0160:138,0x2039:139,0x0152:140,0x017d:142,
  0x2018:145,0x2019:146,0x201c:147,0x201d:148,0x2022:149,0x2013:150,
  0x2014:151,0x02dc:152,0x2122:153,0x0161:154,0x203a:155,0x0153:156,0x017e:158,0x0178:159,
};
const COLOR = c => c.map(n => n.toFixed(3)).join(" ");
const escapeText = t => String(t ?? "").replace(/[\r\t\n]+/g, " ").replace(/\s+/g, " ").trim()
  .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const encode = t => {
  const out = [];
  for (const ch of t) {
    const point = ch.codePointAt(0);
    out.push(point < 256 ? point : CP1252[point] || 63);
  }
  return new Uint8Array(out);
};
function wrap(text, max) {
  const lines = [];
  for (const paragraph of String(text ?? "").split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let current = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const pieces = word.match(new RegExp(".{1," + max + "}", "g")) || [word];
      for (const piece of pieces) {
        if (current && current.length + 1 + piece.length > max) {
          lines.push(current);
          current = "";
        }
        current += (current ? " " : "") + piece;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}
function dataBr(value) {
  if (!value) return "Não informado";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : String(value);
}
function safeName(t) {
  return String(t || "contrato").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "contrato";
}
const modelos = {
  servico_gratuito: "Prestação de serviços gratuita",
  servico_remunerado: "Prestação de serviços remunerada",
  parceria_gratuita: "Parceria gratuita",
  parceria_remunerada: "Parceria remunerada",
};

export function gerarPdfMinutaContrato({ contrato, cliente = null, negociacao = null, parceria = null }) {
  if (!contrato?.id || (!cliente && !parceria)) throw new Error("Dados do contrato/contraparte indisponíveis.");
  if (!["rascunho", "em_revisao"].includes(contrato.status)) {
    throw new Error("Esta versão não é mais rascunho. Consulte o documento revisado/anexado ao contrato.");
  }
  const pages = [[]];
  let p = 0;
  let y = PH - 45;
  const cmd = t => pages[p].push(t);
  const text = (t, x, at, size = 10, bold = false, col = ESCURO) => {
    cmd("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + COLOR(col) +
      " rg 1 0 0 1 " + x + " " + at + " Tm (" + escapeText(t) + ") Tj ET");
  };
  const bar = (x, top, width, height, color) => cmd(COLOR(color) + " rg " + x + " " +
    (top - height) + " " + width + " " + height + " re f");
  const rule = (at) => cmd("0.84 0.86 0.9 RG .7 w " + X + " " + at + " m " + END + " " + at + " l S");
  function header(continued = false) {
    bar(0, PH, PW, 9, ROXO);
    text("DUBWORKS", X, PH - 47, 17, true, ROXO);
    text("MINUTA PARA REVISÃO", 311, PH - 45, 9, true, CINZA);
    rule(PH - 65);
    y = PH - 92;
    if (continued) {
      text("Contrato #" + contrato.id + " - versão " + contrato.versao + " (continuação)", X, y, 9, false, CINZA);
      y -= 24;
    }
  }
  function nextPage() { pages.push([]); p++; header(true); }
  function need(height) { if (y - height < 74) nextPage(); }
  function lines(s, size = 10, lh = 16, max = 90, color = ESCURO, bold = false) {
    for (const line of wrap(s, max)) {
      need(lh);
      if (line.trim()) text(line, X, y, size, bold, color);
      y -= lh;
    }
  }
  function section(s) {
    need(37);
    y -= 13;
    text(s.toUpperCase(), X, y, 10, true, ROXO);
    y -= 21;
  }
  function field(label, val) {
    need(30);
    text(label.toUpperCase(), X, y, 8, true, CINZA);
    y -= 14;
    lines(val || "[INFORMAÇÃO PENDENTE]", 10, 16, 90);
    y -= 8;
  }
  header();
  text(contrato.titulo || "Contrato comercial", X, y, 16, true);
  y -= 26;
  text("Identificação: #" + contrato.id + "  |  Versão: " + contrato.versao, X, y, 9, false, CINZA);
  y -= 27;
  bar(X, y + 12, END - X, 48, [0.99, 0.94, 0.80]);
  text("DOCUMENTO PRELIMINAR - NÃO ENVIAR PARA ASSINATURA", X + 10, y - 4, 9, true, [0.52, 0.35, 0.11]);
  text("Completar os dados e submeter à revisão jurídica/administrativa.", X + 10, y - 22, 9, false, [0.52, 0.35, 0.11]);
  y -= 59;
  section("1. Partes");
  field("Contratante / parceiro", cliente?.nome || parceria?.nome_parceiro);
  if (cliente?.cpf_cnpj) field(cliente.tipo_pessoa === "pf" ? "CPF" : "CNPJ", cliente.cpf_cnpj);
  else field("Documento da contraparte", "[CPF/CNPJ ou identificação a preencher]");
  field("Dados da DubWorks", "Razão social, CPF/CNPJ, endereço e representante legal: [PREENCHER E CONFERIR]");
  section("2. Natureza e objeto");
  field("Modalidade", modelos[contrato.tipo_modelo] || contrato.tipo_modelo);
  field("Objeto / escopo", contrato.objeto_escopo || negociacao?.escopo || parceria?.escopo || "[DESCREVER O ESCOPO]");
  section("3. Condições a definir no documento revisado");
  lines("Prazo de execução, entregas, obrigações das partes, valores e forma de pagamento (se houver), propriedade intelectual, autorização de uso de voz/imagem, sigilo e rescisão devem ser definidos no contrato final conforme o serviço e a negociação.", 10, 16, 84);
  y -= 8;
  lines("Nenhuma dessas condições foi presumida ou inserida automaticamente. Consulte a proposta aceita e valide o texto com os responsáveis antes do envio.", 9, 14, 98, CINZA);
  section("4. Aprovação e assinaturas");
  lines("Esta minuta não comprova aprovação, envio, aceite nem assinatura. O documento final revisado e assinado deve ser anexado ao registro do contrato no CRM.", 10, 16, 88);
  y -= 28;
  need(72);
  rule(y);
  y -= 17;
  text("Assinatura da contratante / parceiro", X, y, 9, false, CINZA);
  y -= 32;
  rule(y);
  y -= 17;
  text("Assinatura do representante da DubWorks", X, y, 9, false, CINZA);

  pages.forEach((commands, i) => {
    commands.push("0.84 0.86 0.9 RG .7 w " + X + " 57 m " + END + " 57 l S");
    commands.push("BT /F1 8 Tf " + COLOR(CINZA) + " rg 1 0 0 1 " + X +
      " 43 Tm (DubWorks | Minuta #" + contrato.id + " v" + contrato.versao + ") Tj ET");
    commands.push("BT /F1 8 Tf " + COLOR(CINZA) + " rg 1 0 0 1 " + (END - 74) +
      " 43 Tm (Página " + (i + 1) + " de " + pages.length + ") Tj ET");
  });
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Count " + pages.length + " /Kids [" +
    pages.map((_, i) => 5 + i * 2 + " 0 R").join(" ") + "] >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((commands, i) => {
    const pageObj = i * 2 + 5;
    const streamObj = pageObj + 1;
    objs[pageObj] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH +
      "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + streamObj + " 0 R >>";
    objs[streamObj] = { stream: encode(commands.join("\n") + "\n") };
  });
  const fragments = [];
  let pos = 0;
  const offsets = [0];
  function write(value) {
    const bytes = typeof value === "string" ? encode(value) : value;
    fragments.push(bytes);
    pos += bytes.length;
  }
  write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = pos;
    write(i + " 0 obj\n");
    const o = objs[i];
    if (typeof o === "string") write(o + "\n");
    else { write("<< /Length " + o.stream.length + " >>\nstream\n"); write(o.stream); write("endstream\n"); }
    write("endobj\n");
  }
  const xref = pos;
  write("xref\n0 " + objs.length + "\n0000000000 65535 f \n");
  for (let i = 1; i < objs.length; i++) write(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  write("trailer\n<< /Size " + objs.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
  return new Blob(fragments, { type: "application/pdf" });
}

export function baixarPdfMinutaContrato(dados) {
  const blob = gerarPdfMinutaContrato(dados);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "DubWorks-Minuta-Contrato-" + dados.contrato.id + "-v" + dados.contrato.versao +
    "-" + safeName(dados.cliente?.nome || dados.parceria?.nome_parceiro) + ".pdf";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
