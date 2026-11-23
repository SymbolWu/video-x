import { load } from "cheerio/slim";
import type { MetadataProvider, Choice, LookupResult } from "./providers.js";

const canonical = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[\s_-]+/g, "")
    .toUpperCase();
const text = (s: string) => s.replace(/\s+/g, " ").trim();
const names = (values: string[], max = 300) =>
  [...new Set(values.map(text).filter((s) => s && s.length <= max))].slice(
    0,
    100,
  );
const detailPath = /^\/v\/[a-z\d]+\/?$/i;

function checkPage(html: string) {
  if (
    /<title[^>]*>[^<]*(just a moment|access denied|captcha|驗證|security check)/i.test(
      html,
    )
  )
    throw Error("JavDB 要求网站验证，未取得资料。");
}
export function parseSearch(html: string, base: URL): Choice[] {
  checkPage(html);
  const $ = load(html);
  if (
    !$(".movie-list").length &&
    !$(".empty-message,.no-result,.no-results").length
  )
    throw Error("JavDB 搜索结构无法识别，可能需要登录或页面已变更。");
  const found = new Map<string, Choice>();
  $(".movie-list a[href]").each((_, el) => {
    const a = $(el),
      identifier = text(a.find(".video-title strong").first().text()),
      href = a.attr("href");
    if (!identifier || !href) return;
    const url = new URL(href, base);
    if (url.origin !== base.origin || !detailPath.test(url.pathname)) return;
    url.search = "";
    url.hash = "";
    found.set(url.href, {
      identifier,
      title: text(a.find(".video-title").text()).slice(0, 1000) || identifier,
      url: url.href,
    });
  });
  return [...found.values()].slice(0, 30);
}
export function parseDetail(html: string, url: URL) {
  checkPage(html);
  const $ = load(html);
  const rows = $(".movie-panel-info .panel-block");
  if (!rows.length)
    throw Error("JavDB 未返回详情资料面板，请检查页面或登录状态。");
  const values = new Map<string, string>(),
    links = new Map<string, string[]>();
  const references: NonNullable<
    import("./providers.js").Candidate["references"]
  > = [];
  const kinds: Record<string, (typeof references)[number]["kind"]> = {
    演員: "actors",
    演员: "actors",
    系列: "series",
    類別: "tags",
    类别: "tags",
    分類: "tags",
    導演: "directors",
    导演: "directors",
    片商: "studios",
    發行: "studios",
    发行: "studios",
  };
  rows.each((_, n) => {
    const name = text($(n).children("strong").first().text()).replace(
        /[:：]\s*$/,
        "",
      ),
      v = $(n).children("span.value,span").first();
    values.set(name, text(v.text()));
    const a =
      name === "演員" || name === "演员"
        ? v.find('a[href*="/actors/"]')
        : v.find("a");
    const kind = kinds[name];
    if (kind)
      a.each((_, el) => {
        const href = $(el).attr("href"),
          label = text($(el).text());
        if (!href || !label) return;
        const dest = URL.parse(href, url);
        if (
          dest?.origin === url.origin &&
          !dest.username &&
          !dest.password &&
          references.length < 300
        )
          references.push({ kind, name: label, url: dest.href });
      });
    links.set(name, a.map((_, el) => $(el).text()).get());
  });
  const v = (...keys: string[]) =>
    keys.map((k) => values.get(k)).find(Boolean) || "";
  const l = (...keys: string[]) =>
    names(keys.flatMap((k) => links.get(k) ?? []));
  const identifier = v("番號", "番号", "識別碼");
  const title = text(
    $(".current-title").first().text() ||
      $("h2.title,h1.title")
        .first()
        .clone()
        .find("button,a")
        .remove()
        .end()
        .text(),
  )
    .split(/顯示原標題|显示原标题/)[0]
    ?.trim();
  if (!identifier || !title) throw Error("JavDB 详情缺少可识别的标题或编号。");
  const rawDate = v("日期", "發行日期", "发行日期").replaceAll("/", "-");
  const day =
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
    !Number.isNaN(Date.parse(rawDate)) &&
    new Date(rawDate).toISOString().slice(0, 10) === rawDate
      ? rawDate
      : null;
  const cover =
    $(".video-cover").first().attr("src") ||
    $(".video-cover").first().attr("data-src");
  return {
    coverUrl: cover ? (URL.parse(cover, url)?.href ?? null) : null,
    candidate: {
      title: title.slice(0, 1000),
      identifier: identifier.slice(0, 160),
      url: url.href,
      references,
      previews: [
        ...new Set(
          $(".preview-images .tile-item[href]")
            .map((_, el) => URL.parse($(el).attr("href")!, url))
            .get()
            .filter(
              (x) => x.protocol === "https:" && !x.username && !x.password,
            )
            .map((x) => x.href),
        ),
      ].slice(0, 60),
      releaseDate: day,
      summary:
        text(
          $(".video-description,.movie-summary,[itemprop=description]")
            .first()
            .text(),
        ).slice(0, 50000) || null,
      actors: l("演員", "演员"),
      directors: l("導演", "导演"),
      series: l("系列"),
      tags: names(l("類別", "类别", "分類"), 120),
      studios: l("片商", "發行", "发行"),
      supportsChinese: /中文字幕|中文翻譯|中文翻译/.test(
        $(".message-body").text(),
      )
        ? true
        : null,
    },
  };
}

async function readURL(
  url: URL,
  allow: (url: URL) => boolean,
  headers: Record<string, string>,
  limit: number,
  redirects = 0,
): Promise<Buffer> {
  if (!allow(url) || redirects > 3) throw Error("资料源返回了未配置的地址。");
  const r = await fetch(url, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(18000),
  });
  if (r.status >= 300 && r.status < 400 && r.headers.has("location")) {
    await r.body?.cancel();
    return readURL(
      new URL(r.headers.get("location")!, url),
      allow,
      headers,
      limit,
      redirects + 1,
    );
  }
  if (!r.ok || !r.body) {
    await r.body?.cancel();
    throw Error("JavDB 请求失败（HTTP " + r.status + "）。");
  }
  const reader = r.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw Error("来源响应超出大小限制。");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function javdbProvider(
  base = new URL(process.env.VIDEO_X_JAVDB_BASE_URL || "https://javdb.com"),
): MetadataProvider {
  const allowed = (url: URL) =>
    url.protocol === "https:" &&
    url.origin === base.origin &&
    !url.username &&
    !url.password;
  const imageAllowed = (url: URL) =>
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "443") &&
    (url.origin === base.origin ||
      /^(?:[a-z0-9-]+\.)*jdbstatic\.com$/i.test(url.hostname) ||
      (process.env.VIDEO_X_JAVDB_IMAGE_HOSTS ?? "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)
        .includes(url.hostname));
  const page = async (url: URL) => {
    const headers: Record<string, string> = {
      accept: "text/html",
      "accept-language": "zh-TW,zh;q=0.8",
    };
    if (process.env.VIDEO_X_JAVDB_COOKIE)
      headers.cookie = process.env.VIDEO_X_JAVDB_COOKIE;
    return (await readURL(url, allowed, headers, 3 * 1024 * 1024)).toString(
      "utf8",
    );
  };
  return {
    code: "javdb",
    name: "JavDB",
    async lookup(query): Promise<LookupResult> {
      const input = query.trim();
      let url: URL, selected: Choice | undefined;
      if (/^https?:/i.test(input)) {
        url = new URL(input);
        if (!allowed(url) || !detailPath.test(url.pathname))
          throw Error("请填写当前 JavDB 站点的 /v/ 详情页地址。");
        url.search = "";
        url.hash = "";
      } else {
        url = new URL("/search", base);
        url.searchParams.set("q", input);
        url.searchParams.set("f", "all");
        const choices = parseSearch(await page(url), base);
        const exact = choices.filter(
          (o) => canonical(o.identifier) === canonical(input),
        );
        if (exact.length !== 1) {
          if (!choices.length) throw Error("没有找到匹配的影片。");
          return { choices };
        }
        selected = exact[0];
        url = new URL(selected!.url);
      }
      const { candidate, coverUrl } = parseDetail(await page(url), url);
      if (
        selected &&
        canonical(selected.identifier) !== canonical(candidate.identifier)
      )
        throw Error("搜索编号与详情页编号不一致，请手动选择详情页。");
      if (!coverUrl) return { candidate };
      try {
        return {
          candidate,
          cover: await readURL(
            new URL(coverUrl),
            imageAllowed,
            { accept: "image/jpeg,image/png" },
            6 * 1024 * 1024,
          ),
        };
      } catch {
        return { candidate, warning: "封面读取失败，其余返回字段可核对。" };
      }
    },
  };
}
export const javdb = javdbProvider();
