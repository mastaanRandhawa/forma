import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed at the root of a Cloudflare Pages domain (`*.pages.dev` or a custom
// domain), so the base is "/". Override with VITE_BASE at build time if the app
// is ever served from a sub-path again (e.g. GitHub Pages needed "/forma/").
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
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
});
