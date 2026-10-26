import { describe, expect, it } from "vitest";
import { rankingsMensuales, seriesMensuales } from "../src/lib/ranking.ts";
import { rangoMeses } from "../src/lib/meses.ts";
import { adelantosMensuales, calcularVictimas } from "../src/lib/victimas.ts";

// Caso fijo: cinco países, valores anuales en el 1 de julio.
//  - AAA siempre por encima de VEN: no es víctima.
//  - BBB por encima en el inicio y por debajo después: víctima.
//  - CCC por encima en el inicio, Venezuela lo pasa más tarde que a BBB: víctima más reciente.
//  - DDD siempre por debajo: no es víctima.
//  - EEE por encima en el inicio, Venezuela lo pasa y luego EEE vuelve a subir: no es víctima.
const anuales = {
  VEN: { 2025: 100, 2026: 200, 2027: 400 },
  AAA: { 2025: 1000, 2026: 1000, 2027: 1000 },
  BBB: { 2025: 120, 2026: 150, 2027: 160 },
  CCC: { 2025: 150, 2026: 250, 2027: 300 },
  DDD: { 2025: 50, 2026: 60, 2027: 70 },
  EEE: { 2025: 110, 2026: 150, 2027: 800 },
};
const meses = rangoMeses("2025-07", "2027-07");
const rankings = rankingsMensuales(seriesMensuales(anuales, meses), meses);

describe("victimas", () => {
  it("da las víctimas esperadas, de la más reciente a la más antigua", () => {
    const v = calcularVictimas(rankings, meses, "2025-07", "2027-01");
    expect(v.map((x) => x.iso)).toEqual(["CCC", "BBB"]);
  });

  it("fecha cada víctima por el mes del adelanto", () => {
    const v = calcularVictimas(rankings, meses, "2025-07", "2027-01");
    // BBB: 120·(1.25)^(t) vs 100·2^(t); se cruzan en t = ln(1,2)/ln(1,6) ≈ 0,388 años → 5 meses.
    expect(v.find((x) => x.iso === "BBB")!.mes).toBe("2025-12");
    // CCC: 150·(5/3)^t vs 100·2^t → t = ln(1,5)/ln(1,2) ≈ 2,22 años, pero el tramo 2026–27 cambia:
    // en 2026-07 VEN=200 < CCC=250; después 200·2^t vs 250·1,2^t → t ≈ 0,437 → 6 meses.
    expect(v.find((x) => x.iso === "CCC")!.mes).toBe("2027-01");
  });

  it("no cuenta a quien vuelve a quedar por encima", () => {
    const v = calcularVictimas(rankings, meses, "2025-07", "2027-07");
    expect(v.map((x) => x.iso)).not.toContain("EEE");
    expect(v.map((x) => x.iso)).not.toContain("AAA");
    expect(v.map((x) => x.iso)).not.toContain("DDD");
  });

  it("sin cambios desde el inicio no hay víctimas", () => {
    expect(calcularVictimas(rankings, meses, "2025-07", "2025-07")).toEqual([]);
  });

  it("los adelantos mes a mes solo cuentan cuando Venezuela pasa a otro", () => {
    const a = adelantosMensuales(rankings, meses);
    expect(a.some((x) => x.iso === "BBB" && x.mes === "2025-12")).toBe(true);
    expect(a.every((x) => x.iso !== "AAA" && x.iso !== "DDD")).toBe(true);
  });
});
