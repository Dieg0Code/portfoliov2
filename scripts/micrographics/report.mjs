import { readOrSyncManifest } from "./lib.mjs";

const manifest = readOrSyncManifest();
const counts = manifest.components.reduce(
  (accumulator, entry) => {
    accumulator[entry.status] = (accumulator[entry.status] ?? 0) + 1;
    return accumulator;
  },
  {
    mapped: 0,
    claimed: 0,
    "component-ready": 0,
    implemented: 0
  }
);

console.log(`Micrographics report (${manifest.total} total)`);
console.log(`  mapped: ${counts.mapped}`);
console.log(`  claimed: ${counts.claimed}`);
console.log(`  component-ready: ${counts["component-ready"]}`);
console.log(`  implemented: ${counts.implemented}`);
