import type { CrmCliente, CrmNegociacao, ParceriaGratuita } from "../services/commercialCrm";
import type { ContratoCrmBasico } from "../components/CrmContractPreview";

export type DadosPdfContrato = {
  contrato: ContratoCrmBasico;
  cliente?: CrmCliente | null;
  negociacao?: CrmNegociacao | null;
  parceria?: ParceriaGratuita | null;
};

export function gerarPdfMinutaContrato(dados: DadosPdfContrato): Blob;
export function baixarPdfMinutaContrato(dados: DadosPdfContrato): void;
