/* ---------- skiing: Kicker Run's ride model on a real mountain ----------
   Same numbers as ski.html: gravity 18, speed runs along the skis, carve builds over 0.55 s, turning scrubs speed, Shift pushes, J brakes,
   Space charges a pop, A/D spin and W/S flip in the air, arrows nudge sideways, grabs on Space/Q/E/C/F, W/S butter on snow.
   Differences forced by free roaming: heading is a compass angle instead of an offset from the course, and speed may fall to zero. */
const G = 18, MAXV = 400, Y_AXIS = new THREE.Vector3(0, 1, 0);
const K = { left: 0, right: 0, up: 0, down: 0, spinL: 0, spinR: 0, grab: 0, grabN: 0, grabI: 0, grabQ: 0, grabS: 0, focus: 0, boost: 0, brake: 0 };
const MP_KEYS = Object.keys(K);
let popReq = false, popPow = 1, charging = false, chargeT = 0, focusM = 1, timeScale = 1;
const sk = {
  p: new THREE.Vector3(), v: new THREE.Vector3(), yaw: 0, ground: true, air: false, airT: 0, turn: 0, carve: 0, sw: false,
  spin: 0, spinV: 0, spinHold: 0, spinDir: 0, spinTarget: 0, rot: 0, rotV: 0, flipHold: 0, flipDir: 0, flipAcc: 0, flipB: 0, flipF: 0, grabT: 0, grabKind: "Tail", butSpun: false,
  chg: 0, pumpT: 0, landT: 0, popT: 0, stumT: 0, stumD: 1, crashed: false, crashT: 0, tumZ: 0, sp: 0, vx: 0, vs: 0, vside: 0,
  grind: null, grindT: 0, gs: 0, noRail: 0, featLaunch: false, boxT: 0, bike: false, finished: false, bikeJump: false,
  mode: "menu", lift: null, car: -1, liftS: 0, wait: 0, pts: 0, vert: 0, maxSp: 0, peakY: 0, slope: 0,
  surf: { groom: 0, powder: 1, rock: 0, road: 0, mogul: 0 }, safe: new THREE.Vector3(), safeYaw: 0, safeT: 0, slip: 0, brakeK: 0, slideYaw: 0
};
const nrm = new THREE.Vector3(0, 1, 0), fw = new THREE.Vector3(), rt = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let rig = null, fpv = store.get("pal-fpv", false), units = store.get("pal-units", "imp"), paused = false, toastT = 0;
let outfit = Object.assign({}, KR.OUTFIT_DEFAULT, store.get("kickerOutfit", null) || {}, store.get("pal-outfit", null) || {});
for (const k of ["jacket", "pants"]) if (!KR[k === "jacket" ? "JACKETS" : "PANTS"][outfit[k]]) outfit[k] = KR.OUTFIT_DEFAULT[k];
const fwdOf = (yaw, out) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
function tangent(yaw) { normalAt(sk.p.x, sk.p.z, 0.7, nrm); fwdOf(yaw, fw).addScaledVector(nrm, -fw.dot(nrm)).normalize(); rt.set(-Math.cos(yaw), 0, Math.sin(yaw)); return Math.asin(clamp(fw.y, -1, 1)); }
function placeSkier(x, z, yaw, speed = 0) {
  sk.p.set(x, H(x, z), z); sk.yaw = yaw; sk.sp = speed; sk.v.set(0, 0, 0); sk.slope = tangent(yaw);
  sk.ground = true; sk.air = false; sk.airT = 0; sk.crashed = false; sk.sw = false; sk.spin = sk.spinV = sk.rot = sk.rotV = sk.spinTarget = 0; sk.turn = sk.carve = 0; sk.mode = "ski"; sk.lift = null; sk.car = -1; sk.stumT = 0; sk.butSpun = false;
  sk.grind = null; REW.length = 0; sk.safe.copy(sk.p); sk.safeYaw = yaw; camSnap = true; sk.parked = !speed; sk.lastY = sk.p.y; charging = false; popReq = false;
}
function spawnAt(key) {
  if (key === "village") { const L = LIFTS.find(l => l.name === "KT22 Express") || LIFTS[0]; placeSkier(L.bot.x - Math.sin(L.dir) * 16, L.bot.z - Math.cos(L.dir) * 16, L.dir); return; }
  const L = LIFTS[+key]; if (L) unloadAt(L);
}
function unloadAt(L) { const d = L.carpet ? 3 : 15; placeSkier(L.top.x + Math.sin(L.dir) * d, L.top.z + Math.cos(L.dir) * d, L.dir, L.carpet ? 1 : 3); }
function toast(msg, t = 2.6) { const e = $("toast"); e.textContent = msg; e.style.opacity = 1; toastT = t; }
let trickT = 0;
function popup(name, sub) { $("trickN").textContent = name; $("trickP").textContent = sub || ""; $("trick").style.opacity = 1; trickT = 2.2; }
function payout(pts, label, perfect, cork) { pts = Math.round(pts / 10) * 10; sk.pts += pts; if (label) popup(label, "+" + pts.toLocaleString() + (perfect ? "  · perfect landing" : "") + (cork ? "  · cork bonus" : "")); }
function gDown() { if (!charging && sk.mode === "ski" && !paused && sk.ground && !(sk.stumT > 0) && !sk.crashed) { charging = true; chargeT = 0; } }
function gUp() { if (charging) { charging = false; popPow = Math.max(0.3, Math.min(1, chargeT / 0.5)); popReq = true; chargeT = 0; } }
function trickInfo() { // Kicker Run's names
  const nB = Math.floor(((sk.flipB || 0) + 1.0) / TAU), nF = Math.floor(((sk.flipF || 0) + 1.0) / TAU), flips = nB && nF ? nB + nF : Math.floor((Math.abs(sk.flipAcc) + 1.0) / TAU), names = [], back = sk.flipAcc >= 0;
  if (nB && nF) { const cnt = n => (["", "", "Double ", "Triple "][Math.min(n, 3)]); names.push(cnt(nB) + "Backflip + " + cnt(nF) + "Frontflip"); const halves2 = Math.round(Math.abs(sk.spin) / Math.PI); if (halves2) names.push(halves2 * 180 + ""); const grab2 = sk.grabT > 0.3; if (grab2) names.push((sk.grabKind || "Tail") + " grab"); return { flips, halves: halves2, grab: grab2, label: names.join(" + ") }; }
  const halves = Math.round(Math.abs(sk.spin) / Math.PI), deg = halves * 180;
  if (flips > 0 && halves > 0) names.push((flips >= 3 ? "Triple Cork " : flips === 2 ? "Double Cork " : halves % 2 === 1 ? (back ? "Rodeo " : "Misty ") : "Cork ") + deg);
  else if (flips > 0) names.push((["", "", "Double ", "Triple ", "Quad "][Math.min(flips, 4)]) + (back ? "Backflip" : "Frontflip"));
  else if (halves > 0) names.push(halves === 1 ? "Half cab 180" : "Flat " + deg);
  const grab = sk.grabT > 0.3; if (grab) names.push((sk.grabKind || "Tail") + " grab");
  return { flips, halves, grab, label: names.join(" + ") };
}
function crash(why) {
  if (sk.crashed) return; const vh = Math.hypot(sk.v.x, sk.v.z);
  if (!sk.ground && vh > 0.5) sk.yaw = Math.atan2(sk.v.x, sk.v.z);
  const spd = sk.ground ? sk.sp : vh; sk.crashed = true; sk.grind = null; sk.crashT = 0; sk.air = false; sk.ground = true; sk.sp = Math.max(spd * 0.5, 5);
  sk.rotV = (sk.flipAcc >= 0 ? 1 : -1) * 6; sk.tumZ = (Math.random() - 0.5) * 7; charging = false; popReq = false;
  popup("Wipeout", why); sfx("crash"); for (let i = 0; i < 36; i++) spray(sk.p, 3 + Math.random() * 5, (Math.random() - 0.5) * 6, sk.v);
}
function stumble(t) { // clipped a tree: wobble, lose speed, get pushed clear
  if (sk.stumT > 0 || sk.crashed) return; sk.stumT = 1.3; sk.stumD = Math.random() < 0.5 ? -1 : 1; sk.sp *= 0.7;
  const dx = sk.p.x - t.x, dz = sk.p.z - t.z, d = Math.hypot(dx, dz) || 1, r = 0.45 + t.h * 0.012; sk.p.x = t.x + dx / d * r; sk.p.z = t.z + dz / d * r;
}
function standUp() {
  const g = tmp.set(H(sk.p.x - 1, sk.p.z) - H(sk.p.x + 1, sk.p.z), 0, H(sk.p.x, sk.p.z - 1) - H(sk.p.x, sk.p.z + 1));
  const yaw = g.lengthSq() > 1e-4 ? Math.atan2(g.x, g.z) + 1.35 : sk.yaw;   // stand across the fall line so you do not slide off at once
  if (rockAt(sk.p.x, sk.p.z) > 0.75 || !inWorld(sk.p.x, sk.p.z, 60)) { placeSkier(sk.safe.x, sk.safe.z, sk.safeYaw); return; }
  placeSkier(sk.p.x, sk.p.z, yaw);
}
function readSurface() {
  const m = maskAt(sk.p.x, sk.p.z), s = sk.surf; s.groom = m[0]; s.road = m[2]; s.mogul = m[3]; s.rock = sstep(0.215, 0.33, 1 - nrm.y) * (1 - m[0]) * sstep(0.35, 0.75, rockAt(sk.p.x, sk.p.z));   // only true cliff bands count as rock under the skis
  s.powder = (1 - m[0]) * (1 - m[2]) * (1 - s.rock) * (wx.snow ? 1 : 0.6); return s;
}
function railAt(x, y, z) { const c = parkCell(x, z); if (!c) return null; for (const f of c) { if (f.k !== "rail") continue; const rx = x - f.x, rz = z - f.z, s = rx * f.dx + rz * f.dz; if (s < -0.6 || s > f.len - 0.5 || Math.abs(-rx * f.dz + rz * f.dx) > 0.9) continue; const ry = lerp(f.y0, f.y1, clamp(s / f.len, 0, 1)); if (y <= ry + 0.45 && y >= ry - 1.4) return f; } return null; }
function landing() {
  const p = sk.p, v = sk.v, vh = Math.hypot(v.x, v.z), head = vh > 0.5 ? Math.atan2(v.x, v.z) : sk.yaw;
  p.y = H(p.x, p.z); const sA = tangent(head), diff = wrap(sk.rot - sA), real = sk.airT > 0.3, PH = KR.PHYS;
  if (real && Math.abs(diff) > 1.6 + PH.land) return crash("Bad landing");   // a sideways spin never crashes: the skis swing round to the nearest forward or backward
  sk.yaw = head; let vt = vh * Math.cos(sA) + v.y * Math.sin(sA);
  if (real) vt *= 1 - 0.07 * sk.surf.powder;
  if (real && Math.abs(diff) > 0.65) { vt *= 1 - 0.45 * clamp((Math.abs(diff) - 0.65) / 0.95, 0, 1); for (let i = 0; i < 10; i++) spray(p, 2 + Math.random() * 2, (Math.random() - 0.5) * 5, v); }   // sloppy pitch only scrubs speed
  sk.sp = clamp(vt, 0, MAXV); sk.ground = true; sk.air = false; if (sk.airT > 0.15) sk.landT = 0.35;
  const kHalf = Math.round(sk.spin / Math.PI), odd = Math.abs(kHalf) % 2 === 1;
  if (real && sk.airT > 0.75) {
    const tr = trickInfo(), perfect = Math.abs(diff) < 0.4; let pts = sk.airT * 150;
    if (tr.flips) pts += 400 * tr.flips * (1 + 0.5 * (tr.flips - 1));
    pts += tr.halves * 150; if (tr.grab) pts += Math.min(sk.grabT, 2) * 250;
    if (tr.flips && tr.halves) pts *= 1.3; if (perfect) pts *= 1.25; if (odd) pts *= 1.15;
    if (sk.featLaunch === false) pts *= 0.35;   // tricks off flat ground count for less
    const drop = sk.peakY - p.y, label = (tr.label || (sk.airT > 0.8 ? (drop > 4 ? Math.round(units === "imp" ? drop * FT : drop) + (units === "imp" ? " ft drop" : " m drop") : "Clean air") : "")) + (odd ? (tr.label ? " · " : "") + "Switch" : "");
    payout(pts, label, perfect, tr.flips && tr.halves); if (tr.flips || tr.halves) focusM = Math.min(1, focusM + 0.2);
    sfx(tr.flips || tr.halves || tr.grab ? "land" : "thump", clamp(sk.airT, 0.4, 1.2)); for (let i = 0; i < 22; i++) spray(p, 2 + Math.random() * 4, (Math.random() - 0.5) * 7, v);
  } else if (sk.airT > 0.15) { sfx("thump", 0.35); for (let i = 0; i < 6; i++) spray(p, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 4, v); }
  sk.spin -= kHalf * Math.PI; sk.spinTarget = 0; if (odd) sk.sw = !sk.sw;
  sk.rot = 0; sk.rotV = 0; sk.flipAcc = 0; sk.flipB = 0; sk.flipF = 0; sk.spinV = 0; sk.grabT = 0; sk.airT = 0;
}
function stepSki(dt) {
  const p = sk.p, v = sk.v, PH = KR.PHYS;
  if (charging) { if (!sk.ground || sk.crashed) { charging = false; chargeT = 0; } else chargeT += dt; }
  sk.chg = charging ? Math.min(1, chargeT / 0.5) : 0;
  sk.pumpT = Math.max(0, sk.pumpT - dt); sk.landT = Math.max(0, sk.landT - dt); sk.popT = Math.max(0, sk.popT - dt);
  if (sk.crashed) { // slide and tumble to a stop, then get up
    sk.crashT += dt; sk.sp *= Math.exp(-1.5 * dt); p.x += sk.sp * Math.sin(sk.yaw) * dt; p.z += sk.sp * Math.cos(sk.yaw) * dt; p.y = H(p.x, p.z);
    sk.rot += sk.rotV * dt; sk.rotV *= Math.exp(-1.1 * dt); sk.tumZ *= Math.exp(-0.8 * dt);
    if (treeHit(p.x, p.z, 0.3)) sk.sp *= 0.5; if (sk.crashT > 1.8) standUp(); popReq = false; return;
  }
  if (sk.parked) { if (K.left || K.right || K.up || K.down || K.spinL || K.spinR || charging || popReq) sk.parked = false; else { sk.sp = 0; popReq = false; return; } }   // stay put after a spawn until the first input
  const onGr = sk.ground && !sk.grind, butterNow = onGr && sk.sp > 2 && K.down;   // W drives forward on snow; only the tail butter remains
  const steer = butterNow ? 0 : onGr ? ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0) : (K.right ? 1 : 0) - (K.left ? 1 : 0);
  if (!onGr) sk.butSpun = false;
  if (butterNow) { const spI = (K.spinR ? 1 : 0) - (K.spinL ? 1 : 0); if (spI) sk.spinV += clamp(spI * 6 - sk.spinV, -30 * dt, 30 * dt); else sk.spinV *= Math.exp(-6 * dt); sk.spin += sk.spinV * dt; sk.butSpun = true; }
  else if (sk.butSpun && onGr) { sk.spin += sk.spinV * dt; sk.spinV *= Math.exp(-5 * dt); if (Math.abs(sk.spinV) < 0.5) { const kk = Math.round(sk.spin / Math.PI); sk.spin -= kk * Math.PI; if (kk % 2) sk.sw = !sk.sw; sk.butSpun = false; sk.spinV = 0; } }
  if (sk.stumT > 0) { sk.stumT -= dt; popReq = false; charging = false; }
  const stK = sk.stumT > 0 ? Math.min(1, sk.stumT / 0.9) : 0, steerS = stK ? lerp(steer, sk.stumD * Math.sin(sk.stumT * 7.5 * Math.PI / 1.3 * 2) * 0.9, stK) : steer;
  sk.turn = lerp(sk.turn, steerS, Math.min(1, 10 * dt));
  if (sk.grind) { // on a rail: slide its length, A/D spin, Space pops off
    const r = sk.grind; sk.grindT += dt; const spIn = (K.spinR ? 1 : 0) - (K.spinL ? 1 : 0);
    if (spIn) sk.spinV += clamp(spIn * 9 - sk.spinV, -60 * dt, 60 * dt); else { sk.spinV *= Math.exp(-5 * dt); const tgt = Math.round(sk.spin / Math.PI) * Math.PI; sk.spin += (tgt - sk.spin) * Math.min(1, 4 * dt); }
    sk.spin += sk.spinV * dt; const sA = Math.atan2(r.y1 - r.y0, r.len);
    sk.sp = clamp(sk.sp + (-G * Math.sin(sA) - 0.1 * sk.sp - 0.0025 * sk.sp * sk.sp) * dt, 6, MAXV); sk.gs += sk.sp * Math.cos(sA) * dt;
    const u = sk.gs / r.len; p.set(r.x + r.dx * sk.gs, lerp(r.y0, r.y1, u), r.z + r.dz * sk.gs); sk.yaw = Math.atan2(r.dx, r.dz); sk.slope = sA; sk.carve = 0;
    if (sk.grindT > 0.2 && Math.random() < 0.6) spray(p, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, v, 0.3);
    if (popReq || sk.gs >= r.len) {
      const pop = popReq ? 10.5 * (0.35 + 0.65 * popPow) : 1, spins = Math.abs(Math.round(sk.spin / Math.PI)); v.set(r.dx * sk.sp * Math.cos(sA), sk.sp * Math.sin(sA) + pop, r.dz * sk.sp * Math.cos(sA));
      if (spins % 2 === 1) sk.sw = !sk.sw; payout(sk.grindT * 420 + 450 + spins * 550, spins ? "Rail " + spins * 180 : "Rail grind", false, false); sfx("land");
      sk.grind = null; sk.noRail = 0.5; sk.ground = false; sk.air = true; sk.rot = sA; sk.vside = 0; sk.peakY = p.y; sk.airT = 0; sk.flipAcc = 0; sk.flipB = 0; sk.flipF = 0; sk.spin = 0; sk.spinV = 0; sk.grabT = 0; sk.rotV = 0; sk.featLaunch = true;
    }
    popReq = false;
  } else if (onGr) {
    // carving: the longer you hold a turn the more the edges bite, which turns tighter and scrubs less speed
    sk.carve = steer ? Math.min(1, sk.carve + dt / 0.55) : Math.max(0, sk.carve - dt * 2.5);
    const slash = K.boost && steer !== 0;   // Shift while turning: throw the skis round hard, scrub speed, spray
    sk.yaw -= steer * (1.15 + 0.95 * sk.carve) * dt * PH.turn * (slash ? 1.5 : clamp(1.25 / (1 + Math.pow(sk.sp / 32, 2)), 0.55, 1));   // faster means wider arcs
    const sA = tangent(sk.yaw), sn = Math.sin(sA), s = readSurface(); sk.slope = sA;
    // linear scrub from turning plus air drag that grows with speed, so there is no hard cap
    const lin = (0.1 * s.powder + 0.05 + Math.abs(steer) * (0.34 - 0.24 * sk.carve) * (0.85 + sk.sp / 90) * PH.scrub + s.road * 0.25 + (slash ? 0.6 : 0)) * (0.5 + 0.5 * PH.drag), quad = (K.down || K.up ? 0.0052 : 0.0072) * PH.drag, push = K.up && !slash ? 7 : 0, brk = K.brake ? 16 : 0;
    const acc = -G * sn - lin * sk.sp - quad * sk.sp * sk.sp + push - brk;
    sk.sp = sk.sp < 0.25 && acc < 0.6 && !push ? 0 : clamp(sk.sp + acc * dt, 0, MAXV);   // unlike the course runs, here you can stop: across the hill, on the flat, or with J
    sk.brakeK = lerp(sk.brakeK, (brk || slash) && sk.sp > 1 ? 1 : 0, Math.min(1, 8 * dt));
    if (brk && sk.sp > 4 && Math.random() < 0.7) for (let i = 0; i < 3; i++) spray(p, 1 + Math.random() * 3, (Math.random() - 0.5) * 5, v, 0.6);
    if (slash && sk.sp > 3) for (let i = 0; i < 4; i++) spray(p, 1.2 + Math.random() * (2 + sk.sp * 0.08), -steer * (3 + sk.sp * 0.3) * (0.4 + Math.random() * 0.8), v, 0.55, 0.5 + 0.5 * s.powder);
    const popNow = popReq, pw = 0.35 + 0.65 * popPow;
    if (popNow) { sk.sp += 0.9 * pw * Math.max(0, 1 - sk.sp / 45); for (let i = 0; i < 4; i++) spray(p, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, v); sfx("pop"); }
    v.copy(fw).multiplyScalar(sk.sp);
    const nx = p.x + v.x * dt, nz = p.z + v.z * dt, yp = p.y + v.y * dt, hn = H(nx, nz);
    if (hn - p.y > 0.9 && sk.sp > 0.5) { // a cliff face dead ahead: you do not ski up it
      if (sk.sp > 9) crash("Hit a cliff"); else { sk.sp = 0; toast("Cliff", 1); } popReq = false; return;
    }
    if (popNow || yp > hn + 0.12) { // the snow dropped away, or a pop: airborne
      const lip = kickerLip(p.x, p.z); sk.featLaunch = !!lip;
      sk.ground = false; sk.air = true; if (popNow) { v.y += (lip ? 6.5 : 5.2) * pw + 3.0; sk.popT = 0.2; } if (lip && !lip.lip) { const L2 = lip.Lr + lip.T + lip.Ld, hill = Math.atan2(H(lip.x + lip.dx * (L2 + 3), lip.z + lip.dz * (L2 + 3)) - H(lip.x - lip.dx * 3, lip.z - lip.dz * 3), L2 + 6); v.y = Math.max(v.y, sk.sp * Math.sin(hill + Math.atan(1.7 * lip.hK / lip.Lr))) + (popNow ? 0 : lip.side ? 1.4 : 3.0); }   // leave along the lip's own angle, with the lift Kicker Run's kickers give
      p.set(nx, popNow ? Math.max(yp, hn) + 0.02 : yp, nz); sk.rot = sA; sk.vside = 0; sk.peakY = p.y;
      sk.airT = 0; sk.flipAcc = 0; sk.flipB = 0; sk.flipF = 0; sk.spin = 0; sk.spinV = 0; sk.grabT = 0; sk.rotV = 0; sk.spinTarget = 0;
    } else {
      p.set(nx, hn, nz);
      if (!butterNow && !sk.butSpun) { sk.spin += (sk.spinTarget - sk.spin) * Math.min(1, 9 * dt); if (Math.abs(sk.spin - sk.spinTarget) < 0.02) { sk.spin = 0; sk.spinTarget = 0; } }
      const t = sk.sp > 1 ? treeHit(p.x, p.z, 0.22) : null; if (t) stumble(t);
      { const rl = sk.sp > 4 ? railAt(p.x, p.y + 0.5, p.z) : null; if (rl && (p.x - rl.x) * rl.dx + (p.z - rl.z) * rl.dz < 2.5) { sk.grind = rl; sk.gs = Math.max(0, (p.x - rl.x) * rl.dx + (p.z - rl.z) * rl.dz); sk.grindT = 0; sk.spin = 0; sk.featLaunch = true; sfx("thump", 0.3); } }
      if (sk.sp > 1) {
        for (const th of towerHits) { const dx = p.x - th.x, dz = p.z - th.z; if (dx * dx + dz * dz < (th.r + 0.25) * (th.r + 0.25)) { if (sk.sp > 6) crash("Hit a lift tower"); else { tmp.set(dx, 0, dz).normalize(); p.addScaledVector(tmp, 0.25); sk.sp *= 0.3; } break; } }
        const bd = buildingAt(p.x, p.z); if (bd && p.y < bd.top) { if (sk.sp > 6) crash("Hit a building"); else { tmp.set(p.x - bd.cx, 0, p.z - bd.cz).normalize(); p.addScaledVector(tmp, 0.4); sk.sp *= 0.2; } }
      }
    }
    popReq = false;
  } else {
    sk.airT += dt;
    const flipIn = (K.down ? 1 : 0) - (K.up ? 1 : 0), spinIn = (K.spinR ? 1 : 0) - (K.spinL ? 1 : 0), before = sk.rot;   // +1 = back flip (nose up), -1 = front flip
    sk.flipHold = flipIn && Math.sign(flipIn) === sk.flipDir ? sk.flipHold + dt : 0; sk.flipDir = Math.sign(flipIn);
    if (flipIn && sk.rotV * flipIn < 0) { sk.rotV *= Math.exp(-12 * dt); sk.flipHold = 0.5; }   // reversing a flip: kill the old rotation quickly so back + front can link
    if (flipIn) sk.rotV += clamp(flipIn * (2.2 + 4.4 * Math.min(1, sk.flipHold / 1.1)) - sk.rotV, -8 * dt, 8 * dt);   // starts slow, builds momentum the longer you hold
    else sk.rotV *= Math.exp(-2.4 * dt);
    sk.rot += sk.rotV * dt;
    if (!flipIn && v.y > -3 && Math.abs(sk.rotV) < 1.4) { const vh = Math.hypot(v.x, v.z), want = sk.rot + wrap(Math.atan2(v.y, vh) - sk.rot); sk.rot += (want - sk.rot) * Math.min(1, 5.5 * dt); }   // gentle auto-level on the way down
    { const dr = sk.rot - before; sk.flipAcc += dr; if (dr > 0) sk.flipB += dr; else sk.flipF -= dr; }
    sk.spinHold = spinIn && Math.sign(spinIn) === sk.spinDir ? sk.spinHold + dt : 0; sk.spinDir = Math.sign(spinIn);
    if (spinIn) sk.spinV += clamp(spinIn * PH.spin * (3.0 + 6.5 * Math.min(1, sk.spinHold / 1.0)) - sk.spinV, -14 * dt * PH.spin, 14 * dt * PH.spin);
    else { sk.spinV *= Math.exp(-2.6 * dt); const tgt = Math.round(sk.spin / Math.PI) * Math.PI; sk.spin += (tgt - sk.spin) * Math.min(1, 4 * dt); }
    sk.spin += sk.spinV * dt;
    if (K.grab || K.grabN || K.grabI || K.grabQ || K.grabS) { sk.grabT += dt; sk.grabKind = K.grabS ? "Safety" : K.grab ? "Tail" : K.grabN ? "Nose" : K.grabI ? "Indy" : "Japan"; }
    if (steer) { const want = clamp(sk.vside + steer * 7 * dt, -9, 9); v.addScaledVector(rt, want - sk.vside); sk.vside = want; }   // arrows slide you side to side in the air
    v.y -= G * dt; p.addScaledVector(v, dt); if (p.y > sk.peakY) sk.peakY = p.y;
    sk.sp = Math.hypot(v.x, v.z); sk.carve = Math.max(0, sk.carve - dt * 2.5); sk.brakeK = 0; popReq = false;
    if (sk.noRail > 0) sk.noRail -= dt;
    const rl = !(sk.noRail > 0) && v.y <= 2.4 ? railAt(p.x, p.y, p.z) : null;
    if (rl) { sk.grind = rl; sk.gs = clamp((p.x - rl.x) * rl.dx + (p.z - rl.z) * rl.dz, 0, rl.len - 0.1); sk.grindT = 0; sk.sp = Math.max(6, Math.hypot(v.x, v.z)); sk.ground = true; sk.air = false; sk.rot = 0; sk.rotV = 0; sk.spin -= Math.round(sk.spin / Math.PI) * Math.PI; sk.landT = 0.2; sfx("thump", 0.3); }
    else if (p.y <= H(p.x, p.z)) landing();
    else if (sk.airT > 0.1 && treeHit(p.x, p.z, 0.2) && p.y - H(p.x, p.z) < 6) crash("Hit a tree");
  }
  sk.vx = v.x; sk.vs = v.z;
  if (sk.ground && !sk.crashed) {
    const dy = sk.lastY !== undefined ? sk.lastY - p.y : 0; if (dy > 0 && dy < 5) sk.vert += dy; sk.lastY = p.y; if (sk.sp > sk.maxSp) sk.maxSp = sk.sp;
    sk.safeT += dt; if (sk.safeT > 1.5 && inWorld(p.x, p.z, 160) && sk.surf.rock < 0.3 && nrm.y > 0.8) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
  } else sk.lastY = p.y;
  if (!inWorld(p.x, p.z, 70)) { toast("Ski area boundary"); placeSkier(sk.safe.x, sk.safe.z, sk.safeYaw + Math.PI); }
}

/* ---------- rewind: hold R and the last half minute runs backwards; let go and ski on from there ---------- */
const REW = [], REW_KEYS = ["yaw", "sp", "ground", "air", "airT", "turn", "carve", "sw", "spin", "spinV", "rot", "rotV", "flipAcc", "flipB", "flipF", "grabT", "crashed", "crashT", "tumZ", "stumT", "pts", "vert", "slope", "gs", "grindT", "vside", "peakY"]; let rewT = 0, rewinding = false, rewKey = false;
function recordRewind(dt) {
  rewT += dt; if (rewT < 1 / 30) return; rewT = 0; const o = { p: sk.p.clone(), v: sk.v.clone(), grind: sk.grind }; for (const k of REW_KEYS) o[k] = sk[k]; REW.push(o); if (REW.length > 900) REW.shift();
}
function stepRewind(dt) {
  rewT += dt * 2; let o = null; while (rewT >= 1 / 30 && REW.length > 1) { rewT -= 1 / 30; o = REW.pop(); } if (!o) return REW.length > 1;
  sk.p.copy(o.p); sk.v.copy(o.v); sk.grind = o.grind; for (const k of REW_KEYS) sk[k] = o[k]; sk.parked = false; sk.lastY = sk.p.y; charging = false; popReq = false; trkPrev[0] = trkPrev[1] = null; return REW.length > 1;
}
/* ---------- on foot: skis off and carried, to boot-pack up to the ridges and summits no lift reaches ---------- */
function toggleWalk() {
  if (sk.mode === "walk") { sk.mode = "ski"; sk.parked = true; sk.sp = 0; sk.v.set(0, 0, 0); toast("Skis on"); }
  else if (sk.mode === "ski" && sk.ground && !sk.crashed && sk.sp < 5) { sk.mode = "walk"; sk.sp = 0; sk.v.set(0, 0, 0); sk.sw = false; sk.spin = 0; sk.turn = sk.carve = 0; sk.walkPh = 0; charging = false; popReq = false; toast("Skis off · W walks, A D turn, Shift hurries · B to click back in", 4); }
  else if (sk.mode === "ski") toast("Stop first to take your skis off");
  const b = $("walkBtn"); if (b) b.textContent = sk.mode === "walk" ? "Ski" : "Walk";
}
function stepWalk(dt) {
  const p = sk.p, steer = ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0), go = (K.up ? 1 : 0) - (K.down ? 1 : 0); sk.yaw -= steer * 1.9 * dt;
  const sA = tangent(sk.yaw); sk.slope = sA; readSurface();
  let v = go > 0 ? (K.boost ? 2.7 : 1.75) : go < 0 ? -1.0 : 0; v *= clamp(1 - Math.sin(sA) * go * 0.9, 0.45, 1.2) * (1 - 0.25 * sk.surf.powder);   // slower up the steeps and in deep snow
  const nx = p.x + Math.sin(sk.yaw) * v * dt, nz = p.z + Math.cos(sk.yaw) * v * dt;
  if (!buildingAt(nx, nz) && !treeHit(nx, nz, 0.15) && inWorld(nx, nz, 75)) { p.x = nx; p.z = nz; } else v = 0;
  p.y = H(p.x, p.z); sk.sp = Math.abs(v); sk.walkPh = (sk.walkPh || 0) + v * dt * 4.3; sk.turn = lerp(sk.turn, 0, Math.min(1, 8 * dt));
  const dy = sk.lastY !== undefined ? p.y - sk.lastY : 0; sk.lastY = p.y; sk.climb = (sk.climb || 0) + Math.max(0, dy);
  sk.safeT += dt; if (sk.safeT > 1.5) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
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
  sk.mode = "wait"; sk.lift = L; sk.v.set(0, 0, 0); sk.sp = 0; sk.sw = false; sk.carve = 0; sk.turn = 0; sk.brakeK = 0; sk.spin = 0; charging = false; popReq = false;
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
const NP = 3600, pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP), pSize = new Float32Array(NP); let pNext = 0, sprayPts = null;
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
function spray(at, up, side, vel, back = 0.5, big = 0) {
  const i = pNext; pNext = (pNext + 1) % NP;
  pPos[i * 3] = at.x + (Math.random() - 0.5) * 0.3; pPos[i * 3 + 1] = at.y + 0.05; pPos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 0.3;
  pVel[i * 3] = vel.x * back + rt.x * side + (Math.random() - 0.5) * 1.2; pVel[i * 3 + 1] = up + vel.y * back; pVel[i * 3 + 2] = vel.z * back + rt.z * side + (Math.random() - 0.5) * 1.2;
  pLife[i] = (0.5 + Math.random() * 0.6) * (1 + 0.9 * big); pSize[i] = (0.16 + Math.random() * 0.3) * (1 + 2.2 * big);
}
function updateParticles(dt) {
  for (let i = 0; i < NP; i++) { if (pLife[i] <= 0) continue; pLife[i] -= dt; const k = i * 3; pVel[k + 1] -= 7.5 * dt; const dr = Math.exp(-2.2 * dt); pVel[k] *= dr; pVel[k + 2] *= dr; pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt; }
  const a = sprayPts.geometry.attributes; a.position.needsUpdate = true; a.aLife.needsUpdate = true; a.aSize.needsUpdate = true; sprayPts.material.uniforms.uPx.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * DEG / 2);
}
function emitSpray(dt) {
  if (sk.mode !== "ski" || !sk.ground || sk.crashed || sk.sp < 4) return;
  const s = sk.surf, pw = 0.5 + 0.7 * s.powder, steer = sk.turn, n = (sk.sp > 18 ? 3 : 2) * pw * dt * 60 * 0.5, cnt = Math.floor(n + Math.random());
  for (let i = 0; i < Math.min(cnt, 12); i++) spray(sk.p, 0.5 + Math.random() * (0.8 + 1.2 * s.powder), (Math.random() - 0.5) * (1.5 + 2 * s.powder), sk.v, 0.3 + 0.2 * s.powder, 0.25 * s.powder);
  if (Math.abs(steer) > 0.3 && sk.sp > 6 && sk.carve > 0.2) { const k = Math.floor((2 + sk.sp / 10) * (1 + 3.5 * s.powder) * dt * 60 * 0.5 + Math.random()); for (let i = 0; i < k; i++) spray(sk.p, (1.5 + sk.sp * 0.05 + Math.random() * 2) * (1 + 0.8 * s.powder), -Math.sign(steer) * (3 + sk.carve * 4 + sk.sp * 0.12) * (0.5 + Math.random() * 0.6), sk.v, 0.3 + 0.2 * s.powder, s.powder); }   // a real cloud off every powder turn
  if (K.down && sk.sp > 3 && Math.random() < 0.4) spray(sk.p, 2, 0, sk.v, 0.4);
}
/* ski tracks: two ribbons pressed into the new snow. They stay where you left them until it is topped up, every five minutes. */
const TRK = 32000, TRACK_LIFE = 300, trkPos = new Float32Array(TRK * 12), trkA = new Float32Array(TRK * 4); let trkN = 0, trkMesh = null, trkClock = 0, trkLast = [new THREE.Vector3(1e9, 0, 0), new THREE.Vector3(1e9, 0, 0)], trkPrev = [null, null];
function initTracks() {
  const idx = new Uint32Array(TRK * 6); for (let q = 0; q < TRK; q++) { const a = q * 4; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], q * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(trkPos, 3)); g.setAttribute("aA", new THREE.BufferAttribute(trkA, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, uniforms: Object.assign({}, U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)), fog: true,
    vertexShader: `attribute float aA; varying float vA;
      #include <fog_pars_vertex>
      void main() { vA = aA; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSkyAmb; varying float vA;
      #include <fog_pars_fragment>
      void main() { gl_FragColor = vec4(uSkyAmb * 0.5, vA);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      }` });
  trkMesh = new THREE.Mesh(g, m); trkMesh.frustumCulled = false; trkMesh.renderOrder = 2; scene.add(trkMesh);
}
function clearTracks(say) { trkN = 0; trkClock = 0; trkPrev[0] = trkPrev[1] = null; trkMesh.geometry.setDrawRange(0, 0); if (say) toast("Fresh snow has filled in your tracks"); }
function layTracks(dt) {
  trkClock += dt; if (trkClock > TRACK_LIFE) clearTracks(trkN > 40);
  const walking = sk.mode === "walk";
  if (!(sk.mode === "ski" || walking) || !sk.ground || sk.crashed) { trkPrev[0] = trkPrev[1] = null; return; }
  const yawM = sk.yaw - sk.spin, fx = Math.sin(yawM), fz = Math.cos(yawM), rx = -fz, rz = fx, s = sk.surf, hw = walking ? 0.13 : 0.045 + 0.05 * sk.carve + 0.10 * s.powder + 0.12 * sk.brakeK, al = (walking ? 0.3 : 0.10 + 0.30 * s.powder + 0.07 * sk.carve) * (1 - s.rock) * (1 - s.road);
  const pa = trkMesh.geometry.attributes.position, aa = trkMesh.geometry.attributes.aA;
  for (let i = 0; i < 2; i++) {
    const o = (i ? 1 : -1) * (walking ? 0.12 : 0.16), x = sk.p.x + rx * o - fx * 0.3, z = sk.p.z + rz * o - fz * 0.3, cur = { x, z, hw };
    if (Math.hypot(x - trkLast[i].x, z - trkLast[i].z) < 0.5) continue;
    const pv = trkPrev[i]; trkLast[i].set(x, 0, z); trkPrev[i] = cur; if (!pv || (walking && (Math.floor((sk.walkPh || 0) / Math.PI) + i) % 2)) continue;
    const q = trkN % TRK, k = q * 12, a = q * 4, dx = x - pv.x, dz = z - pv.z, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l; trkN++;
    const put = (j, X, Z) => { trkPos[k + j * 3] = X; trkPos[k + j * 3 + 1] = H(X, Z) + 0.035; trkPos[k + j * 3 + 2] = Z; trkA[a + j] = al; };
    put(0, pv.x - px * pv.hw, pv.z - pz * pv.hw); put(1, pv.x + px * pv.hw, pv.z + pz * pv.hw); put(2, x - px * hw, z - pz * hw); put(3, x + px * hw, z + pz * hw);
    pa.addUpdateRange(k, 12); aa.addUpdateRange(a, 4); pa.needsUpdate = true; aa.needsUpdate = true;
  }
  trkMesh.geometry.setDrawRange(0, Math.min(trkN, TRK) * 6);
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
let camSnap = true, camSlope = 0, camAir = 0, look = { yaw: 0, pit: 0, drag: false, idle: 0 }; const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1), _m4 = new THREE.Matrix4(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
function makeRider(of) { // Kicker Run's skier faces -z; the holder faces +z and stands on the slope
  const R = KR.build(of), hold = new THREE.Group(); R.root.rotation.y = Math.PI; R.root.position.y = 0.025; hold.add(R.root); R.hold = hold; scene.add(hold);
  const carry = new THREE.Group(); R.skiMeshes.forEach((m, i) => { const c = new THREE.Mesh(m.geometry, m.material); c.position.set(i ? 0.035 : -0.035, 0, 0); if (i) c.rotation.z = Math.PI; c.castShadow = true; carry.add(c); }); carry.position.set(0.25, 1.36, 0.1); carry.rotation.set(1.18, 0, 0.06); carry.visible = false; R.rig.add(carry); R.carry = carry; return R;
}
function poseRider(R, q, keys, slope, dt, time, snap) {
  const hold = R.hold, onSnow = q.ground && (q.mode === "ski" || q.mode === "walk") && !q.crashed;
  const up = onSnow ? normalAt(q.p.x, q.p.z, 0.7, _y) : _y.set(0, 1, 0); fwdOf(q.yaw, _z); _x.crossVectors(up, _z).normalize(); _z.crossVectors(_x, up).normalize();
  _qa.setFromRotationMatrix(_m4.makeBasis(_x, up, _z)); if (snap) hold.quaternion.copy(_qa); else hold.quaternion.slerp(_qa, Math.min(1, (onSnow ? 7 : 16) * dt));
  hold.position.copy(q.p); if (onSnow) { q.sink = (q.sink || 0) + ((1 - maskAt(q.p.x, q.p.z)[0]) * (1 - maskAt(q.p.x, q.p.z)[2]) * (q.mode === "walk" ? 0.2 : 0.14) - (q.sink || 0)) * Math.min(1, 5 * dt); hold.position.y -= q.sink; }   // 20 cm of fresh: boots go to the bottom of it, skis float most of the way
  KR.pose(R, q, keys, slope, dt, time);
  R.rig.rotation.y = -(q.spin + (q.sw ? Math.PI : 0));
  const walking = q.mode === "walk"; R.carry.visible = walking; R.skiMeshes.forEach(m => { m.visible = !walking; });
  if (walking) { const mv = clamp(q.sp / 1.2, 0, 1), ph = q.walkPh || 0; R.legs.forEach((l, i) => { const sw = Math.sin(ph + i * Math.PI) * 0.5 * mv; l.hip.rotation.x += sw; l.knee.rotation.x -= Math.max(0, -Math.cos(ph + i * Math.PI)) * 0.55 * mv; const sg = R.skiG[i]; sg.position.z -= Math.sin(sw) * 0.82; sg.position.y += Math.max(0, -Math.cos(ph + i * Math.PI)) * 0.12 * mv; sg.rotation.x = 0; sg.rotation.z = 0; }); }
  const wob = q.stumT > 0 && !q.crashed ? Math.min(1, q.stumT / 0.9) : 0, seated = q.mode === "lift";
  R.pivot.rotation.x = (q.crashed ? q.rot : q.ground ? 0 : q.rot - 0) + wob * (0.28 * Math.sin(time * 9) - 0.12) - (seated ? 0.25 : 0);
  R.pivot.rotation.z = (q.crashed ? q.tumZ : -(R.pose.vt !== undefined ? R.pose.vt : q.turn) * (0.3 + 0.32 * q.carve) * (q.air ? 0.3 : 1)) + (wob ? wob * (q.stumD || 1) * 0.45 * Math.sin(time * 12) : 0);
}
const NOKEYS = Object.assign({}, K), PK = Object.assign({}, K);
function updateRig(dt, time) {
  const R = rig, onLift = sk.mode === "lift", seated = onLift && sk.lift && sk.lift.type.startsWith("chair"), cabin = onLift && sk.lift && !sk.lift.carpet && !seated;
  R.hold.visible = !cabin; sk.air = !sk.ground && sk.mode === "ski";
  if (seated) { sk.chg = 0.85; sk.turn = 0; sk.carve = 0; }   // sit: Kicker Run's deep crouch reads as a seat on the chair
  sk.poseSlope = camSnap ? sk.slope : (sk.poseSlope || 0) + (sk.slope - (sk.poseSlope || 0)) * Math.min(1, 3 * dt);   // legs follow the hill, not every ripple
  Object.assign(PK, K); if (sk.ground) { PK.boost = K.up; PK.up = 0; } else PK.boost = 0;   // on snow W is the tuck, not a nose butter
  poseRider(R, sk, sk.mode === "ski" ? PK : NOKEYS, sk.poseSlope, dt, time, camSnap);
  if (seated) R.hold.position.y += 0.2;
  R.head.visible = !(fpv && !cabin);
}
function updateCamera(dt) {
  const p = sk.p, sp = sk.sp, onLift = sk.mode === "lift", cabin = onLift && !sk.lift.carpet && !sk.lift.type.startsWith("chair");
  if (!look.drag) { look.idle += dt; if (look.idle > 1.2 && (sp > 2 || onLift)) { const k = Math.exp(-2.5 * dt); look.yaw *= k; look.pit *= k; } }
  const vh = Math.hypot(sk.v.x, sk.v.z); let heading = sk.yaw;
  if (sk.mode === "ski" && !sk.ground && vh > 2.5) heading = Math.atan2(sk.v.x, sk.v.z);
  const cur = Math.atan2(camDir.x, camDir.z), nh = cur + wrap(heading - cur) * (camSnap ? 1 : Math.min(1, (sk.ground ? 3.2 : 1.6) * dt)); camDir.set(Math.sin(nh), 0, Math.cos(nh));
  const cy = nh + look.yaw, dx = Math.sin(cy), dz = Math.cos(cy);
  camera.fov = lerp(camera.fov, fpv ? 76 + 8 * smooth(sp / 36) : 60 + 13 * smooth(sp / 36), Math.min(1, 3 * dt)); camera.near = fpv ? 0.1 : 0.25; camera.updateProjectionMatrix();
  if (fpv && !sk.crashed) {
    const eye = cabin ? tmp.set(p.x, p.y + 1.7, p.z) : rig.head.getWorldPosition(tmp); if (!cabin) { eye.y += 0.03; eye.x += Math.sin(nh) * 0.09; eye.z += Math.cos(nh) * 0.09; }   // the rider's own eyes
    camera.position.copy(eye); const slope = sk.ground && sk.mode === "ski" ? Math.atan2(fw.y, Math.hypot(fw.x, fw.z)) : 0, pit = clamp(slope * 0.85 - (onLift ? 0.08 : 0.2) + look.pit, -1.45, 1.3), hy = sk.mode === "ski" && sk.ground ? -sk.turn * 0.3 : 0;   // looking where you are going, a little down the hill and into the turn; glance down (drag) to see your skis
    camTgt.set(eye.x + Math.sin(cy + hy) * Math.cos(pit), eye.y + Math.sin(pit), eye.z + Math.cos(cy + hy) * Math.cos(pit)); camera.up.set(0, 1, 0); camera.lookAt(camTgt);
    camera.rotateZ(rig.pivot.rotation.z * 0.3); camSnap = false; return;
  }
  if (onLift && !sk.lift.carpet) { // ride cam: behind and a little above the carrier, looking up the line
    const L = sk.lift, a = liftPoint(L, sk.liftS - 4, 1, tmp), b = liftPoint(L, sk.liftS + 4, 1, tmp2), sl = (b.y - a.y) / 8, dist = cabin ? 15 : 7.5, cp = Math.cos(look.pit), ly = Math.sin(look.pit);
    tmp.set(p.x - dx * dist * cp, p.y + 2.3 - sl * dist + ly * dist + (cabin ? 2 : 0), p.z - dz * dist * cp); const gh = H(tmp.x, tmp.z) + 1.2; if (tmp.y < gh) tmp.y = gh;
    if (camSnap) camPos.copy(tmp); else camPos.lerp(tmp, 1 - Math.exp(-6 * dt)); camera.position.copy(camPos); camera.up.set(0, 1, 0);
    tmp.set(p.x + dx * 14, p.y + 1.2 + sl * 14, p.z + dz * 14); if (camSnap) camTgt.copy(tmp); else camTgt.lerp(tmp, 1 - Math.exp(-8 * dt)); camera.lookAt(camTgt); camSnap = false; return;
  }
  const dist = (onLift ? (cabin ? 15 : 8.5) : 5.2 + sp * 0.06) * (sk.crashed ? 1.3 : 1), hgtC = (onLift ? 3.4 : 3.2 + sp * 0.012) + look.pit * -6;   // a little above and close behind
  if (sk.ground && sk.mode === "ski") camSlope += (clamp(-fw.y, -0.5, 0.8) - camSlope) * Math.min(1, 4 * dt);   // held through the air, so leaving a lip never drops the view
  camAir += ((!sk.ground && sk.mode === "ski" ? clamp(0.9 + (p.y - H(p.x, p.z)) * 0.14, 0.9, 3) : 0) - camAir) * Math.min(1, (sk.ground ? 2.5 : 5) * dt);
  const slopeY = camSlope * dist * 0.55 + camAir / 0.6;
  tmp.set(p.x - dx * dist, p.y + hgtC + slopeY * 0.6, p.z - dz * dist);
  const gh = H(tmp.x, tmp.z) + 1.1; if (tmp.y < gh) tmp.y = gh;
  if (camSnap) camPos.copy(tmp); else { const k = 1 - Math.exp(-(onLift ? 5 : 7) * dt); camPos.x += (tmp.x - camPos.x) * k; camPos.z += (tmp.z - camPos.z) * k; camPos.y += (tmp.y - camPos.y) * (1 - Math.exp(-(tmp.y > camPos.y ? 7 : sk.ground ? 5 : 2.2) * dt)); if (camPos.y < H(camPos.x, camPos.z) + 0.9) camPos.y = H(camPos.x, camPos.z) + 0.9; }
  camera.position.copy(camPos); camera.up.set(0, 1, 0);
  tmp.set(p.x + dx * (3 + sp * 0.22), p.y + 1.25 - camSlope * dist * 0.14 + (onLift ? -1 : 0), p.z + dz * (3 + sp * 0.22));
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
