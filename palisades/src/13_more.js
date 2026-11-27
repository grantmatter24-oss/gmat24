/* ---------- more mountain: the snowboard, the halfpipe and wall rides, the grooming fleet, and the chairlift's bar, sway and unload ramp ---------- */

/* ===== snowboard =====
   Chosen at the tuning bench. One board under both feet, ridden sideways: the body is turned a quarter round on the same legs, the feet are set wide
   and ducked out, there are no poles, and the lean of a turn becomes a lean onto the toes or the heels. */
const boardOn = () => outfit.ride === "board";
function boardFor(R) {
  if (R.board) return R.board; const g = new THREE.Group(), n = 44, ring = 12, pos = new Float32Array((n + 1) * ring * 3), uv = new Float32Array((n + 1) * ring * 2), idx = [];
  for (let a = 0; a <= n; a++) { const t = a / n, X = -0.78 + 1.56 * t, e = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 7))), wd = (0.138 - 0.014 * Math.sin(Math.PI * t)) * e, th = 0.0105 * (0.4 + 0.6 * e), yc = 0.012 + 0.085 * Math.pow(Math.max(0, (Math.abs(X) - 0.5) / 0.28), 2);   // twin tip: both ends kick up the same
    for (let k = 0; k < ring; k++) { const ang = k / ring * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang), o = (a * ring + k) * 3; pos[o] = X; pos[o + 1] = yc + th * Math.sign(sn) * Math.pow(Math.abs(sn), 0.3); pos[o + 2] = wd * Math.sign(c) * Math.pow(Math.abs(c), 0.3); uv[(a * ring + k) * 2] = k / ring; uv[(a * ring + k) * 2 + 1] = t; } }
  for (let a = 0; a < n; a++) for (let k = 0; k < ring; k++) { const p0 = a * ring + k, p1 = a * ring + (k + 1) % ring, q0 = p0 + ring, q1 = p1 + ring; idx.push(p0, p1, q0, p1, q1, q0); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const deck = new THREE.Mesh(geo, R.skiM); deck.castShadow = true; deck.frustumCulled = false; g.add(deck);
  const bk = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.5, metalness: 0.25 }), hb = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6 });
  for (const sd of [-1, 1]) { const b = new THREE.Group(); b.position.set(sd * 0.26, 0.03, 0); b.rotation.y = -sd * 0.22; g.add(b);   // a strap binding under each boot: base plate, highback, two straps
    const add = (w, h, d, x, y, z, m, rx) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); if (rx) q.rotation.x = rx; q.castShadow = true; q.frustumCulled = false; b.add(q); };
    add(0.13, 0.014, 0.27, 0, 0.004, 0.0, bk); add(0.115, 0.2, 0.014, 0, 0.11, 0.135, hb, 0.12); add(0.14, 0.03, 0.035, 0, 0.1, -0.02, bk); add(0.14, 0.028, 0.035, 0, 0.055, -0.1, bk); }
  g.visible = false; R.rig.add(g); R.board = g; return g;
}
/* called at the end of poseRider: lays the snowboard stance over Kicker Run's skiing pose */
function boardPose(R, q, keys) {
  const on = R.ride === "board", riding = on && (q.mode === "ski" || q.mode === "lift") && !q.lost; if (!on && !R.board) return;
  const B = boardFor(R); B.visible = riding; if (!riding) return;
  footGear(R, false); R.skiMeshes.forEach(m => { m.visible = false; }); R.arms.forEach(a => { a.pole.visible = false; }); R.skiBack.visible = false;
  const seated = q.mode === "lift", air = !q.ground && !seated, grab = air && keys && (keys.grab || keys.grabN || keys.grabI || keys.grabQ || keys.grabS);
  if (seated) { // on the chair the board hangs from the front foot, turned along the line of the lift
    R.rig.rotation.y = 0; B.position.set(-0.13, R.skiG[0].position.y - 0.2 + 0.03, 0.02); B.rotation.set(0.1, Math.PI / 2 - 0.3, 0); R.skiG.forEach(sg => { sg.rotation.z = 0; }); return; }
  R.rig.rotation.y = -(q.spin + (q.sw ? Math.PI : 0)) - Math.PI / 2;   // sideways: the left foot leads
  const yb = (R.skiG[0].position.y + R.skiG[1].position.y) / 2, zb = (R.skiG[0].position.z + R.skiG[1].position.z) / 2, tilt = (R.skiG[0].rotation.x + R.skiG[1].rotation.x) / 2;
  R.skiG.forEach((sg, i) => { const sd = i ? 1 : -1; sg.position.set(sd * 0.26, yb, zb); sg.rotation.set(tilt * 0.5, -sd * 0.22, 0); });   // both boots on the one board, set wide and ducked out
  R.legs.forEach((l, i) => { l.hip.rotation.z = (i ? 1 : -1) * 0.2; });
  B.position.set(0, yb - 0.2 + 0.022, zb - 0.045); B.rotation.set(tilt * 0.5, 0, 0);
  R.torso.rotation.y = (R.torso.rotation.y || 0) * 0.3 + 0.38; R.torso.rotation.z = 0; R.torso.updateMatrix(); R.head.rotation.y = 0.72;   // shoulders open and the head turned to look down the hill
  if (!q.crashed) R.arms.forEach((a, i) => { const sd = a.sd; if (grab && i === (keys.grabN || keys.grabS ? 0 : 1)) { a.sh.rotation.set(0.75, 0, sd * 0.1); a.el.rotation.set(0.25, 0, 0); } else { a.sh.rotation.set(0.12, 0, sd * (i ? 0.62 : 0.95)); a.el.rotation.set(0.42, 0, 0); } });   // arms out for balance; one hand to the board for a grab
}
/* a skier's trick name, said the way a snowboarder would */
function boardLabel(s, spin) {
  if (!s) return s; const dir = sk.sw ? "Cab " : spin > 0 ? "Frontside " : "Backside ";
  return s.replace("Half cab 180", dir + "180").replace(/Flat (\d+)/, (m, d) => dir + d).replace("Backflip", "Wildcat").replace("Frontflip", "Tamedog").replace("Safety grab", "Mute").replace("Japan grab", "Method").replace("Indy grab", "Indy");
}

/* ===== halfpipe and wall rides =====
   The walls stop at 68 degrees, so the last of the way to vertical is done here: leaving the lip, the speed that was carrying you out over the deck
   is turned straight up, with a little drift back in, and you come down onto the wall you left. The turn in the air is the pipe's own: you go up
   facing out and come down facing in. */
function pipeLip(x0, z0, x1, z1) { const f = PIPE; if (!f || sk.sp < 4) return false; const e = f.a + f.dW - 0.12, rx = x1 - f.x, rz = z1 - f.z, s = rx * f.dx + rz * f.dz; if (s < 14 || s > f.len - 12) return false; return Math.abs(-rx * f.dz + rz * f.dx) >= e && Math.abs(-(x0 - f.x) * f.dz + (z0 - f.z) * f.dx) < e; }
function pipeLaunch() {
  sk.pipe = null; sk.pipeD = 0; const f = pipeAt(sk.p.x, sk.p.z); if (!f) return; const p = sk.p, v = sk.v, cx = -f.dz, cz = f.dx, ul = -(p.x - f.x) * f.dz + (p.z - f.z) * f.dx, sd = Math.sign(ul) || 1;
  if (Math.abs(ul) < f.a + f.dW * 0.55 || (Math.sin(sk.yaw) * cx + Math.cos(sk.yaw) * cz) * sd < 0.15) return;   // only off the upper wall, on the way up it
  const sp = Math.max(sk.sp, v.length()), al = v.x * f.dx + v.z * f.dz, up = Math.sqrt(Math.max(0, sp * sp - al * al)); if (up < 3) return;
  v.set(f.dx * al - cx * sd * 0.8, Math.min(15.5, Math.max(v.y, up * 1.15 + 2.5) + (sk.popT > 0 ? 2.5 : 0)), f.dz * al - cz * sd * 0.8);   // a pumped transition: you leave with a little more than you brought, and a pop off the lip adds to it p.y = Math.max(p.y, H(p.x, p.z) + 0.05);
  const ax = Math.atan2(f.dx, f.dz); sk.pipe = f; sk.pipeT = Math.max(0.45, 2 * v.y / G); sk.pipeY0 = sk.yaw; sk.pipeDY = wrap(2 * ax - 2 * sk.yaw); sk.pipeR0 = sk.rot; sk.pipeK = 0; sk.pipeLipY = p.y; sk.peakY = p.y; sk.featLaunch = true;
}
function pipeAir(dt) { const k0 = sk.pipeK, k1 = Math.min(1, sk.airT / sk.pipeT), d = sk.pipeR0 * (Math.cos(Math.PI * k1) - Math.cos(Math.PI * k0)); sk.pipeK = k1; sk.yaw = sk.pipeY0 + sk.pipeDY * smooth(k1); sk.rot += d; sk.pipeD = d; }   // nose up going out, level at the top, nose down coming in
function pipeHit() {
  const h = Math.max(0, sk.peakY - (sk.pipeLipY || sk.peakY)); sk.pipeN = liftTime - (sk.pipeWhen || -99) < 7 ? (sk.pipeN || 0) + 1 : 1; sk.pipeWhen = liftTime;
  sk.pipeMul = 1 + 0.12 * Math.min(sk.pipeN - 1, 8) + 0.1 * Math.min(h, 6); sk.pipeLbl = (units === "imp" ? Math.round(h * FT) + " ft" : h.toFixed(1) + " m") + " out of the pipe" + (sk.pipeN > 1 ? " · hit " + sk.pipeN : "");   // each wall in a row is worth more, and so is height
}
function wallTick(dt) {
  const on = sk.mode === "ski" && sk.ground && !sk.crashed && !sk.grind && sk.sp > 4 && wallAt(sk.p.x, sk.p.z);
  if (on) { sk.wallT = (sk.wallT || 0) + dt; if (Math.random() < 0.5) spray(sk.p, 0.6 + Math.random(), (Math.random() - 0.5) * 2, sk.v, 0.4); }
  else if (sk.wallT > 0) { if (sk.wallT > 0.22 && !sk.crashed) { payout(200 + sk.wallT * 600, "Wall ride", false, false); sfx("land", 0.6); } sk.wallT = 0; }
}

/* ===== grooming =====
   A coarse map of how skied-off each patch of groomed snow is. The ground shader reads it: fresh corduroy where it is zero, the ribs worn away and
   ski tracks showing where it is high. Every skier who passes wears it a little; the snowcats working the runs lay it back down behind them. */
const GROOM = { cell: 8, w: 0, h: 0, f: null, d: null, tex: null, dirty: false, t: 0, cats: [], cordD: 0, px: 0, pz: 0 };
function groomInit() {
  const g = GROOM; g.w = Math.ceil((X1 - X0) / g.cell); g.h = Math.ceil((Z1 - Z0) / g.cell); g.f = new Float32Array(g.w * g.h); g.d = new Uint8Array(g.w * g.h);
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = 0.32 + 0.3 * hash2(i >> 3, j >> 3, 91) + 0.12 * hash2(i, j, 92); g.f[j * g.w + i] = v; g.d[j * g.w + i] = v * 255; }   // the morning after a night shift: some runs fresher than others
  g.tex = new THREE.DataTexture(g.d, g.w, g.h, THREE.RedFormat); g.tex.unpackAlignment = 1; g.tex.magFilter = g.tex.minFilter = THREE.LinearFilter; g.tex.needsUpdate = true; U.uWear.value = g.tex;
  const path = pts => { const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { S, pts, len: S[S.length - 1] }; };
  const runs = WORLD.runs.filter(r => r.g && !r.c && r.len > 420 && r.d <= 2).sort((a, b) => hash2(a.len, 5, 93) - hash2(b.len, 5, 93)), pick = [], gc = runs.find(r => r.n === "Gold Coast"), mr = runs.find(r => r.n === "Mountain Run");
  for (const r of [mr, gc, ...runs]) if (r && !pick.includes(r) && pick.length < 7 && !pick.some(q => q.n === r.n)) pick.push(r);
  const geo = catGeometry(), glow = (hex, sz) => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "#fff"); gr.addColorStop(0.25, hex); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.SpriteMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }); },
    white = glow("#ffe9b0"), amber = glow("#ff9a1a"), red = glow("#ff3020");
  pick.forEach((r, i) => { const grp = new THREE.Group(), m = new THREE.Mesh(geo, liftMat); m.castShadow = true; m.frustumCulled = false; grp.add(m); grp.rotation.order = "YXZ";
    const sp = (mat, x, y, z, s) => { const q = new THREE.Sprite(mat); q.position.set(x, y, z); q.scale.setScalar(s); grp.add(q); return q; };
    for (const sx of [-0.75, -0.25, 0.25, 0.75]) sp(white, sx, 2.95, 1.25, 0.75); for (const sx of [-1, 1]) { sp(white, sx * 0.95, 1.35, 2.25, 0.6); sp(red, sx * 1.0, 1.5, -2.45, 0.4); sp(white, sx * 0.8, 2.9, -0.55, 0.6); }   // work lights on the cab roof, headlights, tail lights, rear floods on the tiller
    const beacon = sp(amber, 0, 3.2, 0.3, 1.1), W = [46, 42, 30, 18][r.d];
    scene.add(grp); g.cats.push({ grp, beacon, p: path(r.pts), s: 30 + hash2(i, 3, 94) * (r.len - 60), dir: i % 2 ? -1 : 1, lane: (i % 5) - 2, half: Math.max(1, Math.floor((W / 2 - 4) / 5)), seg: 0, x: 0, z: 0, y: 0, yaw: 0, name: r.n }); });
}
function catGeometry() { // a tracked groomer: blade in front, cab forward, tiller and finisher behind; +z is forward
  const b = new GeoBag(), RED = [0.74, 0.07, 0.05], RED2 = [0.5, 0.05, 0.04], RUB = [0.035, 0.035, 0.04], AL = [0.55, 0.57, 0.6], YEL = [0.85, 0.62, 0.05];
  for (const sx of [-1, 1]) { b.box(0.95, 0.62, 4.5, sx * 1.42, 0.36, 0, RUB); for (let z = -2.1; z <= 2.1; z += 0.35) b.box(1.0, 0.07, 0.09, sx * 1.42, 0.69, z, AL); for (const z of [-1.8, -0.9, 0, 0.9, 1.8]) b.cyl(0.27, 0.27, 0.2, sx * 1.42, 0.34, z, STEEL, 10, 0, Math.PI / 2); b.cyl(0.34, 0.34, 1.0, sx * 1.42, 0.36, 2.2, RUB, 10, 0, Math.PI / 2); b.cyl(0.34, 0.34, 1.0, sx * 1.42, 0.36, -2.2, RUB, 10, 0, Math.PI / 2); }
  b.box(2.5, 0.55, 4.3, 0, 0.98, -0.05, RED); b.box(2.3, 0.5, 1.9, 0, 1.45, -1.15, RED2);   // hull and engine deck
  b.box(2.2, 1.25, 1.9, 0, 1.9, 0.85, RED); b.box(2.24, 0.62, 1.94, 0, 2.08, 0.87, GLASS); b.box(2.3, 0.1, 2.05, 0, 2.56, 0.85, RED2); b.box(1.9, 0.09, 0.12, 0, 2.72, 1.3, STEEL);   // cab, its glass, roof, light bar
  for (const sx of [-1, 1]) { b.box(0.07, 0.07, 1.5, sx * 1.02, 2.3, 0.6, STEEL, 0, -0.5); b.cyl(0.03, 0.03, 0.7, sx * 1.12, 2.9, 0.0, STEEL, 5); }
  b.box(4.9, 0.95, 0.12, 0, 0.62, 3.25, AL, 0, -0.22); for (const sx of [-1, 1]) { b.box(0.14, 0.14, 1.5, sx * 0.9, 0.62, 2.6, STEEL); b.box(0.9, 0.9, 0.1, sx * 2.72, 0.66, 3.0, AL, sx * -0.55, -0.22); }   // the blade and its wings
  b.cyl(0.33, 0.33, 4.9, 0, 0.42, -2.95, YEL, 12, 0, Math.PI / 2); b.box(5.1, 0.34, 0.9, 0, 0.72, -2.95, RED2); b.box(5.1, 0.05, 0.95, 0, 0.16, -3.75, YEL, 0, 0.12); for (const sx of [-1, 1]) b.box(0.12, 0.12, 1.3, sx * 0.8, 0.9, -2.4, STEEL);   // tiller drum under its hood, and the comb that prints the corduroy
  return b.build();
}
function wearAdd(x, z, a) { const g = GROOM; if (!g.f) return; const i = (x - X0) / g.cell | 0, j = (z - Z0) / g.cell | 0; if (i < 0 || j < 0 || i >= g.w || j >= g.h) return; const k = j * g.w + i, v = clamp(g.f[k] + a, 0, 1); g.f[k] = v; const u = v * 255 | 0; if (u !== g.d[k]) { g.d[k] = u; g.dirty = true; } }
function wearAt(x, z) { const g = GROOM; if (!g.f) return 0.5; const i = (x - X0) / g.cell | 0, j = (z - Z0) / g.cell | 0; return i < 0 || j < 0 || i >= g.w || j >= g.h ? 0.5 : g.f[j * g.w + i]; }
function groomTick(dt, time) {
  const g = GROOM; if (!g.f) return;
  for (const c of g.cats) { // up and down its run in lanes, a blade's width apart
    const P = c.p; c.s += c.dir * 3.9 * dt; if (c.s > P.len - 14 || c.s < 14) { c.dir = -c.dir; c.s = clamp(c.s, 14, P.len - 14); c.lane = c.lane >= c.half ? -c.half : c.lane + 1; }
    while (c.seg < P.S.length - 2 && c.s > P.S[c.seg + 1]) c.seg++; while (c.seg > 0 && c.s < P.S[c.seg]) c.seg--;
    const a = P.pts[c.seg], b = P.pts[c.seg + 1], sl = P.S[c.seg + 1] - P.S[c.seg] || 1, u = (c.s - P.S[c.seg]) / sl, dx = (b[0] - a[0]) / sl, dz = (b[1] - a[1]) / sl, off = c.lane * 5;
    const tx = lerp(a[0], b[0], u) - dz * off, tz = lerp(a[1], b[1], u) + dx * off, k = c.init ? Math.min(1, 2.5 * dt) : 1; c.init = true; c.x += (tx - c.x) * k; c.z += (tz - c.z) * k;
    const fx = dx * c.dir, fz = dz * c.dir, yaw = Math.atan2(fx, fz); c.yaw += wrap(yaw - c.yaw) * Math.min(1, 1.6 * dt); const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
    const hf = H(c.x + sy * 2.2, c.z + cy * 2.2), hb = H(c.x - sy * 2.2, c.z - cy * 2.2), hl = H(c.x + cy * 1.4, c.z - sy * 1.4), hr = H(c.x - cy * 1.4, c.z + sy * 1.4); c.y = (hf + hb + hl + hr) / 4;
    c.grp.position.set(c.x, c.y, c.z); c.grp.rotation.set(-Math.atan2(hf - hb, 4.4), c.yaw, Math.atan2(hr - hl, 2.8)); c.beacon.material.opacity = 0.95; c.beacon.scale.setScalar(0.5 + 0.9 * Math.pow(Math.max(0, Math.sin(time * 7 + c.s)), 4));   // the beacon turns
    for (const o of [-2.6, 0, 2.6]) { const wx2 = c.x - sy * 4 + cy * o, wz2 = c.z - cy * 4 - sy * o; wearAdd(wx2, wz2, -1); }   // fresh corduroy off the comb
    if (sk.mode === "ski" && !sk.crashed) { const rx = sk.p.x - c.x, rz = sk.p.z - c.z, lz = rx * sy + rz * cy, lx = rx * cy - rz * sy; if (Math.abs(lx) < 2.7 && lz > -4.3 && lz < 3.6 && Math.abs(sk.p.y - c.y) < 3.2 && sk.ground) { if (sk.sp > 7) crash("Hit a snowcat"); else { const e = lx >= 0 ? 1 : -1; sk.p.x += cy * e * (2.75 - Math.abs(lx)); sk.p.z -= sy * e * (2.75 - Math.abs(lx)); sk.sp *= 0.3; } } }
  }
  // skiers wear it off: the others a little each, you a little more
  if (typeof npcs !== "undefined" && npcMesh) { const k = (g.np = ((g.np || 0) + 1) % 4); for (let i = k; i < npcs.length; i += 4) { const n = npcs[i]; if (n.wx !== undefined) if (wearAt(n.wx, n.wz) < 0.8) wearAdd(n.wx, n.wz, n.v * dt * 4 * 0.0015); } }
  if (sk.mode === "ski" && sk.ground && !sk.crashed) { const d = Math.hypot(sk.p.x - g.px, sk.p.z - g.pz); if (d > 0.5 && d < 30) { const wv = wearAt(sk.p.x, sk.p.z), gr = sk.surf.groom || 0; wearAdd(sk.p.x, sk.p.z, d * (0.004 + 0.012 * sk.brakeK));
        if (wv < 0.14 && gr > 0.6 && sk.sp > 6) { g.cordD += d; if (g.cordD > 220) { g.cordD = 0; payout(150, "First tracks on fresh corduroy", false, false); } } else g.cordD = Math.max(0, g.cordD - d * 0.5); } if (d > 0.5) { g.px = sk.p.x; g.pz = sk.p.z; } }
  g.t -= dt; if (g.dirty && g.t <= 0) { g.t = 0.8; g.dirty = false; g.tex.needsUpdate = true; }
}

/* ===== chairlift detail =====
   Every chair carries a restraint bar that comes down once it is clear of the station and goes up again before the top; yours waits for you (E).
   Chairs hang from one grip, so they swing: a slow roll in the wind, more in a storm, steadied where the terminal's guides hold them.
   At the top you get off onto a built ramp of snow at seat height and ski down off it. */
function barGeometry(occ) { // drawn lowered, with its hinge at the origin
  const b = new GeoBag(), w = Math.max(1.1, occ * 0.56);
  for (const sx of [-1, 1]) b.cyl(0.022, 0.022, 0.96, sx * (w / 2 + 0.03), -0.21, 0.43, STEEL, 5, 2.025);
  b.cyl(0.024, 0.024, w + 0.1, 0, -0.42, 0.86, STEEL, 6, 0, Math.PI / 2); b.cyl(0.035, 0.035, w * 0.8, 0, -0.42, 0.86, PAD, 6, 0, Math.PI / 2);   // the lap bar, padded
  for (let n = 0; n < Math.max(1, Math.round(occ / 2)); n++) { const x = (n - (Math.max(1, Math.round(occ / 2)) - 1) / 2) * 1.1; b.cyl(0.02, 0.02, 1.04, x, -0.935, 0.93, STEEL, 5, -0.136); b.cyl(0.022, 0.022, 0.62, x, -1.45, 1.0, STEEL, 5, 0, Math.PI / 2); }   // footrests
  return b.build();
}
const BAR_UP = -1.22, _bq = new THREE.Quaternion(), _bm = new THREE.Matrix4(), _be = new THREE.Euler(), _bv = new THREE.Vector3(), _bx = new THREE.Vector3(1, 0, 0), _b1 = new THREE.Vector3(1, 1, 1), SWAY = { roll: 0, pit: 0 };
function windK() { return (wxName === "storm" ? 2.3 : wxName === "overcast" ? 1.45 : 1) * (0.75 + 0.5 * Math.sin(liftTime * 0.19) * Math.sin(liftTime * 0.113 + 1.3)); }
function chairSway(L, k, s, out) { const hold = sstep(6, 38, Math.min(s, L.len - s)), w = windK() * hold, t = liftTime; out.roll = w * (0.04 * Math.sin(t * 1.12 + k * 2.4) + 0.028 * Math.sin(t * 0.47 + k * 1.31 + s * 0.004)); out.pit = hold * 0.022 * Math.sin(t * 1.55 + k * 1.9) + 0.05 * (1 - hold) * Math.sin(t * 2.2 + k); return out; }
function liftBars(L, occ) { if (!L.type.startsWith("chair") || !L.count || L.bar) return; L.bar = new THREE.InstancedMesh(barGeometry(occ || 4), liftMat, L.count); L.bar.castShadow = true; L.bar.frustumCulled = false; scene.add(L.bar); }
/* one chair's matrix, with its sway; and its bar's, swung on the hinge */
function chairPose(L, k, co, pos, ang) {
  const sw = chairSway(L, k, co.s, SWAY); _lq.setFromEuler(_be.set(sw.pit, ang, sw.roll, "YXZ")); _lm.compose(pos, _lq, _ls); L.mesh.setMatrixAt(k, _lm); if (!L.bar) return;
  const mine = sk.mode === "lift" && sk.lift === L && sk.car === k, want = mine ? (sk.barDown ? 1 : 0) : (co.side > 0 && co.s > 26 && co.s < L.len - 34 && (k * 7 + L.id) % 9 !== 0 ? 1 : 0);   // most riders pull it down; the odd chair rides up empty with it raised
  if (!L.barK) L.barK = new Float32Array(L.count); const dt = 1 / 60, v = L.barK[k] + clamp(want - L.barK[k], -1.3 * dt, 1.3 * dt); L.barK[k] = v;
  _bq.setFromAxisAngle(_bx, BAR_UP * (1 - smooth(v))); _bm.compose(_bv.set(0, -2.3, -0.66), _bq, _b1); _bm.premultiply(_lm); L.bar.setMatrixAt(k, _bm);
}
function barUse() { if (sk.mode !== "lift" || !sk.lift || !sk.lift.type.startsWith("chair")) return false; const L = sk.lift; if (sk.liftS > L.len - 30) { toast("Bar stays up for the unload", 1.6); return true; } sk.barDown = !sk.barDown; sfx("thump", 0.25); return true; }
function barTick() { if (sk.mode !== "lift" || !sk.lift || !sk.lift.type.startsWith("chair")) { sk.barDown = false; return; } const L = sk.lift; if (sk.barDown && sk.liftS > L.len - 34) { sk.barDown = false; toast("Bar up · tips up", 2); } }
function barPrompt() { if (sk.mode !== "lift" || !sk.lift || !sk.lift.type.startsWith("chair")) return ""; const L = sk.lift; return sk.liftS < 12 || sk.liftS > L.len - 34 ? "" : "<kbd>E</kbd> " + (sk.barDown ? "Raise" : "Lower") + " the bar"; }

/* unload ramps: a level platform of snow under the unload line at ski height, falling away ahead and to the outside */
let RAMPG = null; const RAMPS = [];
function initRamps() {
  const G2 = new Array(CATW * CATH);
  for (const L of LIFTS) { if (!L.type.startsWith("chair")) continue; const k = L.ns - 1, p = liftPoint(L, L.len - L.loadS, 1, new THREE.Vector3()), dx = Math.sin(L.dir), dz = Math.cos(L.dir), rx = L.rx[k], rz = L.rz[k];
    const f = { k: "ramp", x: p.x, z: p.z, dx, dz, rx, rz, h: 0.55, len: 0, L }; RAMPS.push(f); L.ramp = f; gridAdd(G2, p.x - 16, p.z - 16, p.x + 16, p.z + 16, f); }
  RAMPG = G2;
  for (const f of RAMPS) { const S = [], Uq = []; for (let s = -10.5; s <= 10.5; s += 0.5) S.push(s); for (let u = -4; u <= 11.5; u += 0.5) Uq.push(u); f.grid = { S, U: Uq }; const d0 = f.dx, d1 = f.dz; buildCut(f); f.dx = d0; f.dz = d1; }
}
function rampH(x, z) {
  const c = RAMPG && RAMPG[((z - Z0) / CATC | 0) * CATW + ((x - X0) / CATC | 0)]; if (!c) return 0; let h = 0;
  for (const f of c) { const ex = x - f.x, ez = z - f.z, a = ex * f.dx + ez * f.dz, o = ex * f.rx + ez * f.rz; if (a < -10 || a > 10 || o < -3.5 || o > 11) continue;
    const v = f.h * Math.min(sstep(-10, -4, a) * (1 - sstep(2, 10, a)), sstep(-3.5, -1.7, o) * (1 - sstep(1.8, 11, o))); if (v > h) h = v; }
  return h;
}
function moreTick(dt, time) { wallTick(dt); groomTick(dt, time); barTick(); }
