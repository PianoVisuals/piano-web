import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/piano-web/",        // ← AJOUTE CETTE LIGNE
  plugins: [react()],
});
