import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Advertencia() {
  const [telefoneModerador, setTelefoneModerador] = useState("");
  const [telefoneMembro, setTelefoneMembro] = useState("");
  const [dataAdvertencia, setDataAdvertencia] = useState("");
  const [gravidade, setGravidade] = useState(0);
  const [arquivos, setArquivos] = useState<FileList | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function enviar() {
    if (
      !telefoneModerador.trim() ||
      !telefoneMembro.trim() ||
      !dataAdvertencia
    ) {
      setMensagem("Preencha todos os campos obrigatórios.");
      return;
    }

    const form = new FormData();

    form.append("telefone_moderador", telefoneModerador);
    form.append("telefone_membro", telefoneMembro);
    form.append("data_advertencia", dataAdvertencia);
    form.append("gravidade", String(gravidade));

    if (arquivos) {
      Array.from(arquivos).forEach((arquivo) => {
        form.append("midias", arquivo);
      });
    }

    setCarregando(true);
    setMensagem("");

    try {
      const response = await fetch(`${API_URL}/advertencias`, {
        method: "POST",
        body: form,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            "Erro ao registrar advertência."
        );
      }

      setMensagem("Advertência registrada com sucesso!");

      // Limpa os campos
      setTelefoneModerador("");
      setTelefoneMembro("");
      setDataAdvertencia("");
      setGravidade(0);
      setArquivos(null);
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Erro inesperado."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section style={{ padding: 24 }}>
      <h1>Registrar Advertência</h1>

      <div
        style={{
          display: "grid",
          gap: 16,
          maxWidth: 600,
        }}
      >
        <label>
          Número do moderador
          <input
            type="tel"
            placeholder="(00) 00000-0000"
            value={telefoneModerador}
            onChange={(e) => setTelefoneModerador(e.target.value)}
          />
        </label>

        <label>
          Número do advertido
          <input
            type="tel"
            placeholder="(00) 00000-0000"
            value={telefoneMembro}
            onChange={(e) => setTelefoneMembro(e.target.value)}
          />
        </label>

        <label>
          Dia da ocorrência
          <input
            type="date"
            value={dataAdvertencia}
            onChange={(e) => setDataAdvertencia(e.target.value)}
          />
        </label>

        <label>
          Gravidade da infração: <strong>{gravidade}/10</strong>

          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={gravidade}
            onChange={(e) => setGravidade(Number(e.target.value))}
          />
        </label>

        <label>
          Provas (imagem, vídeo ou áudio)
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={(e) => setArquivos(e.target.files)}
          />
        </label>

        {arquivos && (
          <div>
            <strong>Arquivos selecionados:</strong>
            <ul>
              {Array.from(arquivos).map((arquivo, index) => (
                <li key={index}>{arquivo.name}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={carregando}
        >
          {carregando ? "Enviando..." : "Registrar Advertência"}
        </button>

        {mensagem && (
          <p
            style={{
              color: mensagem.includes("sucesso") ? "green" : "red",
            }}
          >
            {mensagem}
          </p>
        )}
      </div>
    </section>
  );
}