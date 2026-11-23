"use strict";
const disk12="WD_12T_DISK",disk8="WD_8T_DISK",inbox=disk12+"/Download";
const samples={"海岸手记 上篇.mp4":"1.8 GB","海岸手记 下篇.mkv":"2.1 GB","山间来信.mp4":"980 MB","周末/放映日记.mkv":"1.2 GB"};
const baseDirs=[disk12,disk8,...["日本","欧美","三级","国产 AV","动漫"].map(n=>disk12+"/"+n),...["pixelization-1","pixelization-57","pixelization-58","uncensored-6"].map(n=>disk12+"/日本/"+n),disk8+"/影片"];
const existing={[disk12+"/日本/pixelization-1"]:50,[disk12+"/日本/pixelization-57"]:49,[disk12+"/日本/pixelization-58"]:45};
const $=id=>document.getElementById(id),html=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const leaf=s=>s.split("/").at(-1),parent=s=>s.includes("/")?s.slice(0,s.lastIndexOf("/")):"";
const initial=()=>({rows:Object.keys(samples).slice(0,2).map(file=>({file,dest:"",state:"draft"})),created:[],recent:""});
let data;try{data=JSON.parse(localStorage.getItem("video-x.design.intake.v1"))}catch{}if(!data?.rows)data=initial();
function save(){try{localStorage.setItem("video-x.design.intake.v1",JSON.stringify(data))}catch{}}
let selected=new Set(),scope=[],picked=new Set(),dir="",view="",filter="";
const checked=()=>data.rows.filter(r=>selected.has(r.file)&&r.state!=="published");
function button(text,action,value="",attr=""){return '<button data-action="'+action+'" data-value="'+html(value)+'" '+attr+'>'+html(text)+'</button>'}
function render(){
 const items=checked();$("batch").innerHTML='<small>已选 '+items.length+' 部</small>'+button("批量设目标","target","","class=ghost "+(!items.length?"disabled":""))+button("核对所选","review","",""+(!items.length?"disabled":""))+button("发布所选","publish","","class=primary "+(!items.length?"disabled":""));
 $("rows").innerHTML=data.rows.map(r=>'<tr><td><input type="checkbox" aria-label="选择'+html(r.file)+'" data-row="'+html(r.file)+'" '+(r.state==="published"?"disabled":"")+' '+(selected.has(r.file)?"checked":"")+'></td><td><strong>'+html(leaf(r.file))+'</strong><small>'+html(inbox+"/"+parent(r.file))+' · '+samples[r.file]+'</small></td><td>'+(r.dest?html(r.dest):'<span class="chip">待设目标</span>')+(r.state==="published"?"":button(r.dest?"更改位置":"设置整理目标","target",r.file,'class="link"'))+'</td><td><span class="chip '+(r.state==="draft"?"":"done")+'">'+({draft:"待核对",reviewed:"已人工确认",published:"已发布"})[r.state]+'</span></td><td>'+(r.state==="published"?"已就位":r.state==="reviewed"?button("手动发布","publish",r.file):button("核对","review",r.file))+'</td></tr>').join("");
 $("all").checked=items.length>0 && items.length===data.rows.filter(r=>r.state!=="published").length;
}
function openModal(mode,title){view=mode;$("title").textContent=title;if(!$("dialog").open)$("dialog").showModal()}
function done(msg){$("dialog").close();$("notice").textContent=msg;save();render()}
function crumbs(root){const path=dir?dir.split("/"):[];return '<nav class="trail">'+button(root,"cd","") + path.map((s,i)=>' / '+button(s,"cd",path.slice(0,i+1).join("/"))).join("")+'</nav>'}
function queueFiles(){
 openModal("files","从下载目录选择");const folders=dir?[]:["周末"];
 const files=Object.keys(samples).filter(p=>parent(p)===dir && leaf(p).includes(filter));
 $("content").innerHTML=crumbs(inbox)+'<input class="input" id="filter" aria-label="筛选当前目录" placeholder="筛选当前目录" value="'+html(filter)+'"><div class="list">'+folders.filter(f=>f.includes(filter)).map(f=>'<div class="line">'+button("▸ "+f,"cd",f,'class="link folder"')+'</div>').join("")+files.map(f=>{const added=data.rows.some(r=>r.file===f);return '<div class="line"><label><input type="checkbox" data-pick="'+html(f)+'" '+(picked.has(f)?"checked ":"")+(added?"disabled":"")+'>'+html(leaf(f))+'</label><small>'+(added?"已在队列":samples[f])+'</small></div>'}).join("")+(!files.length&&!folders.length?'<p>当前目录没有匹配影片</p>':'')+'</div><div class="foot"><span>已选 '+picked.size+' 个文件</span>'+button("加入录入队列","add","",'class="primary" '+(!picked.size?'disabled':''))+'</div>';
}
function scopeFor(value){return value?data.rows.filter(r=>r.file===value):checked()}
function loadCount(dest){return (existing[dest]||0)+data.rows.filter(r=>r.dest===dest&&!scope.includes(r)).length}
function targets(){
 openModal("target","选择整理目标");const dirs=[...baseDirs,...data.created].filter(p=>parent(p)===dir).sort((a,b)=>a.localeCompare(b,"zh",{numeric:true}));const usable=dir.includes("/");const count=loadCount(dir);
 $("content").innerHTML=crumbs("资源盘")+(data.recent?'<div class="links"><small>最近使用</small>'+button(data.recent,"cd",data.recent,'class="link"')+'</div>':'')+'<div class="list">'+dirs.map(p=>'<div class="line">'+button("▸ "+leaf(p),"cd",p,'class="link folder"')+'<small>'+(p.includes("/")? ((existing[p]||0)+' 个已有视频'):p===disk12?"下载与整理盘":"其他资源盘")+'</small></div>').join("")+(!dirs.length?'<p>已到当前目录</p>':'')+'</div>'+(usable?button("规划新子目录","newdir"):'')+'<div class="foot"><div class="'+(usable&&count+scope.length>50?'danger':'hint')+'">'+(usable?'已有及已分配 '+count+' + 本次 '+scope.length+' = '+(count+scope.length)+' / 50'+(count+scope.length>50?' · 超出上限':''):'请选择盘内的归档目录')+'</div>'+button("应用到 "+scope.length+" 部","apply","",'class="primary" '+(!usable||count+scope.length>50?'disabled':''))+'</div>';
}
function review(mode){
 openModal(mode,mode==="review"?"核对整理计划":"确认移动并发布");const issues=[];
 for(const r of scope){if(!r.dest)issues.push(leaf(r.file)+" 尚未设置目标");if(mode==="publish"&&r.state!=="reviewed")issues.push(leaf(r.file)+" 需要先核对");}
 $("content").innerHTML=scope.map(r=>'<div class="paths"><strong>'+html(leaf(r.file))+'</strong><span>从 '+html(inbox+"/"+r.file)+'</span><span>到 '+html(r.dest?r.dest+"/"+leaf(r.file):"待设目标")+'</span><small>'+samples[r.file]+' · '+(r.dest?(r.dest.startsWith(disk12+"/")?'同盘移动':'跨盘复制校验'):'待安排')+'</small></div>').join("")+issues.map(s=>'<p class="danger">'+html(s)+'</p>').join("")+'<div class="foot"><small class="dialog-note">'+(mode==="review"?"确认将保存本次资料和目标位置":"原型仅模拟移动和发布")+'</small>'+button(mode==="review"?"确认本次核对":"移动并发布 "+scope.length+" 部","commit","",'class="primary" '+(issues.length?'disabled':''))+'</div>';
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action,v=b.dataset.value;
 if(a==="reset-demo"){data=initial();selected.clear();done("示例已重置");return}
 if(a==="cd"){dir=v;filter="";view==="files"?queueFiles():targets();return}
 if(a==="add"){data.rows.push(...[...picked].filter(f=>!data.rows.some(r=>r.file===f)).map(file=>({file,dest:"",state:"draft"})));selected=new Set(picked);done("已加入 "+picked.size+" 部影片");return}
 if(a==="target"||a==="review"||a==="publish"){scope=scopeFor(v);if(!scope.length)return;dir=scope[0].dest||disk12;a==="target"?targets():review(a);return}
 if(a==="newdir"){openModal("newdir","规划新子目录");$("content").innerHTML='<p>'+html(dir)+'</p><input id="name" class="input" aria-label="目录名称" maxlength="100"><p id="why" class="danger"></p><div class="foot">'+button("返回","back")+button("选择新目录","create")+'</div>';return}
 if(a==="back"){targets();return}
 if(a==="create"){const n=$("name").value.trim(),p=dir+"/"+n;if(!n||n.startsWith(".")||/[\\/:\0]/.test(n)||[...baseDirs,...data.created].includes(p)){$("why").textContent="请使用当前层尚未占用的有效目录名";return}data.created.push(p);dir=p;targets();return}
 if(a==="apply"){for(const r of scope)if(r.dest!==dir){r.dest=dir;r.state="draft"}data.recent=dir;done("已保存整理位置，文件仍在下载目录");return}
 if(a==="commit"){const checking=view==="review";for(const r of scope){r.state=checking?"reviewed":"published";if(!checking)selected.delete(r.file)}done(checking?"已核对，等待手动发布":"示例影片已完成模拟移动与发布");return}
});
document.addEventListener("change",e=>{if(e.target.dataset.row){e.target.checked?selected.add(e.target.dataset.row):selected.delete(e.target.dataset.row);render()}else if(e.target.dataset.pick){e.target.checked?picked.add(e.target.dataset.pick):picked.delete(e.target.dataset.pick);queueFiles()}});
document.addEventListener("input",e=>{if(e.target.id==="filter"){filter=e.target.value;queueFiles();$("filter").focus();$("filter").setSelectionRange(filter.length,filter.length)}});
$("all").onchange=e=>{selected=new Set(e.target.checked?data.rows.filter(r=>r.state!=="published").map(r=>r.file):[]);render()};
$("pick").onclick=()=>{picked=new Set();dir="";filter="";queueFiles()};$("close").onclick=()=>$("dialog").close();render();


$("reset").onclick=()=>{openModal("reset","重置示例");$("content").innerHTML="<p>恢复两条初始草稿，清除这份交互稿内的模拟整理记录。</p>"+button("重置示例记录","reset-demo","","class=primary")};
