import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/forma/ in production (GitHub Pages), root
// in dev. Override with VITE_BASE at build time for a custom domain / other host.
// `--mode offline` (npm run dev:offline) runs the no-backend build even when
// .env points at a local API.
export default defineConfig(({ command, mode }) => ({
  base: process.env.VITE_BASE ?? (command === "build" ? "/forma/" : "/"),
  plugins: [react()],
  server: { port: 5178, host: true },
  ...(mode === "offline" ? { define: { "import.meta.env.VITE_API_URL": JSON.stringify("") } } : {}),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          motion: ["motion", "framer-motion"],
        },
      },
    },
  },
}));
