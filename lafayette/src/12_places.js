/* ---------- places you can walk into ---------- */
const VENUES = [
  { key: "roundup saloon", kind: "bar", title: "Roundup Saloon", size: [12, 9, 3.3], col: [0x5a3a22, 0x6b4a34, 0x2a211a] },
  { key: "first mile cycle works", kind: "bike", title: "First Mile Cycle Works", size: [11, 8, 3.5], col: [0x8a8a86, 0xe6e2d8, 0xdcdcd8] },
  { key: "safeway", kind: "market", title: "Safeway", size: [22, 15, 4.6], col: [0xcfcabd, 0xeeeae0, 0xf2f2ee] },
  { key: "lafayette police department", kind: "police", title: "Lafayette Police Department", size: [9, 7, 3.0], col: [0x6f7377, 0xd9dcd6, 0xe8e8e4] },
  { key: "acalanes high school", kind: "school", title: "Acalanes High School gym", size: [26, 16, 8], col: [0xb98a4e, 0xe4dfd2, 0xcfd2d4] }];
const INT = { on: false, v: null, near: null, group: null, spots: [], spot: null, game: null, juke: 0, jt: 0, org: new THREE.Vector3(), ret: null, snacks: 0, takeBike: false, carT: 0 };
function buildVenues() {
  for (const V0 of VENUES) {
    let best = -1, bd = 1e18; for (const [b, nm] of WORLD.signs || []) { if (!nm.toLowerCase().includes(V0.key)) continue; const d = Math.hypot((BLD.minx[b] + BLD.maxx[b]) / 2 + 500, (BLD.minz[b] + BLD.maxz[b]) / 2 - 700); if (d < bd) { bd = d; best = b; } }
    if (best < 0) continue; V0.b = best; const a = V.bStart[best], n = V.bStart[best + 1] - a; let area = 0, bs = -1e9;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += V.bP[(a + i) * 2] * V.bP[(a + j) * 2 + 1] - V.bP[(a + j) * 2] * V.bP[(a + i) * 2 + 1]; }
    for (let i = 0; i < n; i++) {   // the door goes in the wall that faces the street or the car park, as the name board does
      const j = (i + 1) % n, ax = V.bP[(a + i) * 2], az = V.bP[(a + i) * 2 + 1], dx = V.bP[(a + j) * 2] - ax, dz = V.bP[(a + j) * 2 + 1] - az, L = Math.hypot(dx, dz); if (L < 3.5) continue;
      const sg = area > 0 ? 1 : -1, nx = dz / L * sg, nz = -dx / L * sg, mx = ax + dx / 2 - nz * Math.min(L * 0.28, 4), mz = az + dz / 2 + nx * Math.min(L * 0.28, 4);
      const sc = L * (0.25 + Math.max(hiAt(mx + nx * 5, mz + nz * 5, 0), hiAt(mx + nx * 11, mz + nz * 11, 0)) - hiAt(mx + nx * 3, mz + nz * 3, 2)); if (sc > bs) { bs = sc; V0.door = { x: mx + nx * 1.4, z: mz + nz * 1.4, wx: mx, wz: mz, nx, nz }; }
    }
    const d = V0.door; if (!d) continue; const g = new THREE.Group(); g.position.set(d.wx, H(d.x, d.z), d.wz); g.rotation.y = Math.atan2(d.nx, d.nz);
    vadd(g, new THREE.BoxGeometry(2.3, 2.6, 0.1), vmat(0xe9e4d6, 0.7), 0, 1.3, 0.03); for (const s of [1, -1]) { vadd(g, new THREE.BoxGeometry(0.94, 2.25, 0.08), vmat(0x4a2f1c, 0.5), 0.49 * s, 1.13, 0.08); vadd(g, new THREE.BoxGeometry(0.5, 0.62, 0.03), vmat(0x9fc4d8, 0.08), 0.49 * s, 1.56, 0.125); vadd(g, new THREE.BoxGeometry(0.03, 0.3, 0.05), vmat(0xc9b27a, 0.3, 0.9), 0.1 * s, 1.1, 0.14); }
    scene.add(g);
  }
}
function note(f, len, vol, type = "triangle") { const c = AU.ctx; if (!c || !AU.on) return; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + len); o.connect(g); g.connect(AU.master); o.start(); o.stop(c.currentTime + len + 0.03); }
/* A room: shell, furniture (anything solid goes in `boxes`), and spots where E does something. Local frame: door in the middle of the z = 0 wall. */
function enterPlace(V0) {
  const [w, d, h] = V0.size, g = new THREE.Group(), boxes = [], spots = [], O = INT.org.set(V0.door.x, -260, V0.door.z); g.position.copy(O);
  const P = (bw, bh, bd, c, x, y, z, solid, r = 0.8, m = 0) => { const q = vadd(g, new THREE.BoxGeometry(bw, bh, bd), vmat(c, r, m), x, y, z); if (solid) boxes.push([O.x + x - bw / 2, O.x + x + bw / 2, O.z + z - bd / 2, O.z + z + bd / 2]); return q; };
  const cyl = (r, hh, c, x, y, z, solid) => { vadd(g, new THREE.CylinderGeometry(r, r, hh, 14), vmat(c, 0.6), x, y, z); if (solid) boxes.push([O.x + x - r, O.x + x + r, O.z + z - r, O.z + z + r]); };
  const spot = (x, z, r, label, act) => spots.push({ x: O.x + x, z: O.z + z, r, label, act });
  P(w, 0.2, d, V0.col[0], 0, -0.1, d / 2, false, 0.7); P(w, 0.2, d, V0.col[2], 0, h + 0.1, d / 2); P(0.2, h, d, V0.col[1], -w / 2 - 0.1, h / 2, d / 2); P(0.2, h, d, V0.col[1], w / 2 + 0.1, h / 2, d / 2); P(w, h, 0.2, V0.col[1], 0, h / 2, d + 0.1); P(w, h, 0.2, V0.col[1], 0, h / 2, -0.1);
  P(1.9, 2.25, 0.06, 0x4a2f1c, 0, 1.13, 0.03); spot(0, 0.5, 1.3, "E   Leave", () => leavePlace());
  if (V0.kind === "bar") {
    P(7, 1.1, 0.7, 0x3d2616, -1, 0.55, 7.0, true, 0.45); P(7.2, 0.06, 0.86, 0x24160c, -1, 1.13, 7.0, false, 0.25); P(7, 2.3, 0.35, 0x2c1c12, -1, 1.15, 8.75, true);
    for (let i = 0; i < 22; i++) P(0.09, 0.3, 0.09, [0x2f6b3a, 0x8a4a1c, 0xc9b27a, 0x3a2a6a, 0xa02a2a][i % 5], -4.2 + i * 0.3, 1.55 + (i % 2) * 0.45, 8.55, false, 0.15);
    for (let i = 0; i < 6; i++) { cyl(0.19, 0.06, 0x7a1f1a, -3.6 + i * 1.05, 0.78, 6.15); cyl(0.04, 0.76, 0x1c1c1e, -3.6 + i * 1.05, 0.38, 6.15, true); }
    P(2.6, 0.78, 1.42, 0x3d2616, -3.2, 0.39, 2.9, true); P(2.36, 0.05, 1.18, 0x1f6b3c, -3.2, 0.8, 2.9, false, 0.95); for (let i = 0; i < 6; i++) vadd(g, new THREE.SphereGeometry(0.03, 10, 8), vmat([0xf2f2ee, 0xd0281c, 0x1c3cc0, 0xe0b020, 0x111111, 0x2a8a3a][i], 0.2), -3.9 + (i % 3) * 0.55, 0.855, 2.6 + Math.floor(i / 3) * 0.5);
    for (const [x, z] of [[2.6, 2.4], [0.2, 4.3]]) { cyl(0.5, 0.05, 0x4a2f1c, x, 0.76, z); cyl(0.05, 0.75, 0x1c1c1e, x, 0.38, z, true); for (let k = 0; k < 3; k++) cyl(0.17, 0.46, 0x5a3a22, x + Math.cos(k * 2.1) * 0.85, 0.23, z + Math.sin(k * 2.1) * 0.85, true); }
    P(0.9, 1.5, 0.6, 0x7a1a14, 5.4, 0.75, 3.6, true, 0.3); const jf = P(0.7, 0.7, 0.04, 0xffc060, 5.4, 1.1, 3.28, false, 0.3); jf.material = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    vadd(g, new THREE.CylinderGeometry(0.23, 0.23, 0.04, 28), vmat(0x1a1a1a, 0.9), 5.96, 1.72, 6.5, 0, 0, Math.PI / 2); vadd(g, new THREE.CylinderGeometry(0.15, 0.15, 0.045, 28), vmat(0xd8d0b8, 0.9), 5.955, 1.72, 6.5, 0, 0, Math.PI / 2); vadd(g, new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12), vmat(0xc02018, 0.6), 5.95, 1.72, 6.5, 0, 0, Math.PI / 2);
    spot(-1, 5.9, 1.5, "E   Order a root beer", () => { note(660, 0.08, 0.05); note(990, 0.12, 0.04); toast(["The bartender slides a cold root beer down the bar.", "\"On the house. Ride safe out there.\"", "Another root beer. The jukebox could use a quarter."][Math.floor(Math.random() * 3)], 3); });
    spot(4.6, 3.7, 1.3, "E   Jukebox on / off", () => { INT.juke = INT.juke ? 0 : 1; toast(INT.juke ? "The jukebox clunks and starts to play" : "Jukebox off", 2); });
    spot(3.6, 6.5, 1.2, "E   Play darts (three darts)", () => startGame("darts"));
  } else if (V0.kind === "bike") {
    P(3.2, 1.0, 0.8, 0x2a2c2e, 3.4, 0.5, 6.6, true); P(0.5, 0.35, 0.4, 0x111214, 3.4, 1.2, 6.6);
    for (let i = 0; i < 4; i++) { const m = buildMtb().group; m.position.set(-4.4 + i * 1.5, 0, 5.4); m.rotation.y = Math.PI / 2 + 0.25; g.add(m); boxes.push([O.x - 4.8 + i * 1.5, O.x - 4.0 + i * 1.5, O.z + 4.6, O.z + 6.2]); }
    cyl(0.03, 1.5, 0x1c1c1e, 0.6, 0.75, 2.6, true); P(0.5, 0.05, 0.05, 0xc02018, 0.82, 1.45, 2.6); const sb = buildMtb().group; sb.position.set(1.0, 0.55, 2.6); sb.rotation.y = 0; g.add(sb);
    for (let i = 0; i < 5; i++) { const wh = makeWheel(0.37, 0.058, 0.31, "spoke", true, 0x18181a); wh.position.set(-5.35, 2.2, 1.2 + i * 0.9); g.add(wh); }
    P(0.4, 1.9, 5, 0x3a3d42, 5.25, 0.95, 3.2, true); for (let i = 0; i < 12; i++) P(0.3, 0.22, 0.3, [0xd0281c, 0x1c3cc0, 0xe0b020, 0x111111][i % 4], 5.0, 0.5 + Math.floor(i / 4) * 0.55, 1.4 + (i % 4) * 1.1, false, 0.4);
    spot(3.4, 5.7, 1.4, "E   Ask for a tune-up", () => { note(520, 0.06, 0.05, "square"); toast("\"Chain lubed, tyres at 26 psi, brakes bled. She's ready.\"", 3); });
    spot(1.0, 3.6, 1.3, "E   Respray your mountain bike", () => { const cols = [0x1f5f7a, 0xc0281c, 0x2a8a3a, 0xe0a020, 0x222226, 0x7a2a8a], m = vmat(0x1f5f7a, 0.35, 0.3); INT.paint = ((INT.paint || 0) + 1) % cols.length; m.color.setHex(cols[INT.paint]); toast("Frame resprayed", 2); });
    spot(-2.2, 4.3, 1.5, "E   Take a mountain bike out", () => { INT.takeBike = true; leavePlace(); });
  } else if (V0.kind === "market") {
    for (let a = 0; a < 4; a++) { const x = -8 + a * 4; P(1.0, 1.9, 9, 0xdad6cc, x, 0.95, 9.2, true); for (let k = 0; k < 30; k++) for (const s of [1, -1]) P(0.04, 0.34, 0.5, [0xd0281c, 0x1c6cc0, 0xe0b020, 0x2a8a3a, 0xf0f0e8, 0x8a4a1c, 0xe07020][(k * 7 + a * 3 + (s > 0 ? 1 : 4)) % 7], x + 0.52 * s, 0.35 + (k % 3) * 0.55, 5 + Math.floor(k / 3) * 0.86, false, 0.5); }
    for (const x of [5.5, 8.5]) { P(0.9, 0.95, 2.4, 0x3a3d42, x, 0.48, 3.0, true); P(0.95, 0.05, 1.5, 0x111214, x, 0.98, 2.7, false, 0.3); P(0.3, 0.35, 0.3, 0x1c1c1e, x, 1.2, 3.9); }
    P(3, 0.8, 1.6, 0x6b4a34, -8.5, 0.4, 2.6, true); for (let i = 0; i < 18; i++) vadd(g, new THREE.SphereGeometry(0.11, 8, 6), vmat([0xd0281c, 0xe07020, 0x7ab030, 0xe0c020][i % 4], 0.6), -9.7 + (i % 6) * 0.48, 0.9, 2.1 + Math.floor(i / 6) * 0.5);
    spot(-6, 3.9, 1.6, "E   Pick up a snack", () => { INT.snacks++; note(880, 0.05, 0.04); toast(["A bag of trail mix", "A cold lemonade", "An apple", "A burrito from the deli"][INT.snacks % 4] + " goes in the basket (" + INT.snacks + ")", 2); });
    spot(5.5, 1.6, 1.5, "E   Pay at the checkout", () => { if (!INT.snacks) { toast("Nothing in the basket yet", 2); return; } note(1320, 0.07, 0.05); note(1760, 0.1, 0.04); toast("Beep. $" + (INT.snacks * 3.49).toFixed(2) + ". \"Have a good one.\"", 3); INT.snacks = 0; });
  } else if (V0.kind === "police") {
    P(4.2, 1.15, 0.8, 0x2f3a4a, 0, 0.58, 4.4, true); P(4.3, 0.05, 0.9, 0x1c2430, 0, 1.18, 4.4, false, 0.3); P(0.6, 0.4, 0.05, 0x111214, 0.8, 1.42, 4.5); P(2.2, 0.45, 0.5, 0x4a3b2a, -3.1, 0.23, 1.6, true);
    P(1.9, 1.2, 0.05, 0x8a6a3a, 3.0, 1.6, 6.95); for (let i = 0; i < 8; i++) P(0.36, 0.48, 0.02, 0xf2f0e6, 2.35 + (i % 4) * 0.44, 1.32 + Math.floor(i / 4) * 0.56, 6.91);
    cyl(0.025, 2.3, 0xc9b27a, -3.9, 1.15, 6.3); P(0.02, 0.6, 0.9, 0x1c3c8a, -3.9, 1.9, 5.85); P(1.0, 2.1, 0.06, 0x3a3d42, -2.6, 1.05, 6.95);
    spot(0, 3.3, 1.5, "E   Talk to the desk officer", () => toast("\"Quiet day in Lafayette. Fastest we've clocked you: " + Math.round((GAME.top || 0) * (units === "imp" ? MPH : KMH)) + (units === "imp" ? " mph" : " km/h") + ". Keep it under 25 downtown.\"", 4.5));
    spot(3.0, 6.0, 1.4, "E   Read the notice board", () => toast(["Found: one mountain bike, teal, at the reservoir.", "Reminder: the Rim Trail closes at sunset.", "Lost: a sense of the speed limit on Mt. Diablo Boulevard."][Math.floor(Math.random() * 3)], 3.5));
  } else {
    for (const z of [3, 13]) P(15, 0.01, 0.06, 0xf2f2ee, 0, 0.012, z); P(0.06, 0.01, 10, 0xf2f2ee, -7.5, 0.012, 8); P(0.06, 0.01, 10, 0xf2f2ee, 7.5, 0.012, 8); P(3.6, 0.011, 0.06, 0xf2f2ee, 0, 0.012, 10.2);
    P(1.8, 1.05, 0.05, 0xf2f2ee, 0, 3.5, 15.2, false, 0.3); P(0.6, 0.45, 0.02, 0xc02018, 0, 3.3, 15.16); vadd(g, new THREE.TorusGeometry(0.23, 0.014, 6, 20), vmat(0xe05a10, 0.5), 0, 3.05, 14.9, Math.PI / 2); P(0.12, 3.4, 0.12, 0x3a3d42, 0, 1.7, 15.7);
    for (let s = 0; s < 5; s++) P(1.0, 0.42 * (s + 1), 14, 0x8a3a2a, -8.9 - s * 0.95, 0.21 * (s + 1), 8);   // bleachers
    boxes.push([O.x - 13, O.x - 8.4, O.z + 1, O.z + 15]); P(6, 1.6, 0.05, 0x1c3c8a, 6, 5.6, 15.93); 
    spot(0, 10.2, 1.5, "E   Shoot free throws", () => startGame("hoop"));
  }
  scene.add(g); g.traverse(o => { o.frustumCulled = false; }); INT.group = g; INT.spots = spots; INT.v = V0; INT.on = true; INT.game = null; INT.takeBike = false;
  INT.ret = { x: V0.door.x, z: V0.door.z, yaw: Math.atan2(V0.door.nx, V0.door.nz) }; FOOT.room = { x0: O.x - w / 2, x1: O.x + w / 2, z0: O.z, z1: O.z + d, y: O.y, h, boxes }; FOOT.p.set(O.x, O.y, O.z + 1.3); FOOT.yaw = 0; FOOT.sp = 0; GAME.cam.orbit = GAME.cam.orbitP = 0; updateFootCamera(1, true); toast(V0.title, 2.5);
}
function leavePlace(quiet) {
  if (!INT.on) return; scene.remove(INT.group); INT.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); INT.group = null; INT.on = false; INT.game = null; INT.juke = 0; INT.spots = []; FOOT.room = null; $("prompt").hidden = true;
  FOOT.p.set(INT.ret.x, ground(INT.ret.x, INT.ret.z, H(INT.ret.x, INT.ret.z) + 2), INT.ret.z); FOOT.yaw = INT.ret.yaw; if (quiet) return; updateFootCamera(1, true);
  if (INT.takeBike) { INT.takeBike = false; const old = GAME.v; old.onFoot = false; if (old.rider.root.parent === scene) scene.remove(old.rider.root); FOOT.on = false; const v = selectVehicle("mtb"); placeVehicle(v, FOOT.p.x, FOOT.p.z, FOOT.yaw); snapCamera(); markMenu(); toast("Out the door on a mountain bike", 2.5); }
}
function startGame(type) {
  const O = INT.org, G0 = INT.game = { type, t: 0, n: 0, score: 0, shot: 0, marks: [] };
  if (type === "darts") { G0.aim = vadd(INT.group, new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe040 }), 5.9, 1.72, 6.5); FOOT.p.set(O.x + 3.5, O.y, O.z + 6.5); FOOT.yaw = Math.PI / 2; }
  else { G0.ball = vadd(INT.group, new THREE.SphereGeometry(0.12, 14, 10), vmat(0xd0601c, 0.7), 0, 1.3, 10.4); FOOT.p.set(O.x, O.y, O.z + 10.0); FOOT.yaw = 0; G0.made = 0; }
  FOOT.sp = 0;
}
function placeKey() {   // E: true when a place used the key
  if (INT.on) {
    const G0 = INT.game;
    if (G0 && G0.type === "darts") { const a = G0.aim.position, d = Math.hypot(a.y - 1.72, a.z - 6.5), pts = d < 0.03 ? 50 : d < 0.075 ? 25 : Math.max(1, Math.round(20 * (1 - d / 0.26)));
      vadd(INT.group, new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6), vmat(0xe8e8e0, 0.3, 0.8), 5.87, a.y, a.z, 0, 0, Math.PI / 2); note(180, 0.06, 0.08, "square"); G0.score += pts; G0.n++; toast((pts === 50 ? "Bullseye! " : "") + pts + " points", 1.5);
      if (G0.n >= 3) { const best = store.get("laf-darts", 0); if (G0.score > best) store.set("laf-darts", G0.score); toast("Three darts: " + G0.score + (G0.score > best ? " — your best yet" : " (best " + best + ")"), 4); INT.group.remove(G0.aim); INT.game = null; } }
    else if (G0 && G0.type === "hoop") { if (G0.shot > 0) return true; const m = 0.5 + 0.5 * Math.sin(G0.t * 3.1); G0.good = Math.abs(m - 0.74) < 0.085; G0.shot = 0.001; G0.n++; }
    else if (INT.spot) INT.spot.act();
    return true;
  }
  if (FOOT.on && INT.near) { enterPlace(INT.near); return true; }
  return false;
}
function updatePlaces(dt) {
  INT.carT -= dt; if (INT.carT < 0) { INT.carT = 0.5; showParkedCars(); }
  const pr = $("prompt"); if (!FOOT.on) { if (!pr.hidden) pr.hidden = true; INT.near = null; return; }
  let text = "";
  if (!INT.on) { INT.near = null; for (const V0 of VENUES) if (V0.door && Math.hypot(FOOT.p.x - V0.door.x, FOOT.p.z - V0.door.z) < 3.2) { INT.near = V0; text = "E   Go into " + V0.title; } }
  else {
    const O = INT.org, [w, d, h] = INT.v.size; for (let i = 0; i < 3; i++) { const l = LAMPS.lights[i]; l.position.set(O.x + (i - 1) * w * 0.3, O.y + h - 0.35, O.z + d * (0.3 + 0.2 * (i % 2))); l.intensity = INT.v.kind === "bar" ? 26 : 60; }
    INT.spot = null; let bd = 1e9; for (const s of INT.spots) { const dd = Math.hypot(FOOT.p.x - s.x, FOOT.p.z - s.z); if (dd < s.r && dd < bd) { bd = dd; INT.spot = s; } } if (INT.spot) text = INT.spot.label;
    if (INT.juke) { INT.jt -= dt; if (INT.jt < 0) { INT.jt = 0.22; const riff = [196, 247, 294, 247, 330, 294, 247, 196, 220, 262, 330, 262, 392, 330, 262, 220], k = (INT.jk = ((INT.jk || 0) + 1) % 32); note(riff[k % 16], 0.2, 0.035); if (k % 4 === 0) note(riff[k % 16] / 2, 0.4, 0.05, "sine"); } }
    const G0 = INT.game;
    if (G0) { G0.t += dt; FOOT.sp = 0;
      if (G0.type === "darts") { G0.aim.position.set(5.9, 1.72 + 0.21 * Math.sin(G0.t * 2.3), 6.5 + 0.21 * Math.sin(G0.t * 3.3 + 1)); text = "Darts  " + (G0.n + 1) + " of 3      E or Space to throw      score " + G0.score; }
      else { const m = 0.5 + 0.5 * Math.sin(G0.t * 3.1), bar = "▮".repeat(Math.round(m * 14)).padEnd(14, "▯"); text = "Power  " + bar + "      E or Space to shoot      " + G0.made + " of " + G0.n + "      walk away to stop";
        if (G0.shot > 0) { G0.shot += dt; const u = Math.min(1, G0.shot / 0.95), ex = G0.good ? 0 : 0.34; G0.ball.position.set(ex * u, 1.9 + (3.1 - 1.9) * u + 2.6 * u * (1 - u), 10.4 + (14.9 - 10.4 - (G0.good ? 0 : 0.3)) * u);
          if (u >= 1) { if (G0.good) { G0.made++; note(520, 0.09, 0.05); note(780, 0.14, 0.04); toast("Swish", 1.2); } else { note(140, 0.08, 0.07, "square"); toast("Off the rim", 1.2); } G0.shot = 0; G0.ball.position.set(0, 1.3, 10.4); const best = store.get("laf-hoops", 0); if (G0.made > best) store.set("laf-hoops", G0.made); } }
        if (K.KeyS || K.ArrowDown) { INT.group.remove(G0.ball); INT.game = null; toast("Made " + G0.made + " of " + G0.n + " (best " + store.get("laf-hoops", 0) + ")", 3); } }
    }
  }
  if (text) { if (pr.textContent !== text) pr.textContent = text; if (pr.hidden) pr.hidden = false; } else if (!pr.hidden) pr.hidden = true;
}
/* ---------- parked cars: in the bays along every mapped car-park aisle ---------- */
const CARS = { list: [], hash: new Map(), mesh: null };
function buildParkedCars() {
  const near = new Map(), key = (x, z) => Math.floor(x / 8) * 4096 + Math.floor(z / 8);
  STRIPS.forEach((st, si) => { if (st.kind > 8 || (st.flag & 8)) return; for (let i = 0; i < st.n; i++) { const k = key(st.X[i], st.Z[i]); let l = near.get(k); if (!l) near.set(k, l = []); l.push(st.X[i], st.Z[i], si); } });
  const clear = (x, z, si) => { for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) { const l = near.get(key(x + cx * 8, z + cz * 8)); if (l) for (let q = 0; q < l.length; q += 3) if (l[q + 2] !== si && (l[q] - x) ** 2 + (l[q + 1] - z) ** 2 < 4.6 * 4.6) return false; } return true; };
  STRIPS.forEach((st, si) => {
    if (st.kind !== 8 || (st.flag & 10)) return;
    for (let s = 2.5, i = 0; s < st.S[st.n - 1] - 2.5; s += 2.75) { while (i < st.n - 2 && st.S[i + 1] < s) i++; const t = (s - st.S[i]) / Math.max(1e-6, st.S[i + 1] - st.S[i]), cx = lerp(st.X[i], st.X[i + 1], t), cz = lerp(st.Z[i], st.Z[i + 1], t), lx = st.LX[i], lz = st.LZ[i], ll = Math.hypot(lx, lz) || 1;
      for (const sd of [1, -1]) { const x = cx + lx / ll * sd * (st.w / 2 + 2.5), z = cz + lz / ll * sd * (st.w / 2 + 2.5), h = hash2(Math.round(x * 3), Math.round(z * 3), 77); if (h > 0.55 || !inWorld(x, z, 40) || hiAt(x, z, 2) > 0.12 || hiAt(x, z, 0) < 0.6 || !clear(x, z, si)) continue;
        const k = Math.floor(x / 32) * 4096 + Math.floor(z / 32); let l = CARS.hash.get(k); if (!l) CARS.hash.set(k, l = []); l.push(CARS.list.length); CARS.list.push({ x, z, y: H(x, z), yaw: Math.atan2(lx * sd, lz * sd) + (h < 0.27 ? Math.PI : 0), c: Math.floor(h * 40) % 8, s: 0.92 + (h * 7 % 1) * 0.16 }); } }
  });
  const parts = [[1.78, 0.62, 4.3, 0, 0.56, 0, 1], [1.6, 0.52, 2.2, 0, 1.12, -0.25, 0.07], [1.84, 0.3, 0.7, 0, 0.3, 1.35, 0.05], [1.84, 0.3, 0.7, 0, 0.3, -1.3, 0.05]].map(([w, h, d, x, y, z, c]) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, z); g.deleteAttribute("uv"); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(c), 3)); return g; });
  CARS.mesh = new THREE.InstancedMesh(mergeGeos(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 }), 640); CARS.mesh.count = 0; CARS.mesh.frustumCulled = false; CARS.mesh.castShadow = CARS.mesh.receiveShadow = true; CARS.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(640 * 3), 3); scene.add(CARS.mesh);
}
const CARCOL = [[0.85, 0.85, 0.84], [0.55, 0.57, 0.6], [0.06, 0.06, 0.07], [0.3, 0.31, 0.33], [0.1, 0.18, 0.42], [0.5, 0.06, 0.05], [0.75, 0.74, 0.7], [0.12, 0.25, 0.2]];
function showParkedCars() {
  if (!CARS.mesh) return; const cx = camera.position.x, cz = camera.position.z, R = 150 + 90 * PERF.tree, m = new THREE.Matrix4(), c = new THREE.Color(); let n = 0;
  for (let tx = Math.floor((cx - R) / 32); tx <= Math.floor((cx + R) / 32); tx++) for (let tz = Math.floor((cz - R) / 32); tz <= Math.floor((cz + R) / 32); tz++) { const l = CARS.hash.get(tx * 4096 + tz); if (!l) continue;
    for (const i of l) { if (n >= 640) break; const q = CARS.list[i]; _g.q.setFromAxisAngle(_up, q.yaw); m.compose(_g.a.set(q.x, q.y, q.z), _g.q, _g.b.set(q.s, q.s, q.s)); CARS.mesh.setMatrixAt(n, m); const k = CARCOL[q.c]; CARS.mesh.setColorAt(n, c.setRGB(k[0], k[1], k[2])); n++; } }
  CARS.mesh.count = n; CARS.mesh.instanceMatrix.needsUpdate = true; CARS.mesh.instanceColor.needsUpdate = true;
}
function hitCars(x, z, r, out) {   // same contract as hitBuildings
  let deep = 0;
  for (let cx = Math.floor((x - 3.5) / 32); cx <= Math.floor((x + 3.5) / 32); cx++) for (let cz = Math.floor((z - 3.5) / 32); cz <= Math.floor((z + 3.5) / 32); cz++) { const l = CARS.hash.get(cx * 4096 + cz); if (!l) continue;
    for (const i of l) { const q = CARS.list[i]; for (const o of [1.1, -1.1]) { const dx = x - (q.x + Math.sin(q.yaw) * o), dz = z - (q.z + Math.cos(q.yaw) * o), d = Math.hypot(dx, dz), pen = r + 0.95 - d; if (pen > deep) { deep = pen; out.x = dx / (d + 1e-6); out.z = dz / (d + 1e-6); } } } }
  return deep;
}
