// Formato de cifras en español.

const decimal1 = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

/** Miles de millones de USD → "$124,2 mil M" */
export function milesDeMillones(valor: number): string {
  if (valor >= 1000) return `$${decimal1.format(valor / 1000)} billones`;
  return `$${decimal1.format(valor)} mil M`;
}

/**
 * Miles de millones de USD para una etiqueta de meme.
 * `estandar` (puertas) usa las mismas palabras que el resto del sitio;
 * `compacto` (escalera) abrevia "mil millones" como "MM" y solo lleva
 * un decimal por debajo de 10.
 */
export function pibMeme(valorMilesDeMillones: number, modo: "compacto" | "estandar"): string {
  if (modo === "estandar") return milesDeMillones(valorMilesDeMillones);
  // Se redondea antes de decidir: 9,96 no debe salir como "$10,0 MM".
  const redondeado = Math.round(valorMilesDeMillones * 10) / 10;
  const cifra = redondeado < 10 ? decimal1.format(redondeado) : entero.format(redondeado);
  return `$${cifra} MM`;
}

/** USD por persona → "$4.355" */
export function dolares(valor: number): string {
  return `$${entero.format(valor)}`;
}

/** Cociente → "3,4" */
export function veces(valor: number): string {
  return decimal1.format(valor);
}

/** Puesto con tres cifras para el número de serie: 72 → "072" */
export function tresCifras(n: number): string {
  return String(n).padStart(3, "0");
}

export function numero(n: number): string {
  return entero.format(n);
}
