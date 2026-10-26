// Contador en vivo: estimación del PIB de Venezuela al momento de la visita.
// No es una animación: el número se recalcula cada segundo y se escribe una vez.

import { dolaresCompletos } from "../lib/graficos.ts";
import type { DatosContador } from "./tipos.ts";

export function iniciarContador(): void {
  const cifra = document.querySelector<HTMLElement>("[data-contador-cifra]");
  const fuente = document.getElementById("datos-contador");
  if (!cifra || !fuente?.textContent) return;

  let datos: DatosContador;
  try {
    datos = JSON.parse(fuente.textContent) as DatosContador;
  } catch {
    return;
  }

  const pintar = (): void => {
    const valor = datos.v0 * Math.exp(datos.tasa * (Date.now() - datos.t0));
    cifra.textContent = dolaresCompletos(valor);
  };

  pintar();
  window.setInterval(pintar, 1000);
}
