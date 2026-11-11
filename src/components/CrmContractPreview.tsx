import React from "react";
import type { CrmCliente, CrmNegociacao, CrmProposta, ParceriaGratuita } from "../services/commercialCrm";
import CrmOfficialPdfActions from "./CrmOfficialPdfActions";

export type ContratoCrmBasico = {
  id: number;
  versao: number;
  proposta_id?: number | null;
  campos_pdf?: Record<string, string>;
  titulo: string;
  objeto_escopo: string | null;
  tipo_modelo: string;
  status: string;
  arquivo_url?: string | null;
  assinaturas_confirmadas_em?: string | null;
  criado_em?: string | null;
  observacoes?: string | null;
};

const botao: React.CSSProperties = {
  color: "#f5edff",
  background: "#302052",
  border: "1px solid #6d52a2",
  borderRadius: 8,
  padding: "9px 13px",
  fontWeight: 650,
  cursor: "pointer",
};
const pequeno: React.CSSProperties = { color: "#a6b2c7", fontSize: 13 };
const titulos: Record<string, string> = {
  servico_remunerado: "Prestação de serviços remunerada",
  servico_gratuito: "Prestação de serviços gratuita",
  parceria_remunerada: "Parceria remunerada",
  parceria_gratuita: "Parceria gratuita",
};
const statuses: Record<string, string> = {
  rascunho: "Rascunho", em_revisao: "Em revisão",
  aprovado: "Aprovado", enviado: "Enviado",
  aguardando_assinatura: "Aguardando assinatura",
  assinado: "Assinado", cancelado: "Cancelado",
};
function dataBr(iso: string | null | undefined) {
  return iso ? new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "Não informada";
}
function urlValida(url: string | null | undefined): url is string {
  return /^https:\/\//i.test(url?.trim() || "");
}

export default function CrmContractPreview({
  contrato, cliente, negociacao, parceria, propostaAceita, onCamposSalvos,
}: {
  contrato: ContratoCrmBasico;
  cliente?: CrmCliente | null;
  negociacao?: CrmNegociacao | null;
  parceria?: ParceriaGratuita | null;
  propostaAceita?: CrmProposta | null;
  onCamposSalvos?: () => Promise<void>;
}) {
  const preliminar = ["rascunho", "em_revisao"].includes(contrato.status);
  const remunerado = ["servico_remunerado", "parceria_remunerada"].includes(contrato.tipo_modelo);
  const possuiDocumento = urlValida(contrato.arquivo_url);
  const nomeContraparte = cliente?.nome || parceria?.nome_parceiro || "Contraparte não informada";
  const escopo = contrato.objeto_escopo || negociacao?.escopo || parceria?.escopo || "";
  const contexto = titulos[contrato.tipo_modelo] || contrato.tipo_modelo;

  return <section id={"dw-contrato-detalhe-" + contrato.id} aria-label={"Detalhes do contrato " + contrato.id}
    style={{ borderRadius: 12, padding: 16, background: "rgba(8,15,35,.86)",
      border: "1px solid rgba(153,128,207,.36)", display: "grid", gap: 15 }}>
    <div>
      <div style={{ ...pequeno, color: "#cab9ef", fontWeight: 700, letterSpacing: 1 }}>CONTRATO · #{contrato.id} · VERSÃO {contrato.versao}</div>
      <h4 style={{ fontSize: 19, margin: "6px 0" }}>{contrato.titulo}</h4>
      <div style={pequeno}>Status: <strong style={{ color: "#e9d5ff" }}>{statuses[contrato.status] || contrato.status}</strong>
        {" · "}Criado em: {dataBr(contrato.criado_em)}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
      <div style={{ borderRadius: 9, background: "#151a31", padding: 12 }}>
        <div style={pequeno}>Contraparte</div>
        <strong>{nomeContraparte}</strong>
        {cliente?.cpf_cnpj && <div style={pequeno}>{cliente.tipo_pessoa === "pf" ? "CPF" : "CNPJ"}: {cliente.cpf_cnpj}</div>}
        {parceria?.contato_nome && <div style={pequeno}>Contato: {parceria.contato_nome}</div>}
      </div>
      <div style={{ borderRadius: 9, background: "#151a31", padding: 12 }}>
        <div style={pequeno}>Modelo do contrato</div>
        <strong>{contexto}</strong>
      </div>
    </div>
    {remunerado && <div style={{ color: propostaAceita ? "#c4f7db" : "#fde68a", fontSize: 13 }}>
      {propostaAceita ? `Proposta aceita vinculada: #${propostaAceita.id} · v${propostaAceita.versao} · ${propostaAceita.titulo}`
        : "Este contrato ainda precisa de uma proposta aceita vinculada."}
    </div>}
    <div>
      <strong>Objeto / escopo do contrato</strong>
      <p style={{ whiteSpace: "pre-wrap", margin: "7px 0 0", color: "#d7ddeb" }}>
        {escopo || "Escopo não descrito. Complete as informações antes da revisão do documento."}
      </p>
    </div>
    {contrato.observacoes && <div>
      <strong>Observações internas</strong>
      <p style={{ ...pequeno, whiteSpace: "pre-wrap", marginTop: 5 }}>{contrato.observacoes}</p>
    </div>}
    {contrato.status === "assinado" && <div style={pequeno}>Assinatura registrada em: {dataBr(contrato.assinaturas_confirmadas_em)}</div>}
    <div style={{ display: "grid", gap: 8 }}>
      <strong>Documento do contrato</strong>
      {possuiDocumento
        ? <a href={contrato.arquivo_url!} target="_blank" rel="noopener noreferrer" style={{
          color: "#dec5ff", fontWeight: 700, textDecoration: "underline", overflowWrap: "anywhere",
        }}>
          {contrato.status === "assinado" ? "Abrir documento assinado" : "Abrir documento anexado para revisão / envio"} ↗
        </a>
        : <p style={{ ...pequeno, margin: 0 }}>Ainda não há um PDF revisado anexado. Após a revisão, informe o link do documento no campo abaixo para seguir com a aprovação.</p>}
    </div>
    {preliminar && <>
      <div style={{ padding: 11, background: "#392a18", border: "1px solid #785f32", borderRadius: 9,
        color: "#f8dea5", fontSize: 13 }}>
        A minuta gerada pelo sistema contém apenas os dados já cadastrados e indica as informações faltantes.
        Não é um contrato final: precisa de cláusulas completas, conferência das partes e revisão humana/jurídica antes do envio ou assinatura.
      </div>
    </>}
    <CrmOfficialPdfActions key={contrato.id} kind="contrato" contrato={contrato} cliente={cliente}
      onCamposSalvos={onCamposSalvos}
      negociacao={negociacao} parceria={parceria} propostaAceita={propostaAceita} />
    <div style={{ ...pequeno, fontSize: 12 }}>
      Fluxo de aprovação: rascunho → revisão → aprovação da diretoria → envio → assinatura → arquivamento.
      O sistema não considera o contrato assinado automaticamente.
    </div>
  </section>;
}
