import { printEntries, syncManifest } from "./lib.mjs";

const manifest = syncManifest();
const preview = manifest.components.slice(0, 5);

console.log(
  `Synced ${manifest.total} mapped components from ${manifest.source} into data/micrographics-manifest.json.`
);
printEntries("Preview:", preview);
