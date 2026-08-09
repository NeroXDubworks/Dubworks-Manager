import type { CSSProperties } from "react";
import type { Corte } from "./CortesPage";

type ListaCortesProps = {
  cortes: Corte[];
  onAbrir: (corte: Corte) => void;
  onEditar: (corte: Corte) => void;
  onExcluir: (id: string) => void;
};

function formatarTempo(segundos: number) {
  if (!Number.isFinite(segundos) || segundos < 0) {
    return "00:00";
  }

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

export default function ListaCortes({
  cortes,
  onAbrir,
  onEditar,
  onExcluir,
}: ListaCortesProps) {
  return (
    <section
      style={{
        padding: "18px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: "18px",
        background: "rgba(15, 23, 42, 0.82)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "16px" }}>Lista de cortes</h2>

        <span
          style={{
            padding: "5px 9px",
            color: "#38bdf8",
            borderRadius: "999px",
            background: "rgba(14, 165, 233, 0.12)",
            fontSize: "12px",
          }}
        >
          {cortes.length}
        </span>
      </div>

      {cortes.length === 0 ? (
        <div
          style={{
            padding: "30px 14px",
            color: "#64748b",
            border: "1px dashed rgba(148, 163, 184, 0.22)",
            borderRadius: "12px",
            textAlign: "center",
            fontSize: "13px",
          }}
        >
          Nenhum corte criado.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {cortes.map((corte, indice) => (
            <article
              key={corte.id}
              style={{
                padding: "13px",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "12px",
                background: "rgba(30, 41, 59, 0.52)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  title="Abrir no vídeo"
                  onClick={() => onAbrir(corte)}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    flex: "0 0 30px",
                    width: "30px",
                    height: "30px",
                    color: "#ffffff",
                    border: 0,
                    borderRadius: "50%",
                    background: "#2563eb",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {indice + 1}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "13px",
                    }}
                  >
                    {corte.nome}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    {formatarTempo(corte.inicio)} →{" "}
                    {formatarTempo(corte.fim)}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "3px",
                      color: "#64748b",
                      fontSize: "11px",
                    }}
                  >
                    Duração: {formatarTempo(corte.fim - corte.inicio)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    title="Editar corte"
                    onClick={() => onEditar(corte)}
                    style={botaoIcone}
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    title="Excluir corte"
                    onClick={() => {
                      const confirmou = window.confirm(
                        `Excluir o corte "${corte.nome}"?`
                      );

                      if (confirmou) {
                        onExcluir(corte.id);
                      }
                    }}
                    style={{
                      ...botaoIcone,
                      color: "#fb7185",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const botaoIcone: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: "32px",
  height: "32px",
  padding: 0,
  border: "1px solid rgba(148, 163, 184, 0.17)",
  borderRadius: "8px",
  background: "rgba(15, 23, 42, 0.6)",
  cursor: "pointer",
};