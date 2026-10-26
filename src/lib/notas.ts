// Plantillas de texto que se rellenan con los datos: notas de realidad, lema y número de serie.

import { veces, tresCifras } from "./formato.ts";
import type { Mes } from "./meses.ts";

export interface PaisNota {
  nombre: string;
  /** PIB por persona del mes actual, en USD. */
  porPersona: number | null;
}

/**
 * Meme de las puertas: "Pasamos a {última víctima} en PIB total. En PIB por persona,
 * {última víctima} produce {N} veces más que Venezuela."
 */
export function notaPuertas(ultima: PaisNota | null, venezuela: PaisNota, proxima: PaisNota | null): string {
  if (!ultima) {
    // Sin víctimas desde la fecha de inicio (Venezuela bajó o no pasó a nadie).
    if (proxima?.porPersona && venezuela.porPersona) {
      return `Todavía no pasamos a ${proxima.nombre} en PIB total. En PIB por persona, ${proxima.nombre} produce ${veces(proxima.porPersona / venezuela.porPersona)} veces más que ${venezuela.nombre}.`;
    }
    return `Todavía no pasamos a nadie en PIB total.`;
  }
  const base = `Pasamos a ${ultima.nombre} en PIB total.`;
  if (!ultima.porPersona || !venezuela.porPersona) return base;
  const razon = ultima.porPersona / venezuela.porPersona;
  if (razon >= 1) {
    return `${base} En PIB por persona, ${ultima.nombre} produce ${veces(razon)} veces más que ${venezuela.nombre}.`;
  }
  return `${base} En PIB por persona, ${venezuela.nombre} produce ${veces(1 / razon)} veces más que ${ultima.nombre}.`;
}

/** Meme de la escalera: "Puesto {puesto} en PIB total, pero puesto {puesto per cápita} de {total} en PIB por persona." */
export function notaEscalera(puesto: number, puestoPorPersona: number, total: number): string {
  const conector = puestoPorPersona > puesto ? "pero" : "y";
  return `Puesto ${puesto} en PIB total, ${conector} puesto ${puestoPorPersona} de ${total} en PIB por persona.`;
}

/** Lema: "Puesto {n} y subiendo." */
export function lema(puesto: number): string {
  return `Puesto ${puesto} y subiendo.`;
}

/** Número de serie: "Nº VE·072·2026-10" */
export function numeroDeSerie(iso2: string, puesto: number, mes: Mes): string {
  return `Nº ${iso2.toUpperCase()}·${tresCifras(puesto)}·${mes}`;
}

/** "Datos: FMI, octubre 2026. Estimación mensual a partir de las proyecciones anuales." */
export function lineaDatos(edicion: string): string {
  return `Datos: FMI, ${edicion}. Estimación mensual a partir de las proyecciones anuales.`;
}

/** Busca llaves sin rellenar en un texto ya armado. */
export function tieneLlaves(texto: string): boolean {
  return /[{}]/.test(texto);
}
