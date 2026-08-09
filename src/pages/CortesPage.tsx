import { useMemo, useRef, useState } from "react";
import UploadVideo from "./UploadVideo";
import VideoPlayer from "./VideoPlayer";
import Timeline from "./Timeline";
import ListaCortes from "./ListaCortes";

export type Corte = {
  id: string;
  nome: string;
  inicio: number;
  fim: number;
};

function formatarTempo(segundos: number) {
  if (!Number.isFinite(segundos) || segundos < 0) return "00:00";

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segundosRestantes = Math.floor(segundos % 60);

  if (horas > 0) {
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
      2,
      "0"
    )}:${String(segundosRestantes).padStart(2, "0")}`;
  }

  return `${String(minutos).padStart(2, "0")}:${String(
    segundosRestantes
  ).padStart(2, "0")}`;
}

export default function CortesPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duracaoVideo, setDuracaoVideo] = useState(0);
  const [tempoAtual, setTempoAtual] = useState(0);

  const [inicioCorte, setInicioCorte] = useState(0);
  const [fimCorte, setFimCorte] = useState(0);
  const [nomeCorte, setNomeCorte] = useState("");
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [processando, setProcessando] = useState(false);

  const duracaoCorte = useMemo(
    () => Math.max(0, fimCorte - inicioCorte),
    [inicioCorte, fimCorte]
  );

  function selecionarVideo(novoArquivo: File) {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const novaUrl = URL.createObjectURL(novoArquivo);

    setArquivo(novoArquivo);
    setVideoUrl(novaUrl);
    setDuracaoVideo(0);
    setTempoAtual(0);
    setInicioCorte(0);
    setFimCorte(0);
    setCortes([]);
  }

  function marcarInicio() {
    setInicioCorte(tempoAtual);

    if (fimCorte <= tempoAtual) {
      setFimCorte(Math.min(tempoAtual + 90, duracaoVideo));
    }
  }

  function marcarFim() {
    setFimCorte(tempoAtual);
  }

  function irParaTempo(segundos: number) {
    if (!videoRef.current) return;

    const tempoSeguro = Math.max(0, Math.min(segundos, duracaoVideo));

    videoRef.current.currentTime = tempoSeguro;
    setTempoAtual(tempoSeguro);
  }

  function adicionarCorte() {
    if (!arquivo) {
      alert("Selecione um vídeo primeiro.");
      return;
    }

    if (fimCorte <= inicioCorte) {
      alert("O fim do corte precisa ser maior que o início.");
      return;
    }

    const numeroCorte = cortes.length + 1;

    const novoCorte: Corte = {
      id: `${Date.now()}-${numeroCorte}`,
      nome: nomeCorte.trim() || `Corte ${String(numeroCorte).padStart(2, "0")}`,
      inicio: inicioCorte,
      fim: fimCorte,
    };

    setCortes((estadoAtual) => [...estadoAtual, novoCorte]);
    setNomeCorte("");

    const proximoInicio = Math.min(fimCorte, duracaoVideo);
    const proximoFim = Math.min(proximoInicio + 90, duracaoVideo);

    setInicioCorte(proximoInicio);
    setFimCorte(proximoFim);
  }

  function excluirCorte(id: string) {
    setCortes((estadoAtual) =>
      estadoAtual.filter((corte) => corte.id !== id)
    );
  }

  function editarCorte(corte: Corte) {
    setInicioCorte(corte.inicio);
    setFimCorte(corte.fim);
    setNomeCorte(corte.nome);
    irParaTempo(corte.inicio);
    excluirCorte(corte.id);
  }

  async function gerarCortes() {
    if (!arquivo) {
      alert("Selecione um vídeo primeiro.");
      return;
    }

    if (!cortes.length) {
      alert("Adicione pelo menos um corte antes de gerar.");
      return;
    }

    const apiUrl =
      import.meta.env.VITE_CORTES_API_URL || "/api/cortes";

    const formulario = new FormData();
    formulario.append("video", arquivo);
    formulario.append(
      "cortes_json",
      JSON.stringify(
        cortes.map(({ nome, inicio, fim }) => ({
          nome,
          inicio,
          fim,
        }))
      )
    );
    formulario.append(
      "nome_projeto",
      arquivo.name.replace(/\.[^.]+$/, "") || "Projeto"
    );

    try {
      setProcessando(true);

      const resposta = await fetch(`${apiUrl}/gerar-cortes`, {
        method: "POST",
        body: formulario,
      });

      if (!resposta.ok) {
        const erro = await resposta
          .json()
          .catch(() => ({ detail: "Erro ao processar os cortes." }));

        throw new Error(erro.detail || "Erro ao processar os cortes.");
      }

      const arquivoZip = await resposta.blob();
      const url = URL.createObjectURL(arquivoZip);
      const link = document.createElement("a");

      link.href = url;
      link.download = "cortes_dubworks.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (erro) {
      const mensagem =
        erro instanceof TypeError && erro.message === "Failed to fetch"
          ? "O backend Python não respondeu. Abra outro terminal e execute: cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000"
          : erro instanceof Error
          ? erro.message
          : "Erro desconhecido.";

      alert(`Não foi possível gerar os cortes: ${mensagem}`);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <main style={styles.pagina}>
      <section style={styles.cabecalho}>
        <div>
          <span style={styles.breadcrumb}>Ferramentas › Editor de cortes</span>

          <h1 style={styles.titulo}>✂ Editor de vídeo</h1>

          <p style={styles.subtitulo}>
            Envie um episódio, marque os trechos e gere os arquivos pelo cortador Python.
          </p>
        </div>

        <button
          type="button"
          style={{
            ...styles.botaoSalvar,
            opacity: cortes.length && !processando ? 1 : 0.6,
            cursor:
              cortes.length && !processando ? "pointer" : "not-allowed",
          }}
          onClick={gerarCortes}
          disabled={!cortes.length || processando}
        >
          {processando ? "Gerando cortes..." : "Gerar cortes"}
        </button>
      </section>

      {!arquivo && <UploadVideo onSelecionar={selecionarVideo} />}

      {arquivo && (
        <section style={styles.gradePrincipal}>
          <div style={styles.colunaEditor}>
            <div style={styles.card}>
              <div style={styles.arquivoCabecalho}>
                <div>
                  <strong style={styles.nomeArquivo}>{arquivo.name}</strong>

                  <span style={styles.detalheArquivo}>
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                    {duracaoVideo > 0
                      ? ` · ${formatarTempo(duracaoVideo)}`
                      : ""}
                  </span>
                </div>

                <span style={styles.statusCarregado}>✓ Vídeo carregado</span>
              </div>

              <VideoPlayer
                videoRef={videoRef}
                videoUrl={videoUrl}
                onTempoAlterado={setTempoAtual}
                onDuracaoCarregada={(duracao) => {
                  setDuracaoVideo(duracao);
                  setFimCorte(Math.min(90, duracao));
                }}
              />

              <Timeline
                duracao={duracaoVideo}
                tempoAtual={tempoAtual}
                inicio={inicioCorte}
                fim={fimCorte}
                cortes={cortes}
                onSelecionarTempo={irParaTempo}
              />

              <div style={styles.formularioCorte}>
                <h2 style={styles.tituloSecao}>Novo corte</h2>

                <div style={styles.campos}>
                  <label style={styles.label}>
                    Início
                    <input
                      type="number"
                      min={0}
                      max={duracaoVideo}
                      step="0.01"
                      value={inicioCorte}
                      onChange={(event) =>
                        setInicioCorte(Number(event.target.value))
                      }
                      style={styles.input}
                    />
                    <button
                      type="button"
                      onClick={marcarInicio}
                      style={styles.botaoMarcador}
                    >
                      Usar tempo atual
                    </button>
                  </label>

                  <label style={styles.label}>
                    Fim
                    <input
                      type="number"
                      min={0}
                      max={duracaoVideo}
                      step="0.01"
                      value={fimCorte}
                      onChange={(event) =>
                        setFimCorte(Number(event.target.value))
                      }
                      style={styles.input}
                    />
                    <button
                      type="button"
                      onClick={marcarFim}
                      style={styles.botaoMarcador}
                    >
                      Usar tempo atual
                    </button>
                  </label>

                  <div style={styles.label}>
                    Duração
                    <div style={styles.duracao}>
                      {formatarTempo(duracaoCorte)}
                    </div>
                  </div>

                  <label style={{ ...styles.label, flex: 1 }}>
                    Nome do corte
                    <input
                      type="text"
                      value={nomeCorte}
                      placeholder={`Corte ${String(cortes.length + 1).padStart(
                        2,
                        "0"
                      )}`}
                      onChange={(event) => setNomeCorte(event.target.value)}
                      style={styles.input}
                    />
                  </label>
                </div>

                <div style={styles.acoesFormulario}>
                  <button
                    type="button"
                    onClick={marcarInicio}
                    style={styles.botaoSecundario}
                  >
                    Marcar início em {formatarTempo(tempoAtual)}
                  </button>

                  <button
                    type="button"
                    onClick={marcarFim}
                    style={styles.botaoSecundario}
                  >
                    Marcar fim em {formatarTempo(tempoAtual)}
                  </button>

                  <button
                    type="button"
                    onClick={adicionarCorte}
                    style={styles.botaoPrincipal}
                  >
                    + Adicionar corte
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside style={styles.colunaLateral}>
            <div style={styles.card}>
              <h2 style={styles.tituloSecao}>Informações do episódio</h2>

              <div style={styles.informacoes}>
                <span>
                  <strong>Arquivo:</strong> {arquivo.name}
                </span>

                <span>
                  <strong>Duração:</strong> {formatarTempo(duracaoVideo)}
                </span>

                <span>
                  <strong>Tempo atual:</strong> {formatarTempo(tempoAtual)}
                </span>

                <span>
                  <strong>Total de cortes:</strong> {cortes.length}
                </span>

                <span>
                  <strong>Status:</strong>{" "}
                  <em style={styles.statusEdicao}>{processando ? "Processando" : cortes.length ? "Pronto para gerar" : "Em edição"}</em>
                </span>
              </div>
            </div>

            <ListaCortes
              cortes={cortes}
              onAbrir={(corte) => irParaTempo(corte.inicio)}
              onEditar={editarCorte}
              onExcluir={excluirCorte}
            />
          </aside>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    padding: "28px",
    color: "#f8fafc",
    background:
      "radial-gradient(circle at top right, rgba(14, 165, 233, 0.13), transparent 28%), #050816",
  },

  cabecalho: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  breadcrumb: {
    color: "#94a3b8",
    fontSize: "13px",
  },

  titulo: {
    margin: "12px 0 4px",
    fontSize: "28px",
  },

  subtitulo: {
    margin: 0,
    color: "#94a3b8",
  },

  gradePrincipal: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 0.85fr)",
    gap: "18px",
    alignItems: "start",
  },

  colunaEditor: {
    minWidth: 0,
  },

  colunaLateral: {
    display: "grid",
    gap: "18px",
    minWidth: 0,
  },

  card: {
    padding: "18px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "18px",
    background: "rgba(15, 23, 42, 0.82)",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
    backdropFilter: "blur(16px)",
  },

  arquivoCabecalho: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },

  nomeArquivo: {
    display: "block",
    fontSize: "16px",
  },

  detalheArquivo: {
    display: "block",
    marginTop: "4px",
    color: "#94a3b8",
    fontSize: "13px",
  },

  statusCarregado: {
    padding: "7px 10px",
    borderRadius: "999px",
    color: "#4ade80",
    background: "rgba(34, 197, 94, 0.12)",
    fontSize: "12px",
  },

  formularioCorte: {
    marginTop: "20px",
    padding: "16px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "14px",
    background: "rgba(2, 6, 23, 0.45)",
  },

  tituloSecao: {
    margin: "0 0 16px",
    fontSize: "16px",
  },

  campos: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },

  label: {
    display: "grid",
    gap: "7px",
    minWidth: "145px",
    color: "#cbd5e1",
    fontSize: "12px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "10px",
    outline: "none",
    background: "rgba(15, 23, 42, 0.8)",
  },

  duracao: {
    padding: "11px 12px",
    color: "#38bdf8",
    borderRadius: "10px",
    background: "rgba(14, 165, 233, 0.12)",
    fontWeight: 700,
  },

  botaoMarcador: {
    padding: 0,
    color: "#38bdf8",
    border: 0,
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "11px",
  },

  acoesFormulario: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "16px",
    flexWrap: "wrap",
  },

  botaoPrincipal: {
    padding: "11px 18px",
    color: "#ffffff",
    border: 0,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    cursor: "pointer",
    fontWeight: 700,
  },

  botaoSecundario: {
    padding: "10px 14px",
    color: "#cbd5e1",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "10px",
    background: "rgba(15, 23, 42, 0.76)",
    cursor: "pointer",
  },

  botaoSalvar: {
    padding: "12px 20px",
    color: "#ffffff",
    border: 0,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    cursor: "pointer",
    fontWeight: 700,
  },

  informacoes: {
    display: "grid",
    gap: "12px",
    color: "#cbd5e1",
    fontSize: "13px",
  },

  statusEdicao: {
    display: "inline-block",
    padding: "4px 8px",
    color: "#38bdf8",
    borderRadius: "999px",
    background: "rgba(14, 165, 233, 0.12)",
    fontStyle: "normal",
  },
};