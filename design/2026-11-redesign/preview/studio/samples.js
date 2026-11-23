// The artwork and public metadata come from the viewing prototype's cinema catalog.
// File paths, file facts, review states and the two home-video episodes are fixtures.
const StudioSamples = (() => {
  const { films, people, series } = StudioCinema;
  const intake = [693134, 843, 129, 157336, 120467, 324857, 313369, 10775];
  const slugs={'科幻':'scifi','动画':'animation','爱情':'romance','喜剧':'comedy','犯罪':'crime','动作':'action','剧情':'drama','纪录片':'documentary','冒险':'adventure'};
  const categoryId = name => 'genre-' + slugs[name];
  const person = new Map(people.map(p => [p.id, p]));
  const directors = {693134:'丹尼斯·维伦纽瓦',843:'王家卫',129:'宫崎骏',157336:'克里斯托弗·诺兰',120467:'韦斯·安德森',313369:'达米恩·查泽雷',10775:'刘伟强、麦兆辉'};
  const movie = f => ({
    id:String(f.id),title:f.title,year:f.year,duration:f.minutes,quality:'1080p',poster:f.image,
    desc:f.summary,director:directors[f.id] || '',cast:f.actors.map(id=>person.get(id).name),
    kind:'movie',identifier:'',releasePrecision:'year',createdAt:f.createdAt,notes:'',
    releaseDate:'',sortTitle:'',tags:[],organizations:[],images:[{id:'poster',purpose:'poster',url:f.image},{id:'backdrop',purpose:'backdrop',url:f.backdrop}],
    coverLayout:'portrait',supportsChinese:null,legacyPlayCount:0,publishedAt:f.createdAt
  });
  const library = films.filter(f => !intake.includes(f.id)).map(movie);
  const categories = [...new Set(films.map(f=>f.category))].map(name=>({id:categoryId(name),name,code:'genre-'+films.find(f=>f.category===name).id,parentId:'',visible:true,description:''}));
  categories.push({id:'unsorted',code:'unsorted',name:'未分类',parentId:'',visible:true,system:true,description:''});
  const actors = people.map(p=>({id:String(p.id),name:p.name,detailedName:p.detailed,gender:'未指定',categoryId:categoryId(p.category),portrait:p.image,locked:false,createdAt:p.createdAt}));
  const membership = f => ({categoryId:categoryId(f.category),actorIds:f.actors.map(String)});
  const catalog = {
    version:2, actors, categories, archives:[], redirects:{},actorFavorites:[],
    films:Object.fromEntries(films.filter(f=>!intake.includes(f.id)).map(f=>[String(f.id),membership(f)])),
    series:series.map(s=>{const movieIds=films.filter(f=>f.series===s.id&&!intake.includes(f.id)).sort((a,b)=>a.year-b.year).map(f=>String(f.id));return {id:String(s.id),name:s.name,categoryId:categoryId(s.category),description:'',movieIds,coverId:movieIds[0]||'',createdAt:s.createdAt,addedAt:Object.fromEntries(movieIds.map(id=>[id,s.createdAt]))};}),
    folders:[{id:'weekend',name:'周末片单',description:'',movieIds:['10681','128'],coverId:'10681',createdAt:'2026-11-17',addedAt:{'10681':'2026-11-17','128':'2026-11-17'}}]
  };
  function makeDraft(f,index) {
    const m=movie(f), missingCast=index===1, missingYear=index===2, failed=index===5, offline=index===7;
    const file='inbox/'+f.title+'.'+f.year+'.'+(index%2?'mkv':'mp4');
    const credits=f.actors.filter(()=>!missingCast&&!failed).map(id=>({personId:String(id),name:person.get(id).name,detailedName:person.get(id).detailed,gender:'未指定',categoryId:categoryId(person.get(id).category),job:'actor'}));
    if(m.director) credits.push({personId:'',name:m.director,detailedName:'',gender:'未指定',categoryId:'unsorted',job:'director'});
    const media={title:f.title,identifier:'',desc:failed?'':m.desc,notes:'',releasePrecision:missingYear?'unknown':'year',year:missingYear?null:f.year,releaseDate:'',supportsChinese:null,coverLayout:'portrait',kind:'movie',parentId:'',episodeNumber:null};
    const part={id:'file-'+f.id,partNo:1,path:file,container:index%2?'matroska':'mp4',codec:'h264',width:1920,height:1080,sizeBytes:3760000000,durationMs:f.minutes*60000,availability:offline?'offline':'online',probeStatus:offline?'failed':'succeeded',subtitles:[]};
    const workspace={schemaVersion:2,media,categoryId:categoryId(f.category),credits,seriesIds:f.series?[String(f.series)]:[],newSeries:[],tags:[],organizations:[],images:failed?[]:m.images,editions:[{id:'cut-'+f.id,name:'原版',cut:'theatrical',language:'',isDefault:true,notes:'',parts:[part]}],locks:{},source:{provider:'公开资料样本',query:f.title,url:'',candidate:failed?null:{title:m.title,desc:m.desc,year:f.year}}};
    return {id:m.id,status:failed?'failed':index===3?'ready':'review',reason:failed?'本次模拟获取未返回候选':'',file,workspace,editRevision:1,reviewed:index===3,reviewedRevision:index===3?1:null,fetchState:failed?'failed':'succeeded'};
  }
  function homeEpisode(number) {
    const item=makeDraft(films[0],0),d=item.workspace;
    const label='海岸手记 · '+(number===1?'上篇':'下篇');
    const file='inbox/海岸手记.Part'+number+'.mp4';
    Object.assign(d.media,{title:label,desc:'私人旅行影像，记录海岸沿线的风景。',year:2025,kind:'video'});
    Object.assign(d,{categoryId:categoryId('纪录片'),credits:[],seriesIds:[],images:number===1?[{id:'cover',purpose:'poster',url:'sea-VVA2WSUV.jpg'}]:[],source:{provider:'手动资料',query:'',url:'',candidate:null}});
    const p=d.editions[0].parts[0];Object.assign(p,{id:'coast-file-'+number,path:file,durationMs:(number===1?18:22)*60000});d.editions[0].id='coast-cut-'+number;
    return {...item,id:'coast-'+number,file,fetchState:'manual'};
  }
  const drafts=()=>[...intake.map((id,i)=>makeDraft(films.find(f=>f.id===id),i)),homeEpisode(1),homeEpisode(2)];
  function scan(){
    const extra=homeEpisode(1);
    extra.id='coast-behind';extra.file='inbox/海岸手记.幕后.mp4';
    extra.workspace.media.title='海岸手记 · 幕后';extra.workspace.media.desc='海岸拍摄的幕后记录。';
    extra.workspace.editions[0].id='coast-cut-behind';
    Object.assign(extra.workspace.editions[0].parts[0],{id:'coast-file-behind',path:extra.file});
    return [...drafts(),extra];
  }
  return {library,catalog,drafts,scan,categoryId,intake};
})();
