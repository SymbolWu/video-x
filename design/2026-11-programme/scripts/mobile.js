/* Mobile prototype interactions. */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.has('capture')) document.documentElement.classList.add('capture');
  const VX = window.VX;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const films = VX.films;
  const filmById = new Map(films.map((f) => [f.id, f]));
  const peopleById = new Map(VX.people.map((p) => [p.id, p]));
  const seriesById = new Map(VX.series.map((s) => [s.id, s]));
  const fmt = (n) => String(n).padStart(2, '0');
  const years = [...new Set(films.map((f) => f.year))].sort((a, b) => b - a);
  const state = {
    screen: 'discover',
    entity: 'films',
    category: 'all',
    seen: 'all',
    fav: 'all',
    year: 'all',
    rating: 'all',
    sort: '添加时间',
    query: '',
    favorites: new Set(films.filter((f) => f.favorite).map((f) => f.id)),
    watched: new Set(films.filter((f) => f.watched).map((f) => f.id)),
    ratings: new Map(films.filter((f) => f.rating).map((f) => [f.id, f.rating])),
    detailId: '693134',
    playerId: '693134',
    draft: null
  };

  function toast(message) {
    let el = $('[data-m-toast]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'm-toast';
      el.dataset.mToast = '';
      $('.m-app').appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  function poster(f) {
    const fav = state.favorites.has(f.id);
    const seen = state.watched.has(f.id);
    const rating = state.ratings.get(f.id);
    return `<a class="m-poster" href="#" data-m-film="${f.id}">
      <span class="m-poster-art">
        <img src="${f.poster}" alt="${esc(f.title)}" />
        <span class="m-poster-badge">${esc(f.format)}</span>
        ${fav ? '<span class="m-poster-fav">♥</span>' : ''}
        ${seen ? '<span class="m-poster-seen">已看</span>' : ''}
      </span>
      <span class="m-poster-title">${esc(f.title)}</span>
      <span class="m-poster-meta">${f.year} · ${esc(f.category)}${rating ? '<span class="m-star">' + '★'.repeat(rating) + '</span>' : ''}</span>
    </a>`;
  }

  function renderHome() {
    const resumeIds = ['693134', '157336', '843'];
    $('[data-m-resume]').innerHTML = resumeIds.map((id) => {
      const f = filmById.get(id);
      const r = f.resume || { ms: 0, duration: f.minutes * 60000, edition: f.format };
      const pct = Math.min(100, (r.ms / r.duration) * 100);
      return `<button class="m-resume-card" data-m-play="${f.id}">
        <img src="${f.backdrop}" alt="" />
        <span class="m-resume-copy"><b>${esc(f.title)}</b><small>看到 ${Math.floor(r.ms / 60000)} 分 ${fmt(Math.floor((r.ms % 60000) / 1000))} 秒 · ${esc(r.edition || f.format)}</small></span>
        <span class="m-resume-progress"><i style="width:${pct}%"></i></span>
      </button>`;
    }).join('');
    $('[data-m-home-grid]').innerHTML = ['693134', '129', '157336', '120467'].map((id) => poster(filmById.get(id))).join('');
  }

  function filterList() {
    let list = films.slice();
    if (state.category !== 'all') {
      const cat = VX.categories.find((c) => c.id === state.category);
      list = list.filter((f) => f.category === cat?.name);
    }
    if (state.seen === 'seen') list = list.filter((f) => state.watched.has(f.id));
    if (state.seen === 'unseen') list = list.filter((f) => !state.watched.has(f.id));
    if (state.fav === 'fav') list = list.filter((f) => state.favorites.has(f.id));
    if (state.fav === 'notfav') list = list.filter((f) => !state.favorites.has(f.id));
    if (state.rating === 'unrated') list = list.filter((f) => !state.ratings.get(f.id));
    if (state.rating === '4') list = list.filter((f) => (state.ratings.get(f.id) || 0) >= 4);
    if (state.year !== 'all') list = list.filter((f) => f.year === Number(state.year));
    if (state.query.trim()) {
      const q = state.query.trim().toLowerCase();
      list = list.filter((f) => {
        const cast = f.actors.map((id) => peopleById.get(id)?.name || '').join(' ');
        return [f.title, f.en, f.category, f.year, f.director, cast, f.seriesName || ''].join(' ').toLowerCase().includes(q);
      });
    }
    list.sort((a, b) => {
      if (state.sort === '名称') return a.title.localeCompare(b.title, 'zh');
      if (state.sort === '发行年份') return b.year - a.year;
      if (state.sort === '我的评分') return ((state.ratings.get(b.id) || 0) - (state.ratings.get(a.id) || 0)) || (b.year - a.year);
      return b.addedIndex - a.addedIndex;
    });
    return list;
  }

  function filterCount() {
    return [state.category !== 'all', state.seen !== 'all', state.fav !== 'all', state.rating !== 'all', state.year !== 'all'].filter(Boolean).length;
  }

  function renderLibrary() {
    $('[data-m-categories]').innerHTML = VX.categories.map((c) => `<button data-m-cat="${c.id}" aria-pressed="${state.category === c.id}">${esc(c.name)}</button>`).join('');
    const list = filterList();
    $('[data-m-count]').textContent = state.entity === 'films' ? list.length : state.entity === 'people' ? VX.people.length : VX.series.length;
    const fcount = filterCount();
    const badge = $('[data-m-filter-count]');
    badge.hidden = fcount === 0;
    badge.textContent = fcount;
    const grid = $('[data-m-library-grid]');
    if (state.entity === 'films') {
      grid.className = 'm-poster-grid m-poster-grid-library';
      grid.innerHTML = list.map(poster).join('');
    } else if (state.entity === 'people') {
      grid.className = 'm-people-grid';
      grid.innerHTML = VX.people.map((p) => `<a class="m-person" href="#" data-m-person="${p.id}"><span class="m-person-art"><img src="${p.portrait}" alt="${esc(p.name)}" /></span><b>${esc(p.name)}</b><small>${esc(p.category)} · ${films.filter((f) => f.actors.includes(p.id)).length} 部</small></a>`).join('');
    } else {
      grid.className = 'm-series-list';
      grid.innerHTML = VX.series.map((s) => `<button class="m-series-item" data-m-series="${s.id}"><img src="${s.cover}" alt="" /><span><b>${esc(s.name)}</b><small>${films.filter((f) => f.series === s.id).length} 部作品 · ${esc(s.category)}</small></span></button>`).join('');
    }
    $('[data-m-empty]').hidden = state.entity === 'films' ? list.length > 0 : true;
    $$('[data-m-entity]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mEntity === state.entity)));
  }

  function renderDetail(id) {
    const f = filmById.get(id) || filmById.get('693134');
    state.detailId = f.id;
    const actors = f.actors.map((x) => peopleById.get(x)).filter(Boolean);
    const series = f.series ? seriesById.get(f.series) : null;
    const rating = state.ratings.get(f.id);
    const fav = state.favorites.has(f.id);
    const watched = state.watched.has(f.id);
    const resume = f.resume;
    const stills = [f, ...films.filter((x) => x.id !== f.id && x.category === f.category).slice(0, 1)];
    const view = $('[data-m-view="detail"]');
    view.innerHTML = `
      <div class="m-detail-scroll">
        <div class="m-detail-hero">
          <img src="${f.backdrop}" alt="" />
          <div class="m-detail-top">
            <button class="m-round" data-m-back aria-label="返回片库">←</button>
            <button class="m-round ${fav ? 'is-fav' : ''}" data-m-fav aria-label="喜欢影片">${fav ? '♥' : '♡'}</button>
          </div>
          <div class="m-detail-heading">
            <p class="m-kicker">${f.year} · ${esc(f.categoryEn)} · ${f.minutes} min</p>
            <h1>${esc(f.title)}</h1>
            <p class="m-detail-en">${esc(f.en || '')}</p>
            <p class="m-detail-meta">${f.year} · ${esc(f.category)} · ${f.minutes} 分钟 · ${esc(f.director)}</p>
          </div>
        </div>
        <div class="m-detail-body">
          <div class="m-detail-actions">
            <button class="m-detail-play" data-m-play="${f.id}">▶ ${resume ? '继续播放 · ' + Math.floor(resume.ms / 60000) + ':' + fmt(Math.floor((resume.ms % 60000) / 1000)) : '播放影片'}</button>
            <button class="m-detail-edition" data-m-toast="版本选择面板在正式实现中打开">${esc(f.editions[0].name)} ▾</button>
          </div>
          ${resume ? `<p class="m-detail-resume"><span></span>上次看到 ${Math.floor(resume.ms / 60000)} 分 ${fmt(Math.floor((resume.ms % 60000) / 1000))} 秒 · ${esc(resume.edition || f.format)}</p>` : ''}
          <div class="m-detail-personal">
            <button data-m-collection>♡ 收藏夹</button>
            <button data-m-watched class="${watched ? 'is-on' : ''}">${watched ? '✓ 已看过' : '标记已看'}</button>
            <div class="m-detail-rating" aria-label="我的评分"><span>我的评分</span>${[1,2,3,4,5].map((n) => `<button data-m-rate="${n}" aria-label="${n} 星"><i class="${n <= (rating || 0) ? '' : 'off'}">★</i></button>`).join('')}</div>
          </div>
          <section class="m-detail-section"><h2>故事简介</h2><p>${esc(f.summary)}</p><p>私人馆藏版本。喜欢、评分、已看与播放进度分别维护，互不覆盖。</p></section>
          <section class="m-detail-section"><h2>剧照</h2><div class="m-cast-scroll">${stills.map((s, i) => `<button class="m-still" data-m-play="${f.id}" style="flex:none;width:210px"><img src="${s.backdrop}" alt="" style="width:210px;height:118px;object-fit:cover" /><small style="display:block;margin-top:5px;color:var(--ivory-4);font-family:var(--font-mono);font-size:6.5px">STILL ${fmt(i + 1)}</small></button>`).join('')}</div></section>
          <section class="m-detail-section"><h2>主要演员</h2><div class="m-cast-scroll">${actors.map((p) => `<button class="m-cast" data-m-person="${p.id}"><img src="${p.portrait}" alt="${esc(p.name)}" /><b>${esc(p.name)}</b><small>${esc(p.en || p.category)}</small></button>`).join('')}</div></section>
          ${series ? `<section class="m-detail-section"><h2>所属系列</h2><button class="m-series-link" data-m-series="${series.id}"><img src="${series.cover}" alt="" /><span><b>${esc(series.name)}</b><small>${films.filter((x) => x.series === series.id).length} 部作品</small></span><span>→</span></button></section>` : ''}
        </div>
      </div>
      <div class="m-detail-bar">
        <button class="m-detail-play" data-m-play="${f.id}">▶ ${resume ? '继续播放' : '播放影片'}</button>
        <button class="m-round ${fav ? 'is-fav' : ''}" data-m-fav aria-label="喜欢影片">${fav ? '♥' : '♡'}</button>
      </div>
    `;
  }

  function renderPlayer(id) {
    const f = filmById.get(id) || filmById.get('693134');
    state.playerId = f.id;
    const view = $('[data-m-view="player"]');
    view.innerHTML = `
      <div class="m-player">
        <div class="m-player-top">
          <button class="m-round" data-m-close-player aria-label="关闭播放器">×</button>
          <div class="m-player-title"><b>${esc(f.title)}</b><small>${esc(f.en || '')} · ${esc(f.editions[0].name)}</small></div>
        </div>
        <div class="m-player-stage">
          <div class="m-player-bg" style="background-image:url('${f.backdrop}')"></div>
          <img src="${f.backdrop}" alt="" />
          <span class="m-player-badge">4K UHD · HDR10</span>
          <button class="m-player-center" data-m-player-toggle aria-label="播放">▶</button>
        </div>
        <div class="m-player-controls">
          <div class="m-player-time"><span>00:12:48</span><div class="m-player-rail"><i></i></div><span>02:46:00</span></div>
          <div class="m-player-buttons">
            <button data-m-player-toggle>▶</button>
            <span>↺ 10</span>
            <span>↻ 10</span>
            <span class="end">◧</span>
            <span>4K</span>
            <span>⛶</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSimple(kind) {
    const simple = $('[data-m-simple]');
    simple.hidden = false;
    $('[data-m-simple-title]').textContent = kind === 'profile' ? '我的' : '收藏';
    if (kind === 'profile') {
      $('[data-m-simple-body]').innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;padding:26px 0;border-bottom:1px solid var(--dark-line)"><span style="display:grid;place-items:center;width:54px;height:54px;border-radius:50%;border:1px solid var(--dark-line-strong);font-family:var(--font-serif);font-size:18px">W</span><div><b style="font-family:var(--font-serif);font-size:22px;font-weight:500">W</b><small style="display:block;color:var(--ivory-4);font-size:9px">私人媒体库 · 本机</small></div></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:18px;background:var(--dark-line);border:1px solid var(--dark-line)"><div style="background:var(--ink);padding:16px 10px;text-align:center"><b style="display:block;font-family:var(--font-display);font-size:26px;font-weight:400">39</b><small style="color:var(--ivory-4);font-size:7px">影片</small></div><div style="background:var(--ink);padding:16px 10px;text-align:center"><b style="display:block;font-family:var(--font-display);font-size:26px;font-weight:400">12</b><small style="color:var(--ivory-4);font-size:7px">喜欢</small></div><div style="background:var(--ink);padding:16px 10px;text-align:center"><b style="display:block;font-family:var(--font-display);font-size:26px;font-weight:400">27</b><small style="color:var(--ivory-4);font-size:7px">已看</small></div></div>
        <button class="m-simple-card"><span style="width:100%;padding-left:2px"><b>我的收藏</b><small>3 个收藏夹</small></span><span>→</span></button>
        <button class="m-simple-card"><span style="width:100%;padding-left:2px"><b>看过的影片</b><small>27 部</small></span><span>→</span></button>
        <button class="m-simple-card" data-m-toast="退出登录在正式实现中处理"><span style="width:100%;padding-left:2px"><b>退出登录</b><small>单账号 · 本机</small></span><span>→</span></button>
      `;
    } else {
      $('[data-m-simple-body]').innerHTML = VX.collections.map((c) => `<h2>${esc(c.name)}</h2>${c.filmIds.map((id) => { const f = filmById.get(id); return `<button class="m-simple-card" data-m-film="${f.id}"><img src="${f.poster}" alt="" /><span><b>${esc(f.title)}</b><small>${f.year} · ${esc(f.category)}</small></span><span>→</span></button>`; }).join('')}`).join('');
    }
  }

  function showScreen(name) {
    state.screen = name;
    $('[data-m-simple]').hidden = true;
    $('[data-m-search]').hidden = true;
    $$('.m-view').forEach((v) => { v.hidden = v.dataset.mView !== name; });
    if (name === 'detail') renderDetail(state.detailId);
    if (name === 'player') renderPlayer(state.playerId);
    if (name === 'library') renderLibrary();
    if (name === 'discover') renderHome();
    $$('.screen-nav button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.screen === name || (name === 'filters' && b.dataset.screen === 'filters'))));
    if (name === 'filters') {
      $$('.m-view').forEach((v) => { v.hidden = v.dataset.mView !== 'library'; });
      renderLibrary();
      openFilter();
    } else {
      closeFilter();
    }
    const scroll = $('[data-m-view="' + name + '"] .m-scroll') || $('[data-m-view="' + name + '"] .m-detail-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  function openFilter() {
    state.draft = {
      category: state.category, seen: state.seen, fav: state.fav, year: state.year,
      rating: state.rating, sort: state.sort
    };
    const sheet = $('[data-m-filter-layer]');
    sheet.hidden = false;
    renderFilterChoices();
  }

  function closeFilter() {
    $('[data-m-filter-layer]').hidden = true;
  }

  function filterDraftCount() {
    const backup = { ...state };
    Object.assign(state, state.draft);
    state.query = '';
    const n = filterList().length;
    Object.assign(state, backup);
    return n;
  }

  function renderFilterChoices() {
    const d = state.draft;
    $('[data-m-filter-categories]').innerHTML = VX.categories.map((c) => `<button data-m-fcat="${c.id}" aria-pressed="${d.category === c.id}">${esc(c.name)}</button>`).join('');
    $('[data-m-filter-years]').innerHTML = '<button data-m-fyear="all" aria-pressed="' + (d.year === 'all') + '">全部</button>' + years.slice(0, 7).map((y) => `<button data-m-fyear="${y}" aria-pressed="${d.year === String(y)}">${y}</button>`).join('');
    $$('[data-m-filter-seen] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === d.seen)));
    $$('[data-m-filter-fav] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === d.fav)));
    $$('[data-m-filter-rating] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === d.rating)));
    $$('[data-m-filter-sort] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === d.sort)));
    $('[data-m-preview]').textContent = filterDraftCount();
  }

  function applyFilter() {
    Object.assign(state, state.draft);
    closeFilter();
    renderLibrary();
    showScreen('library');
    toast(filterCount() ? '已应用 ' + filterCount() + ' 项条件' : '已显示全部影片');
  }

  // Events
  document.addEventListener('click', (e) => {
    const screenBtn = e.target.closest('[data-screen]');
    if (screenBtn) {
      showScreen(screenBtn.dataset.screen);
      return;
    }
    const go = e.target.closest('[data-go-m]');
    if (go) {
      e.preventDefault();
      if (go.dataset.goM === 'discover' || go.dataset.goM === 'library') {
        showScreen(go.dataset.goM);
      } else {
        renderSimple(go.dataset.goM);
      }
      return;
    }
    if (e.target.closest('[data-close-m-simple]')) {
      $('[data-m-simple]').hidden = true;
      showScreen(state.screen === 'discover' ? 'discover' : 'library');
      return;
    }
    const film = e.target.closest('[data-m-film]');
    if (film) {
      e.preventDefault();
      state.detailId = film.dataset.mFilm;
      showScreen('detail');
      return;
    }
    const play = e.target.closest('[data-m-play]');
    if (play) {
      e.preventDefault();
      state.playerId = play.dataset.mPlay;
      showScreen('player');
      return;
    }
    if (e.target.closest('[data-m-back]')) { showScreen('library'); return; }
    if (e.target.closest('[data-m-close-player]')) { showScreen('detail'); return; }
    const fav = e.target.closest('[data-m-fav]');
    if (fav) {
      const id = state.detailId;
      if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
      renderDetail(id);
      toast(state.favorites.has(id) ? '已加入喜欢' : '已取消喜欢');
      return;
    }
    const watched = e.target.closest('[data-m-watched]');
    if (watched) {
      const id = state.detailId;
      if (state.watched.has(id)) state.watched.delete(id); else state.watched.add(id);
      renderDetail(id);
      toast(state.watched.has(id) ? '已标记为看过' : '已取消已看');
      return;
    }
    const rate = e.target.closest('[data-m-rate]');
    if (rate) {
      const id = state.detailId, n = Number(rate.dataset.mRate);
      if (state.ratings.get(id) === n) state.ratings.delete(id); else state.ratings.set(id, n);
      renderDetail(id);
      toast(state.ratings.get(id) ? '已评分 ' + n + ' 星' : '已取消评分');
      return;
    }
    if (e.target.closest('[data-m-collection]')) { toast('收藏夹选择在正式实现中打开'); return; }
    if (e.target.closest('[data-m-toast]')) { toast(e.target.closest('[data-m-toast]').dataset.mToast); return; }
    if (e.target.closest('[data-m-player-toggle]')) { toast('原型不包含真实视频；正式实现由原生播放器接管'); return; }
    const entity = e.target.closest('[data-m-entity]');
    if (entity) {
      state.entity = entity.dataset.mEntity;
      renderLibrary();
      return;
    }
    const cat = e.target.closest('[data-m-cat]');
    if (cat) {
      state.category = cat.dataset.mCat;
      renderLibrary();
      return;
    }
    if (e.target.closest('[data-m-sort]')) {
      const sorts = ['添加时间', '发行年份', '名称', '我的评分'];
      state.sort = sorts[(sorts.indexOf(state.sort) + 1) % sorts.length];
      e.target.closest('[data-m-sort]').innerHTML = state.sort + ' ↓';
      renderLibrary();
      return;
    }
    if (e.target.closest('[data-open-m-filter]')) { openFilter(); return; }
    if (e.target.closest('[data-close-m-filter]') || e.target.closest('.m-sheet-scrim')) { closeFilter(); showScreen('library'); return; }
    if (e.target.closest('[data-m-reset]')) {
      state.draft = { category: 'all', seen: 'all', fav: 'all', year: 'all', rating: 'all', sort: '添加时间' };
      renderFilterChoices();
      return;
    }
    if (e.target.closest('[data-m-apply]')) { applyFilter(); return; }
    if (e.target.closest('[data-m-clear]')) {
      Object.assign(state, { category: 'all', seen: 'all', fav: 'all', year: 'all', rating: 'all' });
      renderLibrary();
      return;
    }
    const fcat = e.target.closest('[data-m-fcat]');
    if (fcat) { state.draft.category = fcat.dataset.mFcat; renderFilterChoices(); return; }
    const fyear = e.target.closest('[data-m-fyear]');
    if (fyear) { state.draft.year = fyear.dataset.mFyear; renderFilterChoices(); return; }
    const choice = e.target.closest('[data-m-filter-seen] button, [data-m-filter-fav] button, [data-m-filter-rating] button, [data-m-filter-sort] button');
    if (choice) {
      const parent = choice.parentElement;
      if (parent.hasAttribute('data-m-filter-seen')) state.draft.seen = choice.dataset.val;
      if (parent.hasAttribute('data-m-filter-fav')) state.draft.fav = choice.dataset.val;
      if (parent.hasAttribute('data-m-filter-rating')) state.draft.rating = choice.dataset.val;
      if (parent.hasAttribute('data-m-filter-sort')) state.draft.sort = choice.dataset.val;
      renderFilterChoices();
      return;
    }
    if (e.target.closest('[data-open-m-search]')) {
      $('[data-m-search]').hidden = false;
      setTimeout(() => $('[data-m-search-input]').focus(), 40);
      return;
    }
    if (e.target.closest('[data-close-m-search]')) {
      $('[data-m-search]').hidden = true;
      $('[data-m-search-input]').value = '';
      return;
    }
    if (e.target.closest('[data-m-search-results] a')) {
      $('[data-m-search]').hidden = true;
      return;
    }
    const person = e.target.closest('[data-m-person]');
    if (person) {
      e.preventDefault();
      toast('演员作品范围在正式片库中打开');
      state.entity = 'films';
      showScreen('library');
      return;
    }
    const series = e.target.closest('[data-m-series]');
    if (series) {
      e.preventDefault();
      toast('系列作品范围在正式片库中打开');
      state.entity = 'films';
      showScreen('library');
      return;
    }
  });

  $('[data-m-search-input]').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const wrap = $('[data-m-search-results]');
    if (!q) { wrap.innerHTML = '<p>输入片名或演员姓名。</p>'; return; }
    const list = films.filter((f) => {
      const cast = f.actors.map((id) => peopleById.get(id)?.name || '').join(' ');
      return [f.title, f.en, f.category, f.year, f.director, cast, f.seriesName || ''].join(' ').toLowerCase().includes(q);
    }).slice(0, 6);
    wrap.innerHTML = list.length ? list.map((f) => `<a class="m-search-row" href="#" data-m-film="${f.id}"><img src="${f.poster}" alt="" /><span><b>${esc(f.title)}</b><small>${f.year} · ${esc(f.category)} · ${esc(f.director)}</small></span><span>↗</span></a>`).join('') : '<p>没有匹配的影片。</p>';
  });

  // Boot
  renderHome();
  renderLibrary();
  const initial = params.get('screen') || 'discover';
  if (initial === 'filters') {
    showScreen('library');
    openFilter();
  } else {
    showScreen(initial);
  }
})();
