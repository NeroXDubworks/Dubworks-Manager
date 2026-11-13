import crypto from "node:crypto";
import {
  SUPABASE_URL,
} from "./_shared/runtimeConfig.js";

function responder(res, status, body) {
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  return res.json(body);
}

function tokenValido(recebido, esperado) {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(String(recebido), "utf8");
  const b = Buffer.from(String(esperado), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return responder(res, 405, { ok: false, error: "Método não permitido." });
  }

  const secret = process.env.DUBWORKS_DELIVERY_WEBHOOK_SECRET;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceRole) {
    return responder(res, 503, { ok: false, error: "Integração de notificações não configurada." });
  }
  if (!tokenValido(req.headers["x-dubworks-webhook-secret"], secret)) {
    return responder(res, 401, { ok: false, error: "Não autorizado." });
  }

  const body = typeof req.body === "string"
    ? (() => { try { return JSON.parse(req.body); } catch { return null; } })()
    : req.body;
  const projetoId = Number(body?.projectId);
  const episodioId = Number(body?.episodioId);
  const formId = String(body?.formId || "").trim();
  const respostaId = String(body?.respostaId || "").trim();
  if (!Number.isSafeInteger(projetoId) || projetoId <= 0 ||
      !Number.isSafeInteger(episodioId) || episodioId <= 0 ||
      !/^[\w-]{12,180}$/.test(formId) || !/^[\w-]{5,200}$/.test(respostaId)) {
    return responder(res, 400, { ok: false, error: "Envio inválido." });
  }

  try {
    const headers = {
      apikey: serviceRole,
      Authorization: "Bearer " + serviceRole,
      "Content-Type": "application/json",
    };
    const q = new URLSearchParams({
      select: "id,form_entregas_id",
      id: "eq." + episodioId,
      projeto_id: "eq." + projetoId,
      limit: "1",
    });
    const confirma = await fetch(SUPABASE_URL + "/rest/v1/projeto_episodios?" + q.toString(), { headers });
    const resultado = await confirma.json().catch(() => []);
    if (!confirma.ok || !Array.isArray(resultado) ||
        !resultado[0] || resultado[0].form_entregas_id !== formId) {
      return responder(res, 403, { ok: false, error: "Este formulário não está vinculado ao episódio." });
    }

    const campo = (valor, limite = 500) => String(valor || "").trim().slice(0, limite);
    const entrega = {
      projeto_id: projetoId,
      episodio_id: episodioId,
      resposta_id: formId + ":" + respostaId,
      personagem: campo(body.personagem),
      dublador: campo(body.dublador),
      telefone: campo(body.telefone, 100),
      semana: campo(body.semana, 180),
      video_url: campo(body.videoUrl, 2000),
      comentario: campo(body.comentario, 1000),
      status: "pendente",
      data_envio: campo(body.timestamp, 100),
    };
    if (!entrega.personagem || !entrega.dublador) {
      return responder(res, 400, { ok: false, error: "A entrega deve informar personagem e dublador." });
    }

    // Ignora replay da mesma resposta, sem desfazer avaliações anteriores.
    const gravacao = await fetch(
      SUPABASE_URL + "/rest/v1/entregas_producao?on_conflict=projeto_id,resposta_id",
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify([entrega]),
      }
    );
    if (!gravacao.ok) {
      return responder(res, 502, { ok: false, error: "Falha ao registrar a nova entrega." });
    }
    return responder(res, 200, { ok: true, episodioId });
  } catch (error) {
    console.error("Falha de ingestão de entregas:", error?.message || error);
    return responder(res, 500, { ok: false, error: "Erro ao processar entrega." });
  }
}
