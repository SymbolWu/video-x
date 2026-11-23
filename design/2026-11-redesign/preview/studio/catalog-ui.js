/* One set of domain interactions, adapted to desktop, admin and phone layouts. */
(() => {
  const C = window.VXCatalog, V = window.VX, e = V.esc;
  const titles = {actors:'演员',series:'系列',categories:'分类',folders:'收藏夹'};
  const paths = {actors:'actor',series:'saga',categories:'category',folders:'folder'};
  const portrait = a => `<img class="cx-portrait" src="${e(typeof a.portrait==="string"?a.portrait:"studio/assets/actor-"+(Number(a.portrait)||0)+".svg")}" alt="${e(a.name)}的头像">`;
  const actorLinks = id => C.filmRelations(id).actors.map(a => `<a class="cx-link" href="#actor/${a.id}">${e(a.name)}</a>`).join(' / ') || '<span class="muted">暂无演员资料</span>';
  function create(ctx) {
    const mobile = ctx.mode === 'mobile', admin = ctx.mode === 'admin';
    const lists=window.VXLists?.create(ctx);
    let query = '', categoryFilter = '', activeTab = 'films', sort = 'new', pendingMovie = '';
    let previousPage = '', pendingCategoryHide = null;
    const memberEditing=new Set();
    const action = (a, text, kind='', id='', extra='') => `<button class="btn ${extra.includes('primary')?'primary':'ghost'} small ${extra.replace('primary','')}" data-action="cx-${a}" data-kind="${kind}" data-id="${id}">${text}</button>`;
    const link = (kind, id) => `#${paths[kind]}/${id}`;
    const crumb = (kind, label) => `<a class="cx-crumb" href="#${kind==='folders'?'collections':kind}">${V.icon('back','sm')} ${label || '所有'+titles[kind]}</a>`;
    const heading = (title, sub, button='', kicker='YOUR LIBRARY, CONNECTED.') => `<div class="cx-heading"><div><div class="cx-kicker">${kicker}</div><h1>${e(title)}</h1><p>${e(sub)}</p></div>${button}</div>`;
    const empty = (title, text='把关联补充好，故事就会出现在这里。', button='') => `<div class="cx-empty">${V.icon('film')}<h3>${e(title)}</h3><p>${e(text)}</p>${button}</div>`;
    const wrap = (body, active='library') => mobile ? `<div class="mobile-scroll cx-mobile">${body}</div>${ctx.nav(active)}` : `<section class="cx-surface">${body}</section>`;
    const options = (selected, exclude) => C.data.categories.filter(c => !exclude?.has(c.id)&&(admin||C.visible(c))).map(c => `<option value="${c.id}" ${selected===c.id?'selected':''}>${e(C.categoryPath(c.id))}${!c.visible?' · 已隐藏':''}</option>`).join('');
    const findMovies = ids => ids.map(id => V.movies.find(m => m.id===id)).filter(Boolean);
    const cards = items => items.length ? `<div class="${mobile?'mobile-grid':admin?'cx-film-grid':'poster-grid'}">${items.map(ctx.card).join('')}</div>` : empty('这里还没有影片');
    const sortMovies = items => sort === 'rating' ? [...items].sort((a,b)=>(V.state.ratings[b.id]||0)-(V.state.ratings[a.id]||0)) : items;
    const sortSelect = () => `<select id="cx-sort" aria-label="关联影片排序"><option value="new" ${sort==='new'?'selected':''}>默认顺序</option><option value="rating" ${sort==='rating'?'selected':''}>我的评分</option></select>`;
    const toolbar = (kind, count) => kind==='categories'?`<div class="cx-toolbar"><form class="searchbox" id="cx-search"><input aria-label="搜索分类" name="q" value="${e(query)}" placeholder="搜索分类"></form></div>`:lists.bar(kind,count);

    const filtered = kind => C.data[kind].filter(item => (!query || [item.name,item.detailedName,kind==='categories'?item.code:'',item.description].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())) && (!categoryFilter || C.descendants(categoryFilter).has(item.categoryId || item.id)));
    const entityActions = (kind,id) => `<div class="cx-actions">${action('edit','编辑'+titles[kind],kind,id)}${action('associate',kind==='categories'?'归类影片':'整理关联影片',kind,id)}${kind==='actors'?action('merge','合并重复演员',kind,id):''}${kind==='categories'&&C.find(kind,id).system?'':action('delete',kind==='categories'?'迁移并归档':'归档'+titles[kind],kind,id,'cx-danger')}<a class="btn ghost small" href="#archive">已归档资料</a></div>`;

    function actorCard(a) {
      return `<a class="cx-actor" href="${link('actors',a.id)}">${portrait(a)}<h3>${e(a.name)}</h3><p>${C.forActor(a.id).length} 部影片</p><div class="cx-actor-tag">${e(C.categoryName(a.categoryId))}</div></a>`;
    }
    function actors() {
      const items = VXLists.apply('actors',filtered('actors'));
      const head = heading(admin?'演员维护':'从熟悉的面孔，遇见好故事',admin?'维护常用名、详细名称、头像与分类，并管理参演影片和重复资料。':'沿着一个角色，走向更多值得看的故事。',admin?action('create','＋ 新增演员','actors'):'');
      if (!admin) return wrap(head+toolbar('actors',items.length)+`<div class="cx-actor-grid">${items.map(actorCard).join('') || empty('没有找到这位演员','试试姓名或详细名称。')}</div>`);
      return wrap(head+toolbar('actors',items.length)+`<div class="cx-admin-table-wrap"><table class="cx-admin-table"><thead><tr><th>常用名</th><th>详细名称</th><th>分类</th><th>参演影片</th><th>资料状态</th><th>操作</th></tr></thead><tbody>${items.map(a=>`<tr><td><a class="cx-cell-title" href="${link('actors',a.id)}">${portrait(a)}<span>${e(a.name)}</span></a></td><td>${e(a.detailedName)||'—'}</td><td>${e(C.categoryPath(a.categoryId))}</td><td><a class="cx-link" href="${link('actors',a.id)}">${C.forActor(a.id).length} 部影片</a></td><td><span class="badge ${a.locked?'success':''}">${a.locked?'人工资料已锁定':'来源资料'}</span></td><td><div class="cx-row-tools">${action('edit','编辑','actors',a.id)}${action('associate','关联影片','actors',a.id)}</div></td></tr>`).join('')||'<tr><td colspan="6">没有匹配的演员</td></tr>'}</tbody></table></div>`);
    }
    function actor(id) {
      const a=C.resolveActor(id); if(!a)return missing('actors');id=a.id;
      const films=VXLists.apply('films',C.forActor(id),{defaultSort:'year'});
      return wrap(crumb('actors')+`<div class="cx-profile">${portrait(a)}<div class="cx-profile-info"><div class="cx-kicker">THE PERSON BEHIND THE STORY</div><h1 class="cx-title">${e(a.name)}</h1><p class="cx-alias">${e(a.detailedName)||'演员'}</p><a class="badge" href="#category/${a.categoryId}">${e(C.categoryPath(a.categoryId))}</a>${admin?` <span class="badge success">人工维护资料</span>`:''}</div><div class="cx-count"><strong>${films.length}</strong><p>部影片已收录</p></div></div>${admin?entityActions('actors',id):''}<div class="cx-subhead"><div><h2>参演影片</h2><p>${films.length} 部已收录 · 只展示私人片库中的影片</p></div></div>${lists.bar('films',films.length,{defaultSort:'year'})}${cards(films)}`);
    }
    function seriesCard(s, kind='series') {
      const movies=findMovies(s.movieIds),cover=movies.find(m=>m.id===s.coverId)||movies[0],images=cover?[cover,...movies.filter(m=>m.id!==cover.id)].slice(0,2):[];
      return `<a class="cx-series-card" href="${link(kind,s.id)}"><div class="cx-series-art">${images.map(m=>V.poster(m)).join('')}<span class="cx-stack-count">${movies.length} 部影片${kind==='series'?' · 按系列顺序':''}</span></div><div class="cx-series-copy"><h3>${e(s.name)}</h3><p>${e(s.description)||'为喜欢的故事，留一个位置。'}</p><div class="cx-footer"><span>${kind==='series'?e(C.categoryName(s.categoryId)):'私人收藏夹'}</span><span>进入${titles[kind]} ↗</span></div></div></a>`;
    }
    function series() {
      const items=VXLists.apply('series',filtered('series'));
      return wrap(heading(admin?'系列维护':'一个故事，还有下一章',admin?'维护系列资料、封面与分类，整理影片的展示顺序。':'把相连的故事放在一起，按顺序慢慢看。',admin?action('create','＋ 新增系列','series'):'')+toolbar('series',items.length)+`<div class="cx-series-grid">${items.map(s=>seriesCard(s)).join('')||empty('还没有找到这个系列')}</div>`);
    }
    function movieRows(kind,entity,editable) {
      const canEdit=editable; if(admin)editable=canEdit&&memberEditing.has(kind+':'+entity.id);
      const source=findMovies(entity.movieIds),options={orderIds:entity.movieIds,relation:kind,relationDates:entity.addedAt},films=editable?source:VXLists.apply('films',source,options);
      const modeButton=admin&&canEdit?`<button class="btn ghost small" data-action="cx-member-mode" data-kind="${kind}" data-id="${entity.id}">${editable?'完成整理':'整理成员顺序'}</button>`:'';
      const tools=modeButton+(editable?'<p class="vl-edit-note">整理模式显示全部成员与保存的顺序；浏览筛选和排序暂不应用。</p>':lists.bar('films',films.length,options));
      return tools+(films.length?`<div class="cx-ordered">${films.map((m,index)=>`<div class="cx-movie-row"><span class="cx-number">${String(index+1).padStart(2,'0')}</span><a href="${admin?'#edit/':'#detail/'}${m.id}">${V.poster(m)}</a><div class="grow"><a href="${admin?'#edit/':'#detail/'}${m.id}"><h3>${e(m.title)}</h3></a><p>${m.year??'年份未知'} · ${V.category(m.id)} · ${m.duration} 分钟</p></div><div class="cx-row-actions">${editable?`<button class="cx-order-btn" data-action="cx-move-film" data-kind="${kind}" data-id="${entity.id}" data-movie="${m.id}" data-delta="-1" ${index===0?'disabled':''} aria-label="上移${e(m.title)}">↑</button><button class="cx-order-btn" data-action="cx-move-film" data-kind="${kind}" data-id="${entity.id}" data-movie="${m.id}" data-delta="1" ${index===films.length-1?'disabled':''} aria-label="下移${e(m.title)}">↓</button><button class="icon-btn cx-danger" data-action="cx-remove-film" data-kind="${kind}" data-id="${entity.id}" data-movie="${m.id}" aria-label="从${titles[kind]}移出${e(m.title)}">${V.icon('close','sm')}</button>`:`<a class="btn ghost small" href="${admin?'web.html':''}#player/${m.id}">${V.icon('play','sm')} 播放</a>`}</div></div>`).join('')}</div>`:empty('这里还没有影片','添加影片后，就能从这里继续观看。',editable?action('associate','＋ 添加影片',kind,entity.id):''));
    }
    function saga(id) {
      const s=C.find('series',id);if(!s)return missing('series');
      const cover=V.movies.find(m=>m.id===(s.coverId||s.movieIds[0]));
      return wrap(crumb('series')+`<div class="cx-banner">${cover?V.poster(cover):''}<div class="cx-kicker">STORIES THAT BELONG TOGETHER</div><h1>${e(s.name)}</h1><p>${e(s.description)}</p><span class="badge">${s.movieIds.length} 部影片</span> <a class="badge" href="#category/${s.categoryId}">${e(C.categoryPath(s.categoryId))}</a>${admin?` <span class="badge">系列资料</span>`:''}</div>${admin?entityActions('series',id):s.movieIds.length?`<div class="cx-actions"><a class="btn primary" href="#player/${s.movieIds[0]}">${V.icon('play','sm')} 播放第一部</a></div>`:''}<div class="cx-subhead"><div><h2>系列影片</h2><p>${admin?'进入整理模式后可调整保存顺序；浏览排序不改写关系。':'沿着系列顺序，一部接一部。'}</p></div></div>${movieRows('series',s,admin)}`);
    }
    function categories() {
      const items=filtered('categories').filter(c=>admin||C.visible(c));
      return wrap(heading(admin?'分类维护':'按自己的方式，收藏世界',admin?'分类是影片、演员和系列共享的资料分区，可设置父级、可见性和显示顺序。':'从一个分类开始，找到今天想进入的世界。',admin?action('create','＋ 新增分类','categories'):'')+(admin?`<div class="cx-hint">分类可按喜剧片、动作片等组织和筛选。隐藏用于收起暂时没有影片的入口；已有影片时先提示数量，不会删除影片。</div>`:'')+toolbar('categories',items.length)+`<div class="cx-category-grid">${items.map(c=>{const counts=C.forCategory(c.id);return `<section class="cx-category ${!c.visible?'hidden-category':''}"><a href="${link('categories',c.id)}"><div class="cx-category-icon">${V.icon(c.parentId?'folder':'grid')}</div><div class="cx-path">${c.parentId?e(C.categoryPath(c.parentId)):'LIBRARY CATEGORY'}${admin&&!c.visible?' · 已隐藏':''}</div><h3>${e(c.name)}</h3><p>${e(c.description)||'整理好资料，让每个故事都有归处。'}</p><div class="cx-category-meta"><span>${counts.films.length} 部影片</span><span>${counts.actors.length} 位演员</span><span>${counts.series.length} 个系列</span></div></a>${admin?`<div class="cx-actions" style="margin-bottom:0">${action('edit','编辑','categories',c.id)}${action('visibility',c.visible?'隐藏入口':'显示入口','categories',c.id)}<button class="cx-order-btn" aria-label="上移分类${e(c.name)}" data-action="cx-move-entity" data-kind="categories" data-id="${c.id}" data-delta="-1" ${C.data.categories.indexOf(c)===0?'disabled':''}>↑</button><button class="cx-order-btn" aria-label="下移分类${e(c.name)}" data-action="cx-move-entity" data-kind="categories" data-id="${c.id}" data-delta="1" ${C.data.categories.indexOf(c)===C.data.categories.length-1?'disabled':''}>↓</button></div>`:''}</section>`;}).join('')||empty('没有匹配的分类')}</div>`);
    }
    function category(id) {
      const c=C.find('categories',id);if(!c||(!admin&&!C.visible(c)))return missing('categories');
      const raw=C.forCategory(id),items=Object.fromEntries(Object.entries(raw).map(([k,rows])=>[k,VXLists.apply(k,rows,{params:new URLSearchParams([...VXLists.route().p].filter(([key])=>key!=='category'))})])), sub=C.data.categories.filter(x=>x.parentId===id&&(admin||C.visible(x)));
      const tabs=[['films','影片',items.films.length],['actors','演员',items.actors.length],['series','系列',items.series.length]];
      return wrap(crumb('categories')+heading(c.name,c.description,'',e(C.categoryPath(id)))+`${sub.length?`<div class="cx-inline-explore">${sub.map(x=>`<a href="#category/${x.id}">${e(x.name)} ${V.icon('chevron','sm')}</a>`).join('')}</div>`:''}${admin?entityActions('categories',id):''}<div class="cx-tabs" role="tablist" aria-label="分类资料类型">${tabs.map(([key,name,count])=>`<button class="${activeTab===key?'active':''}" role="tab" aria-selected="${activeTab===key}" data-action="cx-tab" data-value="${key}">${name} <span class="muted">${count}</span></button>`).join('')}</div>${lists.bar(activeTab,items[activeTab].length,{locked:['category']})}${activeTab==='actors'?`<div class="cx-actor-grid">${items.actors.map(actorCard).join('')||empty('这里还没有演员')}</div>`:activeTab==='series'?`<div class="cx-series-grid">${items.series.map(s=>seriesCard(s)).join('')||empty('这里还没有系列')}</div>`:cards(sortMovies(items.films))}${sub.length?'<p class="tiny muted" style="margin-top:23px">当前列表包含子分类中的资料。</p>':''}`);
    }
    function transfer(id){const f=C.find('folders',id);if(!f)return;ctx.open('复制或移动收藏夹成员',`<p class="cx-hint">先添加到目标收藏夹；移动时再从当前收藏夹移除。喜欢、评分、其他收藏夹和观看记录保留。</p><div class="vx-checks">${f.movieIds.map(mid=>`<label><input type="checkbox" data-transfer-film value="${mid}">${e(V.movie(mid).title)}</label>`).join('')}</div><label>目标收藏夹<select id="cx-transfer-target">${C.data.folders.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${e(x.name)}</option>`).join('')}</select></label><label>操作<select id="cx-transfer-mode"><option value="copy">复制到目标</option><option value="move">移动到目标</option></select></label>`,action('close','取消')+action('transfer-save','确认操作','folders',id,'primary'));}
    document.addEventListener('click',ev=>{const el=ev.target.closest('[data-action="cx-transfer"], [data-action="cx-transfer-save"]');if(!el)return;const id=el.dataset.id;if(el.dataset.action==='cx-transfer')return transfer(id);const f=C.find('folders',id),target=C.find('folders',document.getElementById('cx-transfer-target').value),ids=[...document.querySelectorAll('[data-transfer-film]:checked')].map(x=>x.value);if(!target||target.id===id||!ids.length)return V.toast('请选择影片和其他目标收藏夹');const move=document.getElementById('cx-transfer-mode').value==='move';target.addedAt||={};for(const mid of ids)if(!target.movieIds.includes(mid)){target.movieIds.push(mid);target.addedAt[mid]=new Date().toISOString();}if(move){f.movieIds=f.movieIds.filter(mid=>!ids.includes(mid));if(!f.movieIds.includes(f.coverId))f.coverId=f.movieIds[0]||'';for(const mid of ids)delete f.addedAt?.[mid];}C.persist();ctx.close();ctx.refresh();V.toast(move?'已移动选中影片':'已复制选中影片');});
    function folders() {
      const items=VXLists.apply('folders',filtered('folders'));
      return wrap(heading(admin?'收藏夹维护':'喜欢的故事，都留在这里',admin?'维护私人收藏夹、说明和影片顺序；收藏夹与系列分别管理。':'“我喜欢的”用于快速收藏，收藏夹用于按自己的方式整理。',action('create','＋ 新建收藏夹','folders'),'KEEP THE GOOD STORIES.')+toolbar('folders',items.length)+`<div class="cx-series-grid">${items.map(f=>seriesCard(f,'folders')).join('')||empty('创建你的第一个收藏夹','为某个周末、某种心情，整理一组故事。',action('create','新建收藏夹','folders'))}</div>`,'collections');
    }
    function folder(id) {
      const f=C.find('folders',id);if(!f)return missing('folders');
      return wrap(crumb('folders')+`<div class="cx-folder-head"><div class="cx-folder-icon">${V.icon('bookmark')}</div>${heading(f.name,f.description||'留给自己的一组好故事','','PERSONAL COLLECTION')}</div><div class="cx-actions">${action('associate','＋ 添加 / 整理影片','folders',id)}${action('edit','编辑收藏夹','folders',id)+action('transfer','复制 / 移动影片','folders',id)}${action('delete','删除收藏夹','folders',id,'cx-danger')}</div><div class="cx-subhead"><div><h2>${f.movieIds.length} 部影片</h2><p>上下调整顺序；移出收藏夹会保留影片和其他收藏关系。</p></div>${!admin&&f.movieIds.length?`<a class="btn primary small" href="#player/${f.movieIds[0]}">${V.icon('play','sm')} 开始观看</a>`:''}</div>${movieRows('folders',f,true)}`,'collections');
    }
    function missing(kind) {return wrap(crumb(kind)+empty('这份资料暂时无法打开','它可能已经被合并、删除，或隐藏了分类入口。'));}
    function render(page,id) {
      if (page!==previousPage) {query='';categoryFilter='';activeTab='films';previousPage=page;}
      if(page==='actors')return actors();if(page==='actor')return actor(id);
      if(page==='series')return series();if(page==='saga')return saga(id);
      if(page==='categories')return categories();if(page==='category')return category(id);
      if(page==='collections')return folders();if(page==='folder')return folder(id);
      if(page==='archive')return wrap(heading('已归档资料','恢复资料会保留原来的身份与关联；分类恢复不会撤销已完成的迁移。')+`<div class="cx-ordered">${C.data.archives.map(x=>`<div class="cx-movie-row"><div class="grow"><h3>${e(x.entry.name)}</h3><p>${titles[x.kind]} · 已归档</p></div>${action('restore','恢复资料',x.kind,x.entry.id)}</div>`).join('')||empty('暂时没有归档资料')}</div>`);
      return null;
    }
    const field = (label,html,full=false) => `<label class="${full?'cx-full':''}">${label}${html}</label>`;
    const input = (id,value='',placeholder='',other='') => `<input id="${id}" value="${e(value)}" placeholder="${e(placeholder)}" maxlength="100" ${other}>`;
    const modalActions = (label,actionName,kind,id) => `${action('close','取消')}${action(actionName,label,kind,id,'primary')}`;
    const show = (title,body,buttons='') => ctx.open(title,body+`<p class="cx-error" role="status" id="cx-error"></p>`,buttons);
    const value = id => document.getElementById(id)?.value.trim() || '';
    const selected = selector => [...document.querySelectorAll(selector)].filter(x=>x.checked).map(x=>x.value);
    function edit(kind,id,draft) {
      const item=draft||C.find(kind,id)||{name:'',code:`LOCAL-${Date.now().toString(36).toUpperCase()}`,categoryId:'unsorted',parentId:'',visible:true,portrait:0,gender:'女'};
      let body=field(kind==='actors'?'常用名':titles[kind]+'名称',input('cx-name',item.name,kind==='folders'?'例如：一个人的周末':''),true);
      if(kind==='categories')body+=field('分类编码',input('cx-code',item.code,'',id?'readonly':''));
      if(kind!=='folders')body+=field(kind==='categories'?'父级分类':'所属分类',`<select id="cx-category">${kind==='categories'?`<option value="">无父级分类</option>${options(item.parentId,C.descendants(id))}`:options(item.categoryId)}</select>`);
      if(kind==='actors')body+=field('详细名称',input('cx-detailed-name',item.detailedName||'','保留原始完整名称，不拆分'),true)+field('性别',`<select id="cx-gender">${['女','男','未指定'].map(g=>`<option ${item.gender===g?'selected':''}>${g}</option>`).join('')}</select>`)+field('资料策略','<span class="badge success">人工修改后锁定</span>')+field('头像',`<div class="cx-portraits">${typeof item.portrait==="string"?'<label class="cx-portrait-choice"><img src="'+e(item.portrait)+'" alt="当前头像"><input type="radio" name="cx-portrait" value="current" checked>当前头像</label>':''}${[0,1,2,3].map(n=>`<label class="cx-portrait-choice"><img src="studio/assets/actor-${n}.svg" alt="演示头像 ${n+1}"><input type="radio" name="cx-portrait" value="${n}" ${Number(item.portrait)===n?'checked':''} aria-label="演示头像 ${n+1}"></label>`).join('')}</div>`,true);
      if(kind!=='actors')body+=field(titles[kind]+'说明',`<textarea id="cx-description" rows="3" maxlength="500">${e(item.description||'')}</textarea>`,true);
      if(kind==='categories')body+=field('浏览入口',`<select id="cx-visible"><option value="true" ${item.visible?'selected':''}>显示</option><option value="false" ${!item.visible?'selected':''}>隐藏</option></select><span class="cx-hint">可隐藏暂时没有影片的分类。有影片时会在保存前提示，确认后仍可隐藏。</span>`,true);
      if(['series','folders'].includes(kind)&&item.movieIds?.length)body+=field('封面影片',`<select id="cx-cover">${findMovies(item.movieIds).map(m=>`<option value="${m.id}" ${(item.coverId||item.movieIds[0])===m.id?'selected':''}>${e(m.title)}</option>`).join('')}</select>`,true);
      show((id?'编辑':'新增')+titles[kind],`<div class="cx-form-grid">${body}</div>${kind==='actors'&&id?'<p class="cx-hint">修改姓名不会断开影片关联；详细名称可用于搜索。头像为本地演示素材。</p>':''}`,modalActions('保存资料','save',kind,id||''));
    }
    function saveCategory(id,values,returnToEdit=false,confirmedMovieIds=null) {
      const current=C.find('categories',id);
      if(id&&!current)throw new Error('分类资料已变更，请刷新后重试');
      // Only published prototype films count; include hidden descendants as well.
      const movieIds=id?[...new Set(C.forCategory(id).films.map(m=>m.id))].sort():[];
      if(current?.visible&&!values.visible&&movieIds.length&&JSON.stringify(movieIds)!==JSON.stringify(confirmedMovieIds)) {
        const direct=movieIds.filter(mid=>C.data.films[mid]?.categoryId===id).length;
        pendingCategoryHide={id,values:{...values},returnToEdit,movieIds};
        show('分类下还有影片',`<p class="cx-hint">「${e(values.name)}」及其子分类下有 <strong>${movieIds.length}</strong> 部影片（本级 ${direct} 部，子分类 ${movieIds.length-direct} 部）。</p><p class="cx-hint">隐藏后将收起这个分类及其子分类的浏览入口，影片仍可从全部片库、搜索和演员页找到。是否继续隐藏？</p>`,`${action('cancel-category-hide',returnToEdit?'返回编辑':'取消')}${action('confirm-category-hide','继续隐藏','categories',id,'primary')}`);
        return;
      }
      const entry=C.upsert('categories',id,values);
      pendingCategoryHide=null;ctx.close();
      V.toast(values.visible?'分类入口已显示':'分类入口已隐藏');
      if(!id)location.hash=link('categories',entry.id);
    }
    function associate(kind,id) {
      const entry=C.find(kind,id);if(!entry)return;
      const checked=kind==='actors'?C.forActor(id).map(m=>m.id):kind==='categories'?V.movies.filter(m=>C.data.films[m.id].categoryId===id).map(m=>m.id):entry.movieIds;
      show(kind==='categories'?'归类影片':'整理关联影片',`<p class="muted small" style="margin-top:12px">${e(entry.name)} · 勾选需要关联的影片</p><input id="cx-picker-search" placeholder="搜索影片" aria-label="筛选可关联影片" style="width:100%;margin-top:15px"><div class="cx-pick-list">${V.movies.map(m=>`<label class="cx-pick-row" data-search="${e((m.title).toLowerCase())}">${V.poster(m)}<span>${e(m.title)}<p>${m.year??'年份未知'} · ${V.category(m.id)}${kind==='categories'?' · '+e(C.categoryName(C.data.films[m.id].categoryId)):''}</p></span><input type="checkbox" data-cx-pick value="${m.id}" ${checked.includes(m.id)?'checked':''} aria-label="关联${e(m.title)}"></label>`).join('')}</div><p class="cx-hint">${kind==='categories'?'这里只调整直接属于此分类的影片。取消勾选会移入“未分类”，子分类的其他影片不受影响。':'取消勾选只解除当前关联，影片本身会保留。原有影片顺序保留，新添加的排在末尾。'}</p>`,modalActions('保存关联','save-association',kind,id));
    }
    function deletion(kind,id) {
      const item=C.find(kind,id);if(!item)return;
      const counts=kind==='categories'?C.forCategory(id):null;
      let text=kind==='actors'?`${C.forActor(id).length} 部参演影片仍会保留。演员将从观看入口隐藏，恢复后参演关系和个人收藏会重新出现。`:kind==='series'?`系列及 ${item.movieIds.length} 部影片的顺序会保留，可以在已归档资料中恢复。`:kind==='folders'?`收藏夹及其 ${item.movieIds.length} 条影片关联将归档。影片、播放记录和“喜欢的影片”会保留，可恢复收藏夹。`:`直接归属本分类的资料将迁移，子分类提升到原父级。含后代共 ${counts.films.length} 部影片、${counts.actors.length} 位演员、${counts.series.length} 个系列；恢复分类不会撤销迁移。`;
      show('归档'+titles[kind],`<p style="margin-top:18px;font-size:15px">${e(item.name)}</p><p class="cx-hint">${e(text)}</p>${kind==='categories'?`<label style="display:grid;gap:9px;margin-top:18px;font-size:12px">迁移到分类<select id="cx-migration">${options('unsorted',C.descendants(id))}</select></label>`:''}`,modalActions(kind==='categories'?'迁移并归档':'确认归档','confirm-delete',kind,id));
    }
    function folderPicker(movieId) {
      pendingMovie=movieId;
      show('加入收藏夹',`<p class="muted small" style="margin-top:13px">${e(V.movie(movieId).title)} · 可加入多个收藏夹</p><div class="cx-pick-list">${C.data.folders.map(f=>`<label class="cx-pick-row"><span>${e(f.name)}<p>${f.movieIds.length} 部影片</p></span><input type="checkbox" value="${f.id}" data-cx-folder ${f.movieIds.includes(movieId)?'checked':''} aria-label="加入${e(f.name)}"></label>`).join('')||'<p style="padding:16px">还没有收藏夹，先创建一个吧。</p>'}</div><div class="cx-actions">${action('create-for-film','＋ 新建收藏夹','folders')}</div>`,modalActions('保存到收藏夹','save-folder-picker','folders',movieId));
    }
    function filmRelations(id) {
      const r=C.filmRelations(id);
      return `<section class="cx-details-relations"><div class="cx-label">探索关联资料</div><div class="cx-relation-links">${r.series.map(s=>`<a href="#saga/${s.id}">${V.icon('library','sm')}${e(s.name)}</a>`).join('')}${r.category?`<a href="#category/${r.category.id}">${V.icon('grid','sm')}${e(C.categoryPath(r.category.id))}</a>`:''}</div></section>`;
    }
    function filmEditor(id) {
      const r=C.filmRelations(id);
      show('维护影片关联',`<p class="muted small" style="margin-top:13px">${e(V.movie(id).title)} · 一部影片可以关联多位演员、多个系列和多个收藏夹。</p><label style="display:grid;gap:9px;margin-top:17px;font-size:12px">资料分类<select id="cx-film-category">${options(r.category?.id||'unsorted')}</select></label><h3 style="font-size:13px;margin-top:21px">演员</h3><div class="cx-pick-list">${C.data.actors.map(a=>`<label class="cx-pick-row"><span>${e(a.name)}${a.detailedName?`<p>${e(a.detailedName)}</p>`:''}</span><input type="checkbox" data-cx-actor value="${a.id}" ${r.actors.some(x=>x.id===a.id)?'checked':''} aria-label="关联演员${e(a.name)}"></label>`).join('')}</div><h3 style="font-size:13px;margin-top:21px">系列</h3><div class="cx-pick-list">${C.data.series.map(s=>`<label class="cx-pick-row"><span>${e(s.name)}</span><input type="checkbox" data-cx-series value="${s.id}" ${r.series.some(x=>x.id===s.id)?'checked':''} aria-label="关联系列${e(s.name)}"></label>`).join('')}</div>`,modalActions('保存影片关联','save-film-relations','',id));
    }
    function perform(el) {
      const a=el.dataset.action.slice(3),kind=el.dataset.kind,id=el.dataset.id;
      if(a==='close'){pendingMovie='';pendingCategoryHide=null;ctx.close();return;}
      if(a==='create'||a==='edit'){pendingMovie='';pendingCategoryHide=null;edit(kind,a==='edit'?id:'');return;}
      if(a==='create-for-film'){edit('folders','');return;}
      if(a==='save') {
        const values={name:value('cx-name')};
        if(kind==='categories')values.code=value('cx-code');
        if(kind==='actors')Object.assign(values,{detailedName:value('cx-detailed-name'),gender:value('cx-gender'),categoryId:value('cx-category'),locked:true,portrait:((v)=>v==='current'?C.find('actors',id)?.portrait:Number(v||0))(selected('input[name="cx-portrait"]')[0])});
        else values.description=value('cx-description');
        if(kind==='series')values.categoryId=value('cx-category');
        if(kind==='categories')Object.assign(values,{parentId:value('cx-category'),visible:value('cx-visible')==='true'});
        if(document.getElementById('cx-cover'))values.coverId=value('cx-cover');
        if(kind==='categories'){saveCategory(id,values,true);return;}
        const entry=C.upsert(kind,id,values);ctx.close();V.toast(titles[kind]+'已保存');
        if(pendingMovie&&kind==='folders'){folderPicker(pendingMovie);return;}
        if(!id)location.hash=link(kind,entry.id);
        return;
      }
      if(a==='associate'){associate(kind,id);return;}
      if(a==='save-association'){const ids=selected('[data-cx-pick]');C.setMovies(kind,id,ids);ctx.close();V.toast('影片关联已保存');return;}
      if(a==='move-film'){C.reorder(kind,id,el.dataset.movie,Number(el.dataset.delta));return;}
      if(a==='move-entity'){C.reorder(kind,id,null,Number(el.dataset.delta));return;}
      if(a==='remove-film'){const item=C.find(kind,id);C.setMovies(kind,id,item.movieIds.filter(x=>x!==el.dataset.movie));V.toast('已移出'+titles[kind]+'，影片保留');return;}
      if(a==='delete'){deletion(kind,id);return;}
      if(a==='confirm-delete'){C.archive(kind,id,value('cx-migration'));ctx.close();location.hash=kind==='folders'?'collections':kind;V.toast(titles[kind]+'已归档，可在已归档资料中恢复');return;}
      if(a==='restore'){C.restore(kind,id);V.toast('资料已恢复');return;}
      if(a==='visibility'){const c=C.find('categories',id);if(!c)throw new Error('分类资料已变更，请刷新后重试');saveCategory(id,{...c,visible:!c.visible});return;}
      if(a==='cancel-category-hide'){const pending=pendingCategoryHide;pendingCategoryHide=null;if(pending?.returnToEdit)edit('categories',pending.id,pending.values);else ctx.close();return;}
      if(a==='confirm-category-hide'){const pending=pendingCategoryHide;if(!pending||pending.id!==id)return;const values=pending.returnToEdit?pending.values:{...C.find('categories',id),visible:false};saveCategory(id,values,pending.returnToEdit,pending.movieIds);return;}
      if(a==='tab'){activeTab=el.dataset.value;ctx.refresh();return;}
      if(a==='merge') {
        const source=C.find('actors',id);
        show('选择合并目标',`<p class="cx-hint">把「${e(source.name)}」作为重复资料合并，下一步核对字段和影片影响。</p><label style="display:grid;gap:9px;font-size:12px">保留的演员<select id="cx-merge-target">${C.data.actors.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${e(x.name)}${x.detailedName?' · '+e(x.detailedName):''}</option>`).join('')}</select></label>`,modalActions('预览合并影响','preview-merge','actors',id));return;
      }
      if(a==='preview-merge'){
        const target=value('cx-merge-target'),source=C.find('actors',id),dest=C.find('actors',target);
        if(!dest)throw new Error('请选择有效的目标演员');
        const merged=new Set([...C.forActor(id),...C.forActor(target)].map(m=>m.id));
        show('核对合并影响',`<input type="hidden" id="cx-merge-target" value="${target}"><div class="cx-hint">${e(source.name)} → ${e(dest.name)}<br>合并后 ${merged.size} 部不同影片；分别选择两个名称字段；个人收藏与旧链接保留。合并后不能一键拆回，请确认目标。</div><div class="cx-form-grid">${[['name','常用名'],['detailedName','详细名称'],['portrait','头像'],['gender','性别'],['categoryId','分类']].map(([key,label])=>field(label,`<select data-merge-field="${key}"><option value="target">保留目标：${e(key==='portrait'?'目标头像':key==='categoryId'?C.categoryName(dest[key]):dest[key]||'未填写')}</option><option value="source">采用来源：${e(key==='portrait'?'来源头像':key==='categoryId'?C.categoryName(source[key]):source[key]||'未填写')}</option></select>`,true)).join('')}</div>`,modalActions('确认合并','confirm-merge','actors',id));return;
      }
      if(a==='confirm-merge'){const target=value('cx-merge-target'),source=C.find('actors',id),fields={};document.querySelectorAll('[data-merge-field]').forEach(x=>{if(x.value==='source')fields[x.dataset.mergeField]=source[x.dataset.mergeField];});C.mergeActor(id,target,fields);ctx.close();location.hash='actor/'+target;V.toast('资料、影片关联和演员收藏已合并');return;}
      if(a==='folder-picker'){folderPicker(id);return;}
      if(a==='save-folder-picker') {
        const ids=selected('[data-cx-folder]');
        C.data.folders.forEach(f=>{if(ids.includes(f.id)&&!f.movieIds.includes(id))f.movieIds.push(id);if(!ids.includes(f.id))f.movieIds=f.movieIds.filter(mid=>mid!==id);if(!f.movieIds.includes(f.coverId))f.coverId=f.movieIds[0]||'';});
        C.persist();pendingMovie='';ctx.close();V.toast('收藏夹已更新');return;
      }
      if(a==='film-relations'){filmEditor(id);return;}
      if(a==='save-film-relations') {
        const actors=selected('[data-cx-actor]'),series=selected('[data-cx-series]'),category=value('cx-film-category');
        const archivedActors=(C.data.films[id]?.actorIds||[]).filter(actorId=>C.data.archives.some(x=>x.kind==='actors'&&x.entry.id===actorId));
        C.data.films[id]={...C.data.films[id],actorIds:[...actors,...archivedActors],categoryId:category};
        C.data.series.forEach(s=>{const included=s.movieIds.includes(id);if(series.includes(s.id)&&!included)s.movieIds.push(id);if(!series.includes(s.id))s.movieIds=s.movieIds.filter(mid=>mid!==id);if(!s.movieIds.includes(s.coverId))s.coverId=s.movieIds[0]||'';});
        C.persist();ctx.close();V.toast('演员、系列与分类关联已保存');
      }
    }
    document.addEventListener('click',event=>{
      const el=event.target.closest('[data-action^="cx-"]');if(!el)return;
      event.preventDefault();
      if(el.dataset.action==='cx-member-mode'){const key=el.dataset.kind+':'+el.dataset.id;memberEditing.has(key)?memberEditing.delete(key):memberEditing.add(key);ctx.refresh();return;}
      try{perform(el);}catch(error){const output=document.getElementById('cx-error');if(output)output.textContent=error.message;else V.toast(error.message);}
    });
    document.addEventListener('submit',event=>{if(event.target.id!=='cx-search')return;event.preventDefault();query=new FormData(event.target).get('q').trim();ctx.refresh();});
    document.addEventListener('change',event=>{if(event.target.id==='cx-category-filter'){categoryFilter=event.target.value;ctx.refresh();}if(event.target.id==='cx-sort'){sort=event.target.value;ctx.refresh();}});
    document.addEventListener('input',event=>{if(event.target.id!=='cx-picker-search')return;const term=event.target.value.toLowerCase();document.querySelectorAll('.cx-pick-row[data-search]').forEach(row=>{row.style.setProperty('display',row.dataset.search.includes(term)?'flex':'none','important');});});
    return {render,filmRelations,folderPicker,filmEditor,actorCard,seriesCard,movieRows,lists};
  }
  window.VXCatalogUI={create,actorLinks};
})();
