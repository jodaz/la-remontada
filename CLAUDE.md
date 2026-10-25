# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

This is an Astro 7 project created from the `basics` starter template. Building hasn't started: `src/pages/index.astro` still renders the starter `Welcome.astro` inside `Layout.astro`, so replace that content rather than extend it.

The starter-pack assets are already in place:
- `docs/PRD.md`: the spec
- `src/styles/tokens.css`: design tokens
- `memes/*.json`: calibrated label positions
- `memes/preview.html`: the calibration preview
- `public/memes/*.jpg`: the base images

## Commands

The package manager is pnpm (`pnpm-lock.yaml`), and Node must be >= 22.23.4 (`engines` in `package.json`).

- `pnpm install`: install dependencies
- `pnpm dev`: dev server at `localhost:4321` (for agents, prefer `astro dev --background` as described in AGENTS.md)
- `pnpm build`: production build to `./dist/`
- `pnpm preview`: serve the built site locally
- `pnpm astro check`: type-check `.astro` files. This needs `@astrojs/check` and `typescript`, which aren't installed yet.

No test runner, linter, or formatter is configured yet.

## Architecture

- `astro.config.mjs` is empty (`defineConfig({})`): no integrations (React, Tailwind, MDX, etc.) and no adapter, so the site is fully static output.
- TypeScript uses `astro/tsconfigs/strict`.
- File-based routing from `src/pages/`; shared page shell in `src/layouts/Layout.astro`; components in `src/components/`; images that Astro processes go in `src/assets/`, while static files served as-is go in `public/`.
