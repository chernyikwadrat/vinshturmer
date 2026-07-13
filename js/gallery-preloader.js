// ── gallery.html preloader ──
// Same look and behavior as index.html's (see main.js's buildPhotoLoop
// call + initPreloader), duplicated here in a self-contained form since
// this page doesn't load main.js (that file assumes index.html-only
// elements like #bg-wrap/#fig-wrap/#grid-wrap and would throw without
// them). Only the photos that actually fill the first screen block it —
// the rest use the browser's native loading="lazy" and arrive as the
// visitor scrolls, same progressive-loading idea as index.html's look 2-6
// assets.

// small crossfading photo, reusing the same 15 shots as index.html's
(function buildPreloaderPhoto() {
  const container = document.getElementById('preloader-photo');
  if (!container) return;
  const frames = [
    'assets/images/concept-1-1.avif',
    'assets/images/concept-1-1-1.avif',
    'assets/images/concept-1-3.avif',
    'assets/images/concept-2-1.avif',
    'assets/images/concept-2-2.avif',
    'assets/images/concept-2-3.avif',
    'assets/images/concept-3-1.avif',
    'assets/images/concept-3-2.avif',
    'assets/images/concept-3-3.avif',
    'assets/images/concept-4-1.avif',
    'assets/images/concept-4-2.avif',
    'assets/images/concept-4-3.avif',
    'assets/images/concept-5-1.avif',
    'assets/images/concept-5-2.avif',
    'assets/images/concept-5-3.avif',
  ];
  const imgs = frames.map((src, i) => {
    const img = new Image();
    img.src = src; img.draggable = false;
    img.classList.toggle('on', i === 0);
    container.appendChild(img);
    return img;
  });
  let frame = 0;
  setInterval(() => {
    frame = (frame + 1) % imgs.length;
    imgs.forEach((img, i) => img.classList.toggle('on', i === frame));
  }, 70);
})();

(function initPreloader() {
  const preloaderEl = document.getElementById('preloader');
  const percentEl = document.getElementById('preloader-percent');
  if (!preloaderEl) return;

  // only the photos filling the first screen gate the preloader — same
  // "first screen must be ready, everything past it loads progressively"
  // rule as index.html, just expressed as "first N gallery photos" instead
  // of "first N look sections"
  const EAGER_COUNT = 2;
  const imgs = [...document.querySelectorAll('#gallery-page img')].slice(0, EAGER_COUNT);
  const total = imgs.length || 1;
  let loaded = 0;
  let shownPercent = 0;
  let allLoaded = false;

  const startTime = performance.now();
  const MIN_VISIBLE_MS = 1000;
  const PER_IMAGE_TIMEOUT_MS = 3000;

  function finish() {
    preloaderEl.classList.add('preloader-hidden');
    preloaderEl.remove();
  }

  function tryFinish() {
    if (!allLoaded) return;
    const remaining = MIN_VISIBLE_MS - (performance.now() - startTime);
    if (remaining > 0) setTimeout(finish, remaining);
    else finish();
  }

  function onSettle() {
    loaded++;
    const pct = Math.floor((loaded / total) * 100);
    if (pct > shownPercent) {
      shownPercent = pct;
      percentEl.textContent = shownPercent + '%';
    }
    if (loaded >= total) {
      allLoaded = true;
      tryFinish();
    }
  }

  imgs.forEach(img => {
    if (img.complete) { onSettle(); return; }
    let settled = false;
    const settleOnce = () => { if (settled) return; settled = true; onSettle(); };
    img.addEventListener('load', settleOnce, { once: true });
    img.addEventListener('error', settleOnce, { once: true });
    setTimeout(settleOnce, PER_IMAGE_TIMEOUT_MS);
  });

  // absolute safety fallback in case something above never resolves at all
  setTimeout(() => {
    if (!preloaderEl.classList.contains('preloader-hidden')) finish();
  }, 5000);
})();
