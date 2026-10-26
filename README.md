# La Remontada

Sitio de humor estático sobre la subida de Venezuela en el ranking mundial del
PIB del FMI. Dos memes que se actualizan solos con los datos y una página de
números por meme, con gráficos y fuentes.

- Dominio: `laremontada.vanguarddevs.com`
- Hosting: Cloudflare Workers con assets estáticos (`wrangler.jsonc`), salida estática de Astro.
- Datos: solo FMI (World Economic Outlook). Nunca BCV.
- Sin servidor, sin base de datos, sin cuentas y sin pedir datos a terceros
  mientras alguien navega. Todo el FMI viaja como JSON estático.

La especificación completa está en [`docs/PRD.md`](docs/PRD.md) y las reglas de
trabajo en [`AGENTS.md`](AGENTS.md).

## Requisitos

- Node `>= 22.23.4` (los workflows usan Node 24).
- pnpm 10.

```sh
pnpm install
pnpm exec playwright install --with-deps chromium   # una vez, para build y capturas
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo en `localhost:4321`. Para agentes: `astro dev --background`. |
| `pnpm build` | `astro build` + `_headers` y `dist/data/`. Es el build de producción (el de Cloudflare). |
| `pnpm build:astro` | Solo `astro build`, sin capturas ni encabezados. Para iterar rápido. |
| `pnpm preview` | Sirve `dist/` localmente. |
| `pnpm test` | Pruebas unitarias de `src/lib` con Vitest. |
| `pnpm check` | `astro check` (tipos de archivos `.astro`). |
| `pnpm capturas` | Genera `dist/og/*.png` y las capturas móviles en `dist-capturas/`. |
| `pnpm capturas:og` | Igual, pero escribe las og en `public/og/` para versionarlas. |
| `pnpm headers` | Genera `dist/_headers` y copia `data/*.json` a `dist/data/`. |
| `pnpm headers:verificar` | Carga el build en Playwright y falla si hay violaciones de CSP. |
| `pnpm revision` | Capturas de todas las rutas en 360/400/768/1280 px, claro y oscuro. Falla por desborde horizontal o etiquetas fuera del meme. |
| `pnpm lighthouse` | Lighthouse móvil de las cinco rutas. Falla con rendimiento < 90 o accesibilidad < 95. |
| `pnpm actualizar-fmi` | Descarga, valida y escribe `data/pib.json`. Ver abajo. |

`LA_REMONTADA_HOY=AAAA-MM-DD pnpm build` fija la fecha de compilación (útil para
pruebas reproducibles y para el nombre de la carpeta de capturas).

## Estructura

```
src/pages/        /, /victima, /ranking, /victima/numeros, /ranking/numeros
src/components/   Meme, Etiqueta, NotaRealidad, BotonDescarga, …
src/islands/      islas con JavaScript solo en las páginas de números
src/lib/          interpolar, ranking, victimas, notas y modelo (funciones puras)
src/styles/       tokens.css: colores, fuentes y estilos base
data/             pib.json y paises.json (datos del FMI versionados)
memes/            puertas.json y escalera.json (posiciones de etiquetas)
public/memes/     imágenes base de los memes
scripts/          actualizar-fmi, capturas-og, headers, revision-visual, lighthouse
tests/            pruebas de src/lib
docs/PRD.md       especificación
```

### Calibrar las etiquetas de los memes

Desde la raíz del repositorio:

```sh
npx serve .
# abrir http://localhost:3000/memes/preview.html
```

La vista previa tiene una **copia** de los JSON en su `CONFIG`; después de
editar `memes/*.json`, hay que volver a pegarla ahí.

## Actualización de los datos del FMI

El FMI publica el World Economic Outlook en abril y octubre. El flujo está en
`.github/workflows/datos-fmi.yml`:

1. Se ejecuta a mano (`workflow_dispatch`, con una edición esperada opcional) o
   en abril y octubre, todos los días del 5 al 25 a las 13:17 UTC.
2. `node scripts/actualizar-fmi.ts --crudos crudos --resumen resumen.md`
   descarga la API del FMI con `curl`, escribe `data/pib.json` y **valida**:
   unos 190 países, Venezuela presente en 2019–2027 y sin saltos anuales
   absurdos. Si algo falla, el script **sale con código 1**, no toca
   `data/pib.json` y el job falla. No hay forma de publicar datos inválidos.
3. Corre `pnpm test`.
4. Archiva los archivos crudos en MEGA S4 (`fmi/weo-AAAA-MM/`). Si faltan los
   secretos, deja un aviso y guarda los crudos como artefacto de Actions.
5. Abre un Pull Request en la rama `datos-fmi/AAAA-MM` con el resumen
   "Venezuela pasa del puesto X al Y; nueva próxima víctima: Z". **Nunca hace
   push a `main` ni despliega**: un humano revisa y aprueba el PR.

El PR se abre con el `GITHUB_TOKEN` del repositorio. GitHub no dispara los
workflows de `pull_request` para eventos creados con ese token, así que los
checks de **Revisión** no corren solos en ese PR; el workflow ya ejecutó
`pnpm test` antes de abrirlo. Si se quieren los checks completos, se puede
relanzar **Revisión** a mano (`workflow_dispatch`) o configurar un token
personal como secreto y usarlo en `create-pull-request`.

Al fusionar el PR, el workflow **Publicar** reconstruye y despliega solo.

Opciones del script:

```sh
node scripts/actualizar-fmi.ts --validar           # valida el data/pib.json actual
node scripts/actualizar-fmi.ts --edicion "octubre 2026"
node scripts/actualizar-fmi.ts --crudos crudos --resumen resumen.md
```

`scripts/generar-paises.mjs` se corre a mano cuando el FMI agrega o quita un
país; el resultado (`data/paises.json`) se revisa y se versiona.

## Publicación

**Decisión:** Cloudflare Workers (assets estáticos) compila y despliega con su
integración Git (build `pnpm build`, deploy `npx wrangler deploy`, directorio raíz
`/`, variable `NODE_VERSION=22.23.4`; `wrangler.jsonc` sirve `dist/`). El nombre
del Worker debe coincidir con `name` en `wrangler.jsonc`. Su imagen
de build no trae Chromium, así que las `og:image` no se generan allí: se
generan en Actions y se **versionan en `public/og/`**, de donde Astro las copia
al build.

Flujo (`.github/workflows/publicar.yml`):

1. Push a `main`, ejecución manual o llamada del cron mensual.
2. Instala dependencias y Chromium, corre pruebas y compila (`pnpm build`:
   `astro build` + `_headers` + `dist/data/`).
3. Verifica la CSP cargando el build en Playwright: cero violaciones.
4. `pnpm capturas:og` (con `CAPTURAS_ESTRICTO=1`) escribe `public/og/*.png`
   (1200×630) y las capturas móviles del día en `dist-capturas/`.
5. Archiva las capturas móviles en MEGA S4 (`meme-diario/AAAA-MM-DD/`) y las
   sube como artefacto.
6. Si las `og:image` cambiaron, las commitea a `main` y Cloudflare compila por
   el push. Si no, llama al deploy hook (`CF_DEPLOY_HOOK`) para recompilar.

`.github/workflows/recompilar-mensual.yml` llama a **Publicar** el día 1 de cada
mes a las 09:00 UTC (05:00 en Venezuela), para que el meme cambie cuando cae un
país. Las series son mensuales: el ranking no cambia entre dos meses.

### Analítica

Cloudflare Web Analytics se activa en el panel del proyecto de Cloudflare. Se
inyecta el beacon automáticamente; no hay que tocar el HTML. La CSP generada ya
permite `https://static.cloudflareinsights.com` (script) y
`https://cloudflareinsights.com` (conexión).

### Encabezados y caché

`dist/_headers` **no se escribe a mano**: lo genera `scripts/headers.ts`
después del build. La CSP calcula el hash sha256 de cada `<script>` en línea de
`dist/**/*.html`, así que un script nuevo no requiere actualizar hashes a mano.
No usa `unsafe-eval`; los scripts no llevan `unsafe-inline` (los estilos sí,
por los estilos en línea de Astro y de las etiquetas).

Reglas (Cloudflare **suma** las que coinciden; las específicas quitan la caché
corta de `/*` con `! Cache-Control` y fijan la suya):

| Ruta | Caché |
| --- | --- |
| `/_astro/*` | `max-age=31536000, immutable` |
| `/memes/*` y `/og/*` | `max-age=86400` (la og se regenera en cada recompilación) |
| `/data/*` | `max-age=300` |
| resto (HTML) | `max-age=0, must-revalidate` |

Además: `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
mínima, `X-Frame-Options: DENY` y `frame-ancestors 'none'`.

### Rendimiento

`astro.config.mjs` fija `vite.build.assetsInlineLimit = 0`: sin eso, Vite
incrusta las ~270 banderas SVG de `flag-icons` como data URI en el CSS (más de
400 KB) y se descargan todas. Con archivos separados solo baja la bandera que
la página usa, como pide el PRD. El servidor de pruebas de Playwright comprime
con gzip para parecerse a Cloudflare.

## Secretos de GitHub Actions

Ninguno vive en el repositorio. Se configuran en
**Settings → Secrets and variables → Actions**:

| Secreto | Para qué |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Desplegar en Cloudflare Pages (permiso Pages: Edit). |
| `CLOUDFLARE_ACCOUNT_ID` | Cuenta de Cloudflare del proyecto. |
| `MEGA_S4_ENDPOINT` | URL del endpoint S3 de MEGA S4. |
| `MEGA_S4_BUCKET` | Bucket donde se archivan crudos y capturas. |
| `MEGA_S4_ACCESS_KEY_ID` | Credencial de MEGA S4. |
| `MEGA_S4_SECRET_ACCESS_KEY` | Credencial de MEGA S4. |

`GITHUB_TOKEN` lo provee Actions automáticamente; el workflow del FMI solo
pide `contents: write` y `pull-requests: write`, y nunca empuja a `main`.

## Revisión de Pull Requests

`.github/workflows/pr.yml` corre en cada PR: pruebas, `astro check`, build,
capturas de las cinco rutas en 360/400/768/1280 px y en claro/oscuro, y
Lighthouse móvil. El PR falla si:

- hay desborde horizontal a 360 px;
- una etiqueta `[data-etiqueta]` se sale de su `[data-meme]` (si las páginas aún
  no tienen esos atributos, la comprobación se omite con un aviso);
- el rendimiento móvil queda por debajo de 90 o la accesibilidad por debajo de
  95 en `/`, `/victima`, `/ranking`, `/victima/numeros` o `/ranking/numeros`;
- hay violaciones de CSP (se verifican en el build).

Las capturas quedan como artefacto del workflow.

## Preguntas abiertas del PRD

Siguen abiertas. No se resolvieron por su cuenta:

- [ ] **Fecha de inicio de las víctimas.** Se usa la propuesta del PRD, enero
      de 2026, en una sola constante: `INICIO_VICTIMAS` en `src/config.ts`.
- [ ] **Descargas con Cloudflare Zaraz.** No implementado; v1 no cuenta
      descargas.
- [ ] **Metas numéricas de las métricas.** Sin definir.
- [ ] **Web Share en celular.** No implementado; solo está la descarga.
- [ ] **Crédito de las imágenes base.** Falta confirmar autoría y cómo dar
      crédito antes de publicar.

También queda pendiente el respaldo `canvas` de la descarga si la doble captura
de Safari no alcanza; no forma parte de las preguntas abiertas, pero está en el
PRD como plan B.
