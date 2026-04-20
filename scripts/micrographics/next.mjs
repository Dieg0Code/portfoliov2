import {
  getNumberOption,
  getOption,
  printEntries,
  readOrSyncManifest
} from "./lib.mjs";

const manifest = readOrSyncManifest();
const count = getNumberOption("--count", 5);
const status = getOption("--status", "mapped");
const entries = manifest.components
  .filter((entry) => entry.status === status)
  .slice(0, count);

printEntries(`Next ${entries.length} components with status "${status}":`, entries);
