import React, { useEffect, useMemo, useState } from "react";
import type {
  CrmCliente, CrmNegociacao, CrmProposta, CrmPropostaItem, ParceriaGratuita,
} from "../services/commercialCrm";
import type { ContratoCrmBasico } from "./CrmContractPreview";
import { pendenciasProposta, pendenciasContrato } from "../shared/crmDocumentReadiness.js";
import {
  salvarCamposPdfCrm, arquivarPdfCrm, listarDocumentosCrm, baixarDocumentoArquivadoCrm, sincronizarDocumentoDriveCrm,
  type DocumentoGeradoCrm,
} from "../services/commercialCrm";
import {
  pdfPropostaOficial, pdfContratoOficial, baixarDocumentoPdf,
  camposPropostaOficial, camposContratoOficial, nomePdfContrato, nomePdfProposta,
  type PdfExtraFields,
} from "../shared/crmOfficialTemplates.js";

type ProposalProps = {
  kind: "proposta";
  proposta: CrmProposta;
  cliente: CrmCliente;
  negociacao: CrmNegociacao;
  itens: CrmPropostaItem[];
  onCamposSalvos?: () => Promise<void>;
};
type ContractProps = {
  kind: "contrato";
  contrato: ContratoCrmBasico;
  cliente?: CrmCliente | null;
  negociacao?: CrmNegociacao | null;
  parceria?: ParceriaGratuita | null;
  propostaAceita?: CrmProposta | null;
  onCamposSalvos?: () => Promise<void>;
};
type Props = ProposalProps | ContractProps;
const editable: React.CSSProperties = {
  background: "#090f23", color: "#f8fafc", width: "100%", borderRadius: 8,
  border: "1px solid #675487", padding: "9px 11px", fontSize: 13,
};
const button: React.CSSProperties = {
  background: "#4b2788", color: "#fff", borderRadius: 9, padding: "10px 13px",
  cursor: "pointer", fontWeight: 700, border: "1px solid #8662ba",
};
const small: React.CSSProperties = { color: "#aab6cf", fontSize: 12 };
const inputsProposta = [
  { id: "etapa_1", label: "Pré-produção e alinhamento" },
  { id: "etapa_2", label: "Dublagem e direção de voz" },
  { id: "etapa_3", label: "Edição e finalização" },
  { id: "entregaveis", label: "Entregáveis e formatos" },
  { id: "revisoes", label: "Quantidade de revisões" },
  { id: "inicio", label: "Início previsto" },
  { id: "entrega", label: "Prazo de entrega" },
  { id: "contato", label: "E-mail / WhatsApp comercial da DubWorks" },
  { id: "responsavel", label: "Responsável pela aprovação" },
];
const inputsContrato = [
  { id: "prestadora_razao", label: "Prestadora: nome civil / razão social" },
  { id: "prestadora_documento", label: "Prestadora: CPF / CNPJ" },
  { id: "prestadora_endereco", label: "Prestadora: endereço completo" },
  { id: "prestadora_representante", label: "Prestadora: representante e cargo" },
  { id: "prestadora_email", label: "Prestadora: e-mail" },
  { id: "cliente_endereco", label: "Cliente: endereço completo" },
  { id: "cliente_representante", label: "Cliente: representante autorizado / cargo" },
  { id: "cliente_email", label: "Cliente: e-mail" },
  { id: "anexo_responsavel", label: "Responsável pelo aceite" },
  { id: "anexo_entregas", label: "Entregáveis, formatos e quantidades" },
  { id: "anexo_etapas", label: "Cronograma, marcos e prazos" },
  { id: "anexo_parcelas", label: "Parcelas e vencimentos" },
  { id: "anexo_despesas", label: "Reembolsos e encargos expressos" },
  { id: "anexo_pagamento", label: "Forma de pagamento" },
  { id: "anexo_revisoes", label: "Revisões e prazo de feedback" },
  { id: "anexo_direitos", label: "Direitos de uso/licença, mídias, território e prazo" },
  { id: "anexo_creditos", label: "Créditos, portfólio e publicação" },
  { id: "anexo_observacoes", label: "Outras condições expressamente acordadas" },
];
const criticalContractFields = [
  "prestadora_razao", "prestadora_documento", "prestadora_endereco",
  "prestadora_representante", "cliente_endereco", "anexo_entregas",
  "anexo_etapas", "anexo_direitos",
];

export default function CrmOfficialPdfActions(props: Props) {
  const isProposal = props.kind === "proposta";
  const entity = isProposal ? props.proposta : props.contrato;
  const tipo = isProposal ? "proposta" : "contrato";
  const [extras, setExtras] = useState<PdfExtraFields>({ ...(entity.campos_pdf || {}) });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [historico, setHistorico] = useState<DocumentoGeradoCrm[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const isDraft = ["rascunho","em_revisao"].includes(entity.status);
  const podeGerar = isProposal || isDraft;

  useEffect(() => {
    let active = true;
    setExtras({ ...(entity.campos_pdf || {}) });
    setDirty(false);
    setLoadingHistory(true);
    setError("");
    setFeedback("");
    listarDocumentosCrm(tipo, entity.id)
      .then(lista => { if (active) setHistorico(lista); })
      .catch(e => { if (active) setError("Histórico: " + String(e?.message || e)); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [tipo, entity.id]);
  const fields = isProposal ? inputsProposta : inputsContrato;
  const incomplete = criticalContractFields.filter(k => !extras[k]?.trim());
  const data = { ...props, extras };
  const pendencias = isProposal
    ? pendenciasProposta({ ...entity, campos_pdf: extras })
    : pendenciasContrato({ ...entity, campos_pdf: extras });
  const auto = useMemo(() => {
    try {
      return isProposal ? camposPropostaOficial(data as ProposalProps & { extras: PdfExtraFields }).fields
        : camposContratoOficial(data as ContractProps & { extras: PdfExtraFields }).fields;
    } catch { return {}; }
  }, [props, extras, isProposal]);
  const filledCount = Object.values(auto).filter(v => Boolean(String(v).trim())).length;
  const totalCount = Object.keys(auto).length;

  async function saveExtras() {
    if (!isDraft || !dirty) return;
    await salvarCamposPdfCrm(tipo, entity.id, entity.status, extras);
    setDirty(false);
    if (props.onCamposSalvos) await props.onCamposSalvos();
    setFeedback("Informações complementares salvas no Supabase.");
  }

  async function syncDrive(arquivoId: number): Promise<void> {
    setSyncingId(arquivoId);
    try {
      const resultado = await sincronizarDocumentoDriveCrm(arquivoId);
      setHistorico(atual => atual.map(arquivo => arquivo.id === arquivoId
        ? { ...arquivo, drive_url: resultado.drive_url, drive_file_id: resultado.drive_file_id }
        : arquivo));
      setFeedback("Documento arquivado no CRM e sincronizado com o Drive restrito.");
    } catch (e: any) {
      setError("PDF preservado no CRM. Sincronização com o Drive pendente: " + String(e?.message || e));
    } finally {
      setSyncingId(null);
    }
  }

  async function generate(preview: boolean) {
    if (busy) return;
    setBusy(true); setError(""); setFeedback("");
    const tab = preview ? window.open("", "_blank") : null;
    try {
      if (tab) { tab.opener = null; tab.document.title = "Preparando PDF oficial DubWorks"; }
      if (dirty) await saveExtras();
      const blob = isProposal
        ? await pdfPropostaOficial(data as ProposalProps & { extras: PdfExtraFields })
        : await pdfContratoOficial(data as ContractProps & { extras: PdfExtraFields });
      const fileName = isProposal
        ? nomePdfProposta(data as ProposalProps & { extras: PdfExtraFields })
        : nomePdfContrato(data as ContractProps & { extras: PdfExtraFields });
      // Não entregar o documento como concluído sem antes preservá-lo.
      const arquivado = await arquivarPdfCrm({
        tipo, id: entity.id, blob, nomeArquivo: fileName, campos: extras,
      });
      setHistorico(prev => [arquivado, ...prev]);
      setFeedback("Documento salvo no histórico do CRM (arquivo #" + arquivado.id + ").");
      if (preview) {
        if (!tab) {
          setError("Pop-up bloqueado. Abra o PDF pelo histórico abaixo.");
        } else {
          const blobUrl = URL.createObjectURL(blob);
          tab.location.href = blobUrl;
          setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
        }
      } else {
        baixarDocumentoPdf(blob, fileName);
      }
      // A cópia em Drive só começa depois da gravação segura no CRM.
      await syncDrive(arquivado.id);
    } catch (e: any) {
      if (tab && !tab.closed) tab.close();
      setError(String(e?.message || e || "Falha ao salvar PDF no CRM."));
    } finally {
      setBusy(false);
    }
  }

  async function abrirArquivado(arquivo: DocumentoGeradoCrm, preview: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    const tab = preview ? window.open("", "_blank") : null;
    try {
      if (tab) tab.opener = null;
      const blob = await baixarDocumentoArquivadoCrm(arquivo.id);
      if (preview) {
        if (!tab) { setError("Pop-up bloqueado; use Baixar."); return; }
        const url = URL.createObjectURL(blob);
        tab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      } else baixarDocumentoPdf(blob, arquivo.nome_arquivo);
    } catch (e: any) {
      if (tab && !tab.closed) tab.close();
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function archiveSigned() {
    if (isProposal || entity.status !== "assinado" || !signedFile || busy) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      if (!signedFile.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Selecione um arquivo PDF assinado.");
      }
      const binary = signedFile.type === "application/pdf" ? signedFile
        : new Blob([await signedFile.arrayBuffer()], { type: "application/pdf" });
      const archive = await arquivarPdfCrm({
        tipo: "contrato", id: entity.id, categoria: "assinado",
        blob: binary,
        nomeArquivo: "DubWorks-Contrato-Assinado-" + entity.id + "-" +
          signedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 85),
        campos: {},
      });
      setHistorico(prev => [archive, ...prev]);
      setFeedback("Contrato assinado preservado no histórico do CRM.");
      setSignedFile(null);
      await syncDrive(archive.id);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ display: "grid", gap: 12, padding: 13, borderRadius: 12,
    background: "#100e28", border: "1px solid #514078" }}>
    <div>
      <strong style={{ fontSize: 16 }}>
        {isProposal ? "PDF oficial da proposta" : isDraft ? "PDF oficial da minuta contratual" : "Histórico de PDFs do contrato"}
      </strong>
      <p style={{ ...small, margin: "5px 0 0" }}>
        Preenche o modelo original da DubWorks com os dados da negociação; conserva a identidade visual.
        {isProposal ? " Modelo de 3 páginas, com anexo para informações que excedam o espaço." :
          " Modelo de 9 páginas, com as cláusulas originais e o Anexo Único."}
      </p>
    </div>
    {podeGerar && pendencias.length > 0 && <div role="status" style={{
      padding: 10, borderRadius: 8, background: "#302719", color: "#fce4ab", fontSize: 12,
    }}>
      <strong>Antes da aprovação ou envio, complete ({pendencias.length}):</strong>
      <ul style={{ margin: "7px 0 0", paddingLeft: 20 }}>
        {pendencias.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>}
    {podeGerar && <div style={{ ...small, color: "#d8c4f4" }}>
      {filledCount} de {totalCount} campos do modelo disponíveis para preenchimento. Campos sem dados ficam em branco.
    </div>}
    {!isProposal && <div role="status" style={{ padding: 10, background: "#3c2c17", color: "#ffdeae", fontSize: 12, borderRadius: 8 }}>
      <strong>Minuta — não é um contrato pronto para assinatura.</strong> Confira a parte legal responsável pela DubWorks, autorizações,
      valores e prazos. {incomplete.length} campos essenciais dependem de conferência antes da formalização.
      A versão final revisada continua sendo anexada no fluxo do contrato.
    </div>}
    {isProposal && !["aprovada", "enviada", "aceita"].includes(props.proposta.status) &&
      <div role="status" style={{ ...small, color: "#fde68a" }}>
        Proposta não aprovada: o PDF será marcado como rascunho.
      </div>}
    {podeGerar && <button type="button" onClick={() => setOpen(v => !v)}
      style={{ ...button, justifySelf: "start", background: "#22183b" }}
      aria-expanded={open}>
      {open ? "Ocultar campos complementares" : "Conferir / completar campos do PDF"}
    </button>}
    {open && podeGerar && <div style={{ display: "grid", gap: 10 }}>
      <p style={{ ...small, margin: 0 }}>
        Os dados principais são automáticos. Complete apenas o que faltar; nenhuma condição será presumida.
        {isProposal ? " Pagamento e validade devem ser editados no cadastro da proposta." :
          " Para contratos remunerados, o valor só vem de proposta registrada como aceita."}
      </p>
      {fields.map(item =>
        <label key={item.id} style={{ color: "#d8d5ea", fontSize: 12, display: "grid", gap: 4 }}>
          {item.label}
          <textarea rows={["anexo_entregas","anexo_etapas","anexo_direitos","anexo_creditos","anexo_observacoes"].includes(item.id) ? 3 : 1}
            style={{ ...editable, resize: "vertical" }}
            value={extras[item.id] || ""}
            disabled={!isDraft || busy}
            onChange={e => { setExtras(current => ({ ...current, [item.id]: e.target.value })); setDirty(true); }}
            placeholder="Preencher somente se acordado" />
        </label>
      )}
    </div>}
    {open && isDraft && <button type="button" disabled={busy || !dirty}
      style={{ ...button, background: "#263a60", justifySelf: "start" }}
      onClick={() => { setBusy(true); setError(""); setFeedback("");
        void saveExtras().catch(e => setError(String(e?.message || e))).finally(() => setBusy(false)); }}>
      {dirty ? "Salvar informações no CRM" : "Informações salvas"}
    </button>}
    {feedback && <div role="status" style={{ color: "#a7f3d0", fontSize: 13 }}>{feedback}</div>}
    {error && <div role="alert" style={{ color: "#fda4af", fontSize: 13 }}>{error}</div>}
    {podeGerar ? <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
      <button type="button" disabled={busy} style={button} onClick={() => void generate(true)}>
        {busy ? "Preparando PDF..." : isProposal ? "Visualizar proposta oficial" : "Visualizar contrato oficial (minuta)"}
      </button>
      <button type="button" disabled={busy} style={{ ...button, background: "#6632a9" }}
        onClick={() => void generate(false)}>
        {busy ? "Preparando..." : isProposal ? "Baixar proposta oficial" : "Baixar contrato oficial (minuta)"}
      </button>
    </div> : <p style={{ ...small, margin: 0 }}>
      Este contrato já saiu da fase de minuta. Reabra os arquivos anteriores abaixo e consulte o documento final anexado.
    </p>}
    {!isProposal && entity.status === "assinado" && <div style={{
      display: "grid", gap: 8, padding: 11, borderRadius: 10,
      border: "1px solid #525f86", background: "#16213a",
    }}>
      <strong>Arquivar PDF efetivamente assinado</strong>
      <p style={{ ...small, margin: 0 }}>
        Selecione o documento final assinado. Ele será preservado no CRM e enviado à pasta
        privada "Documentos Assinados" do Drive. O arquivo não altera o status do contrato.
      </p>
      <input type="file" accept="application/pdf,.pdf" disabled={busy}
        aria-label="Arquivo do contrato assinado" style={{ ...editable, maxWidth: 420 }}
        onChange={e => setSignedFile(e.target.files?.[0] || null)} />
      <button type="button" disabled={busy || !signedFile} style={{ ...button, justifySelf: "start" }}
        onClick={() => void archiveSigned()}>
        {busy ? "Arquivando..." : "Arquivar contrato assinado"}
      </button>
    </div>}
    <div style={{ display: "grid", gap: 8, borderTop: "1px solid #403557", paddingTop: 12 }}>
      <strong style={{ fontSize: 14 }}>Histórico de PDFs arquivados ({historico.length})</strong>
      {loadingHistory && <div style={small}>Carregando arquivos anteriores...</div>}
      {!loadingHistory && historico.length === 0 && <div style={small}>Nenhum PDF gerado nesta versão.</div>}
      {historico.map(arquivo => <div key={arquivo.id}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid #403557", padding: "8px 0" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 12, fontWeight: 650, overflowWrap: "anywhere" }}>#{arquivo.id} · {arquivo.categoria === "assinado" ? "[ASSINADO] " : ""}{arquivo.nome_arquivo}</div>
          <div style={small}>{new Date(arquivo.criado_em).toLocaleString("pt-BR")} · Arquivado no CRM</div>
        </div>
        <button type="button" style={button} disabled={busy} onClick={() => void abrirArquivado(arquivo, true)}>Abrir</button>
        <button type="button" style={button} disabled={busy} onClick={() => void abrirArquivado(arquivo, false)}>Baixar</button>
        {arquivo.drive_url
          ? <a href={arquivo.drive_url} target="_blank" rel="noopener noreferrer"
              style={{ color: "#dac6ff" }}>Ver no Drive</a>
          : <button type="button" style={{ ...button, background: "#25203d" }}
              disabled={busy || syncingId !== null} onClick={() => void syncDrive(arquivo.id)}>
              {syncingId === arquivo.id ? "Sincronizando..." : "Sincronizar Drive"}
            </button>}
      </div>)}
    </div>
  </div>;
}
