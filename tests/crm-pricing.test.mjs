import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProposal, profitEstimate } from "../src/shared/crmPricing.js";

test("modelo automático soma itens e aplica desconto", () => {
  const r = calculateProposal([{quantidade: 10, preco_unitario: 35}, {quantidade: 1, preco_unitario: 100}], null, 10);
  assert.equal(r.referencia, 450);
  assert.equal(r.sugerido, 405);
  assert.equal(r.negociado, 405);
  assert.equal(r.personalizado, false);
});

test("valor personalizado prevalece sem alterar referência", () => {
  const r = calculateProposal([{quantidade: 10, preco_unitario: 35}, {quantidade: 1, preco_unitario: 100}], 850);
  assert.equal(r.referencia, 450);
  assert.equal(r.negociado, 850);
  assert.equal(r.diferenca, 400);
  assert.equal(r.personalizado, true);
});

test("margem é separada do valor cobrado", () => {
  const r = profitEstimate(850, 400);
  assert.equal(r.lucroEstimado, 450);
  assert.equal(r.margemPercentual, 52.94);
  assert.equal(profitEstimate(0, 200).margemPercentual, null);
});

test("rejeitar preços negativos/descontos inválidos", () => {
  assert.throws(() => calculateProposal([{quantidade: 1, preco_unitario: -1}]));
  assert.throws(() => calculateProposal([{quantidade: 0, preco_unitario: 35}]));
  assert.throws(() => calculateProposal([], null, 110));
});
