import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROJECT_FORMS_SCRIPT_URL =
  Deno.env.get("GOOGLE_PROJECT_FORMS_SCRIPT_URL") ||
  Deno.env.get("GOOGLE_FORMS_COPIER_URL") ||
  "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const body = await req.json();

    // Mantém a compatibilidade de leitura das respostas. Esta integração usa
    // exclusivamente o Apps Script de Projetos/Drive/Forms, nunca o de Advertências.
    if (body?.action) {
      if (!PROJECT_FORMS_SCRIPT_URL) {
        return json(
          {
            error:
              "GOOGLE_PROJECT_FORMS_SCRIPT_URL não configurada para ações de formulários.",
          },
          500
        );
      }

      const resultado = await chamarAppsScript(body);
      return json(resultado, 200);
    }

    const projectName = limparNomeProjeto(body?.projectName);
    const projectType = normalizarTipo(body?.projectType);
    const leaderEmail = String(body?.leaderEmail || "").trim();
    const editorEmail = String(body?.editorEmail || "").trim();
    const existingFolderId = extrairId(body?.existingFolderId);

    if (!projectName) {
      return json({ error: "Nome do projeto ausente." }, 400);
    }

    const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const ROOT_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !ROOT_FOLDER_ID) {
      return json(
        { error: "Secrets principais do Google Drive não configurados." },
        500
      );
    }

    const jwt = await createJWT(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY);
    const accessToken = await getAccessToken(jwt);

    let pastaProjeto: DriveFolder;

    if (existingFolderId) {
      // Ao editar Projeto/Parceria depois da criação, nunca movemos a estrutura
      // automaticamente para outra raiz. O ID salvo é sempre reutilizado.
      pastaProjeto = {
        id: existingFolderId,
        name: await obterNomeArquivo(existingFolderId, accessToken),
        webViewLink: `https://drive.google.com/drive/folders/${existingFolderId}`,
        reused: true,
      };
    } else {
      const rootEspecificaEnv =
        projectType === "Parceria"
          ? Deno.env.get("GOOGLE_DRIVE_PARTNERSHIPS_ROOT_FOLDER_ID")
          : Deno.env.get("GOOGLE_DRIVE_PROJECTS_ROOT_FOLDER_ID");

      const raiz =
        rootEspecificaEnv
          ? {
              id: rootEspecificaEnv,
              name: projectType === "Parceria" ? "Parcerias" : "Projetos",
              webViewLink: `https://drive.google.com/drive/folders/${rootEspecificaEnv}`,
              reused: true,
            }
          : await obterOuCriarPasta(
              projectType === "Parceria" ? ["Parcerias"] : ["Projetos"],
              ROOT_FOLDER_ID,
              accessToken,
              projectType === "Parceria" ? "Parcerias" : "Projetos"
            );

      const prefixo = projectType === "Parceria" ? "[Parceria]" : "[Projeto]";
      pastaProjeto = await obterOuCriarPasta(
        [`${prefixo} ${projectName}`],
        raiz.id,
        accessToken,
        `${prefixo} ${projectName}`
      );
    }

    if (emailValido(leaderEmail)) {
      await darPermissaoMelhorEsforco(
        pastaProjeto.id,
        leaderEmail,
        "writer",
        accessToken
      );
    }

    if (emailValido(editorEmail)) {
      await darPermissaoMelhorEsforco(
        pastaProjeto.id,
        editorEmail,
        "writer",
        accessToken
      );
    }

    const pastaSelecao = await obterOuCriarPasta(
      ["1 | Seleção", "01 | Seleção"],
      pastaProjeto.id,
      accessToken,
      "1 | Seleção"
    );

    const pastaProjetoInterna = await obterOuCriarPasta(
      ["2 | Projeto", "02 | Projeto"],
      pastaProjeto.id,
      accessToken,
      "2 | Projeto"
    );

    const pastaFinalizado = await obterOuCriarPasta(
      ["3 | Finalizado", "03 | Finalizado"],
      pastaProjeto.id,
      accessToken,
      "3 | Finalizado"
    );

    // Esta pasta é manual. O script NÃO coloca Form, planilha ou respostas aqui.
    const falasTeste = await obterOuCriarPasta(
      [
        "Seleção (Testes)",
        "1.1 | Falas Teste",
        "[Seleção] Falas Teste",
        "Falas Teste",
      ],
      pastaSelecao.id,
      accessToken,
      "Seleção (Testes)"
    );

    const respostasSelecao = await obterOuCriarPasta(
      [
        "Seleção - Respostas",
        "1.2 | Respostas Seleção",
        "[Seleção] Respostas",
        "Respostas Seleção",
      ],
      pastaSelecao.id,
      accessToken,
      "Seleção - Respostas"
    );

    const cortesProjeto = await obterOuCriarPasta(
      [
        "Cortes Projeto",
        "2.1 | Cortes Projeto",
        "[Projeto] Cortes Projeto",
      ],
      pastaProjetoInterna.id,
      accessToken,
      "Cortes Projeto"
    );

    const advertencia = await obterOuCriarPasta(
      [
        "Advertência",
        "2.2 | Advertência",
        "[Projeto] Advertência",
      ],
      pastaProjetoInterna.id,
      accessToken,
      "Advertência"
    );

    const entregasProjeto = await obterOuCriarPasta(
      [
        "Entregas Projeto",
        "2.3 | Entregas Projeto",
        "[Projeto] Entregas",
        "[Projeto] Entregas Projeto",
      ],
      pastaProjetoInterna.id,
      accessToken,
      "Entregas Projeto"
    );

    return json(
      {
        ok: true,
        projectName,
        projectType,
        pasta: pastaProjeto.webViewLink,
        pastaId: pastaProjeto.id,
        pastaReutilizada: pastaProjeto.reused,

        selecao: pastaSelecao.webViewLink,
        selecaoId: pastaSelecao.id,

        projeto: pastaProjetoInterna.webViewLink,
        projetoId: pastaProjetoInterna.id,

        finalizados: pastaFinalizado.webViewLink,
        finalizadosId: pastaFinalizado.id,

        falasTeste: falasTeste.webViewLink,
        falasTesteId: falasTeste.id,

        respostasSelecao: respostasSelecao.webViewLink,
        respostasSelecaoId: respostasSelecao.id,

        cortesProjeto: cortesProjeto.webViewLink,
        cortesProjetoId: cortesProjeto.id,

        Advertencia: advertencia.webViewLink,
        AdvertenciaId: advertencia.id,

        entregasProjeto: entregasProjeto.webViewLink,
        entregasProjetoId: entregasProjeto.id,

        // Forms ficam deliberadamente fora desta Edge Function.
        // driveFormsBootstrapV2 -> /api/forms-copy é o único criador/sincronizador.
        formsDelegadosAoProxy: true,
      },
      200
    );
  } catch (err) {
    console.error("Erro google-drive-create-structure:", err);
    return json({ error: String((err as any)?.message || err) }, 500);
  }
});

type DriveFolder = {
  id: string;
  name: string;
  webViewLink: string;
  reused: boolean;
};

function limparNomeProjeto(valor: unknown) {
  return String(valor || "")
    .replace(/^\s*\[(Projeto|Parceria)\]\s*/i, "")
    .trim();
}

function normalizarTipo(valor: unknown) {
  const texto = String(valor || "Projeto").trim().toLocaleLowerCase("pt-BR");
  return texto.includes("parceria") ? "Parceria" : "Projeto";
}

function emailValido(email: string) {
  return Boolean(email && email.includes("@"));
}

function extrairId(valor: unknown) {
  const texto = String(valor || "").trim();
  const match = texto.match(/[-\w]{20,}/);
  return match?.[0] || "";
}

function escaparDriveQuery(valor: string) {
  return valor.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function obterOuCriarPasta(
  aliases: string[],
  parentId: string,
  token: string,
  nomeNovo: string
): Promise<DriveFolder> {
  const nomes = aliases
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  for (const nome of nomes) {
    const encontrada = await encontrarPastaFilha(parentId, nome, token);
    if (encontrada) {
      return {
        id: encontrada.id,
        name: encontrada.name || nome,
        webViewLink:
          encontrada.webViewLink ||
          `https://drive.google.com/drive/folders/${encontrada.id}`,
        reused: true,
      };
    }
  }

  return criarPasta(nomeNovo, parentId, token);
}

async function encontrarPastaFilha(
  parentId: string,
  nome: string,
  token: string
): Promise<any | null> {
  const q = [
    `'${escaparDriveQuery(parentId)}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `name = '${escaparDriveQuery(nome)}'`,
  ].join(" and ");

  const url =
    "https://www.googleapis.com/drive/v3/files" +
    `?q=${encodeURIComponent(q)}` +
    "&fields=files(id,name,webViewLink)&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true";

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Erro ao procurar pasta ${nome}.`
    );
  }

  return Array.isArray(data.files) && data.files.length ? data.files[0] : null;
}

async function criarPasta(
  nome: string,
  parentId: string,
  token: string
): Promise<DriveFolder> {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nome,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(
      data?.error?.message || `Erro ao criar pasta ${nome}.`
    );
  }

  return {
    id: data.id,
    name: data.name || nome,
    webViewLink:
      data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
    reused: false,
  };
}

async function obterNomeArquivo(fileId: string, token: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Não consegui abrir a pasta do projeto existente."
    );
  }
  return String(data.name || "");
}

async function darPermissaoMelhorEsforco(
  fileId: string,
  email: string,
  role: "reader" | "writer",
  token: string
) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          type: "user",
          emailAddress: email,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      console.warn("Não foi possível compartilhar a pasta:", data);
    }
  } catch (err) {
    console.warn("Falha ao compartilhar pasta:", err);
  }
}

async function chamarAppsScript(payload: any) {
  const response = await fetch(PROJECT_FORMS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  const texto = await response.text();
  let data: any = null;

  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = null;
  }

  if (!response.ok || !data) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Apps Script de Projetos retornou HTTP ${response.status}.`
    );
  }

  if (data.error || data.ok === false) {
    throw new Error(
      String(data.error || data.message || "Falha no Apps Script de Projetos.")
    );
  }

  return data;
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
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Header = base64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const base64Payload = base64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const data = `${base64Header}.${base64Payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );

  return `${data}.${base64Url(new Uint8Array(signature))}`;
}

async function getAccessToken(jwt: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      data?.error_description || data?.error || "Erro ao autenticar no Google."
    );
  }

  return data.access_token;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
