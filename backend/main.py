from __future__ import annotations

import json
import shutil
import tempfile
import traceback
import uuid
import zipfile
from pathlib import Path

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.cortar import CorteEntrada, gerar_cortes
from backend.ia import responder_ia


app = FastAPI(title="DubWorks Manager")


# ==========================
# CORS
# ==========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ==========================
# HEALTH CHECK
# ==========================

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def apagar_pasta(caminho: Path) -> None:
    shutil.rmtree(caminho, ignore_errors=True)


# ==========================
# IA DUBWORKS
# ==========================

class AprovadoIA(BaseModel):
    personagem: str = ""
    dublador: str = ""
    telefone: str = ""
    funcao: str = ""


class ProjetoIA(BaseModel):
    id: str
    projeto: str

    status: str = ""
    tipo: str = ""
    genero: str = ""
    prioridade: str = ""

    lider: str = ""
    lider_nome: str = ""

    editor: str = ""

    data_inicio: str = ""
    ultimos_registros: str = ""

    # Dados usados para gerar o aviso oficial de seleção
    personagens_selecao: list[str] = Field(
        default_factory=list
    )

    link_falas_teste: str = ""
    link_formulario_selecao: str = ""

    # Elenco oficial / aprovados
    aprovados: list[AprovadoIA] = Field(
        default_factory=list
    )


class MensagemIA(BaseModel):
    mensagem: str

    projetos: list[ProjetoIA] = Field(
        default_factory=list
    )


@app.post("/ia/chat")
def chat_ia(dados: MensagemIA) -> dict:
    mensagem = dados.mensagem.strip()

    if not mensagem:
        raise HTTPException(
            status_code=400,
            detail="Digite uma mensagem para a IA.",
        )

    try:
        projetos = [
            projeto.model_dump()
            for projeto in dados.projetos
        ]

        total_aprovados = sum(
            len(projeto.get("aprovados", []))
            for projeto in projetos
        )

        projetos_com_selecao = sum(
            1
            for projeto in projetos
            if (
                projeto.get("personagens_selecao")
                or projeto.get("link_falas_teste")
                or projeto.get("link_formulario_selecao")
            )
        )

        print(
            f"[DubWorks IA] Mensagem recebida. "
            f"{len(projetos)} projeto(s) disponível(is). "
            f"{total_aprovados} integrante(s) de elenco disponível(is). "
            f"{projetos_com_selecao} projeto(s) com dados de seleção."
        )

        resultado = responder_ia(
            mensagem=mensagem,
            projetos=projetos,
        )

        if not resultado:
            raise ValueError(
                "A IA não retornou nenhuma resposta."
            )

        if not isinstance(resultado, dict):
            raise ValueError(
                "A IA retornou um formato de resposta inválido."
            )

        resposta = str(
            resultado.get("resposta")
            or ""
        ).strip()

        acao = resultado.get("acao")

        if not resposta:
            raise ValueError(
                "A IA não retornou nenhuma mensagem."
            )

        if acao:
            print(
                "[DubWorks IA] Ação proposta:",
                acao,
            )

        return {
            "resposta": resposta,
            "acao": acao,
        }

    except HTTPException:
        raise

    except Exception as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar a IA: {exc}",
        ) from exc


# ==========================
# SISTEMA DE CORTES
# ==========================

@app.post("/gerar-cortes")
async def gerar_cortes_endpoint(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    cortes_json: str = Form(...),
    nome_projeto: str = Form("Projeto"),
) -> FileResponse:

    try:
        dados = json.loads(cortes_json)

    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="Lista de cortes inválida.",
        ) from exc

    if not isinstance(dados, list) or not dados:
        raise HTTPException(
            status_code=400,
            detail="Adicione pelo menos um corte.",
        )

    cortes: list[CorteEntrada] = []

    for indice, item in enumerate(dados, start=1):

        if not isinstance(item, dict):
            raise HTTPException(
                status_code=400,
                detail=f"Corte {indice}: dados inválidos.",
            )

        try:
            inicio = float(item["inicio"])
            fim = float(item["fim"])

        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Corte {indice}: início ou fim inválido.",
            ) from exc

        if inicio < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Corte {indice}: o início não pode ser negativo.",
            )

        if fim <= inicio:
            raise HTTPException(
                status_code=400,
                detail=f"Corte {indice}: o fim precisa ser maior que o início.",
            )

        cortes.append(
            {
                "nome": str(
                    item.get("nome")
                    or f"Corte_{indice:02d}"
                ),
                "inicio": inicio,
                "fim": fim,
            }
        )

    nome_video = video.filename or "video.mp4"
    extensao = Path(nome_video).suffix.lower()

    if not extensao:
        extensao = ".mp4"

    extensoes_permitidas = {
        ".mp4",
        ".mkv",
        ".webm",
        ".mov",
        ".avi",
    }

    if extensao not in extensoes_permitidas:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de vídeo não suportado: {extensao}",
        )

    pasta = (
        Path(tempfile.gettempdir())
        / f"dubworks-{uuid.uuid4().hex}"
    )

    entrada = pasta / f"entrada{extensao}"
    saida = pasta / "cortes"
    zip_saida = pasta / "cortes_dubworks.zip"

    pasta.mkdir(
        parents=True,
        exist_ok=True,
    )

    saida.mkdir(
        parents=True,
        exist_ok=True,
    )

    try:

        with entrada.open("wb") as destino:

            while True:
                bloco = await video.read(1024 * 1024)

                if not bloco:
                    break

                destino.write(bloco)

        if not entrada.exists():
            raise ValueError(
                "O vídeo não foi salvo corretamente."
            )

        if entrada.stat().st_size == 0:
            raise ValueError(
                "O vídeo enviado está vazio."
            )

        print(
            f"[DubWorks] Vídeo recebido: "
            f"{entrada.stat().st_size / 1024 / 1024:.2f} MB"
        )

        arquivos = gerar_cortes(
            video_path=entrada,
            cortes=cortes,
            pasta_saida=saida,
            nome_projeto=nome_projeto,
        )

        if not arquivos:
            raise ValueError(
                "Nenhum corte foi gerado."
            )

        with zipfile.ZipFile(
            zip_saida,
            "w",
            compression=zipfile.ZIP_DEFLATED,
        ) as pacote:

            for arquivo in arquivos:

                arquivo = Path(arquivo)

                if not arquivo.exists():
                    continue

                pacote.write(
                    arquivo,
                    arcname=arquivo.name,
                )

        if not zip_saida.exists():
            raise ValueError(
                "O arquivo ZIP não foi criado."
            )

    except HTTPException:

        apagar_pasta(pasta)
        raise

    except ValueError as exc:

        apagar_pasta(pasta)

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        traceback.print_exc()

        apagar_pasta(pasta)

        raise HTTPException(
            status_code=500,
            detail=f"Não foi possível gerar os cortes: {exc}",
        ) from exc

    finally:

        await video.close()

    background_tasks.add_task(
        apagar_pasta,
        pasta,
    )

    return FileResponse(
        path=zip_saida,
        media_type="application/zip",
        filename="cortes_dubworks.zip",
        background=background_tasks,
    )