const root = document.querySelector("#screen");
const dialog = document.querySelector("#dialog");
const phoneDemo = new URLSearchParams(location.search).has("phone");
document.body.classList.toggle("phone-demo", phoneDemo);
const asset = "../../2026-11-redesign/assets/cinema/";
const dune = "693134",
  sparse = "lumen";
const qualities = {
  1080: ["1080p", "1920 × 1080"],
  2160: ["4K UHD", "3840 × 2160"],
};
const icons = {
  back: "m14 5-7 7 7 7",
  next: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  play: "M8 4.8 19 12 8 19.2Z",
  heart:
    "M20.5 5.5a5 5 0 0 0-7.1 0L12 7l-1.4-1.5a5 5 0 0 0-7.1 7.1L12 21l8.5-8.4a5 5 0 0 0 0-7.1Z",
  list: "M4 5h16M4 12h16M4 19h16",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  tune: "M3 7h5m5 0h8M3 17h10m5 0h3M8 4v6m7 4v6",
  search: "M16.5 16.5 21 21M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 1 1 15 0",
  check: "m4 12 5 5L20 6",
  stack: "m3 8 9-5 9 5-9 5Zm0 5 9 5 9-5m-18 5 9 5 9-5",
  folder: "M3 6h7l2 3h9v11H3z",
  film: "M3 3h18v18H3zM7 3v18M17 3v18M3 8h4M3 16h4m10-8h4m-4 8h4",
  expand: "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5",
  close: "m6 6 12 12M18 6 6 18",
  plus: "M12 4v16M4 12h16",
  arrow: "M4 12h15m-6-6 6 6-6 6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0m-9-5v5l3 2",
  restart: "M3 11a9 9 0 1 1 2 7M3 4v7h7",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
  monitor: "M3 4h18v13H3zM8 21h8m-4-4v4",
  edit: "m4 16 12-12 4 4L8 20l-5 1z",
};
const svg = (name, size = 18) =>
  '<svg aria-hidden="true" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="' +
  (name === "play" ? "currentColor" : "none") +
  '" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="' +
  icons[name] +
  '"/></svg>';
const escapeHtml = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const button = (act, html, cl = "", attrs = "") =>
  '<button type="button" class="' +
  cl +
  '" data-do="' +
  act +
  '" ' +
  attrs +
  ">" +
  html +
  "</button>";
const link = (hash, label, cl = "") =>
  '<a class="' + cl + '" href="#' + hash + '">' + label + "</a>";
const byId = (id) => films.find((f) => f.id === id) || films[0];
const demo = new URLSearchParams(location.search).get("demo") || "preview";
const storagePrefix = "vx.screening.2." + demo + ".";
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(storagePrefix + key));
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(storagePrefix + key, JSON.stringify(value));
  } catch {}
};
const editionList = (id) =>
  id === dune || (id === sparse && read("appended"))
    ? ["1080", "2160"]
    : id === sparse
      ? ["1080"]
      : [];
const selected = (id) => {
  const list = editionList(id),
    pref = read("selected." + id);
  return list.includes(pref) ? pref : list[0];
};
const position = (id, q) =>
  read("position." + id + "." + q) ?? (id === dune && q === "1080" ? 9 : 0);
const clock = (sec) =>
  Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
const poster = (f) => asset + f.id + "-poster.jpg";
const backArt = (f) =>
  f.id === dune ? "../concepts/desert.jpg" : asset + f.id + "-backdrop.jpg";
const qName = (q) => qualities[q]?.[0] || "";
const fav = (id) => !!read("fav." + id);
const wordmark = '<span class="wordmark">video<span>—x</span></span>';
const sectionTitle = (title, extra = "") =>
  '<div class="section-head"><h2>' + title + "</h2>" + extra + "</div>";
const route = () => {
  const [area = "film", id = dune] = location.hash.slice(1).split("/");
  return { area: area || "film", id };
};
const defaultList = "library";
let previousRoute = null,
  restoreScroll = 0,
  libraryFilter = "全部",
  query = "",
  restartOnOpen = false,
  rememberTime = 0,
  pendingDateBack = false;
let toastTimer;
function toast(text) {
  const n = document.querySelector("#notice");
  n.textContent = text;
  n.classList.add("shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    n.classList.remove("shown");
    n.textContent = "";
  }, 2300);
}
function sheet(title, body, wide = false) {
  dialog.className = wide ? "wide" : "";
  dialog.innerHTML =
    '<header><h2 id="dialog-title">' +
    title +
    "</h2>" +
    button("close", svg("close"), "icon", 'aria-label="关闭"') +
    "</header>" +
    body;
  if (!dialog.open) dialog.showModal();
}
function thumb(f) {
  return f.id === sparse
    ? '<div class="cover missing">' + svg("film", 26) + "</div>"
    : '<img class="cover" alt="" loading="lazy" src="' + poster(f) + '">';
}
function card(f) {
  return link(
    "film/" + f.id,
    thumb(f) +
      "<strong>" +
      f.title +
      "</strong><small>" +
      (f.year ? f.year + " · " + f.category : "35 秒 · 本地样片") +
      "</small>",
    "film-card",
  );
}
function header(active, studio = false) {
  if (phoneDemo && !studio) {
    const isFilm = route().area === "film";
    return (
      '<header class="mobile-bar">' +
      (isFilm ? link("library", svg("back") + "片库", "quiet") : wordmark) +
      '<div class="mast-end">' +
      button("search", svg("search"), "icon", 'aria-label="搜索片库"') +
      "</div></header>"
    );
  }
  return (
    '<header class="mast"><div class="wrap mast-inner">' +
    link(studio ? "manage/lumen" : defaultList, wordmark, "brand") +
    '<i class="barline"></i>' +
    (studio
      ? '<strong class="studio-name">资料管理</strong>'
      : '<nav aria-label="观看导航">' +
        link("library", "片库", active === "library" ? "current" : "") +
        link("likes", "喜欢", active === "likes" ? "current" : "") +
        "</nav>") +
    '<div class="mast-end">' +
    (studio
      ? link("film/lumen", svg("play", 14) + "观看端", "subtle")
      : button("search", svg("search", 19), "icon", 'aria-label="搜索片库"')) +
    "</div></div></header>"
  );
}
function subbar(parts) {
  return '<div class="crumb">' + parts.join("<span>/</span>") + "</div>";
}
function lib(liked) {
  let list = films.filter(
    (f) =>
      (!liked || fav(f.id)) &&
      (libraryFilter === "全部" ||
        (f.category || "未分类") === libraryFilter) &&
      f.title.includes(query),
  );
  return (
    header(liked ? "likes" : "library") +
    '<main class="wrap library">' +
    subbar([wordmark, liked ? "喜欢" : "片库"]) +
    '<div class="lib-head"><h1>' +
    (liked ? "喜欢" : "影片资料库") +
    "</h1><small>" +
    list.length +
    ' 部影片</small></div><div class="lib-tools">' +
    button(
      "filters",
      svg("tune") +
        " " +
        (libraryFilter === "全部" ? "筛选分类" : libraryFilter),
      "secondary",
    ) +
    (query
      ? button(
          "clear-query",
          "搜索「" + escapeHtml(query) + "」 " + svg("close", 14),
          "quiet",
        )
      : "") +
    '</div><div class="cards">' +
    list.map(card).join("") +
    "</div>" +
    (!list.length ? '<p class="empty">当前条件下没有影片。</p>' : "") +
    "</main>"
  );
}
function detail(f) {
  const sparseFilm = f.id === sparse,
    options = editionList(f.id),
    q = selected(f.id),
    saved = position(f.id, q);
  const play = options.length
    ? button(
        "play",
        svg("play") +
          (saved ? "继续播放" : "播放样片") +
          (saved ? '<span class="btn-time">' + clock(saved) + "</span>" : ""),
        "primary",
      )
    : '<span class="unbound">尚未绑定可播放文件</span>';
  const versions = options.length
    ? button(
        "versions",
        svg("stack") + " " + qName(q) + svg("down", 14),
        "glass",
        'aria-label="选择播放版本"',
      )
    : "";
  const meta = [
    f.year || read("date")?.slice(0, 4),
    f.category,
    sparseFilm ? "35 秒" : f.minutes + " 分钟",
  ].filter(Boolean);
  const personal =
    button(
      "like",
      svg("heart", 16) + (fav(f.id) ? "已喜欢" : "喜欢"),
      "quiet",
      'aria-pressed="' + fav(f.id) + '"',
    ) + button("collection", svg("folder", 16) + "收藏夹", "quiet");
  const hero =
    '<section class="feature ' +
    (sparseFilm ? "compact" : "") +
    '">' +
    (!sparseFilm
      ? '<img class="feature-art" src="' + backArt(f) + '" alt="">'
      : "") +
    '<div class="wrap feature-inner">' +
    subbar([link("library", svg("back", 13) + "片库"), "影片详情"]) +
    '<div class="hero-type">' +
    (sparseFilm
      ? '<span class="catalog-code">' + f.code + "</span>"
      : '<p class="original">' + f.original + "</p>") +
    "<h1>" +
    f.title +
    '</h1><div class="film-meta">' +
    meta.map((x) => "<span>" + x + "</span>").join("") +
    '</div><div class="hero-actions">' +
    play +
    versions +
    "</div></div></div></section>";
  const editions = options
    .map((v) =>
      button(
        "edition:" + v,
        '<span class="format">' +
          (v === "2160" ? "4K" : "HD") +
          '</span><span class="edition-main"><strong>' +
          qName(v) +
          "</strong><small>" +
          qualities[v][1] +
          ' · H.264</small></span><span class="edition-tail">' +
          (v === q ? svg("check", 15) + " 当前" : "选择") +
          "</span>",
        "edition-row",
        'aria-pressed="' + (v === q) + '"',
      ),
    )
    .join("");
  const cast = f.cast
    .map(
      ([i, n]) =>
        '<li><img class="avatar" src="' +
        asset +
        "person-" +
        i +
        '.jpg" alt=""><span>' +
        n +
        "</span></li>",
    )
    .join("");
  const info =
    '<div class="article">' +
    (f.summary
      ? sectionTitle("剧情简介") + '<p class="summary">' + f.summary + "</p>"
      : "") +
    (cast
      ? sectionTitle("主要演员") + '<ul class="cast">' + cast + "</ul>"
      : "") +
    sectionTitle("我的记录") +
    '<div class="personal">' +
    personal +
    button(
      "seen",
      svg("check", 16) + (read("seen." + f.id) ? "已看" : "标记已看"),
      "quiet",
      'aria-pressed="' + !!read("seen." + f.id) + '"',
    ) +
    button(
      "rating",
      svg("star", 16) +
        (read("rating." + f.id) ? read("rating." + f.id) + " 星" : "评分"),
      "quiet",
    ) +
    "</div></div>";
  const pocket =
    phoneDemo && options.length
      ? '<div class="pocket-actions">' + play + versions + "</div>"
      : "";
  return (
    header("library") +
    '<main class="detail-main">' +
    hero +
    '<div class="wrap under"><div class="details-grid">' +
    info +
    '<section class="editions">' +
    sectionTitle(
      "播放版本",
      '<span class="count">' + options.length + "</span>",
    ) +
    (editions || '<p class="quiet-text">暂无可用版本</p>') +
    (options.length ? "<footer>本地预览使用 35 秒测试片</footer>" : "") +
    '</section></div><section class="related">' +
    sectionTitle(
      "片库中的其他影片",
      link("library", "查看片库 " + svg("arrow", 15), "quiet"),
    ) +
    '<div class="cards">' +
    films
      .filter((g) => g.id !== f.id)
      .slice(0, 6)
      .map(card)
      .join("") +
    "</div></section></div>" +
    pocket +
    "</main>"
  );
}
function playerMarkup(f) {
  const q = selected(f.id);
  if (!q) return detail(f);
  return (
    '<main class="theater"><header>' +
    button(
      "exit",
      svg("back") + "<span>影片详情</span>",
      "player-back",
      'aria-label="返回影片详情"',
    ) +
    '<div class="now"><strong>' +
    f.title +
    "</strong><small>播放样片</small></div>" +
    button(
      "versions",
      svg("stack") + qName(q) + svg("down", 13),
      "player-quality",
      'aria-label="切换播放版本"',
    ) +
    '</header><div class="stage"><video controls autoplay playsinline preload="auto" src="media/' +
    q +
    '.mp4" aria-label="' +
    qName(q) +
    ' 测试短片"></video></div><footer><span>' +
    svg("monitor", 16) +
    qualities[q][1] +
    "<b>·</b>H.264</span>" +
    button("fullscreen", svg("expand", 16) + "全屏", "quiet") +
    '</footer><p class="player-error" role="alert" hidden></p></main>'
  );
}
function attachPlayer(f) {
  const v = root.querySelector("video");
  if (!v) return;
  const q = selected(f.id),
    offset = restartOnOpen ? 0 : position(f.id, q);
  restartOnOpen = false;
  rememberTime = 0;
  v.addEventListener(
    "loadedmetadata",
    () => {
      v.currentTime = Math.min(offset, Math.max(0, v.duration - 0.2));
      v.play().catch(() => {});
    },
    { once: true },
  );
  const save = () => {
    if (
      v.readyState >= 2 &&
      !v.ended &&
      Math.abs(v.currentTime - rememberTime) > 0.35
    ) {
      write("position." + f.id + "." + q, v.currentTime);
      rememberTime = v.currentTime;
    }
  };
  v.addEventListener("timeupdate", save);
  v.addEventListener("pause", save);
  v.addEventListener("ended", () => write("position." + f.id + "." + q, 0));
  v.addEventListener("error", () => {
    const n = root.querySelector(".player-error");
    if (n) {
      n.hidden = false;
      n.textContent = "样片载入失败，请返回详情重新打开。";
    }
  });
}
function versionSheet(f, playing) {
  const q = selected(f.id);
  sheet(
    "播放版本",
    '<div class="sheet-body">' +
      editionList(f.id)
        .map((v) => {
          const at = position(f.id, v);
          return button(
            "choose:" + v,
            '<span class="format">' +
              (v === "2160" ? "4K" : "HD") +
              '</span><span class="edition-main"><strong>' +
              qName(v) +
              "</strong><small>" +
              qualities[v][1] +
              " · " +
              (at ? "看到 " + clock(at) : "从头播放") +
              "</small></span>" +
              (v === q ? svg("check") : "<span></span>"),
            "edition-row",
            'aria-pressed="' + (v === q) + '"',
          );
        })
        .join("") +
      "</div>" +
      (!playing && position(f.id, q)
        ? '<div class="sheet-foot">' +
          button("restart", svg("restart") + "从头播放当前版本", "secondary") +
          "</div>"
        : ""),
  );
}
function adminView() {
  const options = editionList(sparse),
    date = read("date");
  return (
    header("", true) +
    '<main class="wrap editor">' +
    subbar(["影片资料库", "影片编辑"]) +
    '<div class="edit-head"><div><span class="catalog-code">VX-LUMEN-01</span><h1>流明 · 双版本测试片</h1></div>' +
    link("film/lumen", "查看观看页 " + svg("arrow", 16), "secondary") +
    "</div>" +
    '<div class="edit-layout"><nav aria-label="资料编辑分区">' +
    link(
      "basic/lumen",
      "基本资料",
      route().area === "basic" ? "selected" : "",
    ) +
    link(
      "manage/lumen",
      "版本与文件",
      route().area === "manage" ? "selected" : "",
    ) +
    '</nav><section class="panel">' +
    (route().area === "basic"
      ? sectionTitle("基本资料") +
        '<form id="date-form"><label for="day">发行日期 <span class="required">必填</span></label><input id="day" type="date" min="0001-01-01" max="9999-12-31" required value="' +
        (date || "") +
        '"><button class="primary" type="submit">保存' +
        (pendingDateBack ? "并返回版本" : "") +
        "</button></form>"
      : sectionTitle(
          "版本与文件",
          options.length < 2
            ? button("append", svg("plus", 15) + "追加版本", "primary")
            : '<span class="count">2 个版本</span>',
        ) +
        (!date
          ? '<div class="advice"><span>追加版本前需要完整的发行日期。</span>' +
            button("fix-date", "去补发行日期 " + svg("arrow", 14), "quiet") +
            "</div>"
          : "") +
        '<div class="file-list">' +
        options
          .map(
            (v) =>
              '<div class="file-row"><span class="format">' +
              (v === "2160" ? "4K" : "HD") +
              "</span><div><strong>" +
              qName(v) +
              '</strong><p class="path">Library/VX-Lumen-' +
              (v === "2160" ? "4k" : "1080") +
              ".mp4</p></div><small>" +
              qualities[v][1] +
              '</small><span class="online">在线</span></div>',
          )
          .join("") +
        "</div>") +
    "</section></div></main>"
  );
}
function render() {
  const { area, id } = route(),
    f = byId(id);
  root.innerHTML =
    area === "player"
      ? playerMarkup(f)
      : area === "manage" || area === "basic"
        ? adminView()
        : area === "library" || area === "likes"
          ? lib(area === "likes")
          : detail(f);
  if (phoneDemo && (area === "library" || area === "likes")) {
    root.insertAdjacentHTML(
      "beforeend",
      '<nav class="pocket-nav" aria-label="片库导航">' +
        link(
          "library",
          svg("grid") + "片库",
          area === "library" ? "selected" : "",
        ) +
        link(
          "likes",
          svg("heart") + "喜欢",
          area === "likes" ? "selected" : "",
        ) +
        "</nav>",
    );
  }
  if (area === "player") attachPlayer(f);
  document.title =
    (area === "player"
      ? "播放 · " + f.title
      : area === "manage"
        ? "版本与文件"
        : area === "library"
          ? "片库"
          : f.title) + " · video—x";
}
function go(hash) {
  if (location.hash !== "#" + hash) location.hash = hash;
  else render();
}
window.addEventListener("hashchange", () => {
  clearTimeout(toastTimer);
  document.querySelector("#notice").textContent = "";
  if (dialog.open) dialog.close();
  if (route().area === "player" && previousRoute === "film")
    history.replaceState({ fromFilm: route().id }, "");
  if (previousRoute === "library" || previousRoute === "likes")
    restoreScroll = scrollY;
  render();
  window.scrollTo(
    0,
    ["library", "likes"].includes(route().area) ? restoreScroll : 0,
  );
  previousRoute = route().area;
});
function chooseVersion(f, v, playing) {
  if (!editionList(f.id).includes(v)) return;
  const old = selected(f.id);
  if (playing && old !== v) {
    const el = root.querySelector("video");
    if (el && el.readyState >= 2 && !el.ended)
      write("position." + f.id + "." + old, el.currentTime);
    el?.pause();
  }
  write("selected." + f.id, v);
  if (dialog.open) dialog.close();
  if (playing && old === v) return;
  render();
  if (!playing) toast("已选择 " + qName(v));
}
function filterSheet() {
  sheet(
    "筛选分类",
    '<div class="sheet-body options">' +
      ["全部", ...new Set(films.map((f) => f.category || "未分类"))]
        .map((g) =>
          button(
            "filter:" + g,
            g + (g === libraryFilter ? svg("check") : ""),
            "sheet-row",
          ),
        )
        .join("") +
      "</div>",
  );
}
function appendSheet() {
  if (!read("date")) {
    pendingDateBack = true;
    go("basic/lumen");
    return;
  }
  sheet(
    "追加播放版本",
    '<form id="append-form"><p class="sheet-note">为《流明 · 双版本测试片》选择已核对的文件。</p><label class="candidate"><input required type="radio" name="file" value="2160"><span><strong>VX-Lumen-4k.mp4</strong><small>VX-LUMEN-01 · 3840 × 2160 · 已核对</small></span></label><div class="sheet-foot">' +
      button("close", "取消", "secondary") +
      '<button type="submit" class="primary">追加并发布</button></div></form>',
  );
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-do]");
  if (!b) return;
  const [a, v] = b.dataset.do.split(":"),
    { area, id } = route(),
    f = byId(id);
  switch (a) {
    case "close":
      dialog.close();
      break;
    case "play":
      go("player/" + id);
      break;
    case "restart":
      dialog.close();
      restartOnOpen = true;
      go("player/" + id);
      break;
    case "exit":
      if (history.state?.fromFilm === id) history.back();
      else go("film/" + id);
      break;
    case "versions":
      versionSheet(f, area === "player");
      break;
    case "edition":
    case "choose":
      chooseVersion(f, v, area === "player");
      break;
    case "fullscreen": {
      const el = root.querySelector("video");
      if (el.requestFullscreen)
        el.requestFullscreen().catch(() => toast("请使用视频控件进入全屏"));
      else el.webkitEnterFullscreen?.();
      break;
    }
    case "like":
      write("fav." + id, !fav(id));
      render();
      break;
    case "seen":
      write("seen." + id, !read("seen." + id));
      render();
      break;
    case "collection":
      sheet(
        "收藏夹",
        '<div class="sheet-body options">' +
          ["周末片单", "留着再看"]
            .map((t, i) =>
              button(
                "folder:" + i,
                t +
                  (read("folder." + id + "." + i) ? svg("check") : svg("plus")),
                "sheet-row",
                'aria-pressed="' + !!read("folder." + id + "." + i) + '"',
              ),
            )
            .join("") +
          "</div>",
      );
      break;
    case "folder":
      write("folder." + id + "." + v, !read("folder." + id + "." + v));
      dialog.close();
      toast("已更新收藏夹");
      break;
    case "rating":
      sheet(
        "我的评分",
        '<div class="rating-options">' +
          [1, 2, 3, 4, 5]
            .map((n) =>
              button(
                "rate:" + n,
                svg("star", 19) + n,
                "secondary",
                'aria-label="' + n + '星"',
              ),
            )
            .join("") +
          "</div>",
      );
      break;
    case "rate":
      write("rating." + id, Number(v));
      dialog.close();
      render();
      break;
    case "search":
      sheet(
        "搜索片库",
        '<form id="search-form"><label for="query">影片名称</label><input id="query" type="search" placeholder="输入片名" value="' +
          escapeHtml(query) +
          '"><div class="sheet-foot"><button class="primary">搜索</button></div></form>',
      );
      dialog.querySelector("input").focus();
      break;
    case "filters":
      filterSheet();
      break;
    case "filter":
      libraryFilter = v;
      dialog.close();
      render();
      break;
    case "clear-query":
      query = "";
      render();
      break;
    case "fix-date":
      pendingDateBack = true;
      go("basic/lumen");
      break;
    case "append":
      appendSheet();
      break;
  }
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === "date-form") {
    const d = form.querySelector("input");
    if (!d.checkValidity() || !/^\d{4}-\d\d-\d\d$/.test(d.value)) {
      d.reportValidity();
      return;
    }
    write("date", d.value);
    go("manage/lumen");
    pendingDateBack = false;
    toast("发行日期已保存");
  }
  if (
    form.id === "append-form" &&
    new FormData(form).get("file") === "2160" &&
    read("date")
  ) {
    write("appended", true);
    dialog.close();
    render();
    toast("4K UHD 已追加并发布");
  }
  if (form.id === "search-form") {
    query = form.querySelector("input").value.trim();
    dialog.close();
    go("library");
  }
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
window.addEventListener("storage", (e) => {
  if (!e.key?.startsWith(storagePrefix) || dialog.open) return;
  const k = e.key.slice(storagePrefix.length);
  const { area, id } = route();
  if (
    (area === "film" &&
      (k === "appended" || k === "date" || k.endsWith("." + id))) ||
    (area === "likes" && k.startsWith("fav.")) ||
    (area === "manage" && ["date", "appended"].includes(k))
  )
    render();
});
previousRoute = route().area;
render();
