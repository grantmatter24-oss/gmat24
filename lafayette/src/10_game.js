/* ---------- putting a machine and its rider on screen ---------- */
const _g = { q: new THREE.Quaternion(), q2: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, "YXZ"), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), m: new THREE.Matrix4(), inv: new THREE.Matrix4() };
const POSE = { pelvis: new THREE.Vector3(), hands: [new THREE.Vector3(), new THREE.Vector3()], feet: [new THREE.Vector3(), new THREE.Vector3()], handQ: [new THREE.Quaternion(), new THREE.Quaternion()], footQ: [new THREE.Quaternion(), new THREE.Quaternion()], pelvisQ: null };
function gripPoint(M, side, steer, out) {   // where a hand grip is, in the machine's frame
  const g = M.grip, x = g[0] * side, c = Math.cos(steer), s = Math.sin(steer), rx = x * c + g[2] * s, rz = -x * s + g[2] * c, a = -M.rake, ca = Math.cos(a), sa = Math.sin(a);
  return out.set(M.head[0] + rx, M.head[1] + g[1] * ca - rz * sa, M.head[2] + g[1] * sa + rz * ca);
}
function syncVehicle(v, dt, time) {
  const S = v.S, M = v.model, G0 = M.group, type = v.type, R = v.rider, rs = R.s;
  if (S.four) {
    G0.quaternion.copy(v.q); _g.a.set(0, -S.cg, 0).applyQuaternion(v.q); G0.position.copy(v.p).add(_g.a);
    for (let i = 0; i < 4; i++) { M.knuckles[i].position.y = S.rw - S.sag + v.comp[i]; M.knuckles[i].rotation.y = i < 2 ? v.steer : 0; M.wheels[i].rotation.x = v.spin[i]; }
    if (M.steerWheel) M.steerWheel.rotation.z = v.steer * 5.5; else M.steer.rotation.y = v.steer;
  } else {
    const lean = v.phi + (v.crash > 0 ? 0 : rs.footDown * 0.10);
    _g.e.set(-v.th, v.psi, -lean, "YXZ"); G0.quaternion.setFromEuler(_g.e);
    _g.q.setFromEuler(_g.e.set(-v.th, v.psi, 0, "YXZ")); _g.a.set(0, -S.cg, S.L / 2 - S.b).applyQuaternion(_g.q); G0.position.copy(v.p).add(_g.a);
    M.steer.rotation.y = v.steer * (type === "dirt" ? 1 : 1);
    if (M.fork) M.fork.position.y = (v.comp[0] - S.sagF) / Math.cos(M.rake);
    if (M.swing) M.swing.rotation.x = Math.asin(clamp((v.comp[1] - S.sagR) / M.swingLen, -0.5, 0.5));
    M.wheels[0].rotation.x = v.spin[0]; M.wheels[1].rotation.x = v.spin[1];
    if (M.crank) { M.crank.rotation.x = rs.crank; M.pedals[0].rotation.x = M.pedals[1].rotation.x = -rs.crank; }
  }
  const on = v.lightsOn ? 1 : 0; for (const l of M.lights || []) l.material.emissiveIntensity = on * 6; for (const l of M.tails || []) l.material.emissiveIntensity = on * 1.5 + (v.brake > 0.05 ? 5 : 0);
  if (v.crash > 0 && v.ragdoll) { poseRagdoll(v); return; }
  if (R.root.parent !== G0) { G0.add(R.root); R.root.position.set(0, 0, 0); R.root.quaternion.identity(); }
  // ---- the rider's body language ----
  const moving = Math.abs(v.fwd), air = v.air > 0.06, rough = v.surf !== 0 && moving > 5, ay = (v.v.y - (rs.pvy || 0)) / Math.max(dt, 1e-3); rs.pvy = v.v.y;
  rs.vy += ((clamp(-ay * 0.0035, -0.16, 0.16) - rs.bob) * 150 - rs.vy * 16) * dt; rs.bob = clamp(rs.bob + rs.vy * dt, -0.14, 0.14);   // legs soak up the hits
  const standT = type === "dirt" ? (air ? 1 : rough ? 0.75 : v.th < -0.2 ? 0.6 : 0) : type === "mtb" ? (air ? 1 : (v.throttle < 0.1 && moving > 3.5) || rough ? 0.85 : 0) : type === "quad" ? (air ? 0.8 : rough && moving > 9 ? 0.5 : 0) : 0;
  rs.stand = damp(rs.stand, standT, standT > rs.stand ? 9 : 3.5, dt);
  const stopped = moving < 0.7 && v.air === 0 && !S.four; rs.footDown = damp(rs.footDown, stopped ? 1 : 0, stopped ? 5 : 9, dt);
  rs.look = damp(rs.look, clamp(v.steer * 1.5 + (v.psiDot || 0) * 0.35, -0.75, 0.75), 5, dt);
  rs.pitchB = damp(rs.pitchB, clamp(-v.acc * 0.013, -0.16, 0.2) + (air ? -0.1 : 0), 5, dt);
  rs.leanB = damp(rs.leanB, S.four ? clamp(-(v.latAcc || v.fwd * v.w.y) * 0.012, -0.14, 0.14) : -v.phi * (v.surf === 0 ? 0.25 : 0.5), 6, dt);
  const breath = Math.sin(time * 1.7) * 0.004, P = POSE; P.pelvisQ = null; P.roll = rs.leanB; P.roll2 = rs.leanB * 0.5; P.yaw = 0; P.twist = rs.look * 0.18; P.headYaw = rs.look; P.headPitch = 0; P.curl = 0;
  const upQ = _g.q.identity();
  if (type === "dirt" || type === "quad") {
    const seat = M.seat, st = rs.stand, peg = M.pegs;
    P.pelvis.set(-rs.leanB * 0.25, seat[1] + 0.085 + st * 0.2 + rs.bob * (0.5 + st) + breath, seat[2] + st * (type === "dirt" ? 0.2 : 0.12) - v.throttle * 0.03 + clamp(v.th, -0.4, 0.4) * 0.12);
    P.pitch = (type === "dirt" ? 0.50 : 0.36) + st * 0.34 + rs.pitchB; P.curl = 0.16; P.elbowOut = type === "dirt" ? 1.5 : 1.0; P.kneeOut = type === "dirt" ? 0.22 : 0.5; P.headPitch = -st * 0.1;
    for (let s = 0; s < 2; s++) { const sg = s ? -1 : 1; gripPoint(M, sg, v.steer, P.hands[s]); P.handQ[s].setFromEuler(_g.e.set(1.1, 0, sg * 0.25, "YXZ")); P.feet[s].set(peg[0] * sg, peg[1] + 0.012, peg[2] + 0.02); P.footQ[s].setFromEuler(_g.e.set(0.1 - st * 0.12, sg * 0.1, 0, "YXZ")); }
    if (type === "dirt" && rs.footDown > 0.02) plantFoot(v, P.feet[0], P.footQ[0], 0.36, 0.12, rs.footDown);
  } else if (type === "mtb") {
    const st = rs.stand, pedalling = v.throttle > 0.05 && v.air === 0;
    if (pedalling) rs.crank = v.crank; else { const lvl = Math.round((rs.crank - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2; rs.crank = damp(rs.crank, lvl, 7, dt); v.crank = rs.crank; }
    const th = rs.crank, rock = pedalling ? Math.sin(th) * 0.018 : 0;
    P.pelvis.set(rock * 0.6 - rs.leanB * 0.2, M.seat[1] + 0.09 + st * 0.13 + rs.bob * (0.4 + st) + breath, M.seat[2] + 0.02 + st * 0.11);
    P.pitch = 0.80 + st * 0.2 + rs.pitchB; P.curl = 0.2; P.elbowOut = 1.1 + st * 0.5; P.kneeOut = 0.12; P.roll2 += rock * 1.5; P.headPitch = 0.1;
    for (let s = 0; s < 2; s++) { const sg = s ? -1 : 1; gripPoint(M, sg, v.steer, P.hands[s]); P.handQ[s].setFromEuler(_g.e.set(1.0, 0, sg * 0.2, "YXZ"));
      P.feet[s].set(M.pedalX * sg, M.bb[1] - M.crankLen * Math.cos(th) * sg + 0.02, M.bb[2] - M.crankLen * Math.sin(th) * sg + 0.02); P.footQ[s].setFromEuler(_g.e.set(0.12 + Math.sin(th + (s ? Math.PI : 0)) * 0.2, 0, 0, "YXZ")); }
    if (rs.footDown > 0.02) plantFoot(v, P.feet[0], P.footQ[0], 0.33, 0.1, rs.footDown);
  } else if (type === "scoot") {
    const knee = 0.05 + clamp(-rs.bob, -0.04, 0.1) + Math.abs(v.phi) * 0.06;
    P.pelvis.set(-rs.leanB * 0.3, 0.17 + 0.90 - knee + breath, -0.06); P.pitch = 0.16 + rs.pitchB + moving * 0.006; P.yaw = 0.42; P.twist = -0.36 + rs.look * 0.2; P.curl = 0.08; P.elbowOut = 0.75; P.kneeOut = 0.2; P.headYaw = rs.look - 0.3;
    for (let s = 0; s < 2; s++) { const sg = s ? -1 : 1; gripPoint(M, sg, v.steer, P.hands[s]); P.handQ[s].setFromEuler(_g.e.set(1.15, 0, sg * 0.2, "YXZ")); }
    P.feet[0].set(0.035, M.deck + 0.012, 0.13); P.footQ[0].setFromEuler(_g.e.set(0, 0.5, 0, "YXZ")); P.feet[1].set(-0.03, M.deck + 0.012, -0.17); P.footQ[1].setFromEuler(_g.e.set(0, 1.15, 0, "YXZ"));
    if (rs.footDown > 0.02) plantFoot(v, P.feet[1], P.footQ[1], -0.26, -0.1, rs.footDown);
  } else {   // car: seated, hands on the wheel
    const wc = M.wheelCenter, a0 = clamp(v.steer * 2.6, -1.25, 1.25), ct = Math.cos(M.wheelTilt), stl = Math.sin(M.wheelTilt);
    P.pelvis.set(M.seat[0] - rs.leanB * 0.3, M.seat[1] + rs.bob * 0.3, M.seat[2]); P.pitch = -0.22 + rs.pitchB * 0.5; P.curl = 0.1; P.elbowOut = 0.55; P.kneeOut = 0.35;
    for (let s = 0; s < 2; s++) { const sg = s ? -1 : 1, a = sg * 1.2 + a0, lx = Math.sin(a) * 0.18, ly = Math.cos(a) * 0.18; P.hands[s].set(wc[0] + lx, wc[1] + ly * ct, wc[2] + ly * stl + 0.0); P.handQ[s].setFromEuler(_g.e.set(1.2, 0, sg * 0.5, "YXZ"));
      P.feet[s].set(M.pedals[0] + (s ? -0.07 : 0.14), M.pedals[1], M.pedals[2] - (s && v.throttle > 0.05 ? -0.03 : 0)); P.footQ[s].setFromEuler(_g.e.set(-0.5, 0, 0, "YXZ")); }
  }
  poseRider(R, P);
}
/* When the machine is stopped the rider puts a foot on the real ground beside it. */
function plantFoot(v, foot, fq, side, fwd, k) {
  const G0 = v.model.group; G0.updateMatrix(); _g.a.set(side, 0, fwd).applyMatrix4(G0.matrix); _g.a.y = ground(_g.a.x, _g.a.z, v.p.y) + 0.085;
  _g.inv.copy(G0.matrix).invert(); _g.a.applyMatrix4(_g.inv); foot.lerp(_g.a, k); _g.q2.setFromEuler(_g.e.set(0, side > 0 ? 0.35 : -0.35, v.phi, "YXZ")); fq.slerp(_g.q2, k);
}
function poseRagdoll(v) {
  const R = v.rider, P = v.ragdoll.P, Z = POSE; if (R.root.parent !== scene) { scene.add(R.root); R.root.position.set(0, 0, 0); R.root.quaternion.identity(); }
  const up = _g.a.subVectors(P[1], P[2]).normalize(), left = _g.b.subVectors(P[7], P[8]).add(_g.c.subVectors(P[3], P[4])).normalize(), fwd = _g.c.crossVectors(left, up).normalize(); left.crossVectors(up, fwd).normalize();
  Z.pelvisQ = _g.q.setFromRotationMatrix(_g.m.makeBasis(left, up, fwd)); Z.pelvis.copy(P[2]); Z.pitch = 0; Z.curl = 0.25; Z.roll = Z.roll2 = Z.yaw = Z.twist = 0; Z.headYaw = Z.headPitch = 0; Z.elbowOut = 0.8; Z.kneeOut = 0.3;
  Z.hands[0].copy(P[5]); Z.hands[1].copy(P[6]); Z.feet[0].copy(P[9]); Z.feet[1].copy(P[10]); Z.handQ[0].copy(Z.pelvisQ); Z.handQ[1].copy(Z.pelvisQ); Z.footQ[0].copy(Z.pelvisQ); Z.footQ[1].copy(Z.pelvisQ);
  poseRider(R, Z);
}

/* ---------- the player ---------- */
const K = {}, input = { throttle: 0, brake: 0, steer: 0, hand: false, lean: 0 };
const GAME = { v: null, type: store.get("laf-veh", "dirt"), mode: "menu", paused: true, time: 0, cam: { yaw: 0, pitch: 0.2, dist: 1, orbit: 0, orbitP: 0, orbitT: 0, fp: false, shake: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 58 }, fleet: {}, trial: null, toastT: 0 };
function vehicleOf(type) { let v = GAME.fleet[type]; if (!v) { v = GAME.fleet[type] = makeVehicle(type); v.model.group.traverse(o => { o.frustumCulled = false; }); } return v; }
function selectVehicle(type, keep) {
  const old = GAME.v, v = vehicleOf(type); if (old && old !== v) { scene.remove(old.model.group); if (old.rider.root.parent === scene) scene.remove(old.rider.root); }
  GAME.type = type; GAME.v = v; store.set("laf-veh", type); scene.add(v.model.group);
  if (keep && old) placeVehicle(v, old.p.x, old.p.z, old.psi); v.lightsOn = tod.night > 0.2; if (typeof mpDirty === "function") mpDirty();
  return v;
}
function readInput(dt) {
  const up = K.KeyW || K.ArrowUp, dn = K.KeyS || K.ArrowDown, l = K.KeyA || K.ArrowLeft, r = K.KeyD || K.ArrowRight;
  input.throttle = up ? 1 : 0; input.brake = dn ? 1 : 0; const st = (l ? 1 : 0) - (r ? 1 : 0); input.steer = damp(input.steer, st, st ? 6 : 10, dt); input.hand = !!K.Space;
  input.lean = (K.ShiftLeft || K.ShiftRight ? 1 : 0) - (K.ControlLeft || K.ControlRight || K.KeyF ? 1 : 0);
}
function resetVehicle(toSafe) {
  const v = GAME.v; if (!v) return; let x = v.safe.x, z = v.safe.z, yaw = v.safe.yaw;
  if (GAME.trial && GAME.trial.cp > 0) { const T = GAME.trial, c = T.cps[T.cp - 1]; x = c.x; z = c.z; yaw = c.yaw; }
  if (v.rider.root.parent === scene) scene.remove(v.rider.root); placeVehicle(v, x, z, yaw); v.sunk = false; snapCamera();
}
/* ---------- camera ---------- */
const CAMD = { dirt: [4.6, 1.75], car: [7.4, 2.5], quad: [5.2, 1.95], mtb: [4.3, 1.8], scoot: [4.0, 1.85] };
function snapCamera() { const v = GAME.v, c = GAME.cam; c.yaw = v.psi; c.orbit = c.orbitP = 0; updateCamera(1, true); }
function updateCamera(dt, snap) {
  const v = GAME.v, c = GAME.cam, D = CAMD[v.type], sp = v.speed;
  c.orbitT -= dt; if (c.orbitT < 0 && sp > 1.5) { c.orbit = damp(c.orbit, 0, 2.2, dt); c.orbitP = damp(c.orbitP, 0, 2.2, dt); }
  const head = v.S.four ? v.psi : v.psi, travel = sp > 2.5 ? Math.atan2(v.v.x, v.v.z) : head, want = v.S.four && v.rev ? head : head + wrap(travel - head) * 0.35;
  c.yaw += wrap(want - c.yaw) * (snap ? 1 : 1 - Math.exp(-(2.6 + sp * 0.07) * dt));
  const fovT = 56 + clamp(sp * 0.42, 0, 17); c.fov = damp(c.fov, fovT, 3, dt); if (Math.abs(camera.fov - c.fov) > 0.05) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  const base = v.model.group.position;
  if (c.fp && !(v.crash > 0)) {
    const hb = v.rider.bones.head; v.model.group.updateMatrixWorld(true); hb.getWorldPosition(c.pos); _g.e.set(v.S.four ? 0 : clamp(v.th, -0.5, 0.5) * 0.6, v.psi + c.orbit + Math.PI, 0, "YXZ"); camera.quaternion.setFromEuler(_g.e);
    _g.q.setFromAxisAngle(_g.a.set(0, 0, 1), (v.S.four ? 0 : v.phi * 0.55)); camera.quaternion.multiply(_g.q); _g.q.setFromAxisAngle(_g.a.set(1, 0, 0), -c.orbitP - 0.06); camera.quaternion.multiply(_g.q);
    _g.a.set(0, 0.13, 0.06).applyQuaternion(v.model.group.quaternion); camera.position.copy(c.pos).add(_g.a); if (camera.near !== 0.08) { camera.near = 0.08; camera.updateProjectionMatrix(); } return;
  }
  if (camera.near !== 0.3) { camera.near = 0.3; camera.updateProjectionMatrix(); }
  const yaw = c.yaw + c.orbit, pitch = clamp(0.16 + c.orbitP, -0.25, 1.35), dist = D[0] * c.dist * (1 + sp * 0.006), ch = D[1];
  let d = dist; _g.b.set(base.x, base.y + ch * 0.62, base.z);
  for (let k = 0; k < 5; k++) {   // pull in rather than sit inside a wall or under the ground
    _g.a.set(_g.b.x - Math.sin(yaw) * Math.cos(pitch) * d, _g.b.y + ch * 0.38 + Math.sin(pitch) * d, _g.b.z - Math.cos(yaw) * Math.cos(pitch) * d);
    if (hitBuildings(_g.a.x, _g.a.z, 0.5, _v.out) <= 0) break; d *= 0.72;
  }
  const gy = ground(_g.a.x, _g.a.z, _g.a.y + 2) + 0.45; if (_g.a.y < gy) _g.a.y = gy;
  if (snap) c.pos.copy(_g.a); else { c.pos.x = damp(c.pos.x, _g.a.x, 14, dt); c.pos.z = damp(c.pos.z, _g.a.z, 14, dt); c.pos.y = damp(c.pos.y, _g.a.y, 7, dt); if (c.pos.y < gy) c.pos.y = gy; }
  c.shake = damp(c.shake, 0, 6, dt); const sh = c.shake + (v.surf !== 0 ? Math.min(0.012, sp * 0.0006) : 0);
  camera.position.set(c.pos.x + (Math.random() - 0.5) * sh, c.pos.y + (Math.random() - 0.5) * sh, c.pos.z + (Math.random() - 0.5) * sh);
  c.look.set(base.x + Math.sin(v.psi) * 1.2, base.y + ch * 0.62, base.z + Math.cos(v.psi) * 1.2); camera.lookAt(c.look);
}
/* ---------- dust, spray ---------- */
const FX = { n: 420, i: 0, pos: null, vel: null, life: null, col: null, pts: null };
function buildFx() {
  FX.pos = new Float32Array(FX.n * 3); FX.vel = new Float32Array(FX.n * 3); FX.life = new Float32Array(FX.n); FX.col = new Float32Array(FX.n * 4); const size = new Float32Array(FX.n);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(FX.pos, 3)); g.setAttribute("aCol", new THREE.BufferAttribute(FX.col, 4)); g.setAttribute("aSize", new THREE.BufferAttribute(size, 1)); FX.size = size;
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uScale: { value: 600 } },
    vertexShader: "attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.5, -mv.z); }",
    fragmentShader: "varying vec4 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.05, length(q)); gl_FragColor = vec4(vC.rgb, vC.a * a); }" });
  FX.pts = new THREE.Points(g, m); FX.pts.frustumCulled = false; FX.pts.renderOrder = 5; scene.add(FX.pts);
}
function puff(x, y, z, vx, vy, vz, r, gcol, b, a, size, life) { const i = FX.i = (FX.i + 1) % FX.n; FX.pos[i * 3] = x; FX.pos[i * 3 + 1] = y; FX.pos[i * 3 + 2] = z; FX.vel[i * 3] = vx; FX.vel[i * 3 + 1] = vy; FX.vel[i * 3 + 2] = vz; FX.life[i] = life; FX.col[i * 4] = r; FX.col[i * 4 + 1] = gcol; FX.col[i * 4 + 2] = b; FX.col[i * 4 + 3] = a; FX.size[i] = size; }
function updateFx(dt) {
  const v = GAME.v, lightK = tod.night > 0.5 ? 0.12 : tod.night > 0.1 ? 0.6 : 1;
  if (v && GAME.mode === "play") {
    const sp = v.speed, dusty = v.surf === 1 ? 1 : v.surf === 2 ? 0.45 : 0, k = (sp * 0.035 + v.slip * 1.6 + (v.throttle > 0.5 && sp < 6 ? 0.8 : 0)) * dusty, n = Math.min(4, Math.floor(k * 60 * dt + Math.random()));
    for (let i = 0; i < n; i++) { const bx = v.p.x - Math.sin(v.psi) * (v.S.L * 0.5) + (Math.random() - 0.5) * (v.S.tr || 0.3), bz = v.p.z - Math.cos(v.psi) * (v.S.L * 0.5) + (Math.random() - 0.5) * (v.S.tr || 0.3), c = v.surf === 1 ? [0.62, 0.52, 0.40] : [0.50, 0.46, 0.34];
      puff(bx, ground(bx, bz, v.p.y) + 0.15, bz, -v.v.x * 0.12 + (Math.random() - 0.5), 0.6 + Math.random() * 1.2, -v.v.z * 0.12 + (Math.random() - 0.5), c[0] * lightK, c[1] * lightK, c[2] * lightK, 0.34, 0.5 + Math.random() * 0.5, 1.6 + Math.random()); }
    if (v.wet > 0 && sp > 1) for (let i = 0; i < 3; i++) puff(v.p.x + (Math.random() - 0.5), v.p.y - v.S.cg + 0.3, v.p.z + (Math.random() - 0.5), (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.8 * lightK, 0.85 * lightK, 0.9 * lightK, 0.5, 0.25, 0.8);
  }
  for (let i = 0; i < FX.n; i++) { if (FX.life[i] <= 0) { FX.col[i * 4 + 3] = 0; continue; } FX.life[i] -= dt; FX.pos[i * 3] += FX.vel[i * 3] * dt; FX.pos[i * 3 + 1] += FX.vel[i * 3 + 1] * dt; FX.pos[i * 3 + 2] += FX.vel[i * 3 + 2] * dt; FX.vel[i * 3 + 1] -= (FX.size[i] < 0.3 ? 9 : 0.3) * dt; FX.vel[i * 3] *= 1 - 1.5 * dt; FX.vel[i * 3 + 2] *= 1 - 1.5 * dt; FX.size[i] += dt * (FX.size[i] < 0.3 ? 0 : 0.7); FX.col[i * 4 + 3] *= 1 - 0.9 * dt; }
  const G1 = FX.pts.geometry; G1.attributes.position.needsUpdate = G1.attributes.aCol.needsUpdate = G1.attributes.aSize.needsUpdate = true; FX.pts.material.uniforms.uScale.value = renderer.domElement.height * 0.9;
}
/* ---------- street lights, signals, headlights ---------- */
const LAMPS = { pts: [], lights: [], head: null, glow: null, hash: new Map() };
function buildLamps() {
  const add = (x, z, kind, yaw) => { if (!inWorld(x, z, 5)) return; const k = Math.floor(x / 128) * 4096 + Math.floor(z / 128); let l = LAMPS.hash.get(k); if (!l) LAMPS.hash.set(k, l = []); l.push(LAMPS.pts.length); LAMPS.pts.push({ x, z, y: H(x, z), kind, yaw }); };
  for (let i = 0; i < V.pKind.length; i++) if (V.pKind[i] <= 1) add(V.pX[i] / 10, V.pZ[i] / 10, V.pKind[i], 0);
  for (const st of STRIPS) {   // the main streets are lit along their length; side streets at their corners only
    if (st.kind < 2 || st.kind > 4 || (st.flag & 10)) continue; let next = 20 + hash2(st.r, 1, 9) * 30, side = hash2(st.r, 2, 9) < 0.5 ? 1 : -1;
    for (let i = 1; i < st.n; i++) if (st.S[i] >= next) { const o = (st.w / 2 + 1.1) * side; add(st.X[i] + st.LX[i] * o, st.Z[i] + st.LZ[i] * o, 1, Math.atan2(-st.LX[i] * side, -st.LZ[i] * side)); next += st.kind === 2 ? 46 : 62; side = -side; }
  }
  const n = LAMPS.pts.length, pole = new THREE.CylinderGeometry(0.07, 0.11, 8.2, 8); pole.translate(0, 4.1, 0); const arm = new THREE.BoxGeometry(0.09, 0.09, 2.2); arm.translate(0, 8.1, 1.0); const hd = new THREE.BoxGeometry(0.28, 0.1, 0.62); hd.translate(0, 8.05, 2.0);
  const geo = mergeGeos([pole.toNonIndexed(), arm.toNonIndexed(), hd.toNonIndexed()].map(g => { g.deleteAttribute("uv"); return g; })), im = new THREE.InstancedMesh(geo, vmat(0x55585c, 0.55, 0.6), n), m = new THREE.Matrix4();
  const bulb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.04, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }), n); LAMPS.glow = bulb;
  const sig = [], sgeo = new THREE.BoxGeometry(0.32, 0.95, 0.3);
  LAMPS.pts.forEach((p, i) => { _g.q.setFromAxisAngle(_up, p.yaw); m.compose(_g.a.set(p.x, p.y - 0.2, p.z), _g.q, _g.b.set(1, p.kind === 0 ? 0.72 : 1, 1)); im.setMatrixAt(i, m);
    _g.a.set(0, 7.98 * (p.kind === 0 ? 0.72 : 1), 2.0).applyQuaternion(_g.q); p.lx = p.x + _g.a.x; p.ly = p.y - 0.2 + _g.a.y; p.lz = p.z + _g.a.z; m.makeTranslation(p.lx, p.ly, p.lz); m.multiply(_g.m.makeRotationFromQuaternion(_g.q)); bulb.setMatrixAt(i, m); if (p.kind === 0) sig.push(p); });
  im.castShadow = true; im.frustumCulled = false; bulb.frustumCulled = false; scene.add(im, bulb);
  if (sig.length) { const sm = new THREE.InstancedMesh(sgeo, vmat(0x16181a, 0.6), sig.length), lm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x29e06a }), sig.length);
    sig.forEach((p, i) => { m.makeTranslation(p.lx, p.ly - 0.75, p.lz); sm.setMatrixAt(i, m); m.makeTranslation(p.lx - Math.sin(p.yaw) * 0.0, p.ly - 1.05, p.lz); lm.setMatrixAt(i, m); }); sm.frustumCulled = lm.frustumCulled = false; scene.add(sm, lm); LAMPS.sigLamp = lm; }
  for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffc98a, 0, 38, 1.6); scene.add(l); LAMPS.lights.push(l); }
  LAMPS.head = new THREE.SpotLight(0xfff0d8, 0, 110, 0.52, 0.55, 1.4); scene.add(LAMPS.head); scene.add(LAMPS.head.target);
}
function updateLamps() {
  const v = GAME.v, night = tod.night, L = LAMPS; L.glow.visible = night > 0.2;
  if (night > 0.2) {   // the six nearest street lamps become real lights
    const cx = v ? v.p.x : camera.position.x, cz = v ? v.p.z : camera.position.z, cand = [];
    for (let tx = Math.floor((cx - 70) / 128); tx <= Math.floor((cx + 70) / 128); tx++) for (let tz = Math.floor((cz - 70) / 128); tz <= Math.floor((cz + 70) / 128); tz++) { const l = L.hash.get(tx * 4096 + tz); if (l) for (const i of l) { const p = L.pts[i]; cand.push([(p.x - cx) ** 2 + (p.z - cz) ** 2, p]); } }
    cand.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < 6; i++) { const l = L.lights[i], c = cand[i]; if (c && c[0] < 80 * 80) { l.position.set(c[1].lx, c[1].ly - 0.3, c[1].lz); l.intensity = 420 * night; } else l.intensity = 0; }
  } else for (const l of L.lights) l.intensity = 0;
  if (v && v.lightsOn && !(v.crash > 0)) { const G0 = v.model.group, hgt = v.S.four ? 0.85 : v.type === "scoot" ? 0.95 : 1.0, f = v.S.L * 0.5 + 0.2; _g.a.set(0, hgt, f).applyQuaternion(G0.quaternion).add(G0.position); L.head.position.copy(_g.a); _g.b.set(0, hgt - 0.9, f + 14).applyQuaternion(G0.quaternion).add(G0.position); L.head.target.position.copy(_g.b); L.head.target.updateMatrixWorld();
    L.head.intensity = (v.type === "car" ? 5200 : v.type === "scoot" || v.type === "mtb" ? 900 : 3000) * (0.25 + 0.75 * night); } else L.head.intensity = 0;
}
function onTimeOfDay() { if (wallMat) wallMat.emissiveIntensity = tod.night > 0.5 ? 1.5 : tod.night > 0.1 ? 0.5 : 0; for (const k in GAME.fleet) GAME.fleet[k].lightsOn = tod.night > 0.2; }

/* ---------- sound, all synthesised ---------- */
const AU = { ctx: null, on: store.get("laf-snd", true) };
function initAudio() {
  if (AU.ctx || !AU.on) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const c = AU.ctx = new AC(); AU.master = c.createGain(); AU.master.gain.value = 0.5; AU.master.connect(c.destination);
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = (f, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(AU.master); s.start(); return { fl, g }; };
  AU.wind = noise(500, 0.6); AU.tyre = noise(900, 0.8); AU.skid = noise(2100, 3);
  AU.eng = { o: [], g: c.createGain(), lp: c.createBiquadFilter() }; AU.eng.lp.type = "lowpass"; AU.eng.g.gain.value = 0; AU.eng.lp.connect(AU.eng.g); AU.eng.g.connect(AU.master);
  const ws = c.createWaveShaper(), cu = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cu[i] = Math.tanh(x * 2.6); } ws.curve = cu; ws.connect(AU.eng.lp); AU.eng.ws = ws;
  for (const [type, mul, amp] of [["sawtooth", 1, 0.55], ["square", 0.5, 0.5], ["sawtooth", 2.01, 0.22], ["triangle", 3.02, 0.12]]) { const o = c.createOscillator(), g = c.createGain(); o.type = type; g.gain.value = amp; o.connect(g); g.connect(ws); o.start(); AU.eng.o.push([o, mul]); }
  AU.whine = { o: c.createOscillator(), g: c.createGain() }; AU.whine.o.type = "sine"; AU.whine.g.gain.value = 0; AU.whine.o.connect(AU.whine.g); AU.whine.g.connect(AU.master); AU.whine.o.start();
  AU.amb = noise(3200, 1.2); AU.tick = 0;
}
function thud(vol) { const c = AU.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, c.currentTime); o.frequency.exponentialRampToValueAtTime(34, c.currentTime + 0.18); g.gain.setValueAtTime(Math.min(0.9, vol), c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25); o.connect(g); g.connect(AU.master); o.start(); o.stop(c.currentTime + 0.27); }
function chirp(f, t, vol) { const c = AU.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f, c.currentTime); o.frequency.exponentialRampToValueAtTime(f * 1.35, c.currentTime + t * 0.5); o.frequency.exponentialRampToValueAtTime(f * 0.9, c.currentTime + t); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(vol, c.currentTime + t * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t); o.connect(g); g.connect(AU.master); o.start(); o.stop(c.currentTime + t + 0.02); }
function updateAudio(dt) {
  const c = AU.ctx; if (!c) return; const v = GAME.v, play = GAME.mode === "play" && !GAME.paused && v, t = c.currentTime, set = (p, val) => p.setTargetAtTime(val, t, 0.05);
  const sp = play ? v.speed : 0, S = play ? v.S : null;
  set(AU.wind.g.gain, play ? Math.min(0.5, sp * sp * 0.00045) * (GAME.cam.fp ? 1.5 : 1) : 0); set(AU.wind.fl.frequency, 300 + sp * 22);
  set(AU.tyre.g.gain, play && v.air === 0 ? Math.min(0.3, sp * (v.surf === 0 ? 0.004 : 0.012)) : 0); set(AU.tyre.fl.frequency, v && v.surf === 0 ? 700 + sp * 14 : 320 + sp * 8);
  set(AU.skid.g.gain, play && v.air === 0 && v.surf === 0 ? Math.min(0.22, v.slip * 0.4) * sstep(3, 9, sp) : 0);
  if (play && S.rpm) { const cyl = v.type === "car" ? 2 : 0.5, f = v.rpm / 60 * cyl; for (const [o, mul] of AU.eng.o) set(o.frequency, f * mul); set(AU.eng.g.gain, 0.10 + 0.16 * v.throttle + 0.05 * (v.rpm / S.rpm[1])); set(AU.eng.lp.frequency, 500 + v.rpm * (v.type === "car" ? 0.22 : 0.42) * (0.45 + 0.55 * v.throttle)); } else set(AU.eng.g.gain, 0);
  if (play && S.electric) { set(AU.whine.o.frequency, 180 + sp * 95); set(AU.whine.g.gain, 0.02 + 0.05 * v.throttle * sstep(0.3, 3, sp)); } else set(AU.whine.g.gain, 0);
  if (play && S.human && v.throttle < 0.05 && sp > 1.5) { AU.tick -= dt * sp * 3.2; if (AU.tick < 0) { AU.tick = 1; const o = c.createOscillator(), g = c.createGain(); o.type = "square"; o.frequency.value = 2400; g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012); o.connect(g); g.connect(AU.master); o.start(); o.stop(t + 0.015); } }
  set(AU.amb.g.gain, tod.night > 0.5 ? 0.012 * (0.6 + 0.4 * Math.sin(t * 38)) : 0);   // crickets after dark
  if (tod.night < 0.5 && play && Math.random() < dt * 0.35 && sp < 14) chirp(2200 + Math.random() * 2400, 0.08 + Math.random() * 0.1, 0.012 + Math.random() * 0.012);   // birds by day
  if (v && v.hit > 2.5) { thud(v.hit * 0.07); GAME.cam.shake = Math.min(0.5, v.hit * 0.03); } if (v) v.hit = 0;
}

/* ---------- time trials ---------- */
const TRIALS = [];
function buildTrials() {
  WORLD.trials.forEach((t, id) => {
    const P = t.pts, n = P.length, cps = [], step = Math.max(30, Math.round(260 / 5));
    for (let i = step; i < n - 8; i += step) cps.push({ x: P[i][0], z: P[i][1], yaw: Math.atan2(P[Math.min(n - 1, i + 2)][0] - P[i][0], P[Math.min(n - 1, i + 2)][1] - P[i][1]), i });
    cps.push({ x: P[n - 1][0], z: P[n - 1][1], yaw: Math.atan2(P[n - 1][0] - P[n - 4][0], P[n - 1][1] - P[n - 4][1]), i: n - 1 });
    const T = { id, name: t.name, blurb: t.blurb, veh: t.veh, net: t.net, pts: P, cps, len: (n - 1) * 5, start: { x: P[0][0], z: P[0][1], yaw: Math.atan2(P[3][0] - P[0][0], P[3][1] - P[0][1]) } }; TRIALS.push(T);
    // start arch
    const g = new THREE.Group(), w = t.net === "road" ? 9 : 4.5, post = vmat(0xdedede, 0.5), ban = vmat(0xd8301c, 0.6);
    for (const s of [1, -1]) vadd(g, new THREE.CylinderGeometry(0.09, 0.09, 4.4, 8), post, s * w / 2, 2.2, 0); vadd(g, new THREE.BoxGeometry(w + 0.3, 0.7, 0.12), ban, 0, 4.2, 0);
    g.position.set(T.start.x, H(T.start.x, T.start.z), T.start.z); g.rotation.y = T.start.yaw; scene.add(g); T.arch = g;
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false })); beam.visible = false; beam.renderOrder = 6; scene.add(beam); GAME.beam = beam;
}
function trialKey(T, veh) { return "laf_" + T.id + "_" + veh; }
function startTrial(T) { GAME.trial = { T, cps: T.cps, cp: 0, t: 0, run: false, done: false, arm: true }; const v = GAME.v; placeVehicle(v, T.start.x - Math.sin(T.start.yaw) * 5, T.start.z - Math.cos(T.start.yaw) * 5, T.start.yaw); snapCamera(); toast(T.name + ": cross the line to start the clock", 4); }
function updateTrial(dt) {
  const v = GAME.v, R = GAME.trial;
  if (!R) {   // riding through any start arch arms that route
    if (v.speed > 1) for (const T of TRIALS) { const dx = v.p.x - T.start.x, dz = v.p.z - T.start.z; if (dx * dx + dz * dz < 36 && Math.cos(v.psi - T.start.yaw) > 0.3) { GAME.trial = { T, cps: T.cps, cp: 0, t: 0, run: true, done: false }; toast(T.name + " — go!", 2.5); break; } }
    GAME.beam.visible = false; return;
  }
  const T = R.T; if (R.done) { R.doneT -= dt; if (R.doneT < 0) GAME.trial = null; GAME.beam.visible = false; return; }
  if (!R.run) { const dx = v.p.x - T.start.x, dz = v.p.z - T.start.z, along = dx * Math.sin(T.start.yaw) + dz * Math.cos(T.start.yaw); if (along > 0 && dx * dx + dz * dz < 200) { R.run = true; toast("Go!", 1.5); } }
  else R.t += dt;
  const c = R.cps[R.cp], dx = v.p.x - c.x, dz = v.p.z - c.z; GAME.beam.visible = true; GAME.beam.position.set(c.x, H(c.x, c.z) + 12, c.z); GAME.beam.material.color.setHex(R.cp === R.cps.length - 1 ? 0x41e08a : 0xffc23a);
  if (R.run && dx * dx + dz * dz < (T.net === "road" ? 15 * 15 : 9 * 9)) {
    R.cp++; if (AU.ctx) chirp(880, 0.12, 0.08);
    if (R.cp >= R.cps.length) { R.done = true; R.doneT = 7; const key = trialKey(T, v.type), best = store.get(key, 0), ms = Math.round(R.t * 1000), pb = !best || ms < best; if (pb) { store.set(key, ms); if (typeof lbSubmit === "function") lbSubmit(key, ms); }
      toast(T.name + " finished in " + fmtTime(R.t) + (pb ? " — personal best" : " (best " + fmtTime(best / 1000) + ")"), 7); }
  }
}
function fmtTime(s) { const m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ":" + (r < 10 ? "0" : "") : "") + r.toFixed(2); }
