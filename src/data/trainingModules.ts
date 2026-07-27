import type { ModuloTreinamento } from "../types";

export const modulosTreinamentoLider: ModuloTreinamento[] = [
  {
    id: "papel-lider",
    titulo: "1. O papel do líder de projetos",
    descricao:
      "Entender, de forma completa, o que é um líder de projetos e qual responsabilidade ele assume dentro da DubWorks.",
    conteudos: [
      "O líder de projetos é a pessoa responsável por transformar uma ideia em uma produção organizada. Ele acompanha o projeto desde a preparação até a entrega final.",
      "Na DubWorks, o líder não é apenas alguém que cria grupo e manda aviso. Ele precisa garantir que o projeto tenha planejamento, pasta organizada, seleção clara, elenco definido, prazos combinados, acompanhamento de entregas e registros no sistema.",
      "O líder funciona como uma ponte entre diretoria, editor e elenco. Quando alguém tem dúvida sobre prazo, personagem, pasta, formulário ou entrega, o líder precisa saber orientar ou buscar a resposta com a diretoria.",
      "O líder não substitui a diretoria. A diretoria acompanha decisões maiores, aprova organização, orienta processos e pode interferir quando há problema grave, atraso recorrente ou desorganização.",
      "O líder também não substitui o editor. O editor cuida da montagem/edição do material, enquanto o líder acompanha se o elenco entregou, se os arquivos estão no lugar certo e se o projeto está avançando.",
      "A função principal do líder é manter o projeto vivo, organizado e rastreável. Se a diretoria abrir o DubWorks Manager, precisa entender o que está acontecendo sem depender de mensagens perdidas no WhatsApp.",
      "Um bom líder precisa ter responsabilidade, comunicação, paciência, organização, atenção aos detalhes e compromisso com os registros semanais.",
      "Se o projeto está parado, o líder precisa registrar. Se alguém sumiu, precisa registrar. Se o Drive está errado, precisa registrar. Se a edição avançou, também precisa registrar.",
    ],
    checklist: [
      "Entendeu o papel do líder",
      "Entendeu que o líder organiza o projeto do início ao fim",
      "Entendeu a diferença entre líder, editor e diretoria",
      "Entendeu que tudo precisa ficar registrado no sistema",
    ],
    pergunta: {
      pergunta:
        "Qual é a principal função do líder de projetos dentro da DubWorks?",
      alternativas: [
        "Apenas escolher os dubladores e deixar o resto com a diretoria.",
        "Organizar, acompanhar, comunicar e registrar o andamento do projeto do início ao fim.",
        "Fazer a edição final de todos os vídeos.",
        "Criar grupos no WhatsApp sem precisar acompanhar as entregas.",
      ],
      correta: 1,
      explicacao:
        "O líder é responsável por manter o projeto organizado, acompanhar entregas, comunicar problemas e registrar tudo no sistema.",
    },
  },
  {
    id: "responsabilidades",
    titulo: "2. Funções e responsabilidades do líder",
    descricao:
      "Aprender todas as responsabilidades práticas que o líder assume ao cuidar de um projeto.",
    conteudos: [
      "Antes de abrir uma seleção, o líder precisa planejar o projeto. Isso inclui entender o tipo de projeto, a duração, a quantidade de personagens, a dificuldade e o prazo realista.",
      "O líder deve organizar as pastas do projeto no Drive seguindo o padrão da DubWorks. Isso evita arquivos perdidos e facilita a revisão da diretoria.",
      "O líder também precisa preparar os formulários. Um formulário mal configurado pode impedir o envio dos testes ou misturar arquivos de personagens diferentes.",
      "Durante a seleção, o líder deve divulgar corretamente o projeto, conferir se os links funcionam e responder dúvidas básicas dos membros.",
      "Depois da seleção, o líder organiza o elenco, registra os personagens no sistema e orienta cada dublador sobre o que precisa entregar.",
      "Durante a produção, o líder acompanha gravações, cobra pendências com respeito, mantém contato com o editor e avisa a diretoria quando algo sai do controle.",
      "Toda semana, mesmo que nada tenha acontecido, o líder precisa registrar o status. Um projeto sem registro parece abandonado.",
      "Se houver troca de líder, troca de editor, atraso, substituição de dublador, correção de link ou entrega final, isso precisa aparecer no histórico/registro do projeto.",
    ],
    checklist: [
      "Sabe planejar antes de abrir seleção",
      "Sabe organizar Drive",
      "Sabe preparar formulários",
      "Sabe acompanhar entregas",
      "Sabe registrar andamento",
    ],
    pergunta: {
      pergunta:
        "O que o líder deve fazer quando um projeto fica parado ou sem entregas?",
      alternativas: [
        "Não fazer nada e esperar alguém perguntar.",
        "Apagar o projeto do sistema.",
        "Registrar a situação, identificar o motivo e comunicar a diretoria se necessário.",
        "Culpar o editor e sair do projeto.",
      ],
      correta: 2,
      explicacao:
        "Projeto parado também precisa de registro. A diretoria precisa saber o motivo e o próximo passo.",
    },
  },
  {
    id: "sistema",
    titulo: "3. Como mexer no DubWorks Manager",
    descricao:
      "Aprender a usar o sistema interno da DubWorks para criar, acompanhar e atualizar projetos.",
    conteudos: [
      "O DubWorks Manager é o painel interno usado para acompanhar projetos, elenco, links, registros e histórico. Ele existe para reduzir bagunça e impedir que informações importantes fiquem perdidas no WhatsApp.",
      "Ao entrar no sistema, o líder deve acessar a aba Projetos. Nela aparecem os projetos vinculados ao nome ou vínculo do usuário cadastrado.",
      "Para abrir um projeto, clique na linha dele. A visualização do projeto mostra abas internas: Informações, Elenco, Registros Semanais, Arquivos do Drive, Atividades e Histórico.",
      "Na aba Informações, ficam os dados principais: nome do projeto, tipo, gênero, prioridade, status, líder, editor, data, capa, observações e outros campos de controle.",
      "Na aba Elenco, o líder adiciona personagens, informa quem dubla cada personagem, remove personagens incorretos e usa o botão Salvar elenco para gravar a alteração.",
      "Na aba Registros Semanais, o líder escreve o andamento real do projeto. Exemplo: 'Semana 02: 4 dubladores entregaram, 2 pendentes, edição ainda não iniciada'.",
      "Na aba Arquivos do Drive, o líder registra os links principais do projeto: pasta principal, cortes/cenas, materiais de personagens e finalizados.",
      "Na aba Histórico, aparecem alterações importantes feitas no projeto. O histórico ajuda a entender quem alterou algo e quando.",
      "Sempre que mexer em dados importantes, o líder deve clicar no botão de salvar/atualizar correspondente. Se não salvar, a informação pode ficar só na tela e se perder.",
      "O líder deve evitar colocar informações soltas em observações quando já existe campo específico para aquilo. Link vai em Drive, andamento vai em Registro Semanal, elenco vai em Elenco.",
    ],
    checklist: [
      "Sabe abrir projeto",
      "Sabe usar Informações",
      "Sabe usar Elenco",
      "Sabe usar Drive",
      "Sabe usar Registros Semanais",
      "Sabe conferir Histórico",
    ],
    pergunta: {
      pergunta: "Onde o líder deve registrar o andamento semanal do projeto?",
      alternativas: [
        "Apenas no grupo do WhatsApp.",
        "Na aba Registros Semanais do projeto.",
        "No nome do projeto.",
        "Somente no campo de gênero.",
      ],
      correta: 1,
      explicacao:
        "O andamento deve ficar no sistema, na aba Registros Semanais, para a diretoria conseguir acompanhar.",
    },
  },
  {
    id: "planejamento",
    titulo: "4. Planejamento do projeto teste",
    descricao:
      "Aprender a planejar um projeto pequeno, rápido e adequado para treinamento de liderança.",
    conteudos: [
      "No treinamento, o líder deve organizar um projeto teste. Esse projeto serve para mostrar se ele sabe conduzir uma produção real, mas em tamanho reduzido.",
      "O projeto teste pode ser uma comic curta, uma cena pequena, um vídeo curto ou um material de aproximadamente 5 minutos.",
      "Antes de abrir seleção, o líder precisa definir o nome do projeto, tipo, gênero, quantidade de personagens, tempo de duração, prazo de seleção, prazo de entrega e responsável pela edição.",
      "O líder deve evitar começar projetos grandes no treinamento. Projetos longos exigem mais experiência, mais cobrança e mais risco de abandono.",
      "Para vídeos e episódios, uma referência inicial é 1 semana para aproximadamente 5 minutos de vídeo. Se houver muita dificuldade, o prazo pode ser ajustado com aprovação.",
      "Para comics, HQs ou mangás, uma referência inicial é 1 semana para 1 capítulo inteiro, dependendo do tamanho.",
      "O planejamento precisa ser claro o suficiente para outra pessoa entender o projeto sem precisar perguntar tudo no privado.",
      "Depois de planejar, o líder deve registrar o projeto no sistema e manter as informações atualizadas.",
    ],
    checklist: [
      "Definiu projeto teste",
      "Definiu escopo",
      "Definiu personagens",
      "Definiu prazos",
      "Definiu edição",
      "Registrou no sistema",
    ],
    pergunta: {
      pergunta:
        "Qual tipo de projeto é mais indicado para treinamento de líder?",
      alternativas: [
        "Um projeto enorme com várias temporadas.",
        "Um projeto pequeno, como comic curta, cena ou vídeo de cerca de 5 minutos.",
        "Um projeto sem prazo definido.",
        "Um projeto sem editor e sem pasta organizada.",
      ],
      correta: 1,
      explicacao:
        "No treinamento, o ideal é um projeto pequeno para avaliar organização, comunicação e entrega.",
    },
  },
  {
    id: "pastas",
    titulo: "5. Estrutura de pastas no Drive",
    descricao:
      "Aprender a criar e organizar pastas dentro de pastas seguindo o padrão real da DubWorks.",
    conteudos: [
      "A organização do Drive é uma das partes mais importantes do trabalho do líder. Uma pasta mal organizada atrasa elenco, editor e diretoria.",
      "A estrutura oficial da DubWorks é dividida em 3 pastas principais dentro da pasta do projeto: 1 | Seleção, 2 | Projeto e 3 | Finalizado.",
      "A pasta 1 | Seleção deve guardar tudo que pertence à fase de seleção: falas teste, formulário de seleção, testes enviados e resultado final da seleção.",
      "A pasta 2 | Projeto deve guardar tudo que pertence à produção em andamento: cortes, cenas, áudios recebidos, materiais de edição, andamento semanal e organização interna do projeto.",
      "A pasta 3 | Finalizado deve guardar tudo que já está concluído: vídeos finais, créditos, thumbs, renders, capas e arquivos finais do projeto.",
      "Dentro da pasta 1 | Seleção, as falas teste devem ser claras, curtas e separadas por personagem. O ideal é que cada teste tenha até 30 segundos.",
      "Os arquivos de teste devem seguir o padrão: [Feminino] Nome, [Masculino] Nome ou [S/Gênero] Nome. Isso ajuda os membros a identificarem personagens e evita confusão.",
      "Dentro da pasta 2 | Projeto, o líder pode criar subpastas por episódio, semana, cena, parte ou personagem, dependendo do tipo de produção.",
      "Para episódios, use o padrão: [EP-XX] Semana XX | Parte YY. Exemplo: [EP-01] Semana 01 | Parte 02.",
      "Para comics/HQs, use o padrão: [CP-XX] Página YY. Exemplo: [CP-01] Página 05.",
      "Para cenas ou vídeos curtos, use o padrão: [S-XX] Parte YY. Exemplo: [S-01] Parte 03.",
      "Cada parte de vídeo deve ter aproximadamente 1 minuto, podendo chegar no máximo a 1 minuto e 30 segundos quando necessário.",
      "Depois de criar as pastas, os links principais devem ser salvos no DubWorks Manager, principalmente pasta principal, cortes/cenas e finalizados.",
    ],
    checklist: [
      "Criou pasta 1 | Seleção",
      "Criou pasta 2 | Projeto",
      "Criou pasta 3 | Finalizado",
      "Organizou falas teste",
      "Organizou cortes/cenas",
      "Salvou links no sistema",
    ],
    pergunta: {
      pergunta: "Qual é a estrutura oficial principal de pastas da DubWorks?",
      alternativas: [
        "01 - Falas Teste, 02 - Cortes, 03 - Edição e 04 - Materiais.",
        "1 | Seleção, 2 | Projeto e 3 | Finalizado.",
        "Teste, Render, Aleatórios e Antigos.",
        "Somente uma pasta única com todos os arquivos misturados.",
      ],
      correta: 1,
      explicacao:
        "A estrutura oficial é formada por três pastas principais: 1 | Seleção, 2 | Projeto e 3 | Finalizado.",
    },
  },
  {
    id: "formularios",
    titulo: "6. Criação de formulários",
    descricao:
      "Aprender a criar formulários para seleção e entrega de falas/vídeos.",
    conteudos: [
      "Os formulários são essenciais porque os vídeos, áudios e testes dos membros geralmente são entregues por lá.",
      "O líder deve criar ou adaptar um formulário para seleção. Esse formulário recebe os testes dos membros interessados nos personagens.",
      "O formulário de seleção deve ter título claro com o nome do projeto, descrição com prazo, link para falas teste, campo para nome do membro, contato e personagem escolhido.",
      "Também precisa ter campo de upload para o membro enviar o teste. Se o upload não estiver funcionando, o processo inteiro fica comprometido.",
      "O líder também deve criar ou adaptar um formulário de entrega. Esse formulário é usado depois da seleção, quando os dubladores oficiais enviam suas falas.",
      "O formulário de entrega deve pedir nome do membro, personagem, parte/semana, observações e arquivo enviado.",
      "A descrição do formulário deve explicar o padrão de envio: áudio limpo, sem efeitos desnecessários, nome correto e envio dentro do prazo.",
      "Antes de divulgar qualquer formulário, o líder precisa testar como se fosse um membro. Isso evita problema de permissão, campo obrigatório faltando ou upload bloqueado.",
      "Depois que os arquivos chegarem, o líder deve organizar as respostas e mover/identificar os arquivos dentro da pasta correta do Drive.",
      "Os links dos formulários e pastas importantes devem ser registrados no sistema para a diretoria conseguir consultar.",
    ],
    checklist: [
      "Criou formulário de seleção",
      "Criou formulário de entrega",
      "Configurou upload",
      "Testou envio",
      "Organizou respostas",
      "Salvou links",
    ],
    pergunta: {
      pergunta:
        "O que o líder deve fazer antes de divulgar um formulário para os membros?",
      alternativas: [
        "Divulgar rápido sem testar.",
        "Testar o formulário, verificar campos, prazo, link e upload.",
        "Pedir para o editor resolver depois.",
        "Deixar sem campo de upload.",
      ],
      correta: 1,
      explicacao:
        "O líder precisa testar o formulário antes de divulgar para garantir que o envio funciona corretamente.",
    },
  },
  {
    id: "avisos",
    titulo: "7. Avisos e comunicação do projeto",
    descricao:
      "Aprender a divulgar seleção, lembretes, encerramento e resultado de forma clara.",
    conteudos: [
      "A comunicação do líder precisa ser clara, completa e organizada. Aviso confuso gera dúvidas, atraso e retrabalho.",
      "O aviso de abertura de seleção deve informar nome do projeto, breve descrição, personagens disponíveis, prazo, link das falas teste, link do formulário e contato do líder/editor.",
      "O líder precisa conferir se todos os links estão abrindo antes de divulgar. Link quebrado passa impressão de desorganização.",
      "Durante a seleção, o líder deve enviar lembretes. Exemplos: faltam 3 dias, faltam 2 dias, último dia e seleção encerrada.",
      "O aviso de encerramento deve informar que o prazo acabou e que os testes serão analisados.",
      "O resultado da seleção deve listar personagem e dublador escolhido de forma clara.",
      "Depois do resultado, o líder deve orientar o elenco sobre próximo passo: grupo, prazo de entrega, pasta do projeto e formulário de envio.",
      "O líder deve evitar discussões públicas, indiretas e cobranças agressivas. Cobrança deve ser firme, mas respeitosa.",
    ],
    checklist: [
      "Criou aviso de abertura",
      "Incluiu links",
      "Criou lembretes",
      "Criou encerramento",
      "Divulgou resultado",
      "Orientou próximos passos",
    ],
    pergunta: {
      pergunta: "O que um aviso de abertura de seleção precisa conter?",
      alternativas: [
        "Somente o nome do projeto.",
        "Nome do projeto, prazo, links, personagens e contato do responsável.",
        "Apenas uma imagem bonita.",
        "Somente o link do grupo.",
      ],
      correta: 1,
      explicacao:
        "O aviso precisa ter informações suficientes para o membro entender o projeto e participar sem confusão.",
    },
  },
  {
    id: "execucao",
    titulo: "8. Execução do projeto prático",
    descricao:
      "Aprender a conduzir um projeto curto sozinho para demonstrar preparo como líder.",
    conteudos: [
      "A execução do projeto prático é a parte em que o líder mostra se sabe aplicar o treinamento.",
      "O projeto deve ser pequeno, como uma comic curta, cena rápida ou vídeo de aproximadamente 5 minutos.",
      "O líder deve criar o projeto no sistema, organizar as pastas, criar formulários, abrir seleção, definir elenco e acompanhar entregas.",
      "Durante a execução, o líder precisa observar quem entregou, quem atrasou, quem sumiu e quem precisa ser substituído.",
      "Se houver atraso, o líder deve cobrar com respeito e registrar no sistema. Se o problema continuar, deve avisar a diretoria.",
      "O líder precisa manter contato com o editor, porque o projeto não termina quando os áudios chegam. A edição também precisa ser acompanhada.",
      "Mesmo em projeto curto, o líder deve registrar andamento. Isso mostra maturidade e organização.",
      "O objetivo do projeto prático não é ser perfeito, mas demonstrar que o líder consegue organizar, conduzir, registrar e finalizar.",
    ],
    checklist: [
      "Criou projeto teste",
      "Organizou pastas",
      "Criou formulários",
      "Selecionou elenco",
      "Acompanhou entregas",
      "Registrou andamento",
      "Enviou finalizado",
    ],
    pergunta: {
      pergunta:
        "Qual é o objetivo principal do projeto prático no treinamento?",
      alternativas: [
        "Fazer o maior projeto possível.",
        "Mostrar que o líder sabe organizar, conduzir, registrar e finalizar um projeto curto.",
        "Evitar usar o sistema.",
        "Deixar tudo para a diretoria resolver.",
      ],
      correta: 1,
      explicacao:
        "O projeto prático serve para avaliar organização, comunicação, registro e entrega em um projeto pequeno.",
    },
  },
  {
    id: "resultado",
    titulo: "9. Upload do resultado no sistema",
    descricao:
      "Aprender a registrar o resultado final e os links corretos dentro do DubWorks Manager.",
    conteudos: [
      "Quando o projeto tiver resultado ou material finalizado, o líder precisa organizar esse material no Drive e registrar o link no sistema.",
      "O resultado pode ser vídeo final, render, pasta finalizada, créditos, thumb/capa ou arquivo editado.",
      "O material final deve ficar dentro da pasta 3 | Finalizado, para que a diretoria e equipe encontrem rapidamente.",
      "No DubWorks Manager, o líder deve colocar os links na aba Arquivos do Drive.",
      "Depois de colar os links, o líder precisa clicar para salvar. Se não salvar, a informação pode sumir ao recarregar.",
      "Depois de salvar, o líder deve conferir se o histórico registrou a ação ou se a informação ficou visível no projeto.",
      "Na aba Registros Semanais, o líder deve escrever algo como: 'Projeto finalizado e link salvo na pasta Finalizado'.",
      "A diretoria precisa abrir o projeto e encontrar o caminho do material final sem procurar em conversa antiga.",
      "Um projeto não deve ser considerado encerrado se os arquivos finais não estão organizados e registrados.",
    ],
    checklist: [
      "Organizou finalizado",
      "Salvou link no sistema",
      "Registrou entrega",
      "Conferiu histórico",
      "Diretoria consegue acessar",
    ],
    pergunta: {
      pergunta: "Onde o líder deve guardar e registrar o material finalizado?",
      alternativas: [
        "Apenas no WhatsApp.",
        "Na pasta 3 | Finalizado e nos links do DubWorks Manager.",
        "Em qualquer pasta pessoal sem avisar.",
        "Somente no computador do editor.",
      ],
      correta: 1,
      explicacao:
        "O material final precisa ficar organizado no Drive e com link registrado no sistema.",
    },
  },
  {
    id: "prova-final",
    titulo: "10. Prova final do líder",
    descricao:
      "Responder perguntas de revisão geral para concluir a parte teórica do treinamento.",
    conteudos: [
      "A prova final serve para revisar tudo que foi aprendido: função do líder, sistema, pastas, formulários, avisos, execução e finalização.",
      "A prova não substitui a avaliação prática. Ela confirma se o líder entendeu o processo antes de ser avaliado pela diretoria.",
      "O líder deve responder com atenção. Se errar, deve voltar ao módulo correspondente e revisar o conteúdo.",
      "A diretoria pode usar o resultado da prova junto com o projeto prático para decidir se o líder está aprovado.",
    ],
    checklist: [
      "Revisou todos os módulos",
      "Respondeu a prova final",
      "Corrigiu pontos fracos",
    ],
    pergunta: {
      pergunta: "Para um líder ser aprovado, o que deve ser considerado?",
      alternativas: [
        "Somente simpatia no grupo.",
        "Apenas responder a prova, sem projeto prático.",
        "Leitura, prova, organização prática, uso do sistema, comunicação e entrega do projeto teste.",
        "Só criar uma pasta no Drive.",
      ],
      correta: 2,
      explicacao:
        "A aprovação deve considerar teoria e prática: prova, organização, comunicação, sistema e entrega.",
    },
  },
  {
    id: "avaliacao",
    titulo: "11. Avaliação final da diretoria",
    descricao:
      "A diretoria avalia se o líder em treinamento pode virar líder oficial.",
    conteudos: [
      "A avaliação final deve considerar o comportamento do líder durante todo o treinamento.",
      "A diretoria deve observar se o líder conseguiu entender o papel, organizar pastas, criar formulários, usar o sistema, abrir seleção, acompanhar entregas e registrar andamento.",
      "Também deve ser considerada a postura: comunicação, respeito, responsabilidade, capacidade de resolver problemas e pedir ajuda quando necessário.",
      "O líder pode ser aprovado, reprovado, pausado ou mantido em atenção.",
      "Se aprovado, o usuário pode deixar de ser líder em treinamento e virar líder oficial.",
      "Se reprovado, ele pode refazer módulos, repetir o projeto prático ou continuar em acompanhamento.",
      "A aprovação não deve ser baseada apenas em leitura. O líder precisa demonstrar prática.",
    ],
    checklist: [
      "Diretoria avaliou teoria",
      "Diretoria avaliou prática",
      "Diretoria avaliou comunicação",
      "Diretoria avaliou organização",
      "Status final foi definido",
    ],
    pergunta: {
      pergunta:
        "O que a diretoria deve avaliar antes de transformar alguém em líder oficial?",
      alternativas: [
        "Apenas se a pessoa pediu para virar líder.",
        "Organização, comunicação, uso do sistema, projeto prático e responsabilidade.",
        "Somente se a pessoa marcou todos os checkboxes.",
        "Apenas se ela gosta do projeto.",
      ],
      correta: 1,
      explicacao:
        "A diretoria deve avaliar o conjunto: postura, prática, organização, comunicação e uso correto do sistema.",
    },
  },
];

