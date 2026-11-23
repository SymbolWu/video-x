// A native select remains available for touch, keyboard and screen reader use.
// Desktop category editing uses a menu anchored to the current table row.
(() => {
  const selector = 'select[data-ig-category],select[data-vl-sort]';
  let menu, trigger;
  function close(restore=false) {
    menu?.remove(); menu=null;
    if(trigger){trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus();}
    trigger=null;
  }
  function open(select,button) {
    close();trigger=button;
    menu=document.createElement('div');menu.className='studio-menu';menu.setAttribute('role','menu');
    for(const option of select.options){
      const choice=document.createElement('button');choice.type='button';choice.setAttribute('role','menuitemradio');choice.setAttribute('aria-checked',String(option.selected));choice.textContent=option.textContent;
      choice.onclick=()=>{select.value=option.value;close();select.dispatchEvent(new Event('change',{bubbles:true}));decorate();const next=[...document.querySelectorAll(selector)].find(s=>(select.dataset.igCategory ? s.dataset.igCategory===select.dataset.igCategory : s.dataset.vlSort===select.dataset.vlSort));next?.nextElementSibling?.focus();};
      menu.append(choice);
    }
    document.body.append(menu);button.setAttribute('aria-expanded','true');
    const r=button.getBoundingClientRect();menu.style.left=Math.min(r.left,innerWidth-menu.offsetWidth-8)+'px';menu.style.top=(r.bottom+menu.offsetHeight+8<=innerHeight?r.bottom+4:Math.max(8,r.top-menu.offsetHeight-4))+'px';
    menu.querySelector('[aria-checked=true]')?.focus();
  }
  function decorate() {
    for(const s of document.querySelectorAll(selector)){
      if(s.nextElementSibling?.classList.contains('studio-category'))continue;
      const b=document.createElement('button');b.type='button';b.className='studio-category';b.setAttribute('aria-label',s.getAttribute('aria-label'));b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');b.disabled=s.disabled;b.textContent=s.selectedOptions[0]?.textContent;b.onclick=()=>open(s,b);
      s.insertAdjacentElement('afterend',b);
    }
  }
  document.addEventListener('pointerdown',ev=>{if(menu&&!menu.contains(ev.target)&&ev.target!==trigger)close();});
  document.addEventListener('keydown',ev=>{if(!menu)return;if(ev.key==='Escape'){ev.preventDefault();close(true);}else if(ev.key==='Tab'){close(true);}else if(['ArrowUp','ArrowDown','Home','End'].includes(ev.key)){ev.preventDefault();const opts=[...menu.children],i=opts.indexOf(document.activeElement);opts[ev.key==='Home'?0:ev.key==='End'?opts.length-1:(i+(ev.key==='ArrowDown'?1:-1)+opts.length)%opts.length].focus();}});
  addEventListener('resize',()=>close());addEventListener('scroll',e=>{if(menu&&!menu.contains(e.target))close();},true);
  new MutationObserver(()=>{if(trigger&&!trigger.isConnected)close();decorate();}).observe(document.getElementById('admin-app'),{childList:true,subtree:true});decorate();
})();
