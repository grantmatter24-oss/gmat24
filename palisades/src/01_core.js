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
const LCELL = 10, TNX = Math.round((X1 - X0) / LCELL) + 1, TNZ = Math.round((Z1 - Z0) / LCELL) + 1;   // light and far-normal texture grid
let CL = null;   // cliff map from the 1 m lidar, on the height grid
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
  let MC; [HM, HO, MA, MB, MC] = await Promise.all([inflate16(WORLD.h, [NX, NZ], M.hbase, M.hq), inflate16(WORLD.ho, [M.on, M.on], M.obase, M.oq), loadMask(WORLD.maskA), loadMask(WORLD.maskB), loadMask(WORLD.maskC)]);
  WORLD.h = WORLD.ho = null; CL = new Float32Array(NX * NZ);
  for (let k = 0; k < NX * NZ; k++) { MA[k * 4 + 3] = MC[k * 4]; CL[k] = MC[k * 4] / 255; }   // mask grid and height grid are the same 5 m grid
  // Heights arrive in 8 cm steps. Off the cliffs, two passes of a small blur take the steps out so the snow lies smooth.
  for (let pass = 0; pass < 2; pass++) { const src = HM.slice();
    for (let j = 1; j < NZ - 1; j++) for (let i = 1; i < NX - 1; i++) { const k = j * NX + i; if (CL[k] + CL[k - 1] + CL[k + 1] + CL[k - NX] + CL[k + NX] > 0.02) continue;
      HM[k] = (4 * src[k] + 2 * (src[k - 1] + src[k + 1] + src[k - NX] + src[k + NX]) + src[k - NX - 1] + src[k - NX + 1] + src[k + NX - 1] + src[k + NX + 1]) / 16; } }
  // rock shows where the ground is too steep to hold snow
  ROCK = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = HM[j * NX + Math.min(NX - 1, i + 1)] - HM[j * NX + Math.max(0, i - 1)], b = HM[Math.min(NZ - 1, j + 1) * NX + i] - HM[Math.max(0, j - 1) * NX + i];
    ROCK[j * NX + i] = sstep(0.7, 1.15, Math.hypot(a, b) / (2 * CELL));
  }
}
const inWorld = (x, z, m = 0) => x >= X0 + m && x <= X1 - m && z >= Z0 + m && z <= Z1 - m;
function bil(A, w, h, fx, fz) {
  fx = clamp(fx, 0, w - 1.001); fz = clamp(fz, 0, h - 1.001); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * w + i;
  return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + w] * (1 - u) * v + A[k + w + 1] * u * v;
}
function hOuter(x, z) { return bil(HO, M.on, M.on, (x - M.ox0) / M.ocell, (z - M.oz0) / M.ocell); }
const cr = (a, b, c, d, t) => b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
const sCurve = t => { const a = t * t, b = (1 - t) * (1 - t); return a * a / (a * a + b * b); };
/* Survey height. Smooth (Catmull-Rom) on ordinary ground. Where the 1 m lidar says there is a cliff, the cell is interpolated
   so the whole drop happens in a metre or two instead of being smeared across 5 m: real cliffs at their real height, standing up. */
function hBase(x, z) {
  const fx = clamp((x - X0) / CELL, 0, NX - 1.0001), fz = clamp((z - Z0) / CELL, 0, NZ - 1.0001), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j;
  const i0 = i > 0 ? i - 1 : 0, i2 = i + 1, i3 = i + 2 < NX ? i + 2 : NX - 1, r = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) { const jj = clamp(j - 1 + k, 0, NZ - 1) * NX; r[k] = cr(HM[jj + i0], HM[jj + i], HM[jj + i2], HM[jj + i3], u); }
  const sm = cr(r[0], r[1], r[2], r[3], v), k0 = j * NX + i, c00 = CL[k0], c10 = CL[k0 + 1], c01 = CL[k0 + NX], c11 = CL[k0 + NX + 1];
  if (c00 + c10 + c01 + c11 < 0.02) return sm;
  const uw = lerp(u, sCurve(u), lerp(c00 + c10, c01 + c11, v) * 0.5), vw = lerp(v, sCurve(v), lerp(c00 + c01, c10 + c11, u) * 0.5);
  const wall = lerp(lerp(HM[k0], HM[k0 + 1], uw), lerp(HM[k0 + NX], HM[k0 + NX + 1], uw), vw);
  return lerp(sm, wall, lerp(lerp(c00, c10, u), lerp(c01, c11, u), v));
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
/* Snow surface on top of the survey data: long, gentle powder rolls off the groomed runs. Skiable ground stays smooth; the cliffs
   are the real ones, already in the survey. Physics and rendering share it. */
function detailH(x, z) {
  const m = maskAt(x, z), open = (1 - m[0]) * (1 - m[2]) * (1 - cliffK(x, z));
  return open > 0.01 ? open * 0.3 * (vnoise(x * 0.019, z * 0.019, 11) * 2 - 1) : 0;
}
/* Groomed runs are cut into the hillside the way the cats and the summer earthworks leave them: cat tracks dead level across,
   the wider runs with most of the side-slope taken out. */
const CATC = 40, CATW = Math.ceil((X1 - X0) / CATC), CATH = Math.ceil((Z1 - Z0) / CATC); let CATG = null, PARKG = null; const PARK = [];
function gridAdd(G, x0, z0, x1, z1, item) { for (let cz = Math.max(0, Math.floor((z0 - Z0) / CATC)); cz <= Math.min(CATH - 1, Math.floor((z1 - Z0) / CATC)); cz++) for (let cx = Math.max(0, Math.floor((x0 - X0) / CATC)); cx <= Math.min(CATW - 1, Math.floor((x1 - X0) / CATC)); cx++) (G[cz * CATW + cx] || (G[cz * CATW + cx] = [])).push(item); }
function initCat() {
  const G = new Array(CATW * CATH), RG = new Array(CATW * CATH), WID = [46, 42, 30, 18];
  /* Benches. A groomed run that crosses the hill is a road cut into it: level from edge to edge, with a cut bank above and a fill slope
     below. Cat tracks are always benched; any other groomed run is benched in proportion to how much the hill slopes across it, so a run
     that goes straight down the fall line keeps its natural shape. Where two groomed runs meet, the bench fades out over a long distance
     with no bank and no windrow, so one run flows into the other. */
  WORLD.runs.forEach((r, ri) => { if (!r.g) return; const hw = (WID[r.d] || 30) / 2; for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; gridAdd(RG, Math.min(a[0], b[0]) - hw - 30, Math.min(a[1], b[1]) - hw - 30, Math.max(a[0], b[0]) + hw + 30, Math.max(a[1], b[1]) + hw + 30, [a[0], a[1], b[0], b[1], hw, ri]); } });
  const joinK = (x, z, self) => { const c = RG[((z - Z0) / CATC | 0) * CATW + ((x - X0) / CATC | 0)]; if (!c) return 0; let k = 0;
    for (const s of c) { if (s[5] === self) continue; const ex = s[2] - s[0], ez = s[3] - s[1], t = clamp(((x - s[0]) * ex + (z - s[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1), d = Math.hypot(x - s[0] - ex * t, z - s[1] - ez * t); k = Math.max(k, 1 - sstep(s[4] + 6, s[4] + 28, d)); } return k; };
  const sm = (a, n) => { for (let it = 0; it < n; it++) a = a.map((h, i) => i === 0 || i === a.length - 1 ? h : (a[i - 1] + 2 * h + a[i + 1]) / 4); return a; };
  WORLD.runs.forEach((r, ri) => {
    if (!r.g || r.len < 120) return; const core = r.c ? 6 : Math.min(7.5, (WID[r.d] || 30) * 0.18), outer = core + 4.5, P = [];
    for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14)); for (let k = 0; k < n; k++) P.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); }
    P.push(r.pts[r.pts.length - 1].slice()); if (P.length < 4) return;
    const hs = sm(P.map(q => hBase(q[0], q[1])), 14), jk = sm(P.map(q => joinK(q[0], q[1], ri)), 2);   // an even grade along the run
    const st = sm(P.map((q, i) => { if (r.c) return 1; const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
      return sstep(0.05, 0.15, Math.abs(hBase(q[0] + nx * 9, q[1] + nz * 9) - hBase(q[0] - nx * 9, q[1] - nz * 9)) / 18); }), 4).map((v, i, a) => v * Math.min(1, i / 3, (a.length - 1 - i) / 3));   // a bench fades out at each end of its run
    if (Math.max(...st) < 0.02) return;
    for (let i = 0; i < P.length - 1; i++) { if (Math.max(st[Math.max(0, i - 1)], st[i], st[i + 1], st[Math.min(P.length - 1, i + 2)]) < 0.01) continue;   // no bench anywhere near this stretch
      const om = outer + 18 * Math.max(jk[i], jk[i + 1]) + 1.5, sg = [P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], hs[i], hs[i + 1], core, om, st[i], jk[i], jk[i + 1], st[i + 1], r.c ? 1 : 0, outer, ri, hs[Math.max(0, i - 1)], hs[Math.min(P.length - 1, i + 2)], st[Math.max(0, i - 1)], st[Math.min(P.length - 1, i + 2)], om * om]; gridAdd(G, Math.min(sg[0], sg[2]) - om, Math.min(sg[1], sg[3]) - om, Math.max(sg[0], sg[2]) + om, Math.max(sg[1], sg[3]) + om, sg); }
  });
  CATG = G; initPark();
}
const crom = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);   // a smooth curve through the run's levels, so the grade does not break at each point
function catBench(x, z, h) {
  const c = CATG && CATG[((z - Z0) / CATC | 0) * CATW + ((x - X0) / CATC | 0)]; if (!c) return h;
  // Each run gives one level (set by its nearest stretch) and one strength; runs that cross are then averaged by strength, so there is no crease where they meet.
  let run = -1, sw = 0, st = 0, sm = 0, TW = 0, TH = 0, M = 0, berm = 0;
  for (let k = 0; k <= c.length; k++) { const s = c[k];
    if (!s || s[14] !== run) { if (sm > 0) { const mw = sm / sw, m3 = mw * mw * mw; TW += m3; TH += m3 * st / sw; if (mw > M) M = mw; } /* the run you are on wins over one passing nearby at another height */ if (!s) break; run = s[14]; sw = st = sm = 0; }
    const ex = s[2] - s[0], ez = s[3] - s[1], tu = ((x - s[0]) * ex + (z - s[1]) * ez) / (ex * ex + ez * ez || 1), t = clamp(tu, 0, 1), te = clamp(tu, -0.6, 1.6), dx = x - s[0] - ex * t, dz = z - s[1] - ez * t, d2 = dx * dx + dz * dz; if (d2 >= s[19]) continue; const jn = s[9] + (s[10] - s[9]) * t, outer = s[13] + 18 * jn;
    const d = Math.sqrt(d2), fade = 1 - d / s[7], w = clamp(crom(s[17], s[8], s[11], s[18], te), 0, 1) * (1 - sstep(s[6], outer, d)), wq = fade * fade / ((d2 + 0.5) * (d2 + 0.5)); sw += wq; st += wq * crom(s[15], s[4], s[5], s[16], te); sm += wq * w;   // te runs a little past each end, so neighbouring stretches agree where they meet   // level and strength both come from the nearest stretch of that run
    if (s[12] && t > 0 && t < 1 && d > s[6] - 0.4 && d < s[6] + 2.2) berm = Math.max(berm, 0.38 * (1 - sstep(0, 0.25, jn)) * Math.sin((d - s[6] + 0.4) / 2.6 * Math.PI)); }   // the windrow the cat leaves along each edge of a cat track, never across another run
  return M > 0 ? lerp(h, TH / TW, M) + berm : h;
}
/* Terrain parks where the resort builds them (Belmont, and the Gold Coast line), cut the way the park crew cuts them: a takeoff
   wedge with square sides and a clean lip, a flat deck, a knuckle and a long landing. Sizes are taken from photographs of the
   Gold Coast park against the people in them: the big tables stand about two riders high at the lip and six or seven wide.
   Side hits are the little lips and banks skiers wear into the edges of the groomed runs. */
let parkLayout = +(QS.get("park") || store.get("pal-park", 2)), hitStyle = +(QS.get("hits") || store.get("pal-hits", 1));
const TABLE = { big: { hK: 3.6, Lr: 11, T: 16, Ld: 26, W: 12 }, mid: { hK: 2.4, Lr: 8.5, T: 10, Ld: 17, W: 8.5 }, wedge: { hK: 1.7, Lr: 5.2, T: 0, Ld: 0.7, W: 3.2 } };
function initPark() {
  const G = new Array(CATW * CATH);
  const path = (pts, off) => { const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { len: S[S.length - 1], at: (s, o = off) => { let k = 0; while (k < pts.length - 2 && s > S[k + 1]) k++; const u = (s - S[k]) / (S[k + 1] - S[k] || 1), dx = (pts[k + 1][0] - pts[k][0]) / (S[k + 1] - S[k] || 1), dz = (pts[k + 1][1] - pts[k][1]) / (S[k + 1] - S[k] || 1); return { x: lerp(pts[k][0], pts[k + 1][0], u) - dz * o, z: lerp(pts[k][1], pts[k + 1][1], u) + dx * o, dx, dz }; } }; };
  const table = (p, s, off, kind) => { const q = TABLE[kind]; PARK.push(Object.assign({ k: "table", kind, deck: kind === "wedge" ? 0 : 0.56 }, q, p.at(s, off))); return q.Lr + q.T + q.Ld; };
  const rail = (p, s, off, len) => { PARK.push(Object.assign({ k: "table", kind: "lip", hK: 0.55, Lr: 3.2, T: 0, Ld: 1.2, W: 3.2, deck: 0, lip: true }, p.at(s, off)), Object.assign({ k: "rail", len, hgt: 0.62 }, p.at(s + 4.2, off))); return 4.2 + len; };
  const barrel = (p, s, off) => { PARK.push(Object.assign({ k: "mound", R: 3.4, hK: 1.25 }, p.at(s, off))); return 7; };
  const bel = WORLD.lifts.find(l => l.n === "Belmont"), gc = WORLD.runs.filter(r => r.n === "Gold Coast").sort((a, b) => b.len - a.len)[0];
  if (bel) { const p = path(bel.pts.slice().reverse(), 22); let s = 24, n = 0; while (s < p.len - 40) { s += (n % 3 === 0 ? table(p, s, 22, "wedge") : n % 3 === 1 ? rail(p, s, 22, 10) : table(p, s, 22, "mid")) + 24; n++; } }
  if (gc) { const p = path(gc.pts, 0), end = Math.min(780, p.len - 40);
    if (parkLayout === 2) { // two lines side by side: medium tables on the left, the big ones on the right, jibs below
      let s = 70; while (s < end - 60) s += table(p, s, -11, "mid") + 30;
      s = 80; while (s < end - 70) s += table(p, s, 11, "big") + 38;
    } else { // the jump line down the middle, with a jib lane of small wedges, barrels and rails beside it
      let s = 80; while (s < end - 70) s += table(p, s, 3, "big") + 38;
      s = 70; let n = 0; while (s < end - 30) { s += (n % 3 === 0 ? table(p, s, -15, "wedge") : n % 3 === 1 ? barrel(p, s, -15) : rail(p, s, -15, 9 + 3 * (n % 2))) + 26; n++; }
    } }
  // side hits on the busier groomed runs, alternating edges
  for (const r of WORLD.runs) { if (!r.g || r.c || r.d > 1 || r.len < 500 || r.n === "Gold Coast") continue; const p = path(r.pts, 0), W = [46, 42, 30, 18][r.d]; let s = 90 + 60 * hash2(r.len, 3, 41), n = 0;
    while (s < p.len - 60) { const sd = (n + (r.len & 1)) % 2 ? 1 : -1, o = p.at(s, sd * (W / 2 - 1.5));
      if (hitStyle === 2) PARK.push(Object.assign({ k: "bank", len: 26, wB: 6.5, hK: 2.3, sd }, p.at(s, sd * (W / 2 - 2))));
      else { const c = Math.cos(0.3 * sd), sn = Math.sin(0.3 * sd); PARK.push(Object.assign({ k: "table", kind: "hit", hK: 1.1 + 0.5 * hash2(n, r.len, 42), Lr: 5, T: 0, Ld: 2.2, W: 4.2, deck: 0, side: true, soft: true }, o, { dx: o.dx * c - o.dz * sn, dz: o.dz * c + o.dx * sn })); }
      s += 150 + 110 * hash2(n, r.len, 43); n++; } }
  for (const f of PARK) { const L = f.k === "table" ? f.Lr + f.T + f.Ld + 2 : f.k === "mound" ? f.R : f.len, r = f.k === "bank" ? f.wB + 3 : f.k === "mound" ? f.R + 1 : (f.W || 2) / 2 + 6; gridAdd(G, Math.min(f.x, f.x + f.dx * L) - r, Math.min(f.z, f.z + f.dz * L) - r, Math.max(f.x, f.x + f.dx * L) + r, Math.max(f.z, f.z + f.dz * L) + r, f); }
  for (const f of PARK) f.cut = f.k === "table" && !f.soft;
  PARKG = G;
}
const parkCell = (x, z) => PARKG && PARKG[((z - Z0) / CATC | 0) * CATW + ((x - X0) / CATC | 0)];
function parkH(x, z, bare) { // bare: leave out the cut jumps, which are drawn by their own fine meshes
  const c = parkCell(x, z); if (!c) return 0; let h = 0;
  for (const f of c) { if (bare && f.cut) continue; const rx = x - f.x, rz = z - f.z, s = rx * f.dx + rz * f.dz, ul = -rx * f.dz + rz * f.dx, u = Math.abs(ul); let v = 0;
    if (f.k === "table") { const L = f.Lr + f.T + f.Ld; if (s < 0 || s > L) continue;
      if (s < f.Lr) v = f.hK * Math.pow(s / f.Lr, 1.7) * (1 - sstep(f.W / 2 - (f.soft ? 1.2 : 0.12), f.W / 2 + (f.soft ? 1.8 : 0.4), u));   // the wedge: square-cut sides
      const dk = f.hK * f.deck; if (dk > 0 && s > f.Lr - 1.5) { const wl = f.W / 2 + 2, body = (s < f.Lr + f.T ? dk * sstep(f.Lr - 1.5, f.Lr + 0.6, s) : dk * (1 - smooth((s - f.Lr - f.T) / f.Ld))) * (1 - sstep(wl - 0.4, wl + 2.6, u)); if (s >= f.Lr + 0.55) v = body; else v = Math.max(v * (1 - sstep(f.Lr, f.Lr + 0.55, s)), body); }
      else if (s >= f.Lr) v *= 1 - sstep(f.Lr, f.Lr + f.Ld, s); }
    else if (f.k === "mound") { const d = Math.hypot(rx - f.dx * f.R * 0.5, rz - f.dz * f.R * 0.5); v = f.hK * (1 - smooth(d / f.R)); }
    else if (f.k === "bank") { if (s < 0 || s > f.len) continue; const o = ul * f.sd; if (o < 0 || o > f.wB + 3) continue; const t = Math.min(1, o / f.wB); v = f.hK * t * t * Math.sin(Math.PI * s / f.len) * (1 - sstep(f.wB, f.wB + 3, o)); }
    if (v > h) h = v; }
  return h;
}
function kickerLip(x, z) { const c = parkCell(x, z); if (!c) return null; for (const f of c) { if (f.k !== "table") continue; const rx = x - f.x, rz = z - f.z, s = rx * f.dx + rz * f.dz; if (s > f.Lr - 3 && s < f.Lr + 1.2 && Math.abs(-rx * f.dz + rz * f.dx) < f.W / 2) return f; } return null; }
const EDGE = 220;
function edgeW(x, z) { return smooth(1 - Math.min(x - X0, X1 - x, z - Z0, Z1 - z) / EDGE); }
/* Ground height. Inside the resort grid it is survey + detail, blending to the coarse backdrop at the rim so the two meshes meet exactly. */
/* Creeks, from the mapped streams. They are drawn into a distance field (255 on the centreline, falling to zero twelve metres out,
   scaled by the size of the stream) that the ground height, the snow shader, the trees and the skier all read. */
const CRES = 2.5, CRW = Math.round((X1 - X0) / CRES), CRH = Math.round((Z1 - Z0) / CRES), CRSPAN = 12; let CRK = null;
let creekStyle = +(QS.get("creek") || store.get("pal-creek", 1));
function initCreeks() {
  const cs = WORLD.creeks; U.uCrkPool.value = creekStyle === 2 ? 1 : 0;
  if (!cs || !cs.length) { U.uCrk.value = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat); U.uCrk.value.needsUpdate = true; return; }
  const c = document.createElement("canvas"); c.width = CRW; c.height = CRH; const g = c.getContext("2d", { willReadFrequently: true }); g.fillStyle = "#000"; g.fillRect(0, 0, CRW, CRH); g.lineCap = g.lineJoin = "round"; g.globalCompositeOperation = "lighter";
  const N = 16; g.strokeStyle = "rgb(16,16,16)";
  for (let k = 0; k < 3; k++) { const sc = [0.75, 1.25, 4][k]; for (let s = 1; s <= N; s++) { g.lineWidth = 2 * CRSPAN * sc * s / N / CRES; g.beginPath(); for (const cr of cs) { if (cr.k !== k) continue; cr.pts.forEach((p, i) => { const x = (p[0] - X0) / CRES, z = (p[1] - Z0) / CRES; i ? g.lineTo(x, z) : g.moveTo(x, z); }); } g.stroke(); } }
  const d = g.getImageData(0, 0, CRW, CRH).data; CRK = new Uint8Array(CRW * CRH); for (let i = 0; i < CRK.length; i++) CRK[i] = d[i * 4];
  const t = new THREE.DataTexture(CRK, CRW, CRH, THREE.RedFormat); t.unpackAlignment = 1; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; U.uCrk.value = t;
}
function creekD(x, z) { // metres from the nearest creek's centreline, in units of that creek's own size; CRSPAN when there is none
  if (!CRK) return CRSPAN; const fx = (x - X0) / CRES - 0.5, fz = (z - Z0) / CRES - 0.5, i = fx | 0, j = fz | 0; if (i < 0 || j < 0 || i >= CRW - 1 || j >= CRH - 1) return CRSPAN;
  const k = j * CRW + i, a = CRK[k], b = CRK[k + 1], c = CRK[k + CRW], d = CRK[k + CRW + 1]; if (!(a | b | c | d)) return CRSPAN; const u = fx - i, w = fz - j;
  return CRSPAN * (1 - ((a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w) / 255);
}
const maskCh = (x, z, ch) => { const fx = clamp((x - X0) / MCELL, 0, MW - 1.001), fz = clamp((z - Z0) / MCELL, 0, MH - 1.001), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, a = (j * MW + i) * 4 + ch; return ((MA[a] * (1 - u) + MA[a + 4] * u) * (1 - v) + (MA[a + MW * 4] * (1 - u) + MA[a + MW * 4 + 4] * u) * v) / 255; };   // one channel of mask A, without touching maskAt's shared result
function creekCut(x, z) { const d = creekD(x, z); if (d >= 5.5) return 0; return 0.9 * (1 - sstep(1.2, 5.5, d)) * (1 - sstep(0.15, 0.5, maskCh(x, z, 0))) * (1 - maskCh(x, z, 2)); }   // the channel: nothing under a groomed run or a road, where the creek is piped or bridged
function creekWet(x, z) { return creekStyle === 1 && creekD(x, z) < 1.6 && maskCh(x, z, 0) < 0.2 && maskCh(x, z, 2) < 0.3; }
function H(x, z, bare) {
  if (!(x > X0 && x < X1 && z > Z0 && z < Z1)) return hOuter(x, z);
  const w = edgeW(x, z); if (w >= 1) return hOuter(x, z);
  const h = catBench(x, z, hBase(x, z) + detailH(x, z)) + parkH(x, z, bare) - creekCut(x, z); return w > 0 ? lerp(h, hOuter(x, z), w) : h;
}
function Hsmooth(x, z) { // no cliffs or drifts: far terrain, lift profiles, building pads
  if (!(x > X0 && x < X1 && z > Z0 && z < Z1)) return hOuter(x, z);
  const w = edgeW(x, z); if (w >= 1) return hOuter(x, z); const h = catBench(x, z, hBase(x, z)); return w > 0 ? lerp(h, hOuter(x, z), w) : h;
}
const _n = new THREE.Vector3();
const cliffK = (x, z) => bil(CL, NX, NZ, (x - X0) / CELL, (z - Z0) / CELL);
function normalAt(x, z, e = 1.2, out = _n) { return out.set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); }
/* lon/lat for the HUD */
const toLL = (x, z) => [M.lon0 + x / M.mlon, M.lat0 - z / M.mlat];
