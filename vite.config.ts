import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes("node_modules/motion")) {
            return "motion";
          }
          if (
            moduleId.includes("node_modules/react/") ||
            moduleId.includes("node_modules/react-dom/") ||
            moduleId.includes("node_modules/react-router")
          ) {
            return "react";
          }
          if (moduleId.includes("node_modules/@supabase/")) {
            return "supabase";
          }
        },
      },
    },
  },
}));
