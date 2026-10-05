import { ApiAuthError, exigirAcessoProjeto } from "./_shared/projectAuth.js";
import {
  PROJECT_FORMS_SCRIPT_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./_shared/runtimeConfig.js";

export const config = {
  maxDuration: 300,
};

function responder(res, status, payload) {
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  return res.json(payload);
}

function lerBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizarPersonagens(valor) {
  if (!Array.isArray(valor)) return [];

  const vistos = new Set();
  const resultado = [];

  for (const item of valor) {
    const personagem = String(item || "").trim();
    const chave = personagem.toLocaleLowerCase("pt-BR");

    if (!personagem || vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(personagem);
  }

  return resultado;
}

function normalizarElenco(valor) {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => ({
      personagem: String(item?.personagem || "").trim(),
      dublador: String(item?.dublador || "").trim(),
      telefone_dublador: String(item?.telefone_dublador || "").trim(),
      funcao: String(item?.funcao || "").trim(),
    }))
    .filter((item) => item.personagem);
}

async function prepararTemplatesFormsNoDrive(params) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/google-drive-create-structure`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        action: "preparar_templates_forms",
        projectId: params.projectId,
        projectName: params.projectName,
        respostasSelecaoFolderId: params.respostasSelecaoFolderId,
        entregasFolderId: params.entregasFolderId,
        falasTesteFolderId: params.falasTesteFolderId || "",
        cortesProjetoFolderId: params.cortesProjetoFolderId || "",
        existingSelectionFormId: params.existingSelectionFormId || "",
        existingDeliveriesFormId: params.existingDeliveriesFormId || "",
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.ok === false || data.error) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Não foi possível preparar os formulários com upload no Google Drive."
    );
  }

  return data;
}

function limparRespostaGoogle(texto) {
  return String(texto || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return responder(res, 405, { ok: false, error: "Método não permitido." });
  }

  try {
    const body = lerBody(req);
    const projectId = String(body?.projectId || "").trim();
    const auth = await exigirAcessoProjeto(req, projectId, "edit");
    const accessToken = auth.token;
    const projectName = String(body?.projectName || "").trim();
    const respostasSelecaoFolderId = String(
      body?.respostasSelecaoFolderId || ""
    ).trim();
    const entregasFolderId = String(body?.entregasFolderId || "").trim();
    const elenco = normalizarElenco(body?.elenco);
    const personagensSelecao = normalizarPersonagens(
      Array.isArray(body?.personagensSelecao)
        ? body.personagensSelecao
        : Array.isArray(body?.personagens)
        ? body.personagens
        : elenco.map((item) => item.personagem)
    );
    const personagensEntregas = normalizarPersonagens(
      Array.isArray(body?.personagensEntregas)
        ? body.personagensEntregas
        : elenco.map((item) => item.personagem)
    );
    const personagens = personagensSelecao;

    if (!projectName || !respostasSelecaoFolderId || !entregasFolderId) {
      return responder(res, 400, {
        ok: false,
        error:
          "Nome do projeto e IDs das pastas de respostas/entregas são obrigatórios.",
      });
    }

    const capaUrl = String(body?.capaUrl || "").trim();
    const projectType = String(body?.projectType || "Projeto").trim() || "Projeto";
    const existingSelectionFormId = String(
      body?.existingSelectionFormId || body?.formSelecaoId || body?.formSelecao || ""
    ).trim();
    const existingDeliveriesFormId = String(
      body?.existingDeliveriesFormId || body?.formEntregasId || body?.formEntregas || ""
    ).trim();
    const falasTesteFolderId = String(body?.falasTesteFolderId || "").trim();
    const cortesProjetoFolderId = String(body?.cortesProjetoFolderId || "").trim();
    const episodios = Array.isArray(body?.episodios)
      ? body.episodios.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const templates = await prepararTemplatesFormsNoDrive({
      accessToken,
      projectId,
      projectName,
      respostasSelecaoFolderId,
      entregasFolderId,
      falasTesteFolderId,
      cortesProjetoFolderId,
      existingSelectionFormId,
      existingDeliveriesFormId,
    });

    const selectionFormIdComUpload = String(
      templates?.formSelecaoId || existingSelectionFormId || ""
    ).trim();
    const deliveriesFormIdComUpload = String(
      templates?.formEntregasId || existingDeliveriesFormId || ""
    ).trim();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 270000);

    let response;

    try {
      response = await fetch(PROJECT_FORMS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "preparar_formularios_projeto",
          access_token: accessToken,
          projectId,
          projectName,
          projetoNome: projectName,
          respostasSelecaoFolderId,
          entregasFolderId,
          existingSelectionFormId: selectionFormIdComUpload,
          existingDeliveriesFormId: deliveriesFormIdComUpload,
          episodios,
          personagens: personagensSelecao,
          personagensSelecao,
          personagensEntregas,
          characters: personagensSelecao,
          selectionCharacters: personagensSelecao,
          deliveryCharacters: personagensEntregas,
          elenco,
          capaUrl,
          coverUrl: capaUrl,
          projectType,
        }),
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const texto = await response.text();
    let data = null;

    try {
      data = texto ? JSON.parse(texto) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const detalheGoogle = limparRespostaGoogle(texto);
      const origem = response.url ? ` URL final: ${response.url}` : "";

      return responder(res, 502, {
        ok: false,
        error:
          data?.error ||
          data?.message ||
          `Apps Script retornou HTTP ${response.status}.${origem}${
            detalheGoogle ? ` Resposta do Google: ${detalheGoogle}` : ""
          }`,
      });
    }

    if (!data || typeof data !== "object") {
      return responder(res, 502, {
        ok: false,
        error:
          "O Apps Script respondeu, mas não devolveu JSON válido. Verifique a publicação do Web App e as permissões de acesso.",
      });
    }

    if (data.error || data.ok === false) {
      return responder(res, 502, {
        ok: false,
        error: String(
          data.error || data.message || "Falha ao copiar os formulários."
        ),
      });
    }

    return responder(res, 200, {
      ...data,
      personagensEnviados: personagensSelecao,
      personagensEntregasEnviados: personagensEntregas,
      totalPersonagensEnviados: personagensSelecao.length,
    });
  } catch (erro) {
    if (erro instanceof ApiAuthError) {
      return responder(res, erro.status, { ok: false, error: erro.message });
    }

    console.error("Erro no proxy de formulários:", erro);

    const mensagem =
      erro?.name === "AbortError"
        ? "A criação dos formulários excedeu o tempo limite."
        : erro?.message || "Erro interno ao criar os formulários.";

    return responder(res, 500, { ok: false, error: mensagem });
  }
}
