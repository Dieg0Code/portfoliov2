# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Production build
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc --noEmit (no test framework configured)

# Micrographics workflow
npm run micro:report  # Show current workflow state (claimed/unclaimed/done)
npm run micro:claim   # Claim a batch of components to implement
npm run micro:mark    # Update component status
npm run micro:sync    # Regenerate typed registry from naming maps
npm run micro:next    # Helper utility

# Ataxx arena (models live in the ataxx-zero-ai repo)
../ataxx-zero-ai/.venv/Scripts/python.exe scripts/assemble-arena-bundle.py --bundle ../ataxx-zero-ai/build/arena
../ataxx-zero-ai/.venv/Scripts/python.exe scripts/verify-arena-models.py parity --bundle ../ataxx-zero-ai/build/arena
../ataxx-zero-ai/.venv/Scripts/python.exe -m unittest discover -s tests   # runtime + every model answers
node --import ./scripts/alias-loader.mjs scripts/verify-heuristics-port.ts <fixtures.json>
```

## Architecture

**Next.js 15 App Router**, TypeScript strict mode, no testing framework. Path alias: `@/*` → `./src/*`.

### Server / Client split

`src/app/page.tsx` is a Server Component that calls `loadSelectedMicrographics()` (reads SVG files from `docs/` at build/request time) and passes the result as props to `<HomePage>`. Everything interactive lives in client components marked `"use client"`.

### Content & localisation

All copy lives in `src/components/home/content.ts` as typed `homeContent: Record<"es" | "en", HomeContentBundle>`. The locale is client state in `home-page.tsx`; changing it calls `setLocale` inside `startTransition`. No i18n library is used.

### Micrographics pipeline

Vendor SVGs in `docs/` are immutable source assets from Fox Rockett Studio. The pipeline turns them into typed React components:

1. `data/micrographics-manifest.json` tracks workflow state (unclaimed → claimed → done) for ~150 items.
2. `src/lib/micrographics/registry.ts` is auto-generated — do not hand-edit.
3. Each component in `src/components/micrographics/` is a thin wrapper that passes SVG markup through `InlineSvgAsset` (`dangerouslySetInnerHTML`).
4. `src/lib/micrographics/selected-assets.ts` is the server-side loader for the 8 assets currently used on the homepage.

Agent workflow: `report` → `claim` → implement component → `mark` done.

### Ataxx arena (section 03 of the index)

The third tab of the index (`#arena`) is a playable ladder of every opponent the
Ataxx Zero project ever had, in chronological order: six hand-written heuristics
followed by fifteen trained generations.

- `src/lib/ataxx/board.ts` is a faithful TS mirror of `nemesis_runtime/board.py`
  (itself a mirror of the training env). It must stay byte-identical in behaviour:
  a history produced in the browser has to replay to the same position on the
  inference function, and the ported heuristics depend on identical scoring.
- `src/lib/ataxx/heuristics.ts` ports `src/agents/heuristic.py` from ataxx-zero-ai.
  Verified move-for-move against the Python original — regenerate fixtures with
  `scripts/dump-heuristic-fixtures.py` and diff with `scripts/verify-heuristics-port.ts`.
- `src/lib/ataxx/ladder.ts` is the ladder itself: order, unlock thresholds, lore.
  Rung ids must match `api/models/manifest.json` (a test enforces this).
- `api/engine.py` is a Python serverless function at `/api/engine` that serves the
  models over ONNX. It is deliberately **not** under `/api/arena`, because the
  Next route handlers own that prefix.
- Models are build artifacts, not source: exported from the ataxx-zero-ai repo by
  `scripts/export_arena_bundle.py` and assembled into `api/models/` by
  `scripts/assemble-arena-bundle.py`. Most ship int8-quantized to fit the 250 MB
  serverless limit; the two whose behaviour quantization changed ship fp32.
- Identity is an unverified email bound to an HMAC-signed HttpOnly cookie
  (`src/lib/ataxx/session-token.ts`). It is a leaderboard name, not auth — never
  gate anything sensitive on it. Finished games are replayed server-side in
  `src/app/api/arena/match/route.ts` before being stored.

### Animation pattern

`MotionReveal` (`src/components/home/motion-reveal.tsx`) is the standard wrapper. It uses Framer Motion's `LazyMotion` + `domAnimation` with intersection-observer-triggered variants (`rise`, `slide-left`, `slide-right`) and optional hover effects (`lift-sm`, `lift-md`). Always respects `prefers-reduced-motion`.

Scroll-section detection in `home-page.tsx` uses `requestAnimationFrame`-throttled scroll listeners (not IntersectionObserver) to drive the active section tone (light/dark).

### Design system — The Archive Aesthetic

Defined in `DESIGN.md`. Key rules that affect code:
- **Zero border-radius** everywhere.
- **Tonal stacking** instead of shadows (use `--surface-container-low` / `--surface-container`).
- Palette: Bone White `#fcf9f1` (`--surface`) and Black `#0f0f10` (`--ink`).
- Design tokens are CSS custom properties in `src/app/globals.css`; use them, do not hardcode hex values.
- Typography: Inter for body/display, Space Mono / Space Grotesk for labels and technical metadata.

### Micrographic component pattern

```tsx
// All micrographic wrappers follow this shape:
export function ArrowHeaderCard({ assets, ...props }: ArrowHeaderCardProps) {
  return <InlineSvgAsset markup={assets.arrowHeaderCard} {...props} />;
}
```

`assets` is the typed object returned by `loadSelectedMicrographics()`, threaded down as props — never loaded client-side.
