import type {
 CrmProposta, CrmPropostaItem, CrmCliente, CrmNegociacao, ParceriaGratuita
} from "../services/commercialCrm";
import type { ContratoCrmBasico } from "../components/CrmContractPreview";

export type PdfExtraFields = Record<string, string>;
export type PdfProposalData = {
 proposta: CrmProposta;
 cliente: CrmCliente;
 negociacao: CrmNegociacao;
 itens: CrmPropostaItem[];
 extras?: PdfExtraFields;
};
export type PdfContractData = {
 contrato: ContratoCrmBasico;
 cliente?: CrmCliente | null;
 negociacao?: CrmNegociacao | null;
 parceria?: ParceriaGratuita | null;
 propostaAceita?: CrmProposta | null;
 extras?: PdfExtraFields;
};
export function loadPdfLib(): Promise<any>;
export function camposPropostaOficial(data: PdfProposalData): {
 fields: Record<string, string>;
 appendix: Array<{label: string; value: string}>;
};
export function camposContratoOficial(data: PdfContractData): {
 fields: Record<string, string>;
 appendix: Array<{label: string; value: string}>;
};
export function renderizarPdfOficial(
  kind: "proposta" | "contrato",
  data: PdfProposalData | PdfContractData,
  templateBytes: Uint8Array | ArrayBuffer,
  lib: any
): Promise<Blob>;
export function pdfPropostaOficial(data: PdfProposalData): Promise<Blob>;
export function pdfContratoOficial(data: PdfContractData): Promise<Blob>;
export function baixarDocumentoPdf(blob: Blob, nome: string): void;
export function nomePdfProposta(data: PdfProposalData): string;
export function nomePdfContrato(data: PdfContractData): string;
