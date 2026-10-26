// Todo lo que el sitio muestra, calculado una vez al compilar a partir de data/ y memes/.
// Función pura: mismos archivos y misma fecha dan el mismo resultado.

import {
  INICIO_CARRERA,
  INICIO_VICTIMAS,
  MESES_PROYECCION,
  PAIS,
  VISIBLES_ESCRITORIO,
} from "../config.ts";
import { tasaEnFecha, valorEnFecha, type SerieAnual } from "./interpolar.ts";
import { crearMes, indiceMes, mesDeFecha, nombreMes, rangoMeses, sumarMeses, type Mes } from "./meses.ts";
import { resolverEtiquetas, type EtiquetaResuelta } from "./memes.ts";
import { lema, lineaDatos, notaEscalera, notaPuertas, numeroDeSerie } from "./notas.ts";
import { rankingsMensuales, seriesMensuales, type Metrica, type PuestoRanking } from "./ranking.ts";
import type { ArchivoPaises, ArchivoPib, MemeConfig, Pais } from "./tipos.ts";
import { adelantosMensuales, calcularVictimas, type Adelanto, type Victima } from "./victimas.ts";

/** Una barra de la carrera: [código ISO3, valor, puesto]. */
export type BarraCarrera = [string, number, number];

export interface CuadroCarrera {
  mes: Mes;
  proyeccion: boolean;
  /** Venezuela y los países a su alrededor (hasta VISIBLES_ESCRITORIO + 2 de margen). */
  barras: BarraCarrera[];
}

export interface Carrera {
  meses: Mes[];
  indiceActual: number;
  porMetrica: Record<Metrica, { cuadros: CuadroCarrera[]; caidas: Adelanto[] }>;
}

export interface LineasCruce {
  pais: string; // ISO3 de la próxima víctima
  meses: Mes[];
  venezuela: number[];
  rival: number[];
  indiceActual: number;
  /** Primer mes en que Venezuela pasa al rival, o null si no lo pasa en los datos. */
  cruce: Mes | null;
  /** Último mes evaluado; se usa en "resiste más allá de {mes}". */
  ultimoMes: Mes;
  mensaje: string;
}

export interface Contador {
  /** Momento de referencia (ms desde 1970) y PIB anual estimado en USD en ese momento. */
  t0: number;
  v0: number;
  /** Tasa de crecimiento continua por milisegundo. */
  tasa: number;
}

export interface VictimaConPais extends Victima {
  pais: Pais;
  nombreMes: string;
}

export interface Modelo {
  fecha: string; // AAAA-MM-DD de compilación
  mesActual: Mes;
  edicion: string;
  edicionId: string;
  fuenteUrl: string;
  lineaDatos: string;
  paises: ArchivoPaises;
  venezuela: {
    iso: string;
    pais: Pais;
    puesto: number;
    valor: number;
    puestoPorPersona: number;
    totalPorPersona: number;
    porPersona: number;
  };
  proxima: (PuestoRanking & { pais: Pais }) | null;
  victimas: VictimaConPais[];
  ranking: PuestoRanking[];
  rankingPorPersona: PuestoRanking[];
  lema: string;
  serie: string;
  notas: { puertas: string; escalera: string };
  etiquetas: { puertas: EtiquetaResuelta[]; escalera: EtiquetaResuelta[] };
  carrera: Carrera;
  cruce: LineasCruce | null;
  contador: Contador | null;
}

/** Último mes con estimación posible: el 1 de julio del último año con datos. */
function ultimoMesConDatos(pib: ArchivoPib): Mes {
  return crearMes(Math.max(...pib.anios), 7);
}

function anuales(pib: ArchivoPib, metrica: Metrica): Record<string, SerieAnual> {
  const salida: Record<string, SerieAnual> = {};
  for (const [iso, d] of Object.entries(pib.paises)) salida[iso] = d[metrica];
  return salida;
}

/** Redondeo para que la carrera pese poco: centésimas de miles de millones, dólares enteros por persona. */
const redondear = (metrica: Metrica, v: number) => (metrica === "total" ? Math.round(v * 100) / 100 : Math.round(v));

function ventana(ranking: PuestoRanking[], iso: string, mitad: number, metrica: Metrica): BarraCarrera[] {
  const i = ranking.findIndex((p) => p.iso === iso);
  if (i < 0) return [];
  const desde = Math.max(0, Math.min(i - mitad, ranking.length - (2 * mitad + 1)));
  return ranking.slice(desde, desde + 2 * mitad + 1).map((p) => [p.iso, redondear(metrica, p.valor), p.puesto]);
}

export function construirModelo(
  pib: ArchivoPib,
  paises: ArchivoPaises,
  memes: { puertas: MemeConfig; escalera: MemeConfig },
  fecha: Date,
): Modelo {
  const mesActual = mesDeFecha(fecha);
  const finDatos = ultimoMesConDatos(pib);
  const meses = rangoMeses(INICIO_CARRERA, finDatos);
  const iActual = meses.indexOf(mesActual);
  if (iActual < 0) throw new Error(`El mes actual ${mesActual} está fuera de los datos (${INICIO_CARRERA}…${finDatos}).`);

  const series = {
    total: seriesMensuales(anuales(pib, "total"), meses),
    porPersona: seriesMensuales(anuales(pib, "porPersona"), meses),
  };
  const rankings = {
    total: rankingsMensuales(series.total, meses),
    porPersona: rankingsMensuales(series.porPersona, meses),
  };

  const ranking = rankings.total[iActual];
  const rankingPorPersona = rankings.porPersona[iActual];
  const propio = ranking.find((p) => p.iso === PAIS);
  const propioPP = rankingPorPersona.find((p) => p.iso === PAIS);
  if (!propio || !propioPP) throw new Error(`${PAIS} no tiene dato para ${mesActual}.`);
  const paisVe = paises[PAIS];

  const victimas = calcularVictimas(rankings.total, meses, INICIO_VICTIMAS, mesActual, PAIS).map((v) => ({
    ...v,
    pais: paises[v.iso],
    nombreMes: nombreMes(v.mes),
  }));
  const proximaR = propio.puesto > 1 ? ranking[propio.puesto - 2] : null;
  const proxima = proximaR ? { ...proximaR, pais: paises[proximaR.iso] } : null;

  const porPersonaHoy = (iso: string) => series.porPersona[iso]?.[iActual] ?? null;
  const ultima = victimas[0] ?? null;
  const notas = {
    puertas: notaPuertas(
      ultima ? { nombre: ultima.pais.nombre, porPersona: porPersonaHoy(ultima.iso) } : null,
      { nombre: paisVe.nombre, porPersona: propioPP.valor },
      proxima ? { nombre: proxima.pais.nombre, porPersona: porPersonaHoy(proxima.iso) } : null,
    ),
    escalera: notaEscalera(propio.puesto, propioPP.puesto, rankingPorPersona.length),
  };

  const ctx = { ranking, victimas, paises, pais: PAIS };
  const etiquetas = {
    puertas: resolverEtiquetas(memes.puertas, ctx),
    escalera: resolverEtiquetas(memes.escalera, ctx),
  };

  // Carrera: de INICIO_CARRERA al mes actual + MESES_PROYECCION.
  const finCarrera = sumarMeses(mesActual, MESES_PROYECCION);
  const iFinCarrera = Math.min(meses.indexOf(finCarrera), meses.length - 1);
  const mesesCarrera = meses.slice(0, iFinCarrera + 1);
  const mitad = Math.ceil(VISIBLES_ESCRITORIO / 2); // margen de una barra a cada lado
  const porMetrica = {} as Carrera["porMetrica"];
  for (const metrica of ["total", "porPersona"] as const) {
    const rs = rankings[metrica].slice(0, iFinCarrera + 1);
    porMetrica[metrica] = {
      cuadros: rs.map((r, i) => ({
        mes: mesesCarrera[i],
        proyeccion: indiceMes(mesesCarrera[i]) > indiceMes(mesActual),
        barras: ventana(r, PAIS, mitad, metrica),
      })),
      caidas: adelantosMensuales(rs, mesesCarrera, PAIS),
    };
  }

  return {
    fecha: fecha.toISOString().slice(0, 10),
    mesActual,
    edicion: pib.edicion,
    edicionId: pib.edicionId,
    fuenteUrl: pib.url,
    lineaDatos: lineaDatos(pib.edicion),
    paises,
    venezuela: {
      iso: PAIS,
      pais: paisVe,
      puesto: propio.puesto,
      valor: propio.valor,
      puestoPorPersona: propioPP.puesto,
      totalPorPersona: rankingPorPersona.length,
      porPersona: propioPP.valor,
    },
    proxima,
    victimas,
    ranking,
    rankingPorPersona,
    lema: lema(propio.puesto),
    serie: numeroDeSerie(paisVe.iso2, propio.puesto, mesActual),
    notas,
    etiquetas,
    carrera: { meses: mesesCarrera, indiceActual: iActual, porMetrica },
    cruce: proxima ? lineasCruce(series.total, meses, mesActual, proxima.iso, paises[proxima.iso]) : null,
    contador: contador(pib.paises[PAIS]?.total, fecha),
  };
}

function lineasCruce(
  series: Record<string, (number | null)[]>,
  meses: Mes[],
  mesActual: Mes,
  rival: string,
  paisRival: Pais,
): LineasCruce {
  const desde = meses.indexOf(INICIO_VICTIMAS);
  const iActual = meses.indexOf(mesActual);
  const ve = series[PAIS];
  const ri = series[rival];

  let iCruce = -1;
  for (let i = iActual + 1; i < meses.length; i++) {
    const a = ve[i];
    const b = ri[i];
    if (a == null || b == null) break;
    if (a > b) {
      iCruce = i;
      break;
    }
  }
  const iUltimoEvaluado = (() => {
    let i = iActual;
    while (i + 1 < meses.length && ve[i + 1] != null && ri[i + 1] != null) i++;
    return i;
  })();
  const iMas6 = Math.min(iActual + MESES_PROYECCION, iUltimoEvaluado);
  const iFin = Math.max(iCruce, iMas6);
  const rango = meses.slice(desde, iFin + 1);
  const cruce = iCruce >= 0 ? meses[iCruce] : null;
  const ultimoMes = meses[iUltimoEvaluado];

  return {
    pais: rival,
    meses: rango,
    venezuela: ve.slice(desde, iFin + 1) as number[],
    rival: ri.slice(desde, iFin + 1) as number[],
    indiceActual: iActual - desde,
    cruce,
    ultimoMes,
    mensaje: cruce
      ? `Cae ${paisRival.nombre} · ${nombreMes(cruce)}`
      : `Al ritmo actual, ${paisRival.nombre} resiste más allá de ${nombreMes(ultimoMes)}`,
  };
}

function contador(serie: SerieAnual | undefined, fecha: Date): Contador | null {
  if (!serie) return null;
  const v = valorEnFecha(serie, fecha);
  const r = tasaEnFecha(serie, fecha);
  if (v === null || r === null) return null;
  return { t0: fecha.getTime(), v0: v * 1e9, tasa: r };
}
