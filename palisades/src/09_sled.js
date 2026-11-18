/* ---------- snowmobiles ----------
   A few are parked at the base, beside the bottom of the Base to Base gondola. Ski up to one and press E to get on; W is the throttle,
   S the brake and reverse, A D steer; press E again (when slow) to step off, and it stays where you left it. */
const SLEDS = []; let nearSled = null;
function sledGeometry(body) { // a trail sled, about 3 m long: +z is forward, the origin is on the snow under the seat
  const b = new GeoBag(), Kc = [0.045, 0.05, 0.055], Al = [0.42, 0.44, 0.46], Gy = [0.16, 0.17, 0.19], PI2 = Math.PI / 2;
  // track and tunnel
  b.box(0.38, 0.22, 1.5, 0, 0.14, -0.55, [0.025, 0.025, 0.03]); b.cyl(0.13, 0.13, 0.38, 0, 0.15, 0.2, [0.025, 0.025, 0.03], 12, 0, PI2); b.cyl(0.12, 0.12, 0.38, 0, 0.14, -1.3, [0.025, 0.025, 0.03], 12, 0, PI2);
  for (let k = 0; k < 9; k++) b.box(0.4, 0.035, 0.05, 0, 0.02, -1.25 + k * 0.17, Kc);                                   // track lugs
  for (const z of [-0.2, -0.6, -1.0]) for (const sx of [-1, 1]) b.cyl(0.07, 0.07, 0.03, sx * 0.14, 0.13, z, Al, 10, 0, PI2);   // bogie wheels
  b.box(0.44, 0.1, 1.6, 0, 0.36, -0.55, Al); for (const sx of [-1, 1]) { b.box(0.03, 0.2, 1.5, sx * 0.215, 0.28, -0.55, Al); b.box(0.17, 0.03, 1.05, sx * 0.31, 0.3, -0.2, Kc); b.box(0.03, 0.06, 1.05, sx * 0.39, 0.33, -0.2, Kc); }   // tunnel, running boards with toe rails
  b.box(0.42, 0.24, 0.02, 0, 0.2, -1.4, Kc, 0, -0.25); b.box(0.5, 0.03, 0.03, 0, 0.5, -1.36, Al); for (const sx of [-1, 1]) b.box(0.03, 0.03, 0.34, sx * 0.24, 0.47, -1.2, Al, 0, 0.2);   // snow flap, rear grab bar
  // seat, tank and tail
  b.box(0.36, 0.2, 0.95, 0, 0.52, -0.52, Kc); b.box(0.34, 0.16, 0.34, 0, 0.66, -0.88, Kc, 0, -0.18); b.box(0.36, 0.16, 0.36, 0, 0.56, 0.02, body); b.box(0.2, 0.06, 0.05, 0, 0.6, -1.08, [0.7, 0.05, 0.04]);
  // engine bay, hood and nose
  b.box(0.66, 0.26, 0.95, 0, 0.36, 0.55, Kc); b.box(0.62, 0.2, 0.8, 0, 0.6, 0.5, body, 0, 0.24); b.box(0.52, 0.18, 0.44, 0, 0.43, 1.03, body, 0, 0.6); b.box(0.2, 0.012, 0.62, 0, 0.708, 0.5, [0.92, 0.93, 0.95], 0, 0.24);
  for (const sx of [-1, 1]) { b.box(0.02, 0.1, 0.34, sx * 0.335, 0.4, 0.52, Gy); b.box(0.022, 0.03, 0.3, sx * 0.34, 0.44, 0.52, Al); }   // side vents
  b.box(0.3, 0.085, 0.05, 0, 0.56, 0.95, [0.95, 0.93, 0.78], 0, 0.5); b.box(0.52, 0.03, 0.03, 0, 0.33, 1.24, Al); b.box(0.54, 0.1, 0.3, 0, 0.73, 0.2, Kc);   // headlight, bumper, dash
  b.box(0.5, 0.36, 0.025, 0, 0.93, 0.31, [0.07, 0.1, 0.13], 0, -0.52);                                                 // windshield
  b.cyl(0.02, 0.02, 0.3, 0, 0.84, 0.03, Al, 6, -0.35); b.cyl(0.017, 0.017, 0.66, 0, 0.975, -0.03, Al, 6, 0, PI2); for (const sx of [-1, 1]) { b.cyl(0.026, 0.026, 0.13, sx * 0.31, 0.975, -0.03, Kc, 8, 0, PI2); b.box(0.05, 0.06, 0.02, sx * 0.2, 1.02, 0.0, Kc); }   // bars, grips, mirrors' stubs
  // front suspension and skis
  for (const sx of [-1, 1]) { b.box(0.3, 0.03, 0.05, sx * 0.39, 0.3, 0.76, Al, 0, 0, -sx * 0.37); b.box(0.3, 0.03, 0.05, sx * 0.39, 0.2, 0.7, Al, 0, 0, -sx * 0.2); b.cyl(0.028, 0.028, 0.4, sx * 0.4, 0.34, 0.74, [0.8, 0.62, 0.05], 8, 0, sx * 0.56);
    b.cyl(0.026, 0.026, 0.26, sx * 0.53, 0.16, 0.73, Al, 6); b.box(0.13, 0.035, 1.15, sx * 0.53, 0.025, 0.72, Kc); b.box(0.13, 0.03, 0.32, sx * 0.53, 0.105, 1.42, Kc, 0, -0.55); b.box(0.02, 0.02, 0.3, sx * 0.53, 0.2, 1.36, Al, 0, -0.2); b.box(0.02, 0.14, 0.02, sx * 0.53, 0.12, 1.22, Al); b.box(0.03, 0.05, 1.0, sx * 0.53, 0.0, 0.7, Al); }
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
  S.yaw -= steer * 1.9 * clamp(Math.abs(S.v) / 5, 0, 1) / (1 + Math.abs(S.v) / 26) * (S.v < 0 ? -1 : 1) * dt;   // wide arcs at speed sk.yaw = S.yaw; sk.turn = lerp(sk.turn, steer, Math.min(1, 6 * dt));
  const sA = tangent(S.yaw), s = readSurface(), grade = Math.sin(sA);   // positive when the nose points uphill
  let acc = thr > 0 ? 19 * (1 - Math.max(0, S.v) / 50) : thr < 0 ? (S.v > 0.5 ? -20 : -6 * (1 + S.v / 6)) : 0;   // a big two-stroke: 0 to 60 mph in about four seconds, 90 flat out on a groomed run
  acc -= G * (thr > 0 ? Math.min(0, grade) : grade) * 0.7 + (0.05 + 0.16 * (s.deep || 0)) * S.v + 0.0026 * S.v * Math.abs(S.v);   // under power it climbs as fast as it runs on the flat
  S.v = clamp(S.v + acc * dt, -7, 50); if (!thr && Math.abs(S.v) < 0.5 && Math.abs(grade) < 0.35) S.v = 0;   // it sits still on all but the steepest ground
  const hx = Math.sin(S.yaw), hz = Math.cos(S.yaw), st = S.v * Math.cos(sA) * dt, nx = S.x + hx * st, nz = S.z + hz * st;
  if (buildingAt(nx, nz) || treeHit(nx, nz, 0.7) || !inWorld(nx, nz, 75) || H(nx, nz) - H(S.x, S.z) > 1.1 + Math.abs(st) || towerHits.some(t => Math.hypot(t.x - nx, t.z - nz) < t.r + 0.6)) { if (Math.abs(S.v) > 6) sfx("thump", 0.7); if (Math.abs(S.v) > 22) { const S0 = S; S0.v = 0; sk.sled = null; placeSkier(S0.x, S0.z, S0.yaw, 12); crash("Thrown off the snowmobile"); return; } S.v *= -0.15; }   // hit something flat out and you are thrown
  else { S.x = nx; S.z = nz; }
  p.set(S.x, H(S.x, S.z), S.z); sk.sp = Math.abs(S.v); sk.slope = sA; sk.v.set(hx * S.v, 0, hz * S.v); sledPlace(S);
  if (Math.abs(S.v) > 3 && Math.random() < 0.7) for (let i = 0; i < 2; i++) spray(p, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 3, sk.v, 0.8, 0.5 * (s.deep || 0));
  const dy = sk.lastY !== undefined ? p.y - sk.lastY : 0; sk.lastY = p.y; sk.safeT += dt; if (sk.safeT > 1.5) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
}
