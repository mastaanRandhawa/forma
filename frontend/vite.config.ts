import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/forma/ in production; root in dev.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/forma/" : "/",
  plugins: [react()],
  server: { port: 5178, host: true },
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
