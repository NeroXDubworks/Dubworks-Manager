import { supabase } from "./supabase";

const DRIVE_STRUCTURE_URL =
  "https://omgjbafqukpzdhhpdlaa.supabase.co/functions/v1/google-drive-create-structure";

const FORMS_PROXY_URL = "/api/forms-copy";
const INSTALL_FLAG = "__dubworksDriveFormsBootstrapInstalled";

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

function mapearRetornoFormularios(data: any) {
  return {
    formSelecao: data?.formSelecao?.editUrl || data?.formSelecao?.viewUrl || "",
    formSelecaoId: data?.formSelecao?.id || "",
    formEntregas:
      data?.formEntregas?.editUrl || data?.formEntregas?.viewUrl || "",
    formEntregasId: data?.formEntregas?.id || "",
    planilhaSelecao: data?.planilhaSelecao?.url || "",
    planilhaSelecaoId: data?.planilhaSelecao?.id || "",
    planilhaEntregas: data?.planilhaEntregas?.url || "",
    planilhaEntregasId: data?.planilhaEntregas?.id || "",
  };
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
    const url = input instanceof Request ? input.url : String(input);
    const metodo = String(init?.method || "GET").toUpperCase();

    if (url !== DRIVE_STRUCTURE_URL || metodo !== "POST") {
      return fetchOriginal(input, init);
    }

    let payload: any = null;

    if (typeof init?.body === "string") {
      try {
        payload = JSON.parse(init.body);
      } catch {
        payload = null;
      }
    }

    // A mesma Edge Function também é usada para ler respostas. Só interceptamos
    // a chamada que efetivamente cria a estrutura inicial do projeto.
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

    // Compatibilidade: se a Edge Function voltar a criar os Forms no futuro,
    // não copiamos os templates uma segunda vez.
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
      // As pastas já existem neste ponto. Mantemos o retorno original para o
      // Manager salvar a estrutura em vez de gerar pastas duplicadas no retry.
      console.error(
        "Pastas do Drive criadas, mas houve erro ao copiar os formulários:",
        erro
      );
      return respostaDrive;
    }
  };
}

instalarCriacaoAutomaticaFormularios();
