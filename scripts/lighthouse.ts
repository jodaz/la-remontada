// Lighthouse móvil sobre las cinco rutas. Falla si el rendimiento baja de 90
// o la accesibilidad de 95. Usa el Chromium de Playwright, así que no hace
// falta instalar otro navegador.
//
// Uso: node scripts/lighthouse.ts [--dist dist] [--estricto]
//      LIGHTHOUSE_ESTRICTO=1 equivale a --estricto.

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { RUTAS, rutasExistentes } from "./lib/rutas.ts";
import { servirDirectorio } from "./lib/servidor.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const MIN_RENDIMIENTO = 90;
const MIN_ACCESIBILIDAD = 95;

async function cargarLanzadorChrome() {
  const requerir = createRequire(import.meta.url);
  const rutaLighthouse = requerir.resolve("lighthouse");
  const rutaLanzador = createRequire(rutaLighthouse).resolve("chrome-launcher");
  return import(pathToFileURL(rutaLanzador).href);
}

async function principal() {
  const { values } = parseArgs({
    options: {
      dist: { type: "string", default: "dist" },
      estricto: { type: "boolean", default: process.env.LIGHTHOUSE_ESTRICTO === "1" },
    },
  });
  const dist = resolve(RAIZ, values.dist);
  if (!existsSync(dist)) throw new Error(`No existe ${dist}. Ejecuta el build antes.`);

  const existentes = rutasExistentes(dist);
  const faltantes = RUTAS.filter((entrada) => !existentes.includes(entrada));
  for (const entrada of faltantes) {
    const aviso = `Falta la ruta ${entrada.ruta}; no se audita.`;
    if (values.estricto) throw new Error(aviso);
    console.warn(`⚠ ${aviso}`);
  }
  if (existentes.length === 0) throw new Error(`No hay rutas HTML en ${dist}.`);

  const { chromium } = await import("playwright");
  const { launch } = await cargarLanzadorChrome();
  const { default: lighthouse } = await import("lighthouse");
  const servidor = await servirDirectorio(dist);

  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-extensions"],
  });

  const fallos: string[] = [];
  const filas: string[] = [];
  try {
    for (const entrada of existentes) {
      const url = `${servidor.url}${entrada.ruta}`;
      const resultado = await lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility"],
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675,
        },
        throttlingMethod: "simulate",
        maxWaitForLoad: 45_000,
      });
      if (!resultado) {
        fallos.push(`${entrada.ruta}: Lighthouse no devolvió resultados.`);
        continue;
      }
      const rendimiento = Math.round((resultado.lhr.categories.performance?.score ?? 0) * 100);
      const accesibilidad = Math.round((resultado.lhr.categories.accessibility?.score ?? 0) * 100);
      const metrica = (id: string) => resultado.lhr.audits[id]?.displayValue ?? "—";
      const lcp = metrica("largest-contentful-paint");
      filas.push(
        `  ${entrada.ruta.padEnd(18)} rendimiento ${String(rendimiento).padStart(3)} · accesibilidad ${String(accesibilidad).padStart(3)}` +
          ` · FCP ${metrica("first-contentful-paint")} · LCP ${lcp}` +
          ` · TBT ${metrica("total-blocking-time")} · CLS ${metrica("cumulative-layout-shift")}`,
      );
      if (rendimiento < MIN_RENDIMIENTO) {
        fallos.push(`${entrada.ruta}: rendimiento ${rendimiento} < ${MIN_RENDIMIENTO}.`);
      }
      if (accesibilidad < MIN_ACCESIBILIDAD) {
        fallos.push(`${entrada.ruta}: accesibilidad ${accesibilidad} < ${MIN_ACCESIBILIDAD}.`);
      }
    }
  } finally {
    chrome.kill();
    await servidor.cerrar();
  }

  console.log("\nLighthouse móvil:");
  for (const fila of filas) console.log(fila);

  if (fallos.length) {
    console.error(`\n${fallos.length} resultado(s) por debajo del mínimo:`);
    for (const fallo of fallos) console.error(`✗ ${fallo}`);
    process.exitCode = 1;
  } else {
    console.log(`\nTodo por encima de ${MIN_RENDIMIENTO} de rendimiento y ${MIN_ACCESIBILIDAD} de accesibilidad.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await principal();
