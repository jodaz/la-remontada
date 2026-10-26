import { describe, expect, it } from "vitest";
import { rankear, rankingsMensuales, seriesMensuales } from "../src/lib/ranking.ts";
import { rangoMeses } from "../src/lib/meses.ts";
import pib from "../data/pib.json";

describe("ranking", () => {
  it("ordena de mayor a menor con puestos 1..n", () => {
    const r = rankear({ AAA: 10, BBB: 30, CCC: 20 });
    expect(r.map((p) => [p.iso, p.puesto])).toEqual([["BBB", 1], ["CCC", 2], ["AAA", 3]]);
  });

  it("no repite puestos aunque haya empates", () => {
    const r = rankear({ BBB: 5, AAA: 5, CCC: 5, DDD: 1 });
    expect(r.map((p) => p.puesto)).toEqual([1, 2, 3, 4]);
    expect(r.map((p) => p.iso)).toEqual(["AAA", "BBB", "CCC", "DDD"]);
  });

  it("deja fuera a los países sin dato", () => {
    const r = rankear({ AAA: 3, BBB: null, CCC: undefined, DDD: NaN, EEE: 1 });
    expect(r.map((p) => p.iso)).toEqual(["AAA", "EEE"]);
  });

  it("con los datos reales, ningún mes tiene puestos repetidos", () => {
    const meses = rangoMeses("2020-01", "2027-07");
    for (const metrica of ["total", "porPersona"] as const) {
      const anuales = Object.fromEntries(Object.entries(pib.paises).map(([iso, d]) => [iso, d[metrica]]));
      const rankings = rankingsMensuales(seriesMensuales(anuales, meses), meses);
      rankings.forEach((r, i) => {
        const puestos = r.map((p) => p.puesto);
        expect(new Set(puestos).size, `${metrica} ${meses[i]}`).toBe(puestos.length);
        expect(puestos).toEqual(puestos.map((_, j) => j + 1));
        expect(new Set(r.map((p) => p.iso)).size).toBe(r.length);
      });
    }
  });
});
