// Genera las imágenes og:image (1200×630) de cada ruta y las capturas móviles
// diarias de los memes. Se ejecuta después de `astro build`.
//
// Uso: node scripts/capturas-og.ts [--dist dist] [--capturas dist-capturas] [--estricto]
//
// `--estricto` (o CAPTURAS_ESTRICTO=1) falla si falta alguna de las cinco rutas.
// Sin esa opción avisa y sigue, para no bloquear mientras se construyen páginas.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { RUTAS, archivoDeRuta } from "./lib/rutas.ts";
import { esperarPagina } from "./lib/pagina.ts";
import { servirDirectorio } from "./lib/servidor.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const ANCHO_OG = 1200;
const ALTO_OG = 630;

function dimensionesPng(archivo: string): { ancho: number; alto: number } | null {
  const datos = readFileSync(archivo);
  if (datos.length < 24 || datos.readUInt32BE(0) !== 0x89504e47) return null;
  return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
}

/**
 * Deja solo el meme, centrado sobre el papel, y lo escala para que quepa en
 * 1200×630. Devuelve datos para el informe.
 */
async function encuadrar(page: import("playwright").Page) {
  return page.evaluate(() => {
    const meme = document.querySelector("body [data-meme]") as HTMLElement | null;
    // En /numeros no hay meme: el gancho visual es el gráfico.
    const grafico = meme
      ? null
      : (["[data-carrera]", "[data-lineas]", "[data-contador]", ".contador-bloque"]
          .map((selector) => document.querySelector(selector) as HTMLElement | null)
          .find((elemento) => elemento !== null) ?? null);
    const foco = meme ?? grafico;

    if (foco && !meme) {
      // Fuera tablas, controles y notas: en 1200×630 solo cabe el gráfico.
      foco
        .querySelectorAll(
          ".tabla-envoltura, .carrera-controles, .carrera-tiempo, .carrera-extremos, .linea-datos, .letra-pequena, .aviso-caida",
        )
        .forEach((elemento) => (elemento as HTMLElement).style.setProperty("display", "none", "important"));
    }

    if (foco) {
      let nodo: HTMLElement = foco;
      while (nodo.parentElement && nodo !== document.body) {
        nodo.style.setProperty("width", "100%", "important");
        if (nodo !== foco && !meme) {
          // El gráfico va solo: sin relleno de artículo que lo desplace.
          nodo.style.setProperty("padding", "0", "important");
          nodo.style.setProperty("margin", "0", "important");
          nodo.style.setProperty("max-width", "none", "important");
        }
        const padre = nodo.parentElement;
        for (const hijo of Array.from(padre.children)) {
          if (hijo !== nodo) (hijo as HTMLElement).style.setProperty("display", "none", "important");
        }
        nodo = padre;
      }
    } else {
      for (const selector of [
        "header",
        "footer",
        ".encabezado",
        ".pie",
        ".saltar",
        ".boton-descarga",
        ".boton-numeros",
        ".nota-realidad",
        "[data-nota-realidad]",
      ]) {
        document.querySelectorAll(selector).forEach((elemento) => {
          (elemento as HTMLElement).style.setProperty("display", "none", "important");
        });
      }
    }

    const cuerpo = document.body;
    cuerpo.style.setProperty("margin", "0", "important");
    cuerpo.style.setProperty("height", "100vh", "important");
    cuerpo.style.setProperty("min-height", "0", "important");
    cuerpo.style.setProperty("display", "flex", "important");
    cuerpo.style.setProperty("align-items", "center", "important");
    cuerpo.style.setProperty("justify-content", "center", "important");
    cuerpo.style.setProperty("overflow", "hidden", "important");
    cuerpo.style.setProperty("background", "var(--papel, #EDF0E6)", "important");
    document.documentElement.style.setProperty("height", "100vh", "important");
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    document.documentElement.style.setProperty("background", "var(--papel, #EDF0E6)", "important");

    document.querySelectorAll("main").forEach((elemento) => {
      const main = elemento as HTMLElement;
      main.style.setProperty("display", "flex", "important");
      main.style.setProperty("align-items", "center", "important");
      main.style.setProperty("justify-content", "center", "important");
      main.style.setProperty("width", "100%", "important");
      main.style.setProperty("max-width", "none", "important");
      main.style.setProperty("height", "100vh", "important");
      main.style.setProperty("margin", "0", "important");
      main.style.setProperty("padding", "0", "important");
    });

    if (!foco) return { tipo: "pagina", escala: 1, ancho: 0, alto: 0 };

    if (meme) {
      meme.style.setProperty("box-shadow", "0 18px 50px rgba(20, 20, 20, 0.22)", "important");
      meme.style.setProperty("border-radius", "2px", "important");
    }
    const caja = foco.getBoundingClientRect();
    const escala = Math.min((1200 - 96) / caja.width, (630 - 64) / caja.height, 1.6);
    if (Number.isFinite(escala) && escala > 0 && Math.abs(escala - 1) > 0.01) {
      foco.style.setProperty("transform", `scale(${escala})`, "important");
      foco.style.setProperty("transform-origin", "center center", "important");
      foco.style.setProperty("flex", "none", "important");
    }
    return {
      tipo: meme ? "meme" : "grafico",
      escala: Number(escala.toFixed(3)),
      ancho: Math.round(caja.width),
      alto: Math.round(caja.height),
      elegido: document.documentElement.dataset.meme ?? null,
    };
  });
}

async function principal() {
  const { values } = parseArgs({
    options: {
      dist: { type: "string", default: "dist" },
      capturas: { type: "string", default: "dist-capturas" },
      estricto: { type: "boolean", default: process.env.CAPTURAS_ESTRICTO === "1" },
    },
  });
  const dist = resolve(RAIZ, values.dist);
  if (!existsSync(dist)) throw new Error(`No existe ${dist}. Ejecuta \`astro build\` antes.`);
  const capturas = resolve(RAIZ, values.capturas);
  const fecha = process.env.LA_REMONTADA_HOY?.trim() || new Date().toISOString().slice(0, 10);

  const existentes = RUTAS.filter((entrada) => archivoDeRuta(dist, entrada.ruta));
  const faltantes = RUTAS.filter((entrada) => !archivoDeRuta(dist, entrada.ruta));
  for (const entrada of faltantes) {
    const aviso = `Falta la ruta ${entrada.ruta}; no se genera ${entrada.og ? `og/${entrada.og}.png` : entrada.slug}.`;
    if (values.estricto) throw new Error(aviso);
    console.warn(`⚠ ${aviso}`);
  }

  mkdirSync(join(dist, "og"), { recursive: true });
  mkdirSync(join(capturas, fecha), { recursive: true });

  const { chromium } = await import("playwright");
  const servidor = await servirDirectorio(dist);
  const navegador = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const errores: string[] = [];

  try {
    // og:image de cada ruta, en 1200×630.
    for (const entrada of existentes) {
      const contexto = await navegador.newContext({
        viewport: { width: ANCHO_OG, height: ALTO_OG },
        deviceScaleFactor: 1,
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      // El meme al azar de "/" debe salir siempre igual.
      await contexto.addInitScript(() => {
        Math.random = () => 0;
      });
      const page = await contexto.newPage();
      await page.goto(`${servidor.url}${entrada.ruta}`, { waitUntil: "load", timeout: 30_000 });
      await esperarPagina(page, 1_000);
      const informe = await encuadrar(page);
      await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))));
      const destino = join(dist, "og", `${entrada.og ?? entrada.slug}.png`);
      await page.screenshot({ path: destino, animations: "disabled" });
      await contexto.close();

      const tamaño = dimensionesPng(destino);
      const ok = tamaño?.ancho === ANCHO_OG && tamaño?.alto === ALTO_OG;
      const detalle = informe.tipo === "pagina"
        ? "sin meme ni gráfico, se capturó la página"
        : `${informe.tipo} ${informe.ancho}×${informe.alto} a escala ${informe.escala}${informe.elegido ? `, ${informe.elegido}` : ""}`;
      if (!ok) {
        errores.push(`${entrada.ruta}: el PNG salió ${tamaño ? `${tamaño.ancho}×${tamaño.alto}` : "ilegible"} (se esperaba 1200×630).`);
        console.error(`✗ og/${entrada.og ?? entrada.slug}.png: tamaño incorrecto (${tamaño?.ancho}×${tamaño?.alto}).`);
      } else {
        console.log(`✓ og/${entrada.og ?? entrada.slug}.png · 1200×630 · ${detalle}`);
      }
    }

    // Capturas móviles diarias de los dos memes, para archivar en MEGA S4.
    for (const entrada of existentes.filter((ruta) => ruta.ruta === "/victima" || ruta.ruta === "/ranking")) {
      const contexto = await navegador.newContext({
        viewport: { width: 400, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      await contexto.addInitScript(() => {
        Math.random = () => 0;
        const estilo = document.createElement("style");
        estilo.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}";
        document.addEventListener("DOMContentLoaded", () => document.head.append(estilo), { once: true });
      });
      const page = await contexto.newPage();
      await page.goto(`${servidor.url}${entrada.ruta}`, { waitUntil: "load", timeout: 30_000 });
      await esperarPagina(page);
      const destino = join(capturas, fecha, `${entrada.slug}.png`);
      await page.screenshot({ path: destino, fullPage: true, animations: "disabled" });
      await contexto.close();
      console.log(`✓ ${values.capturas}/${fecha}/${entrada.slug}.png (400 px de ancho)`);
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }

  if (errores.length) {
    console.error(`\n${errores.length} imagen(es) og con problemas.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await principal();
