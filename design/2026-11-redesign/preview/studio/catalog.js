/* Shared, local-only domain model for the three prototype surfaces. */
(() => {
  const V = window.VX;
  const copy = value => JSON.parse(JSON.stringify(value));
  const initial=StudioSamples.catalog;
  const data = V.read('catalog-v2', copy(initial));
  [...data.actors,...(data.archives||[]).filter(x=>x.kind==='actors').map(x=>x.entry)].forEach(a=>{a.detailedName??='';delete a.aliases;delete a.bio;delete a.code;});
  data.series.forEach(s=>delete s.code);
  data.actorFavorites ||= ['actor-1'];
  data.archives ||= [];
  data.redirects ||= {};
  const find = (kind, id) => data[kind]?.find(item => item.id === id);
  const uid = kind => `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  const descendants = id => {
    const found = new Set([id]);
    for (let i = 0; i < data.categories.length; i++) data.categories.forEach(c => { if (found.has(c.parentId)) found.add(c.id); });
    return found;
  };
  const visible = c => {
    const seen = new Set();
    while (c) {
      if (!c.visible || seen.has(c.id)) return false;
      seen.add(c.id); c = find('categories', c.parentId);
    }
    return true;
  };
  const categoryName = id => find('categories', id)?.name || '未分类';
  const categoryPath = id => {
    const parts = [], seen = new Set(); let c = find('categories', id);
    while (c && !seen.has(c.id)) { seen.add(c.id); parts.unshift(c.name); c = find('categories', c.parentId); }
    return parts.join(' / ');
  };
  const forActor = id => V.movies.filter(m => data.films[m.id]?.actorIds.includes(id));
  const forCategory = id => {
    const ids = descendants(id);
    return {
      films: V.movies.filter(m => ids.has(data.films[m.id]?.categoryId)),
      actors: data.actors.filter(a => ids.has(a.categoryId)),
      series: data.series.filter(s => ids.has(s.categoryId))
    };
  };
  const sync = () => {
    V.movies.forEach(m => { m.cast = (data.films[m.id]?.actorIds || []).map(id => find('actors', id)?.name).filter(Boolean); });
    V.state.collections = Object.fromEntries(data.folders.map(f => [f.name, [...f.movieIds]]));
  };
  const persist = () => {
    sync();
    localStorage.setItem('vx-studio-1-catalog-v2', JSON.stringify(data));
    V.save('collections');
    window.dispatchEvent(new CustomEvent('vx:catalog'));
  };
  const validate = (kind, values, id) => {
    if (!values.name?.trim()) throw new Error('请填写名称');
    if (kind === 'folders' && data.folders.some(x => x.id !== id && x.name.toLowerCase() === values.name.trim().toLowerCase())) throw new Error('这个收藏夹名称已经存在');
    if (values.code && data[kind].some(x => x.id !== id && x.code.toLowerCase() === values.code.trim().toLowerCase())) throw new Error('这个资料编码已经存在');
    if (kind === 'categories' && !values.code?.trim()) throw new Error('请填写资料编码');
    if (kind === 'categories' && id && descendants(id).has(values.parentId)) throw new Error('不能将分类移动到自身或子分类中');
  };
  const upsert = (kind, id, values) => {
    validate(kind, values, id);
    const existing = find(kind, id);
    if (existing) Object.assign(existing, values, {id:existing.id, ...(existing.code ? {code:existing.code} : {})});
    else data[kind].push({...values, createdAt:new Date().toISOString(), id:uid(kind), ...(kind === 'series' || kind === 'folders' ? {movieIds:[],coverId:''} : {})});
    persist();
    return existing || data[kind].at(-1);
  };
  const setMovies = (kind, id, ids) => {
    if (kind === 'actors') V.movies.forEach(m => {
      const link = data.films[m.id];
      if (!ids.includes(m.id)) link.actorIds = link.actorIds.filter(a => a !== id);
      else if (!link.actorIds.includes(id)) link.actorIds.push(id);
    });
    else if (kind === 'categories') V.movies.forEach(m => {
      const link = data.films[m.id];
      if (ids.includes(m.id)) link.categoryId = id;
      else if (link.categoryId === id) link.categoryId = 'unsorted';
    });
    else {
      const entity = find(kind, id);
      entity.addedAt ||= {}; for(const mid of ids)if(!entity.movieIds.includes(mid))entity.addedAt[mid]=new Date().toISOString();for(const mid of entity.movieIds)if(!ids.includes(mid))delete entity.addedAt[mid];
      entity.movieIds = [...entity.movieIds.filter(mid => ids.includes(mid)), ...ids.filter(mid => !entity.movieIds.includes(mid))];
      if (!entity.movieIds.includes(entity.coverId)) entity.coverId = entity.movieIds[0] || '';
    }
    persist();
  };
  const reorder = (kind, id, movieId, delta) => {
    const list = movieId ? find(kind, id).movieIds : data[kind];
    if(kind==='categories'&&!movieId){
      const siblings=list.filter(x=>x.parentId===find(kind,id)?.parentId),index=siblings.findIndex(x=>x.id===id),other=siblings[index+delta];
      if(!other)return;
      const left=list.findIndex(x=>x.id===id),right=list.indexOf(other);
      [list[left],list[right]]=[list[right],list[left]];persist();return;
    }
    const index = movieId ? list.indexOf(movieId) : list.findIndex(x => x.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]]; persist();
  };
  const remove = (kind, id, target) => {
    const entry = find(kind, id);
    if (!entry) return;
    if (kind === 'categories') {
      if (entry.system) throw new Error('未分类是系统保留项');
      if (!find('categories', target) || descendants(id).has(target)) throw new Error('请选择当前分类分支之外的迁移目标');
      Object.values(data.films).forEach(link => { if (link.categoryId === id) link.categoryId = target; });
      [...data.actors, ...data.series].forEach(item => { if (item.categoryId === id) item.categoryId = target; });
      data.archives.forEach(snapshot=>{if(snapshot.entry.categoryId===id)snapshot.entry.categoryId=target;});
      data.categories.forEach(c => { if (c.parentId === id) c.parentId = entry.parentId; });
    }
    if (kind === 'actors') Object.values(data.films).forEach(link => { link.actorIds = link.actorIds.filter(a => a !== id); });
    data[kind] = data[kind].filter(item => item.id !== id); persist();
  };
  const mergeActor = (id, target, fields = {}) => {
    if (!find('actors', target) || id === target) throw new Error('请选择另一个演员作为合并目标');
    const source = find('actors', id), dest = find('actors', target);
    Object.assign(dest,fields); // Preserve the two selected name fields; never create aliases.
    Object.values(data.films).forEach(link => { link.actorIds = [...new Set(link.actorIds.map(a => a === id ? target : a))]; });
    if(data.actorFavorites.includes(id)&&!data.actorFavorites.includes(target))data.actorFavorites.push(target);
    data.actorFavorites=data.actorFavorites.filter(x=>x!==id);
    data.redirects[id]=target;
    Object.keys(data.redirects).forEach(key=>{if(data.redirects[key]===id)data.redirects[key]=target;});
    data.actors = data.actors.filter(a => a.id !== id); persist();
  };
  const resolveActor = id => find('actors',data.redirects[id]||id);
  const toggleActorFavorite = id => {
    if(!find('actors',id))throw new Error('演员资料已变更，请刷新后重试');
    data.actorFavorites=data.actorFavorites.includes(id)?data.actorFavorites.filter(x=>x!==id):[...data.actorFavorites,id];
    const dates=V.read('actor-favorite-times',{});dates[id]=data.actorFavorites.includes(id)?new Date().toISOString():null;localStorage.setItem('vx-studio-1-actor-favorite-times',JSON.stringify(dates));
    persist();return data.actorFavorites.includes(id);
  };
  const archive = (kind,id,target) => {
    const entry=find(kind,id);if(!entry)return;
    const snapshot={kind,entry:copy(entry),index:data[kind].indexOf(entry),at:new Date().toISOString()};
    if(kind==='categories') { remove(kind,id,target);data.archives.push(snapshot);persist();return; }
    data.archives.push(snapshot);data[kind]=data[kind].filter(x=>x.id!==id);persist();
  };
  const restore = (kind,id) => {
    const snapshot=data.archives.find(x=>x.kind===kind&&x.entry.id===id);if(!snapshot)return;
    const entry=copy(snapshot.entry);
    validate(kind,entry,id);
    if(kind==='categories'&&entry.parentId&&!find('categories',entry.parentId))entry.parentId='';
    if(entry.categoryId&&!find('categories',entry.categoryId))entry.categoryId='unsorted';
    data[kind].splice(Math.min(snapshot.index,data[kind].length),0,entry);
    data.archives=data.archives.filter(x=>x!==snapshot);persist();
  };
  const filmRelations = id => ({
    actors:(data.films[id]?.actorIds || []).map(a => find('actors',a)).filter(Boolean),
    series:data.series.filter(s => s.movieIds.includes(id)),
    category:find('categories',data.films[id]?.categoryId)
  });
  window.VXCatalog = {data,find,uid,descendants,visible,categoryName,categoryPath,forActor,forCategory,persist,upsert,setMovies,reorder,remove,mergeActor,resolveActor,toggleActorFavorite,archive,restore,filmRelations};
  window.addEventListener('storage', e => {
    if (e.key !== 'vx-catalog-v2') return;
    Object.assign(data, V.read('catalog-v2', copy(initial))); sync();
    window.dispatchEvent(new CustomEvent('vx:catalog'));
  });
  sync();
})();
