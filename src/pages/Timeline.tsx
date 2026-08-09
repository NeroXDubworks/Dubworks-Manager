import type { MouseEvent } from "react";
import type { Corte } from "./CortesPage";

type TimelineProps = {
  duracao: number;
  tempoAtual: number;
  inicio: number;
  fim: number;
  cortes: Corte[];
  onSelecionarTempo: (tempo: number) => void;
};

export default function Timeline({
  duracao,
  tempoAtual,
  inicio,
  fim,
  cortes,
  onSelecionarTempo,
}: TimelineProps) {
  const percentualAtual =
    duracao > 0 ? Math.min(100, Math.max(0, (tempoAtual / duracao) * 100)) : 0;

  const percentualInicio =
    duracao > 0 ? Math.min(100, Math.max(0, (inicio / duracao) * 100)) : 0;

  const percentualFim =
    duracao > 0 ? Math.min(100, Math.max(0, (fim / duracao) * 100)) : 0;

  function selecionarPelaTimeline(event: MouseEvent<HTMLDivElement>) {
    if (!duracao) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const posicao = event.clientX - rect.left;
    const percentual = posicao / rect.width;
    const tempo = percentual * duracao;

    onSelecionarTempo(Math.max(0, Math.min(duracao, tempo)));
  }

  return (
    <div style={{ marginTop: "18px" }}>
      <div
        role="slider"
        aria-label="Linha do tempo do vídeo"
        aria-valuemin={0}
        aria-valuemax={duracao}
        aria-valuenow={tempoAtual}
        tabIndex={0}
        onClick={selecionarPelaTimeline}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            onSelecionarTempo(Math.max(0, tempoAtual - 5));
          }

          if (event.key === "ArrowRight") {
            onSelecionarTempo(Math.min(duracao, tempoAtual + 5));
          }
        }}
        style={{
          position: "relative",
          height: "70px",
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          borderRadius: "11px",
          outline: "none",
          background:
            "repeating-linear-gradient(90deg, #111827 0, #111827 48px, #182235 49px, #182235 50px)",
          cursor: "pointer",
        }}
      >
        {cortes.map((corte) => {
          const esquerda =
            duracao > 0 ? (corte.inicio / duracao) * 100 : 0;

          const largura =
            duracao > 0
              ? ((corte.fim - corte.inicio) / duracao) * 100
              : 0;

          return (
            <div
              key={corte.id}
              title={corte.nome}
              style={{
                position: "absolute",
                top: "8px",
                bottom: "8px",
                left: `${esquerda}%`,
                width: `${largura}%`,
                minWidth: "3px",
                border: "1px solid rgba(56, 189, 248, 0.8)",
                borderRadius: "5px",
                background: "rgba(14, 165, 233, 0.22)",
              }}
            />
          );
        })}

        {fim > inicio && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              bottom: "8px",
              left: `${percentualInicio}%`,
              width: `${Math.max(0, percentualFim - percentualInicio)}%`,
              borderRadius: "5px",
              background: "rgba(37, 99, 235, 0.2)",
            }}
          />
        )}

        <div
          title="Início do corte"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${percentualInicio}%`,
            width: "3px",
            background: "#22c55e",
            zIndex: 3,
          }}
        />

        <div
          title="Fim do corte"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${percentualFim}%`,
            width: "3px",
            background: "#ef4444",
            zIndex: 3,
          }}
        />

        <div
          title="Tempo atual"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${percentualAtual}%`,
            width: "2px",
            background: "#ffffff",
            boxShadow: "0 0 10px rgba(255,255,255,0.8)",
            zIndex: 4,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "7px",
          color: "#64748b",
          fontSize: "11px",
        }}
      >
        <span>00:00</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>Fim</span>
      </div>
    </div>
  );
}