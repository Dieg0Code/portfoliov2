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
