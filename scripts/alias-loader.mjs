/**
 * Resolve the `@/*` path alias (and extensionless TS imports) when running the
 * project's TypeScript directly under Node, which does not read tsconfig paths.
 *
 *   node --import ./scripts/alias-loader.mjs scripts/some-script.ts
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function withExtension(path) {
  if (existsSync(path)) return path;
  for (const candidate of [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return path;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = withExtension(resolve(ROOT, "src", specifier.slice(2)));
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  }
});
