import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("..", import.meta.url));
function snapshot() {
  const result = {};
  function visit(path) {
    for (const e of readdirSync(path, { withFileTypes: true })) {
      const f = join(path, e.name);
      if (e.isDirectory()) visit(f);
      else
        result[relative(root, f)] = createHash("sha256")
          .update(readFileSync(f))
          .digest("hex");
    }
  }
  for (const p of ["packages/sdk-kotlin", "packages/sdk-ts/src"])
    visit(join(root, p));
  result.openapi = createHash("sha256")
    .update(readFileSync(join(root, "packages/contracts/openapi.json")))
    .digest("hex");
  return result;
}
const before = snapshot(),
  run = spawnSync("pnpm", ["contracts:generate"], {
    cwd: root,
    stdio: "inherit",
  });
if (run.status !== 0) process.exit(run.status ?? 1);
const after = snapshot();
const drift = [
  ...new Set([...Object.keys(before), ...Object.keys(after)]),
].filter((k) => before[k] !== after[k]);
if (drift.length) {
  console.error("Generated contract drift:", drift);
  process.exit(1);
}
console.log("OpenAPI, TypeScript and Kotlin generation is reproducible.");
