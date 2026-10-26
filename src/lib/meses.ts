// Meses como texto "AAAA-MM". Funciones puras, sin zona horaria.

export type Mes = string;

const NOMBRES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function crearMes(anio: number, mes: number): Mes {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export function partesMes(m: Mes): { anio: number; mes: number } {
  const [a, b] = m.split("-").map(Number);
  return { anio: a, mes: b };
}

/** Meses transcurridos desde el año 0; sirve para restar y comparar. */
export function indiceMes(m: Mes): number {
  const { anio, mes } = partesMes(m);
  return anio * 12 + (mes - 1);
}

export function mesDesdeIndice(i: number): Mes {
  return crearMes(Math.floor(i / 12), (i % 12) + 1);
}

export function sumarMeses(m: Mes, n: number): Mes {
  return mesDesdeIndice(indiceMes(m) + n);
}

/** Lista inclusiva de meses entre `desde` y `hasta`. */
export function rangoMeses(desde: Mes, hasta: Mes): Mes[] {
  const salida: Mes[] = [];
  for (let i = indiceMes(desde); i <= indiceMes(hasta); i++) salida.push(mesDesdeIndice(i));
  return salida;
}

export function mesDeFecha(fecha: Date): Mes {
  return crearMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
}

/** "marzo 2026" */
export function nombreMes(m: Mes): string {
  const { anio, mes } = partesMes(m);
  return `${NOMBRES[mes - 1]} ${anio}`;
}

/** "mar 2026" */
export function nombreMesCorto(m: Mes): string {
  const { anio, mes } = partesMes(m);
  return `${CORTOS[mes - 1]} ${anio}`;
}
