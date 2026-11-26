(function () {
  const themes = [
    {
      id: "archive",
      name: "Archive",
      note: "暖纸 / 牛血红",
      colors: ["#f3f1ec", "#1d1c19", "#8d3b31", "#5d6b58"],
      paper: "#F3F1EC",
      accent: "#8D3B31",
      copy: "现有默认。暖纸与牛血红偏档案馆；结构直角，控件克制圆角。"
    },
    {
      id: "graphite",
      name: "Graphite Archive",
      note: "中性纸 / 深青",
      colors: ["#f1f0eb", "#1f201d", "#3f5b53", "#8d3b31"],
      paper: "#F1F0EB",
      accent: "#3F5B53",
      copy: "更冷静的资料工具。主操作转深青，牛血红只留给阻断和危险。",
      recommended: true
    },
    {
      id: "cool",
      name: "Cool Paper",
      note: "冷灰 / 灰蓝",
      colors: ["#f3f4f1", "#1e2422", "#3e5f76", "#9a6a3a"],
      paper: "#F3F4F1",
      accent: "#3E5F76",
      copy: "技术、秩序、最接近专业后台；风险是容易变成普通 SaaS。"
    },
    {
      id: "museum",
      name: "Museum Paper",
      note: "奶油 / 墨绿",
      colors: ["#f1eee5", "#23251f", "#4e6250", "#9a6a3a"],
      paper: "#F1EEE5",
      accent: "#4E6250",
      copy: "收藏目录与纸本档案；更安静，强调色不抢表格。"
    },
    {
      id: "dark",
      name: "Dark Ops",
      note: "碳黑 / 黄铜",
      colors: ["#151514", "#eae5d9", "#c7a25c", "#b04a3e"],
      paper: "#151514",
      accent: "#C7A25C",
      copy: "暗房与媒体运维，和观看端统一；长时间录入不如纸色耐用。"
    }
  ];

  const radii = {
    sharp: { label: "直角", values: "0 / 0 / 0" },
    restrained: { label: "克制", values: "3 / 6 / 9" },
    soft: { label: "偏软", values: "4 / 8 / 12" }
  };

  const themeRoot = document.getElementById("theme-options");
  const specimen = document.getElementById("specimen");
  const noteTitle = document.getElementById("theme-note-title");
  const noteCopy = document.getElementById("theme-note-copy");
  const paperValue = document.getElementById("paper-value");
  const accentValue = document.getElementById("accent-value");
  const radiusValue = document.getElementById("radius-value");
  const caption = document.getElementById("lab-caption");
  let theme = "archive";
  let radius = "restrained";

  themeRoot.innerHTML = themes.map((item) => `
    <button class="theme-option" data-theme-choice="${item.id}" aria-pressed="false">
      <span class="theme-dots">${item.colors.map((color) => '<i style="--c:' + color + '"></i>').join("")}</span>
      <span class="theme-copy"><b>${item.name}</b><small>${item.note}</small></span>
      ${item.recommended ? '<em>推荐</em>' : ""}
    </button>
  `).join("");

  function apply() {
    specimen.dataset.theme = theme;
    specimen.dataset.radius = radius;
    const selected = themes.find((item) => item.id === theme);
    const size = radii[radius];
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
    });
    document.querySelectorAll("[data-radius-choice]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.radiusChoice === radius));
    });
    noteTitle.textContent = selected.name;
    noteCopy.textContent = selected.copy;
    paperValue.textContent = selected.paper;
    accentValue.textContent = selected.accent;
    radiusValue.textContent = size.values;
    caption.textContent = selected.name + " · " + size.label + "圆角";
  }

  document.addEventListener("click", (event) => {
    const themeButton = event.target.closest("[data-theme-choice]");
    if (themeButton) {
      theme = themeButton.dataset.themeChoice;
      apply();
    }
    const radiusButton = event.target.closest("[data-radius-choice]");
    if (radiusButton) {
      radius = radiusButton.dataset.radiusChoice;
      apply();
    }
  });

  apply();
})();
