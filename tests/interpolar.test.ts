import { describe, expect, it } from "vitest";
import { interpolarSerie, valorEnFecha, valorMensual } from "../src/lib/interpolar.ts";
import { rangoMeses } from "../src/lib/meses.ts";
import pib from "../data/pib.json";

const serie = { 2019: 100, 2020: 121, 2021: 90 };

describe("interpolar", () => {
  it("da el valor exacto del FMI el 1 de julio", () => {
    expect(valorMensual(serie, "2019-07")).toBe(100);
    expect(valorMensual(serie, "2020-07")).toBe(121);
    expect(valorMensual(serie, "2021-07")).toBe(90);
  });

  it("usa crecimiento constante (geométrico, no lineal)", () => {
    // A mitad de camino entre 100 y 121 el valor geométrico es 110, no 110,5.
    expect(valorMensual(serie, "2020-01")).toBeCloseTo(110, 10);
    // La razón entre meses seguidos es constante dentro de un tramo.
    const meses = rangoMeses("2019-07", "2020-07");
    const v = interpolarSerie(serie, meses) as number[];
    const razones = v.slice(1).map((x, i) => x / v[i]);
    for (const r of razones) expect(r).toBeCloseTo(Math.pow(1.21, 1 / 12), 12);
  });

  it("no se sale del rango entre dos años, al subir ni al bajar", () => {
    for (const m of rangoMeses("2019-07", "2021-07")) {
      const v = valorMensual(serie, m)!;
      const enSubida = m <= "2020-07";
      const [lo, hi] = enSubida ? [100, 121] : [90, 121];
      expect(v).toBeGreaterThanOrEqual(lo);
      expect(v).toBeLessThanOrEqual(hi);
    }
  });

  it("devuelve null si falta uno de los años que rodean el mes", () => {
    expect(valorMensual(serie, "2019-06")).toBeNull(); // necesita 2018
    expect(valorMensual(serie, "2021-08")).toBeNull(); // necesita 2022
    expect(valorMensual({ 2019: 100, 2021: 90 }, "2020-03")).toBeNull();
  });

  it("cubre enero a junio de 2020 con el dato de 2019", () => {
    expect(valorMensual(serie, "2020-01")).not.toBeNull();
  });

  it("el valor diario coincide con el mensual el día 1", () => {
    expect(valorEnFecha(serie, new Date(Date.UTC(2020, 0, 1)))).toBeCloseTo(valorMensual(serie, "2020-01")!, 8);
  });

  it("con los datos reales, cada 1 de julio es el valor del FMI para todos los países", () => {
    for (const [iso, d] of Object.entries(pib.paises)) {
      for (const [anio, v] of Object.entries(d.total)) {
        expect(valorMensual(d.total, `${anio}-07`), `${iso} ${anio}`).toBe(v);
      }
    }
  });
});
