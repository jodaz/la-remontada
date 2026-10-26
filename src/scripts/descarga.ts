// Descarga del meme: fotografía el bloque `.meme` (imagen + etiquetas + marca de agua),
// sin el marco de billete ni los números de serie, al tamaño original de la imagen.

const MENSAJE_ERROR = "No se pudo crear la imagen. Intenta de nuevo o haz una captura de pantalla.";

/** Fecha local del navegador en AAAA-MM-DD, como pide el nombre del archivo. */
function fechaLocal(fecha = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Safari (incluido iOS) puede sacar la primera captura con imágenes en blanco. */
function esSafari(): boolean {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Macintosh, pero con pantalla táctil.
  const iPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  const iOS = /iphone|ipad|ipod/i.test(ua) || iPadOS;
  const safari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg|android/i.test(ua);
  return iOS || safari;
}

async function descargar(boton: HTMLButtonElement): Promise<void> {
  const meme = boton.dataset.descarga ?? "";
  const caja = document.querySelector<HTMLElement>(`.meme[data-meme="${meme}"]`);
  if (!caja) return;

  const aviso = document.querySelector<HTMLElement>(`[data-aviso="${meme}"]`);
  boton.disabled = true;
  boton.setAttribute("aria-busy", "true");
  if (aviso) aviso.textContent = "";

  try {
    await document.fonts.ready;

    // Se carga solo al pulsar: las páginas de meme no llevan html-to-image de entrada.
    const { toPng } = await import("html-to-image");

    const ancho = Number(caja.dataset.ancho) || caja.clientWidth;
    const alto = Number(caja.dataset.alto) || caja.clientHeight;
    const opciones = {
      pixelRatio: 1,
      // El lienzo se fija al tamaño original de la imagen. El medio píxel extra
      // evita que el redondeo del canvas deje la altura un píxel corta.
      canvasWidth: ancho + 0.5,
      canvasHeight: alto + 0.5,
      cacheBust: true,
    };

    let imagen = await toPng(caja, opciones);
    if (esSafari()) imagen = await toPng(caja, opciones);

    const enlace = document.createElement("a");
    enlace.href = imagen;
    enlace.download = `laremontada-${meme}-${fechaLocal()}.png`;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
  } catch (error) {
    console.error("No se pudo crear el PNG del meme", error);
    if (aviso) aviso.textContent = MENSAJE_ERROR;
  } finally {
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-descarga]").forEach((boton) => {
  boton.addEventListener("click", () => {
    void descargar(boton);
  });
});
