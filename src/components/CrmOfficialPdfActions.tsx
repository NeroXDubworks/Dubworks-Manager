import React, { useMemo, useState } from "react";
import type {
  CrmCliente, CrmNegociacao, CrmProposta, CrmPropostaItem, ParceriaGratuita,
} from "../services/commercialCrm";
import type { ContratoCrmBasico } from "./CrmContractPreview";
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
};
type ContractProps = {
  kind: "contrato";
  contrato: ContratoCrmBasico;
  cliente?: CrmCliente | null;
  negociacao?: CrmNegociacao | null;
  parceria?: ParceriaGratuita | null;
  propostaAceita?: CrmProposta | null;
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
  const [extras, setExtras] = useState<PdfExtraFields>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const isProposal = props.kind === "proposta";
  const fields = isProposal ? inputsProposta : inputsContrato;
  const incomplete = criticalContractFields.filter(k => !extras[k]?.trim());
  const data = { ...props, extras };
  const auto = useMemo(() => {
    try {
      return isProposal ? camposPropostaOficial(data as ProposalProps & { extras: PdfExtraFields }).fields
        : camposContratoOficial(data as ContractProps & { extras: PdfExtraFields }).fields;
    } catch { return {}; }
  }, [props, extras, isProposal]);
  const filledCount = Object.values(auto).filter(v => Boolean(String(v).trim())).length;
  const totalCount = Object.keys(auto).length;

  async function generate(preview: boolean) {
    if (busy) return;
    setError("");
    setBusy(true);
    // Abre a aba ainda no clique do usuário, antes de qualquer await.
    const tab = preview ? window.open("", "_blank") : null;
    try {
      if (tab) { tab.opener = null; tab.document.title = "Preparando PDF oficial DubWorks"; }
      const blob = isProposal
        ? await pdfPropostaOficial(data as ProposalProps & { extras: PdfExtraFields })
        : await pdfContratoOficial(data as ContractProps & { extras: PdfExtraFields });
      if (preview) {
        if (!tab) {
          setError("O navegador bloqueou a visualização. Permita pop-ups ou clique em Baixar PDF.");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        tab.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      } else {
        baixarDocumentoPdf(blob, isProposal
          ? nomePdfProposta(data as ProposalProps & { extras: PdfExtraFields })
          : nomePdfContrato(data as ContractProps & { extras: PdfExtraFields }));
      }
    } catch (e: any) {
      if (tab && !tab.closed) tab.close();
      setError(String(e?.message || e || "Não foi possível preencher o PDF."));
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ display: "grid", gap: 12, padding: 13, borderRadius: 12,
    background: "#100e28", border: "1px solid #514078" }}>
    <div>
      <strong style={{ fontSize: 16 }}>
        {isProposal ? "PDF oficial da proposta" : "PDF oficial da minuta contratual"}
      </strong>
      <p style={{ ...small, margin: "5px 0 0" }}>
        Preenche o modelo original da DubWorks com os dados da negociação; conserva a identidade visual.
        {isProposal ? " Modelo de 3 páginas, com anexo para informações que excedam o espaço." :
          " Modelo de 9 páginas, com as cláusulas originais e o Anexo Único."}
      </p>
    </div>
    <div style={{ ...small, color: "#d8c4f4" }}>
      {filledCount} de {totalCount} campos do modelo disponíveis para preenchimento. Campos sem dados ficam em branco.
    </div>
    {!isProposal && <div role="status" style={{ padding: 10, background: "#3c2c17", color: "#ffdeae", fontSize: 12, borderRadius: 8 }}>
      <strong>Minuta — não é um contrato pronto para assinatura.</strong> Confira a parte legal responsável pela DubWorks, autorizações,
      valores e prazos. {incomplete.length} campos essenciais dependem de conferência antes da formalização.
      A versão final revisada continua sendo anexada no fluxo do contrato.
    </div>}
    {isProposal && !["aprovada", "enviada", "aceita"].includes(props.proposta.status) &&
      <div role="status" style={{ ...small, color: "#fde68a" }}>
        Proposta não aprovada: o PDF será marcado como rascunho.
      </div>}
    <button type="button" onClick={() => setOpen(v => !v)}
      style={{ ...button, justifySelf: "start", background: "#22183b" }}
      aria-expanded={open}>
      {open ? "Ocultar campos complementares" : "Conferir / completar campos do PDF"}
    </button>
    {open && <div style={{ display: "grid", gap: 10 }}>
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
            onChange={e => setExtras(current => ({ ...current, [item.id]: e.target.value }))}
            placeholder="Preencher somente se acordado" />
        </label>
      )}
    </div>}
    {error && <div role="alert" style={{ color: "#fda4af", fontSize: 13 }}>{error}</div>}
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
      <button type="button" disabled={busy} style={button} onClick={() => void generate(true)}>
        {busy ? "Preparando PDF..." : isProposal ? "Visualizar proposta oficial" : "Visualizar contrato oficial (minuta)"}
      </button>
      <button type="button" disabled={busy} style={{ ...button, background: "#6632a9" }}
        onClick={() => void generate(false)}>
        {busy ? "Preparando..." : isProposal ? "Baixar proposta oficial" : "Baixar contrato oficial (minuta)"}
      </button>
    </div>
  </div>;
}
