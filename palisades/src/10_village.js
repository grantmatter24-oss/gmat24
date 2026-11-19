/* ---------- the village on foot: cobbled plaza, people strolling, and shops you can walk into ----------
   The plaza between the village buildings is cobbled and swept. People walk about it slowly. The shops and restaurants have their
   doors and signs on the plaza; ski or walk up to a door and press E to go in. Inside, the counter of a gear shop opens your outfit;
   walk back to the door (or press E away from the counter) to leave. */
const SHOP_LIST = [ // names as I recall them from the Village at Palisades Tahoe; kind decides what is inside
  ["Parallel Mountain Sports", "ski"], ["The North Face", "wear"], ["Alice's Mountain Market", "food"], ["Fireside Pizza Co.", "food"], ["Auld Dubliner", "bar"],
  ["Tremigo Mexican Kitchen", "food"], ["Coffeebar", "cafe"], ["Gallery Keoki", "art"], ["Estelle Sports", "wear"], ["Mamasake Sushi", "food"], ["Uncorked", "bar"], ["Squaw Dogs", "cafe"]
];
const SHOPS = [], WALKERS = []; let nearShop = null, walkerMesh = null, shopRoom = null;
const ROOM = { x: 0, y: 5200, z: 0, hx: 5, hz: 4, h: 3.2 };   // the one interior, built to suit whichever shop you are in; it stands far above the mountain, out of sight
function initPlaza() {
  const ct = WORLD.blds.find(bd => /clock tower/i.test(bd.n || "")); if (!ct) return;
  const near = WORLD.blds.filter(bd => Math.hypot(bd.cx - ct.cx, bd.cz - ct.cz) < 150 && polyArea(bd.p) > 250); if (near.length < 3) return;
  let cx = 0, cz = 0; for (const bd of near) { cx += bd.cx / near.length; cz += bd.cz / near.length; } let r = 0; for (const bd of near) r = Math.max(r, Math.hypot(bd.cx - cx, bd.cz - cz));
  PLAZA.x = cx; PLAZA.z = cz; PLAZA.r = clamp(r * 0.7, 40, 82); U.uPlaza.value.set(cx, cz, PLAZA.r, 0);
  // shop fronts: one on each building, on the wall that faces the middle of the plaza
  const b = new GeoBag(), signs = []; let k = 0;
  for (const bd of near.sort((p, q) => Math.hypot(p.cx - cx, p.cz - cz) - Math.hypot(q.cx - cx, q.cz - cz))) { if (k >= SHOP_LIST.length || /clock tower/i.test(bd.n || "")) continue; const P = bd.p, n = P.length; let best = null;
    for (let i = 0; i < n; i++) { const a = P[i], c = P[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 6) continue; const tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, sg = inPoly(P, mx - tz * 0.4, mz + tx * 0.4) ? -1 : 1, ox = -tz * sg, oz = tx * sg;
      const face = ((cx - mx) * ox + (cz - mz) * oz) / (Math.hypot(cx - mx, cz - mz) || 1), dx = mx + ox * 1.6, dz = mz + oz * 1.6; if (face < 0.2 || buildingAt(dx, dz)) continue; const sc = face * Math.min(len, 14); if (!best || sc > best.sc) best = { sc, mx, mz, ox, oz, tx, tz }; }
    if (!best) continue; const [name, kind] = SHOP_LIST[k++], g = H(best.mx + best.ox * 1.2, best.mz + best.oz * 1.2), yaw = Math.atan2(best.ox, best.oz), col = [[0.55, 0.12, 0.1], [0.1, 0.25, 0.45], [0.12, 0.35, 0.2], [0.6, 0.42, 0.08]][k % 4];
    const at = (u, y, o) => [best.mx + best.tx * u + best.ox * o, y, best.mz + best.tz * u + best.oz * o], bx = (w, h, d, u, y, o, c) => { const p = at(u, y, o); b.box(w, h, d, p[0], p[1], p[2], c, yaw); };
    bx(1.5, 2.4, 0.12, 0, g + 1.1, 0.04, [0.2, 0.13, 0.08]); bx(1.1, 2.0, 0.05, 0, g + 1.05, 0.12, [0.06, 0.09, 0.12]); bx(0.06, 0.3, 0.06, 0.38, g + 1.05, 0.17, [0.75, 0.62, 0.3]);   // door, its glass and handle
    for (const sd of [-1, 1]) bx(2.2, 1.5, 0.06, sd * 2.4, g + 1.45, 0.06, [0.07, 0.1, 0.13]);                                                                              // display windows
    bx(6.6, 0.12, 1.5, 0, g + 2.75, 0.75, col); bx(6.6, 0.3, 0.06, 0, g + 2.6, 1.5, col); bx(5.2, 0.7, 0.1, 0, g + 3.3, 0.1, [0.12, 0.08, 0.05]);                              // awning and sign board
    signs.push([at(0, g + 3.3, 0.16), yaw, name]); SHOPS.push({ name, kind, x: best.mx + best.ox * 1.3, z: best.mz + best.oz * 1.3, yaw: yaw + Math.PI }); }
  if (b.p.length) { const m = new THREE.Mesh(b.build(), liftMat); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  for (const [p, yaw, name] of signs) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.6), textPlate(name, "#1f140c", "#f3e7c9")); m.position.set(p[0], p[1], p[2]); m.rotation.y = yaw; scene.add(m); }
  // people on the plaza
  const pb = new GeoBag(), W = [1, 1, 1], D = [0.09, 0.1, 0.12];
  for (const sx of [-1, 1]) { pb.box(0.15, 0.82, 0.17, sx * 0.1, 0.41, 0, D); pb.box(0.16, 0.08, 0.28, sx * 0.1, 0.04, 0.05, [0.05, 0.05, 0.05]); pb.box(0.11, 0.58, 0.13, sx * 0.27, 1.12, 0, W); }
  pb.cyl(0.2, 0.19, 0.64, 0, 1.14, 0, W, 10); pb.add(new THREE.SphereGeometry(0.115, 10, 8), _gm.makeTranslation(0, 1.6, 0), [0.85, 0.68, 0.56]); pb.cyl(0.125, 0.12, 0.1, 0, 1.68, 0, D, 10);
  const N = 28, JK = [0xd8362b, 0x1f6fd6, 0xf2b61b, 0x2a9d62, 0x8a4fd1, 0xe86a1c, 0x1b1e24, 0xe9edf2, 0x16a3a3, 0xd9438c], c = new THREE.Color();
  walkerMesh = new THREE.InstancedMesh(pb.build(), worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })), N); walkerMesh.castShadow = true; walkerMesh.frustumCulled = false; scene.add(walkerMesh);
  for (let i = 0; i < N; i++) { const w = { x: cx, z: cz, tx: cx, tz: cz, v: 0.6 + 0.6 * hash2(i, 3, 301), ph: i * 1.7, wait: 0 }; walkerSpot(w, i * 13.1); w.x = w.tx; w.z = w.tz; walkerSpot(w, i * 5.3 + 1); WALKERS.push(w); walkerMesh.setColorAt(i, c.setHex(JK[(i * 3 + 1) % JK.length])); }
}
function textPlate(txt, bg, fg) { const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 1024, 128); g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; let fs = 78; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; while (g.measureText(txt).width > 960 && fs > 28) { fs -= 4; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; } g.fillText(txt, 512, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshBasicMaterial({ map: t }); }
function walkerSpot(w, seed) { for (let k = 0; k < 12; k++) { const a = hash2(seed, k, 302) * TAU, r = Math.sqrt(hash2(seed, k, 303)) * (PLAZA.r - 12), x = PLAZA.x + Math.sin(a) * r, z = PLAZA.z + Math.cos(a) * r; if (!buildingAt(x, z) && !buildingAt(x + 1.2, z) && !buildingAt(x, z + 1.2) && maskCh(x, z, 0) < 0.3) { w.tx = x; w.tz = z; return; } } }   // on the cobbles, off the snow people ski on
function updateWalkers(dt, cam) {
  if (!walkerMesh || Math.abs(cam.x - PLAZA.x) + Math.abs(cam.z - PLAZA.z) > 700) return;
  WALKERS.forEach((w, i) => { const dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz);
    if (w.wait > 0) w.wait -= dt; else if (d < 0.6) { w.wait = hash2(i, liftTime | 0, 304) * 5; walkerSpot(w, i * 7.7 + liftTime); }   // stop a moment, then stroll on somewhere else
    else { const st = w.v * dt, nx = w.x + dx / d * st, nz = w.z + dz / d * st; if (buildingAt(nx, nz)) walkerSpot(w, i * 3.1 + liftTime * 1.3); else { w.x = nx; w.z = nz; w.ph += st * 3.2; w.yaw = Math.atan2(dx, dz); } }
    _lq.setFromEuler(_ne.set(0, w.yaw || 0, w.wait > 0 ? 0 : Math.sin(w.ph) * 0.04, "YXZ")); _lm.compose(_lp.set(w.x, H(w.x, w.z) + (w.wait > 0 ? 0 : Math.abs(Math.sin(w.ph)) * 0.035), w.z), _lq, _ls); walkerMesh.setMatrixAt(i, _lm); });
  walkerMesh.instanceMatrix.needsUpdate = true;
}
/* ---- going into a shop ---- */
function shopTick() { nearShop = null; if (sk.inShop || !(sk.mode === "ski" || sk.mode === "walk") || sk.sp > 5 || !sk.ground || COMP.run) return; let bd = 2.8; for (const s of SHOPS) { const d = Math.hypot(s.x - sk.p.x, s.z - sk.p.z); if (d < bd) { bd = d; nearShop = s; } } }
function buildRoom(shop) {
  if (shopRoom) { scene.remove(shopRoom); shopRoom.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  const g = new THREE.Group(), b = new GeoBag(), R = ROOM, y0 = R.y, K = shop.kind, wood = [0.5, 0.36, 0.22], dark = [0.16, 0.11, 0.07], wall = K === "bar" ? [0.32, 0.2, 0.13] : K === "art" ? [0.82, 0.8, 0.76] : [0.72, 0.66, 0.56], obst = [];
  const bx = (w, h, d, x, y, z, c, ry) => b.box(w, h, d, R.x + x, y0 + y, R.z + z, c, ry || 0), block = (x, z, hx, hz) => obst.push([x - hx, x + hx, z - hz, z + hz]);
  bx(2 * R.hx, 0.2, 2 * R.hz, 0, -0.1, 0, wood); for (let i = -4; i <= 4; i++) bx(0.03, 0.01, 2 * R.hz, i * 1.1, 0.005, 0, dark);                         // plank floor
  bx(2 * R.hx, 0.2, 2 * R.hz, 0, R.h + 0.1, 0, [0.8, 0.78, 0.74]); for (const x of [-2.5, 0, 2.5]) bx(1.2, 0.05, 0.3, x, R.h - 0.03, 0.5, [1.6, 1.5, 1.25]);   // ceiling and its lights
  bx(0.2, R.h, 2 * R.hz, -R.hx - 0.1, R.h / 2, 0, wall); bx(0.2, R.h, 2 * R.hz, R.hx + 0.1, R.h / 2, 0, wall); bx(2 * R.hx, R.h, 0.2, 0, R.h / 2, R.hz + 0.1, wall); bx(2 * R.hx, R.h, 0.2, 0, R.h / 2, -R.hz - 0.1, wall);
  bx(2 * R.hx, 0.9, 0.04, 0, 0.45, R.hz - 0.02, dark); bx(1.3, 2.2, 0.05, 0, 1.1, -R.hz + 0.03, [0.2, 0.13, 0.08]); bx(0.95, 1.8, 0.03, 0, 1.15, -R.hz + 0.06, [0.75, 0.86, 0.95]);                // wainscot; the door, daylight in its glass
  for (const x of [-3, 3]) { bx(1.9, 1.4, 0.04, x, 1.7, -R.hz + 0.03, [0.78, 0.88, 0.96]); bx(2.0, 0.08, 0.1, x, 0.96, -R.hz + 0.06, dark); }                                                 // windows onto the plaza
  bx(3.6, 1.05, 0.7, 1.6, 0.52, 2.6, dark); bx(3.7, 0.06, 0.8, 1.6, 1.08, 2.6, wood); bx(0.4, 0.3, 0.35, 2.9, 1.26, 2.6, [0.1, 0.1, 0.11]); block(1.6, 2.6, 1.95, 0.55);                        // the counter and its till
  bx(0.34, 0.75, 0.22, 1.2, 1.35, 3.35, [0.18, 0.3, 0.5]); b.add(new THREE.SphereGeometry(0.12, 10, 8), _gm.makeTranslation(R.x + 1.2, y0 + 1.86, R.z + 3.35), [0.85, 0.68, 0.56]);                // someone behind it
  if (K === "ski" || K === "wear") { const cols = [[0.75, 0.1, 0.08], [0.1, 0.3, 0.7], [0.9, 0.7, 0.1], [0.1, 0.5, 0.3], [0.5, 0.2, 0.6], [0.9, 0.9, 0.92], [0.1, 0.1, 0.12]];
    if (K === "ski") { for (let i = 0; i < 14; i++) bx(0.1, 1.7, 0.03, -4.86, 0.95, -3 + i * 0.44, cols[i % 7], 0); bx(0.1, 0.08, 6.3, -4.9, 1.85, -0.1, dark);                                // skis racked along the wall
      for (let s = 0; s < 3; s++) { bx(0.4, 0.05, 3.4, 4.75, 0.6 + s * 0.55, -1, wood); for (let i = 0; i < 6; i++) bx(0.3, 0.32, 0.3, 4.75, 0.78 + s * 0.55, -2.4 + i * 0.56, cols[(i + s) % 7]); } }   // boots on shelves
    for (const [rx, rz] of [[-2.4, 0.2], [-2.4, -1.9], [2.9, -1.3]]) { bx(2.2, 0.05, 0.05, rx, 1.55, rz, [0.6, 0.62, 0.65]); for (const e of [-1, 1]) bx(0.05, 1.55, 0.05, rx + e * 1.1, 0.78, rz, [0.6, 0.62, 0.65]); for (let i = 0; i < 9; i++) bx(0.16, 0.85, 0.5, rx - 0.9 + i * 0.225, 1.08, rz, cols[(i * 2 + (rx > 0 ? 1 : 0)) % 7]); block(rx, rz, 1.2, 0.35); }   // racks of jackets
  } else if (K === "art") { const pic = [[0.2, 0.4, 0.7], [0.85, 0.55, 0.2], [0.3, 0.55, 0.4], [0.7, 0.2, 0.25], [0.15, 0.2, 0.35]];
    for (let i = 0; i < 4; i++) { bx(0.05, 1.1, 1.5, -4.95, 1.75, -2.7 + i * 1.8, dark); bx(0.04, 0.95, 1.35, -4.92, 1.75, -2.7 + i * 1.8, pic[i % 5]); bx(0.05, 1.1, 1.5, 4.95, 1.75, -2.7 + i * 1.8, dark); bx(0.04, 0.95, 1.35, 4.92, 1.75, -2.7 + i * 1.8, pic[(i + 2) % 5]); }
    for (const [px, pz] of [[-2, 0], [2.2, -1.3]]) { bx(0.6, 1.0, 0.6, px, 0.5, pz, [0.9, 0.9, 0.88]); bx(0.3, 0.5, 0.3, px, 1.25, pz, [0.5, 0.42, 0.2]); block(px, pz, 0.4, 0.4); }
  } else { // somewhere to eat or drink: tables and stools, bottles or a menu behind the counter
    for (const [tx2, tz2] of [[-3.4, -1.9], [-3.4, 0.9], [-1.5, -0.5], [3.2, -1.6]]) { b.cyl(0.5, 0.5, 0.06, R.x + tx2, y0 + 0.76, R.z + tz2, wood, 12); b.cyl(0.06, 0.2, 0.74, R.x + tx2, y0 + 0.37, R.z + tz2, dark, 6); block(tx2, tz2, 0.5, 0.5); for (const a of [0, 2.1, 4.2]) b.cyl(0.17, 0.17, 0.46, R.x + tx2 + Math.sin(a) * 0.85, y0 + 0.23, R.z + tz2 + Math.cos(a) * 0.85, [0.5, 0.12, 0.1], 8); }
    bx(3.6, 0.06, 0.3, 1.6, 1.75, 3.85, wood); bx(3.6, 0.06, 0.3, 1.6, 2.2, 3.85, wood); const bc = [[0.1, 0.35, 0.15], [0.45, 0.25, 0.08], [0.6, 0.1, 0.1], [0.8, 0.75, 0.5]]; for (let i = 0; i < 12; i++) for (const yy of [1.93, 2.38]) b.cyl(0.045, 0.05, 0.3, R.x + 0.05 + i * 0.28, y0 + yy, R.z + 3.85, bc[(i + (yy > 2 ? 1 : 0)) % 4], 6); }
  const mesh = new THREE.Mesh(b.build(), new THREE.MeshBasicMaterial({ vertexColors: true })); mesh.frustumCulled = false; g.add(mesh);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.5), textPlate(shop.name, "#1f140c", "#f3e7c9")); sign.position.set(R.x - 1.4, y0 + 2.55, R.z + R.hz - 0.03); sign.rotation.y = Math.PI; g.add(sign);
  scene.add(g); shopRoom = g; ROOM.obst = obst;
}
function shopEnter(s) { buildRoom(s); sk.inShop = s; sk.shopFrom = sk.mode; sk.mode = "walk"; sk.p.set(ROOM.x, ROOM.y, ROOM.z - ROOM.hz + 0.9); sk.yaw = 0; sk.sp = 0; sk.v.set(0, 0, 0); sk.walkPh = 0; sk.sw = false; sk.spin = 0; sk.turn = sk.carve = 0; sk.slip = 0; trkPrev = null; camSnap = true; nearShop = null; charging = false; popReq = false;
  toast(s.name + (s.kind === "ski" || s.kind === "wear" ? " · the counter opens your gear" : "") + " · W walks, A D turn · E at the door to leave", 4.5); }
function shopLeave() { const s = sk.inShop; if (!s) return; sk.inShop = null; if (shopRoom) { scene.remove(shopRoom); shopRoom = null; } placeSkier(s.x, s.z, s.yaw + Math.PI, 0); if (sk.shopFrom === "walk") toggleWalk(); }
function shopUse() { // E inside: at the counter you are served; anywhere else you head out
  const s = sk.inShop, atCounter = Math.hypot(sk.p.x - ROOM.x - 1.6, sk.p.z - ROOM.z - 1.75) < 1.5; if (!atCounter) return shopLeave();
  if (s.kind === "ski" || s.kind === "wear") { setOverlay("fit", true); paused = true; } else toast(s.kind === "art" ? "Prints of the Palisades at first light. Not today." : s.kind === "bar" ? "A pint by the fire. One more run, though." : "Something hot. Legs feel fresh again.", 3);
}
function stepShop(dt) {
  const p = sk.p, R = ROOM, steer = ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0), go = (K.up ? 1 : 0) - (K.down ? 1 : 0); sk.yaw -= steer * 2.2 * dt;
  const v = go > 0 ? 1.7 : go < 0 ? -1 : 0, nx = clamp(p.x + Math.sin(sk.yaw) * v * dt, R.x - R.hx + 0.35, R.x + R.hx - 0.35), nz = clamp(p.z + Math.cos(sk.yaw) * v * dt, R.z - R.hz + 0.35, R.z + R.hz - 0.35), lx = nx - R.x, lz = nz - R.z;
  if (!(R.obst || []).some(o => lx > o[0] - 0.3 && lx < o[1] + 0.3 && lz > o[2] - 0.3 && lz < o[3] + 0.3)) { p.x = nx; p.z = nz; }
  p.y = R.y; sk.sp = Math.abs(v); sk.walkPh = (sk.walkPh || 0) + v * dt * 4.3; sk.slope = 0; sk.turn = 0; sk.ground = true; sk.lastY = p.y; sk.surf.deep = 0; sk.surf.rock = 0; sk.surf.groom = 1; sk.surf.powder = 0;
}
