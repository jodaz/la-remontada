// Estimación mensual a partir de valores anuales del FMI.
// Cada valor anual se ubica el 1 de julio de su año. Entre dos años seguidos,
// cada mes se calcula con crecimiento constante (interpolación geométrica).

import { indiceMes, type Mes } from "./meses.ts";

/** Valores anuales de un país: { 2019: 22.37, 2020: 20.01, ... } */
export type SerieAnual = Record<string, number | null | undefined>;

function valorAnual(serie: SerieAnual, anio: number): number | null {
  const v = serie[String(anio)];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Valor estimado para el día 1 del mes dado. Devuelve null si falta alguno
 * de los dos años que rodean el mes: ese país queda fuera del ranking ese mes.
 */
export function valorMensual(serie: SerieAnual, mes: Mes): number | null {
  // Meses desde el 1 de julio del año 0; el 1 de julio de cada año cae en un múltiplo de 12.
  const desdeJulio = indiceMes(mes) - 6;
  const anio = Math.floor(desdeJulio / 12);
  const fraccion = (desdeJulio - anio * 12) / 12;
  const a = valorAnual(serie, anio);
  if (a === null) return null;
  if (fraccion === 0) return a;
  const b = valorAnual(serie, anio + 1);
  if (b === null) return null;
  return a * Math.pow(b / a, fraccion);
}

/** Valor estimado en un instante cualquiera (para el contador en vivo). */
export function valorEnFecha(serie: SerieAnual, fecha: Date): number | null {
  const anioDecimal = fechaComoAnio(fecha) - 0.5;
  const anio = Math.floor(anioDecimal);
  const a = valorAnual(serie, anio);
  const b = valorAnual(serie, anio + 1);
  if (a === null || b === null) return null;
  return a * Math.pow(b / a, anioDecimal - anio);
}

/** Tasa de crecimiento continua por milisegundo vigente en la fecha dada. */
export function tasaEnFecha(serie: SerieAnual, fecha: Date): number | null {
  const anio = Math.floor(fechaComoAnio(fecha) - 0.5);
  const a = valorAnual(serie, anio);
  const b = valorAnual(serie, anio + 1);
  if (a === null || b === null) return null;
  const msAnio = Date.UTC(anio + 2, 0, 1) - Date.UTC(anio + 1, 0, 1);
  return Math.log(b / a) / msAnio;
}

/** Año con decimales donde x.5 es el 1 de julio (aprox.: se mide por meses y días). */
function fechaComoAnio(fecha: Date): number {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const inicioMes = Date.UTC(anio, mes, 1);
  const finMes = Date.UTC(anio, mes + 1, 1);
  const dentroDelMes = (fecha.getTime() - inicioMes) / (finMes - inicioMes);
  return anio + (mes + dentroDelMes) / 12;
}

/** Serie mensual de un país para una lista de meses. */
export function interpolarSerie(serie: SerieAnual, meses: Mes[]): (number | null)[] {
  return meses.map((m) => valorMensual(serie, m));
}
