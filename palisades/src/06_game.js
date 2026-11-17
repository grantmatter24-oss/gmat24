/* ---------- skiing ----------
   Mechanics come from Kicker Run: the longer a turn is held the more the edges bite (tighter arc, less scrub), turning scrubs speed,
   a tuck cuts drag, Space charges a pop, and the air has the same spin / flip / grab model. Here they run on real slopes with real
   gravity, snow friction and air drag, so speed comes from the fall line and is shed by turning across it. */
const GRAV = 9.81;
const K = { left: 0, right: 0, up: 0, down: 0, jump: 0, push: 0, gQ: 0, gE: 0, gC: 0, gF: 0, ff: 0 };
const sk = {
  p: new THREE.Vector3(), v: new THREE.Vector3(), yaw: 0, ground: true, air: false, airT: 0, turn: 0, carve: 0, sw: false,
  spin: 0, spinV: 0, spinHold: 0, spinDir: 0, rot: 0, rotV: 0, flipHold: 0, flipDir: 0, flipAcc: 0, grabT: 0, grab: null, crouch: 0, brakeK: 0, slideYaw: 0,
  crashed: false, crashT: 0, tum: 0, tumV: 0, stumT: 0, sp: 0, mode: "menu", lift: null, car: -1, liftS: 0, wait: 0, pts: 0, vert: 0, maxSp: 0, takeY: 0, peakY: 0, jacket: store.get("pal-jacket", 0),
  surf: { groom: 0, powder: 1, rock: 0 }, safe: new THREE.Vector3(), safeYaw: 0, safeT: 0, runT: 0, slip: 0
};
const nrm = new THREE.Vector3(0, 1, 0), fw = new THREE.Vector3(), rt = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let rig = null, fpv = store.get("pal-fpv", false), units = store.get("pal-units", "imp"), paused = false, toastT = 0;
const fwdOf = (yaw, out) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
function placeSkier(x, z, yaw, speed = 0) {
  sk.p.set(x, H(x, z), z); sk.yaw = yaw; sk.v.set(0, 0, 0); if (speed) { normalAt(x, z, 0.7, nrm); fwdOf(yaw, fw).addScaledVector(nrm, -fw.dot(nrm)).normalize(); sk.v.copy(fw).multiplyScalar(speed); }
  sk.ground = true; sk.air = false; sk.airT = 0; sk.crashed = false; sk.sw = false; sk.spin = sk.spinV = sk.rot = sk.rotV = 0; sk.turn = sk.carve = 0; sk.mode = "ski"; sk.lift = null; sk.car = -1; sk.slideYaw = 0; sk.brakeK = 0;
  sk.safe.copy(sk.p); sk.safeYaw = yaw; camSnap = true; sk.parked = !speed; sk.lastY = sk.p.y;
}
function spawnAt(key) {
  if (key === "village") { const L = LIFTS.find(l => l.name === "KT22 Express") || LIFTS[0]; placeSkier(L.bot.x - Math.sin(L.dir) * 16, L.bot.z - Math.cos(L.dir) * 16, L.dir); return; }
  const L = LIFTS[+key]; if (L) unloadAt(L);
}
function unloadAt(L) { const d = L.carpet ? 3 : 9; placeSkier(L.top.x + Math.sin(L.dir) * d, L.top.z + Math.cos(L.dir) * d, L.dir, L.carpet ? 1 : 3); }
function toast(msg, t = 2.6) { const e = $("toast"); e.textContent = msg; e.style.opacity = 1; toastT = t; }
let trickT = 0;
function trickPopup(name, pts) { $("trickN").textContent = name; $("trickP").textContent = pts ? "+" + Math.round(pts).toLocaleString() : ""; $("trick").style.opacity = 1; trickT = 2.2; if (pts) { sk.pts += Math.round(pts); sfx("land"); } }
function crash(why) {
  if (sk.crashed) return; sk.crashed = true; sk.crashT = 0; sk.tumV = (4 + Math.min(8, sk.sp * 0.25)) * (Math.random() < 0.5 ? -1 : 1); sk.air = false; sk.spinV = 0; sk.rotV = 0; sk.carve = 0;
  toast(why); sfx("crash"); for (let i = 0; i < 26; i++) spray(sk.p, 4 + Math.random() * 4, (Math.random() - 0.5) * 6, sk.v);
}
function standUp() {
  const g = tmp.set(H(sk.p.x - 1, sk.p.z) - H(sk.p.x + 1, sk.p.z), 0, H(sk.p.x, sk.p.z - 1) - H(sk.p.x, sk.p.z + 1));
  let yaw = g.lengthSq() > 1e-4 ? Math.atan2(g.x, g.z) + 1.25 : sk.yaw;   // stand across the fall line so you do not slide off at once
  if (rockAt(sk.p.x, sk.p.z) > 0.75 || !inWorld(sk.p.x, sk.p.z, 60)) { placeSkier(sk.safe.x, sk.safe.z, sk.safeYaw); return; }
  placeSkier(sk.p.x, sk.p.z, yaw);
}
/* surface under the skis */
function readSurface() {
  const m = maskAt(sk.p.x, sk.p.z), s = sk.surf; s.groom = m[0]; s.road = m[2]; s.mogul = m[3]; s.rock = sstep(0.215, 0.33, 1 - nrm.y) * (1 - m[0]);
  s.powder = (1 - m[0]) * (1 - m[2]) * (1 - s.rock) * (wx.snow ? 1 : 0.7); return s;
}
function stepSki(dt) {
  const p = sk.p, v = sk.v;
  if (sk.crashed) { // tumble to a stop, then get up
    sk.crashT += dt; const h = H(p.x, p.z); normalAt(p.x, p.z, 0.8, nrm);
    if (p.y <= h + 0.02) { p.y = h; v.addScaledVector(nrm, -v.dot(nrm)); v.y -= 0; v.x += nrm.x * GRAV * dt; v.z += nrm.z * GRAV * dt; v.multiplyScalar(Math.exp(-(1.5 + 2.5 * (1 - nrm.y)) * dt)); } else v.y -= GRAV * dt;
    p.addScaledVector(v, dt); if (p.y < H(p.x, p.z)) p.y = H(p.x, p.z);
    sk.tum += sk.tumV * dt; sk.tumV *= Math.exp(-1.3 * dt); sk.sp = v.length();
    if (sk.crashT > 2.4 || (sk.crashT > 1.2 && sk.sp < 1)) standUp();
    return;
  }
  if (sk.parked) { if (K.left || K.right || K.up || K.down || K.jump || K.push) sk.parked = false; else { sk.sp = 0; return; } }   // stay put after a spawn until the first input
  const steer = (K.right ? 1 : 0) - (K.left ? 1 : 0), hgt = p.y - H(p.x, p.z);
  if (sk.stumT > 0) sk.stumT -= dt;
  sk.turn = lerp(sk.turn, steer, Math.min(1, 10 * dt));
  if (sk.ground) {
    normalAt(p.x, p.z, 0.7, nrm); const s = readSurface();
    fwdOf(sk.yaw, fw).addScaledVector(nrm, -fw.dot(nrm)).normalize(); rt.crossVectors(fw, nrm);
    v.addScaledVector(nrm, -v.dot(nrm));
    let sp = v.length(); const tuck = K.up && !K.down, braking = K.down && sp > 0.3;
    // carve: edges bite the longer the turn is held, slower to set in soft snow
    sk.carve = steer ? Math.min(1, sk.carve + dt / (0.55 + 0.35 * s.powder)) : Math.max(0, sk.carve - dt * 2.5);
    let om = (1.0 + 0.9 * sk.carve) * clamp(1.25 / (1 + Math.pow(sp / 32, 2)), 0.55, 1) * (tuck ? 0.62 : 1) * (1 - 0.22 * s.powder);
    om = Math.min(om, (7 + 6.5 * sk.carve) * (1 - 0.25 * s.powder) / Math.max(sp, 3.2));   // edge grip limits the lateral g: faster means wider arcs
    sk.yaw -= steer * om * dt;
    sk.brakeK = lerp(sk.brakeK, braking ? 1 : 0, Math.min(1, (braking ? 7 : 5) * dt));
    // forces in the slope plane
    const gt = tmp.set(nrm.x * nrm.y * GRAV, (nrm.y * nrm.y - 1) * GRAV, nrm.z * nrm.y * GRAV);
    const mu = lerp(0.045, 0.09, s.powder) + s.rock * 0.5 + s.road * 0.1, kd = tuck ? 0.0019 : 0.0043;
    const gf = gt.dot(fw), holdF = mu * GRAV * nrm.y + 0.2;
    if (sp < 0.35 && !K.push && Math.abs(gf) < holdF && !sk.crouch) { v.set(0, 0, 0); sp = 0; }   // standing: edges hold you across the hill
    else {
      v.addScaledVector(gt, dt);
      if (sp > 0.05) {
        const scrub = Math.abs(steer) * (0.34 - 0.24 * sk.carve) * (0.85 + sp / 90) * 0.22, lin = scrub + 0.035 * s.powder + (s.mogul > 0.3 ? 0.03 : 0);
        const dec = mu * GRAV * nrm.y + kd * sp * sp + lin * sp + 6.6 * sk.brakeK * (0.6 + 0.4 * (1 - s.powder * 0.3));
        v.multiplyScalar(Math.max(0, 1 - dec * dt / sp));
      }
      if (K.push && !braking) v.addScaledVector(fw, 2.6 * Math.max(0, 1 - sp / 7.5) * dt);
      // edges: sideways slip dies fast, faster on a set carve. This is what bends the path to follow the skis.
      const vr = v.dot(rt), grip = lerp(15, 34, sk.carve) * (1 - 0.3 * s.powder) * (1 - 0.6 * sk.brakeK);
      sk.slip = vr; v.addScaledVector(rt, -vr * (1 - Math.exp(-grip * dt)));
      sp = v.length();
      if (v.dot(fw) < -0.6 && sp > 1) { sk.yaw += Math.PI; sk.sw = !sk.sw; }   // sliding backwards: now riding switch
      if (sk.sw && sp < 1.5 && !steer) sk.sw = false;
    }
    sk.slideYaw = lerp(sk.slideYaw, sk.brakeK * 1.25 * (sk.turn < -0.05 ? -1 : 1), Math.min(1, 9 * dt));
    // charge and pop
    if (K.jump) sk.crouch = Math.min(1, sk.crouch + dt / 0.45);
    else if (sk.crouch > 0) { const pw = 0.35 + 0.65 * sk.crouch; v.addScaledVector(nrm, 1.7 + 2.0 * pw); sk.crouch = 0; sk.ground = false; sfx("pop"); }
    // move, then decide whether the snow is still under the skis
    const nx = p.x + v.x * dt, nz = p.z + v.z * dt, yl = p.y + v.y * dt, hn = H(nx, nz), gap = yl - hn;
    if (!sk.ground || gap > 0.5 * (GRAV + 13) * dt * dt + 0.0004) { // the ground fell away faster than legs can follow: airborne
      p.set(nx, yl, nz); v.y -= GRAV * dt;
      if (sk.ground) { sk.ground = false; } sk.airT = 0; sk.flipAcc = 0; sk.spin = 0; sk.spinV = 0; sk.rotV = 0; sk.grabT = 0; sk.grab = null; sk.takeY = p.y; sk.peakY = p.y;
      sk.rot = Math.atan2(fw.y, Math.hypot(fw.x, fw.z));
    } else {
      p.set(nx, hn, nz);
      if (gap < -0.0005) { const n2 = normalAt(nx, nz, 0.7, tmp2); const vn = v.dot(n2); if (vn < 0) { v.addScaledVector(n2, -vn); if (-vn > 2.2 && s.mogul > 0.3) sk.stumT = Math.max(sk.stumT, 0.15); } }
    }
    sk.sp = sp; sk.air = false;
    // obstacles
    if (sp > 1) {
      const t = treeHit(p.x, p.z, 0.22); if (t) { if (sp > 5) crash("Hit a tree"); else { tmp.set(p.x - t.x, 0, p.z - t.z).normalize(); p.addScaledVector(tmp, 0.15); v.multiplyScalar(0.3); } }
      for (const th of towerHits) { const dx = p.x - th.x, dz = p.z - th.z; if (dx * dx + dz * dz < (th.r + 0.25) * (th.r + 0.25)) { if (sp > 4.5) crash("Hit a lift tower"); else { tmp.set(dx, 0, dz).normalize(); p.addScaledVector(tmp, 0.2); v.multiplyScalar(0.3); } break; } }
      const bd = buildingAt(p.x, p.z); if (bd && p.y < bd.top) { if (sp > 6) crash("Hit a building"); else { tmp.set(p.x - bd.cx, 0, p.z - bd.cz).normalize(); p.addScaledVector(tmp, 0.4); v.multiplyScalar(0.2); } }
      if (s.rock > 0.6 && sp > 13 && Math.random() < dt * 2.5) crash("Caught a rock");
    }
  } else {
    // ---- air: Kicker Run's spin, flip and grab model ----
    sk.airT += dt; if (sk.airT > 0.14 || hgt > 0.35) sk.air = true;
    const flipIn = sk.air ? (K.down ? 1 : 0) - (K.up ? 1 : 0) : 0, spinIn = sk.air ? steer : 0, before = sk.rot;
    sk.flipHold = flipIn && Math.sign(flipIn) === sk.flipDir ? sk.flipHold + dt : 0; sk.flipDir = Math.sign(flipIn);
    if (flipIn && sk.rotV * flipIn < 0) { sk.rotV *= Math.exp(-12 * dt); sk.flipHold = 0.5; }
    if (flipIn) sk.rotV += clamp(flipIn * (2.2 + 4.4 * Math.min(1, sk.flipHold / 1.1)) - sk.rotV, -8 * dt, 8 * dt);
    else sk.rotV *= Math.exp(-2.4 * dt);
    sk.rot += sk.rotV * dt;
    if (!flipIn && Math.abs(sk.rotV) < 1.4) { const vh = Math.hypot(v.x, v.z), want = sk.rot + wrap(Math.atan2(v.y, Math.max(vh, 0.5)) * 0.85 - sk.rot); if (Math.abs(wrap(want - sk.rot)) < 1.3) sk.rot += (want - sk.rot) * Math.min(1, 4.5 * dt); }
    sk.flipAcc += sk.rot - before;
    sk.spinHold = spinIn && Math.sign(spinIn) === sk.spinDir ? sk.spinHold + dt : 0; sk.spinDir = Math.sign(spinIn);
    if (spinIn) sk.spinV += clamp(spinIn * (3.0 + 6.5 * Math.min(1, sk.spinHold / 1.0)) - sk.spinV, -14 * dt, 14 * dt);
    else { sk.spinV *= Math.exp(-2.6 * dt); const tgt = Math.round(sk.spin / Math.PI) * Math.PI; sk.spin += (tgt - sk.spin) * Math.min(1, 4 * dt); }
    sk.spin += sk.spinV * dt;
    const gk = sk.air ? (K.gF ? "safety" : K.jump ? "tail" : K.gE ? "nose" : K.gC ? "indy" : K.gQ ? "japan" : null) : null;
    if (gk) { sk.grabT += dt; sk.grab = gk; } sk.grabNow = gk;
    v.y -= GRAV * dt; const sp = v.length(); v.multiplyScalar(Math.max(0, 1 - 0.0035 * sp * dt));
    p.addScaledVector(v, dt); if (p.y > sk.peakY) sk.peakY = p.y;
    sk.sp = sp; sk.carve = Math.max(0, sk.carve - dt * 2); sk.brakeK = 0; sk.slideYaw *= Math.exp(-8 * dt); sk.crouch = 0;
    const h = H(p.x, p.z);
    if (p.y <= h) { // touchdown
      p.y = h; normalAt(p.x, p.z, 0.7, nrm); const vn = -v.dot(nrm), wasAir = sk.air, airT = sk.airT, drop = sk.peakY - h;
      v.addScaledVector(nrm, vn); sk.ground = true; sk.air = false;
      const vh = Math.hypot(v.x, v.z);
      if (wasAir && airT > 0.3) {
        const head = vh > 1 ? Math.atan2(v.x, v.z) : sk.yaw, face = sk.yaw - sk.spin, half = Math.round(wrap(face - head) / Math.PI), off = Math.abs(wrap(face - head - half * Math.PI));
        const slopeP = Math.atan2(v.y, Math.max(vh, 0.5)), flips = Math.round(sk.flipAcc / TAU), up = Math.abs(wrap(sk.rot - slopeP));
        const spins = Math.round(Math.abs(sk.spin) / Math.PI);
        if (up > 0.85) { crash(flips || Math.abs(sk.flipAcc) > 1.5 ? "Under-rotated the flip" : "Landed on your back"); return; }
        if (off > 0.62 && vh > 4) { crash("Landed sideways"); return; }
        if (vn > 11.5) { crash("Landed too flat"); return; }
        sk.yaw = head; if (Math.abs(half) % 2 === 1) sk.sw = !sk.sw; if (spins % 2 === 1 && Math.abs(half) % 2 === 0) sk.sw = sk.sw;
        if (vn > 8) { sk.stumT = 0.7; v.multiplyScalar(0.86); }
        const parts = []; let pts = 0;
        if (flips) { parts.push((Math.abs(flips) > 1 ? ["", "", "Double ", "Triple "][Math.min(3, Math.abs(flips))] : "") + (spins ? "cork" : flips > 0 ? "backflip" : "frontflip")); pts += 900 * Math.abs(flips) * (1 + 0.5 * (Math.abs(flips) - 1)); }
        if (spins) { parts.push(String(spins * 180)); pts += 260 * spins * (1 + 0.15 * spins); }
        if (sk.grabT > 0.25 && sk.grab) { parts.push(sk.grab + " grab"); pts += 250 + 420 * sk.grabT; }
        if (drop > 3.5 || airT > 1.1) pts += drop * 28 + airT * 110;
        if (parts.length) trickPopup(parts.join(" "), pts); else if (drop > 4.5) trickPopup(Math.round(units === "imp" ? drop * FT : drop) + (units === "imp" ? " ft" : " m") + " drop", pts);
        for (let i = 0; i < Math.min(40, 8 + vn * 3); i++) spray(p, 2 + Math.random() * vn * 0.5, (Math.random() - 0.5) * 7, v);
        sfx("thump", clamp(vn / 10, 0.15, 1));
      } else if (vh > 1 && sk.airT > 0.05) { /* a skip over a bump: keep heading */ }
      sk.spin = 0; sk.spinV = 0; sk.rot = 0; sk.rotV = 0; sk.airT = 0; sk.grabNow = null;
    }
  }
  if (sk.ground && !sk.crashed) {
    sk.vertAcc = (sk.vertAcc || 0); const dy = sk.lastY !== undefined ? sk.lastY - p.y : 0; if (dy > 0 && dy < 5) sk.vert += dy; sk.lastY = p.y;
    if (sk.sp > sk.maxSp) sk.maxSp = sk.sp;
    sk.safeT += dt; if (sk.safeT > 1.5 && inWorld(p.x, p.z, 160) && sk.surf.rock < 0.3 && nrm.y > 0.8) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
  } else sk.lastY = p.y;
  if (!inWorld(p.x, p.z, 70)) { toast("Ski area boundary"); placeSkier(sk.safe.x, sk.safe.z, sk.safeYaw + Math.PI); }
}

/* ---------- riding lifts ---------- */
let nearLift = null; const _cp = new THREE.Vector3(), _cq = { s: 0, side: 1, docked: 0 };
function findNearLift() {
  nearLift = null; if (sk.mode !== "ski" || sk.crashed || !sk.ground || sk.sp > 7) return;
  let best = 20; for (const L of LIFTS) { const d = Math.hypot(sk.p.x - L.bot.x, sk.p.z - L.bot.z); if (d < best) { best = d; nearLift = L; } }
}
function nextCarrier(L) { // the carrier that reaches the load point soonest, and how long that takes
  if (L.type === "tram") { for (let k = 0; k < 2; k++) if (carrierAt(L, k, liftTime, _cq).docked === -1) return [k, 0]; const run = L.len / L.v + 8, cyc = 2 * (run + TRAM_DWELL), ph = liftTime % cyc; return [ph < run + TRAM_DWELL ? 1 : 0, ph < run + TRAM_DWELL ? run + TRAM_DWELL - ph : cyc - ph]; }
  let bk = 0, bt = 1e9; const loop = 2 * L.len;
  for (let k = 0; k < L.count; k++) { const u = (((k * L.spacing + (liftTime + L.phase) * L.v) % loop) + loop) % loop, t = ((loop + 2.5 - u) % loop) / L.v; if (t < bt) { bt = t; bk = k; } }
  return [bk, bt];
}
function boardLift(L) {
  sk.mode = "wait"; sk.lift = L; sk.v.set(0, 0, 0); sk.sw = false; sk.carve = 0; sk.turn = 0; sk.brakeK = 0; sk.slideYaw = 0; sk.crouch = 0;
  if (L.carpet) { sk.mode = "lift"; sk.car = -1; sk.liftS = 0.5; return; }
  sk.car = nextCarrier(L)[0];
}
function stepLift(dt) {
  const L = sk.lift, lp = liftPoint(L, 2.5, 1, _cp), p = sk.p;
  if (sk.mode === "wait") {
    const tx = lp.x, tz = lp.z, d = Math.hypot(tx - p.x, tz - p.z); if (d > 0.05) { const st = Math.min(d, 3.2 * dt); p.x += (tx - p.x) / d * st; p.z += (tz - p.z) / d * st; } p.y = H(p.x, p.z);
    sk.yaw += wrap(L.dir - sk.yaw) * Math.min(1, 5 * dt);
    const c = carrierAt(L, sk.car, liftTime, _cq), eta = nextCarrier(L)[1];
    if (L.type === "tram") { sk.wait = eta; if (c.docked === -1 && d < 1.5) { sk.mode = "lift"; } }
    else { sk.wait = eta; if (c.side === 1 && Math.abs(c.s - 2.5) < Math.max(0.6, L.v * dt * 1.5) && d < 1.5) sk.mode = "lift"; else if (c.side === 1 && c.s > 4 && c.s < L.len * 0.5) sk.car = nextCarrier(L)[0]; }
    return;
  }
  let s, done = false;
  if (L.carpet) { sk.liftS += L.v * dt; s = sk.liftS; liftPoint(L, s, 0, p); p.y += 0.02; done = s >= L.len - 0.5; }
  else { const c = carrierAt(L, sk.car, liftTime, _cq); s = c.s; liftPoint(L, s, 1, p); p.y -= L.T.drop + (L.type.startsWith("chair") ? 0.5 : -0.12); done = L.type === "tram" ? c.docked === 1 : (c.side === -1 || s >= L.len - 2.2); }
  sk.liftS = s; sk.yaw = L.dir; sk.sp = L.v; sk.v.set(0, 0, 0);
  if (done) { unloadAt(L); toast("Top of " + L.name + " · " + fmtAlt(sk.p.y)); }
}
const fmtAlt = y => units === "imp" ? Math.round(y * FT).toLocaleString() + " ft" : Math.round(y).toLocaleString() + " m";
const fmtTime = t => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

/* ---------- snow spray, tracks, falling snow ---------- */
const NP = 1400, pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP), pSize = new Float32Array(NP); let pNext = 0, sprayPts = null;
function initParticles() {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); g.setAttribute("aLife", new THREE.BufferAttribute(pLife, 1)); g.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: Object.assign({ uPx: { value: 600 } }, U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)), fog: true,
    vertexShader: `attribute float aLife, aSize; uniform float uPx; varying float vL; varying vec3 vWp;
      #include <fog_pars_vertex>
      void main() { vL = aLife; vWp = position; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition; gl_PointSize = aLife > 0.0 ? aSize * (1.6 - aLife * 0.6) * uPx / max(0.3, -mvPosition.z) : 0.0;
      #include <fog_vertex>
      }`,
    fragmentShader: GLSL_WORLD + `varying float vL; varying vec3 vWp;
      #include <fog_pars_fragment>
      void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25 || vL <= 0.0) discard;
        float vis = texture2D(uTT, ttUV(vWp)).a; vec3 col = vec3(0.92, 0.94, 0.97) * (uSunCol * 0.3183 * (0.55 * vis + 0.1) + uSkyAmb * 0.9);
        gl_FragColor = vec4(col, smoothstep(0.25, 0.02, d) * min(1.0, vL * 2.2) * 0.5);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }` });
  sprayPts = new THREE.Points(g, m); sprayPts.frustumCulled = false; sprayPts.renderOrder = 5; scene.add(sprayPts);
}
function spray(at, up, side, vel, back = 0.5) {
  const i = pNext; pNext = (pNext + 1) % NP;
  pPos[i * 3] = at.x + (Math.random() - 0.5) * 0.3; pPos[i * 3 + 1] = at.y + 0.05; pPos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 0.3;
  pVel[i * 3] = vel.x * back + rt.x * side + (Math.random() - 0.5) * 1.2; pVel[i * 3 + 1] = up + vel.y * back; pVel[i * 3 + 2] = vel.z * back + rt.z * side + (Math.random() - 0.5) * 1.2;
  pLife[i] = 0.5 + Math.random() * 0.6; pSize[i] = 0.16 + Math.random() * 0.3;
}
function updateParticles(dt) {
  for (let i = 0; i < NP; i++) { if (pLife[i] <= 0) continue; pLife[i] -= dt; const k = i * 3; pVel[k + 1] -= 7.5 * dt; const dr = Math.exp(-2.2 * dt); pVel[k] *= dr; pVel[k + 2] *= dr; pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt; }
  const a = sprayPts.geometry.attributes; a.position.needsUpdate = true; a.aLife.needsUpdate = true; a.aSize.needsUpdate = true; sprayPts.material.uniforms.uPx.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * DEG / 2);
}
function emitSpray(dt) {
  if (sk.mode !== "ski" || !sk.ground || sk.crashed || sk.sp < 3) return;
  const s = sk.surf, pw = 0.4 + 0.9 * s.powder, slip = Math.abs(sk.slip || 0), n = (sk.sp * 0.25 * pw + slip * 6 + sk.brakeK * sk.sp * 2.2 + Math.abs(sk.turn) * sk.carve * sk.sp * 0.5) * dt * 6;
  const cnt = Math.floor(n + Math.random()), sd = sk.brakeK > 0.3 ? 0 : -Math.sign(sk.turn) * (1.5 + sk.carve * 3 + sk.sp * 0.1);
  for (let i = 0; i < Math.min(cnt, 14); i++) spray(sk.p, 0.8 + Math.random() * (1.2 + sk.sp * 0.06 + sk.brakeK * 2.5) * pw, sd * (0.5 + Math.random()), sk.v, sk.brakeK > 0.3 ? 0.75 : 0.35);
}
/* ski tracks: two ribbons laid on the snow behind the skis */
const TRK = 900, trkPos = new Float32Array(TRK * 2 * 4 * 3), trkA = new Float32Array(TRK * 2 * 4); let trkN = 0, trkMesh = null, trkLast = [new THREE.Vector3(1e9, 0, 0), new THREE.Vector3(1e9, 0, 0)], trkPrev = [null, null];
function initTracks() {
  const idx = []; for (let q = 0; q < TRK * 2; q++) { const a = q * 4; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(trkPos, 3)); g.setAttribute("aA", new THREE.BufferAttribute(trkA, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, uniforms: Object.assign({}, U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)), fog: true,
    vertexShader: `attribute float aA; varying float vA;
      #include <fog_pars_vertex>
      void main() { vA = aA; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSkyAmb; varying float vA;
      #include <fog_pars_fragment>
      void main() { gl_FragColor = vec4(uSkyAmb * 0.55, vA);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      }` });
  trkMesh = new THREE.Mesh(g, m); trkMesh.frustumCulled = false; trkMesh.renderOrder = 2; scene.add(trkMesh);
}
function layTracks() {
  if (sk.mode !== "ski" || !sk.ground || sk.crashed) { trkPrev[0] = trkPrev[1] = null; return; }
  const yawM = sk.yaw + sk.slideYaw, fx = Math.sin(yawM), fz = Math.cos(yawM), rx = -fz, rz = fx, s = sk.surf, hw = 0.045 + 0.03 * s.powder + 0.16 * sk.brakeK + Math.min(0.16, Math.abs(sk.slip || 0) * 0.25), al = (0.10 + 0.16 * s.powder + 0.07 * sk.carve) * (1 - s.rock) * (1 - s.road);
  for (let i = 0; i < 2; i++) {
    const o = (i ? 1 : -1) * 0.16, x = sk.p.x + rx * o - fx * 0.3, z = sk.p.z + rz * o - fz * 0.3, cur = { x, z, hw };
    if (Math.hypot(x - trkLast[i].x, z - trkLast[i].z) < 0.45) continue;
    const pv = trkPrev[i]; trkLast[i].set(x, 0, z); trkPrev[i] = cur; if (!pv) continue;
    const q = (trkN++ % (TRK * 2)), k = q * 12, a = q * 4, dx = x - pv.x, dz = z - pv.z, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l, w = hw;
    const put = (j, X, Z) => { trkPos[k + j * 3] = X; trkPos[k + j * 3 + 1] = H(X, Z) + 0.035; trkPos[k + j * 3 + 2] = Z; trkA[a + j] = al; };
    put(0, pv.x - px * pv.hw, pv.z - pz * pv.hw); put(1, pv.x + px * pv.hw, pv.z + pz * pv.hw); put(2, x - px * w, z - pz * w); put(3, x + px * w, z + pz * w); cur.hw = w;
  }
  trkMesh.geometry.attributes.position.needsUpdate = true; trkMesh.geometry.attributes.aA.needsUpdate = true;
}
function initSnowfall() {
  const n = 9000, pos = new Float32Array(n * 3), g = new THREE.BufferGeometry(); for (let i = 0; i < n * 3; i++) pos[i] = Math.random();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uCam: { value: new THREE.Vector3() }, uPx: { value: 600 }, uWind: { value: new THREE.Vector3(2.5, -2.2, 1.2) } },
    vertexShader: `uniform float uTime, uPx; uniform vec3 uCam, uWind; varying float vF;
      void main() { vec3 q = position * 60.0 + uWind * uTime + vec3(sin(uTime * 0.7 + position.y * 40.0), 0.0, cos(uTime * 0.6 + position.x * 40.0)) * 0.6;
        vec3 wp = uCam + mod(q - uCam, 60.0) - 30.0; vec4 mv = viewMatrix * vec4(wp, 1.0); gl_Position = projectionMatrix * mv; float d = max(0.4, -mv.z); vF = smoothstep(30.0, 18.0, d); gl_PointSize = (0.035 + 0.03 * position.z) * uPx / d; }`,
    fragmentShader: `varying float vF; void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(vec3(0.93), smoothstep(0.25, 0.05, d) * 0.85 * vF);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` });
  snowFall = new THREE.Points(g, m); snowFall.frustumCulled = false; snowFall.renderOrder = 6; snowFall.visible = wx.snow > 0; scene.add(snowFall);
}

/* ---------- camera ---------- */
let camSnap = true, look = { yaw: 0, pit: 0, drag: false, idle: 0 }; const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1), _m4 = new THREE.Matrix4(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
function updateRig(dt, time) {
  const R = rig, onLift = sk.mode === "lift", seated = onLift && sk.lift && sk.lift.type.startsWith("chair"), cabin = onLift && sk.lift && !sk.lift.carpet && !seated;
  R.root.visible = !cabin; R.root.position.copy(sk.p);
  const face = sk.yaw + (sk.sw ? Math.PI : 0) - (sk.ground ? 0 : sk.spin) - sk.slideYaw;
  // on snow the body stands on the slope; in the air it is free and carries its own pitch
  const up = _y.copy(sk.ground && sk.mode === "ski" && !sk.crashed ? nrm : Y_AXIS); fwdOf(face, _z); _x.crossVectors(up, _z).normalize(); _z.crossVectors(_x, up).normalize();
  _qa.setFromRotationMatrix(_m4.makeBasis(_x, up, _z)); if (camSnap) R.root.quaternion.copy(_qa); else R.root.quaternion.slerp(_qa, Math.min(1, 16 * dt));
  const wob = sk.stumT > 0 ? Math.sin(time * 26) * 0.14 * Math.min(1, sk.stumT / 0.4) : 0;
  R.flip.rotation.x = sk.crashed ? sk.tum : sk.ground ? 0 : -sk.rot * (sk.sw ? -1 : 1);
  R.flip.rotation.z = sk.crashed ? sk.tum * 0.37 : 0;
  const bank = sk.turn * (0.30 + 0.32 * sk.carve) * clamp(sk.sp / 9, 0.15, 1) * (sk.sw ? -1 : 1);
  R.lean.rotation.z = (sk.ground && sk.mode === "ski" ? bank - sk.brakeK * 0.35 * Math.sign(sk.slideYaw || 1) : 0) + wob;
  R.lean.rotation.x = sk.ground ? -sk.brakeK * 0 : 0;
  poseSkier(R, { turn: -sk.turn * (sk.sw ? -1 : 1), carve: sk.mode === "ski" ? sk.carve * clamp(sk.sp / 8, 0, 1) : 0, tuck: sk.mode === "ski" && K.up && sk.ground && !K.down, crouch: sk.crouch, air: !sk.ground && sk.air, grab: sk.grabNow, brake: sk.brakeK, sp: sk.sp, seated, push: sk.mode === "ski" && K.push && sk.ground && sk.sp < 8 }, dt, time);
  R.seg.head.visible = !(fpv && !cabin);
}
function updateCamera(dt) {
  const p = sk.p, sp = sk.sp, onLift = sk.mode === "lift", cabin = onLift && !sk.lift.carpet && !sk.lift.type.startsWith("chair");
  if (!look.drag) { look.idle += dt; if (look.idle > 1.2 && (sp > 2 || onLift)) { const k = Math.exp(-2.5 * dt); look.yaw *= k; look.pit *= k; } }
  const vh = Math.hypot(sk.v.x, sk.v.z); let heading = sk.yaw;
  if (sk.mode === "ski" && vh > 2.5) heading = Math.atan2(sk.v.x, sk.v.z);
  const cur = Math.atan2(camDir.x, camDir.z), nh = cur + wrap(heading - cur) * (camSnap ? 1 : Math.min(1, (sk.ground ? 3.2 : 1.6) * dt)); camDir.set(Math.sin(nh), 0, Math.cos(nh));
  const cy = nh + look.yaw, dx = Math.sin(cy), dz = Math.cos(cy);
  camera.fov = lerp(camera.fov, (fpv ? 78 : 60) + 13 * smooth(sp / 36), Math.min(1, 3 * dt)); camera.updateProjectionMatrix();
  if (fpv && !sk.crashed) {
    const eye = cabin ? tmp.set(p.x, p.y + 1.7, p.z) : rig.seg.head.getWorldPosition(tmp); if (!cabin) eye.y += 0.06;
    camera.position.copy(eye); const slope = sk.ground && sk.mode === "ski" ? Math.atan2(fw.y, Math.hypot(fw.x, fw.z)) : 0, pit = clamp(slope * 0.7 - 0.06 + look.pit, -1.3, 1.3);
    camTgt.set(eye.x + dx * Math.cos(pit), eye.y + Math.sin(pit), eye.z + dz * Math.cos(pit)); camera.up.set(0, 1, 0); camera.lookAt(camTgt);
    camera.rotateZ(-rig.lean.rotation.z * 0.55); camSnap = false; return;
  }
  if (onLift && !sk.lift.carpet) { // ride cam: behind and a little above the carrier, looking up the line
    const L = sk.lift, a = liftPoint(L, sk.liftS - 4, 1, tmp), b = liftPoint(L, sk.liftS + 4, 1, tmp2), sl = (b.y - a.y) / 8, dist = cabin ? 15 : 7.5, cp = Math.cos(look.pit), ly = Math.sin(look.pit);
    tmp.set(p.x - dx * dist * cp, p.y + 2.3 - sl * dist + ly * dist + (cabin ? 2 : 0), p.z - dz * dist * cp); const gh = H(tmp.x, tmp.z) + 1.2; if (tmp.y < gh) tmp.y = gh;
    if (camSnap) camPos.copy(tmp); else camPos.lerp(tmp, 1 - Math.exp(-6 * dt)); camera.position.copy(camPos); camera.up.set(0, 1, 0);
    tmp.set(p.x + dx * 14, p.y + 1.2 + sl * 14, p.z + dz * 14); if (camSnap) camTgt.copy(tmp); else camTgt.lerp(tmp, 1 - Math.exp(-8 * dt)); camera.lookAt(camTgt); camSnap = false; return;
  }
  const dist = (onLift ? (cabin ? 15 : 8.5) : 6.4 + sp * 0.07) * (sk.crashed ? 1.3 : 1), hgtC = (onLift ? 3.4 : 2.5 + sp * 0.012) + look.pit * -6, slopeY = sk.ground && sk.mode === "ski" ? clamp(-fw.y, -0.5, 0.8) * dist * 0.55 : 0;
  tmp.set(p.x - dx * dist, p.y + hgtC + slopeY * 0.6, p.z - dz * dist);
  const gh = H(tmp.x, tmp.z) + 1.1; if (tmp.y < gh) tmp.y = gh;
  if (camSnap) camPos.copy(tmp); else { const k = 1 - Math.exp(-(onLift ? 5 : 7) * dt); camPos.x += (tmp.x - camPos.x) * k; camPos.z += (tmp.z - camPos.z) * k; camPos.y += (tmp.y - camPos.y) * (1 - Math.exp(-5 * dt)); if (camPos.y < H(camPos.x, camPos.z) + 0.9) camPos.y = H(camPos.x, camPos.z) + 0.9; }
  camera.position.copy(camPos); camera.up.set(0, 1, 0);
  tmp.set(p.x + dx * (3 + sp * 0.22), p.y + 1.25 - slopeY * 0.25 + (onLift ? -1 : 0), p.z + dz * (3 + sp * 0.22));
  if (camSnap) camTgt.copy(tmp); else camTgt.lerp(tmp, 1 - Math.exp(-9 * dt)); camera.lookAt(camTgt);
  camera.rotateZ(-sk.turn * 0.03 * clamp(sp / 15, 0, 1)); camSnap = false;
}
/* shadow frustum follows the skier, snapped to texels so edges do not crawl */
function updateSun() {
  const R = Q.shadowR, c = tmp.copy(sk.p).addScaledVector(camDir, R * 0.45), tex = 2 * R / Q.shadow;
  _m4.lookAt(sunDir, tmp2.set(0, 0, 0), Y_AXIS); _qa.setFromRotationMatrix(_m4); _qb.copy(_qa).invert();
  c.applyQuaternion(_qb); c.x = Math.round(c.x / tex) * tex; c.y = Math.round(c.y / tex) * tex; c.applyQuaternion(_qa);
  sun.target.position.copy(c); sun.position.copy(c).addScaledVector(sunDir, 700); sun.target.updateMatrixWorld();
}
