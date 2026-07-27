# DubWorks Manager refatorado

Esta versão foi criada diretamente a partir do `App.tsx` original enviado.

## O que foi realmente separado

- `src/types/index.ts`: todos os tipos do sistema.
- `src/config/appConfig.ts`: logo, Apps Script, permissões e tema.
- `src/data/trainingModules.ts`: conteúdo completo dos treinamentos.
- `src/data/defaults.ts`: projeto e elenco vazios.
- `src/services/appServices.ts`: regras, Supabase, Google Drive, Forms, relatórios e utilitários.
- `src/pages/DubworksManager.tsx`: tela principal original preservada.
- `src/App.tsx`: wrapper pequeno.
- `src/components/cortes/CortesProjeto.tsx`: tela isolada de cortes.

## Como substituir no projeto do celular

1. Faça uma cópia da pasta atual.
2. Substitua primeiro `types`, `config`, `data`, `services` e `lib`.
3. Substitua `pages/DubworksManager.tsx`.
4. Substitua `App.tsx`.
5. Preserve seu `mobile-first.css` original.
6. Rode a compilação antes de enviar para produção.

A integração existente com Google Drive, Google Forms, Apps Script e Supabase foi movida sem alterar as URLs e ações presentes no arquivo original.
