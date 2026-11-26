/* Viewing-end prototype interactions. All data is local and illustrative. */
(() => {
  if (new URLSearchParams(location.search).has('capture')) document.documentElement.classList.add('capture');
  const VX = window.VX;
  const icon = window.VXI;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const films = VX.films;
  const filmById = new Map(films.map((f) => [f.id, f]));
  const peopleById = new Map(VX.people.map((p) => [p.id, p]));
  const seriesById = new Map(VX.series.map((s) => [s.id, s]));
  const fmt = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const state = {
    route: 'discover',
    category: 'all',
    entity: 'films',
    sort: '添加时间',
    seen: 'all',
    fav: 'all',
    rating: 'all',
    year: 'all',
    query: '',
    scope: null,
    collectionScope: null,
    detailId: null,
    playerId: null,
    favorites: new Set(films.filter((f) => f.favorite).map((f) => f.id)),
    watched: new Set(films.filter((f) => f.watched).map((f) => f.id)),
    ratings: new Map(films.filter((f) => f.rating).map((f) => [f.id, f.rating])),
    editions: new Map()
  };

  const years = [...new Set(films.map((f) => f.year))].sort((a, b) => b - a);

  function stars(rating, interactive = false) {
    return [1, 2, 3, 4, 5].map((n) => icon(n <= (rating || 0) ? 'star-fill' : 'star', 17, n <= (rating || 0) ? 'is-on' : '')).join('');
  }

  function posterCard(f, extra = '') {
    const fav = state.favorites.has(f.id);
    const seen = state.watched.has(f.id);
    const rating = state.ratings.get(f.id);
    return `<a class="poster-card ${extra}" href="#detail/${f.id}" aria-label="${esc(f.title)}，${f.year}，${esc(f.category)}">
      <span class="poster-art">
        <img src="${f.poster}" alt="${esc(f.title)} 海报" />
        <span class="poster-badge">${esc(f.format)}</span>
        ${fav ? `<span class="poster-fav" aria-label="已喜欢">${icon('heart-fill', 14)}</span>` : ''}
        ${seen ? '<span class="poster-seen">已看</span>' : ''}
        <span class="poster-hover"><span>查看影片</span><span aria-hidden="true">↗</span></span>
      </span>
      <span class="poster-info">
        <span class="poster-title"><span>${esc(f.title)}</span>${f.en ? `<em>${esc(f.en.split(':')[0])}</em>` : ''}</span>
        <span class="poster-meta">${f.year}<i>·</i>${esc(f.category)}${rating ? `<span class="poster-rating" aria-label="${rating} 星">${'★'.repeat(rating)}</span>` : ''}</span>
      </span>
    </a>`;
  }

  function personCard(p) {
    const works = films.filter((f) => f.actors.includes(p.id)).length;
    return `<a class="person-card" href="#library" data-person="${p.id}">
      <span class="person-art"><img src="${p.portrait}" alt="${esc(p.name)}" /></span>
      <span class="person-name">${esc(p.name)}</span>
      <span class="person-meta">${esc(p.category)} · ${works} 部作品</span>
    </a>`;
  }

  function seriesCard(s) {
    const count = films.filter((f) => f.series === s.id).length;
    return `<a class="series-tile" href="#library" data-series="${s.id}">
      <span class="series-art"><img src="${s.cover}" alt="" /></span>
      <span class="series-tile-copy"><b>${esc(s.name)}</b><small>${esc(s.category)} · ${count} 部作品</small><span aria-hidden="true">↗</span></span>
    </a>`;
  }

  function visibleFilms() {
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
    const dir = state.sort === '名称' ? 1 : -1;
    list.sort((a, b) => {
      if (state.sort === '名称') return a.title.localeCompare(b.title, 'zh');
      if (state.sort === '发行年份') return (a.year - b.year) * -1;
      if (state.sort === '我的评分') return ((state.ratings.get(b.id) || 0) - (state.ratings.get(a.id) || 0)) || (b.year - a.year);
      return b.addedIndex - a.addedIndex;
    });
    return list;
  }

  function activeFilterCount() {
    return [state.category !== 'all', state.seen !== 'all', state.fav !== 'all', state.rating !== 'all', state.year !== 'all'].filter(Boolean).length;
  }

  function renderHome() {
    const resumeIds = ['693134', '157336', '843', '129'];
    $('[data-resume-strip]').innerHTML = resumeIds.map((id) => {
      const f = filmById.get(id);
      const r = f.resume || { ms: 0, duration: f.minutes * 60000, edition: f.format };
      const pct = Math.min(100, (r.ms / r.duration) * 100);
      return `<a class="resume-card" href="#play/${f.id}" aria-label="继续观看 ${esc(f.title)}">
        <img src="${f.backdrop}" alt="" />
        <span class="resume-top"><span>${esc(r.edition || f.format)}</span><span>${Math.floor(r.ms / 60000)}:${fmt(Math.floor((r.ms % 60000) / 1000))} / ${Math.floor(r.duration / 60000)}:${fmt(Math.floor((r.duration % 60000) / 1000))}</span></span>
        <span class="resume-copy"><h3>${esc(f.title)}</h3><p>看到 ${Math.floor(r.ms / 60000)} 分 ${fmt(Math.floor((r.ms % 60000) / 1000))} 秒 · 继续</p></span>
        <span class="resume-play">${icon('play', 15)}</span>
        <span class="resume-progress"><i style="width:${pct}%"></i></span>
      </a>`;
    }).join('');
    const homeIds = ['693134', '129', '157336', '120467', '324857', '313369', '272'];
    $('[data-home-grid]').innerHTML = homeIds.map((id) => posterCard(filmById.get(id))).join('');
    const liked = films.filter((f) => state.favorites.has(f.id)).slice(0, 7);
    $('[data-liked-grid]').innerHTML = liked.map((f) => posterCard(f)).join('');
    $('[data-home-categories]').innerHTML = VX.categories.map((c) => `<button type="button" data-home-cat="${c.id}"><span>${esc(c.name)}</span><b>${c.count}</b></button>`).join('');
  }

  function renderCategories() {
    $('[data-category-line]').innerHTML = VX.categories.map((c) => `<button type="button" aria-pressed="${state.category === c.id}" data-category="${c.id}">${esc(c.name)}<sup>${c.count}</sup></button>`).join('');
  }

  function renderLibrary() {
    renderCategories();
    const list = visibleFilms();
    $('[data-result-count]').textContent = list.length;
    $('[data-library-total]').textContent = list.length;
    const count = activeFilterCount();
    const fc = $('[data-filter-count]');
    fc.hidden = count === 0;
    fc.textContent = count;
    const banner = $('[data-scope-banner]');
    banner.hidden = !state.scope;
    if (state.scope) {
      banner.querySelector('span').textContent = state.scope.kind === 'actor'
        ? '演员 · ' + state.scope.name
        : '系列 · ' + state.scope.name;
    }
    const grid = $('[data-library-grid]');
    const empty = $('[data-library-empty]');
    if (state.entity === 'films') {
      grid.className = 'poster-grid poster-grid-library';
      grid.innerHTML = list.map((f) => posterCard(f)).join('');
      empty.hidden = list.length > 0;
    } else if (state.entity === 'people') {
      const q = state.query.trim();
      const people = VX.people.filter((p) => !q || p.name.includes(q) || (p.en || '').toLowerCase().includes(q.toLowerCase()));
      grid.className = 'people-grid';
      grid.innerHTML = people.map(personCard).join('');
      $('[data-result-count]').textContent = people.length;
      empty.hidden = people.length > 0;
    } else {
      const q = state.query.trim();
      const series = VX.series.filter((s) => !q || s.name.includes(q));
      grid.className = 'series-grid';
      grid.innerHTML = series.map(seriesCard).join('');
      $('[data-result-count]').textContent = series.length;
      empty.hidden = series.length > 0;
    }
    $$('.entity-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.entity === state.entity)));
  }

  function renderCollections() {
    const list = $('[data-collection-list]');
    const liked = $('[data-liked-section]');
    const scope = state.collectionScope ? VX.collections.find((c) => c.id === state.collectionScope) : null;
    if (scope) {
      const members = scope.filmIds.map((id) => filmById.get(id)).filter(Boolean);
      list.className = 'collection-detail';
      list.innerHTML = [
        '<button class="collection-back" data-collection-back>← 全部收藏</button>',
        '<header class="collection-detail-head"><div><p class="eyebrow">收藏夹 / ' + esc(scope.en || 'Collection') + '</p><h2>' + esc(scope.name) + '</h2><p>' + esc(scope.desc || '') + '</p></div><span>' + members.length + ' 部影片</span></header>',
        '<div class="poster-grid poster-grid-home">' + members.map((f) => posterCard(f)).join('') + '</div>'
      ].join('');
      liked.hidden = true;
      return;
    }
    list.className = 'collection-list';
    list.innerHTML = VX.collections.map((c, i) => {
      const film = filmById.get(c.filmIds[0]);
      return '<a class="collection-card" href="#collections" data-collection="' + c.id + '">' +
        '<img src="' + c.cover + '" alt="" />' +
        '<span class="collection-index">' + fmt(i + 1) + '</span>' +
        '<span class="collection-copy"><p>' + esc(c.en || 'Collection').toUpperCase() + ' / 收藏夹</p><h2>' + esc(c.name) + '</h2><p>' + esc(c.desc) + '</p><span>' + c.count + ' 部影片 · ' + esc(film ? film.title : '空收藏夹') + ' 等 <span aria-hidden="true">→</span></span></span>' +
        '</a>';
    }).join('');
    liked.hidden = false;
    $('[data-liked-grid]').innerHTML = films.filter((f) => state.favorites.has(f.id)).slice(0, 7).map((f) => posterCard(f)).join('');
  }

  function openWebModal(content) {
    const layer = $('[data-web-modal]');
    $('[data-web-modal-content]').innerHTML = content;
    layer.hidden = false;
    document.body.classList.add('is-locked');
  }

  function closeWebModal() {
    $('[data-web-modal]').hidden = true;
    document.body.classList.remove('is-locked');
  }

  function newCollectionModal() {
    openWebModal([
      '<h2>新建收藏夹</h2><p class="web-modal-sub">收藏夹只影响个人片单，不改变影片资料。</p>',
      '<div class="web-modal-fields"><label class="web-modal-field"><span>名称</span><input data-new-collection-name placeholder="例如：周末重看" /></label><label class="web-modal-field"><span>说明（可选）</span><input data-new-collection-desc placeholder="一句话说明这个片单" /></label></div>',
      '<div class="web-modal-actions"><button class="web-modal-cancel" data-close-web-modal>取消</button><button class="web-modal-save" data-create-collection>创建收藏夹</button></div>'
    ].join(''));
    setTimeout(() => $('[data-new-collection-name]')?.focus(), 30);
  }

  function collectionPicker(film) {
    openWebModal([
      '<h2>加入收藏夹</h2><p class="web-modal-sub">' + esc(film.title) + ' · 可同时加入多个收藏夹</p>',
      '<div class="collection-picker">' + (VX.collections.length ? VX.collections.map((c) => '<label><input type="checkbox" data-collection-pick="' + c.id + '"' + (c.filmIds.includes(film.id) ? ' checked' : '') + ' /><img src="' + c.cover + '" alt="" /><span><b>' + esc(c.name) + '</b><small>' + c.count + ' 部影片</small></span></label>').join('') : '<p class="web-modal-sub">还没有收藏夹。</p>') + '</div>',
      '<div class="web-modal-actions"><button class="web-modal-cancel" data-new-collection-inline>新建收藏夹</button><button class="web-modal-save" data-save-collection-picks="' + film.id + '">完成</button></div>'
    ].join(''));
  }

  function detailStills(f) {
    const pool = films.filter((x) => x.id !== f.id && x.category === f.category).slice(0, 2);
    const extra = pool.length === 2 ? pool : films.filter((x) => x.id !== f.id).slice(0, 2);
    return [f, ...extra].slice(0, 3);
  }

  function renderDetail(id) {
    const f = filmById.get(id);
    if (!f) return;
    state.detailId = id;
    const actors = f.actors.map((x) => peopleById.get(x)).filter(Boolean);
    const series = f.series ? seriesById.get(f.series) : null;
    const rating = state.ratings.get(f.id);
    const fav = state.favorites.has(f.id);
    const watched = state.watched.has(f.id);
    const resume = f.resume;
    const selectedEdition = state.editions.get(f.id) || f.editions[0].name;
    const stills = detailStills(f);
    const view = $('[data-view="detail"]');
    view.innerHTML = `
      <nav class="detail-crumb"><a href="#library">${icon('arrow-left', 15)} 返回</a><span aria-hidden="true">/</span><span>影片详情</span></nav>
      <div class="detail-hero">
        <div class="detail-hero-bg"><img src="${f.backdrop}" alt="" /></div>
        <div class="detail-main-row">
          <a class="detail-poster" href="#play/${f.id}" aria-label="播放 ${esc(f.title)}"><img src="${f.poster}" alt="${esc(f.title)} 海报" /></a>
          <div class="detail-title-block">
            <p class="eyebrow">${f.year} · ${esc(f.categoryEn)} · ${f.minutes} min</p>
            <h1>${esc(f.title)}${f.en ? `<em>${esc(f.en)}</em>` : ''}</h1>
            <p class="detail-meta">${f.year}<i>·</i>${esc(f.category)}<i>·</i>${f.minutes} 分钟<i>·</i>${esc(f.director)}<i>·</i>${esc(f.format)}</p>
            <div class="detail-actions">
              <a class="detail-play" href="#play/${f.id}">${icon('play', 16)} ${resume ? '继续播放 · ' + Math.floor(resume.ms / 60000) + ':' + fmt(Math.floor((resume.ms % 60000) / 1000)) : '播放影片'}</a>
              ${resume ? '<a class="detail-restart" href="#play/' + f.id + '">从头播放</a>' : ''}
              <label class="detail-version"><span>播放版本</span><select data-detail-edition-select>${f.editions.map((e) => '<option' + (e.name === selectedEdition ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('')}</select></label>
            </div>
            ${resume ? `<p class="detail-progress-note"><span style="--p:${Math.min(100, (resume.ms / resume.duration) * 100)}%"></span> 上次看到 ${Math.floor(resume.ms / 60000)} 分 ${fmt(Math.floor((resume.ms % 60000) / 1000))} 秒 · ${esc(resume.edition || f.format)}</p>` : ''}
          </div>
        </div>
      </div>
      <div class="detail-personal-bar">
        <div class="detail-tools">
          <button data-detail-fav aria-pressed="${fav}">${icon(fav ? 'heart-fill' : 'heart', 16)} ${fav ? '已喜欢' : '喜欢'}</button>
          <button data-detail-collection>${icon('folder', 16)} 收藏夹</button>
          <button data-detail-watched aria-pressed="${watched}">${icon('check', 15)} ${watched ? '已看过' : '标记已看'}</button>
        </div>
        <div class="detail-rating" role="group" aria-label="我的评分"><span>我的评分</span>${[1,2,3,4,5].map((n) => `<button data-rate="${n}" aria-label="${n} 星" aria-pressed="${rating === n}">${icon(n <= (rating || 0) ? 'star-fill' : 'star', 17, n <= (rating || 0) ? 'is-on' : '')}</button>`).join('')}</div>
      </div>
      <div class="detail-body">
        <div class="detail-content">
          <section class="detail-synopsis">
            <div class="detail-section-head"><h2>故事简介</h2><span>Synopsis / 01</span></div>
            <p>${esc(f.summary)}</p>
            <p>私人馆藏版本，画面与声音按当前文件实际规格播放。资料由本地片库维护，个人评分、喜欢与观看进度彼此独立。</p>
          </section>
          <section>
            <div class="detail-section-head"><h2>剧照</h2><span>Stills / 03</span></div>
            <div class="still-row">
              ${stills.map((s, i) => `<a class="still" href="#play/${f.id}"><img src="${s.backdrop}" alt="" /><span>STILL ${fmt(i + 1)}</span></a>`).join('')}
            </div>
          </section>
          <section>
            <div class="detail-section-head"><h2>主要演员</h2><span>Cast / ${fmt(actors.length)}</span></div>
            <div class="cast-row">
              ${actors.map((p) => `<a class="cast-card" href="#library" data-actor="${p.id}"><span class="cast-art"><img src="${p.portrait}" alt="${esc(p.name)}" /></span><b>${esc(p.name)}</b><small>${esc(p.en || p.category)}</small></a>`).join('')}
            </div>
          </section>
          ${series ? `<section>
            <div class="detail-section-head"><h2>所属系列</h2><span>Series / 01</span></div>
            <a class="series-card" href="#library" data-series="${series.id}"><img src="${series.cover}" alt="" /><span><b>${esc(series.name)}</b><small>${films.filter((x) => x.series === series.id).length} 部作品 · 查看完整系列</small></span><span aria-hidden="true">→</span></a>
          </section>` : ''}
        </div>
        <aside class="detail-aside">
          <div class="detail-aside-inner">
            <div class="aside-block">
              <span class="aside-label">资料 / Details</span>
              <dl class="fact-list">
                <div><dt>DIRECTOR</dt><dd>${esc(f.director)}</dd></div>
                <div><dt>RELEASED</dt><dd>${f.year}</dd></div>
                <div><dt>RUNTIME</dt><dd>${f.durationLabel}</dd></div>
                <div><dt>GENRE</dt><dd>${esc(f.category)}</dd></div>
                <div><dt>IDENTIFIER</dt><dd>${esc(f.identifier)}</dd></div>
                <div><dt>文件</dt><dd>MEDIA-01 · ${esc(f.editions[0].resolution)}</dd></div>
              </dl>
            </div>
            <div class="aside-block">
              <span class="aside-label">版本 / Editions</span>
              <div class="edition-list">
                ${f.editions.map((e) => `<div class="edition-row ${e.name === selectedEdition ? 'is-default' : ''}"><span><b>${esc(e.name)}</b><br /><small>${esc(e.resolution)} · ${esc(e.codec)} · ${esc(e.size)}</small></span>${e.name === selectedEdition ? '<small>当前</small>' : ''}</div>`).join('')}
              </div>
            </div>
          </div>
        </aside>
      </div>
    `;
    bindDetail(f);
  }

  function bindDetail(f) {
    const favBtn = $('[data-detail-fav]', $('[data-view="detail"]'));
    favBtn.addEventListener('click', () => {
      if (state.favorites.has(f.id)) state.favorites.delete(f.id); else state.favorites.add(f.id);
      renderDetail(f.id);
      renderHome();
      toast(state.favorites.has(f.id) ? '已加入喜欢' : '已取消喜欢');
    });
    const watchBtn = $('[data-detail-watched]', $('[data-view="detail"]'));
    watchBtn.addEventListener('click', () => {
      if (state.watched.has(f.id)) state.watched.delete(f.id); else state.watched.add(f.id);
      renderDetail(f.id);
      toast(state.watched.has(f.id) ? '已标记为看过' : '已取消已看');
    });
    $('[data-detail-collection]', $('[data-view="detail"]')).addEventListener('click', () => collectionPicker(f));
    const editionSelect = $('[data-detail-edition-select]', $('[data-view="detail"]'));
    editionSelect.addEventListener('change', () => {
      state.editions.set(f.id, editionSelect.value);
      toast('已选择 ' + editionSelect.value);
    });
    $$('[data-rate]', $('[data-view="detail"]')).forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.rate);
      if (n === 0) state.ratings.delete(f.id); else if (state.ratings.get(f.id) === n) state.ratings.delete(f.id); else state.ratings.set(f.id, n);
      renderDetail(f.id);
      toast(n === 0 ? '已取消评分' : state.ratings.get(f.id) ? '已评分 ' + n + ' 星' : '已取消评分');
    }));
    $$('[data-view="detail"] [data-series]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      openEntity('films', 'series', a.dataset.series);
    }));
    $$('[data-view="detail"] [data-actor]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      openEntity('films', 'actor', a.dataset.actor);
    }));
  }

  function renderPlayer(id) {
    const f = filmById.get(id);
    if (!f) return;
    state.playerId = id;
    const editionName = state.editions.get(f.id) || f.editions[0].name;
    const view = $('[data-view="player"]');
    view.innerHTML = `
      <header class="player-top">
        <a class="icon-button" href="#detail/${f.id}" aria-label="关闭播放器">×</a>
        <div class="player-title"><b>${esc(f.title)}</b><small>${esc(f.en || f.category)} · ${esc(editionName)} · 演示片段</small></div>
        <div class="player-top-right"><span>HDR10 · 5.1</span><span>断点会记录</span></div>
      </header>
      <div class="player-stage">
        <video data-player-video src="assets/preview.mp4" poster="${f.backdrop}" playsinline preload="metadata"></video>
        <button class="player-center" data-player-toggle aria-label="播放">${icon('play', 26)}</button>
      </div>
      <div class="player-controls">
        <div class="player-timeline"><span data-player-current>00:00</span><input class="player-seek" data-player-seek type="range" min="0" max="100" value="0" aria-label="播放进度" /><span data-player-duration>00:22</span></div>
        <div class="player-buttons">
          <button data-player-toggle aria-label="播放或暂停">${icon('play', 18)}</button>
          <button data-player-skip="-10" aria-label="后退 10 秒">${icon('arrow-left', 18)}</button>
          <button data-player-skip="10" aria-label="前进 10 秒">${icon('arrow-right', 18)}</button>
          <span class="spacer"></span>
          <button data-player-mute aria-label="静音">${icon('volume', 18)}</button>
          <button class="player-version" data-player-version aria-label="切换版本">${esc(editionName)}</button>
          <button data-player-fullscreen aria-label="全屏">${icon('fullscreen', 18)}</button>
        </div>
      </div>
    `;
    const video = $('[data-player-video]', view);
    const seek = $('[data-player-seek]', view);
    const current = $('[data-player-current]', view);
    const duration = $('[data-player-duration]', view);
    const center = $('.player-center', view);
    const format = (s) => {
      if (!Number.isFinite(s)) return '00:00';
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    };
    const paint = () => {
      const d = video.duration || 22;
      current.textContent = format(video.currentTime);
      duration.textContent = format(d);
      seek.value = String((video.currentTime / d) * 100);
      seek.style.setProperty('--p', (video.currentTime / d) * 100 + '%');
      center.classList.toggle('is-hidden', !video.paused);
      $$('[data-player-toggle]', view).forEach((b) => {
        if (b === center) b.innerHTML = icon(video.paused ? 'play' : 'pause', 26);
        else b.innerHTML = icon(video.paused ? 'play' : 'pause', 18);
      });
    };
    video.addEventListener('loadedmetadata', paint);
    video.addEventListener('timeupdate', paint);
    video.addEventListener('play', paint);
    video.addEventListener('pause', paint);
    video.addEventListener('ended', paint);
    $$('[data-player-toggle]', view).forEach((b) => b.addEventListener('click', () => {
      if (video.paused) {
        video.play().catch(() => {
          video.muted = true;
          video.play().then(() => toast('浏览器要求静音播放，已静音')).catch(() => toast('当前环境无法播放此片段'));
        });
      } else video.pause();
    }));
    $$('[data-player-skip]', view).forEach((b) => b.addEventListener('click', () => {
      video.currentTime = Math.max(0, Math.min(video.duration || 22, video.currentTime + Number(b.dataset.playerSkip)));
    }));
    seek.addEventListener('input', () => {
      video.currentTime = ((Number(seek.value) / 100) * (video.duration || 22));
    });
    $('[data-player-mute]', view).addEventListener('click', () => {
      video.muted = !video.muted;
      toast(video.muted ? '已静音' : '已取消静音');
    });
    $('[data-player-fullscreen]', view).addEventListener('click', () => {
      const stage = $('.player-stage', view);
      if (document.fullscreenElement) void document.exitFullscreen();
      else if (stage.requestFullscreen) void stage.requestFullscreen().catch(() => toast('当前浏览器不支持全屏'));
    });
    let editionIndex = Math.max(0, f.editions.findIndex((e) => e.name === editionName));
    $('[data-player-version]', view).addEventListener('click', () => {
      editionIndex = (editionIndex + 1) % f.editions.length;
      state.editions.set(f.id, f.editions[editionIndex].name);
      $('[data-player-version]', view).textContent = f.editions[editionIndex].name;
      toast('已切换为 ' + f.editions[editionIndex].name);
    });
    paint();
  }

  function renderProfile() {
    /* Actions are handled by the document-level click delegate. */
  }

  function openEntity(entity, filterKind, id) {
    state.entity = entity;
    state.category = 'all';
    state.query = '';
    if (filterKind === 'series') {
      const s = seriesById.get(id);
      state.scope = { kind: 'series', id, name: s.name };
      toast('已按系列「' + s.name + '」筛选');
    }
    if (filterKind === 'actor') {
      const p = peopleById.get(id);
      state.scope = { kind: 'actor', id, name: p.name };
      toast('已按演员「' + p.name + '」筛选');
    }
    location.hash = '#library';
    renderLibrary();
  }

  function renderRoute() {
    const hash = location.hash.replace(/^#/, '') || 'discover';
    const [path, id] = hash.split('/');
    const route = ['discover', 'library', 'collections', 'profile', 'detail', 'player'].includes(path) ? path : 'discover';
    if (route !== 'player') {
      const playing = $('[data-player-video]');
      if (playing && !playing.paused) playing.pause();
    }
    state.route = route;
    $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== state.route; });
    $$('[data-nav]').forEach((a) => {
      const active = a.dataset.nav === state.route || (a.dataset.nav === 'library' && state.route === 'detail');
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.body.classList.toggle('is-player', state.route === 'player');
    document.body.classList.toggle('is-detail', state.route === 'detail');
    if (state.route === 'library') renderLibrary();
    if (state.route !== 'collections') state.collectionScope = null;
    if (state.route === 'collections') renderCollections();
    const avatar = $('[data-open-profile]');
    if (avatar) {
      if (state.route === 'profile') avatar.setAttribute('aria-current', 'page'); else avatar.removeAttribute('aria-current');
    }
    if (state.route === 'detail') renderDetail(id || '693134');
    if (state.route === 'player') renderPlayer(id || '693134');
    if (state.route === 'discover') renderHome();
    if (state.route === 'profile') renderProfile();
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('[data-head]').classList.toggle('is-solid', state.route !== 'discover' && state.route !== 'detail');
  }

  function toast(message) {
    const el = $('[data-toast]');
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  function openSearch() {
    $('[data-search-layer]').hidden = false;
    document.body.classList.add('is-locked');
    setTimeout(() => $('[data-search-input]').focus(), 30);
  }

  function closeSearch() {
    $('[data-search-layer]').hidden = true;
    document.body.classList.remove('is-locked');
    $('[data-search-input]').value = '';
    $('[data-search-results]').innerHTML = '<p class="search-hint">输入片名或演员姓名，按 Esc 关闭。</p>';
  }

  function searchResults(q) {
    const query = q.trim().toLowerCase();
    if (!query) return '<p class="search-hint">输入片名或演员姓名，按 Esc 关闭。</p>';
    const matches = films.filter((f) => {
      const cast = f.actors.map((id) => peopleById.get(id)?.name || '').join(' ');
      return [f.title, f.en, f.category, f.year, f.director, cast, f.seriesName || ''].join(' ').toLowerCase().includes(query);
    }).slice(0, 7);
    if (!matches.length) return '<p class="search-hint">没有找到匹配的影片。可尝试片名、演员或系列。</p>';
    return matches.map((f) => `<a class="search-row" href="#detail/${f.id}">
      <img src="${f.poster}" alt="" />
      <span><b>${esc(f.title)}</b><small>${esc(f.en || '')} · ${f.year} · ${esc(f.category)}</small></span>
      <span>${esc(f.director)}</span>
      <em>↗</em>
    </a>`).join('');
  }

  function openFilter() {
    $('[data-filter-layer]').hidden = false;
    document.body.classList.add('is-locked');
    const counts = countDraft();
    $('[data-filter-preview]').textContent = counts;
  }

  function closeFilter() {
    $('[data-filter-layer]').hidden = true;
    document.body.classList.remove('is-locked');
  }

  function draftState() {
    return {
      seen: $('input[name=seen]:checked')?.value || 'all',
      fav: $('input[name=fav]:checked')?.value || 'all',
      rating: $('input[name=rating]:checked')?.value || 'all',
      year: $('[data-year-grid] [aria-pressed=true]')?.dataset.year || 'all'
    };
  }

  function countDraft() {
    const d = draftState();
    const backup = { ...state };
    Object.assign(state, { seen: d.seen, fav: d.fav, rating: d.rating, year: d.year });
    const n = visibleFilms().length;
    Object.assign(state, backup);
    return n;
  }

  function initFilters() {
    $('[data-year-grid]').innerHTML = '<button type="button" data-year="all" aria-pressed="true">全部</button>' + years.slice(0, 8).map((y) => `<button type="button" data-year="${y}" aria-pressed="false">${y}</button>`).join('');
    $$('[data-year-grid] button').forEach((b) => b.addEventListener('click', () => {
      $$('[data-year-grid] button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      $('[data-filter-preview]').textContent = countDraft();
    }));
    $$('.filter-body input[type=radio]').forEach((i) => i.addEventListener('change', () => { $('[data-filter-preview]').textContent = countDraft(); }));
  }

  // Event wiring
  document.addEventListener('click', (e) => {
    const homeCat = e.target.closest('[data-home-cat]');
    if (homeCat) {
      state.category = homeCat.dataset.homeCat;
      state.scope = null;
      location.hash = '#library';
      renderLibrary();
      return;
    }
    const cat = e.target.closest('[data-category]');
    if (cat) {
      state.category = cat.dataset.category;
      state.scope = null;
      renderLibrary();
      return;
    }
    const entity = e.target.closest('[data-entity]');
    if (entity) {
      state.entity = entity.dataset.entity;
      state.query = '';
      renderLibrary();
      return;
    }
    const year = e.target.closest('[data-year]');
    if (year) return;
    if (e.target.closest('[data-sort-cycle]')) {
      const sorts = ['添加时间', '发行年份', '名称', '我的评分'];
      state.sort = sorts[(sorts.indexOf(state.sort) + 1) % sorts.length];
      $('[data-sort-cycle]').innerHTML = state.sort + ' <span aria-hidden="true">↓</span>';
      renderLibrary();
      return;
    }
    if (e.target.closest('[data-open-filter]')) { openFilter(); return; }
    if (e.target.closest('[data-close-filter]') || e.target.closest('.drawer-scrim')) { closeFilter(); return; }
    if (e.target.closest('[data-reset-filter]')) {
      $$('.filter-body input[type=radio]').forEach((i) => { i.checked = i.value === 'all'; });
      $$('[data-year-grid] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.year === 'all')));
      $('[data-filter-preview]').textContent = countDraft();
      return;
    }
    if (e.target.closest('[data-apply-filter]')) {
      Object.assign(state, draftState());
      closeFilter();
      renderLibrary();
      return;
    }
    const person = e.target.closest('[data-person]');
    if (person) {
      e.preventDefault();
      openEntity('films', 'actor', person.dataset.person);
      return;
    }
    const series = e.target.closest('[data-series]');
    if (series) {
      e.preventDefault();
      openEntity('films', 'series', series.dataset.series);
      return;
    }
    if (e.target.closest('[data-clear-scope]')) {
      state.scope = null;
      renderLibrary();
      return;
    }
    if (e.target.closest('[data-clear-filters]')) {
      Object.assign(state, { category: 'all', seen: 'all', fav: 'all', rating: 'all', year: 'all', query: '' });
      renderLibrary();
      return;
    }
    if (e.target.closest('[data-open-profile]')) { e.preventDefault(); location.hash = '#profile'; return; }
    if (e.target.closest('[data-open-search]')) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest('[data-close-search]')) { closeSearch(); return; }
    const collection = e.target.closest('[data-collection]');
    if (collection) {
      e.preventDefault();
      state.collectionScope = collection.dataset.collection;
      renderCollections();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    if (e.target.closest('[data-collection-back]')) {
      state.collectionScope = null;
      renderCollections();
      return;
    }
    if (e.target.closest('[data-new-collection]')) { e.preventDefault(); newCollectionModal(); return; }
    if (e.target.closest('[data-new-collection-inline]')) { newCollectionModal(); return; }
    if (e.target.closest('[data-close-web-modal]')) { closeWebModal(); return; }
    if (e.target.closest('[data-create-collection]')) {
      const name = $('[data-new-collection-name]')?.value.trim();
      if (!name) { toast('请填写收藏夹名称'); return; }
      const desc = $('[data-new-collection-desc]')?.value.trim() || '';
      const collection = {
        id: 'col-' + Date.now(), name: name, desc: desc, en: 'Collection',
        cover: 'assets/cinema/843-backdrop.jpg', filmIds: [], count: 0
      };
      VX.collections.unshift(collection);
      closeWebModal();
      renderCollections();
      toast('已创建收藏夹「' + name + '」');
      return;
    }
    if (e.target.closest('[data-save-edition]')) {
      const chosen = $('[data-edition-choose]:checked');
      const filmId = e.target.closest('[data-save-edition]').dataset.saveEdition;
      const film = filmById.get(filmId);
      if (chosen && film) {
        film.editions = film.editions.slice(Number(chosen.dataset.editionChoose)).concat(film.editions.slice(0, Number(chosen.dataset.editionChoose)));
      }
      closeWebModal();
      renderDetail(filmId);
      toast('已切换播放版本');
      return;
    }
    if (e.target.closest('[data-save-collection-picks]')) {
      const filmId = e.target.closest('[data-save-collection-picks]').dataset.saveCollectionPicks;
      $$('[data-collection-pick]').forEach((box) => {
        const c = VX.collections.find((x) => x.id === box.dataset.collectionPick);
        if (!c) return;
        const has = c.filmIds.includes(filmId);
        if (box.checked && !has) c.filmIds.push(filmId);
        if (!box.checked && has) c.filmIds = c.filmIds.filter((id) => id !== filmId);
        c.count = c.filmIds.length;
      });
      closeWebModal();
      renderCollections();
      renderDetail(filmId);
      toast('收藏夹已更新');
      return;
    }
    if (e.target.closest('[data-watched-link]')) {
      e.preventDefault();
      state.seen = 'seen';
      state.scope = null;
      state.category = 'all';
      location.hash = '#library';
      return;
    }
    if (e.target.closest('[data-logout]')) {
      openWebModal([
        '<h2>退出登录</h2><p class="web-modal-sub">这是单账号本机媒体库；退出后需要重新登录。</p>',
        '<div class="web-modal-actions"><button class="web-modal-cancel" data-close-web-modal>取消</button><button class="web-modal-save" data-confirm-logout>退出</button></div>'
      ].join(''));
      return;
    }
    if (e.target.closest('[data-confirm-logout]')) {
      closeWebModal();
      toast('演示环境不执行真实登出');
      return;
    }
  });

  $('[data-search-input]').addEventListener('input', (e) => {
    $('[data-search-results]').innerHTML = searchResults(e.target.value);
  });

  $('[data-search-results]').addEventListener('click', (e) => {
    if (e.target.closest('a')) closeSearch();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      if (!$('[data-web-modal]').hidden) closeWebModal();
      else if (!$('[data-search-layer]').hidden) closeSearch();
      else if (!$('[data-filter-layer]').hidden) closeFilter();
    }
  });

  window.addEventListener('hashchange', renderRoute);

  window.addEventListener('scroll', () => {
    const solid = state.route !== 'discover' && state.route !== 'detail' || window.scrollY > 56;
    $('[data-head]').classList.toggle('is-solid', solid);
  }, { passive: true });

  const toolSearch = $('.tool-icon[data-open-search]');
  if (toolSearch) toolSearch.innerHTML = icon('search', 15);
  const headSearch = $('.head-search');
  if (headSearch) headSearch.insertAdjacentHTML('afterbegin', icon('search', 13));

  initFilters();
  renderHome();
  renderRoute();
})();
