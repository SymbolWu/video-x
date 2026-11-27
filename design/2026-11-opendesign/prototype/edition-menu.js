// Non-modal, body-mounted menu. Top-layer support is optional; fixed positioning
// is the fallback so the hero's clipping and filters never own this surface.
export function createEditionMenu({ getModel, onSelect, checkIcon, id="edition-menu", title="播放版本", noun="个版本", singleLabel="仅有此版本", triggerSelector='[data-action="editions"]', minWidth=312, variant="edition" }) {
  const menu = document.createElement('div');
  menu.id = id;
  menu.className = `edition-menu ${variant}-menu`;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-labelledby', `${id}-heading`);
  menu.setAttribute('popover', 'manual');
  menu.hidden = true;
  document.body.append(menu);
  let trigger = null, opened = false, frame = 0;
  const buttons = () => [...menu.querySelectorAll('[role="menuitemradio"]')];

  function close({ restoreFocus = false } = {}) {
    if (!opened) return;
    opened = false;
    trigger?.setAttribute('aria-expanded', 'false');
    if (typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) menu.hidePopover();
    menu.hidden = true;
    cancelAnimationFrame(frame);
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
  function position() {
    if (!opened || !trigger?.isConnected) { close(); return; }
    const rect = trigger.getBoundingClientRect(), viewport = window.visualViewport;
    const viewLeft = viewport?.offsetLeft ?? 0, viewTop = viewport?.offsetTop ?? 0;
    const viewWidth = viewport?.width ?? document.documentElement.clientWidth;
    const viewBottom = viewTop + (viewport?.height ?? window.innerHeight);
    const edge = 12, gap = 8;
    const header = document.querySelector('.site-header');
    const headerBottom = header?.getBoundingClientRect().bottom ?? viewTop;
    let bottom = viewBottom - edge;
    const nav = document.querySelector('.main-nav');
    if (nav && getComputedStyle(nav).position === 'fixed') {
      const navRect = nav.getBoundingClientRect();
      if (navRect.height && navRect.top < viewBottom && navRect.bottom > viewTop) bottom = Math.min(bottom, navRect.top - gap);
    }
    const top = Math.max(viewTop + edge, headerBottom + gap);
    if (rect.bottom <= top || rect.top >= bottom || rect.right <= viewLeft || rect.left >= viewLeft + viewWidth) { close(); return; }
    const width = Math.min(Math.max(rect.width, minWidth), viewWidth - edge * 2);
    const left = Math.max(viewLeft + edge, Math.min(rect.right - width, viewLeft + viewWidth - edge - width));
    menu.style.width = `${Math.max(0, width)}px`;
    const below = Math.max(0, bottom - rect.bottom - gap);
    const above = Math.max(0, rect.top - gap - top);
    // scrollHeight includes all available versions even while the menu is height-limited.
    const wanted = Math.min(360, menu.scrollHeight + 2);
    const upwards = below < wanted && above > below;
    const available = upwards ? above : below;
    if (available < 48) { close(); return; }
    menu.style.maxHeight = `${Math.floor(Math.min(360, available))}px`;
    menu.style.left = `${Math.round(left)}px`;
    const height = menu.getBoundingClientRect().height;
    const y = upwards ? rect.top - gap - height : rect.bottom + gap;
    menu.style.top = `${Math.round(Math.max(top, Math.min(y, bottom - height)))}px`;
    menu.dataset.side = upwards ? 'above' : 'below';
  }
  function schedulePosition() {
    if (!opened) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(position);
  }
  function focusItem(index) {
    const items = buttons();
    if (!items.length) return;
    const target = items[(index + items.length) % items.length];
    items.forEach(item => { item.tabIndex = item === target ? 0 : -1; });
    target.focus({ preventScroll: true });
    const itemRect = target.getBoundingClientRect(), bounds = menu.getBoundingClientRect();
    if (itemRect.top < bounds.top + 8) menu.scrollTop -= bounds.top + 8 - itemRect.top;
    else if (itemRect.bottom > bounds.bottom - 8) menu.scrollTop += itemRect.bottom - bounds.bottom + 8;
  }
  function render(model) {
    menu.replaceChildren();
    const heading = document.createElement('div');
    heading.id = `${id}-heading`;
    heading.className = 'edition-menu-heading';
    heading.textContent = title;
    const count = document.createElement('span');
    count.textContent = model.items.length === 1 ? singleLabel : `${model.items.length} ${noun}`;
    heading.append(count);
    menu.append(heading);
    model.items.forEach((edition, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.id = `${id}-option-${index}`;
      item.className = 'edition-option';
      item.dataset.editionIndex = String(index);
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(index === model.index));
      item.tabIndex = -1;
      const check = document.createElement('span');
      check.className = 'edition-option-check';
      check.setAttribute('aria-hidden', 'true');
      if (index === model.index) check.innerHTML = checkIcon;
      const copy = document.createElement('span');
      copy.className = 'edition-option-copy';
      const name = document.createElement('span');
      name.className = 'edition-option-name';
      name.textContent = edition.name || '未命名版本';
      if (edition.isDefault) {
        const label = document.createElement('span');
        label.className = 'edition-default-label';
        label.textContent = '默认';
        name.append(label);
      }
      const specs = document.createElement('span');
      specs.className = 'edition-option-specs';
      specs.textContent = [edition.resolution, edition.video, edition.audio].filter(Boolean).join(' · ') || (variant === 'sort' ? '' : '规格未记录');
      copy.append(name, specs);
      item.append(check, copy);
      menu.append(item);
    });
  }
  function open(button, initial = 'selected') {
    const model = getModel();
    if (!button || button.disabled || !model.items.length) return;
    trigger = button;
    render(model);
    menu.scrollTop = 0;
    menu.hidden = false;
    opened = true;
    trigger.setAttribute('aria-expanded', 'true');
    if (typeof menu.showPopover === 'function') {
      try { menu.showPopover(); } catch { /* Body-mounted fixed layer remains usable. */ }
    }
    position();
    if (opened) focusItem(initial === 'last' ? model.items.length - 1 : initial === 'first' ? 0 : model.index);
    if(opened&&!matchMedia('(prefers-reduced-motion: reduce)').matches)menu.animate([{opacity:0,transform:`translateY(${menu.dataset.side==='above'?3:-3}px)`},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  function toggle(button) {
    if (opened) close({ restoreFocus: true });
    else open(button);
  }
  function choose(index) {
    if (!opened) return;
    const model = getModel();
    if (!Number.isInteger(index) || !model.items[index]) return;
    close({ restoreFocus: true });
    if (model.index !== index) onSelect(index);
  }
  function leaveWithTab(event) {
    // The menu lives outside the hero. Continue the page's logical tab order
    // immediately after the trigger instead of trapping focus in the portal.
    const tabbables = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
      .filter(el => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]') && !menu.contains(el) && el.getClientRects().length);
    const target = event.shiftKey ? trigger : tabbables[tabbables.indexOf(trigger) + 1];
    close();
    if (target) { event.preventDefault(); target.focus({ preventScroll: true }); }
    else trigger?.focus({ preventScroll: true });
  }
  menu.addEventListener('click', event => {
    const item = event.target.closest('[role="menuitemradio"]');
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    choose(Number(item.dataset.editionIndex));
  });
  document.addEventListener('keydown', event => {
    const button = event.target.closest(triggerSelector);
    if (button && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.key === 'ArrowDown') opened ? focusItem(0) : open(button, 'first');
      else if (event.key === 'ArrowUp') opened ? focusItem(buttons().length - 1) : open(button, 'last');
      else toggle(button);
      return;
    }
    if (!opened) return;
    if (event.key === 'Escape') {
      event.preventDefault();event.stopPropagation();close({ restoreFocus: true });return;
    }
    if (!menu.contains(event.target)) return;
    const items = buttons(), current = items.indexOf(document.activeElement);
    if (event.key === 'Tab') { leaveWithTab(event); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();event.stopPropagation();
      if (event.key === 'ArrowDown') focusItem(current + 1);
      else if (event.key === 'ArrowUp') focusItem(current - 1);
      else if (event.key === 'Home') focusItem(0);
      else if (event.key === 'End') focusItem(items.length - 1);
      else if (!event.repeat && current >= 0) choose(Number(items[current].dataset.editionIndex));
    }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (opened && !menu.contains(event.target) && !trigger?.contains(event.target)) close();
  }, true);
  document.addEventListener('focusin', event => {
    if (opened && !menu.contains(event.target) && !trigger?.contains(event.target)) close();
  });
  window.addEventListener('scroll', schedulePosition, true);
  window.addEventListener('resize', schedulePosition);
  window.visualViewport?.addEventListener('resize', schedulePosition);
  window.visualViewport?.addEventListener('scroll', schedulePosition);
  window.addEventListener('pagehide', () => close());
  return { toggle, close, get isOpen() { return opened; } };
}
