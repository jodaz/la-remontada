// Formato de cifras en español.

const decimal1 = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

/** Miles de millones de USD → "$124,2 mil M" */
export function milesDeMillones(valor: number): string {
  if (valor >= 1000) return `$${decimal1.format(valor / 1000)} billones`;
  return `$${decimal1.format(valor)} mil M`;
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
