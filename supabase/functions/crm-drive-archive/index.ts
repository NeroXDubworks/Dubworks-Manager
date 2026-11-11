import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ROOT = "11O_QwFPFTEKVRbZLR1h01Iulph6a1YQS";
const API = "https://www.googleapis.com/drive/v3";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
class ApiError extends Error {
  constructor(public status:number, public code:string, message:string) { super(message); }
}
const str = (value:unknown) => String(value ?? "").trim();
const json = (payload:unknown, status=200) => new Response(JSON.stringify(payload),{
  status, headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"},
});
function key() {
  try { const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
    if(keys.default)return String(keys.default);
  } catch {}
  return Deno.env.get("SUPABASE_ANON_KEY")||"";
}
function encodeUrl(bytes:Uint8Array) {
  let result="";
  for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(result).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function privateKeyBuffer(pem:string) {
  const raw=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g,"")
    .replace(/\\n/g,"").replace(/\s/g,"");
  return Uint8Array.from(atob(raw), c=>c.charCodeAt(0)).buffer;
}
async function googleToken():Promise<string> {
  const email=Deno.env.get("GOOGLE_CLIENT_EMAIL")||"";
  const privateKey=Deno.env.get("GOOGLE_PRIVATE_KEY")||"";
  if(!email||!privateKey)throw new ApiError(503,"GOOGLE_CONFIG","Credenciais do Drive não configuradas.");
  const now=Math.floor(Date.now()/1000);
  const header=encodeUrl(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const payload=encodeUrl(new TextEncoder().encode(JSON.stringify({
    iss:email,scope:"https://www.googleapis.com/auth/drive",
    aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600,
  })));
  const text=header+"."+payload;
  const rsa=await crypto.subtle.importKey("pkcs8",privateKeyBuffer(privateKey),
    {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const signed=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",rsa,new TextEncoder().encode(text));
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:text+"."+encodeUrl(new Uint8Array(signed))}),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token)throw new ApiError(503,"GOOGLE_AUTH","Conta de serviço não autenticada no Drive.");
  return data.access_token;
}
async function google(token:string,endpoint:string,init:RequestInit={}) {
  const response=await fetch(endpoint,{
    ...init,headers:{Authorization:"Bearer "+token,...(init.headers||{})},
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const permission=response.status===403||response.status===404;
    throw new ApiError(permission?503:502,permission?"DRIVE_PERMISSION":"DRIVE_ERROR",
      permission?"A conta de serviço não tem acesso de gravação à pasta comercial restrita.":
      "Google Drive: "+str(data?.error?.message||response.statusText).slice(0,140));
  }
  return data;
}
async function validRoot(token:string) {
  const root=await google(token,API+"/files/"+ROOT+
    "?supportsAllDrives=true&fields=id,mimeType,capabilities(canAddChildren),permissions(type,role,emailAddress)");
  if(root.mimeType!=="application/vnd.google-apps.folder")
    throw new ApiError(500,"ROOT","Pasta comercial inválida.");
  if(Array.isArray(root.permissions)&&root.permissions.some((p:any)=>
    ["anyone","domain","group"].includes(p.type)))
    throw new ApiError(403,"ROOT_PUBLIC","Pasta comercial com acesso amplo. Restrinja o compartilhamento.");
  if(root.capabilities?.canAddChildren===false)
    throw new ApiError(503,"DRIVE_PERMISSION","Conta de serviço sem permissão de escrita na pasta comercial.");
}
const safe=(value:unknown)=>(str(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[\/\\<>:?"*|\u0000-\u001F]/g," ").replace(/\s+/g," ").slice(0,70).trim()||"Sem nome");
const escapeQ=(v:string)=>v.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
async function lookup(token:string,parent:string,name:string,mime:string) {
  const q="'"+escapeQ(parent)+"' in parents and name = '"+escapeQ(name)+
    "' and mimeType = '"+mime+"' and trashed = false";
  const params=new URLSearchParams({q,fields:"files(id,name,size)",pageSize:"10",
    supportsAllDrives:"true",includeItemsFromAllDrives:"true"});
  const data=await google(token,API+"/files?"+params.toString());
  return data.files?.[0]||null;
}
async function folder(token:string,parent:string,name:string) {
  const mime="application/vnd.google-apps.folder";
  const found=await lookup(token,parent,name,mime);
  if(found?.id)return String(found.id);
  const added=await google(token,API+"/files?fields=id&supportsAllDrives=true",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,mimeType:mime,parents:[parent]}),
  });
  if(!added.id)throw new ApiError(502,"FOLDER","Google Drive não confirmou a pasta.");
  return String(added.id);
}
function pdfBytes(b64:string):Uint8Array {
  if(b64.length>4000000)throw new ApiError(413,"SIZE","PDF excede limite do CRM.");
  const raw=atob(b64);const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  if(bytes.length<200||new TextDecoder().decode(bytes.subarray(0,5))!=="%PDF-")
    throw new ApiError(400,"PDF","PDF arquivado inválido.");
  return bytes;
}
async function upload(token:string,parent:string,name:string,bytes:Uint8Array) {
  const bound="dw-"+crypto.randomUUID();
  const metadata=JSON.stringify({name,parents:[parent],mimeType:"application/pdf"});
  const prefix=new TextEncoder().encode("--"+bound+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+
    metadata+"\r\n--"+bound+"\r\nContent-Type: application/pdf\r\n\r\n");
  const suffix=new TextEncoder().encode("\r\n--"+bound+"--\r\n");
  const body=new Uint8Array(prefix.length+bytes.length+suffix.length);
  body.set(prefix);body.set(bytes,prefix.length);body.set(suffix,prefix.length+bytes.length);
  const result=await google(token,"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size&supportsAllDrives=true",{
    method:"POST",headers:{"Content-Type":"multipart/related; boundary="+bound},body,
  });
  if(!result.id||(result.size&&Number(result.size)!==bytes.length))
    throw new ApiError(502,"UPLOAD","Drive não confirmou o PDF completo.");
  return String(result.id);
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({ok:false,error:"Método inválido."},405);
  try {
    const body=await req.json().catch(()=>({}));
    const id=Number(body.documentId);
    if(!Number.isSafeInteger(id)||id<1)throw new ApiError(400,"INPUT","Identificador inválido.");
    const auth=str(req.headers.get("Authorization")).replace(/^Bearer\s+/i,"");
    const url=Deno.env.get("SUPABASE_URL")||"";
    if(!url||!key()||!auth||auth.startsWith("sb_"))
      throw new ApiError(401,"AUTH","Sessão de usuário obrigatória.");
    const scoped=createClient(url,key(),{
      global:{headers:{Authorization:"Bearer "+auth}},auth:{persistSession:false,autoRefreshToken:false},
    });
    const {data:{user},error:loginError}=await scoped.auth.getUser(auth);
    if(loginError||!user?.id)throw new ApiError(401,"AUTH","Sessão expirada.");
    const {data:doc,error:docError}=await scoped.from("crm_documentos_gerados")
      .select("id,tipo,proposta_id,contrato_id,nome_arquivo,conteudo_base64,sha256,drive_file_id,drive_url")
      .eq("id",id).maybeSingle();
    if(docError||!doc)throw new ApiError(403,"PERMISSION","Documento comercial inacessível.");
    if(doc.drive_file_id&&doc.drive_url)
      return json({ok:true,alreadySynced:true,drive_url:doc.drive_url,drive_file_id:doc.drive_file_id});
    let negId:number|null=null;let partnership:number|null=null;
    if(doc.tipo==="proposta"){
      const p=await scoped.from("crm_propostas").select("negociacao_id").eq("id",doc.proposta_id).single();
      if(p.error||!p.data)throw new ApiError(403,"PERMISSION","Proposta não disponível.");
      negId=Number(p.data.negociacao_id);
    }else {
      const c=await scoped.from("crm_contratos").select("negociacao_id,parceria_gratuita_id")
        .eq("id",doc.contrato_id).single();
      if(c.error||!c.data)throw new ApiError(403,"PERMISSION","Contrato não disponível.");
      negId=c.data.negociacao_id?Number(c.data.negociacao_id):null;
      partnership=c.data.parceria_gratuita_id?Number(c.data.parceria_gratuita_id):null;
    }
    let name:string;
    if(negId){
      const n=await scoped.from("crm_negociacoes").select("cliente_id").eq("id",negId).single();
      if(n.error||!n.data)throw new ApiError(403,"PERMISSION","Negociação inacessível.");
      const c=await scoped.from("crm_clientes").select("id,nome").eq("id",n.data.cliente_id).single();
      if(c.error||!c.data)throw new ApiError(403,"PERMISSION","Cliente inacessível.");
      name="Cliente "+c.data.id+" - "+safe(c.data.nome);
    }else if(partnership){
      const p=await scoped.from("crm_parcerias_gratuitas").select("id,nome_parceiro").eq("id",partnership).single();
      if(p.error||!p.data)throw new ApiError(403,"PERMISSION","Parceria inacessível.");
      name="Parceria "+p.data.id+" - "+safe(p.data.nome_parceiro);
    }else throw new ApiError(400,"LINK","Documento sem cadastro vinculado.");
    const bytes=pdfBytes(str(doc.conteudo_base64));
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
    if(doc.sha256&&doc.sha256!==sha)throw new ApiError(400,"HASH","Integridade do PDF inválida.");
    const token=await googleToken();
    await validRoot(token);
    const client=await folder(token,ROOT,name);
    const destination=await folder(token,client,doc.tipo==="proposta"?"Propostas":"Contratos");
    const filename="DW-"+doc.tipo+"-"+doc.id+"-"+sha.slice(0,12)+"-"+safe(doc.nome_arquivo).replace(/\.pdf$/i,"")+".pdf";
    const found=await lookup(token,destination,filename,"application/pdf");
    const fileId=found?.id?String(found.id):await upload(token,destination,filename,bytes);
    const adminKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!adminKey)throw new ApiError(503,"CONFIG","Credencial interna do Supabase indisponível.");
    const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const fileUrl="https://drive.google.com/file/d/"+encodeURIComponent(fileId)+"/view";
    const saved=await admin.from("crm_documentos_gerados").update({
      drive_file_id:fileId,drive_url:fileUrl,drive_sincronizado_em:new Date().toISOString(),
    }).eq("id",id).is("drive_file_id",null).select("id").maybeSingle();
    if(saved.error||!saved.data)throw new ApiError(409,"SYNC","Sincronização concorrente; atualize o histórico.");
    return json({ok:true,drive_file_id:fileId,drive_url:fileUrl});
  }catch(error){
    const err=error instanceof ApiError?error:null;
    if(!err)console.error("crm-drive-archive",error instanceof Error?error.name:"unknown");
    return json({ok:false,code:err?.code||"INTERNAL",
      error:err?.message||"Falha inesperada. O arquivo permanece salvo no CRM."},err?.status||500);
  }
});