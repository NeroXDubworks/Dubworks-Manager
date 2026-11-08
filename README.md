# DubWorks Manager — resumo geral e guia atual

**Documentação consolidada até a v46 · 03/11/2026.**

Este é o documento principal do sistema. Reúne as funcionalidades, a forma atual de iniciar, as integrações e as pendências. Os arquivos antigos foram guardados em `documentacao/historico`, com seus conteúdos preservados. Instruções antigas de instalação não representam tarefas que precisam ser repetidas agora.

## 1. Situação atual

O Manager mantém a gestão de projetos, elenco, seleção, entregas, usuários e demais áreas existentes. As mudanças recentes incluem a Central de Membros, sua pontuação, planilha, filtros, relatório diário e WhatsApp; a v38 reorganiza a tela de Usuários e permissões, e a v39 acrescenta os projetos e personagens atuais nos detalhes de cada membro. A v40 separa as telas e passa a carregar código e dados por área.

A pasta utilizada neste atendimento ainda se chama `Dubworks-Manager_v33_Filtros-Membros_completo` e recebeu as atualizações até a **v46**.

**Na v46**, cada evento ganha as pastas **Materiais** e **Entregas**. A opção **Criar formulário de entregas** começa desmarcada. Você também pode gerar o formulário nos detalhes do evento.

Para ativar a v46 em uma instalação que já usa a v45, execute `supabase/migrations/20261103_46_eventos_formulario_opcional.sql` no SQL Editor do Supabase. Atualize `Code.gs` e `Eventos.gs` no Apps Script de Projetos/Drive, publique uma nova versão na implantação existente e reinicie o Manager. Eventos anteriores mantêm os links das pastas e formulários que já foram criados. Se quiser acrescentar as duas novas pastas a um evento anterior, abra seus detalhes e clique em **Preparar / continuar no Google**.

**Pendente de confirmação:** a abertura do navegador e do QR Code do WhatsApp pelo processo iniciado no seu terminal normal. O download do navegador foi concluído, mas o teste de abertura feito pelo assistente falhou no ambiente restrito. Não foi vinculada uma conta nem enviada mensagem real durante a implementação.

## 2. Como abrir o sistema agora

No terminal normal do VS Code ou PowerShell, dentro da pasta que contém `package.json`, execute:

```powershell

.\INICIAR_DUBWORKS_COM_WHATSAPP.cmd

```

Mantenha o terminal aberto e acesse **http://localhost:5173**. O iniciador abre o Manager primeiro; depois prepara o navegador e inicia o bot. Se essa preparação ou o bot falhar, o Manager continua disponível. Na primeira execução de uma nova pasta, pode haver instalação de bibliotecas e download do navegador.

Para usar somente o Manager, sem iniciar o serviço do bot:

```powershell

npm.cmd run dev

```

Se precisar preparar o bot separadamente, use `npm.cmd run bot:install`; para preparar somente seu navegador, `npm.cmd run bot:browser`. `INICIAR_BOT_WHATSAPP.cmd` inicia apenas o bot. O serviço do bot utiliza a porta local **8765**.

Use a mesma pasta em todas essas etapas. Preserve o `.env.local` que já funciona. Depois de atualizar arquivos, reinicie o iniciador e recarregue o navegador com **Ctrl + F5**.

### Se a comunicação for interrompida

O log enviado em 30/10/2026 confirmou a causa da queda observada: o Vite tentou monitorar o arquivo `Cookies` da sessão do Chrome, que estava bloqueado pelo navegador. O erro `EBUSY` encerrou o Manager e interrompeu a comunicação da página.

A v36.4 exclui do monitoramento as pastas `.wwebjs_auth`, `.wwebjs_cache`, `.browser` e os arquivos CSV/log do bot. O código do sistema continua sendo monitorado normalmente. A correção não remove, abre nem altera os cookies ou a sessão existente.

A v36.3 corrigiu o iniciador para que uma falha do bot não desligue o Manager junto. Também separou a mensagem de tempo de resposta esgotado da mensagem de conexão interrompida. Não há repetição automática de ações de resultado incerto.

Ao abrir o iniciador, o diagnóstico é salvo em `integracoes/whatsapp-bot/inicializacao.log`, com início/fim dos processos e últimas mensagens de erro. O arquivo permanece local e não entra nos ZIPs. Valores com formato de sessão/token são ocultados no registro.

Se a inicialização falhar, mantenha o terminal aberto e copie as últimas linhas exibidas, ou consulte esse arquivo. Para a queda com EBUSY descrita acima, a causa e a correção foram identificadas. Se ocorrer uma falha diferente, o novo registro permite investigar esse outro caso. Não é necessário apagar sessões, trocar tokens ou editar o `.env.local`.

## 3. Central de Membros

Cada membro aparece em uma linha expansível com avatar, nome/idade, telefone, Atendimento, Participação e ações. Os seletores são independentes e seus cliques não abrem nem fecham a linha.

Cargo, e-mail, Entrada e Saída aparecem como informações de leitura. O lápis único abre a edição permitida, com Salvar e Cancelar. O bloco visual de Habilidades foi retirado. As cores dos status foram ajustadas para tons discretos no modo escuro; não foi acrescentado um seletor de tema claro/escuro.

| Campo | Opções atuais |
|---|---|
| Atendimento | Chamar, 01, 02, Concluído, Erro, Corrigindo, Sem retorno |
| Participação | Canais, Comunidade, Saiu, Ban, Pausado, Sem Retorno e Não definido |

Participação vazia na planilha aparece como **Não definido**, sem virar Comunidade. Valores 1/2 são apresentados como 01/02, respeitando a validação existente ao salvar.

**Observações internas:** são comentários exclusivos da Diretoria na interface e na API. O estado geral de saída/banimento pode aparecer para a moderação, mas o motivo privado não aparece na busca, no CSV nem no relatório compartilhável. As permissões de acesso direto ao Google Sheets continuam independentes das permissões do Manager.

### Busca e filtros

O botão **Filtros**, ao lado da busca, abre as opções somente quando solicitado:

- Período de entrada, com datas inicial/final inclusivas; também aceita um único limite.

- Atendimento e Participação, incluindo Não definido.

- Ordenação por nome, entrada, Atendimento ou Participação, nos dois sentidos.

Busca e filtros funcionam juntos em toda a lista. A pesquisa aceita nomes sem acentos e telefones sem pontuação. A ordem inicial mostra as entradas mais recentes. A lista traz 30 resultados por página, com controles para avançar e voltar. Os indicadores superiores continuam mostrando os totais da base. Os filtros não alteram a planilha.

## 3A. Advertências e pontuação nos detalhes do membro — v37

Ao expandir um membro e selecionar **Advertências e pontos**, a seção mostra a pontuação em **10/10**, com barra discreta e histórico de movimentações. O saldo inicial é 10 quando não há movimentos nem advertências aprovadas a aplicar. O saldo fica entre 0 e 10. Não há banimento, saída ou recuperação automática por tempo.

- Enviar uma nova advertência deixa o registro **pendente**, sem descontar pontos.
- **Aprovar** desconta automaticamente o valor informado. Exemplo: 10/10 menos uma advertência aprovada de 2 pontos resulta em 8/10. Rejeitar não desconta.
- A confirmação de aprovação informa o desconto. A autorização para aprovar continua sendo a permissão existente; permitir ajuste de pontos à moderação não concede aprovação automaticamente.
- **Diretoria e moderação** podem clicar em **Ajustar pontos**, adicionar ou retirar uma quantidade inteira, informar o motivo e registrar. A mudança só aparece como salva depois da confirmação da planilha.
- Cada movimento guarda saldo anterior/novo, data, responsável e motivo. Os motivos dos ajustes são visíveis à Diretoria e moderação; outros perfis autorizados à Central veem saldo, variação e data. As **Observações internas da Diretoria** continuam exclusivas da Diretoria.
- Os pontos ficam gravados na aba **Pontos_Membros** da planilha oficial, criada automaticamente no primeiro movimento. O vínculo usa o DW_ID, e não a posição da linha ou o nome. Preserve essa aba e os seus cabeçalhos; não edite o saldo ou apague movimentos diretamente. A sequência permite reordenar linhas sem trocar os saldos.
- A mesma aprovação é aplicada uma única vez. Atualizar ou repetir uma solicitação não desconta novamente. Se o valor ultrapassar o saldo disponível, o saldo chega a 0/10; o valor original e o desconto efetivo ficam registrados. Uma advertência de valor zero pode ser aprovada sem mudar o saldo.
- As advertências **já aprovadas dentro do sistema** também são conferidas ao abrir/atualizar a pontuação. Na v44, o histórico antigo é importado como **Em análise**; só uma aprovação posterior gera desconto.
- O telefone da advertência precisa identificar uma única ficha na planilha. Se houver duplicidade ou membro não encontrado, o sistema pede correção em vez de descontar de uma pessoa escolhida pelo nome.
- Se a aprovação for salva e a comunicação com a planilha falhar depois, o registro continua aprovado e o sistema avisa que os pontos estão pendentes. Abra o membro e use **Atualizar pontuação** para conferir e concluir. Não aprove a mesma advertência novamente. Falha na consulta não é mostrada como um saldo fictício de 10.
- Os movimentos possuem seu próprio histórico nesta seção. O Relatório diário existente continua cobrindo Atendimento, Participação e datas; os envios do bot continuam independentes.

### Ativar esta atualização

Os arquivos foram aplicados à pasta atual `outputs/Dubworks-Manager_v33_Filtros-Membros_completo`. A configuração local e os dados privados foram preservados. **É necessário atualizar o Apps Script de membros para ativar a pontuação**; a implantação externa não foi alterada pelo assistente.

1. Abra `integracoes/membros-planilha/Code.gs` desta versão e copie o conteúdo completo.
2. No projeto Apps Script ligado à planilha dos **membros**, substitua o conteúdo do Code.gs pelo arquivo atualizado e salve. Use o projeto que já atende a URL de membros terminada em `/exec`; o script de Projetos/Drive é separado.
3. Vá em **Implantar → Gerenciar implantações → lápis → Nova versão → Implantar**, mantendo a implantação atual e a mesma URL. Preserve o token e os acionadores existentes. Não é necessário gerar outro token nem recriar os acionadores do formulário/idades.
4. Reinicie o Manager no seu terminal normal com o iniciador que já utiliza, ou com `npm.cmd run dev` para abrir somente o Manager. Recarregue a página com **Ctrl + F5**.
5. Entre com Diretoria ou moderação, abra um membro e confira **Advertências → pontuação**. A aba Pontos_Membros é criada no primeiro movimento, sem migration SQL nova. A tabela existente `advertencias_internas` do Supabase continua sendo a fonte das decisões de aprovação.

### Como conferir em uma base de teste

1. Sem advertências aprovadas nem movimentos, abra um membro: deve mostrar **10/10**.
2. Envie uma advertência de 2 pontos: enquanto pendente, o saldo continua **10/10**.
3. Com uma conta autorizada a aprovar, aprove: o saldo deve ficar **8/10**. Atualize repetidamente e recarregue: deve continuar **8/10**, com um único desconto.
4. Rejeite outra advertência: o saldo não muda.
5. Com moderação, adicione 1 ponto com motivo: deve ficar **9/10**. Confira autoria, motivo, horário e persistência ao recarregar. Tentar ultrapassar 10 ou ficar abaixo de 0 deve ser impedido.
6. Com um perfil de RR que tenha acesso à Central, confira que o saldo aparece sem controles de ajuste nem motivos internos. Com moderação, confirme que as observações da Diretoria continuam ocultas.
7. Uma falha de gravação deve manter o rascunho e mostrar erro; uma falha após a aprovação deve avisar que os pontos precisam de conferência. O identificador do movimento impede desconto duplicado quando a mesma solicitação é repetida.

Não foram aprovadas advertências reais nem alterados os pontos da sua planilha durante a validação. As decisões externas e os saldos reais precisam ser conferidos após a publicação acima.

## 3B. Usuários e permissões — v38

A página aprovada na prévia foi integrada ao projeto. Ela passa a ter uma lista única com avatar, nome/e-mail, cargo, resumo dos acessos e linha expansível. Vínculo e treinamento aparecem nos detalhes, junto das permissões. O cadastro de novo usuário permanece disponível no topo, com o mesmo fluxo de criação de perfil existente.

A barra de busca aceita nome ou e-mail, sem diferenciar maiúsculas e acentos. O botão **Filtros**, ao lado, abre opções de cargo, treinamento e ordem alfabética A–Z/Z–A. Os filtros são aplicados juntos à busca; limpar os filtros preserva o texto pesquisado. A lista usa os usuários já permitidos para o perfil conectado, seguindo a regra de visibilidade existente.

As permissões ficam separadas em **Áreas do sistema**, **Relatórios e exportações** e **Aprovações**, selecionadas na linha expandida. Elas usam os campos e as regras atuais do sistema, incluindo o campo existente de aprovação de advertências. O cargo, o vínculo e a situação do treinamento continuam como informações nesta tela; o fluxo específico de treinamento foi preservado em sua área.

Mudar uma chave gera um rascunho. **Salvar alterações** grava os campos modificados juntos, em uma operação, e só confirma o resultado após o retorno do banco. **Cancelar** descarta o rascunho de todos os grupos daquela pessoa. Trocar o grupo, fechar/reabrir a linha ou pesquisar/filtrar outros usuários preserva esse rascunho. Salve antes de sair da página. O navegador é avisado se você tentar fechar a janela com alterações pendentes.

O salvamento confere o cargo e os valores anteriores dos campos alterados, para evitar que um rascunho sobrescreva a mudança feita por outra pessoa. Falhas mantêm os controles e o rascunho para conferência. Uma falha ao atualizar a listagem mantém a lista anterior e mostra uma mensagem. A Diretoria mantém acesso completo pelo cargo; seus controles são exibidos para consulta, sem sugerir que um botão pode retirar esse acesso.

Os usuários repetidos não foram apagados nem mesclados. Quando mais de um perfil utiliza o mesmo e-mail, a tela mostra **E-mail repetido**, inclusive se a diferença for apenas de maiúsculas. Nenhum acesso de uma conta real foi alterado durante os testes.

### Usar esta versão

Os arquivos foram aplicados à pasta atual `outputs/Dubworks-Manager_v33_Filtros-Membros_completo`. Reinicie o Manager pelo terminal normal que já utiliza e recarregue o navegador com **Ctrl + F5**. Abra **Usuários**. Esta atualização utiliza o cadastro e as permissões já existentes no Supabase; não acrescenta migration SQL nem exige nova publicação do Apps Script. A ativação da pontuação da v37 continua dependendo do Code.gs de membros daquela versão.

### Como conferir

1. Abra Usuários: deve haver uma lista única, sem duas tabelas repetindo as mesmas pessoas.
2. Pesquise por nome e e-mail; combine com cargo/treinamento e inverta A–Z/Z–A no botão Filtros. Confira o resultado e a adaptação da tela no celular.
3. Expanda um usuário de teste que não seja da Diretoria. Altere uma permissão: nada deve ser gravado até **Salvar alterações**.
4. Troque de grupo e retorne: o rascunho deve permanecer. Use **Cancelar** e confira a restauração do estado salvo.
5. Salve uma alteração autorizada e recarregue a lista: o valor deve permanecer. Faça isso somente com um perfil de teste, para não modificar acessos reais durante a conferência.
6. Confira que perfis da Diretoria mostram acesso completo para consulta e que as regras de visibilidade do perfil conectado continuam sendo respeitadas.
7. Confira que o botão Novo usuário mantém o formulário de cadastro e que os perfis existentes permanecem na lista. O login real continua dependendo do cadastro correspondente em Authentication do Supabase, conforme o fluxo anterior.

Validação da v38: `npm.cmd run build` e os dois grupos de `npm.cmd run test:users` passaram. Também passaram os testes de regressão da ordem dos hooks no login, da interface dos membros e da integração de aprovação/pontos. Os serviços externos e as contas reais não foram usados nesses testes.

## 3C. Projetos e personagens nos detalhes dos membros — v39

Ao expandir um membro na Central, a seção **Projetos atuais** mostra os projetos em que ele está escalado e os personagens correspondentes, agrupados por projeto. A seção segue o tema azul escuro e a tipografia da área de membros. O botão **Atualizar projetos** consulta novamente o cadastro e o elenco.

A fonte é o elenco existente no Supabase, e não uma descrição digitada manualmente. Só entram escalações com `ativo = true`, nome do dublador e personagem preenchidos. Projetos arquivados, finalizados, concluídos, encerrados ou cancelados ficam de fora. Projetos pausados continuam sendo atuais enquanto a escalação estiver ativa e aparecem com seu status. Personagens repetidos no mesmo projeto não são duplicados na apresentação; projetos diferentes com o mesmo título permanecem separados.

O vínculo considera o telefone do cadastro oficial da planilha e o telefone do dublador no elenco. A comparação reconhece formatação brasileira, DDI, números internacionais explícitos e formatos antigos de celular brasileiro. O nome pode identificar a pessoa quando faltar telefone em um dos lados, desde que corresponda exatamente após normalização de acentos/espaços e identifique uma única ficha. Telefones diferentes não são ignorados para vincular duas pessoas só porque têm nomes iguais. Quando houver telefone compartilhado, o nome do elenco precisa desambiguar as fichas; caso contrário, a seção mostra um aviso para conferir o cadastro.

A consulta carrega somente ao expandir a linha do membro. Ela busca dados atuais, sem depender do filtro de projetos arquivados nem de uma lista de projetos que já estivesse aberta em outra tela. A paginação evita cortar o elenco nas primeiras mil linhas. Falhas de consulta são exibidas como erro e não como uma falsa ausência de projetos. A sessão autenticada e as regras de acesso do banco continuam sendo respeitadas; só registros disponíveis ao perfil conectado podem ser apresentados. A seção informa títulos, status e nomes de personagens, sem expor os contatos de outras pessoas, observações internas ou dados de pastas/entregas dos projetos.

### Usar e conferir

1. Reinicie o Manager no terminal normal e pressione **Ctrl + F5** no navegador. Abra **Central de Membros** e expanda a linha de uma pessoa.
2. Confira **Projetos atuais**: um projeto pode exibir vários personagens. Os dados refletem as escalações cadastradas no elenco daquele projeto.
3. Em uma base de teste, atribua dois personagens ao mesmo membro e confira se aparecem no mesmo cartão. Retire/substitua a escalação e use **Atualizar projetos** para confirmar a remoção daquele vínculo.
4. Confira que um projeto arquivado, finalizado ou cancelado não aparece como atual. Um projeto pausado pode aparecer enquanto o vínculo no elenco estiver ativo.
5. Caso uma escalação não apareça, confira o telefone do membro na planilha e o telefone do dublador no elenco. Quando não houver telefone, o nome precisa identificar uma única ficha. Avisos de ambiguidade pedem correção no cadastro, sem escolher uma pessoa arbitrariamente.
6. Confira que o acesso à pontuação, observações, edição de datas e WhatsApp continua funcionando como antes. Esta seção é apenas de consulta e não altera o Atendimento ou a Participação.

Os arquivos foram aplicados à pasta atual `outputs/Dubworks-Manager_v33_Filtros-Membros_completo`. Esta atualização utiliza as APIs e tabelas existentes, sem migration SQL nova e sem alterar o Code.gs. Preserve o `.env.local` que já conecta a planilha. A publicação do Code.gs v37 continua necessária apenas para ativar a pontuação daquela etapa, caso ainda não tenha sido feita.

Validação da v39: build TypeScript/Vite, os dois grupos de `npm.cmd run test:member-projects` e sete regressões relacionadas passaram. Os testes cobrem vínculos por telefone/nome, escalações encerradas, status finais, agrupamento e duplicatas, telefones compartilhados, autorização, paginação, erros e respostas antigas após trocar o membro. Nenhum elenco real foi modificado durante esses testes.

## 3D. Telas independentes e carregamento por área — v40

As nove áreas foram separadas em arquivos próprios e carregadas sob demanda. O menu, o login, as cores e as funções continuam compartilhados. Cada área passa a ter um endereço que pode ser aberto diretamente, favoritado e utilizado com Voltar/Avançar do navegador:

| Área | Endereço local |
|---|---|
| Projetos | `http://localhost:5173/projetos` |
| Membros | `http://localhost:5173/membros` |
| Usuários | `http://localhost:5173/usuarios` |
| Advertências | `http://localhost:5173/advertencias` |
| Eventos | `http://localhost:5173/eventos` |
| Marketing | `http://localhost:5173/marketing` |
| Relatórios | `http://localhost:5173/relatorios` |
| Ferramentas | `http://localhost:5173/ferramentas` |
| Treinamentos | `http://localhost:5173/treinamentos` |

Ao entrar pela raiz, o endereço acompanha a área inicial permitida para o perfil. Abrir uma URL não concede novas permissões: a tela confere o perfil conectado e mantém as regras anteriores das APIs e do banco. A autenticação é conferida antes de liberar as telas; um perfil salvo no navegador não basta para exibir os dados.

O código de cada tela fica em `src/pages/screens`. Os formulários globais também foram extraídos e só são baixados quando abertos. A lógica compartilhada e os estados permanecem no controlador `useManagerController`, com um contexto tipado; esta etapa não reescreve as regras de negócio nem troca a fonte oficial dos membros.

### O que foi otimizado

- O início confirma a sessão e o perfil sem esperar que Projetos e Usuários sejam carregados em sequência antes da entrada. As leituras de perfil simultâneas são reaproveitadas.
- A área aberta define as listas que precisa consultar. Entrar diretamente em Membros não consulta a lista de Projetos. A lista de Projetos pede os cadastros necessários aos seletores quando os detalhes ou o formulário são abertos.
- Listas recentes podem ser reutilizadas ao voltar a uma área, com cache em memória de até 60 segundos por consulta. A expiração é conferida na próxima leitura. Atualizar manualmente ou salvar alterações força a renovação/invalidação necessária; não se usa cache para confirmar uma gravação.
- O cache é separado por conta e permissões. Leituras antigas não podem repor os dados de outra conta. Logout e mudança de conta limpam listas e formulários relacionados.
- As consultas iniciais duplicadas ao abrir Membros, Advertências e Eventos pelo menu foram retiradas; a entrada da área é responsável por seu carregamento. Os botões de atualização explícita continuam disponíveis.
- O sincronizador periódico dos membros continua verificando a planilha quando a Central está aberta e visível, preservando a proteção durante salvamentos.
- As rotinas existentes de normalização legada de projetos são adiadas para a área de Projetos. O acompanhamento do chat é interrompido quando a área correspondente deixa de estar aberta; as notificações do menu continuam disponíveis.
- Temporizadores de consultas são liberados assim que elas terminam. Falhas mostram aviso e opção de tentar novamente, mantendo dados anteriores para conferência.

### Resultado medido no build

| Arquivo carregado inicialmente | v39 | v40 |
|---|---:|---:|
| JavaScript principal, sem compressão | 784.632 bytes | 569.045 bytes |
| CSS inicial, sem compressão | 33.310 bytes | 5.766 bytes |

O JavaScript inicial ficou **27,5% menor**. As telas e seus estilos são baixados separadamente quando utilizados; isso não significa que o total de todos os arquivos caiu na mesma proporção. Estes são tamanhos de arquivos medidos no build, não uma promessa de redução proporcional no tempo de entrada. O tempo das consultas ao Google/Supabase ainda depende dos serviços e da conexão. O aviso já conhecido de pacote compartilhado acima de 500 KB permanece; ainda há lógica comum que pode ser dividida em uma etapa futura.

### Como experimentar

1. A pasta atual `outputs/Dubworks-Manager_v33_Filtros-Membros_completo` já recebeu a v40. No seu terminal normal, pare o Manager com **Ctrl + C** e inicie novamente pelo comando que usa. Para abrir apenas o Manager, execute `npm.cmd run dev`.
2. Recarregue com **Ctrl + F5** e entre normalmente. Confira que o menu mantém o mesmo visual e que o endereço muda ao trocar de área.
3. Abra `/membros`, `/usuarios` ou outra área permitida diretamente. Atualize a página e confira que ela abre na mesma área. Use Voltar e Avançar entre as telas.
4. Confira um membro: status, projetos/personagens, pontos, notas e edição de datas devem continuar disponíveis conforme o perfil. Confira a criação/edição de projetos e os grupos de permissões dos usuários.
5. Ao alternar contas, confira que os dados anteriores são limpos. Um endereço de área não permitida deve informar que o perfil não possui acesso.

A configuração local, os dados do bot e os cadastros foram preservados. Não há migration SQL nem Code.gs novo nesta etapa. O Apps Script de membros continua atendendo a integração anterior. A primeira visita a uma tela pode mostrar **Carregando tela…**; consultas pendentes mostram **Atualizando dados desta área…**.

Validação: build e **26 grupos de testes** passaram. Foram exercitados cache, sessão, perfis, navegação, renderização das nove telas, seis abas de projeto, quatro ferramentas, formulários e regressões de membros, pontos, relatórios, usuários e WhatsApp. Um servidor estático temporário confirmou HTTP 200 para todos os nove endereços e arquivos separados, e foi encerrado ao fim do teste. Os testes usam dados fictícios; não abriram uma sessão real do WhatsApp nem aprovaram advertências ou mudaram acessos de pessoas reais.

Comandos adicionados: `npm.cmd run test:navigation` e, depois do build, `npm.cmd run test:routes-production`. O servidor estático é usado apenas no teste de rotas; para trabalhar com as APIs locais, continue usando `npm.cmd run dev` ou o iniciador normal.

## 4. Planilha oficial e novas respostas do formulário

A fonte da Central é a aba **Fichas** da planilha oficial. O Manager lê e grava nela por meio de uma API autenticada e do Apps Script. O Supabase continua cuidando do login, dos cargos e das demais funções do sistema.

Novas respostas do Google Forms entram no fluxo existente e recebem identificadores estáveis `DW_ID`. Fichas incompletas são preservadas. Nome, telefone ou posição da linha não são usados para presumir a identidade de alguém. A leitura de 702 respostas registrada nos documentos antigos era de 26/10/2026; não representa uma contagem atual fixa.

**Atualizar membros** busca a situação da planilha. Também há atualização periódica, com a Central visível. Alterações feitas no sistema persistem na planilha; conflitos com uma versão mais recente exigem atualizar/reabrir a ficha antes de salvar.

### Configuração que deve ser preservada

- `.env.local`: contém `MEMBERS_SCRIPT_URL` e `MEMBERS_SCRIPT_TOKEN`, usados somente pelo servidor. Não acrescente `VITE_` ao token e não o publique.

- `integracoes/membros-planilha/Code.gs`: código de membros, diferente da automação de projetos.

- Propriedades e acionadores existentes do Apps Script, incluindo `novaFicha` e `atualizarIdades`.

Em uma instalação nova, copie `.env.example` para `.env.local` e preencha a configuração local. Na instalação que já funciona, **não substitua o `.env.local` pelo exemplo**.

O preparo inicial da integração exige o Apps Script correspondente publicado, Google Sheets API habilitada e os identificadores preparados. Isso não deve ser repetido como rotina. Para atualizar o código de membros, salve o `Code.gs` correto e publique **Nova versão** da implantação existente, preservando URL, token e acionadores. Não substitua o script de projetos pelo de membros.

## 5. Relatório diário

O botão **Relatório diário** gera um texto com alterações registradas de Atendimento, Participação, Entrada e Saída: pessoa, responsável, horário e valor anterior → novo.

É possível escolher data, horário e escopo. Sem horários, considera o dia completo no fuso **America/Sao_Paulo**. Diretoria começa na equipe; RR e demais perfis começam nas próprias alterações. A consulta da equipe depende do cargo/permissão: Diretoria tem acesso; RR pode ter acesso salvo bloqueio explícito; outros perfis precisam da autorização correspondente.

O texto pode ser revisado, copiado, baixado em `.txt` ou aberto no compartilhamento do WhatsApp. O compartilhamento exige escolher a conversa e confirmar o envio. Não há destinatário fixo nem envio automático do relatório.

Observações internas não entram nesse texto. O relatório usa os eventos realmente registrados; não reconstrói alterações antigas por comparação com a lista atual. Registros sem login confirmado não são atribuídos a alguém só pela semelhança do nome. Alterações por outros scripts/APIs precisam registrar seu próprio histórico.

O recurso exige a publicação do código de membros **v35 ou posterior**. Se já foi publicado, não é necessário repetir essa configuração para as correções do bot.

## 6. WhatsApp: conversa individual e bot

### Conversa individual

O ícone ao lado do lápis abre a conversa com o telefone cadastrado do membro. O acesso inicial é somente da Diretoria. Abrir a conversa não envia mensagem, não altera o Atendimento e não significa que a pessoa já foi chamada.

### Fila automática

**Bot automático WhatsApp**, ao lado do Relatório diário, abre a área integrada à Central. O responsável vem da conta autenticada, com permissão conferida no Manager e no serviço do bot. Os usuários fictícios do programa original foram retirados.

O fluxo é:

1. Conectar o WhatsApp e vincular a conta pelo celular.

2. Trazer membros em Chamar ou colar uma lista `Nome; telefone`.

3. Analisar, revisar e importar como pendentes.

4. Selecionar individualmente as pessoas e conferir a prévia.

5. Clicar em Iniciar envios e confirmar os destinatários.

Abrir a área, conectar, importar ou selecionar não inicia mensagens. Cada importação traz até 100 contatos válidos. Trazer membros descarta telefones já salvos e repetidos; o próximo lote pode trazer os próximos 100. As mensagens e os intervalos do programa fornecido foram preservados: de 1 a 5 minutos entre envios e pausa de 30 a 60 minutos a cada 10 envios.

Use **Pausar** para impedir os próximos envios; uma mensagem já em envio pode terminar. Fechar a página não pausa o serviço. A fila não reinicia sozinha após encerrar e abrir novamente o serviço. Antes de repetir uma ação cujo resultado foi incerto, confira o histórico e a conversa.

**Limite atual:** a fila e o histórico do bot são separados da planilha. O estado 01 no bot não muda automaticamente o Atendimento oficial e os envios do bot não entram no Relatório diário da Central.

### Navegador e diagnóstico atual

Desde a v36.2, o bot utiliza um Chrome próprio correspondente à biblioteca, guardado em `.browser`. A sessão antiga foi preservada e o Chrome utiliza um perfil separado.

A instância que havia sido iniciada pelo assistente foi encerrada: o ambiente usado pelo assistente limitou a comunicação interna necessária ao navegador. A abertura precisa ocorrer no processo criado pelo **seu terminal normal do Windows**. O serviço passou a identificar o ambiente restrito observado e mostrar uma explicação em vez de repetir a tentativa.

O navegador já foi baixado na pasta atual. A abertura real do QR Code continua pendente de sua confirmação. Não se considera esse teste concluído apenas porque o build e os testes simulados passaram.

## 7. Projetos e integrações anteriores preservadas

A documentação anterior registra estas regras da base de projetos, mantidas nas mudanças recentes:

- Projetos com estatísticas, capa, elenco, seleção, itens de produção, entregas e histórico; arquivamento/reabertura reservado à Diretoria.

- Itens com títulos livres e subdivisões. Quando o prazo é automático, considera início + 7 dias; prazo manual é preservado.

- Um Formulário de Seleção permanente por projeto, atualizado pelos personagens marcados no Banco. Reabrir seleção reutiliza esse formulário.

- Um Formulário de Entregas permanente por item principal; subdivisões viram opções dentro dele. Desmarcar a visibilidade preserva respostas anteriores.

- Estrutura principal no Drive: `1 | Seleção` e `2 | Projeto`, com Itens do Projeto e Entregas. Não há criação automática de `3 | Finalizado`.

- Classificação do elenco em principal, secundário e figurante; a base documenta limites de 2 projetos ativos como principal, 3 como secundário e nenhum limite para figurante.

- Relatório HTML dos projetos, exportações existentes e automação de respostas dos Forms. O script de projetos registra um acionador periódico próprio, separado dos acionadores dos membros.

As demais áreas existentes — incluindo usuários, Advertências, eventos, treinamentos e ferramentas — foram preservadas, sem representar uma implementação nova das Partes 2–8 da proposta original. A v37 acrescenta a pontuação nos membros e o desconto após aprovação. O redesenho completo da página de Advertências e a recuperação automática por tempo continuam fora desta entrega.

## 8. Validação, instalação e arquivos que devem ser guardados

O build TypeScript/Vite da v40 passou, mantendo o aviso conhecido de tamanho do pacote. Os dois novos grupos de testes da tela de usuários e as regressões relacionadas passaram nesta entrega. Na v37, dezenove grupos de testes passaram para integração, permissões, notas privadas, conflitos, login, filtros, relatórios, bot, comunicação, seleção do navegador e pontuação/advertências. Esses testes não substituem a verificação autenticada de todos os serviços externos.

Comandos de conferência:

```powershell

npm.cmd run test:members

npm.cmd run test:users

npm.cmd run test:member-projects

npm.cmd run test:navigation

npm.cmd run test:routes-production

npm.cmd run build

```

A reorganização anterior alterou somente a documentação. Na v36.4, o build e os testes passaram após acrescentar a exclusão dos dados privados do monitoramento, preservando as correções do iniciador e das mensagens de conexão. Os testes cobrem manutenção do Manager quando o bot ou sua preparação falha, diagnóstico e ausência de repetição de ações. O encerramento solicitado permite ao bot fechar seu navegador antes de encerrar o processo, com limite de espera. O teste real de regressão do Vite manteve um arquivo fictício de cookies bloqueado no Windows, confirmou resposta HTTP 200 e a detecção de alterações de código. Nenhuma sessão real foi usada nesse teste, conta vinculada ou mensagem enviada.

Guarde o `.env.local`, as configurações do Supabase/Google e os arquivos privados do bot (`fila_contatos.csv`, `historico_envios.csv` e `.wwebjs_auth`). Não inclua esses arquivos em pacotes compartilhados. Os ZIPs entregues excluem credenciais, sessões, navegador baixado e `node_modules`.

As mudanças atuais da Central ligada à planilha e do bot não exigem novas migrations SQL. Migrations antigas de projetos/membros permanecem como histórico da instalação original; não execute todas novamente por encontrar instruções antigas. Em uma instalação totalmente nova, confira o esquema necessário antes de usar as funções correspondentes.

Para hospedar o Manager, publique também suas APIs. Apenas `dist` ou `npm run preview` não fornece a integração local de membros. O bot exige processo contínuo, navegador e armazenamento persistente; uma hospedagem estática não executa a fila. Em uma instalação hospedada, `127.0.0.1` aponta ao servidor hospedado, não ao seu computador.

## 9. Evolução resumida

| Versões | Principal resultado |
|---|---|
| v7–v26 | Drive e Forms, elenco, seleção, itens/subdivisões, formulários de entregas por item e sincronização de respostas |
| v27 | Reorganização dos projetos, arquivamento, prazos, estatísticas e atalhos do Drive |
| v28–v31 | Linhas expansíveis dos membros, status separados, edição por lápis, notas privadas e correção das cores |
| v32 / v32.1 | Planilha oficial como fonte dos membros e correção da ordem dos hooks no login |
| v33–v34 | Filtros compactos, ordenação, busca e paleta discreta no modo escuro |
| v35 | Relatório diário com autoria verificada e texto revisável |
| v36–v36.2 | Conversa individual, integração do bot, iniciador conjunto e navegador próprio; conexão real ainda pendente de confirmação |
| v36.3 | Inicialização do Manager independente de falhas do bot, registro de diagnóstico e distinção entre demora e queda de comunicação |
| v36.4 | Correção confirmada do EBUSY: o Vite deixa de monitorar sessões, navegador, cache e dados do bot |
| v37 | Pontuação 10/10 nos membros, desconto de advertências aprovadas, ajustes pela Diretoria/moderação e histórico persistente |
| v38 | Usuários em lista única expansível, busca/filtros, permissões agrupadas e salvamento com rascunho/cancelamento |
| v39 | Projetos e personagens atuais nos detalhes dos membros, consultados a partir do elenco |
| v40 | Telas e formulários separados, endereços próprios, dados por área e reaproveitamento de consultas recentes |

Para consultar decisões antigas e listas completas de arquivos alterados, use `documentacao/historico`. Para operar a instalação atual, siga este README.


### v41 — Central de Membros mais leve

A Central passa a receber do servidor **30 membros por página**, com Anterior/Próxima e contagem dos resultados. A busca por nome/telefone/e-mail, os filtros de data e status e a ordenação são aplicados à base completa **antes** da paginação. Os indicadores continuam globais; não são contagens dos 30 cartões visíveis. O bot só carrega a lista completa quando seu botão é aberto. Relatórios e as demais telas continuam consultando os conjuntos completos de que precisam.

A digitação aguarda 250 ms para evitar uma consulta por tecla. Respostas antigas ou de consultas canceladas não substituem os resultados atuais. Os cartões sem alterações mantêm suas referências e podem evitar novas renderizações. Edições e ajustes de pontos bloqueiam a troca de página/filtros até Salvar ou Cancelar, para não descartar o rascunho.

O servidor reaproveita por até 30 segundos os dados públicos de membros e o elenco consultado com a sessão de cada usuário; as permissões continuam verificadas em toda requisição. Não há cache compartilhado entre contas/sessões/perfis. Atualizar membros/Atualizar projetos força a consulta, e alterações de membro invalidam os dados reutilizados. Falhas não ficam guardadas como resultados vazios. O navegador mantém no máximo oito páginas recentes. A página visível é atualizada automaticamente a cada minuto, com a janela visível e sem edição em andamento.

Ao fechar/reabrir um membro, projetos recentes são mantidos por até 30 segundos; observações permanecem exclusivas da Diretoria. A pontuação é conferida novamente ao reabrir e nunca recebe um saldo presumido quando a consulta falha. Sua reconciliação continua usando advertências aprovadas e identificação fresca da planilha, com a mesma proteção contra desconto duplicado.

**Limite da melhoria:** o Apps Script existente ainda lê a planilha completa na primeira consulta de uma sequência. A paginação reduz os dados enviados ao navegador e as consultas repetidas; esta versão não migra os cadastros para outro banco. Não é necessário publicar outro Code.gs nem executar SQL.

#### Validação da v41

- `npm.cmd run build`
- `npm.cmd run test:members` — 19 grupos existentes, incluindo o teste isolado do monitoramento de arquivos do bot.
- `npm.cmd run test:users`, `npm.cmd run test:member-projects`, `npm.cmd run test:navigation`, `npm.cmd run test:routes-production` — 7 grupos existentes.
- `npm.cmd run test:member-performance` — paginação e contagem globais; busca fora da primeira página; isolamento/expiração do cache; invalidação após escrita; digitação e exclusão de respostas antigas; pausa durante edição; atualização e erro/repetição.

Todos os testes usam dados fictícios ou servidores temporários. Não foi acessada uma conta real, emitida uma advertência ou enviada uma mensagem.

#### Como conferir no sistema

1. Reinicie o iniciador na mesma pasta e recarregue o navegador com Ctrl + F5.
2. Abra Membros: aparecem até 30 cartões. Use Próxima e Anterior; os indicadores do topo permanecem globais.
3. Pesquise alguém do fim da lista e combine período, Atendimento e Participação. Confira a ordem crescente/decrescente e a contagem.
4. Abra e feche um membro: projetos recentes são reaproveitados; Atualizar projetos força a consulta. Confira as observações com as permissões habituais.
5. Faça uma edição autorizada, salve e atualize: o valor deve permanecer. Enquanto o formulário estiver em edição, a paginação fica bloqueada; Cancelar libera sem salvar.
6. Confira pontuação e relatório diário. Ao abrir o bot, a lista completa continua disponível para a revisão manual habitual.
7. Para uma resposta nova do Google Forms, use Atualizar membros ou aguarde a atualização automática com a página visível.

**Medição reproduzível:** com 703 membros fictícios, a resposta pública completa tinha 217738 bytes e a primeira página tem 9459 bytes (95.7% menos dados nesse cenário). A quantidade inicial de cartões cai de 80 para 30. Isso não representa uma medição da velocidade da sua planilha real. O detalhe está em `tests/member-performance-measurement.json`.

### v42 — Advertências, provas e revisão da Diretoria

Esta entrega inclui toda a otimização de membros da v41 e reorganiza Advertências com a mesma base azul do DubWorks. O botão **Filtros** fica ao lado da busca e abre período da ocorrência (inclusive), status (pendente, em preparação, aprovada, rejeitada), gravidade, mínimo/máximo de pontos e moderador por nome/e-mail/telefone. A busca encontra nome/telefone do membro, moderador e ocorrência. Os filtros são combináveis; observações internas não entram na busca. Registros antigos sem gravidade aparecem como **Não classificada**, sem inferência baseada nos pontos.

Na Diretoria, a aba **Aguardando decisão** destaca os registros prontos para análise. Uma linha expandida mostra tópicos, descrição completa, arquivos/links de provas e observações internas. Aprovar e Rejeitar usam o fluxo real existente de decisão e pontuação. Aprovadas continuam descontando uma única vez; rejeitadas e pendentes não descontam. Com envio de provas incompleto, a aprovação é bloqueada; a Diretoria pode rejeitar com motivo. Pontos exibidos na listagem são os pontos previstos no registro; o desconto efetivo respeita o saldo mínimo de 0/10.

**Nova advertência** acrescenta gravidade, tópicos de infração escolhidos em um menu suspenso, observações internas e arquivos locais. Os links externos de provas continuam opcionais. A gravidade não determina automaticamente os pontos: a equipe informa o valor de cada caso. Os tópicos iniciais são Xingamento, Desrespeito a membro, Desrespeito à Diretoria, Assédio, Discriminação, Spam ou divulgação indevida, Descumprimento de regras, Conduta inadequada e Outros. Esta lista pode ser ajustada depois.

Os arquivos são guardados no bucket **privado** `warning-evidence` do Supabase, separados por ocorrência e autor. Há limites de 5 arquivos, 50 MB por arquivo e 100 MB por advertência. São aceitos registros de áudio/vídeo, imagens ou documentos; para arquivos maiores, use um link externo opcional. A abertura de uma prova gera um link com duração de 5 minutos, autorizado pelas permissões do módulo. Não se publica o bucket nem se guardam URLs temporárias nos registros.

O envio cria um identificador de solicitação e grava um rascunho que não pode ser aprovado até todos os uploads serem confirmados. A mesma solicitação pode ser retomada sem duplicar a advertência; o formulário fica bloqueado nos dados originais depois que o rascunho é conhecido. Se for fechado com um envio parcial, o registro fica **Em preparação**; o autor pode concluir os arquivos pela linha expandida, ou concluir sem arquivos após confirmação explícita. Um resultado de conexão incerto exige conferir a lista antes de iniciar uma solicitação nova. A retomada de uma resposta final perdida reconhece o registro já concluído sem tentar reenviar arquivos fechados para edição.

As observações podem ser complementadas pela equipe após a ocorrência e têm verificação de conflito para evitar sobrescrever outra edição. A descrição completa e as observações são internas e não são copiadas automaticamente para a comunicação ao membro.

Depois de aprovar, a Diretoria pode clicar em **Preparar mensagem para o WhatsApp**. O sistema confere novamente a aprovação e confirma o movimento real de pontos, sem duplicar o desconto. A prévia inclui membro, data, gravidade, tópicos e **pontos efetivamente retirados** (inclusive quando o saldo disponível é menor que o valor da advertência). O texto é editável e pode ser copiado ou aberto no WhatsApp. Não há envio automático nem confirmação falsa de entrega. O modelo é provisório, aguardando o texto-base oficial que será enviado pela usuária.

#### Ativar os novos campos e arquivos — necessário uma vez

1. Abra o painel do Supabase do projeto usado pelo Manager e entre em **SQL Editor → New query**.
2. Na pasta atual do sistema, abra `supabase/migrations/20261102_42_advertencias.sql`. Copie **o conteúdo inteiro** para a consulta.
3. Execute **Run**. A migration acrescenta campos e funções à tabela de advertências e cria o bucket privado; preserva o histórico e não aprova nem desconta nenhuma advertência. Pode ser executada novamente. Não execute migrations históricas sem uma necessidade identificada.
4. Reinicie o Manager na mesma pasta, preserve o `.env.local` e recarregue o navegador com **Ctrl + F5**.
5. Entre com uma conta autorizada e abra **Advertências → Nova advertência**. Sem a migration, o sistema informa que a atualização ainda precisa ser ativada; não simula o salvamento dos campos/arquivos.

Não é necessário editar/publicar o Apps Script para esta atualização de advertências. A integração de membros e a pontuação usam a implantação já configurada. A migration foi validada com PostgreSQL em memória e esquemas fictícios equivalentes aos campos usados pelo aplicativo; ela não foi aplicada ao Supabase real durante este atendimento.

#### Como testar depois de ativar

1. Combine período, status, gravidade, pontos e moderador. Pesquise nome com acentos e telefone formatado. Limpar filtros mantém a busca.
2. Em uma ocorrência de teste autorizada, selecione tópicos, preencha a descrição/observações e envie uma imagem ou gravação. Confira o arquivo na linha expandida com outra conta que tenha acesso às advertências.
3. Antes de aprovar, confira o saldo do membro. Registre a decisão da Diretoria e atualize a pontuação: deve descontar uma vez. Sincronizar ou preparar a mensagem novamente não deve descontar de novo.
4. Confira uma ocorrência rejeitada: o saldo não deve mudar. Um upload incompleto deve ficar em preparação e não deve permitir aprovação.
5. Em uma aprovada, prepare a mensagem: confira os tópicos e os pontos efetivamente retirados; descrição detalhada, provas e observações não entram no texto. Revise antes de abrir o WhatsApp. O envio no WhatsApp depende da sua ação.
6. Com um perfil sem acesso às advertências, confira que não pode listar os registros nem abrir os arquivos privados.

#### Testes entregues

`npm.cmd run test:warnings` executa testes de filtros, fluxo de arquivos, mensagem, formulário e detalhes. Os testes existentes de membros, usuários, projetos, navegação e build continuam incluídos.

O teste adicional de SQL usa PostgreSQL em memória (PGlite), sem conexão ao Supabase real: instale opcionalmente a dependência de teste com `npm.cmd install --no-save --package-lock=false @electric-sql/pglite@0.5.14` e execute `npm.cmd run test:warnings-db`. Ele aplica a migration duas vezes e confere autor verificado, repetição sem duplicar, isolamento de provas, bloqueio de aprovação durante upload, decisão autorizada, imutabilidade da ocorrência, observações, validação e negação a perfis sem acesso/sem sessão. A dependência não é necessária para executar o Manager.

### v43 — Remover acesso de uma conta e revisar o Drive

A implementação foi autorizada separadamente pela usuária em 02/11/2026, após a revisão automática ter rejeitado a primeira proposta pelo alcance das mudanças de autorização e bloqueio de login. A entrega v43 inclui as v41/v42 completas, preservando todos os projetos e históricos.

Em **Usuários e permissões**, a Diretoria pode expandir uma conta de outra pessoa e clicar em **Remover acesso**. A primeira consulta é apenas uma prévia. Para efetivar, é necessário digitar o e-mail e clicar em **Confirmar remoção de acesso**. O botão fica indisponível enquanto há um rascunho de permissões não salvo. Não é permitido remover o próprio acesso. A proteção da última Diretoria ativa também é verificada no banco.

O bloqueio atinge todos os perfis com o mesmo e-mail, incluindo variações de maiúsculas/minúsculas. O usuário não é apagado: cargo, projetos atribuídos, autoria e registros anteriores ficam preservados. Não se altera a lista de membros da comunidade para desativar uma conta da equipe. As permissões individuais ficam somente para consulta após o bloqueio; ligar uma permissão não reativa a conta.

No Supabase, a ação confirma o perfil da Diretoria, protege contra mudança do e-mail entre prévia e confirmação, grava uma revogação auditável e bloqueia novos logins/renovações no Auth. As regras do banco e a verificação anterior às consultas impedem que um JWT antigo continue lendo/escrevendo pela Data API, inclusive views/RPCs. A condição adicional de RLS cobre tabelas e Storage. Regras anteriores são preservadas para as contas não revogadas, e uma verificação de API preexistente é encadeada com seus privilégios de execução originais. Se uma configuração anterior não puder ser reconhecida, a migration falha e reverte a transação em vez de substituí-la silenciosamente.

A instalação da migration **não bloqueia nenhuma conta**. O bloqueio só ocorre depois da ação explícita da Diretoria. A interface revisa o perfil a cada 30 segundos com a janela visível e ao voltar o foco; se o acesso cair, limpa os dados exibidos. O servidor/banco não depende desse intervalo para negar novas operações. Dados já baixados e URLs temporárias previamente emitidas não podem ser recolhidos retroativamente; as URLs privadas das provas expiram em até 5 minutos.

Depois de confirmar o bloqueio, a mesma operação inicia um lote da revisão do Drive. O Apps Script verifica a identidade e a Diretoria novamente e lê o e-mail no registro confirmado do banco; não aceita e-mail ou pasta fornecidos livremente pelo navegador. O escopo é: **pastas configuradas de Projetos/Parcerias e arquivos registrados na aba DW - Projetos, com seus descendentes**. Itens fora desse registro/escopo exigem conferência manual. O script não percorre o destino de atalhos para ampliar o alcance.

São removidas as permissões diretas do e-mail selecionado nos itens que a conta da automação tem autorização para administrar. Não são removidas permissões de outras pessoas, grupos ou domínio, links públicos nem a propriedade de arquivos. Acesso herdado precisa ser tratado na pasta/Drive de origem; propriedade precisa de uma decisão própria. Esses casos e erros do Google são apresentados como pendências, com contagens separadas. **Varredura concluída** significa que os itens do escopo foram revisados, não uma garantia de que nenhum outro caminho de acesso ao Drive existe.

O andamento é persistido no Supabase em lotes. **Continuar revisão do Drive** retoma os próximos itens; **Rever itens com falha** repete somente os itens pendentes. Os alertas registram situações encontradas durante a revisão, inclusive antes de uma nova tentativa. Se o Google não responder, o bloqueio do Manager permanece confirmado e a revisão do Drive fica pendente. Uma resposta incerta exige **Consultar estado** antes de repetir. A operação não inicia envios no WhatsApp.

#### Ativação completa da v43 — ordem

1. Preserve o `.env.local` da pasta que já funciona. Reinicie o Manager somente depois de aplicar os arquivos atualizados.
2. No **SQL Editor do Supabase**, execute o conteúdo inteiro de `supabase/migrations/20261102_42_advertencias.sql` para campos e provas privadas das advertências, se ainda não executou.
3. Em outra consulta, execute o conteúdo inteiro de `supabase/migrations/20261102_43_remover_acesso.sql`. Ela instala a função de bloqueio, o registro de progresso, a condição de conta ativa nas regras e a verificação da Data API. Não execute nenhuma função de revogação manualmente para testar em uma pessoa real.
4. Abra o Apps Script **existente de Projetos/Drive/Forms**. Não é o Apps Script da planilha de membros. Atualize seu `Code.gs` com `integracoes/google-forms-projetos/Code.gs` e adicione um arquivo de script chamado **AcessosUsuarios**, com o conteúdo de `integracoes/google-forms-projetos/AcessosUsuarios.gs`. Preserve as propriedades de configuração, os acionadores e a implantação existente. O novo Code.gs mantém as automações anteriores e acrescenta o despacho da ação de acesso e a conferência do perfil ativo.
5. Se o seu Code.gs remoto tiver personalizações que não estão nesta base, use `DubWorks_v43_Alteracoes-Code-Projetos.patch` como referência das três alterações mínimas em vez de sobrescrever essas personalizações. O arquivo está no pacote de ativação.
6. Salve e publique **uma nova versão na implantação existente**: Implantar → Gerenciar implantações → lápis → Nova versão → Implantar. Assim a URL `/exec` de Projetos permanece a mesma. Autorize o acesso ao Drive se o Google solicitar. Se o Google indicar API desativada, ative a **Google Drive API** no projeto Google Cloud associado ao Apps Script e tente a revisão novamente; o erro fica visível no resultado, sem reativar a conta removida.
7. Reinicie o iniciador na pasta atual do sistema e use **Ctrl + F5**. O Apps Script de membros não precisa ser republicado por causa da v43. Não é necessário trocar os tokens nem criar outra implantação de membros.

As duas migrations, os dois arquivos de Apps Script, o patch e este README estão reunidos em `Dubworks-Manager_v43_Ativacao.zip`. Não foram aplicados ao banco/Google reais pelo assistente, porque a entrega é de código e nenhuma conta real foi selecionada para revogar.

#### Conferência após a ativação

1. Com Diretoria, expanda uma conta de teste de outra pessoa. Abra Remover acesso e confira nome/e-mail. Fechar a prévia não deve alterar nada. Com moderação ou a própria conta, a ação não fica disponível.
2. Use somente uma conta de teste cuja remoção você realmente deseja, confirme o e-mail e o bloqueio. Confira a indicação de acesso removido no Manager e o resultado separado do Drive. O projeto e seus registros devem permanecer.
3. Confira a conta bloqueada em outra sessão: novas consultas devem ser negadas e a interface deve retornar ao login ao rever o perfil. Confira que outra conta autorizada continua funcionando.
4. Se houver mais itens ou falha do Google, consulte o estado e continue a revisão. Confira permissões diretas com a conta administradora do Drive e trate grupos, links públicos, propriedade e heranças indicadas. Não conclua que todo acesso ao Drive acabou apenas pela contagem de permissões removidas.

#### Validação entregue

Build e 36 grupos de testes passaram, todos com dados fictícios/servidores isolados. Incluem as regressões existentes de membros, usuários, projetos, navegação, relatórios e bot; paginação; advertências; duas migrations executadas duas vezes em PostgreSQL em memória; autorização da API; confirmação pelo e-mail; respostas incertas; continuação; paginação de arquivos e permissões do Drive; preservação de outras pessoas/grupos/propriedade; falhas persistentes; e identidade verificada na entrada real do Apps Script.

- `npm.cmd run test:user-access` — API, simulação de Drive/Apps Script e interface.
- `npm.cmd run test:user-access-db` — PostgreSQL em memória; usa a mesma dependência de teste PGlite opcional documentada na v42.

Não foi iniciada uma conta do WhatsApp, enviada uma advertência real, aplicado SQL ao banco real, bloqueado um usuário real ou removido um compartilhamento real durante os testes.


### v44 — Advertências, Central de Eventos e velocidade dos membros

#### Advertências: decisão real, sem aprovação presumida

A leitura antiga do Forms marcava o histórico como aprovado no próprio código. Isso foi removido. A importação agora grava cada registro no banco, com identificador da origem, e começa em **Em análise**. Sincronizar de novo não substitui uma decisão que a Diretoria já tomou.

O arquivo de ativação reinicia **todas as decisões existentes** para Em análise **uma única vez**, conforme solicitado. Antes disso, guarda uma cópia dos registros e das decisões anteriores em `advertencias_decisoes`. Não apaga descrições, provas, autores, usuários ou membros. Reexecutar o arquivo não desfaz aprovações legítimas tomadas depois da primeira ativação. A planilha antiga não é sobrescrita.

- **Em análise / Reanálise:** aparecem em Aguardando decisão; não contam como advertência aprovada nem mantêm seu desconto.
- **Aprovada:** conta e aplica o valor informado, respeitando o saldo mínimo de zero.
- **Rejeitada:** não conta nem desconta. O motivo da rejeição é obrigatório.
- A Diretoria pode usar **Reabrir em reanálise e editar** em uma ocorrência aprovada ou rejeitada. Pode corrigir data, descrição, gravidade, tópicos e pontos. O membro e a autoria permanecem vinculados ao registro original. Salvar ajustes mantém Reanálise; depois é preciso aprovar ou rejeitar explicitamente.
- Enquanto há ajustes não salvos, os botões de decisão ficam bloqueados. Uma decisão desatualizada é recusada pelo banco para evitar sobrescrever outra pessoa.

O desconto anterior é estornado pelo **valor efetivamente retirado**, com registro no histórico. Uma nova aprovação aplica a versão nova uma única vez. Ajustes manuais são preservados; não se redefine todo saldo indiscriminadamente para 10. Como banco e planilha são serviços distintos, uma falha pode deixar **Decisão salva; conferência de pontos pendente**. Nesse caso, abra o membro → Advertências e pontos → Atualizar pontuação. O histórico de movimentos guarda desconto e estorno; os controles técnicos de versão não aparecem como movimentações.

Após o reinício geral das decisões, a correção dos saldos acontece na próxima conferência de pontuação de cada membro. Não há uma varredura automática de todos os membros ao abrir a página. Para conferir um saldo antigo, abra explicitamente a seção de pontos desse membro. A interface mostra erro se o novo SQL ou Apps Script ainda não estiver ativo, em vez de inventar uma pontuação.

Os indicadores são **Registros, Advertidos, Pendentes, Aprovadas, Rejeitadas e Banidos na comunidade**. Advertidos considera apenas membros com aprovação; Banidos vem da Participação na Central, sem banimento automático por pontos. Foram removidos Com pontuação e Provas. Os filtros mantêm período, situação, gravidade, pontos e moderador; busca por nome/telefone permanece.

No histórico importado, datas e valores originais também ficam guardados em `origem_dados`. Uma data antiga inválida não derruba o lote inteiro: fica sem data interpretada, preservando o original para conferência. Valores de pontos que não sejam inteiros válidos de 0 a 1.000.000 ficam em zero na cópia operacional; confira-os antes de aprovar. Uma troca de membro para um identificador antigo da origem é recusada. Preserve os identificadores/linhas do histórico do Forms; se a fonte usa número de linha como ID, não reordene/remova essas linhas sem revisar o vínculo.

As mensagens de WhatsApp continuam sendo preparadas somente após aprovação e confirmação dos pontos. A troca de versão descarta a prévia antiga. Não foi ativado envio automático nem alterado o modelo-base oficial, que ainda será fornecido pela usuária.

#### Central de Eventos implementada

A tela tem formulário próprio com **título, categoria, tipo/quadro, início, término, descrição e pasta do Drive opcional**. Não tem Projeto relacionado e não cria projeto ou pasta automaticamente. Há busca e um botão **Filtros** ao lado, com período, categoria, situação e ordenação. O período considera eventos que se sobrepõem ao intervalo escolhido. Datas e horários seguem São Paulo.

| Categoria | Sugestões disponíveis |
|---|---|
| Sazonais | Halloween, Natal, Páscoa, Festa junina, Carnaval |
| Especiais | Aniversário DubWorks, Torneio, Gincana, Maratona, Premiação |
| Interativos | Jogos, Sessão de filmes, Karaokê |
| Quadros | Dublê Comigo, Dubioff, Divulga seus membros |

É possível informar outro tipo dentro da categoria. A conta autorizada a aprovar salva/publica; as demais contas autorizadas enviam para aprovação. A interface preserva as ações anteriores de aprovação/rejeição. Eventos antigos continuam na lista, como Sem categoria até serem classificados, sem apagar seus dados. Associações antigas ficam preservadas no banco, mas não são usadas como campo do novo formulário. Criar/editar usa gravação real e proteção contra cliques duplicados, repetição e versão desatualizada.

#### Central de Membros mais leve

- Abrir a tela continua buscando uma página de 30 membros, com filtros no conjunto completo da base.
- Expandir um cadastro mostra os dados já recebidos e não dispara consultas de projetos, pontuação ou notas.
- **Projetos e personagens**, **Advertências e pontos** e **Observações da Diretoria** carregam somente ao selecionar a seção. Notas continuam exclusivas da Diretoria. O lápis carrega a nota atual para editar sem sobrescrever uma versão antiga.
- O Apps Script reutiliza a leitura da planilha na mesma solicitação: a listagem passou de duas leituras completas para uma. Ao consultar uma nota ou editar, não calcula a versão de todos os demais membros.
- A conferência de pontos indexa telefones uma vez, evitando percorrer todos os membros novamente para cada advertência.

Essas reduções foram verificadas com testes. Não foi medida uma porcentagem de ganho na sua conexão real; a primeira consulta ainda depende do Google. Tokens, ficha, projetos, histórico, filas e sessão do WhatsApp permanecem preservados.

#### Ativar a v44 — passo a passo atual

1. Feche o Manager pelo terminal antes de reiniciá-lo. Use a mesma pasta que já contém seu `.env.local`; ele foi preservado. O pacote completo não contém tokens.
2. Abra **Supabase → SQL Editor → New query**. Copie **todo** o conteúdo de `supabase/ATIVAR_V44.sql` e execute com Run. É um arquivo único, em uma transação, que inclui os pré-requisitos v42/v43 e as alterações v44. Não execute só um trecho. A primeira execução reinicia as decisões; execuções posteriores preservam decisões novas. Se houver erro, copie a mensagem completa e não prossiga com um SQL parcial.
3. Abra o projeto Apps Script **da planilha dos membros**, que atende a URL MEMBERS_SCRIPT_URL já configurada. Substitua seu Code.gs pelo conteúdo de `integracoes/membros-planilha/Code.gs` desta versão e salve. Preserve token, propriedades, planilha e acionadores.
4. Em **Implantar → Gerenciar implantações → lápis → Nova versão → Implantar**, publique na implantação existente. Mantenha a mesma URL `/exec`. Isso ativa a conferência de descontos/estornos e a redução das leituras; não precisa gerar outro token.
5. Se ainda não ativou a remoção de acessos v43, atualize separadamente o Apps Script **de Projetos/Drive** com `integracoes/google-forms-projetos/Code.gs` e `AcessosUsuarios.gs`, seguindo a seção v43. Esses arquivos não vão no script dos membros. Se a v43 já funciona, não precisa republicá-los por causa da v44.
6. Reinicie o Manager com `npm.cmd run dev` ou com seu iniciador habitual e use **Ctrl + F5**. Em Advertências, clique **Sincronizar** para importar o histórico como Em análise. A consulta antiga do Forms ainda depende da integração VITE_ADVERTENCIAS_API_URL que já existe; uma falha nela não elimina as ocorrências do banco.
7. Confira o saldo dos membros que tinham descontos antigos em **Advertências e pontos → Atualizar pontuação**, para registrar os estornos correspondentes às decisões reiniciadas. Não apague a aba Pontos_Membros nem seus movimentos.

O pacote `Dubworks-Manager_v44_Ativacao.zip` reúne o SQL único, as migrations e os scripts, com este guia. O assistente validou tudo em ambiente isolado, mas **não executou SQL no seu Supabase nem publicou na sua conta Google**. Nenhuma advertência foi aprovada, conta removida, permissão do Drive retirada ou mensagem enviada em dados reais.

#### Como conferir depois de ativar

1. Advertências → Sincronizar: na primeira ativação, as antigas devem estar Em análise/Aguardando decisão. Registros e provas continuam disponíveis. Os indicadores de aprovações/rejeições reiniciam sem apagar o histórico de decisões.
2. Em uma base de teste, envie uma advertência de 3 pontos para um membro com 10/10. Deve permanecer com 10/10 até a aprovação. Aprove: 7/10; atualizar repetidamente não pode descontar de novo.
3. Reabra em reanálise: deixa de contar como aprovada e estorna os 3 pontos efetivos. Edite para 2, salve e aprove: 8/10. Reabra e rejeite: volta a 10/10, sem apagar o histórico. Teste outra conta sem permissão de Diretoria: não deve reabrir ou editar a decisão.
4. Central de Eventos → Criar evento: escolha uma das quatro categorias, preencha início/término e salve sem pasta. Recarregue e confira persistência. O formulário não deve oferecer Projeto relacionado. Busque e filtre por categoria/período. Com perfil sem aprovação, o evento aguarda decisão.
5. Central de Membros: navegue nas páginas, pesquise e filtre. Expanda um membro e confirme que os dados aparecem sem esperar projetos/pontos/notas. Selecione cada seção para carregar suas informações. Edite um status e recarregue para conferir persistência.

#### Validação desta entrega

Build de produção aprovado. Passaram as regressões de membros, relatórios, bot simulado, usuários, remoção de acesso, projetos/personagens, navegação e URLs diretas. Os testes novos verificaram: ciclo de decisão/estorno/reaprovação, respostas antigas fora de ordem, bloqueio de decisões com rascunho não salvo, migrações repetidas em PostgreSQL em memória, SQL único completo, histórico sem aprovação presumida, quatro categorias de evento, horários de São Paulo, gravação sem projeto, repetição de cadastro, conflito de edição, e consultas de membros sob demanda.

- `npm.cmd run test:reanalysis` — fluxo de reanálise e pontuação, incluindo interface.
- `npm.cmd run test:events` — filtros, datas, formulário e gravação de eventos com dados fictícios.
- `npm.cmd run test:members-speed` — uma leitura de planilha, cálculo da versão somente do membro e zero consultas extras ao expandir.
- `npm.cmd run test:v44-db` — SQL isolado; usa PGlite opcional conforme a seção de testes do banco. Não se conecta ao banco real.


### v45 — Eventos com término opcional, pastas e formulários

O **término é opcional em todas as categorias**. Quadros podem ter apenas o início, que identifica o dia da publicação. Se preencher o término, ele precisa ser posterior ao início. Eventos sem término entram nos filtros pela data de início e não ficam permanentemente contados como Em andamento. A lista de sugestões sazonais será ajustada quando a usuária fornecer a lista definitiva; o tipo continua aceitando texto próprio.

Ao salvar, o cadastro é confirmado no banco e depois a automação prepara a estrutura no Google usando **os mesmos modelos e funções dos projetos**:

```text
Eventos/
  [Evento] Nome do evento (#ID)/
    1 | Seleção/
      Falas teste/
      Respostas/
        Formulário de Seleção + planilha de respostas
    2 | Projeto/
      Itens do Projeto/
      Entregas/
        Formulário de Entregas — Participação no evento + planilha de respostas
```

O ID no nome separa eventos com o mesmo título. Na planilha de controle da automação, o evento fica identificado como **Evento**, com chave `evento-ID`, sem colidir com IDs numéricos de Projetos/Parcerias. O formulário da Central não pede Projeto relacionado. A mesma estrutura de arquivos é gerada para o evento, sem obrigar a usuária a criar um projeto separado manualmente.

Os primeiros formulários usam a opção genérica **Participante** e o item **Participação no evento**. Podem ser ajustados pelos links **Editar Seleção / Editar Entregas** que aparecem nos detalhes. A automação mantém os modelos de upload e o tratamento de respostas já existentes. Eventuais avisos de publicação/configuração do Google aparecem nos detalhes; não há envio de WhatsApp nem criação de participantes fictícios no banco de membros.

A pasta **Eventos** usa, nesta ordem: DUBWORKS_EVENTS_ROOT_FOLDER_ID, se configurada; uma subpasta Eventos na raiz DUBWORKS_DRIVE_ROOT_FOLDER_ID; uma subpasta Eventos ao lado da raiz de Projetos; ou Eventos em DubWorks Manager no Drive da automação quando não houver raiz definida. O ID escolhido é guardado nas propriedades do Apps Script. Projetos e Parcerias mantêm suas raízes. O compartilhamento segue o fluxo existente de melhor esforço para o responsável; se o Google negar a permissão, confira o acesso na pasta com a conta da automação. Não são concedidas permissões públicas.

Se o Google falhar, **o evento continua salvo**. Nos detalhes, use **Atualizar estado** e, quando disponível, **Preparar / continuar no Google**. Não precisa cadastrar outro evento. Tentativas posteriores usam os IDs registrados pelo script, reaproveitam as pastas e os formulários e mantêm separadas as ocorrências com o mesmo título. Uma execução em andamento bloqueia outra preparação e edição; se o processo for interrompido sem finalizar, o bloqueio expira em 10 minutos. Atualize o estado antes de tentar novamente.

Os links de pasta informados na versão antiga não são usados para modificar pastas arbitrárias durante a preparação. Se um link antigo for substituído pela nova pasta oficial, fica preservado em `automacao_dados.pasta_anterior`. A remoção de acesso já autorizada também passa a considerar a raiz configurada de Eventos; essa atualização não remove acesso de ninguém ao instalar.

#### Eventos em Projetos e na planilha Institucional

Em **Projetos**, o botão **Eventos** abre a Central de Eventos para quem já tem acesso às duas áreas. O cadastro continua no Supabase e a automação continua registrando a execução em **DW - Projetos**.

A Central exibe os eventos em cards com capa, status, categoria, início e autoria. A capa é opcional e pode ser adicionada, trocada ou removida no formulário. Para habilitar o envio de JPG, PNG ou WebP de até 5 MB, execute `supabase/migrations/20261103_47_capas_eventos.sql` no **SQL Editor** do Supabase que já usa a v46. Reinicie o Manager, edite um evento e confira a capa no card depois de salvar e recarregar. Essa atualização da interface e do armazenamento não exige republicar o Apps Script.

Para ativar o espelho em **DubWorks Institucional**, atualize o arquivo `Eventos.gs` no Apps Script de Projetos. Em **Configurações do projeto → Propriedades do script**, crie `DUBWORKS_INSTITUTIONAL_SPREADSHEET_ID` com o ID da planilha Institucional. A conta que executa o Apps Script precisa ter acesso de edição a essa planilha. Salve e publique uma nova versão da implantação existente.

Depois da publicação, prepare um evento pela Central. A aba **Eventos** registra datas, status e os links de pastas, formulário e respostas quando disponíveis. Para importar um evento antigo ou atualizar o status na planilha depois de uma decisão, abra os detalhes e clique em **Conferir pastas e formulários** ou **Preparar / continuar no Google**. A linha é atualizada pelo ID do evento.

Se **Remover acesso** informar que a tabela de revogações está indisponível, execute o arquivo completo `supabase/migrations/20261102_43_remover_acesso.sql` no **SQL Editor** do Supabase usado pelo Manager. Abra a confirmação novamente após a execução. Se a consulta terminar com sucesso e o erro persistir, confira se o projeto aberto no Supabase é o mesmo configurado no Manager.

#### Corrigir o erro de ativação — faça nesta ordem

A mensagem **“Ative a migration 20261102_44_central_eventos.sql”** indica que o banco ao qual o sistema está conectado ainda não disponibiliza a função do formulário. Atualizar só os arquivos da tela não instala essa função. A v45 entrega um arquivo único específico para resolver isso, sem executar novamente o reinício das advertências.

1. Abra `supabase/ATIVAR_EVENTOS_V45.sql` desta versão. Copie **todo** o conteúdo.
2. No **mesmo projeto Supabase usado pelo Manager**, abra **SQL Editor → New query**, cole o conteúdo e clique em **Run**. Execute o arquivo inteiro. Ele inclui os campos e a função dos eventos da v44, o término opcional e o controle de preparação da v45. Não exige executar primeiro a migration 44 de eventos e não reinicia advertências. Se aparecer erro, não execute apenas trechos: guarde a mensagem completa para conferência.
3. Abra o Apps Script **de Projetos / Drive / Forms**. Substitua o conteúdo do seu `Code.gs` pelo arquivo `integracoes/google-forms-projetos/Code.gs` desta entrega. Adicione um arquivo de script chamado **Eventos** e cole `integracoes/google-forms-projetos/Eventos.gs`. Atualize também **AcessosUsuarios** com `integracoes/google-forms-projetos/AcessosUsuarios.gs`. Esses três arquivos ficam no mesmo projeto Apps Script. **Não use o Apps Script dos membros nem o de advertências.**
4. Preserve as propriedades e os acionadores existentes. Os modelos continuam sendo os IDs configurados em **DUBWORKS_TEMPLATE_SELECTION_ID** e **DUBWORKS_TEMPLATE_DELIVERIES_ID**. Se desejar escolher uma pasta Eventos existente, configure **DUBWORKS_EVENTS_ROOT_FOLDER_ID** com o ID dessa pasta. Caso contrário, ela será criada pela automação conforme a regra acima.
5. Salve e vá em **Implantar → Gerenciar implantações → lápis → Nova versão → Implantar**, mantendo a implantação de Projetos/Drive que já atende o sistema e a mesma URL `/exec`. Se o Google solicitar autorização, autorize com a conta que administra os modelos/pastas. Os scripts não criam arquivos ao simplesmente salvar ou publicar; a criação ocorre ao salvar/preparar um evento no Manager.
6. Reinicie o Manager no terminal com `npm.cmd run dev` ou com o iniciador habitual, mantendo o `.env.local` atual, e recarregue com **Ctrl + F5**. Não precisa trocar token nem atualizar o Apps Script dos membros por causa da v45.
7. Crie um quadro com título, categoria/tipo e início, deixando o término vazio. Após salvar, abra os detalhes e confira pasta, Seleção e Entregas. Recarregue para confirmar a persistência. Se houver falha do Google, o cadastro deve continuar na lista e oferecer a continuação da preparação.

Os arquivos de ativação estão reunidos em **Dubworks-Manager_v45_Ativacao-Eventos.zip**. O SQL e a publicação Google não foram executados pelo assistente na conta real; foram validados isoladamente. Os arquivos locais foram atualizados preservando `.env.local`, filas e sessão do bot.

#### Testes desta versão

- `npm.cmd run test:events` — término opcional e término inválido; datas/filtros; gravação real por RPC; falha do Google preservando cadastro; continuação sem novo cadastro; autorização da API; estrutura reaproveitada; títulos iguais; retomada após falha de formulário e preservação de Projeto/Parceria.
- `npm.cmd run test:events-db` — PostgreSQL em memória: ativação específica em uma base sem a função da v44, repetição da migration, fim nulo, aprovação/permissões, bloqueio de conta, controle de execução e confirmação dos formulários. Usa PGlite opcional, como os outros testes SQL documentados.
- `npm.cmd run test:events-local` — servidor Vite isolado: rota de eventos disponível e API exigindo sessão antes de qualquer chamada Google. Todas as nove URLs do build também foram conferidas com HTTP 200.
- Build de produção e regressões de navegação, remoção de acesso e desempenho dos membros aprovados. As otimizações dos membros da v44 permanecem.

Nenhuma pasta ou formulário real foi criado durante os testes, nenhuma mensagem foi enviada e nenhuma conta real teve o acesso removido.

## 10. Arquivos alterados nesta entrega — v45

Lista exata em relação ao pacote v44. As configurações locais, planilhas reais, filas e sessões do bot não integram a atualização.

- `README.md`
- `api/event-automation.js`
- `dist/assets/AdvertenciasPage-AaOaG_Nx.js`
- `dist/assets/EventsPage-BWqFy-MS.js`
- `dist/assets/EventsPage-zZhNlK-w.css`
- `dist/assets/ManagerDialogs-BDt2pYi9.js`
- `dist/assets/MarketingPage-BYhGuPNo.js`
- `dist/assets/MembersPage-uUfJUSDk.js`
- `dist/assets/ProjectsPage-C5MVmhD2.js`
- `dist/assets/ReportsPage-B2RidDyx.js`
- `dist/assets/ToolsPage-ZDNC3-C2.js`
- `dist/assets/TrainingPage-CQ6WJ2_I.js`
- `dist/assets/UsersPage-CQiLDeBf.js`
- `dist/assets/index-CKibZeVt.js`
- `dist/assets/warningWorkflow-BXq6OKNe.js`
- `dist/index.html`
- `documentacao/historico/README_consolidado_v44.md`
- `integracoes/google-forms-projetos/AcessosUsuarios.gs`
- `integracoes/google-forms-projetos/Code.gs`
- `integracoes/google-forms-projetos/Eventos.gs`
- `package.json`
- `src/components/EventCenter.css`
- `src/components/EventCenterForm.tsx`
- `src/components/EventStructure.tsx`
- `src/pages/screens/EventsPage.tsx`
- `src/services/appServices.ts`
- `src/services/eventCenter.ts`
- `supabase/ATIVAR_EVENTOS_V45.sql`
- `supabase/migrations/20261102_45_eventos_drive.sql`
- `tests/events-automation-api.test.mjs`
- `tests/events-automation-script.test.mjs`
- `tests/events-local-route.test.mjs`
- `tests/events-v45-ui.test.mjs`
- `tests/v45-events-db.test.mjs`
- `vite.config.ts`

Os arquivos em `dist/assets` e `dist/index.html` são a saída do build; assets antigos que permanecerem na pasta local não são utilizados pelo novo índice. O README anterior está arquivado em `documentacao/historico/README_consolidado_v44.md`. Esta entrega atualiza o Apps Script de Projetos/Drive (Code.gs e AcessosUsuarios.gs) e adiciona Eventos.gs. Use supabase/ATIVAR_EVENTOS_V45.sql para os eventos, sem reiniciar advertências. Os dados privados do bot permanecem locais; o SQL e a implantação Google precisam ser ativados na conta conforme o guia.
