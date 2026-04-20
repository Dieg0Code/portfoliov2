import {
  getActor,
  getNumberOption,
  printEntries,
  readOrSyncManifest,
  updateManifestEntries
} from "./lib.mjs";

const manifest = readOrSyncManifest();
const count = getNumberOption("--count", 5);
const actor = getActor();
const idsToClaim = new Set(
  manifest.components
    .filter((entry) => entry.status === "mapped")
    .slice(0, count)
    .map((entry) => entry.id)
);

if (idsToClaim.size === 0) {
  console.log("No mapped components are available to claim.");
  process.exit(0);
}

const claimedAt = new Date().toISOString();
const nextManifest = updateManifestEntries(manifest, (entry) => {
  if (!idsToClaim.has(entry.id)) {
    return entry;
  }

  return {
    ...entry,
    status: "claimed",
    claimedBy: actor,
    claimedAt
  };
});

const claimedEntries = nextManifest.components.filter((entry) =>
  idsToClaim.has(entry.id)
);

printEntries(`Claimed ${claimedEntries.length} components for ${actor}:`, claimedEntries);
