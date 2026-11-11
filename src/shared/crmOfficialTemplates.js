import { CAMPOS_MODELO } from "./crmOfficialFieldPositions.js";
/**
 * Preenche os PDFs oficiais que a diretoria forneceu, preservando integralmente
 * as páginas e a identidade visual originais. Os arquivos são servidos pelo
 * próprio Vite (/public/templates), sem enviar os dados do CRM a terceiros.
 *
 * O motor pdf-lib (versão fixada) é carregado sob demanda, somente no navegador.
 */
const TEMPLATES = {
  proposta: "/templates/DubWorks_Modelo_Proposta_Comercial.pdf",
  contrato: "/templates/DubWorks_Modelo_Contrato_Prestacao_Servicos.pdf",
};
const LIBRARY = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
let loader;

export function loadPdfLib() {
  if (typeof window === "undefined") throw new Error("PDF disponível somente no navegador.");
  if (window.PDFLib?.PDFDocument) return Promise.resolve(window.PDFLib);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-dw-pdf-lib="true"]');
      const script = existing || document.createElement("script");
      const timer = setTimeout(() => reject(new Error("A biblioteca de PDF demorou para carregar. Verifique sua conexão.")), 25000);
      const finish = () => {
        clearTimeout(timer);
        if (window.PDFLib?.PDFDocument) resolve(window.PDFLib);
        else reject(new Error("Falha ao inicializar o editor PDF."));
      };
      const fail = () => { clearTimeout(timer); reject(new Error("Não foi possível carregar a biblioteca de PDF. Tente novamente.")); };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = LIBRARY;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.setAttribute("data-dw-pdf-lib", "true");
        document.head.appendChild(script);
      }
    }).catch(error => { loader = null; throw error; });
  }
  return loader;
}

function brl(n) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function numberBr(n) { return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 }); }
function dateBr(value) {
  if (!value) return "";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : String(value);
}
function clean(value) {
  return String(value == null ? "" : value).replace(/\r\n/g, "\n").trim();
}
function escapeName(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 46) || "cliente";
}
function validNumber(value) { return Number.isFinite(Number(value)) && Number(value) >= 0; }

async function templateDoc(kind) {
  const lib = await loadPdfLib();
  const response = await fetch(TEMPLATES[kind], { credentials: "same-origin" });
  if (!response.ok) throw new Error("Modelo oficial de " + kind + " não encontrado na implantação (" + response.status + ").");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 20000) throw new Error("O arquivo do modelo oficial está incompleto.");
  return { bytes, lib };
}

function fitForStamp(key, raw, limits, appendix) {
  const original = clean(raw);
  const limit = limits[key] || 58;
  if (original.length > limit) {
    appendix.push({ label: key.replace(/_/g, " ").toUpperCase(), value: original });
    return "VER ANEXO COMPLEMENTAR";
  }
  return original;
}

function desenharCampo(doc, font, cor, name, value, rect) {
  if (!value) return;
  const [pageIndex, x, top, width, height] = rect;
  const page = doc.getPages()[pageIndex];
  if (!page) throw new Error("Posição de campo inválida: " + name);
  const { height: pageHeight } = page.getSize();
  const multiline = height >= 38;
  let size = width < 100 ? 7.3 : multiline ? 9.2 : 9;
  let lines = wrapped(value, font, size, width - 12);
  const maxHeight = height - 6;
  while ((lines.length * size * 1.2 > maxHeight || lines.some(t => font.widthOfTextAtSize(t, size) > width - 10)) && size > 6.4) {
    size -= 0.4;
    lines = wrapped(value, font, size, width - 12);
  }
  if (lines.length * size * 1.2 > maxHeight) {
    throw new Error("O campo " + name + " excede a área do modelo. Reduza o texto ou inclua no anexo.");
  }
  const lineHeight = size * 1.2;
  const textHeight = lines.length * lineHeight;
  const topPadding = multiline ? 6 : Math.max(5, (height - textHeight) / 2);
  let baseline = pageHeight - top - topPadding - size;
  for (const line of lines) {
    if (line) page.drawText(line, { x: x + 6, y: baseline, size, font, color: cor });
    baseline -= lineHeight;
  }
}

function wrapped(text, font, size, maxWidth) {
  const result = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = "";
    for (const part of paragraph.split(/\s+/).filter(Boolean)) {
      let remaining = part;
      // Particiona sequências longas sem espaços para que não saiam da página.
      while (remaining.length && font.widthOfTextAtSize(remaining, size) > maxWidth) {
        let n = 1;
        while (n < remaining.length && font.widthOfTextAtSize(remaining.slice(0, n + 1), size) < maxWidth) n++;
        const chunk = remaining.slice(0, n);
        if (line) { result.push(line); line = ""; }
        result.push(chunk);
        remaining = remaining.slice(n);
      }
      if (!remaining) continue;
      const candidate = line ? line + " " + remaining : remaining;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        result.push(line); line = remaining;
      } else line = candidate;
    }
    result.push(line);
  }
  return result;
}

async function addAppendix(pdf, lib, sections) {
  if (!sections.length) return;
  const font = await pdf.embedFont(lib.StandardFonts.Helvetica);
  const bold = await pdf.embedFont(lib.StandardFonts.HelveticaBold);
  const purple = lib.rgb(0.26, 0.16, 0.68);
  let page, y;
  const start = () => {
    page = pdf.addPage([595.28, 841.89]); y = 789;
    page.drawRectangle({ x: 0, y: 822, width: 595.28, height: 19, color: purple });
    page.drawText("DUBWORKS / ANEXO COMPLEMENTAR", { x: 48, y: 796, size: 12, font: bold, color: purple });
    y -= 32;
  };
  start();
  for (const sec of sections) {
    const rawLines = wrapped(sec.value, font, 9, 494);
    if (y < 108) start();
    for (const titleLine of wrapped(sec.label, bold, 9, 494)) {
      if (y < 86) start();
      page.drawText(titleLine, { x: 48, y, size: 9, font: bold, color: purple });
      y -= 14;
    }
    for (const line of rawLines) {
      if (y < 76) start();
      if (line) page.drawText(line, { x: 48, y, size: 9, font });
      y -= 14;
    }
    y -= 15;
  }
}

function identifyDraft(pdf, lib, label) {
  const page = pdf.getPages()[0];
  const font = pdf.embedFont; // A faixa fica fora do quadro de campos originais.
  return pdf.embedFont(lib.StandardFonts.HelveticaBold).then(bold => {
    page.drawText(label, { x: 360, y: 783, size: 8.1, font: bold, color: lib.rgb(0.64, 0.28, 0.16) });
  });
}

const PROPOSAL_LIMITS = {
  cliente: 36, projeto: 34, numero: 20, data: 19, validade: 25,
  objetivo: 195, etapa_1: 75, etapa_2: 75, etapa_3: 75,
  entregaveis: 48, revisoes: 27,
  item_1: 38, item_2: 38, item_3: 38,
  qtd_1: 8, qtd_2: 8, qtd_3: 8,
  unit_1: 16, unit_2: 16, unit_3: 16,
  subtotal_1: 15, subtotal_2: 15, subtotal_3: 15,
  total: 17, inicio: 25, entrega: 25, pagamento: 23,
  contato: 39, responsavel: 39,
};

export function camposPropostaOficial({ proposta, cliente, negociacao, itens, extras = {} }) {
  if (!proposta || !cliente || !negociacao) throw new Error("Selecione uma proposta vinculada a um cliente e negociação.");
  if (!itens?.length) throw new Error("A proposta não possui serviços. Confira os itens antes de gerar o PDF.");
  if (!validNumber(proposta.valor_negociado)) throw new Error("Total negociado inválido.");
  const personalized = proposta.modo_preco === "personalizado";
  const rows = personalized
    ? [{ descricao: "Pacote fechado conforme escopo", quantidade: 1, preco_unitario: Number(proposta.valor_negociado) }]
    : itens;
  const fields = {
    cliente: cliente.nome, projeto: negociacao.titulo,
    numero: "DW-" + String(proposta.id).padStart(4, "0") + " / v" + proposta.versao,
    data: dateBr(proposta.criado_em), validade: dateBr(proposta.validade_em),
    objetivo: proposta.descricao_escopo || negociacao.escopo || "",
    etapa_1: extras.etapa_1 || "", etapa_2: extras.etapa_2 || "", etapa_3: extras.etapa_3 || "",
    entregaveis: extras.entregaveis || "", revisoes: extras.revisoes || "",
    total: brl(proposta.valor_negociado),
    inicio: extras.inicio || "", entrega: extras.entrega || "",
    pagamento: proposta.condicoes_pagamento || "",
    contato: extras.contato || "", responsavel: extras.responsavel || "",
  };
  for (let i = 0; i < 3; i++) {
    const key = i + 1;
    const item = rows[i];
    fields["item_" + key] = item?.descricao || "";
    fields["qtd_" + key] = item ? numberBr(item.quantidade) : "";
    fields["unit_" + key] = item ? brl(item.preco_unitario) : "";
    fields["subtotal_" + key] = item ? brl(Number(item.quantidade) * Number(item.preco_unitario)) : "";
  }
  const appendix = [];
  if (personalized) {
    appendix.push({ label: "COMPOSIÇÃO DO PACOTE FECHADO (SEM PREÇOS INDIVIDUAIS)",
      value: itens.map(i => "• " + i.descricao + " — " + numberBr(i.quantidade) + " " + i.unidade).join("\n") });
  } else if (itens.length > 3) {
    appendix.push({ label: "ITENS ADICIONAIS DA PROPOSTA",
      value: itens.slice(3).map((i, idx) => {
        return (idx + 4) + ". " + i.descricao + " — " + numberBr(i.quantidade) + " " + i.unidade +
        " × " + brl(i.preco_unitario) + " = " + brl(Number(i.quantidade) * Number(i.preco_unitario));
      }).join("\n") });
  }
  return { fields, appendix };
}

const CONTRACT_LIMITS = {
  numero_contrato: 22, versao_contrato: 14, data_emissao: 20, status_contrato: 52,
  prestadora_razao: 48, prestadora_documento: 22, prestadora_endereco: 72,
  prestadora_representante: 41, prestadora_email: 33,
  cliente_razao: 48, cliente_documento: 22, cliente_endereco: 72,
  cliente_representante: 41, cliente_email: 33,
  anexo_nome_projeto: 48, anexo_proposta: 29,
  anexo_modalidade: 35, anexo_responsavel: 40,
  anexo_descricao: 200, anexo_entregas: 200, anexo_etapas: 190,
  anexo_preco: 31, anexo_parcelas: 45, anexo_despesas: 44, anexo_pagamento: 44,
  anexo_revisoes: 80, anexo_direitos: 165, anexo_creditos: 125,
  anexo_observacoes: 92, assinatura_local_data: 49,
};

export function camposContratoOficial({ contrato, cliente = null, negociacao = null, parceria = null, propostaAceita = null, extras = {} }) {
  if (!["rascunho", "em_revisao"].includes(contrato?.status))
    throw new Error("Contrato aprovado ou assinado: consulte o documento revisado em vez de criar nova minuta.");
  if (!cliente && !parceria) throw new Error("O contrato precisa de cliente ou parceria vinculada.");
  const free = ["servico_gratuito", "parceria_gratuita"].includes(contrato.tipo_modelo);
  const propostaVinculada = !free && propostaAceita?.status === "aceita" ? propostaAceita : null;
  const fields = {
    numero_contrato: "DW-CTR-" + String(contrato.id).padStart(4, "0"),
    versao_contrato: "v" + contrato.versao + ".0",
    data_emissao: dateBr(contrato.criado_em),
    status_contrato: "MINUTA - PREENCHER E APROVAR ANTES DE ASSINAR",
    prestadora_razao: extras.prestadora_razao || "",
    prestadora_documento: extras.prestadora_documento || "",
    prestadora_endereco: extras.prestadora_endereco || "",
    prestadora_representante: extras.prestadora_representante || "",
    prestadora_email: extras.prestadora_email || "",
    cliente_razao: cliente?.nome || parceria?.nome_parceiro || "",
    cliente_documento: cliente?.cpf_cnpj || "",
    cliente_endereco: extras.cliente_endereco || "",
    cliente_representante: extras.cliente_representante || "",
    cliente_email: extras.cliente_email || "",
    anexo_nome_projeto: negociacao?.titulo || parceria?.nome_parceiro || "",
    anexo_proposta: propostaVinculada ? "DW-" + String(propostaVinculada.id).padStart(4, "0") + " / v" + propostaVinculada.versao : "",
    anexo_modalidade: free ? "Gratuita" : "Remunerada",
    anexo_responsavel: extras.anexo_responsavel || "",
    anexo_descricao: contrato.objeto_escopo || negociacao?.escopo || parceria?.escopo || "",
    anexo_entregas: extras.anexo_entregas || "",
    anexo_etapas: extras.anexo_etapas || "",
    anexo_preco: free ? "Gratuita (sem remuneração)" : propostaVinculada ? brl(propostaVinculada.valor_negociado) : "",
    anexo_parcelas: extras.anexo_parcelas || propostaVinculada?.condicoes_pagamento || "",
    anexo_despesas: extras.anexo_despesas || "",
    anexo_pagamento: extras.anexo_pagamento || "",
    anexo_revisoes: extras.anexo_revisoes || "",
    anexo_direitos: extras.anexo_direitos || "",
    anexo_creditos: extras.anexo_creditos || "",
    anexo_observacoes: extras.anexo_observacoes || "",
    assinatura_local_data: "", // Nunca presume assinatura ou data da assinatura.
  };
  return { fields, appendix: [] };
}

/**
 * Exporta o mesmo PDF na web e nos testes de compatibilidade.
 * A tabela de referências PDF tradicional evita o problema de leitores
 * (Edge/Acrobat) rejeitarem arquivos serializados com object streams.
 */
export async function renderizarPdfOficial(kind, data, templateBytes, lib) {
  if (!["proposta", "contrato"].includes(kind)) throw new Error("Modelo de PDF desconhecido.");
  const original = await lib.PDFDocument.load(templateBytes);
  const paginasModelo = kind === "proposta" ? 3 : 9;
  if (original.getPageCount() !== paginasModelo) {
    throw new Error("Modelo oficial incompatível: número de páginas inesperado.");
  }

  // Não modificar o AcroForm de origem. O pdf-lib pode deixar referências
  // xref órfãs mesmo sem flatten. As páginas visuais são copiadas para um
  // documento novo, e os valores são impressos por cima nos retângulos oficiais.
  // Isso resulta num PDF não editável, sem widgets ou refs órfãs do formulário.
  const pdf = await lib.PDFDocument.create();
  const embutidas = await pdf.embedPdf(templateBytes, Array.from({ length: paginasModelo }, (_, i) => i));
  for (const folha of embutidas) {
    const pagina = pdf.addPage([folha.width, folha.height]);
    pagina.drawPage(folha, { x: 0, y: 0, width: folha.width, height: folha.height });
  }

  const { fields, appendix } = kind === "proposta" ? camposPropostaOficial(data) : camposContratoOficial(data);
  const limits = kind === "proposta" ? PROPOSAL_LIMITS : CONTRACT_LIMITS;
  const positions = CAMPOS_MODELO[kind];
  const font = await pdf.embedFont(lib.StandardFonts.Helvetica);
  const color = lib.rgb(0.14, 0.15, 0.25);
  for (const [name, value] of Object.entries(fields)) {
    const rect = positions[name];
    if (!rect) throw new Error("Campo sem posição no modelo: " + name);
    const shown = fitForStamp(name, value, limits, appendix);
    desenharCampo(pdf, font, color, name, shown, rect);
  }

  if (kind === "proposta" && !["aprovada", "enviada", "aceita"].includes(data.proposta.status)) {
    await identifyDraft(pdf, lib, "RASCUNHO - AGUARDANDO APROVAÇÃO");
  }
  await addAppendix(pdf, lib, appendix);
  pdf.setTitle(kind === "proposta" ? "DubWorks - Proposta comercial" : "DubWorks - Minuta de contrato");
  pdf.setAuthor("DubWorks");

  const bytes = await pdf.save({ useObjectStreams: false, updateFieldAppearances: false, addDefaultPage: false });
  if (bytes.byteLength < 20000 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70) {
    throw new Error("Falha na exportação: o arquivo PDF ficou incompleto.");
  }
  const conferencia = await lib.PDFDocument.load(bytes);
  if (conferencia.getPageCount() < paginasModelo || conferencia.getForm().getFields().length > 0) {
    throw new Error("Falha na exportação: páginas ausentes ou formulário não removido.");
  }
  return new Blob([bytes], { type: "application/pdf" });
}

async function compose(kind, data) {
  const { bytes, lib } = await templateDoc(kind);
  return renderizarPdfOficial(kind, data, bytes, lib);
}

export async function pdfPropostaOficial(data) { return compose("proposta", data); }
export async function pdfContratoOficial(data) { return compose("contrato", data); }
export function baixarDocumentoPdf(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}
export function nomePdfProposta(data) {
  return "DubWorks-Proposta-" + data.proposta.id + "-v" + data.proposta.versao + "-" + escapeName(data.cliente.nome) + ".pdf";
}
export function nomePdfContrato(data) {
  return "DubWorks-Minuta-Contrato-" + data.contrato.id + "-v" + data.contrato.versao + "-" +
    escapeName(data.cliente?.nome || data.parceria?.nome_parceiro || "cliente") + ".pdf";
}
