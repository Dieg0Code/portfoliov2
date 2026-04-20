# Design System Strategy: The Archive Aesthetic

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**
This design system moves away from the fluid, rounded "app-like" web and returns to the tactile authority of a high-end physical archive or a modernist gallery catalog. It is a system built on the tension between the organic warmth of Bone White and the cold, surgical precision of terminal-inspired typography.

The "Archive Aesthetic" rejects the generic "SaaS-look" by embracing **Brutalist Minimalism**. We do not use shadows to create depth; we use tonal stacking and razor-sharp architectural lines. By abandoning border radii entirely, we lean into a structural, uncompromising aesthetic that feels both retro-technical and sophisticatedly modern.

---

## 2. Colors: Tonal Architecture
The palette is a dialogue between extreme light and deep dark. We do not use vibrant colors; we use "ink" and "paper."

### The "No-Line" Rule
Traditional 1px solid borders for sectioning are strictly prohibited. Layout boundaries must be defined through **Background Color Shifts**. To separate a section, transition from `surface` to `surface-container-low`. Use the `outline` token only for structural skeletal frames, never as a decorative container outline.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets of fine, heavy-weight paper. 
- **Base Layer:** `surface` (#fcf9f1) for the main canvas.
- **Content Blocks:** Use `surface-container` tiers to create hierarchy. A project description might sit on `surface-container-low`, while a code snippet or detail card sits on `surface-container-high`.
- **The Depth Exception:** While shadows are generally avoided, "Glassmorphism" is permitted for persistent floating navigation. Use `surface` at 80% opacity with a `20px` backdrop-blur to allow the content beneath to bleed through, softening the brutalist edges without losing the sharp 0px silhouette.

### 2.1 The Accent Stamp
The palette admits exactly one accent — **International Orange `#b8471e`** — used as a stamp, not as a theme. Think of the red wax seal on an archivist's envelope: rare, intentional, and reserved for signaling state (live data, active section, focus ring, warnings). If the accent appears in more than three places within a single viewport, it has lost its job. Never use it for backgrounds, body text, primary CTAs, or micrographic assets — the CTA remains ink, and the archive's voice remains bone-and-ink first.

Variants: `--accent` (base), `--accent-soft` (hover), `--accent-deep` (pressed / on-dark), `--accent-wash` (8% tint fills), `--accent-line` (35% tint borders).

### Signature Textures
To add "soul" to the minimalist palette, use a very subtle noise grain overlay (3-5% opacity) across the `background`. For primary CTAs, use a subtle linear gradient from `primary` (#000000) to `primary-container` (#3c3b3b) at a 45-degree angle. This creates a "lathe-cut" metallic feel that feels more premium than a flat hex code.

---

## 3. Typography: The Modernist Monotype
The typography is a study in contrast: high-impact, clean Sans-Serif headers meet the technical precision of Monospaced labels.

- **Display & Headlines (`Inter`):** These are the "Art Directors" of the page. Large, bold, and tightly tracked. They should feel like lead-type printing.
- **Labels & Navigation (`Space Grotesk` or Monospaced):** These are the "Technicians." Every detail, metadata point, and navigation link must be in a monospaced font to evoke the terminal aesthetic.
- **Hierarchy of Authority:** 
    - `display-lg` is reserved for project titles.
    - `label-md` (Monospace) is used for "01 // INTRODUCTION" style headers to ground the design in a modernist system.

---

## 4. Elevation & Depth: Tonal Layering
In this system, "Elevation" is not height; it is "Weight." 

### The Layering Principle
Depth is achieved by stacking `surface-container` tiers. 
- **Level 0 (Floor):** `surface-container-lowest`
- **Level 1 (Card):** `surface-container-low`
- **Level 2 (In-Card Detail):** `surface-container`

### The "Ghost Border" Fallback
If a visual separator is required for accessibility (e.g., in a high-density list), use a **Ghost Border**. This is a 1px line using `outline-variant` at 15% opacity. It should be barely perceptible, felt rather than seen.

### Interactive Depth
When an element is hovered (like a card), do not use a shadow. Instead, shift the background color from `surface` to `surface-container-highest` or apply a 1px `primary` border. This "Internal Expansion" is more consistent with the brutalist aesthetic than an external shadow.

---

## 5. Components: The Brutalist Toolkit

### Buttons (Sharp & Intentional)
- **Primary:** `primary` background, `on-primary` text. 0px border-radius. Padding: `12px 24px`. Text must be `label-md` (Monospace, All-Caps).
- **Secondary:** `surface` background, 1px `outline` border. On hover, the background fills to `primary` and text flips to `on-primary`.
- **Tertiary:** Text-only, monospaced, with a 1px `primary` underline that grows on hover.

### Input Fields
- **Default:** Transparent background with a 1px `outline-variant` bottom-border only. 
- **Focus:** The bottom-border transitions to `primary` and 2px thickness. No rounded corners. Labels sit above the field in `label-sm` monospaced.

### Lists & Tables
- **Prohibition:** Forbid divider lines. Use `surface-container` alternating row colors (zebra striping) or generous vertical whitespace (e.g., 32px) to define list items.
- **The "Terminal" List:** Use monospaced font for all list data to maintain the archival vibe.

### Cards
- Cards must have **0px border-radius**. 
- Background: `surface-container-low`.
- Content should be padded by at least `32px` to emphasize the "minimalist" vibe.

### Signature Component: The "Data-Header"
For every page or section, include a small monospaced "Metadata Block" in the top right:
> `LOC: /PROJECTS/01`
> `STATUS: COMPLETED`
> `TS: 2023.10.12`
This reinforces the retro-modern terminal theme.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use intentional asymmetry. Offset images by 20px from the text grid to create a bespoke, editorial feel.
- **Do** lean into "Overlapping." Let a monospaced label slightly overlap the edge of a sharp-cornered image.
- **Do** use generous whitespace. If you think there is enough space, double it.

### Don't:
- **Don't** use border-radius. Not even 2px. Sharpness is the brand.
- **Don't** use standard drop shadows. If depth is needed, use a "Hard Shadow" (0px blur, 4px offset, `primary` color at 10% opacity) to mimic offset printing.
- **Don't** use icons unless they are stroke-based and technical (e.g., `1px` weight). Avoid filled, "bubbly" icon sets.