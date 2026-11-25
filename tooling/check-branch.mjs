import { execFileSync } from "node:child_process";

const branch =
  process.argv[2] ??
  execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
const topic = /^feat\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!topic.test(branch)) {
  console.error(
    `工作分支「${branch || "detached HEAD"}」不符合命名约定。示例：feat/film-catalog。可传入待核对的分支名，详见 CONTRIBUTING.md。`,
  );
  process.exitCode = 1;
} else {
  console.log(`工作分支命名通过 · ${branch}`);
}
