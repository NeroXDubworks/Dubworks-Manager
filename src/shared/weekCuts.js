/** Uma semana corresponde a um corte de duração real (não fixada em 5 minutos). */
export function parseCutDuration(raw) {
  const input = String(raw ?? "").trim();
  if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(input)) return null;
  const parts = input.split(":").map(Number);
  const valid = parts.length === 2
    ? parts[1] < 60
    : parts[1] < 60 && parts[2] < 60;
  if (!valid) return null;
  const seconds = parts.length === 2
    ? parts[0] * 60 + parts[1]
    : parts[0] * 3600 + parts[1] * 60 + parts[2];
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}

export function formatCutDuration(rawSeconds) {
  const total = Number(rawSeconds);
  if (!Number.isInteger(total) || total < 0) return "—";
  const h = Math.floor(total / 3600);
  const m = Math.floor(total % 3600 / 60);
  const s = total % 60;
  const pad = value => String(value).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(Math.floor(total / 60))}:${pad(s)}`;
}

export function sumCutDurations(cuts) {
  return cuts.reduce((sum, cut) => {
    const seconds = Number(cut?.duracao_segundos);
    return sum + (Number.isInteger(seconds) && seconds >= 0 ? seconds : 0);
  }, 0);
}

export function cutLabel(number) {
  return `Semana ${String(number).padStart(2, "0")}`;
}

/**
 * Apenas para apresentar candidatas legadas à vinculação MANUAL.
 * 'Semana 01' sem episodio_id é ambígua e nunca é associada automaticamente.
 */
export function legacyDeliveryIsCandidate(delivery, cut) {
  if (delivery?.episodio_corte_id != null) return false;
  if (Number(delivery?.episodio_id) !== Number(cut?.episodio_id)) return false;
  const found = String(delivery?.semana || "").match(/\bsemana\s*0*(\d+)\b/i);
  return Boolean(found) && Number(found[1]) === Number(cut?.semana);
}
