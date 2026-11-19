/* ---------- people: walkers on the pavements in town and on the paths and trails. They step aside for traffic and cannot be hit. ---------- */
const PEOPLE = { list: [], hash: new Map(), t: 0 };
const PED_TOP = [[0.72, 0.16, 0.14], [0.16, 0.30, 0.55], [0.85, 0.84, 0.80], [0.12, 0.12, 0.13], [0.20, 0.42, 0.30], [0.80, 0.62, 0.20], [0.50, 0.30, 0.52], [0.86, 0.52, 0.40], [0.35, 0.50, 0.62], [0.55, 0.56, 0.58]];
const PED_LEG = [[0.13, 0.19, 0.32], [0.08, 0.08, 0.09], [0.45, 0.40, 0.30], [0.25, 0.26, 0.28], [0.10, 0.14, 0.24]], PED_SKIN = [[0.62, 0.42, 0.31], [0.78, 0.58, 0.46], [0.45, 0.29, 0.20], [0.30, 0.19, 0.13], [0.70, 0.50, 0.36]], PED_HAIR = [0x2a1f16, 0x0c0b0a, 0x6b4a2a, 0xb89a5a, 0x8a8a88, 0x4a2a1a];
function buildPeople() {
  for (let i = 0; i < STRIPS.length; i++) {   // where people walk: the pavements of the main streets, footways, park paths and the paved trails
    const st = STRIPS[i], k = st.kind; if ((st.flag & 10) || st.n < 4 || !((k >= 2 && k <= 4) || k === 10 || k === 11 || k === 12)) continue;
    for (let q = 1; q < st.n - 1; q += 5) { const key = Math.floor(st.X[q] / 96) * 4096 + Math.floor(st.Z[q] / 96); let l = PEOPLE.hash.get(key); if (!l) PEOPLE.hash.set(key, l = []); l.push(i, q); }
  }
  const keep = SKIN.slice();
  for (let i = 0; i < 14; i++) {
    const h = k => hash2(i, k, 301), sk = PED_SKIN[Math.floor(h(1) * PED_SKIN.length)], top = PED_TOP[Math.floor(h(2) * PED_TOP.length)]; SKIN[0] = sk[0]; SKIN[1] = sk[1]; SKIN[2] = sk[2];
    OUTFITS.ped = { top, top2: h(3) < 0.3 ? PED_TOP[Math.floor(h(4) * PED_TOP.length)] : top, legs: PED_LEG[Math.floor(h(5) * PED_LEG.length)], glove: null, boot: h(6) < 0.5 ? [0.85, 0.85, 0.83] : [0.12, 0.10, 0.09], helmet: "none", shell: 0, accent: 0, shorts: h(7) < 0.35, pack: h(8) < 0.2, bootH: 0, hair: PED_HAIR[Math.floor(h(9) * PED_HAIR.length)], glasses: h(10) < 0.3, long: h(11) < 0.45 };
    const R = makeRider("ped"); R.root.scale.setScalar(0.93 + 0.13 * h(12)); R.root.visible = false; scene.add(R.root);
    PEOPLE.list.push({ R, on: false, st: null, q: 0, s: 0, dir: 1, lat: 0, sp: 1.4, ph: h(13) * 6, p: new THREE.Vector3(), yaw: 0, dodge: 0, n: 0 });
  }
  SKIN[0] = keep[0]; SKIN[1] = keep[1]; SKIN[2] = keep[2]; delete OUTFITS.ped;
}
function spawnPerson(N, c) {
  const r = Math.random, l = PEOPLE.hash.get((Math.floor(c.x / 96) + Math.floor(r() * 3) - 1) * 4096 + Math.floor(c.z / 96) + Math.floor(r() * 3) - 1); if (!l) return;
  const k = Math.floor(r() * l.length / 2) * 2, st = STRIPS[l[k]], q = l[k + 1], d = Math.hypot(st.X[q] - c.x, st.Z[q] - c.z); if (d < 38 || d > 150 || nearJunction(st.X[q], st.Z[q])) return;
  for (const M of PEOPLE.list) if (M.on && Math.hypot(M.p.x - st.X[q], M.p.z - st.Z[q]) < 9) return;
  const street = st.kind <= 4; N.st = st; N.q = q; N.s = st.S[q]; N.dir = r() < 0.5 ? 1 : -1; N.lat = street ? (st.w / 2 + 0.75 + r() * 0.7) * (r() < 0.5 ? 1 : -1) : (r() - 0.5) * Math.min(1.4, st.w * 0.6);
  N.sp = !street && r() < 0.22 ? 2.7 + r() * 0.6 : 1.15 + r() * 0.5; N.on = true; N.dodge = 0; N.n = PEOPLE.n = (PEOPLE.n || 0) + 1;
}
function updatePeople(dt) {
  if (INT.on) { for (const N of PEOPLE.list) N.R.root.visible = false; return; }
  const v = GAME.v, c = FOOT.on ? FOOT.p : v && GAME.mode !== "free" && GAME.mode !== "menu" ? v.p : camera.position, want = PERF.tier <= 0 ? 5 : PERF.tier === 1 ? 8 : 14; PEOPLE.t -= dt;
  for (let i = 0; i < PEOPLE.list.length; i++) {
    const N = PEOPLE.list[i]; if (N.on && (i >= want || Math.hypot(N.p.x - c.x, N.p.z - c.z) > 175)) { N.on = false; N.R.root.visible = false; }
    if (!N.on) { if (i < want && PEOPLE.t <= 0) { PEOPLE.t = 0.2; spawnPerson(N, c); if (N.on) N.p.set(1e9, 0, 1e9); } if (!N.on) continue; }
    const st = N.st, danger = v && !FOOT.on && v.speed > 2 && Math.hypot(v.p.x - N.p.x, v.p.z - N.p.z) < 6 + v.speed * 0.9; N.dodge = damp(N.dodge, danger ? 1 : 0, danger ? 7 : 1.5, dt);
    N.s += N.sp * N.dir * dt * (1 - 0.85 * N.dodge); while (N.q < st.n - 2 && N.s > st.S[N.q + 1]) N.q++; while (N.q > 0 && N.s < st.S[N.q]) N.q--;
    if (N.s >= st.S[st.n - 1] - 0.5 || N.s <= st.S[0] + 0.5 || nearJunction(st.X[N.q], st.Z[N.q]) && Math.random() < dt * 0.7) { N.dir = -N.dir; N.s = clamp(N.s, st.S[0] + 0.6, st.S[st.n - 1] - 0.6); }   // at the end of the block, or at a crossing, turn back
    const q = N.q, t = clamp((N.s - st.S[q]) / Math.max(0.01, st.S[q + 1] - st.S[q]), 0, 1), lat = N.lat + (N.lat < 0 ? -1 : 1) * 1.5 * N.dodge, x = lerp(st.X[q], st.X[q + 1], t) + st.LX[q] * lat, z = lerp(st.Z[q], st.Z[q + 1], t) + st.LZ[q] * lat;
    const dx = (st.X[q + 1] - st.X[q]) * N.dir, dz = (st.Z[q + 1] - st.Z[q]) * N.dir, dd = Math.hypot(x - c.x, z - c.z); N.p.set(x, H(x, z) + (st.kind <= 4 && Math.abs(lat) > st.w / 2 ? 0.16 : 0.03), z);
    let yaw = Math.atan2(dx, dz); if (N.dodge > 0.3 && v) yaw = lerp(yaw, yaw + wrap(Math.atan2(v.p.x - x, v.p.z - z) - yaw), 0.6 * N.dodge);   // watching it go by
    N.yaw += wrap(yaw - N.yaw) * Math.min(1, dt * 6); N.R.root.visible = dd < 160;
    if (dd < 110) { const sp = N.sp * (1 - 0.95 * N.dodge); N.ph += sp * dt * (sp > 2.5 ? 2.0 : 3.5); walkPose(N.R, N.p, N.yaw, sp, N.ph); const s = N.R.root.scale.x; N.R.root.position.y -= (1 - s) * 0.0; }
    else { N.R.root.position.copy(N.p); }
  }
}
