/* ---------- lifts: real alignments and tower positions from OpenStreetMap ---------- */
class GeoBag { // merges small parts into one vertex-coloured geometry
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  add(geo, m, col, uvs) {
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(m); const P = g.attributes.position.array, Nn = g.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) { this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(Nn[i], Nn[i + 1], Nn[i + 2]); this.c.push(col[0], col[1], col[2]); if (uvs) this.u.push(0, 0); }
    g.dispose(); if (g !== geo) geo.dispose(); return this;
  }
  box(w, h, d, x, y, z, col, ry = 0, rx = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), _gm.compose(_gp.set(x, y, z), _gq.setFromEuler(_ge.set(rx, ry, rz, "YXZ")), _gs.set(1, 1, 1)), col); }
  cyl(r0, r1, h, x, y, z, col, seg = 8, rx = 0, rz = 0, ry = 0) { return this.add(new THREE.CylinderGeometry(r0, r1, h, seg), _gm.compose(_gp.set(x, y, z), _gq.setFromEuler(_ge.set(rx, ry, rz, "YXZ")), _gs.set(1, 1, 1)), col); }
  build() { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); if (this.u.length) g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2)); return g; }
}
const _gm = new THREE.Matrix4(), _gp = new THREE.Vector3(), _gq = new THREE.Quaternion(), _ge = new THREE.Euler(), _gs = new THREE.Vector3();
const STEEL = [0.20, 0.22, 0.24], DARK = [0.045, 0.05, 0.055], PAD = [0.07, 0.075, 0.085], GLASS = [0.03, 0.045, 0.06];
const LT = { // per lift type: rope height at towers and stations, rope gauge, hanger drop to the seat / cabin floor
  chair_det: { tower: 11, station: 4.1, gauge: 5.2, drop: 3.05, sag: 0.012 }, chair_fixed: { tower: 9.5, station: 4.1, gauge: 4.4, drop: 3.05, sag: 0.012 },
  gondola: { tower: 13, station: 5.2, gauge: 5.6, drop: 4.4, sag: 0.012 }, funitel: { tower: 15, station: 6.2, gauge: 9.5, drop: 4.9, sag: 0.014 },
  tram: { tower: 38, station: 9, gauge: 9, drop: 7.6, sag: 0.04 }, carpet: { tower: 0, station: 0.02, gauge: 0, drop: 0, sag: 0 }
};
const liftMat = worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35 }));
const ropeMat = worldShade(new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.5, metalness: 0.6 }));
const LIFTS = [], towerHits = [];
function chairGeometry(occ, bubble) {
  const b = new GeoBag(), w = Math.max(1.1, occ * 0.56), y = -3.05;
  b.box(0.36, 0.2, 0.5, 0, 0, 0, DARK);                                   // grip
  b.cyl(0.045, 0.045, 0.9, 0, -0.45, 0, STEEL, 6);
  b.cyl(0.045, 0.045, 1.7, 0, -1.55, -0.33, STEEL, 6, -0.42);                // hanger sweeps back over the riders
  b.cyl(0.04, 0.04, w, 0, -2.3, -0.66, STEEL, 6, 0, Math.PI / 2);
  for (const sx of [-1, 1]) { b.cyl(0.035, 0.035, 0.95, sx * w / 2, -2.72, -0.6, STEEL, 6, 0.14); b.cyl(0.03, 0.03, 0.55, sx * w / 2, y - 0.02, -0.28, STEEL, 6, Math.PI / 2); }
  b.box(w, 0.07, 0.5, 0, y, -0.22, PAD); b.box(w, 0.5, 0.06, 0, y + 0.3, -0.5, PAD, 0, 0.16);
  b.cyl(0.022, 0.022, w + 0.1, 0, -2.25, 0.2, STEEL, 5, 0, Math.PI / 2);   // restraint bar, raised
  for (const sx of [-1, 1]) b.cyl(0.022, 0.022, 0.9, sx * (w / 2 + 0.03), -2.3, -0.24, STEEL, 5, Math.PI / 2 - 0.1);
  return b.build();
}
function cabinGeometry(w, h, d, drop, twin, body = [0.62, 0.64, 0.67], cap = [0.72, 0.74, 0.77]) {
  const b = new GeoBag(), y = -drop + h / 2;
  if (twin) for (const sx of [-1, 1]) { b.box(0.4, 0.22, 0.6, sx * twin, 0, 0, DARK); b.cyl(0.06, 0.06, drop - h + 0.1, sx * twin * 0.55, -(drop - h) / 2, 0, STEEL, 6, 0, sx * 0.25); }
  else { b.box(0.4, 0.22, 0.6, 0, 0, 0, DARK); b.cyl(0.07, 0.07, drop - h + 0.1, 0, -(drop - h) / 2, 0, STEEL, 6); }
  b.box(w, h * 0.34, d, 0, y - h * 0.33, 0, body); b.box(w - 0.04, h * 0.44, d - 0.04, 0, y + h * 0.06, 0, GLASS); b.box(w + 0.06, h * 0.22, d + 0.06, 0, y + h * 0.39, 0, cap);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, h * 0.46, 0.08, sx * (w / 2 - 0.02), y + h * 0.06, sz * (d / 2 - 0.02), [0.55, 0.57, 0.6]);
  b.box(w * 0.9, 0.12, d * 0.9, 0, y + h * 0.55, 0, [0.9, 0.92, 0.95]);   // snow on the roof
  return b.build();
}
function buildLift(l, id) {
  const T = LT[l.t], P = l.pts, n = P.length, L = { id, name: l.n, type: l.t, occ: l.occ, v: l.v, T, nodes: [], carpet: l.t === "carpet" };
  for (let i = 0; i < n; i++) { const g = Hsmooth(P[i][0], P[i][1]); L.nodes.push({ x: P[i][0], z: P[i][1], g, y: g + (i === 0 || i === n - 1 ? T.station : T.tower), st: i === 0 || i === n - 1 }); }
  if (!L.carpet) for (let it = 0; it < 6; it++) for (let i = 0; i < n - 1; i++) { // raise towers until the carriers clear the snow along every span
    const a = L.nodes[i], b = L.nodes[i + 1], span = Math.hypot(b.x - a.x, b.z - a.z); let nb = 0, na = 0, both = 0;
    for (let k = 1; k < 14; k++) {
      const u = k / 14, y = lerp(a.y, b.y, u) - T.sag * span * 4 * u * (1 - u), gy = Hsmooth(lerp(a.x, b.x, u), lerp(a.z, b.z, u)), def = T.drop + 3.4 - (y - gy); if (def <= 0) continue;
      if (a.st && !b.st) { if (u > 0.1) nb = Math.max(nb, def / u); else na = Math.max(na, def); } else if (b.st && !a.st) { if (u < 0.9) na = Math.max(na, def / (1 - u)); else nb = Math.max(nb, def); } else both = Math.max(both, def);
    }
    a.y += Math.min(28, na + both); b.y += Math.min(28, nb + both);
  }
  // dense centreline samples for O(1) lookup
  const S = [0]; for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(L.nodes[i].x - L.nodes[i - 1].x, L.nodes[i].z - L.nodes[i - 1].z));
  L.len = S[n - 1]; L.S = S; const ds = 3, ns = Math.ceil(L.len / ds) + 1; L.ds = L.len / (ns - 1); L.ns = ns; L.px = new Float32Array(ns); L.py = new Float32Array(ns); L.pz = new Float32Array(ns); L.rx = new Float32Array(ns); L.rz = new Float32Array(ns);
  let seg = 0;
  for (let k = 0; k < ns; k++) {
    const s = k * L.ds; while (seg < n - 2 && s > S[seg + 1]) seg++;
    const a = L.nodes[seg], b = L.nodes[seg + 1], span = S[seg + 1] - S[seg], u = clamp((s - S[seg]) / span, 0, 1), dx = (b.x - a.x) / span, dz = (b.z - a.z) / span;
    L.px[k] = lerp(a.x, b.x, u); L.pz[k] = lerp(a.z, b.z, u); L.py[k] = L.carpet ? Hsmooth(L.px[k], L.pz[k]) + 0.12 : lerp(a.y, b.y, u) - T.sag * span * 4 * u * (1 - u); L.rx[k] = -dz; L.rz[k] = dx;
  }
  L.bot = L.nodes[0]; L.top = L.nodes[n - 1]; L.dir = Math.atan2(L.top.x - L.bot.x, L.top.z - L.bot.z);
  L.cx = (L.bot.x + L.top.x) / 2; L.cz = (L.bot.z + L.top.z) / 2; L.cy = (L.bot.y + L.top.y) / 2;
  const sphere = new THREE.Sphere(new THREE.Vector3(L.cx, L.cy, L.cz), Math.hypot(L.len, L.top.y - L.bot.y) / 2 + 60);
  // carriers
  if (L.type === "tram") { L.count = 2; L.spacing = L.len; }
  else { const sp = clamp(l.v * 3600 / l.cap * l.occ, L.carpet ? 1e9 : 9, 260); L.count = L.carpet ? 0 : Math.max(2, Math.round(2 * L.len / sp)); L.spacing = 2 * L.len / Math.max(1, L.count); }
  if (L.count) {
    const geo = L.type.startsWith("chair") ? chairGeometry(l.occ) : L.type === "gondola" ? cabinGeometry(1.9, 2.1, 2.1, T.drop, 0, [0.05, 0.08, 0.15], [0.07, 0.10, 0.18]) : L.type === "funitel" ? cabinGeometry(2.4, 2.3, 3.4, T.drop, 1.6, [0.08, 0.2, 0.42], [0.75, 0.77, 0.8]) : cabinGeometry(3.4, 2.9, 6.6, T.drop, 0, [0.5, 0.05, 0.045], [0.5, 0.05, 0.045]);
    L.mesh = new THREE.InstancedMesh(geo, liftMat, L.count); L.mesh.castShadow = true; L.mesh.receiveShadow = true; L.mesh.boundingSphere = sphere; scene.add(L.mesh);
  }
  // towers, ropes, stations in one static mesh
  const b = new GeoBag(), half = T.gauge / 2;
  for (let i = 0; i < n; i++) {
    const nd = L.nodes[i], pa = L.nodes[Math.max(0, i - 1)], pb = L.nodes[Math.min(n - 1, i + 1)], yaw = Math.atan2(pb.x - pa.x, pb.z - pa.z), cs = Math.cos(yaw), sn = Math.sin(yaw), rx = cs, rz = -sn;
    const at = (lx, ly, lz) => [nd.x + rx * lx + sn * lz, ly, nd.z + rz * lx + cs * lz];
    if (L.carpet) continue;
    if (!nd.st) {
      const ht = nd.y - nd.g;
      if (L.type === "tram") { for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = at(sx * 3.4, nd.g + ht / 2 - 1, sz * 3.4); b.cyl(0.22, 0.42, ht + 2, p[0], p[1], p[2], STEEL, 6, sz * 0.085, -sx * 0.085, yaw); } const p = at(0, nd.y + 0.5, 0); b.box(T.gauge + 3, 0.7, 3.2, p[0], p[1], p[2], STEEL, yaw); for (let k = 1; k < 5; k++) { const q = at(0, nd.g + ht * k / 5, 0), w = lerp(7.2, 1.6, k / 5); b.box(w, 0.16, w, q[0], q[1], q[2], STEEL, yaw); } }
      else {
        b.cyl(0.26, 0.46, ht + 2.2, nd.x, nd.g + ht / 2 - 0.9, nd.z, STEEL, 10);
        const p = at(0, nd.y + 0.42, 0); b.box(T.gauge + 1.4, 0.34, 0.42, p[0], p[1], p[2], STEEL, yaw);
        for (const sx of [-1, 1]) { const q = at(sx * half, nd.y + 0.2, 0); b.box(0.32, 0.26, 3.0, q[0], q[1], q[2], DARK, yaw); for (const sz of [-1.1, -0.37, 0.37, 1.1]) { const w = at(sx * half, nd.y + 0.02, sz); b.cyl(0.19, 0.19, 0.1, w[0], w[1], w[2], DARK, 8, 0, Math.PI / 2, yaw); } }
        const q = at(0, nd.y + 1.2, 0); b.box(T.gauge + 0.6, 0.08, 0.08, q[0], q[1], q[2], STEEL, yaw); b.box(0.5, 0.1, 0.5, nd.x, nd.y + 0.72, nd.z, [0.9, 0.92, 0.95], yaw);
      }
      towerHits.push({ x: nd.x, z: nd.z, r: L.type === "tram" ? 4.2 : 0.75 });
    } else {
      const sgn = i === 0 ? 1 : -1, col = L.type === "chair_fixed" ? [0.16, 0.2, 0.18] : [0.13, 0.16, 0.2];
      if (L.type === "tram" || L.type === "funitel" || L.type === "gondola") { const len = L.type === "tram" ? 18 : 24, hgt = T.station + 3.5, p = at(0, nd.g + hgt / 2 - 1, -sgn * 3); b.box(T.gauge + 6, hgt + 2, len, p[0], p[1], p[2], [0.28, 0.27, 0.26], yaw); const r = at(0, nd.g + hgt + 0.3, -sgn * 3); b.box(T.gauge + 6.6, 0.5, len + 0.6, r[0], r[1], r[2], [0.9, 0.92, 0.95], yaw); }
      else if (L.type === "chair_det") { // detachable terminal: a long rounded shed over the rope, on two columns
        const W = T.gauge + 2.4, zc = -sgn * 4.5, body = [0.70, 0.72, 0.74], band = [0.05, 0.065, 0.085], roof = [0.9, 0.92, 0.95];
        const part = (w, h, len, y, c) => { const p = at(0, y, zc); b.box(w, h, len, p[0], p[1], p[2], c, yaw); for (const e of [-1, 1]) { const q = at(0, y, zc + e * len / 2); b.cyl(w / 2, w / 2, h, q[0], q[1], q[2], c, 14); } };
        part(W, 0.9, 13, nd.y + 0.6, body); part(W + 0.08, 0.75, 13, nd.y + 1.4, band); part(W, 0.5, 13, nd.y + 2.0, body); part(W - 0.5, 0.3, 12.6, nd.y + 2.4, roof);
        const st = at(0, nd.y + 1.4, zc); b.box(W + 0.14, 0.75, 1.4, st[0], st[1], st[2], col, yaw);
        for (const sz of [-4, 4.5]) { const q = at(0, nd.g + (nd.y - nd.g) / 2 - 0.5, zc + sz); b.cyl(0.42, 0.5, nd.y - nd.g + 1.4, q[0], q[1], q[2], STEEL, 10); towerHits.push({ x: q[0], z: q[2], r: 0.9 }); }
        const h = at(sgn > 0 ? 6.4 : -6.4, nd.g + 1.4, -sgn * 1.5); b.box(3, 2.8, 3.4, h[0], h[1], h[2], [0.30, 0.24, 0.18], yaw); const hr = at(sgn > 0 ? 6.4 : -6.4, nd.g + 3.0, -sgn * 1.5); b.box(3.5, 0.45, 3.9, hr[0], hr[1], hr[2], roof, yaw); towerHits.push({ x: h[0], z: h[2], r: 2.3 });
      } else {
        const q = at(0, nd.g + (nd.y - nd.g) / 2, -sgn * 2.2); b.cyl(0.3, 0.42, nd.y - nd.g + 1.4, q[0], q[1], q[2], STEEL, 10); towerHits.push({ x: q[0], z: q[2], r: 0.8 });
        const w = at(0, nd.y + 0.1, -sgn * 0.4); b.cyl(half, half, 0.16, w[0], w[1], w[2], DARK, 20); const f = at(0, nd.y + 0.45, -sgn * 1.4); b.box(1.0, 0.5, 4.4, f[0], f[1], f[2], col, yaw);
        const h = at(sgn > 0 ? 5.2 : -5.2, nd.g + 1.4, -sgn * 1.5); b.box(3, 2.8, 3.4, h[0], h[1], h[2], [0.32, 0.25, 0.19], yaw); const hr = at(sgn > 0 ? 5.2 : -5.2, nd.g + 3.0, -sgn * 1.5); b.box(3.5, 0.45, 3.9, hr[0], hr[1], hr[2], [0.9, 0.92, 0.95], yaw); towerHits.push({ x: h[0], z: h[2], r: 2.3 });
      }
    }
  }
  if (L.carpet) { // belt with low side walls
    for (let k = 0; k < ns - 1; k++) { const x = (L.px[k] + L.px[k + 1]) / 2, y = (L.py[k] + L.py[k + 1]) / 2, z = (L.pz[k] + L.pz[k + 1]) / 2, pit = Math.atan2(L.py[k + 1] - L.py[k], L.ds); b.box(0.9, 0.06, L.ds + 0.05, x, y - 0.03, z, DARK, L.dir, -pit); for (const sx of [-1, 1]) b.box(0.06, 0.34, L.ds + 0.05, x + L.rx[k] * sx * 0.55, y + 0.12, z + L.rz[k] * sx * 0.55, [0.25, 0.42, 0.62], L.dir, -pit); }
  } else {
    const offs = L.type === "funitel" ? [half - 1.6, half + 1.6, -half - 1.6, -half + 1.6] : L.type === "tram" ? [half - 0.5, half + 0.5, -half - 0.5, -half + 0.5] : [half, -half], rr = L.type === "tram" ? 0.045 : 0.03;
    for (const o of offs) for (let k = 0; k < ns - 1; k += 2) {
      const k2 = Math.min(ns - 1, k + 2), ax = L.px[k] + L.rx[k] * o, az = L.pz[k] + L.rz[k] * o, bx = L.px[k2] + L.rx[k2] * o, bz = L.pz[k2] + L.rz[k2] * o, dy = L.py[k2] - L.py[k], len = Math.hypot(bx - ax, dy, bz - az);
      b.add(new THREE.CylinderGeometry(rr, rr, len, 3, 1, true), _gm.compose(_gp.set((ax + bx) / 2, (L.py[k] + L.py[k2]) / 2, (az + bz) / 2), _gq.setFromEuler(_ge.set(Math.PI / 2 - Math.atan2(dy, Math.hypot(bx - ax, bz - az)), Math.atan2(bx - ax, bz - az), 0, "YXZ")), _gs.set(1, 1, 1)), DARK);
    }
  }
  const sm = new THREE.Mesh(b.build(), liftMat); sm.castShadow = true; sm.receiveShadow = true; sm.geometry.boundingSphere = sphere; sm.matrixAutoUpdate = false; scene.add(sm);
  L.phase = hash2(id, 7, 9) * 100;
  return L;
}
function initLifts() { WORLD.lifts.forEach((l, i) => LIFTS.push(buildLift(l, i))); }
/* rope point at distance s from the bottom station; side +1 is the uphill rope */
function liftPoint(L, s, side, out) {
  const f = clamp(s / L.ds, 0, L.ns - 1.0001), k = f | 0, u = f - k, o = side * L.T.gauge / 2;
  return out.set(lerp(L.px[k], L.px[k + 1], u) + L.rx[k] * o, lerp(L.py[k], L.py[k + 1], u), lerp(L.pz[k], L.pz[k + 1], u) + L.rz[k] * o);
}
/* where carrier k is at lift time t: {s, side}. Trams shuttle with a dwell at each end; everything else circulates. */
const TRAM_DWELL = 25;
function carrierAt(L, k, t, o) {
  if (L.type === "tram") {
    const run = L.len / L.v + 8, cyc = 2 * (run + TRAM_DWELL), ph = ((t % cyc) + cyc) % cyc; let u;
    if (ph < TRAM_DWELL) u = 0; else if (ph < TRAM_DWELL + run) u = smooth((ph - TRAM_DWELL) / run); else if (ph < 2 * TRAM_DWELL + run) u = 1; else u = 1 - smooth((ph - 2 * TRAM_DWELL - run) / run);
    o.s = (k === 0 ? u : 1 - u) * L.len; o.side = k === 0 ? 1 : -1; o.docked = k === 0 ? (u === 0 ? -1 : u === 1 ? 1 : 0) : (u === 1 ? -1 : u === 0 ? 1 : 0); return o;
  }
  const loop = 2 * L.len, u = (((k * L.spacing + (t + L.phase) * L.v) % loop) + loop) % loop;
  if (u < L.len) { o.s = u; o.side = 1; } else { o.s = loop - u; o.side = -1; } o.docked = 0; return o;
}
let liftTime = 0; const _co = { s: 0, side: 1, docked: 0 }, _lp = new THREE.Vector3(), _lm = new THREE.Matrix4(), _lq = new THREE.Quaternion(), _ls = new THREE.Vector3(1, 1, 1);
function updateLifts(dt, cam, frame) {
  liftTime += dt;
  for (const L of LIFTS) {
    if (!L.mesh) continue;
    const dl = Math.hypot(L.cx - cam.x, L.cz - cam.z) - L.len / 2, far = dl > 2600; L.mesh.castShadow = dl < Q.shadowR + 60; if (far && (frame + L.id) % 6) continue;
    for (let k = 0; k < L.count; k++) {
      carrierAt(L, k, liftTime, _co); liftPoint(L, _co.s, _co.side, _lp);
      _lq.setFromAxisAngle(_up, L.dir + (_co.side < 0 ? Math.PI : 0)); _lm.compose(_lp, _lq, _ls); L.mesh.setMatrixAt(k, _lm);
    }
    L.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- buildings: OSM footprints extruded, snow on every roof ---------- */
const BLD_GRID = new Map(); let bldMat = null; const uLamp = { value: 0 };
function polyBox(P) { // tightest box aligned with one of the outline's edges: {ux, uz, cu, cv, hu, hv, area} with u the long axis
  let best = null;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const q of P) { const u = q[0] * ux + q[1] * uz, v = -q[0] * uz + q[1] * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0); if (!best || area < best.area) best = u1 - u0 >= v1 - v0 ? { ux, uz, cu: (u0 + u1) / 2, cv: (v0 + v1) / 2, hu: (u1 - u0) / 2, hv: (v1 - v0) / 2, area } : { ux: -uz, uz: ux, cu: (v0 + v1) / 2, cv: -(u0 + u1) / 2, hu: (v1 - v0) / 2, hv: (u1 - u0) / 2, area }; }
  return best;
}
function polyArea(P) { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return Math.abs(a) / 2; }
function initBuildings() {
  const pos = [], nor = [], col = [], uv = [];
  const WALLS = [[0.44, 0.36, 0.28], [0.30, 0.25, 0.21], [0.50, 0.47, 0.42], [0.36, 0.30, 0.25], [0.26, 0.28, 0.30], [0.42, 0.33, 0.24]];
  WORLD.blds = WORLD.blds.filter(bd => !/lifthouse|lift base|express base|funitel base|venture base|exhibition base|silverado base|lady base|chair base|shirley/i.test(bd.n || ""));
  WORLD.blds.forEach((bd, bi) => {
    const P = bd.p, n = P.length; let lo = 1e9, hi = -1e9, cx = 0, cz = 0;
    for (const q of P) { const g = Hsmooth(q[0], q[1]); lo = Math.min(lo, g); hi = Math.max(hi, g); cx += q[0] / n; cz += q[1] / n; }
    const top = hi + bd.h, wc = WALLS[bi % WALLS.length], sn = [0.9, 0.92, 0.95]; let per = 0;
    const bx = polyBox(P), gable = bx && polyArea(P) / bx.area > 0.76 && bx.hv * 2 < 26 && bd.h < 15;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez), nx = -ez / len, nz = ex / len;
      const quad = (y0, y1, c, o, u0, u1, v0, v1) => { const ax = a[0] + nx * o, az = a[1] + nz * o, bx = b[0] + nx * o, bz = b[1] + nz * o; pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az); for (let k = 0; k < 6; k++) { nor.push(nx, 0, nz); col.push(...c); } uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); };
      quad(lo - 1.5, top, wc, 0, per, per + len, lo - hi, bd.h); if (!gable) quad(top, top + 0.55, sn, 0.3, 0, 0, -9, -9); per += len;
    }
    if (gable) { // pitched roof under a slab of snow, ridge along the long side
      const { ux, uz, cu, cv, hu, hv } = bx, rh = hv * 0.62, ov = 0.7, W = (u, v, y) => [u * ux - v * uz, y, u * uz + v * ux];
      const tri = (a, b, c, cc) => { const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n) || 1; if (n[1] < 0) n = n.map(q => -q); for (const q of [a, b, c]) { pos.push(...q); nor.push(n[0] / l, n[1] / l, n[2] / l); col.push(...cc); uv.push(0, -9); } };
      for (const sv of [-1, 1]) { const e0 = W(cu - hu - ov, cv + sv * (hv + ov), top - 0.25), e1 = W(cu + hu + ov, cv + sv * (hv + ov), top - 0.25), r0 = W(cu - hu - ov, cv, top + rh + 0.45), r1 = W(cu + hu + ov, cv, top + rh + 0.45); tri(e0, e1, r1, sn); tri(e0, r1, r0, sn); }
      for (const su of [-1, 1]) tri(W(cu + su * hu, cv - hv, top), W(cu + su * hu, cv + hv, top), W(cu + su * hu, cv, top + rh), wc);
    } else {
      const tris = THREE.ShapeUtils.triangulateShape(P.map(q => new THREE.Vector2(q[0], q[1])), []);
      for (const t of tris) for (const k of [t[0], t[2], t[1]]) { pos.push(P[k][0], top + 0.55, P[k][1]); nor.push(0, 1, 0); col.push(...sn); uv.push(0, -9); }
    }
    bd.cx = cx; bd.cz = cz; bd.top = top;
    const key = Math.floor(cx / 60) + "," + Math.floor(cz / 60); if (!BLD_GRID.has(key)) BLD_GRID.set(key, []); BLD_GRID.get(key).push(bd);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  bldMat = worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), {
    patch(sh) {
      sh.uniforms.uLamp = uLamp;
      sh.fragmentShader = "uniform float uLamp; float bWin = 0.0; float bLit = 0.0;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        { vec2 w = vUv / vec2(2.6, 3.0); vec2 f = fract(w); float up = step(0.4, vUv.y) * step(-8.0, vUv.y);
          bWin = step(0.30, f.x) * step(f.x, 0.70) * step(0.36, f.y) * step(f.y, 0.78) * up * step(0.18, texture2D(uNoise, (floor(w) + 0.5) / 256.0 + 0.37, -8.0).g);
          bLit = bWin * step(0.62, texture2D(uNoise, (floor(w) + 0.5) / 256.0, -8.0).r);
          diffuseColor.rgb = mix(diffuseColor.rgb * (0.9 + 0.2 * texture2D(uNoise, vWp.xz * 0.05 + vWp.y * 0.07).r), vec3(0.05, 0.07, 0.10), bWin);
          diffuseColor.rgb *= 1.0 - 0.25 * step(-8.0, vUv.y) * step(fract(vUv.y / 3.0), 0.05); }`)
        .replace("#include <roughnessmap_fragment>", "float roughnessFactor = mix(roughness, 0.06, bWin);").replace("#include <metalnessmap_fragment>", "float metalnessFactor = bWin * 0.9;")
        .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance += vec3(1.0, 0.62, 0.28) * bLit * uLamp;");
    }
  });
  bldMat.defines = { USE_UV: "" };
  const m = new THREE.Mesh(g, bldMat); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
}
function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; }
function buildingAt(x, z) {
  const gx = Math.floor(x / 60), gz = Math.floor(z / 60);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = BLD_GRID.get((gx + a) + "," + (gz + b)); if (l) for (const bd of l) if (inPoly(bd.p, x, z)) return bd; }
  return null;
}

/* ---------- parked cars, trail signs and other skiers: the things every photo of the place has ---------- */
function initCars() {
  const b = new GeoBag(); b.box(1.85, 0.72, 4.4, 0, 0.62, 0, [1, 1, 1]); b.box(1.68, 0.56, 2.3, 0, 1.24, -0.2, [0.12, 0.14, 0.17]); b.box(1.7, 0.1, 2.3, 0, 1.56, -0.2, [1.6, 1.6, 1.6]);
  for (const sx of [-1, 1]) for (const sz of [-1.35, 1.35]) b.cyl(0.33, 0.33, 0.24, sx * 0.86, 0.33, sz, [0.05, 0.05, 0.05], 8, 0, Math.PI / 2);
  const geo = b.build(), spots = [], PAL = [0xe8eaed, 0xc9ccd1, 0x14161a, 0x55595f, 0x1f3f6e, 0x8a1a1c, 0x2b3f34, 0x7d8288, 0xf2f2f2, 0x3a3d42];
  for (const P of WORLD.parks || []) {
    const bx = polyBox(P); if (!bx) continue; const { ux, uz, cu, cv, hu, hv } = bx;
    for (let v = -hv + 3; v < hv - 2; v += 17.6) for (const row of [0, 5.3]) for (let u = -hu + 2; u < hu - 2; u += 2.75) {
      const x = (cu + u) * ux - (cv + v + row) * uz, z = (cu + u) * uz + (cv + v + row) * ux, hsh = hash2(Math.round(x * 3), Math.round(z * 3), 61); if (hsh > 0.72 || !inPoly(P, x, z) || buildingAt(x, z)) continue;
      spots.push([x, Hsmooth(x, z), z, Math.atan2(ux, uz) + Math.PI / 2 + (row ? Math.PI : 0), PAL[Math.floor(hsh * 139) % PAL.length]]); if (spots.length >= 4000) break;
    }
  }
  if (!spots.length) return; const m = new THREE.InstancedMesh(geo, liftMat, spots.length), c = new THREE.Color();
  spots.forEach((q, i) => { _lq.setFromAxisAngle(_up, q[3]); _lm.compose(_lp.set(q[0], q[1], q[2]), _lq, _ls); m.setMatrixAt(i, _lm); m.setColorAt(i, c.setHex(q[4])); });
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
}
const signs = [];
function initSigns() { // a board at the top of every named run, the way the resort marks them
  const seen = new Set(), postB = new GeoBag(), COL = ["#1f8f4d", "#1c5fc4", "#0b0b0c", "#0b0b0c"], back = worldShade(new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.8 })), pg = new THREE.PlaneGeometry(2.6, 0.62);
  for (const r of WORLD.runs) {
    if (!r.n || seen.has(r.n) || r.pts.length < 2) continue; seen.add(r.n);
    const a = r.pts[0], b = r.pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l, off = [46, 42, 30, 18][r.d] * 0.5 + 2.5;
    const x = a[0] + dx * 12 - dz * off, z = a[1] + dz * 12 + dx * off; if (!inWorld(x, z, 240)) continue; const y = H(x, z), yaw = Math.atan2(-dx, -dz);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 122; const g = cv.getContext("2d"); g.fillStyle = COL[r.d]; g.fillRect(0, 0, 512, 122); g.strokeStyle = "#fff"; g.lineWidth = 6; g.strokeRect(5, 5, 502, 112);
    g.fillStyle = "#fff"; g.textBaseline = "middle"; const sym = r.d === 0 ? "●" : r.d === 1 ? "■" : r.d === 2 ? "◆" : "◆◆"; g.font = "700 54px system-ui, sans-serif"; g.fillText(sym, 22, 63); const sw = g.measureText(sym).width + 40;
    let fs = 58; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', sans-serif"; while (g.measureText(r.n.toUpperCase()).width > 490 - sw && fs > 24) { fs -= 3; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', sans-serif"; } g.fillText(r.n.toUpperCase(), sw, 64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const board = new THREE.Mesh(pg, worldShade(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))); board.position.set(x, y + 2.75, z); board.rotation.y = yaw; board.visible = false; scene.add(board);
    const bk = new THREE.Mesh(pg, back); bk.position.set(x - Math.sin(yaw) * 0.03, y + 2.75, z - Math.cos(yaw) * 0.03); bk.rotation.y = yaw + Math.PI; bk.visible = false; scene.add(bk); signs.push([board, bk, x, z]);
    for (const sd of [-1, 1]) { const px = x + Math.cos(yaw) * sd * 1.15, pz = z - Math.sin(yaw) * sd * 1.15; postB.cyl(0.05, 0.05, 3.6, px, y + 1.4, pz, [0.3, 0.22, 0.14], 6); towerHits.push({ x: px, z: pz, r: 0.12 }); }
  }
  const pm = new THREE.Mesh(postB.build(), liftMat); pm.castShadow = true; pm.frustumCulled = false; scene.add(pm);
}
const NPC_N = 120, npcs = []; let npcMesh = null, npcRuns = [];
function initNPCs() {
  npcRuns = WORLD.runs.filter(r => r.g && r.len > 300).map(r => { const S = [0]; for (let i = 1; i < r.pts.length; i++) S.push(S[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1])); return { r, S, len: S[S.length - 1] }; });
  if (!npcRuns.length) return; const tot = npcRuns.reduce((a, q) => a + q.len, 0);
  const b = new GeoBag(), W = [1, 1, 1], D = [0.1, 0.11, 0.13];
  for (const sx of [-1, 1]) { b.box(0.15, 0.78, 0.17, sx * 0.14, 0.5, 0, D, 0, 0.18); b.box(0.095, 0.03, 1.6, sx * 0.15, 0.03, 0.05, [0.08, 0.08, 0.09]); b.box(0.11, 0.5, 0.12, sx * 0.3, 1.18, 0.12, W, 0, -0.5, sx * 0.25); }
  b.cyl(0.2, 0.19, 0.62, 0, 1.2, 0.05, W, 10, 0.22); b.add(new THREE.SphereGeometry(0.125, 10, 8), _gm.makeTranslation(0, 1.68, 0.14), [0.1, 0.1, 0.12]);
  npcMesh = new THREE.InstancedMesh(b.build(), worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })), NPC_N); npcMesh.castShadow = true; npcMesh.frustumCulled = false; scene.add(npcMesh);
  const JK = [0xd8362b, 0x1f6fd6, 0xf2b61b, 0x2a9d62, 0x8a4fd1, 0xe86a1c, 0x1b1e24, 0xe9edf2, 0x16a3a3, 0xd9438c], c = new THREE.Color();
  for (let i = 0; i < NPC_N; i++) { let t = hash2(i, 3, 71) * tot, k = 0; while (k < npcRuns.length - 1 && t > npcRuns[k].len) t -= npcRuns[k++].len; npcs.push({ k, s: t, v: 6 + 7 * hash2(i, 5, 72), ph: hash2(i, 7, 73) * TAU, lam: 28 + 34 * hash2(i, 9, 74), seg: 0 }); npcMesh.setColorAt(i, c.setHex(JK[i % JK.length])); }
}
const _ne = new THREE.Euler();
let signT = 0;
function updateNPCs(dt, cam) {
  signT -= dt; if (signT <= 0) { signT = 0.5; for (const q of signs) q[0].visible = q[1].visible = Math.abs(q[2] - cam.x) + Math.abs(q[3] - cam.z) < 700; }
  if (!npcMesh) return;
  for (let i = 0; i < NPC_N; i++) {
    const n = npcs[i]; let q = npcRuns[n.k]; n.s += n.v * dt;
    if (n.s >= q.len - 2) { n.k = Math.floor(hash2(i, (n.k + 1) * 7 + Math.floor(liftTime), 75) * npcRuns.length) % npcRuns.length; q = npcRuns[n.k]; n.s = 2; n.seg = 0; }
    while (n.seg < q.S.length - 2 && n.s > q.S[n.seg + 1]) n.seg++; while (n.seg > 0 && n.s < q.S[n.seg]) n.seg--;
    const a = q.r.pts[n.seg], b = q.r.pts[n.seg + 1], sl = q.S[n.seg + 1] - q.S[n.seg] || 1, u = (n.s - q.S[n.seg]) / sl, dx = (b[0] - a[0]) / sl, dz = (b[1] - a[1]) / sl;
    const amp = [46, 42, 30, 18][q.r.d] * 0.28, w = TAU / n.lam, sw = Math.sin(n.ph + n.s * w), cw = Math.cos(n.ph + n.s * w), x = lerp(a[0], b[0], u) - dz * amp * sw, z = lerp(a[1], b[1], u) + dx * amp * sw;
    if (Math.abs(x - cam.x) + Math.abs(z - cam.z) > 1800) { _lm.makeScale(0, 0, 0); npcMesh.setMatrixAt(i, _lm); continue; }
    const yaw = Math.atan2(dx, dz) - Math.atan(amp * w * cw) * 0.8; _lq.setFromEuler(_ne.set(0, yaw, -cw * 0.38, "YXZ")); _lm.compose(_lp.set(x, H(x, z), z), _lq, _ls); npcMesh.setMatrixAt(i, _lm);
  }
  npcMesh.instanceMatrix.needsUpdate = true;
}
