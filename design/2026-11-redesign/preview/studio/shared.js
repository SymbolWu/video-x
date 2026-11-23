(() => {
  const paths = {
    play:'m9 5 11 7-11 7V5Z', pause:'M8 5v14M16 5v14', search:'m21 21-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z',
    home:'m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z', library:'M4 4h5v16H4zM13 4h5v16h-5zM21 5v14', heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    arrow:'M5 12h14m-5-5 5 5-5 5', back:'M19 12H5m5-5-5 5 5 5', down:'m6 9 6 6 6-6', plus:'M12 5v14M5 12h14', close:'m6 6 12 12M6 18 18 6', check:'m5 12 4 4L19 6', clock:'M12 8v4l3 2M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z',
    settings:'m9 3-1 3-3 1-2 3 2 2v3l2 3h3l2 3 3-2 3-1v-3l3-2-2-3V7l-3-1-2-3H9Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', globe:'M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0ZM2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20Z',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', filter:'M4 7h16M7 12h10M10 17h4', volume:'m3 9 5 0 4-4v14l-4-4H3V9Zm13-2c3 3 3 7 0 10m3-13c5 5 5 11 0 16', expand:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5', subtitles:'M3 5h18v14H3zM6 10h4m4 0h4M6 14h4m4 0h4',
    skip:'m5 5 10 7-10 7V5ZM19 5v14', refresh:'M20 8V3l-4 4a8 8 0 1 0 3 9M20 3h-5', folder:'M3 5h6l2 3h10v12H3V5Z', upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6', server:'M3 3h18v7H3zM3 14h18v7H3zM7 6h.01M7 17h.01',
    activity:'M2 12h5l3-9 4 18 3-9h5', more:'M5 12h.01M12 12h.01M19 12h.01', user:'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', shield:'m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7l9-4Z', info:'M12 11v6M12 7h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z', edit:'m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l1 6Z', warning:'m12 3 10 18H2L12 3ZM12 9v5M12 17h.01', moon:'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z', film:'M4 3h16v18H4zM4 8h16M4 16h16M8 3v18M16 3v18', cast:'M3 18v3h3M3 13a8 8 0 0 1 8 8M3 8a13 13 0 0 1 13 13M3 3h18v18h-2', bookmark:'M6 3h12v18l-6-4-6 4V3Z', signal:'M5 17v3M10 12v8M15 7v13M20 3v17', headphones:'M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7H4Zm16 0h2v7h-5v-7h3Z', chevron:'m9 5 7 7-7 7', logout:'M9 3H3v18h6M12 12h10m-4-4 4 4-4 4'
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.film}"/></svg>`;
  const movies = StudioSamples.library.map(m=>({...m}));
  const read = (k,d) => {try{return JSON.parse(localStorage.getItem('vx-studio-1-'+k)) ?? d;}catch{return d;}};
  const state={favorites:read('favorites',[]),progress:{},ratings:read('ratings',{}),watched:read('watched',{}),positions:read('positions-v1',{}),versions:read('versions',{}),collections:read('collections',{'周末片单':['10681','128']})};
  const save = k => {try{localStorage.setItem('vx-studio-1-'+k,JSON.stringify(state[k]));}catch{}};
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const movie = id => movies.find(m=>m.id===id)||movies[0];
  const toggleFavorite = id => {state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save('favorites');const dates=read('favorite-times',{});dates[id]=state.favorites.includes(id)?new Date().toISOString():null;localStorage.setItem('vx-studio-1-favorite-times',JSON.stringify(dates));return state.favorites.includes(id);};
  const toast = msg => {let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.append(t);}t.innerHTML=icon('check')+esc(msg);t.classList.add('show');clearTimeout(window.vxToast);window.vxToast=setTimeout(()=>t.classList.remove('show'),2600);};
  const logo = `<span class="brand-mark">v<span>×</span></span><span class="brand-word">video<span>—</span>x</span>`;
  const time = seconds => {const x=Math.floor(seconds);return `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;};
  const poster = (m,extra='') => `<img src="${m.poster}" alt="${esc(m.title)}海报" loading="lazy" ${extra}>`;

  movies.push(...read('extra-movies',[]).filter(x=>!movies.some(m=>m.id===x.id)));
  const edits=read('admin-metadata',{});
  movies.forEach(m=>{const fields=edits[m.id];if(fields)Object.assign(m,fields);if(!Array.isArray(m.tags))m.tags=[];});
  const persistMovie=id=>{const m=movie(id);edits[id]=Object.fromEntries(['title','en','year','desc','sortTitle','releaseDate','releasePrecision','notes','coverLayout','supportsChinese','identifier','tags','organizations','poster','director','images','duration','quality'].map(k=>[k,m[k]]));localStorage.setItem('vx-studio-1-admin-metadata',JSON.stringify(edits));};
  const category=id=>window.VXCatalog?.categoryName(window.VXCatalog.data.films[id]?.categoryId)||'未分类';
  const editions=id=>{
    const m=movie(id),custom=read('editions',{})[id];
    return custom||[{id:'original',name:m.quality==='4K'?'4K 原声版':'1080p 原声版',cut:'theatrical',language:'',isDefault:true,notes:'',parts:[{id:`${id}-original-1`,partNo:1,path:`movies/${id}.mkv`,container:'matroska',codec:m.quality==='4K'?'hevc':'h264',width:m.quality==='4K'?3840:1920,height:m.quality==='4K'?2160:1080,sizeBytes:m.quality==='4K'?26628797235:6657199308,durationMs:m.duration*60000,availability:'online',probeStatus:'succeeded',subtitles:[]}]}];
  };
  const chosenEdition=id=>{const list=editions(id),explicit=list.find(x=>x.id===state.versions[id]);if(explicit)return explicit;if(read('preferences',{}).quality==='优先 1080p'){const light=list.find(x=>x.parts.every(p=>p.height<=1080));if(light)return light;}return list.find(x=>x.isDefault)||list[0];};
  const qualityLabel=id=>{const part=chosenEdition(id)?.parts[0];return part?.height>=2160?'4K':part?.height?part.height+'p':'画质未知';};
  const progressFor=(id,editionId=chosenEdition(id)?.id)=>state.positions[`${id}:${editionId}`];
  const positionSeconds=id=>(progressFor(id)?.positionMs||0)/1000;
  const percent=id=>Math.min(100,Math.round(positionSeconds(id)/(movie(id).duration*60)*100));
  const canResume=id=>{const r=progressFor(id);return !!(r&&r.positionMs>0&&!r.completedAt);};
  const syncProgress=()=>movies.forEach(m=>{state.progress[m.id]=percent(m.id);});
  const recordPlayback=(id,seconds)=>{const edition=chosenEdition(id),part=edition.parts[0];const positionMs=Math.max(0,Math.min(Math.round(seconds*1000),part.durationMs));state.positions[`${id}:${edition.id}`]={editionId:edition.id,partId:part.id,positionMs,receivedAt:new Date().toISOString(),completedAt:positionMs===part.durationMs?new Date().toISOString():null};localStorage.setItem('vx-studio-1-positions-v1',JSON.stringify(state.positions));syncProgress();};
  const setRating=(id,value)=>{if(value!==null&&(!Number.isInteger(value)||value<1||value>5))throw new Error('评分须为 1～5 星');if(value===null)delete state.ratings[id];else state.ratings[id]=value;save('ratings');};
  const markWatched=id=>{if(state.watched[id])delete state.watched[id];else state.watched[id]=new Date().toISOString();save('watched');};
  syncProgress();
  window.VX={qualityLabel,category,editions,chosenEdition,progressFor,positionSeconds,percent,canResume,recordPlayback,setRating,markWatched,syncProgress,persistMovie,icon,movies,movie,state,save,read,esc,toggleFavorite,toast,logo,time,poster};
})();
