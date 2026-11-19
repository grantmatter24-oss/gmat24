/* ---------- the rider: one skinned body (so joints bend like cloth over limbs, not like hinged boxes) with rigid head, hands and boots ---------- */
const RB = {   // joints in the bind pose: standing, arms at the sides. x is the rider's left, z is forward.
  pelvis: [0, 0.95, 0], spine1: [0, 1.07, 0], spine2: [0, 1.24, 0], neck: [0, 1.47, 0], head: [0, 1.57, 0.01],
  armL: [0.2, 1.42, 0], foreL: [0.2, 1.13, 0], handL: [0.2, 0.87, 0], armR: [-0.2, 1.42, 0], foreR: [-0.2, 1.13, 0], handR: [-0.2, 0.87, 0],
  thighL: [0.095, 0.92, 0], shinL: [0.095, 0.49, 0], footL: [0.095, 0.075, 0], thighR: [-0.095, 0.92, 0], shinR: [-0.095, 0.49, 0], footR: [-0.095, 0.075, 0],
};
const RPAR = { pelvis: null, spine1: "pelvis", spine2: "spine1", neck: "spine2", head: "neck", armL: "spine2", foreL: "armL", handL: "foreL", armR: "spine2", foreR: "armR", handR: "foreR", thighL: "pelvis", shinL: "thighL", footL: "shinL", thighR: "pelvis", shinR: "thighR", footR: "shinR" };
const RNAMES = Object.keys(RB), UPPER = 0.29, FORE = 0.26, THIGH = 0.43, SHIN = 0.415;
const OUTFITS = {
  dirt: { top: [0.78, 0.10, 0.08], top2: [0.92, 0.92, 0.90], legs: [0.07, 0.07, 0.08], glove: [0.05, 0.05, 0.05], boot: [0.06, 0.06, 0.06], helmet: "mx", shell: 0xe8e8e4, accent: 0xc8201a, shorts: false, pack: false, bootH: 0.3 },
  quad: { top: [0.10, 0.22, 0.48], top2: [0.85, 0.85, 0.85], legs: [0.12, 0.12, 0.13], glove: [0.05, 0.05, 0.05], boot: [0.08, 0.07, 0.06], helmet: "mx", shell: 0x15171a, accent: 0x2f7fd0, shorts: false, pack: false, bootH: 0.26 },
  mtb: { top: [0.16, 0.40, 0.36], top2: [0.10, 0.10, 0.11], legs: [0.09, 0.09, 0.10], glove: [0.07, 0.07, 0.07], boot: [0.10, 0.10, 0.11], helmet: "half", shell: 0x202326, accent: 0x202326, shorts: true, pack: true, bootH: 0 },
  scoot: { top: [0.22, 0.24, 0.28], top2: [0.22, 0.24, 0.28], legs: [0.13, 0.19, 0.30], glove: null, boot: [0.16, 0.17, 0.19], helmet: "half", shell: 0xd8d8d2, accent: 0xd8d8d2, shorts: false, pack: true, bootH: 0 },
  car: { top: [0.62, 0.64, 0.66], top2: [0.62, 0.64, 0.66], legs: [0.12, 0.15, 0.22], glove: null, boot: [0.25, 0.18, 0.12], helmet: "none", shell: 0, accent: 0, shorts: false, pack: false, bootH: 0 },
};
const SKIN = [0.62, 0.42, 0.31];
function makeRider(type) {
  const O = OUTFITS[type] || OUTFITS.dirt, bones = {}, list = [];
  for (const n of RNAMES) { const b = new THREE.Bone(); b.name = n; bones[n] = b; list.push(b); }
  for (const n of RNAMES) { const p = RPAR[n], a = RB[n], q = p ? RB[p] : [0, 0, 0]; bones[n].position.set(a[0] - q[0], a[1] - q[1], a[2] - q[2]); if (p) bones[p].add(bones[n]); }
  const SEG = 12, pos = [], col = [], si = [], sw = [], uv = [], idx = []; const bi = n => RNAMES.indexOf(n);
  // a tube of elliptical rings; each ring: [x, y, z, rx, rz, boneA, boneB, weightA, colour]
  const tube = (rings, capTop, capBot, fat = 1) => {
    const base = pos.length / 3; if (fat !== 1) rings = rings.map(r => { const q = r.slice(); q[3] *= fat; q[4] *= fat; return q; });
    rings.forEach((r, k) => { for (let s = 0; s < SEG; s++) { const a = s / SEG * TAU; pos.push(r[0] + Math.cos(a) * r[3], r[1], r[2] + Math.sin(a) * r[4]); col.push(r[8][0], r[8][1], r[8][2]); si.push(bi(r[5]), bi(r[6]), 0, 0); sw.push(r[7], 1 - r[7], 0, 0); uv.push(s / SEG * 3, r[1] * 6); } });
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < SEG; s++) { const a = base + k * SEG + s, b = base + k * SEG + (s + 1) % SEG, c = a + SEG, d = b + SEG; idx.push(a, b, c, c, b, d); }
    for (const [on, k, flip] of [[capTop, 0, false], [capBot, rings.length - 1, true]]) { if (!on) continue; const r = rings[k], c = pos.length / 3; pos.push(r[0], r[1], r[2]); col.push(r[8][0], r[8][1], r[8][2]); si.push(bi(r[5]), bi(r[6]), 0, 0); sw.push(r[7], 1 - r[7], 0, 0); uv.push(0, 0);
      for (let s = 0; s < SEG; s++) { const a = base + k * SEG + s, b = base + k * SEG + (s + 1) % SEG; if (flip) idx.push(c, a, b); else idx.push(c, b, a); } }
  };
  const T = O.top, T2 = O.top2, Lg = O.legs, sk = SKIN;
  tube([[0, 1.565, 0.012, 0.050, 0.054, "head", "neck", 0.6, sk], [0, 1.50, 0.008, 0.054, 0.058, "neck", "neck", 1, sk], [0, 1.468, 0, 0.085, 0.078, "neck", "spine2", 0.5, T], [0, 1.435, 0, 0.185, 0.098, "spine2", "spine2", 1, T], [0, 1.37, 0.004, 0.182, 0.118, "spine2", "spine2", 1, T],
    [0, 1.27, 0.008, 0.170, 0.116, "spine2", "spine1", 0.6, T2], [0, 1.17, 0.006, 0.150, 0.102, "spine1", "spine1", 1, T], [0, 1.08, 0.004, 0.146, 0.098, "spine1", "pelvis", 0.5, T], [0, 1.0, 0, 0.160, 0.104, "pelvis", "pelvis", 1, Lg], [0, 0.93, 0, 0.172, 0.108, "pelvis", "pelvis", 1, Lg], [0, 0.865, 0, 0.09, 0.085, "pelvis", "pelvis", 1, Lg]], false, true, 1.06);
  for (const s of [1, -1]) {
    const A = s > 0 ? "armL" : "armR", F = s > 0 ? "foreL" : "foreR", Hn = s > 0 ? "handL" : "handR", x = 0.2 * s, gl = O.glove || sk, slv = type === "car" || type === "mtb" ? sk : T;
    tube([[x, 1.47, 0, 0.03, 0.035, "spine2", A, 0.5, T], [x + 0.012 * s, 1.445, 0, 0.058, 0.060, A, "spine2", 0.6, T], [x + 0.012 * s, 1.40, 0, 0.056, 0.060, A, A, 1, T], [x + 0.01 * s, 1.30, 0, 0.050, 0.054, A, A, 1, T], [x, 1.19, 0, 0.044, 0.046, A, A, 1, slv],
      [x, 1.15, 0, 0.041, 0.043, A, F, 0.7, slv], [x, 1.13, 0, 0.040, 0.042, A, F, 0.5, slv], [x, 1.11, 0, 0.041, 0.043, A, F, 0.3, slv], [x, 1.04, 0, 0.042, 0.044, F, F, 1, slv], [x, 0.94, 0, 0.034, 0.036, F, F, 1, slv], [x, 0.885, 0, 0.029, 0.031, F, Hn, 0.6, gl], [x, 0.86, 0, 0.027, 0.03, Hn, Hn, 1, gl]], true, true, 1.14);
    const Th = s > 0 ? "thighL" : "thighR", Sh = s > 0 ? "shinL" : "shinR", Ft = s > 0 ? "footL" : "footR", lx = 0.095 * s, low = O.shorts ? sk : Lg, bt = O.bootH > 0 ? O.boot : low;
    tube([[lx, 0.985, 0, 0.082, 0.092, "pelvis", Th, 0.7, Lg], [lx, 0.93, 0, 0.088, 0.098, Th, "pelvis", 0.55, Lg], [lx, 0.86, 0, 0.086, 0.096, Th, Th, 1, Lg], [lx, 0.74, 0, 0.076, 0.084, Th, Th, 1, Lg], [lx, 0.62, 0, 0.064, 0.070, Th, Th, 1, Lg], [lx, 0.545, 0, 0.058, 0.062, Th, Sh, 0.75, O.shorts ? [0.05, 0.05, 0.05] : Lg],
      [lx, 0.49, 0.004, 0.056, 0.060, Th, Sh, 0.5, O.shorts ? [0.05, 0.05, 0.05] : Lg], [lx, 0.44, 0, 0.054, 0.058, Th, Sh, 0.25, O.shorts ? [0.05, 0.05, 0.05] : Lg], [lx, 0.36, -0.006, 0.056, 0.062, Sh, Sh, 1, O.bootH > 0.28 ? bt : low], [lx, 0.25, -0.004, 0.048, 0.052, Sh, Sh, 1, bt], [lx, 0.14, 0, 0.038, 0.042, Sh, Sh, 1, bt], [lx, 0.09, 0, 0.036, 0.04, Sh, Ft, 0.5, O.boot]], true, true, 1.13);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, bumpMap: riderCloth(), bumpScale: 0.6 });
  const body = new THREE.SkinnedMesh(g, mat); body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
  const root = new THREE.Group(); root.add(bones.pelvis); root.add(body); root.updateMatrixWorld(true); body.bind(new THREE.Skeleton(list));
  const M = (geo, c, o = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o))); m.castShadow = true; return m; };
  const rgb = a => new THREE.Color(a[0], a[1], a[2]);
  // head
  const head = new THREE.Group(); bones.head.add(head);
  if (O.helmet !== "mx") {
    const skull = M(new THREE.SphereGeometry(1, 20, 16), rgb(sk), { roughness: 0.7 }); skull.scale.set(0.088, 0.115, 0.102); skull.position.set(0, 0.105, 0.012); head.add(skull);
    const jaw = M(new THREE.SphereGeometry(1, 14, 10), rgb(sk), { roughness: 0.7 }); jaw.scale.set(0.068, 0.062, 0.07); jaw.position.set(0, 0.042, 0.038); head.add(jaw);
    const nose = M(new THREE.ConeGeometry(0.014, 0.04, 6), rgb(sk), { roughness: 0.7 }); nose.position.set(0, 0.085, 0.112); nose.rotation.x = 1.25; head.add(nose);
    for (const s of [1, -1]) { const ear = M(new THREE.SphereGeometry(1, 8, 6), rgb(sk), { roughness: 0.7 }); ear.scale.set(0.012, 0.03, 0.018); ear.position.set(0.088 * s, 0.09, 0.0); head.add(ear); }
    const hair = M(new THREE.SphereGeometry(1, 18, 12, 0, TAU, 0, 1.75), 0x2a1f16, { roughness: 0.95 }); hair.scale.set(0.092, 0.118, 0.108); hair.position.set(0, 0.112, 0.002); hair.rotation.x = -0.42; head.add(hair);
    const sg = M(new THREE.BoxGeometry(0.148, 0.036, 0.03), 0x0b0c0e, { roughness: 0.12, metalness: 0.4 }); sg.position.set(0, 0.112, 0.094); head.add(sg);
  }
  if (O.helmet === "mx") {
    const shell = M(new THREE.SphereGeometry(0.138, 26, 18), O.shell, { roughness: 0.28, metalness: 0.05 }); shell.scale.set(1, 1.03, 1.14); shell.position.set(0, 0.118, 0.0); head.add(shell);
    const chin = M(new THREE.TorusGeometry(0.112, 0.042, 10, 20, Math.PI), O.shell, { roughness: 0.28 }); chin.rotation.set(Math.PI / 2 + 0.12, 0, Math.PI); chin.scale.set(1.0, 1.25, 0.9); chin.position.set(0, 0.03, 0.03); head.add(chin);
    const stripe = M(new THREE.SphereGeometry(0.1395, 26, 18, -0.28, 0.56), O.accent, { roughness: 0.3 }); stripe.scale.set(1, 1.035, 1.145); stripe.rotation.y = Math.PI / 2; stripe.position.copy(shell.position); head.add(stripe);
    const peak = M(new THREE.BoxGeometry(0.17, 0.012, 0.16), O.accent, { roughness: 0.35 }); peak.position.set(0, 0.215, 0.165); peak.rotation.x = -0.22; head.add(peak);
    const gog = M(new THREE.SphereGeometry(0.128, 20, 8, Math.PI / 2 - 0.75, 1.5, 1.22, 0.42), 0x0a0c10, { roughness: 0.05, metalness: 0.7 }); gog.scale.set(1, 1, 1.2); gog.position.set(0, 0.118, 0.012); head.add(gog);
    const strap = M(new THREE.TorusGeometry(0.139, 0.014, 6, 28), 0x111111, { roughness: 0.8 }); strap.rotation.x = Math.PI / 2; strap.scale.set(1, 1.14, 1); strap.position.set(0, 0.105, 0.0); head.add(strap);
  } else if (O.helmet === "half") {
    const shell = M(new THREE.SphereGeometry(0.112, 22, 12, 0, TAU, 0, 1.52), O.shell, { roughness: 0.35 }); shell.scale.set(1, 1.02, 1.18); shell.position.set(0, 0.124, 0.004); shell.rotation.x = -0.14; head.add(shell);
    const vis = M(new THREE.BoxGeometry(0.13, 0.008, 0.06), O.shell, { roughness: 0.4 }); vis.position.set(0, 0.152, 0.136); vis.rotation.x = 0.1; head.add(vis);
    for (let k = -2; k <= 2; k++) { const v = M(new THREE.BoxGeometry(0.014, 0.012, 0.15), 0x050505, { roughness: 0.9 }); v.position.set(k * 0.036, 0.232 - Math.abs(k) * 0.012, 0.0); head.add(v); }
  }
  // hands: closed around a grip
  for (const s of [1, -1]) {
    const hb = bones[s > 0 ? "handL" : "handR"], c = rgb(O.glove || sk), fist = M(new THREE.SphereGeometry(1, 12, 10), c, { roughness: 0.8 }); fist.scale.set(0.036, 0.05, 0.046); fist.position.set(0, -0.055, 0.008); hb.add(fist);
    const th = M(new THREE.CapsuleGeometry(0.013, 0.035, 3, 6), c, { roughness: 0.8 }); th.position.set(-0.02 * s, -0.05, 0.04); th.rotation.x = 1.1; hb.add(th);
  }
  // boots or shoes
  for (const s of [1, -1]) {
    const fb = bones[s > 0 ? "footL" : "footR"], sh = new THREE.Shape(); const tall = O.bootH > 0;
    sh.moveTo(-0.075, -0.075); sh.lineTo(0.165, -0.075); sh.quadraticCurveTo(0.2, -0.07, 0.195, -0.035); sh.quadraticCurveTo(0.17, 0.0, 0.09, 0.02); sh.lineTo(0.05, tall ? 0.09 : 0.03); sh.lineTo(-0.065, tall ? 0.09 : 0.03); sh.lineTo(-0.085, -0.03); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, steps: 1 }); geo.translate(0, 0, -0.035); geo.rotateY(-Math.PI / 2); if (!tall) geo.scale(0.9, 0.86, 0.84);
    fb.add(M(geo, rgb(O.boot), { roughness: 0.7 })); const sole = M(new THREE.BoxGeometry(tall ? 0.094 : 0.085, 0.016, tall ? 0.275 : 0.232), tall ? 0x0a0a0a : 0xdedcd4, { roughness: 0.95 }); sole.position.set(0, tall ? -0.078 : -0.068, tall ? 0.045 : 0.038); fb.add(sole);
  }
  if (O.pack) { const pk = M(new THREE.CapsuleGeometry(0.085, 0.2, 4, 10), 0x16181b, { roughness: 0.9 }); pk.scale.set(1.25, 1, 0.62); pk.position.set(0, 0.08, -0.15); bones.spine2.add(pk); }
  root.traverse(o => { o.frustumCulled = false; });
  return { root, bones, body, head, type, s: { stand: 0, leanB: 0, pitchB: 0, look: 0, crank: 0, footDown: 0, bob: 0, vy: 0 } };
}
let _cloth = null;
function riderCloth() { if (!_cloth) _cloth = canvasTex(128, (g, s) => { const im = g.createImageData(s, s), r = rng(6); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const v = 128 + 40 * (vnoise(x * 0.11, y * 0.05, 2) - 0.5) + 26 * Math.sin(x * 1.9) * Math.sin(y * 1.9) + (r() - 0.5) * 22, k = (y * s + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = 255; } g.putImageData(im, 0, 0); }, true, false); return _cloth; }

/* ---------- posing: the spine is placed directly, arms and legs are solved to reach the bars, pegs, pedals or the ground ---------- */
const _ik = { x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), m: new THREE.Matrix4(), d: new THREE.Vector3(), p: new THREE.Vector3(), mid: new THREE.Vector3(), q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), inv: new THREE.Quaternion(), t: new THREE.Vector3() };
function aimQuat(out, dir, fwd) {   // bone's -Y along dir, its +Z as near fwd as it can be
  _ik.y.copy(dir).negate().normalize(); _ik.x.crossVectors(_ik.y, fwd); if (_ik.x.lengthSq() < 1e-6) _ik.x.set(1, 0, 0); _ik.x.normalize(); _ik.z.crossVectors(_ik.x, _ik.y);
  return out.setFromRotationMatrix(_ik.m.makeBasis(_ik.x, _ik.y, _ik.z));
}
/* Two-bone reach from joint A to target T. Returns the world quaternions of the upper and lower bone. */
function solveLimb(A, T, l1, l2, pole, fwdSign, qU, qL) {
  _ik.d.subVectors(T, A); let d = _ik.d.length(); const dmax = (l1 + l2) * 0.999, dmin = Math.abs(l1 - l2) + 0.02; if (d > dmax) { _ik.d.multiplyScalar(dmax / d); d = dmax; } else if (d < dmin) { _ik.d.multiplyScalar(dmin / (d + 1e-6)); d = dmin; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)); _ik.d.multiplyScalar(1 / d);
  _ik.p.copy(pole).addScaledVector(_ik.d, -pole.dot(_ik.d)); if (_ik.p.lengthSq() < 1e-6) _ik.p.set(0, 0, 1); _ik.p.normalize();
  _ik.mid.copy(A).addScaledVector(_ik.d, a).addScaledVector(_ik.p, h);
  _ik.t.copy(_ik.p).multiplyScalar(fwdSign);
  aimQuat(qU, _ik.z.subVectors(_ik.mid, A), _ik.t); _ik.z.copy(A).addScaledVector(_ik.d, d).sub(_ik.mid); aimQuat(qL, _ik.z, _ik.t);
}
const _pz = { pq: new THREE.Quaternion(), s1: new THREE.Quaternion(), s2: new THREE.Quaternion(), nq: new THREE.Quaternion(), hq: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, "YXZ"), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), qc: new THREE.Quaternion(),
  pos: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), sh: new THREE.Vector3(), hip: new THREE.Vector3(), pole: new THREE.Vector3(), off: new THREE.Vector3(), tq: new THREE.Quaternion() };
/* P: { pelvis: Vector3, pitch (torso lean forward, rad), roll, yaw, curl (spine rounding), headYaw, headPitch,
        hands: [L, R] Vector3, handQ: Quaternion, feet: [L, R] Vector3, footQ: [L, R] Quaternion, elbowOut, kneeOut } all in the vehicle's own frame */
function poseRider(R, P) {
  const B = R.bones, z = _pz;
  if (P.pelvisQ) z.pq.copy(P.pelvisQ); else z.pq.setFromEuler(z.e.set(P.pitch * 0.55, P.yaw || 0, P.roll || 0)); B.pelvis.position.copy(P.pelvis); B.pelvis.quaternion.copy(z.pq);
  z.qa.setFromEuler(z.e.set(P.pitch * 0.25 + P.curl * 0.5, 0, (P.roll2 || 0) * 0.5)); B.spine1.quaternion.copy(z.qa); z.s1.multiplyQuaternions(z.pq, z.qa);
  z.qb.setFromEuler(z.e.set(P.pitch * 0.2 + P.curl * 0.5, (P.twist || 0), (P.roll2 || 0) * 0.5)); B.spine2.quaternion.copy(z.qb); z.s2.multiplyQuaternions(z.s1, z.qb);
  // head: undo most of the torso lean so the eyes stay on the horizon, then look where the rider is going
  z.nq.setFromEuler(z.e.set(-P.pitch * 0.42 - P.curl * 0.5 + (P.headPitch || 0) * 0.5, (P.headYaw || 0) * 0.45, -(P.roll || 0) * 0.5)); B.neck.quaternion.copy(z.nq);
  z.hq.setFromEuler(z.e.set(-P.pitch * 0.42 - P.curl * 0.4 + (P.headPitch || 0) * 0.5, (P.headYaw || 0) * 0.55, -(P.roll || 0) * 0.5 - (P.roll2 || 0))); B.head.quaternion.copy(z.hq);
  z.p1.set(0, 0.12, 0).applyQuaternion(z.pq).add(P.pelvis); z.p2.set(0, 0.17, 0).applyQuaternion(z.s1).add(z.p1);
  for (let s = 0; s < 2; s++) {
    const sg = s === 0 ? 1 : -1, A = B[s ? "armR" : "armL"], F = B[s ? "foreR" : "foreL"], Hd = B[s ? "handR" : "handL"];
    z.sh.set(0.2 * sg, 0.18, 0).applyQuaternion(z.s2).add(z.p2); z.pole.set(sg * (P.elbowOut === undefined ? 0.8 : P.elbowOut), -0.55, -0.6); if (P.pelvisQ) z.pole.applyQuaternion(z.pq);
    z.off.set(0, 0.075, 0).applyQuaternion(P.handQ ? P.handQ[s] : z.s2); z.pos.copy(P.hands[s]).add(z.off);   // the wrist sits a little behind the grip
    solveLimb(z.sh, z.pos, UPPER, FORE, z.pole, -1, _ik.q1, _ik.q2);
    A.quaternion.copy(z.tq.copy(z.s2).invert()).multiply(_ik.q1); F.quaternion.copy(z.tq.copy(_ik.q1).invert()).multiply(_ik.q2);
    if (P.handQ) Hd.quaternion.copy(z.tq.copy(_ik.q2).invert()).multiply(P.handQ[s]); else Hd.quaternion.identity();
    const Th = B[s ? "thighR" : "thighL"], Sh = B[s ? "shinR" : "shinL"], Ft = B[s ? "footR" : "footL"];
    z.hip.set(0.095 * sg, -0.03, 0).applyQuaternion(z.pq).add(P.pelvis); z.pole.set(sg * (P.kneeOut === undefined ? 0.25 : P.kneeOut), 0.25, 1); if (P.pelvisQ) z.pole.applyQuaternion(z.pq);
    z.off.set(0, 0.075, -0.02).applyQuaternion(P.footQ[s]); z.pos.copy(P.feet[s]).add(z.off);                 // the ankle sits above the sole
    solveLimb(z.hip, z.pos, THIGH, SHIN, z.pole, 1, _ik.q1, _ik.q2);
    Th.quaternion.copy(z.tq.copy(z.pq).invert()).multiply(_ik.q1); Sh.quaternion.copy(z.tq.copy(_ik.q1).invert()).multiply(_ik.q2); Ft.quaternion.copy(z.tq.copy(_ik.q2).invert()).multiply(P.footQ[s]);
  }
}
