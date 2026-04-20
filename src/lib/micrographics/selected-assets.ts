import "server-only";

import fs from "node:fs";
import path from "node:path";

const docsRoot = path.join(
  process.cwd(),
  "docs",
  "Micrographics Vol.1 - Fox Rockett Studio"
);

const selectedAssetFiles = {
  epochTransformVerificationPanel: [
    "Editable Text",
    "SVG - Editable Text",
    "Micrographics Vol.1 - Editable 16.svg"
  ],
  timeEngineSyncBanner: [
    "Editable Text",
    "SVG - Editable Text",
    "Micrographics Vol.1 - Editable 31.svg"
  ],
  restartBandwidthProgressDial: [
    "Editable Text",
    "SVG - Editable Text",
    "Micrographics Vol.1 - Editable 47.svg"
  ],
  digitalOutputChannelPanel: [
    "Editable Text",
    "SVG - Editable Text",
    "Micrographics Vol.1 - Editable 58.svg"
  ],
  concentricArcRadarScale: [
    "Components Library",
    "SVG",
    "Micrographics Vol.1 - Component 14.svg"
  ],
  arrowHeaderCard: [
    "Components Library",
    "SVG",
    "Micrographics Vol.1 - Component 116.svg"
  ],
  orbitArcDivider: [
    "Components Library",
    "SVG",
    "Micrographics Vol.1 - Component 131.svg"
  ],
  globeGridBadge: [
    "Components Library",
    "SVG",
    "Micrographics Vol.1 - Component 150.svg"
  ]
} as const;

type SelectedAssetKey = keyof typeof selectedAssetFiles;

export type SelectedMicrographicMarkup = Record<SelectedAssetKey, string>;

function cleanMarkup(markup: string, scope: string) {
  return markup
    .replace(/^<\?xml[\s\S]*?\?>\s*/u, "")
    .replace(/\bcls-(\d+)\b/gu, `${scope}-cls-$1`)
    .trim();
}

export function loadSelectedMicrographics(): SelectedMicrographicMarkup {
  const entries = Object.entries(selectedAssetFiles).map(([key, segments]) => {
    const filePath = path.join(docsRoot, ...segments);
    const markup = fs.readFileSync(filePath, "utf8");
    return [key, cleanMarkup(markup, key)] as const;
  });

  return Object.fromEntries(entries) as SelectedMicrographicMarkup;
}
