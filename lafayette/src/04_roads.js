/* ---------- roads: every mapped street, drive, trail and track as a ribbon lying on its graded bed ---------- */
class Buf {   // growing vertex buffers for one material
  constructor(hasUv = true, hasCol = true) { this.p = []; this.n = []; this.u = hasUv ? [] : null; this.c = hasCol ? [] : null; this.i = []; this.v = 0; }
  vert(x, y, z, nx, ny, nz, u, v, r, g, b) { this.p.push(x, y, z); this.n.push(nx, ny, nz); if (this.u) this.u.push(u, v); if (this.c) this.c.push(r, g, b); return this.v++; }
  quad(a, b, c, d) { this.i.push(a, b, c, c, b, d); }
  tri(a, b, c) { this.i.push(a, b, c); }
  geo() {
    if (!this.v) return null; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    if (this.u) g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2)); if (this.c) g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1)); return g;
  }
}
function canvasTex(size, draw, repeat = true, srgb = true) {
  const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANISO; return t;
}
function speckle(g, s, base, amp, n, seed, sz = 1.4) { const r = rng(seed); g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, s, s); for (let i = 0; i < n; i++) { const v = clamp(Math.round(base + (r() - 0.5) * 2 * amp), 0, 255); g.fillStyle = `rgb(${v},${v},${v + (r() < 0.3 ? 3 : 0)})`; const q = sz * (0.5 + r()); g.fillRect(r() * s, r() * s, q, q); } }
const RM = {};   // road materials
function buildRoadMaterials() {
  const asphalt = canvasTex(512, (g, s) => {
    speckle(g, s, 104, 30, 60000, 5); const r = rng(9);
    for (let i = 0; i < 11; i++) { g.strokeStyle = `rgba(20,20,22,${0.10 + r() * 0.15})`; g.lineWidth = 0.7 + r() * 0.6; g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (r() - 0.5) * 60; y += (r() - 0.3) * 50; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "40,40,44" : "150,150,150"},0.05)`; g.fillRect(r() * s, r() * s, 60 + r() * 160, 50 + r() * 120); }
    for (let i = 0; i < 2; i++) { g.strokeStyle = "rgba(12,12,14,0.3)"; g.lineWidth = 1.8; g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 36; y += 20 + r() * 40; g.lineTo(x, y); } g.stroke(); }   // tar poured into the old cracks
    for (let i = 0; i < 14; i++) { const x = r() * s, y = r() * s, rr = 5 + r() * 14, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(10,10,12,0.22)"); gr.addColorStop(1, "rgba(10,10,12,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }   // oil spots
  });
  const concrete = canvasTex(256, (g, s) => { speckle(g, s, 186, 16, 14000, 3); g.strokeStyle = "rgba(90,88,84,0.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 1); g.lineTo(s, 1); g.stroke(); });
  const dirt = canvasTex(256, (g, s) => {   // alpha fades the edges into the grass, two paler wheel tracks down the middle
    const im = g.createImageData(s, s), r = rng(4);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const u = x / s, e = Math.min(u, 1 - u), a = sstep(0.0, 0.22, e + (vnoise(x * 0.09, y * 0.09, 3) - 0.5) * 0.16), rut = Math.exp(-Math.pow((Math.abs(u - 0.5) - 0.2) / 0.085, 2)), n = 0.82 + 0.3 * vnoise(x * 0.4, y * 0.4, 8) + (r() - 0.5) * 0.12, k = (y * s + x) * 4;
      im.data[k] = clamp(150 * n + 38 * rut, 0, 255); im.data[k + 1] = clamp(121 * n + 32 * rut, 0, 255); im.data[k + 2] = clamp(88 * n + 26 * rut, 0, 255); im.data[k + 3] = 255 * a; }
    g.putImageData(im, 0, 0);
  });
  const ballast = canvasTex(256, (g, s) => { speckle(g, s, 118, 46, 30000, 12, 2.4); g.fillStyle = "rgba(60,48,40,0.9)"; for (let y = 0; y < s; y += 32) g.fillRect(s * 0.14, y + 8, s * 0.72, 13); });
  const po = (m, f, u) => { m.polygonOffset = true; m.polygonOffsetFactor = f; m.polygonOffsetUnits = u; return m; };
  RM.asphalt = po(new THREE.MeshStandardMaterial({ map: asphalt, vertexColors: true, roughness: 0.88 }), -2, -4);
  RM.concrete = po(new THREE.MeshStandardMaterial({ map: concrete, vertexColors: true, roughness: 0.9 }), -3, -6);
  RM.dirt = po(new THREE.MeshStandardMaterial({ map: dirt, vertexColors: true, roughness: 1, transparent: true, depthWrite: false }), -2, -4);
  RM.ballast = po(new THREE.MeshStandardMaterial({ map: ballast, vertexColors: true, roughness: 1 }), -2, -4);
  RM.paint = po(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }), -5, -10);
  RM.deck = new THREE.MeshStandardMaterial({ map: concrete, vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
  RM.steel = new THREE.MeshStandardMaterial({ color: 0x6b6763, roughness: 0.45, metalness: 0.85, side: THREE.DoubleSide });
  RM.sign = new THREE.MeshStandardMaterial({ map: canvasTex(128, (g, s) => { g.clearRect(0, 0, s, s); const oct = r => { g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU; g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } g.closePath(); }; oct(63); g.fillStyle = "#f2f2ee"; g.fill(); oct(56); g.fillStyle = "#b3141a"; g.fill(); g.fillStyle = "#f6f6f2"; g.font = "700 38px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("STOP", s / 2, s / 2 + 2); }, false), roughness: 0.55, alphaTest: 0.5, side: THREE.DoubleSide });
}
/* lateral paint positions (metres left of the centreline), per kind: [offset, colour 0 white / 1 yellow, dash 0 solid / 1 lane dashes / 2 short dashes] */
function paintPlan(kind, oneway, w) {
  const h = w / 2;
  if (kind === 0) return [[h - 1.3, 1, 0], [h - 1.3 - 3.66, 0, 1], [h - 1.3 - 7.32, 0, 1], [h - 1.3 - 10.98, 0, 1], [-h + 2.2, 0, 0]];
  if (kind === 1) return [[h - 0.9, 1, 0], [-h + 1.3, 0, 0]];
  if (kind === 2) return oneway ? [[h - 0.7, 1, 0], [0, 0, 1], [-h + 0.9, 0, 0]] : [[0.16, 1, 0], [-0.16, 1, 0], [3.6, 0, 1], [-3.6, 0, 1], [h - 1.0, 0, 0], [-h + 1.0, 0, 0]];
  if (kind === 3) return oneway ? [[h - 0.6, 1, 0], [0, 0, 1], [-h + 0.8, 0, 0]] : [[0.16, 1, 0], [-0.16, 1, 0], [h - 1.7, 0, 0], [-h + 1.7, 0, 0]];
  if (kind === 4) return oneway ? [[h - 0.5, 1, 0], [-h + 0.6, 0, 0]] : [[0.16, 1, 0], [-0.16, 1, 0]];
  if (kind === 12) return [[0, 1, 2]];
  return null;
}
const ROADCOL = [[1.18, 1.17, 1.13], [1.0, 1.0, 1.0], [0.92, 0.92, 0.93], [0.95, 0.95, 0.96], [1.0, 1.0, 1.0], [1.06, 1.05, 1.03], [1.12, 1.1, 1.07], [1.5, 1.47, 1.4], [0.9, 0.9, 0.92], [1, 1, 1], [1, 1, 1], [1, 1, 1], [0.82, 0.82, 0.84]];
const STRIPS = [], roadTiles = new Map(), RT = 256, junHash = new Map();
function buildStrips() {
  for (let i = 0; i < V.jX.length; i++) { const x = V.jX[i] / 10, z = V.jZ[i] / 10, k = Math.floor(x / 64) * 4096 + Math.floor(z / 64); let l = junHash.get(k); if (!l) junHash.set(k, l = []); l.push(x, z, V.jR[i] / 10); }
  for (let r = 0; r < V.rKind.length; r++) {
    const kind = V.rKind[r], flag = V.rFlag[r], a = V.rStart[r], n0 = V.rStart[r + 1] - a; if (n0 < 2) continue;
    const bridge = !!(flag & 2), ys = V.rYs[r], step = kind === 9 || kind === 10 || (flag & 4) ? 3 : (flag & 8) ? 12 : 5;
    const px = [], pz = [], py = bridge ? [] : null;
    for (let i = 0; i < n0 - 1; i++) {
      const ax = V.rP[(a + i) * 2], az = V.rP[(a + i) * 2 + 1], bx = V.rP[(a + i) * 2 + 2], bz = V.rP[(a + i) * 2 + 3], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k < m; k++) { const t = k / m; px.push(ax + (bx - ax) * t); pz.push(az + (bz - az) * t); if (bridge) py.push(ys >= 0 ? lerp(V.rY[ys + i], V.rY[ys + i + 1], t) : 0); }
    }
    px.push(V.rP[(a + n0 - 1) * 2]); pz.push(V.rP[(a + n0 - 1) * 2 + 1]); if (bridge) py.push(ys >= 0 ? V.rY[ys + n0 - 1] : 0);
    const n = px.length, S = new Float32Array(n), LX = new Float32Array(n), LZ = new Float32Array(n);
    for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(px[i] - px[i - 1], pz[i] - pz[i - 1]);
    for (let i = 0; i < n; i++) {   // unit vector to the left of travel, lengthened on bends so the ribbon keeps its width
      const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1); let ax = px[i] - px[i0], az = pz[i] - pz[i0], bx = px[i1] - px[i], bz = pz[i1] - pz[i]; const la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1;
      if (i === 0) { ax = bx; az = bz; } else { ax /= la; az /= la; } if (i === n - 1) { bx = ax; bz = az; } else if (i > 0) { bx /= lb; bz /= lb; } else { const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; bx = ax; bz = az; }
      let tx = ax + bx, tz = az + bz; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl; const mit = Math.min(1.8, 1 / Math.max(0.3, tx * ax + tz * az));
      LX[i] = tz * mit; LZ[i] = -tx * mit;
    }
    const st = { r, kind, flag, w: V.rW[r] / 10, n, X: Float32Array.from(px), Z: Float32Array.from(pz), Y: bridge ? Float32Array.from(py) : null, S, LX, LZ }; STRIPS.push(st);
    let i0 = 0; while (i0 < n - 1) { let i1 = i0 + 1; while (i1 < n - 1 && S[i1] - S[i0] < 110) i1++; const mi = (i0 + i1) >> 1, key = Math.floor(px[mi] / RT) * 4096 + Math.floor(pz[mi] / RT); let t = roadTiles.get(key); if (!t) roadTiles.set(key, t = { parts: [], group: null }); t.parts.push(STRIPS.length - 1, i0, i1); i0 = i1; }
  }
}
/* Every carriageway as short segments in a grid, so anything built beside one street can tell when it would land on another. */
let RSEG = null;
function buildRoadIndex() {
  RSEG = new Map();
  for (let si = 0; si < STRIPS.length; si++) { const st = STRIPS[si]; if (st.kind > 8 || (st.flag & 2)) continue; const hw = st.w / 2, pad = hw + 2.5;
    for (let i = 0; i < st.n - 1; i++) { const x0 = st.X[i], z0 = st.Z[i], x1 = st.X[i + 1], z1 = st.Z[i + 1];
      for (let cx = Math.floor((Math.min(x0, x1) - pad) / 16); cx <= Math.floor((Math.max(x0, x1) + pad) / 16); cx++) for (let cz = Math.floor((Math.min(z0, z1) - pad) / 16); cz <= Math.floor((Math.max(z0, z1) + pad) / 16); cz++) { const k = cx * 4096 + cz; let l = RSEG.get(k); if (!l) RSEG.set(k, l = []); l.push(x0, z0, x1, z1, hw, si); } } }
}
/* True when (x, z) is clear of every carriageway but strip si's own, by at least `margin`. */
function roadClear(x, z, si, margin) {
  if (!RSEG) buildRoadIndex(); const l = RSEG.get(Math.floor(x / 16) * 4096 + Math.floor(z / 16)); if (!l) return true;
  for (let q = 0; q < l.length; q += 6) { if (l[q + 5] === si) continue; const ax = l[q], az = l[q + 1], dx = l[q + 2] - ax, dz = l[q + 3] - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1), ex = x - ax - dx * t, ez = z - az - dz * t, r = l[q + 4] + margin; if (ex * ex + ez * ez < r * r) return false; }
  return true;
}
/* Move a point that stands in a carriageway out to the nearest kerb (signals and lamps are often mapped at the middle of the junction they serve). */
function roadPush(x, z, margin) {
  if (!RSEG) buildRoadIndex();
  for (let it = 0; it < 8; it++) { const l = RSEG.get(Math.floor(x / 16) * 4096 + Math.floor(z / 16)); if (!l) break; let moved = false;
    for (let q = 0; q < l.length; q += 6) { const ax = l[q], az = l[q + 1], dx = l[q + 2] - ax, dz = l[q + 3] - az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1); let ex = x - ax - dx * t, ez = z - az - dz * t, d = Math.hypot(ex, ez); const r = l[q + 4] + margin; if (d >= r) continue;
      if (d < 0.05) { const L = Math.sqrt(L2); ex = -dz / L; ez = dx / L; d = 1; } x += ex / d * (r - d + 0.05); z += ez / d * (r - d + 0.05); moved = true; break; }
    if (!moved) break; }
  return [x, z];
}
function nearJunction(x, z) {
  for (let cx = Math.floor((x - 16) / 64); cx <= Math.floor((x + 16) / 64); cx++) for (let cz = Math.floor((z - 16) / 64); cz <= Math.floor((z + 16) / 64); cz++) {
    const l = junHash.get(cx * 4096 + cz); if (!l) continue; for (let q = 0; q < l.length; q += 3) { const d = l[q + 2] * 0.5 + 3.5; if ((l[q] - x) ** 2 + (l[q + 1] - z) ** 2 < d * d) return true; }
  }
  return false;
}
const _rn = new THREE.Vector3();
function buildRoadTile(tile) {
  const B = { asphalt: new Buf(), concrete: new Buf(), dirt: new Buf(), ballast: new Buf(), paint: new Buf(false), deck: new Buf(), steel: new Buf(false, false), sign: new Buf(true, false) };
  const gy = (st, i, x, z) => st.Y ? st.Y[i] : H(x, z);
  for (let q = 0; q < tile.parts.length; q += 3) {
    const st = STRIPS[tile.parts[q]], i0 = tile.parts[q + 1], i1 = tile.parts[q + 2], kind = st.kind, far = !!(st.flag & 8), bridge = !!(st.flag & 2), unp = !!(st.flag & 4);
    const hw = st.w / 2, cat = kind === 14 ? "ballast" : kind === 15 ? null : (kind === 9 || kind === 10 || unp) ? "dirt" : (kind === 11 || kind === 13) ? "concrete" : "asphalt";
    const lift = cat === "asphalt" ? 0.04 : cat === "concrete" ? (st.flag & 16 ? 0.13 : 0.06) : cat === "ballast" ? 0.22 : 0.03, col = cat === "asphalt" ? ROADCOL[kind] : [1, 1, 1];
    if (cat) {
      const b = bridge ? B.deck : B[cat], na = cat === "dirt" ? Math.max(3, Math.ceil(st.w / 2.5) + 1) : Math.max(2, Math.ceil(st.w / 4.5) + 1), tile_u = cat === "dirt" ? 1 : cat === "concrete" ? 1 / 1.5 : 1 / 5, wv = cat === "dirt" ? Math.max(1.6, st.w) : 0;
      let prev = -1;
      for (let i = i0; i <= i1; i++) {
        const base = b.v;
        for (let k = 0; k < na; k++) {
          const t = k / (na - 1), l = (t - 0.5) * (cat === "dirt" ? wv * 1.5 : st.w), x = st.X[i] + st.LX[i] * l, z = st.Z[i] + st.LZ[i] * l, y = gy(st, i, x, z) + lift;
          if (bridge) _rn.set(0, 1, 0); else groundNormal(x, z, _rn);
          const cc = bridge && cat === "asphalt" ? 0.62 : 1;
          b.vert(x, y, z, _rn.x, _rn.y, _rn.z, cat === "dirt" ? t : l * tile_u, st.S[i] * (cat === "dirt" ? 1 / (wv * 1.5) : cat === "concrete" ? 1 / 1.5 : 1 / 5), col[0] * cc, col[1] * cc, col[2] * cc);
        }
        if (prev >= 0) for (let k = 0; k < na - 1; k++) b.quad(prev + k + 1, prev + k, base + k + 1, base + k);
        prev = base;
      }
    }
    if (!far && !bridge && kind >= 2 && kind <= 5) {   // gutter, kerb and sidewalk: every town street has the first two, the main streets and some side streets the third
      const sw = kind < 5 ? 1.85 : hash2(Math.round(st.X[0]), Math.round(st.Z[0]), 91) < 0.42 ? 1.5 : 0.3, PR = [[hw - 0.48, 0.045, 0.70], [hw + 0.04, 0.03, 0.70], [hw + 0.06, 0.16, 0.90], [hw + 0.24, 0.16, 0.95], [hw + sw, 0.16, 0.92], [hw + sw + 0.05, -0.08, 0.80]], np = PR.length;
      const si = tile.parts[q], b = B.concrete, sta = (i, t) => { const j = Math.min(i + 1, st.n - 1); return [lerp(st.X[i], st.X[j], t), lerp(st.Z[i], st.Z[j], t), lerp(st.LX[i], st.LX[j], t), lerp(st.LZ[i], st.LZ[j], t), lerp(st.S[i], st.S[j], t)]; };
      const okAt = (A, sd) => roadClear(A[0] + A[2] * (hw + 0.05) * sd, A[1] + A[3] * (hw + 0.05) * sd, si, 0.3) && roadClear(A[0] + A[2] * (hw + sw) * sd, A[1] + A[3] * (hw + sw) * sd, si, 0.15) && roadClear(A[0] + A[2] * (hw + sw * 0.5) * sd, A[1] + A[3] * (hw + sw * 0.5) * sd, si, 0.15);
      const emit = (A, sd) => { const base = b.v, top = hiAt(A[0] + A[2] * (hw + sw + 1.7) * sd, A[1] + A[3] * (hw + sw + 1.7) * sd, 0) > 0.5 ? 0.05 : 0.16;   // where a drive or forecourt meets the street the kerb is dropped
        for (const [l, dy, c] of PR) { const x = A[0] + A[2] * l * sd, z = A[1] + A[3] * l * sd; b.vert(x, H(x, z) + (dy > 0.1 ? top : dy), z, 0, 1, 0, l / 1.5, A[4] / 1.5, c, c * 0.99, c * 0.97); } return base; };
      const link = (p0, p1, sd) => { for (let k = 0; k < np - 1; k++) { if (sd > 0) b.quad(p0 + k + 1, p0 + k, p1 + k + 1, p1 + k); else b.quad(p0 + k, p0 + k + 1, p1 + k, p1 + k + 1); } };
      for (const sd of [1, -1]) { let prev = -1, okP = false;   // the kerb runs until it meets another carriageway and stops exactly there, so nothing is ever laid across a road
        for (let i = i0; i <= i1; i++) { const A = sta(i, 0), ok = okAt(A, sd);
          if (i > i0 && ok !== okP) { let lo = 0, hi = 1; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (okAt(sta(i - 1, m), sd) === okP) lo = m; else hi = m; } const base = emit(sta(i - 1, okP ? lo : hi), sd); if (okP && prev >= 0) link(prev, base, sd); prev = okP ? -1 : base; }
          if (ok) { const base = emit(A, sd); if (prev >= 0) link(prev, base, sd); prev = base; } else prev = -1; okP = ok; } }
      // street furniture met along the way: manhole covers, fire hydrants, and a stop sign with its bar where a side street meets a junction
      const disc = (x, z, r, c) => { const b = B.paint, base = b.v, y = H(x, z) + 0.06; b.vert(x, y, z, 0, 1, 0, 0, 0, c, c, c * 1.04); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; b.vert(x + Math.cos(a) * r, y, z + Math.sin(a) * r, 0, 1, 0, 0, 0, c, c, c * 1.04); } for (let k = 0; k < 10; k++) b.tri(base, base + 1 + (k + 1) % 10, base + 1 + k); };
      const post = (x, z, y0, y1, r, c) => { const b = B.paint; for (const [ax, az] of [[1, 0], [0, 1]]) for (const sg of [1, -1]) { const base = b.v, nx = az * sg, nz = -ax * sg; b.vert(x - ax * r, y0, z - az * r, nx, 0, nz, 0, 0, c[0], c[1], c[2]); b.vert(x + ax * r, y0, z + az * r, nx, 0, nz, 0, 0, c[0], c[1], c[2]); b.vert(x - ax * r, y1, z - az * r, nx, 0, nz, 0, 0, c[0], c[1], c[2]); b.vert(x + ax * r, y1, z + az * r, nx, 0, nz, 0, 0, c[0], c[1], c[2]); if (sg > 0) b.quad(base, base + 1, base + 2, base + 3); else b.quad(base + 1, base, base + 3, base + 2); } };
      for (let i = Math.max(i0, 1); i <= i1; i++) {
        if (nearJunction(st.X[i], st.Z[i])) continue; const s0 = st.S[i - 1], s1 = st.S[i];
        if (Math.floor(s0 / 64) !== Math.floor(s1 / 64)) disc(st.X[i] - st.LX[i] * hw * 0.3, st.Z[i] - st.LZ[i] * hw * 0.3, 0.36, 0.10);
        if (Math.floor((s0 + 40) / 130) !== Math.floor((s1 + 40) / 130) && roadClear(st.X[i] + st.LX[i] * (hw + 0.7), st.Z[i] + st.LZ[i] * (hw + 0.7), si, 0.6)) { const l = hw + (sw > 1 ? 0.55 : 0.75), x = st.X[i] + st.LX[i] * l, z = st.Z[i] + st.LZ[i] * l, y = H(x, z) + (sw > 1 ? 0.16 : 0); post(x, z, y, y + 0.62, 0.11, [0.85, 0.66, 0.08]); post(x, z, y + 0.38, y + 0.5, 0.2, [0.85, 0.66, 0.08]); post(x, z, y + 0.62, y + 0.7, 0.07, [0.6, 0.6, 0.6]); }
      }
      if (kind >= 4) for (const [ie, dirS] of [[i1, 1], [i0, -1]]) {   // dirS: which way traffic is heading as it reaches this end
        if (ie !== (dirS > 0 ? st.X.length - 1 : 0) || !nearJunction(st.X[ie], st.Z[ie])) continue; let k = ie; while (k !== (dirS > 0 ? i0 : i1) && nearJunction(st.X[k], st.Z[k])) k -= dirS; if (nearJunction(st.X[k], st.Z[k])) continue;
        const tx = -st.LZ[k] * dirS, tz = st.LX[k] * dirS, rx = -st.LX[k] * dirS, rz = -st.LZ[k] * dirS;   // travel direction, and the driver's right
        { const b = B.paint, base = b.v, y = H(st.X[k], st.Z[k]) + 0.062; for (const [a, c] of [[0.1, 0], [hw - 0.5, 0], [0.1, 0.42], [hw - 0.5, 0.42]]) { const x = st.X[k] + rx * a + tx * c, z = st.Z[k] + rz * a + tz * c; b.vert(x, y, z, 0, 1, 0, 0, 0, 0.9, 0.9, 0.88); } b.quad(base, base + 1, base + 2, base + 3); b.quad(base + 1, base, base + 3, base + 2); }
        const px = st.X[k] + rx * (hw + 0.7) - tx * 0.6, pz = st.Z[k] + rz * (hw + 0.7) - tz * 0.6, py = H(px, pz); if (!roadClear(px, pz, si, 0.4)) continue; post(px, pz, py, py + 2.25, 0.035, [0.5, 0.5, 0.5]);
        const b = B.sign, base = b.v, cy = py + 2.25; b.vert(px - rx * 0.38 - tx * 0.04, cy - 0.38, pz - rz * 0.38 - tz * 0.04, -tx, 0, -tz, 1, 0); b.vert(px + rx * 0.38 - tx * 0.04, cy - 0.38, pz + rz * 0.38 - tz * 0.04, -tx, 0, -tz, 0, 0); b.vert(px - rx * 0.38 - tx * 0.04, cy + 0.38, pz - rz * 0.38 - tz * 0.04, -tx, 0, -tz, 1, 1); b.vert(px + rx * 0.38 - tx * 0.04, cy + 0.38, pz + rz * 0.38 - tz * 0.04, -tx, 0, -tz, 0, 1); b.quad(base + 1, base, base + 3, base + 2);
      }
    }
    // paint
    const plan = far || bridge && kind > 4 ? null : paintPlan(kind, !!(st.flag & 1), st.w);
    if (plan) for (const [off, yel, dash] of plan) {
      const c = yel ? [0.80, 0.56, 0.06] : [0.86, 0.86, 0.84], pw = 0.065, P = B.paint;
      const put = (i, t) => {   // a pair of paint vertices at fraction t between samples i and i + 1
        const j = Math.min(st.n - 1, i + 1), lx = lerp(st.LX[i], st.LX[j], t), lz = lerp(st.LZ[i], st.LZ[j], t), x = lerp(st.X[i], st.X[j], t) + lx * off, z = lerp(st.Z[i], st.Z[j], t) + lz * off, y = (st.Y ? lerp(st.Y[i], st.Y[j], t) : H(x, z)) + 0.055;
        P.vert(x + lx * pw, y, z + lz * pw, 0, 1, 0, 0, 0, c[0], c[1], c[2]); P.vert(x - lx * pw, y, z - lz * pw, 0, 1, 0, 0, 0, c[0], c[1], c[2]); return P.v - 2;
      };
      if (!dash) { let prev = -1;
        for (let i = i0; i <= i1; i++) { if (kind >= 2 && nearJunction(st.X[i], st.Z[i])) { prev = -1; continue; } const base = put(i, 0); if (prev >= 0) P.quad(prev, prev + 1, base, base + 1); prev = base; }
      } else {
        const per = dash === 1 ? 12 : 4.5, on = dash === 1 ? 3 : 1.5; let i = i0;
        for (let s0 = Math.ceil(st.S[i0] / per) * per; s0 < st.S[i1]; s0 += per) {
          while (i < i1 - 1 && st.S[i + 1] <= s0) i++; if (kind >= 2 && nearJunction(st.X[i], st.Z[i])) continue;
          let prev = put(i, (s0 - st.S[i]) / Math.max(1e-6, st.S[i + 1] - st.S[i])), j = i, s1 = Math.min(s0 + on, st.S[i1]);
          while (j < i1 - 1 && st.S[j + 1] < s1) { j++; const base = put(j, 0); P.quad(prev, prev + 1, base, base + 1); prev = base; }
          const base = put(j, (s1 - st.S[j]) / Math.max(1e-6, st.S[j + 1] - st.S[j])); P.quad(prev, prev + 1, base, base + 1);
        }
      }
    }
    if (kind === 15 && !far) {   // zebra crossing: bars across the walking line
      for (let i = i0; i < i1; i++) {
        const dx = st.X[i + 1] - st.X[i], dz = st.Z[i + 1] - st.Z[i], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, n = Math.floor(L / 1.2);
        for (let k = 0; k < n; k++) { const s = (k + 0.25) * 1.2, cx = st.X[i] + ux * s, cz = st.Z[i] + uz * s, base = B.paint.v;
          for (const [a, b] of [[0, 1.5], [0.6, 1.5], [0, -1.5], [0.6, -1.5]]) { const x = cx + ux * a - uz * b, z = cz + uz * a + ux * b; B.paint.vert(x, H(x, z) + 0.06, z, 0, 1, 0, 0, 0, 0.86, 0.86, 0.84); }
          B.paint.quad(base, base + 1, base + 2, base + 3); B.paint.i.push(base, base + 2, base + 1, base + 1, base + 2, base + 3); }
      }
    }
    if (kind === 14) {   // running rails and the third rail
      for (const [off, hgt, wd] of [[0.84, 0.17, 0.035], [-0.84, 0.17, 0.035], [1.42, 0.2, 0.09]]) { let prev = -1;
        for (let i = i0; i <= i1; i++) { const x = st.X[i] + st.LX[i] * off, z = st.Z[i] + st.LZ[i] * off, y = gy(st, i, x, z) + lift, base = B.steel.v;
          B.steel.vert(x + st.LX[i] * wd, y, z + st.LZ[i] * wd, st.LX[i], 0.3, st.LZ[i]); B.steel.vert(x + st.LX[i] * wd, y + hgt, z + st.LZ[i] * wd, 0, 1, 0); B.steel.vert(x - st.LX[i] * wd, y + hgt, z - st.LZ[i] * wd, 0, 1, 0); B.steel.vert(x - st.LX[i] * wd, y, z - st.LZ[i] * wd, -st.LX[i], 0.3, -st.LZ[i]);
          if (prev >= 0) for (let k = 0; k < 3; k++) B.steel.quad(prev + k, prev + k + 1, base + k, base + k + 1); prev = base; } }
    }
    if (bridge && st.Y && kind !== 15) {   // the structure: slab, parapets, piers
      const b = B.deck, th = kind === 14 ? 1.6 : kind >= 9 ? 0.5 : 1.3, ph = kind === 14 ? 0.5 : kind >= 9 ? 1.1 : 0.85, e = hw + (kind === 14 ? 0.6 : 0.35); let prev = -1;
      for (let i = i0; i <= i1; i++) {
        const base = b.v, y = st.Y[i], lx = st.LX[i], lz = st.LZ[i], x = st.X[i], z = st.Z[i], v = st.S[i] / 1.5;
        const ring = [[e - 0.3, ph, 0, 1], [e, ph, 0, 1], [e, ph, 1, 0], [e, -th, 1, 0], [e, -th, 0, -1], [-e, -th, 0, -1], [-e, -th, -1, 0], [-e, ph, -1, 0], [-e, ph, 0, 1], [-e + 0.3, ph, 0, 1], [-e + 0.3, 0.02, 1, 0.2], [e - 0.3, 0.02, -1, 0.2]];
        for (const [l, dy, nl, ny] of ring) b.vert(x + lx * l, y + dy, z + lz * l, lx * nl, ny, lz * nl, l / 1.5, v + dy, 0.78, 0.77, 0.74);
        if (prev >= 0) for (const [k0, k1] of [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [9, 10], [11, 0]]) b.quad(prev + k1, prev + k0, base + k1, base + k0);
        prev = base;
      }
      for (let i = i0; i < i1; i++) {   // a pier wherever a 28 m mark falls on this span and there is headroom
        if (Math.floor(st.S[i] / 28) === Math.floor(st.S[i + 1] / 28)) continue; const x = st.X[i + 1], z = st.Z[i + 1], yb = H(x, z), yt = st.Y[i + 1] - th; if (yt - yb < 2.5 || hiAt(x, z, 0) > 0.3) continue;
        const r = kind === 14 ? 0.9 : Math.min(1.1, hw * 0.35), base = b.v;
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, cx = Math.cos(a), cz = Math.sin(a); b.vert(x + cx * r, yb - 1, z + cz * r, cx, 0, cz, k / 4, 0, 0.74, 0.73, 0.7); b.vert(x + cx * r, yt, z + cz * r, cx, 0, cz, k / 4, (yt - yb) / 1.5, 0.74, 0.73, 0.7); }
        for (let k = 0; k < 8; k++) { const a = base + k * 2, c = base + ((k + 1) % 8) * 2; b.quad(a, a + 1, c, c + 1); }
      }
    }
  }
  const g = new THREE.Group(); g.matrixAutoUpdate = false;
  for (const k in B) { const geo = B[k].geo(); if (!geo) continue; const m = new THREE.Mesh(geo, RM[k]); m.matrixAutoUpdate = false; m.receiveShadow = true; m.castShadow = k === "deck"; m.renderOrder = k === "paint" ? 3 : k === "dirt" ? 2 : 1; g.add(m); }
  return g;
}
let roadCheck = 0;
function updateRoads(dt) {
  roadCheck -= dt; if (roadCheck > 0) return; roadCheck = 0.12;
  const R = 560, cx = camera.position.x, cz = camera.position.z; let built = 0;
  for (let tx = Math.floor((cx - R) / RT); tx <= Math.floor((cx + R) / RT); tx++) for (let tz = Math.floor((cz - R) / RT); tz <= Math.floor((cz + R) / RT); tz++) {
    const t = roadTiles.get(tx * 4096 + tz); if (!t) continue; const d = Math.hypot((tx + 0.5) * RT - cx, (tz + 0.5) * RT - cz);
    if (d < R && !t.group && built < (QS.has("test") ? 99 : 2)) { t.group = buildRoadTile(t); t.tx = tx; t.tz = tz; scene.add(t.group); built++; }
  }
  for (const t of roadTiles.values()) if (t.group && Math.hypot((t.tx + 0.5) * RT - cx, (t.tz + 0.5) * RT - cz) > R + 260) { scene.remove(t.group); t.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); t.group = null; }
}
/* ---------- sports grounds: hard courts and the running track, painted on the ground ---------- */
function buildSports() {
  const b = new Buf(false);
  for (let s = 0; s < V.sKind.length; s++) {
    const k = V.sKind[s]; if (k === 1 || k === 2) continue; const a = V.sStart[s], n = V.sStart[s + 1] - a, pts = [];
    for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(V.sP[(a + i) * 2], V.sP[(a + i) * 2 + 1]));
    const tris = THREE.ShapeUtils.triangulateShape(pts, []), base = b.v, c = k === 3 ? [0.36, 0.12, 0.085] : [0.10, 0.27, 0.20];
    for (const p of pts) b.vert(p.x, H(p.x, p.y) + 0.05, p.y, 0, 1, 0, 0, 0, c[0], c[1], c[2]);
    for (const t of tris) b.tri(base + t[0], base + t[2], base + t[1]), b.tri(base + t[0], base + t[1], base + t[2]);
  }
  const g = b.geo(); if (!g) return; const m = new THREE.Mesh(g, RM.paint); m.receiveShadow = true; m.matrixAutoUpdate = false; m.renderOrder = 2; scene.add(m);
}
