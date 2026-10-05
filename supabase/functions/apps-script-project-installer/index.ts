import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCRIPT_ID =
  Deno.env.get("GOOGLE_PROJECT_FORMS_SCRIPT_ID") ||
  "1v_UND0pJz_Wbd-nOJ7s_B5yguz7aV8oe1oibm7QW7jV4ypBeKqVpVpea";
const DEPLOYMENT_ID =
  Deno.env.get("GOOGLE_PROJECT_FORMS_DEPLOYMENT_ID") ||
  "AKfycbxl9oYifkr1hos9WIvBBrMXHtI0UsV2Rqqf-yacD895fQkvhG5vTmOIn1bkItxw4KWN";
const RAW_CODE_URL =
  Deno.env.get("GOOGLE_PROJECT_FORMS_SOURCE_URL") ||
  "https://raw.githubusercontent.com/NeroXDubworks/Dubworks-Manager/main/integracoes/google-forms-projetos/Code.gs";
const RAW_MANIFEST_URL =
  Deno.env.get("GOOGLE_PROJECT_FORMS_MANIFEST_URL") ||
  "https://raw.githubusercontent.com/NeroXDubworks/Dubworks-Manager/main/integracoes/google-forms-projetos/appsscript.json";

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
    const { email: usuarioEmail } = await exigirDiretoria(req);

    const email = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    if (!email || !privateKey) {
      throw new HttpError(500, "Google secrets missing");
    }

    const sourceResp = await fetch(RAW_CODE_URL);
    if (!sourceResp.ok) {
      throw new Error("Code.gs download failed: " + sourceResp.status);
    }

    const code = await sourceResp.text();
    if (!code.includes("function doGet()") || !code.includes("function doPost(e)")) {
      throw new Error("Code.gs validation failed");
    }

    const manifestResp = await fetch(RAW_MANIFEST_URL);
    if (!manifestResp.ok) {
      throw new Error("appsscript.json download failed: " + manifestResp.status);
    }
    const manifest = await manifestResp.text();
    const manifestData = JSON.parse(manifest);
    if (
      manifestData?.webapp?.executeAs !== "USER_DEPLOYING" ||
      manifestData?.webapp?.access !== "ANYONE_ANONYMOUS"
    ) {
      throw new Error("appsscript.json webapp validation failed");
    }

    const jwt = await createJWT(email, privateKey);
    const token = await getAccessToken(jwt);
    const headers = {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    };

    let r = await fetch(
      "https://script.googleapis.com/v1/projects/" + SCRIPT_ID + "/content",
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          files: [
            { name: "Codigo", type: "SERVER_JS", source: code },
            { name: "appsscript", type: "JSON", source: manifest },
          ],
        }),
      }
    );
    let t = await r.text();
    if (!r.ok) throw new Error("updateContent " + r.status + ": " + t);

    r = await fetch(
      "https://script.googleapis.com/v1/projects/" + SCRIPT_ID + "/versions",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          description: "DubWorks Project Forms v2.0.0",
        }),
      }
    );
    t = await r.text();
    if (!r.ok) throw new Error("createVersion " + r.status + ": " + t);
    const versionNumber = JSON.parse(t).versionNumber;

    r = await fetch(
      "https://script.googleapis.com/v1/projects/" +
        SCRIPT_ID +
        "/deployments/" +
        DEPLOYMENT_ID,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          deploymentConfig: {
            scriptId: SCRIPT_ID,
            versionNumber,
            manifestFileName: "appsscript",
            description: "DubWorks Project Forms v2.0.0",
          },
        }),
      }
    );
    t = await r.text();
    if (!r.ok) throw new Error("updateDeployment " + r.status + ": " + t);

    return json({
      ok: true,
      versionNumber,
      publishedBy: usuarioEmail,
    });
  } catch (e) {
    const status =
      e instanceof HttpError && Number.isFinite(e.status) ? e.status : 500;
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
    // Compatibilidade com projetos ainda usando a chave anon legada.
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

  if (!perfilResp.ok) {
    throw new HttpError(403, "Não foi possível validar seu perfil no Manager.");
  }

  const cargo = String(perfis?.[0]?.cargo || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (cargo !== "diretoria") {
    throw new HttpError(
      403,
      "Somente a diretoria pode publicar o Apps Script de Projetos."
    );
  }

  return { token, email: String(user.email).trim() };
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

async function createJWT(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope:
      "https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const h = b64(new TextEncoder().encode(JSON.stringify(header)));
  const p = b64(new TextEncoder().encode(JSON.stringify(payload)));
  const data = h + "." + p;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pem(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );
  return data + "." + b64(new Uint8Array(sig));
}

async function getAccessToken(jwt: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) {
    throw new Error(d.error_description || d.error || "OAuth failed");
  }
  return d.access_token;
}

function b64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pem(key: string) {
  const clean = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
