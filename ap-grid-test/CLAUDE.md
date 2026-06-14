# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`ap-grid-test` is a React 19 + TypeScript single-page app scaffolded with Vite. Everything lives in a single `src/App.tsx` rendering an **AG Grid** (v35) employee data table — sorting, filtering, a quick-filter search box, pagination, and a `light | dark | system` theme toggle. Despite the name, this is an AG Grid demo, not a CSS-grid experiment.

Specifics worth knowing:

- AG Grid v35 requires explicit module registration (`ModuleRegistry.registerModules([AllCommunityModule])`) at module load, or the grid renders blank.
- Styling uses the Theming API (`themeQuartz.withParams(...)` passed as the `theme` prop), not imported CSS theme files. Light/dark param sets are selected at runtime via the `data-ag-theme-mode` attribute on the grid wrapper; `usePrefersDark()` tracks the OS color scheme.
- MUI / Emotion are installed but not yet used in `App.tsx`.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # Type-check (tsc -b) then produce a production bundle in dist/
npm run lint     # Run ESLint over the project
npm run preview  # Serve the built dist/ locally
```

There is no test runner configured.

## Architecture notes

- **Build pipeline**: `npm run build` runs `tsc -b` (project-references build) *before* `vite build`. A type error fails the build, so type-check failures surface at build time rather than only in the editor.
- **TypeScript project references**: `tsconfig.json` is a solution file that references `tsconfig.app.json` (app sources under `src/`) and `tsconfig.node.json` (Vite/ESLint config files). Compiler options live in those two files, not the root.
- **Vite on Rolldown/Oxc**: This uses Vite 8 with `@vitejs/plugin-react` (Oxc-based) and `rolldown` as the bundler — newer than the classic esbuild/Rollup stack. The React Compiler is intentionally not enabled (see README).
- **Static assets**: Files imported from `src/assets/` (e.g. `import heroImg from './assets/hero.png'`) are processed/hashed by Vite. Files in `public/` (`icons.svg`, `favicon.svg`) are served at the root path and referenced by absolute URL — e.g. `<use href="/icons.svg#github-icon">` uses SVG sprite symbols from `public/icons.svg`.
- **Entry chain**: `index.html` → `src/main.tsx` (mounts `<App>` in `<StrictMode>` on `#root`) → `src/App.tsx`. Global styles in `src/index.css`, component styles in `src/App.css`.

## Linting

ESLint 10 flat config (`eslint.config.js`) uses `typescript-eslint` recommended rules plus `react-hooks` and `react-refresh` plugins; `dist` is ignored. Type-aware lint rules are not enabled (see README for how to opt in).
