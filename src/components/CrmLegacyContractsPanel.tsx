import React, { useEffect, useState } from "react";
import {
  listarContratosSemVinculoCrm, vincularContratoPropostaCrm,
  type ContratoSemVinculoCrm,
} from "../services/commercialCrm";

const btn: React.CSSProperties = {
  border:"1px solid rgba(167,139,250,.45)",background:"#281b49",color:"#f5eaff",
  borderRadius:9,padding:"9px 12px",fontWeight:700,cursor:"pointer",
};
const selectStyle:React.CSSProperties={
  background:"#0e1528",border:"1px solid #50416f",padding:10,color:"#fff",borderRadius:8,
  minWidth:220,maxWidth:"100%",flex:1,
};
const currency=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function CrmLegacyContractsPanel({onLinked}:{
  onLinked?: (negociacaoId:number)=>Promise<void>;
}) {
  const [open,setOpen]=useState(false);
  const [rows,setRows]=useState<ContratoSemVinculoCrm[]>([]);
  const [choices,setChoices]=useState<Record<number,number>>({});
  const [busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState("");
  const [feedback,setFeedback]=useState("");
  const [loading,setLoading]=useState(true);
  async function reload() {
    const list=await listarContratosSemVinculoCrm();
    setRows(list);return list;
  }
  useEffect(()=>{
    let active=true;
    listarContratosSemVinculoCrm()
      .then(result=>{if(active)setRows(result);})
      .catch(e=>{if(active)setError(String(e?.message||e));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  async function link(row:ContratoSemVinculoCrm) {
    const proposalId=choices[row.id];
    if(!proposalId||!row.propostas_aceitas.some(p=>p.id===proposalId))return;
    if(!window.confirm("Confirmar vínculo do contrato #"+row.id+" à proposta #"+proposalId+
      "? Essa versão será usada no documento contratual."))return;
    setBusy(row.id);setError("");setFeedback("");
    try{
      await vincularContratoPropostaCrm(row.id,proposalId,row.status);
      await reload();
      if(onLinked)await onLinked(row.negociacao_id);
      setFeedback("Contrato #"+row.id+" vinculado à proposta aceita #"+proposalId+".");
    }catch(e:any){setError(String(e?.message||e));}
    finally{setBusy(null);}
  }
  return <section aria-label="Regularização dos contratos comerciais antigos" style={{
    padding:14,background:"linear-gradient(120deg,#11182e,#1a1734)",
    border:"1px solid #52416e",borderRadius:14,display:"grid",gap:11,
  }}>
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:12,justifyContent:"space-between"}}>
      <div>
        <strong>Conferência de contratos antigos</strong>
        <div style={{color:"#abb9d2",fontSize:12,marginTop:4}}>
          {loading?"Consultando...":rows.length+
            " contrato(s) ainda sem proposta vinculada; nenhuma associação automática é realizada."}
        </div>
      </div>
      <button type="button" style={btn} onClick={()=>setOpen(o=>!o)}>
        {open?"Recolher conferência":"Conferir vínculos"}
      </button>
    </div>
    {error&&<p role="alert" style={{color:"#fda4af",fontSize:13,margin:0}}>{error}</p>}
    {feedback&&<p role="status" style={{color:"#a7f3d0",fontSize:13,margin:0}}>{feedback}</p>}
    {open&&<div style={{display:"grid",gap:10}}>
      {!rows.length&&!loading&&<p style={{color:"#a7f3d0"}}>Todos os contratos disponíveis estão vinculados.</p>}
      {rows.map(row=><article key={row.id} style={{
        background:"rgba(2,6,23,.56)",padding:12,borderRadius:10,display:"grid",gap:7,
      }}>
        <strong>Contrato #{row.id} · {row.titulo}</strong>
        <div style={{color:"#abb9d2",fontSize:12}}>
          Cliente: {row.cliente_nome} · Negociação: {row.negociacao_titulo} · Status: {row.status}
        </div>
        {!row.propostas_aceitas.length?
          <div style={{color:"#fde68a",fontSize:12}}>
            Nenhuma proposta aceita nesta negociação. Conclua a aprovação e o aceite antes de vincular.
          </div>:
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <select aria-label={"Selecionar proposta aceita do contrato "+row.id}
              style={selectStyle} value={choices[row.id]||""}
              onChange={e=>setChoices(p=>({...p,[row.id]:Number(e.target.value)}))}>
              <option value="">Escolher versão aceita</option>
              {row.propostas_aceitas.map(p=>
                <option key={p.id} value={p.id}>
                  #{p.id} · Versão {p.versao} · {currency(p.valor_negociado)}
                </option>)}
            </select>
            <button type="button" style={btn} disabled={busy!==null||!choices[row.id]}
              onClick={()=>void link(row)}>{busy===row.id?"Vinculando...":"Vincular proposta"}</button>
          </div>}
      </article>)}
    </div>}
  </section>;
}