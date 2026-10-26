// Datos que las islas de los gráficos reciben ya calculados desde la compilación.
// El navegador solo dibuja y anima: aquí no se calcula ningún ranking.

export type Metrica = "total" | "porPersona";

/** [código ISO3, valor, puesto] */
export type Barra = [string, number, number];

/** [proyección, barras ordenadas por puesto] */
export type CuadroCarrera = [boolean, Barra[]];

export interface Caida {
  iso: string;
  mes: string;
}

/** iso3 → [iso2, nombre corto, nombre completo] */
export type PaisesDatos = Record<string, [string, string, string]>;

export interface DatosCarrera {
  meses: string[];
  indiceActual: number;
  /** ISO3 de Venezuela y su nombre, tomados del modelo. */
  venezuela: string;
  venezuelaNombre: string;
  metricas: Record<Metrica, { cuadros: CuadroCarrera[]; caidas: Caida[] }>;
  paises: PaisesDatos;
  visibles: { celular: number; escritorio: number };
  msPorMes: number;
  msPausa: number;
}

export interface DatosLineas {
  pais: { iso: string; iso2: string; nombre: string; corto: string };
  meses: string[];
  venezuela: number[];
  rival: number[];
  indiceActual: number;
  cruce: string | null;
  mensaje: string;
  venezuelaNombre: string;
}

export interface DatosContador {
  t0: number;
  v0: number;
  tasa: number;
  /** Fecha de compilación, AAAA-MM-DD. */
  fecha: string;
  edicion: string;
}
