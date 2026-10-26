// Rutas públicas del sitio y su archivo generado, compartido por los scripts.

import { existsSync } from "node:fs";
import { join } from "node:path";

export interface RutaSitio {
  ruta: string;
  slug: string;
  /** Nombre del PNG de og:image, sin extensión. */
  og?: string;
}

export const RUTAS: RutaSitio[] = [
  { ruta: "/", slug: "inicio", og: "inicio" },
  { ruta: "/victima", slug: "victima", og: "victima" },
  { ruta: "/ranking", slug: "ranking", og: "ranking" },
  { ruta: "/victima/numeros", slug: "victima-numeros", og: "victima-numeros" },
  { ruta: "/ranking/numeros", slug: "ranking-numeros", og: "ranking-numeros" },
];

/** Archivo HTML que sirve el build para una ruta, o null si no existe. */
export function archivoDeRuta(dist: string, ruta: string): string | null {
  const relativa = ruta.replace(/^\/+|\/+$/g, "");
  const candidatos = relativa
    ? [join(dist, relativa, "index.html"), join(dist, `${relativa}.html`)]
    : [join(dist, "index.html")];
  for (const candidato of candidatos) if (existsSync(candidato)) return candidato;
  return null;
}

export function existeRuta(dist: string, ruta: string): boolean {
  return archivoDeRuta(dist, ruta) !== null;
}

export function rutasExistentes(dist: string): RutaSitio[] {
  return RUTAS.filter((entrada) => existeRuta(dist, entrada.ruta));
}
