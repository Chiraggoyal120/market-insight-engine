import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const webhookUrl = env.VITE_N8N_WEBHOOK_URL;
  const proxy =
    webhookUrl &&
    (() => {
      try {
        const u = new URL(webhookUrl);
        return {
          "/api/n8n-webhook": {
            target: u.origin,
            changeOrigin: true,
            secure: true,
            rewrite: () => u.pathname,
          },
        };
      } catch {
        return {};
      }
    })();

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: proxy || undefined,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "spa-fallback",
      configResolved() {},
      apply: "serve",
      enforce: "post",
      middleware(req, res, next) {
        if (!req.url.includes(".") && req.url !== "/" && !req.url.includes("@")) {
          req.url = "/index.html";
        }
        next();
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    host: "::",
    port: 8080,
  },
  };
});
