import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import vercel from "vite-plugin-vercel";
import legacy from "@vitejs/plugin-legacy";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: process.env.PORT as unknown as number,
  },
  plugins: [
    svelte(),
    vercel(),

    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
});
