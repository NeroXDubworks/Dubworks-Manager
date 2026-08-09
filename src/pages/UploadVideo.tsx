import { ChangeEvent, DragEvent, useRef, useState } from "react";

type UploadVideoProps = {
  onSelecionar: (arquivo: File) => void;
};

export default function UploadVideo({ onSelecionar }: UploadVideoProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arrastando, setArrastando] = useState(false);

  function validarArquivo(arquivo?: File) {
    if (!arquivo) return;

    const extensoesPermitidas = [".mp4", ".mkv", ".mov", ".webm"];
    const nome = arquivo.name.toLowerCase();

    const formatoValido =
      arquivo.type.startsWith("video/") ||
      extensoesPermitidas.some((extensao) => nome.endsWith(extensao));

    if (!formatoValido) {
      alert("Selecione um vídeo MP4, MKV, MOV ou WEBM.");
      return;
    }

    onSelecionar(arquivo);
  }

  function selecionarPeloInput(event: ChangeEvent<HTMLInputElement>) {
    validarArquivo(event.target.files?.[0]);
  }

  function receberArquivo(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    validarArquivo(event.dataTransfer.files?.[0]);
  }

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={receberArquivo}
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "440px",
        padding: "32px",
        border: `1px dashed ${
          arrastando ? "#38bdf8" : "rgba(148, 163, 184, 0.32)"
        }`,
        borderRadius: "20px",
        background: arrastando
          ? "rgba(14, 165, 233, 0.11)"
          : "rgba(15, 23, 42, 0.75)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "500px" }}>
        <div style={{ marginBottom: "14px", fontSize: "60px" }}>🎬</div>

        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Envie o episódio
        </h2>

        <p style={{ margin: "0 0 24px", color: "#94a3b8" }}>
          Arraste o vídeo para esta área ou selecione um arquivo no aparelho.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            padding: "12px 22px",
            color: "#ffffff",
            border: 0,
            borderRadius: "11px",
            background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Selecionar vídeo
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mkv,.mov,.webm"
          onChange={selecionarPeloInput}
          style={{ display: "none" }}
        />

        <p style={{ marginTop: "18px", color: "#64748b", fontSize: "12px" }}>
          Formatos recomendados: MP4, MKV, MOV ou WEBM.
        </p>
      </div>
    </section>
  );
}