export const config = {
  maxDuration: 60,
};

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzc1AwswaQnSv4PGGvVGqH-8KebR-kmnFIBxygdeKEeVGGULSvxFT1DCOTiberXi7pQ/exec";

const SUPABASE_URL = "https://omgjbafqukpzdhhpdlaa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT";

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
    const projectId = String(body?.projectId || "").trim();
    const projectName = String(body?.projectName || "").trim();
    const projetoFolderId = String(body?.projetoFolderId || "").trim();
    const finalizadosFolderId = String(body?.finalizadosFolderId || "").trim();
    const videoEditorLink = String(body?.videoEditorLink || "").trim();

    if (!projetoFolderId || !finalizadosFolderId) {
      return responder(res, 400, {
        ok: false,
        error: "As pastas 2 | Projeto e 3 | Finalizado são obrigatórias.",
      });
    }

    if (projetoFolderId === finalizadosFolderId) {
      return responder(res, 400, {
        ok: false,
        error: "A pasta de origem não pode ser a mesma pasta de Finalizado.",
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    let response;

    try {
      response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "finalizar_projeto",
          projectId,
          projectName,
          projetoNome: projectName,
          projetoFolderId,
          projectFolderId: projetoFolderId,
          sourceFolderId: projetoFolderId,
          finalizadosFolderId,
          finalFolderId: finalizadosFolderId,
          destinationFolderId: finalizadosFolderId,
          videoEditorLink,
          moveVideosOnly: true,
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
        error: "O Apps Script não devolveu JSON válido ao finalizar o projeto.",
      });
    }

    if (data.error || data.ok === false) {
      return responder(res, 502, {
        ok: false,
        error: String(
          data.error || data.message || "O Apps Script não conseguiu mover os vídeos."
        ),
      });
    }

    return responder(res, 200, {
      ok: true,
      ...data,
    });
  } catch (erro) {
    console.error("Erro ao finalizar arquivos do projeto:", erro);

    const mensagem =
      erro?.name === "AbortError"
        ? "A movimentação dos vídeos excedeu o tempo limite."
        : erro?.message || "Erro interno ao mover os vídeos do projeto.";

    return responder(res, 500, { ok: false, error: mensagem });
  }
}
