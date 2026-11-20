/* ---------- snowmobiles ----------
   A few are parked at the base, beside the bottom of the Base to Base gondola. Ski up to one and press E to get on; W is the throttle,
   S the brake and reverse, A D steer; press E again (when slow) to step off, and it stays where you left it. */
const SLEDS = []; let nearSled = null;
/* Two up. A snowmobile carries a driver and one passenger. The driver's game moves the machine and everyone else's follows it; if another
   player is driving, E puts you on the back, and if they get off while you are aboard you slide forward and take the bars. */
const sledDriver = S => S.remote && performance.now() - S.remoteT < 1500 ? S.remote : null;   // the other player driving this sled right now, if any
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
const _sy = new THREE.Vector3(), _sz = new THREE.Vector3(), _sx = new THREE.Vector3(), _sm = new THREE.Matrix4(), _sq = new THREE.Quaternion();
function sledPlace(S) { const g = H(S.x, S.z), fly = S.air && S.y - g > 0.15, hx = Math.sin(S.yaw), hz = Math.cos(S.yaw), pt = S.pit || 0, up = fly ? _sy.set(-hx * Math.sin(pt), Math.cos(pt), -hz * Math.sin(pt)) : normalAt(S.x, S.z, 0.9, _sy);   // in the air it holds the pitch it left with; on the snow it lies to the slope
  _sz.set(hx, 0, hz); _sx.crossVectors(up, _sz).normalize(); _sz.crossVectors(_sx, up).normalize(); _sq.setFromRotationMatrix(_sm.makeBasis(_sx, up, _sz)); if (S.air || S.landT > 0) S.mesh.quaternion.slerp(_sq, 0.4); else S.mesh.quaternion.copy(_sq); S.mesh.position.set(S.x, S.air ? Math.max(g, S.y) : g, S.z); }
function sledTick() { nearSled = null; for (const S of SLEDS) if (S.remote && !sledDriver(S)) { S.remote = null; S.v = 0; } if (!(sk.mode === "ski" || sk.mode === "walk") || sk.sp > 6 || !sk.ground || sk.shopIn || PUB.seat) return; let bd = 3.6; for (const S of SLEDS) { const d = Math.hypot(S.x - sk.p.x, S.z - sk.p.z); if (d < bd) { bd = d; nearSled = S; } } }
function sledToggle() {
  if (sk.mode === "sled") { const S = sk.sled, pass = sk.sledRole === 2; if (S.air) return toast("Not in mid air", 1.2); if (Math.abs(S.v) > 4) return toast(pass ? "Wait until it slows down to hop off" : "Slow down to get off", 1.5);
    if (!pass) { S.v = 0; S.thr = 0; } sk.sled = null; sk.sledRole = 0; let x = S.x - Math.cos(S.yaw) * 1.5, z = S.z + Math.sin(S.yaw) * 1.5; if (buildingAt(x, z) || treeHit(x, z, 0.3)) { x = S.x + Math.cos(S.yaw) * 1.5; z = S.z - Math.sin(S.yaw) * 1.5; }
    placeSkier(x, z, S.yaw, 0); toast("Off the snowmobile", 1.5); return; }
  if (!(sk.mode === "ski" || sk.mode === "walk") || !nearSled) return; sk.dance = 0; const S = nearSled, drv = sledDriver(S); if (drv && Math.abs(S.v) > 4) return toast("It is moving too fast to hop on", 1.5);
  sk.mode = "sled"; sk.sled = S; sk.sledRole = drv ? 2 : 1; sk.p.set(S.x, H(S.x, S.z), S.z); sk.yaw = S.yaw; sk.sp = 0; sk.v.set(0, 0, 0); sk.ground = true; sk.air = false; sk.sw = false; sk.spin = sk.rot = 0; sk.turn = sk.carve = 0; sk.slip = 0; charging = false; popReq = false; nearSled = null; camSnap = true;
  toast(drv ? "On the back · the driver steers · E to hop off" : "Snowmobile · W throttle, S brake and reverse, A D steer · it flies off jumps: W holds the nose up, S drops it · E to get off", 4);
}
function stepSled(dt) {
  const S = sk.sled, p = sk.p; if (!S) { sk.mode = "ski"; return; }
  if (sk.sledRole === 2) { // a passenger goes where the driver's machine goes
    if (sledDriver(S)) { p.set(S.x, S.air ? Math.max(S.y, H(S.x, S.z)) : H(S.x, S.z), S.z); sk.ground = !S.air; sk.yaw = S.yaw; sk.sp = Math.abs(S.v); sk.slope = tangent(S.yaw); sk.v.set(Math.sin(S.yaw) * S.v, 0, Math.cos(S.yaw) * S.v); sk.turn = 0; S.thr = 0; return; }
    sk.sledRole = 1; S.v = 0; toast("The driver got off: you take the bars", 3); }
  const steer = ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0), thr = (K.up ? 1 : 0) - (K.down ? 1 : 0); S.thr = thr;
  const h0 = H(S.x, S.z), fly = S.air && S.y - h0 > 0.2;   // properly off the ground, not just skipping over a ripple
  S.yaw -= steer * (fly ? 0.45 : 1.9) * clamp(Math.abs(S.v) / 5, 0, 1) / (1 + Math.abs(S.v) / 26) * (S.v < 0 ? -1 : 1) * dt; sk.yaw = S.yaw; sk.turn = lerp(sk.turn, steer, Math.min(1, 6 * dt));
  const sA = tangent(S.yaw), s = readSurface(), grade = Math.sin(sA);   // positive when the nose points uphill
  // Top speed is 80 mph on the flat and downhill, 60 mph on a climb; it pulls hard up to either.
  const vcap = lerp(80, 60, sstep(0.02, 0.1, grade)) / MPH;
  let acc = thr > 0 ? (19 - 5 * (s.deep || 0)) * (1 - S.v / vcap) - G * Math.min(0, grade) * 0.7 * clamp(1 - S.v / vcap, 0, 1) :   /* deep snow only dulls the pull; it still reaches the same top speed */ (thr < 0 ? (S.v > 0.5 ? -20 : -6 * (1 + S.v / 6)) : 0) - G * grade * 0.7 - 0.05 * S.v - 0.0026 * S.v * Math.abs(S.v);
  if (fly) acc = -0.0026 * S.v * Math.abs(S.v);   // nothing to push against in the air: only the wind slows it
  S.v = clamp(S.v + acc * dt, -7, 80 / MPH); if (!S.air && !thr && Math.abs(S.v) < 0.5 && Math.abs(grade) < 0.35) S.v = 0;   // it sits still on all but the steepest ground
  const hx = Math.sin(S.yaw), hz = Math.cos(S.yaw), vh = S.air ? S.vh * (S.v / (S.v0 || S.v || 1)) : S.v * Math.cos(sA), st = vh * dt, nx = S.x + hx * st, nz = S.z + hz * st, yNow = S.air ? S.y : h0;
  const throwOff = why => { const S0 = S; S0.why = why; S0.v = 0; S0.air = false; S0.vy = 0; sk.sled = null; placeSkier(S0.x, S0.z, S0.yaw, 12); sledPlace(S0); crash(why); };
  if (buildingAt(nx, nz) || treeHit(nx, nz, 0.7) || !inWorld(nx, nz, 75) || H(nx, nz) - yNow > 1.1 + Math.abs(st) || towerHits.some(t => Math.hypot(t.x - nx, t.z - nz) < t.r + 0.6)) { if (Math.abs(S.v) > 6) sfx("thump", 0.7); if (Math.abs(S.v) > 22) return throwOff("Thrown off the snowmobile"); S.v *= -0.15; if (S.air) { S.vh = 0; S.v0 = S.v || 1; } }   // hit something flat out and you are thrown
  else { S.x = nx; S.z = nz; }
  const h1 = H(S.x, S.z); S.landT = Math.max(0, (S.landT || 0) - dt);
  if (!S.air) { const vy0 = S.v * Math.sin(sA), yB = h0 + vy0 * dt - 0.5 * G * dt * dt;   // where it would be if the snow were not there to hold it down
    if (yB > h1 + 0.04 && Math.abs(S.v) > 7) { S.air = true; S.airT = 0; S.vh = vh; S.v0 = S.v; S.vy = vy0 - G * dt; S.y = yB; S.pit = sA; S.ax = S.x; S.az = S.z; S.top = 0; }   // the ground falls away faster than it can follow: it flies
    else { S.y = h1; S.vy = vy0; } }
  else { S.airT += dt; S.vy -= G * dt; S.y += S.vy * dt; S.top = Math.max(S.top, S.y - h1); S.pit = clamp(S.pit + ((thr > 0 ? 0.45 : thr < 0 ? -0.9 : 0) - 0.2) * dt + (Math.atan2(S.vy, Math.abs(vh) + 0.1) - S.pit) * 0.7 * dt, -1.0, 1.0);   // it follows its own arc; throttle holds the nose up, brake drops it
    if (S.y <= h1) { const sl = Math.atan2(h1 - H(S.x - hx, S.z - hz), 1), vn = -Math.sin(sl) * vh + Math.cos(sl) * S.vy, big = S.airT > 0.45 && S.top > 0.5;   // back on the snow: vn is how hard it meets the slope
      S.air = false; S.y = h1; S.v = Math.sign(vh || 1) * Math.max(0, Math.abs(vh) * Math.cos(sl) + S.vy * Math.sin(sl) * Math.sign(vh || 1)); S.vy = S.v * Math.sin(sl);
      if (big) { S.landT = 0.3; sfx("thump", clamp(-vn / 12, 0.4, 1.4)); for (let i = 0; i < 26; i++) spray(p, 1 + Math.random() * 4, (Math.random() - 0.5) * 6, sk.v, 1.1, 0.4);
        if (vn < -22) return throwOff("Landed too hard"); if (S.airT > 0.7 && Math.abs(S.pit - sl) > 1.0) return throwOff(S.pit < sl ? "Landed nose first" : "Looped out"); S.v *= 1 - clamp((-vn - 7) / 45, 0, 0.3);
        if (S.airT > 0.8) toast("Air: " + S.airT.toFixed(1) + " s · " + fmtAlt(Math.hypot(S.x - S.ax, S.z - S.az)) + " · " + fmtAlt(S.top) + " up", 2.2); } } }
  sk.ground = !(S.air && S.y - h1 > 0.2);
  p.set(S.x, S.air ? S.y : h1, S.z); sk.sp = Math.abs(S.v); sk.slope = sA; sk.v.set(hx * vh, S.air ? S.vy : 0, hz * vh); sledPlace(S);
  if (Math.abs(S.v) > 3 && Math.random() < 0.7) for (let i = 0; i < 2; i++) spray(p, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 3, sk.v, 0.8, 0.5 * (s.deep || 0));
  const dy = sk.lastY !== undefined ? p.y - sk.lastY : 0; sk.lastY = p.y; sk.safeT += dt; if (sk.safeT > 1.5 && !S.air) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
}
