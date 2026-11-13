import { ApiAuthError, exigirAcessoProjeto } from "./_shared/projectAuth.js";
import {
  PROJECT_FORMS_SCRIPT_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./_shared/runtimeConfig.js";

export const config = { maxDuration: 180 };

function responder(res, status, payload) {
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  return res.json(payload);
}

function lerBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(String(req.body || "")); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return responder(res, 405, { ok: false, error: "Método não permitido." });
  }

  try {
    const body = lerBody(req);
    const projectId = String(body?.projectId || "").trim();
    const episodeId = Number(body?.episodeId);
    const auth = await exigirAcessoProjeto(req, projectId, "edit");
    if (!Number.isInteger(episodeId) || episodeId <= 0) {
      return responder(res, 400, { ok: false, error: "Episódio inválido." });
    }

    // Usa somente pastas e IDs já registrados e autorizados no banco.
    const params = new URLSearchParams({
      select: "id,projeto_id,numero,titulo,pasta_entregas_id,form_entregas_id",
      id: "eq." + episodeId,
      projeto_id: "eq." + Number(projectId),
      limit: "1",
    });
    const responseEpisode = await fetch(
      SUPABASE_URL + "/rest/v1/projeto_episodios?" + params.toString(),
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + auth.token,
        },
      }
    );
    const episodes = await responseEpisode.json().catch(() => []);
    const episode = responseEpisode.ok && Array.isArray(episodes) ? episodes[0] : null;
    if (!episode) {
      return responder(res, 403, { ok: false, error: "Episódio não encontrado ou sem permissão." });
    }
    if (!episode.pasta_entregas_id) {
      return responder(res, 400, { ok: false, error: "Crie primeiro a pasta de Entregas deste episódio no Google Drive." });
    }

    const personagens = Array.isArray(body?.personagens)
      ? [...new Set(body.personagens.map((x) => String(x || "").trim()).filter(Boolean))]
      : [];
    if (!personagens.length) {
      return responder(res, 400, { ok: false, error: "Adicione personagens ao banco/elenco antes de preparar o Forms." });
    }

    const scriptResponse = await fetch(PROJECT_FORMS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "preparar_formulario_episodio",
        access_token: auth.token,
        projectId,
        projectName: String(body?.projectName || "").trim(),
        episodioId: episode.id,
        episodioNumero: episode.numero,
        episodioTitulo: episode.titulo,
        entregasFolderId: episode.pasta_entregas_id,
        existingDeliveriesFormId: episode.form_entregas_id || "",
        personagensEntregas: personagens,
        capaUrl: String(body?.capaUrl || "").trim(),
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(150000),
    });

    const respostaTexto = await scriptResponse.text();
    let data;
    try { data = JSON.parse(respostaTexto); } catch {
      return responder(res, 502, { ok: false, error: "O Apps Script não retornou JSON. Confirme a nova publicação do Web App." });
    }
    if (!scriptResponse.ok || !data?.ok || data?.error) {
      return responder(res, 502, { ok: false, error: data?.error || "Falha ao preparar o Forms do episódio." });
    }
    return responder(res, 200, data);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return responder(res, error.status, { ok: false, error: error.message });
    }
    return responder(res, 500, { ok: false, error: error?.message || "Erro ao preparar o Forms do episódio." });
  }
}
