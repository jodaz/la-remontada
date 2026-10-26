// Forma de los archivos de data/ y memes/.

import type { SerieAnual } from "./interpolar.ts";

export interface ArchivoPib {
  edicion: string; // "octubre 2026"
  edicionId: string; // "2026-10"
  fuente: string;
  url: string;
  modificado: string;
  descargado: string;
  unidades: { total: string; porPersona: string };
  anios: number[];
  paises: Record<string, { total: SerieAnual; porPersona: SerieAnual }>;
}

export interface Pais {
  iso2: string;
  nombre: string;
  corto: string;
}

export type ArchivoPaises = Record<string, Pais>;

export type Muestra = "bandera" | "nombre" | "puesto" | "rotulo";

export interface EtiquetaConfig {
  id: string;
  rol: "victima" | "proxima" | "venezuela" | "primero" | "arriba" | "abajo";
  indice?: number;
  descripcion?: string;
  x: number;
  y: number;
  ancla: "abajo" | "arriba";
  ancho: number;
  fuente: number;
  muestra: Muestra[];
  nombreFijo?: string;
  rotulo?: string[];
}

export interface MemeConfig {
  meme: "puertas" | "escalera";
  ruta: string;
  imagen: string;
  ancho: number;
  alto: number;
  etiquetas: EtiquetaConfig[];
  marca: { esquina: "abajo-derecha" | "abajo-izquierda" | "arriba-derecha" | "arriba-izquierda" };
}
