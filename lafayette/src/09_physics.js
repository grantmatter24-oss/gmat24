/* ---------- how each machine moves ---------- */
const RHO = 1.2;
const SPEC = {
  car: { four: true, m: 1780, L: 2.62, tr: 1.60, rw: 0.39, cg: 0.74, rest: 0.36, travel: 0.20, k: 54000, c: 4600, mu: [1.05, 0.78, 0.66], crr: [0.014, 0.035, 0.07], steer: 0.68, latG: 1.0, P: 155e3, Fmax: 0.78, vmax: 52, brake: 10.5, cda: 0.98, drive: [1, 1, 1, 1], hull: [0.92, 0.55, 2.15, 1.05], rpm: [800, 6200], gears: [3.6, 2.2, 1.5, 1.1, 0.85, 0.68], final: 4.1 },
  quad: { four: true, m: 385, L: 1.28, tr: 0.96, rw: 0.29, cg: 0.50, latG: 0.95, rest: 0.25, travel: 0.17, k: 12500, c: 1250, mu: [0.82, 0.86, 0.8], crr: [0.022, 0.035, 0.05], steer: 0.74, P: 33e3, Fmax: 0.72, vmax: 29, brake: 8.5, cda: 0.9, drive: [1, 1, 1, 1], hull: [0.5, 0.4, 1.0, 0.55], rpm: [1300, 8000], gears: [3.0, 2.0, 1.45, 1.1, 0.9], final: 9.5 },
  dirt: { m: 195, L: 1.48, rf: 0.345, rr: 0.33, cg: 0.74, b: 0.67, kf: 7400, cf: 540, rbf: 1450, tf: 0.30, kr: 16000, cr: 900, rbr: 2350, trv: 0.31, mu: [0.95, 0.92, 0.84], crr: [0.018, 0.028, 0.04], steer: 0.78, P: 39e3, Fmax: 0.60, vmax: 38, brake: 9.5, cda: 0.55, kp: 0.56, rpm: [1700, 11500], gears: [2.6, 1.9, 1.5, 1.25, 1.05], final: 13 },
  mtb: { m: 99, L: 1.19, rf: 0.37, rr: 0.37, cg: 0.98, b: 0.47, kf: 7800, cf: 420, rbf: 950, tf: 0.14, kr: 62000, cr: 1100, rbr: 1700, trv: 0.03, mu: [0.9, 0.88, 0.8], crr: [0.007, 0.016, 0.03], steer: 0.75, P: 430, Fmax: 0.5, vmax: 26, brake: 8.0, cda: 0.46, kp: 0.55, human: true },
  scoot: { m: 101, L: 0.86, rf: 0.108, rr: 0.108, cg: 0.95, b: 0.36, kf: 95000, cf: 1500, tf: 0.02, kr: 95000, cr: 1500, trv: 0.02, mu: [0.85, 0.55, 0.45], crr: [0.014, 0.07, 0.13], steer: 0.65, P: 750, Fmax: 0.3, vmax: 11.6, brake: 6.0, cda: 0.52, kp: 0.5, electric: true },
};
const ROUGH = [0, 0.028, 0.042, 0];   // bump height by surface: asphalt, dirt, grass, water
const _v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(), n: new THREE.Vector3(), tf: new THREE.Vector3(), ts: new THREE.Vector3(), F: new THREE.Vector3(), T: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), out: { x: 0, z: 0 } };
function makeVehicle(type) {
  const S = SPEC[type], model = VEHICLES[type].build(), rider = makeRider(type);
  const v = { type, S, model, rider, p: new THREE.Vector3(), q: new THREE.Quaternion(), v: new THREE.Vector3(), w: new THREE.Vector3(), psi: 0, th: 0, wth: 0, phi: 0, wphi: 0, steer: 0, comp: [0, 0, 0, 0], spin: [0, 0, 0, 0], contact: [false, false, false, false],
    speed: 0, fwd: 0, rpm: S.rpm ? S.rpm[0] : 0, gear: 0, throttle: 0, brake: 0, surf: 0, air: 0, slip: 0, crash: 0, hit: 0, acc: 0, latAcc: 0, vyLand: 0, crank: 0, psiDot: 0, safe: { x: 0, z: 0, yaw: 0, t: 0 }, ragdoll: null, lightsOn: false };
  model.group.add(rider.root); return v;
}
function placeVehicle(v, x, z, yaw) {
  const S = v.S, y = ground(x, z, H(x, z) + 3); v.psi = yaw; v.th = v.wth = v.phi = v.wphi = 0; v.v.set(0, 0, 0); v.w.set(0, 0, 0); v.steer = 0; v.crash = 0; v.ragdoll = null; v.air = 0; v.slip = 0;
  if (S.four) { v.p.set(x, y + S.cg + 0.05, z); v.q.setFromAxisAngle(_up, yaw); const n = groundNormal(x, z, _v.n); _v.q.setFromUnitVectors(_up, n); v.q.premultiply(_v.q); }
  else { const sl = (ground(x + Math.sin(yaw), z + Math.cos(yaw), y + 3) - ground(x - Math.sin(yaw), z - Math.cos(yaw), y + 3)) / 2; v.th = Math.atan(sl); v.p.set(x, y + S.cg * Math.cos(v.th) + 0.02, z); }
  v.safe.x = x; v.safe.z = z; v.safe.yaw = yaw; v.rider.root.visible = true;
}
function surfInfo(x, z, y) { const s = surfaceAt(x, z, y); return s; }
function bumpAt(x, z, s) { return ROUGH[s] ? ROUGH[s] * (vnoise(x * 0.3, z * 0.3, 41) + 0.4 * vnoise(x * 0.9, z * 0.9, 43) - 0.7) : 0; }
function tractive(S, speed, thr) { const F = Math.min(S.Fmax * S.m * G, S.P / Math.max(S.human ? 0.8 : 1.5, Math.abs(speed))); return thr * F * (Math.abs(speed) > S.vmax ? 0 : sstep(S.vmax, S.vmax * 0.93, Math.abs(speed))); }
function updateEngine(v, dt) {
  const S = v.S; if (!S.rpm) return; const sp = Math.abs(v.fwd), r = S.rw || S.rr, rpmAt = g => sp / r * S.gears[g] * S.final * 60 / TAU;
  if (v.gear < S.gears.length - 1 && rpmAt(v.gear) > S.rpm[1] * 0.88) { v.gear++; v.shiftT = 0.17; } else if (v.gear > 0 && rpmAt(v.gear - 1) < S.rpm[1] * 0.62) { v.gear--; v.shiftT = 0.1; }
  const target = Math.max(S.rpm[0] + v.throttle * (v.air > 0.2 || sp < 1.5 ? (S.rpm[1] - S.rpm[0]) * (v.air > 0.2 ? 0.8 : 0.3) : 0), Math.min(S.rpm[1], rpmAt(v.gear) * (1 + 0.25 * v.slip)));
  v.rpm = damp(v.rpm, target, target > v.rpm ? 9 : 5, dt);
}
/* walls, trunks and the edge of the map: push out, kill the speed into the obstacle, report how hard */
function collide(v, x, z, r, lever) {
  let hard = 0; const o = _v.out;
  const onDeck = deckAt(x, z, v.p.y + 0.5) > H(x, z) + 1.5;
  for (const fn of [hitBuildings, hitTrees]) { if (onDeck && fn === hitTrees) continue; const d = fn(x, z, r, o, v.p.y - v.S.cg + 0.3); if (d <= 0) continue;
    v.p.x += o.x * d; v.p.z += o.z * d; const vn = v.v.x * o.x + v.v.z * o.z;
    if (vn < 0) { hard = Math.max(hard, -vn); v.v.x -= o.x * vn * 1.15; v.v.z -= o.z * vn * 1.15; v.v.x *= 0.92; v.v.z *= 0.92; if (v.S.four && lever) v.w.y += (lever.x * o.z - lever.z * o.x) * vn * 0.25; } }
  const m = 26; let ex = 0, ez = 0; if (x < X0 + m) ex = 1; else if (x > X1 - m) ex = -1; if (z < Z0 + m) ez = 1; else if (z > Z1 - m) ez = -1;
  if (ex || ez) { v.edge = 1.5; const vn = v.v.x * ex + v.v.z * ez; if (vn < 0) { v.v.x -= ex * vn * 1.4; v.v.z -= ez * vn * 1.4; } v.p.x += ex * 0.15; v.p.z += ez * 0.15; }
  return hard;
}
/* ---- four wheels: a rigid body on four sprung wheels ---- */
const WPOS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
for (const k in SPEC) { const S = SPEC[k]; if (S.four) S.sag = S.m * G / (4 * S.k); else { S.sagF = S.m * G * S.b / S.L / S.kf; S.sagR = S.m * G * (S.L - S.b) / S.L / S.kr; S.brake = Math.min(S.brake, 0.82 * G * (S.L - S.b) / S.cg); } }   // a rider brakes no harder than keeps the back wheel down
function stepFour(v, inp, h) {
  const S = v.S, m = S.m, R = _v.m.makeRotationFromQuaternion(v.q), e = R.elements, lx = e[0], ly = e[1], lz = e[2], ux = e[4], uy = e[5], uz = e[6], fx = e[8], fy = e[9], fz = e[10];
  const F = _v.F.set(0, -m * G, 0), T = _v.T.set(0, 0, 0), Iy = m * (S.tr * S.tr + S.L * S.L * 1.5) / 12, Ix = m * (S.L * S.L * 1.5 + 0.6) / 12, Iz = m * (S.tr * S.tr + 0.6) / 12 * 1.3;
  const fwdSpeed = v.v.x * fx + v.v.y * fy + v.v.z * fz; v.fwd = fwdSpeed;
  let drive = 0, brake = inp.brake, rev = false;
  if (inp.throttle > 0) drive = tractive(S, fwdSpeed, inp.throttle) * (v.pw === undefined ? 1 : v.pw);
  if (inp.brake > 0 && inp.throttle === 0 && Math.abs(fwdSpeed) < 0.8) v.revMode = true; else if (inp.brake === 0 || inp.throttle > 0) v.revMode = false;   // reverse only engages from a standstill
  if (v.revMode) { rev = true; brake = 0; drive = -tractive(S, fwdSpeed, inp.brake) * 0.45 * (fwdSpeed < -9 ? 0 : 1); }
  if (inp.throttle > 0 && fwdSpeed < -0.6) { brake = Math.max(brake, inp.throttle); drive = 0; }
  const steerLim = Math.min(S.steer, Math.atan(S.L * (S.latG || 0.82) * G / Math.max(1, fwdSpeed * fwdSpeed)) * 1.9);
  // power and lock together break the back end loose, and the handbrake does it at once: that is the drift
  const drift = inp.throttle * sstep(0.5, 0.95, Math.abs(inp.steer)) * sstep(5, 11, Math.abs(fwdSpeed)), rearGrip = inp.hand ? 0.55 : 1 - 0.5 * drift;
  v.steer = damp(v.steer, inp.steer * steerLim, 9, h * 4) * 1; let nc = 0, slip = 0, surfSum = 0;
  for (let i = 0; i < 4; i++) {
    const wx = WPOS[i][0] * S.tr / 2, wz = WPOS[i][1] * S.L / 2, wy = -(S.cg - S.rw) - S.sag + S.rest;   // suspension top, in the body
    const mx = v.p.x + lx * wx + ux * wy + fx * wz, my = v.p.y + ly * wx + uy * wy + fy * wz, mz = v.p.z + lz * wx + uz * wy + fz * wz;
    const cx = mx - ux * S.rest, cy = my - uy * S.rest, cz = mz - uz * S.rest, sf = surfaceAt(cx, cz, cy), gy = ground(cx, cz, my + 0.4) + bumpAt(cx, cz, sf);
    let comp = (gy - (cy - S.rw)) / Math.max(0.35, uy); v.contact[i] = comp > 0; if (comp <= 0) { v.comp[i] = damp(v.comp[i], 0, 20, h); v.spin[i] += fwdSpeed / S.rw * h; continue; }
    nc++; surfSum += sf; const deck = gy > H(cx, cz) + 0.3, n = deck ? _v.n.set(0, 1, 0) : groundNormal(cx, cz, _v.n);
    const rx = cx - v.p.x, ry = gy - v.p.y, rz = cz - v.p.z, vcx = v.v.x + v.w.y * rz - v.w.z * ry, vcy = v.v.y + v.w.z * rx - v.w.x * rz, vcz = v.v.z + v.w.x * ry - v.w.y * rx;
    const vn = vcx * n.x + vcy * n.y + vcz * n.z; let N = S.k * Math.min(comp, S.travel) - S.c * (vn > 0 ? 1.45 : 0.75) * vn;   // dampers resist the rebound harder than the hit if (comp > S.travel) N += S.k * (vn < 0 ? 7 : 1.2) * (comp - S.travel) - (vn < 0 ? S.c * 2.5 * vn : 0);   // the bump stop takes the hit and gives almost nothing back if (N < 0) N = 0; if (N > m * G * 4) N = m * G * 4; v.comp[i] = Math.min(comp, S.travel + 0.03);
    const st = i < 2 ? v.steer : 0, c = Math.cos(st), s = Math.sin(st); let tx = fx * c + lx * s, ty = fy * c + ly * s, tz = fz * c + lz * s; const dn = tx * n.x + ty * n.y + tz * n.z; tx -= n.x * dn; ty -= n.y * dn; tz -= n.z * dn; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const sx = n.y * tz - n.z * ty, sy = n.z * tx - n.x * tz, sz = n.x * ty - n.y * tx, vlong = vcx * tx + vcy * ty + vcz * tz, vlat = vcx * sx + vcy * sy + vcz * sz, mu = S.mu[Math.min(2, sf)] * (sf === 3 ? 0.5 : 1);
    const hand = inp.hand && i >= 2, bF = (brake * S.brake * m * (i < 2 ? 0.33 : 0.17) + (hand ? m * G * 0.5 : 0));   // two thirds of the braking is at the front, so the tail stays behind
    let Fx = drive * S.drive[i] / 4 - Math.sign(vlong) * Math.min(bF, Math.abs(vlong) * m / 4 / h * 0.5) - S.crr[Math.min(2, sf)] * N * clamp(vlong * 2, -1, 1);
    if (!inp.throttle && !rev) Fx -= clamp(vlong, -1, 1) * m * 0.35 / 4;   // engine braking
    const al = Math.atan2(vlat, Math.abs(vlong) + 0.6), blend = sstep(0.4, 2.2, Math.hypot(vlong, vlat));
    let Fy = -lerp(clamp(vlat * m / 4 / h * 0.35, -mu * N, mu * N), mu * (i >= 2 ? lerp(rearGrip, 1.1, sstep(0.45, 0.9, Math.abs(al))) : 1) * N * Math.tanh(9.5 * al / mu), blend);
    const lim = mu * N, mag = Math.hypot(Fx, Fy); if (mag > lim) { slip = Math.max(slip, (mag - lim) / (lim + 1)); Fx *= lim / mag; Fy *= lim / mag; }
    const Fwx = n.x * N + tx * Fx + sx * Fy, Fwy = n.y * N + ty * Fx + sy * Fy, Fwz = n.z * N + tz * Fx + sz * Fy;
    F.x += Fwx; F.y += Fwy; F.z += Fwz;
    // grip acts on a short lever, so cornering and braking lean the body but can never roll it over
    const qx = tx * Fx + sx * Fy, qy = ty * Fx + sy * Fy, qz = tz * Fx + sz * Fy, ux2 = n.x * N, uy2 = n.y * N, uz2 = n.z * N, rq = ry * 0.3;
    T.x += ry * uz2 - rz * uy2 + rq * qz - rz * qy; T.y += rz * ux2 - rx * uz2 + rz * qx - rx * qz; T.z += rx * uy2 - ry * ux2 + rx * qy - rq * qx; v.spin[i] += (hand ? 0 : vlong / S.rw) * h;
  }
  // the body shell against the ground, so it can lie on its side or roof
  const hu = S.hull;
  for (let k = 0; k < 8; k++) {
    const bx = (k & 1 ? 1 : -1) * hu[0], by = (k & 2 ? hu[3] : -hu[1] * 0.35), bz = (k & 4 ? 1 : -1) * hu[2], px = v.p.x + lx * bx + ux * by + fx * bz, py = v.p.y + ly * bx + uy * by + fy * bz, pz = v.p.z + lz * bx + uz * by + fz * bz, d = ground(px, pz, py + 1.2) - py; if (d <= 0) continue;
    const rx = px - v.p.x, ry = py - v.p.y, rz = pz - v.p.z, vcx = v.v.x + v.w.y * rz - v.w.z * ry, vcy = v.v.y + v.w.z * rx - v.w.x * rz, vcz = v.v.z + v.w.x * ry - v.w.y * rx, N = Math.min(m * G * 3, Math.max(0, S.k * 2.2 * d - S.c * 1.4 * vcy)), fr = Math.min(0.55 * N, Math.hypot(vcx, vcz) * m / 8 / h);
    const hl = Math.hypot(vcx, vcz) + 1e-6, Fx = -vcx / hl * fr, Fz = -vcz / hl * fr; F.x += Fx; F.y += N; F.z += Fz; T.x += ry * Fz - rz * N; T.y += rz * Fx - rx * Fz; T.z += rx * N - ry * Fx; if (vcy < -3) v.hit = Math.max(v.hit, -vcy * 0.5);
  }
  const sp = v.v.length(); F.addScaledVector(v.v, -0.5 * RHO * S.cda * sp);
  const wat = waterAt(v.p.x, v.p.z); if (wat > v.p.y - S.cg + 0.35) { F.addScaledVector(v.v, -m * 2.2); v.wet = (v.wet || 0) + h; } else v.wet = 0;
  v.v.addScaledVector(F, h / m);
  // angular: torque into the body frame, integrate, back out
  const wbx = v.w.x * lx + v.w.y * ly + v.w.z * lz, wby = v.w.x * ux + v.w.y * uy + v.w.z * uz, wbz = v.w.x * fx + v.w.y * fy + v.w.z * fz, tbx = T.x * lx + T.y * ly + T.z * lz, tby = T.x * ux + T.y * uy + T.z * uz, tbz = T.x * fx + T.y * fy + T.z * fz;
  const ax = (tbx - (Iz - Iy) * wby * wbz) / Ix, ay = (tby - (Ix - Iz) * wbz * wbx) / Iy, az = (tbz - (Iy - Ix) * wbx * wby) / Iz, k = nc ? 0.9995 : 0.9998, nx = (wbx + ax * h) * k, ny = (wby + ay * h) * k * (1 - 4 * h * sstep(0.75, 1.3, Math.abs(Math.atan2(v.v.x * lx + v.v.z * lz, Math.abs(fwdSpeed) + 1)))),   // past about sixty degrees the slide stops winding up, so a drift holds instead of spinning
     nz = (wbz + az * h) * k;
  v.w.set(lx * nx + ux * ny + fx * nz, ly * nx + uy * ny + fy * nz, lz * nx + uz * ny + fz * nz); if (v.w.lengthSq() > 400) v.w.setLength(20);
  v.p.addScaledVector(v.v, h); _v.q.set(v.w.x * h * 0.5, v.w.y * h * 0.5, v.w.z * h * 0.5, 0).multiply(v.q); v.q.x += _v.q.x; v.q.y += _v.q.y; v.q.z += _v.q.z; v.q.w += _v.q.w; v.q.normalize();
  v.air = nc ? 0 : v.air + h; v.slip = damp(v.slip, Math.min(1, slip), 12, h); if (nc) v.surf = Math.round(surfSum / nc); v.upright = uy; v.throttle = inp.throttle || (rev ? inp.brake : 0); v.brake = brake; v.psi = Math.atan2(fx, fz); v.rev = rev;
}
/* ---- two wheels: a body that pitches on two sprung wheels and is steered and leaned by the rider ---- */
function stepTwo(v, inp, h) {
  const S = v.S, m = S.m, sp = Math.sin(v.psi), cp = Math.cos(v.psi), st = Math.sin(v.th), ct = Math.cos(v.th);
  const fwdSpeed = v.v.x * sp + v.v.z * cp; v.fwd = fwdSpeed; const F = _v.F.set(0, -m * G, 0); let tau = 0, nc = 0, Nsum = 0, slip = 0, surfSum = 0;
  let thr = inp.throttle, brake = inp.brake; const rel = v.th - (v.slope || 0); if (!S.human) thr *= 1 - sstep(0.30, 0.60, rel);   // the rider rolls off as the front comes up, and dabs the back brake before it goes over
  const dab = sstep(0.56, 0.8, rel) * m * G * 0.7, endo = sstep(-0.12, -0.4, rel); brake *= 1 - endo;
  const drive = tractive(S, fwdSpeed, thr) * (v.pw === undefined ? 1 : v.pw), back = clamp(inp.lean, -1, 1), b = S.b - back * 0.07;
  for (let i = 0; i < 2; i++) {
    const r = i ? S.rr : S.rf, dx = i ? -b : S.L - b, dy = -(S.cg - r) - (i ? S.sagR : S.sagF);
    const ax = v.p.x + sp * (ct * dx - st * dy), ay = v.p.y + st * dx + ct * dy, az = v.p.z + cp * (ct * dx - st * dy), sf = surfaceAt(ax, az, ay), gy = ground(ax, az, v.p.y) + bumpAt(ax, az, sf);
    const pen = gy + r - ay, trav = i ? S.trv : S.tf; v.contact[i] = pen > 0; if (pen <= 0) { v.comp[i] = damp(v.comp[i], 0, 18, h); v.spin[i] += (i && thr ? Math.max(fwdSpeed, 6 * thr) : fwdSpeed) / r * h; continue; }
    nc++; surfSum += sf; const deck = gy > H(ax, az) + 0.3, n = deck ? _v.n.set(0, 1, 0) : groundNormal(ax, az, _v.n);
    const rx = ax - v.p.x, ry = ay - r - v.p.y, rz = az - v.p.z, hx = rx * sp + rz * cp;           // lever arm along the heading
    const vcx = v.v.x - sp * v.wth * ry, vcy = v.v.y + v.wth * hx, vcz = v.v.z - cp * v.wth * ry;   // contact velocity with the pitch rate (nose-up positive)
    const vn = vcx * n.x + vcy * n.y + vcz * n.z, k = i ? S.kr : S.kf, c = vn > 0 ? (i ? S.rbr || S.cr : S.rbf || S.cf) : (i ? S.cr : S.cf); let N = k * Math.min(pen, trav) - c * (vn < 0 && v.landT > 0 ? 2.4 : 1) * vn; if (pen > trav) N += k * (vn < 0 ? 6 : 1) * (pen - trav) - (vn < 0 ? c * 3 * vn : 0); if (N < 0) N = 0; if (N > m * G * 3.5) N = m * G * 3.5;   // landing: legs and dampers swallow it, nothing springs back v.comp[i] = Math.min(pen, trav + 0.02); Nsum += N;
    let tx = sp, ty = 0, tz = cp; const dn = tx * n.x + tz * n.z; tx -= n.x * dn; ty -= n.y * dn; tz -= n.z * dn; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const sx = n.y * tz - n.z * ty, sy = n.z * tx - n.x * tz, sz = n.x * ty - n.y * tx, vlong = vcx * tx + vcy * ty + vcz * tz, vlat = vcx * sx + vcy * sy + vcz * sz, mu = S.mu[Math.min(2, sf)] * (sf === 3 ? 0.5 : 1);
    const lock = inp.hand && i === 1, bshare = i ? 0.42 : 0.58, bF = brake * S.brake * m * bshare + (lock ? m * G * 0.6 : 0) + (i ? dab : 0);
    let Fx = (i ? drive : 0) - Math.sign(vlong) * Math.min(bF, Math.abs(vlong) * m * 0.5 / h * 0.5) - S.crr[Math.min(2, sf)] * N * clamp(vlong * 2, -1, 1);
    if (i && !thr && !S.human && !S.electric) Fx -= clamp(vlong, -1, 1) * m * 0.5;
    let Fy = -clamp(vlat * m * 0.5 / h * 0.3, -mu * N, mu * N) * (lock ? 0.5 : 1);
    const lim = mu * N, mag = Math.hypot(Fx, Fy); if (mag > lim) { slip = Math.max(slip, (mag - lim) / (lim + 1)); Fx *= lim / mag; Fy *= lim / mag; }
    const Fwx = n.x * N + tx * Fx + sx * Fy, Fwy = n.y * N + ty * Fx + sy * Fy, Fwz = n.z * N + tz * Fx + sz * Fy; F.x += Fwx; F.y += Fwy; F.z += Fwz;
    tau += hx * Fwy - ry * (Fwx * sp + Fwz * cp);   // nose-up torque about the centre of mass
    v.spin[i] += (lock ? 0 : vlong / r + (i ? slip * 8 * thr : 0)) * h;
  }
  const spd = v.v.length(); F.addScaledVector(v.v, -0.5 * RHO * S.cda * spd);
  const wat = waterAt(v.p.x, v.p.z); if (wat > v.p.y - S.cg + 0.3) { F.addScaledVector(v.v, -m * 3); v.wet = (v.wet || 0) + h; } else v.wet = 0;
  v.v.addScaledVector(F, h / m);
  const I = m * S.kp * S.kp; tau += back * (nc ? m * G * 0.11 : I * 4.5); tau -= v.wth * I * (nc ? (v.landT > 0 ? 4.5 : 1.2) : 0.35); if (v.landT > 0) v.landT -= h;
  if (nc === 0 && !back) tau += ((clamp(Math.atan2(v.v.y, Math.abs(fwdSpeed) + 1) * 0.55, -0.5, 0.5) - v.th) * 7 - v.wth * 3) * I;   // in the air the rider keeps the bike pointing along its flight
  v.wth += tau / I * h; v.th += v.wth * h;
  // steering and lean
  const aMax = (S.mu[Math.min(2, v.surf)]) * G * 0.9, lim = Math.min(S.steer, Math.atan(S.L * aMax / Math.max(1.2, fwdSpeed * fwdSpeed)) * 1.12);
  v.steer = damp(v.steer, inp.steer * lim, S.human || S.electric ? 7 : 6, h * 4);
  const vlatB = v.v.x * cp - v.v.z * sp; let psiDot = 0;
  if (v.contact[0]) psiDot = fwdSpeed * Math.tan(v.steer) / S.L * clamp(1 - Math.abs(vlatB) / 9, 0.35, 1); else if (v.contact[1]) psiDot = fwdSpeed * Math.tan(v.steer) / S.L * 0.3; else psiDot = v.psiDot * (1 - 0.3 * h) + inp.steer * 2.4 * h;   // in the air the bars swing the bike round slowly (a whip); only steering back straightens it
  if (inp.hand && v.contact[1] && Math.abs(fwdSpeed) > 3) psiDot += inp.steer * 1.1;   // locked rear wheel swings round
  v.psiDot = psiDot; v.psi += psiDot * h;
  const tgt = nc ? clamp(Math.atan(fwdSpeed * psiDot / G), -0.95, 0.95) * sstep(0.6, 3, Math.abs(fwdSpeed)) : clamp(wrap(v.psi - Math.atan2(v.v.x, v.v.z)) * 1.15, -1.2, 1.2) * sstep(2, 6, Math.hypot(v.v.x, v.v.z));   // whipped, the bike lies over toward the way it is turned
  v.wphi += ((tgt - v.phi) * 70 - v.wphi * 13) * h; v.phi += v.wphi * h;
  v.p.addScaledVector(v.v, h);
  if (nc === 0) v.air += h; else { if (v.air > 0.12) v.landT = 0.55; if (v.air > 0.25) { v.vyLand = Math.max(v.vyLand, -v.v.y); if (Math.abs(wrap(v.psi - Math.atan2(v.v.x, v.v.z))) > 1.05 && Math.hypot(v.v.x, v.v.z) > 7) { v.crash = Math.max(v.crash, 0.01); v.why = "landed sideways"; } const sl = Math.atan((ground(v.p.x + sp, v.p.z + cp, v.p.y) - ground(v.p.x - sp, v.p.z - cp, v.p.y)) / 2); if (Math.abs(v.th - sl) > 1.25 && v.air > 0.6) { v.crash = Math.max(v.crash, 0.01); v.why = "bad landing"; } } v.air = 0; }
  if (Math.abs(rel) > 1.5) { v.crash = Math.max(v.crash, 0.01); v.why = "flipped " + rel.toFixed(2); }
  v.slip = damp(v.slip, Math.min(1, slip), 12, h); if (nc) v.surf = Math.round(surfSum / nc); v.throttle = thr; v.brake = brake; v.latAcc = fwdSpeed * psiDot;
  if (S.human) v.crank += (thr > 0 ? clamp(Math.abs(fwdSpeed) * 0.9 + 2.5, 3, 11) : 0) * h;
}
function stepVehicle(v, inp, dt) {
  const h = 1 / 240; let n = Math.min(14, Math.max(1, Math.round(dt / h))); const hh = dt / n, v0 = v.fwd;
  if (v.crash > 0) { stepCrash(v, dt); return; }
  if (!v.S.four) { const sp = Math.sin(v.psi), cp = Math.cos(v.psi), L = v.S.L; v.slope = Math.atan((ground(v.p.x + sp * L * 0.5, v.p.z + cp * L * 0.5, v.p.y) - ground(v.p.x - sp * L * 0.5, v.p.z - cp * L * 0.5, v.p.y)) / L); }
  // an engine takes a moment to come on song, and lets go for an instant at each gear change
  if (v.S.rpm) { v.spool = damp(v.spool || 0, inp.throttle > 0 ? 1 : 0, inp.throttle > 0 ? 5.5 : 12, dt); v.shiftT = Math.max(0, (v.shiftT || 0) - dt); v.pw = (0.35 + 0.65 * v.spool) * (v.shiftT > 0 ? 0.12 : 1); } else v.pw = 1;
  for (let i = 0; i < n; i++) { if (v.S.four) stepFour(v, inp, hh); else stepTwo(v, inp, hh); }
  // obstacles
  let hard = 0;
  if (v.S.four) { const R = _v.m.makeRotationFromQuaternion(v.q), e = R.elements; for (const o of [0.62, 0, -0.62]) { const lv = _v.a.set(e[8] * o * v.S.hull[2], 0, e[10] * o * v.S.hull[2]); hard = Math.max(hard, collide(v, v.p.x + lv.x, v.p.z + lv.z, v.S.hull[0], lv)); } }
  else { hard = collide(v, v.p.x + Math.sin(v.psi) * 0.45, v.p.z + Math.cos(v.psi) * 0.45, 0.3, null); hard = Math.max(hard, collide(v, v.p.x - Math.sin(v.psi) * 0.3, v.p.z - Math.cos(v.psi) * 0.3, 0.3, null)); }
  if (hard > 1) v.hit = Math.max(v.hit, hard);
  if (!v.S.four && (hard > 11 || v.vyLand > 17)) { v.crash = 0.01; v.why = hard > 11 ? "hit something at " + hard.toFixed(1) : "landed too hard"; } v.vyLand = 0;
  v.speed = Math.hypot(v.v.x, v.v.z); v.acc = damp(v.acc, (v.fwd - v0) / dt, 8, dt); updateEngine(v, dt); if (v.edge > 0) v.edge -= dt;
  // remember the last place it was the right way up on dry land, for the reset
  v.safe.t += dt; const upright = v.S.four ? v.upright > 0.7 : true;
  if (v.safe.t > 1.5 && v.air === 0 && upright && !v.wet && inWorld(v.p.x, v.p.z, 40)) { v.safe.t = 0; v.safe.x = v.p.x; v.safe.z = v.p.z; v.safe.yaw = v.psi; }
  if (v.wet > 1.2 || v.p.y < H(v.p.x, v.p.z) - 12) { v.sunk = true; }
}
/* ---- coming off: the machine slides to a stop, the rider tumbles as a jointed figure under gravity ---- */
const RAG = { names: ["head", "chest", "pelvis", "elbL", "elbR", "handL", "handR", "kneeL", "kneeR", "footL", "footR"], sticks: [[0, 1, 0.3], [1, 2, 0.5], [0, 2, 0.78], [1, 3, 0.36], [1, 4, 0.36], [3, 5, 0.27], [4, 6, 0.27], [2, 7, 0.44], [2, 8, 0.44], [7, 9, 0.42], [8, 10, 0.42], [3, 4, 0.5, 1], [7, 8, 0.24, 1], [1, 7, 0.82, 1], [1, 8, 0.82, 1], [5, 2, 0.3, 1], [6, 2, 0.3, 1]], rad: [0.13, 0.15, 0.13, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06] };
function startCrash(v) {
  const B = v.rider.bones, P = [], O = [], w = new THREE.Vector3(); v.model.group.updateMatrixWorld(true);
  const src = [B.head, B.spine2, B.pelvis, B.foreL, B.foreR, B.handL, B.handR, B.shinL, B.shinR, B.footL, B.footR];
  for (let i = 0; i < src.length; i++) { src[i].getWorldPosition(w); if (i === 0) w.y += 0.1; P.push(w.clone()); const r = rng(i * 7 + 3), k = 0.016; O.push(w.clone().addScaledVector(v.v, -k).add(new THREE.Vector3((r() - 0.5) * 0.03, -0.03 - r() * 0.03, (r() - 0.5) * 0.03))); }
  v.ragdoll = { P, O, t: 0 }; v.crash = 0.02; v.w.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4, 0);
}
function stepCrash(v, dt) {
  if (!v.ragdoll) startCrash(v); const R = v.ragdoll, h = 1 / 120, n = Math.max(1, Math.round(dt / h)); v.crash += dt;
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < R.P.length; i++) { const p = R.P[i], o = R.O[i], vx = (p.x - o.x) * 0.996, vy = (p.y - o.y) * 0.996 - G * h * h, vz = (p.z - o.z) * 0.996; o.copy(p); p.x += vx; p.y += vy; p.z += vz;
      const gy = ground(p.x, p.z, p.y + 0.5) + RAG.rad[i]; if (p.y < gy) { p.y = gy; const f = 0.86; o.x = p.x - (p.x - o.x) * f; o.z = p.z - (p.z - o.z) * f; o.y = p.y + (p.y - o.y) * 0.25; }
      const d = hitBuildings(p.x, p.z, RAG.rad[i], _v.out); if (d > 0) { p.x += _v.out.x * d; p.z += _v.out.z * d; } }
    for (let it = 0; it < 5; it++) for (const [a, b, L, minOnly] of RAG.sticks) { const pa = R.P[a], pb = R.P[b], dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, d = Math.hypot(dx, dy, dz) + 1e-6; if (minOnly && d > L) continue; const k = (d - L) / d * 0.5; pa.x += dx * k; pa.y += dy * k; pa.z += dz * k; pb.x -= dx * k; pb.y -= dy * k; pb.z -= dz * k; }
    // the machine: slides on its side
    const gy = ground(v.p.x, v.p.z, v.p.y + 1) + 0.32; v.v.y -= G * h; v.p.addScaledVector(v.v, h); if (v.p.y < gy) { v.p.y = gy; if (v.v.y < 0) v.v.y *= -0.2; const f = Math.exp(-3.2 * h); v.v.x *= f; v.v.z *= f; v.w.multiplyScalar(Math.exp(-3 * h)); }
    v.phi = damp(v.phi, v.phi >= 0 ? 1.45 : -1.45, 6, h); v.psi += v.w.y * h; v.th = damp(v.th, 0, 4, h); collide(v, v.p.x, v.p.z, 0.4, null);
  }
  v.speed = Math.hypot(v.v.x, v.v.z); v.fwd = 0; v.throttle = 0; v.rpm = damp(v.rpm, v.S.rpm ? v.S.rpm[0] : 0, 3, dt);
}
