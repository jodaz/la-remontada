// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    build: {
      // flag-icons trae ~270 banderas SVG. Si Vite las incrusta como data URI,
      // el CSS pasa de 400 KB y se descargan todas; con 0 quedan como archivos
      // y solo baja la bandera que la página usa (presupuesto de < 600 KB).
      assetsInlineLimit: 0,
    },
  },
});
