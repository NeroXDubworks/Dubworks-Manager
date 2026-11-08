import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // APIs locais de membros/WhatsApp ainda não estão nesta branch.
  // Não importar módulos ausentes no build de produção.
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    proxy: {
      // Desenvolvimento local: encaminha a automação de Projetos/Drive/Forms
      // diretamente ao Apps Script. Em produção, /api/project-automation é
      // atendido pela função serverless que também valida o acesso ao projeto.
      "/api/project-automation": {
        target: "https://script.google.com",
        changeOrigin: true,
        followRedirects: true,
        rewrite: () =>
          "https://script.google.com/macros/s/AKfycbw01YYkPCun4Gxuq7SLCgrrlIOt_CSmJOR0gpfp4ZRy6RH9j5X3fSaf0TO6Nkas_k3DhA/exec",
      },

      "/api/cortes": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/cortes/, ""),
      },

      "/api/ia": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/ia/, "/ia"),
      },
    },
  },
});
