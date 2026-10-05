import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "POST required" }, 405);
  }

  try {
    await exigirDiretoria(req);

    return json(
      {
        ok: false,
        manualRequired: true,
        error:
          "A publicação automática foi desativada porque a Apps Script API exige OAuth de um usuário com acesso ao script. Use, no Manager, Abrir Apps Script + Copiar manifesto + Copiar instalador.",
        scriptEditorUrl:
          "https://script.google.com/home/projects/1v_UND0pJz_Wbd-nOJ7s_B5yguz7aV8oe1oibm7QW7jV4ypBeKqVpVpea/edit",
      },
      200
    );
  } catch (e) {
    const status =
      e instanceof HttpError && Number.isFinite(e.status) ? e.status : 500;
    console.error("apps-script-project-installer:", e);
    return json(
      { ok: false, error: String((e as any)?.message || e) },
      status
    );
  }
});

function publishableKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (keys?.default) return String(keys.default);
  } catch {
    // fallback legado
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

async function exigirDiretoria(req: Request) {
  const authorization = String(req.headers.get("Authorization") || "").trim();
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token || token.startsWith("sb_")) {
    throw new HttpError(401, "Sessão de usuário obrigatória.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const apikey = publishableKey();

  if (!supabaseUrl || !apikey) {
    throw new HttpError(500, "Configuração de autenticação do Supabase ausente.");
  }

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey,
    },
  });
  const user = await userResp.json().catch(() => null);

  if (!userResp.ok || !user?.email) {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }

  const params = new URLSearchParams({
    select: "cargo",
    login: "eq." + String(user.email).trim(),
    limit: "1",
  });
  const perfilResp = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey,
      },
    }
  );
  const perfis = await perfilResp.json().catch(() => []);
  const cargo = String(perfis?.[0]?.cargo || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (!perfilResp.ok || cargo !== "diretoria") {
    throw new HttpError(
      403,
      "Somente a diretoria pode administrar a integração de Forms."
    );
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json;charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
