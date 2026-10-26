// Utilidades puras para las páginas de números. No calculan rankings:
// solo formatean cifras y recortan la ventana de países que ya viene del modelo.

import { dolares, milesDeMillones } from "./formato.ts";
import type { Metrica } from "./ranking.ts";

const completos = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const fechaLarga = new Intl.DateTimeFormat("es-VE", { dateStyle: "long", timeZone: "UTC" });

/** USD enteros con separadores de miles: "$126.199.467.181" */
export function dolaresCompletos(valor: number): string {
  return completos.format(Math.round(valor));
}

/** "2026-10-25" → "25 de octubre de 2026" */
export function fechaEnPalabras(iso: string): string {
  return fechaLarga.format(new Date(`${iso}T12:00:00Z`));
}

/** Valor de una barra según la métrica: "$124,2 mil M" o "$4.410". */
export function valorDeMetrica(metrica: Metrica, valor: number): string {
  return metrica === "total" ? milesDeMillones(valor) : dolares(valor);
}

/** "PIB total" / "PIB por persona", el texto fijo de la métrica. */
export function etiquetaMetrica(metrica: Metrica): string {
  return metrica === "total" ? "PIB total" : "PIB por persona";
}

/**
 * Ventana de `cuantos` elementos con `indice` tan centrado como permita la lista.
 * Si la lista es más corta, devuelve todo. No muta la entrada.
 */
export function ventanaAlrededor<T>(lista: readonly T[], indice: number, cuantos: number): T[] {
  if (lista.length <= cuantos) return lista.slice();
  const mitad = Math.floor(cuantos / 2);
  const inicio = Math.max(0, Math.min(indice - mitad, lista.length - cuantos));
  return lista.slice(inicio, inicio + cuantos);
}
