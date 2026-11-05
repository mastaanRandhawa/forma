/**
 * cutout — removes the pale-blue backdrop from a RepDB flat illustration so the
 * figure can sit on any theme.
 *
 * Plain colour keying with no generative tooling: the RepDB free-tier licence
 * allows background-removed images for in-app use (term 4) and forbids feeding
 * them to generative models (term 5). See docs/EXERCISE_IMAGES.md.
 *
 * The backdrop is one flat colour, and the art has dark outlines, so:
 *   1. every sizeable patch close to the border colour is backdrop, including
 *      gaps the figure encloses (between an arm and the torso);
 *   2. the ground shadows touching it become soft black at low opacity;
 *   3. edge pixels are unmatted, so no light halo shows on a dark surface.
 */

// All thresholds were probed against real frames; colours are in 0–1 here.
const BACKDROP_DISTANCE = 0.075; // colour distance that still counts as backdrop
const MIN_BACKDROP_PATCH = 40; // smaller patches are highlights on the art, not gaps
const SHADOW_MIN_LUM = 0.45;
const SHADOW_MAX_ALPHA = 0.42;
const SHADOW_STRENGTH = 0.55; // luminance drop that reaches SHADOW_MAX_ALPHA and beyond
const SHADOW_GROW_PX = 3; // recovers thin shadow edges the mask opening dropped
const MIN_ISLAND = 50; // specks of art this small, cut off from the figure, are noise
const FRINGE_PX = 2;
// A 3-tap Gaussian (sigma 0.5), taking the jaggies off the mask.
const BLUR = [0.1065, 0.787, 0.1065];

/**
 * Shadows keep the backdrop's sky-blue hue (193–202°) with low saturation. Metal
 * is bluer (209° and up), white shoes have almost no saturation, and the tank top
 * is far more saturated, so none of them match.
 */
function isShadowColour(r, g, b, lum) {
  if (lum <= SHADOW_MIN_LUM || b < g || g < r) return false;
  const span = b - r;
  const saturation = span / (b + 1e-4);
  if (saturation < 0.05 || saturation > 0.5) return false;
  const hue = 240 - (60 * (g - r)) / (span + 1e-4); // the b-is-max branch of HSV hue
  return hue >= 185 && hue <= 207;
}

const median = (values) => {
  const sorted = Float32Array.from(values).sort();
  return sorted[sorted.length >> 1];
};

/** Calls `fn(n)` for each in-bounds 4-neighbour of pixel `i`. */
function forNeighbours(i, w, h, fn) {
  const x = i % w;
  if (x > 0) fn(i - 1);
  if (x < w - 1) fn(i + 1);
  if (i >= w) fn(i - w);
  if (i < w * (h - 1)) fn(i + w);
}

/** Labels 4-connected regions of `mask`. Returns [labels, count]; 0 means background. */
function label(mask, w, h) {
  const labels = new Int32Array(mask.length);
  const stack = new Int32Array(mask.length);
  let count = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    count++;
    let top = 0;
    stack[top++] = start;
    labels[start] = count;
    while (top > 0) {
      forNeighbours(stack[--top], w, h, (n) => {
        if (mask[n] && !labels[n]) {
          labels[n] = count;
          stack[top++] = n;
        }
      });
    }
  }
  return [labels, count];
}

function dilate(mask, w, h) {
  const out = Uint8Array.from(mask);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) forNeighbours(i, w, h, (n) => (out[n] = 1));
  }
  return out;
}

function erode(mask, w, h) {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const x = i % w;
    const onEdge = x === 0 || x === w - 1 || i < w || i >= w * (h - 1);
    if (onEdge) continue;
    if (mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w]) out[i] = 1;
  }
  return out;
}

function blurAlpha(alpha, w, h) {
  const tmp = new Float32Array(alpha.length);
  const out = new Float32Array(alpha.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = alpha[x > 0 ? i - 1 : i];
      const r = alpha[x < w - 1 ? i + 1 : i];
      tmp[i] = BLUR[0] * l + BLUR[1] * alpha[i] + BLUR[2] * r;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const u = tmp[y > 0 ? i - w : i];
      const d = tmp[y < h - 1 ? i + w : i];
      out[i] = BLUR[0] * u + BLUR[1] * tmp[i] + BLUR[2] * d;
    }
  }
  return out;
}

/**
 * @param {Uint8Array} src interleaved pixels (`channels` per pixel, RGB first)
 * @returns {{ rgba: Uint8Array, stats: { transparent: number, residual: number } }}
 *   `transparent` is the share of pixels cleared; `residual` the share still
 *   opaque yet close to the backdrop colour. The sync script flags outliers.
 */
export function cutoutBackdrop(src, width, height, channels = 3) {
  const w = width;
  const h = height;
  const n = w * h;
  const r = new Float32Array(n);
  const g = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    r[i] = src[i * channels] / 255;
    g[i] = src[i * channels + 1] / 255;
    b[i] = src[i * channels + 2] / 255;
  }
  const luminance = (i) => 0.2126 * r[i] + 0.7152 * g[i] + 0.0722 * b[i];

  // the backdrop colour, read from the border
  const edge = [];
  for (let x = 0; x < w; x++) edge.push(x, n - w + x);
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);
  const bgR = median(edge.map((i) => r[i]));
  const bgG = median(edge.map((i) => g[i]));
  const bgB = median(edge.map((i) => b[i]));
  const bgLum = 0.2126 * bgR + 0.7152 * bgG + 0.0722 * bgB;

  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    dist[i] = Math.hypot(r[i] - bgR, g[i] - bgG, b[i] - bgB);
  }

  // 1. backdrop: sizeable patches of the border colour
  const close = new Uint8Array(n);
  for (let i = 0; i < n; i++) close[i] = dist[i] < BACKDROP_DISTANCE ? 1 : 0;
  const [patches, patchCount] = label(close, w, h);
  const patchSize = new Int32Array(patchCount + 1);
  for (let i = 0; i < n; i++) patchSize[patches[i]]++;
  const backdrop = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (patches[i] && patchSize[patches[i]] >= MIN_BACKDROP_PATCH) backdrop[i] = 1;
  }

  // 2. shadow: shadow-coloured regions touching the backdrop. Opening the mask
  // first stops the fill leaking through a thin break in an outline.
  const shadowish = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    shadowish[i] = isShadowColour(r[i], g[i], b[i], luminance(i)) ? 1 : 0;
  }
  const opened = dilate(erode(shadowish, w, h), w, h);
  const joined = new Uint8Array(n);
  for (let i = 0; i < n; i++) joined[i] = opened[i] & shadowish[i] || backdrop[i];
  const [regions, regionCount] = label(joined, w, h);
  const touchesBackdrop = new Uint8Array(regionCount + 1);
  for (let i = 0; i < n; i++) if (backdrop[i]) touchesBackdrop[regions[i]] = 1;
  const shadow = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!backdrop[i] && regions[i] && touchesBackdrop[regions[i]]) shadow[i] = 1;
  }

  for (let k = 0; k < SHADOW_GROW_PX; k++) {
    const reach = dilate(shadow, w, h);
    for (let i = 0; i < n; i++) if (reach[i] && shadowish[i] && !backdrop[i]) shadow[i] = 1;
  }

  const cleared = new Uint8Array(n);
  for (let i = 0; i < n; i++) cleared[i] = backdrop[i] | shadow[i];

  // specks left floating by the cut
  const art = new Uint8Array(n);
  for (let i = 0; i < n; i++) art[i] = cleared[i] ? 0 : 1;
  const [islands, islandCount] = label(art, w, h);
  const islandSize = new Int32Array(islandCount + 1);
  for (let i = 0; i < n; i++) islandSize[islands[i]]++;
  for (let i = 0; i < n; i++) {
    if (islands[i] && islandSize[islands[i]] < MIN_ISLAND) {
      cleared[i] = 1;
      backdrop[i] = 1;
    }
  }

  // 3. fringe: blends of art and backdrop along the cut edge
  let grown = cleared;
  for (let k = 0; k < FRINGE_PX; k++) grown = dilate(grown, w, h);
  const fringe = new Uint8Array(n);
  for (let i = 0; i < n; i++) fringe[i] = grown[i] && !cleared[i] ? 1 : 0;

  // Breadth-first outward from solid art, so each fringe pixel knows its nearest
  // pure art colour: the "foreground" in foreground/backdrop unmatting.
  const nearestArt = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < n; i++) {
    if (!cleared[i] && !fringe[i]) {
      nearestArt[i] = i;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    forNeighbours(i, w, h, (nb) => {
      if (fringe[nb] && nearestArt[nb] < 0) {
        nearestArt[nb] = nearestArt[i];
        queue[tail++] = nb;
      }
    });
  }

  const alpha = new Float32Array(n).fill(1);
  const outR = Float32Array.from(r);
  const outG = Float32Array.from(g);
  const outB = Float32Array.from(b);
  for (let i = 0; i < n; i++) {
    if (backdrop[i]) {
      // black, not the backdrop colour: a pale tint here would halo once blurred
      alpha[i] = 0;
      outR[i] = outG[i] = outB[i] = 0;
    } else if (shadow[i]) {
      alpha[i] = Math.min(SHADOW_MAX_ALPHA, Math.max(0, (bgLum - luminance(i)) / SHADOW_STRENGTH));
      outR[i] = outG[i] = outB[i] = 0;
    } else if (fringe[i]) {
      const k = nearestArt[i];
      const span = k >= 0 ? Math.hypot(r[k] - bgR, g[k] - bgG, b[k] - bgB) : 1;
      const a = Math.min(1, dist[i] / (span + 1e-4));
      const safe = Math.max(a, 1e-3);
      alpha[i] = a;
      outR[i] = Math.min(1, Math.max(0, (r[i] - (1 - a) * bgR) / safe));
      outG[i] = Math.min(1, Math.max(0, (g[i] - (1 - a) * bgG) / safe));
      outB[i] = Math.min(1, Math.max(0, (b[i] - (1 - a) * bgB) / safe));
    }
  }

  const soft = blurAlpha(alpha, w, h);
  const rgba = new Uint8Array(n * 4);
  let transparent = 0;
  let residual = 0;
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = Math.round(outR[i] * 255);
    rgba[i * 4 + 1] = Math.round(outG[i] * 255);
    rgba[i * 4 + 2] = Math.round(outB[i] * 255);
    rgba[i * 4 + 3] = Math.round(soft[i] * 255);
    if (soft[i] < 0.03) transparent++;
    if (soft[i] > 0.8 && dist[i] < BACKDROP_DISTANCE * 1.5 && !shadow[i]) residual++;
  }
  return { rgba, stats: { transparent: transparent / n, residual: residual / n } };
}
