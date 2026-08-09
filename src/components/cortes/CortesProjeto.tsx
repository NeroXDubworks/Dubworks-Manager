
import { useState } from "react";

const API_URL = import.meta.env.VITE_CORTES_API_URL || "http://localhost:8000";

export default function CortesProjeto() {
  const [video, setVideo] = useState<File | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState("");
  const [duracao, setDuracao] = useState(90);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function enviar() {
    if (!video || !nomeProjeto.trim()) {
      setMensagem("Selecione o vídeo e informe o nome do projeto.");
      return;
    }

    const form = new FormData();
    form.append("video", video);
    form.append("nome_projeto", nomeProjeto.trim());
    form.append("duracao_corte", String(duracao));

    setCarregando(true);
    setMensagem("");

    try {
      const response = await fetch(`${API_URL}/cortes`, {
        method: "POST",
        body: form,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Erro ao gerar cortes.");
      }

      setMensagem("Cortes gerados com sucesso.");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section style={{ padding: 24 }}>
      <h1>Cortes de Projetos</h1>

      <div style={{ display: "grid", gap: 14, maxWidth: 620 }}>
        <label>
          Nome do projeto
          <input
            value={nomeProjeto}
            onChange={(event) => setNomeProjeto(event.target.value)}
          />
        </label>

        <label>
          Vídeo
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setVideo(event.target.files?.[0] || null)}
          />
        </label>

        <label>
          Duração de cada corte
          <select
            value={duracao}
            onChange={(event) => setDuracao(Number(event.target.value))}
          >
            <option value={90}>90 segundos</option>
            <option value={120}>2 minutos</option>
            <option value={300}>5 minutos</option>
          </select>
        </label>

        <button type="button" onClick={enviar} disabled={carregando}>
          {carregando ? "Gerando..." : "Gerar cortes"}
        </button>

        {mensagem && <p>{mensagem}</p>}
      </div>
    </section>
  );
}
