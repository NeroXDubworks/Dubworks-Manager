import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../integracoes/google-forms-projetos/Code.gs", import.meta.url),
  "utf8"
);
const SPREADSHEET_ID = "1ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";

function aba(nome, headers, rows) {
  return {
    getName: () => nome,
    getLastColumn: () => headers.length,
    getRange: () => ({ getDisplayValues: () => [headers] }),
    getDataRange: () => ({ getDisplayValues: () => [headers, ...rows] }),
  };
}
function executar(abas, payload = { spreadsheetId: SPREADSHEET_ID }) {
  const context = {
    console,
    SpreadsheetApp: {
      openById(id) {
        assert.equal(id, SPREADSHEET_ID);
        return {
          getSheets: () => abas,
          getUrl: () => "https://docs.google.com/spreadsheets/d/" + id,
        };
      },
    },
  };
  vm.runInNewContext(source, context);
  return { result: () => context.lerRespostas_(payload, "entregas"), context };
}

test("lê respostas na aba correta com cabeçalhos de Forms legados", () => {
  const headers = [
    "Carimbo de data/hora", "Nome do membro:", "Número de telefone do membro:",
    "Personagem:", "Semena/Corte", "Vídeo/áudio dublado:", "Link:",
  ];
  const filled = [
    "09/11/2026 10:00", "Pessoa de Teste", "(11) 90000-0000", "Personagem Exemplo",
    "EP 01 - Cena 01", "arquivo.mp4",
    "https://drive.google.com/file/d/videoexemplo123456789/view",
  ];
  const { result } = executar([
    aba("Página1", [], []),
    aba("Respostas ao formulário 1", headers, [filled]),
  ]);
  const data = result();
  assert.equal(data.respostas.length, 1);
  assert.equal(data.respostas[0].dublador, "Pessoa de Teste");
  assert.equal(data.respostas[0].personagem, "Personagem Exemplo");
  assert.equal(data.respostas[0].telefone, "(11) 90000-0000");
  assert.equal(data.respostas[0].semana, "EP 01 - Cena 01");
  assert.equal(data.respostas[0].videoUrl, filled[6]);
  assert.equal(data.sheetName, "Respostas ao formulário 1");
});

test("planilha válida sem respostas informa origem vazia", () => {
  const headers = [
    "Timestamp", "Nome", "Número de telefone / WhatsApp",
    "Personagem", "Semana / Corte", "Link do vídeo / arquivo",
  ];
  const { result } = executar([aba("Form Responses 1", headers, [])]);
  const data = result();
  assert.equal(data.respostas.length, 0);
  assert.equal(data.spreadsheetId, SPREADSHEET_ID);
  assert.match(data.aviso, /não recebeu envios/i);
});

test("ausência de planilha gera erro e não sucesso falso", () => {
  const { result } = executar([], {});
  assert.throws(result, /Nenhuma planilha de respostas/);
});

test("múltiplas planilhas no mesmo diretório não são escolhidas aleatoriamente", () => {
  const { context } = executar([]);
  const files = [
    { getName: () => "[Entregas] Exemplo - A", getId: () => "sheetA" },
    { getName: () => "[Entregas] Exemplo - B", getId: () => "sheetB" },
  ];
  context.MimeType = { GOOGLE_SHEETS: "sheet" };
  context.DriveApp = {
    getFolderById: () => ({
      getFilesByType: () => ({
        hasNext: () => files.length > 0,
        next: () => files.shift(),
      }),
    }),
  };
  assert.throws(
    () => context.localizarPlanilhaNaPasta_("pasta-exemplo", "entregas"),
    /mais de uma planilha/i
  );
});

test("bloqueia planilha de testes cadastrada incorretamente como entregas", () => {
  const headers = [
    "Carimbo de data/hora", "Nome do membro:", "Número de telefone do membro:",
    "Personagem do teste:", "Vídeo do teste:", "Link teste:",
  ];
  const row = [
    "08/11/2026 10:00", "Pessoa Exemplo", "000000000",
    "Personagem", "", "https://drive.google.com/file/d/exemplo/view",
  ];
  const { result } = executar([aba("Respostas ao formulário 1", headers, [row])]);
  assert.throws(result, /respostas de teste de seleção/i);
});

test("em planilha mista mantém somente entregas com semana identificada", () => {
  const headers = [
    "Carimbo de data/hora", "Nome do membro:", "Número de telefone do membro:",
    "Personagem:", "Vídeo do teste:", "Link teste:", "Semana:",
  ];
  const testRow = [
    "09/10/2026 10:00", "Primeiro", "000000001", "Papel", "",
    "https://drive.google.com/file/d/teste/view", "",
  ];
  const deliveryRow = [
    "09/11/2026 11:00", "Segundo", "000000002", "Papel", "",
    "https://drive.google.com/file/d/entrega/view", "Semana 01",
  ];
  const { result } = executar([
    aba("Respostas ao formulário 1", headers, [testRow, deliveryRow]),
  ]);
  const data = result();
  assert.equal(data.respostas.length, 1);
  assert.equal(data.respostas[0].linha, 3);
  assert.equal(data.respostas[0].semana, "Semana 01");
  assert.equal(data.ignoradasSelecao, 1);
  assert.match(data.aviso, /teste\(s\) de seleção foram ignorados/i);
});

test("identifica corte referente à semana em formatos antigos", () => {
  const headers = [
    "Carimbo de data/hora", "Nome do membro:", "Personagem:",
    "Vídeo dublado:", "Corte referente a semana:",
  ];
  const row = [
    "09/11/2026 10:00", "Pessoa Exemplo", "Papel",
    "https://drive.google.com/file/d/video/view", "Semana 03",
  ];
  const { result } = executar([aba("Respostas ao formulário 1", headers, [row])]);
  assert.equal(result().respostas[0].semana, "Semana 03");
});
