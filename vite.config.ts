import { defineConfig, loadEnv } from "vite";
import membersHandler from "./api/members.js";
import whatsappHandler from "./api/whatsapp-bot.js";
import userAccessHandler from "./api/user-access.js";
import eventAutomationHandler from "./api/event-automation.js";
import {localJsonEndpoint} from "./api/_shared/localJsonMiddleware.js";
import {ignoreBotRuntimePath} from "./api/_shared/devWatch.js";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "members-server",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      for (const key of ["MEMBERS_SCRIPT_URL", "MEMBERS_SCRIPT_TOKEN", "WHATSAPP_BOT_URL"]) if (env[key]) process.env[key] = env[key];
      server.middlewares.use("/api/whatsapp-bot", (req, res) => { void localJsonEndpoint(req, res, whatsappHandler); });
      server.middlewares.use("/api/user-access", (req, res) => { void localJsonEndpoint(req, res, userAccessHandler, 16384); });
      server.middlewares.use("/api/event-automation", (req, res) => { void localJsonEndpoint(req, res, eventAutomationHandler, 8192); });
      server.middlewares.use("/api/members", (req, res) => { void localJsonEndpoint(req, res, membersHandler, 65536); });
    },
  }],

  server: {
    host: "0.0.0.0",
    watch: {
      ignored: [ignoreBotRuntimePath],
    },

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
