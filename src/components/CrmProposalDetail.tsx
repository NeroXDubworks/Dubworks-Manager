import React, { useEffect, useState } from "react";
import {
  atualizarCondicoesPropostaCrm,
  listarItensPropostaCrm,
  type CrmCliente, type CrmNegociacao, type CrmProposta, type CrmPropostaItem,
} from "../services/commercialCrm";
import { baixarPdfProposta, gerarPdfProposta } from "../shared/crmProposalPdf.js";

type Props = {
  proposta: CrmProposta;
  cliente: CrmCliente;
  negociacao: CrmNegociacao;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const field: React.CSSProperties = {
  width: "100%", minHeight: 40, borderRadius: 8,
  padding: "9px 12px", color: "#f8fafc",
  background: "#0a1024", border: "1px solid #4b4265",
};
const btn: React.CSSProperties = {
  border: "1px solid #70529f", background: "#2b1d50", color: "#f5edff",
  padding: "10px 14px", borderRadius: 9, fontWeight: 700, cursor: "pointer",
};
const muted: React.CSSProperties = { color: "#a7b4ca", fontSize: 13 };
const currency = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (value: string | null) => value ? new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "Não informada";

export default function CrmProposalDetail({ proposta, cliente, negociacao, onClose, onSaved }: Props) {
  const [itens, setItens] = useState<CrmPropostaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState("");
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [condicoes, setCondicoes] = useState(proposta.condicoes_pagamento || "");
  const [validade, setValidade] = useState((proposta.validade_em || "").slice(0, 10));
  const editavel = ["rascunho", "em_revisao"].includes(proposta.status);
  const aprovado = ["aprovada", "enviada", "aceita"].includes(proposta.status);

  useEffect(() => {
    setCondicoes(proposta.condicoes_pagamento || "");
    setValidade((proposta.validade_em || "").slice(0, 10));
  }, [proposta.id, proposta.condicoes_pagamento, proposta.validade_em]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setFalha("");
    setItens([]);
    listarItensPropostaCrm(proposta.id)
      .then(lista => { if (ativo) setItens(lista); })
      .catch(error => { if (ativo) setFalha(String(error?.message || error)); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [proposta.id]);

  const dados = { proposta, cliente, negociacao, itens };
  const pronto = !carregando && !falha && itens.length > 0;

  function visualizarPdf() {
    if (!pronto) return;
    try {
      setFalha("");
      const url = URL.createObjectURL(gerarPdfProposta(dados));
      const aba = window.open(url, "_blank", "noopener,noreferrer");
      if (!aba) {
        URL.revokeObjectURL(url);
        setFalha("O navegador bloqueou a abertura. Permita pop-ups ou use Baixar PDF.");
      } else setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error: any) { setFalha(String(error?.message || error)); }
  }

  function baixarPdf() {
    if (!pronto) return;
    try { setFalha(""); baixarPdfProposta(dados); }
    catch (error: any) { setFalha(String(error?.message || error)); }
  }

  async function salvarCondicoes(event: React.FormEvent) {
    event.preventDefault();
    if (salvando || !editavel) return;
    setSalvando(true); setFalha("");
    try {
      await atualizarCondicoesPropostaCrm(proposta.id, proposta.status, condicoes, validade);
      await onSaved();
      setEditando(false);
    } catch (error: any) { setFalha(String(error?.message || error)); }
    finally { setSalvando(false); }
  }

  return (
    <section id="dw-proposta-detalhes" aria-label={"Detalhes da proposta " + proposta.id}
      style={{ border: "1px solid #7755ad", borderRadius: 14, padding: 16,
        background: "linear-gradient(145deg, #161a35, #141126)", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>PROPOSTA COMERCIAL · #{proposta.id} · VERSÃO {proposta.versao}</div>
          <h4 style={{ fontSize: 20, margin: "6px 0" }}>{proposta.titulo}</h4>
          <div style={muted}>Status: <strong style={{ color: "#e9d5ff" }}>{proposta.status}</strong> · Criada em {dateBR(proposta.criado_em)}</div>
        </div>
        <button type="button" style={btn} onClick={onClose}>Fechar detalhes</button>
      </div>
      {!aprovado && <div role="status" style={{ color: "#fde68a", background: "#422c16", borderRadius: 8, padding: 10, fontSize: 13 }}>
        Esta proposta ainda não foi aprovada. O PDF sairá marcado como rascunho para evitar envio acidental ao cliente.
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ padding: 12, background: "#0c1228", borderRadius: 10 }}>
          <div style={muted}>Cliente</div>
          <strong>{cliente.nome}</strong>
          {cliente.cpf_cnpj && <div style={muted}>{cliente.tipo_pessoa === "pf" ? "CPF" : "CNPJ"}: {cliente.cpf_cnpj}</div>}
        </div>
        <div style={{ padding: 12, background: "#0c1228", borderRadius: 10 }}>
          <div style={muted}>Negociação</div>
          <strong>{negociacao.titulo}</strong>
        </div>
      </div>
      <div>
        <strong>Escopo dos serviços</strong>
        <p style={{ whiteSpace: "pre-wrap", margin: "7px 0", color: "#d4d9e4" }}>
          {proposta.descricao_escopo || negociacao.escopo || "Escopo não informado."}
        </p>
      </div>
      <div>
        <strong>Itens da proposta</strong>
        {carregando ? <p style={muted}>Carregando serviços...</p> : itens.length === 0 && !falha ? <p style={muted}>Nenhum item encontrado.</p> : null}
        {itens.map(item => <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid #35334f" }}>
          <div style={{ fontWeight: 600 }}>{item.descricao}</div>
          <div style={muted}>
            {Number(item.quantidade).toLocaleString("pt-BR")} {item.unidade}
            {proposta.modo_preco === "automatico" && " · " + currency(Number(item.preco_unitario)) + " por unidade · " +
              currency(Number(item.quantidade) * Number(item.preco_unitario))}
          </div>
        </div>)}
      </div>
      <div style={{ padding: 14, background: "#35235c", borderRadius: 10, display: "flex", flexWrap: "wrap",
        alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <strong>Valor final negociado</strong>
        <strong style={{ fontSize: 23 }}>{currency(Number(proposta.valor_negociado))}</strong>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <strong>Condições comerciais</strong>
        {editando ? <form onSubmit={salvarCondicoes} style={{ display: "grid", gap: 10 }}>
          <label style={muted}>Condições de pagamento
            <textarea style={field} rows={3} placeholder="Ex.: 50% na contratação e 50% na entrega"
              value={condicoes} onChange={e => setCondicoes(e.target.value)} />
          </label>
          <label style={muted}>Validade da proposta
            <input style={field} type="date" value={validade} onChange={e => setValidade(e.target.value)} />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="submit" disabled={salvando} style={btn}>{salvando ? "Salvando..." : "Salvar condições"}</button>
            <button type="button" style={btn} onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
          </div>
        </form> : <>
          <div style={muted}>Pagamento: {proposta.condicoes_pagamento || "Não informado"}</div>
          <div style={muted}>Validade: {dateBR(proposta.validade_em)}</div>
          {editavel && <button type="button" style={{ ...btn, justifySelf: "start" }} onClick={() => setEditando(true)}>
            Editar pagamento e validade
          </button>}
        </>}
      </div>
      {falha && <p role="alert" style={{ color: "#fda4af", margin: 0 }}>{falha}</p>}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <button type="button" style={btn} disabled={!pronto} onClick={visualizarPdf}>Visualizar PDF</button>
        <button type="button" style={{ ...btn, background: "#6331a8" }} disabled={!pronto} onClick={baixarPdf}>Baixar PDF para cliente</button>
      </div>
      <div style={{ ...muted, fontSize: 12 }}>
        O PDF contém cliente, escopo, serviços, preço final e condições comerciais.
        Custos internos e justificativas de desconto não são incluídos.
      </div>
    </section>
  );
}
