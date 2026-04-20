# Gemini Project Context: portfoliov2

This project is a high-end personal portfolio built with a focus on "The Archive Aesthetic"—a design direction inspired by physical archive catalogs and modernist gallery systems. It features a custom micrographics workflow for managing and implementing technical UI primitives.

## Project Overview

- **Architecture:** Next.js (App Router) with TypeScript.
- **Visual Direction:** "The Digital Curator" (Brutalist Minimalism).
  - **Colors:** Bone White (`#fcf9f1`) and surgical Black (`#000000`).
  - **Typography:** `Inter` for display headers, `Space Mono` or `Space Grotesk` for technical labels and navigation.
  - **Rules:** 0px border-radius, tonal stacking instead of shadows, background color shifts for sectioning.
- **Core Libraries:**
  - `motion`: For architectural and interactive transitions.
  - `Pretext`: For advanced, measurement-accurate editorial text layouts.
  - `playwright-cli`: For visual verification and interaction testing.

## Key Directories

- `src/app/`: Next.js App Router routes and layouts.
- `src/components/`: React UI components.
  - `src/components/home/`: Page-specific components for the landing experience.
  - `src/components/micrographics/`: Derived React components from vendor SVG assets.
- `src/lib/`: Typed registries and domain logic.
- `scripts/micrographics/`: Automation tools for the micrographics conversion workflow.
- `docs/`: Technical documentation and source assets (Micrographics Vol. 1).
- `data/`: Workflow state and manifest files.

## Building and Running

### Development Commands
- `npm run dev`: Start the Next.js development server.
- `npm run build`: Generate a production build.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint checks.
- `npm run typecheck`: Execute TypeScript type verification.

### Micrographics Workflow
The project implements a structured "Micrographics" pipeline to convert vendor SVGs into semantic React components.
- `npm run micro:report`: Inspect the current state of implementation (mapped vs implemented).
- `npm run micro:sync`: Synchronize the typed registry (`src/lib/micrographics/registry.ts`) with the naming maps.
- `npm run micro:claim -- --count <n> --by <name>`: Reserve a batch of components for implementation.
- `npm run micro:mark -- --ids <id1,id2> --status <status>`: Update the progress of specific components.

## Development Conventions

### Styling & Layout
- **The "No-Line" Rule:** Do not use 1px solid borders for sectioning. Use background shifts (e.g., `surface` to `surface-container-low`) to define boundaries.
- **Sharpness:** Maintain a strict `0px` border-radius across all components.
- **Tonal Layering:** Achieve depth by stacking `surface-container` tiers instead of using drop shadows.
- **Interactive Depth:** On hover, use background color shifts or internal 1px borders rather than external shadows.

### Coding Standards
- **Micrographics:** New components must use semantic `PascalCase` names and follow the mapping in `docs/component-library-name-map.md`.
- **Validation:** Always run `npm run lint` and `npm run typecheck` before finalizing changes.
- **Editorial Text:** Use `Pretext` selectively for high-impact headlines to ensure precise multiline measurement without layout reflow.

## Agent Guidelines
- Refer to `AGENTS.md` for detailed agent-specific workflows and tool preferences.
- When implementing micrographics, always check `micro:report` first to avoid collisions.
- Use `UI UX Pro Max skill` for design-intelligence reasoning and visual reviews.
