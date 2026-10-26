// Qué país va en cada etiqueta de cada meme.

import { pibMeme } from "./formato.ts";
import type { PuestoRanking } from "./ranking.ts";
import type { Victima } from "./victimas.ts";
import type { EtiquetaConfig, MemeConfig, Pais } from "./tipos.ts";

export interface EtiquetaResuelta extends EtiquetaConfig {
  iso: string | null;
  pais: Pais | null;
  puesto: number | null;
  /** PIB total del mes actual, en miles de millones de USD. */
  pib: number | null;
  /** El mismo PIB ya formateado para puertas ("$124,2 mil M") y escalera ("$124 MM"). */
  pibEstandar: string | null;
  pibCompacto: string | null;
  /** Texto del nombre, ya decidido (nombreFijo o nombre corto). */
  nombre: string | null;
}

export interface ContextoMeme {
  ranking: PuestoRanking[]; // ranking del mes actual (PIB total)
  victimas: Victima[];
  paises: Record<string, Pais>;
  pais: string; // "VEN"
}

function enPuesto(ranking: PuestoRanking[], puesto: number): PuestoRanking | null {
  return ranking[puesto - 1]?.puesto === puesto ? ranking[puesto - 1] : (ranking.find((p) => p.puesto === puesto) ?? null);
}

/**
 * Víctimas de la más reciente a la más antigua y, si no alcanzan,
 * los países que siguen por debajo de Venezuela.
 */
export function victimasConRelleno(ctx: ContextoMeme, cuantas: number): PuestoRanking[] {
  const propio = ctx.ranking.find((p) => p.iso === ctx.pais);
  const lista: PuestoRanking[] = [];
  for (const v of ctx.victimas) {
    const r = ctx.ranking.find((p) => p.iso === v.iso);
    if (r) lista.push(r);
  }
  if (propio) {
    for (const r of ctx.ranking) {
      if (lista.length >= cuantas) break;
      if (r.puesto > propio.puesto && !lista.some((l) => l.iso === r.iso)) lista.push(r);
    }
  }
  return lista.slice(0, cuantas);
}

function elegir(et: EtiquetaConfig, ctx: ContextoMeme, puertas: PuestoRanking[]): PuestoRanking | null {
  const propio = ctx.ranking.find((p) => p.iso === ctx.pais) ?? null;
  const n = et.indice ?? 1;
  switch (et.rol) {
    case "venezuela":
      return propio;
    case "primero":
      return ctx.ranking[0] ?? null;
    case "proxima":
      return propio && propio.puesto > 1 ? enPuesto(ctx.ranking, propio.puesto - 1) : null;
    case "arriba":
      // Nunca repite al #1, que ya tiene su propio personaje.
      return propio && propio.puesto - n > 1 ? enPuesto(ctx.ranking, propio.puesto - n) : null;
    case "victima":
    case "abajo":
      return puertas[n - 1] ?? null;
  }
}

export function resolverEtiquetas(config: MemeConfig, ctx: ContextoMeme): EtiquetaResuelta[] {
  const relleno = victimasConRelleno(ctx, 5);
  return config.etiquetas.map((et) => {
    const r = elegir(et, ctx, relleno);
    const pais = r ? (ctx.paises[r.iso] ?? null) : null;
    const pib = r?.valor ?? null;
    return {
      ...et,
      iso: r?.iso ?? null,
      pais,
      puesto: r?.puesto ?? null,
      pib,
      pibEstandar: pib === null ? null : pibMeme(pib, "estandar"),
      pibCompacto: pib === null ? null : pibMeme(pib, "compacto"),
      nombre: et.nombreFijo ?? pais?.corto ?? null,
    };
  });
}
