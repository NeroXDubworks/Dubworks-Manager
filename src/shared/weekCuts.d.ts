export interface CorteDuracao { duracao_segundos: number }
export interface CandidatoEntregaLegada {
  episodio_id?: number | null;
  episodio_corte_id?: number | null;
  semana?: string | null;
}
export interface CorteIdentificador { episodio_id: number; semana: number }
export function parseCutDuration(raw: string): number | null;
export function formatCutDuration(rawSeconds: number): string;
export function sumCutDurations(cuts: CorteDuracao[]): number;
export function cutLabel(number: number): string;
export function legacyDeliveryIsCandidate(delivery: CandidatoEntregaLegada, cut: CorteIdentificador): boolean;
