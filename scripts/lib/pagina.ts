// Utilidades compartidas por los scripts de Playwright.

import type { Page } from "playwright";

/** Espera fuentes, imágenes y un respiro para que el layout se asiente. */
export async function esperarPagina(page: Page, respiro = 300): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page
    .evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((imagen) =>
          imagen.complete
            ? Promise.resolve()
            : new Promise<void>((listo) => {
                imagen.addEventListener("load", () => listo(), { once: true });
                imagen.addEventListener("error", () => listo(), { once: true });
              }),
        ),
      );
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
