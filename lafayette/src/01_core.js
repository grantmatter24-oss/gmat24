/* Lafayette, California at 1:1 scale.
   Elevation: USGS lidar (Contra Costa County) and 3DEP. Roads, buildings, water, land use: OpenStreetMap via Overture Maps.
   Ground colour and vegetation: Copernicus Sentinel-2. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/* ---------- small helpers ---------- */
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const sstep = (a, b, v) => smooth((v - a) / (b - a));
const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const $ = id => document.getElementById(id);
const QS = new URLSearchParams(location.search);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
function hash2(ix, iz, seed) { let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x, z, seed, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f, seed + i * 17); a *= 0.5; f *= 2.03; } return s; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FT = 3.28084, MPH = 2.23694, KMH = 3.6, G = 9.81;

/* ---------- world data ---------- */
const WORLD = JSON.parse($("world").textContent);
const M = WORLD.meta, X0 = M.x0, Z0 = M.z0, NX = M.nx, NZ = M.nz, CELL = M.cell, X1 = X0 + (NX - 1) * CELL, Z1 = Z0 + (NZ - 1) * CELL;
const MC = M.mc, MR = M.mr, MN = M.mn, FC = M.fc, FR = M.fr, FN = M.fn;
const HIW = M.hiw, HIH = M.hih, HICELL = 2, LOW = M.low, LOH = M.loh, LOCELL = M.locell;
let HM, HMD, HFR;          // heights: playable grid, surroundings, far backdrop
let HI, LO;                // masks as RGBA bytes: HI = paved, dirt, structure (2 m); LO = canopy, wild grass, turf (10 m)
let SATIMG, SATMIDIMG, SATFARIMG, MIDTREE;
const V = {};              // vector arrays

async function gunzip(b64) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
async function inflate16(b64, w, h, base, q) {   // int16 residuals of a 2D predictor: a running sum along each row, then down each column
  const d = new Int16Array(await gunzip(b64)), out = new Float32Array(w * h), row = new Int32Array(w);
  for (let j = 0; j < h; j++) { let acc = 0; for (let i = 0; i < w; i++) { const k = j * w + i; acc = (acc + d[k]) & 0xffff; row[i] = (row[i] + acc) & 0xffff; out[k] = base + row[i] * q; } }
  return out;
}
function loadImage(url) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = url; }); }
function imageBytes(im) { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; }
function cumul(A, start) {   // polylines are stored as a first point then steps
  const out = new Float32Array(A.length);
  for (let s = 0; s < start.length - 1; s++) { let x = 0, z = 0; for (let k = start[s]; k < start[s + 1]; k++) { x += A[k * 2]; z += A[k * 2 + 1]; out[k * 2] = x / 10; out[k * 2 + 1] = z / 10; } }
  return out;
}
async function loadWorld(progress) {
  const T = { u1: Uint8Array, u2: Uint16Array, u4: Uint32Array, i2: Int16Array, i4: Int32Array, f4: Float32Array };
  const [h, hm, hf, vec, hi, lo, sat, satMid, satFar, midTree] = await Promise.all([
    inflate16(WORLD.h, NX, NZ, M.hbase, M.hq), inflate16(WORLD.hm, MN, MN, M.mbase, M.mq), inflate16(WORLD.hf, FN, FN, M.fbase, M.fq), gunzip(WORLD.vec),
    loadImage(WORLD.maskHi), loadImage(WORLD.maskLo), loadImage(WORLD.sat), loadImage(WORLD.satMid), loadImage(WORLD.satFar), loadImage(WORLD.midTree)]);
  HM = h; HMD = hm; HFR = hf; HI = imageBytes(hi); LO = imageBytes(lo); SATIMG = sat; SATMIDIMG = satMid; SATFARIMG = satFar; MIDTREE = imageBytes(midTree);
  for (const k in WORLD.index) { const [t, off, n] = WORLD.index[k]; V[k] = new T[t](vec, off, n); }
  V.rP = cumul(V.rXY, V.rStart); V.bP = cumul(V.bXY, V.bStart); V.wP = cumul(V.wXY, V.wStart); V.sP = cumul(V.sXY, V.sStart);
  WORLD.h = WORLD.hm = WORLD.hf = WORLD.vec = WORLD.maskHi = WORLD.maskLo = null;
  // heights arrive in 5 cm steps: one light blur takes the steps out
  const src = HM.slice();
  for (let j = 1; j < NZ - 1; j++) for (let i = 1; i < NX - 1; i++) { const k = j * NX + i; HM[k] = (4 * src[k] + src[k - 1] + src[k + 1] + src[k - NX] + src[k + NX]) / 8; }
  buildDecks(); buildHashes();
}
const inWorld = (x, z, m = 0) => x >= X0 + m && x <= X1 - m && z >= Z0 + m && z <= Z1 - m;
function bil(A, w, h, fx, fz) {
  fx = clamp(fx, 0, w - 1.001); fz = clamp(fz, 0, h - 1.001); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * w + i;
  return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + w] * (1 - u) * v + A[k + w + 1] * u * v;
}
/* Ground height of the bare terrain anywhere: the survey grid inside the map, the coarser backdrop outside it. */
function H(x, z) {
  if (x >= X0 && x <= X1 && z >= Z0 && z <= Z1) return bil(HM, NX, NZ, (x - X0) / CELL, (z - Z0) / CELL);
  if (Math.abs(x) <= MR && Math.abs(z) <= MR) return bil(HMD, MN, MN, (x + MR) / MC, (z + MR) / MC);
  return bil(HFR, FN, FN, (x + FR) / FC, (z + FR) / FC);
}
const _n = new THREE.Vector3();
function groundNormal(x, z, out = _n, e = 1.2) { const a = H(x - e, z) - H(x + e, z), b = H(x, z - e) - H(x, z + e); return out.set(a, 2 * e, b).normalize(); }
function maskBil(A, w, h, fx, fz, ch) {
  fx = clamp(fx, 0, w - 1.001); fz = clamp(fz, 0, h - 1.001); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = (j * w + i) * 4 + ch;
  return (A[k] * (1 - u) * (1 - v) + A[k + 4] * u * (1 - v) + A[k + w * 4] * (1 - u) * v + A[k + w * 4 + 4] * u * v) / 255;
}
const hiAt = (x, z, ch) => inWorld(x, z) ? maskBil(HI, HIW, HIH, (x - X0) / HICELL - 0.5, (z - Z0) / HICELL - 0.5, ch) : 0;   // 0 paved, 1 dirt, 2 structure or water
const loAt = (x, z, ch) => inWorld(x, z) ? maskBil(LO, LOW, LOH, (x - X0) / LOCELL, (z - Z0) / LOCELL, ch) : 0;                 // 0 canopy, 1 wild grass, 2 turf
const midTreeAt = (x, z) => maskBil(MIDTREE, MN, MN, (x + MR) / MC, (z + MR) / MC, 0);

/* ---------- bridges: decks you can drive on, above ground you can also drive on ---------- */
const DECKS = [], deckHash = new Map(), DH = 40;
function buildDecks() {
  for (let r = 0; r < V.rKind.length; r++) {
    if (!(V.rFlag[r] & 2) || V.rYs[r] < 0) continue;
    const a = V.rStart[r], n0 = V.rStart[r + 1] - a, n = n0 + 2, P = new Float32Array(n * 3);
    for (let i = 0; i < n0; i++) { P[(i + 1) * 3] = V.rP[(a + i) * 2]; P[(i + 1) * 3 + 1] = V.rY[V.rYs[r] + i]; P[(i + 1) * 3 + 2] = V.rP[(a + i) * 2 + 1]; }
    // a 10 m run-on at each end ties the deck to the road it meets, so there is never a step at the abutment
    for (const [e, f, g] of [[0, 1, 2], [n - 1, n - 2, n - 3]]) { const dx = P[f * 3] - P[g * 3], dz = P[f * 3 + 2] - P[g * 3 + 2], l = Math.hypot(dx, dz) || 1, x = P[f * 3] + dx / l * 10, z = P[f * 3 + 2] + dz / l * 10, h = H(x, z); P[e * 3] = x; P[e * 3 + 2] = z; P[e * 3 + 1] = Math.abs(h - P[f * 3 + 1]) < 4 ? h : P[f * 3 + 1]; }
    const d = { P, n, hw: V.rW[r] / 20 + (V.rKind[r] === 14 ? 0.6 : 0.5), kind: V.rKind[r], road: r }; DECKS.push(d);
    for (let i = 0; i < n - 1; i++) {
      const xa = Math.min(P[i * 3], P[i * 3 + 3]) - d.hw, xb = Math.max(P[i * 3], P[i * 3 + 3]) + d.hw, za = Math.min(P[i * 3 + 2], P[i * 3 + 5]) - d.hw, zb = Math.max(P[i * 3 + 2], P[i * 3 + 5]) + d.hw;
      for (let cx = Math.floor(xa / DH); cx <= Math.floor(xb / DH); cx++) for (let cz = Math.floor(za / DH); cz <= Math.floor(zb / DH); cz++) { const k = cx * 4096 + cz; let l = deckHash.get(k); if (!l) deckHash.set(k, l = []); l.push(DECKS.length - 1, i); }
    }
  }
}
let deckRunOn = false;   // true when the height returned is only a run-on easing a deck into the road
const _dk = { y: new Float64Array(8), w: new Float64Array(8), r: new Uint8Array(8) };
/* Height of the deck surface at (x, z) that something at height yRef could be standing on, or -Infinity.
   Decks that overlap in plan (a carriageway and its slip road, two halves of a viaduct) are blended by how far inside each one
   the point is, so crossing from one to the other is never a step. */
function deckAt(x, z, yRef) {
  deckRunOn = false; const l = deckHash.get(Math.floor(x / DH) * 4096 + Math.floor(z / DH)); if (!l) return -Infinity; let n = 0, top = -Infinity;
  for (let q = 0; q < l.length && n < 8; q += 2) {
    const d = DECKS[l[q]], s = l[q + 1], i = s * 3, P = d.P, ax = P[i], az = P[i + 2], bx = P[i + 3], bz = P[i + 5], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1), px = ax + dx * t - x, pz = az + dz * t - z, d2 = px * px + pz * pz; if (d2 > d.hw * d.hw) continue;
    const y = P[i + 1] + (P[i + 4] - P[i + 1]) * t; if (y > yRef + 1.3) continue;
    const run = s === 0 || s === d.n - 2; _dk.y[n] = y; _dk.r[n] = run ? 1 : 0; _dk.w[n] = Math.max(0.02, clamp((d.hw - Math.sqrt(d2)) / 2.5, 0, 1) * (run ? smooth(s === 0 ? t : 1 - t) : 1)); if (y > top) top = y; n++;
  }
  if (!n) return -Infinity; let sw = 0, sy = 0, real = false, h = 0, hk = false;
  for (let k = 0; k < n; k++) { if (_dk.y[k] < top - 1.6) continue; let y = _dk.y[k], w = _dk.w[k];
    if (_dk.r[k]) { if (!hk) { h = H(x, z); hk = true; } y = h + (y - h) * Math.min(1, w * 1.02); w = Math.max(w, 0.05); } else real = true;
    sw += w; sy += w * y; }
  deckRunOn = !real; return sy / sw;
}
/* What the wheels are on: the higher of the terrain and any deck within reach from below. */
function ground(x, z, yRef = 1e9) { const h = H(x, z), d = deckAt(x, z, yRef); if (deckRunOn) return d; return d > h ? d : h; }
const SURF = { ASPHALT: 0, DIRT: 1, GRASS: 2, WATER: 3 };
function surfaceAt(x, z, y) {
  if (deckAt(x, z, y + 0.5) > H(x, z) + 0.5) return SURF.ASPHALT;
  if (hiAt(x, z, 0) > 0.45) return SURF.ASPHALT; if (hiAt(x, z, 1) > 0.35) return SURF.DIRT;
  const s = hiAt(x, z, 2); if (s > 0.7 && s < 0.86 && waterAt(x, z) > -1e8) return SURF.WATER;
  return SURF.GRASS;
}

/* ---------- spatial lookups: buildings, water, road names ---------- */
const BH = 32, bldHash = new Map(), WATERS = [], roadHash = new Map(), RH = 48;
const BLD = { minx: null, maxx: null, minz: null, maxz: null, top: null };
function buildHashes() {
  const nb = V.bKind.length; BLD.minx = new Float32Array(nb); BLD.maxx = new Float32Array(nb); BLD.minz = new Float32Array(nb); BLD.maxz = new Float32Array(nb); BLD.top = new Float32Array(nb);
  for (let b = 0; b < nb; b++) {
    let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
    let top = -1e9; for (let k = V.bStart[b]; k < V.bStart[b + 1]; k++) { const x = V.bP[k * 2], z = V.bP[k * 2 + 1]; if (x < xa) xa = x; if (x > xb) xb = x; if (z < za) za = z; if (z > zb) zb = z; top = Math.max(top, H(x, z)); }
    BLD.top[b] = top + V.bH[b] / 10; BLD.minx[b] = xa; BLD.maxx[b] = xb; BLD.minz[b] = za; BLD.maxz[b] = zb;
    if (V.bKind[b] === 6) continue;   // open roofs do not stop anything
    for (let cx = Math.floor(xa / BH); cx <= Math.floor(xb / BH); cx++) for (let cz = Math.floor(za / BH); cz <= Math.floor(zb / BH); cz++) { const k = cx * 4096 + cz; let l = bldHash.get(k); if (!l) bldHash.set(k, l = []); l.push(b); }
  }
  for (let w = 0; w < V.wKind.length; w++) {
    let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9; const a = V.wStart[w], n = V.wStart[w + 1] - a;
    for (let k = a; k < a + n; k++) { const x = V.wP[k * 2], z = V.wP[k * 2 + 1]; if (x < xa) xa = x; if (x > xb) xb = x; if (z < za) za = z; if (z > zb) zb = z; }
    WATERS.push({ a, n, xa, xb, za, zb, y: V.wY[w], pool: V.wKind[w] === 1 });
  }
  for (let r = 0; r < V.rKind.length; r++) {
    if (!V.rName[r] || V.rKind[r] > 12) continue;
    for (let k = V.rStart[r]; k < V.rStart[r + 1] - 1; k++) {
      const ax = V.rP[k * 2], az = V.rP[k * 2 + 1], bx = V.rP[k * 2 + 2], bz = V.rP[k * 2 + 3];
      for (let cx = Math.floor(Math.min(ax, bx) / RH); cx <= Math.floor(Math.max(ax, bx) / RH); cx++) for (let cz = Math.floor(Math.min(az, bz) / RH); cz <= Math.floor(Math.max(az, bz) / RH); cz++) { const q = cx * 4096 + cz; let l = roadHash.get(q); if (!l) roadHash.set(q, l = []); l.push(r, k); }
    }
  }
}
function inPoly(P, a, n, x, z) { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const xi = P[(a + i) * 2], zi = P[(a + i) * 2 + 1], xj = P[(a + j) * 2], zj = P[(a + j) * 2 + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
function waterAt(x, z) { for (const w of WATERS) if (x >= w.xa && x <= w.xb && z >= w.za && z <= w.zb && inPoly(V.wP, w.a, w.n, x, z)) return w.y; return -1e9; }
function roadNameAt(x, z) {   // the named street or trail under you, if any
  let best = 0, bd = 14 * 14;
  for (let cx = Math.floor((x - 14) / RH); cx <= Math.floor((x + 14) / RH); cx++) for (let cz = Math.floor((z - 14) / RH); cz <= Math.floor((z + 14) / RH); cz++) {
    const l = roadHash.get(cx * 4096 + cz); if (!l) continue;
    for (let q = 0; q < l.length; q += 2) { const k = l[q + 1], ax = V.rP[k * 2], az = V.rP[k * 2 + 1], dx = V.rP[k * 2 + 2] - ax, dz = V.rP[k * 2 + 3] - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9), 0, 1), px = ax + dx * t - x, pz = az + dz * t - z, d = px * px + pz * pz, w = V.rW[l[q]] / 20 + 2; if (d < bd && d < w * w) { bd = d; best = V.rName[l[q]]; } }
  }
  return WORLD.names[best] || "";
}
/* Push a circle out of any building it overlaps. Returns the wall normal of the deepest hit in `out` (x, z) and the depth, or 0. */
function hitBuildings(x, z, r, out, y) {
  let deep = 0;
  for (let cx = Math.floor((x - r) / BH); cx <= Math.floor((x + r) / BH); cx++) for (let cz = Math.floor((z - r) / BH); cz <= Math.floor((z + r) / BH); cz++) {
    const l = bldHash.get(cx * 4096 + cz); if (!l) continue;
    for (const b of l) {
      if (x < BLD.minx[b] - r || x > BLD.maxx[b] + r || z < BLD.minz[b] - r || z > BLD.maxz[b] + r || y > BLD.top[b] + 0.4) continue;   // on a bridge above the roof: nothing to hit
      const a = V.bStart[b], n = V.bStart[b + 1] - a, P = V.bP; let bd = 1e9, nx = 0, nz = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const ax = P[(a + j) * 2], az = P[(a + j) * 2 + 1], dx = P[(a + i) * 2] - ax, dz = P[(a + i) * 2 + 1] - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9), 0, 1), px = x - ax - dx * t, pz = z - az - dz * t, d = Math.hypot(px, pz);
        if (d < bd) { bd = d; nx = px / (d + 1e-9); nz = pz / (d + 1e-9); }
      }
      const inside = inPoly(P, a, n, x, z), pen = inside ? r + bd : r - bd;
      if (pen > deep) { deep = pen; out.x = inside ? -nx : nx; out.z = inside ? -nz : nz; }
    }
  }
  return deep;
}

/* ---------- settings ---------- */
const QUALITY = { low: { grass: 0.45, trees: 0.6, shadow: 1024, px: 1, far: 0.7, post: false }, med: { grass: 0.75, trees: 0.85, shadow: 2048, px: 1.25, far: 1, post: true }, high: { grass: 1, trees: 1, shadow: 4096, px: 2, far: 1.25, post: true } };
let qName = QS.get("q") || store.get("laf-q", "med"); if (!QUALITY[qName]) qName = "med";
let Q = Object.assign({}, QUALITY[qName]);
if (QS.has("gs")) Q.grass = +QS.get("gs"); if (QS.has("ts")) Q.trees = +QS.get("ts");   // test overrides
let units = store.get("laf-units", "imp");
