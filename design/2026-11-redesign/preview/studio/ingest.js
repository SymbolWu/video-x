/* Batch-first review. All records and file facts are local, synthetic fixtures. */
(() => {
  const V=window.VX,C=window.VXCatalog,e=V.esc,copy=x=>JSON.parse(JSON.stringify(x));
  const container=d=>['group','show','season'].includes(d.media.kind);
  const parts=d=>d.editions.flatMap(x=>x.parts);
  function summarize(d) {
    const missing=[];
    if(!d.media.title?.trim())missing.push('标题');
    if(!d.images.some(x=>x.purpose==='poster'))missing.push('封面');
    if(!d.credits.some(x=>x.job==='actor'))missing.push('演员');
    if(d.media.releasePrecision==='unknown'||!(d.media.releasePrecision==='day'?d.media.releaseDate:d.media.year))missing.push('发行日期');
    if(!d.media.desc?.trim())missing.push('简介');
    if(!d.categoryId||d.categoryId==='unsorted')missing.push('分类');
    const blockers=[];
    try{window.VXWorkbench.validate(d,true);}catch(err){blockers.push(err.message);}
    return {missing,blockers};
  }
  function create(ctx) {
    let filter='all',query='',layout='compact',groupPlan=null,pending=null;
    const selected=new Set(),expanded=new Set(),collapsed=new Set();
    const rows=()=>ctx.items(),find=id=>rows().find(x=>x.id===id),draft=i=>i.workspace||ctx.workbench.initial(i.id);
    const title=i=>draft(i).media.title||'未命名草稿';
    const members=id=>rows().filter(x=>draft(x).media.parentId===id).sort((a,b)=>draft(a).media.episodeNumber-draft(b).media.episodeNumber);
    const selectedRows=()=>ordered(rows().filter(x=>selected.has(x.id)&&x.status!=='published'));
    function ordered(items){const remaining=new Set(items.map(x=>x.id)),out=[];for(const i of rows()){if(draft(i).media.parentId&&find(draft(i).media.parentId))continue;for(const x of [i,...members(i.id)])if(remaining.has(x.id)){out.push(x);remaining.delete(x.id);}}return [...out,...items.filter(x=>remaining.has(x.id))];}
    const receipt=i=>!!i.reviewed&&i.reviewedRevision===(i.editRevision||0);
    const fingerprint=i=>JSON.stringify([i.id,i.editRevision||0,i.status,i.reviewed,i.reviewedRevision,draft(i),i.fetchState,members(i.id).map(x=>x.id)]);
    const snapshot=items=>items.map(i=>({id:i.id,value:fingerprint(i)}));
    const unchanged=s=>s.every(x=>find(x.id)&&fingerprint(find(x.id))===x.value);
    const button=(action,text,id='',extra='')=>`<button type="button" class="btn ghost small" data-action="ig-${action}" data-id="${e(id)}" ${extra}>${text}</button>`;
    const options=(xs,value)=>xs.map(([v,label])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(label)}</option>`).join('');
    const categories=()=>C.data.categories.map(x=>[x.id,C.categoryPath(x.id)]);
    function sourceLabel(i){if(container(draft(i)))return '容器资料';return {running:'正在获取',failed:'获取失败',manual:'手动资料',succeeded:'已返回结果'}[i.fetchState]||'未获取';}
    function issues(i){const result=summarize(draft(i));if(i.fetchState==='running')result.blockers.push('资料任务仍在运行');return result;}
    function hasEpisodeClue(i) {
      const d=draft(i);
      return container(d)||Boolean(d.media.parentId)||parts(d).some(p=>/(?:part[ ._-]*\d+|[上下][篇部集]|s\d{1,2}e\d{1,3})/i.test(p.path));
    }
    function matches(i){const d=draft(i),s=issues(i),text=[title(i),d.media.identifier,...d.credits.map(x=>x.name),...parts(d).map(x=>x.path)].join(' ').toLowerCase();return (!query||text.includes(query.toLowerCase()))&&(filter==='all'||filter==='episodes'&&hasEpisodeClue(i)||filter==='missing'&&s.missing.length>0||filter==='blocked'&&s.blockers.length>0||filter==='failed'&&i.fetchState==='failed'||filter==='confirmed'&&receipt(i)&&i.status!=='published'||filter==='published'&&i.status==='published');}
    function displayed(){
      const matched=new Set(rows().filter(matches).map(x=>x.id)),out=[],done=new Set();
      for(const i of rows()){
        const d=draft(i);if(d.media.parentId&&find(d.media.parentId))continue;
        const children=members(i.id),visible=matched.has(i.id)||children.some(x=>matched.has(x.id));if(!visible)continue;
        out.push({i,context:!matched.has(i.id)});done.add(i.id);
        if(!collapsed.has(i.id))for(const child of children){if(matched.has(i.id)||matched.has(child.id)){out.push({i:child,child:true,context:!matched.has(child.id)});done.add(child.id);}}
      }
      for(const i of rows())if(matched.has(i.id)&&!done.has(i.id)&&(!draft(i).media.parentId||!find(draft(i).media.parentId)))out.push({i});
      return out;
    }
    function setSelected(i,enabled){
      if(i.status==='published')return;
      for(const item of [i,...(container(draft(i))?members(i.id):[])])if(item.status!=='published')enabled?selected.add(item.id):selected.delete(item.id);
    }
    function commitDraft(i,d){i.workspace=copy(d);i.draft={...d.media,categoryId:d.categoryId,actorIds:d.credits.filter(x=>x.personId&&x.job==='actor').map(x=>x.personId),seriesIds:[...d.seriesIds]};i.editRevision=(i.editRevision||0)+1;i.reviewed=false;i.reviewedRevision=null;if(i.status!=='processing')i.status='review';}
    function groupReason(items){
      if(!items.length)return '先勾选一条或多条独立视频，再创建分集容器';
      if(items.some(i=>!['movie','video'].includes(draft(i).media.kind)||draft(i).media.parentId))return '请选择尚未分组的独立视频，已有分集请在容器上调整';
      if(items.some(i=>!parts(draft(i)).length))return '分集需先绑定视频文件；缺少资料不妨碍先建立分组';
      return '';
    }
    function shapeError(items){
      const ids=new Set(items.map(x=>x.id));
      for(const i of items){
        const d=draft(i),children=members(i.id);
        if(container(d)&&children.some(x=>x.status!=='published'&&!ids.has(x.id)))return '请同时选择容器及其全部未发布分集；勾选容器会一并选中各集';
        if(container(d)&&!children.length)return '空容器没有分集，请先添加分集或解除分组';
        if(d.media.parentId){const parent=find(d.media.parentId),formal=V.movies.find(x=>x.id===d.media.parentId);if(parent&&parent.status!=='published'&&!ids.has(parent.id))return '请同时选择对应容器；容器与分集一起核对、发布';if(!parent&&!formal)return '分集所属容器不存在';if(parent&&!container(draft(parent)))return '分集上级必须是容器';}
        if(children.length){const nums=children.map(x=>draft(x).media.episodeNumber);if(new Set(nums).size!==nums.length)return '同一容器下集号不能重复';}
      }
      return '';
    }
    function detail(i){const d=draft(i),s=issues(i);return `<tr class="ig-detail"><td colspan="8"><div class="ig-preview"><img src="${e(d.images.find(x=>x.purpose==='poster')?.url||'studio/assets/placeholder.svg')}" alt="${e(title(i))}封面"><div><span class="ig-eyebrow">简介</span><p>${e(d.media.desc||'暂无简介，允许之后补充。')}</p><div class="ig-meta"><span>导演：${e(d.credits.filter(x=>x.job==='director').map(x=>x.name).join('、')||'未填写')}</span><span>标签：${e(d.tags.map(id=>V.read('dictionaries',{tags:[]}).tags.find(x=>x.id===id)?.name||id).join('、')||'未关联')}</span><span>中文资料标记：${d.media.supportsChinese==null?'未知':d.media.supportsChinese?'支持':'不支持'}</span></div><p class="ig-muted">${container(d)?'容器不直接播放，各集保留自己的文件。':parts(d).map(x=>`${x.path} · ${x.height}p · ${(x.durationMs/60000).toFixed(1)} 分钟`).map(e).join('<br>')}</p>${i.fetchState==='failed'?`<p class="ig-error">获取失败：${e(i.reason||'请检查资料来源后重新获取')}</p>`:''}${s.blockers.length?`<p class="ig-error">${e(s.blockers.join('；'))}</p>`:''}</div><a class="btn ghost small" href="#${i.status==='published'?'edit':'draft'}/${e(i.id)}">完整编辑</a></div></td></tr>`;}
    function row({i,child,context}){
      const d=draft(i),s=issues(i),children=members(i.id),isGroup=container(d),isPublished=i.status==='published',actors=d.credits.filter(x=>x.job==='actor').map(x=>x.name),series=[...d.seriesIds.map(id=>C.find('series',id)?.name).filter(Boolean),...d.newSeries.map(x=>x.name)],poster=d.images.find(x=>x.purpose==='poster')?.url;
      const peek=expanded.has(i.id)||layout==='preview';
      return `<tr id="ig-row-${e(i.id)}" class="${selected.has(i.id)?'ig-selected ':''}${isGroup?'ig-group ':''}${child?'ig-child ':''}${context?'ig-context':''}"><td><input type="checkbox" data-ig-select="${e(i.id)}" aria-label="选择${e(title(i))}${isGroup?'及全部分集':''}" ${selected.has(i.id)?'checked':''} ${isPublished?'disabled':''}></td><td><div class="ig-identity">${isGroup?`<button class="ig-group-toggle" data-action="ig-collapse" data-id="${e(i.id)}" aria-label="${collapsed.has(i.id)?'展开':'收起'}${e(title(i))}分集">${collapsed.has(i.id)?'▸':'▾'}</button>`:`<img src="${e(poster||'studio/assets/placeholder.svg')}" alt="${e(title(i))}封面">`}<div><a class="ig-title" href="#${isPublished?'edit':'draft'}/${e(i.id)}">${e(title(i))}</a><div class="ig-sub">${isGroup?`<span class="ig-pill purple">容器 · ${children.length} 集</span>`:child?`<span class="ig-pill purple">第 ${d.media.episodeNumber} 集</span>`:''}${e(d.media.identifier||'')}</div><div class="ig-file" title="${e(parts(d).map(x=>x.path).join(' / '))}">${isGroup?'不直接播放':e(parts(d).map(x=>x.path.split('/').at(-1)).join(' / ')||'未绑定文件')}</div></div></div></td><td><div class="ig-two-lines">${actors.length?e(actors.join('、')):'<span class="ig-missing">无演员</span>'}</div><small class="ig-muted">${e(d.credits.filter(x=>x.job==='director').map(x=>'导演 '+x.name).join('、'))}</small></td><td><select data-ig-category="${e(i.id)}" aria-label="${e(title(i))}的分类" ${isPublished?'disabled':''}>${options(categories(),d.categoryId)}</select><div class="ig-sub">${e(series.join('、')||'未关联系列')}</div></td><td><div>${e(d.media.releasePrecision==='day'?d.media.releaseDate:d.media.year||'日期未知')}</div><div class="ig-sub">中文：${d.media.supportsChinese==null?'未知':d.media.supportsChinese?'支持':'不支持'}</div></td><td><span class="ig-source ${i.fetchState==='failed'?'ig-error':''}">${sourceLabel(i)}</span><div class="ig-sub">${isGroup?'手动组建':e(i.fetchState==='manual'?'未绑定来源':d.source.provider)}</div><div class="ig-gaps">${s.missing.length?s.missing.map(x=>`<span class="ig-pill">缺${x}</span>`).join(''):'<span class="ig-complete">常用项齐全</span>'}${s.blockers.length?'<span class="ig-pill danger">有发布阻断</span>':''}</div></td><td><span class="ig-pill ${isPublished||receipt(i)?'success':''}">${isPublished?'已发布':receipt(i)?'已人工确认':'待核对'}</span></td><td class="ig-row-actions">${button('peek',peek?'收起预览':'行内预览',i.id)}${isGroup?button('review-group','核对整组',i.id,isPublished?'disabled':'')+button('group-edit','调整分集',i.id,isPublished?'disabled':'')+button('ungroup','解除分组',i.id,isPublished?'disabled':''):button(child?'review-group':'review',child?'核对整组':'核对确认',child?d.media.parentId:i.id,isPublished||receipt(i)?'disabled':'')}${!isGroup&&!isPublished?button('retry','重新获取',i.id,i.fetchState==='running'?'disabled':''):''}</td></tr>${peek?detail(i):''}`;
    }
    function render(){
      const shown=displayed(),sel=selectedRows(),reason=groupReason(sel),visibleSelected=shown.filter(x=>selected.has(x.i.id)).length;
      return `<section class="ig-page"><header class="studio-mast"><div class="studio-mast-copy"><h1>录入工作台</h1><p><span>${rows().filter(i=>i.status!=='published'&&!receipt(i)).length}</span> 条待核对 <i></i> <span>${rows().filter(i=>receipt(i)&&i.status!=='published').length}</span> 条已确认，等待发布</p><div class="ig-actions"><a class="btn primary" href="storage-intake.html">从下载目录选择</a><button class="btn ghost" data-action="new-batch">${V.icon('plus','sm')} 扫描文件</button><button class="btn ghost" data-action="wb-new-manual">手动新建</button></div></div><div class="studio-contact" aria-hidden="true">${rows().flatMap(i=>{const x=draft(i).images.find(im=>im.purpose==='poster');return x?[x.url]:[]}).slice(0,5).map(src=>`<img src="${e(src)}" alt="">`).join('')}</div></header><div class="studio-section"><h2>录入队列</h2><form id="ig-search"><button class="icon-btn" aria-label="执行录入搜索">${V.icon('search','sm')}</button><input name="q" value="${e(query)}" placeholder="搜索影片、演员或文件" aria-label="搜索录入结果"></form></div><div class="ig-toolbar"><div class="ig-filters">${[['all','全部'],['episodes','分集线索'],['missing','缺少资料'],['blocked','发布阻断'],['failed','获取失败'],['confirmed','已确认'],['published','已发布']].map(([k,n])=>{const count=rows().filter(i=>k==='all'||k==='episodes'&&hasEpisodeClue(i)||k==='missing'&&issues(i).missing.length||k==='blocked'&&issues(i).blockers.length||k==='failed'&&i.fetchState==='failed'||k==='confirmed'&&receipt(i)&&i.status!=='published'||k==='published'&&i.status==='published').length;return `<button class="${filter===k?'active':''}" data-action="ig-filter" data-id="${k}">${n}<small>${count}</small></button>`;}).join('')}</div></div><div class="ig-selection"><div><strong>${sel.length?`已选 ${sel.length} 条草稿`:'勾选同一作品的上下集，可创建分集容器'}</strong>${sel.length>visibleSelected?`<small>其中 ${sel.length-visibleSelected} 条不在当前显示范围</small>`:''}</div><div class="ig-actions">${button('group-new','创建分集容器','',reason?`disabled title="${e(reason)}"`:'')}${button('review-selected','批量核对','',sel.length?'':'disabled')}${button('publish','发布所选','',sel.length?'':'disabled')}${sel.length?button('batch-tools','更多整理')+button('clear-selection','取消选择'):''}</div></div><div class="ig-table-scroll"><table class="ig-table"><thead><tr><th><input type="checkbox" data-ig-select-visible aria-label="选择当前显示的草稿，容器包含全部分集" ${shown.some(x=>x.i.status!=='published')&&shown.filter(x=>x.i.status!=='published').every(x=>selected.has(x.i.id))?'checked':''}></th><th>作品 / 编号 / 文件</th><th>演职员</th><th>分类 / 系列</th><th>发行 / 中文</th><th>获取结果 / 缺项</th><th>核对状态</th><th>操作</th></tr></thead><tbody>${shown.map(row).join('')||'<tr><td colspan="8" class="ig-empty">没有符合条件的草稿；可以切回全部或清空搜索。</td></tr>'}</tbody></table></div><div class="ig-bottom"><span>${rows().filter(matches).length} 条符合条件 · ${rows().length} 条草稿</span><div>${button('layout',layout==='compact'?'展开所有行内预览':'收起所有行内预览')}</div></div><p class="ig-legend">常用项检查标题、封面、演员、发行日期、简介和分类。缺演员、封面等可以稍后补充；“齐全”不代表匹配正确。资料完整度、获取结果和人工确认分别显示。</p></section>`;
    }
    function modal(titleText,body,actions){ctx.open(titleText,body,actions);const node=document.getElementById('admin-modal');node?.classList.add('ig-modal-root');}
    function groupDialog(){
      const g=groupPlan,items=g.order.map(find),base=g.groupId?draft(find(g.groupId)):draft(find(g.sourceId));
      const image=base.images.find(x=>x.purpose==='poster')?.url||'studio/assets/placeholder.svg';
      modal(g.groupId?'调整分集容器':'建立分集组 · 创建容器',`<div class="ig-group-form"><p class="ig-dialog-intro">创建一个不直接播放的容器，把所选视频放在它下面。各集保留资料和视频文件。</p><div class="ig-group-fields"><label>容器名称<input id="ig-group-title" value="${e(g.title)}" placeholder="例如：海岸手记"></label>${g.groupId?'':`<label>容器资料取自<select id="ig-group-source">${options(items.map(i=>[i.id,title(i)]),g.sourceId)}</select></label>`}<label>起始集号<input id="ig-group-start" type="number" min="1" step="1" value="${g.start}"></label></div><div class="ig-tree"><div class="ig-container-preview"><img src="${e(image)}" alt="容器封面预览"><div><span class="ig-pill purple">容器 · 不直接播放</span><h3 id="ig-group-title-preview">${e(g.title)}</h3><p>${e(base.credits.filter(x=>x.job==='actor').map(x=>x.name).join('、')||'未填写演员')} · ${e(C.categoryPath(base.categoryId))}</p><p class="ig-muted">${e(base.media.desc||'暂无简介')}</p></div></div><ol class="ig-episode-order">${items.map((i,n)=>`<li><span>第 ${g.start+n} 集</span><div><strong>${e(title(i))}</strong><small>${e(parts(draft(i)).map(x=>x.path).join(' / '))}</small></div><div>${button('group-up','上移',i.id,n===0?'disabled':'')}${button('group-down','下移',i.id,n===items.length-1?'disabled':'')}</div></li>`).join('')}</ol></div><p class="ig-dialog-note">${g.groupId?'调整名称或顺序后，容器与各集的原确认会失效。':'复制所选资料的封面、简介、演职员、日期、分类及关联；不复制文件、编号与来源身份。原分集的标题和编号保持不变。'} 当前顺序对应第 ${g.start}～${g.start+items.length-1} 集；这里只保存草稿，不发布。</p><div id="ig-modal-error" role="status"></div></div>`,button('cancel','取消')+button('group-save',g.groupId?'保存容器与集顺序':`创建容器并关联 ${items.length} 集`));
    }
    function openGroup(id){
      const group=id&&find(id),items=group?members(id):selectedRows(),reason=group?(!items.length?'该容器没有分集':items.some(x=>x.status==='published')||group.status==='published'?'已发布分集请到正式资料中维护':''):groupReason(items);
      if(reason)return V.toast(reason);
      groupPlan={groupId:id||'',order:items.map(x=>x.id),sourceId:items[0].id,title:group?title(group):title(items[0]).replace(/\s*·\s*(上篇|下篇)$/,''),start:group?draft(items[0]).media.episodeNumber:1,base:snapshot(group?[group,...items]:items)};
      groupDialog();
    }
    function readGroup(){groupPlan.title=document.getElementById('ig-group-title').value.trim();groupPlan.start=Number(document.getElementById('ig-group-start').value);if(!groupPlan.title)throw Error('请填写容器名称');if(!Number.isInteger(groupPlan.start)||groupPlan.start<1)throw Error('起始集号须为正整数');}
    function saveGroup(){
      if(!groupPlan)return;readGroup();const g=groupPlan;if(!unchanged(g.base))throw Error('所选草稿已变化，请取消后重新预览');
      const items=g.order.map(find);let parent=g.groupId&&find(g.groupId),d=copy(parent?draft(parent):draft(find(g.sourceId)));
      if(!parent){const reason=groupReason(items);if(reason)throw Error(reason);parent={id:C.uid('group'),status:'review',fetchState:'manual',reviewed:false};rows().push(parent);d.media.identifier='';d.source={provider:'手动资料',query:'',url:'',candidate:null};d.locks={};}
      Object.assign(d.media,{title:g.title,kind:'group',parentId:'',episodeNumber:null});d.editions=[];commitDraft(parent,d);
      items.forEach((i,n)=>{const child=copy(draft(i));Object.assign(child.media,{kind:'episode',parentId:parent.id,episodeNumber:g.start+n});commitDraft(i,child);});
      selected.clear();[parent,...items].forEach(i=>selected.add(i.id));collapsed.delete(parent.id);ctx.persist();groupPlan=null;ctx.close();ctx.refresh();document.getElementById('ig-row-'+parent.id)?.scrollIntoView?.({block:'center',behavior:'smooth'});V.toast('容器与分集已保存为草稿，可在当前列表一起核对');
    }
    function review(items){
      items=ordered(items);
      if(!items.length)return V.toast('请先勾选需要核对的草稿');
      pending={type:'review',base:snapshot(items)};
      const structural=shapeError(items),blocked=items.some(i=>issues(i).blockers.length),notes=items.filter(i=>issues(i).missing.length).length;
      modal(`核对所选 ${items.length} 条草稿`, `<p class="ig-dialog-intro">直接对照下表确认内容；无需逐条进入编辑器。确认后仍需手动发布。</p>${structural?`<p class="ig-error">${e(structural)}</p>`:''}<div class="ig-review-list">${items.map(i=>{const d=draft(i),s=issues(i);return `<article><img src="${e(d.images.find(x=>x.purpose==='poster')?.url||'studio/assets/placeholder.svg')}" alt="${e(title(i))}封面"><div><h3>${e(title(i))} ${container(d)?'<span class="ig-pill purple">容器</span>':d.media.parentId?`<span class="ig-pill purple">第 ${d.media.episodeNumber} 集</span>`:''}</h3><p>${e(d.credits.filter(x=>x.job==='actor').map(x=>x.name).join('、')||'无演员')} · ${e(C.categoryPath(d.categoryId))} · ${d.media.year||'日期未知'}</p><p>${e(d.media.identifier||'')} · ${sourceLabel(i)} · ${e(d.seriesIds.map(id=>C.find('series',id)?.name).filter(Boolean).join('、')||'无系列')}</p><p class="ig-muted">${container(d)?'容器不绑定视频':e(parts(d).map(x=>x.path).join(' / '))}</p><p class="ig-muted">${e(d.media.desc||'暂无简介')}</p><div class="ig-gaps">${s.missing.map(x=>`<span class="ig-pill">缺${x}</span>`).join('')}${s.blockers.map(x=>`<span class="ig-error">${e(x)}</span>`).join('')}</div></div><a href="#draft/${e(i.id)}" data-action="ig-edit" data-id="${e(i.id)}">修改 ↗</a></article>`;}).join('')}</div><p class="ig-dialog-note">${notes?`${notes} 条有非必填缺项，可以接受现状后确认。`:''}缺标题、文件无效或分集结构不完整须先解决；未选条目不受影响。</p><div id="ig-modal-error" role="status"></div>`,button('cancel','返回列表')+button('review-commit','确认这些资料','',structural||blocked?'disabled':''));
    }
    function publish(){
      const items=selectedRows();if(!items.length)return V.toast('请先勾选需要发布的草稿');
      if(items.some(i=>!receipt(i)))return V.toast('所选包含尚未确认的草稿，请先使用“批量核对”');
      const error=shapeError(items)||items.flatMap(i=>issues(i).blockers)[0];if(error)return V.toast(error);
      pending={type:'publish',base:snapshot(items)};
      modal('手动发布所选资料',`<p class="ig-dialog-intro">发布以下 ${items.length} 条草稿。容器及其分集一起处理，文件保持原位置。</p><ul class="ig-publish-list">${items.map(i=>`<li>${e(title(i))}<span>${container(draft(i))?'容器':draft(i).media.parentId?'分集':'作品'}</span></li>`).join('')}</ul><div id="ig-modal-error" role="status"></div>`,button('cancel','取消')+button('publish-commit','确认发布'));
    }
    function retryItems(items){for(const i of items){const d=copy(draft(i));const sample=StudioCinema.films.find(f=>String(f.id)===i.id);d.source.candidate={title:sample?.title||title(i),desc:sample?.summary||d.media.desc,year:sample?.year||d.media.year};commitDraft(i,d);i.fetchState='succeeded';}ctx.persist();ctx.close();ctx.refresh();V.toast('演示候选已返回，人工资料保持不变；需决定是否采用');}
    document.addEventListener('submit',ev=>{if(ev.target.id==='ig-search'){ev.preventDefault();query=new FormData(ev.target).get('q').trim();ctx.refresh();}});
    document.addEventListener('change',ev=>{
      const t=ev.target;
      if(t.dataset.igSelect){setSelected(find(t.dataset.igSelect),t.checked);ctx.refresh();}
      if(t.hasAttribute?.('data-ig-select-visible')){for(const {i} of displayed())setSelected(i,t.checked);ctx.refresh();}
      if(t.dataset.igCategory){const i=find(t.dataset.igCategory);if(i.status==='published')return;const d=copy(draft(i));d.categoryId=t.value;commitDraft(i,d);ctx.persist();ctx.refresh();V.toast('分类已保存，原人工确认已失效');}
      if(t.id==='ig-group-source'&&groupPlan){try{readGroup();groupPlan.sourceId=t.value;groupDialog();}catch(err){document.getElementById('ig-modal-error').textContent=err.message;}}
      if(t.id==='ig-group-start'&&groupPlan){try{readGroup();groupDialog();}catch(err){document.getElementById('ig-modal-error').textContent=err.message;}}
    });
    document.addEventListener('input',ev=>{if(ev.target.id==='ig-group-title'&&groupPlan){groupPlan.title=ev.target.value;document.getElementById('ig-group-title-preview').textContent=ev.target.value||'未命名容器';}});
    document.addEventListener('click',ev=>{
      const el=ev.target.closest('[data-action^="ig-"]');if(!el)return;ev.preventDefault();const a=el.dataset.action.slice(3),id=el.dataset.id;
      try{
        if(a==='cancel'){pending=null;groupPlan=null;ctx.close();return;}
        if(a==='edit'){pending=null;ctx.close();location.hash='draft/'+id;return;}
        if(a==='filter'){filter=id;ctx.refresh();return;}
        if(a==='clear-selection'){selected.clear();ctx.refresh();return;}
        if(a==='peek'){expanded.has(id)?expanded.delete(id):expanded.add(id);if(layout==='preview')layout='compact';ctx.refresh();return;}
        if(a==='layout'){layout=layout==='compact'?'preview':'compact';expanded.clear();ctx.refresh();return;}
        if(a==='collapse'){collapsed.has(id)?collapsed.delete(id):collapsed.add(id);ctx.refresh();return;}
        if(a==='group-new')return openGroup();if(a==='group-edit')return openGroup(id);
        if(a==='group-up'||a==='group-down'){readGroup();const n=groupPlan.order.indexOf(id),next=n+(a==='group-up'?-1:1);if(next>=0&&next<groupPlan.order.length)[groupPlan.order[n],groupPlan.order[next]]=[groupPlan.order[next],groupPlan.order[n]];groupDialog();return;}
        if(a==='group-save')return saveGroup();
        if(a==='ungroup'){const parent=find(id),children=members(id);if(parent.status==='published'||children.some(x=>x.status==='published'))throw Error('已发布分集请在正式资料中维护');pending={type:'ungroup',parent:id,base:snapshot([parent,...children])};modal('解除分组并保留各集',`<p class="ig-dialog-intro">移除“${e(title(parent))}”容器草稿，下面 ${children.length} 集恢复为独立视频。每集资料和视频文件保留，需要重新确认。</p><ul>${children.map(x=>`<li>${e(title(x))}</li>`).join('')}</ul><div id="ig-modal-error" role="status"></div>`,button('cancel','保留分组')+button('ungroup-commit','解除分组，保留视频'));return;}
        if(a==='review-selected')return review(selectedRows());if(a==='review')return review([find(id)]);if(a==='review-group')return review([find(id),...members(id)].filter(i=>i.status!=='published'));if(a==='publish')return publish();
        if(a==='retry'){const i=find(id);if(i.status==='published')return;return retryItems([i]);}
        if(a==='batch-tools'){const items=selectedRows();if(!items.length)return;pending={type:'batch-tools',base:snapshot(items)};const videos=items.filter(i=>!container(draft(i))&&i.fetchState!=='running');modal('整理所选草稿',`<p class="ig-dialog-intro">只处理本次选中的 ${items.length} 条草稿；修改后需要重新人工确认。</p><label>统一分类<select id="ig-batch-category">${options(categories(),'unsorted')}</select></label>${button('batch-category','应用分类到所选')}<p class="ig-dialog-note">重新获取只准备候选，保留已有人工资料与字段锁。容器和运行中任务不重复获取。</p>${button('batch-retry',`重新获取所选 ${videos.length} 个视频`,'',videos.length?'':'disabled')}<div id="ig-modal-error" role="status"></div>`,button('cancel','返回列表'));return;}
        if(a==='batch-category'||a==='batch-retry'){if(!pending||pending.type!=='batch-tools')return;if(!unchanged(pending.base))throw Error('所选草稿已变化，请重新打开批量整理');const items=pending.base.map(x=>find(x.id));if(a==='batch-retry'){pending=null;return retryItems(items.filter(i=>!container(draft(i))&&i.fetchState!=='running'));}const category=document.getElementById('ig-batch-category').value;for(const i of items){const d=copy(draft(i));d.categoryId=category;commitDraft(i,d);}ctx.persist();pending=null;ctx.close();ctx.refresh();V.toast('所选分类已更新，原确认已失效');return;}
        if(['review-commit','publish-commit','ungroup-commit'].includes(a)){
          const type=a.replace('-commit','');if(!pending||pending.type!==type)return;
          if(!unchanged(pending.base))throw Error('草稿、任务或确认状态已变化，请返回列表重新核对');
          const items=pending.base.map(x=>find(x.id));
          if(type==='ungroup'){
            const children=members(pending.parent);children.forEach(i=>{const d=copy(draft(i));Object.assign(d.media,{kind:'video',parentId:'',episodeNumber:null});commitDraft(i,d);});const at=rows().findIndex(x=>x.id===pending.parent);rows().splice(at,1);selected.delete(pending.parent);
          }else{
            const error=shapeError(items)||items.flatMap(i=>issues(i).blockers)[0];if(error)throw Error(error);
            if(type==='review')items.forEach(i=>{i.reviewed=true;i.reviewedRevision=i.editRevision||0;i.status='ready';});
            else{if(items.some(i=>!receipt(i)))throw Error('存在尚未确认的草稿');items.sort((a,b)=>Number(container(draft(b)))-Number(container(draft(a)))).forEach(i=>{ctx.workbench.writeFormal(i.id,draft(i));i.status='published';selected.delete(i.id);});}
          }
          ctx.persist();pending=null;ctx.close();ctx.refresh();V.toast(type==='review'?'已确认当前资料；可继续手动发布':type==='publish'?'所选资料已手动发布（演示）':'已解除分组，各视频保留');
        }
      }catch(err){const node=document.getElementById('ig-modal-error');if(node)node.textContent=err.message;else V.toast(err.message);}
    });
    return {render};
  }
  window.VXIngest={create,summarize};
})();
