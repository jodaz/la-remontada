import { describe, expect, it } from "vitest";
import { listaCaidas } from "../src/lib/graficos.ts";

describe("listaCaidas", () => {
  it("no anuncia nada si no hay caídas", () => {
    expect(listaCaidas([])).toBe("");
  });

  it("usa el singular con una caída", () => {
    expect(listaCaidas(["Omán"])).toBe("Cae Omán");
  });

  it("une dos caídas con 'y'", () => {
    expect(listaCaidas(["Omán", "Croacia"])).toBe("Caen Omán y Croacia");
  });

  it("usa comas y 'y' antes del último con tres o más", () => {
    expect(listaCaidas(["Omán", "Croacia", "Serbia"])).toBe("Caen Omán, Croacia y Serbia");
    expect(listaCaidas(["Omán", "Croacia", "Serbia", "Letonia"])).toBe(
      "Caen Omán, Croacia, Serbia y Letonia",
    );
  });
});
