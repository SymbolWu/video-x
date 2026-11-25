const client = document.body.dataset.client;
const mobile = client === "android";
const admin = client === "admin";
const app = document.querySelector("#app");
const sheet = document.querySelector("#sheet");
const assetBase = "../2026-11-redesign/assets/cinema/";
const symbols = {
  folder:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 8a7 7 0 0 1 12-1l2 4M4 13l2 4a7 7 0 0 0 12-1"/>',
  drive:
    '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 13h18m-4 3h1"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  heart:
    '<path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.7 5.3L8 16l2.7-5.3z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/>',
  sliders:
    '<path d="M3 7h5m5 0h8M3 17h10m5 0h3"/><circle cx="10.5" cy="7" r="2.5"/><circle cx="15.5" cy="17" r="2.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  stack: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  queue:
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8m-8 5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  expand: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  screen:
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
};
const ic = (k) =>
  '<svg viewBox="0 0 24 24" aria-hidden="true">' + symbols[k] + "</svg>";
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const films = [
  [
    693134,
    "沙丘：第二部",
    "DUNE: PART TWO",
    2024,
    "科幻",
    "保罗走入沙漠深处，在家族的命运与弗雷曼人的未来之间作出选择。",
  ],
  [
    157336,
    "星际穿越",
    "INTERSTELLAR",
    2014,
    "科幻",
    "一支探险队穿过虫洞，寻找人类可以抵达的下一处家园。",
  ],
  [
    329865,
    "降临",
    "ARRIVAL",
    2016,
    "科幻",
    "一位语言学家尝试理解访客的语言，也重新理解时间。",
  ],
  [
    129,
    "千与千寻",
    "SPIRITED AWAY",
    2001,
    "动画",
    "千寻误入神灵的世界，在汤屋中寻找回家的路。",
  ],
  [
    120467,
    "布达佩斯大饭店",
    "THE GRAND BUDAPEST HOTEL",
    2014,
    "剧情",
    "一位门童回望大饭店最后的黄金岁月。",
  ],
  [
    313369,
    "爱乐之城",
    "LA LA LAND",
    2016,
    "爱情",
    "两位追梦人在洛杉矶相遇，又在音乐与电影间选择自己的道路。",
  ],
  [
    496243,
    "寄生虫",
    "PARASITE",
    2019,
    "剧情",
    "两户人家的生活在同一栋住宅里交叠。",
  ],
  [
    438631,
    "沙丘",
    "DUNE",
    2021,
    "科幻",
    "保罗随家族来到厄拉科斯，沙漠中的香料将改变他的命运。",
  ],
  [
    128,
    "幽灵公主",
    "PRINCESS MONONOKE",
    1997,
    "动画",
    "阿席达卡深入山林，寻找化解诅咒的答案。",
  ],
  [
    76341,
    "疯狂的麦克斯：狂暴之路",
    "MAD MAX: FURY ROAD",
    2015,
    "动作",
    "在荒漠公路上，一支车队驶向传说中的绿洲。",
  ],
  [
    155,
    "蝙蝠侠：黑暗骑士",
    "THE DARK KNIGHT",
    2008,
    "动作",
    "哥谭的街头出现了一个打乱所有规则的对手。",
  ],
  [
    -1,
    "海岸来信 · 导演剪辑修复版",
    "LETTERS FROM THE COAST",
    2025,
    "剧情",
    "沿着录音带里的线索，一位年轻人重新走过父亲生活过的海岸。",
  ],
  [
    0,
    "海岸来信 · 修复版",
    "LETTERS FROM THE COAST",
    2025,
    "剧情",
    "一封旧信把两代人的海边记忆连接起来。",
  ],
].map(([id, name, en, year, genre, story]) => ({
  id,
  name,
  en,
  year,
  genre,
  story,
}));
function art(f, k) {
  if (f.id === 693134 && k === "backdrop") return "concepts/desert.jpg";
  if (f.id <= 0)
    return (
      "../2026-11-redesign/assets/" + (f.id === 0 ? "coast.jpg" : "sea.jpg")
    );
  return assetBase + f.id + "-" + k + ".jpg";
}
const styleImg = (f, k) => 'style="background-image:url(' + art(f, k) + ')"';
const btn = (action, label, cls = "", attrs = "") =>
  '<button type="button" data-action="' +
  action +
  '" class="' +
  cls +
  '" ' +
  attrs +
  ">" +
  label +
  "</button>";
const iconBtn = (action, k, label) =>
  btn(action, ic(k), "ico", 'aria-label="' + label + '" title="' + label + '"');
const logo = '<span class="logo">video<i>—x</i></span>';
const navs = [
  ["discover", "发现", "compass"],
  ["library", "片库", "grid"],
  ["likes", "喜欢", "heart"],
];
const labels = {
  discover: "发现",
  library: "片库",
  likes: "我喜欢的",
  profile: "我的片库",
  intake: "录入工作台",
  catalog: "影片资料库",
  categories: "分类管理",
  jobs: "后台任务",
  settings: "系统设置",
};
const prototypes =
  '<div class="prototype-links"><a href="index.html">Web 观看端</a><a href="admin.html">管理端 Web</a><a href="android.html">安卓观看端</a></div>';
const likes = new Set([157336, 129]);
const times = new Map([
  ["693134-4K UHD", 12],
  ["157336-原版", 7],
  ["-1-原版", 5],
]);
const versions = { 693134: "4K UHD" };
const state = {
  page: admin ? "intake" : "discover",
  film: 693134,
  genre: "全部",
  q: "",
  scope: "全部",
  selected: 0,
  query: "",
};
let historyStack = [],
  draftGenre = "",
  resumeAt = 0,
  timer;
let rows = films.slice(0, 6).map((f, i) => ({
  film: f,
  title: f.name,
  year: i === 0 ? "" : f.year + "-01-01",
  status: ["待核对", "待核对", "已确认", "已发布", "待核对", "已发布"][i],
}));
const film = () => films.find((f) => f.id === state.film) || films[0];
const ver = (f) => versions[f.id] || "原版";
const key = (f) => f.id + "-" + ver(f);
const sec = (f) => times.get(key(f)) || 0;
const time = (n) => "0:" + String(Math.floor(n)).padStart(2, "0");
function toast(msg) {
  clearTimeout(timer);
  const t = document.querySelector("#toast");
  t.textContent = msg;
  t.classList.add("show");
  timer = setTimeout(() => t.classList.remove("show"), 1900);
}
function nav(page, id) {
  historyStack.push({ state: { ...state }, y: scrollY });
  history.pushState(
    { prototypeDepth: historyStack.length },
    "",
    "#" + page + (id === undefined ? "" : "-" + id),
  );
  state.page = page;
  if (id !== undefined) state.film = Number(id);
  render();
  window.scrollTo(0, 0);
}
function back() {
  if (historyStack.length) {
    history.back();
    return;
  }
  restorePage();
}
window.addEventListener("popstate", () => {
  if (sheet.open) sheet.close();
  restorePage();
});
function restorePage() {
  const h = historyStack.pop();
  if (h) {
    Object.assign(state, h.state);
    render();
    window.scrollTo(0, h.y);
  } else {
    state.page = admin ? "intake" : "discover";
    render();
  }
}
function openSheet(title, body) {
  sheet.removeAttribute("data-kind");
  sheet.setAttribute("aria-label", title);
  sheet.innerHTML =
    "<header><h2>" +
    title +
    "</h2>" +
    iconBtn("close", "close", "关闭") +
    "</header>" +
    body;
  if (!sheet.open) sheet.showModal();
}
function topbar() {
  return (
    '<header class="top"><div class="brand-group">' +
    btn("page:discover", logo, "", "aria-label='发现首页'") +
    (mobile
      ? ""
      : '<nav aria-label="观看导航">' +
        navs
          .map(([p, n]) =>
            btn("page:" + p, n, "navbtn " + (state.page === p ? "on" : "")),
          )
          .join("") +
        "</nav>") +
    '</div><div class="tools">' +
    (mobile
      ? iconBtn("search", "search", "搜索影片")
      : btn(
          "search",
          ic("search") +
            "搜索片库 <kbd>" +
            (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl") +
            " K</kbd>",
          "search-trigger",
        )) +
    iconBtn("switch", "screen", "切换原型") +
    (!mobile
      ? btn("page:profile", "我", "avatar", "aria-label='我的片库'")
      : "") +
    "</div></header>"
  );
}
function bottom() {
  return (
    '<nav class="mobile-nav" aria-label="底部导航">' +
    [...navs, ["profile", "我的", "user"]]
      .map(([p, n, k]) =>
        btn("page:" + p, ic(k) + n, state.page === p ? "on" : ""),
      )
      .join("") +
    "</nav>"
  );
}
function card(f) {
  return btn(
    "detail:" + f.id,
    '<span class="art ' +
      (f.id > 0 ? "" : "fallback") +
      '" ' +
      styleImg(f, "poster") +
      ">" +
      (f.id > 0 ? "" : "海岸来信") +
      "</span><strong>" +
      f.name +
      '</strong><span class="meta">' +
      f.year +
      " · " +
      f.genre +
      "</span>",
    "card",
  );
}
function grid(list) {
  return list.length
    ? '<div class="grid">' + list.map(card).join("") + "</div>"
    : '<div class="blank"><h3>没有匹配的影片</h3><p>可以换个片名，或清除当前筛选。</p>' +
        btn("reset", "清除条件", "btn") +
        "</div>";
}
function resume(f) {
  return btn(
    "resume:" + f.id,
    '<span class="thumb ' +
      (f.id > 0 ? "" : "fallback") +
      '" ' +
      styleImg(f, "backdrop") +
      ">" +
      (f.id > 0 ? "" : "海岸") +
      '<i style="width:' +
      (sec(f) / 22) * 100 +
      '%"></i></span><span class="resume-text"><strong>' +
      f.name +
      "</strong><small>" +
      ver(f) +
      " · 看到 " +
      time(sec(f)) +
      '</small></span><span class="ico">' +
      ic("play") +
      "</span>",
    "resume",
  );
}
function hero(f, detail = false) {
  const mobileNav =
    mobile && detail
      ? '<div class="film-nav">' +
        iconBtn("back", "back", "返回") +
        btn(
          "like",
          ic("heart"),
          "ico",
          "aria-label='喜欢' aria-pressed='" + likes.has(f.id) + "'",
        ) +
        "</div>"
      : "";
  return (
    '<section class="hero ' +
    (f.id > 0 ? "" : "fallback") +
    '" ' +
    styleImg(f, "backdrop") +
    ">" +
    mobileNav +
    '<div class="hero-inner">' +
    (detail
      ? mobile
        ? ""
        : btn("back", ic("back") + "返回", "back")
      : '<span class="kicker">片库精选</span>') +
    "<h1>" +
    f.name +
    '</h1><p class="original">' +
    f.en +
    '</p><p class="story">' +
    (detail
      ? f.year +
        "　·　" +
        f.genre +
        (f.id === 693134 ? "　·　2 个播放版本" : "")
      : f.story) +
    "</p>" +
    (!detail
      ? '<div class="actions">' +
        btn(
          "resume:" + f.id,
          ic("play") + (sec(f) ? "继续播放 · " + time(sec(f)) : "播放样片"),
          "btn play",
        ) +
        btn("detail:" + f.id, "影片详情 " + ic("next"), "btn ghost") +
        "</div>"
      : "") +
    "</div></section>"
  );
}
function discover() {
  const list = films.filter((f) => sec(f) > 0);
  return (
    hero(films[0]) +
    '<div class="content">' +
    (list.length
      ? '<section class="section"><div class="section-head"><h2>继续观看</h2></div><div class="resume-grid">' +
        list.map(resume).join("") +
        "</div></section>"
      : "") +
    '<section class="section"><div class="section-head"><h2>最近添加</h2>' +
    btn("page:library", "全部影片 " + ic("next"), "quiet") +
    "</div>" +
    grid(films.slice(0, 6)) +
    "</section></div>"
  );
}
function listPage() {
  const fav = state.page === "likes";
  const list = films.filter(
    (f) =>
      (!fav || likes.has(f.id)) &&
      (state.genre === "全部" || state.genre === f.genre) &&
      f.name.includes(state.q),
  );
  return (
    '<main class="page"><div class="page-title"><h1>' +
    labels[state.page] +
    '</h1><span class="meta">' +
    list.length +
    ' 部影片</span></div><div class="list-tools">' +
    btn(
      "filter",
      ic("sliders") + (state.genre === "全部" ? "筛选" : state.genre),
      "pill " + (state.genre === "全部" ? "" : "on"),
    ) +
    (mobile
      ? ""
      : ["科幻", "动画", "剧情", "动作", "爱情"]
          .map((g) =>
            btn(
              "quick-genre:" + g,
              g,
              "genre-chip" + (state.genre === g ? " active-text" : ""),
              "aria-pressed='" + (state.genre === g) + "'",
            ),
          )
          .join("")) +
    (state.q || state.genre !== "全部"
      ? btn("reset", "清除条件", "quiet")
      : "") +
    "</div>" +
    grid(list) +
    "</main>"
  );
}
function detail() {
  const f = film();
  return (
    '<main class="detail">' +
    hero(f, true) +
    '<div class="content detail-body"><div class="detail-actions">' +
    (f.id
      ? btn(
          "resume:" + f.id,
          ic("play") + (sec(f) ? "继续播放 · " + time(sec(f)) : "播放样片"),
          "btn play",
        )
      : '<span class="muted">尚未关联视频</span>') +
    (f.id
      ? btn("version", ic("stack") + ver(f) + ic("down"), "btn version")
      : "") +
    (mobile
      ? ""
      : btn(
          "like",
          ic("heart") + (likes.has(f.id) ? "已喜欢" : "喜欢"),
          "btn " + (likes.has(f.id) ? "active-text" : ""),
          'aria-pressed="' + likes.has(f.id) + '"',
        )) +
    (sec(f) ? btn("restart", "从头播放", "quiet") : "") +
    '</div><section class="section"><h3>故事简介</h3><p style="margin-top:10px">' +
    f.story +
    '</p></section><section class="section"><div class="section-head"><h2>片库中的其他影片</h2></div>' +
    grid(films.filter((i) => i !== f).slice(0, 4)) +
    "</section></div></main>"
  );
}
function player() {
  const f = film();
  return (
    '<main class="player"><header>' +
    iconBtn("exit-player", "back", "退出播放") +
    "<div><h2>" +
    f.name +
    '</h2><span class="meta">' +
    ver(f) +
    "</span></div>" +
    btn("fullscreen", ic("expand") + "全屏", "btn") +
    '</header><video controls playsinline autoplay src="preview.mp4" aria-label="原型播放样片"></video><footer>原型播放样片 · 22 秒</footer></main>'
  );
}
function profile() {
  return (
    '<main class="page"><h1>我的片库</h1><section class="section"><div class="section-head"><h2>喜欢的影片</h2>' +
    btn("page:likes", "查看全部 " + ic("next"), "quiet") +
    "</div>" +
    grid(films.filter((f) => likes.has(f.id))) +
    "</section></main>"
  );
}
const sections = [
  [
    "工作区",
    [
      ["intake", "queue"],
      ["catalog", "grid"],
    ],
  ],
  ["资料维护", [["categories", "stack"]]],
  [
    "运行",
    [
      ["jobs", "clock"],
      ["settings", "sliders"],
    ],
  ],
];
let downloadFolder = "下载暂存";
let proposedFolder = downloadFolder;
let checkedAt = new Date();
function settingsContent() {
  const checkTime = checkedAt.toLocaleTimeString("zh-CN", { hour12: false });
  const line = (title, detail, status, tone = "ok") =>
    '<div class="sys-line"><div><strong>' +
    title +
    "</strong><small>" +
    detail +
    '</small></div><span class="sys-tag ' +
    tone +
    '">' +
    status +
    "</span></div>";
  return (
    '<section class="sys-storage"><div class="sys-heading">' +
    ic("drive") +
    '<h2>媒体存储</h2><span class="sys-tag ok">已挂载</span></div>' +
    '<div class="disk-summary"><span>媒体卷可用空间</span><div><b>1.28</b> <strong>TB</strong><small>共 4.00 TB</small></div><progress aria-label="已用存储空间" value="2.72" max="4"></progress><small>已用 2.72 TB · 68%</small></div>' +
    line("媒体根目录", "/Media/Library", "可读写") +
    '<div class="sys-line"><div><strong>下载目录</strong><small>/Media/' +
    esc(downloadFolder) +
    "</small></div>" +
    btn("folder", "更改目录 " + ic("next"), "queue-search") +
    "</div>" +
    line("图片与缓存", "/Media/Artwork · 已登记 384 MB", "可写") +
    '<div class="sys-line"><div><strong>待发布草稿</strong><small>已保存在录入工作台</small></div>' +
    btn(
      "studio:intake",
      rows.filter((r) => r.status !== "已发布").length + " 条 " + ic("next"),
      "quiet",
    ) +
    "</div></section>" +
    '<section class="sys-services"><div class="sys-heading">' +
    ic("stack") +
    "<h2>服务与恢复</h2></div>" +
    line("API", "状态请求往返 18 ms", "已响应") +
    line("后台 Worker", "最近心跳 " + checkTime, "1 个在线") +
    line("PostgreSQL", "媒体资料库", "查询成功") +
    line("FFprobe / FFmpeg", "文件探测与视频处理", "可用") +
    line("在线抓取插件", "影片元数据", "已注册") +
    "</section>" +
    '<section class="sys-runtime"><div class="sys-heading">' +
    ic("screen") +
    '<h2>发布与运行</h2></div><div class="runtime-grid">' +
    line("运行方式", "Docker Compose", "容器运行", "neutral") +
    line("自动恢复", "登录后恢复需要宿主验证", "待验证", "warn-tag") +
    line("访问范围", "局域网访问", "当前配置", "neutral") +
    "</div></section>"
  );
}
function folderPicker() {
  const options = ["下载暂存", "待整理", "导入收件箱"];
  openSheet(
    "选择下载目录",
    '<p class="sheet-sub">从媒体卷选择新影片的导入位置。</p><div class="folder-root">' +
      ic("drive") +
      ' 媒体卷　/　Media</div><div class="folder-list">' +
      options
        .map((name) =>
          btn(
            "choose-folder:" + name,
            ic("folder") +
              "<span>" +
              name +
              "</span>" +
              (name === downloadFolder ? "<small>当前目录</small>" : "") +
              '<i class="radio">' +
              (name === proposedFolder ? ic("check") : "") +
              "</i>",
            "folder-row" + (name === proposedFolder ? " chosen" : ""),
            "aria-pressed='" + (name === proposedFolder) + "'",
          ),
        )
        .join("") +
      '</div><div class="sheet-foot">' +
      btn("close", "取消", "btn") +
      btn("save-folder", "保存目录", "btn rose") +
      "</div>",
  );
}
function railNav() {
  return sections
    .map(
      ([group, links]) =>
        `<p>${group}</p>${links.map(([page, icon]) => btn("studio:" + page, ic(icon) + labels[page], state.page === page ? "on" : "", "aria-current='" + (state.page === page ? "page" : "false") + "'")).join("")}`,
    )
    .join("");
}
function servicePage() {
  const item = (label, value) =>
    `<div class="info-line"><span>${label}</span><strong>${esc(value)}</strong></div>`;
  let content = "";
  if (state.page === "settings") {
    content = settingsContent();
  } else if (state.page === "categories") {
    content = [...new Set(films.map((f) => f.genre))]
      .map(
        (genre) =>
          `<section class="settings-box"><h2>${genre}</h2>${item("关联影片", String(films.filter((f) => f.genre === genre).length))}${btn("genre-entries:" + genre, "查看关联作品 " + ic("next"), "quiet")}</section>`,
      )
      .join("");
  } else {
    content = `<section class="settings-box"><h2>任务队列</h2>${item("等待核对", String(rows.filter((r) => r.status === "待核对").length))}${item("等待发布", String(rows.filter((r) => r.status === "已确认").length))}${btn("studio:intake", "打开录入工作台 " + ic("next"), "quiet")}</section><section class="settings-box"><h2>文件探测</h2>${item("任务状态", "已完成")}${item("最近文件", "dune.part.two.mkv")}<p>来自此原型的示例队列。</p></section>`;
  }
  const isSettings = state.page === "settings";
  const header = isSettings
    ? '<header class="sys-title"><div><h1>系统设置</h1><p>示例环境 · 最近检查 ' +
      checkedAt.toLocaleTimeString("zh-CN", { hour12: false }) +
      "</p></div>" +
      btn("refresh-status", ic("refresh") + "刷新状态", "queue-search") +
      "</header>"
    : "<h1>" + labels[state.page] + "</h1>";
  return `<div class="studio"><aside class="rail">${logo}${railNav()}<footer>个人媒体库</footer></aside><main><div class="studio-top">管理端 ${ic("next")} <strong>${labels[state.page]}</strong><a href="index.html">打开观看端 ↗</a></div><div class="desk">${header}<div class="${isSettings ? "system-grid" : "settings-grid"}">${content}</div></div></main></div>`;
}

function studio() {
  if (!["intake", "catalog"].includes(state.page)) return servicePage();
  const cat = state.page === "catalog";
  const row = rows[state.selected];
  const selected = rows.filter(
    (r) =>
      (!cat || r.status === "已发布") &&
      (state.scope === "全部" || state.scope === r.status) &&
      r.title.includes(state.query),
  );
  return (
    '<div class="studio"><aside class="rail">' +
    logo +
    railNav() +
    '<footer>个人媒体库</footer></aside><main><div class="studio-top">管理端 ' +
    ic("next") +
    " <strong>" +
    labels[state.page] +
    '</strong><a href="index.html">打开观看端 ↗</a></div><div class="desk"><h1>' +
    labels[state.page] +
    '</h1><p class="muted">' +
    (cat
      ? "管理已经发布的作品和播放资料。"
      : "检查新入库影片的资料，确认后发布到片库。") +
    '</p><div class="section-head"><div class="studio-tabs">' +
    (cat ? ["全部"] : ["全部", "待核对", "已确认", "已发布"])
      .map((s) =>
        btn(
          "scope:" + s,
          s +
            " <small>" +
            rows.filter(
              (r) =>
                (!cat || r.status === "已发布") &&
                (s === "全部" || r.status === s),
            ).length +
            "</small>",
          state.scope === s ? "on" : "",
          'aria-pressed="' + (state.scope === s) + '"',
        ),
      )
      .join("") +
    "</div>" +
    btn(
      "find-row",
      ic("search") + (esc(state.query) || "查找作品"),
      "queue-search",
    ) +
    '</div><div class="workspace"><section class="work-list"><div class="list-header"><span>作品 / 来源文件</span><span>资料状态</span><span>下一步</span></div>' +
    selected
      .map((r) => {
        const i = rows.indexOf(r);
        return btn(
          "select:" + i,
          '<span class="film-id"><img alt="" src="' +
            art(r.film, "poster") +
            '"><span><strong class="clip">' +
            esc(r.title) +
            '</strong><small class="clip">' +
            r.film.en.toLowerCase().replace(/[^a-z0-9]+/g, ".") +
            ".mkv</small></span></span>" +
            badge(r.status) +
            '<span class="next-step">' +
            (r.status === "待核对"
              ? r.year
                ? "核对资料"
                : "补全日期"
              : r.status === "已确认"
                ? "待发布"
                : "查看详情") +
            ic("next") +
            "</span>",
          "film-row " + (i === state.selected ? "on" : ""),
        );
      })
      .join("") +
    (!selected.length ? '<div class="blank">当前条件下没有影片</div>' : "") +
    "</section>" +
    (selected.includes(row) ? inspect(row) : "") +
    "</div></div></main></div>"
  );
}
function badge(s) {
  return (
    '<span class="state ' + (s === "待核对" ? "" : "ok") + '">' + s + "</span>"
  );
}
function inspect(r) {
  const cover =
    '<div class="review-cover" ' +
    styleImg(r.film, "backdrop") +
    "><div>" +
    badge(r.status) +
    "<h2>" +
    esc(r.title) +
    "</h2><small>" +
    r.film.en +
    "</small></div></div>";
  if (editing)
    return '<aside class="inspector">' + cover + reviewForm(r) + "</aside>";
  const line = (n, v) =>
    '<div class="info-line"><span>' +
    n +
    "</span><strong>" +
    v +
    "</strong></div>";
  return (
    '<aside class="inspector">' +
    cover +
    '<div class="inspect-body"><div class="review-heading"><h3>资料核对</h3><small class="mini">' +
    (r.year ? "4 / 4 已填写" : "3 / 4 已填写") +
    "</small></div>" +
    line("影片分类", r.film.genre) +
    line("发行日期", r.year || "待补充") +
    line("播放版本", "原版") +
    line("文件状态", "已绑定") +
    (r.year ? "" : '<p class="warn">补齐发行日期后，即可核对这条草稿。</p>') +
    '<div class="cut"></div>' +
    btn(
      r.status === "已确认"
        ? "publish"
        : r.status === "已发布"
          ? "edit"
          : "review",
      r.status === "已确认"
        ? "发布到片库"
        : r.status === "已发布"
          ? "编辑资料"
          : r.year
            ? "核对资料"
            : "补充资料",
      "btn rose",
    ) +
    "</div></aside>"
  );
}
function render() {
  document.title = "video—x · " + (labels[state.page] || film().name);
  app.className = mobile ? "phone" : "";
  app.innerHTML = admin
    ? studio()
    : state.page === "player"
      ? player()
      : (mobile && state.page === "detail" ? "" : topbar()) +
        (state.page === "discover"
          ? discover()
          : state.page === "detail"
            ? detail()
            : state.page === "profile"
              ? profile()
              : listPage()) +
        (mobile && state.page !== "detail" ? bottom() : "");
  if (!admin && state.page === "player") {
    const video = app.querySelector("video");
    const k = key(film());
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.currentTime = Math.min(resumeAt, video.duration - 0.5);
        video.play().catch(() => {});
      },
      { once: true },
    );
    video.addEventListener("timeupdate", () => {
      if (!video.ended) times.set(k, video.currentTime);
    });
    video.addEventListener("ended", () => times.delete(k));
  }
}
function start(id, fromStart = false) {
  const f = films.find((f) => f.id === Number(id));
  if (!f?.id) return;
  resumeAt = fromStart ? 0 : sec(f);
  nav("player", id);
}
function genres() {
  openSheet(
    "筛选影片",
    "<label>影片分类</label>" +
      ["全部", "科幻", "剧情", "爱情", "动画"]
        .map((g) =>
          btn(
            "draft:" + g,
            g + (draftGenre === g ? ic("check") : ""),
            "opt " + (draftGenre === g ? "on" : ""),
          ),
        )
        .join("") +
      '<div class="sheet-foot">' +
      btn(
        "apply",
        "查看 " +
          films.filter(
            (f) =>
              (state.page !== "likes" || likes.has(f.id)) &&
              (draftGenre === "全部" || f.genre === draftGenre) &&
              f.name.includes(state.q),
          ).length +
          " 部影片",
        "btn play",
      ) +
      "</div>",
  );
}
function alignSelection() {
  const i = rows.findIndex(
    (r) =>
      (state.page !== "catalog" || r.status === "已发布") &&
      (state.scope === "全部" || r.status === state.scope) &&
      r.title.includes(state.query),
  );
  state.selected = i;
}
let selectedVersion;
function versionSheet(value = ver(film())) {
  selectedVersion = value;
  const f = film(),
    progress = times.get(f.id + "-" + value) || 0;
  const editions = f.id === 693134 ? ["4K UHD", "原版"] : ["原版"];
  openSheet(
    "播放版本",
    `<p class="sheet-sub">${f.name}</p><div class="edition-list">${editions
      .map((v) => {
        const t = times.get(f.id + "-" + v) || 0;
        return btn(
          "choose-edition:" + v,
          `<span class="edition-art" style="background-image:url(${f.id === 693134 && v === "4K UHD" ? assetBase + "693134-backdrop.jpg" : art(f, "backdrop")})">${t ? '<i style="width:' + Math.min(100, (t / 22) * 100) + '%"></i>' : ""}</span><span class="ed-copy"><strong>${v}</strong><small>${v === "原版" ? "1080p" : "2160p"} · ${t ? "看到 " + time(t) : "从头播放"}</small></span><span class="radio">${v === value ? ic("check") : ""}</span>`,
          "edition " + (v === value ? "chosen" : ""),
          'aria-pressed="' + (v === value) + '"',
        );
      })
      .join(
        "",
      )}</div>${btn("play-edition", ic("play") + (progress ? "继续播放 · " + time(progress) : "从头播放"), "btn play sheet-primary")}`,
  );
  sheet.dataset.kind = "editions";
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}

function quickSearch(desk) {
  const pool = desk
    ? rows
        .filter(
          (r) =>
            (state.page !== "catalog" || r.status === "已发布") &&
            (state.scope === "全部" || r.status === state.scope),
        )
        .map((r) => ({ ...r.film, name: r.title }))
    : films;
  openSheet(
    desk ? "搜索队列" : "搜索片库",
    `<div class="search-line">${ic("search")}<input role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="matches" id="quick" aria-label="搜索作品" autocomplete="off" placeholder="输入中文或英文片名"><button type="button" data-action="close" aria-label="关闭搜索"><kbd>Esc</kbd></button></div><div class="result-caption"></div><div id="matches" role="listbox"></div><div class="key-guide"><span>↑ ↓　选择结果</span><span>↵　打开作品</span></div>`,
  );
  sheet.dataset.kind = "search";
  const trigger = app.querySelector(".search-trigger");
  if (trigger && !mobile) {
    const box = trigger.getBoundingClientRect();
    sheet.style.setProperty(
      "--search-right",
      Math.max(14, document.documentElement.clientWidth - box.right) + "px",
    );
    sheet.style.setProperty("--search-top", Math.max(8, box.top - 6) + "px");
  }
  const input = sheet.querySelector("#quick"),
    list = sheet.querySelector("#matches");
  let matched = [],
    active = 0;
  function paint() {
    const q = input.value.trim().toLowerCase();
    matched = pool.filter((f) =>
      (
        f.name +
        " " +
        f.en +
        (desk
          ? " " + f.en.toLowerCase().replace(/[^a-z0-9]+/g, ".") + ".mkv"
          : "")
      )
        .toLowerCase()
        .includes(q),
    );
    sheet.querySelector(".result-caption").textContent = q
      ? "匹配作品 · " + matched.length
      : desk
        ? "当前队列"
        : "片库作品";
    list.innerHTML =
      matched
        .map(
          (f, i) =>
            `<button type="button" role="option" id="match-${i}" aria-selected="${i === active}" data-match="${i}"><span class="res-art" ${styleImg(f, "poster")}></span><span><strong>${esc(f.name)}</strong><small>${f.year} · ${f.genre}${f.id === 693134 ? " · 2 个版本" : ""}</small></span><kbd>↵</kbd></button>`,
        )
        .join("") ||
      '<p class="no-match">没有找到作品。可以试试英文名或更短的片名。</p>';
    if (matched[active])
      input.setAttribute("aria-activedescendant", "match-" + active);
    else input.removeAttribute("aria-activedescendant");
  }
  function choose(i) {
    const f = matched[i];
    if (!f) return;
    sheet.close();
    if (desk) {
      editing = false;
      if (!["intake", "catalog"].includes(state.page)) state.page = "intake";
      state.selected = rows.findIndex((r) => r.film.id === f.id);
      render();
    } else nav("detail", f.id);
  }
  input.oninput = () => {
    active = 0;
    paint();
  };
  input.onkeydown = (e) => {
    if (e.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    }
    if (["ArrowUp", "ArrowDown"].includes(e.key) && matched.length) {
      e.preventDefault();
      active =
        (active + (e.key === "ArrowUp" ? -1 : 1) + matched.length) %
        matched.length;
      paint();
      list.children[active]?.scrollIntoView({ block: "nearest" });
    }
  };
  list.onclick = (e) => {
    const item = e.target.closest("[data-match]");
    if (item) choose(Number(item.dataset.match));
  };
  paint();
  input.focus();
}

let calendarView;
const pad = (n) => String(n).padStart(2, "0");
function parseDate(text) {
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]),
    date = new Date(y, mo - 1, d);
  return y >= 1000 &&
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
    ? date
    : null;
}
function iso(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function paintCalendar() {
  const calendar = app.querySelector("#calendar");
  if (!calendar) return;
  const y = calendarView.getFullYear(),
    m = calendarView.getMonth(),
    first = new Date(y, m, 1),
    count = new Date(y, m + 1, 0).getDate();
  const current = parseDate(app.querySelector("#release").value);
  const week = ["一", "二", "三", "四", "五", "六", "日"];
  calendar.innerHTML = `<div class="calendar-head">${btn("month-prev", ic("back"), "ico", 'aria-label="上个月"')}<strong>${y} 年 ${m + 1} 月</strong>${btn("month-next", ic("next"), "ico", 'aria-label="下个月"')}</div><div class="days">${week.map((w) => "<small>" + w + "</small>").join("")}${"<i></i>".repeat((first.getDay() + 6) % 7)}${Array.from(
    { length: count },
    (_, i) => {
      const s = iso(new Date(y, m, i + 1));
      return btn(
        "pick-day:" + s,
        String(i + 1),
        current && s === iso(current) ? "picked" : "",
        "aria-label='" + s + "'",
      );
    },
  ).join("")}</div>`;
}
let editing = false;
function startEdit() {
  editing = true;
  render();
  const form = app.querySelector("#review-form");
  form.querySelector("#release").focus({ preventScroll: innerWidth > 760 });
}
function reviewForm(r) {
  return `<form id="review-form" novalidate><div class="review-heading"><h3>核对影片资料</h3>${btn("cancel-review", "取消", "quiet")}</div><label for="review-title">作品标题</label><input id="review-title" name="title" maxlength="100" value="${esc(r.title)}"><label for="release">发行日期 <small>核对必填</small></label><div class="date-field"><input id="release" name="date" autocomplete="off" placeholder="YYYY-MM-DD" value="${esc(r.year)}" aria-describedby="date-help">${btn("calendar", ic("calendar"), "ico", 'aria-label="选择发行日期" aria-expanded="false"')}</div><p id="date-help">现有发行年份 ${r.film.year} · 可直接输入或选择日期</p><div id="calendar" hidden></div><p id="field-error" role="alert"></p><div class="form-footer">${r.status === "已发布" ? btn("save-published", "保存变更", "btn rose") : btn("save-draft", "保存草稿", "btn") + btn("save-review", "确认核对", "btn rose")}</div></form>`;
}
function finishReview(act) {
  const r = rows[state.selected],
    t = app.querySelector("#review-title"),
    date = app.querySelector("#release"),
    error = app.querySelector("#field-error");
  const parsed = parseDate(date.value);
  if (!t.value.trim()) {
    error.textContent = "请填写作品标题。";
    t.focus();
    return;
  }
  if (!parsed && (date.value.trim() || act !== "save-draft")) {
    error.textContent = "请填写有效日期，例如 2024-03-08。";
    date.setAttribute("aria-invalid", "true");
    date.focus();
    return;
  }
  r.title = t.value.trim();
  r.year = parsed ? iso(parsed) : "";
  if (act === "save-review") r.status = "已确认";
  if (act === "save-draft") r.status = "待核对";
  editing = false;
  if (state.scope !== "全部" && state.scope !== r.status) alignSelection();
  render();
  toast(act === "save-review" ? "核对完成，可发布到片库" : "已保存");
}

function hasUnsavedReview() {
  const form = app.querySelector("#review-form");
  const row = rows[state.selected];
  return (
    !!form &&
    (form.elements.title.value !== row.title ||
      form.elements.date.value !== row.year)
  );
}
let afterDiscard;
function confirmLeave(next) {
  afterDiscard = next;
  openSheet(
    "放弃这次修改？",
    '<p class="sheet-sub">「' +
      esc(rows[state.selected].title) +
      '」的修改还没有保存。</p><div class="sheet-foot">' +
      btn("close", "继续编辑", "btn") +
      btn("discard-review", "放弃修改", "btn discard") +
      "</div>",
  );
}
document.addEventListener("click", (e) => {
  const leaveLink = e.target.closest(".studio-top a");
  if (leaveLink && hasUnsavedReview()) {
    e.preventDefault();
    confirmLeave(() => location.assign(leaveLink.href));
    return;
  }
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const [act, val] = b.dataset.action.split(":");
  if (
    ["studio", "scope", "select", "find-row", "cancel-review"].includes(act) &&
    hasUnsavedReview()
  ) {
    confirmLeave(() => {
      editing = false;
      render();
      app.querySelector('[data-action="' + b.dataset.action + '"]')?.click();
    });
    return;
  }
  switch (act) {
    case "discard-review":
      sheet.close();
      afterDiscard?.();
      afterDiscard = undefined;
      break;
    case "page":
      state.q = "";
      state.genre = "全部";
      nav(val);
      break;
    case "detail":
      nav("detail", val);
      break;
    case "resume":
      start(val);
      break;
    case "restart":
      start(state.film, true);
      break;
    case "exit-player":
    case "back":
      back();
      break;
    case "fullscreen": {
      const video = app.querySelector("video");
      if (video.requestFullscreen)
        video.requestFullscreen().catch(() => toast("请使用播放器的全屏控件"));
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else toast("请使用播放器的全屏控件");
      break;
    }
    case "switch":
      openSheet("切换原型", prototypes);
      break;
    case "close":
      sheet.close();
      break;
    case "like": {
      const id = film().id;
      if (likes.has(id)) likes.delete(id);
      else likes.add(id);
      render();
      toast(likes.has(id) ? "已加入喜欢" : "已移出喜欢");
      break;
    }
    case "version":
      versionSheet();
      break;
    case "choose-edition":
      versionSheet(val);
      break;
    case "play-edition":
      versions[film().id] = selectedVersion;
      sheet.close();
      start(film().id);
      break;
    case "search":
    case "find-row":
      quickSearch(act === "find-row");
      break;
    case "calendar": {
      const cal = app.querySelector("#calendar");
      cal.hidden = !cal.hidden;
      b.setAttribute("aria-expanded", String(!cal.hidden));
      if (!cal.hidden) {
        calendarView =
          parseDate(app.querySelector("#release").value) ||
          new Date(rows[state.selected].film.year, 0, 1);
        paintCalendar();
      }
      break;
    }
    case "month-prev":
    case "month-next":
      calendarView = new Date(
        calendarView.getFullYear(),
        calendarView.getMonth() + (act === "month-prev" ? -1 : 1),
        1,
      );
      paintCalendar();
      break;
    case "pick-day": {
      const input = app.querySelector("#release");
      input.value = val;
      input.removeAttribute("aria-invalid");
      app.querySelector("#field-error").textContent = "";
      app.querySelector("#calendar").hidden = true;
      app
        .querySelector('[data-action="calendar"]')
        .setAttribute("aria-expanded", "false");
      input.focus();
      break;
    }
    case "save-draft":
    case "save-review":
    case "save-published":
      finishReview(act);
      break;
    case "cancel-review":
      editing = false;
      render();
      break;
    case "filter":
      draftGenre = state.genre;
      genres();
      break;
    case "quick-genre":
      state.genre = state.genre === val ? "全部" : val;
      render();
      break;
    case "draft":
      draftGenre = val;
      genres();
      break;
    case "apply":
      state.genre = draftGenre;
      sheet.close();
      render();
      break;
    case "reset":
      state.q = "";
      state.genre = "全部";
      render();
      break;
    case "folder":
      proposedFolder = downloadFolder;
      folderPicker();
      break;
    case "choose-folder":
      proposedFolder = val;
      folderPicker();
      sheet
        .querySelector('[aria-pressed="true"]')
        .focus({ preventScroll: true });
      break;
    case "save-folder":
      downloadFolder = proposedFolder;
      sheet.close();
      render();
      toast("示例下载目录已更新");
      break;
    case "refresh-status":
      checkedAt = new Date();
      render();
      toast("示例状态已刷新");
      break;
    case "genre-entries":
      openSheet(
        val + " · 关联作品",
        films
          .filter((f) => f.genre === val)
          .map(
            (f) =>
              '<div class="info-line"><strong>' +
              esc(f.name) +
              "</strong><small>" +
              f.year +
              "</small></div>",
          )
          .join(""),
      );
      break;
    case "studio":
      editing = false;
      state.page = val;
      state.query = "";
      state.scope = "全部";
      alignSelection();
      render();
      window.scrollTo(0, 0);
      break;
    case "scope":
      editing = false;
      state.scope = val;
      alignSelection();
      render();
      break;
    case "select":
      editing = false;
      state.selected = Number(val);
      render();
      if (innerWidth <= 760)
        app.querySelector(".inspector")?.scrollIntoView({ block: "start" });
      break;
    case "review":
      startEdit();
      break;
    case "edit":
      startEdit();
      break;
    case "publish":
      openSheet(
        "发布到片库？",
        "<p>「" +
          esc(rows[state.selected].title) +
          '」将进入此原型的已发布资料库。</p><div class="sheet-foot">' +
          btn("close", "返回核对", "btn") +
          btn("confirm-publish", "确认发布", "btn rose") +
          "</div>",
      );
      break;
    case "confirm-publish":
      rows[state.selected].status = "已发布";
      sheet.close();
      if (state.scope !== "全部") alignSelection();
      render();
      toast("影片已发布");
      break;
  }
});
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) {
    const r = sheet.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      sheet.close();
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "review-form") {
    e.preventDefault();
    finishReview(
      rows[state.selected].status === "已发布"
        ? "save-published"
        : "save-draft",
    );
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !sheet.open) {
    e.preventDefault();
    if (hasUnsavedReview())
      confirmLeave(() => {
        editing = false;
        render();
        quickSearch(true);
      });
    else quickSearch(admin);
    return;
  }
  if (
    e.key === "Escape" &&
    !sheet.open &&
    editing &&
    app.querySelector("#calendar:not([hidden])")
  ) {
    app.querySelector("#calendar").hidden = true;
    app
      .querySelector('[data-action="calendar"]')
      .setAttribute("aria-expanded", "false");
    app
      .querySelector('[data-action="calendar"]')
      .focus({ preventScroll: true });
    return;
  }
  const dayButton = e.target.closest('[data-action^="pick-day:"]');
  if (
    dayButton &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
      e.key,
    )
  ) {
    e.preventDefault();
    const day = parseDate(dayButton.dataset.action.slice(9));
    const weekday = (day.getDay() + 6) % 7;
    const delta = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    }[e.key];
    day.setDate(day.getDate() + delta);
    calendarView = new Date(day.getFullYear(), day.getMonth(), 1);
    paintCalendar();
    app.querySelector('[data-action="pick-day:' + iso(day) + '"]').focus();
  }
  if (
    e.key === "Escape" &&
    !sheet.open &&
    ["detail", "player"].includes(state.page)
  )
    back();
});

const scene = new URLSearchParams(location.search).get("scene");
if (admin && scene === "settings") state.page = "settings";
if (!admin && scene === "search") state.page = "library";
if (!admin && scene === "versions") state.page = "detail";
render();
if (admin && scene === "review") {
  startEdit();
  app.querySelector("#release").value = "2024-03-08";
  app.querySelector('[data-action="calendar"]').click();
}
if (!admin && scene === "search") {
  quickSearch(false);
  const field = sheet.querySelector("#quick");
  field.value = "沙丘";
  field.dispatchEvent(new Event("input"));
}
if (!admin && scene === "versions") versionSheet();
