// Carrera del ranking: dibuja los cuadros que ya vienen calculados desde src/lib.
// Las barras son SVG; las banderas y los textos, HTML encima del mismo tablero.

import { select } from "d3-selection";
import "d3-transition";
import { easeLinear } from "d3-ease";
import { scaleLinear } from "d3-scale";
import { nombreMes } from "../lib/meses.ts";
import {
  etiquetaMetrica,
  valorDeMetrica,
  ventanaAlrededor,
} from "../lib/graficos.ts";
import type { Barra, DatosCarrera, Metrica } from "./tipos.ts";

function reducido(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escritorio(): boolean {
  return window.matchMedia("(min-width: 640px)").matches;
}

export function iniciarCarrera(): void {
  const raiz = document.querySelector<HTMLElement>("[data-carrera]");
  const fuente = document.getElementById("datos-carrera");
  if (!raiz || !fuente?.textContent) return;

  let datos: DatosCarrera;
  try {
    datos = JSON.parse(fuente.textContent) as DatosCarrera;
  } catch {
    return;
  }

  const tablero = raiz.querySelector<HTMLElement>("[data-carrera-tablero]");
  const svg = raiz.querySelector<SVGSVGElement>("[data-carrera-svg]");
  const gBarras = raiz.querySelector<SVGGElement>("[data-carrera-barras]");
  const gRejilla = raiz.querySelector<SVGGElement>("[data-carrera-rejilla]");
  const etiquetas = raiz.querySelector<HTMLElement>("[data-carrera-etiquetas]");
  const mesEl = raiz.querySelector<HTMLElement>("[data-carrera-mes]");
  const selloProyeccion = raiz.querySelector<HTMLElement>("[data-carrera-proyeccion]");
  const aviso = raiz.querySelector<HTMLElement>("[data-carrera-aviso]");
  const avisoTexto = raiz.querySelector<HTMLElement>("[data-carrera-aviso-texto]");
  const botonPlay = raiz.querySelector<HTMLButtonElement>("[data-carrera-play]");
  const scrub = raiz.querySelector<HTMLInputElement>("[data-carrera-scrub]");
  const botonMetrica = raiz.querySelector<HTMLButtonElement>("[data-carrera-metrica]");
  const metricaActual = raiz.querySelector<HTMLElement>("[data-carrera-metrica-actual]");
  const tabla = raiz.querySelector<HTMLTableElement>("[data-carrera-tabla]");
  const tablaCaption = raiz.querySelector<HTMLElement>("[data-carrera-tabla-caption]");
  const tablaCuerpo = tabla?.querySelector<HTMLTableSectionElement>("tbody") ?? null;
  const tablaCabezaValor = tabla?.querySelector<HTMLTableCellElement>("thead th:last-child") ?? null;
  const tablaVeCuerpo = raiz.querySelector<HTMLTableSectionElement>("[data-carrera-vr-tabla] tbody");
  const svgTitulo = raiz.querySelector<SVGTitleElement>("#carrera-svg-titulo");
  const svgDesc = raiz.querySelector<SVGDescElement>("#carrera-svg-desc");

  if (
    !tablero || !svg || !gBarras || !gRejilla || !etiquetas || !mesEl ||
    !selloProyeccion || !aviso || !avisoTexto || !botonPlay || !scrub ||
    !botonMetrica || !metricaActual || !tablaCuerpo
  ) {
    return;
  }

  const total = datos.meses.length;
  let metrica: Metrica = "total";
  let indice = Math.max(0, Math.min(datos.indiceActual, total - 1));
  let jugando = false;
  let temporizador = 0;

  // Medidas del tablero, en píxeles. El SVG y la capa HTML comparten el mismo sistema.
  let ancho = 360;
  let alto = 360;
  let margen = 6;
  let filaAlto = 30;
  let barraAlto = 17;
  let leftBarra = 144;
  let valorAncho = 94;
  let areaBarra = 120;
  let maximo = 1;
  const escala = scaleLinear().domain([0, 1]).range([0, 1]);

  const cuadros = () => datos.metricas[metrica].cuadros;

  function visiblesCuadro(barras: Barra[]): Barra[] {
    const iVe = barras.findIndex((b) => b[0] === datos.venezuela);
    const cuantos = escritorio() ? datos.visibles.escritorio : datos.visibles.celular;
    return ventanaAlrededor(barras, iVe < 0 ? 0 : iVe, cuantos);
  }

  function recalcularEscala(): void {
    let mayor = 0;
    for (const [, barras] of cuadros()) {
      for (const b of barras) if (b[1] > mayor) mayor = b[1];
    }
    maximo = mayor > 0 ? mayor * 1.02 : 1;
    escala.domain([0, maximo]).range([0, areaBarra]);
  }

  function medir(): void {
    ancho = Math.max(280, Math.floor(tablero!.clientWidth));
    const cuantos = escritorio() ? datos.visibles.escritorio : datos.visibles.celular;
    filaAlto = ancho < 480 ? 30 : Math.max(30, Math.min(42, Math.round(ancho / 17)));
    alto = margen * 2 + cuantos * filaAlto;
    barraAlto = Math.max(12, Math.round(filaAlto * 0.56));
    leftBarra = Math.round(ancho * 0.4);
    valorAncho = Math.round(ancho * 0.26);
    areaBarra = Math.max(40, ancho - leftBarra - valorAncho - 8);

    svg!.setAttribute("width", String(ancho));
    svg!.setAttribute("height", String(alto));
    svg!.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    tablero!.style.height = `${alto}px`;
    etiquetas!.style.setProperty("--left-barra", `${leftBarra}px`);
    etiquetas!.style.setProperty("--valor-ancho", `${valorAncho}px`);
    etiquetas!.style.setProperty("--alto-fila", `${filaAlto}px`);
    recalcularEscala();
    dibujarRejilla();
  }

  function dibujarRejilla(): void {
    const fracciones = [0, 0.25, 0.5, 0.75, 1];
    select(gRejilla)
      .selectAll<SVGLineElement, number>("line")
      .data(fracciones)
      .join("line")
      .attr("x1", (f) => leftBarra + f * areaBarra)
      .attr("x2", (f) => leftBarra + f * areaBarra)
      .attr("y1", margen)
      .attr("y2", alto - margen)
      .attr("stroke", "var(--guilloche)")
      .attr("stroke-width", 1)
      .attr("opacity", 0.55);
  }

  function claseBarra(iso: string, proyeccion: boolean): string {
    if (iso === datos.venezuela) return proyeccion ? "barra barra-proyeccion-ve" : "barra barra-ve";
    return proyeccion ? "barra barra-proyeccion-otra" : "barra barra-otra";
  }

  function yBarra(k: number): number {
    return margen + k * filaAlto + (filaAlto - barraAlto) / 2;
  }

  function yFila(k: number): number {
    return margen + k * filaAlto;
  }

  /** Pinta un cuadro. Devuelve true si ese mes tiene una caída de Venezuela. */
  function pintar(nuevoIndice: number, animar: boolean): boolean {
    indice = Math.max(0, Math.min(nuevoIndice, total - 1));
    const [proyeccion, barras] = cuadros()[indice];
    const visibles = visiblesCuadro(barras);
    const dur = animar && !reducido() ? datos.msPorMes : 0;

    mesEl!.textContent = nombreMes(datos.meses[indice]);
    selloProyeccion!.hidden = !proyeccion;
    scrub!.value = String(indice);
    scrub!.setAttribute("aria-valuetext", nombreMes(datos.meses[indice]));

    const ve = barras.find((b) => b[0] === datos.venezuela);
    if (svgTitulo) svgTitulo.textContent = `Carrera del ranking, ${nombreMes(datos.meses[indice])}`;
    if (svgDesc) {
      svgDesc.textContent = ve
        ? `${proyeccion ? "Proyección. " : ""}${datos.venezuelaNombre} ocupa el puesto ${ve[2]} con ${valorDeMetrica(metrica, ve[1])}. Se muestran ${visibles.length} países alrededor.`
        : "Carrera del ranking del PIB.";
    }

    // Barras: SVG.
    const seleccion = select(gBarras)
      .selectAll<SVGRectElement, Barra>("rect")
      .data(visibles, (d) => d[0]);
    seleccion.exit().remove();
    const entrantes = seleccion
      .enter()
      .append("rect")
      .attr("class", (d) => claseBarra(d[0], proyeccion))
      .attr("x", leftBarra)
      .attr("y", (_d, k) => yBarra(k))
      .attr("height", barraAlto)
      .attr("width", 0);
    const todas = entrantes.merge(seleccion);

    if (dur > 0) {
      todas
        .interrupt("mes")
        .transition("mes")
        .duration(dur)
        .ease(easeLinear)
        .attr("y", (_d, k) => yBarra(k))
        .attr("height", barraAlto)
        .attr("width", (d) => Math.max(1, escala(d[1])));
    } else {
      todas
        .interrupt("mes")
        .attr("y", (_d, k) => yBarra(k))
        .attr("height", barraAlto)
        .attr("width", (d) => Math.max(1, escala(d[1])));
    }
    todas.attr("class", (d) => claseBarra(d[0], proyeccion));

    // Etiquetas y banderas: HTML.
    const filas = select(etiquetas)
      .selectAll<HTMLDivElement, Barra>("div.fila")
      .data(visibles, (d) => d[0]);
    filas.exit().remove();
    const filasNuevas = filas
      .enter()
      .append("div")
      .attr("class", "fila")
      .style("transform", (_d, k) => `translateY(${yFila(k)}px)`);
    filasNuevas.append("span").attr("class", "puesto");
    filasNuevas.append("span").attr("class", "bandera");
    filasNuevas.append("span").attr("class", "nombre");
    filasNuevas.append("span").attr("class", "valor");

    const filasTodas = filasNuevas.merge(filas);
    filasTodas.each(function (d) {
      const fila = select(this);
      const pais = datos.paises[d[0]];
      fila.attr("data-venezuela", d[0] === datos.venezuela ? "" : null);
      fila.select(".puesto").text(String(d[2]));
      fila
        .select(".bandera")
        .attr("class", `fi fi-${pais?.[0] ?? "xx"} bandera`)
        .attr("aria-hidden", "true");
      fila.select(".nombre").text(pais?.[1] ?? d[0]);
      fila.select(".valor").text(valorDeMetrica(metrica, d[1]));
    });

    if (dur > 0) {
      filasTodas
        .interrupt("mes")
        .transition("mes")
        .duration(dur)
        .ease(easeLinear)
        .style("transform", (_d, k) => `translateY(${yFila(k)}px)`);
    } else {
      filasTodas
        .interrupt("mes")
        .style("transform", (_d, k) => `translateY(${yFila(k)}px)`);
    }

    actualizarTabla(proyeccion, visibles);
    return actualizarAviso(datos.meses[indice]);
  }

  function actualizarAviso(mes: string): boolean {
    const caidas = datos.metricas[metrica].caidas.filter((c) => c.mes === mes);
    if (caidas.length === 0) {
      aviso!.hidden = true;
      avisoTexto!.textContent = "";
      return false;
    }
    const caida = caidas[0];
    const nombre = datos.paises[caida.iso]?.[2] ?? caida.iso;
    avisoTexto!.textContent = `Cae ${nombre} · ${nombreMes(caida.mes)}`;
    aviso!.hidden = false;
    return true;
  }

  function actualizarTabla(proyeccion: boolean, visibles: Barra[]): void {
    const mes = datos.meses[indice];
    if (tablaCaption) {
      tablaCaption.textContent = `Carrera del ranking, ${nombreMes(mes)}${proyeccion ? " (proyección)" : ""}. ${etiquetaMetrica(metrica)}.`;
    }
    if (tablaCabezaValor) tablaCabezaValor.textContent = etiquetaMetrica(metrica);

    const fragmento = document.createDocumentFragment();
    for (const b of visibles) {
      const tr = document.createElement("tr");
      if (b[0] === datos.venezuela) tr.dataset.venezuela = "";
      const puesto = document.createElement("td");
      puesto.textContent = String(b[2]);
      const pais = document.createElement("td");
      pais.textContent = datos.paises[b[0]]?.[2] ?? b[0];
      const valor = document.createElement("td");
      valor.textContent = valorDeMetrica(metrica, b[1]);
      tr.append(puesto, pais, valor);
      fragmento.append(tr);
    }
    tablaCuerpo!.replaceChildren(fragmento);
  }

  function actualizarTablaVenezuela(): void {
    if (!tablaVeCuerpo) return;
    const fragmento = document.createDocumentFragment();
    cuadros().forEach(([proyeccion, barras], i) => {
      const ve = barras.find((b) => b[0] === datos.venezuela);
      const tr = document.createElement("tr");
      const mes = document.createElement("td");
      mes.textContent = `${nombreMes(datos.meses[i])}${proyeccion ? " (proyección)" : ""}`;
      const puesto = document.createElement("td");
      puesto.textContent = ve ? String(ve[2]) : "—";
      tr.append(mes, puesto);
      fragmento.append(tr);
    });
    tablaVeCuerpo.replaceChildren(fragmento);
  }

  function actualizarBoton(): void {
    botonPlay!.textContent = jugando ? "Pausar" : "Reproducir";
    botonPlay!.setAttribute("aria-pressed", String(jugando));
  }

  function paso(): void {
    if (!jugando) return;
    indice = (indice + 1) % total;
    const hayCaida = pintar(indice, true);
    temporizador = window.setTimeout(paso, datos.msPorMes + (hayCaida ? datos.msPausa : 0));
  }

  function pausar(): void {
    jugando = false;
    window.clearTimeout(temporizador);
    actualizarBoton();
  }

  function reproducir(): void {
    if (jugando) return;
    if (indice >= total - 1) {
      indice = 0;
      pintar(0, false);
    }
    jugando = true;
    actualizarBoton();
    temporizador = window.setTimeout(paso, datos.msPorMes);
  }

  botonPlay.addEventListener("click", () => {
    if (jugando) pausar();
    else reproducir();
  });

  scrub.addEventListener("input", () => {
    pausar();
    pintar(Number(scrub.value), false);
  });

  botonMetrica.addEventListener("click", () => {
    metrica = metrica === "total" ? "porPersona" : "total";
    botonMetrica.setAttribute("aria-pressed", String(metrica === "porPersona"));
    metricaActual!.textContent = `Mostrando: ${etiquetaMetrica(metrica)}`;
    recalcularEscala();
    pintar(indice, false);
    actualizarTablaVenezuela();
  });

  // El ancho cambia al girar el teléfono o al cruzar el punto de escritorio.
  let anchoAnterior = 0;
  const observador = new ResizeObserver(() => {
    const nuevo = Math.floor(tablero!.clientWidth);
    if (Math.abs(nuevo - anchoAnterior) < 2) return;
    anchoAnterior = nuevo;
    medir();
    pintar(indice, false);
  });
  observador.observe(tablero);

  const mqEscritorio = window.matchMedia("(min-width: 640px)");
  mqEscritorio.addEventListener("change", () => {
    medir();
    pintar(indice, false);
  });

  anchoAnterior = Math.floor(tablero.clientWidth);
  medir();
  pintar(indice, false);
  actualizarTablaVenezuela();
  actualizarBoton();
}
