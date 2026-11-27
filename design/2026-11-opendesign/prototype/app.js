import { createNavigation } from './navigation.js';
import { createEditionMenu } from './edition-menu.js';
import { createUIMotion } from './ui-motion.js';
const uiMotion=createUIMotion();

const paths={
 search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 heart:'<path d="M20.4 5.7a5.3 5.3 0 0 0-7.5 0l-.9.9-.9-.9a5.3 5.3 0 0 0-7.5 7.5L12 21l8.4-7.8a5.3 5.3 0 0 0 0-7.5Z"/>',
 star:'<path d="m12 2.3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.1l6.5-.9Z"/>',
 grid:'<rect x="3" y="3" width="6" height="8" rx="1"/><rect x="15" y="3" width="6" height="8" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
 landscape:'<rect x="2.5" y="5" width="8" height="14" rx="1"/><rect x="13.5" y="5" width="8" height="14" rx="1"/><path d="M3 13h7M14 13h7"/>',
 sliders:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/>',
 sort:'<path d="M8 4v16m-4-4 4 4 4-4M14 5h7m-7 5h5m-5 5h3"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 play:'<path d="M7 3.8v16.4L21 12Z"/>',
 film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4"/>',
 library:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="11" y="4" width="4" height="16" rx="1"/><path d="m18 4 3 15"/>',
 collection:'<rect x="6" y="6" width="15" height="15" rx="2"/><path d="M3 16V5a2 2 0 0 1 2-2h11M10 13.5h7m-3.5-3.5v7"/>',
 back:'<path d="m14 5-7 7 7 7"/>',
 right:'<path d="m9 5 7 7-7 7"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 layers:'<path d="m12 3 10 6-10 6L2 9Zm-9 11 9 6 9-6M3 18l9 5 9-5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
};
const icon=(name,cls='')=>`<svg viewBox="0 0 24 24" aria-hidden="true" class="od-icon ${cls}">${paths[name]??paths.film}</svg>`;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const key='video-x.infuse-two-screens.v1';
const defaults={query:'',category:'全部',sort:'recent',view:'poster',tab:'films',directoryFilter:'all',collection:'',filters:{watched:'all',favorite:false},movies:{},collections:null,tabMemory:{}};
let stored={};try{stored=JSON.parse(sessionStorage.getItem(key)||'{}')}catch{}
const state={...defaults,movies:stored.movies??{},collections:stored.collections??null,filters:{...defaults.filters},tabMemory:{}};
let data,movies,people,toastTimer,lastFocus;
const pageType=document.body.dataset.page;
const isDetail=pageType==='detail';
const isScoped=pageType==='actor'||pageType==='series';
const pageParams=new URLSearchParams(location.search);
let navigation;
const modal=$('#modal');
const save=()=>{try{sessionStorage.setItem(key,JSON.stringify({movies:state.movies,collections:state.collections}))}catch{}navigation?.capture()};
const getMovie=id=>{const m=movies.find(m=>m.id===id);return m?{...m,...state.movies[id]}:null};
const allMovies=()=>movies.map(m=>getMovie(m.id));
const updateMovie=(id,patch)=>{state.movies[id]={...state.movies[id],...patch};save()};
const poster=(m,extra='')=>m.poster?`<img class="poster ${extra}" src="${escape(m.poster)}" alt="${escape(m.title)}海报" width="342" height="513" loading="eager">`:`<div class="missing-art">${icon('film')}<span>暂无封面</span></div>`;
const artStyle=m=>m.poster?`style="--art:url('${escape(m.poster)}')"`:'';
// Only recorded versions are selectable; missing metadata is never a synthetic edition.
const editions=m=>m?.linkedFileCount===0?[]:Array.isArray(m?.editions)?m.editions:[];
function activeEditionIndex(m){
 const items=editions(m);
 if(!items.length)return -1;
 return Number.isInteger(m.editionIndex)&&items[m.editionIndex]?m.editionIndex:Math.max(0,items.findIndex(e=>e.isDefault));
}
const activeEdition=m=>editions(m)[activeEditionIndex(m)]??null;
const editionMenu=isDetail?createEditionMenu({
 getModel(){const m=getMovie(document.body.dataset.movie);return {items:editions(m),index:activeEditionIndex(m)}},
 onSelect(index){const m=getMovie(document.body.dataset.movie);if(!editions(m)[index])return;updateMovie(m.id,{editionIndex:index});refreshEditionUI(getMovie(m.id))},
 checkIcon:icon('check')
}):null;
const minutes=t=>t?`${Math.floor(t/60)?Math.floor(t/60)+'小时':''}${t%60?t%60+'分钟':''}`:'时长待补全';
const time=t=>`${String(Math.floor(t)).padStart(2,'0')}:00`;
const relevantPeople=()=>[...new Set([...people.map(p=>p.name),...movies.flatMap(m=>m.actors??[])])];
const collection=()=>state.collections??data.collections;
function notify(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('toast-visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('toast-visible'),2300)}
const sortMenu=!isDetail?createEditionMenu({id:'sort-menu',title:'排序',noun:'种排序',singleLabel:'当前排序',variant:'sort',triggerSelector:'[data-action="sort-menu"]',minWidth:232,checkIcon:icon('check'),getModel(){const options=sortOptions();return{items:options.map(([value,name])=>({name,value})),index:Math.max(0,options.findIndex(([v])=>v===state.sort))}},onSelect(index){const option=sortOptions()[index];if(!option)return;state.sort=option[0];renderLibrary(false,'sort');focusControl('#sort-trigger');save()}}):null;
function searchDescription(){
 if(isScoped)return pageType==='actor'?'在参演作品中搜索':'在系列作品中搜索';
 if(state.tab==='people')return '搜索演员姓名';
 if(state.tab==='series')return '搜索系列或成员影片';
 return '搜索影片、演员或系列';
}
function header(){
 const searchLabel=searchDescription();
 return `<header class="site-header"><a id="brand-home" class="brand" href="index.html" aria-label="video-x 片库"><span class="brand-symbol" aria-hidden="true"></span><span class="brand-wordmark">video<span class="brand-x">×</span></span></a><nav class="main-nav" aria-label="主导航"><a id="nav-library" href="index.html" class="nav-link ${!state.collection?'active':''}" ${!isDetail&&!isScoped&&!state.collection?'aria-current="page"':''}>${icon('library')}片库</a><button id="nav-collections" class="nav-link ${state.collection?'active':''}" data-action="browse-collections">${icon('collection')}收藏夹</button></nav><div class="header-end"><div class="searchbox">${icon('search')}<label class="sr-only" for="search-input">${searchLabel}</label><input id="search-input" type="search" placeholder="${searchLabel}" value="${escape(state.query)}" autocomplete="off"><button class="clear-search" aria-label="清除搜索" data-action="clear-search" ${state.query?'':'hidden'}>${icon('close')}</button><span class="key-hint">/</span></div><button class="icon-btn mobile-search" aria-label="搜索" data-action="show-search" aria-expanded="false">${icon('search')}</button><span class="profile" title="本地观影者">观</span></div></header>`;
}
// Shared browsing controls: each directory exposes only controls it can use.
function sortOptions(){
 if(state.tab==='people')return [['name','姓名 A–Z'],['count','馆藏作品数']];
 if(state.tab==='series')return [['saved','保存顺序'],['title','系列名称'],['count','馆藏部数'],['year','最新发行年']];
 return [...(document.body.dataset.page==='series'?[['saved','保存顺序']]:[]),['recent','最近添加'],['year','发行年 · 新到旧'],['year-asc','发行年 · 旧到新'],['title','影片名称']];
}
function browseToolbar(){
 const filmView=state.tab==='films';
 const categories=['全部',...new Set((typeof scopeMovies==='function'?scopeMovies():movies).map(m=>m.category))];
 const groups=filmView?categories.map(c=>[c,c]):state.tab==='people'?[['all','全部演员'],['with','有头像'],['missing','缺头像']]:[['all','全部系列'],['multiple','多部馆藏'],['single','单部馆藏']];
 const selected=filmView?state.category:state.directoryFilter??'all';
 const activeFilters=state.filters.watched!=='all'||state.filters.favorite;
 return `<div class="library-toolbar"><div class="category-row" role="group" aria-label="${filmView?'影片分类':state.tab==='people'?'头像状态':'馆藏规模'}">${groups.map(([v,l])=>`<button class="category" data-action="${filmView?'category':'directory-filter'}" data-category="${escape(v)}" aria-pressed="${selected===v}">${escape(l)}</button>`).join('')}</div><div class="toolbar-end">${filmView?`<div class="view-switch" role="group" aria-label="卡片布局"><button data-action="view" data-view="poster" aria-label="海报布局" aria-pressed="${state.view==='poster'}" title="海报布局">${icon('grid')}</button><button data-action="view" data-view="landscape" aria-label="横图布局" aria-pressed="${state.view==='landscape'}" title="横图布局">${icon('landscape')}</button></div>`:''}<div class="sort-control"><button type="button" id="sort-trigger" class="sort-trigger" data-action="sort-menu" aria-label="排序：${escape(sortOptions().find(([v])=>v===state.sort)?.[1]??'排序')}" aria-haspopup="menu" aria-controls="sort-menu" aria-expanded="false">${icon('sort')}<span>${escape(sortOptions().find(([v])=>v===state.sort)?.[1]??'排序')}</span>${icon('down','sort-chevron')}</button><select id="sort-select" aria-label="排序" hidden tabindex="-1" aria-hidden="true">${sortOptions().map(([v,l])=>`<option value="${v}" ${state.sort===v?'selected':''}>${l}</option>`).join('')}</select></div>${filmView?`<button class="filter-btn ${activeFilters?'is-active':''}" data-action="filter" aria-haspopup="dialog" aria-expanded="false">${icon('sliders')}<span>筛选</span>${activeFilters?'<span class="filter-dot" aria-label="已启用"></span>':''}</button>`:''}</div></div>`;
}
function libraryBody(){
 const counts={films:movies.length,people:relevantPeople().length,series:data.series?.length??0};
 const visibleCount=state.tab==='people'?directoryPeople().length:state.tab==='series'?directorySeries().length:filtered().length;
 const unit=state.tab==='people'?'位演员':state.tab==='series'?'个系列':'部影片';
 const title=state.collection?collection().find(c=>c.id===state.collection)?.name??'我的片库':'我的片库';
 return `<section class="browse-controls catalog-header" aria-label="片库浏览控制"><div class="library-heading"><h1>${escape(title)}</h1><div class="type-tabs" role="tablist" aria-label="浏览类型">${[['films','影片'],['people','演员'],['series','系列']].map(([id,label])=>`<button role="tab" class="type-tab" id="tab-${id}" data-action="tab" data-tab="${id}" aria-controls="results" aria-selected="${state.tab===id}" tabindex="${state.tab===id?'0':'-1'}">${label}<span>${counts[id]}</span></button>`).join('')}</div></div>${browseToolbar()}<p class="catalog-count" role="status" aria-live="polite"><span>${visibleCount}</span> ${unit}</p></section>${state.query?`<div class="active-context">${icon('search')}<span>“${escape(state.query)}”的搜索结果</span><button data-action="reset-context">清除条件 ${icon('close')}</button></div>`:''}<div id="results" role="tabpanel" aria-labelledby="tab-${state.tab}">${results()}</div>`;
}
// Membership is a route invariant. Search, reset and display sorting never mutate it.
function actorMembers(name){
 const p=people.find(p=>p.name===name);
 const ids=new Set([...(p?.mediaIds??[]),...movies.filter(m=>m.actors?.includes(name)).map(m=>m.id)]);
 return movies.filter(m=>ids.has(m.id)).map(m=>getMovie(m.id));
}
function seriesMembers(series){return (series?.mediaIds??[]).map(getMovie).filter(Boolean)}
function currentActor(){const name=pageParams.get('name')??pageParams.get('id');return relevantPeople().includes(name)?people.find(p=>p.name===name)??{name}:null}
function currentSeries(){return data.series.find(s=>s.id===pageParams.get('id'))??null}
function movieSeries(m){return data.series.find(s=>s.mediaIds.includes(m.id))}
function scopeMovies(){
 if(pageType==='actor')return actorMembers(currentActor()?.name);
 if(pageType==='series')return seriesMembers(currentSeries());
 if(state.collection){const ids=collection().find(c=>c.id===state.collection)?.mediaIds??[];return ids.map(getMovie).filter(Boolean)}
 return allMovies();
}
function filtered(){
 let list=scopeMovies();
 const q=state.query.trim().toLocaleLowerCase();
 if(q)list=list.filter(m=>[m.title,m.originalTitle,m.franchise,...m.actors??[]].join(' ').toLocaleLowerCase().includes(q));
 if(state.category!=='全部')list=list.filter(m=>m.category===state.category);
 if(state.filters.favorite)list=list.filter(m=>m.favorite);
 if(state.filters.watched!=='all')list=list.filter(m=>Boolean(m.watched)===(state.filters.watched==='watched'));
 // Array.sort operates on this derived list, never on series.mediaIds.
 if(state.sort==='year')list.sort((a,b)=>(b.year??0)-(a.year??0));
 else if(state.sort==='year-asc')list.sort((a,b)=>(a.year??9999)-(b.year??9999));
 else if(state.sort==='title')list.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));
 else if(state.sort==='recent')list.sort((a,b)=>a.addedOrder-b.addedOrder);
 return list;
}
function directoryPeople(){
 let list=relevantPeople().map(name=>({...people.find(p=>p.name===name),name,count:actorMembers(name).length}));
 const q=state.query.trim().toLocaleLowerCase();
 if(q)list=list.filter(p=>p.name.toLocaleLowerCase().includes(q));
 if(state.directoryFilter==='with')list=list.filter(p=>p.image);
 if(state.directoryFilter==='missing')list=list.filter(p=>!p.image);
 return list.sort((a,b)=>state.sort==='count'?b.count-a.count||a.name.localeCompare(b.name,'zh-CN'):a.name.localeCompare(b.name,'zh-CN'));
}
function directorySeries(){
 let list=data.series.map(s=>({...s,count:seriesMembers(s).length}));
 const q=state.query.trim().toLocaleLowerCase();
 if(q)list=list.filter(s=>[s.name,...seriesMembers(s).flatMap(m=>[m.title,m.originalTitle])].join(' ').toLocaleLowerCase().includes(q));
 if(state.directoryFilter==='single')list=list.filter(s=>s.count===1);
 if(state.directoryFilter==='multiple')list=list.filter(s=>s.count>1);
 if(state.sort==='title')list.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
 if(state.sort==='count')list.sort((a,b)=>b.count-a.count);
 if(state.sort==='year')list.sort((a,b)=>Math.max(0,...seriesMembers(b).map(m=>m.year??0))-Math.max(0,...seriesMembers(a).map(m=>m.year??0)));
 return list;
}
function portrait(p){
 return p?.image?`<img src="${escape(p.image)}" alt="${escape(p.name)}" width="185" height="${p.image.endsWith('person-2.jpg')?278:277}" loading="eager">`:`<div class="portrait-fallback">${icon('user')}<span>暂无头像</span></div>`;
}
function seriesCover(s){
 const members=seriesMembers(s),covers=members.slice(0,3);
 return `<div class="series-art" ${artStyle(members[0]??{})}><div class="series-cover-label">${icon('layers')}<span>影片集</span></div><div class="series-posters member-count-${covers.length}">${covers.map((m,i)=>`<div class="member-poster member-${i}" data-member-id="${escape(m.id)}">${poster(m)}</div>`).join('')}${covers.length===1?'<div class="single-collection-note"><span>馆藏</span><strong>01</strong><span>影片集</span></div>':''}</div><div class="series-caption"><h3>${escape(s.name)}</h3><span>${members.length}部馆藏</span></div></div>`;
}
function returnLink(defaultURL,defaultLabel){
 const back=navigation?.backTarget??{url:defaultURL,label:defaultLabel};
 return `<a id="page-back" class="back-link" href="${escape(back.url)}" data-action="back">${icon('back')}<span>返回${escape(back.label)}</span></a>`;
}
function scopedHeader(){
 const actor=pageType==='actor',entity=actor?currentActor():currentSeries();
 const title=entity?.name??(actor?'未找到该演员':'未找到该系列');
 document.title=`${title} · ${actor?'演员':'系列'} · video—x`;
 const back=returnLink(`index.html?tab=${actor?'people':'series'}`,actor?'演员目录':'系列目录');
 if(!entity)return `<section class="scope-header"><div class="back-row">${back}</div><h1>${title}</h1><p class="scope-note">该条目不在当前样本中，请返回目录浏览。</p></section>`;
 return `<section class="scope-header ${actor?'actor-header':'series-header'}"><div class="back-row">${back}<span class="source-context">${actor?'演员':'系列'} / 我的馆藏</span></div><div class="scope-identity">${actor?`<div class="scope-portrait">${portrait(entity)}</div>`:`<div class="scope-series-cover">${seriesCover(entity)}</div>`}<div class="scope-copy"><p class="scope-eyebrow">${actor?'演员作品':'系列影片集'}</p><h1>${escape(title)}</h1><p class="scope-count">${actor?actorMembers(entity.name).length:seriesMembers(entity).length}<span>${actor?'部已入库作品':'部馆藏'}</span></p></div></div></section>`;
}
function scopedBody(){
 const actor=pageType==='actor',total=scopeMovies().length,visible=filtered().length;
 const count=visible===total?`${visible} 部`:`显示 ${visible} / ${total} 部`;
 return `${scopedHeader()}<section class="browse-controls scoped-controls" aria-label="${actor?'参演':'系列'}作品浏览控制"><div class="library-heading"><h2 id="scope-results-title">${actor?'参演作品':'系列作品'}</h2><p class="scoped-result-count" role="status" aria-live="polite">${count}</p></div>${browseToolbar()}</section>${state.query?`<div class="active-context">${icon('search')}<span>在${actor?'参演':'系列'}作品中搜索“${escape(state.query)}”</span><button data-action="reset-context">清除条件 ${icon('close')}</button></div>`:''}<div id="results" aria-labelledby="scope-results-title">${results()}</div>`;
}
function card(m){return `<article class="movie-card" data-id="${m.id}"><a id="card-${m.id}" class="movie-link" href="detail.html?id=${m.id}" data-movie="${m.id}" aria-label="查看${escape(m.title)}"><div class="artwork" ${artStyle(m)}>${poster(m)}${m.progressMinutes?`<span class="card-state">${icon('play')}继续 ${time(m.progressMinutes)}</span><div class="progress-track"><span style="width:${Math.min(100,m.progressMinutes/m.minutes*100)}%"></span></div>`:m.watched?`<span class="card-state">${icon('check')}已看</span>`:''}</div><div class="movie-info"><h3>${escape(m.title)}</h3><div class="movie-meta"><span>${m.year??'年份待补全'}</span><span class="dot">•</span><span>${m.category}</span>${m.rating?`<span class="movie-rating" aria-label="我的评分 ${m.rating}星">${icon('star')}${m.rating}</span>`:''}</div></div></a><button class="card-favorite" data-action="card-favorite" data-id="${m.id}" aria-label="${m.favorite?'取消喜欢':'喜欢'}${escape(m.title)}" aria-pressed="${Boolean(m.favorite)}">${icon('heart')}</button></article>`}
function results(){
 const peopleView=state.tab==='people',seriesView=state.tab==='series';
 const list=peopleView?directoryPeople():seriesView?directorySeries():filtered();
 const total=peopleView?relevantPeople().length:seriesView?data.series.length:scopeMovies().length;
 const unit=peopleView?'位演员':seriesView?'个系列':'部影片';
 const summary=isScoped?'':`<p class="result-summary" role="status">${list.length===total?`${list.length} ${unit}`:`显示 ${list.length} / ${total} ${unit}`}${seriesView?'<span>部数为当前馆藏</span>':''}</p>`;
 if(!list.length)return `${summary}<div class="empty">${icon('search')}<h2>没有匹配的${peopleView?'演员':seriesView?'系列':'影片'}</h2><p>${isScoped?'试试其他关键词，或清除当前作品范围内的筛选。':'试试其他关键词，或清除当前筛选条件。'}</p><button class="secondary-btn" data-action="reset-all">清除搜索与筛选</button></div>`;
 if(peopleView)return `${summary}<div class="people-library">${list.map(p=>`<a id="actor-${encodeURIComponent(p.name)}" class="person-library" href="actor.html?name=${encodeURIComponent(p.name)}"><div class="directory-portrait">${portrait(p)}</div><div class="person-library-info"><h3>${escape(p.name)}</h3><p>${p.count} 部馆藏作品</p></div></a>`).join('')}</div>`;
 if(seriesView)return `${summary}<div class="series-library">${list.map(s=>`<a id="series-${escape(s.id)}" class="series-card" href="series.html?id=${encodeURIComponent(s.id)}" aria-label="${escape(s.name)}，${s.count}部馆藏">${seriesCover(s)}</a>`).join('')}</div>`;
 return `${summary}<div class="movie-grid ${state.view==='landscape'?'landscape':''}">${list.map(card).join('')}</div>`;
}
function renderLibrary(restore=false,reason='update'){
 const snapshot=uiMotion.beforeRender($('#library-content'),reason);
 const content=$('#library-content');if(!content)return;
 content.innerHTML=isScoped?scopedBody():libraryBody();
 uiMotion.afterRender(content,snapshot,{reason,restore});
 if(pageType==='library'||isScoped){
  const group=content.querySelector('.category-row'),selected=group?.querySelector('[aria-pressed=true]');
  if(group&&selected){const edge=group.getBoundingClientRect(),item=selected.getBoundingClientRect();if(item.right>edge.right)group.scrollLeft+=item.right-edge.right;else if(item.left<edge.left)group.scrollLeft+=item.left-edge.left;}
 }
 if(restore)requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollTo(0,state.scrollY??0);if(state.focusId)document.getElementById(state.focusId)?.focus({preventScroll:true})}));
}
function castNames(m){return [...new Set([...(m.actors??[]),...people.filter(p=>p.mediaIds?.includes(m.id)).map(p=>p.name)])]}
function castCards(m){
 return castNames(m).map(n=>{
  const p=people.find(p=>p.name===n)??{name:n};
  return `<a id="cast-${encodeURIComponent(n)}" class="person-card" href="actor.html?name=${encodeURIComponent(n)}"><div class="person-picture">${portrait(p)}</div><p class="person-name">${escape(n)}</p><p class="person-role">${m.franchise==='沙丘'&&p.role?escape(p.role):`${actorMembers(n).length} 部馆藏作品`}</p></a>`;
 }).join('');
}
function relatedSeries(m,series){
 if(!series)return '';
 const members=seriesMembers(series);
 return `<section class="series-section"><div class="section-heading"><h2>${escape(series.name)}系列</h2><span>${members.length}部馆藏</span><a id="series-all-${escape(series.id)}" class="section-link" href="series.html?id=${encodeURIComponent(series.id)}">查看系列 ${icon('right')}</a></div><div class="series-row">${members.map(f=>`<a id="related-${escape(f.id)}" class="related-film" href="detail.html?id=${encodeURIComponent(f.id)}" ${f.id===m.id?'aria-current="page"':''}>${f.poster?`<img src="${escape(f.poster)}" alt="${escape(f.title)}海报" width="342" height="513">`:icon('film')}<span><h3>${escape(f.title)}</h3><p>${f.year??'年份待补全'} · ${minutes(f.minutes)}</p></span>${f.id===m.id?'<span class="current-film">当前影片</span>':icon('right')}</a>`).join('')}</div></section>`;
}
function briefEditionSpec(e){return [e?.resolution==='2160p'?'4K':e?.resolution,e?.video].filter(Boolean).join(' · ')||'规格未记录'}
function editionButtonContents(m){
 const e=activeEdition(m);
 return `${icon('layers')}<span class="edition-copy od-field"><span class="edition-title od-truncate">${escape(e?.name||(e?'未命名版本':'版本资料未记录'))}</span><span class="edition-spec od-truncate">${escape(e?briefEditionSpec(e):'暂无版本记录')}</span></span>${e?icon('down','chevron'):''}`;
}
function editionButtonLabel(m){
 const e=activeEdition(m);
 return e?`${editions(m).length===1?'查看':'选择'}播放版本，当前${e.name||'未命名版本'}，${briefEditionSpec(e)}`:'暂无播放版本记录';
}
function editionButton(m){
 return `<button id="edition-trigger" class="edition-button" data-action="editions" aria-haspopup="menu" aria-controls="edition-menu" aria-expanded="false" aria-label="${escape(editionButtonLabel(m))}" ${activeEdition(m)?'':'disabled'}>${editionButtonContents(m)}</button>`;
}
function editionBadges(m){
 const e=activeEdition(m);if(!e)return '';
 return [e.resolution==='2160p'?'4K':e.resolution,e.video,e.audio].filter(Boolean).map(value=>`<span class="quality-badge">${escape(value)}</span>`).join('');
}
function editionFacts(m){
 if(m.linkedFileCount===0)return '尚未关联影片文件';
 const e=activeEdition(m);if(!e)return '版本资料未记录';
 return `${editions(m).length} 个版本 · 当前 ${escape(e.name||'未命名版本')}<span class="edition-fact-specs">${[e.resolution,e.video,e.audio].filter(Boolean).map(escape).join(' · ')||'规格未记录'}</span>`;
}
function refreshEditionUI(m){
 const button=$('#edition-trigger');
 if(button){button.innerHTML=editionButtonContents(m);button.setAttribute('aria-label',editionButtonLabel(m));button.setAttribute('aria-expanded','false')}
 const badges=$('#detail-edition-specs');
 if(badges){badges.innerHTML=editionBadges(m);badges.hidden=!activeEdition(m)}
 const facts=$('#detail-edition-facts');if(facts)facts.innerHTML=editionFacts(m);
}
function detailPage(){
 const m=getMovie(pageParams.get('id')??'dune2');
 if(!m){document.title='未找到影片 · video—x';return `<main class="library-main"><div class="back-row">${returnLink('index.html','片库')}</div><div class="empty"><h1>未找到这部影片</h1><p>当前样本中没有该影片，请返回片库浏览。</p></div></main>`}
 document.title=`${m.title} · video—x`;document.body.dataset.movie=m.id;
 const e=activeEdition(m),canPlay=m.linkedFileCount!==0,series=movieSeries(m),cast=castNames(m);
 return `<main class="detail-main"><section class="hero ${m.backdrop?'':'no-backdrop'}"><div class="hero-backdrop" ${m.backdrop?`style="--backdrop:url('${escape(m.backdrop)}')"`:''}></div><div class="hero-inner"><div class="back-row">${returnLink('index.html','片库')}<span class="breadcrumb-sep">/</span><span class="breadcrumb-current">${escape(m.title)}</span></div><div class="hero-copy"><p class="detail-kicker">${series?`<a id="kicker-series" href="series.html?id=${encodeURIComponent(series.id)}">${escape(series.name)}系列 ${icon('right')}</a>`:'我的馆藏'}</p><h1 id="detail-title">${escape(m.title)}</h1><p class="original-title">${escape(m.originalTitle??'')}</p><div class="detail-meta"><span>${m.year??'年份待补全'}</span><span class="bullet"></span><span>${escape(m.category)}</span><span class="bullet"></span><span>${minutes(m.minutes)}</span><span id="detail-edition-specs" class="edition-badges" ${e&&canPlay?'':'hidden'}>${editionBadges(m)}</span></div>${m.summary?`<p class="synopsis">${escape(m.summary)}</p>`:''}<div class="play-row"><button class="primary-btn" data-action="play" ${canPlay?'':'disabled'}>${icon('play')}<span>${canPlay?(m.progressMinutes?`继续播放 · ${time(m.progressMinutes)}`:'播放'):'暂无可播放文件'}</span></button>${canPlay?editionButton(m):''}</div>${m.progressMinutes?`<div class="resume-info"><span class="mini-progress"><span style="width:${Math.min(100,m.progressMinutes/m.minutes*100)}%"></span></span><span>已观看 ${minutes(m.progressMinutes)} · 剩余 ${minutes(Math.max(0,m.minutes-m.progressMinutes))}</span></div>`:''}</div></div></section><section class="personal-strip" aria-label="个人观影状态"><div class="personal-actions">${personalActions(m)}</div><div class="rating-block"><span class="rating-label">我的评分</span><div class="star-row" role="group" aria-label="我的评分，再次点击已选星级可清除">${stars(m)}</div><span class="rating-value">${m.rating?m.rating+' / 5':'未评分'}</span></div></section><div class="detail-body"><div class="detail-columns"><section><div class="section-heading"><h2>演职人员</h2>${cast.length?`<span>${cast.length} 位演员</span>`:''}</div>${cast.length?`<div class="people-grid">${castCards(m)}</div>`:'<p class="no-credits">演职人员资料待补全</p>'}</section><section><div class="section-heading"><h2>影片信息</h2></div><dl class="facts-list"><dt>导演</dt><dd>${escape(m.director??'待补全')}</dd><dt>类型</dt><dd><a id="detail-category" href="index.html?category=${encodeURIComponent(m.category)}">${escape(m.category)}</a></dd><dt>片长</dt><dd>${minutes(m.minutes)}</dd><dt>播放版本</dt><dd id="detail-edition-facts">${editionFacts(m)}</dd>${series?`<dt>所属系列</dt><dd><a id="fact-series" href="series.html?id=${encodeURIComponent(series.id)}">${escape(series.name)} ${icon('right')}</a></dd>`:''}</dl></section></div>${relatedSeries(m,series)}</div></main>`;
}
function personalActions(m){return `<button class="personal-action" data-action="favorite" aria-pressed="${Boolean(m.favorite)}">${icon('heart')}喜欢</button><button class="personal-action" data-action="collections">${icon('collection')}收藏夹</button><button class="personal-action" data-action="watched" aria-pressed="${Boolean(m.watched)}">${icon('check')}${m.watched?'已看过':'标记已看'}</button>`}
function stars(m){return [1,2,3,4,5].map(n=>`<button class="star-btn ${m.rating>=n?'on':''}" data-action="rating" data-rating="${n}" aria-label="${n} 星" aria-pressed="${m.rating===n}" title="${n} 星${m.rating===n?'，再次点击清除':''}">${icon('star')}</button>`).join('')}
function refreshPersonal(){const m=getMovie(document.body.dataset.movie);$('.personal-actions').innerHTML=personalActions(m);$('.star-row').innerHTML=stars(m);$('.rating-value').textContent=m.rating?m.rating+' / 5':'未评分'}
function openModal(title,body,footer=''){editionMenu?.close();sortMenu?.close();lastFocus=document.activeElement;modal.innerHTML=`<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('close')}</button></div>${body}${footer}`;modal.setAttribute('aria-labelledby','modal-title');modal.showModal();uiMotion.dialogOpened(modal);if(lastFocus?.dataset.action==='filter')lastFocus.setAttribute('aria-expanded','true')}
const modalButtons=(apply,label='应用')=>`<div class="modal-footer"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="${apply}">${label}</button></div>`;
function openFilter(){openModal(isScoped?(pageType==='actor'?'筛选参演作品':'筛选系列作品'):'筛选影片',`<div class="modal-body"><label class="field-label" for="filter-watched">观看状态</label><select class="modal-select" id="filter-watched">${[['all','全部影片'],['unwatched','未看过'],['watched','已看过']].map(([v,l])=>`<option value="${v}" ${state.filters.watched===v?'selected':''}>${l}</option>`).join('')}</select><span class="field-label">个人偏好</span><label class="option-row"><input type="checkbox" id="filter-favorite" ${state.filters.favorite?'checked':''}>只看我喜欢的影片</label></div>`,modalButtons('apply-filter'))}
function openCollections(){const m=getMovie(document.body.dataset.movie);openModal('加入收藏夹',`<div class="modal-body">${collection().map(c=>`<label class="option-row"><input type="checkbox" name="collection" value="${c.id}" ${c.mediaIds.includes(m.id)?'checked':''}><span class="option-text">${escape(c.name)}<small>${c.mediaIds.length} 部影片</small></span></label>`).join('')}</div>`,modalButtons('apply-collections','保存'))}
function openEditions(button){editionMenu?.toggle(button)}
// The browsing state belongs to a visit, while personal movie states remain shared.
function browseUI(){return {query:state.query,category:state.category,sort:state.sort,view:state.view,filters:{...state.filters},directoryFilter:state.directoryFilter}}
function viewSnapshot(){return {...browseUI(),tab:state.tab,collection:state.collection,tabMemory:state.tabMemory}}
function describePage(){
 if(isDetail)return getMovie(pageParams.get('id')??'dune2')?.title??'影片详情';
 if(pageType==='actor')return `${currentActor()?.name??'演员'}的作品`;
 if(pageType==='series')return `${currentSeries()?.name??'系列'}系列`;
 if(state.collection)return collection().find(c=>c.id===state.collection)?.name??'收藏夹';
 return state.tab==='people'?'演员目录':state.tab==='series'?'系列目录':'片库';
}
function resetContext(){
 state.query='';state.category='全部';state.filters={...defaults.filters};state.directoryFilter='all';
 // The route's actor/series and the collection membership remain intact.
 syncSearch();if(!isDetail)renderLibrary(false,'reset');save();
 $('#search-input')?.focus({preventScroll:true});
}
function syncSearch(){
 const input=$('#search-input');if(!input)return;
 input.value=state.query;input.placeholder=searchDescription();
 $('.searchbox label').textContent=searchDescription();
 $('.clear-search').hidden=!state.query;
}
function applySearch(value){state.query=value;syncSearch();if(!isDetail)renderLibrary(false,'search');save()}
function showSearch(){
 const h=$('.site-header'),open=!h.classList.contains('search-open');
 h.classList.toggle('search-open',open);$('.mobile-search').setAttribute('aria-expanded',String(open));
 if(open)$('#search-input').focus();
}
function focusControl(selector){($(selector)??$('#search-input'))?.focus({preventScroll:true})}
function refreshFromSharedState(){
 try{const shared=JSON.parse(sessionStorage.getItem(key)||'{}');state.movies=shared.movies??state.movies;state.collections=shared.collections??state.collections}catch{}
}
document.addEventListener('input',e=>{if(e.target.id==='search-input')applySearch(e.target.value)});
document.addEventListener('change',e=>{
 if(e.target.id==='sort-select'&&sortOptions().some(([value])=>value===e.target.value)){
  state.sort=e.target.value;renderLibrary(false,'sort');focusControl('#sort-trigger');save();
 }
});
document.addEventListener('click',e=>{
 if(!navigation)return;
 const link=e.target.closest('a[href]');
 if(link&&!link.dataset.action&&!e.defaultPrevented&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(!link.target||link.target==='_self')){
  const url=new URL(link.href,location.href);
  if(url.origin===location.origin&&/(?:index|detail|actor|series)\.html$/.test(url.pathname)){
   e.preventDefault();
   if(url.href!==location.href)navigation.go(url.href,link);
   return;
  }
 }
 const btn=e.target.closest('[data-action]');if(!btn)return;
 e.preventDefault();const action=btn.dataset.action;
 if(action==='back'){navigation.back(btn);return}
 if(action==='close-modal'){uiMotion.closeDialog(modal);return}
 if(action==='show-search'){showSearch();return}
 if(action==='clear-search'){applySearch('');focusControl('#search-input');return}
 if(action==='browse-collections'){
  openModal('我的收藏夹',`<div class="modal-body">${collection().map(c=>`<button class="option-row collection-choice" data-action="open-collection" data-id="${escape(c.id)}">${icon('collection')}<span class="option-text">${escape(c.name)}<small>${c.mediaIds.length} 部影片</small></span>${icon('right')}</button>`).join('')}</div>`);return;
 }
 if(action==='open-collection'){uiMotion.closeDialog(modal);navigation.go(`index.html?collection=${encodeURIComponent(btn.dataset.id)}`,$('#nav-collections'));return}
 if(action==='tab'&&!isScoped&&!isDetail){
  state.tabMemory[state.tab]=browseUI();
  const tab=btn.dataset.tab;
  Object.assign(state,state.tabMemory[tab]??{query:'',category:'全部',sort:tab==='people'?'name':tab==='series'?'saved':'recent',view:'poster',filters:{...defaults.filters},directoryFilter:'all'});
  state.tab=tab;state.collection='';
  document.title=`${describePage()} · video—x`;
  renderLibrary(false,'tab');syncSearch();
  navigation.updateURL(`index.html?tab=${tab}`);
  focusControl(`#tab-${tab}`);save();return;
 }
 if(action==='category'){state.category=btn.dataset.category;renderLibrary(false,'filter');focusControl(`[data-action="category"][data-category="${CSS.escape(state.category)}"]`);save();return}
 if(action==='directory-filter'){state.directoryFilter=btn.dataset.category;renderLibrary(false,'filter');focusControl(`[data-action="directory-filter"][data-category="${CSS.escape(state.directoryFilter)}"]`);save();return}
 if(action==='view'){state.view=btn.dataset.view;renderLibrary(false,'view');focusControl(`[data-action="view"][data-view="${state.view}"]`);save();return}
 if(action==='sort-menu'){sortMenu?.toggle(btn);return}
 if(action==='filter'){openFilter();return}
 if(action==='apply-filter'){
  state.filters={watched:$('#filter-watched').value,favorite:$('#filter-favorite').checked};
  uiMotion.closeDialog(modal);renderLibrary(false,'filter');focusControl('.filter-btn');save();return;
 }
 if(action==='reset-context'||action==='reset-all'){resetContext();return}
 if(action==='card-favorite'){
  const m=getMovie(btn.dataset.id),favorite=!m.favorite;updateMovie(m.id,{favorite});
  if(state.filters.favorite&&!favorite){renderLibrary(false,'favorite');return}
  btn.setAttribute('aria-pressed',String(favorite));btn.setAttribute('aria-label',`${favorite?'取消喜欢':'喜欢'}${m.title}`);uiMotion.favorite(btn);return;
 }
 if(!isDetail)return;
 const m=getMovie(document.body.dataset.movie);if(!m)return;
 if(action==='favorite'){updateMovie(m.id,{favorite:!m.favorite});refreshPersonal();focusControl('[data-action=favorite]');return}
 if(action==='watched'){updateMovie(m.id,{watched:!m.watched});refreshPersonal();focusControl('[data-action=watched]');return}
 if(action==='rating'){const n=Number(btn.dataset.rating);updateMovie(m.id,{rating:m.rating===n?null:n});refreshPersonal();focusControl(`[data-rating="${n}"]`);return}
 if(action==='collections'){openCollections();return}
 if(action==='apply-collections'){
  const ids=[...modal.querySelectorAll('input[name=collection]:checked')].map(i=>i.value);
  state.collections=collection().map(c=>({...c,mediaIds:ids.includes(c.id)?[...new Set([...c.mediaIds,m.id])]:c.mediaIds.filter(id=>id!==m.id)}));
  save();uiMotion.closeDialog(modal);notify('已更新收藏夹');return;
 }
 if(action==='editions'){openEditions(btn);return}
 if(action==='play')openModal('播放影片',`<div class="modal-body play-preview">${icon('play')}<p class="play-title">${escape(m.title)}</p><p>${escape(activeEdition(m)?.name??'版本资料未记录')} · ${m.progressMinutes?'从 '+time(m.progressMinutes)+' 继续':'从头播放'}</p><p class="modal-note">当前为设计预览，尚未连接影片文件</p></div>`,`<div class="modal-footer"><button class="primary-btn" data-action="close-modal">关闭</button></div>`);
});
modal.addEventListener('click',e=>{
 if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)uiMotion.closeDialog(modal)}
});
modal.addEventListener('cancel',e=>{e.preventDefault();uiMotion.closeDialog(modal)});
modal.addEventListener('close',()=>{
 document.querySelectorAll('[data-action=filter]').forEach(b=>b.setAttribute('aria-expanded','false'));
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
 else focusControl(isDetail?'[data-action=editions]':'.filter-btn');
});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||editionMenu?.isOpen||sortMenu?.isOpen||modal.open||!navigation)return;
 if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){
  e.preventDefault();$('.site-header').classList.add('search-open');$('.mobile-search').setAttribute('aria-expanded','true');$('#search-input').focus();
 }
 if(e.key==='Enter'&&e.target.id==='search-input'&&isDetail){e.preventDefault();navigation.go(`index.html?q=${encodeURIComponent(state.query)}`,e.target)}
 if(e.key==='Escape'&&$('.site-header').classList.contains('search-open')){
  $('.site-header').classList.remove('search-open');$('.mobile-search').setAttribute('aria-expanded','false');focusControl('.mobile-search');
 }
 if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)&&e.target.matches('[role=tab]')){
  e.preventDefault();const tabs=[...document.querySelectorAll('[role=tab]')],i=tabs.indexOf(e.target);
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
  tabs[next].click();
 }
});
window.addEventListener('pageshow',e=>{
 if(!e.persisted||!navigation)return;
 refreshFromSharedState();
 if(isDetail){const main=$('main');if(main)main.outerHTML=detailPage()}
 else renderLibrary(false,'restore');
 syncSearch();navigation.restorePosition();
});
async function boot(){
 try{
  const response=await fetch('data/library.json');if(!response.ok)throw Error('样本资料读取失败');
  data=await response.json();movies=data.movies;people=data.people;data.series??=[];
  // Old bookmarks resolve to the independent pages as well.
  if(pageType==='library'&&pageParams.has('actor')){location.replace(`actor.html?name=${encodeURIComponent(pageParams.get('actor'))}`);return}
  if(pageType==='library'&&pageParams.has('series')){
   const s=data.series.find(s=>s.name===pageParams.get('series')||s.id===pageParams.get('series'));
   location.replace(`series.html?id=${encodeURIComponent(s?.id??pageParams.get('series'))}`);return;
  }
  state.tab=!isScoped&&!isDetail&&['films','people','series'].includes(pageParams.get('tab'))?pageParams.get('tab'):'films';
  state.collection=pageType==='library'?(pageParams.get('collection')??''):'';
  if(state.collection)state.tab='films';
  state.sort=pageType==='series'?'saved':pageType==='actor'?'year':state.tab==='people'?'name':state.tab==='series'?'saved':'recent';
  if(pageParams.has('q'))state.query=pageParams.get('q');
  if(pageParams.has('category'))state.category=pageParams.get('category');
  const defaultBack=pageType==='actor'?{url:'index.html?tab=people',label:'演员目录'}:pageType==='series'?{url:'index.html?tab=series',label:'系列目录'}:{url:'index.html',label:'片库'};
  navigation=createNavigation({readView:viewSnapshot,defaultBack,describe:describePage});
  const view=navigation.savedView;
  if(view)Object.assign(state,view,{filters:{...defaults.filters,...view.filters},tabMemory:view.tabMemory??{}});
  if(isScoped||isDetail)state.tab='films';
  if(!sortOptions().some(([v])=>v===state.sort))state.sort=sortOptions()[0][0];
  if(!isDetail)document.title=`${state.tab==='people'?'演员目录':state.tab==='series'?'系列目录':state.collection?describePage():'片库'} · video—x`;
  $('#app').innerHTML=header()+(isDetail?detailPage():'<main id="library-content" class="library-main"></main>');
  if(!isDetail)renderLibrary();
  navigation.restorePosition();
 }catch(err){
  $('#app').innerHTML=`<main class="empty"><h1>暂时无法读取片库</h1><p>${escape(err.message)}</p><button class="secondary-btn" onclick="location.reload()">重新加载</button></main>`;
 }
}
boot();
