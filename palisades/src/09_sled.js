/* ---------- snowmobiles ----------
   A few are parked at the base, beside the bottom of the Base to Base gondola. Ski up to one and press E to get on; W is the throttle,
   S the brake and reverse, A D steer; press E again (when slow) to step off, and it stays where you left it. */
const SLEDS = []; let nearSled = null;
function sledGeometry(body) {
  const b = new GeoBag(), Kc = [0.05, 0.055, 0.06], Gy = [0.2, 0.22, 0.24];   // +z is forward; the origin is on the snow under the seat
  b.box(0.42, 0.24, 1.3, 0, 0.14, -0.42, [0.03, 0.03, 0.035]);                 // track
  b.box(0.6, 0.3, 1.95, 0, 0.42, 0.02, Kc);                                    // tunnel and chassis
  b.box(0.72, 0.3, 1.0, 0, 0.6, 0.74, body, 0, 0.2);                           // hood, sloping down to the nose
  b.box(0.5, 0.16, 0.85, 0, 0.66, -0.4, Kc); b.box(0.5, 0.22, 0.12, 0, 0.78, -0.86, Kc);   // seat and backrest
  b.box(0.54, 0.34, 0.05, 0, 0.92, 0.36, [0.1, 0.14, 0.18], 0, -0.55);         // windshield
  b.cyl(0.025, 0.025, 0.42, 0, 0.8, 0.22, Kc, 6, -0.45); b.box(0.64, 0.04, 0.04, 0, 0.97, 0.12, Kc);   // steering post and bars
  b.box(0.56, 0.1, 0.22, 0, 0.5, -1.02, body); b.box(0.3, 0.1, 0.05, 0, 0.6, 1.24, [0.95, 0.9, 0.7]);   // tail and headlight
  for (const sx of [-1, 1]) { b.box(0.15, 0.04, 1.1, sx * 0.5, 0.03, 0.82, Kc); b.box(0.15, 0.04, 0.24, sx * 0.5, 0.09, 1.44, Kc, 0, -0.5); b.cyl(0.03, 0.03, 0.46, sx * 0.44, 0.27, 0.84, Gy, 6, 0, sx * 0.3); b.box(0.36, 0.05, 0.08, sx * 0.3, 0.46, 0.84, Gy); }   // skis on their struts
  return b.build();
}
function initSleds() {
  const g = LIFTS.find(l => l.type === "gondola"); if (!g) return;
  const fx = Math.sin(g.dir), fz = Math.cos(g.dir), cols = [[0.75, 0.08, 0.06], [0.05, 0.2, 0.6], [0.85, 0.62, 0.05], [0.1, 0.11, 0.12]];
  let side = 1; if (buildingAt(g.bot.x + fz * 13 + fx * 6, g.bot.z - fx * 13 + fz * 6)) side = -1;
  cols.forEach((c, k) => { const x = g.bot.x + fz * side * 12.5 + fx * (1.5 + k * 2.7), z = g.bot.z - fx * side * 12.5 + fz * (1.5 + k * 2.7), m = new THREE.Mesh(sledGeometry(c), liftMat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    const S = { x, z, yaw: g.dir + side * Math.PI / 2, v: 0, thr: 0, mesh: m }; SLEDS.push(S); sledPlace(S); });
}
const _sy = new THREE.Vector3(), _sz = new THREE.Vector3(), _sx = new THREE.Vector3(), _sm = new THREE.Matrix4();
function sledPlace(S) { const up = normalAt(S.x, S.z, 0.9, _sy); _sz.set(Math.sin(S.yaw), 0, Math.cos(S.yaw)); _sx.crossVectors(up, _sz).normalize(); _sz.crossVectors(_sx, up).normalize(); S.mesh.quaternion.setFromRotationMatrix(_sm.makeBasis(_sx, up, _sz)); S.mesh.position.set(S.x, H(S.x, S.z), S.z); }
function sledTick() { nearSled = null; if (sk.mode !== "ski" || sk.sp > 6 || !sk.ground) return; let bd = 3.6; for (const S of SLEDS) { const d = Math.hypot(S.x - sk.p.x, S.z - sk.p.z); if (d < bd) { bd = d; nearSled = S; } } }
function sledToggle() {
  if (sk.mode === "sled") { const S = sk.sled; if (Math.abs(S.v) > 4) return toast("Slow down to get off", 1.5);
    S.v = 0; S.thr = 0; sk.sled = null; let x = S.x - Math.cos(S.yaw) * 1.5, z = S.z + Math.sin(S.yaw) * 1.5; if (buildingAt(x, z) || treeHit(x, z, 0.3)) { x = S.x + Math.cos(S.yaw) * 1.5; z = S.z - Math.sin(S.yaw) * 1.5; }
    placeSkier(x, z, S.yaw, 0); toast("Off the snowmobile", 1.5); return; }
  if (sk.mode !== "ski" || !nearSled) return; const S = nearSled;
  sk.mode = "sled"; sk.sled = S; sk.p.set(S.x, H(S.x, S.z), S.z); sk.yaw = S.yaw; sk.sp = 0; sk.v.set(0, 0, 0); sk.ground = true; sk.air = false; sk.sw = false; sk.spin = sk.rot = 0; sk.turn = sk.carve = 0; sk.slip = 0; charging = false; popReq = false; nearSled = null; camSnap = true;
  toast("Snowmobile · W throttle, S brake and reverse, A D steer · E to get off", 4);
}
function stepSled(dt) {
  const S = sk.sled, p = sk.p; if (!S) { sk.mode = "ski"; return; }
  const steer = ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0), thr = (K.up ? 1 : 0) - (K.down ? 1 : 0); S.thr = thr;
  S.yaw -= steer * 1.7 * clamp(Math.abs(S.v) / 5, 0, 1) * (S.v < 0 ? -1 : 1) * dt; sk.yaw = S.yaw; sk.turn = lerp(sk.turn, steer, Math.min(1, 6 * dt));
  const sA = tangent(S.yaw), s = readSurface(), grade = Math.sin(sA);   // positive when the nose points uphill
  let acc = thr > 0 ? 9.5 * (1 - Math.max(0, S.v) / 25) : thr < 0 ? (S.v > 0.5 ? -13 : -5 * (1 + S.v / 6)) : 0;
  acc -= G * grade * 0.8 + (0.22 + 0.5 * (s.deep || 0)) * S.v + 0.004 * S.v * Math.abs(S.v);
  S.v = clamp(S.v + acc * dt, -6, 27); if (!thr && Math.abs(S.v) < 0.5 && Math.abs(grade) < 0.35) S.v = 0;   // it sits still on all but the steepest ground
  const hx = Math.sin(S.yaw), hz = Math.cos(S.yaw), st = S.v * Math.cos(sA) * dt, nx = S.x + hx * st, nz = S.z + hz * st;
  if (buildingAt(nx, nz) || treeHit(nx, nz, 0.7) || !inWorld(nx, nz, 75) || H(nx, nz) - H(S.x, S.z) > 1.1 + Math.abs(st) || towerHits.some(t => Math.hypot(t.x - nx, t.z - nz) < t.r + 0.6)) { if (Math.abs(S.v) > 6) sfx("thump", 0.7); S.v *= -0.15; }
  else { S.x = nx; S.z = nz; }
  p.set(S.x, H(S.x, S.z), S.z); sk.sp = Math.abs(S.v); sk.slope = sA; sk.v.set(hx * S.v, 0, hz * S.v); sledPlace(S);
  if (Math.abs(S.v) > 3 && Math.random() < 0.7) for (let i = 0; i < 2; i++) spray(p, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 3, sk.v, 0.8, 0.5 * (s.deep || 0));
  const dy = sk.lastY !== undefined ? p.y - sk.lastY : 0; sk.lastY = p.y; sk.safeT += dt; if (sk.safeT > 1.5) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
}
