import { Database } from "../platform/db.js";
import { config } from "../platform/config.js";
import { runScan } from "../modules/imports/scan.js";
import { runLookup } from "../modules/sources/service.js";
import { runMove, recoverMoves } from "../modules/imports/moves.js";
const db = new Database(config.databaseUrl, true);
db.boss.on("error", (error) => console.error("worker error", error.message));
await db.boss.start();
await db.boss.work<{ mediaId: string; revision: number }>(
  "catalog.changed",
  async (jobs) => {
    for (const job of jobs)
      console.log(
        JSON.stringify({
          event: "catalog.changed",
          jobId: job.id,
          ...job.data,
        }),
      );
  },
);
await db.boss.work<{ batchId: string }>("media.scan", async (jobs) => {
  for (const job of jobs) await runScan(db, job.data.batchId, config.mediaRoot);
});
await db.boss.work<{ id: string }>("metadata.lookup", async (jobs) => {
  for (const job of jobs) await runLookup(db, job.data.id);
});
await db.boss.work<{ id: string }>("media.move", async (jobs) => {
  for (const j of jobs) await runMove(db, config.mediaRoot, j.data.id);
});
await recoverMoves(db);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void db.close().then(() => process.exit(0));
  });
console.log(
  "video-x worker ready; catalog events, file scanning and metadata lookups",
);
