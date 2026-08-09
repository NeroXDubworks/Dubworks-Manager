import type { RefObject } from "react";

type VideoPlayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onTempoAlterado: (tempo: number) => void;
  onDuracaoCarregada: (duracao: number) => void;
};

export default function VideoPlayer({
  videoRef,
  videoUrl,
  onTempoAlterado,
  onDuracaoCarregada,
}: VideoPlayerProps) {
  return (
    <div
      style={{
        overflow: "hidden",
        border: "1px solid rgba(148, 163, 184, 0.16)",
        borderRadius: "14px",
        background: "#000000",
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={(event) =>
          onTempoAlterado(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) =>
          onDuracaoCarregada(event.currentTarget.duration)
        }
        style={{
          display: "block",
          width: "100%",
          maxHeight: "560px",
          background: "#000000",
        }}
      >
        Seu navegador não consegue reproduzir este vídeo.
      </video>
    </div>
  );
}