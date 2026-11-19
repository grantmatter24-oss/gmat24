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
const LIFTS = [], towerHits = [], liftSigns = [];
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
/* ---------- lift stations ----------
   Each terminal is modelled on the kind of lift it is and stands on its own graded pad; every part reaches the ground or is carried by one that does.
   - Detachable chairs: the long enclosed terminal over the rope, on central masts, with the bullwheel and tyre banks inside. Doppelmayr UNI terminals
     (KT-22, Gold Coast, Shirley Lake, Summit, Sherwood) are round-ended capsules with a window band; Leitner-Poma (Siberia, Big Blue, Red Dog, Treeline
     Cirque) and Garaventa CTEC (Headwall, Wa She Shu, Far East, Roundhouse) terminals are square-cut with a tapered nose.
   - Fixed-grip chairs (Yan and the other older lifts): a bullwheel on a single mast over a concrete vault, an angular machinery hood, sheave arms on a portal frame.
   - Gondola, Funitel and Tram: station buildings with open portals the cabins run into.
   The lift's name is on the gate gantry or sign frame skiers pass under at the bottom, and on the sides of the terminal at both ends. */
const SNOWC = [0.9, 0.92, 0.95], CONC = [0.46, 0.46, 0.45], NAVY = [0.05, 0.11, 0.2];
const TERMINAL = { // [shape, skin colour]
  "KT22 Express": ["uni", [0.10, 0.21, 0.15]], "Gold Coast Express": ["uni", [0.10, 0.21, 0.15]], "Shirley Lake Express": ["uni", [0.10, 0.21, 0.15]], "Summit Six": ["uni", [0.16, 0.24, 0.2]], "Sherwood Express": ["uni", [0.55, 0.57, 0.58]],
  "Siberia Express": ["lpa", [0.62, 0.64, 0.66]], "Big Blue Express": ["lpa", [0.62, 0.64, 0.66]], "Red Dog Express": ["lpa", [0.13, 0.14, 0.155]], "Treeline Cirque Lower": ["lpa", [0.62, 0.64, 0.66]], "Treeline Cirque Upper": ["lpa", [0.62, 0.64, 0.66]],
  "Headwall Express": ["ctec", [0.74, 0.75, 0.74]], "Wa She Shu": ["ctec", [0.74, 0.75, 0.74]], "Far East Express": ["ctec", [0.74, 0.75, 0.74]], "Roundhouse": ["ctec", [0.74, 0.75, 0.74]]
};
function buildStation(b, L, nd, sgn, yaw, plate) {
  const T = L.T, half = T.gauge / 2, cs = Math.cos(yaw), sn = Math.sin(yaw), rx = cs, rz = -sn, bot = sgn > 0, q = L.q, g0 = nd.g;
  const S = (lx, y, w) => [nd.x + rx * lx + sn * sgn * w, y, nd.z + rz * lx + cs * sgn * w];        // lx: across the line; w: metres from the end of the lift toward the other end
  const G = (lx, w) => { const p = S(lx, 0, w); return H(p[0], p[2]); };
  const B = (wx, h, lw, lx, y, w, c) => { const p = S(lx, y, w); b.box(wx, h, lw, p[0], p[1], p[2], c, yaw); };
  const post = (wx, lw, lx, w, yTop, c, hit) => { const g = G(lx, w), p = S(lx, 0, w); b.box(wx, yTop - g + 1.2, lw, p[0], (yTop + g - 1.2) / 2, p[2], c, yaw); if (hit) towerHits.push({ x: p[0], z: p[2], r: hit }); };   // stands on the ground, footed below it
  const outYaw = sd => Math.atan2(rx * sd, rz * sd), faceYaw = dir => Math.atan2(sn * sgn * dir, cs * sgn * dir);   // which way a plate on a side wall / end wall looks
  const hut = (lx, w, c) => { const g = Math.min(G(lx - 1.5, w - 1.7), G(lx + 1.5, w + 1.7), G(lx - 1.5, w + 1.7), G(lx + 1.5, w - 1.7)); // the operator's house: windows all round, a door, snow on the roof
    B(3.0, 3.6, 3.4, lx, g + 0.8, w, c); B(3.06, 0.95, 2.4, lx, g + 1.6, w, GLASS); B(2.2, 0.95, 3.46, lx, g + 1.6, w, GLASS); B(0.9, 1.95, 0.08, lx - 0.8, g + 1.0, w - 1.71, DARK);
    B(3.7, 0.22, 4.1, lx, g + 2.71, w, DARK); B(3.6, 0.3, 4.0, lx, g + 2.97, w, SNOWC); const p = S(lx, 0, w); towerHits.push({ x: p[0], z: p[2], r: 2.4 }); };
  const wheel = (y, w) => { const p = S(0, y, w); b.cyl(half, half, 0.2, p[0], p[1], p[2], DARK, 28); b.cyl(half - 0.25, half - 0.25, 0.26, p[0], p[1], p[2], STEEL, 20); b.cyl(0.42, 0.42, 1.0, p[0], p[1] + 0.35, p[2], STEEL, 10); };
  const loadLine = c => B(Math.min(3.4, T.gauge - 1.6), 0.05, 0.32, -half, G(-half, L.loadS) + 0.03, L.loadS, c);
  const frame = (w, wid, hgt, gates) => { // the gantry or sign frame skiers pass under on the way to load: posts in the snow, the lift's name on both faces
    const g = G(0, w); for (const sd of [-1, 1]) post(0.24, 0.24, sd * wid / 2, w, g + hgt + 0.5, STEEL, 0.25); B(wid + 0.5, 0.95, 0.24, 0, g + hgt, w, NAVY);
    plate(S(0, g + hgt, w - 0.13), wid - 0.2, 0.82, faceYaw(-1)); plate(S(0, g + hgt, w + 0.13), wid - 0.2, 0.82, faceYaw(1));
    if (gates) for (let k = -gates; k <= gates; k++) { B(0.2, 1.05, 0.75, k * 1.35, g + 0.4, w, STEEL); B(0.24, 0.12, 0.3, k * 1.35, g + 0.98, w - 0.2 , [0.1, 0.55, 0.2]); }
    for (const sd of [-1, 1]) { const lx = sd * (wid / 2 - 0.2); for (const ww of [w + 0.6, w + 3.2, w + 5.8]) post(0.06, 0.06, lx, ww, G(lx, ww) + 1.0, [0.9, 0.35, 0.08]); B(0.05, 0.05, 5.2, lx, g + 0.92, w + 3.2, [0.9, 0.35, 0.08]); } };
  const patrol = () => { const lx = -(half + 8.5), w = -5.5, g = G(lx, w); hut(lx, w, [0.5, 0.08, 0.06]); B(0.95, 0.27, 0.06, lx, g + 2.05, w + 1.74, SNOWC); B(0.27, 0.95, 0.06, lx, g + 2.05, w + 1.74, SNOWC); B(2.4, 0.12, 0.5, lx, g + 0.25, w + 2.6, [0.75, 0.1, 0.08]); };   // ski patrol's shack at the top, with the white cross and a rescue sled outside
  const unloadSign = () => { const lx = -(half + 2.4), w = L.loadS + 2.5, g = G(lx, w); post(0.09, 0.09, lx, w, g + 2.5, STEEL, 0.15); B(1.5, 0.5, 0.06, lx, g + 2.2, w, [0.72, 0.08, 0.06]); B(1.3, 0.12, 0.07, lx, g + 2.2, w, SNOWC); };
  if (L.type === "chair_det") {
    const [shape, skin] = TERMINAL[L.name] || ["uni", [0.55, 0.57, 0.58]], W = T.gauge + 2.6, Lt = 21.5, wA = q - half - 1.2, wB = wA + Lt, mid = (wA + wB) / 2, y0 = nd.y + 0.45;   // the enclosure's floor is just above the rope, so the bullwheel and tyre banks show underneath
    if (shape === "uni") { // a capsule: skirt, window band, rounded crown
      const cap = (w, h, y, c) => { B(w, h, Lt - W, 0, y, mid, c); for (const e of [wA + W / 2, wB - W / 2]) { const p = S(0, y, e); b.cyl(w / 2, w / 2, h, p[0], p[1], p[2], c, 18); } };
      cap(W, 1.2, y0 + 0.6, skin); cap(W + 0.05, 0.85, y0 + 1.62, GLASS); cap(W, 0.3, y0 + 2.2, skin); cap(W - 0.7, 0.4, y0 + 2.55, skin); cap(W - 2.0, 0.3, y0 + 2.9, skin); cap(W - 2.2, 0.28, y0 + 3.15, SNOWC);
      for (let w = wA + W / 2; w <= wB - W / 2 + 0.01; w += (Lt - W) / 8) for (const sd of [-1, 1]) B(0.1, 0.85, 0.14, sd * (W / 2 + 0.03), y0 + 1.62, w, skin);
    } else { // square-cut, with a nose tapering toward the line
      const ctec = shape === "ctec"; B(W, 1.25, Lt - 2.4, 0, y0 + 0.62, mid - 0.2, skin); B(W + 0.05, 0.9, Lt - 3.6, 0, y0 + 1.7, mid - 0.2, GLASS); B(W, 0.35, Lt - 2.4, 0, y0 + 2.32, mid - 0.2, skin); B(W - 0.6, 0.3, Lt - 3, 0, y0 + 2.64, mid - 0.2, SNOWC);
      B(W - 1.4, ctec ? 1.0 : 1.25, 1.5, 0, y0 + (ctec ? 0.5 : 0.62), wB - 0.9, skin); B(W - 3.0, 0.8, 1.2, 0, y0 + 0.4, wB + 0.1, skin); B(W - 1.4, 1.25, 1.2, 0, y0 + 0.62, wA + 0.5, skin); B(W - 1.4, 1.4, 1.5, 0, y0 + 1.95, wB - 0.9, skin); B(W - 1.4, 1.4, 1.2, 0, y0 + 1.95, wA + 0.5, skin);
      for (let w = wA + 2.2; w <= wB - 2.6; w += (Lt - 4.8) / 7) for (const sd of [-1, 1]) B(0.12, 0.9, 0.16, sd * (W / 2 + 0.03), y0 + 1.7, w, skin);
    }
    wheel(nd.y, q); for (const sd of [-1, 1]) { B(0.36, 0.3, wB - 1.2 - q, sd * half, nd.y + 0.36, (q + wB - 1.2) / 2, STEEL); for (let w = q + 0.7; w < wB - 1.4; w += 1.15) { const p = S(sd * half, nd.y + 0.06, w); b.cyl(0.21, 0.21, 0.17, p[0], p[1], p[2], DARK, 7, 0, Math.PI / 2, yaw); } }   // tyre banks that slow and launch the chairs
    for (const wm of [q + 4.4, wB - 4.2]) { const g = G(0, wm); post(0.95, 1.25, 0, wm, y0 + 0.1, STEEL, 0.95); B(2.3, 0.7, 2.7, 0, g + 0.1, wm, CONC); B(W - 1.0, 0.5, 0.8, 0, y0 - 0.05, wm, STEEL); }   // masts on concrete footings
    hut(half + 3.7, q + 2.2, skin.map(v => v * 0.8 + 0.03));
    for (const sd of [-1, 1]) plate(S(sd * (W / 2 + (shape === "uni" ? 0.06 : 0.09)), y0 + 0.62, mid + 1.5), 7.6, 0.84, outYaw(sd));   // the name along both sides of the terminal
    if (bot) { frame(-7.5, W + 1.4, 3.6, 2); loadLine([0.75, 0.1, 0.08]); } else { loadLine([0.92, 0.45, 0.08]); unloadSign(); if (L.len > 600) patrol(); }
  } else if (L.type === "chair_fixed") {
    const yan = [0.12, 0.19, 0.15], gv = G(0, q);
    B(1.9, 2.5, 4.2, 0, gv + 0.25, q - 0.2, CONC); B(1.8, 0.2, 4.1, 0, gv + 1.58, q - 0.2, SNOWC);                                  // the concrete vault
    { const p = S(0, 0, q); b.cyl(0.34, 0.46, nd.y - gv - 1.4, p[0], (nd.y + gv + 1.4) / 2, p[2], STEEL, 12); towerHits.push({ x: p[0], z: p[2], r: 1.6 }); B(0.42, nd.y - gv - 1.7, 0.06, 0, (nd.y + gv + 1.5) / 2, q - 0.5, DARK); }   // mast and ladder
    wheel(nd.y, q); for (let k = 0; k < 3; k++) { const p = S(0, nd.y + 0.02, q); b.box(2 * half - 0.3, 0.1, 0.16, p[0], p[1], p[2], STEEL, yaw + k * Math.PI / 3); }
    B(2.4, 1.3, 4.4, 0, nd.y + 1.1, q + 0.4, yan); B(1.9, 0.5, 3.4, 0, nd.y + 2.0, q + 0.4, yan); B(1.8, 0.22, 3.3, 0, nd.y + 2.36, q + 0.4, SNOWC); B(2.46, 0.5, 1.6, 0, nd.y + 1.2, q + 0.4, GLASS);   // the machinery hood
    B(2 * half + 0.5, 0.3, 0.3, 0, nd.y + 0.5, q + 1.2, STEEL); for (const sd of [-1, 1]) { B(0.22, 0.3, 4.6, sd * half, nd.y + 0.5, q + 3.3, STEEL); for (const w of [q + 2.6, q + 3.4, q + 4.2, q + 5.0]) { const p = S(sd * half, nd.y + 0.16, w); b.cyl(0.2, 0.2, 0.12, p[0], p[1], p[2], DARK, 8, 0, Math.PI / 2, yaw); } }   // sheave arms
    B(2 * half + 3.6, 0.32, 0.32, 0, nd.y + 0.72, q + 5.4, STEEL); for (const sd of [-1, 1]) post(0.26, 0.26, sd * (half + 1.65), q + 5.4, nd.y + 0.88, STEEL, 0.3);   // carried on a portal frame
    hut(half + 3.6, q + 1.4, [0.30, 0.22, 0.15]);
    for (const sd of [-1, 1]) plate(S(sd * 1.24, nd.y + 1.45, q + 0.4), 3.9, 0.5, outYaw(sd));
    if (bot) { frame(-6, 5.6, 2.9, 0); loadLine([0.75, 0.1, 0.08]); } else { loadLine([0.92, 0.45, 0.08]); unloadSign(); if (L.len > 600) patrol(); }
  } else if (L.type === "gondola") { // a glazed terminal on a concrete deck, open at the end the cabins run in through
    const W = T.gauge + 7.6, w0 = -4, w1 = 30, mid = (w0 + w1) / 2, len = w1 - w0, fl = g0 + 0.12, col = [0.14, 0.15, 0.165];
    B(W, 1.6, len, 0, fl - 0.8, mid, CONC); B(4, 0.5, 5, -(W / 2 + 2), g0 + 0.05, 6, CONC);
    for (const sd of [-1, 1]) { for (let w = w0 + 0.3; w <= w1; w += (len - 0.6) / 5) post(0.5, 0.5, sd * (W / 2 - 0.25), w, nd.y + 0.7, col, 0); B(0.14, nd.y + 0.6 - fl, len - 0.6, sd * (W / 2 - 0.25), (nd.y + 0.6 + fl) / 2, mid, GLASS); }
    B(W, nd.y + 0.6 - fl, 0.4, 0, (nd.y + 0.6 + fl) / 2, w0 + 0.2, col); B(W + 0.5, 1.9, len + 0.5, 0, nd.y + 1.55, mid, col); B(W + 0.2, 0.35, len + 0.2, 0, nd.y + 2.67, mid, SNOWC); wheel(nd.y, q);
    for (const sd of [-1, 1]) plate(S(sd * (W / 2 + 0.27), nd.y + 1.55, mid), 11, 1.3, outYaw(sd)); plate(S(0, nd.y + 1.55, w1 + 0.27), 9, 1.1, faceYaw(1));
    for (const sd of [-1, 1]) { const p = S(sd * W / 2, 0, mid); towerHits.push({ x: p[0], z: p[2], r: 1.2 }); }
  } else if (L.type === "funitel") { // a big hall with concrete walls, a metal upper storey and an arched roof; both cabin lanes run in through the open end
    const W = T.gauge + 8, w0 = -8, w1 = 28, mid = (w0 + w1) / 2, len = w1 - w0, hp = T.station + 1.9, blue = [0.2, 0.27, 0.33];
    for (const sd of [-1, 1]) { B(0.7, hp + 2, len, sd * (W / 2 - 0.35), g0 + hp / 2 - 1, mid, CONC); B(0.74, 1.4, len - 3, sd * (W / 2 - 0.35), g0 + hp - 1.6, mid, GLASS); }
    B(W, hp + 2, 0.7, 0, g0 + hp / 2 - 1, w0 + 0.35, CONC); B(1.4, hp + 2, 6, 0, g0 + hp / 2 - 1, w1 - 3, CONC);
    B(W + 0.4, 3.4, len + 0.4, 0, g0 + hp + 1.7, mid, blue); B(W - 2.4, 0.9, len + 0.4, 0, g0 + hp + 3.85, mid, blue); B(W - 6.5, 0.7, len + 0.4, 0, g0 + hp + 4.65, mid, blue); B(W - 7, 0.3, len, 0, g0 + hp + 5.15, mid, SNOWC);
    for (const sd of [-1, 1]) B(1.9, 0.3, len, sd * (W / 2 - 1.3), g0 + hp + 3.55, mid, SNOWC);
    plate(S(0, g0 + hp + 1.7, w1 + 0.22), 13, 1.6, faceYaw(1)); for (const sd of [-1, 1]) { plate(S(sd * (W / 2 + 0.22), g0 + hp + 1.7, mid), 13, 1.6, outYaw(sd)); const p = S(sd * W / 2, 0, mid); towerHits.push({ x: p[0], z: p[2], r: 1.4 }); }
  } else { // the cable car building: a concrete machine hall behind, and a roofed dock with a bay for each cabin
    const W = T.gauge + 6, hgt = T.station + 3.5;
    B(W, hgt + 2, 8, 0, g0 + hgt / 2 - 1, -8, [0.36, 0.35, 0.34]); B(W - 3, 1.2, 0.3, 0, g0 + hgt - 2.6, -12.05, GLASS);
    for (const lx of [-(W / 2 - 0.5), 0, W / 2 - 0.5]) B(lx ? 1.0 : 1.6, hgt + 2, 11, lx, g0 + hgt / 2 - 1, 1.5, [0.36, 0.35, 0.34]);
    B(W + 1.2, 1.3, 20.6, 0, g0 + hgt + 0.65, -1.7, [0.3, 0.29, 0.28]); B(W + 1.0, 0.4, 20.4, 0, g0 + hgt + 1.5, -1.7, SNOWC); B(W + 1.2, 1.7, 0.4, 0, g0 + hgt - 0.85, 6.8, NAVY);
    plate(S(0, g0 + hgt - 0.85, 7.03), 12, 1.5, faceYaw(1)); for (const sd of [-1, 1]) { const p = S(sd * W / 2, 0, -3); towerHits.push({ x: p[0], z: p[2], r: 1.5 }); }
  }
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
    if (!a.st || L.type === "tram") a.y += Math.min(28, na + both); if (!b.st || L.type === "tram") b.y += Math.min(28, nb + both);   // only towers grow: a terminal keeps its rope at loading height above its pad
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
  L.q = L.carpet || L.type === "tram" ? 0 : Math.PI * half / 2;   // the bullwheel's centre sits this far in from each end, so the turn round it is as long as the rope it replaces
  L.loadS = L.carpet ? 0.5 : L.type === "tram" ? 2.5 : L.q + 3;
  let plate = null;
  if (!L.carpet) { // the lift's name, lettered once and mounted wherever the real lifts carry it
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = "#0e2a47"; g.fillRect(0, 0, 1024, 128); g.fillStyle = "#e9eef3"; g.fillRect(0, 118, 1024, 10); g.fillRect(0, 0, 1024, 6);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; let fs = 86; const label = L.name.toUpperCase(); g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; while (g.measureText(label).width > 960 && fs > 30) { fs -= 4; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; } g.fillText(label, 512, 64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const nm = worldShade(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    plate = (p, w, h, yaw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), nm); m.position.set(p[0], p[1], p[2]); m.rotation.y = yaw; scene.add(m); liftSigns.push([m, p[0], p[2]]); };
  }
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
        const q = at(0, nd.y + 1.2, 0); b.box(T.gauge + 0.6, 0.08, 0.08, q[0], q[1], q[2], STEEL, yaw); for (const sx of [-1, 1]) { const u = at(sx * half, nd.y + 0.9, 0); b.box(0.07, 0.62, 0.07, u[0], u[1], u[2], STEEL, yaw); }   // the lifting frame stands on the crossarm
        b.box(0.5, 0.1, 0.5, nd.x, nd.y + 0.64, nd.z, [0.9, 0.92, 0.95], yaw);
      }
      towerHits.push({ x: nd.x, z: nd.z, r: L.type === "tram" ? 4.2 : 0.75 });
    } else buildStation(b, L, nd, i === 0 ? 1 : -1, yaw, plate);
  }
  if (L.carpet) { // belt with low side walls
    for (let k = 0; k < ns - 1; k++) { const x = (L.px[k] + L.px[k + 1]) / 2, y = (L.py[k] + L.py[k + 1]) / 2, z = (L.pz[k] + L.pz[k + 1]) / 2, pit = Math.atan2(L.py[k + 1] - L.py[k], L.ds); b.box(0.9, 0.06, L.ds + 0.05, x, y - 0.03, z, DARK, L.dir, -pit); for (const sx of [-1, 1]) b.box(0.06, 0.34, L.ds + 0.05, x + L.rx[k] * sx * 0.55, y + 0.12, z + L.rz[k] * sx * 0.55, [0.25, 0.42, 0.62], L.dir, -pit); }
  } else {
    const offs = L.type === "funitel" ? [half - 1.6, half + 1.6, -half - 1.6, -half + 1.6] : L.type === "tram" ? [half - 0.5, half + 0.5, -half - 0.5, -half + 0.5] : [half, -half], rr = L.type === "tram" ? 0.045 : 0.03;
    const kq = Math.round(L.q / L.ds);   // the rope runs from bullwheel to bullwheel
    for (const o of offs) for (let k = kq; k < ns - 1 - kq; k += 2) {
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
      carrierAt(L, k, liftTime, _co); const q = L.q, s = _co.s; let ang = L.dir + (_co.side < 0 ? Math.PI : 0);
      if (q > 0 && (s < q || s > L.len - q)) { // round the bullwheel at the end of the line
        const top = s > q, hf = L.T.gauge / 2, a = top ? (_co.side > 0 ? s - (L.len - q) : q + L.len - s) : (_co.side < 0 ? q - s : q + s), th = a / (2 * q) * Math.PI, e = top ? 1 : -1;
        liftPoint(L, top ? L.len - q : q, 0, _lp); const kk = top ? L.ns - 1 : 0, dx = L.rz[kk], dz = -L.rx[kk];
        _lp.x += e * (L.rx[kk] * hf * Math.cos(th) + dx * hf * Math.sin(th)); _lp.z += e * (L.rz[kk] * hf * Math.cos(th) + dz * hf * Math.sin(th)); ang = L.dir + (top ? th : Math.PI + th);
      } else liftPoint(L, s, _co.side, _lp);
      _lq.setFromAxisAngle(_up, ang); _lm.compose(_lp, _lq, _ls); L.mesh.setMatrixAt(k, _lm);
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
  /* The valley is built like an alpine village: stone or pale stucco at the ground, dark timber above, steep snow-loaded gables with wide eaves,
     gabled dormers along the eaves of the big lodges, timber balconies on every upper floor, and stone chimneys. */
  const WALLS = [[0.30, 0.19, 0.11], [0.24, 0.15, 0.09], [0.38, 0.25, 0.14], [0.20, 0.13, 0.08], [0.34, 0.22, 0.13], [0.27, 0.20, 0.14]];   // chalet timber
  const LODGE = [[0.72, 0.58, 0.38], [0.56, 0.27, 0.17], [0.40, 0.46, 0.33], [0.78, 0.71, 0.58], [0.62, 0.45, 0.26]];   // the village's ochre, barn red, sage and cream stucco
  const TIMBER = [0.17, 0.10, 0.06], STUCCO = [0.80, 0.76, 0.68], STONE = [0.33, 0.31, 0.29], sn = [0.9, 0.92, 0.95];
  const V = (a, b, c, cc, hint, u) => { // one triangle facing 'hint'; plain colour unless wall uvs are given
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
    let T = [a, b, c], UV = u; if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; T = [a, c, b]; if (u) UV = [u[0], u[2], u[1]]; }
    for (let k = 0; k < 3; k++) { pos.push(T[k][0], T[k][1], T[k][2]); nor.push(n[0], n[1], n[2]); col.push(cc[0], cc[1], cc[2]); if (UV) uv.push(UV[k][0], UV[k][1]); else uv.push(0, -9); } };
  const Q = (a, b, c, d, cc, hint, u) => { V(a, b, c, cc, hint, u && [u[0], u[1], u[2]]); V(a, c, d, cc, hint, u && [u[0], u[2], u[3]]); };
  const obox = (cx, cy, cz, ax, az, hl, hh, hw, cc) => { const px = -az, pz = ax, K = (i, j, k) => [cx + ax * hl * i + px * hw * k, cy + hh * j, cz + az * hl * i + pz * hw * k];   // a box lying along (ax, az)
    Q(K(-1, -1, -1), K(1, -1, -1), K(1, 1, -1), K(-1, 1, -1), cc, [-px, 0, -pz]); Q(K(-1, -1, 1), K(1, -1, 1), K(1, 1, 1), K(-1, 1, 1), cc, [px, 0, pz]);
    Q(K(-1, -1, -1), K(-1, -1, 1), K(-1, 1, 1), K(-1, 1, -1), cc, [-ax, 0, -az]); Q(K(1, -1, -1), K(1, -1, 1), K(1, 1, 1), K(1, 1, -1), cc, [ax, 0, az]);
    Q(K(-1, 1, -1), K(1, 1, -1), K(1, 1, 1), K(-1, 1, 1), sn, [0, 1, 0]); Q(K(-1, -1, -1), K(1, -1, -1), K(1, -1, 1), K(-1, -1, 1), cc, [0, -1, 0]); };   // snow lies on top of everything
  WORLD.blds = WORLD.blds.filter(bd => !/lifthouse|lift base|express base|funitel base|venture base|exhibition base|silverado base|lady base|chair base|shirley/i.test(bd.n || ""));
  WORLD.blds.forEach((bd, bi) => {
    const P = bd.p, n = P.length; let lo = 1e9, hi = -1e9, cx = 0, cz = 0;
    for (const q of P) { const g = Hsmooth(q[0], q[1]); lo = Math.min(lo, g); hi = Math.max(hi, g); cx += q[0] / n; cz += q[1] / n; }
    const area = polyArea(P), gc = /gold coast lodge/i.test(bd.n || ""), lodge = gc || bd.h >= 9 || area > 700, top = hi + bd.h, wc = gc ? [0.25, 0.18, 0.12] : lodge ? LODGE[bi % LODGE.length] : WALLS[bi % WALLS.length], lo0 = lodge ? 10000 : 0; let per = lo0;
    const bx = polyBox(P), gable = !gc && bx && area / bx.area > 0.76 && bx.hv * 2 < 26 && bd.h < 15 && area > 16, chalet = !lodge && bd.h >= 4.6, rhG = gable ? Math.min(bx.hv * (lodge ? 0.56 : 0.62), 8.5) : 0;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez); if (len < 0.05) continue; const nx = -ez / len, nz = ex / len, tx = ex / len, tz = ez / len;
      const quad = (y0, y1, c, o, u0, u1, v0, v1) => { const ax = a[0] + nx * o, az = a[1] + nz * o, bx = b[0] + nx * o, bz = b[1] + nz * o; pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az); for (let k = 0; k < 6; k++) { nor.push(nx, 0, nz); col.push(...c); } uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); };
      const op = bd.shopEdges && bd.shopEdges[i];
      if (op) { // a shop front: the wall is left open for its door and windows, so you see in and walk in
        const piece = (s0, s1, y0, y1) => { if (s1 - s0 < 0.02 || y1 - y0 < 0.02) return; const ax = a[0] + tx * s0, az = a[1] + tz * s0, bx2 = a[0] + tx * s1, bz2 = a[1] + tz * s1, c = chalet && y1 <= hi + 2.71 ? STUCCO : wc; pos.push(ax, y0, az, bx2, y0, bz2, bx2, y1, bz2, ax, y0, az, bx2, y1, bz2, ax, y1, az); for (let k = 0; k < 6; k++) { nor.push(nx, 0, nz); col.push(...c); } uv.push(per + s0, y0 - hi, per + s1, y0 - hi, per + s1, y1 - hi, per + s0, y0 - hi, per + s1, y1 - hi, per + s0, y1 - hi); };
        const wallS = (s0, s1, y0, y1) => { if (chalet && y0 < hi + 2.7 && y1 > hi + 2.7) { piece(s0, s1, y0, hi + 2.7); piece(s0, s1, hi + 2.7, y1); } else piece(s0, s1, y0, y1); };
        wallS(0, op.s0, lo - 1.5, top); wallS(op.s1, len, lo - 1.5, top); wallS(op.s0, op.s1, op.yT, top); wallS(op.s0, op.s1, lo - 1.5, op.yF);
      } else if (chalet) { quad(lo - 1.5, hi + 2.7, STUCCO, 0, per, per + len, lo - hi, 2.7); quad(hi + 2.7, top, wc, 0, per, per + len, 2.7, bd.h); }   // pale ground floor, timber above
      else quad(lo - 1.5, top, wc, 0, per, per + len, lo - hi, bd.h);
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, sgn = inPoly(P, mx + nx * 0.4, mz + nz * 0.4) ? -1 : 1, ox = nx * sgn, oz = nz * sgn, along = !gable || Math.abs(tx * bx.ux + tz * bx.uz) > 0.7;
      if (lodge && !gc && len >= 7) { const nB = Math.max(1, Math.floor((len - 1.6) / 4.3)), sp = len / nB;   // the hotel floors: a private balcony for every room, each with its glass door, timber rail and posts
        for (let y = hi + 6; y < top - 1.2; y += 3) for (let k = 0; k < nB; k++) { const u = (k + 0.5) * sp - len / 2, bx0 = mx + tx * u, bz0 = mz + tz * u, hw = Math.min(1.55, sp / 2 - 0.35);
          obox(bx0 + ox * 0.62, y - 0.07, bz0 + oz * 0.62, tx, tz, hw, 0.07, 0.62, TIMBER); obox(bx0 + ox * 1.2, y + 0.5, bz0 + oz * 1.2, tx, tz, hw, 0.05, 0.04, TIMBER); obox(bx0 + ox * 1.2, y + 0.98, bz0 + oz * 1.2, tx, tz, hw, 0.045, 0.05, TIMBER);
          for (let q = -2; q <= 2; q++) obox(bx0 + tx * q * hw / 2 + ox * 1.2, y + 0.5, bz0 + tz * q * hw / 2 + oz * 1.2, tx, tz, 0.035, 0.5, 0.035, TIMBER); for (const e of [-1, 1]) obox(bx0 + tx * e * hw + ox * 0.62, y + 0.5, bz0 + tz * e * hw + oz * 0.62, ox, oz, 0.6, 0.5, 0.035, TIMBER);
          obox(bx0 + ox * 0.05, y + 1.05, bz0 + oz * 0.05, tx, tz, 0.8, 1.05, 0.04, [0.05, 0.08, 0.11]); } }
      if (lodge && !gc && len >= 7 && along && bd.h >= 6) { // gabled dormers standing on the eaves
        const nD = Math.max(1, Math.floor(len / 9.5)), dw = 2.0, eh = 2.3, gh = 1.7, dd = 5.2, y0 = top - 0.25, y1 = top + eh, y2 = y1 + gh;
        for (let k = 0; k < nD; k++) { const sK = (k + 0.5) / nD * len, c0 = a[0] + tx * sK, c1 = a[1] + tz * sK, F = (u, d, y) => [c0 + tx * u + ox * d, y, c1 + tz * u + oz * d], u0 = lo0 + 2.6 * (3 + 7 * k + 13 * i);
          Q(F(-dw, 0.06, y0), F(dw, 0.06, y0), F(dw, 0.06, y1), F(-dw, 0.06, y1), wc, [ox, 0, oz], [[u0, 6.02], [u0 + 2.6, 6.02], [u0 + 2.6, 8.98], [u0, 8.98]]);   // the face, with its window
          V(F(-dw, 0.06, y1), F(dw, 0.06, y1), F(0, 0.06, y2), TIMBER, [ox, 0, oz]); V(F(-dw, -dd, y1), F(dw, -dd, y1), F(0, -dd, y2), wc, [-ox, 0, -oz]); Q(F(-dw, -dd, y0), F(dw, -dd, y0), F(dw, -dd, y1), F(-dw, -dd, y1), wc, [-ox, 0, -oz]);
          for (const sd of [-1, 1]) { Q(F(sd * dw, 0.06, y0), F(sd * dw, -dd, y0), F(sd * dw, -dd, y1), F(sd * dw, 0.06, y1), wc, [tx * sd, 0, tz * sd]); Q(F(sd * (dw + 0.45), 0.7, y1 - 0.3), F(sd * (dw + 0.45), -dd - 0.2, y1 - 0.3), F(0, -dd - 0.2, y2 + 0.14), F(0, 0.7, y2 + 0.14), sn, [tx * sd, 1, tz * sd]); } } }
    }
    if (gable) { // a steep pitched roof under a slab of snow, wide eaves, ridge along the long side
      const { ux, uz, cu, cv, hu, hv } = bx, rh = rhG, ov = lodge ? 1.1 : 1.25, og = 0.9, W = (u, v, y) => [u * ux - v * uz, y, u * uz + v * ux], drop = ov * rh / hv;
      for (const sv of [-1, 1]) { Q(W(cu - hu - og, cv + sv * (hv + ov), top - drop), W(cu + hu + og, cv + sv * (hv + ov), top - drop), W(cu + hu + og, cv, top + rh + 0.4), W(cu - hu - og, cv, top + rh + 0.4), sn, [-uz * sv, 1.2, ux * sv]);
        Q(W(cu - hu - og, cv + sv * (hv + ov), top - drop - 0.16), W(cu + hu + og, cv + sv * (hv + ov), top - drop - 0.16), W(cu + hu + og, cv, top + rh + 0.24), W(cu - hu - og, cv, top + rh + 0.24), TIMBER, [uz * sv, -1.2, -ux * sv]); }   // timber underside of the eaves
      for (const su of [-1, 1]) { V(W(cu + su * hu, cv - hv, top), W(cu + su * hu, cv + hv, top), W(cu + su * hu, cv, top + rh), lodge ? wc : TIMBER, [ux * su, 0, uz * su]); }
      if (chalet && bd.h >= 5.4) { const su = (bi & 1) ? 1 : -1, c = W(cu + su * (hu + 0.55), cv, 0), r = W(cu + su * (hu + 1.06), cv, 0); obox(c[0], hi + 2.78, c[2], -uz, ux, hv - 0.3, 0.07, 0.55, TIMBER); obox(r[0], hi + 3.33, r[2], -uz, ux, hv - 0.3, 0.48, 0.05, TIMBER); }   // the balcony across the gable end
      const ch = W(cu + hu * 0.45 * ((bi & 2) ? 1 : -1), cv + hv * 0.3, 0); if (bd.h >= 3.5) obox(ch[0], top + (rh * 0.7 + 1.0) / 2 - 0.5, ch[2], ux, uz, 0.45, (rh * 0.7 + 1.0) / 2 + 0.5, 0.45, STONE);
    } else { // hipped roof: eaves out past the walls, slopes drawn in toward the middle, a snow-loaded top
      const rh = gc ? 1.6 : clamp(0.24 * Math.sqrt(area), 3, 10), up = gc ? 0.82 : 0.36, E = P.map(q => [cx + (q[0] - cx) * 1.04, top - 0.2, cz + (q[1] - cz) * 1.04]), Uq = P.map(q => [cx + (q[0] - cx) * up, top + rh, cz + (q[1] - cz) * up]);   // Gold Coast has a broad, nearly flat roof
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, a = E[i], b = E[j], c = Uq[j], d = Uq[i], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]; let nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...nn) || 1; if (nn[1] < 0) nn = nn.map(q => -q);
        for (const q of [a, b, c, a, c, d]) { pos.push(...q); nor.push(nn[0] / l, nn[1] / l, nn[2] / l); col.push(...sn); uv.push(0, -7); } }
      const tris = THREE.ShapeUtils.triangulateShape(P.map(q => new THREE.Vector2(q[0], q[1])), []);
      for (const t of tris) for (const k of [t[0], t[2], t[1]]) { pos.push(Uq[k][0], top + rh, Uq[k][2]); nor.push(0, 1, 0); col.push(...sn); uv.push(0, -9); }
      if (bd.h >= 4 && !gc) for (let k = 0; k < (lodge ? 2 : 1); k++) { const q = P[(bi + k * (n >> 1)) % n], x = cx + (q[0] - cx) * 0.3, z = cz + (q[1] - cz) * 0.3; obox(x, top + rh / 2 + 0.6, z, 1, 0, 0.55, rh / 2 + 1.0, 0.55, STONE); }   // stone chimneys
    }
    if (gc) { // Gold Coast Lodge: dark timber, a wall of glass toward the sun, and the big deck with its tables
      let e0 = 0, bl = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; e0 = i; } }
      const a = P[e0], b = P[(e0 + 1) % n], tx = (b[0] - a[0]) / bl, tz = (b[1] - a[1]) / bl, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, sg = inPoly(P, mx - tz * 0.4, mz + tx * 0.4) ? -1 : 1, ox = -tz * sg, oz = tx * sg, dk = hi + 0.6, D = 7.5, WOOD = [0.42, 0.3, 0.19];
      obox(mx + ox * D / 2, dk, mz + oz * D / 2, tx, tz, bl / 2, 0.08, D / 2, WOOD);
      for (let s = -bl / 2 + 0.4; s <= bl / 2; s += 4.2) for (const dd of [D - 0.3, D / 2]) { const x = mx + tx * s + ox * dd, z = mz + tz * s + oz * dd, g = Hsmooth(x, z); obox(x, (dk + g - 1) / 2, z, tx, tz, 0.13, (dk - g + 1) / 2, 0.13, TIMBER); }
      obox(mx + ox * (D - 0.06), dk + 0.58, mz + oz * (D - 0.06), tx, tz, bl / 2, 0.5, 0.045, TIMBER); for (const e of [-1, 1]) obox(mx + tx * e * (bl / 2 - 0.06) + ox * D / 2, dk + 0.58, mz + tz * e * (bl / 2 - 0.06) + oz * D / 2, ox, oz, D / 2, 0.5, 0.045, TIMBER);
      obox(mx + ox * 0.07, hi + 2.9, mz + oz * 0.07, tx, tz, bl / 2 - 0.8, 1.7, 0.05, [0.05, 0.08, 0.11]);
      for (let s = -bl / 2 + 3; s <= bl / 2 - 3; s += 5) { const x = mx + tx * s + ox * D * 0.58, z = mz + tz * s + oz * D * 0.58; obox(x, dk + 0.8, z, tx, tz, 0.9, 0.04, 0.38, WOOD); obox(x, dk + 0.42, z, tx, tz, 0.07, 0.36, 0.28, TIMBER);
        for (const e of [-1, 1]) { obox(x + ox * e * 0.66, dk + 0.5, z + oz * e * 0.66, tx, tz, 0.9, 0.03, 0.14, WOOD); obox(x + ox * e * 0.66, dk + 0.27, z + oz * e * 0.66, tx, tz, 0.06, 0.21, 0.1, TIMBER); } }
    }
    bd.cx = cx; bd.cz = cz; bd.top = top;
    const key = Math.floor(cx / 60) + "," + Math.floor(cz / 60); if (!BLD_GRID.has(key)) BLD_GRID.set(key, []); BLD_GRID.get(key).push(bd);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  bldMat = worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), {
    patch(sh) {
      sh.uniforms.uLamp = uLamp;
      sh.fragmentShader = "uniform float uLamp; float bWin = 0.0; float bLit = 0.0;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        { float lodge = step(5000.0, vUv.x), wall = step(-6.0, vUv.y), roofS = step(-8.0, vUv.y) * (1.0 - wall); vec2 uvw = vec2(vUv.x - lodge * 10000.0, vUv.y);
          vec2 w = uvw / vec2(2.6, 3.0); vec2 f = fract(w), cell = floor(w); float up = step(0.4, uvw.y) * wall, base = lodge * wall * step(uvw.y, 3.6), fine = clamp(1.0 - fwidth(uvw.y) * 2.2, 0.0, 1.0);
          float hasW = step(0.18, texture2D(uNoise, (cell + 0.5) / 256.0 + 0.37, -8.0).g) * up * (1.0 - base), inX = step(0.30, f.x) * step(f.x, 0.70), inY = step(0.36, f.y) * step(f.y, 0.78);
          bWin = inX * inY * hasW;
          float frame = step(0.272, f.x) * step(f.x, 0.728) * step(0.335, f.y) * step(f.y, 0.805) * hasW * (1.0 - inX * inY);                                  // painted window frames
          float munt = bWin * max(step(abs(f.x - 0.5), 0.007), step(abs(f.y - 0.6), 0.006)) * fine, sill = step(0.25, f.x) * step(f.x, 0.75) * step(0.30, f.y) * step(f.y, 0.335) * hasW;   // glazing bars and a stone sill
          float shut = (step(0.19, f.x) * step(f.x, 0.262) + step(0.738, f.x) * step(f.x, 0.81)) * inY * hasW;                                                // shutters either side
          vec2 sf = fract(uvw / vec2(4.2, 3.6)); float shop = base * step(0.1, sf.x) * step(sf.x, 0.9) * step(0.2, sf.y) * step(sf.y, 0.82); bWin = max(bWin, shop);   // shopfronts along the plaza
          bLit = max(bWin * (1.0 - shop) * step(0.62, texture2D(uNoise, (cell + 0.5) / 256.0, -8.0).r), shop * 0.8);
          float n1 = texture2D(uNoise, uvw * 0.9).r, n2 = texture2D(uNoise, vec2(uvw.x * 0.13, uvw.y * 0.5)).g, streak = smoothstep(0.55, 0.9, texture2D(uNoise, vec2(uvw.x * 0.7, uvw.y * 0.035)).b);
          vec3 wallC = diffuseColor.rgb * (0.84 + 0.2 * n1 + 0.1 * n2) * (1.0 - 0.13 * streak * wall);                                                        // rough stucco, weathered in streaks down the wall
          float board = (1.0 - lodge) * wall * step(2.7, uvw.y), by = uvw.y / 0.19;                                                                           // chalets: lapped timber boards above the ground floor
          wallC *= 1.0 - board * fine * (0.24 * step(fract(by), 0.13) + 0.12 * step(fract(uvw.x / 2.4 + floor(by) * 0.37), 0.015)) + board * 0.08 * (texture2D(uNoise, vec2(uvw.x * 0.05, floor(by) * 0.13)).r - 0.5);
          vec2 sq = vec2(uvw.x / 0.62, uvw.y / 0.31); sq.x += floor(sq.y) * 0.5; vec2 sfr = fract(sq); float mortar = max(step(sfr.x, 0.07), step(sfr.y, 0.11)) * fine;   // the ground floor is coursed stone
          vec3 stoneC = mix(vec3(0.2, 0.19, 0.18), vec3(0.44, 0.41, 0.36), texture2D(uNoise, (floor(sq) + 0.5) / 256.0, -8.0).r) * (0.85 + 0.3 * n1); stoneC = mix(stoneC, vec3(0.11, 0.105, 0.1), mortar);
          wallC = mix(wallC, stoneC, base);
          float tf = lodge * wall * (1.0 - base) * step(abs(fract(w.x) - 0.5), 0.5) * step(fract(w.x), 0.035) * step(texture2D(uNoise, vec2(floor(uvw.y / 3.0) * 0.21, 0.6), -8.0).r, 0.45);   // timber posts on some floors
          wallC = mix(wallC, vec3(0.13, 0.09, 0.06), max(tf, wall * (1.0 - base) * step(fract(uvw.y / 3.0), mix(0.05, 0.1, lodge)) * step(0.4, uvw.y)));        // floor bands
          wallC = mix(wallC, vec3(0.84, 0.82, 0.76), max(frame, sill)); wallC = mix(wallC, mix(vec3(0.08, 0.17, 0.12), vec3(0.28, 0.11, 0.07), step(0.5, texture2D(uNoise, vec2(floor(uvw.y / 3.0) * 0.37 + 0.2, 0.3), -8.0).g)), shut * (1.0 - shop));
          diffuseColor.rgb = mix(wallC, vec3(0.05, 0.07, 0.10), bWin); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.8, 0.74), munt * (1.0 - shop));
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.05, 0.11, 0.09), vec3(0.9, 0.92, 0.95), step(0.38, texture2D(uNoise, vWp.xz * 0.07).r + (texture2D(uNoise, vWp.xz * 0.6).g - 0.5) * 0.3)), roofS); }`)
        .replace("#include <roughnessmap_fragment>", "float roughnessFactor = mix(roughness, 0.06, bWin);").replace("#include <metalnessmap_fragment>", "float metalnessFactor = bWin * 0.9;")
        .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance += vec3(1.0, 0.62, 0.28) * bLit * uLamp;");
    }
  });
  bldMat.defines = { USE_UV: "" };
  const m = new THREE.Mesh(g, bldMat); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
}
function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; }
function buildingAt(x, z) {
  for (const s of SHOPS) if (shopInside(s, x, z)) return null;   // a shop's room and doorway are open space inside its building
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
  for (let i = 0; i < NPC_N; i++) { let t = hash2(i, 3, 71) * tot, k = 0; while (k < npcRuns.length - 1 && t > npcRuns[k].len) t -= npcRuns[k++].len; npcs.push({ k, s: t, v: 3.2 + 3.8 * hash2(i, 5, 72), ph: hash2(i, 7, 73) * TAU, lam: 28 + 34 * hash2(i, 9, 74), seg: 0 }); npcMesh.setColorAt(i, c.setHex(i % 11 === 5 ? 0xc8102e : JK[i % JK.length])); }
  initQueues(npcMesh.geometry, npcMesh.material, JK);
}
const _ne = new THREE.Euler();
let signT = 0;
function updateNPCs(dt, cam) {
  signT -= dt; if (signT <= 0) { signT = 0.5; updateQueues(); for (const q of signs) q[0].visible = q[1].visible = Math.abs(q[2] - cam.x) + Math.abs(q[3] - cam.z) < 700; for (const q of liftSigns) q[0].visible = Math.abs(q[1] - cam.x) + Math.abs(q[2] - cam.z) < 900; }
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

/* SLOW banners where runs funnel together: the bottom of each groomed run, along the cat tracks, and coming into every lift base */
function initSlow() {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 160; const g = cv.getContext("2d"); g.fillStyle = "#f7b500"; g.fillRect(0, 0, 512, 160); g.strokeStyle = "#111"; g.lineWidth = 10; g.strokeRect(9, 9, 494, 142);
  g.fillStyle = "#111"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 128px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; g.fillText("SLOW", 256, 86);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const pos = [], nor = [], uv = [], idx = [], posts = new GeoBag(), placed = [];
  const put = (x, z, dx, dz) => { // banner facing skiers who come down along (dx, dz)
    if (!inWorld(x, z, 240) || buildingAt(x, z)) return; for (const q of placed) if (Math.abs(q[0] - x) + Math.abs(q[1] - z) < 70) return; placed.push([x, z]);
    const y = H(x, z), rx = -dz, rz = dx, w = 1.5, y0 = y + 1.25, y1 = y + 2.15;
    for (const f of [1, -1]) { const o = pos.length / 3, nx = -dx * f, nz = -dz * f, ox = nx * 0.02, oz = nz * 0.02;
      pos.push(x - rx * w * f + ox, y0, z - rz * w * f + oz, x + rx * w * f + ox, y0, z + rz * w * f + oz, x + rx * w * f + ox, y1, z + rz * w * f + oz, x - rx * w * f + ox, y1, z - rz * w * f + oz); for (let k = 0; k < 4; k++) nor.push(nx, 0, nz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    for (const sd of [-1, 1]) { posts.cyl(0.035, 0.035, 2.5, x + rx * w * sd, y + 1.0, z + rz * w * sd, [0.85, 0.3, 0.06], 5); towerHits.push({ x: x + rx * w * sd, z: z + rz * w * sd, r: 0.1 }); }
  };
  for (const L of LIFTS) { if (L.carpet) continue; const fx = Math.sin(L.dir), fz = Math.cos(L.dir); for (const sd of [-1, 1]) put(L.bot.x - fx * 26 - fz * sd * 9, L.bot.z - fz * 26 + fx * sd * 9, fx, fz); }
  for (const r of WORLD.runs) {
    if (!r.g || r.len < 300) continue; const P = r.pts, n = P.length, off = (r.c ? 11 : [46, 42, 30, 18][r.d]) * 0.5 + 1.5; let acc = 0, next = r.c ? 150 : 1e9;
    for (let i = 0; i < n - 1; i++) { const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
      if (acc + l > next) { const t = (next - acc) / l; put(lerp(a[0], b[0], t) - dz * off, lerp(a[1], b[1], t) + dx * off, dx, dz); next += 320; }
      if (i === n - 2) put(b[0] - dx * 35 + dz * off, b[1] - dz * 35 - dx * off, dx, dz); acc += l; }
  }
  if (!pos.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, worldShade(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))); m.frustumCulled = false; scene.add(m);
  const pm = new THREE.Mesh(posts.build(), liftMat); pm.frustumCulled = false; scene.add(pm);
}

/* ---------- the village: the tram building's Olympic rings and the clock tower ---------- */
/* People waiting at the bottom of each lift. The lines fill and empty over a few minutes, lift by lift. */
let queueMesh = null; const queues = [];
function initQueues(geo, mat, JK) {
  const c = new THREE.Color(); let n = 0;
  for (const L of LIFTS) { if (L.carpet) continue; const cnt = clamp(Math.round((L.occ || 2) * 2.2), 4, 14), fx = Math.sin(L.dir), fz = Math.cos(L.dir), back = L.type === "chair_fixed" ? 7.2 : L.type === "chair_det" ? 8.8 : L.type === "tram" ? 13.5 : L.type === "funitel" ? 9.5 : 5.5;
    queues.push({ L, i0: n, cnt, P: Array.from({ length: cnt }, (_, k) => { const lat = ((k % 4) - 1.5) * 1.25 + (hash2(L.id, k, 81) - 0.5) * 0.4, w = back + Math.floor(k / 4) * 1.7 + hash2(L.id, k, 82) * 0.5; return [L.bot.x - fx * w + fz * lat, L.bot.z - fz * w - fx * lat]; }) }); n += cnt; }
  queueMesh = new THREE.InstancedMesh(geo, mat, n); queueMesh.castShadow = true; queueMesh.frustumCulled = false; scene.add(queueMesh);
  for (let i = 0; i < n; i++) queueMesh.setColorAt(i, c.setHex(JK[(i * 7 + 3) % JK.length])); updateQueues();
}
function updateQueues() {
  if (!queueMesh) return;
  for (const q of queues) { const show = Math.round(q.cnt * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(liftTime / 75 + q.L.id * 1.7))));
    for (let k = 0; k < q.cnt; k++) { const p = q.P[k]; if (k < show) { _lq.setFromAxisAngle(_up, q.L.dir + (hash2(q.L.id, k, 83) - 0.5) * 0.5); _lm.compose(_lp.set(p[0], H(p[0], p[1]), p[1]), _lq, _ls); } else _lm.makeScale(0, 0, 0); queueMesh.setMatrixAt(q.i0 + k, _lm); } }
  queueMesh.instanceMatrix.needsUpdate = true;
}
/* Snowmaking guns along the edges of the lower groomed runs, and dead whitebark snags standing near treeline. */
function initSnowGuns() {
  const b = new GeoBag(), WID = [46, 42, 30, 18]; let n = 0;
  for (const r of WORLD.runs) { if (!r.g || r.len < 300) continue; let acc = 35, k = 0;
    for (let i = 0; i < r.pts.length - 1 && n < 170; i++) { const a = r.pts[i], c = r.pts[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; acc += l; if (acc < 75) continue; acc = 0;
      const sd = k++ % 2 ? 1 : -1, hw = (WID[r.d] || 30) / 2 + 1.5, x = a[0] - (c[1] - a[1]) / l * hw * sd, z = a[1] + (c[0] - a[0]) / l * hw * sd, y = H(x, z); if (y > 1985 || buildingAt(x, z) || cliffK(x, z) > 0.1) continue;
      const yaw = Math.atan2(a[0] - x, a[1] - z), tilt = 0.32, len = 8.5, sx = Math.sin(yaw) * Math.sin(tilt), sz = Math.cos(yaw) * Math.sin(tilt), cy = Math.cos(tilt);
      b.box(0.55, 0.9, 0.55, x, y + 0.25, z, [0.85, 0.66, 0.05], yaw); b.cyl(0.045, 0.06, len, x + sx * len / 2, y + 0.6 + cy * len / 2, z + sz * len / 2, STEEL, 6, tilt, 0, yaw);
      b.box(0.3, 0.22, 0.55, x + sx * len, y + 0.6 + cy * len, z + sz * len, [0.85, 0.66, 0.05], yaw, tilt); towerHits.push({ x, z, r: 0.4 }); n++; } }
  const tr = [0.42, 0.40, 0.37]; let m = 0;
  for (let gz = Z0 + 80; gz < Z1 - 80 && m < 1100; gz += 34) for (let gx = X0 + 80; gx < X1 - 80; gx += 34) { const x = gx + hash2(gx, gz, 95) * 30, z = gz + hash2(gx, gz, 96) * 30, hr = hash2(gx, gz, 97); if (hr > 0.2) continue;
    const y = H(x, z); if (y < 2380 || y > 2720 || clearMask(x, z) > 0.06 || cliffK(x, z) > 0.15 || hr > 0.05 + 0.15 * sstep(2450, 2650, y)) continue;
    const h = 4 + 6 * hash2(gx, gz, 98), lean = (hash2(gx, gz, 99) - 0.5) * 0.25, yw = hr * 60; b.cyl(0.05, 0.2 + h * 0.012, h + 0.6, x, y + h / 2 - 0.3, z, tr, 6, lean, lean * 0.6, yw);
    for (let k = 0; k < 3; k++) { const hy = h * (0.45 + 0.17 * k), a = yw + k * 2.2; b.cyl(0.02, 0.045, 1.3 - k * 0.25, x + Math.sin(a) * 0.5, y + hy, z + Math.cos(a) * 0.5, tr, 4, 1.15, 0, a); } m++; }
  if (b.p.length) { const mesh = new THREE.Mesh(b.build(), worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }))); mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh); }
}
const FIREPITS = [], PLAZA_OBST = [];   // the plaza's fire pits (with the places to sit round them) and the things on it you walk round
function initVillage() {
  const b = new GeoBag(), tram = LIFTS.find(l => l.type === "tram");
  if (tram) { const fx = Math.sin(tram.dir), fz = Math.cos(tram.dir), x0 = tram.bot.x - fx * 12.25, z0 = tram.bot.z - fz * 12.25, y0 = tram.bot.g + 9.2, rx = -fz, rz = fx, yaw = Math.atan2(-fx, -fz);
    [[-2.5, 0, [0.02, 0.2, 0.62]], [0, 0, [0.02, 0.02, 0.02]], [2.5, 0, [0.72, 0.03, 0.05]], [-1.25, -1.1, [0.85, 0.6, 0.02]], [1.25, -1.1, [0.02, 0.42, 0.14]]].forEach(([u, v, c]) => b.add(new THREE.TorusGeometry(1.05, 0.13, 8, 28), _gm.compose(_gp.set(x0 + rx * u, y0 + v, z0 + rz * u), _gq.setFromEuler(_ge.set(0, yaw, 0, "YXZ")), _gs.set(1, 1, 1)), c)); }
  const ct = WORLD.blds.find(bd => /clock tower/i.test(bd.n || ""));
  if (ct) { const x = ct.cx, z = ct.cz, g = Hsmooth(x, z); b.box(4.6, 17, 4.6, x, g + 8.5, z, [0.36, 0.33, 0.30]); b.box(5.4, 0.6, 5.4, x, g + 17.2, z, [0.2, 0.15, 0.1]); b.add(new THREE.ConeGeometry(3.9, 5, 4), _gm.compose(_gp.set(x, g + 20, z), _gq.setFromEuler(_ge.set(0, Math.PI / 4, 0)), _gs.set(1, 1, 1)), [0.05, 0.11, 0.09]);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, px = x + Math.sin(a) * 2.34, pz = z + Math.cos(a) * 2.34; b.add(new THREE.CircleGeometry(1.25, 20), _gm.compose(_gp.set(px, g + 14.4, pz), _gq.setFromEuler(_ge.set(0, a, 0)), _gs.set(1, 1, 1)), [0.9, 0.88, 0.8]); b.box(0.09, 0.95, 0.04, px + Math.sin(a) * 0.03, g + 14.8, pz + Math.cos(a) * 0.03, DARK, a); b.box(0.09, 0.65, 0.04, px + Math.sin(a) * 0.03 + Math.cos(a) * 0.25, g + 14.5, pz + Math.cos(a) * 0.03 - Math.sin(a) * 0.25, DARK, a, 0, 1.1); } }
  if (ct) { // the plaza: lamp posts, fire pits with benches, a row of flags, and the timber gateway toward the lifts
    const x0 = PLAZA.r ? PLAZA.x : ct.cx, z0 = PLAZA.r ? PLAZA.z : ct.cz, WOOD = [0.36, 0.25, 0.15],   // the lamps, fire pits, flags and gateway stand in the main village
    FL = [[0.75, 0.08, 0.1], [0.05, 0.2, 0.55], [0.9, 0.9, 0.92], [0.9, 0.62, 0.05], [0.05, 0.4, 0.2], [0.05, 0.11, 0.2]];
    const asp = PLAZA.r ? PLAZA.asp : 1, free = (x, z) => !buildingAt(x, z) && !buildingAt(x + 1, z + 1) && !SHOPS.some(q => shopInside(q, x, z));
    for (let k = 0; k < 34; k++) { const a = k * 2.399, r = 10 + k * 2.6, x = x0 + Math.sin(a) * r * asp, z = z0 + Math.cos(a) * r; if (!free(x, z)) continue; const g = H(x, z);
      b.cyl(0.05, 0.075, 3.9, x, g + 1.55, z, DARK, 6); b.box(0.34, 0.42, 0.34, x, g + 3.6, z, [0.95, 0.86, 0.6]); b.box(0.46, 0.07, 0.46, x, g + 3.84, z, DARK); towerHits.push({ x, z, r: 0.2 }); }
    for (let k = 0; k < 5; k++) { const a = 0.8 + k * 1.3, x = x0 + Math.sin(a) * 24 * asp, z = z0 + Math.cos(a) * 24; if (!free(x, z) || !free(x + 2, z) || !free(x - 2, z)) continue; const g = H(x, z);
      b.cyl(0.95, 1.05, 0.7, x, g + 0.1, z, [0.33, 0.31, 0.29], 12); b.cyl(0.72, 0.72, 0.06, x, g + 0.46, z, [0.95, 0.42, 0.06], 10); towerHits.push({ x, z, r: 1.1 }); const pit = { x, z, g, a, seats: [] }; FIREPITS.push(pit); PLAZA_OBST.push([x, z, 1.05]);
      for (let j = 0; j < 3; j++) { const ba = a + 1 + j * 2.09, bx2 = x + Math.sin(ba) * 2.3, bz2 = z + Math.cos(ba) * 2.3, gb = H(bx2, bz2); b.box(1.7, 0.08, 0.46, bx2, gb + 0.46, bz2, WOOD, ba + Math.PI / 2); b.box(1.5, 0.62, 0.1, bx2, gb + 0.12, bz2, DARK, ba + Math.PI / 2); for (const e of [-0.42, 0.42]) pit.seats.push({ x: bx2 + Math.cos(ba) * e, z: bz2 - Math.sin(ba) * e, tx: x, tz: z, bench: true }); } }
    for (let k = 0; k < 6; k++) { const x = x0 - 12 + k * 4.5, z = z0 - 24; if (buildingAt(x, z)) continue; const g = H(x, z); b.cyl(0.04, 0.06, 9, x, g + 4, z, STEEL, 6); b.box(1.5, 0.95, 0.03, x + 0.8, g + 7.9, z, FL[k]); towerHits.push({ x, z, r: 0.2 }); }
    const fu = LIFTS.find(l => l.type === "funitel");
    if (fu) { const dx = fu.bot.x - x0, dz = fu.bot.z - z0, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, px = x0 + ux * l * 0.62, pz = z0 + uz * l * 0.62, yaw = Math.atan2(ux, uz), g = H(px, pz);
      if (!buildingAt(px, pz)) { for (const sd of [-1, 1]) { const x = px + uz * sd * 5.2, z = pz - ux * sd * 5.2, gp = H(x, z); b.box(0.42, 6.4, 0.42, x, gp + 2.2, z, WOOD, yaw); towerHits.push({ x, z, r: 0.4 }); }
        b.box(11.4, 0.95, 0.36, px, g + 4.75, pz, WOOD, yaw); b.box(11.8, 0.2, 0.6, px, g + 5.33, pz, [0.9, 0.92, 0.95], yaw);
        const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 80; const c2 = cv.getContext("2d"); c2.fillStyle = "#2a1a0e"; c2.fillRect(0, 0, 1024, 80); c2.fillStyle = "#f1e6cf"; c2.textAlign = "center"; c2.textBaseline = "middle"; c2.font = "800 50px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; c2.fillText("THE VILLAGE AT PALISADES TAHOE", 512, 42);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const sm = worldShade(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
        for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 0.82), sm); m.position.set(px + ux * sd * 0.19, g + 4.75, pz + uz * sd * 0.19); m.rotation.y = yaw + (sd < 0 ? Math.PI : 0); scene.add(m); } } }
  }
  if (b.p.length) { const m = new THREE.Mesh(b.build(), liftMat); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
}
/* ---------- terrain park hardware: rails with their posts, lip markers, and a banner at the top of each line ---------- */
/* Each cut jump gets its own fine snow mesh (25 cm at the takeoff) so the lip, the square side walls and the deck edge are as crisp as a cat-cut feature. */
const cutMeshes = [];
function buildCut(f) {
  const L = f.Lr + f.T + f.Ld, fine = 0.25, wF = f.W / 2 + 1.3, wAll = f.deck > 0 ? f.W / 2 + 5 : wF, S = [], Uu = [];
  for (let s = -1; s < f.Lr + 1.5; s += fine) S.push(s); for (let s = f.Lr + 1.5; s < L + 1; s += 1) S.push(s); S.push(L + 1);
  for (let u = -wAll; u < -wF; u += 0.6) Uu.push(u); for (let u = -wF; u < wF; u += fine) Uu.push(u); for (let u = wF; u < wAll; u += 0.6) Uu.push(u); Uu.push(wAll);
  const ns = S.length, nu = Uu.length, hg = new Float32Array(ns * nu), pos = new Float32Array(ns * nu * 3), nor = new Float32Array(ns * nu * 3), idx = [];
  const cx = f.x + f.dx * L / 2, cz = f.z + f.dz * L / 2, cy = H(cx, cz);
  for (let j = 0; j < ns; j++) for (let i = 0; i < nu; i++) { const x = f.x + f.dx * S[j] - f.dz * Uu[i], z = f.z + f.dz * S[j] + f.dx * Uu[i], h = H(x, z), k = (j * nu + i) * 3; hg[j * nu + i] = h; pos[k] = x - cx; pos[k + 1] = h + 0.05 - cy; pos[k + 2] = z - cz; }
  for (let j = 0; j < ns; j++) for (let i = 0; i < nu; i++) { const j0 = Math.max(0, j - 1), j1 = Math.min(ns - 1, j + 1), i0 = Math.max(0, i - 1), i1 = Math.min(nu - 1, i + 1);
    const hs = (hg[j1 * nu + i] - hg[j0 * nu + i]) / (S[j1] - S[j0]), hu = (hg[j * nu + i1] - hg[j * nu + i0]) / (Uu[i1] - Uu[i0]), nx = -hs * f.dx + hu * f.dz, nz = -hs * f.dz - hu * f.dx, il = 1 / Math.hypot(nx, 1, nz), k = (j * nu + i) * 3; nor[k] = nx * il; nor[k + 1] = il; nor[k + 2] = nz * il; }
  for (let j = 0; j < ns - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = j * nu + i, b = a + 1, c = a + nu, d = c + 1; idx.push(a, b, c, b, d, c); }   // wound to face up: the other way round you see straight through the near side of the jump
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setIndex(idx); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, matNear); m.position.set(cx, cy, cz); m.matrixAutoUpdate = false; m.updateMatrix(); m.receiveShadow = true; m.castShadow = true; m.renderOrder = -2; scene.add(m); cutMeshes.push(m);
}
function updatePark(cam) { for (const m of cutMeshes) m.visible = Math.hypot(m.position.x - cam.x, m.position.z - cam.z) < 900; }
function initParkMeshes() {
  for (const f of PARK) if (f.cut) buildCut(f);
  const b = new GeoBag(), COL = [[0.9, 0.33, 0.06], [0.08, 0.3, 0.75], [0.85, 0.7, 0.05]]; let k = 0; const flagG = [];
  for (const f of PARK) {
    const yaw = Math.atan2(f.dx, f.dz), rx = -f.dz, rz = f.dx;
    if (f.k === "rail") { f.y0 = H(f.x, f.z) + f.hgt; f.y1 = H(f.x + f.dx * f.len, f.z + f.dz * f.len) + f.hgt; const c = COL[k++ % 3], mx = f.x + f.dx * f.len / 2, mz = f.z + f.dz * f.len / 2, pit = Math.atan2(f.y1 - f.y0, f.len);
      b.box(0.16, 0.1, Math.hypot(f.len, f.y1 - f.y0), mx, (f.y0 + f.y1) / 2 - 0.05, mz, c, yaw, -pit);
      for (const u of [0.08, 0.5, 0.92]) { const px = f.x + f.dx * f.len * u, pz = f.z + f.dz * f.len * u, gy = H(px, pz); b.box(0.08, lerp(f.y0, f.y1, u) - gy, 0.08, px, (lerp(f.y0, f.y1, u) + gy) / 2 - 0.05, pz, DARK, yaw); } }
    if (f.k === "mound") { const cx = f.x + f.dx * f.R * 0.5, cz = f.z + f.dz * f.R * 0.5, y = H(cx, cz); b.cyl(0.62, 0.62, 2.3, cx, y + 0.45, cz, [0.85, 0.3, 0.05], 14, 0, Math.PI / 2, yaw); for (const e of [-1, 1]) b.cyl(0.64, 0.64, 0.08, cx + rx * e * 1.1, y + 0.45, cz + rz * e * 1.1, [0.5, 0.17, 0.03], 14, 0, Math.PI / 2, yaw); }   // the orange tank to tap or slide
    if (f.k === "table" && !f.side && !f.lip) { // the lip is marked with a line of blue dye so you can read it against the snow
      const lx = f.x + f.dx * (f.Lr - 0.25), lz = f.z + f.dz * (f.Lr - 0.25); b.box(f.W - 0.3, 0.04, 0.2, lx, H(lx, lz) + 0.02, lz, [0.03, 0.16, 0.7], yaw); }
    if (f.k === "table" && (f.kind === "big" || f.kind === "mid")) { // green flags either side of the landing, as the crew marks them
      for (const sd of [-1, 1]) { const s0 = f.Lr + f.T + 1, px = f.x + f.dx * s0 + rx * sd * (f.W / 2 + 4.5), pz = f.z + f.dz * s0 + rz * sd * (f.W / 2 + 4.5), y = H(px, pz); b.cyl(0.035, 0.035, 5.4, px, y + 2.6, pz, [0.75, 0.76, 0.78], 5); flagG.push([px, y + 4.6, pz, yaw]); towerHits.push({ x: px, z: pz, r: 0.1 }); } }
  }
  if (b.p.length) { const m = new THREE.Mesh(b.build(), liftMat); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  if (flagG.length) { const pos = [], nor = []; for (const [x, y, z, yaw] of flagG) { const fx = Math.sin(yaw + 0.5), fz = Math.cos(yaw + 0.5), A = [x, y + 0.5, z], B = [x, y - 0.5, z], C = [x + fx * 1.3, y, z + fz * 1.3]; for (const q of [A, B, C]) { pos.push(...q); nor.push(-fz, 0, fx); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    const m = new THREE.Mesh(g, worldShade(new THREE.MeshStandardMaterial({ color: 0x8fd31a, roughness: 0.7, side: THREE.DoubleSide }))); m.frustumCulled = false; scene.add(m); }
  // banner at the head of each park line
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 160; const g = cv.getContext("2d"); g.fillStyle = "#e8580c"; g.fillRect(0, 0, 1024, 160); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 112px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; g.fillText("TERRAIN PARK", 512, 86);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const mat = worldShade(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide })), posts = new GeoBag(); let last = null;
  for (const f of PARK) { if (f.k !== "table" || f.lip || f.side || f.comp) continue; if (last && Math.hypot(f.x - last.x, f.z - last.z) < 200) { last = f; continue; } last = f;
    const x = f.x - f.dx * 14, z = f.z - f.dz * 14, y = H(x, z), rx = -f.dz, rz = f.dx, m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), mat); m.position.set(x, y + 4.2, z); m.rotation.y = Math.atan2(-f.dx, -f.dz); scene.add(m);
    for (const sd of [-1, 1]) { posts.cyl(0.09, 0.1, 5.2, x + rx * sd * 4.6, y + 2.3, z + rz * sd * 4.6, STEEL, 6); towerHits.push({ x: x + rx * sd * 4.6, z: z + rz * sd * 4.6, r: 0.18 }); } }
  if (posts.p.length) { const pm = new THREE.Mesh(posts.build(), liftMat); pm.frustumCulled = false; scene.add(pm); }
}
