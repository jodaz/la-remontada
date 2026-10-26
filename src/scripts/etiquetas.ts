// Ajusta las etiquetas del meme al ancho real de la imagen.
// 1. Deja el ancho del meme en `--ancho-meme-px` (respaldo de iOS 15, sin cqw).
// 2. Achica el texto que no cabe hasta el 50 % de su tamaño base, nunca menos.

const MINIMO = 0.5;
const PASO = 0.05;

function ajustarTexto(texto: HTMLElement): void {
  texto.style.setProperty("--ajuste", "1");
  texto.classList.remove("envolver");
  let ajuste = 1;
  while (texto.scrollWidth > texto.clientWidth + 1 && ajuste > MINIMO) {
    ajuste = Math.max(MINIMO, Math.round((ajuste - PASO) * 100) / 100);
    texto.style.setProperty("--ajuste", String(ajuste));
  }
  // Un nombre imposiblemente largo se parte en dos líneas antes que salirse del meme.
  if (texto.scrollWidth > texto.clientWidth + 1) texto.classList.add("envolver");
}

function ajustar(meme: HTMLElement): void {
  meme
    .querySelectorAll<HTMLElement>("[data-etiqueta] .txt, [data-etiqueta] .rotulo-meme")
    .forEach(ajustarTexto);
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
