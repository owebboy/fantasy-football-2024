import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import legacy from "@vitejs/plugin-legacy";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: process.env.PORT as unknown as number,
  },
  plugins: [
    svelte(),

    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Fantasy Football Cheatsheet 2024",
        short_name: "Fantasy Football Cheatsheet 2024",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
      },
    }),

    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
});
