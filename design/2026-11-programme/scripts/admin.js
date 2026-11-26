/* Management-end prototype interactions. */
(() => {
  if (new URLSearchParams(location.search).has('capture')) document.documentElement.classList.add('capture');
  const VX = window.VX;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const labels = {
    intake: '录入工作台', catalog: '影片资料库', editor: '影片资料编辑', settings: '系统状态',
    people: '演员', series: '系列', collections: '收藏夹', categories: '分类', tags: '标签',
    organizations: '片商', jobs: '后台任务', enrich: '演员资料补全', archive: '归档'
  };
  const state = { view: 'intake', queueTab: 'all', queueQuery: '', selectedDraft: 'd1', catalogQuery: '', catalogView: 'table' };

  function statusMeta(stateName) {
    return {
      review: ['待核对', 'review'],
      ready: ['已确认', 'ready'],
      published: ['已发布', 'published'],
      blocked: ['阻断', 'blocked']
    }[stateName] || ['待核对', 'review'];
  }

  function visual(d) {
    if (d.filmId) {
      const f = VX.films.find((x) => x.id === d.filmId);
      return { poster: f.poster, backdrop: f.backdrop, en: f.en };
    }
    return { poster: 'assets/scenes/sea.jpg', backdrop: 'assets/scenes/coast.jpg', en: 'Private footage' };
  }

  function queueRows() {
    return VX.drafts.filter((d) => {
      if (state.queueTab !== 'all' && d.state !== state.queueTab) return false;
      if (state.queueQuery) {
        const q = state.queueQuery.toLowerCase();
        if (![d.title, d.file, d.category, d.date].join(' ').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function renderQueue() {
    const body = $('[data-queue-body]');
    const rows = queueRows();
    body.innerHTML = rows.map((d) => {
      const [label, tone] = statusMeta(d.state);
      const art = visual(d);
      const missing = d.missing ? `<span class="missing">${esc(d.missing)}</span>` : '';
      return `<tr data-draft="${d.id}" class="${d.id === state.selectedDraft ? 'is-selected' : ''}">
        <td class="check"><input class="queue-check" type="checkbox" aria-label="选择 ${esc(d.title)}" ${d.state === 'published' ? 'disabled' : ''} /></td>
        <td>
          <div class="queue-identity">
            <span class="queue-art"><img src="${art.poster}" alt="" /></span>
            <span>
              <span class="queue-title">${esc(d.title)}${d.group ? '<span class="queue-group-tag">分集</span>' : ''}</span>
              <span class="queue-file">${esc(d.file)}</span>
            </span>
          </div>
        </td>
        <td><span class="queue-cell">${esc(d.category)}<small>${esc(d.date)}</small></span></td>
        <td>
          <span class="completeness">
            <span class="completeness-bars">${[1,2,3,4,5,6].map((n) => `<i class="${n <= d.complete ? 'on' : n === d.complete + 1 && d.missing ? 'warn' : ''}"></i>`).join('')}</span>
            <small>${d.complete}/6</small>
          </span>
          ${missing}
        </td>
        <td><span class="status ${tone}">${label}</span></td>
        <td class="row-action"><button class="queue-action" data-open-draft="${d.id}">${d.state === 'published' ? '查看资料' : d.state === 'blocked' ? '查看原因' : '核对资料'} →</button></td>
      </tr>`;
    }).join('');
    if (!rows.length) body.innerHTML = '<tr><td colspan="6" style="padding:50px 18px;text-align:center;color:var(--paper-muted);font-size:10px">没有符合条件的草稿。切回全部或清空搜索。</td></tr>';
    renderReview();
  }

  function renderReview() {
    const panel = $('[data-review-panel]');
    const d = VX.drafts.find((x) => x.id === state.selectedDraft) || VX.drafts[0];
    if (!d) return;
    const art = visual(d);
    const [label, tone] = statusMeta(d.state);
    const checks = [
      ['标题', '已填写', true],
      ['完整发行日期', d.date || '未填写', Boolean(d.date)],
      ['封面', d.missing.includes('封面') ? '缺失' : '已选择', !d.missing.includes('封面')],
      ['演员', d.missing.includes('演员') ? '缺失' : '已关联', !d.missing.includes('演员')],
      ['播放文件', d.state === 'blocked' ? '探测失败' : '已绑定', d.state !== 'blocked']
    ];
    panel.innerHTML = `
      <div class="review-hero">
        <img src="${art.backdrop}" alt="" />
        <div class="review-hero-copy">
          <span>${label}</span>
          <h2>${esc(d.title)}</h2>
          <small>${esc(art.en || '')} · ${esc(d.size)}</small>
        </div>
      </div>
      <div class="review-body">
        <label class="field"><span>作品标题</span><input value="${esc(d.title)}" aria-label="作品标题" /></label>
        <label class="field"><span>完整发行日期</span><input value="${esc(d.date)}" aria-label="发行日期" /></label>
        <label class="field"><span>主分类</span><select aria-label="主分类"><option selected>${esc(d.category)}</option><option>科幻</option><option>动画</option><option>剧情</option></select></label>
        <div class="review-check">
          <div class="review-check-title"><span>资料核对</span><span>${d.complete} / 6</span></div>
          <ul>${checks.map(([name, value, ok]) => `<li class="${ok ? 'ok' : 'warn'}"><span>${name}</span><b>${value}</b></li>`).join('')}</ul>
        </div>
      </div>
      <div class="review-actions">
        <button class="btn-outline" data-toast="草稿已保存（演示）">保存草稿</button>
        <button class="btn-dark" data-toast="${d.state === 'published' ? '已发布作品，跳转到资料编辑' : '已确认核对（演示），仍需手动发布'}">${d.state === 'published' ? '查看资料' : d.state === 'blocked' ? '重新抓取' : '确认核对'}</button>
      </div>
    `;
  }

  function renderCatalog() {
    const q = state.catalogQuery.trim().toLowerCase();
    const list = VX.films.filter((f) => !q || [f.title, f.en, f.identifier, f.director, ...f.actors.map((id) => VX.people.find((p) => p.id === id)?.name || '')].join(' ').toLowerCase().includes(q)).slice(0, 12);
    const body = $('[data-catalog-body]');
    body.innerHTML = list.map((f, i) => {
      const file = i === 4 ? ['待检查', 'warn'] : i === 7 ? ['未绑定', 'off'] : ['记录正常', ''];
      const cast = f.actors.map((id) => VX.people.find((p) => p.id === id)?.name || '').filter(Boolean);
      return `<tr data-catalog="${f.id}">
        <td class="check"><input class="queue-check" type="checkbox" aria-label="选择 ${esc(f.title)}" /></td>
        <td>
          <div class="catalog-identity">
            <img src="${f.poster}" alt="" />
            <span><b>${esc(f.title)}</b><small>${esc(f.identifier)} · ${esc(f.en || '')}</small></span>
          </div>
        </td>
        <td>${esc(f.category)}</td>
        <td class="catalog-number">${f.year}</td>
        <td><span class="catalog-cast">${esc(cast.slice(0, 2).join('、') || '—')}${cast.length > 2 ? ' +' + (cast.length - 2) : ''}</span></td>
        <td class="catalog-number">${esc(f.editions[0].name)}</td>
        <td><span class="file-state ${file[1]}">${file[0]}</span></td>
        <td class="row-action"><button class="catalog-edit" data-edit-film="${f.id}">编辑资料</button></td>
      </tr>`;
    }).join('');
    if (!list.length) body.innerHTML = '<tr><td colspan="8" style="padding:50px;text-align:center;color:var(--paper-muted)">没有匹配的资料</td></tr>';
  }

  function showView(name) {
    state.view = name;
    const implement = ['intake', 'catalog', 'editor', 'settings'].includes(name);
    $$('.admin-view').forEach((v) => { v.hidden = implement ? v.dataset.adminView !== name : v.dataset.adminView !== 'entity'; });
    if (!implement) {
      $('[data-entity-title]').textContent = labels[name] || '资料';
    }
    $$('.rail-nav button').forEach((b) => {
      const active = b.dataset.adminView === name || (name === 'editor' && b.dataset.adminView === 'catalog');
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('[data-crumb]').textContent = labels[name] || '资料';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function toast(message) {
    const el = $('[data-admin-toast]');
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2800);
  }

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('button[data-admin-view], a[data-admin-view]');
    if (nav) {
      e.preventDefault();
      showView(nav.dataset.adminView);
      return;
    }
    const tab = e.target.closest('[data-queue-tab]');
    if (tab) {
      state.queueTab = tab.dataset.queueTab;
      $$('[data-queue-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b === tab)));
      renderQueue();
      return;
    }
    const row = e.target.closest('tr[data-draft]');
    if (row) {
      if (e.target.closest('input[type=checkbox]')) return;
      state.selectedDraft = row.dataset.draft;
      renderQueue();
      const panel = $('[data-review-panel]');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const open = e.target.closest('[data-open-draft]');
    if (open) {
      state.selectedDraft = open.dataset.openDraft;
      renderQueue();
      return;
    }
    const catRow = e.target.closest('tr[data-catalog]');
    if (catRow) {
      if (e.target.closest('input[type=checkbox]')) return;
      showView('editor');
      return;
    }
    const edit = e.target.closest('[data-edit-film]');
    if (edit) {
      showView('editor');
      return;
    }
    const viewSwitch = e.target.closest('[data-catalog-view]');
    if (viewSwitch) {
      state.catalogView = viewSwitch.dataset.catalogView;
      $$('[data-catalog-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === viewSwitch)));
      toast(state.catalogView === 'table' ? '当前为列表视图；海报与横图沿用同一数据' : '海报视图在正式实现中复用片库卡片');
      return;
    }
    const toastEl = e.target.closest('[data-toast]');
    if (toastEl) {
      toast(toastEl.dataset.toast);
      return;
    }
    const cmd = e.target.closest('[data-command]');
    if (cmd) toast('全局检索在正式实现中打开（⌘ K）');
  });

  $('[data-queue-search]')?.addEventListener('input', (e) => {
    state.queueQuery = e.target.value;
    renderQueue();
  });

  $('[data-catalog-search]')?.addEventListener('input', (e) => {
    state.catalogQuery = e.target.value;
    renderCatalog();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (state.view === 'intake') $('[data-queue-search]')?.focus();
      else if (state.view === 'catalog') $('[data-catalog-search]')?.focus();
    }
  });

  renderQueue();
  renderCatalog();
  showView(new URLSearchParams(location.search).get('view') || 'intake');
})();
