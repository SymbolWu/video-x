import { PgBoss } from "pg-boss";
export async function migrateQueue(url: string) {
  const boss = new PgBoss({ connectionString: url });
  await boss.start();
  await boss.createQueue("catalog.changed", {
    retryLimit: 3,
    retryDelay: 2,
    expireInSeconds: 60,
  });
  await boss.createQueue("media.scan", {
    retryLimit: 2,
    retryDelay: 5,
    expireInSeconds: 60 * 60 * 4,
  });
  await boss.createQueue("metadata.lookup", {
    retryLimit: 3,
    retryDelay: 5,
    expireInSeconds: 180,
  });
  await boss.createQueue("media.move", {
    retryLimit: 3,
    retryDelay: 2,
    expireInSeconds: 86400,
  });
  await boss.stop();
}
