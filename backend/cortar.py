from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable, TypedDict

from moviepy import VideoFileClip


class CorteEntrada(TypedDict):
    nome: str
    inicio: float
    fim: float


def limpar_nome(valor: str, padrao: str) -> str:
    nome = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", valor).strip()
    nome = re.sub(r"\s+", "_", nome)

    return nome or padrao


def gerar_cortes(
    video_path: str | Path,
    cortes: Iterable[CorteEntrada],
    pasta_saida: str | Path,
    nome_projeto: str,
) -> list[Path]:

    video_path = Path(video_path)
    pasta_saida = Path(pasta_saida)

    pasta_saida.mkdir(
        parents=True,
        exist_ok=True,
    )

    projeto = limpar_nome(
        nome_projeto,
        video_path.stem,
    )

    arquivos_gerados = []

    with VideoFileClip(str(video_path)) as video:

        duracao_total = float(video.duration or 0)

        for indice, item in enumerate(cortes, start=1):

            inicio = max(
                0,
                float(item["inicio"]),
            )

            fim = min(
                float(item["fim"]),
                duracao_total,
            )

            if fim <= inicio:
                raise ValueError(
                    f"Corte {indice}: intervalo inválido."
                )

            nome_corte = limpar_nome(
                str(item.get("nome") or ""),
                f"Corte_{indice:02d}",
            )

            caminho_saida = (
                pasta_saida /
                f"{projeto}_{nome_corte}_{indice:02d}.mp4"
            )

            corte = video.subclipped(
                inicio,
                fim,
            )

            try:
                corte.write_videofile(
                    str(caminho_saida),
                    codec="libx264",
                    audio_codec="aac",
                    temp_audiofile=str(
                        caminho_saida.with_suffix(".m4a")
                    ),
                    remove_temp=True,
                    logger=None,
                )

            finally:
                corte.close()

            arquivos_gerados.append(
                caminho_saida
            )

    return arquivos_gerados