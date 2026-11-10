import type { CrmCliente, CrmNegociacao, CrmProposta, CrmPropostaItem } from "../services/commercialCrm";

export type DadosPdfProposta = {
  proposta: CrmProposta;
  cliente: CrmCliente;
  negociacao: CrmNegociacao;
  itens: CrmPropostaItem[];
};

export function gerarPdfProposta(dados: DadosPdfProposta): Blob;
export function baixarPdfProposta(dados: DadosPdfProposta): void;
