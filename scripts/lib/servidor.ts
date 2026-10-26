// Servidor estático mínimo para las capturas y las comprobaciones locales.
// No se publica: solo lo usan los scripts de Playwright.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
};

/** Regla de `_headers`: patrón tipo Cloudflare (`*` comodín) y cabeceras. */
export interface Regla {
  patron: string;
  cabeceras: Record<string, string>;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

/** Como los assets de Cloudflare: las reglas que coinciden se suman; `!Cabecera` la quita. */
export function cabecerasPara(reglas: Regla[], ruta: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const regla of reglas) {
    const expresion = new RegExp(`^${regla.patron.split("*").map(escaparRegex).join(".*")}$`);
    if (!expresion.test(ruta)) continue;
    for (const [nombre, valor] of Object.entries(regla.cabeceras)) {
      if (nombre.startsWith("!")) {
        const objetivo = nombre.slice(1).toLowerCase();
        for (const existente of Object.keys(resultado)) {
          if (existente.toLowerCase() === objetivo) delete resultado[existente];
        }
        continue;
      }
      const existente = Object.keys(resultado).find((clave) => clave.toLowerCase() === nombre.toLowerCase());
      if (existente) resultado[existente] = `${resultado[existente]}, ${valor}`;
      else resultado[nombre] = valor;
    }
  }
  return resultado;
}

function resolverArchivo(raiz: string, ruta: string): string | null {
  const relativa = decodeURIComponent(ruta).replace(/^[/\\]+/, "");
  const candidato = resolve(raiz, relativa);
  if (candidato !== raiz && !candidato.startsWith(raiz + sep)) return null;
  if (existsSync(candidato) && statSync(candidato).isFile()) return candidato;
  const indice = resolve(candidato, "index.html");
  if (indice.startsWith(raiz + sep) && existsSync(indice)) return indice;
  const plano = `${candidato}.html`;
  if (plano.startsWith(raiz + sep) && existsSync(plano)) return plano;
  return null;
}

export interface Servidor {
  url: string;
  cerrar: () => Promise<void>;
}

/**
 * Sirve `raiz` en un puerto libre de 127.0.0.1.
 * `cabeceras` recibe la ruta de la URL (sin dominio) y devuelve cabeceras extra.
 */
export async function servirDirectorio(
  raiz: string,
  cabeceras?: (ruta: string) => Record<string, string>,
): Promise<Servidor> {
  const base = resolve(raiz);
  if (!existsSync(base)) throw new Error(`No existe el directorio ${base}. Ejecuta el build primero.`);

  const responder = (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const ruta = url.pathname;
      const archivo = resolverArchivo(base, ruta);
      if (!archivo) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404");
        return;
      }
      const extra = cabeceras?.(ruta) ?? {};
      const tipo = TIPOS[extname(archivo).toLowerCase()] ?? "application/octet-stream";
      // Cloudflare comprime el HTML, el CSS y el JS; el servidor local lo imita
      // para que Lighthouse y las capturas se parezcan al sitio publicado.
      const comprimible = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/.test(tipo);
      const comprimir = comprimible && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
      const cabecerasRespuesta: Record<string, string> = { "Content-Type": tipo, ...extra };
      if (comprimir) {
        cabecerasRespuesta["Content-Encoding"] = "gzip";
        cabecerasRespuesta["Vary"] = "Accept-Encoding";
      }
      res.writeHead(200, cabecerasRespuesta);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      if (comprimir) createReadStream(archivo).pipe(createGzip()).pipe(res);
      else createReadStream(archivo).pipe(res);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`500: ${(error as Error).message}`);
    }
  };

  const servidor = createServer(responder);
  await new Promise<void>((listo, fallo) => {
    servidor.once("error", fallo);
    servidor.listen(0, "127.0.0.1", () => listo());
  });
  const direccion = servidor.address();
  if (!direccion || typeof direccion === "string") throw new Error("No se pudo abrir el servidor local.");

  return {
    url: `http://127.0.0.1:${direccion.port}`,
    cerrar: () =>
      new Promise<void>((listo, fallo) => servidor.close((error) => (error ? fallo(error) : listo()))),
  };
}
