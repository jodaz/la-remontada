// Ranking de países por PIB total o por persona en un mes dado.

import { interpolarSerie, type SerieAnual } from "./interpolar.ts";
import type { Mes } from "./meses.ts";

export type Metrica = "total" | "porPersona";

export interface PuestoRanking {
  iso: string;
  valor: number;
  puesto: number;
}

/** Valores de un mes por país; null o ausente = sin dato, queda fuera. */
export type ValoresMes = Record<string, number | null | undefined>;

/**
 * Ordena de mayor a menor. Los empates se resuelven por código ISO para que
 * ningún puesto se repita y el resultado sea siempre el mismo.
 */
export function rankear(valores: ValoresMes): PuestoRanking[] {
  return Object.entries(valores)
    .filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1]))
    .sort(([isoA, a], [isoB, b]) => b - a || isoA.localeCompare(isoB))
    .map(([iso, valor], i) => ({ iso, valor, puesto: i + 1 }));
}

export type SeriesMensuales = Record<string, (number | null)[]>;

/** Series mensuales de todos los países para una métrica. */
export function seriesMensuales(
  anuales: Record<string, SerieAnual>,
  meses: Mes[],
): SeriesMensuales {
  const salida: SeriesMensuales = {};
  for (const [iso, serie] of Object.entries(anuales)) salida[iso] = interpolarSerie(serie, meses);
  return salida;
}

/** Ranking de cada mes, en el mismo orden que `meses`. */
export function rankingsMensuales(series: SeriesMensuales, meses: Mes[]): PuestoRanking[][] {
  return meses.map((_, i) => {
    const valores: ValoresMes = {};
    for (const [iso, serie] of Object.entries(series)) valores[iso] = serie[i];
    return rankear(valores);
  });
}

export function puestoDe(ranking: PuestoRanking[], iso: string): number | null {
  return ranking.find((p) => p.iso === iso)?.puesto ?? null;
}
