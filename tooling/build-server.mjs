import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["http", "worker", "migrate", "account", "seed", "openapi"].map(
    (x) => "apps/server/src/entrypoints/" + x + ".ts",
  ),
  outdir: "apps/server/dist/entrypoints",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
  external: [
    "fastify",
    "@fastify/*",
    "pg",
    "pg-boss",
    "drizzle-orm",
    "drizzle-orm/*",
    "dotenv",
    "@sinclair/typebox",
    "ajv",
    "ajv-formats",
  ],
});
