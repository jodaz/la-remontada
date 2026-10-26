// Elige al azar el meme de `/` y precarga solo su imagen.
// Se carga con `async` para no esperar al CSS que bloquea el render: así la
// imagen del meme (el LCP) empieza a descargarse antes que la hoja de fuentes.
// Si este archivo no llega a cargar, el script en línea de index.astro hace lo mismo.
(() => {
  const raiz = document.documentElement;
  if (!raiz.dataset.meme) {
    raiz.dataset.meme = Math.random() < 0.5 ? "puertas" : "escalera";
  }
  if (document.querySelector('link[rel="preload"][as="image"]')) return;
  const enlace = document.createElement("link");
  enlace.rel = "preload";
  enlace.as = "image";
  enlace.href = `/memes/${raiz.dataset.meme}.jpg`;
  enlace.setAttribute("fetchpriority", "high");
  document.head.append(enlace);
})();
