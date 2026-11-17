/* Palisades Tahoe: the Olympic Valley side at 1:1 scale.
   Terrain: USGS 3DEP via AWS Terrain Tiles. Lifts, runs, buildings: OpenStreetMap via Overture Maps. Tree cover: Sentinel-2.
   Ski mechanics follow Kicker Run (ski.html): carve bite, turn scrub, tuck, pop, spins, flips and grabs. */
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
const $ = id => document.getElementById(id);
const QS = new URLSearchParams(location.search);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
function hash2(ix, iz, seed) { let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, z, seed) { // smooth value noise, 0..1
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
const FT = 3.28084, MPH = 2.23694, KMH = 3.6;

/* ---------- world data ---------- */
const WORLD = JSON.parse($("world").textContent);
const M = WORLD.meta, X0 = M.x0, Z0 = M.z0, NX = M.nx, NZ = M.nz, CELL = M.cell, X1 = X0 + (NX - 1) * CELL, Z1 = Z0 + (NZ - 1) * CELL;
const MW = M.mw, MH = M.mh, MCELL = M.mcell;
let HM, HO, MA, MB, ROCK;   // heights, backdrop heights, masks (groom, tree, road) and (mogul, cos2t, sin2t), rock factor from slope
async function inflate16(b64, n, base, q) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  const d = new Int16Array(buf), w = n[0], h = n[1], out = new Float32Array(w * h);
  let up = 0;
  for (let j = 0; j < h; j++) { let v = 0; for (let i = 0; i < w; i++) { const k = j * w + i; if (i === 0) { up = (up + d[k]) & 0xffff; v = up; } else v = (v + d[k]) & 0xffff; out[k] = base + v * q; } }
  return out;
}
function loadMask(url) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0); ok(g.getImageData(0, 0, im.width, im.height).data); }; im.onerror = no; im.src = url; });
}
async function loadWorld() {
  [HM, HO, MA, MB] = await Promise.all([inflate16(WORLD.h, [NX, NZ], M.hbase, M.hq), inflate16(WORLD.ho, [M.on, M.on], M.obase, M.oq), loadMask(WORLD.maskA), loadMask(WORLD.maskB)]);
  WORLD.h = WORLD.ho = null;
  // rock shows where the ground is too steep to hold snow
  ROCK = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = HM[j * NX + Math.min(NX - 1, i + 1)] - HM[j * NX + Math.max(0, i - 1)], b = HM[Math.min(NZ - 1, j + 1) * NX + i] - HM[Math.max(0, j - 1) * NX + i];
    ROCK[j * NX + i] = sstep(0.74, 1.12, Math.hypot(a, b) / (2 * CELL));
  }
}
const inWorld = (x, z, m = 0) => x >= X0 + m && x <= X1 - m && z >= Z0 + m && z <= Z1 - m;
function bil(A, w, h, fx, fz) {
  fx = clamp(fx, 0, w - 1.001); fz = clamp(fz, 0, h - 1.001); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * w + i;
  return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + w] * (1 - u) * v + A[k + w + 1] * u * v;
}
function hOuter(x, z) { return bil(HO, M.on, M.on, (x - M.ox0) / M.ocell, (z - M.oz0) / M.ocell); }
const cr = (a, b, c, d, t) => b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
function hBase(x, z) { // Catmull-Rom bicubic over the 10 m grid
  const fx = clamp((x - X0) / CELL, 0, NX - 1.0001), fz = clamp((z - Z0) / CELL, 0, NZ - 1.0001), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j;
  const i0 = i > 0 ? i - 1 : 0, i2 = i + 1, i3 = i + 2 < NX ? i + 2 : NX - 1, r = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) { const jj = clamp(j - 1 + k, 0, NZ - 1) * NX; r[k] = cr(HM[jj + i0], HM[jj + i], HM[jj + i2], HM[jj + i3], u); }
  return cr(r[0], r[1], r[2], r[3], v);
}
const _mk = [0, 0, 0, 0, 0, 0];
function maskAt(x, z) { // -> [groom, tree, road, mogul, cos2t, sin2t], each 0..1
  const fx = clamp((x - X0) / MCELL, 0, MW - 1.001), fz = clamp((z - Z0) / MCELL, 0, MH - 1.001), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j;
  const a = (j * MW + i) * 4, b = a + 4, c = a + MW * 4, d = c + 4, w0 = (1 - u) * (1 - v), w1 = u * (1 - v), w2 = (1 - u) * v, w3 = u * v;
  for (let k = 0; k < 3; k++) { _mk[k] = (MA[a + k] * w0 + MA[b + k] * w1 + MA[c + k] * w2 + MA[d + k] * w3) / 255; _mk[k + 3] = (MB[a + k] * w0 + MB[b + k] * w1 + MB[c + k] * w2 + MB[d + k] * w3) / 255; }
  return _mk;
}
const treeMask = (x, z) => { const fx = clamp(Math.round((x - X0) / MCELL), 0, MW - 1), fz = clamp(Math.round((z - Z0) / MCELL), 0, MH - 1); return MA[(fz * MW + fx) * 4 + 1] / 255; };
const rockAt = (x, z) => bil(ROCK, NX, NZ, (x - X0) / CELL, (z - Z0) / CELL);
/* Snow surface on top of the survey data: wind drifts off-piste, mogul fields, and stepped rock bands on the steeps. Physics and rendering share it. */
function detailH(x, z) {
  const m = maskAt(x, z), open = (1 - m[0]) * (1 - m[2]), mg = m[3], rk = rockAt(x, z);
  let d = 0;
  if (open > 0.01) d += open * (0.42 * (vnoise(x * 0.041, z * 0.041, 11) * 2 - 1) + 0.13 * (vnoise(x * 0.14, z * 0.14, 12) * 2 - 1));
  if (mg > 0.01) { const wv = vnoise(x * 0.05, z * 0.05, 3) * TAU; d += mg * 0.36 * Math.sin(x * 1.37 + wv) * Math.sin(z * 1.16 + wv * 0.7) * (0.7 + 0.6 * vnoise(x * 0.3, z * 0.3, 4)); }
  if (rk > 0.01) {
    const t = vnoise(x * 0.033, z * 0.033, 23) * 4.5 + vnoise(x * 0.11, z * 0.11, 24) * 0.8, ft = t - Math.floor(t), r1 = 1 - Math.abs(2 * vnoise(x * 0.075, z * 0.075, 21) - 1);
    d += rk * ((Math.floor(t) + smooth((ft - 0.72) / 0.28)) * 2.4 - 5 + 1.5 * r1 * r1 * r1 + 0.35 * vnoise(x * 0.4, z * 0.4, 22));
  }
  return d;
}
const EDGE = 220;
function edgeW(x, z) { return smooth(1 - Math.min(x - X0, X1 - x, z - Z0, Z1 - z) / EDGE); }
/* Ground height. Inside the resort grid it is survey + detail, blending to the coarse backdrop at the rim so the two meshes meet exactly. */
function H(x, z) {
  if (!(x > X0 && x < X1 && z > Z0 && z < Z1)) return hOuter(x, z);
  const w = edgeW(x, z); if (w >= 1) return hOuter(x, z);
  const h = hBase(x, z) + detailH(x, z); return w > 0 ? lerp(h, hOuter(x, z), w) : h;
}
function Hsmooth(x, z) { // no detail: far terrain, lift profiles, building pads
  if (!(x > X0 && x < X1 && z > Z0 && z < Z1)) return hOuter(x, z);
  const w = edgeW(x, z); if (w >= 1) return hOuter(x, z); const h = hBase(x, z); return w > 0 ? lerp(h, hOuter(x, z), w) : h;
}
const _n = new THREE.Vector3();
function normalAt(x, z, e = 0.7, out = _n) { return out.set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); }
/* lon/lat for the HUD */
const toLL = (x, z) => [M.lon0 + x / M.mlon, M.lat0 - z / M.mlat];
