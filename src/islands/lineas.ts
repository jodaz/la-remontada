// Líneas que se cruzan: Venezuela contra la próxima víctima, mes a mes.
// Solo escala y selección de D3; el gráfico no se anima.

import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { nombreMes, nombreMesCorto } from "../lib/meses.ts";
import { milesDeMillones, numero } from "../lib/formato.ts";
import type { DatosLineas } from "./tipos.ts";

function camino(
  valores: number[],
  desde: number,
  hasta: number,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  const puntos: string[] = [];
  for (let i = desde; i <= hasta; i++) {
    const v = valores[i];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    puntos.push(`${puntos.length === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  }
  return puntos.join(" ");
}

export function iniciarLineas(): void {
  const raiz = document.querySelector<HTMLElement>("[data-lineas]");
  const fuente = document.getElementById("datos-lineas");
  if (!raiz || !fuente?.textContent) return;

  let datos: DatosLineas;
  try {
    datos = JSON.parse(fuente.textContent) as DatosLineas;
  } catch {
    return;
  }

  const tablero = raiz.querySelector<HTMLElement>("[data-lineas-tablero]");
  const svg = raiz.querySelector<SVGSVGElement>("[data-lineas-svg]");
  if (!tablero || !svg) return;

  const margen = { arriba: 18, derecha: 14, abajo: 36, izquierda: 84 };
  const n = datos.meses.length;

  function crearGrupo(clase: string): SVGGElement {
    const existente = svg!.querySelector<SVGGElement>(`g.${clase}`);
    if (existente) return existente;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", clase);
    svg!.append(g);
    return g;
  }

  const gEjes = crearGrupo("ejes");
  const gSeries = crearGrupo("series");
  const gMarca = crearGrupo("marca");

  function dibujar(): void {
    const ancho = Math.max(280, Math.floor(tablero!.clientWidth));
    const alto = Math.max(200, Math.floor(tablero!.clientHeight));
    svg!.setAttribute("width", String(ancho));
    svg!.setAttribute("height", String(alto));
    svg!.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);

    const x = scaleLinear()
      .domain([0, Math.max(1, n - 1)])
      .range([margen.izquierda, ancho - margen.derecha]);
    const mayor = Math.max(0, ...datos.venezuela, ...datos.rival);
    const y = scaleLinear()
      .domain([0, mayor > 0 ? mayor * 1.1 : 1])
      .range([alto - margen.abajo, margen.arriba]);

    select(gEjes).selectAll("*").remove();

    const marcasY = y.ticks(4);
    select(gEjes)
      .selectAll<SVGLineElement, number>("line.rejilla")
      .data(marcasY)
      .join("line")
      .attr("class", "rejilla")
      .attr("x1", margen.izquierda)
      .attr("x2", ancho - margen.derecha)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "var(--guilloche)")
      .attr("stroke-width", 1)
      .attr("opacity", 0.65);

    select(gEjes)
      .selectAll<SVGTextElement, number>("text.marca-y")
      .data(marcasY)
      .join("text")
      .attr("class", "marca-y")
      .attr("x", margen.izquierda - 8)
      .attr("y", (d) => y(d))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-family", "var(--f-datos)")
      .attr("font-size", 10)
      .attr("fill", "var(--tinta-suave)")
      .text((d) => `$${numero(d)} mil M`);

    const indices: number[] = [];
    if (ancho < 480) {
      indices.push(0, Math.round((n - 1) / 2), n - 1);
    } else {
      const paso = 3;
      for (let i = 0; i < n; i += paso) indices.push(i);
      if (indices[indices.length - 1] !== n - 1) {
        if (n - 1 - indices[indices.length - 1] < 2) indices.pop();
        indices.push(n - 1);
      }
    }
    select(gEjes)
      .selectAll<SVGTextElement, number>("text.marca-x")
      .data(indices)
      .join("text")
      .attr("class", "marca-x")
      .attr("x", (i) => x(i))
      .attr("y", alto - 12)
      .attr("text-anchor", (i) => (i === 0 ? "start" : i === n - 1 ? "end" : "middle"))
      .attr("font-family", "var(--f-datos)")
      .attr("font-size", 10)
      .attr("fill", "var(--tinta-suave)")
      .text((i) => nombreMesCorto(datos.meses[i]));

    const seleccionSeries = select(gSeries);
    seleccionSeries.selectAll("*").remove();
    seleccionSeries
      .append("path")
      .attr("d", camino(datos.venezuela, 0, datos.indiceActual, x, y))
      .attr("fill", "none")
      .attr("stroke", "var(--amarillo)")
      .attr("stroke-width", 3.2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");
    seleccionSeries
      .append("path")
      .attr("d", camino(datos.venezuela, datos.indiceActual, n - 1, x, y))
      .attr("fill", "none")
      .attr("stroke", "var(--amarillo)")
      .attr("stroke-width", 3.2)
      .attr("stroke-dasharray", "6 5")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.85);
    seleccionSeries
      .append("path")
      .attr("d", camino(datos.rival, 0, datos.indiceActual, x, y))
      .attr("fill", "none")
      .attr("stroke", "var(--barra)")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");
    seleccionSeries
      .append("path")
      .attr("d", camino(datos.rival, datos.indiceActual, n - 1, x, y))
      .attr("fill", "none")
      .attr("stroke", "var(--barra)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6 5")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.85);

    const seleccionMarca = select(gMarca);
    seleccionMarca.selectAll("*").remove();
    const iCruce = datos.cruce ? datos.meses.indexOf(datos.cruce) : -1;
    if (iCruce >= 0) {
      const xc = x(iCruce);
      const yc = (y(datos.venezuela[iCruce]) + y(datos.rival[iCruce])) / 2;
      seleccionMarca
        .append("line")
        .attr("x1", xc)
        .attr("x2", xc)
        .attr("y1", margen.arriba)
        .attr("y2", alto - margen.abajo)
        .attr("stroke", "var(--tinta-suave)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 3")
        .attr("opacity", 0.7);
      const punto = seleccionMarca
        .append("g")
        .attr("role", "img")
        .attr("aria-label", datos.mensaje);
      punto.append("title").text(datos.mensaje);
      punto
        .append("text")
        .attr("x", xc)
        .attr("y", yc - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", 22)
        .attr("fill", "var(--tinta)")
        .attr("aria-hidden", "true")
        .text("☠");
      punto
        .append("text")
        .attr("x", xc)
        .attr("y", yc - 28)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--f-datos)")
        .attr("font-size", 10)
        .attr("fill", "var(--tinta)")
        .attr("aria-hidden", "true")
        .text(nombreMesCorto(datos.cruce!));
    }

    const desc = svg!.querySelector("desc");
    if (desc) {
      const ve = datos.venezuela[datos.indiceActual];
      const rival = datos.rival[datos.indiceActual];
      desc.textContent = `${datos.venezuelaNombre} contra ${datos.pais.nombre}, ${nombreMes(datos.meses[0])} a ${nombreMes(datos.meses[n - 1])}. ${datos.mensaje}. En ${nombreMes(datos.meses[datos.indiceActual])}: ${milesDeMillones(ve)} y ${milesDeMillones(rival)}. La tabla siguiente tiene los mismos datos.`;
    }
  }

  let anchoAnterior = 0;
  const observador = new ResizeObserver(() => {
    const nuevo = Math.floor(tablero!.clientWidth);
    if (Math.abs(nuevo - anchoAnterior) < 2) return;
    anchoAnterior = nuevo;
    dibujar();
  });
  observador.observe(tablero);

  anchoAnterior = Math.floor(tablero.clientWidth);
  dibujar();
}
