import assert from "node:assert/strict";
import { pendenciasProposta, pendenciasContrato } from "../src/shared/crmDocumentReadiness.js";

const proposal={
  descricao_escopo:"Produção de áudio para campanha",valor_negociado:690,
  condicoes_pagamento:"50% na contratação e 50% na entrega",validade_em:"2099-12-31",
  campos_pdf:{entregaveis:"Áudio WAV",revisoes:"2",entrega:"15 dias",contato:"comercial@example.com",
    responsavel:"Diretoria"},
};
assert.deepEqual(pendenciasProposta(proposal),[],"Proposta completa não deve ter pendências.");
assert.ok(pendenciasProposta({...proposal,condicoes_pagamento:""}).includes("Condições de pagamento"));
assert.ok(pendenciasProposta({...proposal,validade_em:"2020-01-01"}).includes("Validade atual da proposta"));
assert.ok(pendenciasProposta({...proposal,campos_pdf:{}}).length>=5);

const contract={
  proposta_id:4,negociacao_id:2,objeto_escopo:"Dublagem profissional",
  arquivo_url:"https://drive.google.com/file/d/123/view",
  campos_pdf:{
    prestadora_razao:"DubWorks",prestadora_documento:"000",prestadora_endereco:"Rua",
    prestadora_representante:"Responsável",cliente_endereco:"Rua 2",
    cliente_representante:"Pessoa responsável",anexo_entregas:"Áudios",
    anexo_etapas:"Revisões e conclusão",anexo_direitos:"Licença definida",
  },
};
assert.deepEqual(pendenciasContrato(contract),[]);
assert.ok(pendenciasContrato({...contract,proposta_id:null}).includes("Proposta aceita vinculada"));
assert.ok(pendenciasContrato({...contract,arquivo_url:"http://invalido"}).includes("Link HTTPS do documento revisado"));
assert.ok(pendenciasContrato({...contract,campos_pdf:{}}).length>=9);
console.log("CRM: validação comercial antes da aprovação e do envio OK");
