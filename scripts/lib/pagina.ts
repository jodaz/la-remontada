// Utilidades compartidas por los scripts de Playwright.

import type { Page } from "playwright";

/** Espera fuentes, imágenes y un respiro para que el layout se asiente. */
export async function esperarPagina(page: Page, respiro = 300): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page
    .evaluate(async () => {
      await document.fonts.ready;
      // Las imágenes ocultas con loading="lazy" (el meme no elegido en "/") nunca cargan: se ignoran.
      const visibles = Array.from(document.images).filter((imagen) => imagen.getClientRects().length > 0);
      const cargas = Promise.all(
        visibles.map((imagen) =>
          imagen.complete
            ? Promise.resolve()
            : new Promise<void>((listo) => {
                imagen.addEventListener("load", () => listo(), { once: true });
                imagen.addEventListener("error", () => listo(), { once: true });
              }),
        ),
      );
      await Promise.race([cargas, new Promise((listo) => setTimeout(listo, 10_000))]);
    })
    .catch(() => {});
  if (respiro > 0) await page.waitForTimeout(respiro);
}

/** Evita que el meme al azar de "/" cambie entre capturas. */
export async function fijarMeme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
}
