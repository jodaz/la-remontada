// Ajusta las etiquetas del meme al ancho real de la imagen.
// 1. Deja el ancho del meme en `--ancho-meme-px` (respaldo de iOS 15, sin cqw).
// 2. Achica el texto que no cabe hasta el 50 % de su tamaño base, nunca menos.
// 3. Si aun así la etiqueta se sale por arriba o por abajo, la devuelve al borde.

const MINIMO = 0.5;
const PASO = 0.05;

function ajustarTexto(texto: HTMLElement): void {
  texto.style.setProperty("--ajuste", "1");
  texto.classList.remove("envolver");
  // El ancho del texto es proporcional al tamaño de letra, así que el cociente
  // entre la caja y el texto da el ajuste en una sola medición (sin provocar
  // una decena de reflujos por etiqueta).
  const disponible = texto.clientWidth;
  const necesario = texto.scrollWidth;
  if (necesario > disponible + 1 && disponible > 0) {
    const ajuste = Math.max(MINIMO, Math.min(1, Math.floor((disponible / necesario) * 20) / 20));
    texto.style.setProperty("--ajuste", String(ajuste));
    // El redondeo puede dejar un píxel de más: un paso extra y listo.
    if (texto.scrollWidth > texto.clientWidth + 1 && ajuste > MINIMO) {
      texto.style.setProperty("--ajuste", String(Math.max(MINIMO, Math.round((ajuste - PASO) * 100) / 100)));
    }
  }
  // Un nombre imposiblemente largo se parte en dos líneas antes que salirse del meme.
  if (texto.scrollWidth > texto.clientWidth + 1) texto.classList.add("envolver");
}

function acotarVerticalmente(etiqueta: HTMLElement, meme: HTMLElement): void {
  etiqueta.style.setProperty("--dy", "0px");
  const caja = etiqueta.getBoundingClientRect();
  const marco = meme.getBoundingClientRect();
  let dy = 0;
  if (caja.top < marco.top) dy = Math.ceil(marco.top - caja.top);
  else if (caja.bottom > marco.bottom) dy = Math.floor(marco.bottom - caja.bottom);
  if (dy !== 0) etiqueta.style.setProperty("--dy", `${dy}px`);
}

function ajustar(meme: HTMLElement): void {
  meme.querySelectorAll<HTMLElement>("[data-etiqueta]").forEach((etiqueta) => {
    etiqueta
      .querySelectorAll<HTMLElement>(".txt, .rotulo-meme")
      .forEach(ajustarTexto);
    acotarVerticalmente(etiqueta, meme);
  });
}

function ajustarTodo(meme: HTMLElement): void {
  // En `/` el meme no elegido está oculto (ancho 0): no hay nada que medir.
  if (meme.clientWidth === 0) return;
  meme.style.setProperty("--ancho-meme-px", `${meme.clientWidth}px`);
  ajustar(meme);
}

// Ojo: en `/` el <html> también lleva data-meme (el meme elegido); la caja es `.meme`.
for (const meme of document.querySelectorAll<HTMLElement>(".meme[data-meme]")) {
  let ancho = 0;
  const alCambiarTamano = () => {
    const nuevo = meme.clientWidth;
    if (nuevo === 0 || nuevo === ancho) return;
    ancho = nuevo;
    ajustarTodo(meme);
  };

  alCambiarTamano();
  new ResizeObserver(alCambiarTamano).observe(meme);

  // Anton y las banderas pueden terminar de cargar después del primer pintado.
  document.fonts?.ready.then(() => ajustarTodo(meme));
  document.fonts?.addEventListener?.("loadingdone", () => ajustarTodo(meme));
}
