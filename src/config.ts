// Configuración del sitio en un solo lugar.

/**
 * PREGUNTA ABIERTA (PRD, "Preguntas abiertas"): ¿desde qué fecha se cuentan
 * las víctimas del meme de las puertas? Se usa la propuesta del PRD, enero de 2026,
 * hasta que se decida.
 */
export const INICIO_VICTIMAS = "2026-01";

/** Primer mes de la carrera del ranking. */
export const INICIO_CARRERA = "2020-01";

/** Meses de proyección después del mes actual (carrera y líneas que se cruzan). */
export const MESES_PROYECCION = 6;

/** Duración de cada mes en la carrera: ~20 s por vuelta. */
export const MS_POR_MES = 230;

/** Pausa al caer un país en la carrera. */
export const MS_PAUSA_CAIDA = 500;

/** Países visibles en la carrera. */
export const VISIBLES_CELULAR = 11;
export const VISIBLES_ESCRITORIO = 15;

export const PAIS = "VEN";
export const SITIO = "laremontada.vanguarddevs.com";
export const URL_SITIO = `https://${SITIO}`;

/**
 * "Hoy" es la fecha de compilación (el sitio se recompila cada mes).
 * LA_REMONTADA_HOY=AAAA-MM-DD la fija para pruebas.
 */
export function fechaDeCompilacion(): Date {
  const fijada = typeof process !== "undefined" ? process.env.LA_REMONTADA_HOY : undefined;
  return fijada ? new Date(`${fijada}T12:00:00Z`) : new Date();
}
