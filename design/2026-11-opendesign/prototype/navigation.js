// Local document navigation. Every visit owns its browsing state and parent.
// Shared movie preferences are stored separately in app.js.
const storageKey = 'video-x.navigation.v2';
let memory = { entries: {} };
function readRegistry() {
  try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null') || memory; }
  catch { return memory; }
}
function writeRegistry(value) {
  memory = value;
  try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
}
const routeURL = value => {
  const url = new URL(value, location.href);
  return url.pathname + url.search;
};
function focusSelector(element) {
  if (!element || element === document.body) return '';
  if (element.id) return `#${CSS.escape(element.id)}`;
  if (element.matches('[data-action]')) {
    return ['data-action', 'data-id', 'data-tab', 'data-category', 'data-view', 'data-rating']
      .filter(name => element.hasAttribute(name))
      .map(name => `[${name}="${CSS.escape(element.getAttribute(name))}"]`).join('');
  }
  if (element.matches('a[href]')) return `a[href="${CSS.escape(element.getAttribute('href'))}"]`;
  return '';
}
export function createNavigation({ readView, defaultBack, describe }) {
  let registry = readRegistry();
  const url = routeURL(location.href);
  const saved = registry.entries?.[history.state?.videoXEntry] || history.state?.videoXSnapshot;
  const pending = registry.pending?.url === url ? registry.pending : null;
  let entry = saved?.url === url ? saved : pending || {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url, parent: null, ui: null, scrollY: 0, focus: '', label: describe()
  };
  delete registry.pending;
  registry.entries = { ...registry.entries, [entry.id]: entry };
  writeRegistry(registry);
  let leaving = false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function persist(updateHistory = true) {
    registry = readRegistry();
    registry.entries = { ...registry.entries, [entry.id]: entry };
    writeRegistry(registry);
    if (!updateHistory) return;
    try {
      history.replaceState({ ...history.state, videoXEntry: entry.id, videoXSnapshot: entry }, '', entry.url);
    } catch {}
  }
  persist();
  function capture(element = document.activeElement, updateHistory = true) {
    entry.ui = structuredClone(readView());
    entry.scrollY = window.scrollY;
    entry.label = describe();
    const selector = focusSelector(leaving ? null : element);
    if (selector) entry.focus = selector;
    persist(updateHistory);
  }
  function go(value, trigger) {
    const target = new URL(value, location.href);
    if (target.origin !== location.origin) return;
    capture(trigger);
    leaving = true;
    registry = readRegistry();
    registry.pending = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: routeURL(target), parent: entry.id, ui: null, scrollY: 0, focus: '', label: ''
    };
    writeRegistry(registry);
    location.assign(target.href);
  }
  function back(trigger) {
    const parent = readRegistry().entries?.[entry.parent];
    capture(trigger);
    if (parent && history.state?.videoXEntry === entry.id && history.length > 1) { leaving = true; history.back(); }
    else go(defaultBack.url, trigger);
  }
  function restorePosition() {
    // Two layout frames let the source-rendered grid establish its reserved geometry.
    const position = entry.scrollY || 0, selector = entry.focus;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo(0, position);
      if (selector) document.querySelector(selector)?.focus({ preventScroll: true });
    }));
  }
  function updateURL(value) {
    entry.url = routeURL(value);
    persist();
  }
  window.addEventListener('pagehide', () => capture(undefined, false));
  window.addEventListener('pageshow', () => { leaving = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') capture(undefined, false);
  });
  return {
    get savedView() { return entry.ui; },
    get backTarget() {
      const parent = readRegistry().entries?.[entry.parent];
      return parent ? { url: parent.url, label: parent.label || '上一页' } : defaultBack;
    },
    capture, go, back, restorePosition, updateURL
  };
}
