export function createUIMotion(){
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const easing='cubic-bezier(.22,1,.36,1)';
 const ghosts=new Set();
 function indicator(){
  const tabs=document.querySelector('.catalog-header .type-tabs'),selected=tabs?.querySelector('[aria-selected=true]');
  if(!tabs||!selected)return null;
  let line=tabs.querySelector('.tab-indicator');
  if(!line){line=document.createElement('span');line.className='tab-indicator';line.setAttribute('aria-hidden','true');tabs.append(line)}
  const area=tabs.getBoundingClientRect(),item=selected.getBoundingClientRect();
  line.style.left=`${item.left-area.left}px`;line.style.width=`${item.width}px`;
  return line;
 }
 function beforeRender(container,reason){
  const line=container?.querySelector('.tab-indicator'),results=container?.querySelector('#results');
  const oldLine=line?.getBoundingClientRect();
  const crossfade=!reduced()&&['tab','sort','filter','view','reset','favorite'].includes(reason)&&results;
  return {line:oldLine,clone:crossfade?results.cloneNode(true):null,rect:crossfade?results.getBoundingClientRect():null,scrollY};
 }
 function afterRender(container,snapshot,{reason='update',restore=false}={}){
  const line=indicator();
  if(reduced()||restore||reason==='restore')return;
  if(line&&snapshot?.line&&reason==='tab'){
   const current=line.getBoundingClientRect(),previous=snapshot.line;
   if(current.width){line.dataset.moving='true';const a=line.animate([{transform:`translateX(${previous.left-current.left}px) scaleX(${previous.width/current.width})`},{transform:'translateX(0) scaleX(1)'}],{duration:280,easing});a.finished.then(()=>{line.dataset.moving='false'},()=>{});}
  }
  const results=container?.querySelector('#results');
  if(!results||!snapshot?.rect)return;
  for(const node of ghosts)node.remove();ghosts.clear();
  if(snapshot.clone&&snapshot.rect.height){
   const ghost=snapshot.clone;ghost.removeAttribute('id');ghost.removeAttribute('role');ghost.removeAttribute('aria-labelledby');ghost.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));ghost.classList.add('results-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
   Object.assign(ghost.style,{position:'absolute',top:`${snapshot.rect.top+snapshot.scrollY}px`,left:`${snapshot.rect.left}px`,width:`${snapshot.rect.width}px`,maxHeight:`${Math.max(0,innerHeight-snapshot.rect.top)}px`,overflow:'hidden',pointerEvents:'none'});
   document.body.append(ghost);ghosts.add(ghost);
   const exit=ghost.animate([{opacity:1},{opacity:0}],{duration:130,easing:'ease-out'});const remove=()=>{ghost.remove();ghosts.delete(ghost)};exit.finished.then(remove,remove);
  }
  results.dataset.transitionReason=reason;
  results.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing});
  if(reason==='sort')document.querySelector('#sort-trigger')?.animate([{color:'var(--accent)'},{color:'var(--text)'}],{duration:420,easing:'ease-out'});
 }
 function dialogOpened(dialog){
  dialog.inert=false;delete dialog.dataset.closing;
  if(reduced())return;
  dialog.animate([{opacity:0,transform:'translateY(8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:190,easing});
 }
 function closeDialog(dialog){
  if(!dialog.open||dialog.dataset.closing)return;
  if(reduced()){dialog.close();return}
  dialog.dataset.closing='true';dialog.inert=true;
  const animation=dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(5px) scale(.99)'}],{duration:140,easing:'ease-in'});
  animation.finished.then(()=>{dialog.close();dialog.inert=false;delete dialog.dataset.closing},()=>{dialog.inert=false;delete dialog.dataset.closing});
 }
 function favorite(button){if(!reduced())button.animate([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.45},{transform:'scale(1)'}],{duration:270,easing});}
 window.addEventListener('resize',indicator);
 return {beforeRender,afterRender,dialogOpened,closeDialog,favorite};
}
