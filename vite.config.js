// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";          // ← utilitaire Node pour construire des chemins

export default defineConfig({
  base: "/",              // reste inchangé – nécessaire pour Netlify
  plugins: [react()],

  /**  Tout ce bloc n’est pris en compte qu’au build (`npm run build`)
   *   Il dit à Rollup : « génère un bundle séparé pour chaque HTML listé ».
   */
  build: {
    rollupOptions: {
      input: {
        // clé : nom souhaité (sera l’URL), valeur : chemin du fichier
        main: resolve(__dirname, "index.html"),   // https://…/   (page piano)
        game: resolve(__dirname, "game.html")     // https://…/game.html
      }
    }
  }
});