// Genera las banderas del sitio a partir de los SVG de flag-icons.
//
// Crea public/banderas/{iso2}-v1.webp (128×96, fondo transparente) y
// src/styles/banderas.css con la base de flag-icons y una regla por país.
// Se ejecuta a mano cuando cambia data/paises.json o se sube la versión:
//   node scripts/generar-banderas.mjs
//
// Los SVG de flag-icons pesan hasta 180 KB (Serbia); rasterizados a 128 px
// pesan 1–4 KB y dejan de competir con la imagen del meme por el LCP.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const VERSION = 1;
const ANCHO = 128;
const ALTO = 96;
const CALIDAD = 82;
const CARPETA = join(RAIZ, "public", "banderas");
const SALIDA_CSS = join(RAIZ, "src", "styles", "banderas.css");
const BANDERAS = join(RAIZ, "node_modules", "flag-icons", "flags", "4x3");

const paises = JSON.parse(readFileSync(join(RAIZ, "data", "paises.json"), "utf8"));
const isos = [...new Set([...Object.values(paises).map((pais) => pais.iso2), "xx"])]
  .filter((iso) => typeof iso === "string" && existsSync(join(BANDERAS, `${iso}.svg`)))
  .sort();

if (isos.length === 0) throw new Error("No hay banderas que generar.");

mkdirSync(CARPETA, { recursive: true });
const navegador = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const pagina = await navegador.newPage({
  viewport: { width: ANCHO, height: ALTO },
  deviceScaleFactor: 1,
});

try {
  for (const iso of isos) {
    const svg = readFileSync(join(BANDERAS, `${iso}.svg`), "utf8");
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    await pagina.setContent(
      `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:${ANCHO}px;height:${ALTO}px}</style><img src="${uri}" alt="">`,
    );
    await pagina.waitForFunction(() => document.images[0]?.complete && document.images[0].naturalWidth > 0);
    await pagina.screenshot({
      path: join(CARPETA, `${iso}-v${VERSION}.webp`),
      type: "webp",
      quality: CALIDAD,
      omitBackground: true,
      clip: { x: 0, y: 0, width: ANCHO, height: ALTO },
    });
  }
} finally {
  await navegador.close();
}

const reglas = isos.map(
  (iso) => `.fi.fi-${iso} { background-image: url("/banderas/${iso}-v${VERSION}.webp"); }`,
);

writeFileSync(
  SALIDA_CSS,
  `/* Generado por scripts/generar-banderas.mjs; no editar a mano.
   Base de flag-icons (MIT) y banderas rasterizadas de sus SVG en public/banderas/.
   Versión ${VERSION}: al regenerar con otros trazos, sube VERSION en el script. */

.fib,
.fi {
  background-size: contain;
  background-position: 50%;
  background-repeat: no-repeat;
}
.fi {
  position: relative;
  display: inline-block;
  width: 1.333333em;
  line-height: 1em;
}
.fi::before {
  /* Espacio duro (U+00A0), como flag-icons: un espacio normal colapsa y la
     bandera se queda sin alto. */
  content: "\\00a0";
}
.fi.fis {
  width: 1em;
}

${reglas.join("\n")}
`,
);

console.log(`${isos.length} bandera(s) en public/banderas/ y ${SALIDA_CSS}.`);
