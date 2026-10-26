# AGENTS.md

La Remontada (`laremontada.vanguarddevs.com`) is a static Astro humor site. It turns Venezuela's climb in the IMF world GDP ranking into two memes that update themselves from the data, plus a "numbers" page per meme with charts and sources. The full spec is `docs/PRD.md`. Read the relevant section before building a feature, and treat it as the source of truth when this file and the PRD disagree.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Package manager is pnpm; Node >= 22.23.4.

## Hard rules

- **No hand-written numbers.** Every rank, country name on a meme, GDP figure, date, reality note, and tagline ("Puesto {n} y subiendo.") comes from `data/`. If you're about to type "72" or "Guatemala" into a template, stop.
- **Static only.** Astro static output on Cloudflare Workers (static assets, `wrangler.jsonc`). No server, no database, no accounts, no visitor data stored, and no third-party data requests while someone is browsing. All IMF data ships as static JSON.
- **Compute at build, animate in the browser.** Monthly series, rankings, victims and notes are computed at build time in `src/lib/`. Islands get precomputed data and only render or animate it.
- **What you see is what you download.** A meme is the base image plus absolutely-positioned HTML labels. The PNG download captures that same DOM. Don't build a separate render path unless it's the `canvas` fallback, and that must read the same position file.
- **v1 scope is fixed.** Don't add the "¿Cuándo pasamos a…?" simulator, MP4 export, extra memes, a free-text meme generator, an English version, or an "Otro meme" button.
- **Open questions stay open.** The PRD lists unresolved decisions: victim start date, Zaraz download tracking, metric targets, Web Share on mobile, image credits. Don't settle them silently. Use the proposed default where one exists (start date January 2026), keep it in one config place, and flag it.

## Architecture (target)

```
src/pages/        index.astro (random meme), victima/{index,numeros}.astro, ranking/{index,numeros}.astro
src/components/   Meme, Etiqueta, NotaRealidad, BotonDescarga
src/islands/      CarreraRanking, LineasCruce, Contador  (JS only on /numeros pages)
src/lib/          interpolar, ranking, victimas, notas   (pure functions, unit-tested)
src/styles/       tokens.css                             (design tokens + base styles; exists)
data/             pib.json, paises.json
memes/            puertas.json, escalera.json            (label positions, read at build; exist)
                  preview.html                           (calibration tool, not shipped)
public/memes/     puertas.jpg (640×357), escalera.jpg (777×1100)  (exist)
scripts/          actualizar-fmi, capturas-og
.github/workflows datos-fmi.yml, recompilar-mensual.yml
docs/             PRD.md, referencia/inspiracion-tweet.png
```

Code identifiers, file names and all UI copy are in Spanish, following the PRD.

### Data pipeline (`src/lib`)

1. **`interpolar`**: put each annual IMF value at July 1 of its year. Fill the months between with **constant growth** (geometric, not linear). Data spans 2019–2027; 2019 is needed for Jan–Jun 2020.
2. **`ranking`**: rank countries by total GDP or GDP per capita for a given month. A country with no data for a year is left out of that year's ranking.
3. **`victimas`**: a victim is a country above Venezuela on the start date and below it now, dated by the month Venezuela passed it.
4. **`notas`**: fill the reality-note templates from the current month's ranking and the victims.

`interpolar`, `ranking` and `victimas` require unit tests. No test runner is installed yet, so add one when you build these.

Months after the current one are **projection** and must look different everywhere: striped bars and the "PROYECCIÓN" stamp. The site rebuilds monthly (the series are monthly, so the ranking only changes at a month boundary), so "today" is the build date.

### Memes

- Labels are HTML blocks with `position: absolute`, placed from `memes/*.json` so they scale with the image. Each entry has these fields:
  - `x`/`y`: the anchor point, as % of the image's width and height.
  - `ancla`: `abajo` puts the label's bottom edge on (x, y), `arriba` its top edge. Either way the label is centered horizontally.
  - `ancho`: the label's max width, as % of the image width.
  - `fuente`: the font size, as % of the image width.
  - `rol` and `indice`: which data goes there. `indice` 1 is the country closest to Venezuela, or the most recent victim.
  - `muestra`: what to render (`bandera`, `nombre`, `puesto`, `pib`, `rotulo`). `pib` is that country's total GDP for the current month, from `data/`: compact on escalera (`$112 MM`), standard on puertas (`$124,2 mil M`). `nombreFijo` and `rotulo` hold fixed text.
  - The top-level `marca.esquina` is the watermark corner.
- Font sizes use `cqw`. iOS 15 has no container queries, so there a `ResizeObserver` sets a CSS variable with the meme width.
- The positions are a first calibration. Tune them with `memes/preview.html`: run `npx serve .` from the repo root, open `/memes/preview.html`, and tick "Mostrar el borde de cada etiqueta". The preview inlines a **copy** of both JSON files in its `CONFIG` and uses sample countries, so re-paste `CONFIG` after editing the JSON.
- Flags use `flag-icons` classes (`fi fi-ve`). Label text uses Anton, white with a black outline and uppercase, and shrinks to fit long names.
- **Puertas (`/victima`)**: doors 1–4 hold the 5th to 2nd most recent victims, door 5 the latest victim, door 6 the country just above Venezuela plus "PRÓXIMA VÍCTIMA". Each door label shows flag, name and the country's PIB total in standard form (`$124,2 mil M`). With fewer than 5 victims, fill the extra doors with the countries just below Venezuela. This also covers Venezuela falling in the ranking.
- **Escalera (`/ranking`)**: the top figure is #1, the next 9 are the countries just above Venezuela, the celebrating figure is Venezuela (big rank + "VENEZUELA"), and the bottom figure is the latest victim. Only Venezuela gets a full name; the rest get flag + rank, and every label adds that country's PIB total in compact form (`$112 MM`).
- `/` chooses one meme 50/50 with an inline `<head>` script **before first paint**, so the page never flickers. `/victima` and `/ranking` always show their own meme. Each has its own `og:image` and `twitter:card`, taken from Playwright screenshots.
- "Volver al meme" goes to that meme's route, never to `/`.

### Download

- `html-to-image` `toPng`, at the base image's original size (adjust `pixelRatio`). Wait for `document.fonts.ready` first.
- On Safari, capture twice and keep the second capture, because the first can come out with blank images. If iPhone tests still fail, fall back to `canvas`.
- The PNG includes the watermark (isotype + `laremontada.vanguarddevs.com` in Martian Mono, 85% white with shadow). Its corner comes from each meme's `marca.esquina`: bottom-right on puertas, bottom-left on escalera. It excludes the banknote double frame.
- File name: `laremontada-{meme}-{AAAA-MM-DD}.png`.

### Charts

- D3 **scale and transition modules only**, inside Astro islands. Bars and lines are SVG; flags are HTML.
- **Carrera del ranking**: runs from Jan 2020 to the current month + 6. It's ~20 s per loop (~230 ms per month), set by a single constant. It shows 11 countries on mobile and 15 on desktop, with Venezuela centered. It starts paused on the current month. Venezuela's overtakes pause it 0.5 s with "Cae {país} · {mes año}". Controls: play/pause, scrubber, and a "PIB total / PIB por persona" toggle. A data table sits below the chart.
- **Líneas que se cruzan**: Venezuela vs. the next victim from Jan 2026 to whichever is later, the crossing or today + 6 months. Mark the crossing with a skull and date. With no crossing, show "Al ritmo actual, {país} resiste más allá de {mes año}".
- With `prefers-reduced-motion`, nothing animates anywhere. The scrubber jumps directly to the month.
- Below every chart: "Datos: FMI, {edición}. Estimación mensual a partir de las proyecciones anuales."

## Visual identity

The site is styled like a bolívar banknote, with the frame kept quiet so the memes are the only loud thing. `src/styles/tokens.css` is the source of truth for colors, fonts, the type scale and base component styles (`.boton-descarga`, `.boton-numeros`, `.marco-billete`, `.letra-pequena`, `.sello`). Import it and don't redefine tokens. The single Google Fonts URL is in its header comment. The theme follows `prefers-color-scheme` and has no toggle.

- Venezuela is the **only** yellow element in charts. All other bars use `--barra`. Never use yellow as text color on paper.
- Fonts: Big Shoulders Display for titles and figures, Atkinson Hyperlegible for body text, Martian Mono for data, Anton for meme labels only. Numbers use `tabular-nums`.
- The only motion outside charts: the tagline rank's one-time mechanical counter (<1 s), and the "CAÍDA" stamp popping from 130% to 100% (200 ms).
- No national coat of arms, and no real bank names or logos.

## Content and tone

- The joke is the situation and the cope, never other countries' people, culture or problems.
- No fake screenshots of real accounts or of Grok. If a voice is needed, invent a character.
- Reality notes are 1–2 dry lines, presented as the small print of the banknote (no label). They state one data point the meme leaves out, with no moral.
- Use the PRD's fixed copy exactly ("Descargar meme", "Ver los números", "Volver al meme", the footer, the method line).

## Budgets and compatibility

- The meme is visible in under 2 s on 4G. The first screen is under 600 KB. Meme pages ship almost no JS.
- Support the last 2 versions of Chrome, Safari, Firefox and Edge, plus iOS Safari 15+. Design mobile-first at ~400 px; the meme caps at ~720 px on desktop.
- `_headers`: CSP, long cache for versioned assets, short cache for `data/`.

## Data updates and automation

- `datos-fmi.yml` downloads the IMF WEO file and validates it (~190 countries, Venezuela present, no absurd jumps). It then opens a PR with a summary ("Venezuela pasa del puesto X al Y; nueva próxima víctima: Z"). It must **never publish without approval**.
- `recompilar-mensual.yml` rebuilds on the 1st of each month so the meme changes when a country falls.
- Cloudflare Workers builds `main` through its Git integration (`pnpm build`, then `npx wrangler deploy`; config in `wrangler.jsonc`, which also needs `"previews": {}` for non-`main` branches). Chromium isn't available there, so `publicar.yml` generates the og:image PNGs and commits them to `public/og/`. Don't add a wrangler deploy step to Actions. Settings table: README, "Publicación".
- Raw IMF files and meme screenshots of each rebuild are archived in MEGA S4. Its credentials live only in GitHub Actions secrets.
- The current edition is the WEO of October 2026. Use only IMF data, never BCV figures.

## Delivery

The work ships in 4 phases. Don't start a phase before the previous one passes its gate.

| Phase | Builds | Gate |
| --- | --- | --- |
| 1 · Datos | IMF workflow, `pib.json`, `paises.json`, flag-icons, label map | Figures match the IMF's |
| 2 · Memes | Astro pages, routes and random meme, html-to-image, reality notes | Memes readable on iPhone and Android |
| 3 · Números | Counter and victims, ranking race, total / per-capita toggle, sources and method | Charts verified |
| 4 · Lanzamiento | Workers domain, `og:image` previews, analytics, headers and cache | Open questions closed |

Phase 2 is the first one that can be shown. It's where label placement gets validated before the charts are built.

## Astro docs

Full documentation: https://docs.astro.build

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components / islands](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
