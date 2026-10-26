// Descarga el World Economic Outlook del FMI, escribe data/pib.json, lo valida
// y deja un resumen para el Pull Request.
//
// Uso: node scripts/actualizar-fmi.ts [--crudos DIR] [--resumen ARCHIVO] [--edicion "octubre 2026"]
//      node scripts/actualizar-fmi.ts --validar   (solo valida el data/pib.json actual)
//
// Sale con código 1 si la validación falla; en ese caso no toca data/pib.json.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { execFile } from "node:child_process";
import { construirModelo } from "../src/lib/modelo.ts";
import type { ArchivoPaises, ArchivoPib, MemeConfig } from "../src/lib/tipos.ts";

const ejecutar = promisify(execFile);
const API = "https://www.imf.org/external/datamapper/api/v1";
const ANIOS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];
const PAIS = "VEN";
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const RUTA_PIB = join(RAIZ, "data/pib.json");

const MESES_EN: Record<string, string> = {
  January: "enero", February: "febrero", March: "marzo", April: "abril", May: "mayo", June: "junio",
  July: "julio", August: "agosto", September: "septiembre", October: "octubre", November: "noviembre", December: "diciembre",
};

const { values: args } = parseArgs({
  options: {
    crudos: { type: "string" },
    resumen: { type: "string" },
    edicion: { type: "string" },
    validar: { type: "boolean", default: false },
  },
});

const leerJson = <T>(ruta: string): T => JSON.parse(readFileSync(join(RAIZ, ruta), "utf8")) as T;
const paises = leerJson<ArchivoPaises>("data/paises.json");
const memes = { puertas: leerJson<MemeConfig>("memes/puertas.json"), escalera: leerJson<MemeConfig>("memes/escalera.json") };

// Se usa curl porque el CDN del FMI responde 403 a fetch de Node.
async function descargar(ruta: string): Promise<{ texto: string; json: any }> {
  try {
    const { stdout } = await ejecutar("curl", ["-sSf", "--retry", "3", "--retry-delay", "2", "-m", "120", `${API}/${ruta}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return { texto: stdout, json: JSON.parse(stdout) };
  } catch (e) {
    throw new Error(`No se pudo descargar ${ruta}: ${(e as Error).message}`);
  }
}

/** "World Economic Outlook (October 2026)" → { edicion: "octubre 2026", id: "2026-10" } */
function leerEdicion(fuente: string): { edicion: string; id: string } {
  const m = /\((\w+) (\d{4})\)/.exec(fuente);
  if (!m || !MESES_EN[m[1]]) throw new Error(`No se reconoce la edición en "${fuente}".`);
  const numero = Object.keys(MESES_EN).indexOf(m[1]) + 1;
  return { edicion: `${MESES_EN[m[1]]} ${m[2]}`, id: `${m[2]}-${String(numero).padStart(2, "0")}` };
}

export function validar(pib: ArchivoPib): string[] {
  const errores: string[] = [];
  const isos = Object.keys(pib.paises);
  if (isos.length < 180 || isos.length > 210) errores.push(`Hay ${isos.length} países; se esperan unos 190.`);
  for (const anio of ANIOS) {
    const conDato = isos.filter((iso) => pib.paises[iso].total[anio] != null).length;
    if (conDato < 180) errores.push(`${anio}: solo ${conDato} países con PIB total.`);
  }
  const ve = pib.paises[PAIS];
  if (!ve) errores.push("Falta Venezuela.");
  else
    for (const anio of ANIOS) {
      if (ve.total[anio] == null) errores.push(`Venezuela no tiene PIB total en ${anio}.`);
      if (ve.porPersona[anio] == null) errores.push(`Venezuela no tiene PIB por persona en ${anio}.`);
    }
  for (const iso of isos) {
    if (!paises[iso]) errores.push(`${iso} no está en data/paises.json.`);
    for (const metrica of ["total", "porPersona"] as const) {
      const s = pib.paises[iso][metrica];
      for (const anio of ANIOS) {
        const v = s[anio];
        if (v == null) continue;
        if (!(v > 0)) errores.push(`${iso} ${metrica} ${anio}: valor no positivo (${v}).`);
        const antes = s[anio - 1];
        // Salto absurdo: el valor se multiplica o divide por más de 4 de un año al otro.
        if (antes != null && antes > 0 && (v / antes > 4 || v / antes < 0.25))
          errores.push(`${iso} ${metrica} ${anio - 1}→${anio}: salto absurdo (${antes} → ${v}).`);
      }
    }
  }
  return errores;
}

function resumen(anterior: ArchivoPib | null, nuevo: ArchivoPib): string {
  const fecha = new Date();
  const m = construirModelo(nuevo, paises, memes, fecha);
  const lineas = [`## Datos del FMI: ${nuevo.edicion}`, ""];
  if (anterior) {
    let previo: ReturnType<typeof construirModelo> | null = null;
    try {
      previo = construirModelo(anterior, paises, memes, fecha);
    } catch {
      previo = null;
    }
    if (previo) {
      const proxima = m.proxima?.pais.nombre ?? "ninguna";
      const cambioProxima = previo.proxima?.iso !== m.proxima?.iso ? `nueva próxima víctima: ${proxima}` : `la próxima víctima sigue siendo ${proxima}`;
      lineas.push(`Venezuela pasa del puesto ${previo.venezuela.puesto} al ${m.venezuela.puesto}; ${cambioProxima}.`);
    }
  } else {
    lineas.push(`Venezuela queda en el puesto ${m.venezuela.puesto}; próxima víctima: ${m.proxima?.pais.nombre ?? "ninguna"}.`);
  }
  lineas.push(
    "",
    `- Edición: ${nuevo.fuente} (modificado ${nuevo.modificado})`,
    `- Países: ${Object.keys(nuevo.paises).length}`,
    `- Mes actual: ${m.mesActual} · puesto per cápita ${m.venezuela.puestoPorPersona} de ${m.venezuela.totalPorPersona}`,
    `- Víctimas desde la fecha de inicio: ${m.victimas.map((v) => `${v.pais.nombre} (${v.mes})`).join(", ") || "ninguna"}`,
  );
  return lineas.join("\n") + "\n";
}

async function principal() {
  if (args.validar) {
    const errores = validar(JSON.parse(readFileSync(RUTA_PIB, "utf8")));
    if (errores.length) {
      console.error(errores.join("\n"));
      process.exit(1);
    }
    console.log("data/pib.json es válido.");
    return;
  }

  const [total, porPersona, indicadores] = await Promise.all([
    descargar("NGDPD"),
    descargar("NGDPDPC"),
    descargar("indicators"),
  ]);
  const meta = indicadores.json.indicators.NGDPD;
  const { edicion, id } = leerEdicion(meta.source);
  if (args.edicion && args.edicion !== edicion) {
    console.error(`El FMI sirve la edición "${edicion}" y se pidió "${args.edicion}".`);
    process.exit(1);
  }

  if (args.crudos) {
    const dir = join(args.crudos, `weo-${id}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "NGDPD.json"), total.texto);
    writeFileSync(join(dir, "NGDPDPC.json"), porPersona.texto);
    writeFileSync(join(dir, "indicators.json"), indicadores.texto);
  }

  const valoresTotal = total.json.values.NGDPD as Record<string, Record<string, number>>;
  const valoresPP = porPersona.json.values.NGDPDPC as Record<string, Record<string, number>>;
  const anioDe = (serie: Record<string, number> | undefined) =>
    Object.fromEntries(ANIOS.filter((a) => serie?.[a] != null).map((a) => [a, serie![a]]));

  const datosPaises: ArchivoPib["paises"] = {};
  // Solo países (la API también trae agregados regionales, que no están en paises.json).
  for (const iso of Object.keys(paises).sort()) {
    const t = anioDe(valoresTotal[iso]);
    if (Object.keys(t).length === 0) continue;
    datosPaises[iso] = { total: t, porPersona: anioDe(valoresPP[iso]) };
  }

  const nuevo: ArchivoPib = {
    edicion,
    edicionId: id,
    fuente: `FMI, ${meta.source}`,
    url: "https://www.imf.org/en/publications/weo/issues/2026/10/13/world-economic-outlook-october-2026",
    modificado: String(meta["last-modified"]).slice(0, 10),
    descargado: new Date().toISOString().slice(0, 10),
    unidades: { total: "miles de millones de USD corrientes", porPersona: "USD corrientes por persona" },
    anios: ANIOS,
    paises: datosPaises,
  };
  if (id !== "2026-10") nuevo.url = "https://www.imf.org/en/publications/weo";

  const errores = validar(nuevo);
  if (errores.length) {
    console.error(`Validación fallida:\n${errores.join("\n")}`);
    process.exit(1);
  }

  const anterior = existsSync(RUTA_PIB) ? (JSON.parse(readFileSync(RUTA_PIB, "utf8")) as ArchivoPib) : null;
  writeFileSync(RUTA_PIB, JSON.stringify(nuevo) + "\n");
  const texto = resumen(anterior, nuevo);
  if (args.resumen) writeFileSync(args.resumen, texto);
  console.log(texto);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) await principal();
