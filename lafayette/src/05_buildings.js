/* ---------- buildings: every mapped footprint extruded to its surveyed height, with a roof that suits what it is ---------- */
const BT = 256, bldTiles = new Map(); let wallMat, roofMat, ringMesh;
const TILE_W = 12;   // wall atlas columns: 0 window, 1 lit window, 2 plain wall, 3 door, 4 garage door, 5 shopfront, 6 office glazing, 7 lit office glazing, 8 picture window, 9 garden door, 10 small window, 11 shop door
function buildBuildingMaterials() {
  const S = 256, W = S * TILE_W;
  const draw = (emit) => (g) => {
    g.fillStyle = emit === "rm" ? "rgb(0,226,0)" : emit ? "#000" : "#d9d9d9"; g.fillRect(0, 0, W, S);
    const r = rng(21);
    if (!emit) { for (let i = 0; i < 9000; i++) { const v = 205 + Math.floor(r() * 30); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * W, r() * S, 2, 2); }
      g.strokeStyle = "rgba(0,0,0,0.07)"; g.lineWidth = 1; for (let y = 10; y < S; y += 13) { g.beginPath(); g.moveTo(0, y); g.lineTo(S * 5, y); g.moveTo(S * 8, y); g.lineTo(S * 11, y); g.stroke(); } }
    const glass = (x, y, w, h, lit, bars, tall) => {
      if (emit === "rm") { g.fillStyle = "rgb(0,26,0)"; g.fillRect(x, y, w, h); return; }   // roughness: glass is smooth, so windows mirror the sky
      if (emit) { if (lit) { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, "#ffd9a0"); gr.addColorStop(1, "#e8a860"); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x, y, w, h * 0.18); } return; }
      g.fillStyle = "#f4f4f2"; g.fillRect(x - 5, y - 5, w + 10, h + 10);
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, lit ? "#3a3f48" : "#2a323c"); gr.addColorStop(0.5, "#18202a"); gr.addColorStop(1, "#303a46"); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(255,255,255,0.10)"; g.beginPath(); g.moveTo(x, y + h * 0.7); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.75, y); g.lineTo(x, y + h); g.fill();
      g.fillStyle = "#f4f4f2"; for (let k = 1; k < bars; k++) g.fillRect(x + w * k / bars - 1.5, y, 3, h); g.fillRect(x, y + h * 0.5 - 1.5, w, bars && !tall ? 3 : 0);
    };
    // v runs up the wall: canvas y = 0 is the top of the storey
    glass(0 * S + 72, 62, 112, 96, false, 2); glass(1 * S + 72, 62, 112, 96, true, 2);
    if (!emit) { g.fillStyle = "#f4f4f2"; g.fillRect(3 * S + 86, 36, 84, 220); g.fillStyle = "#5a4636"; g.fillRect(3 * S + 92, 42, 72, 214); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(3 * S + 100, 54, 56, 80); g.fillRect(3 * S + 100, 146, 56, 96); g.fillStyle = "#c9b27a"; g.fillRect(3 * S + 152, 150, 6, 12);
      g.fillStyle = "#f4f4f2"; g.fillRect(4 * S + 6, 58, 244, 198); g.fillStyle = "#e6e4de"; g.fillRect(4 * S + 12, 64, 232, 192); g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 2; for (let y = 64; y < 256; y += 38) { g.beginPath(); g.moveTo(4 * S + 12, y); g.lineTo(4 * S + 244, y); g.stroke(); } }
    glass(5 * S + 8, 40, 240, 196, false, 3); glass(6 * S + 6, 60, 244, 118, false, 4); glass(7 * S + 6, 60, 244, 118, true, 4);
    glass(8 * S + 30, 66, 196, 104, false, 3); glass(9 * S + 44, 50, 168, 200, false, 2, true); glass(10 * S + 92, 58, 72, 52, false, 0);
    glass(11 * S + 8, 40, 50, 196, false, 0); glass(11 * S + 72, 34, 112, 216, false, 2, true); glass(11 * S + 198, 40, 50, 196, false, 0);   // a shop door between side lights
    if (emit === true) { g.fillStyle = "#3a3020"; g.fillRect(5 * S + 8, 40, 240, 196); g.fillRect(11 * S + 8, 40, 240, 196); }
  };
  const mk = (emit) => { const c = document.createElement("canvas"); c.width = W; c.height = S; draw(emit)(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.colorSpace = emit === "rm" ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANISO; return t; };
  wallMat = new THREE.MeshStandardMaterial({ map: mk(false), emissiveMap: mk(true), emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 1, roughnessMap: mk("rm"), envMapIntensity: 2.2 });
  const shingle = canvasTex(256, (g, s) => { speckle(g, s, 150, 40, 26000, 31, 2.2); g.strokeStyle = "rgba(0,0,0,0.33)"; g.lineWidth = 2; for (let y = 0; y < s; y += 16) { g.beginPath(); g.moveTo(0, y + 1); g.lineTo(s, y + 1); g.stroke(); } g.strokeStyle = "rgba(0,0,0,0.16)"; const r = rng(2); for (let y = 0; y < s; y += 16) for (let x = (y / 16 % 2) * 12; x < s; x += 24 + r() * 6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } });
  roofMat = new THREE.MeshStandardMaterial({ map: shingle, vertexColors: true, roughness: 0.9 });
}
const WALLC = [[0.80, 0.76, 0.68], [0.74, 0.70, 0.62], [0.82, 0.81, 0.78], [0.62, 0.62, 0.60], [0.70, 0.66, 0.56], [0.56, 0.60, 0.58], [0.84, 0.80, 0.70], [0.50, 0.44, 0.38], [0.66, 0.70, 0.74], [0.78, 0.72, 0.60]];
const ROOFC = [[0.20, 0.19, 0.18], [0.26, 0.22, 0.19], [0.30, 0.29, 0.28], [0.34, 0.28, 0.22], [0.24, 0.24, 0.25], [0.42, 0.24, 0.17], [0.36, 0.34, 0.31]];
const FLATC = [[0.62, 0.61, 0.59], [0.74, 0.73, 0.71], [0.48, 0.47, 0.46], [0.56, 0.55, 0.52]];
/* Move every corner of a ring inward by d along its bisector. Returns null when the ring would fold over itself. */
function insetRing(P, d) {
  const n = P.length / 2, out = new Float32Array(n * 2); let area = 0, area0 = 0;
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n, b = (i + 1) % n; let e1x = P[i * 2] - P[a * 2], e1z = P[i * 2 + 1] - P[a * 2 + 1], e2x = P[b * 2] - P[i * 2], e2z = P[b * 2 + 1] - P[i * 2 + 1];
    const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1; e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
    const n1x = -e1z, n1z = e1x, n2x = -e2z, n2z = e2x, k = Math.min(2.2, 1 / Math.max(0.15, 1 + n1x * n2x + n1z * n2z));
    out[i * 2] = P[i * 2] + (n1x + n2x) * k * d; out[i * 2 + 1] = P[i * 2 + 1] + (n1z + n2z) * k * d;
  }
  if (d <= 0) return out;
  for (let i = 0; i < n; i++) { const b = (i + 1) % n; area += out[i * 2] * out[b * 2 + 1] - out[b * 2] * out[i * 2 + 1]; area0 += P[i * 2] * P[b * 2 + 1] - P[b * 2] * P[i * 2 + 1];
    if ((out[b * 2] - out[i * 2]) * (P[b * 2] - P[i * 2]) + (out[b * 2 + 1] - out[i * 2 + 1]) * (P[b * 2 + 1] - P[i * 2 + 1]) < 0) return null; }
  return area > 0.08 * area0 ? out : null;
}
const _fa = new THREE.Vector3(), _fb = new THREE.Vector3(), _fn = new THREE.Vector3();
function face(buf, pts, uvs, col, up) {   // one flat polygon (3 or 4 corners); wound so that it faces `up` (a rough outward direction)
  _fa.set(pts[3] - pts[0], pts[4] - pts[1], pts[5] - pts[2]); _fb.set(pts[6] - pts[0], pts[7] - pts[1], pts[8] - pts[2]); _fn.crossVectors(_fa, _fb);
  if (_fn.lengthSq() < 1e-10) _fn.copy(up); const flip = _fn.dot(up) < 0; if (flip) _fn.negate(); _fn.normalize(); const base = buf.v, n = pts.length / 3;
  for (let i = 0; i < n; i++) buf.vert(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], _fn.x, _fn.y, _fn.z, uvs[i * 2], uvs[i * 2 + 1], col[0], col[1], col[2]);
  if (n === 3) { if (flip) buf.tri(base, base + 2, base + 1); else buf.tri(base, base + 1, base + 2); }
  else if (flip) { buf.tri(base, base + 2, base + 1); buf.tri(base + 1, base + 2, base + 3); } else { buf.tri(base, base + 1, base + 2); buf.tri(base + 2, base + 1, base + 3); }
}
const _up = new THREE.Vector3(0, 1, 0), _dn = new THREE.Vector3(0, -1, 0), _out = new THREE.Vector3();
const COMC = [[0.80, 0.74, 0.62], [0.84, 0.82, 0.76], [0.44, 0.22, 0.16], [0.70, 0.60, 0.46], [0.50, 0.55, 0.46], [0.62, 0.62, 0.60], [0.66, 0.45, 0.31], [0.82, 0.74, 0.52], [0.42, 0.49, 0.56], [0.30, 0.31, 0.33], [0.74, 0.70, 0.62], [0.56, 0.30, 0.22]];
const LMCOL = { saloon: [0.47, 0.33, 0.22], theatre: [0.86, 0.82, 0.70] };
/* Buildings whose use is known from their name get the features that kind of place has. */
function landmarkOf(b, area) {
  const names = SIGNS.get(b); if (!names) return null; const t = names.join(" | ").toLowerCase();
  if (/roundup/.test(t)) return "saloon"; if (/park theater/.test(t)) return "theatre";
  if (/chevron|shell|valero|arco|\b76\b|gas station|gasoline/.test(t) && area < 520) return "fuel";
  if (/safeway|whole foods|trader joe|diablo foods|lunardi|grocery outlet/.test(t) && area > 800) return "market";
  return null;
}
const AWN = [[0.34, 0.07, 0.07], [0.07, 0.20, 0.13], [0.09, 0.13, 0.28], [0.52, 0.45, 0.33], [0.16, 0.16, 0.17], [0.55, 0.30, 0.10]];
const PU0 = 2.3 / TILE_W, PU1 = 2.6 / TILE_W, PUV = [PU0, 0, PU1, 0, PU0, 0.2, PU1, 0.2];   // a featureless strip of the plain-wall tile, for trim and small parts
const TRIM = [[0.86, 0.85, 0.82], [0.86, 0.85, 0.82], [0.80, 0.77, 0.70], [0.23, 0.18, 0.14], [0.30, 0.30, 0.31]];
/* An upright box: centre, the direction its width runs in, half width, half depth, bottom and top. */
function addBox(buf, cx, cz, ux, uz, hw, hd, y0, y1, col, topCol) {
  const vx = -uz, vz = ux, c = [[cx - ux * hw - vx * hd, cz - uz * hw - vz * hd], [cx + ux * hw - vx * hd, cz + uz * hw - vz * hd], [cx + ux * hw + vx * hd, cz + uz * hw + vz * hd], [cx - ux * hw + vx * hd, cz - uz * hw + vz * hd]];
  for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; face(buf, [p[0], y0, p[1], q[0], y0, q[1], p[0], y1, p[1], q[0], y1, q[1]], PUV, col, _out.set(q[1] - p[1], 0, p[0] - q[0])); }
  if (topCol) face(buf, [c[0][0], y1, c[0][1], c[1][0], y1, c[1][1], c[3][0], y1, c[3][1], c[2][0], y1, c[2][1]], PUV, topCol, _up);
}
/* A footprint as a ring with its inside on the left of every side. */
function bldRing(b) {
  const a = V.bStart[b], n = V.bStart[b + 1] - a; let P = new Float32Array(n * 2), area = 0;
  for (let i = 0; i < n; i++) { P[i * 2] = V.bP[(a + i) * 2]; P[i * 2 + 1] = V.bP[(a + i) * 2 + 1]; }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += P[i * 2] * P[j * 2 + 1] - P[j * 2] * P[i * 2 + 1]; }
  if (area < 0) { const Q = new Float32Array(n * 2); for (let i = 0; i < n; i++) { Q[i * 2] = P[(n - 1 - i) * 2]; Q[i * 2 + 1] = P[(n - 1 - i) * 2 + 1]; } P = Q; }
  return P;
}
/* How much each wall looks onto a street, drive or car park; returns the wall that does so most: the front. */
function wallFacing(P, n, fac) {
  let longest = 0, li = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = P[j * 2] - P[i * 2], dz = P[j * 2 + 1] - P[i * 2 + 1], L = Math.hypot(dx, dz) || 1, nx = dz / L, nz = -dx / L, mx = P[i * 2] + dx / 2, mz = P[i * 2 + 1] + dz / 2;
    fac[i] = Math.max(hiAt(mx + nx * 5, mz + nz * 5, 0), hiAt(mx + nx * 11, mz + nz * 11, 0)) - hiAt(mx + nx * 3, mz + nz * 3, 2); const sc = L * (0.25 + Math.max(0, fac[i])); if (sc > longest) { longest = sc; li = i; } }
  return li;
}
const garageWidth = (kind, L) => kind === 0 ? (L >= 10.5 ? 5 : L >= 7 ? 3 : 0) : kind === 1 && L > 2.8 ? Math.min(L, L > 6 ? 5 : 2.8) : 0;
/* Before the ground is drawn: settle which wall of every house is its front, and pave a drive from each garage door out to the street. */
let BFRONT = null;
function planFronts() {
  const nb = V.bKind.length, jobs = []; BFRONT = new Int16Array(nb).fill(-1);
  for (let b = 0; b < nb; b++) {
    const kind = V.bKind[b], n = V.bStart[b + 1] - V.bStart[b]; if (n < 3 || (kind !== 0 && kind !== 1 && kind !== 2 && kind !== 3 && kind !== 5)) continue;
    const P = bldRing(b), fac = new Float32Array(n), li = wallFacing(P, n, fac);
    if (kind === 2) {   // shops: the ground between a shopfront and the street or car park it faces is paved, not lawn
      for (let i = 0; i < n; i++) { if (fac[i] <= 0.3) continue; const j = (i + 1) % n, dx = P[j * 2] - P[i * 2], dz = P[j * 2 + 1] - P[i * 2 + 1], L = Math.hypot(dx, dz); if (L < 4) continue; const nx = dz / L, nz = -dx / L;
        for (let u = 0.4; u < L; u += 0.7) { const x = P[i * 2] + dx * u / L, z = P[i * 2 + 1] + dz * u / L; for (let d = 1; d <= 15; d += 1) { if (hiAt(x + nx * d, z + nz * d, 2) > 0.5) break; if (hiAt(x + nx * d, z + nz * d, 0) > 0.5) { jobs.push([x, z, nx, nz, 0.36, d + 1, 1]); break; } } } }
      continue;
    }
    const j = (li + 1) % n, dx = P[j * 2] - P[li * 2], dz = P[j * 2 + 1] - P[li * 2 + 1], L = Math.hypot(dx, dz) || 1; BFRONT[b] = li;
    const gw = garageWidth(kind, L); if (!gw || (kind === 1 && L < 4.5)) continue;
    const s = kind === 0 && hash2(b, 8, 29) < 0.5 ? L - gw / 2 : gw / 2, x = P[li * 2] + dx * s / L, z = P[li * 2 + 1] + dz * s / L, nx = dz / L, nz = -dx / L; let len = kind === 0 ? 6 : 0;
    for (let d = 1.5; d <= 22; d += 1) { if (hiAt(x + nx * d, z + nz * d, 2) > 0.5) { len = Math.min(len, d - 1.5); break; } if (hiAt(x + nx * d, z + nz * d, 0) > 0.5) { len = d + 1.5; break; } }
    if (len > 1) jobs.push([x, z, nx, nz, gw / 2 - 0.25, len, hash2(b, 8, 31) < 0.6 ? 1 : 0]);   // most drives are concrete, the rest tarmac
  }
  for (const [x, z, nx, nz, hw, len, conc] of jobs) for (let d = 0.3; d <= len; d += 0.7) for (let u = -hw; u <= hw; u += 0.7) {
    const px = x + nx * d - nz * u, pz = z + nz * d + nx * u, i = Math.floor((px - X0) / HICELL), jj = Math.floor((pz - Z0) / HICELL); if (i < 0 || jj < 0 || i >= HIW || jj >= HIH) continue;
    const k = (jj * HIW + i) * 4; if (HI[k] < 150) { HI[k] = 235; if (conc) HI[k + 3] = 40; } HI[k + 1] = 0;   // alpha marks concrete rather than tarmac
  }
}
function addBuilding(b, W, Rf) {
  const a = V.bStart[b], n = V.bStart[b + 1] - a, kind = V.bKind[b], h = V.bH[b] / 10; if (n < 3) return;
  let P = new Float32Array(n * 2), area = 0, per = 0; for (let i = 0; i < n; i++) { P[i * 2] = V.bP[(a + i) * 2]; P[i * 2 + 1] = V.bP[(a + i) * 2 + 1]; }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += P[i * 2] * P[j * 2 + 1] - P[j * 2] * P[i * 2 + 1]; per += Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]); }
  if (area < 0) { const Q = new Float32Array(n * 2); for (let i = 0; i < n; i++) { Q[i * 2] = P[(n - 1 - i) * 2]; Q[i * 2 + 1] = P[(n - 1 - i) * 2 + 1]; } P = Q; area = -area; } area /= 2;
  let gmin = 1e9, gmax = -1e9; for (let i = 0; i < n; i++) { const g = H(P[i * 2], P[i * 2 + 1]); if (g < gmin) gmin = g; if (g > gmax) gmax = g; }
  let floorY = Math.max(gmin + 0.15, gmax - 0.9); const seed = Math.floor(hash2(b, 7, 3) * 1e6), rnd = rng(seed), elong = per * per / Math.max(area, 1), pick = hash2(b, 3, 11), lm = landmarkOf(b, area);
  const fac = new Float32Array(n); let li = wallFacing(P, n, fac), fi = -1, fbest = 0; if (BFRONT && BFRONT[b] >= 0 && BFRONT[b] < n) li = BFRONT[b];   // the front door, garage and shop windows go on the wall that looks onto the street
  if (kind === 2) for (let i = 0; i < n; i++) { const j = (i + 1) % n, L = Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]); if (fac[i] > 0.3 && L > fbest) { fbest = L; fi = i; } }
  { const i = kind === 2 ? fi : kind === 0 || kind === 1 || kind === 3 || kind === 5 ? li : -1;   // the floor is set where the front meets the ground, and the back is cut into the slope
    if (i >= 0) { const j = (i + 1) % n; let g = H((P[i * 2] + P[j * 2]) / 2, (P[i * 2 + 1] + P[j * 2 + 1]) / 2);
      if (kind === 2) for (let k = 0; k < n; k++) { const l = (k + 1) % n; if (fac[k] > 0.3 && Math.hypot(P[l * 2] - P[k * 2], P[l * 2 + 1] - P[k * 2 + 1]) > 6) g = Math.min(g, H((P[k * 2] + P[l * 2]) / 2, (P[k * 2 + 1] + P[l * 2 + 1]) / 2)); }   // every shopfront must be reachable from its pavement
      floorY = clamp(g + 0.12, Math.max(gmin + 0.15, gmax - (kind === 2 ? 4.5 : 1.6)), gmax + 0.1); } }
  // which roofs slope: houses, garages, churches, most small shops and flats, and the long classroom wings of schools
  let pitched = kind === 0 || kind === 1 || kind === 5 || (kind === 2 && area < 700 && pick < 0.6 && !lm) || (kind === 3 && area < 1100 && pick < 0.7) || (kind === 4 && area < 1800 && elong > 19 && pick < 0.75);
  let sk = null, R = null, m = 0, gab = null, E = null; const ov = kind === 1 ? 0.3 : kind === 4 ? 0.8 : 0.5;
  if (pitched) {
    R = tidyRing(P, n); m = R.length / 2; const sr = hash2(b, 2, 19), style = kind === 5 || kind === 4 ? 1 : kind === 3 ? 0 : sr < 0.5 ? 1 : sr < 0.8 ? 0 : 2;
    gab = gableSides(R, m, style, b); const dist = new Float32Array(m); for (let i = 0; i < m; i++) dist[i] = gab[i] ? 0.14 : ov;
    E = offsetRing(R, m, dist); sk = roofSkeleton(E, m, gab, kind === 5 ? 9 : 7);
    let cov = 0, ea = 0; const F = sk.faces;   // the planes must cover the plan exactly once; a footprint too tangled for that gets a flat roof instead
    for (let i = 0; i < m; i++) { const j = (i + 1) % m; ea += E[i * 2] * E[j * 2 + 1] - E[j * 2] * E[i * 2 + 1]; }
    for (let f = 0; f < F.length; f += 11) if (sk.EW[F[f]]) cov += Math.abs(F[f + 1] * F[f + 4] - F[f + 3] * F[f + 2] + F[f + 3] * F[f + 9] - F[f + 8] * F[f + 4] + F[f + 8] * F[f + 7] - F[f + 6] * F[f + 9] + F[f + 6] * F[f + 2] - F[f + 1] * F[f + 7]);
    for (const c of sk.caps) { let s = 0; const k = c.X.length; for (let i = 0; i < k; i++) { const j = (i + 1) % k; s += c.X[i] * c.Z[j] - c.X[j] * c.Z[i]; } cov += Math.abs(s); }
    if (m < 3 || !(Math.abs(cov - ea) < 0.04 * ea + 1)) { sk = null; pitched = false; }
  }
  const flat = !pitched, minWall = kind === 1 ? 2.3 : 2.6; let pitch = kind === 5 ? 0.7 : kind === 4 ? 0.2 : kind === 3 ? 0.3 : 0.34 + rnd() * 0.16, rise = 0;
  if (sk) { const runIn = Math.max(0.5, sk.tEnd - ov); rise = runIn * pitch; if (h - rise < minWall) { pitch = clamp((h - minWall) / runIn, 0.22, pitch); rise = runIn * pitch; } }   // the mapped height is to the ridge
  const wallH = Math.max(minWall, h - rise), topY = floorY + wallH, ey = topY - ov * pitch; _bl.b = b; _bl.P = P; _bl.n = n; _bl.floorY = floorY; _bl.topY = topY;
  const wc = lm && LMCOL[lm] ? LMCOL[lm] : kind === 2 ? COMC[Math.floor(rnd() * COMC.length)] : kind === 7 ? WALLC[Math.floor(rnd() * 4) + 2] : kind === 4 ? [0.78, 0.72, 0.62] : WALLC[Math.floor(rnd() * WALLC.length)];
  const rc0 = roofCol(b, flat ? FLATC[Math.floor(rnd() * FLATC.length)] : ROOFC[Math.floor(rnd() * ROOFC.length)]), rc = flat ? rc0 : [rc0[0] * 0.74, rc0[1] * 0.74, rc0[2] * 0.74], fc = [wc[0] * 0.55, wc[1] * 0.55, wc[2] * 0.56], tc = TRIM[Math.floor(hash2(b, 4, 23) * TRIM.length)];
  if (kind === 6) {   // an open roof on posts
    const tris = THREE.ShapeUtils.triangulateShape(Array.from({ length: n }, (_, i) => new THREE.Vector2(P[i * 2], P[i * 2 + 1])), []), y = floorY + Math.min(h, 3.2);
    for (const t of tris) for (const yy of [y, y - 0.18]) face(Rf, [P[t[0] * 2], yy, P[t[0] * 2 + 1], P[t[1] * 2], yy, P[t[1] * 2 + 1], P[t[2] * 2], yy, P[t[2] * 2 + 1]], [0, 0, 1, 0, 0, 1], rc, yy === y ? _up : _out.set(0, -1, 0));
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 4))) { const x = P[i * 2], z = P[i * 2 + 1]; for (const [dx, dz] of [[0.08, 0], [0, 0.08]]) face(W, [x - dx, gmin - 0.3, z - dz, x + dx, gmin - 0.3, z + dz, x - dx, y, z - dz, x + dx, y, z + dz], PUV, [0.5, 0.5, 0.5], _out.set(dz, 0, dx)); }
    return;
  }
  // walls, one bay at a time so each bay shows a whole window, door or plain panel
  const storeys = Math.max(1, Math.round(wallH / 3.1)), vTop = storeys, sH = wallH / storeys, home = kind === 0 || kind === 3 || kind === 5; let bi = -1, porch = null;
  if (home) { const j = (li + 1) % n, fx = P[j * 2] - P[li * 2], fz = P[j * 2 + 1] - P[li * 2 + 1]; let best = 0;   // the back wall, for the garden door: long, and facing away from the front
    for (let i = 0; i < n; i++) { const k = (i + 1) % n, dx = P[k * 2] - P[i * 2], dz = P[k * 2 + 1] - P[i * 2 + 1], s = -(dx * fx + dz * fz) / (Math.hypot(fx, fz) || 1); if (s > best && s > 3.5) { best = s; bi = i; } } }
  const cano = lm === "saloon" ? 0.8 : lm === "theatre" || lm === "fuel" ? 1 : kind === 2 ? hash2(b, 5, 31) : 1, ac = AWN[Math.floor(hash2(b, 5, 13) * AWN.length)], upStrip = hash2(b, 5, 33) < 0.5, pil = kind === 2 && hash2(b, 5, 35) < 0.55, dk = [wc[0] * 0.72, wc[1] * 0.72, wc[2] * 0.72];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = P[i * 2], az = P[i * 2 + 1], dx = P[j * 2] - ax, dz = P[j * 2 + 1] - az, L = Math.hypot(dx, dz); if (L < 0.05) continue;
    _out.set(dz / L, 0, -dx / L); const ox = _out.x, oz = _out.z;
    face(W, [ax, gmin - 0.5, az, ax + dx, gmin - 0.5, az + dz, ax, floorY, az, ax + dx, floorY, az + dz], PUV, fc, _out);
    const bays = [];   // [length, tile]
    if (L < 2.2 || kind === 7 || kind === 8) bays.push([L, 2]);
    else if (home && i === li) {   // the front of a house: garage at one end, the front door beside it, windows along the rest
      const gw = garageWidth(kind, L), dw = Math.min(2, L - gw), rest = L - gw - dw, nw = rest > 1.6 ? Math.max(1, Math.round(rest / 3.4)) : 0, seq = [];
      if (gw) seq.push([gw, 4]); seq.push([nw ? dw : dw + rest, 3]); for (let k = 0; k < nw; k++) seq.push([rest / nw, k === 0 && rest / nw > 3 && rnd() < 0.55 ? 8 : rnd() < 0.42 ? 1 : 0]);
      if (hash2(b, 8, 29) < 0.5) seq.reverse(); for (const s of seq) bays.push(s);
    } else if (home) { const nb = Math.max(1, Math.round(L / 3.5)); for (let k = 0; k < nb; k++) { const q = rnd(); bays.push([L / nb, i === bi && k === (nb >> 1) && L / nb > 2.6 ? 9 : q < 0.5 ? (rnd() < 0.42 ? 1 : 0) : q < 0.62 ? 10 : 2]); } }
    else if (kind === 2) { const front = fac[i] > 0.3, nb = Math.max(1, Math.round(L / 4.6));   // shops: glass and a door to the street, blank or small-windowed walls behind
      for (let k = 0; k < nb; k++) { const q = rnd(); bays.push([L / nb, lm === "theatre" ? (front && k === (nb >> 1) ? 11 : 2) : front ? (nb > 1 && k % 3 === 1 ? 11 : q < 0.9 ? 5 : 2) : storeys > 1 ? (q < 0.45 ? (upStrip ? (rnd() < 0.3 ? 7 : 6) : (rnd() < 0.3 ? 1 : 0)) : 2) : q < 0.12 ? 0 : q < 0.17 ? 3 : 2]); } }
    else if (kind === 4) { const nb = Math.max(1, Math.round(L / 4.6)); for (let k = 0; k < nb; k++) { const q = rnd(); bays.push([L / nb, L > 14 && k === (nb >> 1) && fac[i] > 0.2 ? 11 : q < 0.66 ? (rnd() < 0.15 ? 7 : 6) : 2]); } }
    else if (kind === 1 && i === li && L > 2.8) { const gw = garageWidth(1, L); bays.push([gw, 4]); if (L - gw > 0.05) bays.push([L - gw, 2]); }
    else bays.push([L, 2]);
    let s0 = 0;
    for (const [len, tile] of bays) {
      const t0 = s0 / L, t1 = (s0 + len) / L; s0 += len; let f0 = 0.004, f1 = 0.996;
      if (tile === 3 || tile === 10) { const f = clamp(len / 3.6, 0.38, 1); f0 = 0.5 - f / 2 + 0.004; f1 = 0.5 + f / 2 - 0.004; }   // drawn for a 3.6 m bay: a narrower bay shows only the middle, so a door keeps its width
      const u0 = (tile + f0) / TILE_W, u1 = (tile + f1) / TILE_W, ground = tile === 3 || tile === 4 || tile === 5 || tile === 9 || tile === 11;
      const x0 = ax + dx * t0, z0 = az + dz * t0, x1 = ax + dx * t1, z1 = az + dz * t1; _out.set(ox, 0, oz);
      if (ground && storeys > 1) {   // doors and shopfronts only on the ground floor, windows above
        const ym = floorY + sH; face(W, [x0, floorY, z0, x1, floorY, z1, x0, ym, z0, x1, ym, z1], [u0, 0, u1, 0, u0, 1, u1, 1], wc, _out);
        const tu = lm === "theatre" ? 2 : kind === 4 || (kind === 2 && upStrip) ? 6 : 0; face(W, [x0, ym, z0, x1, ym, z1, x0, topY, z0, x1, topY, z1], [(tu + 0.004) / TILE_W, 1, (tu + 0.996) / TILE_W, 1, (tu + 0.004) / TILE_W, vTop, (tu + 0.996) / TILE_W, vTop], wc, _out);
      } else face(W, [x0, floorY, z0, x1, floorY, z1, x0, topY, z0, x1, topY, z1], [u0, 0, u1, 0, u0, vTop, u1, vTop], wc, _out);
      if ((tile === 5 || tile === 11) && cano < 0.42) {   // a cloth awning over the shopfront
        const ya = floorY + Math.min(2.85, sH - 0.2), px = ox * 1.15, pz = oz * 1.15, pts = [x0, ya, z0, x1, ya, z1, x0 + px, ya - 0.42, z0 + pz, x1 + px, ya - 0.42, z1 + pz], uv = [0, 0, 1, 0, 0, 0.4, 1, 0.4];
        face(Rf, pts, uv, ac, _up); face(Rf, pts, uv, [ac[0] * 0.6, ac[1] * 0.6, ac[2] * 0.6], _dn);
      } else if ((tile === 5 || tile === 11) && cano < 0.7) {   // or a flat canopy
        const ya = floorY + Math.min(3.0, sH - 0.1), px = ox * 1.4, pz = oz * 1.4, uv = [0, 0, 1, 0, 0, 0.4, 1, 0.4], cc = [tc[0] * 0.7, tc[1] * 0.7, tc[2] * 0.7];
        face(Rf, [x0, ya, z0, x1, ya, z1, x0 + px, ya, z0 + pz, x1 + px, ya, z1 + pz], uv, cc, _up); face(Rf, [x0, ya - 0.16, z0, x1, ya - 0.16, z1, x0 + px, ya - 0.16, z0 + pz, x1 + px, ya - 0.16, z1 + pz], uv, [cc[0] * 0.6, cc[1] * 0.6, cc[2] * 0.6], _dn);
        face(W, [x0 + px, ya - 0.16, z0 + pz, x1 + px, ya - 0.16, z1 + pz, x0 + px, ya, z0 + pz, x1 + px, ya, z1 + pz], PUV, cc, _out.set(ox, 0, oz));
      }
      else if ((tile === 5 || tile === 11) && cano < 0.86 && (storeys === 1 || lm === "saloon")) {   // or a covered walk on posts along the shopfronts
        const ya = floorY + Math.min(3.1, sH - 0.05), px = ox * 2.6, pz = oz * 2.6, uv = [0, 0, len * 0.5, 0, 0, 1.3, len * 0.5, 1.3];
        face(Rf, [x0, ya + 0.25, z0, x1, ya + 0.25, z1, x0 + px, ya, z0 + pz, x1 + px, ya, z1 + pz], uv, rc, _up); face(Rf, [x0, ya + 0.1, z0, x1, ya + 0.1, z1, x0 + px, ya - 0.15, z0 + pz, x1 + px, ya - 0.15, z1 + pz], uv, dk, _dn);
        face(W, [x0 + px, ya - 0.2, z0 + pz, x1 + px, ya - 0.2, z1 + pz, x0 + px, ya + 0.02, z0 + pz, x1 + px, ya + 0.02, z1 + pz], PUV, tc, _out.set(ox, 0, oz));
        addBox(W, x0 + ox * 2.45, z0 + oz * 2.45, dx / L, dz / L, 0.09, 0.09, floorY - 0.3, ya - 0.15, tc); if (t1 > 0.999) addBox(W, x1 + ox * 2.45, z1 + oz * 2.45, dx / L, dz / L, 0.09, 0.09, floorY - 0.3, ya - 0.15, tc);
      }
      if (pil && fac[i] > 0.3 && (tile === 5 || tile === 11 || tile === 2)) { addBox(W, x0 + ox * 0.05, z0 + oz * 0.05, dx / L, dz / L, 0.17, 0.09, floorY, topY, dk); if (t1 > 0.999) addBox(W, x1 + ox * 0.05, z1 + oz * 0.05, dx / L, dz / L, 0.17, 0.09, floorY, topY, dk); }
      if (kind === 3 && storeys > 1 && (tile === 0 || tile === 1 || tile === 8) && len > 2.6 && hash2(b, i * 16 + (s0 | 0), 51) < 0.5) for (let s = 1; s < storeys; s++) addBox(W, (x0 + x1) / 2 + ox * 0.62, (z0 + z1) / 2 + oz * 0.62, dx / L, dz / L, Math.min(len / 2 - 0.3, 1.5), 0.6, floorY + s * sH - 0.12, floorY + s * sH + 1.0, [wc[0] * 0.86, wc[1] * 0.86, wc[2] * 0.86], [0.35, 0.35, 0.36]);   // balconies on blocks of flats
      if (tile === 3 && kind === 0 && !porch) porch = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, nx: ox, nz: oz, w: Math.min(len, 2.2) };
    }
  }
  if (porch) {   // a step at the front door, and on most houses a small roof over it
    const { x, z, nx, nz, w } = porch, tx = -nz, tz = nx, d = 1.5, hw = w / 2 + 0.25, gy = Math.min(gmin, H(x + nx * d, z + nz * d));
    addBox(W, x + nx * d / 2, z + nz * d / 2, tx, tz, hw, d / 2, gy - 0.3, floorY - 0.03, [0.60, 0.59, 0.56], [0.66, 0.65, 0.62]);
    if (hash2(b, 9, 37) < 0.62) {
      const y1 = Math.min(ey, floorY + 2.75) - 0.02, y0 = y1 - 0.24, lx = x - tx * hw, lz = z - tz * hw, rx = x + tx * hw, rz = z + tz * hw, px = nx * d, pz = nz * d, uv = [0, 0, w, 0, 0, 0.8, w, 0.8];
      face(Rf, [lx, y1, lz, rx, y1, rz, lx + px, y0, lz + pz, rx + px, y0, rz + pz], uv, rc, _up); face(Rf, [lx, y1 - 0.1, lz, rx, y1 - 0.1, rz, lx + px, y0 - 0.1, lz + pz, rx + px, y0 - 0.1, rz + pz], uv, [wc[0] * 0.75, wc[1] * 0.75, wc[2] * 0.75], _dn);
      face(W, [lx + px, y0 - 0.14, lz + pz, rx + px, y0 - 0.14, rz + pz, lx + px, y0 + 0.02, lz + pz, rx + px, y0 + 0.02, rz + pz], PUV, tc, _out.set(nx, 0, nz));
      for (const s of [-1, 1]) { face(W, [x + tx * hw * s, y1 - 0.12, z + tz * hw * s, x + tx * hw * s + px, y0 - 0.12, z + tz * hw * s + pz, x + tx * hw * s, y1, z + tz * hw * s, x + tx * hw * s + px, y0, z + tz * hw * s + pz], PUV, tc, _out.set(tx * s, 0, tz * s)); addBox(W, x + tx * (hw - 0.09) * s + nx * (d - 0.09), z + tz * (hw - 0.09) * s + nz * (d - 0.09), tx, tz, 0.055, 0.055, floorY - 0.03, y0 - 0.1, tc); }
    }
  }
  if (lm && fi >= 0) landmarkExtras(lm, P, n, fi, floorY, topY, wc, tc, W, Rf);
  // roof
  if (!sk) {
    const pin = area > 60 ? insetRing(P, 0.32) : null;   // a parapet round the roof edge
    if (pin) for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = P[j * 2] - P[i * 2], dz = P[j * 2 + 1] - P[i * 2 + 1], L = Math.hypot(dx, dz) || 1, py = topY + 0.5;
      face(W, [P[i * 2], topY, P[i * 2 + 1], P[j * 2], topY, P[j * 2 + 1], P[i * 2], py, P[i * 2 + 1], P[j * 2], py, P[j * 2 + 1]], PUV, kind === 2 ? dk : wc, _out.set(dz / L, 0, -dx / L));
      face(W, [P[i * 2], py, P[i * 2 + 1], P[j * 2], py, P[j * 2 + 1], pin[i * 2], py, pin[i * 2 + 1], pin[j * 2], py, pin[j * 2 + 1]], PUV, [wc[0] * 0.85, wc[1] * 0.85, wc[2] * 0.85], _up);
      face(W, [pin[i * 2], topY, pin[i * 2 + 1], pin[j * 2], topY, pin[j * 2 + 1], pin[i * 2], py, pin[i * 2 + 1], pin[j * 2], py, pin[j * 2 + 1]], PUV, [wc[0] * 0.7, wc[1] * 0.7, wc[2] * 0.7], _out.set(-dz / L, 0, dx / L)); }
    const tris = THREE.ShapeUtils.triangulateShape(Array.from({ length: n }, (_, i) => new THREE.Vector2(P[i * 2], P[i * 2 + 1])), []);
    for (const t of tris) face(Rf, [P[t[0] * 2], topY, P[t[0] * 2 + 1], P[t[1] * 2], topY, P[t[1] * 2 + 1], P[t[2] * 2], topY, P[t[2] * 2 + 1]], [P[t[0] * 2] * 0.1, P[t[0] * 2 + 1] * 0.1, P[t[1] * 2] * 0.1, P[t[1] * 2 + 1] * 0.1, P[t[2] * 2] * 0.1, P[t[2] * 2 + 1] * 0.1], rc, _up);
    if (area > 350 && kind !== 7) for (let k = 0; k < Math.min(6, Math.floor(area / 400) + 1); k++) {   // plant on the roof
      const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n), t = 0.3 + rnd() * 0.4, cx = lerp(P[i * 2], P[j * 2], t), cz = lerp(P[i * 2 + 1], P[j * 2 + 1], t); if (!inPoly(P, 0, n, cx, cz)) continue;
      addBox(Rf, cx, cz, 1, 0, 0.9 + rnd() * 1.1, 0.9 + rnd() * 1.1, topY, topY + 0.9 + rnd() * 0.7, [0.55, 0.56, 0.57], [0.5, 0.51, 0.52]);
    }
    return;
  }
  const F = sk.faces, sl = Math.sqrt(1 + pitch * pitch) * 0.5, soff = [wc[0] * 0.8, wc[1] * 0.8, wc[2] * 0.8]; let sun = -1, sunS = 0, sunLo = 0, sunHi = 0;
  for (let f = 0; f < F.length; f += 11) {
    const e = F[f], nx = sk.EN[e * 2], nz = sk.EN[e * 2 + 1], ux = nz, uz = -nx, ox = E[e * 2], oz = E[e * 2 + 1], t0 = F[f + 5], t1 = F[f + 10], y0 = ey + t0 * pitch, y1 = ey + t1 * pitch;
    const x1 = F[f + 1], z1 = F[f + 2], x2 = F[f + 3], z2 = F[f + 4], x3 = F[f + 6], z3 = F[f + 7], x4 = F[f + 8], z4 = F[f + 9];
    if (sk.EW[e]) {   // a sloping plane, shingled in courses parallel to its eave
      const u1 = ((x1 - ox) * ux + (z1 - oz) * uz), u2 = ((x2 - ox) * ux + (z2 - oz) * uz), u3 = ((x3 - ox) * ux + (z3 - oz) * uz), u4 = ((x4 - ox) * ux + (z4 - oz) * uz);
      face(Rf, [x1, y0, z1, x2, y0, z2, x3, y1, z3, x4, y1, z4], [u1 * 0.5, t0 * sl, u2 * 0.5, t0 * sl, u3 * 0.5, t1 * sl, u4 * 0.5, t1 * sl], rc, _out.set(-nx, 1.5, -nz));
      if (t0 === 0 && t1 > 2.3) { const lo = Math.max(u1, u3) + 0.5, hi = Math.min(u2, u4) - 0.5, s = (hi - lo) * Math.min(t1, 4.4) * (-nz * 0.9 + nx * 0.25); if (hi - lo > 3.2 && -nz * 0.9 + nx * 0.25 > 0.5 && s > sunS) { sunS = s; sun = f; sunLo = lo; sunHi = hi; } }   // the best plane for solar panels: broad, and facing south or south-west
    } else {   // a gable end: the wall carries on up under the roof, with a board along each rake
      const j = (e + 1) % m, wx = R[j * 2] - R[e * 2], wz = R[j * 2 + 1] - R[e * 2 + 1], wl = Math.hypot(wx, wz) || 1, G = (x, z, y) => { let s = ((x - R[e * 2]) * wx + (z - R[e * 2 + 1]) * wz) / wl; if (s < 0) { s = 0; y = topY; } else if (s > wl) { s = wl; y = topY; } if (y < topY) y = topY; return [R[e * 2] + wx * s / wl, y, R[e * 2 + 1] + wz * s / wl]; };
      const g1 = G(x1, z1, y0), g2 = G(x2, z2, y0), g3 = G(x3, z3, y1), g4 = G(x4, z4, y1), v0 = (g1[1] - floorY) / sH, v1 = (g3[1] - floorY) / sH;
      if (g3[1] - g1[1] > 0.01 || g4[1] - g2[1] > 0.01) face(W, [g1[0], g1[1], g1[2], g2[0], g2[1], g2[2], g3[0], g3[1], g3[2], g4[0], g4[1], g4[2]], [PU0, v0, PU1, (g2[1] - floorY) / sH, PU0, v1, PU1, (g4[1] - floorY) / sH], wc, _out.set(-nx, 0, -nz));
      for (const [px, pz, qx, qz] of [[x1, z1, x3, z3], [x2, z2, x4, z4]]) if (Math.hypot(qx - px, qz - pz) > 0.05) face(W, [px, y0 - 0.2, pz, qx, y1 - 0.2, qz, px, y0 + 0.02, pz, qx, y1 + 0.02, qz], PUV, tc, _out.set(-nx, 0, -nz));
    }
  }
  for (const c of sk.caps) { const k = c.X.length; if (k < 3) continue; const y = ey + c.t * pitch, tris = THREE.ShapeUtils.triangulateShape(c.X.map((x, i) => new THREE.Vector2(x, c.Z[i])), []);
    for (const t of tris) face(Rf, [c.X[t[0]], y, c.Z[t[0]], c.X[t[1]], y, c.Z[t[1]], c.X[t[2]], y, c.Z[t[2]]], [c.X[t[0]] * 0.3, c.Z[t[0]] * 0.3, c.X[t[1]] * 0.3, c.Z[t[1]] * 0.3, c.X[t[2]] * 0.3, c.Z[t[2]] * 0.3], rc, _up); }
  for (let i = 0; i < m; i++) {   // eaves: a fascia board along the edge and a soffit closing the gap back to the wall
    if (gab[i]) continue; const j = (i + 1) % m, ex = E[j * 2] - E[i * 2], ez = E[j * 2 + 1] - E[i * 2 + 1], L = Math.hypot(ex, ez) || 1, yb = ey - 0.17;
    face(W, [E[i * 2], yb, E[i * 2 + 1], E[j * 2], yb, E[j * 2 + 1], E[i * 2], ey + 0.015, E[i * 2 + 1], E[j * 2], ey + 0.015, E[j * 2 + 1]], PUV, tc, _out.set(ez / L, 0, -ex / L));
    face(W, [R[i * 2], yb, R[i * 2 + 1], R[j * 2], yb, R[j * 2 + 1], E[i * 2], yb, E[i * 2 + 1], E[j * 2], yb, E[j * 2 + 1]], PUV, soff, _dn);
  }
  if (kind === 0 && area > 90 && hash2(b, 6, 17) < 0.62) {   // a chimney stack up the outside of a side wall
    const k0 = Math.floor(hash2(b, 6, 18) * m);
    for (let q = 0; q < m; q++) { const i = (k0 + q) % m, j = (i + 1) % m, dx = R[j * 2] - R[i * 2], dz = R[j * 2 + 1] - R[i * 2 + 1], L = Math.hypot(dx, dz); if (L < 4 || gab[i]) continue;
      const nx = dz / L, nz = -dx / L, t = 0.3 + 0.4 * hash2(b, 6, 19), cx = R[i * 2] + dx * t, cz = R[i * 2 + 1] + dz * t; if (porch && Math.hypot(cx - porch.x, cz - porch.z) < 4) continue;
      const brick = hash2(b, 6, 20) < 0.55, cc = brick ? [0.42, 0.27, 0.21] : wc;
      addBox(W, cx + nx * 0.25, cz + nz * 0.25, dx / L, dz / L, 0.55, 0.39, gmin - 0.3, topY + Math.min(rise, 1.2) + 0.75, cc, [0.2, 0.19, 0.18]); break; }
  }
  if (sun >= 0 && kind === 0 && area > 110 && hash2(b, 10, 43) < 0.26) {   // solar panels: rows of dark glass on the sunny side
    const e = F[sun], nx = sk.EN[e * 2], nz = sk.EN[e * 2 + 1], ux = nz, uz = -nx, ox = E[e * 2], oz = E[e * 2 + 1], t1 = F[sun + 10], rows = t1 > 4.6 ? 2 : 1, pw = 1.02, ph = 1.68, cols = Math.min(9, Math.floor((sunHi - sunLo) / pw)), u0 = (sunLo + sunHi) / 2 - cols * pw / 2, pc = [0.035, 0.045, 0.085];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const ua = u0 + c * pw + 0.02, ub = ua + pw - 0.04, ta = 0.9 + r * (ph + 0.06), tb = ta + ph, P4 = (u, t) => [ox + ux * u + nx * t, ey + t * pitch + 0.07, oz + uz * u + nz * t], p1 = P4(ua, ta), p2 = P4(ub, ta), p3 = P4(ua, tb), p4 = P4(ub, tb);
      face(Rf, [p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]], [0.02, 0.02, 0.04, 0.02, 0.02, 0.04, 0.04, 0.04], pc, _out.set(-nx, 1.5, -nz)); }
  }
}
function landmarkExtras(lm, P, n, fi, floorY, topY, wc, tc, W, Rf) {
  const j = (fi + 1) % n, dx = P[j * 2] - P[fi * 2], dz = P[j * 2 + 1] - P[fi * 2 + 1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, nx = uz, nz = -ux, mx = P[fi * 2] + dx / 2, mz = P[fi * 2 + 1] + dz / 2, uv = [0, 0, 1, 0, 0, 1, 1, 1];
  const slab = (cx, cz, hw, hd, y0, y1, col) => { addBox(W, cx, cz, ux, uz, hw, hd, y0, y1, col, col); face(Rf, [cx - ux * hw - nx * hd, y0, cz - uz * hw - nz * hd, cx + ux * hw - nx * hd, y0, cz + uz * hw - nz * hd, cx - ux * hw + nx * hd, y0, cz - uz * hw + nz * hd, cx + ux * hw + nx * hd, y0, cz + uz * hw + nz * hd], uv, [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6], _dn); };
  if (lm === "saloon") {   // a western false front standing above the roof line
    addBox(W, mx + nx * 0.06, mz + nz * 0.06, ux, uz, L / 2 + 0.1, 0.14, topY - 0.1, topY + 2.1, [0.30, 0.20, 0.13], [0.2, 0.14, 0.1]);
    addBox(W, mx + nx * 0.1, mz + nz * 0.1, ux, uz, L / 2 + 0.25, 0.2, topY + 2.1, topY + 2.3, [0.22, 0.15, 0.10], [0.2, 0.14, 0.1]);
  } else if (lm === "theatre") {   // a marquee over the doors and a tall blade sign above it
    slab(mx + nx * 1.3, mz + nz * 1.3, Math.min(4.2, L / 2 - 0.3), 1.3, floorY + 3.2, floorY + 4.2, [0.62, 0.13, 0.11]);
    addBox(W, mx + nx * 0.55, mz + nz * 0.55, ux, uz, 0.3, 0.55, floorY + 4.2, topY + 4.2, [0.62, 0.13, 0.11], [0.5, 0.1, 0.09]);
    addBox(W, mx + nx * 0.55, mz + nz * 0.55, ux, uz, 0.36, 0.62, topY + 4.2, topY + 4.45, [0.86, 0.82, 0.70], [0.8, 0.76, 0.66]);
  } else if (lm === "fuel") {   // a canopy over the pumps on the forecourt
    const cx = mx + nx * 11, cz = mz + nz * 11; if (hiAt(cx, cz, 2) > 0.4) return; const gy = H(cx, cz);
    slab(cx, cz, 6.5, 3.6, gy + 4.7, gy + 5.4, [0.88, 0.88, 0.86]);
    for (const [a, c] of [[-4.6, -1.8], [4.6, -1.8], [-4.6, 1.8], [4.6, 1.8]]) addBox(W, cx + ux * a + nx * c, cz + uz * a + nz * c, ux, uz, 0.14, 0.14, gy - 0.3, gy + 4.7, [0.8, 0.8, 0.78]);
    for (const a of [-3, 3]) { addBox(W, cx + ux * a, cz + uz * a, ux, uz, 0.5, 1.6, gy - 0.3, gy + 0.16, [0.6, 0.6, 0.58], [0.64, 0.64, 0.62]); for (const c of [-0.8, 0.8]) addBox(W, cx + ux * a + nx * c, cz + uz * a + nz * c, ux, uz, 0.28, 0.2, gy + 0.16, gy + 1.75, [0.78, 0.78, 0.76], [0.3, 0.3, 0.32]); }
  } else if (lm === "market") {   // a tall entrance bay with a deep canopy
    const hw = Math.min(7, L / 2 - 0.5); if (hw < 3) return;
    addBox(W, mx + nx * 0.25, mz + nz * 0.25, ux, uz, hw, 0.3, floorY + 3.3, topY + 1.7, [wc[0] * 0.8, wc[1] * 0.8, wc[2] * 0.8], [0.4, 0.4, 0.4]);
    slab(mx + nx * 2.2, mz + nz * 2.2, hw + 0.4, 2.0, floorY + 3.05, floorY + 3.3, tc);
    for (const a of [-hw, hw]) addBox(W, mx + ux * a + nx * 3.9, mz + uz * a + nz * 3.9, ux, uz, 0.16, 0.16, floorY - 0.3, floorY + 3.05, tc);
  }
}
/* Roof colour as the satellite sees it, for any roof big enough to fill a pixel; otherwise the builder's own pick. */
function roofCol(b, fb) {
  const R = V.bRoof; if (!R || R[b * 3] + R[b * 3 + 1] + R[b * 3 + 2] === 0) return fb; const lin = c => Math.pow(c / 255, 2.2); let r = lin(R[b * 3]), g = lin(R[b * 3 + 1]), bl = lin(R[b * 3 + 2]);
  const l = (r + g + bl) / 3; r = lerp(l, r, 0.55); g = lerp(l, g, 0.45); bl = lerp(l, bl, 0.55); return [clamp(r / 0.3, 0.32, 2.3), clamp(g / 0.3, 0.32, 2.3), clamp(bl / 0.3, 0.32, 2.3)];
}
function indexBuildings() {
  for (const [b, nm] of WORLD.signs || []) { let l = SIGNS.get(b); if (!l) SIGNS.set(b, l = []); l.push(nm); }
  for (let b = 0; b < V.bKind.length; b++) { const k = Math.floor((BLD.minx[b] + BLD.maxx[b]) / 2 / BT) * 4096 + Math.floor((BLD.minz[b] + BLD.maxz[b]) / 2 / BT); let t = bldTiles.get(k); if (!t) bldTiles.set(k, t = { list: [], group: null }); t.list.push(b); }
  // outside the map: plain blocks, enough to read as the neighbouring towns
  const n = V.qX.length, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  ringMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), n); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = V.qX[i], z = V.qZ[i], h = V.qH[i] / 4; q.setFromAxisAngle(_up, -V.qA[i] / 255 * Math.PI); s.set(V.qW[i] / 2, h + 2, V.qD[i] / 2); p.set(x, H(x, z) - 2, z); m.compose(p, q, s); ringMesh.setMatrixAt(i, m);
    const r = hash2(i, 3, 5), w = r < 0.5 ? ROOFC[Math.floor(r * 2 * ROOFC.length)] : FLATC[Math.floor((r - 0.5) * 2 * FLATC.length)]; c.setRGB(w[0] * 1.5, w[1] * 1.5, w[2] * 1.5); ringMesh.setColorAt(i, c);
  }
  ringMesh.instanceMatrix.needsUpdate = true; ringMesh.instanceColor.needsUpdate = true; ringMesh.frustumCulled = false; ringMesh.matrixAutoUpdate = false; scene.add(ringMesh);
}
let bldCheck = 0;
function updateBuildings(dt, force) {
  bldCheck -= dt; if (bldCheck > 0 && !force) return; bldCheck = 0.05;
  const R = uBldFar.value, cx = camera.position.x, cz = camera.position.z; let built = 0, best = null, bd = 1e9;
  for (let tx = Math.floor((cx - R) / BT); tx <= Math.floor((cx + R) / BT); tx++) for (let tz = Math.floor((cz - R) / BT); tz <= Math.floor((cz + R) / BT); tz++) {
    const t = bldTiles.get(tx * 4096 + tz); if (!t || t.group) continue; const d = Math.hypot((tx + 0.5) * BT - cx, (tz + 0.5) * BT - cz); if (d < R && d < bd) { bd = d; best = t; best.tx = tx; best.tz = tz; }
  }
  const t0 = performance.now();
  while (best && (force ? built < 400 : built < 1 || performance.now() - t0 < 5)) {   // a few milliseconds of building work per frame
    const W = new Buf(), Rf = new Buf(), SG = new Buf(true, false), texts = []; for (const b of best.list) { addBuilding(b, W, Rf); if (SIGNS.has(b) && _bl.b === b) addSigns(b, SG, texts); }
    const g = new THREE.Group(); g.matrixAutoUpdate = false; for (const [bf, mat] of [[W, wallMat], [Rf, roofMat]]) { const geo = bf.geo(); if (!geo) continue; const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; g.add(m); }
    if (texts.length) g.add(signMesh(SG, texts));
    best.group = g; scene.add(g); built++; best = null;
    { bd = 1e9; for (let tx = Math.floor((cx - R) / BT); tx <= Math.floor((cx + R) / BT); tx++) for (let tz = Math.floor((cz - R) / BT); tz <= Math.floor((cz + R) / BT); tz++) { const t = bldTiles.get(tx * 4096 + tz); if (!t || t.group) continue; const d = Math.hypot((tx + 0.5) * BT - cx, (tz + 0.5) * BT - cz); if (d < R && d < bd) { bd = d; best = t; best.tx = tx; best.tz = tz; } } }
  }
  for (const t of bldTiles.values()) if (t.group && Math.hypot((t.tx + 0.5) * BT - cx, (t.tz + 0.5) * BT - cz) > R + 500) { scene.remove(t.group); t.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.userData.sign) { o.material.map.dispose(); o.material.dispose(); } }); t.group = null; }
}

/* ---------- name boards: each mapped business is lettered on the wall of its building that faces the street or the car park ---------- */
const SIGNS = new Map(), _bl = { b: -1, P: null, n: 0, floorY: 0, topY: 0 }, SIGN_FONT = '700 40px "Helvetica Neue", Arial, sans-serif'; let _signCtx = null;
function addSigns(b, SG, texts) {
  const P = _bl.P, n = _bl.n, names = SIGNS.get(b), walls = []; if (!_signCtx) { _signCtx = document.createElement("canvas").getContext("2d"); _signCtx.font = SIGN_FONT; }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = P[j * 2] - P[i * 2], dz = P[j * 2 + 1] - P[i * 2 + 1], L = Math.hypot(dx, dz); if (L < 3.5) continue; const nx = dz / L, nz = -dx / L, mx = (P[i * 2] + P[j * 2]) / 2, mz = (P[i * 2 + 1] + P[j * 2 + 1]) / 2;
    walls.push([L * (0.25 + Math.max(hiAt(mx + nx * 5, mz + nz * 5, 0), hiAt(mx + nx * 11, mz + nz * 11, 0)) - hiAt(mx + nx * 3, mz + nz * 3, 2)), L, nx, nz, mx, mz]); }
  walls.sort((a, c) => c[0] - a[0]);
  for (let k = 0; k < Math.min(names.length, walls.length, 2) && texts.length < 32; k++) {
    const [, L, nx, nz, mx, mz] = walls[k], txt = names[k], hgt = 0.62, w = clamp(_signCtx.measureText(txt).width / 103 + 0.6, 2, Math.min(L * 0.9, 4.9)), y = Math.min(_bl.topY - 0.42, _bl.floorY + 3.75), rx = nz, rz = -nx, id = texts.length, pw = Math.min(512, 64 * w / hgt);
    texts.push([txt, pw]); const u0 = ((id % 2) * 512 + 256 - pw / 2) / 1024, u1 = ((id % 2) * 512 + 256 + pw / 2) / 1024, v1 = 1 - (id >> 1) / 16, v0 = v1 - 1 / 16, ox = mx + nx * 0.17, oz = mz + nz * 0.17, base = SG.v;
    SG.vert(ox - rx * w / 2, y - hgt / 2, oz - rz * w / 2, nx, 0, nz, u0, v0); SG.vert(ox + rx * w / 2, y - hgt / 2, oz + rz * w / 2, nx, 0, nz, u1, v0); SG.vert(ox - rx * w / 2, y + hgt / 2, oz - rz * w / 2, nx, 0, nz, u0, v1); SG.vert(ox + rx * w / 2, y + hgt / 2, oz + rz * w / 2, nx, 0, nz, u1, v1); SG.quad(base, base + 1, base + 2, base + 3);
  }
}
const SIGN_STYLE = [["#efe9da", "#22262b"], ["#1f3b2c", "#f3efe2"], ["#1d2c44", "#f1f1ee"], ["#2a2a2c", "#f0ead8"], ["#f4f2ec", "#7a1f1a"], ["#5a2420", "#f6efe0"]];
function signMesh(SG, texts) {
  const c = document.createElement("canvas"); c.width = c.height = 1024; const g = c.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle";
  texts.forEach(([txt, pw], id) => { let h = 0; for (const ch of txt) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const [bg, fg] = SIGN_STYLE[h % SIGN_STYLE.length], x = (id % 2) * 512, y = (id >> 1) * 64;
    g.fillStyle = bg; g.fillRect(x, y, 512, 64); g.font = SIGN_FONT; const tw = g.measureText(txt).width, k = Math.min(1, (pw - 34) / tw); g.save(); g.translate(x + 256, y + 33); g.scale(k, k); g.fillStyle = fg; g.fillText(txt, 0, 0); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAXANISO; const m = new THREE.Mesh(SG.geo(), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.matrixAutoUpdate = false; m.userData.sign = true; return m;
}
