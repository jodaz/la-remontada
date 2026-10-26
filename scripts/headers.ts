// Genera dist/_headers con la CSP y las reglas de caché, y copia los datos del
// FMI a dist/data/ para que viajen como JSON estático.
//
// Uso:
//   node scripts/headers.ts [--dist dist]
//   node scripts/headers.ts [--dist dist] --verificar
//
// La CSP hashea cada <script> en línea del build. Cualquier script nuevo que
// agregue una página queda cubierto sin tocar este archivo.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { cabecerasPara, servirDirectorio } from "./lib/servidor.ts";
import type { Regla } from "./lib/servidor.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

const SEGURIDAD: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
};

function recorrer(directorio: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) recorrer(ruta, salida);
    else if (entrada.isFile()) salida.push(ruta);
  }
  return salida;
}

/** Hashes sha256 (base64) de todos los scripts en línea del build. */
export function hashesScripts(dist: string): { hashes: string[]; inline: number; externos: number } {
  const hashes = new Set<string>();
  let inline = 0;
  let externos = 0;
  const archivos = recorrer(dist).filter((archivo) => extname(archivo).toLowerCase() === ".html");
  for (const archivo of archivos) {
    const html = readFileSync(archivo, "utf8");
    const etiquetas = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
    for (const [, atributos, contenido] of etiquetas) {
      if (/\bsrc\s*=/i.test(atributos)) {
        externos += 1;
        continue;
      }
      inline += 1;
      hashes.add(createHash("sha256").update(contenido, "utf8").digest("base64"));
    }
  }
  return { hashes: [...hashes].sort(), inline, externos };
}

function politica(hashes: string[]): string {
  const scriptSrc = ["'self'", ...hashes.map((hash) => `'sha256-${hash}'`), "https://static.cloudflareinsights.com"];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Cloudflare Web Analytics. Las fuentes son propias (font-src 'self').
    "connect-src 'self' https://cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    // data: cubre las fuentes que html-to-image incrusta en el SVG de la descarga.
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

/** Reglas en orden: Cloudflare suma todas las que coinciden. */
export function reglas(dist: string): Regla[] {
  const { hashes } = hashesScripts(dist);
  const csp = politica(hashes);
  // Cloudflare limita cada línea del archivo a 2000 caracteres.
  if (`Content-Security-Policy: ${csp}`.length > 2000) {
    throw new Error("La CSP pasa de 2000 caracteres; hay demasiados scripts en línea.");
  }
  return [
    {
      patron: "/*",
      cabeceras: {
        ...SEGURIDAD,
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": csp,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
    {
      // `!` quita la caché corta heredada de `/*` antes de fijar la larga.
      patron: "/_astro/*",
      cabeceras: {
        "!Cache-Control": "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
    {
      // Los nombres llevan la versión (anton-v1-…), así que pueden cachearse para siempre.
      patron: "/fonts/*",
      cabeceras: {
        "!Cache-Control": "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
    {
      // Banderas rasterizadas con la versión en el nombre ({iso2}-v1.webp).
      patron: "/banderas/*",
      cabeceras: {
        "!Cache-Control": "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
    {
      patron: "/memes/*",
      cabeceras: {
        "!Cache-Control": "",
        "Cache-Control": "public, max-age=86400",
      },
    },
    {
      patron: "/og/*",
      cabeceras: {
        "!Cache-Control": "",
        "Cache-Control": "public, max-age=86400",
      },
    },
    {
      patron: "/data/*",
      cabeceras: {
        "!Cache-Control": "",
        "Cache-Control": "public, max-age=300",
      },
    },
  ];
}

function textoHeaders(reglasGeneradas: Regla[]): string {
  const bloques = reglasGeneradas.map((regla) => {
    const lineas = [`${regla.patron}`];
    for (const [nombre, valor] of Object.entries(regla.cabeceras)) {
      if (nombre.startsWith("!")) lineas.push(`  ! ${nombre.slice(1)}`);
      else lineas.push(`  ${nombre}: ${valor}`);
    }
    return lineas.join("\n");
  });
  return `${bloques.join("\n\n")}\n`;
}

function copiarDatos(dist: string) {
  const origen = join(RAIZ, "data");
  if (!existsSync(origen)) return 0;
  const destino = join(dist, "data");
  mkdirSync(destino, { recursive: true });
  let copiados = 0;
  for (const nombre of readdirSync(origen)) {
    if (extname(nombre).toLowerCase() !== ".json") continue;
    copyFileSync(join(origen, nombre), join(destino, nombre));
    copiados += 1;
  }
  return copiados;
}

function paginas(dist: string): { ruta: string; archivo: string }[] {
  return recorrer(dist)
    .filter((archivo) => extname(archivo).toLowerCase() === ".html")
    .map((archivo) => {
      const relativa = relative(dist, archivo).split(/[\\/]/).join("/");
      if (relativa === "404.html") return null;
      let ruta = `/${relativa}`.replace(/index\.html$/, "").replace(/\.html$/, "");
      ruta = ruta.replace(/\/+$/, "") || "/";
      return { ruta, archivo };
    })
    .filter((pagina): pagina is { ruta: string; archivo: string } => pagina !== null)
    .sort((a, b) => (a.ruta === "/" ? -1 : b.ruta === "/" ? 1 : a.ruta.localeCompare(b.ruta)));
}

interface Violacion {
  directiva: string;
  recurso: string;
  muestra?: string;
}

async function verificar(dist: string, reglasGeneradas: Regla[]): Promise<number> {
  const { chromium } = await import("playwright");
  const lista = paginas(dist);
  if (lista.length === 0) throw new Error(`No hay páginas HTML en ${dist}.`);

  const servidor = await servirDirectorio(dist, (ruta) => cabecerasPara(reglasGeneradas, ruta));
  const navegador = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  let fallos = 0;
  try {
    for (const pagina of lista) {
      const contexto = await navegador.newContext({ viewport: { width: 400, height: 900 } });
      const page = await contexto.newPage();
      const erroresConsola: string[] = [];
      page.on("console", (mensaje) => {
        if (mensaje.type() === "error" && /content security policy|refused to/i.test(mensaje.text())) {
          erroresConsola.push(mensaje.text());
        }
      });
      page.on("pageerror", (error) => erroresConsola.push(error.message));

      await page.addInitScript(() => {
        const ventana = window as unknown as { __violacionesCSP: Violacion[] };
        ventana.__violacionesCSP = [];
        document.addEventListener("securitypolicyviolation", (evento) => {
          ventana.__violacionesCSP.push({
            directiva: evento.violatedDirective,
            recurso: evento.blockedURI,
            muestra: evento.sample || undefined,
          });
        });
      });

      const respuesta = await page.goto(`${servidor.url}${pagina.ruta}`, {
        waitUntil: "load",
        timeout: 30_000,
      });
      const cabecera = respuesta?.headers()["content-security-policy"] ?? "";
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(1_000);

      const violaciones = (await page.evaluate(() => {
        const ventana = window as unknown as { __violacionesCSP?: Violacion[] };
        return ventana.__violacionesCSP ?? [];
      })) as Violacion[];

      await contexto.close();

      if (!cabecera) {
        console.error(`✗ ${pagina.ruta}: la respuesta no trae Content-Security-Policy.`);
        fallos += 1;
        continue;
      }
      if (violaciones.length || erroresConsola.length) {
        fallos += 1;
        console.error(`✗ ${pagina.ruta}: ${violaciones.length + erroresConsola.length} violación(es) de CSP.`);
        for (const violacion of violaciones) {
          console.error(`    ${violacion.directiva} bloqueó ${violacion.recurso}${violacion.muestra ? ` (${violacion.muestra})` : ""}`);
        }
        for (const error of erroresConsola) console.error(`    ${error.split("\n")[0]}`);
      } else {
        console.log(`✓ ${pagina.ruta}: sin violaciones de CSP.`);
      }
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
  return fallos;
}

async function principal() {
  const { values } = parseArgs({
    options: {
      dist: { type: "string", default: "dist" },
      verificar: { type: "boolean", default: false },
    },
  });
  const dist = join(RAIZ, values.dist);
  if (!existsSync(dist)) throw new Error(`No existe ${dist}. Ejecuta el build antes.`);

  const copiados = copiarDatos(dist);
  const reglasGeneradas = reglas(dist);
  writeFileSync(join(dist, "_headers"), textoHeaders(reglasGeneradas));
  const { hashes, inline, externos } = hashesScripts(dist);
  console.log(
    `_headers escrito: ${hashes.length} hash(es) de scripts en línea (${inline} etiquetas, ${externos} externas), ${copiados} archivo(s) de datos copiados a ${values.dist}/data/.`,
  );

  if (values.verificar) {
    const fallos = await verificar(dist, reglasGeneradas);
    if (fallos > 0) {
      console.error(`\n${fallos} página(s) con problemas de CSP.`);
      process.exitCode = 1;
    } else {
      console.log("\nCSP verificada en todas las páginas.");
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await principal();
