---
name: micrographics-catalog
description: Selects, categorizes, and implements Fox Rockett Studio micrographics for this portfolio repo. Use when choosing assets for hero sections, headers, cards, sidebars, CTAs, backgrounds, naming new derived components, or converting selected SVGs into React components while following the repo micrographics workflow.
---

# Micrographics Catalog

## Overview

Use this skill to turn the Fox Rockett Studio asset pack in `docs/Micrographics Vol.1 - Fox Rockett Studio/` into a coherent component system for this portfolio. It helps pick the right assets, prefer the editable set, reuse the semantic naming maps, and follow the repo workflow for claiming, implementing, and tracking converted components.

## Source Of Truth

- `docs/component-library-name-map.md`: semantic names, visual categories, and portfolio-use groupings for the base geometric library.
- `docs/editable-text-name-map.md`: semantic names, editorial categories, portfolio-use groupings, and the current MVP shortlist for text-bearing assets.
- `data/micrographics-manifest.json`: shared workflow state for claimed and implemented items.
- `AGENTS.md`: repo conventions, micrographics commands, naming rules, and verification expectations.

## Selection Rules

1. Prefer `Editable Text` when the piece already contains editorial copy and we may want to adapt, translate, or rebuild that text in HTML/CSS later.
2. Use `Components Library` for decorative motifs, dividers, frames, badges, dials, or diagrams that do not depend on embedded text.
3. Treat `Non-Editable Text` as fallback only when the exact typography must remain frozen as vector outlines.
4. Keep vendor files unchanged inside `docs/`. Any derived React component should use the semantic name from the mapping docs.
5. When several assets solve the same problem, choose the quieter option first and keep the louder asset as an accent.

## Quick Workflow

1. Identify the layout role: hero, section header, project card, sidebar, timeline, CTA, or background texture.
2. Read the relevant index in `docs/component-library-name-map.md` or `docs/editable-text-name-map.md`.
3. Shortlist 3 to 5 candidates with their asset IDs and semantic names.
4. If implementation work starts, run `npm run micro:claim -- --count 5 --by <agent>` or claim the exact IDs you will touch through the repo workflow.
5. Build the derived React component under `src/components/` using the semantic component name.
6. Keep the original SVG source in `docs/` untouched; do not rename vendor files.
7. After completion, update workflow state with `npm run micro:mark -- --ids ... --status implemented`.
8. If the naming maps changed, regenerate the typed registry with `npm run micro:sync`.

## Recommendation Format

When using this skill to recommend assets, return a compact shortlist where each item includes:

- asset ID and semantic name
- why it fits the requested slot
- whether it should stay as raw SVG, become a React wrapper, or be partially rebuilt in HTML/CSS
- any caution about copy specificity or visual weight

## Implementation Guidance

- Preserve the established semantic names from the mapping docs; do not invent alternate names unless the catalog is being updated first.
- For text-heavy editable assets, prefer exposing copy as props only if the layout can survive text replacement cleanly.
- For purely geometric assets, keep the implementation lightweight and reusable: color, size, stroke, and orientation are good prop candidates.
- If a family is clearly rotational or variant-based, note the family relationship, but do not over-abstract on the first implementation pass.
- Verify visual fidelity against the source SVG before marking the component as implemented.

## Starter Reference

Load `references/selection-guide.md` when you need a fast shortlist or a starting combination for the portfolio MVP.
