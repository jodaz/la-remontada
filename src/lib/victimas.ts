// Víctimas: países que estaban por encima de Venezuela en la fecha de inicio
// y que en el mes actual están por debajo, fechados por el mes del adelanto.

import type { Mes } from "./meses.ts";
import type { PuestoRanking } from "./ranking.ts";

export interface Victima {
  iso: string;
  /** Mes en que Venezuela lo pasó (el último adelanto, si hubo idas y vueltas). */
  mes: Mes;
  /** Puesto del país en el mes actual. */
  puesto: number;
}

export interface Adelanto {
  iso: string;
  mes: Mes;
}

function puestos(ranking: PuestoRanking[]): Map<string, number> {
  return new Map(ranking.map((p) => [p.iso, p.puesto]));
}

/**
 * @param rankings ranking de cada mes, en el mismo orden que `meses`
 * @param inicio   mes desde el que se cuentan las víctimas
 * @param actual   mes "hoy"
 * @returns víctimas de la más reciente a la más antigua; en el mismo mes,
 *          primero la que hoy está más cerca de Venezuela
 */
export function calcularVictimas(
  rankings: PuestoRanking[][],
  meses: Mes[],
  inicio: Mes,
  actual: Mes,
  pais = "VEN",
): Victima[] {
  const iInicio = meses.indexOf(inicio);
  const iActual = meses.indexOf(actual);
  if (iInicio < 0 || iActual < 0 || iActual < iInicio) return [];

  const alInicio = puestos(rankings[iInicio]);
  const hoy = puestos(rankings[iActual]);
  const propioInicio = alInicio.get(pais);
  const propioHoy = hoy.get(pais);
  if (propioInicio === undefined || propioHoy === undefined) return [];

  const victimas: Victima[] = [];
  for (const [iso, puestoInicio] of alInicio) {
    if (iso === pais || puestoInicio > propioInicio) continue;
    const puestoHoy = hoy.get(iso);
    if (puestoHoy === undefined || puestoHoy < propioHoy) continue;

    // El adelanto es el primer mes de la racha final en que el país está por debajo.
    let iAdelanto = iActual;
    for (let i = iActual - 1; i > iInicio; i--) {
      const r = puestos(rankings[i]);
      const p = r.get(iso);
      const v = r.get(pais);
      if (p === undefined || v === undefined || p < v) break;
      iAdelanto = i;
    }
    victimas.push({ iso, mes: meses[iAdelanto], puesto: puestoHoy });
  }

  return victimas.sort((a, b) => b.mes.localeCompare(a.mes) || a.puesto - b.puesto);
}

/**
 * Cada vez que el país pasa a otro de un mes al siguiente (para el aviso
 * "Cae {país}" de la carrera). Solo cuenta los adelantos del país, no las caídas.
 */
export function adelantosMensuales(rankings: PuestoRanking[][], meses: Mes[], pais = "VEN"): Adelanto[] {
  const salida: Adelanto[] = [];
  for (let i = 1; i < rankings.length; i++) {
    const antes = puestos(rankings[i - 1]);
    const ahora = puestos(rankings[i]);
    const vAntes = antes.get(pais);
    const vAhora = ahora.get(pais);
    if (vAntes === undefined || vAhora === undefined) continue;
    for (const [iso, pAntes] of antes) {
      if (iso === pais || pAntes > vAntes) continue;
      const pAhora = ahora.get(iso);
      if (pAhora !== undefined && pAhora > vAhora) salida.push({ iso, mes: meses[i] });
    }
  }
  return salida;
}
