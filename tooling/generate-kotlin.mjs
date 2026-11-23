import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url)),
  version = "7.27.0",
  checksum = "db9c4b738727698748746144394cb7ee96512fe50166555baaeeca9311ee1dba",
  jar = join(root, ".tools", `openapi-generator-cli-${version}.jar`),
  target = join(root, "packages/sdk-kotlin");
mkdirSync(join(root, ".tools"), { recursive: true });
if (!existsSync(jar)) {
  const r = await fetch(
    `https://repo.maven.apache.org/maven2/org/openapitools/openapi-generator-cli/${version}/openapi-generator-cli-${version}.jar`,
  );
  if (!r.ok) throw Error("Generator download failed: " + r.status);
  writeFileSync(jar, Buffer.from(await r.arrayBuffer()));
}
if (createHash("sha256").update(readFileSync(jar)).digest("hex") !== checksum)
  throw Error("Generator checksum mismatch");
// This directory contains generated code only. Never place application code here.
rmSync(target, { recursive: true, force: true });
const args = [
  "-jar",
  jar,
  "generate",
  "-i",
  join(root, "packages/contracts/openapi.json"),
  "-g",
  "kotlin",
  "-o",
  target,
  "--library",
  "jvm-retrofit2",
  "--additional-properties",
  "packageName=com.wuxinbo.videox.api,serializationLibrary=moshi,useCoroutines=true,enumPropertyNaming=UPPERCASE,hideGenerationTimestamp=true",
  "--global-property",
  "apis,models,supportingFiles=CollectionFormats.kt:UUIDAdapter.kt,apiTests=false,modelTests=false,apiDocs=false,modelDocs=false",
];
const result = spawnSync("java", args, { cwd: root, encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(result.stderr + result.stdout);
  process.exit(result.status ?? 1);
}
writeFileSync(
  join(target, "README.md"),
  "# Generated Kotlin API\n\n由 packages/contracts/openapi.json 生成，禁止手工修改。运行 `pnpm contracts:generate`。OpenAPI Generator " +
    version +
    "，SHA-256 " +
    checksum +
    "。\n\nAndroid 使用此处的模型与 Retrofit suspend 接口；业务状态与 UI 保留在 apps/android。\n",
);
console.log(
  "Kotlin API generated from the same OpenAPI document as TypeScript.",
);
