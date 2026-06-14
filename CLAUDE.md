# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

`react-trials` is a sandbox holding two **independent, unconnected** projects — there is no root package.json, no workspace tooling, and no git. Each subdirectory is its own project with its own dependencies and toolchain. Always `cd` into the relevant project before running commands.

- `ap-grid-test/` — React 19 + TypeScript frontend (Vite), an AG Grid demo. Uses **npm**.
- `backend/` — Bun + Hono HTTP server. Uses **Bun** (`bun install`, not npm).

The frontend does not call the backend; they are separate experiments. There is also a nested `ap-grid-test/CLAUDE.md` with frontend-specific build/lint/tsconfig detail.

## ap-grid-test (frontend)

```bash
cd ap-grid-test
npm install
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b (type-check) THEN vite build -> dist/; a type error fails the build
npm run lint     # ESLint over the project
npm run preview  # serve built dist/ locally
```

No test runner is configured.

Key architectural points:

- **Single-component app**: everything lives in `src/App.tsx`. `index.html` → `src/main.tsx` (mounts `<App>` in `<StrictMode>` on `#root`) → `src/App.tsx`. Despite the name "ap-grid-test", this is an **AG Grid** demo (employee data table), not a CSS-grid experiment.
- **AG Grid v35 module + theming API**: Community features must be registered explicitly via `ModuleRegistry.registerModules([AllCommunityModule])` at module load — without this the grid renders blank. Styling uses the Theming API (`themeQuartz.withParams(...)`) passed as the `theme` prop, **not** imported CSS theme files. Light/dark param sets are keyed by mode name and selected at runtime via the `data-ag-theme-mode` attribute on the grid wrapper.
- **Theme follows the OS**: `usePrefersDark()` tracks `prefers-color-scheme`; a manual `light | dark | system` toggle overrides it (`system` defers to the OS).
- **MUI / Emotion are installed** (`@mui/material`, `@emotion/*`) but not yet used in `App.tsx`.
- **Modern Vite stack**: Vite 8 with `@vitejs/plugin-react` (Oxc-based) on the Rolldown bundler — newer than the classic esbuild/Rollup stack. TypeScript ~6.0, ESLint 10 flat config (`eslint.config.js`). The React Compiler is intentionally not enabled.
- **TypeScript project references**: root `tsconfig.json` is a solution file referencing `tsconfig.app.json` (src) and `tsconfig.node.json` (config files); compiler options live in those, not the root.

## backend

```bash
cd backend
bun install
bun run dev      # bun run --hot src/index.ts -> http://localhost:3000
```

A minimal Hono app in `src/index.ts` exporting the app as the default export (Bun serves it on port 3000). `tsconfig.json` sets `jsxImportSource: "hono/jsx"`, so JSX here compiles for Hono's JSX runtime, not React.
