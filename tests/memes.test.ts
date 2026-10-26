import { describe, expect, it } from "vitest";
import pibReal from "../data/pib.json";
import paises from "../data/paises.json";
import puertas from "../memes/puertas.json";
import escalera from "../memes/escalera.json";
import { construirModelo } from "../src/lib/modelo.ts";
import type { ArchivoPib, MemeConfig } from "../src/lib/tipos.ts";

const memes = { puertas: puertas as MemeConfig, escalera: escalera as MemeConfig };
const pib = pibReal as unknown as ArchivoPib;
const m = construirModelo(pib, paises, memes, new Date("2026-10-25T12:00:00Z"));

describe("etiquetas con PIB", () => {
  it("toda etiqueta con país lleva su PIB total del mes y los dos textos", () => {
    for (const et of [...m.etiquetas.puertas, ...m.etiquetas.escalera]) {
      if (et.iso === null) {
        expect(et.pib, et.id).toBeNull();
        expect(et.pibEstandar, et.id).toBeNull();
        expect(et.pibCompacto, et.id).toBeNull();
        continue;
      }
      expect(et.pib, et.id).toBeGreaterThan(0);
      expect(et.pibEstandar, et.id).toMatch(/^\$/);
      expect(et.pibCompacto, et.id).toMatch(/^\$/);
    }
  });

  it("Venezuela lleva su propio PIB en la etiqueta que la celebra", () => {
    const ve = m.etiquetas.escalera.find((e) => e.iso === m.venezuela.iso);
    expect(ve?.pib).toBe(m.venezuela.valor);
    expect(ve?.pibCompacto).not.toBeNull();
  });

  it("toda etiqueta con país pide su PIB, y solo las que tienen país lo piden", () => {
    for (const meme of ["puertas", "escalera"] as const) {
      for (const et of m.etiquetas[meme]) {
        expect(et.meme, et.id).toBe(meme);
        expect(et.muestra.includes("pib"), et.id).toBe(et.iso !== null);
      }
    }
  });
});
