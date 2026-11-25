import { globSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const roots = [
  "apps/admin/src",
  "apps/web/src",
  "packages/ui/src",
  "packages/design-tokens",
];
const publicPackages = new Set([
  "@video-x/ui",
  "@video-x/design-tokens",
  "@video-x/contracts",
  "@video-x/sdk-ts",
]);
const sources = roots
  .flatMap((dir) =>
    globSync(dir + "/**/*.{ts,tsx,js,jsx,mts,mjs,css}", { cwd: root }),
  )
  .map((f) => f.split(sep).join("/"));
const errors = new Set();
const local = (path) => relative(root, path).split(sep).join("/");
const inside = (path, dir) => path === dir || path.startsWith(dir + "/");
const owner = (path) => roots.find((dir) => inside(path, dir));

function inspect(from, spec, kind) {
  const dir = owner(from);
  let reason;
  if (spec.startsWith(".")) {
    const target = local(resolve(root, dirname(from), spec.split(/[?#]/)[0]));
    if (owner(target) !== dir)
      reason = "相对依赖超出本模块目录，请使用共享包的公开入口";
    else if (inside(from, dir + "/shared") && !inside(target, dir + "/shared"))
      reason = "shared 依赖了上层页面";
  } else if (spec.startsWith("@video-x/") && !publicPackages.has(spec))
    reason = "请引用共享包的公开入口";
  else if (spec.startsWith("/") && kind !== "url-token")
    reason = "模块请使用相对路径或工作区包名";
  if (reason) errors.add(`${from} → ${spec} · ${reason}`);
}

for (const path of sources) {
  const dir = owner(path);
  if (
    dir.startsWith("apps/") &&
    !/^(main\.tsx|vite-env\.d\.ts|(?:app|shared)\/.+|features\/[^/]+\/.+)$/.test(
      path.slice(dir.length + 1),
    )
  ) {
    errors.add(path + " 应归入 app、shared 或 features/<业务>。");
  }
  if (!path.endsWith(".css")) {
    const source = readFileSync(resolve(root, path), "utf8");
    if (/^packages\/ui\/src\/index\.tsx?$/.test(path)) {
      const entry = ts.createSourceFile(path, source, ts.ScriptTarget.Latest);
      if (
        path.endsWith(".tsx") ||
        entry.statements.some(
          (node) =>
            !ts.isExportDeclaration(node) ||
            !node.moduleSpecifier ||
            !node.exportClause ||
            !ts.isNamedExports(node.exportClause),
        )
      )
        errors.add(
          path + " 应只显式转出各组件的公共 API，组件实现归入对应目录。",
        );
    }
    // 类型导入同样会把公共组件与某个页面的内部实现绑在一起。
    for (const ref of ts.preProcessFile(source, true, true).importedFiles)
      inspect(path, ref.fileName, "module");
  }
}

// 逐个读取样式文件，包含尚未接入页面的 @import 和相对资源地址。
await build({
  absWorkingDir: root,
  entryPoints: sources.filter((path) => path.endsWith(".css")),
  outdir: "out",
  outbase: ".",
  bundle: true,
  write: false,
  logLevel: "silent",
  plugins: [
    {
      name: "web-boundaries",
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === "entry-point") return;
          inspect(local(args.importer), args.path, args.kind);
          return { path: args.path, external: true };
        });
      },
    },
  ],
});
if (errors.size) {
  console.error([...errors].sort().join("\n"));
  process.exitCode = 1;
} else console.log(`Web 源码归属与静态依赖检查通过 · ${sources.length} 个文件`);
