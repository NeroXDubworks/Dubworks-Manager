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


def _dimensao_par(valor: int | float) -> int:
    numero = max(2, int(valor))
    return numero if numero % 2 == 0 else numero - 1


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

    arquivos_gerados: list[Path] = []

    with VideoFileClip(str(video_path)) as video:

        duracao_total = float(video.duration or 0)
        fps_saida = float(video.fps or 30)

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

            caminho_audio = caminho_saida.with_suffix(".m4a")

            corte = video.subclipped(
                inicio,
                fim,
            )

            corte_saida = corte

            try:
                largura = _dimensao_par(corte.w)
                altura = _dimensao_par(corte.h)

                if largura != int(corte.w) or altura != int(corte.h):
                    corte_saida = corte.resized(
                        new_size=(largura, altura),
                    )

                parametros = {
                    "codec": "libx264",
                    "preset": "ultrafast",
                    "threads": 1,
                    "fps": fps_saida,
                    "logger": None,
                    "ffmpeg_params": [
                        "-pix_fmt",
                        "yuv420p",
                        "-movflags",
                        "+faststart",
                    ],
                }

                if corte_saida.audio is not None:
                    parametros.update(
                        {
                            "audio": True,
                            "audio_codec": "aac",
                            "audio_bitrate": "128k",
                            "temp_audiofile": str(caminho_audio),
                            "remove_temp": True,
                        }
                    )
                else:
                    parametros["audio"] = False

                corte_saida.write_videofile(
                    str(caminho_saida),
                    **parametros,
                )

            except Exception as exc:
                caminho_saida.unlink(missing_ok=True)
                caminho_audio.unlink(missing_ok=True)

                raise RuntimeError(
                    f"Corte {indice} ({nome_corte}) falhou durante a codificação: {exc}"
                ) from exc

            finally:
                if corte_saida is not corte:
                    corte_saida.close()

                corte.close()

            if (
                not caminho_saida.exists()
                or caminho_saida.stat().st_size == 0
            ):
                raise RuntimeError(
                    f"Corte {indice}: o arquivo final não foi criado corretamente."
                )

            arquivos_gerados.append(
                caminho_saida
            )

    return arquivos_gerados
