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
    ROCK[j * NX + i] = sstep(0.62, 1.02, Math.hypot(a, b) / (2 * CELL));   // the 10 m survey rounds cliffs off, so rock starts near 32 degrees
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
const clearMask = (x, z) => { const fx = clamp(Math.round((x - X0) / MCELL), 0, MW - 1), fz = clamp(Math.round((z - Z0) / MCELL), 0, MH - 1); return Math.max(MB[(fz * MW + fx) * 4], MA[(fz * MW + fx) * 4], MA[(fz * MW + fx) * 4 + 2]) / 255; };
const treeMask = (x, z) => { const fx = clamp(Math.round((x - X0) / MCELL), 0, MW - 1), fz = clamp(Math.round((z - Z0) / MCELL), 0, MH - 1); return MA[(fz * MW + fx) * 4 + 1] / 255; };
const rockAt = (x, z) => bil(ROCK, NX, NZ, (x - X0) / CELL, (z - Z0) / CELL);
/* Snow surface on top of the survey data. Skiable ground stays smooth (long, gentle powder rolls off the groomed runs).
   Rock is only ever cliff: on steep ground the hillside is stepped into near-vertical bands that follow the contours, like the
   real cliff lines, with snow benches between them and clean chutes where the bands break. Physics and rendering share it. */
const CLIFF_H = 14, CLIFF_P = 46;   // a 14 m wall once in every 46 m of height, where the band is present
function cliffAt(x, z, hb) { // -> [strength 0..1, position within the step 0..1 (the face is the last fifth)]
  const rk = sstep(0.25, 0.8, rockAt(x, z)); if (rk < 0.02) { _cl[0] = 0; return _cl; }
  const band = sstep(0.42, 0.56, vnoise(x * 0.0085, z * 0.0085, 31)) * (1 - maskAt(x, z)[0]);   // cliff bands come and go along a face: chutes between
  const t = hb / CLIFF_P + vnoise(x * 0.011, z * 0.011, 23) * 2.4 + vnoise(x * 0.06, z * 0.06, 24) * 0.16, ft = Math.floor(t);   // bands wander across the face rather than following one contour
  _cl[0] = hash2(ft, 3, 77) > 0.35 ? rk * band : 0; _cl[1] = t - ft; return _cl;   // and only some steps stand up as cliffs
}
const _cl = [0, 0];
function detailH(x, z, hb) {
  const m = maskAt(x, z), open = (1 - m[0]) * (1 - m[2]);
  let d = 0;
  if (open > 0.01) d += open * 0.32 * (vnoise(x * 0.019, z * 0.019, 11) * 2 - 1);
  const c = cliffAt(x, z, hb);
  if (c[0] > 0.01) { const ft = c[1]; d += c[0] * (CLIFF_H * (smooth((ft - 0.8) / 0.2) - smooth(ft / 0.8)) + (ft > 0.78 ? 1.4 * (vnoise(x * 0.35, z * 0.35, 22) - 0.5) * Math.sin((ft - 0.78) / 0.22 * Math.PI) : 0)); }   // the slope eases onto a bench, then the wall stands up   // bench levels off, then the face stands up
  return d;
}
/* Groomed runs are cut into the hillside the way the cats and the summer earthworks leave them: cat tracks dead level across,
   the wider runs with most of the side-slope taken out. */
const CATC = 40, CATW = Math.ceil((X1 - X0) / CATC), CATH = Math.ceil((Z1 - Z0) / CATC); let CATG = null, PARKG = null; const PARK = [];
function gridAdd(G, x0, z0, x1, z1, item) { for (let cz = Math.max(0, Math.floor((z0 - Z0) / CATC)); cz <= Math.min(CATH - 1, Math.floor((z1 - Z0) / CATC)); cz++) for (let cx = Math.max(0, Math.floor((x0 - X0) / CATC)); cx <= Math.min(CATW - 1, Math.floor((x1 - X0) / CATC)); cx++) (G[cz * CATW + cx] || (G[cz * CATW + cx] = [])).push(item); }
function initCat() {
  const G = new Array(CATW * CATH);
  for (const r of WORLD.runs) {
    if (!r.g) continue; const W = [46, 42, 30, 18][r.d], core = r.c ? 4 : 0.26 * W, outer = r.c ? 12 : 0.5 * W + 9, str = r.c ? 1 : 0.72, P = [];
    for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14)); for (let k = 0; k < n; k++) P.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); }
    P.push(r.pts[r.pts.length - 1].slice()); let hs = P.map(q => hBase(q[0], q[1]));
    for (let it = 0; it < (r.c ? 6 : 3); it++) hs = hs.map((h, i) => i === 0 || i === hs.length - 1 ? h : (hs[i - 1] + 2 * h + hs[i + 1]) / 4);   // even out the grade along the run
    for (let i = 0; i < P.length - 1; i++) { const sg = [P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], hs[i], hs[i + 1], core, outer, str]; gridAdd(G, Math.min(sg[0], sg[2]) - outer, Math.min(sg[1], sg[3]) - outer, Math.max(sg[0], sg[2]) + outer, Math.max(sg[1], sg[3]) + outer, sg); }
  }
  CATG = G; initPark();
}
function catBench(x, z, h) {
  const c = CATG && CATG[((z - Z0) / CATC | 0) * CATW + ((x - X0) / CATC | 0)]; if (!c) return h; let sw = 0, st = 0, mw = 0;
  for (const s of c) { const ex = s[2] - s[0], ez = s[3] - s[1], t = clamp(((x - s[0]) * ex + (z - s[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1), dx = x - s[0] - ex * t, dz = z - s[1] - ez * t, d2 = dx * dx + dz * dz; if (d2 >= s[7] * s[7]) continue;
    const w = s[8] * (1 - sstep(s[6], s[7], Math.sqrt(d2))); if (w <= 0) continue; sw += w; st += w * (s[4] + (s[5] - s[4]) * t); if (w > mw) mw = w; }
  return mw > 0 ? lerp(h, st / sw, mw) : h;
}
/* Terrain parks where the resort builds them: Belmont, and the Gold Coast line. Table-top kickers are shaped into the snow here;
   the rails that go with them are in PARK for the renderer and the grind physics. */
function initPark() {
  const G = new Array(CATW * CATH), SZ = [[1.9, 8, 6, 13], [2.9, 10, 9, 17], [3.9, 12, 12, 21]];
  const line = (pts, off, s0, s1) => { // lay features along a downhill path
    const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const at = s => { let k = 0; while (k < pts.length - 2 && s > S[k + 1]) k++; const u = (s - S[k]) / (S[k + 1] - S[k] || 1), dx = (pts[k + 1][0] - pts[k][0]) / (S[k + 1] - S[k] || 1), dz = (pts[k + 1][1] - pts[k][1]) / (S[k + 1] - S[k] || 1); return { x: lerp(pts[k][0], pts[k + 1][0], u) - dz * off, z: lerp(pts[k][1], pts[k + 1][1], u) + dx * off, dx, dz }; };
    let s = s0, n = 0; const end = Math.min(s1, S[S.length - 1] - 30);
    while (s < end) {
      const o = at(s);
      if (n % 2 === 0) { const q = SZ[(n / 2) % 3], f = Object.assign({ k: "kick", hK: q[0], Lr: q[1], T: q[2], Ld: q[3], W: 9 }, o); PARK.push(f); s += q[1] + q[2] + q[3] + 30; }
      else { const len = 9 + 3 * ((n >> 1) % 2), lip = Object.assign({ k: "kick", hK: 0.55, Lr: 3.2, T: 0, Ld: 1.2, W: 3.2, lip: true }, o), r = at(s + 4.2); PARK.push(lip, Object.assign({ k: "rail", len, hgt: 0.62 }, r)); s += 4.2 + len + 24; }
      n++;
    }
  };
  const bel = WORLD.lifts.find(l => l.n === "Belmont"), gc = WORLD.runs.filter(r => r.n === "Gold Coast").sort((a, b) => b.len - a.len)[0];
  if (bel) line(bel.pts.slice().reverse(), 22, 24, 1e9);
  if (gc) line(gc.pts, 0, 70, 760);
  for (const f of PARK) { const L = f.k === "kick" ? f.Lr + f.T + f.Ld + 2 : f.len, r = (f.W || 2) / 2 + 3; gridAdd(G, Math.min(f.x, f.x + f.dx * L) - r, Math.min(f.z, f.z + f.dz * L) - r, Math.max(f.x, f.x + f.dx * L) + r, Math.max(f.z, f.z + f.dz * L) + r, f); }
  PARKG = G;
}
const parkCell = (x, z) => PARKG && PARKG[((z - Z0) / CATC | 0) * CATW + ((x - X0) / CATC | 0)];
function parkH(x, z) {
  const c = parkCell(x, z); if (!c) return 0; let h = 0;
  for (const f of c) { if (f.k !== "kick") continue; const rx = x - f.x, rz = z - f.z, s = rx * f.dx + rz * f.dz; if (s < 0 || s > f.Lr + f.T + f.Ld) continue; const u = Math.abs(-rx * f.dz + rz * f.dx), w = 1 - sstep(f.W / 2 - 0.8, f.W / 2 + 1.6, u); if (w <= 0) continue;
    const top = f.hK * 0.78, v = s < f.Lr ? f.hK * (s / f.Lr) * (s / f.Lr) : s < f.Lr + f.T ? top : top * (1 - smooth((s - f.Lr - f.T) / f.Ld)); if (v * w > h) h = v * w; }
  return h;
}
function kickerLip(x, z) { const c = parkCell(x, z); if (!c) return null; for (const f of c) { if (f.k !== "kick") continue; const rx = x - f.x, rz = z - f.z, s = rx * f.dx + rz * f.dz; if (s > f.Lr - 3 && s < f.Lr + 1.2 && Math.abs(-rx * f.dz + rz * f.dx) < f.W / 2) return f; } return null; }
const EDGE = 220;
function edgeW(x, z) { return smooth(1 - Math.min(x - X0, X1 - x, z - Z0, Z1 - z) / EDGE); }
/* Ground height. Inside the resort grid it is survey + detail, blending to the coarse backdrop at the rim so the two meshes meet exactly. */
function H(x, z) {
  if (!(x > X0 && x < X1 && z > Z0 && z < Z1)) return hOuter(x, z);
  const w = edgeW(x, z); if (w >= 1) return hOuter(x, z);
  const hb = hBase(x, z), h = catBench(x, z, hb + detailH(x, z, hb)) + parkH(x, z); return w > 0 ? lerp(h, hOuter(x, z), w) : h;
}
function Hsmooth(x, z) { // no cliffs or drifts: far terrain, lift profiles, building pads
  if (!(x > X0 && x < X1 && z > Z0 && z < Z1)) return hOuter(x, z);
  const w = edgeW(x, z); if (w >= 1) return hOuter(x, z); const h = catBench(x, z, hBase(x, z)); return w > 0 ? lerp(h, hOuter(x, z), w) : h;
}
const _n = new THREE.Vector3();
function normalAt(x, z, e = 1.2, out = _n) { return out.set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); }
/* lon/lat for the HUD */
const toLL = (x, z) => [M.lon0 + x / M.mlon, M.lat0 - z / M.mlat];
