/* ---------- skier: jointed figure posed from the riding state ----------
   Stance, carve angulation, tuck, hockey stop, grabs and the chair seat are all solved from foot and hand targets with two-bone IK. */
const JACKETS = [0xd8362b, 0x1f6fd6, 0xf2b61b, 0x2a9d62, 0x8a4fd1, 0xe86a1c, 0x14181d, 0xe9edf2];
const Y_AXIS = new THREE.Vector3(0, 1, 0);
function buildSkier(jacket = 0) {
  const R = { root: new THREE.Group(), lean: new THREE.Group(), flip: new THREE.Group(), seg: {}, pose: {}, mats: {} };
  R.root.add(R.flip); R.flip.add(R.lean); R.flip.position.y = 0.85; R.lean.position.y = -0.85;
  const mat = (c, o) => worldShade(new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.78 }, o || {})));
  const m = R.mats = { jacket: mat(JACKETS[jacket % JACKETS.length]), pants: mat(0x1b2029), boot: mat(0x101216, { roughness: 0.45 }), glove: mat(0x0d0e10), helmet: mat(0x1c2733, { roughness: 0.3 }), lens: mat(0xff8a2a, { roughness: 0.08, metalness: 0.85 }), skin: mat(0xc98d6b), ski: mat(0x12161c, { roughness: 0.4 }), base: mat(0xe5372c, { roughness: 0.5 }), pole: mat(0x9aa6b2, { roughness: 0.35, metalness: 0.7 }), bind: mat(0x8c939c, { roughness: 0.4, metalness: 0.5 }) };
  const add = (name, geo, material, parent = R.lean) => { const s = new THREE.Mesh(geo, material); s.castShadow = true; s.receiveShadow = true; parent.add(s); R.seg[name] = s; return s; };
  const limb = (name, r, len, material) => { const s = add(name, new THREE.CapsuleGeometry(r, len, 4, 10), material); s.userData.len = len; return s; };
  for (const sd of ["L", "R"]) {
    limb("thigh" + sd, 0.098, 0.4, m.pants); limb("shin" + sd, 0.082, 0.4, m.pants); limb("uarm" + sd, 0.072, 0.27, m.jacket); limb("farm" + sd, 0.06, 0.25, m.jacket);
    add("hand" + sd, new THREE.SphereGeometry(0.064, 10, 8), m.glove);
    const pole = add("pole" + sd, new THREE.CylinderGeometry(0.008, 0.006, 1.18, 6), m.pole); pole.geometry.translate(0, -0.52, 0);
    const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.006, 10), m.glove); bk.position.y = -1.05; pole.add(bk);
    // ski group: boot, binding, ski with an upturned tip and tail
    const g = new THREE.Group(); R.lean.add(g); R.seg["ski" + sd] = g;
    const sh = new THREE.Shape(), hw = 0.056; sh.moveTo(-hw, -0.86); sh.quadraticCurveTo(0, -0.93, hw, -0.86); sh.lineTo(hw * 0.86, 0); sh.lineTo(hw * 1.08, 0.78); sh.quadraticCurveTo(0, 0.96, -hw * 1.08, 0.78); sh.lineTo(-hw * 0.86, 0); sh.closePath();
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: false, curveSegments: 8, steps: 1 }); sg.rotateX(Math.PI / 2); // length runs along z, top face up
    const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), t = Math.max(0, (Math.abs(z) - 0.6) / 0.33); p.setY(i, p.getY(i) + 0.014 + t * t * (z > 0 ? 0.075 : 0.045)); } sg.computeVertexNormals();
    const ski = new THREE.Mesh(sg, [m.base, m.ski]); ski.castShadow = true; g.add(ski);
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.34), m.bind); bd.position.set(0, 0.03, -0.02); g.add(bd);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.11, 0.3), m.boot); boot.position.set(0, 0.1, -0.01); boot.castShadow = true; g.add(boot);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.058, 0.2, 10), m.boot); cuff.position.set(0, 0.24, -0.05); cuff.rotation.x = 0.22; cuff.castShadow = true; g.add(cuff);
  }
  add("pelvis", new THREE.CapsuleGeometry(0.125, 0.14, 4, 12), m.pants).rotation.z = Math.PI / 2;
  const torso = add("torso", new THREE.CapsuleGeometry(0.19, 0.3, 6, 14), m.jacket); torso.scale.set(1.14, 1, 0.84);
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.215, 0.2, 14), m.jacket); hem.position.y = -0.27; hem.castShadow = true; torso.add(hem);
  const headG = new THREE.Group(); R.lean.add(headG); R.seg.head = headG;
  const hm = (geo, material, x, y, z) => { const s = new THREE.Mesh(geo, material); s.position.set(x, y, z); s.castShadow = true; headG.add(s); return s; };
  hm(new THREE.SphereGeometry(0.098, 14, 10), m.skin, 0, 0, 0.012); hm(new THREE.SphereGeometry(0.122, 16, 12, 0, TAU, 0, 1.9), m.helmet, 0, 0.012, -0.004);
  const gog = hm(new THREE.SphereGeometry(0.108, 14, 8, Math.PI / 2 - 0.95, 1.9, 1.18, 0.5), m.lens, 0, 0.004, 0.02);
  hm(new THREE.CylinderGeometry(0.058, 0.07, 0.1, 10), m.jacket, 0, -0.13, 0);
  return R;
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _q = new THREE.Quaternion();
function placeSeg(s, a, b) { _d.subVectors(b, a); const l = _d.length() || 1e-4; s.position.addVectors(a, b).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(Y_AXIS, _d.multiplyScalar(1 / l)); s.scale.y = l / (s.userData.len + 0.1); }
function ik(root, tip, l1, l2, bend, out) { // joint between root and tip, bent toward `bend`
  _d.subVectors(tip, root); let d = _d.length(); const mx = (l1 + l2) * 0.999; if (d > mx) { tip.copy(root).addScaledVector(_d, mx / d); _d.multiplyScalar(mx / d); d = mx; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  _e.copy(bend).addScaledVector(_d, -bend.dot(_d) / (d * d)).normalize();
  return out.copy(root).addScaledVector(_d, a / d).addScaledVector(_e, h);
}
const GRABS = { tail: 1, nose: 2, indy: 3, japan: 4, safety: 5 };
const _hip = [new THREE.Vector3(), new THREE.Vector3()], _foot = [new THREE.Vector3(), new THREE.Vector3()], _knee = new THREE.Vector3(), _sh = [new THREE.Vector3(), new THREE.Vector3()], _hand = [new THREE.Vector3(), new THREE.Vector3()], _el = new THREE.Vector3(), _bend = new THREE.Vector3(), _chest = new THREE.Vector3(), _pel = new THREE.Vector3();
/* st: { turn, carve, tuck, crouch, air, grab, brake, sp, seated, crashed, push, sw } */
function poseSkier(R, st, dt, time) {
  const p = R.pose, k = 1 - Math.exp(-(st.air ? 10 : 8) * dt), ez = (n, v, kk = k) => (p[n] = (p[n] === undefined ? v : p[n] + (v - p[n]) * kk));
  const turn = ez("turn", clamp(st.turn, -1, 1), 1 - Math.exp(-5 * dt)), carve = ez("carve", st.carve * Math.abs(turn)), tuck = ez("tuck", st.tuck ? 1 : 0), crouch = ez("crouch", st.crouch || 0, 1 - Math.exp(-14 * dt));
  const air = ez("air", st.air ? 1 : 0), seat = ez("seat", st.seated ? 1 : 0, 1 - Math.exp(-6 * dt)), brake = ez("brake", st.brake || 0), sp = clamp(st.sp / 22, 0, 1.4), gk = st.air ? (GRABS[st.grab] || 0) : 0, grab = ez("grab", gk ? 1 : 0, 1 - Math.exp(-11 * dt)); if (gk) p.gk = gk;
  const push = ez("push", st.push ? 1 : 0), ph = time * 5.2, idle = Math.sin(time * 1.7) * 0.006;
  const side = turn > 0 ? 1 : -1, G = p.gk || 0, tail = grab * (G === 1 ? 1 : 0), nose = grab * (G === 2 ? 1 : 0), indy = grab * (G === 3 ? 1 : 0), japan = grab * (G === 4 ? 1 : 0), safety = grab * (G === 5 ? 1 : 0);
  // hips: lower in a tuck or crouch, dropped to the inside of a carve, pulled up toward the skis in the air
  let hipY = 0.80 - 0.22 * tuck - 0.20 * crouch - 0.07 * carve - 0.05 * brake - air * (0.10 + 0.14 * grab) + idle - 0.03 * sp, hipZ = -0.06 - 0.05 * tuck + 0.04 * brake, hipX = -turn * carve * 0.11;
  let lean = 0.30 + 0.72 * tuck + 0.28 * crouch + 0.10 * carve + air * 0.12 + 0.25 * grab * (nose ? 1.6 : 1) - 0.12 * tail, twist = -turn * carve * 0.26 + japan * 0.55 - indy * 0.3;
  if (seat > 0.01) { hipY = lerp(hipY, 0.50, seat); hipZ = lerp(hipZ, -0.42, seat); hipX = lerp(hipX, 0, seat); lean = lerp(lean, -0.12, seat); twist *= 1 - seat; }
  _pel.set(hipX, hipY, hipZ);
  const cs = Math.cos(lean), sn = Math.sin(lean);
  _chest.set(hipX + turn * carve * 0.05, hipY + 0.47 * cs, hipZ + 0.47 * sn);
  // feet and skis
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, inside = sx === side ? Math.abs(turn) * carve : 0, g = R.seg[i ? "skiR" : "skiL"];
    let fx = sx * (0.155 + 0.03 * tuck + 0.02 * brake), fy = 0.0 + inside * 0.012, fz = inside * 0.13 - (carve - inside) * 0.03 + push * 0.16 * Math.sin(ph + i * Math.PI), pit = 0, yaw = 0, roll = 0;
    if (air > 0.01) { fy += air * (0.05 + 0.10 * grab); pit += air * (-0.10 - 0.42 * tail + 0.34 * nose - 0.1 * safety); yaw += air * (japan * (i ? 0.1 : 0.55) - indy * (i ? 0.12 : -0.05)); fx += air * japan * (i ? -0.02 : 0.05); fz += air * (tail * 0.06 - nose * 0.06 + japan * (i ? 0.1 : -0.16)); roll += air * (safety * sx * 0.2 + indy * 0.18); }
    if (seat > 0.01) { fx = lerp(fx, sx * 0.14, seat); fy = lerp(fy, -0.02, seat); fz = lerp(fz, 0.16, seat); pit = lerp(pit, -0.14 + 0.03 * Math.sin(time * 0.9 + i), seat); }
    if (push > 0.01) yaw += push * sx * -0.22 * Math.max(0, Math.sin(ph + i * Math.PI));
    g.position.set(fx, fy, fz); g.rotation.set(pit, yaw, roll, "YXZ");
    _foot[i].set(fx, fy + 0.3, fz - 0.05 - pit * 0.2); _hip[i].set(hipX + sx * 0.1, hipY, hipZ);
    _bend.set(sx * (0.12 - 0.1 * tuck) - turn * carve * 0.25, 0.1, 1); ik(_hip[i], _foot[i], 0.47, 0.47, _bend, _knee);
    placeSeg(R.seg[i ? "thighR" : "thighL"], _hip[i], _knee); placeSeg(R.seg[i ? "shinR" : "shinL"], _knee, _foot[i]);
  }
  R.seg.pelvis.position.copy(_pel); R.seg.pelvis.position.y += 0.03;
  // torso
  const T = R.seg.torso; T.position.set((_pel.x + _chest.x) / 2, (_pel.y + _chest.y) / 2 + 0.04, (_pel.z + _chest.z) / 2); T.rotation.set(lean, twist, turn * carve * 0.14, "YXZ");
  const hd = R.seg.head; hd.position.set(_chest.x, _chest.y + 0.21 * Math.max(0.35, cs) + 0.02, _chest.z + 0.21 * sn * 0.75);
  hd.rotation.set(lean * 0.25 - 0.38 * tuck + 0.1 * seat, ez("headY", -turn * 0.45 * (1 - air) + japan * 0.3), 0, "YXZ");
  // arms: hands lead the turn, fold in for the tuck, reach for the ski in a grab
  const ct = Math.cos(twist), stw = Math.sin(twist);
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, out = sx === -side ? Math.abs(turn) * carve : 0, sd = i ? "R" : "L", g = R.seg["ski" + sd].position;
    const shx = sx * 0.225, shz = -0.02; _sh[i].set(_chest.x + shx * ct + shz * stw, _chest.y - 0.05 - Math.abs(sx * turn * carve) * 0.02 * (sx === side ? 1 : -1), _chest.z - shx * stw + shz * ct);
    let hx = sx * (0.36 + 0.08 * out + 0.1 * air * (1 - grab)), hy = hipY + 0.16 + 0.06 * out + 0.14 * air * (1 - grab) + 0.05 * brake, hz = hipZ + 0.36 + 0.08 * out - 0.05 * sp;
    if (tuck > 0.01) { hx = lerp(hx, sx * 0.11, tuck); hy = lerp(hy, _chest.y + 0.02, tuck); hz = lerp(hz, _chest.z + 0.33, tuck); }
    if (push > 0.01) { const w = Math.sin(ph + (i ? 0 : Math.PI)); hy += push * 0.1 * w; hz += push * 0.22 * w; }
    let poleP = 1.05 + 0.5 * tuck + 0.25 * sp - 0.2 * out, poleR = sx * (0.22 - 0.1 * tuck);
    const gh = (w, tx, ty, tz) => { if (w > 0.01) { hx = lerp(hx, tx, w); hy = lerp(hy, ty, w); hz = lerp(hz, tz, w); } };
    if (i === 1) { gh(tail, g.x + 0.02, g.y + 0.34, g.z - 0.6); gh(indy, g.x + 0.07, g.y + 0.12, g.z + 0.1); gh(safety, g.x + 0.07, g.y + 0.1, g.z - 0.05); }
    else { gh(nose, g.x - 0.02, g.y + 0.36, g.z + 0.62); gh(japan, g.x - 0.03, g.y + 0.14, g.z - 0.24); }
    if (seat > 0.01) { hx = lerp(hx, sx * 0.17, seat); hy = lerp(hy, hipY + 0.14, seat); hz = lerp(hz, hipZ + 0.3, seat); poleP = lerp(poleP, 1.5, seat); }
    _hand[i].set(hx, hy, hz); _bend.set(sx * 0.55, -0.75, -0.45); ik(_sh[i], _hand[i], 0.32, 0.31, _bend, _el);
    placeSeg(R.seg["uarm" + sd], _sh[i], _el); placeSeg(R.seg["farm" + sd], _el, _hand[i]); R.seg["hand" + sd].position.copy(_hand[i]);
    const pl = R.seg["pole" + sd]; pl.position.copy(_hand[i]); pl.rotation.set(poleP * (1 - 0.5 * air) + air * 0.9, 0, poleR, "YXZ");
  }
}
