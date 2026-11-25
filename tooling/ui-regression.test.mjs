import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const base = "http://video-x.test";
const film = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "双版本测试片",
  categoryName: "测试",
  actors: [],
  franchises: [],
  actorNames: [],
  kind: "film",
  fileCount: 2,
  editionCount: 2,
  linkedFileCount: 2,
  releaseYear: 2026,
  releaseDate: null,
  editions: [
    { id: "one", name: "原版", isDefault: true, height: 1080 },
    { id: "two", name: "4K", height: 2160 },
  ],
};
const pageOf = (items) => ({
  items,
  page: 1,
  pageSize: 24,
  total: items.length,
});
const catalog = [
  ...Array.from({ length: 23 }, (_, i) => ({
    ...film,
    id: "sample-" + i,
    title: "测试影片 " + i,
  })),
  film,
];
const responses = new Map([
  ["/api/auth/me", { id: "reviewer", displayName: "验收" }],
  ["/api/categories", []],
  ["/api/collections", []],
  ["/api/browse/facts", { films: 1, years: [2026] }],
  ["/api/media", pageOf([film])],
  ["/api/media/" + film.id, film],
  ["/api/manage/media", pageOf(catalog)],
  ["/api/imports", { ...pageOf([]), groups: [] }],
  [
    "/api/storage/browse",
    { volume: "测试盘", inbox: "Download", targets: [], entries: [] },
  ],
  ["/api/playback/plans", { mode: "play", positionMs: 0 }],
]);
let browser;
before(async () => {
  const options = process.env.VX_TEST_CHROME
    ? { executablePath: process.env.VX_TEST_CHROME }
    : existsSync(chromium.executablePath())
      ? {}
      : { channel: "chrome" };
  browser = await chromium.launch(options);
});
after(async () => browser?.close());

async function openPage(
  t,
  path,
  { viewport = { width: 1280, height: 760 }, fixtures = responses } = {},
) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  t.after(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) return route.abort();
    if (u.pathname.startsWith("/api/")) {
      if (!fixtures.has(u.pathname)) {
        errors.push("Missing fixture " + u.pathname);
        return route.fulfill({ status: 404 });
      }
      const fixture = fixtures.get(u.pathname);
      return typeof fixture === "function"
        ? fixture(route)
        : route.fulfill({ json: fixture });
    }
    const admin = u.pathname.startsWith("/manage/");
    const requested = u.pathname.slice(admin ? 8 : 1) || "index.html";
    const root = new URL(
      "../apps/" + (admin ? "admin" : "web") + "/dist/",
      import.meta.url,
    );
    const mime = {
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      svg: "image/svg+xml",
    };
    const file = new URL(requested, root);
    if (!file.href.startsWith(root.href)) return route.abort();
    return route.fulfill({
      body: await readFile(file),
      contentType:
        mime[requested.split(".").at(-1)] ?? "application/octet-stream",
    });
  });
  await page.goto(base + path);
  return page;
}

test("录入、片库复用导航，切换页面和打开筛选都保持对齐", async (t) => {
  const p = await openPage(t, "/manage/#ingest");
  const entry = p.getByRole("button", { name: "从 Download 选择文件" });
  await entry.waitFor();
  const icon = await entry.locator("svg").boundingBox();
  assert.ok(icon.width <= 24 && icon.height <= 24);
  const nav = p.getByRole("navigation", { name: "管理导航" });
  const rail = await nav.boundingBox();
  await nav.getByRole("link", { name: "影片资料库" }).click();
  const card = p.getByRole("button", { name: "编辑资料：" + film.title });
  await card.waitFor();
  const next = await nav.boundingBox();
  assert.deepEqual([next.x, next.width], [rail.x, rail.width]);
  await p.getByRole("button", { name: "排序与筛选" }).click();
  const main = p.getByRole("main", { includeHidden: true });
  const closed = await main.boundingBox();
  await p.getByRole("combobox", { name: "排序字段" }).click();
  assert.equal((await main.boundingBox()).width, closed.width);
  await p.keyboard.press("Escape");
  await card.scrollIntoViewIfNeeded();
  const scroll = await p.evaluate(() => window.scrollY);
  assert.ok(scroll > 0);
  await card.click();
  await p.getByRole("button", { name: "版本与文件", exact: true }).click();
  assert.ok(await p.getByRole("button", { name: "追加版本" }).isDisabled());
  await p.getByRole("button", { name: "补全发行日期" }).click();
  await p.getByLabel("发行日期（必填）").waitFor();
  await p.getByRole("button", { name: "← 返回资料列表" }).click();
  await card.waitFor();
  assert.equal(
    await card.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.ok(Math.abs((await p.evaluate(() => window.scrollY)) - scroll) <= 1);
});

test("管理影片按清晰度与中文字幕筛选，清除保留排序", async (t) => {
  const fixtures = new Map(responses);
  const queries = [];
  fixtures.set("/api/manage/media", (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(Object.fromEntries(query));
    return route.fulfill({ json: pageOf(catalog.slice(0, 2)) });
  });
  const p = await openPage(t, "/manage/#media", {
    fixtures,
    viewport: { width: 390, height: 844 },
  });
  await p.evaluate(() => {
    history.replaceState(
      { catalog: { kind: "media", sort: "name", toolsOpen: true } },
      "",
    );
  });
  await p.reload();
  const box = (name) => p.getByRole("combobox", { name, exact: true });
  async function choose(field, value) {
    await box(field).click();
    await p.getByRole("option", { name: value, exact: true }).click();
  }
  await box("排序字段").click();
  assert.equal(
    await p.getByRole("option", { name: "名称", exact: true }).count(),
    0,
  );
  await p.getByRole("option", { name: "发行年份", exact: true }).click();
  await choose("排序方向", "升序");
  await choose("清晰度", "1080p");
  await choose("中文字幕", "不支持");
  await p.getByRole("list", { name: "影片资料卡片" }).waitFor();
  assert.deepEqual(
    ["page", "sort", "direction", "resolution", "chineseSubtitles"].map(
      (name) => queries.at(-1)[name],
    ),
    ["1", "year", "asc", "1080p", "unsupported"],
  );
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.reload();
  assert.equal(await box("中文字幕").innerText(), "不支持");
  await choose("清晰度", "全部");
  await p.getByRole("list", { name: "影片资料卡片" }).waitFor();
  assert.equal(queries.at(-1).resolution, undefined);
  assert.equal(queries.at(-1).chineseSubtitles, "unsupported");
  await p.getByRole("button", { name: "清除筛选" }).click();
  await p.getByRole("list", { name: "影片资料卡片" }).waitFor();
  assert.equal(queries.at(-1).chineseSubtitles, undefined);
  assert.equal(queries.at(-1).sort, "year");
  assert.equal(queries.at(-1).direction, "asc");
});

test("管理片库按视图取图，缺图和图片请求失败可回退", async (t) => {
  const fixtures = new Map(responses);
  const covers = [
    { posterId: "poster", backdropId: "scene" },
    { posterId: "poster" },
    { backdropId: "scene" },
    { posterId: "poster", backdropId: "broken" },
    {},
  ];
  fixtures.set(
    "/api/manage/media",
    pageOf(
      covers.map((art, i) => ({
        ...catalog[i],
        ...art,
      })),
    ),
  );
  for (const [id, width, height] of [
    ["poster", 60, 90],
    ["scene", 108, 60],
  ]) {
    fixtures.set("/api/art/" + id, (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="tan"/></svg>`,
      }),
    );
  }
  fixtures.set("/api/art/broken", (route) => route.fulfill({ status: 404 }));
  const page = await openPage(t, "/manage/#media", { fixtures });
  const group = page.getByRole("group", { name: "影片展示方式" });
  const pick = (name) => group.getByRole("button", { name, exact: true });
  const boxes = page.locator(".film-cover");

  async function checkCovers(name, ratio, ids) {
    assert.equal(await pick(name).getAttribute("aria-pressed"), "true");
    await page.waitForFunction((ids) => {
      const boxes = Array.from(document.querySelectorAll(".film-cover"));
      return ids.every((id, i) => {
        const art = boxes[i]?.querySelector(".film-cover-art");
        const img = art?.querySelector("img");
        return (
          img?.naturalWidth > 0 &&
          img.src.endsWith("/api/art/" + id) &&
          getComputedStyle(art, "::before").backgroundImage.includes(img.src)
        );
      });
    }, ids);
    assert.equal(await boxes.last().innerText(), "暂无封面");
    assert.equal(await boxes.last().locator(".film-cover-art").count(), 0);
    for (const box of await boxes.all()) {
      const rect = await box.boundingBox();
      assert.ok(Math.abs(rect.width / rect.height - ratio) < 0.02);
    }
    assert.equal(
      await boxes
        .first()
        .locator("img")
        .evaluate((el) => getComputedStyle(el).objectFit),
      "contain",
    );
  }

  await checkCovers("横图", 3 / 2, ["scene", "poster", "scene", "poster"]);
  await pick("海报").click();
  await checkCovers("海报", 2 / 3, ["poster", "poster", "scene", "poster"]);
  await page.reload();
  await checkCovers("海报", 2 / 3, ["poster", "poster", "scene", "poster"]);
  await pick("列表").click();
  await page.getByRole("table", { name: "影片资料" }).waitFor();
  assert.equal(
    await page.locator(".catalog-art img").first().getAttribute("src"),
    "/api/art/scene",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await pick("横图").click();
  await checkCovers("横图", 3 / 2, ["scene", "poster", "scene", "poster"]);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
});

test("管理菜单按任务分组，新增演员按钮在静止与悬浮时都能读清", async (t) => {
  const fixtures = new Map(responses);
  fixtures.set("/api/people", pageOf([]));
  const page = await openPage(t, "/manage/#actors", { fixtures });
  const nav = page.getByRole("navigation", { name: "管理导航" });
  await nav.waitFor();
  const groups = await nav.locator("section").evaluateAll((sections) =>
    sections.map((section) => ({
      name: section.querySelector("p").textContent,
      routes: Array.from(section.querySelectorAll("a"), (link) => link.hash),
    })),
  );
  assert.deepEqual(groups, [
    { name: "工作区", routes: ["#ingest", "#media"] },
    {
      name: "资料维护",
      routes: [
        "#actors",
        "#series",
        "#collections",
        "#categories",
        "#tags",
        "#organizations",
      ],
    },
    { name: "运行", routes: ["#jobs", "#settings"] },
  ]);
  const button = page.getByRole("button", { name: /新增演员/ });
  async function assertReadable(state) {
    const ratio = await button.evaluate(async (el) => {
      const style = getComputedStyle(el);
      // 先结算当前样式，再读取过渡完成后的实际前景与底色。
      void style.backgroundColor;
      await Promise.all(el.getAnimations().map((a) => a.finished));
      const ctx = document.createElement("canvas").getContext("2d");
      function luminance(color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data, (n) => {
          const v = n / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      const bg = luminance(style.backgroundColor);
      const fg = luminance(style.color);
      return (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
    });
    assert.ok(ratio >= 4.5, state + " 的文字对比度为 " + ratio.toFixed(2));
  }
  await assertReadable("默认");
  await button.hover();
  await assertReadable("悬浮");
});

test("窄屏无封面影片可选版本，关闭收藏夹回到影片，退出回到列表", async (t) => {
  const p = await openPage(t, "/", { viewport: { width: 390, height: 844 } });
  const card = p.getByRole("button", { name: "查看" + film.title });
  await card.click();
  const dialog = p.getByRole("dialog", { name: film.title });
  const picker = dialog.getByRole("combobox", { name: "播放版本" });
  await picker.selectOption("two");
  assert.equal(await picker.inputValue(), "two");
  assert.equal(await dialog.locator(".detail-hero img").count(), 0);
  assert.equal(
    await dialog.getByRole("heading", { name: "故事简介" }).count(),
    0,
  );
  assert.equal(await dialog.getByRole("heading", { name: "剧照" }).count(), 0);
  assert.ok(await dialog.evaluate((n) => n.scrollWidth <= n.clientWidth));
  await dialog.getByRole("button", { name: "收藏夹", exact: true }).click();
  await p.getByRole("dialog", { name: "加入收藏夹" }).waitFor();
  await p.keyboard.press("Escape");
  await picker.waitFor();
  assert.equal(await picker.inputValue(), "two");
  await dialog.getByRole("button", { name: "返回列表" }).click();
  await card.waitFor();
});

test("片库只允许把可发布的已核对文件追加到当前影片", async (t) => {
  const fixtures = new Map(responses);
  const draft = {
    id: "test-4k",
    revision: 3,
    fields: { title: "测试片 4K" },
    relativePath: "Download/test-4k.mp4",
    probeStatus: "succeeded",
    availability: "present",
  };
  const blocked = {
    ...draft,
    id: "unplanned",
    fields: { title: "缺少整理目标" },
    needsTarget: true,
  };
  const endpoint = "/api/imports/" + draft.id + "/publish-edition";
  fixtures.set("/api/media/" + film.id, { ...film, releaseDate: "2026-04-20" });
  fixtures.set("/api/imports", { ...pageOf([draft, blocked]), groups: [] });
  fixtures.set(endpoint, { ...draft, publishedMediaId: film.id });
  const p = await openPage(t, "/manage/#media/" + film.id, { fixtures });
  await p.getByRole("button", { name: "版本与文件", exact: true }).click();
  await p.getByRole("button", { name: "追加版本" }).click();
  const picker = p.getByRole("dialog", { name: "追加播放版本" });
  const publish = picker.getByRole("button", { name: "确认追加并发布" });
  assert.ok(
    await picker.getByRole("radio", { name: /缺少整理目标/ }).isDisabled(),
  );
  assert.ok(await publish.isDisabled());
  await picker.getByRole("radio", { name: /测试片 4K/ }).check();
  assert.equal(await picker.getByRole("button", { name: "上一页" }).count(), 0);
  assert.equal(
    await picker.locator("dd").last().innerText(),
    draft.relativePath,
  );
  await picker.getByLabel("版本名称").fill("4K");
  const [request] = await Promise.all([
    p.waitForRequest(
      (r) => r.url() === base + endpoint && r.method() === "POST",
    ),
    publish.click(),
  ]);
  assert.deepEqual(request.postDataJSON(), {
    expectedRevision: 3,
    mediaId: film.id,
    name: "4K",
  });
  await p.getByText("新版本已发布", { exact: false }).waitFor();
});

test("片库读取失败后可以重试，成功后恢复影片卡片", async (t) => {
  const fixtures = new Map(responses);
  let recovered = false;
  fixtures.set("/api/media", (route) =>
    recovered
      ? route.fulfill({ json: pageOf([film]) })
      : route.fulfill({ status: 503, json: { message: "暂时无法读取" } }),
  );
  const p = await openPage(t, "/", { fixtures });
  const error = p.getByRole("alert").filter({ hasText: "影片加载失败" });
  await error.waitFor();
  assert.equal(await p.getByText("没有符合条件的影片").count(), 0);
  recovered = true;
  await error.getByRole("button", { name: "重新加载" }).click();
  await p.getByRole("button", { name: "查看" + film.title }).waitFor();
  assert.equal(await error.count(), 0);
});
test("有图与无图续播共用固定缩略图区，桌面详情与来源卡片衔接", async (t) => {
  const fixtures = new Map(responses);
  const plain = {
    ...film,
    title: "长片名验收-ABCDEFGHIJKLMNOPQRSTUVWXYZ-作品终章",
    durationMs: 12000,
    resumeMs: 6000,
  };
  const featured = {
    ...film,
    id: "featured",
    title: "有剧照的影片",
    backdropId: "scene",
    posterId: "poster",
    linkedFileCount: 0,
    durationMs: 12000,
    resumeMs: 4500,
  };
  fixtures.set("/api/media", pageOf([plain, featured]));
  fixtures.set("/api/media/featured", {
    ...featured,
    summary: "从第一幕到终场。\n第二幕。",
    stillIds: ["still-b", "still-a"],
  });
  for (const id of ["scene", "poster", "still-a", "still-b"])
    fixtures.set("/api/art/" + id, (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="52"><rect width="80" height="52" fill="tan"/></svg>',
      }),
    );
  const p = await openPage(t, "/", {
    fixtures,
    viewport: { width: 1440, height: 900 },
  });
  await p
    .getByRole("navigation", { name: "观看导航" })
    .getByRole("button", { name: "发现" })
    .click();
  await p.getByRole("heading", { name: featured.title, exact: true }).waitFor();
  const shelf = p.getByRole("region", { name: "继续观看" });
  await shelf.getByRole("progressbar").last().waitFor();
  const [a, b] = await shelf.getByRole("button").evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      const art = card.querySelector(".resume-art").getBoundingClientRect();
      const copy = card.querySelector(".resume-copy").getBoundingClientRect();
      return {
        y: box.y,
        height: box.height,
        artWidth: art.width,
        artHeight: art.height,
        textWidth: copy.width,
      };
    }),
  );
  assert.deepEqual(a, b);
  assert.ok(
    a.artWidth >= 60 &&
      a.artWidth < 120 &&
      a.artHeight <= 64 &&
      a.textWidth > 100,
  );
  const trigger = p.getByRole("button", { name: "查看影片", exact: true });
  await trigger.click();
  const dialog = p.getByRole("dialog", { name: featured.title });
  await dialog.getByText("尚未关联视频").waitFor();
  await dialog.getByText("从第一幕到终场。 第二幕。").waitFor();
  const firstStill = dialog.getByRole("button", { name: "查看第 1 张剧照" });
  await firstStill.click();
  const preview = p.getByRole("dialog", { name: "剧照预览" });
  assert.equal(
    await preview.getByRole("img").getAttribute("src"),
    "/api/art/still-b",
  );
  await p.keyboard.press("ArrowRight");
  assert.equal(
    await preview.getByRole("img").getAttribute("src"),
    "/api/art/still-a",
  );
  await p.keyboard.press("Escape");
  await preview.waitFor({ state: "hidden" });
  assert.ok(await firstStill.evaluate((el) => el === document.activeElement));
  const hero = await dialog.locator(".detail-hero").boundingBox(),
    poster = await dialog.locator(".detail-poster").boundingBox(),
    title = await dialog
      .getByRole("heading", { name: featured.title })
      .boundingBox();
  assert.ok(hero.width > 1440 * 0.84 && poster.x + poster.width <= title.x);
  await p.keyboard.press("Escape");
  await p.waitForFunction(() =>
    document.activeElement?.textContent.includes("查看影片"),
  );
});

test("演员、系列键盘切换并打开各自的资料和作品，返回时恢复原入口", async (t) => {
  const fixtures = new Map(responses);
  const actor = {
    id: "a",
    fullName: "示例演员",
    detailedName: "Sample Actor",
    workCount: 1,
  };
  const series = {
    id: "s",
    name: "示例系列",
    description: "系列介绍",
    workCount: 1,
  };
  for (const [path, record] of [
    ["people", actor],
    ["franchises", series],
  ]) {
    fixtures.set("/api/" + path, pageOf([record]));
    fixtures.set("/api/" + path + "/" + record.id, {
      record,
      firstYear: 2026,
      lastYear: 2026,
      cast: ["同片演员"],
    });
  }
  const p = await openPage(t, "/", { fixtures });
  const actorTab = p.getByRole("tab", { name: /演员/ });
  await actorTab.hover();
  assert.equal(
    await actorTab.evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  const filmTab = p.getByRole("tab", { name: /影片/ });
  await filmTab.focus();
  for (const [previous, name, kind, id, param, label] of [
    [filmTab, actor.fullName, "演员", "a", "actorId", "参演作品"],
    [actorTab, series.name, "系列", "s", "franchiseId", "系列作品"],
  ]) {
    await previous.press("ArrowRight");
    assert.equal(
      await p
        .getByRole("tab", { name: new RegExp(kind) })
        .getAttribute("aria-selected"),
      "true",
    );
    const entry = p.getByRole("button", { name: new RegExp(name) });
    await Promise.all([
      p.waitForRequest((r) => new URL(r.url()).searchParams.get(param) === id),
      entry.click(),
    ]);
    await p.getByRole("heading", { name, exact: true }).waitFor();
    await p.getByText(/同片演员/).waitFor();
    await p.getByRole("heading", { name: label }).waitFor();
    await p.getByRole("button", { name: "查看" + film.title }).waitFor();
    assert.equal(
      await p.getByRole("button", { name: "筛选", exact: true }).count(),
      0,
    );
    assert.equal(await p.locator(".vx-category-bar").count(), 0);
    await p.getByRole("button", { name: "返回上一页" }).click();
    await entry.waitFor();
    await p.waitForFunction(
      (n) => document.activeElement?.textContent.includes(n),
      name,
    );
  }
});

test("手机发现页搜索进入片库，收藏筛选与新建收藏夹遵循当前上下文", async (t) => {
  const p = await openPage(t, "/", { viewport: { width: 390, height: 844 } });
  const nav = p.getByRole("navigation", { name: "主导航" });
  await nav.getByRole("button", { name: "发现" }).click();
  assert.equal(await p.locator(".vx-discover-hero").count(), 0);
  await p.getByRole("button", { name: "搜索片库" }).click();
  const query = p.getByRole("textbox", { name: "搜索片库" });
  await Promise.all([
    p.waitForRequest((r) => new URL(r.url()).searchParams.get("q") === "测试"),
    query.fill("测试"),
  ]);
  assert.equal(
    await nav
      .getByRole("button", { name: "片库" })
      .getAttribute("aria-current"),
    "page",
  );
  await p.getByRole("button", { name: "取消" }).click();
  await nav.getByRole("button", { name: "收藏" }).click();
  await p.getByRole("button", { name: "筛选", exact: true }).click();
  const filters = p.getByRole("dialog", { name: "筛选影片" });
  await filters.waitFor();
  assert.equal(
    await filters.getByRole("button", { name: "未喜欢" }).count(),
    0,
  );
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "查看" + film.title }).click();
  const detail = p.getByRole("dialog", { name: film.title });
  await detail.getByRole("button", { name: "收藏夹", exact: true }).click();
  const picker = p.getByRole("dialog", { name: "加入收藏夹" });
  await picker.getByRole("button", { name: "新建收藏夹" }).click();
  await p.getByRole("dialog", { name: "新建收藏夹" }).waitFor();
  await p.keyboard.press("Escape");
  await picker.waitFor();
  await p.keyboard.press("Escape");
  await detail.getByRole("combobox", { name: "播放版本" }).waitFor();
});

test("系统状态分开显示录入工作区、图片仓库与已登记的影片盘", async (t) => {
  const fixtures = new Map(responses);
  fixtures.set("/api/system/status", {
    checkedAt: "2026-11-25T10:00:00Z",
    media: {
      path: "/media/library",
      state: "online",
      space: { total: 126e12, used: 72e12, available: 54e12 },
    },
    disks: [],
    mediaRoots: [
      {
        name: "样本盘 A",
        path: "/legacy/A",
        state: "online",
        space: { total: 12e12, used: 9e12, available: 3e12 },
        capacityCheckedAt: "2026-11-25T10:00:00Z",
      },
      {
        name: "样本盘 B",
        path: "/legacy/B",
        state: "online",
        space: null,
        capacityCheckedAt: null,
      },
      {
        name: "样本盘 C",
        path: "/legacy/C",
        state: "offline",
        space: null,
        capacityCheckedAt: null,
      },
    ],
    art: { path: "/var/lib/video-x/art", bytes: 100, state: "writable" },
    pending: 0,
    postgres: "16",
    worker: null,
    ffprobe: null,
    ffmpeg: null,
    version: "0.1.0",
    compose: true,
    listenHost: "0.0.0.0",
    origins: [],
    sources: [],
  });
  const page = await openPage(t, "/manage/#settings", { fixtures });
  await page.getByText("录入工作区", { exact: true }).waitFor();
  await page.getByText("图片存储", { exact: true }).waitFor();
  const disks = page.getByRole("region", { name: "影片盘" });
  assert.equal(await disks.getByRole("listitem").count(), 3);
  assert.equal(
    await disks.getByRole("progressbar", { name: "样本盘 A已用空间" }).count(),
    1,
  );
  assert.ok(await disks.getByText("暂无可信的容量读数").isVisible());
  assert.ok(await disks.getByText("离线或缺少标识").isVisible());
  assert.equal(await page.getByText(/126 TB/).count(), 0);
});
