import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROJECT_FORMS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbx4bopNipOGkZk5eEGPaqLVtLYJ_exZmxCni10EflhaeTxLNEXt79OcpCT0h8m5PeYC/exec";

const FORM_TEMPLATE_SELECTION_WITH_UPLOAD =
  Deno.env.get("GOOGLE_FORMS_SELECTION_UPLOAD_TEMPLATE_ID") ||
  "1v7atBpqrEH7LMGbvRlEZyD8U0YyhfPK4k_kPYUqPoM0";
const FORM_TEMPLATE_DELIVERIES_WITH_UPLOAD =
  Deno.env.get("GOOGLE_FORMS_DELIVERIES_UPLOAD_TEMPLATE_ID") ||
  "1NUqciq8IgRdgKmFQA5wIFFP7eG46kaTqd4-qbpoLlpA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const body = await req.json();
    const usuario = await validarUsuarioAutenticado(req);
    const projectId = Number(body?.projectId);

    if (!Number.isFinite(projectId) || projectId <= 0) {
      throw new HttpError(
        400,
        "Projeto não informado para autorizar a integração do Google Drive."
      );
    }

    const action = String(body?.action || "").trim();
    const modoAcesso =
      action === "ler_respostas_selecao" ||
      action === "ler_respostas_entregas"
        ? "view"
        : "edit";

    await exigirAcessoProjeto(projectId, usuario, modoAcesso);

    if (body?.action === "preparar_templates_forms") {
      const accessToken = await obterGoogleDriveAccessToken();
      const resultado = await prepararTemplatesForms(body, accessToken);
      return json(resultado, 200);
    }

    if (body?.action === "criar_estrutura_episodio") {
      const accessToken = await obterGoogleDriveAccessToken();
      const resultado = await criarEstruturaEpisodio(body, accessToken);
      return json(resultado, 200);
    }

    if (body?.action === "finalizar_episodio") {
      const accessToken = await obterGoogleDriveAccessToken();
      const origemId = extrairId(body?.pastaDriveId || body?.origemId);
      const destinoId = extrairId(body?.pastaFinalizadoId || body?.destinoId);
      if (!origemId || !destinoId) {
        return json(
          { error: "Pastas de origem e destino do episódio não informadas." },
          400
        );
      }
      const movidos = await moverConteudoPasta(origemId, destinoId, accessToken);
      return json({ ok: true, movidos, origemId, destinoId }, 200);
    }

    if (body?.action === "reabrir_episodio") {
      const accessToken = await obterGoogleDriveAccessToken();
      const origemId = extrairId(body?.pastaFinalizadoId || body?.origemId);
      const destinoId = extrairId(body?.pastaDriveId || body?.destinoId);
      if (!origemId || !destinoId) {
        return json(
          { error: "Pastas de origem e destino do episódio não informadas." },
          400
        );
      }
      const movidos = await moverConteudoPasta(origemId, destinoId, accessToken);
      return json({ ok: true, movidos, origemId, destinoId }, 200);
    }

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

      const resultado = await chamarAppsScript({
        ...body,
        access_token: usuario.token,
      });
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

    const ROOT_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");

    if (!ROOT_FOLDER_ID) {
      return json(
        { error: "Pasta raiz do Google Drive não configurada." },
        500
      );
    }

    const accessToken = await obterGoogleDriveAccessToken();

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
      "[Seleção] Falas Teste"
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
      "[Seleção] Respostas"
    );

    const cortesProjeto = await obterOuCriarPasta(
      [
        "Cortes Projeto",
        "2.1 | Cortes Projeto",
        "[Projeto] Cortes Projeto",
      ],
      pastaProjetoInterna.id,
      accessToken,
      "[Projeto] Cortes Projeto"
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
      "[Projeto] Entregas"
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

        entregasProjeto: entregasProjeto.webViewLink,
        entregasProjetoId: entregasProjeto.id,

        // Forms ficam deliberadamente fora desta Edge Function.
        // O frontend orquestra explicitamente a sincronização via /api/forms-copy.
        formsDelegadosAoProxy: true,
      },
      200
    );
  } catch (err) {
    console.error("Erro google-drive-create-structure:", err);
    const status =
      err instanceof HttpError && Number.isFinite(err.status) ? err.status : 500;
    return json({ error: String((err as any)?.message || err) }, status);
  }
});

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function obterPublishableKey() {
  try {
    const chaves = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (chaves?.default) return String(chaves.default);
  } catch {
    // fallback para projetos ainda compatíveis com a chave anon legada.
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

type UsuarioAutenticado = {
  token: string;
  id: string;
  email: string;
};

async function validarUsuarioAutenticado(
  req: Request
): Promise<UsuarioAutenticado> {
  const authorization = String(req.headers.get("Authorization") || "").trim();
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token || token.startsWith("sb_")) {
    throw new HttpError(401, "Sessão de usuário obrigatória.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = obterPublishableKey();

  if (!supabaseUrl || !publishableKey) {
    throw new HttpError(500, "Configuração de autenticação do Supabase ausente.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    },
  });

  if (!response.ok) {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }

  const user = await response.json().catch(() => null);
  const email = String(user?.email || "").trim();

  if (!user?.id || !email) {
    throw new HttpError(401, "Usuário autenticado não identificado.");
  }

  return {
    token,
    id: String(user.id),
    email,
  };
}

function normalizarAcesso(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function exigirAcessoProjeto(
  projectId: number,
  usuario: UsuarioAutenticado,
  modo: "view" | "edit"
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = obterPublishableKey();

  if (!supabaseUrl || !publishableKey) {
    throw new HttpError(500, "Configuração de autorização do Supabase ausente.");
  }

  const headers = {
    Authorization: `Bearer ${usuario.token}`,
    apikey: publishableKey,
  };

  const projetoParams = new URLSearchParams({
    select: "id,lider,editor",
    id: `eq.${projectId}`,
    limit: "1",
  });
  const projetoResp = await fetch(
    `${supabaseUrl}/rest/v1/projetos?${projetoParams.toString()}`,
    { headers }
  );
  const projetos = await projetoResp.json().catch(() => []);

  if (!projetoResp.ok || !Array.isArray(projetos) || !projetos[0]) {
    throw new HttpError(403, "Você não possui acesso a este projeto.");
  }

  if (modo === "view") return;

  const perfilParams = new URLSearchParams({
    select: "cargo,nome,login,vinculo",
    login: `ilike.${usuario.email}`,
    limit: "1",
  });
  const perfilResp = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?${perfilParams.toString()}`,
    { headers }
  );
  const perfis = await perfilResp.json().catch(() => []);
  const perfil =
    perfilResp.ok && Array.isArray(perfis) && perfis.length ? perfis[0] : null;

  if (!perfil) {
    throw new HttpError(
      403,
      "Seu perfil do DubWorks Manager não foi encontrado."
    );
  }

  const projeto = projetos[0];
  const cargo = normalizarAcesso(perfil.cargo);
  const identidades = new Set(
    [perfil.vinculo, perfil.login, perfil.nome]
      .map(normalizarAcesso)
      .filter(Boolean)
  );

  const permitido =
    cargo === "diretoria" ||
    cargo === "adm" ||
    ((cargo === "lider" || cargo === "lider_treinamento") &&
      identidades.has(normalizarAcesso(projeto.lider))) ||
    (cargo === "editor" &&
      identidades.has(normalizarAcesso(projeto.editor)));

  if (!permitido) {
    throw new HttpError(
      403,
      "Você não possui permissão para alterar a estrutura deste projeto."
    );
  }
}

async function obterGoogleDriveAccessToken() {
  const email = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!email || !privateKey) {
    throw new HttpError(500, "Secrets do Google Drive não configurados.");
  }

  const jwt = await createJWT(email, privateKey);
  return getAccessToken(jwt);
}

async function prepararTemplatesForms(body: any, token: string) {
  const projectName = limparNomeProjeto(body?.projectName);
  const respostasSelecaoFolderId = extrairId(body?.respostasSelecaoFolderId);
  const entregasFolderId = extrairId(body?.entregasFolderId);
  const falasTesteFolderId = extrairId(body?.falasTesteFolderId);
  const cortesProjetoFolderId = extrairId(body?.cortesProjetoFolderId);

  if (!projectName || !respostasSelecaoFolderId || !entregasFolderId) {
    throw new HttpError(
      400,
      "Nome do projeto e pastas de Seleção/Entregas são obrigatórios."
    );
  }

  await renomearArquivoDrive(
    respostasSelecaoFolderId,
    "[Seleção] Respostas",
    token
  );
  await renomearArquivoDrive(
    entregasFolderId,
    "[Projeto] Entregas",
    token
  );

  if (falasTesteFolderId) {
    await renomearArquivoDrive(
      falasTesteFolderId,
      "[Seleção] Falas Teste",
      token
    );
  }

  if (cortesProjetoFolderId) {
    await renomearArquivoDrive(
      cortesProjetoFolderId,
      "[Projeto] Cortes Projeto",
      token
    );
  }

  const formSelecao = await garantirFormularioComUpload({
    tipo: "selecao",
    projectName,
    pastaDestinoId: respostasSelecaoFolderId,
    templateId: FORM_TEMPLATE_SELECTION_WITH_UPLOAD,
    token,
  });

  const formEntregas = await garantirFormularioComUpload({
    tipo: "entregas",
    projectName,
    pastaDestinoId: entregasFolderId,
    templateId: FORM_TEMPLATE_DELIVERIES_WITH_UPLOAD,
    token,
  });

  if (falasTesteFolderId) {
    await retirarFormulariosDaPastaFalasTeste(
      falasTesteFolderId,
      respostasSelecaoFolderId,
      projectName,
      formSelecao.id,
      token
    );
  }

  return {
    ok: true,
    formSelecaoId: formSelecao.id,
    formEntregasId: formEntregas.id,
    reused: {
      selecao: formSelecao.reused,
      entregas: formEntregas.reused,
    },
  };
}

async function garantirFormularioComUpload(params: {
  tipo: "selecao" | "entregas";
  projectName: string;
  pastaDestinoId: string;
  templateId: string;
  token: string;
}) {
  const titulo =
    params.tipo === "selecao"
      ? `[Seleção] ${params.projectName}`
      : `[Entregas] ${params.projectName}`;

  const existentes = await listarArquivosFilhosPorMime(
    params.pastaDestinoId,
    "application/vnd.google-apps.form",
    params.token
  );

  for (const arquivo of existentes) {
    if (await formularioTemUpload(arquivo.id, params.token)) {
      if (arquivo.name !== titulo) {
        await renomearArquivoDrive(arquivo.id, titulo, params.token);
      }
      return { id: arquivo.id, reused: true };
    }
  }

  const copia = await copiarArquivoDrive(
    params.templateId,
    params.pastaDestinoId,
    titulo,
    params.token
  );

  if (!(await formularioTemUpload(copia.id, params.token))) {
    await marcarArquivoComoLixeira(copia.id, params.token).catch(() => null);
    throw new Error(
      `O template de ${params.tipo === "selecao" ? "Seleção" : "Entregas"} não contém pergunta de upload.`
    );
  }

  return { id: copia.id, reused: false };
}

async function listarArquivosFilhosPorMime(
  parentId: string,
  mimeType: string,
  token: string
) {
  const q = [
    `'${escaparDriveQuery(parentId)}' in parents`,
    `mimeType = '${escaparDriveQuery(mimeType)}'`,
    "trashed = false",
  ].join(" and ");

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,parents,webViewLink)",
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Não foi possível listar os arquivos da pasta."
    );
  }

  return Array.isArray(data.files) ? data.files : [];
}

async function copiarArquivoDrive(
  fileId: string,
  parentId: string,
  nome: string,
  token: string
) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true&fields=id,name,mimeType,parents,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nome,
        parents: [parentId],
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.id) {
    throw new Error(
      data?.error?.message || "Não foi possível copiar o formulário-modelo."
    );
  }

  return data;
}

async function obterFormularioGoogle(formId: string, token: string) {
  const response = await fetch(
    `https://forms.googleapis.com/v1/forms/${formId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json().catch(() => null);

  if (!response.ok) return null;
  return data;
}

async function formularioTemUpload(formId: string, token: string) {
  const form = await obterFormularioGoogle(formId, token);
  if (!form || !Array.isArray(form.items)) return false;

  return form.items.some((item: any) =>
    Boolean(item?.questionItem?.question?.fileUploadQuestion)
  );
}

async function moverArquivoDrive(
  fileId: string,
  destinoId: string,
  token: string
) {
  const infoResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const info = await infoResponse.json().catch(() => null);

  if (!infoResponse.ok) {
    throw new Error(
      info?.error?.message || "Não foi possível localizar o arquivo no Drive."
    );
  }

  const parents = Array.isArray(info?.parents) ? info.parents : [];
  if (parents.includes(destinoId) && parents.length === 1) return;

  const query = new URLSearchParams({
    addParents: destinoId,
    supportsAllDrives: "true",
    fields: "id,parents",
  });
  if (parents.length) query.set("removeParents", parents.join(","));

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${query.toString()}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Não foi possível mover o arquivo no Drive."
    );
  }
}

async function marcarArquivoComoLixeira(fileId: string, token: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=id,trashed`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: true }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.error?.message || "Não foi possível arquivar o formulário antigo."
    );
  }
}

async function retirarFormulariosDaPastaFalasTeste(
  falasTesteFolderId: string,
  respostasSelecaoFolderId: string,
  projectName: string,
  formCorretoId: string,
  token: string
) {
  const forms = await listarArquivosFilhosPorMime(
    falasTesteFolderId,
    "application/vnd.google-apps.form",
    token
  );

  const chaveProjeto = normalizarTextoDrive(projectName);

  for (const form of forms) {
    if (form.id === formCorretoId) continue;

    const nomeNormalizado = normalizarTextoDrive(form.name);
    if (
      !nomeNormalizado.includes(chaveProjeto) &&
      !nomeNormalizado.includes("selecao")
    ) {
      continue;
    }

    await moverArquivoDrive(form.id, respostasSelecaoFolderId, token);
    await renomearArquivoDrive(
      form.id,
      `[OBSOLETO] ${form.name || "[Seleção] " + projectName}`,
      token
    );
  }
}

function normalizarTextoDrive(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function moverConteudoPasta(
  origemId: string,
  destinoId: string,
  token: string
) {
  if (origemId === destinoId) return 0;

  const q = `'${escaparDriveQuery(origemId)}' in parents and trashed = false`;
  let pageToken = "";
  let movidos = 0;

  do {
    const params = new URLSearchParams({
      q,
      fields: "nextPageToken,files(id,name)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const lista = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await lista.json();

    if (!lista.ok) {
      throw new Error(
        data?.error?.message || "Não foi possível listar os arquivos do episódio."
      );
    }

    for (const item of data.files || []) {
      const paramsMover = new URLSearchParams({
        addParents: destinoId,
        removeParents: origemId,
        supportsAllDrives: "true",
        fields: "id,parents",
      });
      const mover = await fetch(
        `https://www.googleapis.com/drive/v3/files/${item.id}?${paramsMover.toString()}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const moverData = await mover.json().catch(() => null);
      if (!mover.ok) {
        throw new Error(
          moverData?.error?.message ||
            `Não foi possível mover ${item.name || item.id} para a pasta final.`
        );
      }
      movidos += 1;
    }

    pageToken = String(data.nextPageToken || "");
  } while (pageToken);

  return movidos;
}

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
      let nomeFinal = encontrada.name || nome;

      if (nomeFinal !== nomeNovo) {
        await renomearArquivoDrive(encontrada.id, nomeNovo, token);
        nomeFinal = nomeNovo;
      }

      return {
        id: encontrada.id,
        name: nomeFinal,
        webViewLink:
          encontrada.webViewLink ||
          `https://drive.google.com/drive/folders/${encontrada.id}`,
        reused: true,
      };
    }
  }

  return criarPasta(nomeNovo, parentId, token);
}

async function renomearArquivoDrive(
  fileId: string,
  nome: string,
  token: string
) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=id,name`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: nome }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Não foi possível renomear a pasta para ${nome}.`
    );
  }

  return data;
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

async function criarEstruturaEpisodio(body: any, accessToken: string) {
  const projectFolderId = extrairId(
    body?.projectFolderId || body?.projetoFolderId
  );
  const finalizadosFolderId = extrairId(
    body?.finalizadosFolderId || body?.finalFolderId
  );
  const numero = Number(body?.numero || body?.episodio || 0);
  const titulo = String(body?.titulo || "").trim();

  if (!projectFolderId) {
    throw new Error("Pasta 2 | Projeto não informada para o episódio.");
  }
  if (!finalizadosFolderId) {
    throw new Error("Pasta 3 | Finalizado não informada para o episódio.");
  }
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error("Número do episódio inválido.");
  }

  const numeroTexto = String(numero).padStart(2, "0");
  const nomeBase = `Episódio ${numeroTexto}${
    titulo ? " - " + titulo : ""
  }`;

  const episodio = await obterOuCriarPasta(
    [nomeBase, `Episódio ${numeroTexto}`, `EP ${numeroTexto}`],
    projectFolderId,
    accessToken,
    nomeBase
  );

  const cortes = await obterOuCriarPasta(
    ["Cortes", "Cortes do Episódio"],
    episodio.id,
    accessToken,
    "Cortes"
  );

  const entregas = await obterOuCriarPasta(
    ["Entregas", "Entregas do Episódio"],
    episodio.id,
    accessToken,
    "Entregas"
  );

  const finalizado = await obterOuCriarPasta(
    [nomeBase, `Episódio ${numeroTexto}`, `EP ${numeroTexto}`],
    finalizadosFolderId,
    accessToken,
    nomeBase
  );

  return {
    ok: true,
    episodioId: episodio.id,
    episodio: episodio.webViewLink,
    cortesId: cortes.id,
    cortes: cortes.webViewLink,
    entregasId: entregas.id,
    entregas: entregas.webViewLink,
    finalizadoId: finalizado.id,
    finalizado: finalizado.webViewLink,
  };
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
