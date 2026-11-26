/* Minimal line icon set drawn for the prototype. 24×24, 1.5 stroke. */
window.VXI = (() => {
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    'arrow-left': '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
    'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
    play: '<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 6.9a4.3 4.3 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z"/>',
    'heart-fill': '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 6.9a4.3 4.3 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8L12 3.6Z"/>',
    'star-fill': '<path d="m12 3.6 2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8L12 3.6Z" fill="currentColor" stroke="none"/>',
    filter: '<path d="M3 6h18M6.5 12h11M10 18h4"/>',
    sort: '<path d="M8 4v16M5 7l3-3 3 3M16 20V4M13 17l3 3 3-3"/>',
    grid: '<rect x="3.5" y="3.5" width="6.5" height="6.5"/><rect x="14" y="3.5" width="6.5" height="6.5"/><rect x="3.5" y="14" width="6.5" height="6.5"/><rect x="14" y="14" width="6.5" height="6.5"/>',
    poster: '<rect x="5" y="3.5" width="14" height="17"/><path d="M5 15l4-4 3.5 3.5 2.5-2 4 4"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/>',
    discover: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.5 2"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M9 20h6M12 16v4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>',
    archive: '<rect x="3" y="4" width="18" height="4"/><path d="M5 8v11h14V8M9.5 12h5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3.5h16V16"/>',
    film: '<rect x="3" y="4" width="18" height="16"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    drive: '<rect x="3" y="5" width="18" height="6" rx="1.2"/><rect x="3" y="13" width="18" height="6" rx="1.2"/><path d="M7 8h.01M7 16h.01"/>',
    activity: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
    image: '<rect x="3" y="4" width="18" height="16"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 4.5-5 3.5 3.5 2.5-2.5L20 17"/>',
    edit: '<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20ZM13.5 7l3.5 3.5"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
    'volume': '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    'mute': '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M3 3l18 18"/>',
    'fullscreen': '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    'more': '<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>'
  };
  return function icon(name, size = 18, cls = '') {
    const p = paths[name] || paths.dot;
    return '<svg class="icon ' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  };
})();
