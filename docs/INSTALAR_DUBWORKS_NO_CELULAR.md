# Instalar o DubWorks Manager no celular

A DubWorks pode ser instalada como **PWA (Progressive Web App)**, usando o mesmo site, login e banco de dados. Não é necessário distribuir um APK ou publicar na Google Play.

## Android (Chrome)
1. Abra o endereço oficial do DubWorks Manager pelo **Chrome**, depois que a versão com o manifesto estiver publicada.
2. Toque no menu de três pontinhos (⋮).
3. Escolha **Instalar aplicativo** ou **Adicionar à tela inicial** (o nome varia conforme navegador/aparelho).
4. Confirme. A DubWorks ficará com ícone próprio na tela inicial, e poderá abrir sem a barra do navegador.

## iPhone (Safari)
1. Abra o mesmo site pelo Safari.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início** e confirme.

## Arquivos que habilitam a instalação
- `public/manifest.webmanifest`: nome, cores, tela inicial e ícones do app.
- `public/icons/dubworks-192.png` e `public/icons/dubworks-512.png`: ícones para o Android.
- `index.html`: link ao manifesto e metadados para celular.

## Observações importantes
- **Requer internet** para login, salvar projetos, assistir às entregas e sincronizar Supabase/Google Drive.
- É **o mesmo sistema**, e não um aplicativo independente ou uma cópia do banco.
- Alterações de código continuam sendo publicadas pelo GitHub/Vercel.
- O menu de instalação só aparecerá normalmente depois do **deployment em Production** na Vercel (HTTPS, manifesto e ícones publicados).
- Esta implementação não produz um arquivo `.apk`. Para um APK nativo/lojas, seria necessário um projeto Android, assinatura e configurações adicionais.
