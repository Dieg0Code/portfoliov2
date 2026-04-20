# AGENTS.md

## Scope

This repo is a `Next.js` + `TypeScript` portfolio with a custom micrographics system and an experimental text-layout direction.

## Primary Tooling

- `npm`: default package manager and task runner for app work.
- `Next.js`: app framework. Use App Router conventions under `src/app/`.
- `uv`: preferred runner for Python utilities, scripts, and one-off Python tooling.
- `playwright-cli`: available for browser automation, UI inspection, screenshots, and interaction testing.
- `UI UX Pro Max skill`: installed design-intelligence skill for design systems, visual direction, layout patterns, palette choices, typography, and UX review before implementation.
- `Pretext`: preferred experimental library for advanced editorial text layout. Use it selectively for special sections, not as the default layout engine for the whole site.

## Project Areas

- `src/app/`: routes, layouts, page composition.
- `src/components/`: React UI and derived micrographics components.
- `src/lib/`: typed registries, utilities, and shared domain logic.
- `docs/Micrographics Vol.1 - Fox Rockett Studio/`: vendor source assets. Treat as immutable source material.
- `data/micrographics-manifest.json`: shared workflow state for micrographics conversion.

## Micrographics Rules

- Keep vendor filenames and source SVGs unchanged inside `docs/`.
- Derived React components must use semantic `PascalCase` names.
- Prefer `Editable Text` over `Non-Editable Text` when text may need to change later.
- Use `Components Library` for decorative primitives, dividers, frames, badges, and diagrams.
- Use the naming maps in `docs/component-library-name-map.md` and `docs/editable-text-name-map.md` as the source of truth.

## Commands

- `npm run dev`: start the app.
- `npm run build`: production build.
- `npm run lint`: lint checks.
- `npm run typecheck`: TypeScript checks.
- `npm run micro:report`: inspect current micrographics workflow state.
- `npm run micro:claim -- --count 5 --by <agent>`: claim the next batch.
- `npm run micro:mark -- --ids 1,2,3 --status implemented`: mark progress.
- `npm run micro:sync`: regenerate typed micrographics registry from the naming maps.

## Agent Workflow

- Query the repo state before acting; do not rely on chat history as workflow state.
- For micrographics work: `micro:report` -> `micro:claim` -> implement -> `micro:mark`.
- Validate app changes with `npm run lint` and `npm run typecheck`.
- Run `npm run build` before finalizing larger UI or architecture changes.
- Use `playwright-cli` when browser behavior or visual verification matters.
