/* Design proposal hub: smooth in-page navigation. */
(() => {
  if (new URLSearchParams(location.search).has('capture')) document.documentElement.classList.add('capture');
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
