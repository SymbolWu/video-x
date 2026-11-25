import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Database, sql } from "../src/platform/db.js";
import { migrationsPath } from "../src/platform/config.js";
import { migrateQueue } from "../src/platform/queue.js";
import { createAccount } from "../src/modules/identity/service.js";
import { seedFixtures, ids } from "../src/platform/fixtures.js";
import { createApp } from "../src/app.js";
import {
  mkdtemp,
  writeFile,
  symlink,
  rm,
  unlink,
  appendFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { runMove, recoverMoves } from "../src/modules/imports/moves.js";
import { stat, mkdir, readFile, rename } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { runScan } from "../src/modules/imports/scan.js";
import { runLookup } from "../src/modules/sources/service.js";
import { parseSearch, parseDetail } from "../src/modules/sources/javdb.js";
import type { MetadataProvider } from "../src/modules/sources/providers.js";
let db: Database,
  app: Awaited<ReturnType<typeof createApp>>,
  admin: pg.Pool,
  token: string,
  profileId: string,
  testName: string;
const password = "test-only-" + randomBytes(20).toString("hex");
const headers = () => ({ authorization: "Bearer " + token });
const request = (
  method: "GET" | "POST" | "PATCH" | "PUT",
  url: string,
  payload?: object,
) => app.inject({ method, url, headers: headers(), payload });
const detail = async () => {
  const r = await request("GET", "/api/media/" + ids.media);
  assert.equal(r.statusCode, 200, r.body);
  return r.json();
};
before(async () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw Error(
      "TEST_DATABASE_URL must point to a *_test database. No production connection is inferred.",
    );
  const url = new URL(value);
  assert.ok(
    url.pathname.endsWith("_test"),
    "Test base URL must end with _test",
  );
  testName = "video_x_test_" + randomBytes(6).toString("hex");
  url.pathname = "/postgres";
  admin = new pg.Pool({ connectionString: url.href });
  await admin.query("CREATE DATABASE " + testName);
  url.pathname = "/" + testName;
  db = new Database(url.href);
  await migrate(db.orm, { migrationsFolder: migrationsPath });
  await migrate(db.orm, { migrationsFolder: migrationsPath });
  await migrateQueue(url.href);
  await db.boss.start();
  await seedFixtures(db);
  profileId = await createAccount(db, "test-owner", password, "测试片库");
  app = await createApp(db);
  const r = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      username: "test-owner",
      password,
      installationId: randomUUID(),
      clientKind: "android",
      deviceName: "Integration test",
    },
  });
  assert.equal(r.statusCode, 200, r.body);
  token = r.json().token;
});
after(async () => {
  if (app) await app.close();
  if (db) await db.close();
  if (admin) {
    if (testName)
      await admin.query(
        "DROP DATABASE IF EXISTS " + testName + " WITH (FORCE)",
      );
    await admin.end();
  }
});
test("private catalog requires a live session and public readiness checks real dependencies", async () => {
  assert.equal((await app.inject("/api/media")).statusCode, 401);
  assert.equal((await app.inject("/api/health/ready")).statusCode, 200);
  const r = await request("GET", "/api/auth/me");
  assert.equal(r.json().id, profileId);
  assert.equal(r.json().password_hash, undefined);
});
test("password hashes and token digests are stored instead of credentials, and only one owner can be initialized", async () => {
  const [a] = await db.query(sql`SELECT password_hash FROM video_x.accounts`);
  assert.ok(a!.password_hash.startsWith("scrypt$"));
  assert.ok(!a!.password_hash.includes(password));
  const [s] = await db.query(sql`SELECT token_hash FROM video_x.auth_sessions`);
  assert.equal(s!.token_hash.length, 32);
  assert.notEqual(s!.token_hash.toString(), token);
  await assert.rejects(() =>
    createAccount(db, "second-owner", password, "second"),
  );
});
test("browser sessions are HttpOnly and same-site; cookie writes need an allowed origin", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { origin: "http://127.0.0.1:5180" },
    payload: {
      username: "test-owner",
      password,
      installationId: randomUUID(),
      clientKind: "web",
      deviceName: "Web test",
    },
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().token, null);
  const cookie = String(r.headers["set-cookie"]);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const bad = await app.inject({
    method: "POST",
    url: "/api/categories",
    headers: { cookie: cookie.split(";")[0]! },
    payload: { name: "Unsafe" },
  });
  assert.equal(bad.statusCode, 403);
  const good = await app.inject({
    method: "POST",
    url: "/api/categories",
    headers: { cookie: cookie.split(";")[0]!, origin: "http://127.0.0.1:5180" },
    payload: { name: "测试分类" },
  });
  assert.equal(good.statusCode, 200, good.body);
});
test("only enabled business tables are applied and each entity category is a single required foreign key", async () => {
  const [count] = await db.query(
    sql`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='video_x' AND table_type='BASE TABLE'`,
  );
  assert.equal(count!.n, 36);
  const r = await request("POST", "/api/people", {
    fullName: "演员",
    categoryId: randomUUID(),
  });
  assert.equal(r.statusCode, 400, r.body);
  assert.equal(
    (
      await request("POST", "/api/people", {
        fullName: "演员",
        categoryId: [ids.cinema, ids.independent],
      })
    ).statusCode,
    400,
  );
});
test("category filtering includes descendants and page totals match filtered rows", async () => {
  const all = await request(
    "GET",
    "/api/media?categoryId=" + ids.cinema + "&pageSize=2&page=1",
  );
  assert.equal(all.statusCode, 200, all.body);
  assert.equal(all.json().total, 3);
  assert.equal(all.json().items.length, 2);
  const next = await request(
    "GET",
    "/api/media?categoryId=" + ids.cinema + "&pageSize=2&page=2",
  );
  assert.equal(next.json().items.length, 1);
  assert.ok(
    !all
      .json()
      .items.some((x: { id: string }) => x.id === next.json().items[0].id),
  );
});
test("both sort directions keep unknown years last, and detailed actor names participate in search", async () => {
  for (const direction of ["asc", "desc"]) {
    const r = await request(
      "GET",
      "/api/media?sort=year&direction=" + direction,
    );
    assert.equal(r.statusCode, 200, r.body);
    assert.equal(r.json().items.at(-1).id, ids.media3);
    assert.equal(
      r.json().items[0].id,
      direction === "asc" ? ids.media : ids.media2,
    );
  }
  const q = await request("GET", "/api/media?q=Shen");
  assert.equal(q.json().total, 3);
  const literal = await request("GET", "/api/media?q=%25");
  assert.equal(literal.json().total, 0);
  assert.equal((await request("GET", "/api/media?sort=count")).statusCode, 400);
  assert.equal((await request("GET", "/api/people?sort=year")).statusCode, 400);
});
test("actor and series have their own category, query and stable sort", async () => {
  const people = await request(
    "GET",
    "/api/people?categoryId=" + ids.independent + "&sort=count&direction=asc",
  );
  assert.equal(people.json().total, 1);
  assert.equal(people.json().items[0].id, ids.actor);
  const series = await request(
    "GET",
    "/api/franchises?categoryId=" +
      ids.independent +
      "&sort=name&direction=asc",
  );
  assert.equal(series.json().total, 1);
  assert.equal(series.json().items[0].workCount, 3);
  for (const [route, id] of [
    ["people", ids.actor],
    ["franchises", ids.franchise],
  ]) {
    const profile = await request("GET", "/api/" + route + "/" + id);
    assert.equal(profile.statusCode, 200, profile.body);
    const facts = profile.json();
    assert.equal(facts.record.id, id);
    assert.equal(facts.firstYear, 2024);
    assert.equal(facts.lastYear, 2025);
    assert.deepEqual(
      facts.cast,
      route === "people" ? [] : [people.json().items[0].fullName],
    );
    assert.equal(
      (await request("GET", "/api/" + route + "/" + randomUUID())).statusCode,
      404,
    );
  }
});
test("personal favorite, rating and watched state are independent and cancelable", async () => {
  let m = await detail();
  let r = await request("PATCH", "/api/media/" + ids.media + "/state", {
    expectedRevision: m.stateRevision,
    isFavorite: true,
    rating: 4,
  });
  assert.equal(r.statusCode, 200, r.body);
  m = r.json();
  assert.equal(m.rating, 4);
  assert.equal(m.watchedAt, null);
  r = await request("PATCH", "/api/media/" + ids.media + "/state", {
    expectedRevision: m.stateRevision,
    watched: true,
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().rating, 4);
  assert.equal(r.json().isFavorite, true);
  assert.ok(r.json().watchedAt);
  r = await request("PATCH", "/api/media/" + ids.media + "/state", {
    expectedRevision: r.json().stateRevision,
    rating: null,
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().rating, null);
  assert.equal(r.json().isFavorite, true);
  assert.ok(r.json().watchedAt);
});
test("metadata save supports explicit clearing and does not alter personal state or actor/series categories", async () => {
  const before = await detail();
  const incomplete = await request("PATCH", "/api/media/" + ids.media, {
    expectedRevision: before.revision,
    title: "日期不完整",
  });
  assert.equal(incomplete.statusCode, 400);
  assert.equal(incomplete.json().code, "DATE_REQUIRED");
  assert.equal((await detail()).revision, before.revision);
  const r = await request("PATCH", "/api/media/" + ids.media, {
    expectedRevision: before.revision,
    releaseDate: "2024-02-29",
    title: "资料编辑后的片名",
    summary: null,
    categoryId: ids.cinema,
  });
  assert.equal(r.statusCode, 200, r.body);
  const after = r.json();
  assert.equal(after.summary, null);
  assert.equal(after.isFavorite, before.isFavorite);
  assert.equal(after.stateRevision, before.stateRevision);
  assert.equal(after.actors[0].categoryId, ids.independent);
  assert.equal(after.franchises[0].categoryId, ids.independent);
  assert.equal(after.revision, before.revision + 1);
});
test("editing the still gallery preserves the cover and directors independently of cast", async () => {
  const [one, two] =
    await db.query(sql`INSERT INTO video_x.assets(storage_key,sha256,mime_type,size_bytes,width,height,state) VALUES
    ('fixture/one',decode(repeat('01',32),'hex'),'image/png',10,1,1,'ready'),
    ('fixture/two',decode(repeat('02',32),'hex'),'image/png',10,1,1,'ready') RETURNING id`);
  const save = async (changes: object) => {
    const prior = await detail();
    const response = await request("PATCH", "/api/media/" + ids.media, {
      expectedRevision: prior.revision,
      ...changes,
    });
    assert.equal(response.statusCode, 200, response.body);
    return response.json();
  };
  const updated = await save({
    posterId: one!.id,
    stillIds: [one!.id, two!.id],
    directorIds: [ids.actor],
  });
  assert.deepEqual(updated.stillIds, [one!.id, two!.id]);
  assert.equal(updated.directors[0].id, ids.actor);
  const replaced = await save({ stillIds: [two!.id], directorIds: [] });
  assert.deepEqual(replaced.stillIds, [two!.id]);
  assert.equal(replaced.posterId, one!.id);
  assert.equal(replaced.actors[0].id, ids.actor);
  assert.deepEqual(replaced.directors, []);
});
test("concurrent saves with the same revision accept one and reject one", async () => {
  const m = await detail();
  const results = await Promise.all(
    ["并发 A", "并发 B"].map((title) =>
      request("PATCH", "/api/media/" + ids.media, {
        expectedRevision: m.revision,
        title,
      }),
    ),
  );
  assert.deepEqual(results.map((x) => x.statusCode).sort(), [200, 409]);
});
test("invalid relations roll back both metadata and the queued event", async () => {
  const before = await detail(),
    [count] = await db.query(
      sql`SELECT count(*)::int n FROM pgboss.job WHERE name='catalog.changed'`,
    );
  const r = await request("PATCH", "/api/media/" + ids.media, {
    expectedRevision: before.revision,
    title: "不能保存",
    actorIds: [randomUUID()],
  });
  assert.equal(r.statusCode, 400, r.body);
  const after = await detail();
  assert.equal(after.title, before.title);
  assert.equal(after.revision, before.revision);
  const [end] = await db.query(
    sql`SELECT count(*)::int n FROM pgboss.job WHERE name='catalog.changed'`,
  );
  assert.equal(end!.n, count!.n);
});
test("empty relationship arrays really remove relations without losing media or personal state", async () => {
  const before = await detail(),
    r = await request("PATCH", "/api/media/" + ids.media, {
      expectedRevision: before.revision,
      actorIds: [],
      franchiseIds: [],
    });
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(r.json().actors, []);
  assert.deepEqual(r.json().franchises, []);
  assert.equal(r.json().isFavorite, before.isFavorite);
});
test("collection normalization, member replacement and revision conflicts are enforced", async () => {
  const r = await request("POST", "/api/collections", { name: "Weekend" });
  assert.equal(r.statusCode, 200, r.body);
  const folder = r.json();
  assert.equal(
    (await request("POST", "/api/collections", { name: " weekend " }))
      .statusCode,
    409,
  );
  const add = await request("PUT", `/api/collections/${folder.id}/items`, {
    expectedRevision: folder.revision,
    mediaIds: [ids.media2, ids.media],
  });
  assert.equal(add.statusCode, 200, add.body);
  assert.deepEqual(add.json().mediaIds, [ids.media2, ids.media]);
  assert.equal(
    (
      await request("PUT", `/api/collections/${folder.id}/items`, {
        expectedRevision: folder.revision,
        mediaIds: [],
      })
    ).statusCode,
    409,
  );
  const list = await request(
    "GET",
    `/api/media?collectionId=${folder.id}&sort=name&direction=asc`,
  );
  assert.equal(list.json().total, 2);
  const same = await request("GET", "/api/collections");
  assert.deepEqual(same.json()[0].mediaIds, [ids.media2, ids.media]);
});
test("state revision and request schemas prevent stale or cross-profile overwrites", async () => {
  const m = await detail();
  assert.equal(
    (
      await request("PATCH", "/api/media/" + ids.media + "/state", {
        expectedRevision: 0,
        isFavorite: false,
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await request("PATCH", "/api/media/" + ids.media + "/state", {
        expectedRevision: m.stateRevision,
        rating: 8,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await request("PATCH", "/api/media/" + ids.media + "/state", {
        expectedRevision: m.stateRevision,
        isFavorite: false,
        profileId: randomUUID(),
      })
    ).statusCode,
    400,
  );
});
test("business update and queue enqueue roll back together, and persisted jobs survive a queue restart", async () => {
  const [before] = await db.query(
    sql`SELECT count(*)::int n FROM pgboss.job WHERE name='catalog.changed'`,
  );
  await assert.rejects(() =>
    db.transaction(async (tx) => {
      await tx.emit({ mediaId: ids.media, revision: 999 });
      throw Error("rollback test");
    }),
  );
  const [after] = await db.query(
    sql`SELECT count(*)::int n FROM pgboss.job WHERE name='catalog.changed'`,
  );
  assert.equal(after!.n, before!.n);
  await db.boss.stop();
  await db.boss.start();
  const jobs = await db.boss.fetch<{ mediaId: string; revision: number }>(
    "catalog.changed",
    { batchSize: 100 },
  );
  assert.ok(jobs.length > 0);
  assert.ok(jobs.every((x) => x.data.revision !== 999));
  for (const job of jobs) await db.boss.complete("catalog.changed", job.id);
  assert.equal((await db.boss.fetch("catalog.changed")).length, 0);
});
test("malformed, unsupported and oversized request bodies remain client errors", async () => {
  for (const [contentType, payload, status] of [
    ["application/json", "{broken", 400],
    ["application/x-www-form-urlencoded", "unexpected=body", 415],
    ["application/json", JSON.stringify({ data: "x".repeat(1048576) }), 413],
  ] as const) {
    const result = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { ...headers(), "content-type": contentType },
      payload,
    });
    assert.equal(result.statusCode, status, result.body);
    assert.equal(result.json().code, "INVALID_REQUEST_BODY");
    assert.equal(result.json().stack, undefined);
  }
  assert.equal((await request("GET", "/api/auth/me")).statusCode, 200);
});
test("real MP4/MKV scans are repeatable, isolate bad inputs and require current review before publishing", async (t) => {
  const importRoot = await mkdtemp(join(tmpdir(), "video-x-import-"));
  const local = await createApp(db, false, importRoot);
  const call = (
    method: "POST" | "GET" | "PUT",
    url: string,
    payload?: object,
  ) => local.inject({ method, url, headers: headers(), payload });
  const run = async () => {
    const started = await call("POST", "/api/imports/scan");
    assert.equal(started.statusCode, 200, started.body);
    const again = await call("POST", "/api/imports/scan");
    assert.equal(again.json().id, started.json().id);
    const job = await db.boss.fetch<{ batchId: string }>("media.scan");
    assert.equal(job[0]?.data.batchId, started.json().id);
    await runScan(db, started.json().id, importRoot);
    await db.boss.complete("media.scan", job[0]!.id);
  };
  try {
    assert.equal((await call("POST", "/api/imports/scan")).statusCode, 409);
    const marker = randomUUID();
    await writeFile(join(importRoot, ".video-x-root"), marker);
    const mp4 = join(importRoot, "样片.mp4"),
      mkv = join(importRoot, "样片二.MKV");
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:size=160x90:rate=10",
      "-t",
      "22",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      mp4,
    ]);
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-i",
      mp4,
      "-c",
      "copy",
      mkv,
    ]);
    await writeFile(join(importRoot, "损坏.mp4"), "not a movie");
    await symlink(mp4, join(importRoot, "链接.mp4"));
    await run();
    await run();
    const queue = async () => (await call("GET", "/api/imports")).json();
    let rows = await queue();
    assert.equal(rows.total, 3);
    assert.equal(rows.scanning, false);
    const [bad] = (await call("GET", "/api/imports?status=blocked")).json()
      .items;
    assert.equal(bad.probeStatus, "failed");
    const review = (id: string, expectedRevision: number) =>
      call("POST", "/api/imports/" + id + "/review", { expectedRevision });
    const publish = (id: string, expectedRevision: number) =>
      call("POST", "/api/imports/" + id + "/publish", { expectedRevision });
    assert.equal((await review(bad.id, bad.revision)).statusCode, 409);
    const item = rows.items.find((r: { format: string }) => r.format === "mp4");
    assert.equal(item.videoCodec, "h264");
    assert.ok(item.durationMs >= 1000);
    assert.ok(
      rows.items.some((r: { format: string }) => r.format === "matroska"),
    );
    assert.equal((await publish(item.id, item.revision)).statusCode, 409);
    async function completeDate(row: typeof item) {
      const response = await call("PUT", "/api/imports/" + row.id, {
        expectedRevision: row.revision,
        fields: { ...row.fields, releaseYear: 2024, releaseDate: "2024-02-29" },
      });
      assert.equal(response.statusCode, 200, response.body);
      return response.json();
    }
    const invalid = await call("PUT", "/api/imports/" + item.id, {
      expectedRevision: item.revision,
      fields: { ...item.fields, releaseYear: 2024 },
    });
    assert.equal(invalid.statusCode, 400);
    const dated = await completeDate(item);
    const reviewed = await review(item.id, dated.revision);
    assert.equal(reviewed.statusCode, 200, reviewed.body);
    const fields = {
      ...dated.fields,
      title: "M2 已核对样片",
      summary: "人工填写",
      actorIds: [ids.actor],
      franchiseIds: [ids.franchise],
      categoryId: ids.cinema,
    };
    const edit = await call("PUT", "/api/imports/" + item.id, {
      fields,
      expectedRevision: reviewed.json().revision,
    });
    assert.equal(edit.statusCode, 200, edit.body);
    assert.equal(edit.json().reviewed, false);
    assert.equal(
      (await publish(item.id, reviewed.json().revision)).statusCode,
      409,
    );
    const current = await review(item.id, edit.json().revision);
    const saved = await Promise.all([
      publish(item.id, current.json().revision),
      publish(item.id, current.json().revision),
    ]);
    assert.deepEqual(
      saved.map((r) => r.statusCode),
      [200, 200],
    );
    const media = saved[0]!.json().publishedMediaId;
    assert.equal(saved[1]!.json().publishedMediaId, media);
    const formal = (await call("GET", "/api/media/" + media)).json();
    assert.equal(formal.title, fields.title);
    assert.equal(formal.linkedFileCount, 1);
    assert.equal(
      (
        await call("GET", "/api/imports?q=" + encodeURIComponent("M2 已核对"))
      ).json().total,
      1,
    );
    assert.ok(
      (await call("GET", "/api/imports?status=missing")).json().total > 0,
    );
    assert.equal(formal.actors[0].id, ids.actor);
    assert.equal(formal.franchises[0].id, ids.franchise);
    const [part] = await db.query(
      sql`SELECT p.bound_content_revision FROM video_x.edition_parts p JOIN video_x.editions e ON e.id=p.edition_id WHERE e.media_id=${media}`,
    );
    assert.equal(Number(part!.bound_content_revision), 1);
    await t.test(
      "binary transport, actual start, cross-device takeover and millisecond resume",
      async () => {
        const plan = async (intent = "play") =>
          (
            await call("POST", "/api/playback/plans", {
              mediaId: media,
              intent,
            })
          ).json();
        const newToken = (
          await local.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
              username: "test-owner",
              password,
              installationId: randomUUID(),
              clientKind: "android",
              deviceName: "Other player",
            },
          })
        ).json().token;
        const send = (tokenFor: string, url: string, body: object) =>
          local.inject({
            method: "POST",
            url,
            headers: { authorization: "Bearer " + tokenFor },
            payload: body,
          });
        const create = (key: string, credential = token, intent = "play") =>
          send(credential, "/api/playback/sessions", {
            requestId: key,
            mediaId: media,
            intent,
          });
        const id = randomUUID(),
          one = (await create(id)).json();
        assert.equal(one.positionMs, 0);
        assert.equal((await create(id)).json().sessionId, id);
        const read = (method: "GET" | "HEAD", range?: string, auth = token) =>
          local.inject({
            method,
            url: one.streamUrl,
            headers: {
              authorization: "Bearer " + auth,
              ...(range ? { range } : {}),
            },
          });
        const head = await read("HEAD");
        assert.equal(head.statusCode, 200);
        assert.equal(head.body, "");
        const length = Number(head.headers["content-length"]);
        assert.ok(length > 100);
        const slice = await read("GET", "bytes=2-9");
        assert.equal(slice.statusCode, 206);
        assert.equal(slice.rawPayload.length, 8);
        assert.equal(slice.headers["content-range"], "bytes 2-9/" + length);
        assert.equal((await read("GET", "bytes=-7")).rawPayload.length, 7);
        assert.equal(
          (await read("HEAD", "bytes=8-")).headers["content-length"],
          String(length - 8),
        );
        assert.equal(
          (await read("GET", "bytes=" + length + "-")).statusCode,
          416,
        );
        assert.equal((await read("GET", "bytes=2-1")).statusCode, 416);
        assert.equal((await read("GET", "bytes=0-0,2-3")).statusCode, 416);
        assert.equal((await read("GET", undefined, newToken)).statusCode, 404);
        assert.equal((await local.inject(one.streamUrl)).statusCode, 401);
        const report = (
          session: string,
          credential: string,
          seq: number,
          kind: string,
          positionMs: number,
          eventId = randomUUID(),
        ) =>
          send(credential, "/api/playback/sessions/" + session + "/events", {
            seq,
            eventId,
            kind,
            partId: one.partId,
            positionMs,
          });
        assert.equal(
          (await report(id, token, 1, "progress", 0)).statusCode,
          409,
        );
        const eventId = randomUUID();
        assert.equal(
          (await report(id, token, 1, "start", 0, eventId)).json().status,
          "ack",
        );
        assert.equal(
          (await report(id, token, 1, "start", 0, eventId)).json().status,
          "ack",
        );
        assert.equal(
          (await report(id, token, 3, "seek", 20750)).json().status,
          "ack",
        );
        assert.equal(
          (await report(id, token, 2, "pause", 1000)).json().status,
          "stale",
        );
        assert.equal((await plan()).positionMs, 20750);
        assert.equal(
          (await report(id, token, 4, "seek", 7350)).json().status,
          "ack",
        );
        const other = randomUUID(),
          two = (await create(other, newToken, "resume")).json();
        assert.equal(two.positionMs, 7350);
        assert.equal(
          (await report(id, token, 5, "pause", 15000)).json().status,
          "taken_over",
        );
        assert.equal(
          (await report(other, newToken, 1, "start", 0)).statusCode,
          409,
        );
        assert.equal((await plan()).positionMs, 7350);
        assert.equal(
          (await report(other, newToken, 1, "start", 7440)).statusCode,
          200,
        );
        assert.equal(
          (await report(other, newToken, 2, "pause", 21200)).json().status,
          "ack",
        );
        assert.equal((await plan()).positionMs, 21200);
        assert.equal((await plan()).completed, false);
        const failed = randomUUID();
        assert.equal((await create(failed)).json().positionMs, 21200);
        assert.equal(
          (await send(token, "/api/playback/sessions/" + failed + "/close", {}))
            .statusCode,
          200,
        );
        assert.equal((await plan()).positionMs, 21200);
        const fin = randomUUID();
        await create(fin);
        await report(fin, token, 1, "start", 21200);
        assert.equal(
          (await report(fin, token, 2, "ended", 22000)).json().status,
          "ack",
        );
        assert.equal((await plan()).completed, true);
        assert.equal((await plan()).mode, "restart");
        const [count] = await db.query(
          sql`SELECT count(*)::int n FROM video_x.playback_sessions WHERE media_id=${media} AND has_started`,
        );
        assert.equal(count!.n, 3);
        await appendFile(mp4, "replaced");
        assert.equal(
          (
            await call("POST", "/api/playback/plans", {
              mediaId: media,
              intent: "play",
            })
          ).statusCode,
          409,
        );
      },
    );
    const second = rows.items.find(
      (r: { format: string }) => r.format === "matroska",
    );
    const secondReview = (
      await review(second.id, (await completeDate(second)).revision)
    ).json();
    await appendFile(mkv, "changed");
    assert.equal(
      (await publish(second.id, secondReview.revision)).statusCode,
      409,
    );
    await run();
    rows = await queue();
    assert.equal(rows.total, 3);
    assert.equal(
      rows.items.find((i: { id: string }) => i.id === second.id).reviewed,
      false,
    );
    await writeFile(join(importRoot, ".video-x-root"), randomUUID());
    assert.equal((await call("POST", "/api/imports/scan")).statusCode, 409);
    await writeFile(join(importRoot, ".video-x-root"), marker);
    await unlink(mkv);
    await run();
    assert.equal(
      (await queue()).items.find((i: { id: string }) => i.id === second.id)
        .availability,
      "missing",
    );
  } finally {
    await local.close();
    await rm(importRoot, { recursive: true, force: true });
  }
});

test("manual file intake and episode containers keep review, order and publication atomic", async () => {
  const root = await mkdtemp(join(tmpdir(), "video-x-episodes-"));
  const local = await createApp(db, false, root);
  const call = (
    method: "GET" | "POST" | "PUT",
    url: string,
    payload?: object,
  ) => local.inject({ method, url, headers: headers(), payload });
  const ok = async (
    method: "GET" | "POST" | "PUT",
    url: string,
    payload?: object,
  ) => {
    const reply = await call(method, url, payload);
    assert.equal(reply.statusCode, 200, reply.body);
    return reply.json();
  };
  try {
    await writeFile(join(root, ".video-x-root"), randomUUID());
    for (const name of ["上集.mp4", "下集.mp4"])
      execFileSync("ffmpeg", [
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:size=160x90:rate=10",
        "-t",
        "1",
        "-c:v",
        "libx264",
        join(root, name),
      ]);
    assert.equal(
      (
        await call("POST", "/api/imports/manual", {
          relativePath: "../outside.mp4",
        })
      ).statusCode,
      400,
    );
    const drafts = [];
    for (const relativePath of ["下集.mp4", "上集.mp4"]) {
      const { id } = await ok("POST", "/api/imports/manual", { relativePath });
      assert.equal(
        (await ok("POST", "/api/imports/manual", { relativePath })).id,
        id,
      );
      const draft = await ok("GET", "/api/imports/" + id);
      drafts.push(
        await ok("PUT", "/api/imports/" + id, {
          expectedRevision: draft.revision,
          fields: {
            ...draft.fields,
            releaseYear: 2024,
            releaseDate: "2024-02-29",
          },
        }),
      );
    }
    const source = drafts[1];
    const fields = {
      ...source.fields,
      identifier: "VC-021",
      directorIds: [ids.actor],
      releaseYear: 2024,
      releaseDate: "2024-02-29",
    };
    assert.equal(
      (
        await call("PUT", "/api/imports/" + source.id, {
          expectedRevision: source.revision,
          fields: { ...fields, releaseYear: 2023 },
        })
      ).statusCode,
      400,
    );
    drafts[1] = await ok("PUT", "/api/imports/" + source.id, {
      expectedRevision: source.revision,
      fields,
    });
    assert.equal(
      (await ok("GET", "/api/imports?q=vc-021")).items[0].id,
      source.id,
    );
    const group = await ok("POST", "/api/imports/groups", {
      title: "分集验收",
      startNumber: 3,
      sourceId: drafts[1].id,
      members: drafts.map(({ id, revision }) => ({ id, revision })),
    });
    const members = (
      await ok("GET", "/api/imports?groupId=" + group.id)
    ).items.map((r: { id: string; revision: number }) => ({
      id: r.id,
      revision: r.revision,
    }));
    assert.equal(members.length, 2);
    const ordered = drafts.map((r) =>
      members.find((m: { id: string }) => m.id === r.id),
    );
    await ok("PUT", "/api/imports/groups/" + group.id, {
      title: "分集验收",
      startNumber: 3,
      sourceId: drafts[1].id,
      members: ordered,
    });
    assert.equal(
      (
        await call("PUT", "/api/imports/groups/" + group.id, {
          title: "陈旧顺序",
          members: ordered,
        })
      ).statusCode,
      409,
    );
    const decide = async (id: string, op: string) => {
      const row = await ok("GET", "/api/imports/" + id);
      return call("POST", "/api/imports/" + id + "/" + op, {
        expectedRevision: row.revision,
      });
    };
    assert.equal((await decide(drafts[0].id, "review")).statusCode, 200);
    assert.equal((await decide(drafts[0].id, "publish")).statusCode, 409);
    assert.equal((await call("GET", "/api/media/" + group.id)).statusCode, 404);
    assert.equal((await decide(drafts[1].id, "review")).statusCode, 200);
    const published = await decide(drafts[1].id, "publish");
    assert.equal(published.statusCode, 200, published.body);
    const item = await ok("GET", "/api/media/" + group.id);
    assert.deepEqual(
      item.episodes.map((e: { episodeNumber: number; title: string }) => [
        e.episodeNumber,
        e.title,
      ]),
      [
        [3, "下集"],
        [4, "上集"],
      ],
    );
    const order = item.episodes.map((ep: { id: string }) => ep.id).reverse();
    const reorder = (episodeOrder: string[]) =>
      local.inject({
        method: "PATCH",
        url: "/api/media/" + group.id,
        headers: headers(),
        payload: {
          expectedRevision: item.revision,
          releaseDate: "2024-02-29",
          episodeOrder,
        },
      });
    assert.notEqual((await reorder([order[0], order[0]])).statusCode, 200);
    const reversed = await reorder(order);
    assert.equal(reversed.statusCode, 200, reversed.body);
    assert.deepEqual(
      reversed.json().episodes.map((ep: { id: string }) => ep.id),
      order,
    );
    const roots = await ok("GET", "/api/media?pageSize=100");
    assert.ok(roots.items.some((m: { id: string }) => m.id === group.id));
    assert.ok(
      !roots.items.some((m: { id: string }) =>
        item.episodes.some((e: { id: string }) => e.id === m.id),
      ),
    );
    const children = await ok("GET", "/api/media?episodesOnly=true");
    assert.ok(
      children.items.every((m: { kind: string }) => m.kind === "episode"),
    );
    const numbered = (
      await ok("GET", "/api/media?includeEpisodes=true&q=vc-021")
    ).items;
    assert.equal(numbered.length, 1);
    assert.equal(numbered[0].title, "上集");
    const [facts] = await db.query(
      sql`SELECT release_date::text AS day,release_precision AS precision,EXISTS(SELECT 1 FROM video_x.credits WHERE media_id=m.id AND job='director' AND person_id=${ids.actor}) AS director FROM video_x.media_items m WHERE id=${numbered[0].id}`,
    );
    assert.deepEqual(facts, {
      day: "2024-02-29",
      precision: "day",
      director: true,
    });
    const maintenance = await ok(
      "GET",
      "/api/manage/media?includeEpisodes=true&q=vc-021",
    );
    assert.equal(maintenance.total, 1);
    const [summary] = maintenance.items;
    assert.equal(summary.id, numbered[0].id);
    assert.equal(summary.identifier.toUpperCase(), "VC-021");
    assert.equal(summary.editionCount, 1);
    assert.equal(summary.fileCount, 1);
    const episodeDetail = await ok("GET", "/api/media/" + summary.id);
    assert.deepEqual(
      summary.actorNames,
      episodeDetail.actors.map((a: { fullName: string }) => a.fullName),
    );
    assert.equal(item.linkedFileCount, 0);
    for (const e of item.episodes)
      assert.equal((await ok("GET", "/api/media/" + e.id)).linkedFileCount, 1);
  } finally {
    await local.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("dictionary edits preserve revision and manual work links", async () => {
  const tag = await request("POST", "/api/dictionary", {
    kind: "tag",
    name: "太空",
    categoryId: ids.cinema,
    detail: "题材",
  });
  const org = await request("POST", "/api/dictionary", {
    kind: "studio",
    name: "测试片商",
  });
  assert.equal(tag.statusCode, 200, tag.body);
  assert.equal(org.statusCode, 200, org.body);
  const tagQuery = new URLSearchParams({
    kind: "tag",
    q: "太空",
    categoryId: ids.cinema,
    pageSize: "1",
  });
  const matches = await request("GET", "/api/dictionary/choices?" + tagQuery);
  assert.equal(matches.statusCode, 200, matches.body);
  assert.equal(matches.json().items[0].id, tag.json().id);
  tagQuery.set("categoryId", ids.independent);
  assert.equal(
    (await request("GET", "/api/dictionary/choices?" + tagQuery)).json().total,
    0,
  );
  const byId = await request(
    "GET",
    "/api/dictionary/choices?kind=studio&ids=" + org.json().id,
  );
  assert.equal(byId.json().items[0].name, "测试片商");
  const { revision } = await detail();
  const opt = {
    expectedRevision: revision,
    tagIds: [tag.json().id],
    studioIds: [org.json().id],
  };
  const saved = await request("PATCH", "/api/media/" + ids.media, opt);
  assert.equal(saved.statusCode, 200, saved.body);
  assert.deepEqual(saved.json().tagIds, opt.tagIds);
  assert.deepEqual(saved.json().studioIds, opt.studioIds);
  const rows = (await request("GET", "/api/dictionary")).json(),
    entry = rows.find((d: { id: string }) => d.id === org.json().id);
  assert.equal(entry.workCount, 1);
  const patch = {
    kind: "studio",
    name: "片商新名称",
    expectedRevision: entry.revision,
  };
  assert.equal(
    (await request("PATCH", "/api/dictionary/" + entry.id, patch)).statusCode,
    200,
  );
  assert.equal(
    (await request("PATCH", "/api/dictionary/" + entry.id, patch)).statusCode,
    409,
  );
});
test("JavDB reads exact identifiers, same-site source references and clearly missing fields", () => {
  const page = new URL("https://javdb.com/v/Fixture");
  const results = parseSearch(
    '<div class="movie-list"><a href="/v/Fixture"><div class="video-title"><strong>TEST-210</strong> Example</div></a><a href="https://example.org/v/Bad"><span class="video-title"><strong>TEST-210</strong></span></a></div>',
    page,
  );
  assert.deepEqual(
    results.map((r) => r.url),
    [page.href],
  );
  const field = (k: string, v: string) =>
    '<div class="panel-block"><strong>' +
    k +
    ':</strong><span class="value">' +
    v +
    "</span></div>";
  const html =
    '<h2><span class="current-title">样片</span></h2><div class="movie-panel-info">' +
    field("番號", "TEST-210") +
    field("日期", "2024/02/29") +
    field("演員", '<a href="/actors/test">示例演员</a>') +
    '</div><div class="preview-images"><a class="tile-item" href="https://c0.jdbstatic.com/a.jpg"></a></div>';
  const { candidate } = parseDetail(html, page);
  assert.equal(candidate.releaseDate, "2024-02-29");
  assert.deepEqual(candidate.actors, ["示例演员"]);
  assert.equal(candidate.references[0]?.url, "https://javdb.com/actors/test");
  assert.equal(candidate.previews.length, 1);
  assert.equal(candidate.summary, null);
  assert.equal(candidate.supportsChinese, null);
  assert.throws(() => parseDetail("<html></html>", page));
});

test("fileless drafts, source proposals, late binding and manual publication share one draft", async () => {
  const root = await mkdtemp(join(tmpdir(), "video-x-draft-"));
  const local = await createApp(db, false, root);
  const call = (
    method: "GET" | "POST" | "PUT",
    url: string,
    payload?: object,
  ) => local.inject({ method, url, headers: headers(), payload });
  const ok = async (
    method: "GET" | "POST" | "PUT",
    url: string,
    payload?: object,
  ) => {
    const r = await call(method, url, payload);
    assert.equal(r.statusCode, 200, r.body);
    return r.json();
  };
  const candidate = {
    title: "来源片名",
    identifier: "QA-112",
    url: "https://javdb.com/v/Fixture",
    releaseDate: "2024-02-29",
    summary: null,
    supportsChinese: null,
    actors: ["来源演员"],
    directors: ["来源导演"],
    series: ["来源系列"],
    studios: ["来源片商"],
    tags: ["来源标签"],
  };
  const registry = (lookup: MetadataProvider["lookup"]) =>
    new Map([["javdb", { code: "javdb", name: "JavDB", lookup }]]);
  try {
    assert.equal((await ok("GET", "/api/sources"))[0].code, "javdb");
    assert.equal(
      (await call("POST", "/api/imports/drafts", { title: "缺日期" }))
        .statusCode,
      400,
    );
    const draft = await ok("POST", "/api/imports/drafts", {
      title: "手工片名",
      releaseDate: "2000-01-15",
      identifier: "QA-112",
    });
    const url = "/api/imports/" + draft.id;
    const get = () => ok("GET", url);
    assert.equal(draft.availability, "unbound");
    assert.equal(
      (await ok("GET", "/api/imports?status=unbound&q=QA-112")).items[0].id,
      draft.id,
    );
    for (const op of ["review", "publish"])
      assert.equal(
        (
          await call("POST", url + "/" + op, {
            expectedRevision: draft.revision,
          })
        ).statusCode,
        409,
      );
    const start = async (query: string) =>
      ok("POST", url + "/lookup", {
        provider: "javdb",
        query,
        expectedRevision: (await get()).revision,
      });
    const first = await start("样片");
    assert.equal((await start("样片")).id, first.id);
    assert.equal(
      (await ok("GET", "/api/imports?status=retrieved")).lookingUp,
      true,
    );
    await runLookup(
      db,
      first.id,
      registry(async () => ({
        choices: [
          {
            identifier: candidate.identifier,
            title: candidate.title,
            url: candidate.url,
          },
        ],
      })),
    );
    assert.equal((await get()).lookup.state, "choices");
    const choice = await start(candidate.url);
    await runLookup(
      db,
      choice.id,
      registry(async () => ({ candidate })),
    );
    const row = (await ok("GET", "/api/imports?status=retrieved&q=QA-112"))
      .items[0];
    assert.equal(row.lookup.candidate.summary, null);
    assert.equal(row.lookup.candidate.actors.length, 1);
    assert.equal(row.fields.title, "手工片名");
    assert.equal(row.fields.releaseDate, "2000-01-15");
    assert.equal(row.publishedMediaId, null);
    const use = {
      lookupId: choice.id,
      expectedRevision: row.revision,
      fields: [
        "actors",
        "directors",
        "series",
        "studios",
        "tags",
        "releaseDate",
      ],
    };
    const accepted = await ok("POST", url + "/lookup/apply", use);
    assert.deepEqual(accepted.fields.sourceNames.actors, ["来源演员"]);
    assert.deepEqual(
      accepted.lookup.appliedFields.sort(),
      [...use.fields].sort(),
    );
    assert.equal(
      (await call("POST", url + "/lookup/apply", use)).statusCode,
      409,
    );
    assert.equal(
      (
        await db.query(
          sql`SELECT id FROM video_x.people WHERE full_name='来源演员'`,
        )
      ).length,
      0,
    );
    const fail = await start("不存在");
    await runLookup(
      db,
      fail.id,
      registry(async () => {
        throw Error("没有找到匹配的影片。");
      }),
    );
    const failed = (
      await ok("GET", "/api/imports?status=lookupFailed&q=QA-112")
    ).items[0];
    assert.equal(failed.fields.title, "手工片名");
    assert.deepEqual(failed.fields.sourceNames.actors, ["来源演员"]);
    assert.equal(
      (
        await call("POST", url + "/lookup/apply", {
          ...use,
          expectedRevision: failed.revision,
        })
      ).statusCode,
      409,
    );
    await writeFile(join(root, ".video-x-root"), randomUUID());
    const relativePath = "草稿绑定验收.mp4";
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=black:s=96x64:r=10",
      "-t",
      "1",
      "-c:v",
      "libx264",
      join(root, relativePath),
    ]);
    const scan = await ok("POST", "/api/imports/scan");
    await runScan(db, scan.id, root);
    const duplicate = (
      await ok("GET", "/api/imports?q=" + encodeURIComponent(relativePath))
    ).items[0];
    assert.notEqual(duplicate.id, draft.id);
    const bound = await ok("POST", url + "/file", {
      relativePath,
      expectedRevision: failed.revision,
    });
    assert.equal(bound.id, draft.id);
    assert.equal(bound.videoCodec, "h264");
    assert.equal(
      (await call("GET", "/api/imports/" + duplicate.id)).statusCode,
      404,
    );
    assert.equal(
      (await ok("GET", "/api/imports?q=" + encodeURIComponent(relativePath)))
        .total,
      1,
    );
    const other = await ok("POST", "/api/imports/drafts", {
      title: "冲突草稿",
      releaseDate: "2020-02-29",
    });
    assert.equal(
      (
        await call("POST", "/api/imports/" + other.id + "/file", {
          relativePath,
          expectedRevision: other.revision,
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await call("POST", url + "/publish", {
          expectedRevision: bound.revision,
        })
      ).statusCode,
      409,
    );
    const reviewed = await ok("POST", url + "/review", {
      expectedRevision: bound.revision,
    });
    const retry = await start("QA-112");
    assert.equal((await get()).reviewed, false);
    assert.equal(
      (
        await call("POST", url + "/review", {
          expectedRevision: (await get()).revision,
        })
      ).statusCode,
      409,
    );
    await runLookup(
      db,
      retry.id,
      registry(async () => ({ candidate })),
    );
    assert.equal(reviewed.publishedMediaId, null);
    const finalReview = await ok("POST", url + "/review", {
      expectedRevision: (await get()).revision,
    });
    const published = await ok("POST", url + "/publish", {
      expectedRevision: finalReview.revision,
    });
    const movie = await ok("GET", "/api/media/" + published.publishedMediaId);
    assert.equal(movie.title, "手工片名");
    assert.equal(movie.releaseDate, "2024-02-29");
    assert.equal(movie.identifier, "QA-112");
    assert.equal(movie.linkedFileCount, 1);
    assert.equal(
      (
        await db.query(
          sql`SELECT id FROM video_x.people WHERE full_name='来源演员'`,
        )
      ).length,
      1,
    );
    assert.equal(
      (
        await db.query(
          sql`SELECT id FROM video_x.media_tags WHERE media_id=${published.publishedMediaId}`,
        )
      ).length,
      1,
    );
  } finally {
    await local.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("storage and worker observations require a session and report an unmounted ingest root", async () => {
  const root = await mkdtemp(join(tmpdir(), "video-x-status-"));
  const local = await createApp(db, false, root);
  try {
    assert.equal(
      (await local.inject({ method: "GET", url: "/api/system/status" }))
        .statusCode,
      401,
    );
    const result = await local.inject({
      method: "GET",
      url: "/api/system/status",
      headers: headers(),
    });
    assert.equal(result.statusCode, 200, result.body);
    const status = result.json();
    assert.equal(status.media.path, root);
    assert.equal(status.media.state, "offline");
    assert.equal(status.media.space, null);
    assert.equal(status.worker.count, 0);
    assert.ok(status.postgres && status.ffprobe && status.ffmpeg);
    assert.ok(status.sources.includes("JavDB"));
  } finally {
    await local.close();
    await rm(root, { recursive: true, force: true });
  }
});
test("Docker storage status uses only a fresh, identity-matched host capacity", async () => {
  const home = await mkdtemp(join(tmpdir(), "vx-capacity-"));
  const working = join(home, "workspace");
  const observed = join(home, "media");
  const unmounted = join(home, "offline");
  const snapshot = join(home, "storage.json");
  const matched = randomUUID();
  const keys = [
    "VIDEO_X_STORAGE_LAYOUT",
    "VIDEO_X_DEPLOYMENT",
    "VIDEO_X_HOST_STORAGE_SNAPSHOT",
  ] as const;
  const previous = keys.map((key) => process.env[key]);
  const roots = [working, observed, unmounted];
  try {
    await mkdir(observed);
    await writeFile(join(observed, ".video-x-root"), matched);
    for (const [index, path] of roots.entries()) {
      await db.query(sql`INSERT INTO video_x.storage_roots(library_id,name,mount_path,expected_marker)
        VALUES(${ids.library},${"样本 " + index},${path},${index === 1 ? matched : randomUUID()})`);
    }
    process.env.VIDEO_X_DEPLOYMENT = "compose";
    process.env.VIDEO_X_HOST_STORAGE_SNAPSHOT = snapshot;
    process.env.VIDEO_X_STORAGE_LAYOUT = JSON.stringify({
      targets: [{ key: "library", label: "资料库", dir: "Library" }],
      readRoots: [observed, unmounted],
    });
    const space = {
      total: 8000000000000,
      used: 7000000000000,
      available: 1000000000000,
    };
    async function inspect(age: number) {
      await writeFile(
        snapshot,
        JSON.stringify({
          checkedAt: new Date(Date.now() - age).toISOString(),
          volumes: [{ marker: matched, space }],
        }),
      );
      const local = await createApp(db, false, working);
      try {
        const result = await local.inject({
          method: "GET",
          url: "/api/system/status",
          headers: headers(),
        });
        assert.equal(result.statusCode, 200, result.body);
        return result.json();
      } finally {
        await local.close();
      }
    }
    const current = await inspect(100);
    assert.equal(current.media.space, null);
    assert.deepEqual(
      current.mediaRoots.map(
        (item: { state: string; space: object | null }) => [
          item.state,
          item.space,
        ],
      ),
      [
        ["online", space],
        ["offline", null],
      ],
    );
    assert.deepEqual(
      (await inspect(180001)).mediaRoots.map(
        (item: { space: object | null }) => item.space,
      ),
      [null, null],
    );
  } finally {
    for (const [index, key] of keys.entries()) {
      const value = previous[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    for (const path of roots)
      await db.query(
        sql`DELETE FROM video_x.storage_roots WHERE mount_path=${path}`,
      );
    await rm(home, { recursive: true, force: true });
  }
});
test("Download selection, target planning, manual publication and recoverable moves", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "vx-move-"));
  const archive =
    process.env.VIDEO_X_TEST_CROSS_ROOT ||
    (process.platform === "linux" ? "/dev/shm" : "");
  const separate =
    archive &&
    (await stat(archive).catch(() => null))?.dev !== (await stat(root)).dev &&
    (await stat(archive).catch(() => null))?.isDirectory();
  const other = separate ? await mkdtemp(join(archive, "vx-move-")) : "";
  const oldLayout = process.env.VIDEO_X_STORAGE_LAYOUT;
  const local = await createApp(db, false, root);
  const call = (method: "GET" | "POST", url: string, payload?: object) =>
    local.inject({ method, url, headers: headers(), payload });
  const ok = async (method: "GET" | "POST", url: string, payload?: object) => {
    const res = await call(method, url, payload);
    assert.equal(res.statusCode, 200, res.body);
    return res.json();
  };
  const row = (id: string) => ok("GET", "/api/imports/" + id);
  const act = async (id: string, action: string) =>
    ok("POST", "/api/imports/" + id + "/" + action, {
      expectedRevision: (await row(id)).revision,
    });
  const plan = async (ids: string[], target: string) => ({
    members: await Promise.all(
      ids.map(async (id) => ({ id, revision: (await row(id)).revision })),
    ),
    target,
    dir: "",
  });
  const selectFile = async (name: string) => {
    const { id } = await ok("POST", "/api/imports/manual", {
      relativePath: "Download/" + name,
    });
    const draft = await row(id);
    const res = await local.inject({
      method: "PUT",
      url: "/api/imports/" + id,
      headers: headers(),
      payload: {
        expectedRevision: draft.revision,
        fields: {
          ...draft.fields,
          releaseYear: 2024,
          releaseDate: "2024-02-29",
        },
      },
    });
    assert.equal(res.statusCode, 200, res.body);
    return id as string;
  };
  const runId = async (id: string) =>
    (
      await db.query(
        sql`SELECT run_id FROM video_x.import_move_plans WHERE item_id=${id}`,
      )
    )[0]!.run_id as string;
  const play = async (id: string, expected: Buffer) => {
    const r = await row(id);
    assert.ok(r.publishedMediaId);
    assert.equal(r.move.state, "done");
    const session = await ok("POST", "/api/playback/sessions", {
      requestId: randomUUID(),
      mediaId: r.publishedMediaId,
      intent: "play",
    });
    const streamed = await call("GET", session.streamUrl);
    assert.equal(streamed.statusCode, 200);
    assert.deepEqual(streamed.rawPayload, expected);
    const range = await local.inject({
      url: session.streamUrl,
      headers: { ...headers(), range: "bytes=0-127" },
    });
    assert.equal(range.statusCode, 206);
    assert.deepEqual(range.rawPayload, expected.subarray(0, 128));
    execFileSync(
      "ffmpeg",
      ["-loglevel", "error", "-i", "pipe:0", "-f", "null", "-"],
      { input: streamed.rawPayload },
    );
  };
  try {
    await mkdir(join(root, "Download"));
    await mkdir(join(root, "Library"));
    await writeFile(join(root, ".video-x-root"), randomUUID());
    if (other) await writeFile(join(other, ".video-x-root"), randomUUID());
    process.env.VIDEO_X_STORAGE_LAYOUT = JSON.stringify({
      inbox: "Download",
      targets: [
        { key: "local", label: "同盘", dir: "Library" },
        ...(other
          ? [{ key: "other", label: "异盘", root: other, dir: "" }]
          : []),
      ],
    });
    await mkdir(join(root, "Library", "archive"));
    await writeFile(
      join(root, "Library", "archive", "existing.mkv"),
      "fixture",
    );
    await writeFile(join(root, "Library", "archive", "notes.txt"), "fixture");
    const listing = await ok(
      "GET",
      "/api/storage/browse?area=target&target=local",
    );
    assert.equal(
      listing.entries.find((e: { name: string }) => e.name === "archive")
        ?.videoCount,
      1,
    );
    assert.equal(listing.used, 0);
    assert.equal(
      (
        await ok(
          "GET",
          "/api/storage/browse?area=target&target=local&summaryOnly=true",
        )
      ).totalVideoCount,
      1,
    );
    const source = join(root, "Download", "A.mp4");
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=160x90:rate=10",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      source,
    ]);
    const original = await readFile(source);
    await writeFile(join(root, "Download", "B.mp4"), original);
    assert.deepEqual(
      (await ok("GET", "/api/storage/browse?area=inbox")).entries.map(
        (e: { name: string }) => e.name,
      ),
      ["A.mp4", "B.mp4"],
    );
    assert.equal(
      (await call("GET", "/api/storage/browse?area=inbox&dir=..")).statusCode,
      409,
    );
    const a = await selectFile("A.mp4"),
      b = await selectFile("B.mp4");
    assert.equal((await row(a)).needsTarget, true);
    const members = await plan([a, b], "local");
    await writeFile(join(root, "Library", "B.mp4"), "already exists");
    assert.equal(
      (await call("POST", "/api/imports/targets", members)).statusCode,
      409,
    );
    assert.equal((await row(a)).move, null);
    await unlink(join(root, "Library", "B.mp4"));
    await ok("POST", "/api/imports/targets", await plan([a, b], "local"));
    assert.deepEqual(await readFile(source), original);
    assert.equal(
      (
        await call("POST", "/api/imports/" + a + "/publish", {
          expectedRevision: (await row(a)).revision,
        })
      ).statusCode,
      409,
    );
    await act(a, "review");
    const reviewed = await ok(
      "GET",
      "/api/imports?stage=reviewed&status=missing",
    );
    assert.ok(reviewed.items.some((item: { id: string }) => item.id === a));
    assert.ok(!reviewed.items.some((item: { id: string }) => item.id === b));
    const staleReviewed = await act(b, "review");
    await ok("POST", "/api/imports/targets", await plan([b], "local"));
    assert.equal((await row(b)).reviewed, false);
    assert.equal(
      (
        await call("POST", "/api/imports/" + b + "/publish", {
          expectedRevision: staleReviewed.revision,
        })
      ).statusCode,
      409,
    );
    await act(b, "review");
    await t.test(
      "same-volume move preserves inode and publishes only after manual confirmation",
      async () => {
        const before = await stat(source);
        await act(a, "publish");
        assert.equal((await row(a)).publishedMediaId, null);
        const id = await runId(a);
        await runMove(db, root, id);
        const item = await row(a);
        assert.equal(item.move.state, "done", JSON.stringify(item.move));
        assert.equal(
          (await stat(join(root, "Library", "A.mp4"))).ino,
          before.ino,
        );
        await assert.rejects(stat(source), { code: "ENOENT" });
        await runMove(db, root, id);
        assert.equal((await row(a)).publishedMediaId, item.publishedMediaId);
      },
    );
    await t.test(
      "same-name collision before submission and after enqueue preserves both files",
      async () => {
        const taken = join(root, "Library", "B.mp4");
        await writeFile(taken, "existing", { flag: "wx" });
        assert.equal(
          (
            await call("POST", "/api/imports/" + b + "/publish", {
              expectedRevision: (await row(b)).revision,
            })
          ).statusCode,
          409,
        );
        await unlink(taken);
        await act(b, "publish");
        await writeFile(taken, "existing", { flag: "wx" });
        const id = await runId(b);
        await runMove(db, root, id);
        const item = await row(b);
        assert.equal(item.publishedMediaId, null);
        assert.equal(item.move.state, "failed");
        assert.match(item.move.error, /同名/);
        assert.equal(await readFile(taken, "utf8"), "existing");
        assert.deepEqual(
          await readFile(join(root, "Download", "B.mp4")),
          original,
        );
      },
    );
    await t.test(
      "playback session serves and decodes the published MP4 from its new path",
      () => play(a, original),
    );
    await t.test(
      "append a reviewed file as a separate playable edition, preserving the original work",
      async () => {
        const mediaId = (await row(a)).publishedMediaId;
        const before = await ok("GET", "/api/media/" + mediaId);
        const extra = Buffer.from([0, 0, 0, 8, 102, 114, 101, 101]);
        const bytes = Buffer.concat([original, extra]);
        await writeFile(join(root, "Download", "alternate.mp4"), bytes);
        const alt = await selectFile("alternate.mp4");
        await ok("POST", "/api/imports/targets", await plan([alt], "local"));
        const draft = await act(alt, "review");
        const append = () =>
          ok("POST", "/api/imports/" + alt + "/publish-edition", {
            expectedRevision: draft.revision,
            mediaId,
            name: "修复版",
          });
        await append();
        await runMove(db, root, await runId(alt));
        assert.equal((await append()).publishedMediaId, mediaId);
        const after = await ok("GET", "/api/media/" + mediaId);
        assert.equal(after.title, before.title);
        assert.equal(after.editions.length, 2);
        const version = after.editions.find(
          (v: { name: string }) => v.name === "修复版",
        );
        assert.ok(version);
        assert.equal(version.isDefault, false);
        const input = { mediaId, editionId: version.id, intent: "play" };
        const session = await ok("POST", "/api/playback/sessions", {
          ...input,
          requestId: randomUUID(),
        });
        assert.equal(session.editionId, version.id);
        assert.deepEqual(
          (await call("GET", session.streamUrl)).rawPayload,
          bytes,
        );
        assert.equal(
          (await ok("POST", "/api/playback/plans", { mediaId, intent: "play" }))
            .editionId,
          before.editions[0].id,
        );
        assert.notEqual(
          (
            await call("POST", "/api/playback/plans", {
              ...input,
              mediaId: ids.media,
            })
          ).statusCode,
          200,
        );
      },
    );
    await t.test(
      "replace after a failed move, keep the old source and restore it",
      async () => {
        const mediaId = (await row(a)).publishedMediaId;
        const mediaPath = "/api/media/" + mediaId;
        const before = await ok("GET", mediaPath);
        const old = before.editions.find(
          (edition: { isDefault: boolean }) => edition.isDefault,
        );
        const oldFile = join(root, old.filename);
        const check = mediaPath + "/editions/" + old.id + "/check";
        assert.equal(
          (await ok("POST", check, { expectedRevision: old.revision })).status,
          "present",
        );
        await rename(oldFile, oldFile + ".hold");
        try {
          assert.equal(
            (await ok("POST", check, { expectedRevision: old.revision }))
              .status,
            "missing",
          );
        } finally {
          await rename(oldFile + ".hold", oldFile);
        }
        assert.equal(
          (await ok("POST", check, { expectedRevision: old.revision })).status,
          "present",
        );

        const name = "replacement.mp4";
        const targetFile = join(root, "Library", name);
        const replacementBytes = Buffer.concat([
          original,
          Buffer.from([
            0, 0, 0, 8, 102, 114, 101, 101, 0, 0, 0, 8, 102, 114, 101, 101,
          ]),
        ]);
        await writeFile(join(root, "Download", name), replacementBytes);
        const candidate = await selectFile(name);
        await ok(
          "POST",
          "/api/imports/targets",
          await plan([candidate], "local"),
        );
        const draft = await act(candidate, "review");
        const url = "/api/imports/" + candidate + "/edition-preview";
        assert.deepEqual((await call("GET", url)).rawPayload, replacementBytes);
        const play = (intent: "play" | "resume", editionId?: string) =>
          ok("POST", "/api/playback/plans", { mediaId, intent, editionId });
        const selected = await ok("POST", "/api/playback/sessions", {
          mediaId,
          editionId: old.id,
          intent: "play",
          requestId: randomUUID(),
        });
        await ok(
          "POST",
          "/api/playback/sessions/" + selected.sessionId + "/events",
          {
            seq: 1,
            eventId: randomUUID(),
            kind: "start",
            positionMs: 800,
            partId: selected.partId,
          },
        );
        const request = {
          mediaId,
          name: "替换版",
          expectedRevision: draft.revision,
          replacement: { editionId: old.id, expectedRevision: old.revision },
        };
        const publishPath = "/api/imports/" + candidate + "/publish-edition";
        assert.equal(
          (
            await call("POST", publishPath, {
              ...request,
              replacement: {
                ...request.replacement,
                expectedRevision: old.revision + 1,
              },
            })
          ).statusCode,
          409,
        );
        await ok("POST", publishPath, request);
        const candidateFile = join(root, "Download", name);
        const job = await runId(candidate);
        await rename(candidateFile, candidateFile + ".hold");
        try {
          await runMove(db, root, job);
          const failed = await row(candidate);
          assert.equal(failed.move.state, "failed");
          assert.match(failed.move.error, /找不到待整理的源文件/);
          assert.equal((await play("play")).editionId, old.id);
        } finally {
          await rename(candidateFile + ".hold", candidateFile);
        }
        await ok("POST", publishPath, {
          ...request,
          expectedRevision: (await row(candidate)).revision,
        });
        await runMove(db, root, job);

        const after = await ok("GET", mediaPath);
        assert.equal(after.title, before.title);
        assert.equal(after.editions.length, before.editions.length);
        const edition = after.editions.find(
          (edition: { isDefault: boolean }) => edition.isDefault,
        );
        assert.ok(
          edition &&
            edition.id !== old.id &&
            edition.replacedEdition.filename === old.filename,
        );
        const fresh = await play("play");
        assert.equal(fresh.mode, "fresh");
        assert.equal(after.resumeEditionId, null);
        assert.equal(fresh.editionId, edition.id);
        assert.equal(fresh.positionMs, 0);
        assert.deepEqual(
          (await call("GET", selected.streamUrl)).rawPayload,
          original,
        );
        assert.deepEqual(await readFile(targetFile), replacementBytes);
        assert.deepEqual(await readFile(oldFile), original);
        assert.equal((await call("GET", url)).statusCode, 404);
        const restore = mediaPath + "/editions/" + edition.id + "/restore";
        await rename(oldFile, oldFile + ".hold");
        try {
          assert.equal(
            (
              await call("POST", restore, {
                expectedRevision: edition.revision,
              })
            ).statusCode,
            409,
          );
          assert.equal((await play("play")).editionId, edition.id);
        } finally {
          await rename(oldFile + ".hold", oldFile);
        }
        assert.equal(
          (await ok("POST", restore, { expectedRevision: edition.revision }))
            .id,
          old.id,
        );
        assert.equal((await play("resume", old.id)).positionMs, 800);
        assert.deepEqual(await readFile(targetFile), replacementBytes);
      },
    );
    await t.test(
      "cross-volume worker killed during copy resumes the partial and publishes once",
      {
        skip: other
          ? false
          : "Set VIDEO_X_TEST_CROSS_ROOT to an independent test filesystem",
      },
      async () => {
        const name = "C.mp4",
          src = join(root, "Download", name);
        const padding = Buffer.alloc(4 * 1024 * 1024);
        padding.writeUInt32BE(padding.length);
        padding.write("free", 4);
        const content = Buffer.concat([original, padding]);
        await writeFile(src, content);
        const c = await selectFile(name);
        await ok("POST", "/api/imports/targets", await plan([c], "other"));
        await act(c, "review");
        await act(c, "publish");
        const id = await runId(c);
        const testURL = new URL(process.env.TEST_DATABASE_URL!);
        testURL.pathname = "/" + testName;
        // The crashed worker owns an active queue job. Recovery must create a fresh delivery.
        const deliveries = await db.boss.fetch<{ id: string }>("media.move", {
          batchSize: 100,
        });
        const originalJob = deliveries.find((job) => job.data.id === id);
        assert.ok(originalJob);
        const child = spawn(
          process.execPath,
          [
            "--import",
            "tsx",
            fileURLToPath(
              new URL("./fixtures/interrupt-move.ts", import.meta.url),
            ),
            root,
            id,
          ],
          {
            env: { ...process.env, DATABASE_URL: testURL.href },
            stdio: ["ignore", "ignore", "inherit"],
          },
        );
        const [code, signal] = await once(child, "exit");
        assert.equal(signal, "SIGKILL", "child exit " + code);
        const part = join(other, ".video-x-" + id + "-" + c + ".part");
        const partial = await stat(part);
        assert.equal(partial.size, 1048576);
        assert.deepEqual(await readFile(src), content);
        await assert.rejects(stat(join(other, name)), { code: "ENOENT" });
        assert.equal((await row(c)).publishedMediaId, null);
        await recoverMoves(db);
        const [delivery] = await db.boss.fetch<{ id: string }>("media.move");
        assert.equal(delivery?.data.id, id);
        assert.notEqual(delivery.id, originalJob.id);
        const offsets: number[] = [];
        await runMove(db, root, delivery.data.id, async (bytes) => {
          offsets.push(bytes);
        });
        await db.boss.complete("media.move", delivery.id);
        assert.equal(offsets[0], 2 * 1048576);
        assert.equal(
          (await row(c)).move.state,
          "done",
          JSON.stringify((await row(c)).move),
        );
        await assert.rejects(stat(src), { code: "ENOENT" });
        await assert.rejects(stat(part), { code: "ENOENT" });
        const published = (await row(c)).publishedMediaId;
        await runMove(db, root, id);
        assert.equal((await row(c)).publishedMediaId, published);
        await play(c, content);
      },
    );
  } finally {
    if (oldLayout === undefined) delete process.env.VIDEO_X_STORAGE_LAYOUT;
    else process.env.VIDEO_X_STORAGE_LAYOUT = oldLayout;
    await local.close();
    await rm(root, { recursive: true, force: true });
    if (other) await rm(other, { recursive: true, force: true });
  }
});

test("download directory is persisted on the marked volume and protects selected drafts across a change", async () => {
  const root = await mkdtemp(join(tmpdir(), "vx-inbox-settings-")),
    prior = process.env.VIDEO_X_STORAGE_LAYOUT;
  process.env.VIDEO_X_STORAGE_LAYOUT = JSON.stringify({
    pickerOnly: true,
    targets: [{ key: "library", label: "资料库", dir: "Library" }],
  });
  const local = await createApp(db, false, root),
    call = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
      local.inject({ method, url, headers: headers(), payload });
  const save = (dir: string, expected: string | null) =>
    call("PUT", "/api/storage/inbox", { dir, expected });
  try {
    for (const dir of ["Download", "Next", "Library"])
      await mkdir(join(root, dir));
    await writeFile(join(root, ".video-x-root"), randomUUID());
    await symlink(join(root, "Download"), join(root, "别名"));
    assert.equal((await call("GET", "/api/storage/browse")).json().inbox, null);
    assert.deepEqual(
      (await call("GET", "/api/storage/browse?area=volume"))
        .json()
        .entries.map((e: { name: string }) => e.name),
      ["Download", "Library", "Next"],
    );
    assert.equal((await save("Library", null)).statusCode, 409);
    assert.equal((await save("别名", null)).statusCode, 409);
    assert.equal((await save("Download", null)).json().inbox, "Download");
    assert.equal(
      (await call("GET", "/api/storage/browse")).json().inbox,
      "Download",
    );
    assert.equal((await call("POST", "/api/imports/scan")).statusCode, 409);
    const rel = "Download/test.mp4";
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=s=32x32:r=5",
      "-t",
      "1",
      "-c:v",
      "libx264",
      join(root, rel),
    ]);
    const selected = await call("POST", "/api/imports/manual", {
      relativePath: rel,
      expectedInbox: "Download",
    });
    assert.equal(selected.statusCode, 200, selected.body);
    assert.equal((await save("Next", null)).statusCode, 409);
    assert.equal((await save("Next", "Download")).statusCode, 200);
    assert.equal(
      (
        await call("POST", "/api/imports/manual", {
          relativePath: rel,
          expectedInbox: "Download",
        })
      ).statusCode,
      409,
    );
    const id = selected.json().id,
      row = (await call("GET", "/api/imports/" + id)).json();
    assert.equal(row.needsTarget, true);
    assert.equal(
      (
        await call("POST", "/api/imports/" + id + "/publish", {
          expectedRevision: row.revision,
        })
      ).statusCode,
      409,
    );
    await writeFile(join(root, ".video-x-root"), randomUUID());
    assert.equal(
      (await call("GET", "/api/storage/browse?area=volume")).statusCode,
      409,
    );
    assert.equal((await save("Download", "Next")).statusCode, 409);
  } finally {
    await local.close();
    if (prior === undefined) delete process.env.VIDEO_X_STORAGE_LAYOUT;
    else process.env.VIDEO_X_STORAGE_LAYOUT = prior;
    await rm(root, { recursive: true, force: true });
  }
});

test("management filters use the default edition and apply before pagination", async () => {
  const [root] = await db.query<{ id: string }>(
    sql`INSERT INTO video_x.storage_roots(library_id,name,mount_path,expected_marker)
        VALUES(${ids.library},'筛选测试盘','/filter-fixtures',gen_random_uuid()) RETURNING id`,
  );
  async function addFilm(name: string, year: number, supports: boolean | null) {
    const [row] = await db.query<{ id: string }>(
      sql`INSERT INTO video_x.media_items(library_id,kind,title,release_year,release_precision,primary_category_id,published_at,supports_chinese)
          VALUES(${ids.library},'movie',${"筛选验收 " + name},${year},'year',${ids.independent},now(),${supports}) RETURNING id`,
    );
    return row!.id;
  }
  async function addEdition(
    mediaId: string,
    isDefault: boolean,
    heights: (number | null)[],
  ) {
    const [edition] = await db.query<{ id: string }>(
      sql`INSERT INTO video_x.editions(media_id,media_kind,name,is_default)
          VALUES(${mediaId},'movie',${isDefault ? "默认版" : "备用版"},${isDefault}) RETURNING id`,
    );
    for (const [index, height] of heights.entries()) {
      const [file] = await db.query<{ id: string }>(
        sql`INSERT INTO video_x.media_files(root_id,relative_path,file_kind,size_bytes,mtime_ns,probe_status,probed_content_revision)
            VALUES(${root!.id},${randomUUID() + ".mp4"},'video',100,1,'succeeded',1) RETURNING id`,
      );
      await db.query(
        sql`INSERT INTO video_x.edition_parts(edition_id,part_no,file_id,bound_content_revision)
            VALUES(${edition!.id},${index + 1},${file!.id},1)`,
      );
      if (height !== null)
        await db.query(
          sql`INSERT INTO video_x.media_streams(file_id,stream_index,kind,height)
              VALUES(${file!.id},0,'video',${height})`,
        );
    }
  }
  const mixed = await addFilm("多段", 2021, true);
  const second = await addFilm("单段", 2022, true);
  const noChinese = await addFilm("明确不支持", 2023, false);
  const incomplete = await addFilm("未知", 2024, null);
  await addEdition(mixed, true, [2160, 1080]);
  await addEdition(mixed, false, [2160]);
  await addEdition(second, true, [1080]);
  await addEdition(noChinese, true, [2160]);
  await addEdition(incomplete, true, [1080, null]);

  async function find(filters: string) {
    const response = await request(
      "GET",
      "/api/manage/media?q=" +
        encodeURIComponent("筛选验收") +
        "&categoryId=" +
        ids.cinema +
        filters,
    );
    assert.equal(response.statusCode, 200, response.body);
    const result = response.json();
    return [result.total, result.items.map((film: { id: string }) => film.id)];
  }
  const paging =
    "&resolution=1080p&chineseSubtitles=supported&sort=year&direction=asc&pageSize=1";
  assert.deepEqual(await find(paging + "&page=1"), [2, [mixed]]);
  assert.deepEqual(await find(paging + "&page=2"), [2, [second]]);
  assert.deepEqual(await find("&resolution=2160p"), [1, [noChinese]]);
  assert.deepEqual(await find("&chineseSubtitles=unsupported"), [
    1,
    [noChinese],
  ]);
  assert.deepEqual(await find("&resolution=unknown&chineseSubtitles=unknown"), [
    1,
    [incomplete],
  ]);
  assert.deepEqual(
    await find("&resolution=1080p&chineseSubtitles=unsupported"),
    [0, []],
  );
  assert.equal(
    (await request("GET", "/api/manage/media?resolution=999p")).statusCode,
    400,
  );
});

test("logout revokes the server session immediately", async () => {
  assert.equal((await request("POST", "/api/auth/logout")).statusCode, 200);
  assert.equal((await request("GET", "/api/media")).statusCode, 401);
});
