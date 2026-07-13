// ── cross-page fade transition (index.html <-> gallery.html) ──
// .pt-hide was added to <html> by the inline script in <head>, before this
// page's first paint (see style.css's html.pt-hide rule) — fade it back in
// now that the DOM (and this script, at the bottom of body) is ready. The
// double rAF guarantees the browser actually paints one hidden frame first,
// so the fade is visible instead of the class removal racing the paint and
// just snapping straight to visible.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('pt-hide');
  });
});

// intercept same-tab navigations to another page (skips in-page #anchors,
// mailto:/tel:, target="_blank", and modified clicks that open a new tab)
// and fade out first instead of jumping straight to the next page's blank
// pre-paint state.
const PT_FADE_MS = 250;
document.querySelectorAll('a[href]').forEach(a => {
  if (a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

  a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    document.documentElement.classList.add('pt-hide');
    setTimeout(() => { window.location.href = a.href; }, PT_FADE_MS);
  });
});
