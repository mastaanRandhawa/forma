import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/forma/ in production (GitHub Pages), root
// in dev. Override with VITE_BASE at build time for a custom domain / other host.
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === "build" ? "/forma/" : "/"),
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
