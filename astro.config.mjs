// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  build: {
    // El CSS crítico viaja dentro del HTML: una petición menos antes del primer
    // pintado. Cloudflare comprime el HTML, así que el peso extra es mínimo.
    inlineStylesheets: "always",
  },
  vite: {
    build: {
      // Los assets importados quedan como archivos, no como data URI: se
      // cachean aparte y solo baja lo que la página usa.
      assetsInlineLimit: 0,
    },
  },
});
