export const config = {
  maxDuration: 60,
};

const FORMS_COPIER_URL =
  "https://script.google.com/macros/s/AKfycbzc1AwswaQnSv4PGGvVGqH-8KebR-kmnFIBxygdeKEeVGGULSvxFT1DCOTiberXi7pQ/exec";

const SUPABASE_URL = "https://omgjbafqukpzdhhpdlaa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT";

function responder(res, status, payload) {
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  return res.json(payload);
}

async function validarSessao(req) {
  const authorization = String(req.headers.authorization || "").trim();

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return false;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
  });

  return response.ok;
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return responder(res, 405, { ok: false, error: "Método não permitido." });
  }

  try {
    const sessaoValida = await validarSessao(req);

    if (!sessaoValida) {
      return responder(res, 401, {
        ok: false,
        error: "Sessão inválida ou expirada. Entre novamente no DubWorks Manager.",
      });
    }

    const body = lerBody(req);
    const projectName = String(body?.projectName || "").trim();
    const respostasSelecaoFolderId = String(
      body?.respostasSelecaoFolderId || ""
    ).trim();
    const entregasFolderId = String(body?.entregasFolderId || "").trim();
    const elenco = normalizarElenco(body?.elenco);
    const personagens = normalizarPersonagens(
      Array.isArray(body?.personagens)
        ? body.personagens
        : elenco.map((item) => item.personagem)
    );

    if (!projectName || !respostasSelecaoFolderId || !entregasFolderId) {
      return responder(res, 400, {
        ok: false,
        error:
          "Nome do projeto e IDs das pastas de respostas/entregas são obrigatórios.",
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    let response;

    try {
      response = await fetch(FORMS_COPIER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "preparar_formularios_projeto",
          projectName,
          projetoNome: projectName,
          respostasSelecaoFolderId,
          entregasFolderId,
          personagens,
          characters: personagens,
          selectionCharacters: personagens,
          elenco,
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
      return responder(res, 502, {
        ok: false,
        error:
          data?.error ||
          data?.message ||
          `Apps Script retornou HTTP ${response.status}.`,
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
      personagensEnviados: personagens,
      totalPersonagensEnviados: personagens.length,
    });
  } catch (erro) {
    console.error("Erro no proxy de formulários:", erro);

    const mensagem =
      erro?.name === "AbortError"
        ? "A criação dos formulários excedeu o tempo limite."
        : erro?.message || "Erro interno ao criar os formulários.";

    return responder(res, 500, { ok: false, error: mensagem });
  }
}
