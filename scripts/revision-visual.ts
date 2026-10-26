// Revisión visual: capturas de todas las rutas en 360/400/768/1280 px, en
// claro y oscuro. Falla si hay desborde horizontal a 360 px o si una etiqueta
// se sale del meme. Las capturas quedan en dist-capturas/revision/ para el
// artefacto de GitHub Actions.
//
// Uso: node scripts/revision-visual.ts [--dist dist] [--salida dist-capturas/revision]

import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { esperarPagina, fijarMeme } from "./lib/pagina.ts";
import { RUTAS, rutasExistentes } from "./lib/rutas.ts";
import { servirDirectorio } from "./lib/servidor.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const ANCHOS = [360, 400, 768, 1280];
const ESQUEMAS = ["light", "dark"] as const;

interface Desborde {
  etiqueta: string;
  clase: string;
  izquierda: number;
  derecha: number;
}

interface RevisiónEtiquetas {
  hayMeme: boolean;
  problemas: string[];
  avisos: string[];
}

function revisarEtiquetas(): RevisiónEtiquetas {
  const memes = Array.from(document.querySelectorAll("body [data-meme]"));
  if (memes.length === 0) return { hayMeme: false, problemas: [], avisos: [] };

  const problemas: string[] = [];
  const avisos: string[] = [];
  for (const meme of memes) {
    const caja = meme.getBoundingClientRect();
    const etiquetas = Array.from(meme.querySelectorAll("[data-etiqueta]"));
    if (etiquetas.length === 0) {
      avisos.push("El meme no tiene etiquetas [data-etiqueta].");
      continue;
    }
    for (const etiqueta of etiquetas) {
      const elemento = etiqueta as HTMLElement;
      const cajaEtiqueta = elemento.getBoundingClientRect();
      const fuera: string[] = [];
      if (cajaEtiqueta.left < caja.left - 1.5) fuera.push(`izquierda ${Math.round(caja.left - cajaEtiqueta.left)} px`);
      if (cajaEtiqueta.right > caja.right + 1.5) fuera.push(`derecha ${Math.round(cajaEtiqueta.right - caja.right)} px`);
      if (cajaEtiqueta.top < caja.top - 1.5) fuera.push(`arriba ${Math.round(caja.top - cajaEtiqueta.top)} px`);
      if (cajaEtiqueta.bottom > caja.bottom + 1.5) fuera.push(`abajo ${Math.round(cajaEtiqueta.bottom - caja.bottom)} px`);
      const nombre = elemento.id || elemento.dataset.etiqueta || elemento.tagName.toLowerCase();
      if (fuera.length) problemas.push(`${nombre}: se sale del meme (${fuera.join(", ")})`);
      if (elemento.scrollWidth > elemento.clientWidth + 1) {
        avisos.push(`${nombre}: el texto se desborda dentro de la etiqueta (${elemento.scrollWidth} > ${elemento.clientWidth} px).`);
      }
    }
  }
  return { hayMeme: true, problemas, avisos };
}

function revisarDesborde(): { ancho: number; scroll: number; elementos: Desborde[] } {
  const ancho = document.documentElement.clientWidth;
  const scroll = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const elementos: Desborde[] = [];

  for (const nodo of Array.from(document.querySelectorAll("body *"))) {
    const elemento = nodo as HTMLElement;
    const estilo = getComputedStyle(elemento);
    if (estilo.display === "none" || estilo.visibility === "hidden") continue;
    const caja = elemento.getBoundingClientRect();
    if (caja.width < 2 || caja.height < 2) continue;
    if (caja.right <= ancho + 1 && caja.left >= -1) continue;
    if (elemento.closest(".visualmente-oculto")) continue;

    // Si un contenedor intermedio recorta o desplaza (tablas anchas), no
    // genera desborde de página. El body sí cuenta: `overflow-x: hidden` tapa
    // el problema pero el contenido sigue cortado.
    let recortado = false;
    let padre = elemento.parentElement;
    while (padre && padre !== document.body && padre !== document.documentElement) {
      const estiloPadre = getComputedStyle(padre);
      if (["hidden", "clip", "auto", "scroll"].includes(estiloPadre.overflowX)) {
        recortado = true;
        break;
      }
      padre = padre.parentElement;
    }
    if (recortado) continue;

    elementos.push({
      etiqueta: elemento.tagName.toLowerCase(),
      clase: typeof elemento.className === "string" ? elemento.className.slice(0, 100) : "",
      izquierda: Math.round(caja.left),
      derecha: Math.round(caja.right),
    });
  }

  return { ancho, scroll, elementos };
}

async function principal() {
  const { values } = parseArgs({
    options: {
      dist: { type: "string", default: "dist" },
      salida: { type: "string", default: "dist-capturas/revision" },
    },
  });
  const dist = resolve(RAIZ, values.dist);
  if (!existsSync(dist)) throw new Error(`No existe ${dist}. Ejecuta el build antes.`);
  const salida = resolve(RAIZ, values.salida);
  mkdirSync(salida, { recursive: true });

  const existentes = rutasExistentes(dist);
  const faltantes = RUTAS.filter((entrada) => !existentes.includes(entrada));
  for (const entrada of faltantes) console.warn(`⚠ Falta la ruta ${entrada.ruta}; no se captura.`);
  if (existentes.length === 0) throw new Error(`No hay rutas HTML en ${dist}.`);

  const { chromium } = await import("playwright");
  const servidor = await servirDirectorio(dist);
  const navegador = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  let capturas = 0;
  const fallos: string[] = [];
  const avisos = new Set<string>();
  let sinMeme = 0;
  let sinMemeNumeros = 0;
  const rutasDeMeme = new Set(["/", "/victima", "/ranking"]);

  try {
    for (const esquema of ESQUEMAS) {
      for (const ancho of ANCHOS) {
        const contexto = await navegador.newContext({
          viewport: { width: ancho, height: 900 },
          deviceScaleFactor: 1,
          colorScheme: esquema,
          reducedMotion: "reduce",
        });
        const carpeta = join(salida, esquema, String(ancho));
        mkdirSync(carpeta, { recursive: true });

        for (const entrada of existentes) {
          const page = await contexto.newPage();
          await fijarMeme(page);
          const respuesta = await page.goto(`${servidor.url}${entrada.ruta}`, {
            waitUntil: "load",
            timeout: 30_000,
          });
          if (!respuesta || respuesta.status() >= 400) {
            fallos.push(`${entrada.ruta} (${ancho} px, ${esquema}): respondió ${respuesta?.status() ?? "sin respuesta"}.`);
            await page.close();
            continue;
          }
          await esperarPagina(page, 500);

          const etiquetas = (await page.evaluate(revisarEtiquetas)) as RevisiónEtiquetas;
          if (!etiquetas.hayMeme) {
            if (rutasDeMeme.has(entrada.ruta)) sinMeme += 1;
            else sinMemeNumeros += 1;
          } else {
            for (const problema of etiquetas.problemas) {
              fallos.push(`${entrada.ruta} (${ancho} px, ${esquema}): ${problema}`);
            }
            for (const aviso of etiquetas.avisos) avisos.add(`${entrada.ruta} (${ancho} px): ${aviso}`);
          }

          if (ancho === 360) {
            const desborde = (await page.evaluate(revisarDesborde)) as {
              ancho: number;
              scroll: number;
              elementos: Desborde[];
            };
            if (desborde.scroll > desborde.ancho + 1) {
              fallos.push(`${entrada.ruta} (360 px, ${esquema}): scroll horizontal ${desborde.scroll} > ${desborde.ancho} px.`);
            }
            for (const elemento of desborde.elementos.slice(0, 5)) {
              fallos.push(
                `${entrada.ruta} (360 px, ${esquema}): <${elemento.etiqueta} class="${elemento.clase}"> llega a ${elemento.derecha} px (izquierda ${elemento.izquierda}).`,
              );
            }
          }

          await page.screenshot({
            path: join(carpeta, `${entrada.slug}.png`),
            fullPage: true,
            animations: "disabled",
          });
          capturas += 1;
          await page.close();
        }
        await contexto.close();
      }
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }

  for (const aviso of avisos) console.warn(`⚠ ${aviso}`);
  if (sinMeme > 0) {
    console.warn(
      `⚠ ${sinMeme} captura(s) de páginas de meme sin [data-meme]: se omite la revisión de etiquetas.`,
    );
  }
  if (sinMemeNumeros > 0) {
    console.log(`ℹ ${sinMemeNumeros} captura(s) de páginas de números sin meme (no hay etiquetas que revisar).`);
  }
  console.log(
    `\n${capturas} captura(s) en ${values.salida}/ · ${fallos.length} fallo(s) · ${avisos.size} aviso(s) · ${sinMeme} sin meme.`,
  );
  if (fallos.length) {
    for (const fallo of fallos.slice(0, 40)) console.error(`✗ ${fallo}`);
    if (fallos.length > 40) console.error(`… y ${fallos.length - 40} más.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await principal();
