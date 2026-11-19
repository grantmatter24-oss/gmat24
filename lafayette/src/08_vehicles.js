/* ---------- the five machines, built from tubes, plates and turned sections at real dimensions ---------- */
const _vm = new Map();
function vmat(color, rough = 0.6, metal = 0, extra) { const k = color + "/" + rough + "/" + metal + (extra ? JSON.stringify(extra) : ""); let m = _vm.get(k); if (!m) { m = extra && extra.clearcoat ? new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra)) : new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra || {})); _vm.set(k, m); } return m; }
function vadd(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tq = new THREE.Quaternion();
function vtube(parent, a, b, r, mat, seg = 8, r2) {   // a straight tube between two points
  _ta.set(a[0], a[1], a[2]); _tb.set(b[0], b[1], b[2]); const L = _ta.distanceTo(_tb), m = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, L, seg), mat);
  m.position.copy(_ta).add(_tb).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(_up, _tb.sub(_ta).normalize()); m.castShadow = true; parent.add(m); return m;
}
function vpath(parent, pts, r, mat, seg = 8) { for (let i = 0; i < pts.length - 1; i++) vtube(parent, pts[i], pts[i + 1], r, mat, seg); for (let i = 1; i < pts.length - 1; i++) vadd(parent, new THREE.SphereGeometry(r, seg, 6), mat, pts[i][0], pts[i][1], pts[i][2]); }
function vplate(parent, outline, width, mat, bevel = 0.008, x = 0) {   // a side-profile shape (z forward, y up) extruded across the machine
  const sh = new THREE.Shape(); outline.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 6 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.rotateY(-Math.PI / 2); return vadd(parent, g, mat, x, 0, 0);
}
let _knob = null, _tread = null;
function tireBump(knobby) {
  if (knobby) return _knob || (_knob = canvasTex(128, (g, s) => { g.fillStyle = "#404040"; g.fillRect(0, 0, s, s); g.fillStyle = "#fff"; for (let y = 0; y < s; y += 16) for (let x = (y / 16 % 2) * 12; x < s; x += 24) g.fillRect(x + 3, y + 3, 15, 10); }, true, false));
  return _tread || (_tread = canvasTex(128, (g, s) => { g.fillStyle = "#fff"; g.fillRect(0, 0, s, s); g.strokeStyle = "#202020"; g.lineWidth = 5; for (const x of [28, 64, 100]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke(); } g.lineWidth = 3; for (let y = 0; y < s; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(26, y + 8); g.moveTo(s, y); g.lineTo(s - 26, y + 8); g.stroke(); } }, true, false));
}
/* A wheel whose axle lies along x. style: "spoke" (wire wheel), "alloy", "disc". */
function makeWheel(r, w, rimR, style, knobby, rimColor = 0xb8bcc0) {
  const g = new THREE.Group(), prof = [], hw = w / 2, sw = r - rimR;
  for (const [u, v] of [[-0.78, 0], [-0.98, 0.35], [-1, 0.62], [-0.86, 0.88], [-0.55, 0.985], [0, 1], [0.55, 0.985], [0.86, 0.88], [1, 0.62], [0.98, 0.35], [0.78, 0]]) prof.push(new THREE.Vector2(rimR + sw * v, u * hw));
  const tg = new THREE.LatheGeometry(prof, 36); tg.rotateZ(Math.PI / 2); const bm = tireBump(knobby).clone(); bm.repeat.set(Math.round(TAU * r / (knobby ? 0.16 : 0.22)), 1); bm.needsUpdate = true;
  const uvA = tg.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i), uvA.getY(i));
  vadd(g, tg, new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92, bumpMap: bm, bumpScale: knobby ? 3.5 : 1.2 }));
  const rm = vmat(rimColor, 0.35, 0.9), dk = vmat(0x1c1d1f, 0.6, 0.5);
  if (style === "spoke") {
    vadd(g, new THREE.TorusGeometry(rimR - 0.006, 0.014, 6, 32), rm, 0, 0, 0, 0, Math.PI / 2, 0); vadd(g, new THREE.CylinderGeometry(0.028, 0.028, w * 1.5, 10), rm, 0, 0, 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 18; k++) { const a = k / 18 * TAU, s = k % 2 ? 1 : -1; vtube(g, [s * w * 0.6, Math.cos(a + 0.25) * 0.03, Math.sin(a + 0.25) * 0.03], [0, Math.cos(a) * (rimR - 0.012), Math.sin(a) * (rimR - 0.012)], 0.0022, rm, 4); }
    vadd(g, new THREE.CylinderGeometry(rimR * 0.42, rimR * 0.42, 0.004, 20), vmat(0x8a8d90, 0.3, 0.9), -w * 0.62, 0, 0, 0, 0, Math.PI / 2);
  } else if (style === "alloy") {
    vadd(g, new THREE.CylinderGeometry(rimR, rimR, w * 0.78, 28, 1, true), rm, 0, 0, 0, 0, 0, Math.PI / 2); vadd(g, new THREE.CylinderGeometry(rimR * 0.98, rimR * 0.98, 0.02, 28), dk, -w * 0.1, 0, 0, 0, 0, Math.PI / 2);
    for (const s of [1, -1]) { for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, sp = vadd(g, new THREE.BoxGeometry(0.03, rimR * 0.9, rimR * 0.22), rm, s * w * 0.3, Math.cos(a) * rimR * 0.5, Math.sin(a) * rimR * 0.5); sp.rotation.x = a; } vadd(g, new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.28, 0.05, 14), rm, s * w * 0.31, 0, 0, 0, 0, Math.PI / 2); }
  } else { vadd(g, new THREE.CylinderGeometry(rimR, rimR, w * 0.82, 20), dk, 0, 0, 0, 0, 0, Math.PI / 2); vadd(g, new THREE.CylinderGeometry(rimR * 0.5, rimR * 0.5, w * 1.1, 12), rm, 0, 0, 0, 0, 0, Math.PI / 2); }
  return g;
}
function lamp(parent, w, h, d, color, x, y, z, emissive) { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.25, emissive: emissive, emissiveIntensity: 0 }); return vadd(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z); }

/* Each builder returns the scene group plus the moving parts and the points the rider touches (in the machine's own frame:
   origin on the ground midway between the axles, x to the rider's left, z forward). */
function buildDirtBike() {
  const G = new THREE.Group(), red = vmat(0xc81f18, 0.45), wht = vmat(0xecece8, 0.5), blk = vmat(0x101012, 0.7), alu = vmat(0xa8acb0, 0.4, 0.85), dark = vmat(0x2a2b2e, 0.55, 0.6), gold = vmat(0xb89a4c, 0.35, 0.9);
  const L = 1.48, rf = 0.345, rr = 0.33, head = [0, 1.02, 0.47], rake = 0.47, body = new THREE.Group(); G.add(body);
  // frame
  vpath(body, [[0.0, 1.02, 0.47], [0.0, 0.78, 0.36], [0.0, 0.34, 0.26], [0.0, 0.30, -0.10], [0.0, 0.44, -0.20]], 0.022, alu); vpath(body, [[0, 1.0, 0.44], [0, 0.90, -0.02], [0, 0.44, -0.20]], 0.026, alu);
  for (const s of [1, -1]) vpath(body, [[0.07 * s, 0.86, -0.06], [0.09 * s, 0.86, -0.62], [0.06 * s, 0.56, -0.26]], 0.013, alu, 6);
  // engine, exhaust
  vadd(body, new THREE.BoxGeometry(0.22, 0.2, 0.3), dark, 0, 0.44, 0.08); vadd(body, new THREE.CylinderGeometry(0.075, 0.085, 0.24, 12), dark, 0, 0.63, 0.14, -0.18); vadd(body, new THREE.BoxGeometry(0.17, 0.07, 0.16), vmat(0x4a4b4e, 0.5, 0.6), 0, 0.77, 0.13, -0.18);
  vadd(body, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), vmat(0x55575a, 0.4, 0.7), 0.13, 0.42, 0.02, 0, 0, Math.PI / 2); vadd(body, new THREE.CylinderGeometry(0.085, 0.085, 0.05, 16), vmat(0x55575a, 0.4, 0.7), -0.13, 0.43, 0.06, 0, 0, Math.PI / 2);
  vpath(body, [[-0.03, 0.70, 0.2], [-0.09, 0.62, 0.3], [-0.13, 0.5, 0.16], [-0.14, 0.62, -0.2], [-0.15, 0.80, -0.42]], 0.022, vmat(0x8c8478, 0.35, 0.9)); vtube(body, [-0.15, 0.80, -0.42], [-0.16, 0.92, -0.82], 0.05, alu, 12);
  vadd(body, new THREE.BoxGeometry(0.3, 0.3, 0.035), vmat(0x1a1b1c, 0.5, 0.4), 0, 0.66, 0.31, 0.2);   // radiators
  // plastics and seat
  vplate(body, [[0.42, 0.98], [0.36, 1.03], [0.10, 1.01], [-0.04, 0.93], [0.02, 0.74], [0.22, 0.60], [0.40, 0.62], [0.46, 0.80]], 0.30, red, 0.02);
  vplate(body, [[0.32, 1.035], [0.12, 1.03], [-0.10, 0.955], [-0.56, 0.945], [-0.62, 0.92], [-0.56, 0.89], [-0.06, 0.88], [0.12, 0.95], [0.32, 0.99]], 0.17, blk, 0.02);
  vplate(body, [[-0.50, 0.93], [-0.98, 0.99], [-1.0, 0.97], [-0.74, 0.88], [-0.5, 0.86]], 0.19, red, 0.012);
  for (const s of [1, -1]) vplate(body, [[-0.10, 0.90], [-0.52, 0.90], [-0.60, 0.74], [-0.36, 0.60], [-0.16, 0.66]], 0.012, wht, 0.003, 0.105 * s);
  vadd(body, new THREE.BoxGeometry(0.20, 0.02, 0.36), blk, 0, 0.30, 0.1);   // skid plate
  for (const s of [1, -1]) { vtube(body, [0.11 * s, 0.40, -0.06], [0.24 * s, 0.40, -0.06], 0.012, alu, 6); vadd(body, new THREE.BoxGeometry(0.06, 0.018, 0.045), alu, 0.25 * s, 0.405, -0.06); }
  // steering: everything that turns with the bars
  const steer = new THREE.Group(); steer.position.set(...head); steer.rotation.x = -rake; G.add(steer); const sp = new THREE.Group(); steer.add(sp);   // sp spins about the steering axis (local y)
  for (const s of [1, -1]) { vtube(sp, [0.1 * s, 0.08, 0], [0.1 * s, -0.42, 0], 0.024, gold, 10); }
  vadd(sp, new THREE.BoxGeometry(0.26, 0.03, 0.07), dark, 0, 0.06, 0); vadd(sp, new THREE.BoxGeometry(0.26, 0.03, 0.07), dark, 0, -0.12, 0);
  vpath(sp, [[-0.39, 0.19, -0.07], [-0.2, 0.2, -0.02], [-0.06, 0.12, 0.0], [0.06, 0.12, 0.0], [0.2, 0.2, -0.02], [0.39, 0.19, -0.07]], 0.011, alu, 6); vtube(sp, [-0.16, 0.185, -0.03], [0.16, 0.185, -0.03], 0.008, alu, 6);
  for (const s of [1, -1]) { vtube(sp, [0.39 * s, 0.19, -0.07], [0.27 * s, 0.195, -0.045], 0.017, blk, 8); vtube(sp, [0.3 * s, 0.2, -0.03], [0.42 * s, 0.185, 0.02], 0.005, dark, 4); }
  vplate(sp, [[0.06, 0.02], [0.14, -0.02], [0.14, -0.20], [0.06, -0.24]], 0.22, wht, 0.006);                           // number plate
  vplate(sp, [[0.04, -0.20], [0.42, -0.34], [0.44, -0.36], [0.02, -0.26], [-0.24, -0.30], [-0.26, -0.28]], 0.14, red, 0.01);   // high front fender
  const fl = new THREE.Group(); sp.add(fl);   // lower fork legs and wheel slide along the fork
  for (const s of [1, -1]) vtube(fl, [0.1 * s, -0.36, 0], [0.1 * s, -0.80, 0], 0.03, alu, 10);
  const wf = makeWheel(rf, 0.09, 0.27, "spoke", true, 0x1e1e20); wf.position.set(0, -0.80, 0); fl.add(wf);
  // swingarm
  const sa = new THREE.Group(); sa.position.set(0, 0.42, -0.17); G.add(sa); const sal = 0.585;
  for (const s of [1, -1]) vadd(sa, new THREE.BoxGeometry(0.03, 0.055, sal), alu, 0.085 * s, 0, -sal / 2);
  const wr = makeWheel(rr, 0.11, 0.245, "spoke", true, 0x1e1e20); wr.position.set(0, 0, -sal); sa.add(wr);
  vadd(sa, new THREE.CylinderGeometry(0.105, 0.105, 0.006, 24), vmat(0x6b6d70, 0.4, 0.8), 0.075, 0, -sal, 0, 0, Math.PI / 2); vadd(sa, new THREE.BoxGeometry(0.008, 0.014, sal), dark, 0.075, 0.05, -sal / 2); vadd(sa, new THREE.BoxGeometry(0.008, 0.014, sal), dark, 0.075, -0.05, -sal / 2);
  const shock = vtube(body, [0, 0.78, -0.14], [0, 0.46, -0.24], 0.03, vmat(0xd0b030, 0.4, 0.5), 8);
  return { group: G, body, steer: sp, fork: fl, swing: sa, wheels: [wf, wr], forkBase: 0, swingLen: sal, head, rake, grip: [0.36, 0.195, -0.06], seat: [0, 0.94, -0.18], pegs: [0.25, 0.42, -0.06], wheelbase: L, rf, rr, lights: [], type: "dirt" };
}
function buildMtb() {
  const G = new THREE.Group(), frame = vmat(0x1f5f7a, 0.35, 0.3), blk = vmat(0x0e0e10, 0.6), alu = vmat(0xb4b8bc, 0.35, 0.9), dark = vmat(0x26272a, 0.5, 0.6), body = new THREE.Group(); G.add(body);
  const L = 1.19, r = 0.37, head = [0, 1.0, 0.44], rake = 0.42, bb = [0, 0.335, -0.14], rear = [0, r, -L / 2];
  vtube(body, [0, 1.0, 0.44], [0, 0.90, 0.39], 0.028, frame, 10); vtube(body, [0, 0.97, 0.42], [0, 0.80, -0.22], 0.021, frame, 10); vtube(body, [0, 0.90, 0.39], bb, 0.03, frame, 10); vtube(body, bb, [0, 0.82, -0.25], 0.02, frame, 10);
  for (const s of [1, -1]) { vtube(body, [0.02 * s, 0.335, -0.14], [0.07 * s, rear[1], rear[2]], 0.012, frame, 6); vtube(body, [0.02 * s, 0.80, -0.24], [0.07 * s, rear[1], rear[2]], 0.009, frame, 6); }
  const post = new THREE.Group(); post.position.set(0, 0.82, -0.25); body.add(post);
  vtube(post, [0, 0, 0], [0, 0.14, -0.035], 0.014, blk, 8); vplate(post, [[0.13, 0.16], [0.05, 0.175], [-0.12, 0.17], [-0.15, 0.15], [-0.05, 0.135], [0.12, 0.14]], 0.13, blk, 0.012);
  // drivetrain
  const crank = new THREE.Group(); crank.position.set(...bb); G.add(crank); vadd(crank, new THREE.CylinderGeometry(0.085, 0.085, 0.006, 24), dark, -0.05, 0, 0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) { vtube(crank, [0.065 * s, 0, 0], [0.085 * s, -0.17 * s, 0], 0.011, alu, 6); }
  const pedL = new THREE.Group(), pedR = new THREE.Group(); pedL.position.set(0.14, -0.17, 0); pedR.position.set(-0.14, 0.17, 0); crank.add(pedL, pedR); for (const p of [pedL, pedR]) vadd(p, new THREE.BoxGeometry(0.095, 0.016, 0.095), blk);
  vadd(body, new THREE.BoxGeometry(0.006, 0.012, 0.46), dark, -0.05, 0.42, -0.36, 0.02); vadd(body, new THREE.BoxGeometry(0.006, 0.012, 0.46), dark, -0.05, 0.3, -0.36, -0.16); vadd(body, new THREE.BoxGeometry(0.03, 0.09, 0.04), dark, -0.075, 0.28, -0.58);
  const wr = makeWheel(r, 0.058, 0.31, "spoke", true, 0x18181a); wr.position.set(...rear); G.add(wr); vadd(wr, new THREE.CylinderGeometry(0.055, 0.03, 0.04, 14), dark, -0.045, 0, 0, 0, 0, Math.PI / 2);
  const steer = new THREE.Group(); steer.position.set(...head); steer.rotation.x = -rake; G.add(steer); const sp = new THREE.Group(); steer.add(sp);
  vtube(sp, [0, 0.03, 0], [0, 0.06, 0.07], 0.016, blk, 8); vpath(sp, [[-0.38, 0.075, 0.03], [-0.1, 0.06, 0.07], [0.1, 0.06, 0.07], [0.38, 0.075, 0.03]], 0.011, blk, 6);
  for (const s of [1, -1]) { vtube(sp, [0.38 * s, 0.075, 0.03], [0.27 * s, 0.07, 0.045], 0.016, vmat(0x202022, 0.9), 8); vtube(sp, [0.065 * s, -0.10, 0], [0.065 * s, -0.42, 0], 0.017, vmat(0x1a1a1c, 0.3, 0.6), 8); }
  vadd(sp, new THREE.BoxGeometry(0.17, 0.035, 0.05), blk, 0, -0.10, 0);
  const fl = new THREE.Group(); sp.add(fl); for (const s of [1, -1]) vtube(fl, [0.065 * s, -0.32, 0], [0.065 * s, -0.69, 0], 0.021, blk, 8); vadd(fl, new THREE.BoxGeometry(0.15, 0.03, 0.03), blk, 0, -0.33, 0.02);
  const wf = makeWheel(r, 0.058, 0.31, "spoke", true, 0x18181a); wf.position.set(0, -0.69, 0); fl.add(wf);
  return { group: G, body, steer: sp, fork: fl, swing: null, wheels: [wf, wr], crank, pedals: [pedL, pedR], post, head, rake, grip: [0.35, 0.075, 0.035], seat: [0, 0.985, -0.29], bb, crankLen: 0.17, pedalX: 0.14, wheelbase: L, rf: r, rr: r, lights: [], type: "mtb" };
}
function buildScooter() {
  const G = new THREE.Group(), blk = vmat(0x141517, 0.5, 0.3), gry = vmat(0x3a3d42, 0.45, 0.5), alu = vmat(0x9da1a6, 0.35, 0.85), acc = vmat(0xd0451b, 0.5), body = new THREE.Group(); G.add(body);
  const L = 0.86, r = 0.108, head = [0, 0.36, 0.33], rake = 0.2;
  vplate(body, [[0.24, 0.165], [-0.36, 0.165], [-0.40, 0.14], [-0.36, 0.10], [0.20, 0.10], [0.30, 0.16], [0.33, 0.30], [0.30, 0.32]], 0.17, gry, 0.012);
  vadd(body, new THREE.BoxGeometry(0.15, 0.004, 0.52), vmat(0x0a0a0a, 0.98), 0, 0.168, -0.07); vplate(body, [[-0.33, 0.20], [-0.52, 0.245], [-0.56, 0.22], [-0.50, 0.17], [-0.36, 0.17]], 0.07, blk, 0.006);
  vtube(body, [0.02, 0.1, -0.1], [0.11, 0.02, -0.14], 0.006, alu, 5);   // kickstand
  const wr = makeWheel(r, 0.05, 0.062, "disc", false); wr.position.set(0, r, -L / 2); G.add(wr);
  const steer = new THREE.Group(); steer.position.set(...head); steer.rotation.x = -rake; G.add(steer); const sp = new THREE.Group(); steer.add(sp);
  vtube(sp, [0, -0.06, 0], [0, 0.78, 0], 0.022, blk, 10); vadd(sp, new THREE.BoxGeometry(0.06, 0.05, 0.06), gry, 0, 0.02, 0); vtube(sp, [-0.26, 0.78, 0], [0.26, 0.78, 0], 0.012, blk, 8);
  for (const s of [1, -1]) { vtube(sp, [0.26 * s, 0.78, 0], [0.15 * s, 0.78, 0], 0.016, vmat(0x232323, 0.95), 8); vtube(sp, [0.14 * s, 0.775, 0.012], [0.22 * s, 0.76, 0.05], 0.004, alu, 4); }
  vadd(sp, new THREE.BoxGeometry(0.07, 0.012, 0.045), vmat(0x05080a, 0.2), 0, 0.795, 0.0); const hl = lamp(sp, 0.05, 0.035, 0.02, 0xf2f2ee, 0, 0.62, 0.03, 0xfff2d0);
  for (const s of [1, -1]) vtube(sp, [0.03 * s, -0.05, 0], [0.03 * s, -0.255, 0.012], 0.008, alu, 6); vplate(sp, [[0.13, -0.16], [0.0, -0.125], [-0.12, -0.17], [-0.11, -0.19], [0.0, -0.15], [0.12, -0.18]], 0.062, acc, 0.004);
  const wf = makeWheel(r, 0.05, 0.062, "disc", false); wf.position.set(0, -0.255, 0.012); sp.add(wf);
  const tl = lamp(body, 0.04, 0.02, 0.012, 0x501010, 0, 0.215, -0.555, 0xff2010);
  return { group: G, body, steer: sp, fork: null, swing: null, wheels: [wf, wr], head, rake, grip: [0.215, 0.78, 0.0], deck: 0.17, wheelbase: L, rf: r, rr: r, lights: [hl], tails: [tl], type: "scoot" };
}
function buildQuad() {
  const G = new THREE.Group(), col = vmat(0x1e5a2a, 0.45), blk = vmat(0x121214, 0.75), dark = vmat(0x2b2c2f, 0.55, 0.5), alu = vmat(0x8f9498, 0.4, 0.85), body = new THREE.Group(); G.add(body);
  const L = 1.28, tr = 0.96, rw = 0.29, head = [0, 0.86, 0.36], rake = 0.3;
  vpath(body, [[0.16, 0.34, 0.58], [0.17, 0.30, -0.50], [0.16, 0.56, -0.66]], 0.02, dark); vpath(body, [[-0.16, 0.34, 0.58], [-0.17, 0.30, -0.50], [-0.16, 0.56, -0.66]], 0.02, dark);
  vadd(body, new THREE.BoxGeometry(0.34, 0.3, 0.5), dark, 0, 0.48, -0.06); vadd(body, new THREE.CylinderGeometry(0.08, 0.09, 0.22, 12), vmat(0x45474a, 0.5, 0.6), 0, 0.68, 0.02);
  vplate(body, [[0.74, 0.62], [0.70, 0.74], [0.40, 0.84], [0.16, 0.82], [0.10, 0.62], [0.40, 0.56]], 0.46, col, 0.03);                        // nose and tank cover
  vplate(body, [[0.20, 0.84], [-0.02, 0.80], [-0.52, 0.82], [-0.60, 0.78], [-0.52, 0.72], [0.0, 0.70], [0.18, 0.74]], 0.34, blk, 0.035);      // seat
  for (const s of [1, -1]) {
    vplate(body, [[0.92, 0.60], [0.74, 0.70], [0.42, 0.72], [0.30, 0.60], [0.34, 0.56], [0.72, 0.63], [0.90, 0.56]], 0.30, col, 0.02, 0.38 * s);   // front guards
    vplate(body, [[-0.24, 0.62], [-0.44, 0.72], [-0.86, 0.72], [-0.98, 0.60], [-0.94, 0.56], [-0.80, 0.65], [-0.46, 0.64], [-0.28, 0.56]], 0.32, col, 0.02, 0.37 * s);
    vadd(body, new THREE.BoxGeometry(0.22, 0.03, 0.42), blk, 0.31 * s, 0.33, -0.02); vadd(body, new THREE.BoxGeometry(0.04, 0.03, 0.12), alu, 0.31 * s, 0.36, 0.02);
    for (const z of [L / 2, -L / 2]) { vtube(body, [0.16 * s, 0.36, z + 0.1], [(tr / 2 - 0.1) * s, rw, z], 0.014, dark, 6); vtube(body, [0.16 * s, 0.36, z - 0.1], [(tr / 2 - 0.1) * s, rw, z], 0.014, dark, 6); vtube(body, [0.15 * s, 0.58, z], [(tr / 2 - 0.12) * s, rw + 0.05, z], 0.022, vmat(0xc02020, 0.4, 0.4), 8); }
  }
  for (const [z0, z1, y] of [[0.50, 0.92, 0.80], [-0.94, -0.52, 0.78]]) { for (const s of [1, -1]) vtube(body, [0.26 * s, y, z0], [0.26 * s, y, z1], 0.011, blk, 6); for (let k = 0; k < 4; k++) vtube(body, [-0.27, y, lerp(z0, z1, k / 3)], [0.27, y, lerp(z0, z1, k / 3)], 0.011, blk, 6); }
  vpath(body, [[-0.3, 0.44, 0.94], [-0.3, 0.6, 0.98], [0.3, 0.6, 0.98], [0.3, 0.44, 0.94]], 0.018, blk, 6);
  const hl = [lamp(body, 0.12, 0.06, 0.03, 0xf0f0ea, 0.2, 0.66, 0.9, 0xfff2d0), lamp(body, 0.12, 0.06, 0.03, 0xf0f0ea, -0.2, 0.66, 0.9, 0xfff2d0)], tl = [lamp(body, 0.1, 0.04, 0.02, 0x501010, 0, 0.70, -0.985, 0xff2010)];
  const steer = new THREE.Group(); steer.position.set(...head); steer.rotation.x = -rake; G.add(steer); const sp = new THREE.Group(); steer.add(sp);
  vtube(sp, [0, -0.3, 0], [0, 0.14, 0], 0.018, dark, 8); vpath(sp, [[-0.36, 0.22, -0.05], [-0.14, 0.16, 0.0], [0.14, 0.16, 0.0], [0.36, 0.22, -0.05]], 0.012, blk, 6); vadd(sp, new THREE.BoxGeometry(0.2, 0.09, 0.14), blk, 0, 0.17, 0.04);
  for (const s of [1, -1]) vtube(sp, [0.36 * s, 0.22, -0.05], [0.25 * s, 0.205, -0.027], 0.017, vmat(0x202020, 0.95), 8);
  const wheels = [], knuckles = [];
  for (const [x, z, front] of [[tr / 2, L / 2, 1], [-tr / 2, L / 2, 1], [tr / 2, -L / 2, 0], [-tr / 2, -L / 2, 0]]) { const k = new THREE.Group(); k.position.set(x, rw, z); G.add(k); const w = makeWheel(rw, front ? 0.2 : 0.26, 0.15, "alloy", true, 0x2a2b2e); k.add(w); wheels.push(w); knuckles.push(k); }
  return { group: G, body, steer: sp, wheels, knuckles, head, rake, grip: [0.31, 0.215, -0.04], seat: [0, 0.83, -0.2], pegs: [0.31, 0.37, 0.02], wheelbase: L, track: tr, rw, lights: hl, tails: tl, type: "quad" };
}
function buildCar() {
  const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
  const paint = vmat(0x51624a, 0.42, 0.35, { clearcoat: 1, clearcoatRoughness: 0.12 }), trim = vmat(0x17181a, 0.75), glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.48, side: THREE.DoubleSide }), chrome = vmat(0xc9ccd0, 0.2, 1), inter = vmat(0x1f2022, 0.9);
  const L = 2.62, tr = 1.60, rw = 0.39, W = 1.84, zf = L / 2, zr = -L / 2, gy = 0.30;   // gy: sill height
  const arch = (zc, out) => { for (let k = 0; k <= 8; k++) { const a = Math.PI - k / 8 * Math.PI; out.push([zc + Math.cos(a) * (rw + 0.09), gy + 0.02 + Math.sin(a) * (rw + 0.14)]); } };
  const low = [[2.12, 0.50], [2.16, 0.62], [2.14, 0.98], [2.05, 1.04], [0.92, 1.10], [-2.08, 1.10], [-2.12, 0.60], [-2.06, 0.44]]; const pts = low.slice(); arch(zr, pts); pts.push([0, gy]); arch(zf, pts);
  const b = vplate(body, pts, W, paint, 0.05);
  vplate(body, [[0.98, 1.10], [0.52, 1.74], [0.30, 1.80], [-1.88, 1.80], [-2.04, 1.72], [-2.08, 1.10]], W - 0.16, paint, 0.06);                 // cabin
  vadd(body, new THREE.BoxGeometry(W - 0.34, 0.5, L + 1.0), inter, 0, 0.62, 0);                                                              // wheel tubs and floor
  // glazing: each pane sits a hair proud of the cabin so the pillars show between them
  const pane = (o, x) => { const sh = new THREE.Shape(); o.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2); const m = new THREE.Mesh(g, glass); m.position.x = x; body.add(m); };
  for (const s of [1, -1]) { const x = s * ((W - 0.16) / 2 + 0.004); pane([[0.84, 1.16], [0.50, 1.66], [-0.08, 1.70], [-0.08, 1.16]], x); pane([[-0.18, 1.16], [-0.18, 1.70], [-0.98, 1.70], [-0.98, 1.16]], x); pane([[-1.08, 1.16], [-1.08, 1.70], [-1.84, 1.70], [-1.96, 1.16]], x); }
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.36, 0.74), glass); ws.position.set(0, 1.43, 0.765); ws.rotation.x = -Math.atan2(0.46, 0.64) - Math.PI / 2 + Math.PI / 2; ws.rotation.set(-0.622, 0, 0); body.add(ws);
  const rg = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.44, 0.5), glass); rg.position.set(0, 1.44, -2.075); rg.rotation.set(0.07, Math.PI, 0); body.add(rg);
  // front end
  vadd(body, new THREE.BoxGeometry(1.0, 0.3, 0.05), trim, 0, 0.80, 2.15); for (let k = 0; k < 7; k++) vadd(body, new THREE.BoxGeometry(0.035, 0.26, 0.06), vmat(0x2c2e31, 0.4, 0.6), -0.36 + k * 0.12, 0.80, 2.16);
  const hl = [], tl = []; for (const s of [1, -1]) { hl.push(lamp(body, 0.24, 0.2, 0.05, 0xf4f4ee, 0.70 * s, 0.82, 2.14, 0xfff2d0)); tl.push(lamp(body, 0.1, 0.34, 0.04, 0x7a1010, 0.80 * s, 0.86, -2.10, 0xff1a08)); vadd(body, new THREE.BoxGeometry(0.16, 0.06, 0.04), vmat(0xd08020, 0.3), 0.70 * s, 0.66, 2.15); }
  vadd(body, new THREE.BoxGeometry(W + 0.02, 0.2, 0.2), trim, 0, 0.46, 2.1); vadd(body, new THREE.BoxGeometry(W + 0.02, 0.2, 0.18), trim, 0, 0.46, -2.06); vadd(body, new THREE.BoxGeometry(0.5, 0.12, 0.02), vmat(0xe8e8e2, 0.5), 0, 0.62, -2.135);
  for (const s of [1, -1]) {
    vadd(body, new THREE.BoxGeometry(0.05, 0.14, 1.9), trim, (W / 2 + 0.005) * s, 0.36, 0); vadd(body, new THREE.BoxGeometry(0.2, 0.03, 1.5), trim, (W / 2 + 0.06) * s, 0.30, 0);              // sills and steps
    for (const zc of [zf, zr]) { const fl = new THREE.Mesh(new THREE.TorusGeometry(rw + 0.11, 0.045, 6, 18, Math.PI), trim); fl.position.set((W / 2 - 0.01) * s, gy + 0.02, zc); fl.rotation.y = Math.PI / 2; fl.scale.set(1, 1.18, 1.6); body.add(fl); }
    vadd(body, new THREE.BoxGeometry(0.1, 0.13, 0.2), trim, (W / 2 + 0.05) * s, 1.18, 0.72); vtube(body, [(W / 2 - 0.22) * s, 1.83, 0.2], [(W / 2 - 0.22) * s, 1.83, -1.75], 0.02, trim, 6);
    for (const z of [0.42, -0.46]) vadd(body, new THREE.BoxGeometry(0.02, 0.03, 0.14), trim, (W / 2 + 0.002) * s, 1.02, z);
  }
  const spare = makeWheel(rw, 0.25, 0.23, "alloy", false, 0x2a2c2f); spare.rotation.y = Math.PI / 2; spare.position.set(0.1, 1.02, -2.2); body.add(spare);
  // cabin interior
  for (const s of [1, -1]) { vadd(body, new THREE.BoxGeometry(0.5, 0.14, 0.5), inter, 0.38 * s, 0.70, -0.02); vadd(body, new THREE.BoxGeometry(0.48, 0.66, 0.12), inter, 0.38 * s, 1.08, -0.30, 0.16); vadd(body, new THREE.BoxGeometry(0.24, 0.2, 0.1), inter, 0.38 * s, 1.50, -0.37, 0.1); }
  vadd(body, new THREE.BoxGeometry(1.5, 0.14, 0.5), inter, 0, 0.70, -0.98); vadd(body, new THREE.BoxGeometry(1.5, 0.6, 0.12), inter, 0, 1.06, -1.26, 0.16); vadd(body, new THREE.BoxGeometry(W - 0.3, 0.3, 0.34), inter, 0, 1.02, 0.86);
  const sw = new THREE.Group(); sw.position.set(0.38, 1.10, 0.56); sw.rotation.x = -1.12; body.add(sw); const swr = new THREE.Group(); sw.add(swr);
  vadd(swr, new THREE.TorusGeometry(0.18, 0.016, 8, 24), trim); vadd(swr, new THREE.BoxGeometry(0.34, 0.03, 0.012), trim); vadd(swr, new THREE.BoxGeometry(0.03, 0.17, 0.012), trim, 0, -0.085, 0); vtube(sw, [0, 0, 0], [0, 0, -0.3], 0.02, trim, 6);
  const wheels = [], knuckles = [];
  for (const [x, z] of [[tr / 2, zf], [-tr / 2, zf], [tr / 2, zr], [-tr / 2, zr]]) { const k = new THREE.Group(); k.position.set(x, rw, z); G.add(k); const w = makeWheel(rw, 0.27, 0.225, "alloy", false, 0x9a9da1); k.add(w); wheels.push(w); knuckles.push(k); }
  return { group: G, body, steerWheel: swr, wheels, knuckles, seat: [0.38, 0.86, -0.1], wheelCenter: [0.38, 1.10, 0.56], wheelTilt: -1.12, pedals: [0.38, 0.46, 0.62], wheelbase: L, track: tr, rw, lights: hl, tails: tl, type: "car" };
}
const VEHICLES = {
  dirt: { name: "Dirt bike", sub: "450 cc four-stroke", build: buildDirtBike },
  car: { name: "Car", sub: "Four-wheel-drive wagon", build: buildCar },
  quad: { name: "4x4 quad", sub: "700 cc utility ATV", build: buildQuad },
  mtb: { name: "Mountain bike", sub: "29er hardtail", build: buildMtb },
  scoot: { name: "Electric scooter", sub: "Stand-up, 500 W", build: buildScooter },
};
const VEH_ORDER = ["dirt", "car", "quad", "mtb", "scoot"];
