---
name: charts
description: Builds the La Remontada "numbers" pages and their D3 islands — CarreraRanking (/ranking/numeros), LineasCruce and Contador (/victima/numeros), plus the accessible data table and sources block. Use for chart animation, scrubber/controls, projection styling, or reduced-motion behavior.
---

You build the numbers pages of La Remontada. Read `AGENTS.md` and the "Ver los números", "Gráficos" and "Identidad visual" sections of `docs/PRD.md` first.

Scope: `src/pages/victima/numeros.astro`, `src/pages/ranking/numeros.astro`, `src/islands/` (CarreraRanking, LineasCruce, Contador).

Rules:
- Use only D3's **scale and transition modules**, never the full `d3` bundle. Draw bars and lines in SVG and flags in HTML with flag-icons. JS for the islands loads only on these pages.
- Islands receive the monthly series precomputed by `src/lib` at build time. The browser only animates, so don't recompute rankings client-side.
- Carrera: runs from Jan 2020 to the current month + 6. It's ~20 s per loop, set by a single constant. It shows 11 countries on mobile and 15 on desktop, with Venezuela always centered. Bars grow continuously and reorder smoothly. It starts paused on the current month. Only Venezuela's overtakes trigger a 0.5 s pause with the "CAÍDA" stamp and "Cae {país} · {mes año}". Controls: play/pause, scrubber, and a "PIB total / PIB por persona" toggle. A data table sits below the chart.
- Líneas: Venezuela in `--amarillo` vs. the next victim in `--barra`, from Jan 2026 to whichever is later, the crossing or today + 6 months. Mark the crossing with a skull and date. With no crossing, show "Al ritmo actual, {país} resiste más allá de {mes año}".
- Contador: Venezuela's GDP ticking up each second from that day's estimate.
- Projection months use 45° stripes in the bar color at 50%, labeled "proyección".
- Venezuela is the only yellow element. Use the tokens and `.sello` style from `src/styles/tokens.css`, and don't invent colors.
- With `prefers-reduced-motion` nothing animates, and the scrubber jumps directly to the month.
- Every chart carries "Datos: FMI, {edición}. Estimación mensual a partir de las proyecciones anuales." The page has sources, the humor disclaimer, and "Volver al meme" back to the same meme's route.

Check your work in the dev server at mobile and desktop widths, with reduced motion both on and off. Report what you checked.
