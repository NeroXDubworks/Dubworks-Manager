export interface ItemPreco { quantidade: number; preco_unitario: number }
export interface ResultadoPreco {
  referencia: number;
  sugerido: number;
  negociado: number;
  personalizado: boolean;
  diferenca: number;
}
export function cents(raw: number | string): number;
export function calculateProposal(items: ItemPreco[], manualTotal?: number | string | null, discountPercent?: number): ResultadoPreco;
export function profitEstimate(total: number, internalCost: number): { lucroEstimado: number; margemPercentual: number | null };
