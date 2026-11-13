# Auditoria e limpeza controlada — DubWorks Manager
**Data:** 13/11/2026
**Branch:** `feat/episodios-integrados-notificacoes-forms-20261113`
**Banco:** Supabase DubWorks Manager - DT (`omgjbafqukpzdhhpdlaa`)

## O que foi verificado
- 203 entregas registradas; 15 já associadas a episódio; 188 sem `episodio_id` (dados históricos, **não** lixo).
- 0 entregas referenciando episódios inexistentes.
- 0 entregas cujo `projeto_id` conflita com o projeto do episódio.
- 0 entregas cujo `episodio_corte_id` conflita com episódio/projeto.
- 0 cortes com `projeto_id` divergente.
- 0 linhas de `projeto_semana_elenco` órfãs.
- 0 IDs de formulários de episódio duplicados entre registros cadastrados.
- 0 entradas exatas duplicadas no histórico do episódio.

## Mudanças feitas sem apagar dados
- Tabelas de episódio, corte, entrega e histórico preservadas.
- Notificações de novos envios vinculados a Form exclusivo de episódio (migração `notificacoes_entregas_episodio`).
- Notificações de nova regravação solicitada, preservando aprovação/associação como eventos apenas da Atividade (migração `avisos_regravacao_atividade`).
- Índices de histórico/notificação para consulta eficiente por projeto, sem varredura global.
- Frontend unifica semanas históricas, entregas e avaliações no episódio correto, mas não presume episódio quando ele é nulo.
- Remoção de código morto de Registro, cobrança global obsoleta, modais antigos de semanas e sincronizações paralelas não utilizadas.
- Identificação das filas de cobrança pelo episódio, evitando colisão entre `Semana 01` de episódios diferentes.

## Preservação obrigatória
Não excluir nem reconstruir `projeto_semanas`, `projeto_semana_elenco`, `entregas_producao`, `episodio_historico`, arquivos do Drive, formulários nem respostas anteriores. Os registros sem episódio só podem ser associados com revisão humana. Não fazer `DELETE`, `DROP` ou limpeza em massa baseada apenas em nomes, ausência de `episodio_id` ou aparente inatividade.

## Pendências externas ao merge
1. Atualizar e republicar **a implantação existente** de `integracoes/google-forms-projetos/Code.gs`, que introduz `preparar_formulario_episodio`; isso não pode ser feito pelo conector Drive. O código do novo Form do EP não está garantido no Apps Script em produção até a publicação.
2. Configurar no Vercel servidor `DUBWORKS_DELIVERY_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`, e nas propriedades do Apps Script `DUBWORKS_DELIVERY_WEBHOOK_SECRET` e `DUBWORKS_DELIVERY_WEBHOOK_URL`. Não copiar chaves para frontend/GitHub.
3. Testar envio de gravação pelo Form exclusivo, criação de notificação, marcação como lida, player e regravação.
4. Após publicação da interface, conferir GitHub/Vercel `main`, regressão de login/CRM, e se o projeto abre normalmente.

## Segurança
Supabase advisors apontam avisos preexistentes envolvendo funções SECURITY DEFINER, GraphQL e proteção de senhas. **Não revogar permissões nem remover funções sem estudar dependências reais**, para não quebrar autenticação, WhatsApp e integrações em produção.
