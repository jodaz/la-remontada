// Punto de entrada de las páginas: el modelo calculado una vez por compilación.

import pib from "../../data/pib.json";
import paises from "../../data/paises.json";
import puertas from "../../memes/puertas.json";
import escalera from "../../memes/escalera.json";
import { fechaDeCompilacion } from "../config.ts";
import { construirModelo } from "./modelo.ts";
import type { ArchivoPaises, ArchivoPib, MemeConfig } from "./tipos.ts";

export const memes = { puertas: puertas as MemeConfig, escalera: escalera as MemeConfig };

export const modelo = construirModelo(
  pib as unknown as ArchivoPib,
  paises as ArchivoPaises,
  memes,
  fechaDeCompilacion(),
);
