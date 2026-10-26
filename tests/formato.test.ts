import { describe, expect, it } from "vitest";
import pibReal from "../data/pib.json";
import { pibMeme } from "../src/lib/formato.ts";
import type { ArchivoPib } from "../src/lib/tipos.ts";

const pib = pibReal as unknown as ArchivoPib;

describe("pibMeme", () => {
  it("estandar usa las palabras del resto del sitio", () => {
    expect(pibMeme(124.2, "estandar")).toBe("$124,2 mil M");
    expect(pibMeme(8.37, "estandar")).toBe("$8,4 mil M");
    expect(pibMeme(1250, "estandar")).toBe("$1,3 billones");
  });

  it("compacto abrevia mil millones como MM", () => {
    expect(pibMeme(112.4, "compacto")).toBe("$112 MM");
    expect(pibMeme(1250, "compacto")).toBe("$1.250 MM");
  });

  it("compacto solo lleva un decimal por debajo de 10", () => {
    expect(pibMeme(8.37, "compacto")).toBe("$8,4 MM");
    expect(pibMeme(9.94, "compacto")).toBe("$9,9 MM");
  });

  it("compacto no deja un decimal cuando el redondeo llega a 10", () => {
    expect(pibMeme(9.96, "compacto")).toBe("$10 MM");
    expect(pibMeme(10, "compacto")).toBe("$10 MM");
  });

  it("funciona con las cifras reales de pib.json", () => {
    expect(pibMeme(pib.paises.VEN.total[2026]!, "estandar")).toBe("$124,2 mil M");
    expect(pibMeme(pib.paises.VEN.total[2026]!, "compacto")).toBe("$124 MM");
  });
});
