import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCutDuration, formatCutDuration, sumCutDurations, cutLabel, legacyDeliveryIsCandidate
} from "../src/shared/weekCuts.js";

test("duração aceita cortes irregulares e rejeita relógios inválidos", () => {
  assert.equal(parseCutDuration("04:48"), 288);
  assert.equal(parseCutDuration("05:17"), 317);
  assert.equal(parseCutDuration("01:02:03"), 3723);
  for (const invalid of ["", "00:00", "05:99", "1:2", "-2:00", "3:61:00", "25:00:00", "abc"]) {
    assert.equal(parseCutDuration(invalid), null, invalid);
  }
});

test("total e formatação preservam todos os segundos reais", () => {
  const cuts = [{ duracao_segundos: 300 }, { duracao_segundos: 317 }, { duracao_segundos: 288 }];
  assert.equal(sumCutDurations(cuts), 905);
  assert.equal(formatCutDuration(sumCutDurations(cuts)), "15:05");
  assert.equal(formatCutDuration(3723), "01:02:03");
  assert.equal(cutLabel(2), "Semana 02");
});

test("entrega antiga nunca se associa só por texto da semana", () => {
  const cut = { episodio_id: 31, semana: 1 };
  assert.equal(legacyDeliveryIsCandidate({ episodio_id: 31, semana: "Semana 01" }, cut), true);
  assert.equal(legacyDeliveryIsCandidate({ episodio_id: 32, semana: "Semana 01" }, cut), false);
  assert.equal(legacyDeliveryIsCandidate({ episodio_id: null, semana: "Semana 01" }, cut), false);
  assert.equal(legacyDeliveryIsCandidate({ episodio_id: 31, semana: "Semana 02" }, cut), false);
  assert.equal(legacyDeliveryIsCandidate({ episodio_id: 31, episodio_corte_id: 100, semana: "Semana 01" }, cut), false);
});
