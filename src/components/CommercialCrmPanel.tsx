import React, { useEffect, useMemo, useState } from "react";
import {
  adicionarContatoCrm, anexarDocumentoContratoCrm, alterarStatusContratoCrm, alterarStatusPropostaCrm,
  criarClienteCrm, criarNegociacaoCrm, criarParceriaGratuita,
  criarPropostaCrm, criarRascunhoContratoCrm, criarServicoCrm,
  listarClientesCrm, listarContatosCrm, listarContratosCrm,
  listarContratosParceriaGratuita, listarNegociacoesCrm, listarParceriasGratuitas,
  listarPropostasCrm, listarServicosCrm, registrarContratoAssinado,
  type CrmCliente, type CrmContato, type CrmNegociacao, type CrmProposta,
  type CrmServico, type ParceriaGratuita,
} from "../services/commercialCrm";
import { calculateProposal } from "../shared/crmPricing.js";

type Tab = "comercial" | "parcerias" | "servicos";
type ItemEdicao = { descricao: string; servico_id: number | null; unidade: string; quantidade: number; preco_unitario: number };
const campo: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(148,163,184,.22)",
  color: "#f8fafc", background: "#090e1f", minHeight: 40,
};
const caixa: React.CSSProperties = {
  background: "linear-gradient(140deg, rgba(15,23,42,.92), rgba(17,12,39,.89))",
  border: "1px solid rgba(148,163,184,.16)", borderRadius: 16, padding: 16,
};
const botao: React.CSSProperties = {
  border: "1px solid rgba(139,92,246,.36)", borderRadius: 9,
  appearance: "none", background: "#241843", color: "#f5edff",
  fontWeight: 700, padding: "9px 13px", cursor: "pointer",
};
const small: React.CSSProperties = { fontSize: 12, color: "#94a3b8" };
function dinheiro(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function vDinheiro(v: string) { const raw = v.trim(); return Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw); }
function erroAmigavel(e: any) { return String(e?.message || e || "Erro desconhecido"); }

function ContractWorkflowCard({ contrato, diretor, recarregar }: {
  contrato: any; diretor: boolean; recarregar: () => Promise<void>;
}) {
  const [url, setUrl] = useState(String(contrato.arquivo_url || ""));
  const [dataAssinatura, setDataAssinatura] = useState(new Date().toISOString().slice(0, 10));
  const [ocupado, setOcupado] = useState(false);
  const [erroLocal, setErroLocal] = useState("");
  const etapas: Record<string,string> = {
    rascunho: "em_revisao", em_revisao: "aprovado",
    aprovado: "enviado", enviado: "aguardando_assinatura",
  };
  const proxima = etapas[contrato.status];
  async function executarLocal(acao: () => Promise<any>) {
    setOcupado(true); setErroLocal("");
    try { await acao(); await recarregar(); }
    catch (e) { setErroLocal(erroAmigavel(e)); }
    finally { setOcupado(false); }
  }
  return <div style={{ padding: 10, border: "1px solid rgba(148,163,184,.16)", borderRadius: 10, display: "grid", gap: 7 }}>
    <strong>{contrato.titulo} · {contrato.status}</strong>
    {contrato.arquivo_url && <a href={contrato.arquivo_url} style={{ color: "#c4b5fd" }} target="_blank" rel="noopener noreferrer">Abrir documento ↗</a>}
    {(contrato.status === "rascunho" || contrato.status === "em_revisao") && (
      <form onSubmit={e => { e.preventDefault(); void executarLocal(() => anexarDocumentoContratoCrm(contrato.id, url)); }} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input style={{ ...campo, flex: 1 }} type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="Link HTTPS do PDF para revisão" />
        <button type="submit" style={botao} disabled={ocupado}>Anexar documento</button>
      </form>
    )}
    {proxima && (proxima !== "aprovado" || diretor) && <button type="button" style={{ ...botao, justifySelf: "start" }} disabled={ocupado} onClick={() => void executarLocal(() => alterarStatusContratoCrm(contrato.id, contrato.status, proxima))}>
      {proxima === "em_revisao" ? "Enviar à revisão" : proxima === "aprovado" ? "Aprovar como diretoria" : proxima === "enviado" ? "Marcar como enviado" : "Aguardar assinatura"}
    </button>}
    {contrato.status === "aguardando_assinatura" && (
      <form onSubmit={e => {
        e.preventDefault();
        if (!window.confirm("Confirma que o documento foi efetivamente assinado por todas as partes?")) return;
        void executarLocal(() => registrarContratoAssinado({ contratoId: contrato.id, arquivoUrl: url, dataAssinaturaISO: dataAssinatura }));
      }} style={{ display: "grid", gap: 8 }}>
        <label style={small}>Link do documento efetivamente assinado
          <input style={campo} required type="url" value={url} onChange={e => setUrl(e.target.value)} />
        </label>
        <label style={small}>Data de assinatura
          <input style={campo} type="date" required value={dataAssinatura} onChange={e => setDataAssinatura(e.target.value)} />
        </label>
        <button style={botao} type="submit" disabled={ocupado}>Registrar assinatura conferida</button>
      </form>
    )}
    {erroLocal && <span role="alert" style={{ color: "#fda4af", fontSize: 12 }}>{erroLocal}</span>}
  </div>;
}

export default function CommercialCrmPanel({ responsavel, podeAprovar = false }: { responsavel: string; podeAprovar?: boolean }) {
  const [aba, setAba] = useState<Tab>("comercial");
  const [clientes, setClientes] = useState<CrmCliente[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [contatos, setContatos] = useState<CrmContato[]>([]);
  const [negociacoes, setNegociacoes] = useState<CrmNegociacao[]>([]);
  const [negociacaoId, setNegociacaoId] = useState<number | null>(null);
  const [propostas, setPropostas] = useState<CrmProposta[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [parcerias, setParcerias] = useState<ParceriaGratuita[]>([]);
  const [parceriaId, setParceriaId] = useState<number | null>(null);
  const [contratosParceria, setContratosParceria] = useState<any[]>([]);
  const [servicos, setServicos] = useState<CrmServico[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState("");
  const [formCliente, setFormCliente] = useState({ nome: "", tipoPessoa: "pj" as "pf"|"pj", cpfCnpj: "", historico: false, clienteDesde: "" });
  const [formContato, setFormContato] = useState({ nome: "", email: "", telefone: "", cargo: "" });
  const [formNegociacao, setFormNegociacao] = useState({ titulo: "", natureza: "prestacao" as "prestacao"|"parceria", escopo: "" });
  const [formParceria, setFormParceria] = useState({ nome: "", natureza: "parceria" as "parceria"|"prestacao", contato: "", escopo: "", historico: false });
  const [formServico, setFormServico] = useState({ nome: "", unidade: "minuto" as CrmServico["unidade"], preco: "0" });
  const [formProposta, setFormProposta] = useState({ titulo: "", escopo: "", totalPersonalizado: "", custoInterno: "", justificativa: "" });
  const [itens, setItens] = useState<ItemEdicao[]>([]);
  const [mostrarProposta, setMostrarProposta] = useState(false);
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [mostrarParceria, setMostrarParceria] = useState(false);
  const [mostrarServico, setMostrarServico] = useState(false);

  async function carregarGeral() {
    const [cl, pa, se] = await Promise.all([listarClientesCrm(), listarParceriasGratuitas(), listarServicosCrm()]);
    setClientes(cl); setParcerias(pa); setServicos(se);
  }
  useEffect(() => {
    let ativo = true;
    Promise.all([listarClientesCrm(), listarParceriasGratuitas(), listarServicosCrm()])
      .then(([cl, pa, se]) => {
        if (!ativo) return;
        setClientes(cl); setParcerias(pa); setServicos(se);
      }).catch(e => { if (ativo) setErro("Não foi possível carregar o CRM: " + erroAmigavel(e)); });
    return () => { ativo = false; };
  }, []);
  useEffect(() => {
    let ativo = true;
    if (!clienteId) { setContatos([]); setNegociacoes([]); setNegociacaoId(null); return; }
    Promise.all([listarContatosCrm(clienteId), listarNegociacoesCrm(clienteId)])
      .then(([con, neg]) => {
        if (!ativo) return;
        setContatos(con); setNegociacoes(neg);
        setNegociacaoId(prev => neg.some(v => v.id === prev) ? prev : (neg[0]?.id || null));
      }).catch(e => { if (ativo) setErro(erroAmigavel(e)); });
    return () => { ativo = false; };
  }, [clienteId]);
  useEffect(() => {
    let ativo = true;
    if (!negociacaoId) { setPropostas([]); setContratos([]); return; }
    Promise.all([listarPropostasCrm(negociacaoId), listarContratosCrm(negociacaoId)])
      .then(([pr, co]) => { if (ativo) { setPropostas(pr); setContratos(co); } })
      .catch(e => { if (ativo) setErro(erroAmigavel(e)); });
    return () => { ativo = false; };
  }, [negociacaoId]);
  useEffect(() => {
    let ativo = true;
    if (!parceriaId) { setContratosParceria([]); return; }
    listarContratosParceriaGratuita(parceriaId).then(lista => { if (ativo) setContratosParceria(lista); })
      .catch(e => { if (ativo) setErro(erroAmigavel(e)); });
    return () => { ativo = false; };
  }, [parceriaId]);

  const cliente = clientes.find(c => c.id === clienteId) || null;
  const negociacao = negociacoes.find(n => n.id === negociacaoId) || null;
  const parceria = parcerias.find(p => p.id === parceriaId) || null;
  const filtrados = clientes.filter(c => c.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  const valores = useMemo(() => {
    try {
      return calculateProposal(itens, formProposta.totalPersonalizado === "" ? null : vDinheiro(formProposta.totalPersonalizado));
    } catch { return null; }
  }, [itens, formProposta.totalPersonalizado]);
  // Pacotes com preço fechado não precisam de serviços cadastrados na tabela.
  // O texto do escopo descreve o pacote; o valor negociado é mantido separado da referência.
  const pacoteFechado = itens.length === 0 && formProposta.totalPersonalizado.trim() !== "";
  const podeSalvarProposta = Boolean(valores) && (itens.length > 0 || (pacoteFechado && formProposta.escopo.trim().length > 0));

  async function executar(acao: () => Promise<any>, depois?: () => Promise<void>, mensagem = "Dados salvos com sucesso.") {
    if (ocupado) return;
    setOcupado(true); setErro(""); setSucesso("");
    try {
      await acao(); if (depois) await depois();
      setSucesso(mensagem);
    } catch (e) { setErro(erroAmigavel(e)); }
    finally { setOcupado(false); }
  }

  function adicionarItemServico(servico?: CrmServico) {
    setItens(atual => [...atual, {
      descricao: servico?.nome || "", servico_id: servico?.id ?? null,
      unidade: servico?.unidade || "projeto",
      quantidade: 1, preco_unitario: servico ? Number(servico.preco_referencia) : 0,
    }]);
  }

  return (
    <div style={{ display: "grid", gap: 16, color: "#f8fafc", maxWidth: 1400 }}>
      <div>
        <span style={{ ...small, textTransform: "uppercase", letterSpacing: 2 }}>DubWorks Manager / Administrativo</span>
        <h1 style={{ margin: "6px 0" }}>CRM Comercial</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>
          Clientes e vendas remuneradas ficam aqui. Projetos internos continuam independentes; parcerias gratuitas têm registro separado.
        </p>
      </div>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="Áreas do CRM">
        {([["comercial", "Clientes e vendas"], ["parcerias", "Parcerias gratuitas"], ["servicos", "Tabela de serviços"]] as const)
          .map(([id, rotulo]) =>
            <button key={id} type="button" onClick={() => { setAba(id); setErro(""); setSucesso(""); }}
              style={{ ...botao, borderColor: aba === id ? "#a78bfa" : "#4b3674", background: aba === id ? "#4c1d95" : "#241843", color: "#f5edff" }}>{rotulo}</button>
          )}
      </nav>
      {erro && <div role="alert" style={{ color: "#fecaca", padding: 12, border: "1px solid #7f1d1d", borderRadius: 10 }}>{erro}</div>}
      {sucesso && <div role="status" style={{ color: "#86efac", padding: 8 }}>{sucesso}</div>}

      {aba === "comercial" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(230px,330px) minmax(0,1fr)", gap: 16 }} className="dw-crm-grid">
          <aside style={{ ...caixa, display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
              <strong>Clientes ({clientes.length})</strong>
              <button style={botao} onClick={() => setMostrarCliente(v => !v)}>+ Cliente</button>
            </div>
            <input style={campo} placeholder="Pesquisar clientes..." value={busca} onChange={e => setBusca(e.target.value)} />
            {mostrarCliente && (
              <form onSubmit={e => {
                e.preventDefault();
                void executar(async () => {
                  const criado = await criarClienteCrm({
                    nome: formCliente.nome, tipoPessoa: formCliente.tipoPessoa,
                    cpfCnpj: formCliente.cpfCnpj, historicoLegado: formCliente.historico,
                    clienteDesde: formCliente.clienteDesde,
                  });
                  setClienteId(criado.id); setMostrarCliente(false);
                  setFormCliente({ nome: "", tipoPessoa: "pj", cpfCnpj: "", historico: false, clienteDesde: "" });
                }, carregarGeral);
              }} style={{ display: "grid", gap: 8 }}>
                <strong>Cadastrar cliente</strong>
                <input style={campo} required placeholder="Nome da empresa ou pessoa" value={formCliente.nome} onChange={e => setFormCliente(s => ({ ...s, nome: e.target.value }))} />
                <select style={campo} value={formCliente.tipoPessoa} onChange={e => setFormCliente(s => ({ ...s, tipoPessoa: e.target.value as "pf"|"pj" }))}>
                  <option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option>
                </select>
                <input style={campo} placeholder="CPF/CNPJ (opcional)" value={formCliente.cpfCnpj} onChange={e => setFormCliente(s => ({ ...s, cpfCnpj: e.target.value }))} />
                <label style={small}><input type="checkbox" checked={formCliente.historico} onChange={e => setFormCliente(s => ({ ...s, historico: e.target.checked }))} /> Cliente atendido antes do CRM</label>
                {formCliente.historico && <label style={small}>Cliente desde <input type="date" style={campo} value={formCliente.clienteDesde} onChange={e => setFormCliente(s => ({ ...s, clienteDesde: e.target.value }))} /></label>}
                <button disabled={ocupado} style={botao} type="submit">Salvar cliente</button>
              </form>
            )}
            {filtrados.map(c => (
              <button key={c.id} style={{ ...botao, textAlign: "left", borderColor: c.id === clienteId ? "#a78bfa" : undefined }}
                onClick={() => { setClienteId(c.id); setMostrarProposta(false); }}>
                {c.nome}
                <div style={small}>{c.historico_legado ? "Cliente histórico" : c.tipo_pessoa === "pj" ? "Pessoa jurídica" : "Pessoa física"}</div>
              </button>
            ))}
            {!filtrados.length && <span style={small}>Nenhum cliente encontrado.</span>}
          </aside>

          <section style={{ display: "grid", gap: 14, alignContent: "start", minWidth: 0 }}>
            {!cliente ? <div style={caixa}>Selecione um cliente ou cadastre o primeiro.</div> : (
              <>
                <div style={caixa}>
                  <h2 style={{ marginTop: 0 }}>{cliente.nome}</h2>
                  <p style={small}>{cliente.historico_legado ? "Cadastro histórico" : "Cadastro atual"} · CPF/CNPJ {cliente.cpf_cnpj ? "informado" : "pendente/opcional"} · {cliente.status}</p>
                  <strong>Contatos ({contatos.length})</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 12px" }}>
                    {contatos.map(c => <span key={c.id} style={{ ...small, padding: 8, border: "1px solid rgba(148,163,184,.2)", borderRadius: 8 }}>{c.nome} · {c.cargo || "contato"} · {c.email || c.telefone || "sem contato informado"}</span>)}
                  </div>
                  <form onSubmit={e => {
                    e.preventDefault();
                    void executar(async () => {
                      await adicionarContatoCrm({ clienteId: cliente.id, ...formContato });
                      setFormContato({ nome: "", email: "", telefone: "", cargo: "" });
                    }, async () => setContatos(await listarContatosCrm(cliente.id)));
                  }} style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))" }}>
                    <input style={campo} required placeholder="Nome do contato" value={formContato.nome} onChange={e => setFormContato(s => ({ ...s, nome: e.target.value }))} />
                    <input style={campo} placeholder="Cargo" value={formContato.cargo} onChange={e => setFormContato(s => ({ ...s, cargo: e.target.value }))} />
                    <input type="email" style={campo} placeholder="E-mail" value={formContato.email} onChange={e => setFormContato(s => ({ ...s, email: e.target.value }))} />
                    <input style={campo} placeholder="Telefone" value={formContato.telefone} onChange={e => setFormContato(s => ({ ...s, telefone: e.target.value }))} />
                    <button type="submit" style={botao} disabled={ocupado}>+ Contato</button>
                  </form>
                </div>
                <div style={caixa}>
                  <h3 style={{ marginTop: 0 }}>Negociações remuneradas</h3>
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    {negociacoes.map(n => <button key={n.id} style={{ ...botao, textAlign: "left", borderColor: negociacaoId === n.id ? "#a78bfa" : undefined }}
                      onClick={() => { setNegociacaoId(n.id); setMostrarProposta(false); }}>
                      <strong>{n.titulo}</strong>
                      <span style={{ ...small, display: "block" }}>{n.natureza === "parceria" ? "Parceria remunerada" : "Prestação de serviços"} · {n.status} · Responsável: {n.responsavel_dubworks || "não informado"}</span>
                    </button>)}
                  </div>
                  <form onSubmit={e => {
                    e.preventDefault();
                    void executar(async () => {
                      const n = await criarNegociacaoCrm({
                        clienteId: cliente.id, titulo: formNegociacao.titulo, natureza: formNegociacao.natureza,
                        escopo: formNegociacao.escopo, responsavel,
                      });
                      setNegociacaoId(n.id); setFormNegociacao({ titulo: "", natureza: "prestacao", escopo: "" });
                    }, async () => setNegociacoes(await listarNegociacoesCrm(cliente.id)));
                  }} style={{ display: "grid", gap: 8 }}>
                    <strong>Nova negociação</strong>
                    <input style={campo} required placeholder="Título da negociação" value={formNegociacao.titulo} onChange={e => setFormNegociacao(s => ({ ...s, titulo: e.target.value }))} />
                    <select style={campo} value={formNegociacao.natureza} onChange={e => setFormNegociacao(s => ({ ...s, natureza: e.target.value as "prestacao" | "parceria" }))}>
                      <option value="prestacao">Prestação de serviços remunerada</option>
                      <option value="parceria">Parceria remunerada</option>
                    </select>
                    <textarea style={campo} placeholder="Descrever serviços e escopo" value={formNegociacao.escopo} onChange={e => setFormNegociacao(s => ({ ...s, escopo: e.target.value }))} />
                    <button type="submit" style={botao} disabled={ocupado}>Criar negociação</button>
                  </form>
                </div>
                {negociacao && (
                  <div style={{ ...caixa, display: "grid", gap: 12 }}>
                    <h3 style={{ margin: 0 }}>{negociacao.titulo}</h3>
                    <p style={{ ...small, margin: 0 }}>{negociacao.escopo || "Escopo ainda não descrito."}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button type="button" style={botao} onClick={() => { setMostrarProposta(v => !v); setItens([]); setFormProposta({ titulo: "Proposta — " + negociacao.titulo, escopo: negociacao.escopo || "", totalPersonalizado: "", custoInterno: "", justificativa: "" }); }}>+ Elaborar proposta</button>
                      <button type="button" style={botao} disabled={ocupado} onClick={() => void executar(async () => {
                        await criarRascunhoContratoCrm({
                          negociacaoId: negociacao.id, titulo: "Contrato — " + negociacao.titulo,
                          objetoEscopo: negociacao.escopo || "",
                          tipoModelo: negociacao.natureza === "parceria" ? "parceria_remunerada" : "servico_remunerado",
                        });
                      }, async () => setContratos(await listarContratosCrm(negociacao.id)))}>+ Elaborar contrato (rascunho)</button>
                    </div>
                    {mostrarProposta && (
                      <form onSubmit={e => {
                        e.preventDefault();
                        if (!podeSalvarProposta) {
                          setErro("Adicione um serviço ou informe o valor fechado e descreva os serviços no escopo.");
                          return;
                        }
                        const itensParaSalvar = itens.length ? itens : [{
                          descricao: "Pacote fechado — " + formProposta.escopo.trim().slice(0, 200),
                          unidade: "projeto",
                          quantidade: 1,
                          preco_unitario: 0,
                          servico_id: null,
                        }];
                        void executar(async () => {
                          await criarPropostaCrm({
                            negociacaoId: negociacao.id, titulo: formProposta.titulo,
                            descricaoEscopo: formProposta.escopo, itens: itensParaSalvar,
                            valorManual: formProposta.totalPersonalizado === "" ? null : vDinheiro(formProposta.totalPersonalizado),
                            custoInterno: formProposta.custoInterno === "" ? null : vDinheiro(formProposta.custoInterno),
                            justificativa: formProposta.justificativa,
                          });
                          setMostrarProposta(false); setItens([]);
                        }, async () => setPropostas(await listarPropostasCrm(negociacao.id)),
                        "Proposta salva em rascunho! Consulte a lista Propostas logo abaixo.");
                      }} style={{ background: "rgba(0,0,0,.18)", padding: 12, borderRadius: 12, display: "grid", gap: 10 }}>
                        <strong>Nova proposta</strong>
                        <input style={campo} required value={formProposta.titulo} placeholder="Título" onChange={e => setFormProposta(s => ({ ...s, titulo: e.target.value }))} />
                        <textarea style={campo} placeholder="Descrição dos serviços" value={formProposta.escopo} onChange={e => setFormProposta(s => ({ ...s, escopo: e.target.value }))} />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {servicos.map(s => <button type="button" key={s.id} style={botao} onClick={() => adicionarItemServico(s)}>+ {s.nome}</button>)}
                          <button type="button" style={botao} onClick={() => adicionarItemServico()}>+ Serviço personalizado</button>
                        </div>
                        {itens.map((item, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(130px,1fr) 88px 120px 35px", gap: 6, alignItems: "center" }} className="dw-crm-item">
                            <input style={campo} aria-label="Serviço" required value={item.descricao} onChange={e => setItens(xs => xs.map((x,j) => i === j ? { ...x, descricao: e.target.value } : x))} />
                            <input style={campo} aria-label="Quantidade" type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e => setItens(xs => xs.map((x,j) => i === j ? { ...x, quantidade: Number(e.target.value) } : x))} />
                            <input style={campo} aria-label="Preço unitário" type="number" min="0" step="0.01" value={item.preco_unitario} onChange={e => setItens(xs => xs.map((x,j) => i === j ? { ...x, preco_unitario: Number(e.target.value) } : x))} />
                            <button type="button" style={botao} aria-label="Remover serviço" onClick={() => setItens(xs => xs.filter((_,j) => j !== i))}>×</button>
                          </div>
                        ))}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
                          <label style={small}>Preço total personalizado (opcional)
                            <input style={campo} placeholder="Ex.: 850,00" value={formProposta.totalPersonalizado} onChange={e => setFormProposta(s => ({ ...s, totalPersonalizado: e.target.value }))} />
                          </label>
                          <label style={small}>Custo interno estimado (opcional)
                            <input style={campo} placeholder="Ex.: 400,00" value={formProposta.custoInterno} onChange={e => setFormProposta(s => ({ ...s, custoInterno: e.target.value }))} />
                          </label>
                        </div>
                        {formProposta.totalPersonalizado !== "" && <input style={campo} required placeholder="Justificativa do preço negociado" value={formProposta.justificativa} onChange={e => setFormProposta(s => ({ ...s, justificativa: e.target.value }))} />}
                        <div style={{ color: "#c4b5fd", fontWeight: 700 }}>
                          {valores
                            ? `${itens.length ? "Tabela: " + dinheiro(valores.referencia) : "Sem preço de tabela"} · Total negociado: ${dinheiro(valores.negociado)}`
                            : "Confira quantidades e valores."}
                        </div>
                        {pacoteFechado && <p style={{ ...small, margin: 0 }}>
                          Pacote por valor fechado: a descrição do escopo será registrada como serviço personalizado, sem alterar a tabela oficial.
                        </p>}
                        {!podeSalvarProposta && <p role="status" style={{ color: "#fde68a", fontSize: 13, margin: 0 }}>
                          Para salvar, selecione um serviço OU informe preço total personalizado e descreva o escopo.
                        </p>}
                        <button type="submit" style={{ ...botao, background: "#432076", color: "#fff" }} disabled={ocupado}>Salvar proposta em rascunho</button>
                      </form>
                    )}
                    <h4 id="dw-crm-propostas" style={{ color: "#f8fafc", margin: "8px 0 0", scrollMarginTop: 18 }}>Propostas salvas ({propostas.length})</h4>
                    <p style={{ ...small, margin: 0 }}>As propostas ficam nesta negociação, abaixo do formulário. Você também pode retornar ao cliente e selecionar a negociação para consultá-las.</p>
                    {propostas.map(p => <div key={p.id} style={{ ...small, padding: 8, borderTop: "1px solid rgba(148,163,184,.15)" }}>
                      <strong style={{ color: "#f8fafc" }}>#{p.id} · Versão {p.versao} — {p.titulo}</strong>
                      <div>{dinheiro(Number(p.valor_negociado))} · {p.modo_preco === "personalizado" ? "Preço fechado" : "Tabela de serviços"} · {p.status}</div>
                      {p.descricao_escopo && <div>Escopo: {p.descricao_escopo}</div>}
                      {(() => {
                        const prox: Record<string,string> = { rascunho: "em_revisao", em_revisao: "aprovada", aprovada: "enviada", enviada: "aceita" };
                        const next = prox[p.status];
                        return next && (next !== "aprovada" || podeAprovar) ? <button type="button" style={{ ...botao, marginLeft: 8 }}
                          disabled={ocupado} onClick={() => void executar(
                            () => alterarStatusPropostaCrm(p.id, p.status, next, responsavel),
                            async () => setPropostas(await listarPropostasCrm(negociacao.id))
                          )}>{next === "aprovada" ? "Aprovar proposta" : next === "em_revisao" ? "Enviar à revisão" : next === "enviada" ? "Marcar enviada" : "Registrar aceite"}</button> : null;
                      })()}
                    </div>)}
                    <strong>Contratos ({contratos.length})</strong>
                    {contratos.map(c => <ContractWorkflowCard key={c.id} contrato={c} diretor={podeAprovar}
                      recarregar={async () => setContratos(await listarContratosCrm(negociacao.id))} />)}
                    <span style={small}>Contratos são rascunhos até aprovação, revisão jurídica e arquivamento do documento efetivamente assinado.</span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {aba === "parcerias" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={caixa}>
            <h2 style={{ marginTop: 0 }}>Parcerias externas gratuitas</h2>
            <p style={small}>Não são clientes do funil de vendas. Cada parceria precisa de seu próprio termo/contrato para formalização.</p>
            <button style={botao} onClick={() => setMostrarParceria(v => !v)}>+ Cadastrar parceiro antigo ou novo</button>
            {mostrarParceria && <form onSubmit={e => {
              e.preventDefault(); void executar(async () => {
                const criado = await criarParceriaGratuita({
                  nome: formParceria.nome, natureza: formParceria.natureza, responsavel,
                  contatoNome: formParceria.contato, escopo: formParceria.escopo, historicoLegado: formParceria.historico,
                });
                setParceriaId(criado.id); setMostrarParceria(false);
                setFormParceria({ nome: "", natureza: "parceria", contato: "", escopo: "", historico: false });
              }, carregarGeral);
            }} style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <input style={campo} placeholder="Nome do parceiro" value={formParceria.nome} required onChange={e => setFormParceria(s => ({ ...s, nome: e.target.value }))} />
              <select style={campo} value={formParceria.natureza} onChange={e => setFormParceria(s => ({ ...s, natureza: e.target.value as "parceria"|"prestacao" }))}>
                <option value="parceria">Parceria gratuita</option><option value="prestacao">Prestação gratuita</option>
              </select>
              <input style={campo} placeholder="Contato" value={formParceria.contato} onChange={e => setFormParceria(s => ({ ...s, contato: e.target.value }))} />
              <textarea style={campo} placeholder="Serviços e contrapartidas" value={formParceria.escopo} onChange={e => setFormParceria(s => ({ ...s, escopo: e.target.value }))} />
              <label style={small}><input type="checkbox" checked={formParceria.historico} onChange={e => setFormParceria(s => ({ ...s, historico: e.target.checked }))} /> Parceria anterior ao CRM</label>
              <button style={botao} type="submit" disabled={ocupado}>Cadastrar parceria</button>
            </form>}
          </div>
          <div style={{ ...caixa, display: "grid", gap: 9 }}>
            {parcerias.map(p => <button key={p.id} type="button" style={{ ...botao, textAlign: "left", borderColor: p.id === parceriaId ? "#a78bfa" : undefined }}
              onClick={() => setParceriaId(p.id)}>
              {p.nome_parceiro} <span style={small}>· {p.natureza} · {p.status}</span>
            </button>)}
            {!parcerias.length && <p style={small}>Nenhuma parceria cadastrada.</p>}
          </div>
          {parceria && <div style={{ ...caixa, display: "grid", gap: 9 }}>
            <h3 style={{ margin: 0 }}>{parceria.nome_parceiro}</h3>
            <p style={small}>{parceria.escopo || "Escopo ainda não detalhado."}</p>
            <button type="button" style={botao} disabled={ocupado} onClick={() => void executar(async () => {
              await criarRascunhoContratoCrm({
                parceriaGratuitaId: parceria.id, titulo: "Termo — " + parceria.nome_parceiro,
                objetoEscopo: parceria.escopo || "",
                tipoModelo: parceria.natureza === "parceria" ? "parceria_gratuita" : "servico_gratuito",
              });
            }, async () => setContratosParceria(await listarContratosParceriaGratuita(parceria.id)))}>
              + Elaborar termo/contrato gratuito
            </button>
            {contratosParceria.map(c => <ContractWorkflowCard key={c.id} contrato={c} diretor={podeAprovar}
              recarregar={async () => setContratosParceria(await listarContratosParceriaGratuita(parceria.id))} />)}
          </div>}
        </div>
      )}

      {aba === "servicos" && (
        <div style={{ ...caixa, display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Tabela de serviços</h2>
          <p style={small}>Preços de referência. Você pode negociar um valor fechado por proposta sem mudar esta tabela.</p>
          <button style={{ ...botao, justifySelf: "start" }} onClick={() => setMostrarServico(v => !v)}>+ Novo serviço</button>
          {mostrarServico && <form onSubmit={e => {
            e.preventDefault(); void executar(async () => {
              await criarServicoCrm({ nome: formServico.nome, unidade: formServico.unidade, preco: vDinheiro(formServico.preco) });
              setFormServico({ nome: "", unidade: "minuto", preco: "0" }); setMostrarServico(false);
            }, carregarGeral);
          }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
            <input style={campo} required placeholder="Nome do serviço" value={formServico.nome} onChange={e => setFormServico(s => ({ ...s, nome: e.target.value }))} />
            <select style={campo} value={formServico.unidade} onChange={e => setFormServico(s => ({ ...s, unidade: e.target.value as CrmServico["unidade"] }))}>
              {["minuto","episodio","corte","hora","projeto","unidade"].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <input style={campo} required placeholder="Preço base (R$)" value={formServico.preco} onChange={e => setFormServico(s => ({ ...s, preco: e.target.value }))} />
            <button style={botao} type="submit" disabled={ocupado}>Salvar serviço</button>
          </form>}
          {servicos.map(s => <div key={s.id} style={{ borderTop: "1px solid rgba(148,163,184,.15)", paddingTop: 10 }}>
            <strong>{s.nome}</strong> <span style={small}>{dinheiro(Number(s.preco_referencia))} / {s.unidade}</span>
          </div>)}
        </div>
      )}
      <style>{`@media(max-width:800px){.dw-crm-grid{grid-template-columns:1fr !important}.dw-crm-item{grid-template-columns:1fr 70px 100px 35px !important}}`}</style>
    </div>
  );
}
