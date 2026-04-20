import {
  getIdListOption,
  getOption,
  printEntries,
  readOrSyncManifest,
  updateManifestEntries
} from "./lib.mjs";

const manifest = readOrSyncManifest();
const ids = getIdListOption("--ids");
const status = getOption("--status", null);
const componentDir = getOption("--component-dir", null);
const notes = getOption("--notes", null);

if (ids.length === 0) {
  throw new Error("Missing --ids. Example: npm run micro:mark -- --ids 1,2,3 --status implemented");
}

if (!status) {
  throw new Error("Missing --status. Use mapped, claimed, component-ready, or implemented.");
}

const targetIds = new Set(ids);
const nextManifest = updateManifestEntries(manifest, (entry) => {
  if (!targetIds.has(entry.id)) {
    return entry;
  }

  return {
    ...entry,
    status,
    claimedBy: status === "claimed" ? entry.claimedBy : null,
    claimedAt: status === "claimed" ? entry.claimedAt : null,
    componentPath: componentDir
      ? `${componentDir.replace(/\\/g, "/").replace(/\/$/, "")}/${entry.name}.tsx`
      : entry.componentPath,
    notes: notes ?? entry.notes
  };
});

const updatedEntries = nextManifest.components.filter((entry) =>
  targetIds.has(entry.id)
);

printEntries(`Updated ${updatedEntries.length} components to "${status}":`, updatedEntries);
