/* Code-driven administration prototype. No feature is added beyond the current routes. */
(() => {
  const D = window.VXA;
  const VX = window.VX;
  VX.films.forEach((f) => {
    if (!f.tags) f.tags = ["史诗", "沙漠"];
    if (!f.studios) f.studios = ["Legendary Pictures"];
  });
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (value) =>
    String(value == null ? "" : value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = (name, size) => window.VXI(name, size || 16);

  const railGroups = [
    { name: "工作区", items: [
      { id: "intake", label: "录入工作台", count: D.counts.intake },
      { id: "media", label: "影片资料库", count: D.counts.media }
    ] },
    { name: "资料维护", items: [
      { id: "people", label: "演员", count: D.counts.people },
      { id: "franchises", label: "系列", count: D.counts.series },
      { id: "collections", label: "收藏夹", count: D.counts.collections },
      { id: "categories", label: "分类", count: D.counts.categories },
      { id: "tags", label: "标签", count: D.counts.tags },
      { id: "organizations", label: "片商", count: D.counts.organizations }
    ] },
    { name: "运行", items: [
      { id: "jobs", label: "后台任务" },
      { id: "settings", label: "系统状态" },
      { id: "enrich", label: "演员资料补全" },
      { id: "archive", label: "归档" }
    ] }
  ];
  const labels = {
    intake: "录入工作台", media: "影片资料库", people: "演员", franchises: "系列",
    collections: "收藏夹", categories: "分类维护", tags: "标签维护",
    organizations: "片商 / 发行机构", jobs: "后台任务", settings: "系统状态",
    enrich: "演员资料补全", archive: "已归档资料", editor: "影片资料编辑",
    person: "演员资料", franchise: "系列资料", "draft-editor": "草稿编辑"
  };

  const state = {
    view: "intake",
    recordId: null,
    editorId: "693134",
    editorTab: "基本资料",
    intakeStage: "all",
    intakeStatus: "all",
    intakeQuery: "",
    selected: new Set(),
    mediaMode: "table",
    mediaQuery: "",
    mediaCategory: "",
    mediaQuality: "",
    mediaChinese: "",
    mediaSort: "createdAt",
    mediaDir: "desc",
    peopleQuery: "",
    peopleCategory: "",
    seriesQuery: "",
    overlay: null,
    dictionaryQuery: ""
  };

  function renderRail() {
    const rail = $("[data-rail]");
    rail.innerHTML = railGroups.map((group, gi) => {
      return [
        '<section>',
        '<p class="rail-group"><span>0' + (gi + 1) + '</span>' + esc(group.name) + '</p>',
        group.items.map((item) => {
          const active = state.view === item.id ||
            (state.view === "person" && item.id === "people") ||
            (state.view === "franchise" && item.id === "franchises") ||
            (state.view === "editor" && item.id === "media") ||
            (state.view === "draft-editor" && item.id === "intake");
          return [
          '<button data-nav="' + item.id + '"' + (active ? ' aria-current="page"' : '') + '>',
          '<span>' + esc(item.label) + '</span>',
          item.count != null ? '<b>' + item.count + '</b>' : '',
          '</button>'
        ].join('');
        }).join(''),
        '</section>'
      ].join('');
    }).join('');
  }

  function pageHead(title, description, actions) {
    return [
      '<header class="admin-page-head">',
      '<div class="page-head-copy">',
      '<h1>' + esc(title) + '</h1>',
      description ? '<p class="lede">' + esc(description) + '</p>' : '',
      '</div>',
      actions ? '<div class="page-actions">' + actions + '</div>' : '',
      '</header>'
    ].join('');
  }

  function countBar(items, note) {
    return [
      '<div class="count-bar">',
      items.map((item) => [
        '<div class="count-item' + (item.tone ? ' ' + item.tone : '') + '">',
        '<b>' + esc(item.value) + '</b>',
        '<span>' + esc(item.label) + '</span>',
        '</div>'
      ].join('')).join(''),
      note ? '<p class="count-note">' + note + '</p>' : '',
      '</div>'
    ].join('');
  }

  function searchBox(placeholder, key, value) {
    return [
      '<label class="search-box">',
      '<span aria-hidden="true">⌕</span>',
      '<input data-filter="' + key + '" value="' + esc(value || "") + '" placeholder="' + esc(placeholder) + '" aria-label="' + esc(placeholder) + '" />',
      '</label>'
    ].join('');
  }

  function selectBox(label, key, value, options) {
    return [
      '<label class="select-box"><span>' + esc(label) + '</span>',
      '<select data-select="' + key + '">',
      options.map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(value) ? " selected" : "") + '>' + esc(o.label) + '</option>').join(''),
      '</select></label>'
    ].join('');
  }

  function badge(label, tone) {
    return '<span class="badge ' + (tone || "") + '">' + esc(label) + '</span>';
  }

  function personName(id) {
    const p = D.people.find((x) => x.id === id);
    return p ? p.name : "";
  }

  function draftStatus(d) {
    if (d.published) return ["已发布", "ok"];
    if (d.reviewed) return ["已确认", "ok"];
    if (d.blocked) return ["发布阻断", "bad"];
    return ["待核对", "warn"];
  }

  function stageRows() {
    let rows = D.drafts.slice();
    if (state.intakeStage === "pending") rows = rows.filter((d) => d.state === "review");
    if (state.intakeStage === "reviewed") rows = rows.filter((d) => d.state === "ready");
    if (state.intakeStage === "published") rows = rows.filter((d) => d.state === "published");
    if (state.intakeStatus !== "all") {
      if (state.intakeStatus === "episode") rows = rows.filter((d) => d.group);
      if (state.intakeStatus === "missing") rows = rows.filter((d) => d.missingFields.length);
      if (state.intakeStatus === "blocked") rows = rows.filter((d) => d.blocked);
      if (state.intakeStatus === "failed") rows = rows.filter((d) => d.sourceState === "抓取失败");
      if (state.intakeStatus === "unbound") rows = rows.filter((d) => d.state === "blocked");
      if (state.intakeStatus === "retrieved") rows = rows.filter((d) => d.sourceState === "已返回候选");
      if (state.intakeStatus === "lookupFailed") rows = rows.filter((d) => d.sourceState === "抓取失败");
      if (state.intakeStatus === "reviewed") rows = rows.filter((d) => d.reviewed);
      if (state.intakeStatus === "published") rows = rows.filter((d) => d.published);
    }
    const q = state.intakeQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((d) => [d.title, d.file, d.category, d.actors.join(" "), d.source].join(" ").toLowerCase().includes(q));
    }
    return rows;
  }

  function coverageHtml(d) {
    const bars = [1, 2, 3, 4, 5, 6].map((n) => '<i class="' + (n <= d.complete ? "on" : "") + '"></i>').join('');
    return [
      '<div class="coverage">',
      '<div class="coverage-bars">' + bars + '</div>',
      '<span>' + d.complete + '/6</span>',
      d.missingFields.length
        ? '<small class="missing-line">缺 ' + esc(d.missingFields.join("、")) + '</small>'
        : '<small class="ok-line">资料完整</small>',
      '</div>'
    ].join('');
  }

  function intakeRow(d) {
    const st = draftStatus(d);
    return [
      '<tr class="' + (state.selected.has(d.id) ? "is-selected " : "") + (d.state === "blocked" ? "is-blocked" : "") + '" data-act="review" data-id="' + d.id + '">',
      '<td class="check"><input type="checkbox" data-pick="' + d.id + '"' + (state.selected.has(d.id) ? " checked" : "") + ' aria-label="选择 ' + esc(d.title) + '" /></td>',
      '<td><div class="media-cell"><span class="cover-mini"><img src="' + d.poster + '" alt="" /></span><div><strong>' + esc(d.title) + (d.group ? '<span class="tiny-tag">分集</span>' : '') + '</strong><small>' + esc(d.identifier) + '</small><small class="mono-line">' + esc(d.file) + '</small><small class="fact-line">' + esc(d.format) + ' · ' + esc(d.size) + ' · ' + esc(d.duration) + '</small></div></div></td>',
      '<td><div class="draft-cell"><span>' + esc(d.category) + '</span><small>' + esc(d.date) + '</small><small class="truncate">' + esc(d.actors.join("、") || "演员未填") + '</small></div></td>',
      '<td><div class="source-cell"><span class="source-state">' + esc(d.sourceState) + '</span>' + coverageHtml(d) + '</div></td>',
      '<td><div class="status-cell"><span class="status ' + st[1] + '"><i></i>' + st[0] + '</span><small class="target-line">' + esc(d.target) + '</small>' + (d.published ? '<small class="muted-line">' + esc(d.source) + '</small>' : '<button class="inline-link" data-act="set-target" data-id="' + d.id + '">' + (d.blocked ? "重试探测" : "设整理目标") + '</button>') + '</div></td>',
      '<td class="row-actions"><button class="inline-link" data-act="preview" data-id="' + d.id + '">预览</button><button class="inline-link strong" data-act="review" data-id="' + d.id + '">' + (d.published ? "查看" : d.reviewed ? "发布" : "核对") + '</button><button class="inline-link" data-act="edit-draft" data-id="' + d.id + '">编辑</button></td>',
      '</tr>'
    ].join('');
  }

  function renderIntake() {
    const rows = stageRows();
    const selected = state.selected.size;
    const selectedDrafts = D.drafts.filter((d) => state.selected.has(d.id));
    const canPublish = selected > 0 && selectedDrafts.every((d) => d.reviewed && !d.blocked);
    const canReview = selected > 0 && selectedDrafts.every((d) => !d.reviewed && !d.blocked);
    const countItems = [
      { value: D.counts.intake, label: "全部" },
      { value: D.counts.pending, label: "待核对", tone: "warn" },
      { value: D.counts.reviewed, label: "已确认", tone: "ok" },
      { value: D.counts.published, label: "已发布" },
      { value: D.counts.blocked, label: "阻断", tone: "bad" }
    ];
    const tableRows = [];
    let lastGroup = null;
    rows.forEach((d) => {
      if (d.group && d.group !== lastGroup) {
        lastGroup = d.group;
        tableRows.push('<tr class="group-row"><td></td><td colspan="5"><div class="group-line"><span>分集容器</span><strong>' + esc(d.groupTitle) + '</strong><small>整组核对后一起发布</small><button class="inline-link" data-act="review" data-id="' + d.id + '">查看整组</button></div></td></tr>');
      }
      tableRows.push(intakeRow(d));
    });
    return [
      '<section class="admin-page">',
      pageHead("录入工作台", "核对下载目录中的文件与资料，确认后手动发布。", '<button class="btn-dark" data-act="inbox">' + icon("folder", 14) + ' 从下载目录选择文件</button>'),
      countBar(countItems, '<span class="folder-note">inbox/ · 12 个文件 · 最近扫描 09:42</span>'),
      '<div class="table-toolbar">',
      '<nav class="stage-tabs" aria-label="队列阶段">',
      [["all", "全部", D.counts.intake], ["pending", "待核对", D.counts.pending], ["reviewed", "已确认", D.counts.reviewed], ["published", "已发布", D.counts.published]].map((t) => '<button data-stage="' + t[0] + '"' + (state.intakeStage === t[0] ? ' aria-pressed="true"' : '') + '>' + t[1] + ' <b>' + t[2] + '</b></button>').join(''),
      '</nav>',
      '<div class="toolbar-right">',
      selectBox("更多状态", "intakeStatus", state.intakeStatus, [
        { value: "all", label: "更多状态" }, { value: "episode", label: "分集线索" },
        { value: "missing", label: "缺少资料" }, { value: "blocked", label: "发布阻断" },
        { value: "failed", label: "探测失败" }, { value: "unbound", label: "待绑定文件" },
        { value: "retrieved", label: "已抓取" }, { value: "lookupFailed", label: "抓取失败" },
        { value: "reviewed", label: "已确认" }, { value: "published", label: "已发布" }
      ]),
      searchBox("搜索影片、演员或文件", "intakeQuery", state.intakeQuery),
      '</div>',
      '</div>',
      '<div class="table-frame">',
      '<table class="data-table intake-table">',
      '<thead><tr><th class="check"><input type="checkbox" data-act="select-all" aria-label="选择当前页" /></th><th>作品 / 文件</th><th>当前草稿</th><th>资料核对</th><th>状态 / 整理目标</th><th class="row-actions">操作</th></tr></thead>',
      '<tbody>' + (tableRows.join('') || '<tr><td colspan="6" class="empty-cell">没有符合条件的草稿。切回全部或清空搜索。</td></tr>') + '</tbody>',
      '</table>',
      '</div>',
      '<div class="table-foot"><span>显示 ' + rows.length + ' / ' + D.counts.intake + ' 条 · 第 1 页</span><span>全部草稿 ' + D.counts.intake + '</span></div>',
      '<div class="batch-bar">',
      '<div class="batch-selection"><strong>已选 ' + selected + ' 项</strong>' + (selected ? '<button data-act="clear-selection">取消选择</button>' : '') + '</div>',
      '<div class="batch-actions">',
      '<button data-act="batch" data-id="target"' + (selected ? '' : ' disabled') + '>' + icon("folder", 14) + ' 设置整理目标</button>',
      '<button data-act="batch" data-id="group"' + (selected >= 2 ? '' : ' disabled') + '>创建分集容器</button>',
      '<button data-act="batch" data-id="category"' + (selected ? '' : ' disabled') + '>设置主分类</button>',
      '<button data-act="batch" data-id="lookup"' + (selected ? '' : ' disabled') + '>抓取所选</button>',
      '<button data-act="batch" data-id="review"' + (canReview ? '' : ' disabled') + '>批量核对</button>',
      '<button class="batch-publish" data-act="batch" data-id="publish"' + (canPublish ? '' : ' disabled') + '>发布所选</button>',
      '</div></div>',
      '</section>'
    ].join('');
  }

  function mediaRows() {
    let rows = VX.films.slice();
    const q = state.mediaQuery.trim().toLowerCase();
    if (q) rows = rows.filter((f) => [f.title, f.en, f.identifier, f.director, f.actors.map(personName).join(" ")].join(" ").toLowerCase().includes(q));
    if (state.mediaCategory) rows = rows.filter((f) => f.category === state.mediaCategory);
    if (state.mediaQuality === "4k") rows = rows.filter((f) => f.format.includes("4K"));
    if (state.mediaQuality === "1080") rows = rows.filter((f) => !f.format.includes("4K"));
    if (state.mediaChinese === "yes") rows = rows.filter((f) => Number(f.id) % 3 !== 0);
    if (state.mediaSort === "name") rows.sort((a, b) => a.title.localeCompare(b.title, "zh"));
    else if (state.mediaSort === "year") rows.sort((a, b) => b.year - a.year);
    else rows.sort((a, b) => b.addedIndex - a.addedIndex);
    if (state.mediaDir === "asc") rows.reverse();
    return rows;
  }

  function mediaTable(rows) {
    return [
      '<div class="table-frame">',
      '<table class="data-table media-table">',
      '<thead><tr><th>作品</th><th>分类</th><th>年份</th><th>主演</th><th>版本</th><th>文件</th><th class="row-actions">操作</th></tr></thead>',
      '<tbody>',
      rows.slice(0, 14).map((f, i) => {
        const file = i === 4 ? ["待检查", "warn"] : i === 8 ? ["未绑定", "bad"] : ["正常", "ok"];
        const actors = f.actors.slice(0, 2).map(personName).join("、") + (f.actors.length > 2 ? " +" + (f.actors.length - 2) : "");
        return [
          '<tr data-act="media-edit" data-id="' + f.id + '">',
          '<td><div class="media-cell"><span class="cover-mini"><img src="' + f.poster + '" alt="" /></span><div><strong>' + esc(f.title) + '</strong><small>' + esc(f.identifier) + ' · ' + esc(f.en || "") + '</small></div></div></td>',
          '<td>' + esc(f.category) + '</td><td class="mono-line">' + f.year + '</td><td class="truncate">' + esc(actors) + '</td>',
          '<td class="mono-line">' + esc(f.editions[0].name) + '</td>',
          '<td><span class="file-state ' + file[1] + '"><i></i>' + file[0] + '</span></td>',
          '<td class="row-actions"><button class="inline-link" data-act="media-edit" data-id="' + f.id + '">编辑资料</button></td>',
          '</tr>'
        ].join('');
      }).join(''),
      '</tbody></table></div>'
    ].join('');
  }

  function mediaGrid(rows, mode) {
    return [
      '<div class="media-grid ' + (mode === "poster" ? "poster-mode" : "backdrop-mode") + '">',
      rows.slice(0, 14).map((f) => [
        '<button data-act="media-edit" data-id="' + f.id + '">',
        '<span class="' + (mode === "poster" ? "poster-art" : "backdrop-art") + '"><img src="' + (mode === "poster" ? f.poster : f.backdrop) + '" alt="" /></span>',
        '<strong>' + esc(f.title) + '</strong><small>' + f.year + ' · ' + esc(f.category) + ' · ' + esc(f.editions[0].name) + '</small>',
        '</button>'
      ].join('')).join(''),
      '</div>'
    ].join('');
  }

  function renderMedia() {
    const rows = mediaRows();
    return [
      '<section class="admin-page">',
      pageHead("影片资料库", "已发布作品与文件状态，用于扫描、校正与进入编辑。"),
      countBar([
        { value: "39", label: "部正式影片" },
        { value: "02", label: "待检查文件", tone: "warn" },
        { value: "12", label: "个 4K 版本" },
        { value: "03", label: "个分集容器" }
      ], '<span class="folder-note">最近扫描 09:42</span>'),
      '<div class="catalog-toolbar">',
      searchBox("搜索片名、编号或演员", "mediaQuery", state.mediaQuery),
      selectBox("分类", "mediaCategory", state.mediaCategory, [{ value: "", label: "全部分类" }].concat(D.categories.map((c) => ({ value: c.name, label: c.name })))),
      selectBox("清晰度", "mediaQuality", state.mediaQuality, [{ value: "", label: "全部清晰度" }, { value: "4k", label: "4K" }, { value: "1080", label: "1080p" }]),
      selectBox("中文", "mediaChinese", state.mediaChinese, [{ value: "", label: "全部" }, { value: "yes", label: "支持中文" }]),
      selectBox("排序", "mediaSort", state.mediaSort, [{ value: "createdAt", label: "添加时间" }, { value: "year", label: "发行年份" }, { value: "name", label: "名称" }]),
      '<button class="sort-direction" data-act="media-dir">' + (state.mediaDir === "asc" ? "↑ 升序" : "↓ 降序") + '</button>',
      '<div class="view-switch" role="group" aria-label="影片展示方式">',
      ["backdrop", "poster", "table"].map((mode) => '<button data-act="media-mode" data-id="' + mode + '"' + (state.mediaMode === mode ? ' aria-pressed="true"' : '') + '>' + (mode === "backdrop" ? "横图" : mode === "poster" ? "海报" : "列表") + '</button>').join(''),
      '</div>',
      '</div>',
      rows.length ? (state.mediaMode === "table" ? mediaTable(rows) : mediaGrid(rows, state.mediaMode)) : '<div class="empty-state">没有匹配的影片。清空搜索或调整筛选。</div>',
      '<div class="table-foot"><span>显示 ' + Math.min(rows.length, 14) + ' / ' + rows.length + ' 部 · 第 1 页</span><span><button class="inline-link">下一页 →</button></span></div>',
      '</section>'
    ].join('');
  }

  function renderPeople() {
    const q = state.peopleQuery.trim().toLowerCase();
    const rows = D.people.filter((p) => {
      if (state.peopleCategory && p.category !== state.peopleCategory) return false;
      if (!q) return true;
      return [p.name, p.en, p.category].join(" ").toLowerCase().includes(q);
    });
    return [
      '<section class="admin-page">',
      pageHead("演员", "常用名、详细名称、分类与馆藏作品。", '<button class="btn-dark" data-act="dict-new" data-id="people">＋ 新增演员</button>'),
      countBar([
        { value: D.counts.people, label: "位演员" },
        { value: D.people.filter((p) => p.workCount > 0).length, label: "有馆藏作品" },
        { value: D.people.filter((p) => !p.missingPortrait && !p.missingDetailed).length, label: "资料完整" }
      ]),
      '<div class="catalog-toolbar">',
      searchBox("搜索常用名或详细名称", "peopleQuery", state.peopleQuery),
      selectBox("分类", "peopleCategory", state.peopleCategory, [{ value: "", label: "全部分类" }].concat(D.categories.map((c) => ({ value: c.name, label: c.name })))),
      '<span class="toolbar-note">按名称排序</span>',
      '</div>',
      rows.length ? '<div class="people-grid">' : '<div class="empty-state">没有匹配的演员。清空搜索或切换分类。</div>',
      rows.map((p) => [
        '<button class="person-card" data-act="person" data-id="' + p.id + '">',
        '<span class="person-art"><img src="' + p.portrait + '" alt="" /></span>',
        '<strong>' + esc(p.name) + '</strong>',
        '<small>' + esc(p.category) + ' · ' + p.workCount + ' 部作品</small>',
        '</button>'
      ].join('')).join(''),
      rows.length ? '</div>' : '',
      '<div class="table-foot"><span>' + rows.length + ' 位演员</span><span><button class="inline-link">下一页 →</button></span></div>',
      '</section>'
    ].join('');
  }

  function renderPerson(id) {
    const p = D.people.find((x) => x.id === id) || D.people[0];
    const years = p.works.length ? Math.min.apply(null, p.works.map((f) => f.year)) + " – " + Math.max.apply(null, p.works.map((f) => f.year)) : "暂无作品";
    return [
      '<section class="admin-page record-page">',
      '<button class="back-link" data-act="back-people">← 返回演员列表</button>',
      '<header class="record-head">',
      '<span class="record-portrait"><img src="' + p.portrait + '" alt="" /></span>',
      '<div class="record-copy"><p class="eyebrow">演员资料 / ' + esc(p.category) + '</p><h1>' + esc(p.name) + '</h1><p class="record-en">' + esc(p.en || "—") + '</p>',
      '<dl class="record-facts"><div><dt>详细名称</dt><dd>' + esc(p.detailedName) + '</dd></div><div><dt>分类</dt><dd>' + esc(p.category) + '</dd></div><div><dt>馆藏年份</dt><dd>' + years + '</dd></div><div><dt>作品</dt><dd>' + p.works.length + ' 部</dd></div></dl></div>',
      '<button class="btn-outline" data-act="record-edit" data-id="' + p.id + '" data-kind="person">编辑演员</button>',
      '</header>',
      '<section class="works-section"><header><h2>参演作品</h2><span>' + p.works.length + ' 部</span></header><div class="works-grid">',
      p.works.map((f) => '<button data-act="media-edit" data-id="' + f.id + '"><span class="work-poster"><img src="' + f.poster + '" alt="" /></span><strong>' + esc(f.title) + '</strong><small>' + f.year + ' · ' + esc(f.category) + '</small></button>').join(''),
      '</div></section></section>'
    ].join('');
  }

  function renderFranchises() {
    const q = state.seriesQuery.trim().toLowerCase();
    const rows = D.series.filter((s) => !q || [s.name, s.description].join(" ").toLowerCase().includes(q));
    return [
      '<section class="admin-page">',
      pageHead("系列", "按发行年份排列的馆藏作品；系列不是分集容器。", '<button class="btn-dark" data-act="dict-new" data-id="franchises">＋ 新增系列</button>'),
      countBar([
        { value: D.counts.series, label: "个系列" },
        { value: D.series.reduce((n, s) => n + s.workCount, 0), label: "关联作品" },
        { value: D.series.filter((s) => s.workCount).length, label: "有作品" }
      ]),
      '<div class="catalog-toolbar">',
      searchBox("搜索系列名称或说明", "seriesQuery", state.seriesQuery),
      '<span class="toolbar-note">按作品数量排序</span>',
      '</div>',
      rows.length ? '<div class="series-index">' : '<div class="empty-state">没有匹配的系列。</div>',
      rows.map((s) => [
        '<button class="series-card" data-act="franchise" data-id="' + s.id + '">',
        '<span class="series-art"><img src="' + s.cover + '" alt="" /></span>',
        '<span class="series-copy"><strong>' + esc(s.name) + '</strong><small>' + esc(s.category) + ' · ' + s.workCount + ' 部作品</small><span>' + esc(s.description) + '</span></span>',
        '</button>'
      ].join('')).join(''),
      rows.length ? '</div>' : '',
      '<div class="table-foot"><span>' + rows.length + ' 个系列</span><span></span></div>',
      '</section>'
    ].join('');
  }

  function renderFranchise(id) {
    const s = D.series.find((x) => x.id === id) || D.series[0];
    return [
      '<section class="admin-page record-page">',
      '<button class="back-link" data-act="back-franchises">← 返回系列列表</button>',
      '<header class="record-head series-head">',
      '<span class="record-cover"><img src="' + s.cover + '" alt="" /></span>',
      '<div class="record-copy"><p class="eyebrow">系列资料 / ' + esc(s.category) + '</p><h1>' + esc(s.name) + '</h1><p class="record-en">' + s.workCount + ' 部作品</p><p class="record-desc">' + esc(s.description) + '</p></div>',
      '<button class="btn-outline" data-act="record-edit" data-id="' + s.id + '" data-kind="franchise">编辑系列</button>',
      '</header>',
      '<section class="works-section"><header><h2>系列作品</h2><span>按发行年份</span></header><div class="works-grid">',
      s.works.map((f) => '<button data-act="media-edit" data-id="' + f.id + '"><span class="work-poster"><img src="' + f.poster + '" alt="" /></span><strong>' + esc(f.title) + '</strong><small>' + f.year + ' · ' + esc(f.category) + '</small></button>').join(''),
      '</div></section></section>'
    ].join('');
  }

  function renderCategories() {
    return [
      '<section class="admin-page">',
      pageHead("分类维护", "单一主分类；隐藏只收起观看端入口，不删除关联。", '<button class="btn-dark" data-act="dict-new" data-id="categories">＋ 新增分类</button>'),
      countBar([
        { value: D.categories.length, label: "个分类" },
        { value: D.categories.filter((c) => c.visible).length, label: "片库中显示" },
        { value: VX.films.length, label: "部已发布影片" }
      ]),
      '<div class="table-frame"><table class="data-table simple-table"><thead><tr><th>分类</th><th>上级</th><th>作品</th><th>顺序</th><th>观看端</th><th class="row-actions">操作</th></tr></thead><tbody>',
      D.categories.map((c) => '<tr><td><strong>' + esc(c.name) + '</strong><small class="mono-line">' + esc(c.en) + '</small></td><td>' + esc(c.parent) + '</td><td>' + c.workCount + ' 部</td><td class="mono-line">' + c.order + '</td><td><span class="status ' + (c.visible ? "ok" : "muted") + '"><i></i>' + (c.visible ? "显示" : "隐藏") + '</span></td><td class="row-actions"><button class="inline-link" data-act="category-toggle" data-id="' + c.id + '">' + (c.visible ? "隐藏" : "显示") + '</button><button class="inline-link" data-act="dict-edit" data-id="' + c.id + '" data-kind="categories">编辑</button></td></tr>').join(''),
      '</tbody></table></div>',
      '</section>'
    ].join('');
  }

  function renderDictionary(kind) {
    const isTag = kind === "tags";
    const rows = (isTag ? D.tags : D.organizations).filter((x) => !state.dictionaryQuery || [x.name, x.detail].join(" ").toLowerCase().includes(state.dictionaryQuery.toLowerCase()));
    return [
      '<section class="admin-page">',
      pageHead(isTag ? "标签维护" : "片商 / 发行机构", isTag ? "标签按属性组展示，可在影片的归类与关联中使用。" : "片商与制作、发行关系；内部身份不等于来源编码。", '<button class="btn-dark" data-act="dict-new" data-id="' + kind + '">＋ 新增' + (isTag ? "标签" : "片商") + '</button>'),
      countBar([
        { value: isTag ? D.tags.length : D.organizations.length, label: isTag ? "个标签" : "个机构" },
        { value: (isTag ? D.tags : D.organizations).filter((x) => x.visible).length, label: "显示中" },
        { value: (isTag ? D.tags : D.organizations).reduce((n, x) => n + x.workCount, 0), label: "关联作品" }
      ]),
      '<div class="catalog-toolbar">',
      searchBox("搜索" + (isTag ? "标签" : "片商") + "名称", "dictionaryQuery", state.dictionaryQuery),
      '<span class="toolbar-note">' + rows.length + ' 项</span>',
      '</div>',
      rows.length ? '<div class="dict-grid">' : '<div class="empty-state">没有匹配的资料。</div>',
      rows.map((x) => [
        '<button class="dict-card" data-act="dict-edit" data-id="' + x.id + '" data-kind="' + kind + '">',
        '<span class="dict-mark">' + esc(x.name.slice(0, 1)) + '</span>',
        '<span class="dict-copy"><strong>' + esc(x.name) + '</strong><small>' + esc(x.detail) + (isTag ? ' · ' + esc(x.categoryName) : '') + '</small><em>' + x.workCount + ' 部作品 · ' + (x.visible ? "显示中" : "已隐藏") + '</em></span>',
        '<span class="dict-arrow">→</span>',
        '</button>'
      ].join('')).join(''),
      rows.length ? '</div>' : '',
      '</section>'
    ].join('');
  }

  function renderCollections() {
    return [
      '<section class="admin-page">',
      pageHead("收藏夹", "个人自用片单；复制只添加，移动先确保目标包含成员。", '<button class="btn-dark" data-act="collection-new">＋ 新建收藏夹</button>'),
      countBar([
        { value: D.collections.length, label: "个收藏夹" },
        { value: D.collections.reduce((n, c) => n + c.count, 0), label: "部影片成员" },
        { value: D.collections.filter((c) => c.cover).length, label: "有封面" }
      ]),
      '<div class="collection-admin-grid">',
      D.collections.map((c) => [
        '<button class="collection-admin-card" data-act="collection-edit" data-id="' + c.id + '">',
        '<span class="collection-art"><img src="' + c.cover + '" alt="" /><i>' + c.count + '</i></span>',
        '<span class="collection-copy"><strong>' + esc(c.name) + '</strong><small>' + esc(c.desc) + '</small><em>' + c.count + ' 部影片 · 编辑资料</em></span>',
        '</button>'
      ].join('')).join(''),
      '</div>',
      '</section>'
    ].join('');
  }

  function jobBadge(job) {
    if (job.state === "running") return badge("执行中", "warn");
    if (job.state === "failed") return badge("失败", "bad");
    if (job.state === "done") return badge("已完成", "ok");
    return badge("排队", "muted");
  }

  function renderJobs() {
    return [
      '<section class="admin-page">',
      pageHead("后台任务", "文件扫描、来源抓取、整理与探测由 Worker 执行。", '<button class="btn-outline" data-act="jobs-refresh">刷新任务</button>'),
      countBar([
        { value: "01", label: "执行中", tone: "warn" },
        { value: "01", label: "排队" },
        { value: "01", label: "失败", tone: "bad" },
        { value: "12 秒", label: "Worker 心跳" }
      ], '<span class="folder-note">worker-01 · 队列 1</span>'),
      '<div class="two-col">',
      '<section class="panel"><header class="panel-head"><h2>任务队列</h2><span>最近 4 条</span></header><div class="job-list">',
      D.jobs.map((j) => '<div class="job-row"><span class="job-icon">' + icon(j.state === "done" ? "check" : j.state === "failed" ? "close" : "activity", 16) + '</span><div><strong>' + esc(j.name) + '</strong><small>' + esc(j.detail) + ' · ' + esc(j.started) + '</small><div class="job-progress"><i style="width:' + j.progress + '%"></i></div></div>' + jobBadge(j) + '</div>').join(''),
      '</div></section>',
      '<section class="panel"><header class="panel-head"><h2>最近文件探测</h2><span>来自录入队列</span></header><div class="probe-list">',
      D.drafts.slice(0, 5).map((d) => '<div class="probe-row"><span class="probe-file">' + esc(d.file) + '</span><span class="file-state ' + (d.blocked ? "bad" : "ok") + '"><i></i>' + (d.blocked ? "探测失败" : "探测成功") + '</span><small>' + (d.published ? "已发布" : d.reviewed ? "已确认" : "待核对") + '</small></div>').join(''),
      '</div></section></div>',
      '</section>'
    ].join('');
  }

  function renderSettings() {
    return [
      '<section class="admin-page">',
      pageHead("系统状态", "卷容量、Worker、数据库与工具版本，来自本机只读查询。", '<span class="health"><i></i>全部正常</span><button class="btn-outline" data-act="settings-refresh">重新检查</button>'),
      '<div class="status-grid">',
      '<article class="volume-card"><div class="card-head"><span>媒体卷 / MEDIA-01</span><b>可写</b></div><h2>3.4 <small>/ 4.0 TB</small></h2><div class="bar"><i style="width:85%"></i></div><p><span>/Volumes/Media-01</span><span>214 部</span></p></article>',
      '<article class="volume-card"><div class="card-head"><span>归档卷 / ARCHIVE-02</span><b>可写</b></div><h2>2.1 <small>/ 8.0 TB</small></h2><div class="bar"><i style="width:26%"></i></div><p><span>/Volumes/Archive-02</span><span>86 部</span></p></article>',
      '<article class="health-card"><div class="card-head"><span>Worker / 心跳</span><b class="ok">运行中</b></div><h2>12 <small>秒前</small></h2><p><span>版本 0.1.0</span><span>队列 0</span></p></article>',
      '<article class="health-card"><div class="card-head"><span>数据库 / PostgreSQL</span><b class="ok">已连接</b></div><h2>16 <small>· 12 ms</small></h2><p><span>schema 31</span><span>最近迁移 11.24</span></p></article>',
      '</div>',
      '<div class="two-col"><section class="panel"><header class="panel-head"><h2>服务与工具</h2><span>Runtime</span></header><dl class="ops-list">',
      '<div><dt>API</dt><dd>127.0.0.1:5120</dd><b class="ok">正常</b></div>',
      '<div><dt>观看端</dt><dd>127.0.0.1:5180</dd><b class="ok">正常</b></div>',
      '<div><dt>PostgreSQL</dt><dd>16.4 · 本地卷</dd><b class="ok">正常</b></div>',
      '<div><dt>ffprobe</dt><dd>7.1 · PATH</dd><b class="ok">正常</b></div>',
      '<div><dt>媒体根</dt><dd>.video-x-root · 已验证</dd><b class="ok">正常</b></div>',
      '</dl></section><section class="panel"><header class="panel-head"><h2>恢复与访问</h2><span>Access</span></header><dl class="ops-list">',
      '<div><dt>登录恢复</dt><dd>单账号 · 本机</dd><b class="warn">待验证</b></div>',
      '<div><dt>容器媒体挂载</dt><dd>只读 · 已挂载</dd><b class="ok">正常</b></div>',
      '<div><dt>外网服务</dt><dd>仅资料抓取</dd><b class="muted">未启用</b></div>',
      '<div><dt>最近备份</dt><dd>2026-11-25 23:00</dd><b class="ok">完成</b></div>',
      '</dl></section></div>',
      '</section>'
    ].join('');
  }

  function renderEnrich() {
    return [
      '<section class="admin-page">',
      pageHead("演员资料补全", "从演员维护中筛选缺头像或详细名称的资料，补全结果仍由人工保存。", '<span class="toolbar-note">缺项优先</span>'),
      '<div class="table-frame"><table class="data-table simple-table"><thead><tr><th>演员</th><th>分类</th><th>缺项</th><th>作品</th><th class="row-actions">操作</th></tr></thead><tbody>',
      D.enrich.map((p) => {
        const missing = [p.missingPortrait ? "头像" : "", p.missingDetailed ? "详细名称" : ""].filter(Boolean).join("、") || "资料齐全";
        return '<tr><td><div class="media-cell"><span class="portrait-mini"><img src="' + p.portrait + '" alt="" /></span><div><strong>' + esc(p.name) + '</strong><small>' + esc(p.en || "") + '</small></div></div></td><td>' + esc(p.category) + '</td><td><span class="badge ' + (missing === "资料齐全" ? "ok" : "warn") + '">' + esc(missing) + '</span></td><td>' + p.workCount + ' 部</td><td class="row-actions"><button class="inline-link" data-act="record-edit" data-id="' + p.id + '" data-kind="person">补全资料</button></td></tr>';
      }).join(''),
      '</tbody></table></div>',
      '</section>'
    ].join('');
  }

  function renderArchive() {
    return [
      '<section class="admin-page">',
      pageHead("已归档资料", "归档保留正式资料与关系，不进入正常片库。", ''),
      '<div class="table-frame"><table class="data-table simple-table"><thead><tr><th>资料</th><th>类型</th><th>归档时间</th><th>原因</th><th class="row-actions">操作</th></tr></thead><tbody>',
      D.archives.map((a) => '<tr><td><strong>' + esc(a.name) + '</strong></td><td>' + esc(a.kind) + '</td><td class="mono-line">' + esc(a.date) + '</td><td>' + esc(a.reason) + '</td><td class="row-actions"><button class="inline-link" data-act="archive-view" data-id="' + a.id + '">查看</button></td></tr>').join(''),
      '</tbody></table></div>',
      '</section>'
    ].join('');
  }

  function editorTabs() {
    return ["基本资料", "封面", "剧照", "演职员", "归类与关联", "版本与文件"];
  }

  function editorPanel(f) {
    const tab = state.editorTab;
    if (tab === "基本资料") {
      return [
        '<section class="form-section"><div class="form-head"><h2>基本资料</h2><span>Basic record</span></div>',
        '<div class="field-grid">',
        '<label class="field field-wide"><span>作品标题 <i>*</i></span><input data-of="title" value="' + esc(f.title) + '" /></label>',
        '<label class="field"><span>主编号 / 番号</span><input data-of="identifier" value="' + esc(f.identifier) + '" /></label>',
        '<label class="field"><span>发行日期 <i>*</i></span><input data-of="releaseDate" value="2024-03-08" /></label>',
        '<label class="field"><span>中文资料标记</span><select data-of="chinese"><option value="unknown">未标注</option><option value="yes">支持</option><option value="no">不支持</option></select></label>',
        '<label class="field"><span>主分类</span><select data-of="category"><option>' + esc(f.category) + '</option><option>动画</option><option>动作</option></select></label>',
        '</div>',
        '<label class="field field-area"><span>简介</span><textarea data-of="summary" rows="4">' + esc(f.summary) + '</textarea><small class="field-note">来源候选不会自动覆盖这里的手工内容。</small></label>',
        '<label class="field field-area"><span>我的资料备注</span><textarea data-of="notes" rows="2">4K 版来自主媒体卷；保留 1080p 原版以便移动端直接播放。</textarea></label>',
        '</section>'
      ].join('');
    }
    if (tab === "封面" || tab === "剧照") {
      const images = tab === "封面" ? [["竖版封面", f.poster, "poster"], ["横版背景", f.backdrop, "backdrop"]] : [["剧照 01", f.backdrop, "backdrop"], ["剧照 02", "assets/cinema/157336-backdrop.jpg", "backdrop"], ["剧照 03", "assets/cinema/324857-backdrop.jpg", "backdrop"]];
      return [
        '<section class="form-section"><div class="form-head"><h2>' + tab + '</h2><span>Artwork</span></div>',
        '<div class="artwork-grid">',
        images.map((img) => '<figure class="artwork-card"><img src="' + img[1] + '" alt="" /><figcaption><span>' + img[0] + '</span><button class="inline-link" data-act="pick-artwork" data-slot="' + img[2] + '">更换</button></figcaption></figure>').join(''),
        '</div><p class="field-note">封面与剧照分别维护；完整显示原图，缺图时保持同排对齐。</p></section>'
      ].join('');
    }
    if (tab === "演职员") {
      return [
        '<section class="form-section"><div class="form-head"><h2>演职员</h2><span>Credits</span></div>',
        '<div class="relation-block"><span class="relation-label">演员</span><div class="relation-chips">' + f.actors.slice(0, 6).map((id) => '<span>' + esc(personName(id)) + '<button data-act="remove-actor" data-id="' + id + '" aria-label="移除">×</button></span>').join('') + '<button class="add-chip" data-act="add-actor">+ 添加演员</button></div></div>',
        '<div class="relation-block"><span class="relation-label">导演</span><div class="relation-chips"><span>' + esc(f.director) + '<button data-act="remove-director" aria-label="移除">×</button></span><button class="add-chip" data-act="add-director">+ 添加导演</button></div></div>',
        '</section>'
      ].join('');
    }
    if (tab === "归类与关联") {
      return [
        '<section class="form-section"><div class="form-head"><h2>归类与关联</h2><span>Classification</span></div>',
        '<div class="field-grid"><label class="field"><span>主分类</span><select><option>' + esc(f.category) + '</option><option>动画</option></select></label></div>',
        '<div class="relation-block"><span class="relation-label">系列</span><div class="relation-chips">' + (f.seriesName ? '<span>' + esc(f.seriesName) + '<button data-act="remove-series" aria-label="移除">×</button></span>' : '<span class="muted-chip">未关联</span>') + '<button class="add-chip" data-act="add-series">+ 关联系列</button></div></div>',
        '<div class="relation-block"><span class="relation-label">标签</span><div class="relation-chips">' + (f.tags || []).map((t) => '<span>' + esc(t) + '<button data-act="remove-tag" data-id="' + esc(t) + '" aria-label="移除">×</button></span>').join('') + '<button class="add-chip" data-act="add-tags">+ 添加标签</button></div></div>',
        '<div class="relation-block"><span class="relation-label">片商</span><div class="relation-chips">' + (f.studios || []).map((s) => '<span>' + esc(s) + '<button data-act="remove-studio" data-id="' + esc(s) + '" aria-label="移除">×</button></span>').join('') + '<button class="add-chip" data-act="add-studios">+ 关联片商</button></div></div>',
        '</section>'
      ].join('');
    }
    return [
      '<section class="form-section"><div class="form-head"><h2>版本与文件</h2><span>Editions / Files</span></div>',
      '<div class="edition-table">',
      f.editions.map((e, i) => '<div class="edition-row"><span class="edition-index">' + (i + 1) + '</span><div><strong>' + esc(e.name) + (i === 0 ? ' <em>默认</em>' : '') + '</strong><small>' + esc(e.resolution) + ' · ' + esc(e.codec) + ' · ' + esc(e.size) + ' · ' + esc(e.duration) + '</small><small class="mono-line">/Volumes/Media-01/' + esc(f.title) + '/Dune.Part.Two.2024.2160p.mkv</small></div><span class="file-state ok"><i></i>记录正常</span><button class="inline-link" data-act="toast" data-id="文件选择器在正式实现中打开">修复文件</button></div>').join(''),
      '</div><div class="edition-actions"><button class="btn-outline" data-act="toast" data-id="添加版本在正式实现中打开">＋ 添加版本</button><button class="btn-outline" data-act="toast" data-id="重新探测在正式实现中打开">重新探测</button></div></section>'
    ].join('');
  }

  function renderDraftEditor(id) {
    const d = D.drafts.find((x) => x.id === id) || D.drafts[0];
    return [
      '<section class="admin-page">',
      '<button class="back-link" data-act="back-intake">← 返回录入队列</button>',
      '<header class="editor-head"><span class="editor-cover"><img src="' + d.poster + '" alt="" /></span><div class="editor-title"><p class="eyebrow">草稿编辑</p><h1>' + esc(d.title) + '</h1><p>' + esc(d.file) + ' <i>/</i> ' + esc(d.sourceState) + '</p></div><div class="editor-actions"><button class="btn-outline" data-act="back-intake">返回队列</button><button class="btn-dark" data-act="draft-editor-save" data-id="' + d.id + '">保存草稿</button></div></header>',
      '<div class="draft-editor-grid">',
      '<div class="editor-form"><section class="form-section"><div class="form-head"><h2>资料</h2><span>Draft record</span></div>',
      '<div class="field-grid"><label class="field field-wide"><span>作品标题 <i>*</i></span><input data-of="title" value="' + esc(d.title) + '" /></label><label class="field"><span>发行日期</span><input data-of="date" value="' + esc(d.date) + '" /></label><label class="field"><span>主分类</span><select data-of="category">' + D.categories.map((c) => '<option' + (c.name === d.category ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label></div>',
      '<label class="field field-area"><span>简介</span><textarea data-of="summary" rows="5">' + esc(d.summary) + '</textarea></label>',
      '<label class="field field-area"><span>备注</span><textarea data-of="notes" rows="3"></textarea></label>',
      '</section></div>',
      '<aside class="editor-preview"><div class="preview-card"><div class="preview-head"><span>文件</span><small>Local probe</small></div><dl class="fact-list" style="padding:12px 14px"><div><dt>路径</dt><dd>' + esc(d.filePath) + '</dd></div><div><dt>格式</dt><dd>' + esc(d.format) + '</dd></div><div><dt>大小</dt><dd>' + esc(d.size) + '</dd></div><div><dt>时长</dt><dd>' + esc(d.duration) + '</dd></div><div><dt>目标</dt><dd>' + esc(d.target) + '</dd></div></dl></div><div class="check-card"><div class="preview-head"><span>资料核对</span><small>' + d.complete + '/6</small></div><ul><li class="ok"><span>标题</span><b>已填写</b></li><li class="' + (d.date ? "ok" : "warn") + '"><span>发行日期</span><b>' + (d.date ? "已填写" : "缺失") + '</b></li><li class="ok"><span>分类</span><b>' + esc(d.category) + '</b></li><li class="warn"><span>封面</span><b>' + (d.missingFields.join("").includes("封面") ? "缺失" : "已有") + '</b></li><li class="' + (d.sourceState === "抓取失败" ? "warn" : "ok") + '"><span>来源</span><b>' + esc(d.sourceState) + '</b></li></ul></div></aside>',
      '</div></section>'
    ].join('');
  }

  function renderEditor() {
    const f = VX.films.find((x) => x.id === state.editorId) || VX.films[0];
    return [
      '<section class="admin-page editor-page">',
      '<div class="editor-topline"><button class="back-link" data-act="back-media">← 返回资料库</button><span class="editor-state"><i></i>已发布 · revision 18</span></div>',
      '<header class="editor-head"><span class="editor-cover"><img src="' + f.poster + '" alt="" /></span><div class="editor-title"><p class="eyebrow">影片资料编辑</p><h1>' + esc(f.title) + '</h1><p>' + esc(f.en) + ' <i>/</i> ' + esc(f.identifier) + ' <i>/</i> ' + esc(f.category) + '</p></div><div class="editor-actions"><button class="btn-outline" data-act="toast" data-id="在观看端预览">在观看端预览 ↗</button><button class="btn-dark" data-act="editor-save">保存资料</button></div></header>',
      '<div class="editor-grid">',
      '<nav class="editor-sections" aria-label="资料分区"><p class="rail-group"><span>01</span> 资料</p>' + editorTabs().slice(0, 5).map((t) => '<button data-act="editor-tab" data-id="' + t + '"' + (state.editorTab === t ? ' aria-current="page"' : '') + '>' + t + '</button>').join('') + '<p class="rail-group"><span>02</span> 文件</p><button data-act="editor-tab" data-id="版本与文件"' + (state.editorTab === "版本与文件" ? ' aria-current="page"' : '') + '>版本与文件</button></nav>',
      '<div class="editor-form">' + editorPanel(f) + '</div>',
      '<aside class="editor-preview"><div class="preview-card"><div class="preview-head"><span>封面预览</span><small>Poster</small></div><div class="preview-poster"><img src="' + f.poster + '" alt="" /></div><div class="preview-backdrop"><img src="' + f.backdrop + '" alt="" /></div><div class="preview-meta"><span>竖版 2:3</span><span>横版 16:9</span><button data-act="pick-artwork" data-slot="poster">更换</button></div></div><div class="check-card"><div class="preview-head"><span>发布检查</span><small>Ready</small></div><ul><li class="ok"><span>标题</span><b>已填写</b></li><li class="ok"><span>完整发行日期</span><b>2024-03-08</b></li><li class="ok"><span>主分类</span><b>' + esc(f.category) + '</b></li><li class="ok"><span>播放文件</span><b>' + f.editions.length + ' 个版本</b></li><li class="warn"><span>中文资料</span><b>未标注</b></li></ul><button class="check-action" data-act="source-compare">查看来源对照 →</button></div></aside>',
      '</div>',
      '<footer class="editor-savebar"><p><i></i>暂无未保存修改</p><div><button class="btn-outline" data-act="toast" data-id="已放弃本次演示修改">放弃修改</button><button class="btn-dark" data-act="editor-save">保存资料</button></div></footer>',
      '</section>'
    ].join('');
  }


  function overlayDraft(d) {
    const st = draftStatus(d);
    return [
      '<div class="drawer-hero"><img src="' + d.backdrop + '" alt="" /><div><span class="badge ' + st[1] + '">' + st[0] + '</span><h2>' + esc(d.title) + '</h2><small>' + esc(d.identifier) + ' · ' + esc(d.format) + ' · ' + esc(d.size) + '</small></div></div>',
      '<div class="drawer-body">',
      '<div class="drawer-fields"><label class="field"><span>作品标题</span><input data-of="title" value="' + esc(d.title) + '" /></label><label class="field"><span>完整发行日期</span><input data-of="date" value="' + esc(d.date) + '" /></label><label class="field"><span>主分类</span><select data-of="category"><option>' + esc(d.category) + '</option><option>剧情</option><option>动画</option></select></label><label class="field"><span>整理目标</span><input data-of="target" value="' + esc(d.target) + '" /></label></div>',
      '<div class="drawer-section"><div class="drawer-section-head"><span>资料核对</span><small>' + d.complete + ' / 6</small></div>' + coverageHtml(d) + '<p class="drawer-note">' + esc(d.sourceState) + ' · ' + esc(d.source) + '。抓取成功不等于资料齐全，发布前仍需人工确认。</p></div>',
      '<div class="drawer-section"><div class="drawer-section-head"><span>文件</span><small>本地探测</small></div><dl class="fact-list"><div><dt>路径</dt><dd>' + esc(d.filePath) + '</dd></div><div><dt>格式</dt><dd>' + esc(d.format) + '</dd></div><div><dt>大小</dt><dd>' + esc(d.size) + '</dd></div><div><dt>时长</dt><dd>' + esc(d.duration) + '</dd></div><div><dt>目标</dt><dd>' + esc(d.target) + '</dd></div></dl></div>',
      '<div class="drawer-section"><div class="drawer-section-head"><span>来源</span><small>' + esc(d.source) + '</small></div><div class="source-candidate"><img src="' + d.poster + '" alt="" /><div><strong>' + esc(d.title) + '</strong><small>已取得 标题、封面、演员、系列</small><small class="warn-text">未取得 发行日期</small><button class="inline-link" data-act="toast" data-id="来源字段对照在正式实现中打开">核对来源字段 →</button></div></div></div>',
      '</div>',
      '<div class="drawer-actions"><button class="btn-outline" data-act="draft-save" data-id="' + d.id + '">保存草稿</button><button class="btn-outline" data-act="edit-draft" data-id="' + d.id + '">完整编辑</button><button class="btn-dark" data-act="draft-confirm" data-id="' + d.id + '">' + (d.published ? "打开作品" : d.reviewed ? "手动发布" : "确认核对") + '</button></div>'
    ].join('');
  }

  function overlayForm(kind, id) {
    const picked = D.drafts.filter((d) => state.selected.has(d.id));
    if (kind === "logout") {
      return {
        title: "退出登录",
        body: '<p class="drawer-note" style="margin-top:0">这是单账号本机媒体库；退出后需要重新登录。演示环境不会真的清除登录状态。</p>'
      };
    }
    if (kind === "portrait") {
      const current = D.people.find((p) => p.id === id);
      return {
        title: "更换演员头像",
        body: '<div class="artwork-picker portrait-picker">' + D.people.slice(0, 24).map((p) => '<label><input type="radio" name="portrait" data-of="image" value="' + p.portrait + '"' + (current && current.portrait === p.portrait ? " checked" : "") + ' /><img src="' + p.portrait + '" alt="" /><small>' + esc(p.name) + '</small></label>').join('') + '</div>'
      };
    }
    if (kind === "cover") {
      return {
        title: "更换系列封面",
        body: '<div class="artwork-picker cover-picker">' + VX.films.slice(0, 12).map((f) => '<label><input type="radio" name="cover" data-of="image" value="' + f.backdrop + '" /><img src="' + f.backdrop + '" alt="" /><small>' + esc(f.title) + '</small></label>').join('') + '</div>'
      };
    }
    if (kind === "director") {
      const film = VX.films.find((x) => x.id === id);
      return {
        title: "添加导演",
        body: '<div class="collection-picker">' + D.people.slice(0, 20).map((p) => '<label><input type="radio" name="director" data-of="director" value="' + esc(p.name) + '"' + (film && film.director === p.name ? " checked" : "") + ' /><img src="' + p.portrait + '" alt="" /><span><b>' + esc(p.name) + '</b><small>' + esc(p.category) + '</small></span></label>').join('') + '</div>'
      };
    }
    if (kind === "series") {
      const film = VX.films.find((x) => x.id === id);
      return {
        title: "关联系列",
        body: '<div class="collection-picker">' + D.series.map((s) => '<label><input type="radio" name="series" data-of="series" value="' + esc(s.id) + '"' + (film && film.series === s.id ? " checked" : "") + ' /><img src="' + s.cover + '" alt="" /><span><b>' + esc(s.name) + '</b><small>' + s.workCount + ' 部作品 · ' + esc(s.category) + '</small></span></label>').join('') + '</div>'
      };
    }
    if (kind === "tags") {
      const film = VX.films.find((x) => x.id === id);
      return {
        title: "添加标签",
        body: '<div class="collection-picker">' + D.tags.map((t) => '<label><input type="checkbox" data-tag-pick="' + esc(t.name) + '"' + (film && (film.tags || []).includes(t.name) ? " checked" : "") + ' /><span><b>' + esc(t.name) + '</b><small>' + esc(t.detail) + ' · ' + t.workCount + ' 部作品</small></span></label>').join('') + '</div>'
      };
    }
    if (kind === "studios") {
      const film = VX.films.find((x) => x.id === id);
      return {
        title: "关联片商",
        body: '<div class="collection-picker">' + D.organizations.map((s) => '<label><input type="checkbox" data-studio-pick="' + esc(s.name) + '"' + (film && (film.studios || []).includes(s.name) ? " checked" : "") + ' /><span><b>' + esc(s.name) + '</b><small>' + esc(s.detail) + ' · ' + s.workCount + ' 部作品</small></span></label>').join('') + '</div>'
      };
    }
    if (kind === "source") {
      const film = VX.films.find((x) => x.id === id);
      return {
        title: "来源对照",
        body: '<p class="drawer-note" style="margin-top:0">左侧为当前手工资料，右侧为来源候选；这里只做对照，不自动覆盖。</p><div class="source-compare">' + [["标题", film ? film.title : "", film ? film.title : ""], ["发行日期", "2024-03-08", "2024-03-08"], ["演员", film ? film.actors.slice(0, 2).map(personName).join("、") : "", "同一组演员"], ["系列", film ? film.seriesName || "—" : "—", "沙丘"], ["简介", film ? film.summary : "", "来源简介片段…"]].map((r) => '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b><em>' + esc(r[2]) + '</em></div>').join("") + '</div>'
      };
    }
    if (kind === "archive") {
      const a = D.archives.find((x) => x.id === id);
      return {
        title: "归档资料",
        body: a ? '<dl class="fact-list"><div><dt>名称</dt><dd>' + esc(a.name) + '</dd></div><div><dt>类型</dt><dd>' + esc(a.kind) + '</dd></div><div><dt>时间</dt><dd>' + esc(a.date) + '</dd></div><div><dt>原因</dt><dd>' + esc(a.reason) + '</dd></div></dl><p class="drawer-note">归档保留正式资料与关系，不进入正常片库；恢复操作需在正式实现中处理。</p>' : '<p class="drawer-note">资料不存在。</p>'
      };
    }
    if (kind === "artwork") {
      const film = VX.films.find((x) => x.id === id);
      const slot = state.overlay.extra || "poster";
      return {
        title: slot === "poster" ? "更换封面" : "更换横图",
        body: [
          '<p class="drawer-note" style="margin-top:0">从已有影片图片中选择，或继续使用当前文件。</p>',
          '<div class="artwork-picker">',
          VX.films.slice(0, 12).map((f) => '<label><input type="radio" name="artwork" data-of="image" value="' + (slot === "poster" ? f.poster : f.backdrop) + '"' + (film && (slot === "poster" ? film.poster : film.backdrop) === (slot === "poster" ? f.poster : f.backdrop) ? " checked" : "") + ' /><img src="' + (slot === "poster" ? f.poster : f.backdrop) + '" alt="" /><small>' + esc(f.title) + '</small></label>').join(''),
          '</div>',
          '<p class="drawer-note">正式实现应从素材库或本地文件上传选择；这里使用当前演示图片。</p>'
        ].join("")
      };
    }
    if (kind === "actor") {
      const film = VX.films.find((x) => x.id === id);
      const existing = film ? film.actors : [];
      return {
        title: "添加演员",
        body: [
          '<p class="drawer-note" style="margin-top:0">复用已有演员资料；勾选后保存。</p>',
          '<div class="collection-picker">',
          D.people.filter((p) => !existing.includes(p.id)).slice(0, 24).map((p) => '<label><input type="checkbox" data-actor-pick="' + p.id + '" /><img src="' + p.portrait + '" alt="" /><span><b>' + esc(p.name) + '</b><small>' + esc(p.category) + ' · ' + p.workCount + ' 部作品</small></span></label>').join(''),
          '</div>'
        ].join("")
      };
    }
    if (kind === "inbox") {
      const files = [
        ["沙丘", "Dune.2021.2160p.mkv", "科幻", "58.4 GB", "2 小时 36 分", "438631"],
        ["蝙蝠侠：侠影之谜", "Batman.Begins.2005.1080p.mkv", "动作", "12.1 GB", "2 小时 20 分", "272"],
        ["疯狂的麦克斯4：狂暴之路", "Mad.Max.Fury.Road.2015.2160p.mkv", "动作", "48.2 GB", "2 小时 00 分", "76341"],
        ["末代皇帝", "The.Last.Emperor.1987.1080p.mkv", "剧情", "15.4 GB", "2 小时 43 分", "746"],
        ["寄生虫", "Parasite.2019.2160p.mkv", "剧情", "21.7 GB", "2 小时 12 分", "496243"],
        ["阿凡达", "Avatar.2009.1080p.mp4", "科幻", "9.8 GB", "2 小时 42 分", "19995"]
      ];
      return {
        title: "从下载目录选择文件",
        body: [
          '<p class="drawer-note" style="margin-top:0">inbox/ · 12 个文件 · 最近扫描 09:42。勾选后创建草稿，仍需核对与手动发布。</p>',
          '<div class="inbox-list">',
          files.map((f) => '<label class="inbox-row"><input type="checkbox" data-inbox="' + esc(f[5]) + '" /><span><strong>' + esc(f[0]) + '</strong><small>' + esc(f[1]) + '</small></span><em>' + esc(f[2]) + ' · ' + esc(f[3]) + ' · ' + esc(f[4]) + '</em></label>').join(''),
          '</div>',
          '<p class="drawer-note">同名或已存在的作品会作为新草稿进入队列；发布前由你决定是否合并。</p>'
        ].join("")
      };
    }
    if (kind === "target") {
      return {
        title: "设置整理目标 · " + picked.length + " 项",
        body: [
          '<p class="drawer-note" style="margin-top:0">所选文件将从当前位置移动到目标目录；发布前仍可修改。</p>',
          '<label class="field"><span>目标目录</span><select data-of="target"><option>电影 / 科幻</option><option>电影 / 剧情</option><option>电影 / 动画</option><option>私人影像 / 纪录片</option></select></label>',
          '<div class="drawer-section"><div class="drawer-section-head"><span>将影响的草稿</span><small>' + picked.length + ' 项</small></div>',
          picked.map((d) => '<div class="group-order-row"><span>' + esc(d.category) + '</span><div><strong>' + esc(d.title) + '</strong><small>' + esc(d.file) + '</small></div></div>').join(''),
          '</div>'
        ].join("")
      };
    }
    if (kind === "batch-category") {
      return {
        title: "设置主分类 · " + picked.length + " 项",
        body: [
          '<p class="drawer-note" style="margin-top:0">修改分类后，涉及的草稿需要重新核对。</p>',
          '<label class="field"><span>归入分类</span><select data-of="category">' + D.categories.map((c) => '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>').join('') + '</select></label>',
          '<div class="drawer-section"><div class="drawer-section-head"><span>将影响的草稿</span><small>' + picked.length + ' 项</small></div>',
          picked.map((d) => '<div class="group-order-row"><span>' + esc(d.category) + '</span><div><strong>' + esc(d.title) + '</strong><small>' + esc(d.file) + '</small></div></div>').join(''),
          '</div>'
        ].join("")
      };
    }
    if (kind === "batch-lookup") {
      return {
        title: "抓取所选 · " + picked.length + " 项",
        body: [
          '<label class="field"><span>资料来源</span><select data-of="provider"><option>JavDB</option><option>TMDB</option></select></label>',
          '<label class="field"><span>关键词 / 编号</span><input data-of="query" value="' + esc(picked[0] ? picked[0].title : "") + '" /></label>',
          '<div class="drawer-section"><div class="drawer-section-head"><span>抓取范围</span><small>' + picked.length + ' 条</small></div>',
          picked.map((d) => '<div class="group-order-row"><span>' + esc(d.sourceState) + '</span><div><strong>' + esc(d.title) + '</strong><small>' + esc(d.file) + '</small></div></div>').join(''),
          '</div>',
          '<p class="drawer-note">抓取结果只作为候选，不会自动覆盖手工内容。完成后需要人工核对。</p>'
        ].join("")
      };
    }
    if (kind === "batch-review" || kind === "batch-publish") {
      const publish = kind === "batch-publish";
      return {
        title: (publish ? "发布所选 · " : "批量核对 · ") + picked.length + " 项",
        body: [
          '<p class="drawer-note" style="margin-top:0">' + (publish ? "发布以下草稿。发布后进入观看端片库。" : "逐项确认下列资料；确认后仍需手动发布。") + '</p>',
          '<div class="drawer-section"><div class="drawer-section-head"><span>所选草稿</span><small>' + picked.length + ' 项</small></div>',
          picked.map((d) => '<div class="group-order-row"><span>' + (d.reviewed ? "已确认" : "待核对") + '</span><div><strong>' + esc(d.title) + '</strong><small>' + esc(d.category) + ' · ' + esc(d.target) + '</small></div><span class="file-state ' + (d.blocked ? "bad" : "ok") + '"><i></i>' + (d.blocked ? "阻断" : "可发布") + '</span></div>').join(''),
          '</div>',
          publish ? '<p class="drawer-note">文件将从当前位置播放，或按整理目标移动后发布。</p>' : '<p class="drawer-note">有非必填缺项仍可确认；缺少文件或探测失败的草稿须先处理。</p>'
        ].join("")
      };
    }
    const person = kind === "person" ? D.people.find((p) => p.id === id) : null;
    const franchise = kind === "franchise" ? D.series.find((s) => s.id === id) : null;
    const category = kind === "category" ? D.categories.find((c) => c.id === id) : null;
    const tag = kind === "tag" ? D.tags.find((t) => t.id === id) : null;
    const org = kind === "organization" ? D.organizations.find((o) => o.id === id) : null;
    const collection = kind === "collection" ? D.collections.find((c) => c.id === id) : null;
    const isNew = id === "new";
    let title = "编辑资料";
    let body = "";
    if (kind === "person") {
      title = (isNew ? "新增" : "编辑") + "演员";
      body = [
        '<div class="portrait-preview"><img src="' + (person ? person.portrait : "assets/people/person-3.jpg") + '" alt="" /><button class="inline-link" data-act="pick-portrait" data-id="' + (person ? person.id : "new") + '">更换头像</button></div>',
        '<label class="field"><span>常用名 <i>*</i></span><input data-of="name" value="' + esc(person ? person.name : "") + '" /></label>',
        '<label class="field"><span>详细名称</span><input data-of="detailedName" value="' + esc(person ? person.detailedName : "") + '" /></label>',
        '<label class="field"><span>性别</span><select data-of="gender"><option value="unknown">未知</option><option value="female"' + (person && person.gender === 'female' ? ' selected' : '') + '>女性</option><option value="male"' + (person && person.gender === 'male' ? ' selected' : '') + '>男性</option><option value="other">其他</option></select></label>',
        '<label class="field"><span>所属分类</span><select data-of="category">' + D.categories.map((c) => '<option value="' + esc(c.name) + '"' + (person && person.category === c.name ? " selected" : "") + '>' + esc(c.name) + '</option>').join('') + '</select></label>'
      ].join('');
    } else if (kind === "franchise") {
      title = (isNew ? "新增" : "编辑") + "系列";
      body = [
        '<div class="portrait-preview wide"><img src="' + (franchise ? franchise.cover : "assets/cinema/843-backdrop.jpg") + '" alt="" /><button class="inline-link" data-act="pick-cover" data-id="' + (franchise ? franchise.id : "new") + '">更换封面</button></div>',
        '<label class="field"><span>名称 <i>*</i></span><input data-of="name" value="' + esc(franchise ? franchise.name : "") + '" /></label>',
        '<label class="field"><span>所属分类</span><select data-of="category">' + D.categories.map((c) => '<option value="' + esc(c.name) + '"' + (franchise && franchise.category === c.name ? " selected" : "") + '>' + esc(c.name) + '</option>').join('') + '</select></label>',
        '<label class="field"><span>说明</span><textarea data-of="description" rows="4">' + esc(franchise ? franchise.description : "") + '</textarea></label>'
      ].join('');
    } else if (kind === "category") {
      title = (isNew ? "新增" : "编辑") + "分类";
      body = '<label class="field"><span>分类名称 <i>*</i></span><input data-of="name" value="' + esc(category ? category.name : "") + '" /></label><p class="drawer-note">分类决定影片、演员与系列的主分类；层级和隐藏状态在列表中维护。</p>';
    } else if (kind === "tag") {
      title = (isNew ? "新增" : "编辑") + "标签";
      body = [
        '<label class="field"><span>名称 <i>*</i></span><input data-of="name" value="' + esc(tag ? tag.name : "") + '" /></label>',
        '<label class="field"><span>所属分类</span><select data-of="category">' + D.categories.map((c) => '<option value="' + esc(c.name) + '"' + (tag && tag.categoryName === c.name ? " selected" : "") + '>' + esc(c.name) + '</option>').join('') + '</select></label>',
        '<label class="field"><span>属性组</span><input data-of="detail" value="' + esc(tag ? tag.detail : "其他") + '" /></label>',
        '<label class="check-line"><input data-of="visible" type="checkbox"' + (tag && !tag.visible ? '' : ' checked') + ' /> 在详情与筛选中显示</label>'
      ].join('');
    } else if (kind === "organization") {
      title = (isNew ? "新增" : "编辑") + "片商";
      body = [
        '<label class="field"><span>名称 <i>*</i></span><input data-of="name" value="' + esc(org ? org.name : "") + '" /></label>',
        '<label class="field"><span>职责 / 说明</span><input data-of="detail" value="' + esc(org ? org.detail : "") + '" /></label>'
      ].join('');
    } else if (kind === "collection") {
      title = (isNew ? "新建" : "编辑") + "收藏夹";
      body = [
        '<label class="field"><span>名称 <i>*</i></span><input data-of="name" value="' + esc(collection ? collection.name : "") + '" /></label>',
        '<label class="field"><span>说明</span><textarea data-of="desc" rows="4">' + esc(collection ? collection.desc : "") + '</textarea></label>',
        '<p class="drawer-note">成员与顺序在观看端整理模式维护；这里只编辑收藏夹名称、说明与封面。</p>'
      ].join('');
    }
    return { title: title, body: body };
  }

  function overlayGroup() {
    const drafts = D.drafts.filter((d) => state.selected.has(d.id));
    return [
      '<div class="drawer-body">',
      '<label class="field"><span>容器名称</span><input data-of="name" value="海岸手记" /></label>',
      '<div class="field-grid"><label class="field"><span>容器资料取自</span><select>' + drafts.map((d) => '<option>' + esc(d.title) + '</option>').join('') + '</select></label><label class="field"><span>起始集号</span><input data-of="start" value="1" type="number" /></label></div>',
      '<div class="drawer-section"><div class="drawer-section-head"><span>分集顺序</span><small>' + drafts.length + ' 集</small></div><div class="group-order">',
      drafts.map((d, i) => '<div class="group-order-row"><span>第 ' + (i + 1) + ' 集</span><div><strong>' + esc(d.title) + '</strong><small>' + esc(d.file) + '</small></div><button class="inline-link" data-act="toast" data-id="顺序调整在正式实现中打开">上移</button></div>').join(''),
      '</div></div>',
      '<p class="drawer-note">各集保留自己的文件；容器本身不绑定视频，发布时整组一起校验。</p>',
      '</div>',
      '<div class="drawer-actions"><button class="btn-outline" data-act="close-overlay">取消</button><button class="btn-dark" data-act="overlay-save">创建容器并关联 ' + drafts.length + ' 集</button></div>'
    ].join('');
  }

  function renderOverlay() {
    const root = $("[data-overlay]");
    if (!state.overlay) {
      root.innerHTML = "";
      document.body.classList.remove("is-locked");
      return;
    }
    document.body.classList.add("is-locked");
    const type = state.overlay.type;
    const id = state.overlay.id;
    let title = "核对草稿";
    let body = "";
    let actions = "";
    if (type === "draft") {
      const d = D.drafts.find((x) => x.id === id) || D.drafts[0];
      title = "核对 · " + d.title;
      body = overlayDraft(d);
      actions = "";
    } else if (type === "group") {
      title = "创建分集容器";
      body = overlayGroup();
      actions = "";
    } else {
      const form = overlayForm(type, id);
      title = form.title;
      body = form.body;
      actions = (type === "source" || type === "archive")
        ? '<div class="drawer-actions"><button class="btn-dark" data-act="close-overlay">关闭</button></div>'
        : type === "logout"
          ? '<div class="drawer-actions"><button class="btn-outline" data-act="close-overlay">取消</button><button class="btn-dark" data-act="logout-confirm">退出</button></div>'
          : '<div class="drawer-actions"><button class="btn-outline" data-act="close-overlay">取消</button><button class="btn-dark" data-act="overlay-save">保存资料</button></div>';
    }
    root.innerHTML = [
      '<button class="overlay-scrim" data-act="close-overlay" aria-label="关闭"></button>',
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">',
      '<header class="drawer-head"><div><p class="eyebrow">资料操作</p><h2>' + esc(title) + '</h2></div><button class="drawer-close" data-act="close-overlay" aria-label="关闭">×</button></header>',
      body,
      actions,
      '</aside>'
    ].join('');
  }

  function refreshCounts() {
    D.counts.intake = D.drafts.length;
    D.counts.pending = D.drafts.filter((d) => d.state === "review").length;
    D.counts.reviewed = D.drafts.filter((d) => d.state === "ready").length;
    D.counts.published = D.drafts.filter((d) => d.state === "published").length;
    D.counts.blocked = D.drafts.filter((d) => d.state === "blocked").length;
    D.counts.media = VX.films.length;
    D.counts.people = D.people.length;
    D.counts.series = D.series.length;
    D.counts.collections = D.collections.length;
    D.counts.categories = D.categories.length;
    D.counts.tags = D.tags.length;
    D.counts.organizations = D.organizations.length;
  }

  function formValues() {
    const values = {};
    $$("[data-of]").forEach((field) => {
      values[field.dataset.of] = field.type === "checkbox" ? field.checked : field.value;
    });
    return values;
  }

  function saveOverlay() {
    if (!state.overlay) return;
    const type = state.overlay.type;
    const id = state.overlay.id;
    const v = formValues();
    if (["person", "franchise", "category", "tag", "organization", "collection"].includes(type) && !String(v.name || "").trim()) {
      return toast("请填写名称");
    }
    if (type === "group" && !String(v.name || "").trim()) {
      return toast("请填写容器名称");
    }
    const picked = D.drafts.filter((d) => state.selected.has(d.id));
    if (type === "portrait") {
      const person = D.people.find((p) => p.id === id);
      const chosen = $('[data-of="image"]:checked');
      if (person && chosen) person.portrait = chosen.value;
      state.overlay = null;
      render();
      return toast("头像已更换");
    }
    if (type === "cover") {
      const item = D.series.find((s) => s.id === id);
      const chosen = $('[data-of="image"]:checked');
      if (item && chosen) item.cover = chosen.value;
      state.overlay = null;
      render();
      return toast("封面已更换");
    }
    if (type === "director") {
      const film = VX.films.find((x) => x.id === id);
      if (film) film.director = v.director || film.director;
      state.overlay = null;
      render();
      return toast("导演已更新");
    }
    if (type === "series") {
      const film = VX.films.find((x) => x.id === id);
      const series = D.series.find((s) => s.id === v.series);
      if (film) {
        film.series = series ? series.id : null;
        film.seriesName = series ? series.name : null;
      }
      state.overlay = null;
      render();
      return toast("系列已更新");
    }
    if (type === "tags") {
      const film = VX.films.find((x) => x.id === id);
      if (film) film.tags = $$("[data-tag-pick]:checked").map((box) => box.dataset.tagPick);
      state.overlay = null;
      render();
      return toast("标签已更新");
    }
    if (type === "studios") {
      const film = VX.films.find((x) => x.id === id);
      if (film) film.studios = $$("[data-studio-pick]:checked").map((box) => box.dataset.studioPick);
      state.overlay = null;
      render();
      return toast("片商已更新");
    }
    if (type === "source" || type === "archive") {
      state.overlay = null;
      render();
      return;
    }
    if (type === "artwork") {
      const film = VX.films.find((x) => x.id === id);
      const chosen = $('[data-of="image"]:checked');
      if (film && chosen) {
        if (state.overlay.extra === "poster") film.poster = chosen.value;
        else film.backdrop = chosen.value;
      }
      state.overlay = null;
      render();
      return toast("图片已更换");
    }
    if (type === "actor") {
      const film = VX.films.find((x) => x.id === id);
      if (film) {
        const ids = $$("[data-actor-pick]:checked").map((box) => box.dataset.actorPick);
        film.actors = Array.from(new Set(film.actors.concat(ids)));
      }
      state.overlay = null;
      render();
      return toast("已添加演员");
    }
    if (type === "inbox") {
      const files = $$("[data-inbox]:checked");
      const titles = { "438631": "沙丘", "272": "蝙蝠侠：侠影之谜", "76341": "疯狂的麦克斯4：狂暴之路", "746": "末代皇帝", "496243": "寄生虫", "19995": "阿凡达" };
      files.forEach((box, index) => {
        const filmId = box.dataset.inbox;
        const film = VX.films.find((f) => f.id === filmId);
        D.drafts.unshift({
          id: "d-new-" + Date.now() + "-" + index,
          filmId: filmId,
          title: film ? film.title : titles[filmId],
          file: filmId + ".mkv",
          category: film ? film.category : "未分类",
          date: film ? String(film.year) + "-01-01" : "日期未知",
          state: "review",
          source: "本地文件 · 待抓取",
          target: "待设置整理目标",
          size: film ? "—" : "—",
          complete: 2,
          missing: "日期、演员",
          group: null,
          film: film || null,
          poster: film ? film.poster : "assets/scenes/sea.jpg",
          backdrop: film ? film.backdrop : "assets/scenes/coast.jpg",
          identifier: film ? film.identifier : "—",
          actors: film ? film.actors.map((id) => personName(id)) : [],
          director: film ? film.director : "—",
          summary: film ? film.summary : "",
          format: "MKV · 2160p",
          duration: film ? film.minutes + " 分钟" : "未知",
          stateLabel: "待核对",
          reviewed: false,
          published: false,
          blocked: false,
          groupTitle: null,
          sourceState: "待抓取",
          missingFields: ["发行日期", "演员"],
          coverage: { saved: 2, proposed: 0, missing: 4 }
        });
      });
      state.view = "intake";
      state.selected.clear();
      refreshCounts();
      state.overlay = null;
      render();
      return toast(files.length ? "已创建 " + files.length + " 条草稿，等待核对" : "未选择文件");
    }
    if (type === "person") {
      const person = D.people.find((p) => p.id === id);
      const next = person || {
        id: "p-new-" + Date.now(), name: "", en: "", category: "未分类", categoryName: "未分类",
        portrait: "assets/people/person-3.jpg", detailedName: "", gender: "unknown",
        workCount: 0, works: [], missingPortrait: false, missingDetailed: false, favorite: false
      };
      next.name = v.name || next.name;
      next.detailedName = v.detailedName || "";
      next.gender = v.gender || "unknown";
      next.category = v.category || "未分类";
      next.categoryName = next.category;
      if (!person) D.people.unshift(next);
    } else if (type === "franchise") {
      const item = D.series.find((s) => s.id === id);
      const next = item || {
        id: "s-new-" + Date.now(), name: "", en: "", category: "未分类",
        cover: "assets/cinema/843-backdrop.jpg", description: "", workCount: 0, works: []
      };
      next.name = v.name || next.name;
      next.category = v.category || "未分类";
      next.description = v.description || "";
      if (!item) D.series.unshift(next);
    } else if (type === "category") {
      const item = D.categories.find((c) => c.id === id);
      if (item) item.name = v.name || item.name;
      else D.categories.push({
        id: "c-new-" + Date.now(), name: v.name || "新分类", en: "", parent: "—",
        visible: true, order: D.categories.length + 1, workCount: 0, count: 0
      });
    } else if (type === "tag") {
      const item = D.tags.find((t) => t.id === id);
      const next = item || {
        id: "tag-new-" + Date.now(), name: "", detail: "其他", categoryName: "未分类",
        categoryId: "", workCount: 0, visible: true
      };
      next.name = v.name || next.name;
      next.detail = v.detail || "其他";
      next.categoryName = v.category || "未分类";
      next.categoryId = (D.categories.find((c) => c.name === next.categoryName) || {}).id || "";
      next.visible = v.visible !== false;
      if (!item) D.tags.unshift(next);
    } else if (type === "organization") {
      const item = D.organizations.find((o) => o.id === id);
      const next = item || { id: "org-new-" + Date.now(), name: "", detail: "", workCount: 0, visible: true };
      next.name = v.name || next.name;
      next.detail = v.detail || "";
      if (!item) D.organizations.unshift(next);
    } else if (type === "collection") {
      const item = D.collections.find((c) => c.id === id);
      const next = item || {
        id: "col-new-" + Date.now(), name: "", desc: "", en: "", cover: "assets/cinema/843-backdrop.jpg",
        filmIds: [], count: 0
      };
      next.name = v.name || next.name;
      next.desc = v.desc || "";
      if (!item) D.collections.unshift(next);
    } else if (type === "group") {
      const groupId = "g-new-" + Date.now();
      picked.forEach((d, index) => {
        d.group = groupId;
        d.groupTitle = v.name || "未命名分集容器";
        d.groupPosition = index + 1;
      });
      state.selected.clear();
    } else if (type === "target") {
      picked.forEach((d) => { d.target = v.target; });
      state.selected.clear();
    } else if (type === "batch-category") {
      picked.forEach((d) => { d.category = v.category; d.reviewed = false; d.state = "review"; d.sourceState = "待重新核对"; });
      state.selected.clear();
    } else if (type === "batch-lookup") {
      picked.forEach((d) => { d.sourceState = "已返回候选"; d.source = (v.provider || "来源") + " · 已匹配"; });
      state.selected.clear();
    } else if (type === "batch-review") {
      picked.forEach((d) => { d.reviewed = true; d.state = "ready"; });
      state.selected.clear();
    } else if (type === "batch-publish") {
      if (picked.some((d) => !d.reviewed || d.blocked)) {
        refreshCounts();
        state.overlay = null;
        render();
        return toast("所选草稿尚未全部核对或仍有阻断");
      }
      picked.forEach((d) => {
        d.published = true; d.state = "published"; d.sourceState = "已发布";
      });
      state.selected.clear();
    }
    refreshCounts();
    state.overlay = null;
    render();
    toast("已保存本次修改");
  }

  function render() {
    renderRail();
    $("[data-crumb]").textContent = labels[state.view] || "管理";
    let html = "";
    if (state.view === "intake") html = renderIntake();
    else if (state.view === "media") html = renderMedia();
    else if (state.view === "people") html = renderPeople();
    else if (state.view === "person") html = renderPerson(state.recordId);
    else if (state.view === "franchises") html = renderFranchises();
    else if (state.view === "franchise") html = renderFranchise(state.recordId);
    else if (state.view === "categories") html = renderCategories();
    else if (state.view === "tags") html = renderDictionary("tags");
    else if (state.view === "organizations") html = renderDictionary("organizations");
    else if (state.view === "collections") html = renderCollections();
    else if (state.view === "jobs") html = renderJobs();
    else if (state.view === "settings") html = renderSettings();
    else if (state.view === "enrich") html = renderEnrich();
    else if (state.view === "archive") html = renderArchive();
    else if (state.view === "editor") html = renderEditor();
    else if (state.view === "draft-editor") html = renderDraftEditor(state.recordId);
    $("[data-admin-view]").innerHTML = html;
    renderOverlay();
  }

  function toast(message) {
    const el = $("[data-admin-toast]");
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  function openOverlay(type, id, extra) {
    state.overlay = { type: type, id: id, extra: extra };
    render();
  }

  function closeOverlay() {
    state.overlay = null;
    render();
  }

  function focusFilter(key) {
    const el = document.querySelector('[data-filter="' + key + '"]');
    if (el) {
      el.focus();
      if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
    }
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      state.view = nav.dataset.nav;
      state.recordId = null;
      state.selected.clear();
      state.overlay = null;
      render();
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    if (e.target.closest("input, select, textarea, label")) return;
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const action = act.dataset.act;
    const id = act.dataset.id;
    if (action === "inbox") return openOverlay("inbox", "");
    if (action === "set-target") { state.selected = new Set([id]); return openOverlay("target", ""); }
    if (action === "review" || action === "preview") return openOverlay("draft", id);
    if (action === "edit-draft") {
      const d = D.drafts.find((x) => x.id === id);
      if (d && d.filmId) {
        state.overlay = null;
        state.view = "editor";
        state.editorId = d.filmId;
        state.editorTab = "基本资料";
        render();
      } else {
        state.overlay = null;
        state.view = "draft-editor";
        state.recordId = id;
        render();
      }
      return;
    }
    if (action === "draft-save") {
      const draft = D.drafts.find((d) => d.id === id);
      if (draft) {
        const v = formValues();
        draft.title = v.title || draft.title;
        draft.date = v.date || draft.date;
        draft.category = v.category || draft.category;
        draft.target = v.target || draft.target;
        draft.reviewed = false;
        draft.state = "review";
        draft.sourceState = "待重新核对";
        refreshCounts();
        render();
        toast("草稿已保存，需要重新核对");
      }
      return;
    }
    if (action === "draft-confirm") {
      const draft = D.drafts.find((d) => d.id === id);
      if (draft) {
        if (draft.published) {
          if (draft.filmId) {
            state.overlay = null;
            state.view = "editor";
            state.editorId = draft.filmId;
            state.editorTab = "基本资料";
            render();
            return;
          }
          state.overlay = null;
          render();
          return toast("该草稿没有正式影片，无法打开作品");
        }
        if (draft.reviewed) {
          draft.published = true;
          draft.state = "published";
          draft.sourceState = "已发布";
          toast("已发布到片库");
        } else {
          draft.reviewed = true;
          draft.state = "ready";
          toast("已确认核对，可以手动发布");
        }
        refreshCounts();
      }
      state.overlay = null;
      render();
      return;
    }
    if (action === "select-all") {
      const rows = stageRows();
      const all = rows.every((d) => state.selected.has(d.id));
      if (all) rows.forEach((d) => state.selected.delete(d.id));
      else rows.forEach((d) => state.selected.add(d.id));
      render();
      return;
    }
    if (action === "clear-selection") { state.selected.clear(); render(); return; }
    if (action === "batch") {
      if (!state.selected.size) return toast("先选择草稿");
      if (id === "group" && state.selected.size >= 2) return openOverlay("group", "");
      if (id === "target") return openOverlay("target", "");
      if (id === "category") return openOverlay("batch-category", "");
      if (id === "lookup") return openOverlay("batch-lookup", "");
      if (id === "review") return openOverlay("batch-review", "");
      if (id === "publish") return openOverlay("batch-publish", "");
      return toast("批量操作在正式实现中打开");
    }
    if (action === "media-mode") { state.mediaMode = id; render(); return; }
    if (action === "media-dir") { state.mediaDir = state.mediaDir === "asc" ? "desc" : "asc"; render(); return; }
    if (action === "media-edit") {
      state.view = "editor";
      state.editorId = id;
      state.editorTab = "基本资料";
      render();
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    if (action === "person") { state.view = "person"; state.recordId = id; render(); window.scrollTo({ top: 0, behavior: "instant" }); return; }
    if (action === "franchise") { state.view = "franchise"; state.recordId = id; render(); window.scrollTo({ top: 0, behavior: "instant" }); return; }
    if (action === "back-people") { state.view = "people"; render(); return; }
    if (action === "back-franchises") { state.view = "franchises"; render(); return; }
    if (action === "back-media") { state.view = "media"; render(); return; }
    if (action === "record-edit") {
      const kind = act.dataset.kind;
      return openOverlay(kind, id);
    }
    if (action === "dict-new") {
      const map = { people: "person", franchises: "franchise", categories: "category", tags: "tag", organizations: "organization" };
      return openOverlay(map[id] || "person", "new");
    }
    if (action === "dict-edit") {
      const map = { people: "person", franchises: "franchise", categories: "category", tags: "tag", organizations: "organization" };
      return openOverlay(map[act.dataset.kind] || "tag", id);
    }
    if (action === "collection-new") return openOverlay("collection", "new");
    if (action === "collection-edit") return openOverlay("collection", id);
    if (action === "category-toggle") {
      const category = D.categories.find((c) => c.id === id);
      if (category) {
        category.visible = !category.visible;
        render();
        toast(category.visible ? "分类已显示" : "分类已隐藏");
      }
      return;
    }
    if (action === "jobs-refresh" || action === "settings-refresh") return toast("已重新检查（演示）");
    if (action === "pick-artwork") { return openOverlay("artwork", state.editorId, act.dataset.slot); }
    if (action === "pick-portrait") { return openOverlay("portrait", id); }
    if (action === "pick-cover") { return openOverlay("cover", id); }
    if (action === "add-director") { return openOverlay("director", state.editorId); }
    if (action === "remove-director") {
      const film = VX.films.find((x) => x.id === state.editorId);
      if (film) film.director = "—";
      render();
      return toast("已移除导演");
    }
    if (action === "add-series") { return openOverlay("series", state.editorId); }
    if (action === "remove-series") {
      const film = VX.films.find((x) => x.id === state.editorId);
      if (film) { film.series = null; film.seriesName = null; }
      render();
      return toast("已移除系列");
    }
    if (action === "add-tags") { return openOverlay("tags", state.editorId); }
    if (action === "remove-tag") {
      const film = VX.films.find((x) => x.id === state.editorId);
      if (film) film.tags = (film.tags || []).filter((t) => t !== id);
      render();
      return toast("已移除标签");
    }
    if (action === "add-studios") { return openOverlay("studios", state.editorId); }
    if (action === "remove-studio") {
      const film = VX.films.find((x) => x.id === state.editorId);
      if (film) film.studios = (film.studios || []).filter((s) => s !== id);
      render();
      return toast("已移除片商");
    }
    if (action === "source-compare") { return openOverlay("source", state.editorId); }
    if (action === "archive-view") { return openOverlay("archive", id); }
    if (action === "add-actor") { return openOverlay("actor", state.editorId); }
    if (action === "remove-actor") {
      const film = VX.films.find((x) => x.id === state.editorId);
      if (film) film.actors = film.actors.filter((x) => x !== id);
      render();
      return toast("已移除演员");
    }
    if (action === "editor-tab") { state.editorTab = id; render(); return; }
    if (action === "logout") { return openOverlay("logout", ""); }
    if (action === "logout-confirm") { state.overlay = null; render(); return toast("演示环境：已退出登录"); }
    if (action === "back-intake") { state.view = "intake"; state.recordId = null; render(); return; }
    if (action === "draft-editor-save") {
      const draft = D.drafts.find((d) => d.id === id);
      if (draft) {
        const v = formValues();
        draft.title = v.title || draft.title;
        draft.date = v.date || draft.date;
        draft.category = v.category || draft.category;
        draft.summary = v.summary || draft.summary;
        draft.reviewed = false;
        draft.state = "review";
        draft.sourceState = "待重新核对";
        refreshCounts();
        state.view = "intake";
        render();
        return toast("草稿已保存，返回队列重新核对");
      }
    }
    if (action === "editor-save") {
      const film = VX.films.find((x) => x.id === state.editorId);
      if (film) {
        const v = formValues();
        if (v.title) film.title = v.title;
        if (v.identifier) film.identifier = v.identifier;
        if (v.category) film.category = v.category;
        if (v.summary) film.summary = v.summary;
        if (v.releaseDate) film.year = Number(v.releaseDate.slice(0, 4)) || film.year;
      }
      render();
      return toast("资料已保存");
    }
    if (action === "overlay-save") { saveOverlay(); return; }
    if (action === "close-overlay") return closeOverlay();
    if (action === "toast") return toast(id);
    if (action === "select-all") return;
  });

  document.addEventListener("change", (e) => {
    const all = e.target.closest('[data-act="select-all"]');
    if (all) {
      const rows = stageRows();
      if (all.checked) rows.forEach((d) => state.selected.add(d.id));
      else state.selected.clear();
      render();
      return;
    }
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      if (pick.checked) state.selected.add(pick.dataset.pick); else state.selected.delete(pick.dataset.pick);
      render();
      return;
    }
    const select = e.target.closest("[data-select]");
    if (select) {
      state[select.dataset.select] = select.value;
      render();
    }
  });

  document.addEventListener("input", (e) => {
    const filter = e.target.closest("[data-filter]");
    if (!filter) return;
    state[filter.dataset.filter] = filter.value;
    render();
    focusFilter(filter.dataset.filter);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.overlay) closeOverlay();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const input = $("[data-global-search]");
      if (input) { input.focus(); input.select(); }
    }
  });

  const globalSearch = $("[data-global-search]");
  if (globalSearch) {
    globalSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") toast("检索「" + globalSearch.value + "」在正式实现中打开");
    });
  }

  const params = new URLSearchParams(location.search);
  if (params.has("capture")) document.documentElement.classList.add("capture");
  if (params.get("view")) state.view = params.get("view");
  if (params.get("record")) state.recordId = params.get("record");
  if (params.get("id")) state.editorId = params.get("id");
  if (params.get("tab")) state.editorTab = params.get("tab");
  if (params.get("mode")) state.mediaMode = params.get("mode");
  if (params.get("drawer")) state.overlay = { type: "draft", id: params.get("drawer") };
  render();
})();
