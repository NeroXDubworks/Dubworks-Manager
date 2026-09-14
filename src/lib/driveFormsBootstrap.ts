import { supabase } from "./supabase";

const DRIVE_STRUCTURE_URL =
  "https://omgjbafqukpzdhhpdlaa.supabase.co/functions/v1/google-drive-create-structure";

const FORMS_PROXY_URL = "/api/forms-copy";
const FINALIZE_PROXY_URL = "/api/project-finalize";
const INSTALL_FLAG = "__dubworksDriveFormsBootstrapInstalled";

type ElencoForm = {
  personagem: string;
  dublador: string;
  telefone_dublador: string;
  funcao: string;
};

function extrairFolderId(urlOuId?: string) {
  const texto = String(urlOuId || "").trim();
  if (!texto) return "";

  const matchFolders = texto.match(/\/folders\/([^/?]+)/);
  if (matchFolders?.[1]) return matchFolders[1];

  const matchId = texto.match(/[?&]id=([^&]+)/);
  if (matchId?.[1]) return matchId[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(texto)) return texto;

  return "";
}

function limparNomeProjeto(projectName?: string) {
  return String(projectName || "")
    .replace(/^\s*\[Projeto\]\s*/i, "")
    .trim();
}

function normalizarStatus(valor?: string) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ehStatusFinalizado(valor?: string) {
  const status = normalizarStatus(valor);
  return status === "finalizado" || status === "concluido" || status === "concluida";
}

function extrairLinksDriveObservacoes(observacoes?: string) {
  const texto = String(observacoes || "");
  const inicio = texto.indexOf("[[DRIVE_LINKS]]");
  const fim = texto.indexOf("[[/DRIVE_LINKS]]");

  if (inicio < 0 || fim < 0 || fim <= inicio) return {} as Record<string, string>;

  try {
    const json = texto
      .slice(inicio + "[[DRIVE_LINKS]]".length, fim)
      .trim();
    const links = JSON.parse(json);
    return links && typeof links === "object" ? links : {};
  } catch {
    return {} as Record<string, string>;
  }
}

async function lerJsonBody(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof init?.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return null;
    }
  }

  if (input instanceof Request) {
    try {
      const texto = await input.clone().text();
      return texto ? JSON.parse(texto) : null;
    } catch {
      return null;
    }
  }

  return null;
}

function metodoRequisicao(input: RequestInfo | URL, init?: RequestInit) {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function urlRequisicao(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : String(input);
}

function ehPatchProjetos(url: string, metodo: string) {
  if (metodo !== "PATCH") return false;

  try {
    return new URL(url).pathname.endsWith("/rest/v1/projetos");
  } catch {
    return url.includes("/rest/v1/projetos");
  }
}

function extrairProjetoIdDaUrl(url: string) {
  try {
    const filtro = new URL(url).searchParams.get("id") || "";
    const match = filtro.match(/^eq\.(\d+)$/);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

async function carregarElencoProjeto(projectName: string): Promise<ElencoForm[]> {
  const nome = limparNomeProjeto(projectName);
  if (!nome || nome.toLocaleLowerCase("pt-BR") === "sem nome") return [];

  const { data: projeto, error: erroProjeto } = await supabase
    .from("projetos")
    .select("id,projeto")
    .eq("projeto", nome)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroProjeto || !projeto?.id) {
    console.warn("Não encontrei o projeto para carregar personagens dos Forms:", {
      nome,
      erroProjeto,
    });
    return [];
  }

  const { data: elenco, error: erroElenco } = await supabase
    .from("elenco")
    .select("personagem,dublador,telefone_dublador,funcao")
    .eq("projeto_id", Number(projeto.id))
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (erroElenco) {
    console.warn("Não consegui carregar os personagens antes de criar os Forms:", erroElenco);
    return [];
  }

  const vistos = new Set<string>();

  return (elenco || [])
    .map((item: any) => ({
      personagem: String(item.personagem || "").trim(),
      dublador: String(item.dublador || "").trim(),
      telefone_dublador: String(item.telefone_dublador || "").trim(),
      funcao: String(item.funcao || "").trim(),
    }))
    .filter((item) => {
      const chave = item.personagem.toLocaleLowerCase("pt-BR");
      if (!chave || vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

function mapearRetornoFormularios(data: any) {
  return {
    formSelecao: data?.formSelecao?.editUrl || data?.formSelecao?.viewUrl || data?.formSelecao || "",
    formSelecaoId: data?.formSelecao?.id || data?.formSelecaoId || "",
    formEntregas:
      data?.formEntregas?.editUrl || data?.formEntregas?.viewUrl || data?.formEntregas || "",
    formEntregasId: data?.formEntregas?.id || data?.formEntregasId || "",
    planilhaSelecao: data?.planilhaSelecao?.url || data?.planilhaSelecao || "",
    planilhaSelecaoId: data?.planilhaSelecao?.id || data?.planilhaSelecaoId || "",
    planilhaEntregas: data?.planilhaEntregas?.url || data?.planilhaEntregas || "",
    planilhaEntregasId: data?.planilhaEntregas?.id || data?.planilhaEntregasId || "",
  };
}

function avisarFalhaFormularios(mensagem: string) {
  if (typeof window === "undefined") return;

  window.alert(
    `As pastas do Drive foram criadas, mas os formulários NÃO foram criados.\n\n${mensagem}\n\nA estrutura existente foi preservada para não duplicar as pastas.`
  );
}

function avisarFalhaFinalizacao(mensagem: string) {
  if (typeof window === "undefined") return;

  window.alert(
    `O status do projeto foi salvo como Finalizado, mas os vídeos NÃO puderam ser movidos para 3 | Finalizado.\n\n${mensagem}`
  );
}

async function obterLinksProjetoAtual(projetoId: string, payload: any) {
  let links = extrairLinksDriveObservacoes(payload?.observacoes);

  if (extrairFolderId(links.projeto) && extrairFolderId(links.finalizados)) {
    return links;
  }

  if (!projetoId) return links;

  const { data, error } = await supabase
    .from("projetos")
    .select("observacoes")
    .eq("id", Number(projetoId))
    .maybeSingle();

  if (!error && data?.observacoes) {
    links = extrairLinksDriveObservacoes(data.observacoes);
  }

  return links;
}

async function dispararFinalizacaoProjeto(projetoId: string, payload: any) {
  const links = await obterLinksProjetoAtual(projetoId, payload);
  const projetoFolderId = extrairFolderId(links.projeto || links.cortes || "");
  const finalizadosFolderId = extrairFolderId(links.finalizados || "");

  if (!projetoFolderId || !finalizadosFolderId) {
    throw new Error(
      "Não encontrei os links das pastas 2 | Projeto e 3 | Finalizado. Abra a aba Drive do projeto e confirme se a estrutura oficial está salva."
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token || "";
  if (!accessToken) {
    throw new Error("Sua sessão expirou antes de finalizar os arquivos do Drive.");
  }

  const response = await fetch(FINALIZE_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      projectId: projetoId,
      projectName: String(payload?.projeto || "").trim(),
      projetoFolderId,
      finalizadosFolderId,
      videoEditorLink: String(payload?.video_editor_link || "").trim(),
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data?.ok === false || data?.error) {
    throw new Error(
      data?.error || data?.message || `Automação de finalização retornou HTTP ${response.status}.`
    );
  }

  return data;
}

function instalarCriacaoAutomaticaFormularios() {
  if (typeof globalThis.fetch !== "function") return;

  const escopo = globalThis as typeof globalThis & {
    [INSTALL_FLAG]?: boolean;
  };

  if (escopo[INSTALL_FLAG]) return;
  escopo[INSTALL_FLAG] = true;

  const fetchOriginal = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = urlRequisicao(input);
    const metodo = metodoRequisicao(input, init);

    if (ehPatchProjetos(url, metodo)) {
      const payloadProjeto = await lerJsonBody(input, init);
      const respostaProjeto = await fetchOriginal(input, init);

      if (respostaProjeto.ok && ehStatusFinalizado(payloadProjeto?.status)) {
        const projetoId = extrairProjetoIdDaUrl(url);

        try {
          await dispararFinalizacaoProjeto(projetoId, payloadProjeto);
        } catch (erro) {
          console.error("Projeto finalizado, mas houve erro ao mover os vídeos:", erro);
          avisarFalhaFinalizacao(
            erro instanceof Error ? erro.message : String(erro || "Erro desconhecido")
          );
        }
      }

      return respostaProjeto;
    }

    if (url !== DRIVE_STRUCTURE_URL || metodo !== "POST") {
      return fetchOriginal(input, init);
    }

    const payload = await lerJsonBody(input, init);

    if (!payload?.projectName || payload?.action) {
      return fetchOriginal(input, init);
    }

    const respostaDrive = await fetchOriginal(input, init);

    if (!respostaDrive.ok) return respostaDrive;

    const dadosDrive = await respostaDrive
      .clone()
      .json()
      .catch(() => null);

    if (!dadosDrive || dadosDrive.error) return respostaDrive;

    if (dadosDrive.formSelecao && dadosDrive.formEntregas) {
      return respostaDrive;
    }

    const respostasSelecaoFolderId =
      dadosDrive.respostasSelecaoId ||
      extrairFolderId(dadosDrive.respostasSelecao);

    const entregasFolderId =
      dadosDrive.entregasProjetoId || extrairFolderId(dadosDrive.entregasProjeto);

    if (!respostasSelecaoFolderId || !entregasFolderId) {
      console.warn(
        "Estrutura criada sem os IDs necessários para copiar os formulários.",
        {
          respostasSelecaoFolderId,
          entregasFolderId,
          dadosDrive,
        }
      );
      avisarFalhaFormularios(
        "A integração do Drive não devolveu os IDs das pastas de Respostas da Seleção e Entregas."
      );
      return respostaDrive;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token || "";

      if (!accessToken) {
        throw new Error(
          "Sessão expirada antes da criação dos formulários. Entre novamente no Manager."
        );
      }

      const elenco = await carregarElencoProjeto(payload.projectName);
      const personagens = elenco.map((item) => item.personagem);

      const respostaForms = await fetchOriginal(FORMS_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectName: payload.projectName,
          respostasSelecaoFolderId,
          entregasFolderId,
          personagens,
          elenco,
        }),
      });

      const dadosForms = await respostaForms.json().catch(() => null);

      if (
        !respostaForms.ok ||
        !dadosForms ||
        dadosForms.error ||
        dadosForms.ok === false
      ) {
        throw new Error(
          dadosForms?.error ||
            dadosForms?.message ||
            `Proxy dos formulários retornou HTTP ${respostaForms.status}`
        );
      }

      const dadosCompletos = {
        ...dadosDrive,
        ...mapearRetornoFormularios(dadosForms),
      };

      const headers = new Headers(respostaDrive.headers);
      headers.delete("content-length");
      headers.set("content-type", "application/json;charset=utf-8");

      return new Response(JSON.stringify(dadosCompletos), {
        status: respostaDrive.status,
        statusText: respostaDrive.statusText,
        headers,
      });
    } catch (erro) {
      console.error(
        "Pastas do Drive criadas, mas houve erro ao copiar os formulários:",
        erro
      );

      avisarFalhaFormularios(
        erro instanceof Error ? erro.message : String(erro || "Erro desconhecido")
      );

      return respostaDrive;
    }
  };
}

instalarCriacaoAutomaticaFormularios();
