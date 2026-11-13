# Publicação — Produção integrada (episódios + semanas + Forms)
 
## Situação
- CI da branch: rodar antes do merge.
- Migration `notificacoes_entregas_episodio`: aplicada ao Supabase **Dubworks Manager - DT** (ref `omgjbafqukpzdhhpdlaa`) em 13/11/2026; confirmar novamente antes de aplicar em outro ambiente.
- Script e Vercel: exigem checagem do ambiente atual. **Não mesclar o PR enquanto o Apps Script em uso estiver na versão anterior.**

## 1. Atualizar somente a integração de Drive/Forms
- Abrir no editor do Apps Script o Web App de integração de projetos/Formulários **Dubworks - integração forms** que já é usado pela aplicação. **Não tocar no Apps Script de Advertências**.
- Conferir o ID/URL do projeto antes de substituir qualquer código.
- Atualizar `Code.gs` com `integracoes/google-forms-projetos/Code.gs` desta branch.
- No Apps Script, escolher **Implantar > Gerenciar implantações > Editar** a implantação existente, selecionando **Nova versão**. Não criar novo Web App por engano.
- Abrir a URL de execução e conferir `doGet` (JSON `ok:true`). No navegador, o conteúdo publicado precisa corresponder à nova versão.
- As propriedades dos modelos de Forms (`DUBWORKS_TEMPLATE_SELECTION_ID` e `DUBWORKS_TEMPLATE_DELIVERIES_ID`) devem continuar intactas.
 
## 2. Variáveis para notificação imediata (sem expor segredos)
O sistema já grava os envios no banco. Para os avisos automáticos imediatamente após o envio de um Form exclusivo do EP, configurar **os dois lados**:
- Vercel **server-side**, projeto `dubworks-manager-altera-es-pessoais`: `DUBWORKS_DELIVERY_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`. As variáveis são de servidor; jamais utilizar prefixo `VITE_` ou copiá-las para o frontend.
- Apps Script > Configurações do projeto > Propriedades do script: `DUBWORKS_DELIVERY_WEBHOOK_SECRET` (o mesmo segredo configurado no servidor) e `DUBWORKS_DELIVERY_WEBHOOK_URL` (URL absoluta da implantação do Manager terminando com `/api/forms-submission`).
- Não colocar senhas/chaves no GitHub nem no texto deste documento.
- Validar a URL/configuração do serviço antes de começar a testar uploads reais.
 
## 3. Validar em um episódio sem risco
- Abrir Produção de um projeto de teste ou episódio novo; conferir que o campo de semana aparece **dentro do EP**.
- Gerar o Form; conferir nome `[Entregas] - Projeto - EP NN - Título`.
- Conferir IDs únicos de Form e planilha no projeto, e que arquivos antigos continuam intactos.
- Cadastrar Semana 02 e verificar que a pergunta Semana/Corte foi atualizada no mesmo Form sem apagar respostas da Semana 01.
- Enviar uma gravação de teste pelo Forms novo; confirmar no Supabase `entregas_producao`, em `notificacoes` e no painel Atividade, identificando projeto/EP/semana.
- Avaliar essa entrega diretamente no painel da semana, depois conferir histórico real e status.
- Retestar um episódio antigo: seus dados e arquivos não podem ser alterados; usar o Form legado apenas para registros históricos.
- Garantir que uma segunda sincronização da mesma resposta não duplica o registro nem desfaz aprovações.

## 4. Publicar
- Só após passar todas as validações, verificar o SHA e a CI do PR e aprovar o merge para a branch principal. O GitHub integrado ao Vercel deve acionar o deploy automaticamente.
- Conferir deployment como READY, site de produção, notificações reais e login autorizado.
- Se o Web App antigo ainda não estiver atualizado, manter PR em rascunho e não publicar por cima da versão funcional.
