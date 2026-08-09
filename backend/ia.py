from __future__ import annotations

import json
import os
import re
import unicodedata
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from google import genai
from google.genai import types


INSTRUCOES_DUBWORKS = """
Você é a IA interna do DubWorks Manager.

A DubWorks trabalha com organização de projetos de dublagem, fandublagem,
dubladores, líderes, editores, elenco, seleções, entregas e produção audiovisual.

Sua função é ajudar os usuários do sistema com:

- organização de projetos;
- planejamento de produção;
- cronogramas;
- organização de elenco;
- criação e revisão de avisos de seleção;
- textos para comunicação interna;
- acompanhamento de entregas;
- relatórios;
- organização administrativa;
- ideias para melhorar processos;
- suporte aos líderes e à diretoria;
- dúvidas relacionadas ao funcionamento da DubWorks;
- análise da situação atual dos projetos cadastrados no DubWorks Manager;
- interpretação de pedidos de alteração em projetos;
- consulta ao elenco oficial/aprovados dos projetos;
- geração de listas de aprovados;
- geração de mensagens para aprovados com base nos dados oficiais do sistema;
- geração do aviso oficial de seleção da DubWorks a partir dos dados do projeto.

Responda sempre em português do Brasil.

Seja clara, prática e objetiva.

Os dados enviados pelo DubWorks Manager representam o estado atual
dos projetos que o usuário tem permissão para visualizar.

Ao responder sobre projetos:

- use somente os projetos recebidos do DubWorks Manager;
- não invente projetos;
- não invente status;
- não invente líderes;
- não invente editores;
- não invente datas;
- não invente prioridades;
- não invente informações de produção;
- não invente aprovados, personagens, dubladores ou telefones;
- se uma informação não estiver presente, informe que ela não consta no sistema;
- diferencie fatos registrados no sistema de sugestões ou análises suas.

Cada projeto pode possuir um campo chamado "aprovados".

Esse campo representa o elenco oficial já registrado no DubWorks Manager.
Quando o usuário pedir lista de aprovados, elenco aprovado, elenco oficial,
personagens selecionados ou pessoas aprovadas de um projeto:

- use somente o campo "aprovados" do projeto correspondente;
- não tente deduzir aprovados por status, nome, prioridade ou registros;
- não inclua pessoas que não estejam nessa lista;
- preserve personagem, dublador, telefone e função exatamente como recebidos;
- se o campo "aprovados" estiver vazio, informe que nenhum integrante de elenco
  foi disponibilizado para esse projeto;
- se o usuário pedir uma lista simples, organize preferencialmente como:
  Personagem — Dublador — Telefone;
- se telefone estiver vazio, informe "telefone não cadastrado";
- se o usuário pedir uma mensagem para os aprovados, use somente os dados
  recebidos e não invente nomes, personagens ou contatos;
- não exponha telefones quando eles não forem necessários para cumprir o pedido.

Você NÃO altera diretamente o banco de dados.

Quando o usuário solicitar uma alteração, sua função é identificar a alteração
e devolvê-la de forma estruturada para o DubWorks Manager.

O próprio DubWorks Manager será responsável por:

1. mostrar a alteração ao usuário;
2. pedir confirmação;
3. verificar as permissões do usuário;
4. atualizar o Supabase;
5. registrar o histórico.

Nunca diga que uma alteração foi realizada antes de o DubWorks Manager
confirmar que ela foi executada.
"""


MODELO_SELECAO = """📢 SELEÇÃO ABERTA | {nome_projeto}

{descricao}


━━━━━━━━━━━━━━
📌 Personagens disponíveis:

{personagens}

━━━━━━━━━━━━━━
📅 Inscrições abertas do dia: {data_inicio} até {data_fim}

📌 Como participar:

- Baixe os testes no Drive. 📂

{link_falas_teste}

- Envie pelo formulário. 📝

{link_formulario}

━━━━━━━━━━━━━━
❓ Dúvidas? Fale com o responsável pelo projeto:

Líder: {lider_nome}

Boa sorte a todos os participantes! 🎙️✨🌟"""


CAMPOS_EDITAVEIS = {
    "Status",
    "Prioridade",
    "Lider",
    "Editor",
    "Data_Inicio",
}


def limpar_json_resposta(texto: str) -> str:
    """
    Remove cercas de Markdown caso o modelo responda com ```json ... ```.
    """
    texto = texto.strip()

    texto = re.sub(
        r"^```(?:json)?\s*",
        "",
        texto,
        flags=re.IGNORECASE,
    )

    texto = re.sub(
        r"\s*```$",
        "",
        texto,
    )

    return texto.strip()


def localizar_projeto(
    projetos: list[dict],
    projeto_id: str | None,
    nome_projeto: str | None,
) -> dict | None:
    """
    Confirma que a ação proposta pelo Gemini se refere a um projeto
    que realmente foi enviado pelo DubWorks Manager.
    """

    if projeto_id:
        for projeto in projetos:
            if str(projeto.get("id", "")).strip() == str(projeto_id).strip():
                return projeto

    if nome_projeto:
        nome_normalizado = nome_projeto.strip().casefold()

        encontrados = [
            projeto
            for projeto in projetos
            if str(projeto.get("projeto", "")).strip().casefold()
            == nome_normalizado
        ]

        if len(encontrados) == 1:
            return encontrados[0]

    return None


def valor_atual_projeto(
    projeto: dict,
    campo: str,
) -> str:
    mapa = {
        "Status": "status",
        "Prioridade": "prioridade",
        "Lider": "lider",
        "Editor": "editor",
        "Data_Inicio": "data_inicio",
    }

    chave = mapa.get(campo)

    if not chave:
        return ""

    return str(projeto.get(chave, "") or "")



def normalizar_busca(valor: str) -> str:
    """
    Normaliza texto somente para localizar projetos/comandos.
    Os dados exibidos ao usuário continuam sendo os valores originais.
    """
    valor = unicodedata.normalize("NFKD", str(valor or ""))

    return "".join(
        caractere
        for caractere in valor
        if not unicodedata.combining(caractere)
    ).casefold().strip()


def localizar_projeto_na_mensagem(
    mensagem: str,
    projetos: list[dict],
) -> dict | None:
    """
    Localiza um projeto citado pelo nome na mensagem.
    Se mais de um nome casar, usa o nome mais específico/mais longo.
    """
    mensagem_normalizada = normalizar_busca(mensagem)

    encontrados: list[tuple[int, dict]] = []

    for projeto in projetos:
        nome = str(projeto.get("projeto", "") or "").strip()
        nome_normalizado = normalizar_busca(nome)

        if nome_normalizado and nome_normalizado in mensagem_normalizada:
            encontrados.append(
                (
                    len(nome_normalizado),
                    projeto,
                )
            )

    if not encontrados:
        return None

    encontrados.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    return encontrados[0][1]


def responder_consulta_aprovados_localmente(
    mensagem: str,
    projetos: list[dict],
) -> dict | None:
    """
    Consultas simples de aprovados/elenco são respondidas diretamente
    pelos dados oficiais enviados pelo DubWorks Manager.

    Isso evita gastar uma chamada do Gemini para uma consulta que não
    precisa de interpretação criativa e mantém essa função disponível
    mesmo quando a cota do Gemini acaba.
    """
    mensagem_normalizada = normalizar_busca(mensagem)

    termos_consulta = (
        "aprovad",
        "selecionad",
        "elenco",
        "personagens com dublador",
        "personagens que ja tem dublador",
        "personagens que já tem dublador",
    )

    if not any(
        termo in mensagem_normalizada
        for termo in termos_consulta
    ):
        return None

    projeto = localizar_projeto_na_mensagem(
        mensagem,
        projetos,
    )

    if not projeto:
        return {
            "resposta": (
                "Entendi que você quer consultar os aprovados/elenco, "
                "mas não consegui identificar com segurança qual projeto "
                "você mencionou."
            ),
            "acao": None,
        }

    nome_projeto = str(
        projeto.get("projeto", "")
        or "Projeto"
    ).strip()

    aprovados_brutos = projeto.get("aprovados", [])

    aprovados = (
        aprovados_brutos
        if isinstance(aprovados_brutos, list)
        else []
    )

    aprovados_validos = [
        item
        for item in aprovados
        if isinstance(item, dict)
        and (
            str(item.get("personagem", "") or "").strip()
            or str(item.get("dublador", "") or "").strip()
        )
    ]

    if not aprovados_validos:
        return {
            "resposta": (
                f"Não há aprovados/elenco oficial disponível nos dados "
                f"recebidos de {nome_projeto}."
            ),
            "acao": None,
        }

    quer_telefone = any(
        termo in mensagem_normalizada
        for termo in (
            "telefone",
            "contato",
            "numero",
            "whatsapp",
        )
    )

    quer_funcao = any(
        termo in mensagem_normalizada
        for termo in (
            "funcao",
            "função",
        )
    )

    quer_mensagem = any(
        termo in mensagem_normalizada
        for termo in (
            "mensagem",
            "aviso",
            "texto para",
            "texto pros",
            "texto para os",
        )
    )

    linhas: list[str] = []

    for item in aprovados_validos:
        personagem = str(
            item.get("personagem", "")
            or "Personagem não informado"
        ).strip()

        dublador = str(
            item.get("dublador", "")
            or "Dublador não informado"
        ).strip()

        partes = [
            personagem,
            dublador,
        ]

        if quer_telefone:
            telefone = str(
                item.get("telefone", "")
                or ""
            ).strip()

            partes.append(
                telefone
                if telefone
                else "telefone não cadastrado"
            )

        if quer_funcao:
            funcao = str(
                item.get("funcao", "")
                or "Dublador"
            ).strip()

            partes.append(funcao)

        linhas.append(
            " — ".join(partes)
        )

    if quer_mensagem:
        elenco_formatado = "\n".join(
            f"- {linha}"
            for linha in linhas
        )

        resposta = (
            f"📢 APROVADOS | {nome_projeto}\n\n"
            "Parabéns aos selecionados! 🎙️\n\n"
            f"Confira o elenco aprovado:\n{elenco_formatado}\n\n"
            "Fiquem atentos às próximas orientações e aos prazos do projeto."
        )

        return {
            "resposta": resposta,
            "acao": None,
        }

    lista_formatada = "\n".join(
        f"- {linha}"
        for linha in linhas
    )

    return {
        "resposta": (
            f"Encontrei {len(aprovados_validos)} integrante(s) no elenco "
            f"oficial de {nome_projeto}:\n\n"
            f"{lista_formatada}"
        ),
        "acao": None,
    }



def eh_pedido_geracao_selecao(mensagem: str) -> bool:
    """
    Reconhece pedidos explícitos para gerar o aviso oficial de seleção.
    """
    mensagem_normalizada = normalizar_busca(mensagem)

    termos = (
        "gera a selecao",
        "gera selecao",
        "gerar a selecao",
        "gerar selecao",
        "cria a selecao",
        "cria selecao",
        "criar a selecao",
        "criar selecao",
        "faz a selecao",
        "faz selecao",
        "aviso de selecao",
        "selecao aberta",
    )

    return any(
        termo in mensagem_normalizada
        for termo in termos
    )


def descricao_selecao_fallback(nome_projeto: str) -> str:
    """
    Descrição curta usada quando o Gemini está sem cota ou indisponível.
    Assim o aviso continua funcionando mesmo sem uma chamada de IA.
    """
    return (
        f"Chegou a hora de dar voz ao universo de {nome_projeto}! "
        "Prepare sua melhor interpretação e mostre seu talento "
        "nesta seleção da DubWorks."
    )


def gerar_descricao_selecao_com_gemini(
    nome_projeto: str,
) -> str:
    """
    Usa o Gemini somente para a parte criativa do aviso.
    Todo o restante do texto é montado localmente com dados oficiais.
    """
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return descricao_selecao_fallback(nome_projeto)

    client = genai.Client(
        api_key=api_key
    )

    prompt = f"""
Crie uma descrição curta e temática para abrir um aviso de seleção
de dublagem do projeto "{nome_projeto}".

REGRAS:
- escreva em português do Brasil;
- use no máximo 2 frases;
- faça referência ao universo/atmosfera da obra apenas quando tiver
  segurança sobre isso;
- não invente personagens;
- não invente datas;
- não invente links;
- não invente informações sobre a produção;
- não coloque título;
- não coloque lista;
- não repita o nome do projeto desnecessariamente;
- o texto deve convidar as pessoas a participar da seleção;
- pode usar até 3 emojis coerentes com o tom da obra;
- responda EXCLUSIVAMENTE com JSON válido no formato:
  {{"descricao": "texto"}}
"""

    resposta, erro_gemini, modelo_usado = gerar_conteudo_gemini(
        client=client,
        prompt=prompt,
    )

    if resposta is None:
        if erro_gemini:
            print(
                "[DubWorks IA] Não foi possível gerar a descrição temática. "
                "Usando descrição local."
            )

        return descricao_selecao_fallback(nome_projeto)

    if modelo_usado:
        print(
            f"[DubWorks IA] Descrição da seleção gerada com {modelo_usado}."
        )

    texto_resposta = limpar_json_resposta(
        resposta.text or ""
    )

    if not texto_resposta:
        return descricao_selecao_fallback(nome_projeto)

    try:
        dados = json.loads(texto_resposta)
    except json.JSONDecodeError:
        return descricao_selecao_fallback(nome_projeto)

    descricao = str(
        dados.get("descricao")
        or ""
    ).strip()

    return (
        descricao
        if descricao
        else descricao_selecao_fallback(nome_projeto)
    )


def responder_geracao_selecao_localmente(
    mensagem: str,
    projetos: list[dict],
) -> dict | None:
    """
    Monta o aviso oficial de seleção usando os dados recebidos do Manager.

    O Gemini, quando disponível, é usado somente para gerar a descrição
    temática. Nome, personagens, prazo, links e líder nunca são inventados.
    """
    if not eh_pedido_geracao_selecao(mensagem):
        return None

    projeto = localizar_projeto_na_mensagem(
        mensagem,
        projetos,
    )

    if not projeto:
        return {
            "resposta": (
                "Entendi que você quer gerar um aviso de seleção, "
                "mas não consegui identificar com segurança qual projeto "
                "você mencionou."
            ),
            "acao": None,
        }

    nome_projeto = str(
        projeto.get("projeto", "")
        or ""
    ).strip()

    lider_nome = str(
        projeto.get("lider_nome", "")
        or projeto.get("lider", "")
        or ""
    ).strip()

    link_falas_teste = str(
        projeto.get("link_falas_teste", "")
        or ""
    ).strip()

    link_formulario = str(
        projeto.get("link_formulario_selecao", "")
        or ""
    ).strip()

    personagens_brutos = projeto.get(
        "personagens_selecao",
        [],
    )

    personagens: list[str] = []

    if isinstance(personagens_brutos, list):
        vistos: set[str] = set()

        for item in personagens_brutos:
            personagem = str(
                item
                or ""
            ).strip()

            chave = normalizar_busca(personagem)

            if personagem and chave not in vistos:
                vistos.add(chave)
                personagens.append(personagem)

    faltando: list[str] = []

    if not personagens:
        faltando.append("personagens do projeto")

    if not link_falas_teste:
        faltando.append("link do Drive das falas de teste")

    if not link_formulario:
        faltando.append("link do formulário de seleção")

    if not lider_nome:
        faltando.append("líder do projeto")

    if faltando:
        itens = "\n".join(
            f"- {item}"
            for item in faltando
        )

        return {
            "resposta": (
                f"Não consigo gerar a seleção de {nome_projeto} ainda.\n\n"
                f"Falta cadastrar:\n{itens}"
            ),
            "acao": None,
        }

    agora_sp = datetime.now(
        ZoneInfo("America/Sao_Paulo")
    )

    data_inicio = agora_sp.date()
    data_fim = data_inicio + timedelta(days=7)

    personagens_formatados = "\n".join(
        f"• {personagem}"
        for personagem in personagens
    )

    descricao = gerar_descricao_selecao_com_gemini(
        nome_projeto
    )

    aviso = MODELO_SELECAO.format(
        nome_projeto=nome_projeto,
        descricao=descricao,
        personagens=personagens_formatados,
        data_inicio=data_inicio.strftime("%d/%m/%Y"),
        data_fim=data_fim.strftime("%d/%m/%Y"),
        link_falas_teste=link_falas_teste,
        link_formulario=link_formulario,
        lider_nome=lider_nome,
    )

    return {
        "resposta": aviso,
        "acao": None,
    }


def modelos_gemini_configurados() -> list[str]:
    """
    Modelo principal + fallbacks opcionais.

    Exemplo no terminal:
    export GEMINI_FALLBACK_MODELS="modelo-a,modelo-b"

    Não há fallback inventado no código: só são usados modelos que você
    configurar explicitamente.
    """
    principal = (
        os.getenv("GEMINI_MODEL")
        or "gemini-3.6-flash"
    ).strip()

    extras = [
        modelo.strip()
        for modelo in (
            os.getenv("GEMINI_FALLBACK_MODELS")
            or ""
        ).split(",")
        if modelo.strip()
    ]

    modelos: list[str] = []

    for modelo in [principal, *extras]:
        if modelo and modelo not in modelos:
            modelos.append(modelo)

    return modelos


def erro_temporario_gemini(exc: Exception) -> bool:
    texto = str(exc).casefold()

    sinais = (
        "429",
        "resource_exhausted",
        "quota",
        "503",
        "unavailable",
        "high demand",
    )

    return any(
        sinal in texto
        for sinal in sinais
    )


def erro_de_quota_gemini(exc: Exception) -> bool:
    texto = str(exc).casefold()

    return any(
        sinal in texto
        for sinal in (
            "429",
            "resource_exhausted",
            "quota exceeded",
        )
    )


def gerar_conteudo_gemini(
    client,
    prompt: str,
):
    """
    Tenta o modelo principal e, se houver erro temporário/quota,
    tenta os fallbacks configurados em GEMINI_FALLBACK_MODELS.
    """
    modelos = modelos_gemini_configurados()
    ultimo_erro: Exception | None = None

    for indice, modelo in enumerate(modelos):
        try:
            resposta = client.models.generate_content(
                model=modelo,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=INSTRUCOES_DUBWORKS,
                    response_mime_type="application/json",
                ),
            )

            return resposta, None, modelo

        except Exception as exc:
            ultimo_erro = exc

            tem_proximo = indice < len(modelos) - 1

            if erro_temporario_gemini(exc) and tem_proximo:
                print(
                    f"[DubWorks IA] Modelo {modelo} indisponível/sem cota. "
                    "Tentando fallback..."
                )
                continue

            if erro_temporario_gemini(exc):
                return None, exc, None

            raise

    return None, ultimo_erro, None


def responder_ia(
    mensagem: str,
    projetos: list[dict] | None = None,
) -> dict:
    mensagem = mensagem.strip()

    if not mensagem:
        return {
            "resposta": "Digite uma mensagem para que eu possa ajudar.",
            "acao": None,
        }

    projetos = projetos or []

    resposta_selecao = responder_geracao_selecao_localmente(
        mensagem=mensagem,
        projetos=projetos,
    )

    if resposta_selecao is not None:
        return resposta_selecao

    resposta_local = responder_consulta_aprovados_localmente(
        mensagem=mensagem,
        projetos=projetos,
    )

    if resposta_local is not None:
        return resposta_local

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "A variável GEMINI_API_KEY não está configurada."
        )

    client = genai.Client(
        api_key=api_key
    )

    contexto_projetos = json.dumps(
        projetos,
        ensure_ascii=False,
        indent=2,
    )

    if projetos:
        contexto = f"""
DADOS ATUAIS DOS PROJETOS DISPONÍVEIS PARA ESTE USUÁRIO:

{contexto_projetos}
"""
    else:
        contexto = """
Nenhum projeto foi enviado pelo DubWorks Manager nesta solicitação.

Caso a pergunta dependa dos projetos atuais, explique que os dados
não foram disponibilizados.
"""

    prompt = f"""
{contexto}

PERGUNTA DO USUÁRIO:

{mensagem}

Você deve responder EXCLUSIVAMENTE com um objeto JSON válido.

Não use ```json.
Não use blocos Markdown ao redor do JSON.
Não escreva nada antes ou depois do JSON.

FORMATO OBRIGATÓRIO:

{{
  "resposta": "texto que será exibido ao usuário",
  "acao": null
}}

Caso o usuário esteja apenas fazendo uma pergunta, pedindo análise,
relatório, texto, explicação ou consulta, mantenha:

"acao": null

Caso o usuário peça explicitamente para ALTERAR um projeto, use:

{{
  "resposta": "texto explicando a alteração que foi identificada e informando que ela precisa ser confirmada",
  "acao": {{
    "tipo": "atualizar_projeto",
    "projeto_id": "ID real do projeto",
    "projeto": "nome real do projeto",
    "campo": "Status",
    "valor_atual": "valor atual real",
    "novo_valor": "novo valor solicitado"
  }}
}}

REGRAS PARA APROVADOS E ELENCO OFICIAL:

1. Cada projeto pode conter a chave "aprovados".

2. "aprovados" é a fonte oficial para responder perguntas como:
   - "Gera a lista de aprovados de Kakegurui."
   - "Quem está no elenco de Beastars?"
   - "Quais personagens já têm dublador?"
   - "Me passa os aprovados com telefone."
   - "Cria uma mensagem para os aprovados."

3. Para essas perguntas, use SOMENTE os objetos existentes em "aprovados".

4. Cada integrante pode conter:
   - personagem;
   - dublador;
   - telefone;
   - funcao.

5. Não invente integrantes ausentes.

6. Não use "ultimos_registros" para concluir que alguém foi aprovado.

7. Se a lista estiver vazia, informe claramente que não há aprovados/elenco
   oficial disponível nos dados recebidos daquele projeto.

8. Quando o usuário pedir apenas a lista, use um formato legível. Exemplo:

   Yumeko Jabami — Maria Silva — (11) 99999-9999
   Mary Saotome — João Souza — telefone não cadastrado

9. Quando o usuário pedir texto ou mensagem para enviar aos aprovados,
   gere o texto normalmente dentro de "resposta" e mantenha "acao": null.

10. Consultar ou gerar lista de aprovados NÃO é uma alteração no projeto.
    Portanto, nunca crie uma ação "atualizar_projeto" apenas por esse pedido.

CAMPOS QUE PODEM SER PROPOSTOS PARA ALTERAÇÃO NESTA VERSÃO:

- Status
- Prioridade
- Lider
- Editor
- Data_Inicio

REGRAS PARA AÇÕES:

1. Só crie uma ação se o usuário estiver claramente solicitando uma alteração.

2. O projeto precisa existir nos dados enviados acima.

3. Use sempre o ID real recebido no campo "id".

4. Não invente IDs.

5. Não invente nomes de projetos.

6. Não crie ação se houver dúvida sobre qual projeto o usuário quis dizer.

7. O campo precisa ser exatamente um destes:
   Status
   Prioridade
   Lider
   Editor
   Data_Inicio

8. "situação" deve ser interpretada como "Status" quando o contexto indicar
   que o usuário está falando da situação operacional do projeto.

9. "líder" corresponde ao campo "Lider".

10. "data de início" corresponde ao campo "Data_Inicio".

11. O valor_atual deve ser baseado nos dados recebidos.

12. O novo_valor deve corresponder ao que o usuário solicitou.

13. NÃO diga que a alteração já foi realizada.

14. Informe na resposta que a alteração está aguardando confirmação.

15. Se o usuário pedir várias alterações ao mesmo tempo, NÃO crie uma ação
    nesta versão. Explique que deve solicitar uma alteração por vez.

EXEMPLO:

Usuário:
"Muda Kakegurui para Em edição."

Resposta JSON:

{{
  "resposta": "Identifiquei a alteração de Kakegurui: o status será alterado de 'Em andamento' para 'Em edição'. Confirme a alteração para que ela seja aplicada.",
  "acao": {{
    "tipo": "atualizar_projeto",
    "projeto_id": "30",
    "projeto": "Kakegurui",
    "campo": "Status",
    "valor_atual": "Em andamento",
    "novo_valor": "Em edição"
  }}
}}

Se for apenas uma consulta, inclusive consultas sobre aprovados, elenco oficial,
personagens selecionados ou geração de mensagens para aprovados, responda
normalmente dentro do campo "resposta" e deixe "acao" como null.
"""

    resposta, erro_gemini, modelo_usado = gerar_conteudo_gemini(
        client=client,
        prompt=prompt,
    )

    if resposta is None:
        if erro_gemini and erro_de_quota_gemini(erro_gemini):
            return {
                "resposta": (
                    "A cota do Gemini foi atingida neste momento. "
                    "Consultas de aprovados, elenco e geração do aviso de seleção "
                    "continuam disponíveis porque usam os dados do "
                    "DubWorks Manager. Para outros pedidos, tente novamente "
                    "quando a cota for liberada."
                ),
                "acao": None,
            }

        return {
            "resposta": (
                "O Gemini está temporariamente indisponível. "
                "Tente novamente em alguns instantes."
            ),
            "acao": None,
        }

    if modelo_usado:
        print(
            f"[DubWorks IA] Resposta gerada com {modelo_usado}."
        )

    texto = resposta.text

    if not texto:
        raise RuntimeError(
            "O Gemini não retornou nenhuma resposta."
        )

    texto = limpar_json_resposta(texto)

    try:
        dados = json.loads(texto)

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "O Gemini retornou uma resposta em formato inválido."
        ) from exc

    resposta_usuario = str(
        dados.get("resposta")
        or "Não consegui gerar uma resposta."
    ).strip()

    acao = dados.get("acao")

    if not isinstance(acao, dict):
        return {
            "resposta": resposta_usuario,
            "acao": None,
        }

    if acao.get("tipo") != "atualizar_projeto":
        return {
            "resposta": resposta_usuario,
            "acao": None,
        }

    projeto_id = str(
        acao.get("projeto_id")
        or ""
    ).strip()

    nome_projeto = str(
        acao.get("projeto")
        or ""
    ).strip()

    campo = str(
        acao.get("campo")
        or ""
    ).strip()

    novo_valor = str(
        acao.get("novo_valor")
        or ""
    ).strip()

    if campo not in CAMPOS_EDITAVEIS:
        return {
            "resposta": (
                "Entendi que você deseja alterar um projeto, "
                "mas esse campo ainda não pode ser modificado pela IA."
            ),
            "acao": None,
        }

    if not novo_valor:
        return {
            "resposta": (
                "Entendi qual projeto você quer alterar, "
                "mas não consegui identificar o novo valor."
            ),
            "acao": None,
        }

    projeto_real = localizar_projeto(
        projetos=projetos,
        projeto_id=projeto_id,
        nome_projeto=nome_projeto,
    )

    if not projeto_real:
        return {
            "resposta": (
                "Não consegui confirmar com segurança qual projeto "
                "deve ser alterado."
            ),
            "acao": None,
        }

    projeto_id_real = str(
        projeto_real.get("id", "")
    )

    nome_real = str(
        projeto_real.get("projeto", "")
    )

    valor_atual_real = valor_atual_projeto(
        projeto_real,
        campo,
    )

    acao_validada = {
        "tipo": "atualizar_projeto",
        "projeto_id": projeto_id_real,
        "projeto": nome_real,
        "campo": campo,
        "valor_atual": valor_atual_real,
        "novo_valor": novo_valor,
    }

    return {
        "resposta": resposta_usuario,
        "acao": acao_validada,
    }