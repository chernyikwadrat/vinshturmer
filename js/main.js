// always land on the first screen on load/refresh instead of the browser
// restoring whatever scroll position was there before reloading
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// sticky photo scrub is the permanent scroll mode for now — the dev toggle
// that used to switch between this, normal scroll, and snap+crossfade is
// hidden, so set the mode directly instead of waiting for a radio change
document.documentElement.dataset.scrollMode = 'scrub';

const BGS = [
  'assets/images/bg-1.avif',
  'assets/images/bg-2.avif',
  'assets/images/bg-3.avif',
  'assets/images/bg-4.avif',
  'assets/images/bg-5.avif',
  'assets/images/bg-6.avif',
];

const NOBG = Array.from({length: 6}, (_, li) =>
  Array.from({length: 8}, (_, fi) => `assets/images/look-${li + 1}-frame-${fi + 1}.avif`)
);

const NL    = 6;
const NF    = 8;
const FPS   = 8;
const GRID_FPS = 5;            // slower turntable speed for the gallery grid
const CIRCLES = 2;            // 2 full rotations per look
const FRAMES_PER_LOOK = NF * CIRCLES;  // 16

const LABELS = ['Look 1','Look 2','Look 3','Look 4','Look 5','Look 6'];

// Per-frame [scale, translateY%, translateX%] correction so every frame's
// figure lines up with frame 1 (front view) — measured from each source
// image's alpha bbox, since the turntable crop/zoom drifts slightly frame
// to frame. scale comes from the head-to-foot bbox height ratio; translateY
// pins the feet to the container's bottom edge (undoing the vertical shift
// scaling about center would otherwise introduce); translateX re-centers
// the head (top ~18% of the bbox, alpha-weighted) so it doesn't wobble
// side to side — the full-silhouette center isn't used for that since it
// swings with the garment/arms as the pose rotates, which is real motion,
// not drift.
const FRAME_FIX = [
  [[1.0,0.0,0.0],[1.0108,-0.542,1.844],[1.0036,-0.179,1.174],[1.0024,-0.119,0.604],[1.0108,-0.542,-0.027],[1.0157,-0.787,-0.74],[1.0282,-1.409,-0.786],[1.0121,-0.603,-0.239]],
  [[1.0,0.0,0.0],[1.0,0.0,0.75],[1.0,0.0,1.021],[1.0024,-0.12,0.518],[1.0085,-0.423,0.253],[1.006,-0.302,-1.465],[1.006,-0.302,-0.418],[1.0048,-0.241,-0.484]],
  [[1.0,0.0,0.0],[0.9964,0.18,1.223],[0.9976,0.12,-0.511],[0.9976,0.12,-0.314],[0.9988,0.06,-0.69],[0.9988,0.06,-1.59],[0.9976,0.12,-0.447],[0.9988,0.06,-1.945]],
  [[1.0,0.0,0.0],[0.9976,0.12,1.04],[0.9928,0.358,0.946],[0.994,0.299,1.689],[0.9988,0.06,0.336],[0.9988,0.06,0.683],[1.0012,-0.06,-0.433],[1.0036,-0.181,0.031]],
  [[1.0,0.0,0.0],[1.0012,-0.06,0.584],[1.0084,-0.421,1.225],[1.0084,-0.421,0.369],[1.0158,-0.788,0.281],[0.9976,0.119,-0.412],[1.0084,-0.421,-1.573],[1.0084,-0.421,-0.833]],
  [[1.0,0.0,0.0],[0.9905,0.473,1.257],[1.0012,-0.06,1.123],[0.9988,0.06,0.403],[1.0295,-1.474,-0.705],[1.0072,-0.361,-0.487],[1.0244,-1.222,-1.025],[1.017,-0.85,-1.011]],
];

// Same head-anchored idea as FRAME_FIX, but for looks 1, 5 & 6's
// background-filled frames (the backdrop is baked into the same image as
// the figure, a different export of the same shoot with its own crop
// drift — measured here via a luminance mask since there's no alpha
// channel). Per-frame [scale, translateY%, translateX%] — same shape as
// FRAME_FIX, uniform scale (a non-uniform scaleX/scaleY variant tried here
// briefly fixed the crop but visibly stretched the figure).
//
// scale sits inside the valid window for the whole figure (head to feet)
// to fit inside the box — the figure fills ~87-91% of the frame's own
// height, so there's only ~9-13% of vertical slack to split between "not
// zoomed in enough to cover a gap" and "zoomed in so much the head or
// feet run past the edge and get clipped." An earlier version picked
// scale via a multiplicative safety margin on the *upper* end of that
// window, which nudged a couple of frames just past the limit and
// clipped the head by a few px; this one is chosen partway between the
// window's lower and upper bound instead, which also crops in tighter
// (less empty floor below the feet) as a side effect. translateY is
// solved to keep the figure inside that window (not tied purely to the
// head position — that ran out of slack and pushed the feet out; pinning
// the feet instead pushed the head out, the same problem in reverse).
// translateX follows the head position like FRAME_FIX, but clamped to
// whatever margin this (deliberately modest) scale leaves on the sides —
// giving it more room, like FRAME_FIX_FILL used to, meant a much bigger
// zoom just to cover the worst-case frame, which is what stretched
// unevenly once scaleX/scaleY were split apart to fix the crop. Clamping
// instead means the outlier frames (e.g. look 1's near-profile views)
// keep a little residual side-to-side drift rather than perfect
// stability, cropped in at the sides instead of distorted or cropped
// top/bottom. Reusing FRAME_FIX's own values here instead left a visible
// size "pulse" between front/back and profile frames — this crop drifts
// differently from the no-bg export.
const FRAME_FIX_FILL = {
  0: [[1.0924,-3.448,0.592],[1.0991,-3.665,4.953],[1.0859,-2.916,3.867],[1.0679,-3.289,2.13],[1.0985,-3.26,-4.923],[1.0713,-3.513,-3.565],[1.0794,-3.919,-3.971],[1.0906,-3.414,-4.532]],
  4: [[1.0952,-1.764,0.04],[1.0964,0.106,-0.457],[1.0982,-1.64,3.925],[1.0964,-1.072,3.443],[1.105,-4.224,0.627],[1.0934,-3.173,3.765],[1.0976,-1.665,-4.646],[1.0994,-2.181,3.951]],
  5: [[1.0939,-1.489,0.042],[1.0879,-3.065,4.393],[1.0873,-4.151,1.68],[1.0897,-2.354,-0.85],[1.1154,-2.395,-5.772],[1.0933,-1.033,-1.019],[1.1036,-1.625,-2.557],[1.1018,-1.754,-3.421]],
};

// Looks 2, 3 & 4 got a newer 2x-resolution no-bg re-export (${look}-${frame}.avif,
// e.g. 2-1.avif — not to be confused with the N-photo-M.avif scrub-photo
// sequence) for just the concept-page drag turntable, replacing the same
// low-res frames (look-N-frame-M.avif) that the hero/gallery/rail
// thumbnail keep using elsewhere. It's a different crop from that low-res
// set (more headroom above the head) and has noticeably more frame-to-
// frame repositioning, so it needs its own measured correction rather
// than reusing FRAME_FIX[1..3] — same head-anchored/safe-window method as
// FRAME_FIX_FILL (scale picked inside the window that keeps the whole
// figure in frame, translateY solved to stay in that window, translateX
// clamped to the margin it leaves), since this crop only has ~15-20%
// vertical slack rather than FRAME_FIX's generous ~40%+, and its own
// translateX swings (real repositioning between shots, as with the -fill
// frames) are too large to fit inside that slack uncapped. Desktop-only
// concept-turn-2/3/4 have overflow:hidden added to match, so the
// necessarily-oversized frame crops at the edges instead of spilling
// past the container.
const FRAME_FIX_HIRES = {
  2: [[1.1968,-0.956,1.223],[1.1647,-2.662,-2.476],[1.1836,-1.32,3.199],[1.1775,-1.859,-1.615],[1.211,-4.28,-10.548],[1.224,-2.953,-6.857],[1.2441,-3.52,-3.298],[1.2426,-1.089,-4.723]],
  3: [[1.1961,0.125,0.579],[1.185,-0.916,7.964],[1.1898,-0.369,5.037],[1.2017,-1.283,1.906],[1.2131,-1.119,-5.004],[1.2081,-0.081,-10.404],[1.211,-1.205,4.014],[1.1802,-0.653,0.027]],
  4: [[1.1674,1.32,0.03],[1.166,1.606,6.096],[1.2128,0.02,-4.253],[1.2241,-0.328,0.239],[1.1292,1.482,1.885],[1.1483,0.323,2.749],[1.1429,-1.511,-2.189],[1.1503,0.123,0.9]],
};

// ── build background images ──
const bgWrap = document.getElementById('bg-wrap');
const bgImgs = BGS.map((src, i) => {
  const img = new Image();
  img.src = src; img.className = 'bg-img';
  bgWrap.appendChild(img); return img;
});

// ── build figure images (all looks stacked, show one at a time) ──
const figWrap = document.getElementById('fig-wrap');
// figImgs[look][frame]
const figImgs = NOBG.map((frames, li) => frames.map((src, fi) => {
  const img = new Image();
  img.src = src; img.draggable = false;
  const [scale, ty, tx] = FRAME_FIX[li][fi];
  img.style.transform = `translateY(${ty}%) translateX(${tx}%) scale(${scale})`;
  figWrap.appendChild(img); return img;
}));

// ── gallery grid (all looks rotating simultaneously) ──
const gridWrap = document.getElementById('grid-wrap');
const gridItems = [];
const gridImgs = NOBG.map((frames, li) => {
  const item = document.createElement('div');
  item.className = 'grid-item';
  gridWrap.appendChild(item);
  gridItems.push(item);
  return frames.map((src, fi) => {
    const img = new Image();
    img.src = src; img.draggable = false;
    const [scale, ty, tx] = FRAME_FIX[li][fi];
    img.style.transform = `translateX(${tx - 50}%) translateY(${ty}%) scale(${scale})`;
    item.appendChild(img);
    return img;
  });
});

const tileFrames = new Array(NL).fill(0);

function setTileFrame(li, frame) {
  tileFrames[li] = frame;
  gridImgs[li].forEach((img, fi) => img.classList.toggle('on', fi === frame));
}

function updateGrid(frame) {
  gridImgs.forEach((_, li) => setTileFrame(li, frame));
}

// grid rotates on its own, slower timer, only while screen 2 is visible
let gridFrame = 0;
let gridTimer = null;
let galleryVisible = false;

function tickGrid() {
  gridFrame = (gridFrame + 1) % NF;
  updateGrid(gridFrame);
}

function startGridPlay() {
  if (gridTimer) return;
  gridTimer = setInterval(tickGrid, 1000 / GRID_FPS);
}
function stopGridPlay() {
  clearInterval(gridTimer); gridTimer = null;
}

const galleryEl = document.getElementById('gallery');
new IntersectionObserver(entries => {
  entries.forEach(entry => {
    galleryVisible = entry.isIntersecting;
    galleryVisible ? startGridPlay() : stopGridPlay();
  });
}, { threshold: 0.3 }).observe(galleryEl);

// ── drag to rotate a single tile ──
const DRAG_SENSITIVITY = 12; // px per frame step
let dragLi = null;
let dragStartX = 0;
let dragStartFrame = 0;

// drag-to-rotate on the gallery grid (first screen) is desktop-only — on
// mobile the tiles just sit on their first frame, and touch-action:auto
// (see the max-width:700px rule in style.css) leaves the page to scroll
// normally instead of capturing the gesture as a rotate.
const isMobileWidth = () => window.matchMedia('(max-width:700px)').matches;

gridItems.forEach((item, li) => {
  item.addEventListener('pointerdown', e => {
    if (isMobileWidth()) return;
    dragLi = li;
    dragStartX = e.clientX;
    dragStartFrame = tileFrames[li];
    item.setPointerCapture(e.pointerId);
    stopGridPlay();
    gridWrap.classList.add('dragging');
    item.classList.add('active');
  });

  item.addEventListener('pointermove', e => {
    if (dragLi !== li) return;
    const steps = Math.trunc((e.clientX - dragStartX) / DRAG_SENSITIVITY);
    const frame = ((dragStartFrame + steps) % NF + NF) % NF;
    setTileFrame(li, frame);
  });

  const endDrag = () => {
    if (dragLi !== li) return;
    dragLi = null;
    item.classList.remove('active');
    gridWrap.classList.remove('dragging');
    if (galleryVisible) startGridPlay();
  };
  item.addEventListener('pointerup', endDrag);
  item.addEventListener('pointercancel', endDrag);
});

// ── state ──
let curLook  = 0;
let frameIdx = 0;   // 0..FRAMES_PER_LOOK-1 within current look
let globalFrame = 0; // actual turntable frame 0..7
let timer = null;
let playing = true;
let transitioning = false;

function updateLabel() {
}

function showLook(lookIdx, frame) {
  // backgrounds
  bgImgs.forEach((img, i) => img.classList.toggle('on', i === lookIdx));
  // figures — hide all, show current look + frame
  figImgs.forEach((lookFrames, li) =>
    lookFrames.forEach((img, fi) =>
      img.classList.toggle('on', li === lookIdx && fi === frame)));
}

async function switchToLook(nextLook) {
  if (transitioning) return;
  transitioning = true;

  // crossfade: show new bg at same time (opacity transition handles it)
  bgImgs.forEach((img, i) => img.classList.toggle('on', i === nextLook));

  // switch figure immediately
  curLook  = nextLook;
  frameIdx = 0;
  globalFrame = 0;
  showLook(curLook, globalFrame);
  updateLabel();

  await new Promise(r => setTimeout(r, 650)); // wait for bg fade
  transitioning = false;
}

function tick() {
  frameIdx++;

  if (frameIdx >= FRAMES_PER_LOOK) {
    // switch to next look
    const nextLook = (curLook + 1) % NL;
    frameIdx = 0;
    globalFrame = 0;
    switchToLook(nextLook);
    return;
  }

  globalFrame = frameIdx % NF;
  // update only figure (bg stays)
  figImgs.forEach((lookFrames, li) =>
    lookFrames.forEach((img, fi) =>
      img.classList.toggle('on', li === curLook && fi === globalFrame)));
}

function startPlay() {
  if (timer) return;
  timer = setInterval(tick, 1000 / FPS);
  playing = true;
}
function stopPlay() {
  clearInterval(timer); timer = null;
  playing = false;
}

// ── header has a white background only on screen1, then goes transparent ──
const headerEl = document.getElementById('header');
const screen1El = document.getElementById('screen1');
if (headerEl && screen1El) {
  new IntersectionObserver(entries => {
    entries.forEach(entry => headerEl.classList.toggle('no-bg', !entry.isIntersecting));
  }, { threshold: 0, rootMargin: '-10px 0px -10px 0px' }).observe(screen1El);
}

// ── dev-only: try different scroll transitions between look blocks ──
const conceptCanvasEls = [
  document.getElementById('concept-canvas'),
  document.getElementById('concept-canvas-2'),
  document.getElementById('concept-canvas-3'),
  document.getElementById('concept-canvas-4'),
  document.getElementById('concept-canvas-5'),
  document.getElementById('concept-canvas-6'),
].filter(Boolean);

function updateFadeOpacities() {
  if (document.documentElement.dataset.scrollMode !== 'fade') return;
  const vh = window.innerHeight;
  conceptCanvasEls.forEach(canvas => {
    const r = canvas.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    canvas.style.opacity = Math.max(0, Math.min(1, visible / vh));
  });
}
window.addEventListener('scroll', updateFadeOpacities, { passive: true });

document.querySelectorAll('input[name="scroll-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    document.documentElement.dataset.scrollMode = radio.value;
    if (radio.value === 'fade') {
      updateFadeOpacities();
    } else {
      conceptCanvasEls.forEach(c => { c.style.opacity = ''; });
    }
    if (radio.value === 'scrub') { updateScrubZoneOffsets(); updateScrubFrames(); }
  });
});

// ── dev-only: toggle the scroll-reveal animation on/off for testing ──
const revealToggleInput = document.getElementById('reveal-toggle-input');
if (revealToggleInput) {
  revealToggleInput.addEventListener('change', () => {
    document.body.classList.toggle('reveal-off', !revealToggleInput.checked);
  });
}

// ── concept page: collage photos pop in on scroll, once each, only while
// scrolling down. The col-* clusters are excluded — those are always
// visible (see the CSS), this reveal is only for the single-garment m-*
// crops ──
const collageImgs = [...document.querySelectorAll('.c-collage-img:not(.c-col)')];
const COLLAGE_DELAYS = [
  0, 450, 150, 50,      // look 1: cm1-4
  200, 350,               // look 2: m2, m3
  300, 450, 400,          // look 3: m1, m2, m3
  300, 450, 500, 550, 600, // look 4: m1-5
  300, 350, 400, 450,     // look 5: m1-4
  300, 450, 500, 550, 600, // look 6: m1-5
];

// reveal only fires while actively scrolling down; scrolling up never
// triggers or un-triggers it, and each image only ever reveals once
let lastScrollYForReveal = window.scrollY;
let scrollingDownForReveal = true;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  scrollingDownForReveal = y > lastScrollYForReveal;
  lastScrollYForReveal = y;
}, { passive: true });

const collageObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!scrollingDownForReveal || !entry.isIntersecting) return;
    const img = entry.target;
    const delay = COLLAGE_DELAYS[collageImgs.indexOf(img)] ?? 0;
    setTimeout(() => img.classList.add('revealed'), delay);
    collageObserver.unobserve(img);
  });
}, { threshold: 0.2 });
collageImgs.forEach(img => collageObserver.observe(img));

// ── concept page: screen-3 photo loop (reusable — instant snap, small delay between frames) ──
function buildPhotoLoop(containerId, frames, intervalMs) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const photoImgs = frames.map((src, i) => {
    const img = new Image();
    img.src = src; img.draggable = false;
    img.classList.toggle('on', i === 0);
    container.appendChild(img);
    return img;
  });

  let photoFrame = 0;
  setInterval(() => {
    photoFrame = (photoFrame + 1) % photoImgs.length;
    photoImgs.forEach((img, i) => img.classList.toggle('on', i === photoFrame));
  }, intervalMs);
}

// look 1: template placeholders — swap for real image paths later
buildPhotoLoop('concept-photo', [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="%23b5482f"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="%233f5c8a"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="%23a08f3c"/></svg>',
], 500);

// look 2: real photos from Figma
buildPhotoLoop('concept-photo-2', [
  'assets/images/2-photo-1.jpg',
  'assets/images/2-photo-2.jpg',
], 500);

// look 3: real photos from Figma
buildPhotoLoop('concept-photo-3', [
  'assets/images/3-photo-1.jpg',
  'assets/images/3-photo-2.jpg',
], 500);

// look 6: real photos from Figma
buildPhotoLoop('concept-photo-6', [
  'assets/images/6-photo-1-src.jpg',
  'assets/images/6-photo-2.jpg',
], 500);

// about section: 5 urban-texture reference photos, each cycling through its
// own 3 shots — same timer-driven crossfade as the per-look photo loops above
buildPhotoLoop('about-photo-1', [
  'assets/images/concept-1-1.avif',
  'assets/images/concept-1-1-1.avif',
  'assets/images/concept-1-3.avif',
], 500);
buildPhotoLoop('about-photo-2', [
  'assets/images/concept-2-1.avif',
  'assets/images/concept-2-2.avif',
  'assets/images/concept-2-3.avif',
], 500);
buildPhotoLoop('about-photo-3', [
  'assets/images/concept-3-1.avif',
  'assets/images/concept-3-2.avif',
  'assets/images/concept-3-3.avif',
], 500);
buildPhotoLoop('about-photo-4', [
  'assets/images/concept-4-1.avif',
  'assets/images/concept-4-2.avif',
  'assets/images/concept-4-3.avif',
], 500);
buildPhotoLoop('about-photo-5', [
  'assets/images/concept-5-1.avif',
  'assets/images/concept-5-2.avif',
  'assets/images/concept-5-3.avif',
], 500);

// look 4 & 5: only one real photo exists for each — mirror it for the second
// frame so the switch is still visible until a real second photo is provided
function buildMirroredPhotoLoop(containerId, src, intervalMs) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const frame1 = new Image();
  frame1.src = src; frame1.draggable = false; frame1.classList.add('on');
  const frame2 = new Image();
  frame2.src = src; frame2.draggable = false; frame2.style.transform = 'scaleX(-1)';
  container.appendChild(frame1);
  container.appendChild(frame2);

  const imgs = [frame1, frame2];
  let frame = 0;
  setInterval(() => {
    frame = (frame + 1) % imgs.length;
    imgs.forEach((img, i) => img.classList.toggle('on', i === frame));
  }, intervalMs);
}
buildMirroredPhotoLoop('concept-photo-4', 'assets/images/4-photo-src.jpg', 500);
buildMirroredPhotoLoop('concept-photo-5', 'assets/images/5-photo-src.jpg', 500);

// ── concept page: sticky photo scrub (alternate scroll mode) — same photo
// sources as the timer-driven loops above, but the frame is picked by scroll
// progress through a dedicated sticky zone instead of a timer ──
function buildScrubPhoto(id, frames) {
  const container = document.getElementById(id);
  if (!container) return null;
  return frames.map((src, i) => {
    const img = new Image();
    img.src = src; img.draggable = false;
    img.classList.toggle('on', i === 0);
    container.appendChild(img);
    return img;
  });
}

// each look now has its own 5-shot sequence (N-photo-1..5.avif), replacing
// the earlier placeholders/mirrored duplicates that stood in before the
// real photos were ready. Look 3's set skips a "4" and has a "5-1" variant
// instead, so it's spelled out rather than assuming a plain 1..5 run.
const SCRUB_PHOTO_NAMES = {
  3: ['3-photo-1', '3-photo-2', '3-photo-3', '3-photo-5', '3-photo-5-1'],
};
const scrubPhotos = {};
for (let look = 1; look <= 6; look++) {
  const names = SCRUB_PHOTO_NAMES[look] || Array.from({length: 5}, (_, i) => `${look}-photo-${i + 1}`);
  scrubPhotos[look] = buildScrubPhoto(`scrub-photo-${look}`, names.map(n => `assets/images/${n}.avif`));
}

function updateScrubFrames() {
  if (document.documentElement.dataset.scrollMode !== 'scrub') return;
  document.querySelectorAll('.sticky-scrub-zone').forEach(zone => {
    const imgs = scrubPhotos[zone.dataset.look];
    if (!imgs || !imgs.length) return;
    const r = zone.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, -r.top / scrollable)) : 0;
    const frame = Math.min(imgs.length - 1, Math.floor(progress * imgs.length));
    imgs.forEach((img, i) => img.classList.toggle('on', i === frame));
  });
}
window.addEventListener('scroll', updateScrubFrames, { passive: true });

// ── sticky scrub zones: pull each zone up flush against the real bottom of
// its look's visible content, measured live, instead of a hardcoded % tail.
// The canvas is a fixed 1440x3200 reference box so absolute-positioned
// children scale as a unit, but its real content doesn't reach the bottom of
// that box (biggest offender: look 1's turntable is sized in vh, not % of
// the canvas, so its true bottom moves independently of canvas height) —
// any fixed percentage only cancels the gap at one specific aspect ratio ──
function updateScrubZoneOffsets() {
  document.querySelectorAll('.sticky-scrub-zone').forEach(zone => {
    const look = zone.dataset.look;
    const canvas = document.getElementById(look === '1' ? 'concept-canvas' : `concept-canvas-${look}`);
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    let contentBottom = canvasRect.top;
    canvas.querySelectorAll(':scope > *').forEach(el => {
      if (el.classList.contains('c-rail-cluster')) return; // fixed to the viewport, not the canvas flow
      const bottom = el.getBoundingClientRect().bottom;
      if (bottom > contentBottom) contentBottom = bottom;
    });
    zone.style.marginTop = -(canvasRect.bottom - contentBottom) + 'px';
  });
}
updateScrubZoneOffsets();
window.addEventListener('resize', updateScrubZoneOffsets);
updateScrubFrames();

// ── concept page: fixed look-rail + look-nav only show once the user has
// scrolled a bit into the concept section (scroll-progress driven, not a timer) ──
const conceptSection = document.getElementById('concept');
const railCluster = document.querySelector('.c-rail-cluster');
const lookNav = document.querySelector('.look-nav');
if (conceptSection && (railCluster || lookNav)) {
  const REVEAL_OFFSET_VH = 0.03; // how far past the section's top edge (in viewport heights) before revealing
  function updateRailVisibility() {
    const rect = conceptSection.getBoundingClientRect();
    // rect.bottom > 1 (not > 0): when a section with no scroll room of its
    // own (e.g. #contact, exactly one viewport tall) immediately follows
    // #concept, the document's max scroll position lands with #concept's
    // bottom edge sitting a sub-pixel above 0 permanently — >0 alone would
    // never clear, leaving the rail/nav stuck on for that entire section.
    const scrolledIn = rect.top <= -window.innerHeight * REVEAL_OFFSET_VH && rect.bottom > 1;
    if (railCluster) railCluster.classList.toggle('in-view', scrolledIn);
    if (lookNav) lookNav.classList.toggle('in-view', scrolledIn);
  }
  window.addEventListener('scroll', updateRailVisibility, { passive: true });
  updateRailVisibility();
}

// ── concept page: active-look thumbnail auto-turns, freezes on frame 1 while hovered,
// and swaps to whichever look's block is currently scrolled into view ──
const railMain = document.querySelector('.c-rail-main');
const railThumbs = [...document.querySelectorAll('.rail-thumb')]; // rt-1..rt-5, in DOM order
if (railCluster && railMain) {
  let activeImgs = [];
  let activeFrame = 0;
  let activeTimer = null;

  function setActiveFrame(frame) {
    activeFrame = frame;
    activeImgs.forEach((img, i) => img.classList.toggle('on', i === frame));
  }
  function startActivePlay() {
    if (activeTimer) return;
    activeTimer = setInterval(() => setActiveFrame((activeFrame + 1) % activeImgs.length), 1000 / GRID_FPS);
  }
  function stopActivePlay() {
    clearInterval(activeTimer); activeTimer = null;
  }

  function setActiveLook(lookN) {
    stopActivePlay();
    railMain.innerHTML = '';
    activeFrame = 0;
    activeImgs = NOBG[lookN - 1].map((src, i) => {
      const img = new Image();
      img.src = src; img.draggable = false;
      img.classList.toggle('on', i === 0);
      const [scale, ty, tx] = FRAME_FIX[lookN - 1][i];
      img.style.transform = `translateY(${ty}%) translateX(${tx}%) scale(${scale})`;
      railMain.appendChild(img);
      return img;
    });
    startActivePlay();

    const others = [1, 2, 3, 4, 5, 6].filter(n => n !== lookN);
    others.forEach((look, i) => {
      if (!railThumbs[i]) return;
      railThumbs[i].src = `assets/images/look-${look}-frame-1.avif`;
      railThumbs[i].alt = `Look ${look}`;
    });

    if (lookNav) {
      lookNav.querySelectorAll('.look-nav-item').forEach(item => {
        item.classList.toggle('active', Number(item.dataset.look) === lookN);
      });
    }
  }

  railCluster.addEventListener('mouseenter', () => {
    stopActivePlay();
    setActiveFrame(0);
  });
  railCluster.addEventListener('mouseleave', startActivePlay);

  // track which look-block dominates the viewport as the user scrolls
  const lookCanvases = [
    [1, document.getElementById('concept-canvas')],
    [2, document.getElementById('concept-canvas-2')],
    [3, document.getElementById('concept-canvas-3')],
    [4, document.getElementById('concept-canvas-4')],
    [5, document.getElementById('concept-canvas-5')],
    [6, document.getElementById('concept-canvas-6')],
  ];
  const lookRatios = new Map();
  let currentActiveLook = 1;

  function recomputeActiveLook() {
    let bestN = currentActiveLook;
    let bestRatio = 0;
    lookRatios.forEach((ratio, n) => {
      if (ratio > bestRatio) { bestRatio = ratio; bestN = n; }
    });
    if (bestRatio > 0 && bestN !== currentActiveLook) {
      currentActiveLook = bestN;
      setActiveLook(currentActiveLook);
    }
  }

  lookCanvases.forEach(([n, el]) => {
    if (!el) return;
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        lookRatios.set(n, entry.intersectionRatio);
        recomputeActiveLook();
      });
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }).observe(el);
  });

  setActiveLook(currentActiveLook);
}

// ── concept page: drag-to-rotate turntable (reusable) ──
function buildDragTurntable(elId, frameSources, frameFix) {
  const el = document.getElementById(elId);
  if (!el) return;

  const turnImgs = frameSources.map((src, i) => {
    const img = new Image();
    img.src = src; img.draggable = false;
    img.classList.toggle('on', i === 0);
    if (frameFix) {
      const [scale, ty, tx] = frameFix[i];
      img.style.transform = `translateY(${ty}%) translateX(${tx}%) scale(${scale})`;
    }
    el.appendChild(img);
    return img;
  });

  let turnFrame = 0;
  function setTurnFrame(frame) {
    turnFrame = frame;
    turnImgs.forEach((img, i) => img.classList.toggle('on', i === frame));
  }

  let turnDragging = false;
  let turnDragStartX = 0;
  let turnDragStartFrame = 0;

  el.addEventListener('pointerdown', e => {
    turnDragging = true;
    turnDragStartX = e.clientX;
    turnDragStartFrame = turnFrame;
    el.setPointerCapture(e.pointerId);
    el.classList.add('active');
  });

  el.addEventListener('pointermove', e => {
    if (!turnDragging) return;
    const steps = Math.trunc((e.clientX - turnDragStartX) / DRAG_SENSITIVITY);
    setTurnFrame(((turnDragStartFrame + steps) % frameSources.length + frameSources.length) % frameSources.length);
  });

  const endTurnDrag = () => {
    turnDragging = false;
    el.classList.remove('active');
  };
  el.addEventListener('pointerup', endTurnDrag);
  el.addEventListener('pointercancel', endTurnDrag);
}

// looks 1, 5 & 6 have a background-filled frame set (same crop as NOBG, just
// 2x resolution with the backdrop baked in) — keep using that so their
// turntable keeps its background, corrected with FRAME_FIX_FILL (measured
// from these frames directly, see its comment) so the figure doesn't jump.
// The container clips (overflow:hidden) so the correction's built-in
// overscan crops the backdrop at the edges instead of ever showing a gap.
const FILL_FRAMES = (li) => Array.from({length: 8}, (_, i) => `assets/images/${li + 1}-${i + 1}-fill.avif`);
// looks 2/3/4 desktop concept-turn only — see FRAME_FIX_HIRES's comment
const HIRES_FRAMES = (look) => Array.from({length: 8}, (_, i) => `assets/images/${look}-${i + 1}.avif`);

buildDragTurntable('concept-turn', FILL_FRAMES(0), FRAME_FIX_FILL[0]);
// look 1 mobile: same frames, independent turntable instance for the stacked mobile layout
buildDragTurntable('concept-turn-mobile-1', FILL_FRAMES(0), FRAME_FIX_FILL[0]);
// looks 2, 3 & 4: desktop-only 2x-resolution re-export (HIRES_FRAMES/
// FRAME_FIX_HIRES below), just for this one drag turntable per look — the
// hero/gallery/rail thumbnail keep using the lower-res NOBG set, since
// they're much smaller on screen and this crop-page turntable is the one
// place the extra detail is actually visible.
buildDragTurntable('concept-turn-2', HIRES_FRAMES(2), FRAME_FIX_HIRES[2]);
buildDragTurntable('concept-turn-3', HIRES_FRAMES(3), FRAME_FIX_HIRES[3]);
buildDragTurntable('concept-turn-4', HIRES_FRAMES(4), FRAME_FIX_HIRES[4]);
buildDragTurntable('concept-turn-5', FILL_FRAMES(4), FRAME_FIX_FILL[4]);
buildDragTurntable('concept-turn-6', FILL_FRAMES(5), FRAME_FIX_FILL[5]);
// looks 2-6 mobile: same frames as each look's desktop turntable above,
// independent instances for the stacked mobile layout — by analogy with
// concept-turn-mobile-1
buildDragTurntable('concept-turn-mobile-2', HIRES_FRAMES(2), FRAME_FIX_HIRES[2]);
buildDragTurntable('concept-turn-mobile-3', HIRES_FRAMES(3), FRAME_FIX_HIRES[3]);
buildDragTurntable('concept-turn-mobile-4', HIRES_FRAMES(4), FRAME_FIX_HIRES[4]);
buildDragTurntable('concept-turn-mobile-5', FILL_FRAMES(4), FRAME_FIX_FILL[4]);
buildDragTurntable('concept-turn-mobile-6', FILL_FRAMES(5), FRAME_FIX_FILL[5]);

// ── init ──
showLook(0, 0);
updateGrid(0);
updateLabel();
startPlay();
