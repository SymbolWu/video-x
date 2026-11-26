/* Demo data derived from the existing catalog and the current administration fields. */
(() => {
  const VX = window.VX;
  const films = VX.films;
  const filmById = new Map(films.map((f) => [f.id, f]));
  const personById = new Map(VX.people.map((p) => [p.id, p]));

  const people = VX.people.map((p) => {
    const works = films.filter((f) => f.actors.includes(p.id));
    return {
      ...p,
      detailedName: p.name,
      gender: "unknown",
      workCount: works.length,
      works,
      missingPortrait: VX.people.indexOf(p) % 17 === 0,
      missingDetailed: VX.people.indexOf(p) % 13 === 0
    };
  });

  const series = VX.series.map((s) => {
    const works = films.filter((f) => f.series === s.id).sort((a, b) => a.year - b.year);
    return {
      ...s,
      workCount: works.length,
      works,
      description:
        s.id === "1"
          ? "厄拉科斯、保罗与弗雷曼人的完整馆藏。"
          : s.id === "2"
            ? "迈尔斯与来自不同宇宙的蜘蛛侠。"
            : s.id === "4"
              ? "克里斯托弗·诺兰的哥谭三部曲。"
              : "按发行年份排列的系列作品。"
    };
  });

  const categories = VX.categories
    .filter((c) => c.id !== "all")
    .map((c, index) => ({
      ...c,
      parent: "—",
      visible: true,
      order: index + 1,
      workCount: films.filter((f) => f.category === c.name).length
    }));

  const tags = [
    ["史诗", "题材", 12, true],
    ["沙漠", "场景", 6, true],
    ["复仇", "题材", 9, true],
    ["黑白", "影像", 4, false],
    ["公路", "场景", 3, true],
    ["家庭", "题材", 8, true],
    ["音乐", "题材", 5, true],
    ["悬疑", "题材", 11, true],
    ["治愈", "气质", 7, true],
    ["赛博朋克", "题材", 4, true]
  ].map(([name, detail, workCount, visible], i) => ({
    id: "tag-" + i,
    name,
    detail,
    categoryId: categories[i % categories.length].id,
    categoryName: categories[i % categories.length].name,
    workCount,
    visible
  }));

  const organizations = [
    ["Legendary Pictures", "制作", 4],
    ["A24", "制作 / 发行", 3],
    ["Studio Ghibli", "制作", 4],
    ["Pixar", "制作", 5],
    ["Warner Bros.", "发行", 6],
    ["寰亚电影", "制作 / 发行", 3],
    ["邵氏兄弟", "发行", 2]
  ].map(([name, detail, workCount], i) => ({
    id: "org-" + i,
    name,
    detail,
    workCount,
    visible: true
  }));

  const stateMap = {
    review: "待核对",
    ready: "已确认",
    published: "已发布",
    blocked: "发布阻断"
  };

  const drafts = VX.drafts.map((d, index) => {
    const film = d.filmId ? filmById.get(d.filmId) : null;
    const actors = film ? film.actors.map((id) => personById.get(id)?.name).filter(Boolean) : [];
    const published = d.state === "published";
    const ready = d.state === "ready";
    const blocked = d.state === "blocked";
    return {
      ...d,
      index,
      film,
      poster: film ? film.poster : "assets/scenes/sea.jpg",
      backdrop: film ? film.backdrop : "assets/scenes/coast.jpg",
      identifier: film ? film.identifier : "—",
      actors,
      director: film ? film.director : "—",
      summary: film ? film.summary : "私人旅行影像，记录海岸沿线的风景。",
      format: d.file.endsWith(".mkv") ? "MKV · 2160p" : "MP4 · 1080p",
      duration: film ? film.minutes + " 分钟" : d.title.includes("上篇") ? "18 分钟" : "22 分钟",
      stateLabel: stateMap[d.state] || "待核对",
      reviewed: ready || published,
      published,
      blocked,
      groupTitle: d.group ? "海岸手记" : null,
      sourceState: blocked ? "抓取失败" : d.source.includes("手动") ? "手动资料" : "已返回候选",
      missingFields: d.missing ? d.missing.split(/[、,，]/).filter(Boolean) : [],
      target: d.target,
      filePath: "inbox/" + d.file,
      coverage: { saved: d.complete, proposed: blocked ? 0 : 2, missing: Math.max(0, 6 - d.complete) }
    };
  });

  const jobs = [
    { id: "job-1", name: "扫描下载目录", detail: "读取 inbox 中的 12 个文件", state: "running", progress: 63, started: "13:02", worker: "worker-01" },
    { id: "job-2", name: "抓取资料来源", detail: "JavDB · 疯狂的麦克斯4", state: "failed", progress: 100, started: "12:58", worker: "worker-01" },
    { id: "job-3", name: "文件整理", detail: "海岸手记 · 上篇 → 私人影像 / 纪录片", state: "queued", progress: 0, started: "13:05", worker: "worker-01" },
    { id: "job-4", name: "媒体探测", detail: "Dune.Part.Two.2024.2160p.mkv", state: "done", progress: 100, started: "12:51", worker: "worker-01" }
  ];

  const archives = [
    { id: "a1", name: "海岸手记 · 上篇", kind: "影片", date: "2026-11-20", reason: "重新整理" },
    { id: "a2", name: "旧版演员资料 · 林明", kind: "演员", date: "2026-11-18", reason: "合并重复人物" },
    { id: "a3", name: "周末片单（旧）", kind: "收藏夹", date: "2026-11-12", reason: "重建片单" }
  ];

  const enrich = people.filter((p) => p.missingPortrait || p.missingDetailed).slice(0, 12);

  window.VXA = {
    people,
    series,
    categories,
    tags,
    organizations,
    collections: VX.collections,
    drafts,
    jobs,
    archives,
    enrich,
    counts: {
      intake: drafts.length,
      pending: drafts.filter((d) => d.state === "review").length,
      reviewed: drafts.filter((d) => d.state === "ready").length,
      published: drafts.filter((d) => d.state === "published").length,
      blocked: drafts.filter((d) => d.state === "blocked").length,
      media: 39,
      people: people.length,
      series: series.length,
      collections: VX.collections.length,
      categories: categories.length,
      tags: tags.length,
      organizations: organizations.length
    }
  };
})();
