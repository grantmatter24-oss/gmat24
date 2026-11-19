/* ---------- buildings: every mapped footprint extruded to its surveyed height, with a roof that suits what it is ---------- */
const BT = 256, bldTiles = new Map(); let wallMat, roofMat, ringMesh;
const TILE_W = 8;   // wall atlas columns: 0 window, 1 lit window, 2 plain wall, 3 door, 4 garage door, 5 shopfront, 6 office glazing, 7 lit office glazing
function buildBuildingMaterials() {
  const S = 256, W = S * TILE_W;
  const draw = (emit) => (g) => {
    g.fillStyle = emit ? "#000" : "#d9d9d9"; g.fillRect(0, 0, W, S);
    const r = rng(21);
    if (!emit) { for (let i = 0; i < 9000; i++) { const v = 205 + Math.floor(r() * 30); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * W, r() * S, 2, 2); }
      g.strokeStyle = "rgba(0,0,0,0.07)"; g.lineWidth = 1; for (let y = 10; y < S; y += 13) { g.beginPath(); g.moveTo(0, y); g.lineTo(S * 5, y); g.stroke(); } }
    const glass = (x, y, w, h, lit, bars) => {
      if (emit) { if (lit) { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, "#ffd9a0"); gr.addColorStop(1, "#e8a860"); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x, y, w, h * 0.18); } return; }
      g.fillStyle = "#f4f4f2"; g.fillRect(x - 5, y - 5, w + 10, h + 10);
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, lit ? "#3a3f48" : "#2a323c"); gr.addColorStop(0.5, "#18202a"); gr.addColorStop(1, "#303a46"); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(255,255,255,0.10)"; g.beginPath(); g.moveTo(x, y + h * 0.7); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.75, y); g.lineTo(x, y + h); g.fill();
      g.fillStyle = "#f4f4f2"; for (let k = 1; k < bars; k++) g.fillRect(x + w * k / bars - 1.5, y, 3, h); g.fillRect(x, y + h * 0.5 - 1.5, w, bars ? 3 : 0);
    };
    // v runs up the wall: canvas y = 0 is the top of the storey
    glass(0 * S + 72, 62, 112, 96, false, 2); glass(1 * S + 72, 62, 112, 96, true, 2);
    if (!emit) { g.fillStyle = "#f4f4f2"; g.fillRect(3 * S + 86, 36, 84, 220); g.fillStyle = "#5a4636"; g.fillRect(3 * S + 92, 42, 72, 214); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(3 * S + 100, 54, 56, 80); g.fillRect(3 * S + 100, 146, 56, 96); g.fillStyle = "#c9b27a"; g.fillRect(3 * S + 152, 150, 6, 12);
      g.fillStyle = "#f4f4f2"; g.fillRect(4 * S + 6, 58, 244, 198); g.fillStyle = "#e6e4de"; g.fillRect(4 * S + 12, 64, 232, 192); g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 2; for (let y = 64; y < 256; y += 38) { g.beginPath(); g.moveTo(4 * S + 12, y); g.lineTo(4 * S + 244, y); g.stroke(); } }
    glass(5 * S + 8, 40, 240, 196, false, 3); glass(6 * S + 6, 60, 244, 118, false, 4); glass(7 * S + 6, 60, 244, 118, true, 4);
    if (emit) { g.fillStyle = "#3a3020"; g.fillRect(5 * S + 8, 40, 240, 196); }
  };
  const mk = (emit) => { const c = document.createElement("canvas"); c.width = W; c.height = S; draw(emit)(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANISO; return t; };
  wallMat = new THREE.MeshStandardMaterial({ map: mk(false), emissiveMap: mk(true), emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.86 });
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
const AWN = [[0.34, 0.07, 0.07], [0.07, 0.20, 0.13], [0.09, 0.13, 0.28], [0.52, 0.45, 0.33], [0.16, 0.16, 0.17], [0.55, 0.30, 0.10]];
function addBuilding(b, W, Rf) {
  const a = V.bStart[b], n = V.bStart[b + 1] - a, kind = V.bKind[b], h = V.bH[b] / 10; if (n < 3) return;
  let P = new Float32Array(n * 2), area = 0, per = 0; for (let i = 0; i < n; i++) { P[i * 2] = V.bP[(a + i) * 2]; P[i * 2 + 1] = V.bP[(a + i) * 2 + 1]; }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += P[i * 2] * P[j * 2 + 1] - P[j * 2] * P[i * 2 + 1]; per += Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]); }
  if (area < 0) { const Q = new Float32Array(n * 2); for (let i = 0; i < n; i++) { Q[i * 2] = P[(n - 1 - i) * 2]; Q[i * 2 + 1] = P[(n - 1 - i) * 2 + 1]; } P = Q; area = -area; } area /= 2;
  let gmin = 1e9, gmax = -1e9; for (let i = 0; i < n; i++) { const g = H(P[i * 2], P[i * 2 + 1]); if (g < gmin) gmin = g; if (g > gmax) gmax = g; }
  const floorY = Math.max(gmin + 0.15, gmax - 0.9), seed = Math.floor(hash2(b, 7, 3) * 1e6), rnd = rng(seed);
  const pitched = kind === 0 || kind === 1 || kind === 5 || (kind === 2 && area < 700 && hash2(b, 3, 11) < 0.6), flat = !pitched;   // small shops in town mostly have pitched roofs
  const run = pitched ? clamp(1.7 * area / per, 0.8, kind === 5 ? 7 : 5.5) : 0, pitch = kind === 5 ? 0.75 : 0.36 + rnd() * 0.14, rise = run * pitch;
  const wallH = Math.max(kind === 1 ? 2.3 : 2.6, h - rise), topY = floorY + wallH;
  const wc = kind === 2 || kind === 7 ? WALLC[Math.floor(rnd() * 4) + 2] : kind === 4 ? [0.78, 0.72, 0.62] : WALLC[Math.floor(rnd() * WALLC.length)];
  const rc = flat ? FLATC[Math.floor(rnd() * FLATC.length)] : ROOFC[Math.floor(rnd() * ROOFC.length)], fc = [wc[0] * 0.55, wc[1] * 0.55, wc[2] * 0.56];
  if (kind === 6) {   // an open roof on posts
    const tris = THREE.ShapeUtils.triangulateShape(Array.from({ length: n }, (_, i) => new THREE.Vector2(P[i * 2], P[i * 2 + 1])), []), y = floorY + Math.min(h, 3.2);
    for (const t of tris) for (const yy of [y, y - 0.18]) face(Rf, [P[t[0] * 2], yy, P[t[0] * 2 + 1], P[t[1] * 2], yy, P[t[1] * 2 + 1], P[t[2] * 2], yy, P[t[2] * 2 + 1]], [0, 0, 1, 0, 0, 1], rc, yy === y ? _up : _out.set(0, -1, 0));
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 4))) { const x = P[i * 2], z = P[i * 2 + 1]; for (const [dx, dz] of [[0.08, 0], [0, 0.08]]) face(W, [x - dx, gmin - 0.3, z - dz, x + dx, gmin - 0.3, z + dz, x - dx, y, z - dz, x + dx, y, z + dz], [0.31, 0, 0.32, 0, 0.31, 1, 0.32, 1], [0.5, 0.5, 0.5], _out.set(dz, 0, dx)); }
    return;
  }
  // walls, one bay at a time so each bay shows a whole window, door or plain panel
  const storeys = Math.max(1, Math.round(wallH / 3.1)), vTop = wallH / (wallH / storeys); let doorDone = kind !== 0 && kind !== 3, garDone = kind !== 0, longest = 0, li = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, L = Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]); if (L > longest) { longest = L; li = i; } }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = P[i * 2], az = P[i * 2 + 1], dx = P[j * 2] - ax, dz = P[j * 2 + 1] - az, L = Math.hypot(dx, dz); if (L < 0.05) continue;
    _out.set(dz / L, 0, -dx / L);
    face(W, [ax, gmin - 0.5, az, ax + dx, gmin - 0.5, az + dz, ax, floorY, az, ax + dx, floorY, az + dz], [2.3 / TILE_W, 0, 2.6 / TILE_W, 0, 2.3 / TILE_W, 0.2, 2.6 / TILE_W, 0.2], fc, _out);
    const bayW = kind === 2 || kind === 4 || kind === 7 ? 4.6 : 3.6, nb = L < 2.4 ? 1 : Math.max(1, Math.round(L / bayW));
    for (let k = 0; k < nb; k++) {
      let tile = 2; const q = rnd();
      if (L >= 2.4) {
        if (kind === 0 || kind === 3 || kind === 5) { tile = q < 0.62 ? (rnd() < 0.42 ? 1 : 0) : 2; if (!garDone && i === li && k === 0 && L > 7) { tile = 4; garDone = true; } else if (!doorDone && i === li && k === 1) { tile = 3; doorDone = true; } }
        else if (kind === 2) tile = storeys === 1 ? (q < 0.55 ? 5 : 2) : (q < 0.8 ? (rnd() < 0.3 ? 7 : 6) : 2);
        else if (kind === 4) tile = q < 0.7 ? (rnd() < 0.15 ? 7 : 6) : 2;
        else if (kind === 1) tile = k === 0 && i === li && L > 3.5 ? 4 : 2;
      }
      const t0 = k / nb, t1 = (k + 1) / nb, u0 = (tile + 0.004) / TILE_W, u1 = (tile + 0.996) / TILE_W, single = tile === 3 || tile === 4 || tile === 5;
      const x0 = ax + dx * t0, z0 = az + dz * t0, x1 = ax + dx * t1, z1 = az + dz * t1;
      if (single && storeys > 1) {   // doors and shopfronts only on the ground floor, windows above
        const ym = floorY + wallH / storeys; face(W, [x0, floorY, z0, x1, floorY, z1, x0, ym, z0, x1, ym, z1], [u0, 0, u1, 0, u0, 1, u1, 1], wc, _out);
        const tu = kind === 2 ? 6 : 0; face(W, [x0, ym, z0, x1, ym, z1, x0, topY, z0, x1, topY, z1], [(tu + 0.004) / TILE_W, 1, (tu + 0.996) / TILE_W, 1, (tu + 0.004) / TILE_W, vTop, (tu + 0.996) / TILE_W, vTop], wc, _out);
      } else face(W, [x0, floorY, z0, x1, floorY, z1, x0, topY, z0, x1, topY, z1], [u0, 0, u1, 0, u0, vTop, u1, vTop], wc, _out);
      if (tile === 5) {   // an awning over each shopfront
        const ac = AWN[Math.floor(hash2(b, 5, 13) * AWN.length)], ya = floorY + Math.min(2.85, wallH - 0.2), ox = _out.x * 1.15, oz = _out.z * 1.15, pts = [x0, ya, z0, x1, ya, z1, x0 + ox, ya - 0.42, z0 + oz, x1 + ox, ya - 0.42, z1 + oz], uv = [0, 0, 1, 0, 0, 0.4, 1, 0.4];
        face(Rf, pts, uv, ac, _up); face(Rf, pts, uv, [ac[0] * 0.6, ac[1] * 0.6, ac[2] * 0.6], _dn);
      }
    }
  }
  // roof
  const tile = 0.5;
  if (flat) {
    const tris = THREE.ShapeUtils.triangulateShape(Array.from({ length: n }, (_, i) => new THREE.Vector2(P[i * 2], P[i * 2 + 1])), []);
    for (const t of tris) face(Rf, [P[t[0] * 2], topY, P[t[0] * 2 + 1], P[t[1] * 2], topY, P[t[1] * 2 + 1], P[t[2] * 2], topY, P[t[2] * 2 + 1]], [P[t[0] * 2] * 0.1, P[t[0] * 2 + 1] * 0.1, P[t[1] * 2] * 0.1, P[t[1] * 2 + 1] * 0.1, P[t[2] * 2] * 0.1, P[t[2] * 2 + 1] * 0.1], rc, _up);
    if (area > 350 && kind !== 7) for (let k = 0; k < Math.min(6, Math.floor(area / 400) + 1); k++) {   // plant on the roof
      const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n), t = 0.3 + rnd() * 0.4, cx = lerp(P[i * 2], P[j * 2], t), cz = lerp(P[i * 2 + 1], P[j * 2 + 1], t); if (!inPoly(P, 0, n, cx, cz)) continue;
      const s = 0.9 + rnd() * 1.1, hh = 0.9 + rnd() * 0.7, c = [0.55, 0.56, 0.57];
      for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const tx = -nz, tz = nx; face(Rf, [cx + nx * s - tx * s, topY, cz + nz * s - tz * s, cx + nx * s + tx * s, topY, cz + nz * s + tz * s, cx + nx * s - tx * s, topY + hh, cz + nz * s - tz * s, cx + nx * s + tx * s, topY + hh, cz + nz * s + tz * s], [0, 0, 0.1, 0, 0, 0.1, 0.1, 0.1], c, _out.set(nx, 0, nz)); }
      face(Rf, [cx - s, topY + hh, cz - s, cx + s, topY + hh, cz - s, cx - s, topY + hh, cz + s, cx + s, topY + hh, cz + s], [0, 0, 0.1, 0, 0, 0.1, 0.1, 0.1], c, _up);
    }
    return;
  }
  let ring = insetRing(P, -0.45), y = topY - 0.45 * pitch, left = run + 0.45;   // eaves overhang a little below the wall top
  for (let lv = 0; lv < 3 && left > 0.3; lv++) {
    let d = lv === 0 ? left * 0.55 : lv === 1 ? left * 0.6 : left, nxt = null; for (let tr = 0; tr < 4 && !nxt; tr++) { nxt = insetRing(ring, d); if (!nxt) d *= 0.5; } if (!nxt) break;
    const y2 = y + d * pitch, m = ring.length / 2;
    for (let i = 0; i < m; i++) { const j = (i + 1) % m, ex = ring[j * 2] - ring[i * 2], ez = ring[j * 2 + 1] - ring[i * 2 + 1], L = Math.hypot(ex, ez) || 1, s0 = hash2(b, i, 9) * 4;
      _out.set(ez / L, 0.8, -ex / L); face(Rf, [ring[i * 2], y, ring[i * 2 + 1], ring[j * 2], y, ring[j * 2 + 1], nxt[i * 2], y2, nxt[i * 2 + 1], nxt[j * 2], y2, nxt[j * 2 + 1]], [s0, y * tile * 4, s0 + L * tile, y * tile * 4, s0 + 0.2, y2 * tile * 4, s0 + L * tile - 0.2, y2 * tile * 4], rc, _out); }
    ring = nxt; y = y2; left -= d;
  }
  const m = ring.length / 2, tris = THREE.ShapeUtils.triangulateShape(Array.from({ length: m }, (_, i) => new THREE.Vector2(ring[i * 2], ring[i * 2 + 1])), []);
  for (const t of tris) face(Rf, [ring[t[0] * 2], y, ring[t[0] * 2 + 1], ring[t[1] * 2], y, ring[t[1] * 2 + 1], ring[t[2] * 2], y, ring[t[2] * 2 + 1]], [ring[t[0] * 2] * 0.3, ring[t[0] * 2 + 1] * 0.3, ring[t[1] * 2] * 0.3, ring[t[1] * 2 + 1] * 0.3, ring[t[2] * 2] * 0.3, ring[t[2] * 2 + 1] * 0.3], rc, _up);
  if (kind === 0 && area > 70) {   // a chimney
    const k0 = Math.floor(hash2(b, 6, 17) * n); let mx = 0, mz = 0; for (let i = 0; i < n; i++) { mx += P[i * 2] / n; mz += P[i * 2 + 1] / n; }
    const cx = lerp(P[k0 * 2], mx, 0.32), cz = lerp(P[k0 * 2 + 1], mz, 0.32), s = 0.3, y0 = topY - 0.2, y1 = y + 0.75, bc = [0.40, 0.25, 0.20];
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const tx = -nz, tz = nx; face(Rf, [cx + nx * s - tx * s, y0, cz + nz * s - tz * s, cx + nx * s + tx * s, y0, cz + nz * s + tz * s, cx + nx * s - tx * s, y1, cz + nz * s - tz * s, cx + nx * s + tx * s, y1, cz + nz * s + tz * s], [0, 0, 0.3, 0, 0, 1.2, 0.3, 1.2], bc, _out.set(nx, 0, nz)); }
    face(Rf, [cx - s, y1, cz - s, cx + s, y1, cz - s, cx - s, y1, cz + s, cx + s, y1, cz + s], [0, 0, 0.1, 0, 0, 0.1, 0.1, 0.1], [0.2, 0.19, 0.18], _up);
  }
  // soffit: close the gap under the eaves
  const e = insetRing(P, -0.45), ey = topY - 0.45 * pitch;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; face(Rf, [P[i * 2], ey, P[i * 2 + 1], P[j * 2], ey, P[j * 2 + 1], e[i * 2], ey, e[i * 2 + 1], e[j * 2], ey, e[j * 2 + 1]], [0, 0, 0.05, 0, 0, 0.05, 0.05, 0.05], [wc[0] * 0.8, wc[1] * 0.8, wc[2] * 0.8], _out.set(0, -1, 0)); }
}
function indexBuildings() {
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
    const W = new Buf(), Rf = new Buf(); for (const b of best.list) addBuilding(b, W, Rf);
    const g = new THREE.Group(); g.matrixAutoUpdate = false; for (const [bf, mat] of [[W, wallMat], [Rf, roofMat]]) { const geo = bf.geo(); if (!geo) continue; const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; g.add(m); }
    best.group = g; scene.add(g); built++; best = null;
    { bd = 1e9; for (let tx = Math.floor((cx - R) / BT); tx <= Math.floor((cx + R) / BT); tx++) for (let tz = Math.floor((cz - R) / BT); tz <= Math.floor((cz + R) / BT); tz++) { const t = bldTiles.get(tx * 4096 + tz); if (!t || t.group) continue; const d = Math.hypot((tx + 0.5) * BT - cx, (tz + 0.5) * BT - cz); if (d < R && d < bd) { bd = d; best = t; best.tx = tx; best.tz = tz; } } }
  }
  for (const t of bldTiles.values()) if (t.group && Math.hypot((t.tx + 0.5) * BT - cx, (t.tz + 0.5) * BT - cz) > R + 500) { scene.remove(t.group); t.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); t.group = null; }
}
