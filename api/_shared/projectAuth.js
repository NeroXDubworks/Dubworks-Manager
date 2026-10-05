import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./runtimeConfig.js";

export class ApiAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizar(valor) {
  return String(valor || "").trim().toLocaleLowerCase("pt-BR");
}

export async function exigirAcessoProjeto(req, projectId, modo = "edit") {
  const authorization = String(req.headers.authorization || "").trim();
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token || token.startsWith("sb_")) {
    throw new ApiAuthError(
      401,
      "Sessão inválida ou expirada. Entre novamente no DubWorks Manager."
    );
  }

  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  const user = await userResp.json().catch(() => null);

  if (!userResp.ok || !user?.id || !user?.email) {
    throw new ApiAuthError(
      401,
      "Sessão inválida ou expirada. Entre novamente no DubWorks Manager."
    );
  }

  const projetoNumero = Number(projectId);
  if (!Number.isFinite(projetoNumero) || projetoNumero <= 0) {
    throw new ApiAuthError(400, "Projeto não informado para autorizar a operação.");
  }

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
  };

  const projetoParams = new URLSearchParams({
    select: "id,lider,editor",
    id: `eq.${projetoNumero}`,
    limit: "1",
  });
  const projetoResp = await fetch(
    `${SUPABASE_URL}/rest/v1/projetos?${projetoParams.toString()}`,
    { headers }
  );
  const projetos = await projetoResp.json().catch(() => []);
  const projeto =
    projetoResp.ok && Array.isArray(projetos) && projetos.length
      ? projetos[0]
      : null;

  if (!projeto) {
    throw new ApiAuthError(403, "Você não possui acesso a este projeto.");
  }

  if (modo === "view") {
    return { token, user, projeto };
  }

  const perfilParams = new URLSearchParams({
    select: "cargo,nome,login,vinculo",
    login: `ilike.${String(user.email).trim()}`,
    limit: "1",
  });
  const perfilResp = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?${perfilParams.toString()}`,
    { headers }
  );
  const perfis = await perfilResp.json().catch(() => []);
  const perfil =
    perfilResp.ok && Array.isArray(perfis) && perfis.length
      ? perfis[0]
      : null;

  if (!perfil) {
    throw new ApiAuthError(
      403,
      "Seu perfil do DubWorks Manager não foi encontrado."
    );
  }

  const cargo = normalizar(perfil.cargo);
  const identidades = new Set(
    [perfil.vinculo, perfil.login, perfil.nome]
      .map(normalizar)
      .filter(Boolean)
  );

  const permitido =
    cargo === "diretoria" ||
    cargo === "adm" ||
    ((cargo === "lider" || cargo === "lider_treinamento") &&
      identidades.has(normalizar(projeto.lider))) ||
    (cargo === "editor" &&
      identidades.has(normalizar(projeto.editor)));

  if (!permitido) {
    throw new ApiAuthError(
      403,
      "Você não possui permissão para alterar este projeto."
    );
  }

  return { token, user, projeto, perfil };
}
