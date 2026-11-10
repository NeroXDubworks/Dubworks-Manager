/** Valores monetários são calculados em centavos para evitar erros binários. */
export function cents(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1e10) throw new Error("Valor financeiro inválido.");
  return Math.round((n + Number.EPSILON) * 100);
}

export function calculateProposal(items, manualTotal = null, discountPercent = 0) {
  if (!Array.isArray(items)) throw new Error("Itens inválidos.");
  const reference = items.reduce((sum, item) => {
    const qty = Number(item.quantidade);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantidade inválida.");
    return sum + Math.round(qty * cents(item.preco_unitario));
  }, 0);
  const discount = Number(discountPercent);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    throw new Error("Desconto deve estar entre 0 e 100%.");
  }
  const suggested = Math.round(reference * (100 - discount) / 100);
  const total = manualTotal === null || manualTotal === undefined || manualTotal === ""
    ? suggested : cents(manualTotal);
  return {
    referencia: reference / 100,
    sugerido: suggested / 100,
    negociado: total / 100,
    personalizado: manualTotal !== null && manualTotal !== undefined && manualTotal !== "",
    diferenca: (total - reference) / 100,
  };
}

/** A comparação é informativa. Nunca substitui a aprovação comercial. */
export function profitEstimate(total, internalCost) {
  const value = cents(total);
  const cost = cents(internalCost);
  return { lucroEstimado: (value - cost) / 100, margemPercentual: value === 0 ? null : Math.round((value - cost) / value * 10000) / 100 };
}
