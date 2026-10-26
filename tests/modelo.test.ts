import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pibReal from "../data/pib.json";
import paises from "../data/paises.json";
import puertas from "../memes/puertas.json";
import escalera from "../memes/escalera.json";
import { construirModelo } from "../src/lib/modelo.ts";
import { tieneLlaves } from "../src/lib/notas.ts";
import type { ArchivoPib, MemeConfig } from "../src/lib/tipos.ts";

const memes = { puertas: puertas as MemeConfig, escalera: escalera as MemeConfig };
const pib = pibReal as unknown as ArchivoPib;
const hoy = new Date("2026-10-25T12:00:00Z");
const m = construirModelo(pib, paises, memes, hoy);

describe("modelo", () => {
  it("cada ISO de paises.json tiene bandera en flag-icons", () => {
    const banderas = new Set(readdirSync("node_modules/flag-icons/flags/4x3").map((f) => f.replace(".svg", "")));
    for (const [iso, p] of Object.entries(paises)) expect(banderas.has(p.iso2), iso).toBe(true);
  });

  it("pib.json tiene unos 190 países, 2019–2027 y a Venezuela todos los años", () => {
    const n = Object.keys(pib.paises).length;
    expect(n).toBeGreaterThan(180);
    expect(n).toBeLessThan(210);
    expect(pib.anios).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]);
    for (const a of pib.anios) {
      expect(pib.paises.VEN.total[a]).toBeGreaterThan(0);
      expect(pib.paises.VEN.porPersona[a]).toBeGreaterThan(0);
    }
  });

  it("puerta-6 y escalon-10 tienen el mismo país, el justo encima de Venezuela", () => {
    const p6 = m.etiquetas.puertas.find((e) => e.id === "puerta-6")!;
    const e10 = m.etiquetas.escalera.find((e) => e.id === "escalon-10")!;
    expect(p6.iso).toBe(e10.iso);
    expect(p6.puesto).toBe(m.venezuela.puesto - 1);
    expect(p6.iso).toBe(m.proxima?.iso);
  });

  it("las puertas 5 y escalon-12 son la última víctima", () => {
    const p5 = m.etiquetas.puertas.find((e) => e.id === "puerta-5")!;
    const e12 = m.etiquetas.escalera.find((e) => e.id === "escalon-12")!;
    expect(p5.iso).toBe(e12.iso);
    if (m.victimas.length) expect(p5.iso).toBe(m.victimas[0].iso);
  });

  it("todas las etiquetas tienen país y ninguno se repite dentro de un meme", () => {
    for (const lista of [m.etiquetas.puertas, m.etiquetas.escalera]) {
      const isos = lista.map((e) => e.iso);
      expect(isos.every(Boolean)).toBe(true);
      expect(new Set(isos).size).toBe(isos.length);
    }
  });

  it("las notas no tienen llaves sin rellenar", () => {
    for (const t of [m.notas.puertas, m.notas.escalera, m.lema, m.serie, m.lineaDatos, m.cruce?.mensaje ?? ""])
      expect(tieneLlaves(t), t).toBe(false);
  });

  it("la carrera va de enero 2020 al mes actual + 6", () => {
    expect(m.carrera.meses[0]).toBe("2020-01");
    expect(m.carrera.meses.at(-1)).toBe("2027-04");
    expect(m.carrera.meses.length).toBe(88);
    const cuadros = m.carrera.porMetrica.total.cuadros;
    expect(cuadros.filter((c) => c.proyeccion).length).toBe(6);
  });

  it("cambiar pib.json cambia etiquetas, notas y gráficos", () => {
    // Venezuela multiplica su PIB por 3: cambia de puesto, de próxima víctima y de notas.
    const otro: ArchivoPib = structuredClone(pib);
    for (const a of otro.anios) {
      otro.paises.VEN.total[a] = (otro.paises.VEN.total[a] as number) * 3;
      otro.paises.VEN.porPersona[a] = (otro.paises.VEN.porPersona[a] as number) * 3;
    }
    const m2 = construirModelo(otro, paises, memes, hoy);
    expect(m2.venezuela.puesto).toBeLessThan(m.venezuela.puesto);
    expect(m2.proxima?.iso).not.toBe(m.proxima?.iso);
    expect(m2.etiquetas.puertas).not.toEqual(m.etiquetas.puertas);
    expect(m2.etiquetas.escalera).not.toEqual(m.etiquetas.escalera);
    expect(m2.notas).not.toEqual(m.notas);
    expect(m2.lema).not.toBe(m.lema);
    expect(m2.serie).not.toBe(m.serie);
    expect(m2.carrera).not.toEqual(m.carrera);
    expect(m2.cruce).not.toEqual(m.cruce);
  });

  it("si Venezuela cae en el ranking, las puertas se rellenan con los de abajo", () => {
    const otro: ArchivoPib = structuredClone(pib);
    otro.paises.VEN.total = { ...otro.paises.VEN.total, 2026: 50, 2027: 40 };
    const m3 = construirModelo(otro, paises, memes, hoy);
    expect(m3.victimas).toEqual([]);
    const puertasIso = m3.etiquetas.puertas.filter((e) => e.rol === "victima").map((e) => e.iso);
    expect(puertasIso.every(Boolean)).toBe(true);
    expect(tieneLlaves(m3.notas.puertas)).toBe(false);
  });
});
