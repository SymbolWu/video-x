/* Mobile prototype interactions. */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.has('capture')) document.documentElement.classList.add('capture');
  const VX = window.VX;
  const icon = window.VXI;
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
    collectionId: null,
    scope: null,
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
    $('[data-m-home-grid]').innerHTML = ['693134', '129', '157336', '120467', '324857', '313369'].map((id) => poster(filmById.get(id))).join('');
  }

  function filterList() {
    let list = films.slice();
    if (state.scope?.kind === 'actor') list = list.filter((f) => f.actors.includes(state.scope.id));
    if (state.scope?.kind === 'series') list = list.filter((f) => f.series === state.scope.id);
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
    const scopeBar = $('[data-m-scope]');
    if (scopeBar) {
      scopeBar.hidden = !state.scope;
      if (state.scope) scopeBar.querySelector('span').textContent = (state.scope.kind === 'actor' ? '演员 · ' : '系列 · ') + state.scope.name;
    }
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
      grid.className = 'm-series-grid';
      grid.innerHTML = VX.series.map((s) => `<button class="m-series-card" data-m-series="${s.id}"><img src="${s.cover}" alt="" /><b>${esc(s.name)}</b><small>${films.filter((f) => f.series === s.id).length} 部作品 · ${esc(s.category)}</small></button>`).join('');
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
            <button class="m-detail-edition" data-m-open-edition>${esc(f.editions[0].name)} ▾</button>
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
    `;
  }

  function renderPlayer(id) {
    const f = filmById.get(id) || filmById.get('693134');
    if (state.mPlayerStop) state.mPlayerStop();
    state.playerId = f.id;
    const editionName = f.editions[0].name;
    const view = $('[data-m-view="player"]');
    view.innerHTML = `
      <div class="m-player">
        <div class="m-player-top">
          <button class="m-round" data-m-close-player aria-label="关闭播放器">×</button>
          <div class="m-player-title"><b>${esc(f.title)}</b><small>${esc(f.en || '')} · ${esc(editionName)} · 静帧预览</small></div>
        </div>
        <div class="m-player-stage">
          <div class="m-player-bg" style="background-image:url('${f.backdrop}')"></div>
          <img data-m-frame src="${f.backdrop}" alt="" />
          <span class="m-player-badge">${esc(editionName)} · HDR10</span>
          <button class="m-player-center" data-m-player-toggle aria-label="播放">${icon('play', 22)}</button>
        </div>
        <div class="m-player-controls">
          <div class="m-player-time"><span data-m-current>00:00</span><input class="m-player-seek" data-m-seek type="range" min="0" max="100" value="0" aria-label="播放进度" /><span data-m-duration>00:22</span></div>
          <div class="m-player-buttons">
            <button data-m-player-toggle aria-label="播放或暂停">${icon('play', 18)}</button>
            <button data-m-skip="-10" aria-label="后退 10 秒">${icon('arrow-left', 16)}<small>10</small></button>
            <button data-m-skip="10" aria-label="前进 10 秒">${icon('arrow-right', 16)}<small>10</small></button>
            <button data-m-volume-open aria-label="音量">${icon('volume', 16)}</button>
            <button data-m-version aria-label="切换版本">${esc(editionName)}</button>
            <button data-m-fullscreen aria-label="全屏">${icon('fullscreen', 16)}</button>
          </div>
          <div class="m-volume-pop" data-m-volume-pop hidden>
            <button data-m-mute aria-label="静音">${icon('volume', 15)}</button>
            <input data-m-volume type="range" min="0" max="1" step="0.01" value="1" aria-label="音量" />
          </div>
        </div>
      </div>
    `;
    const seek = $('[data-m-seek]', view);
    const current = $('[data-m-current]', view);
    const duration = $('[data-m-duration]', view);
    const center = $('.m-player-center', view);
    const volumeOpen = $('[data-m-volume-open]', view);
    const volumePop = $('[data-m-volume-pop]', view);
    const volume = $('[data-m-volume]', view);
    const muteButton = $('[data-m-mute]', view);
    const fmtTime = (s) => Number.isFinite(s) ? String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '00:00';
    let time = 0;
    let playing = false;
    let volumeLevel = 1;
    let muted = false;
    let raf = 0;
    let last = 0;
    const durationSeconds = 22;
    const updateVolume = () => {
      volume.value = muted ? '0' : String(volumeLevel);
      volume.style.setProperty('--v', (muted ? 0 : volumeLevel) * 100 + '%');
      volumeOpen.innerHTML = icon(muted ? 'mute' : 'volume', 16);
      muteButton.innerHTML = icon(muted ? 'mute' : 'volume', 15);
    };
    const paint = () => {
      current.textContent = fmtTime(time);
      duration.textContent = fmtTime(durationSeconds);
      seek.value = String((time / durationSeconds) * 100);
      seek.style.setProperty('--p', (time / durationSeconds) * 100 + '%');
      center.innerHTML = icon(playing ? 'pause' : 'play', 22);
      center.classList.toggle('is-hidden', playing);
      $$('[data-m-player-toggle]', view).forEach((b) => { if (b !== center) b.innerHTML = icon(playing ? 'pause' : 'play', 18); });
      updateVolume();
    };
    const tick = (ts) => {
      if (!playing) return;
      if (!last) last = ts;
      const delta = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      time = Math.min(durationSeconds, time + delta);
      if (time >= durationSeconds) playing = false;
      paint();
      if (playing) raf = requestAnimationFrame(tick);
    };
    const stop = () => { playing = false; cancelAnimationFrame(raf); view.classList.remove('is-playing'); };
    const togglePlay = () => {
      if (playing) {
        playing = false;
        cancelAnimationFrame(raf);
        view.classList.remove('is-playing');
        paint();
        return;
      }
      if (time >= durationSeconds) time = 0;
      playing = true;
      view.classList.add('is-playing');
      last = 0;
      raf = requestAnimationFrame(tick);
      paint();
    };
    $$('[data-m-player-toggle]', view).forEach((b) => b.addEventListener('click', togglePlay));
    $$('[data-m-skip]', view).forEach((b) => b.addEventListener('click', () => {
      time = Math.max(0, Math.min(durationSeconds, time + Number(b.dataset.mSkip)));
      paint();
    }));
    seek.addEventListener('input', () => {
      time = (Number(seek.value) / 100) * durationSeconds;
      paint();
    });
    $('[data-m-close-player]', view).addEventListener('click', () => showScreen('detail'));
    volumeOpen.addEventListener('click', () => { volumePop.hidden = !volumePop.hidden; });
    volume.addEventListener('input', () => { volumeLevel = Number(volume.value); muted = volumeLevel === 0; updateVolume(); });
    muteButton.addEventListener('click', () => {
      if (muted || volumeLevel === 0) { muted = false; if (volumeLevel === 0) volumeLevel = 0.8; toast('已取消静音'); }
      else { muted = true; toast('已静音'); }
      updateVolume();
    });
    $('[data-m-fullscreen]', view).addEventListener('click', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else if (view.requestFullscreen) void view.requestFullscreen().catch(() => toast('当前环境不支持全屏'));
    });
    $('[data-m-version]', view).addEventListener('click', () => openEditionSheet(f));
    state.mPlayerStop = stop;
    paint();
  }

  function openEditionSheet(f) {
    const app = $('.m-app');
    const layer = document.createElement('div');
    layer.className = 'm-edition-layer';
    layer.innerHTML = '<button class="m-sheet-scrim" data-edition-close aria-label="关闭"></button><section class="m-edition-sheet"><header><p class="m-eyebrow">版本</p><h2>选择播放版本</h2><button class="m-sheet-close" data-edition-close aria-label="关闭">×</button></header><div class="m-edition-list">' +
      f.editions.map((e, i) => '<button data-edition-pick="' + i + '" aria-pressed="' + (i === 0) + '"><span><b>' + esc(e.name) + '</b><small>' + esc(e.resolution) + ' · ' + esc(e.codec) + ' · ' + esc(e.size) + '</small></span><em>' + (i === 0 ? '当前' : '') + '</em></button>').join('') +
      '</div></section>';
    layer.addEventListener('click', (event) => {
      if (event.target.closest('[data-edition-close]')) layer.remove();
      const pick = event.target.closest('[data-edition-pick]');
      if (pick) {
        layer.querySelectorAll('[data-edition-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b === pick)));
        toast('已选择 ' + f.editions[Number(pick.dataset.editionPick)].name);
        setTimeout(() => layer.remove(), 350);
      }
    });
    app.appendChild(layer);
  }

  function openMobileCollectionSheet(film) {
    const app = $('.m-app');
    const layer = document.createElement('div');
    layer.className = 'm-edition-layer';
    layer.innerHTML = '<button class="m-sheet-scrim" data-m-col-close aria-label="关闭"></button><section class="m-edition-sheet"><header><p class="m-eyebrow">收藏夹</p><h2>加入收藏夹</h2><button class="m-sheet-close" data-m-col-close aria-label="关闭">×</button></header><div class="m-collection-pick">' +
      (VX.collections.length ? VX.collections.map((c) => '<label><input type="checkbox" data-m-col-pick="' + c.id + '"' + (c.filmIds.includes(film.id) ? ' checked' : '') + ' /><span><b>' + esc(c.name) + '</b><small>' + c.count + ' 部影片</small></span></label>').join('') : '<p class="m-profile-card" style="margin:12px 0">还没有收藏夹</p>') +
      '</div><div class="m-sheet-foot"><button data-m-col-close>取消</button><button class="m-apply" data-m-col-save="' + film.id + '">完成</button></div></section>';
    layer.addEventListener('click', (event) => {
      if (event.target.closest('[data-m-col-close]')) layer.remove();
      const save = event.target.closest('[data-m-col-save]');
      if (save) {
        const filmId = save.dataset.mColSave;
        layer.querySelectorAll('[data-m-col-pick]').forEach((box) => {
          const c = VX.collections.find((x) => x.id === box.dataset.mColPick);
          if (!c) return;
          const has = c.filmIds.includes(filmId);
          if (box.checked && !has) c.filmIds.push(filmId);
          if (!box.checked && has) c.filmIds = c.filmIds.filter((id) => id !== filmId);
          c.count = c.filmIds.length;
        });
        layer.remove();
        toast('收藏夹已更新');
      }
    });
    app.appendChild(layer);
  }

  function renderCollectionsPage() {
    const body = $('[data-m-collections-body]');
    const scope = state.collectionId ? VX.collections.find((c) => c.id === state.collectionId) : null;
    if (scope) {
      const members = scope.filmIds.map((id) => filmById.get(id)).filter(Boolean);
      body.innerHTML = [
        '<button class="m-collection-back" data-m-collection-back>← 全部收藏</button>',
        '<header class="m-collection-detail-head"><h2>' + esc(scope.name) + '</h2><p>' + esc(scope.desc) + '</p><span>' + members.length + ' 部影片</span></header>',
        '<div class="m-poster-grid">' + members.map(poster).join('') + '</div>'
      ].join('');
      return;
    }
    body.innerHTML = [
      '<header class="m-subhead"><h2>收藏夹</h2><button data-m-new-folder>＋ 新建</button></header>',
      '<div class="m-collection-grid">',
      VX.collections.map((c) => '<button class="m-collection-card" data-m-collection-open="' + c.id + '"><img src="' + c.cover + '" alt="" /><b>' + esc(c.name) + '</b><small>' + c.count + ' 部影片 · ' + esc(c.desc) + '</small></button>').join(''),
      '</div>',
      '<header class="m-subhead"><h2>我喜欢的</h2><span>12 部</span></header>',
      '<div class="m-poster-grid">' + films.filter((f) => state.favorites.has(f.id)).slice(0, 9).map(poster).join('') + '</div>',
      '<div class="m-list-end">— 我的收藏 —</div>'
    ].join('');
  }

  function openLogoutSheet() {
    const app = $('.m-app');
    const layer = document.createElement('div');
    layer.className = 'm-edition-layer';
    layer.innerHTML = '<button class="m-sheet-scrim" data-logout-close aria-label="关闭"></button><section class="m-edition-sheet"><header><p class="m-eyebrow">账号</p><h2>退出登录</h2><button class="m-sheet-close" data-logout-close aria-label="关闭">×</button></header><p class="m-logout-note">这是单账号本机媒体库；退出后需要重新登录。</p><div class="m-sheet-foot"><button data-logout-close>取消</button><button class="m-apply" data-logout-confirm>退出</button></div></section>';
    layer.addEventListener('click', (event) => {
      if (event.target.closest('[data-logout-close]')) layer.remove();
      if (event.target.closest('[data-logout-confirm]')) {
        layer.remove();
        toast('演示环境：已退出登录');
      }
    });
    app.appendChild(layer);
  }

  function openNewFolderSheet() {
    const app = $('.m-app');
    const layer = document.createElement('div');
    layer.className = 'm-edition-layer';
    layer.innerHTML = '<button class="m-sheet-scrim" data-folder-close aria-label="关闭"></button><section class="m-edition-sheet"><header><p class="m-eyebrow">收藏夹</p><h2>新建收藏夹</h2><button class="m-sheet-close" data-folder-close aria-label="关闭">×</button></header><div class="m-folder-form"><label class="m-filter-label">名称</label><input data-folder-name placeholder="例如：周末重看" /><label class="m-filter-label">说明</label><input data-folder-desc placeholder="一句话说明这个片单" /></div><div class="m-sheet-foot"><button data-folder-close>取消</button><button class="m-apply" data-folder-save>创建</button></div></section>';
    layer.addEventListener('click', (event) => {
      if (event.target.closest('[data-folder-close]')) layer.remove();
      if (event.target.closest('[data-folder-save]')) {
        const name = layer.querySelector('[data-folder-name]').value.trim();
        if (!name) return toast('请填写收藏夹名称');
        const desc = layer.querySelector('[data-folder-desc]').value.trim();
        VX.collections.unshift({ id: 'col-' + Date.now(), name: name, desc: desc, en: 'Collection', cover: 'assets/cinema/843-backdrop.jpg', filmIds: [], count: 0 });
        layer.remove();
        renderCollectionsPage();
        toast('已创建收藏夹「' + name + '」');
      }
    });
    app.appendChild(layer);
    setTimeout(() => layer.querySelector('[data-folder-name]').focus(), 40);
  }

  function renderProfilePage() {
    const body = $('[data-m-profile-body]');
    body.innerHTML = [
      '<div class="m-profile-card"><span class="m-profile-avatar">W</span><div><strong>W</strong><small>私人媒体库 · 本机</small></div></div>',
      '<div class="m-stat-grid"><div><b>39</b><small>影片</small></div><div><b>12</b><small>喜欢</small></div><div><b>27</b><small>已看</small></div></div>',
      '<div class="m-profile-links">',
      '<button data-go-m="collections"><span><b>我的收藏</b><small>3 个收藏夹</small></span><span>→</span></button>',
      '<button data-m-watched-link><span><b>看过的影片</b><small>27 部</small></span><span>→</span></button>',
      '<button data-m-logout><span><b>退出登录</b><small>单账号 · 本机</small></span><span>→</span></button>',
      '</div>',
      '<div class="m-list-end">— 我的 —</div>'
    ].join('');
  }

  function showScreen(name) {
    if (name !== 'player' && state.mPlayerStop) {
      state.mPlayerStop();
      state.mPlayerStop = null;
    }
    state.screen = name;
    $('[data-m-search]').hidden = true;
    $$('.m-view').forEach((v) => { v.hidden = v.dataset.mView !== name; });
    if (name === 'detail') renderDetail(state.detailId);
    if (name === 'player') renderPlayer(state.playerId);
    if (name === 'library') renderLibrary();
    if (name === 'discover') renderHome();
    if (name === 'collections') renderCollectionsPage();
    if (name === 'profile') renderProfilePage();
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
      if (go.dataset.goM === 'collections') state.collectionId = null;
      showScreen(go.dataset.goM);
      return;
    }
    if (e.target.closest('[data-m-watched-link]')) {
      state.seen = 'seen';
      state.collectionId = null;
      showScreen('library');
      toast('已筛选看过的影片');
      return;
    }
    if (e.target.closest('[data-m-new-folder]')) { openNewFolderSheet(); return; }
    if (e.target.closest('[data-m-logout]')) { openLogoutSheet(); return; }
    const collectionOpen = e.target.closest('[data-m-collection-open]');
    if (collectionOpen) {
      state.collectionId = collectionOpen.dataset.mCollectionOpen;
      renderCollectionsPage();
      return;
    }
    if (e.target.closest('[data-m-collection-back]')) {
      state.collectionId = null;
      renderCollectionsPage();
      return;
    }
    if (e.target.closest('[data-m-clear-scope]')) {
      state.scope = null;
      renderLibrary();
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
    if (e.target.closest('[data-m-collection]')) {
      const film = filmById.get(state.detailId);
      if (film) openMobileCollectionSheet(film);
      return;
    }
    if (e.target.closest('[data-m-open-edition]')) {
      const film = filmById.get(state.detailId);
      if (film) openEditionSheet(film);
      return;
    }
    if (e.target.closest('[data-m-toast]')) { toast(e.target.closest('[data-m-toast]').dataset.mToast); return; }

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
      const p = peopleById.get(person.dataset.mPerson);
      state.scope = { kind: 'actor', id: person.dataset.mPerson, name: p ? p.name : '演员' };
      state.entity = 'films';
      showScreen('library');
      toast('已按演员筛选');
      return;
    }
    const series = e.target.closest('[data-m-series]');
    if (series) {
      e.preventDefault();
      const s = seriesById.get(series.dataset.mSeries);
      state.scope = { kind: 'series', id: series.dataset.mSeries, name: s ? s.name : '系列' };
      state.entity = 'films';
      showScreen('library');
      toast('已按系列筛选');
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
  if (params.get('entity')) state.entity = params.get('entity');
  if (initial === 'filters') {
    showScreen('library');
    openFilter();
  } else {
    showScreen(initial);
  }
})();
