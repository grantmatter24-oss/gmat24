/* ---------- competitions, trophies and unlocks ----------
   Three venues on the mountain. Ski to the start arch (or pick one from the Competitions list) and press E to enter a heat against five riders.
   The other riders ski like you: each one replays your own best run on that course, a little faster or slower and a little to one side,
   so beating them means beating yourself. Before you have a run on record they ski the course line at a par pace.
   Placing in a heat wins a trophy; trophies are worth medal points (gold 3, silver 2, bronze 1, best per venue), and medal points open
   the better clothes and gear. Every lift and run is open from the start. */
const COMP = { venues: [], near: null, run: null, hold: false, ghosts: [], save: store.get("pal-comp", {}) || {} };
const TROPHY = ["No trophy", "Bronze", "Silver", "Gold"], TROPHY_COL = ["#7d8a96", "#c27a3a", "#c9d1d8", "#f0c23b"], BOTS = ["Koda", "Juniper", "Rook", "Sierra", "Aspen"];
const LIFT_LOCK = {};   // every lift and run is open to everyone; medal points only unlock clothes and gear
const GEAR_LOCK = { helmet: { camo: 1, redbull: 2, santa: 4 }, jacket: { block: 1, navy: 2, greenc: 3, santa: 4, trench: 5 }, skis: { stripes: 1, camo: 2, pink: 2, flames: 3 }, accessory: { ninja: 1, cape: 3 }, pants: { khaki: 1, santa: 4 }, wax: { fast: 2 } };
const compSave = v => COMP.save[v.id] || (COMP.save[v.id] = { best: null, trophy: 0, board: [], rec: null, runs: 0 });
const medalPoints = () => COMP.venues.reduce((a, v) => a + (compSave(v).trophy || 0), 0);
const liftLocked = L => (LIFT_LOCK[L.name] || 0) > medalPoints();
const fmtRes = (v, r) => r == null ? "—" : v.kind === "race" ? (Math.floor(r / 60) + ":" + (r % 60 < 10 ? "0" : "") + (r % 60).toFixed(2)) : Math.round(r).toLocaleString() + " pts";
const better = (v, a, b) => b == null || (v.kind === "race" ? a < b : a > b);

function compPath(pts, s0, s1, off = 0) { // the stretch of a run between two distances, resampled every 6 m, shifted sideways by off
  const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = []; let k = 0; for (let s = s0; s <= s1; s += 6) { while (k < pts.length - 2 && s > S[k + 1]) k++; const l = S[k + 1] - S[k] || 1, u = (s - S[k]) / l, dx = (pts[k + 1][0] - pts[k][0]) / l, dz = (pts[k + 1][1] - pts[k][1]) / l; out.push([lerp(pts[k][0], pts[k + 1][0], u) - dz * off, lerp(pts[k][1], pts[k + 1][1], u) + dx * off]); }
  return out;
}
function initComp() {
  const under = name => { const l = WORLD.lifts.find(q => q.n === name); if (!l) return null; const pts = l.pts.slice().reverse(); let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return { pts, len }; };   // the line of a lift, from its top down
  const runBy = names => { for (const n of names) { const r = WORLD.runs.filter(q => q.n === n).sort((a, b) => b.len - a.len)[0]; if (r) return r; } return null; };
  const defs = [
    { id: "gs2", name: "Red Dog Giant Slalom", kind: "race", blurb: "Fastest time round the gates: pass each gate between its two flags, on the outside of the turning pole. Miss one and you are sent back to the start.", run: runBy(["Red Dog Face", "Lower Dog Leg", "Julia's Gold"]), s0: 25, max: 560, off: 0 },
    { id: "slope", name: "Gold Coast Slopestyle", kind: "style", blurb: "Most trick points down the big jump line. Crashes score nothing.", run: runBy(["Gold Coast"]), s0: 45, max: 800, off: 11 },
    { id: "kt22b", name: "KT-22 Freeride", kind: "free", blurb: "Top to bottom beside the KT-22 chair, on the left of the lift line going down, between the ropes, with kickers on the way. Judged on air time, tricks and speed; a crash costs 200. Cross a rope and you are disqualified.", run: under("KT22 Express"), s0: 34, max: 5000, end: 92, off: COMP_OFFS["KT22 Express"], fence: 27.5, par: 3800 },
    { id: "gchief", name: "Granite Chief Freeride", kind: "free", blurb: "Top to bottom under the Granite Chief chair, with four kickers. Judged on air time, tricks and speed; a crash costs 200.", run: under("Granite Chief"), s0: 22, max: 5000, end: 30, off: COMP_OFFS["Granite Chief"], par: 3000 }
  ];
  const b = new GeoBag(), banner = (txt, col) => { const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, 1024, 128); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; let fs = 84; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; while (g.measureText(txt).width > 970 && fs > 28) { fs -= 4; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; } g.fillText(txt, 512, 66); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return worldShade(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); };
  const arch = (x, z, yaw, txt, col, rgb) => { const rx = Math.cos(yaw), rz = -Math.sin(yaw), g = H(x, z), mat = banner(txt, col); // two posts in the snow and a banner across, lettered on both faces
    for (const sd of [-1, 1]) { const px = x + rx * sd * 4.4, pz = z + rz * sd * 4.4, gp = H(px, pz); b.box(0.22, 5.2, 0.22, px, gp + 1.6, pz, STEEL, yaw); b.box(0.9, 1.4, 0.04, px + rx * sd * 0.5, gp + 5.0, pz + rz * sd * 0.5, rgb, yaw); b.cyl(0.03, 0.03, 2.4, px + rx * sd * 0.06, gp + 4.6, pz + rz * sd * 0.06, STEEL, 5); towerHits.push({ x: px, z: pz, r: 0.25 }); }
    b.box(9.0, 1.05, 0.16, x, g + 3.7, z, rgb, yaw); for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(8.7, 0.95), mat); m.position.set(x + Math.sin(yaw) * sd * 0.09, g + 3.7, z + Math.cos(yaw) * sd * 0.09); m.rotation.y = yaw + (sd < 0 ? Math.PI : 0); scene.add(m); } };
  for (const d of defs) { if (!d.run) continue; const path = compPath(d.run.pts, d.s0, Math.min(d.run.len - (d.end || 20), d.s0 + d.max), d.off); if (path.length < 20) continue;
    const S = [0]; for (let i = 1; i < path.length; i++) S.push(S[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const v = { id: d.id, name: d.name, kind: d.kind, blurb: d.blurb, path, S, len: S[S.length - 1], gates: [], fence: d.fence || 0, par: d.par || (d.kind === "race" ? S[S.length - 1] / 16.5 : d.kind === "style" ? 3200 : 2400) };
    const dir = i => { const a = path[Math.max(0, i - 1)], c = path[Math.min(path.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [(c[0] - a[0]) / l, (c[1] - a[1]) / l]; };
    const d0 = dir(0), d1 = dir(path.length - 1); v.start = { x: path[0][0], z: path[0][1], yaw: Math.atan2(d0[0], d0[1]) };
    arch(v.start.x - d0[0] * 2, v.start.z - d0[1] * 2, v.start.yaw, "START · " + d.name.toUpperCase(), "#b3261e", [0.6, 0.08, 0.06]);
    arch(path[path.length - 1][0], path[path.length - 1][1], Math.atan2(d1[0], d1[1]), "FINISH", "#14532d", [0.05, 0.3, 0.14]);
    // Giant slalom gates, set alternately left and right of the line. Each is a turning flag and an outside flag: you ski between them, round the turning pole.
    if (d.kind === "race") for (let s = 48, k = 0; s < v.len - 30; s += 30, k++) { const i = Math.round(s / 6), q = dir(i), sd = k % 2 ? 1 : -1, yaw = Math.atan2(q[0], q[1]), col = k % 2 ? [0.05, 0.2, 0.65] : [0.75, 0.08, 0.06];
      for (const o of [GATE_IN, GATE_IN + GATE_W]) { const x = path[i][0] - q[1] * sd * o, z = path[i][1] + q[0] * sd * o, g = H(x, z); for (const e of [-0.36, 0.36]) b.cyl(0.018, 0.018, 1.9, x + Math.cos(yaw) * e, g + 0.75, z - Math.sin(yaw) * e, col, 5); b.box(0.74, 0.5, 0.02, x, g + 1.42, z, col, yaw); }
      v.gates.push({ s: S[i], sd }); }
    // Rope lines down both sides of a fenced course: posts every 12 m with an orange rope and flags. Crossing one ends the run.
    if (v.fence) for (const sd of [-1, 1]) { let prev = null; for (let i = 0; i < path.length; i += 2) { const q = dir(i), x = path[i][0] - q[1] * sd * v.fence, z = path[i][1] + q[0] * sd * v.fence, g = H(x, z); b.cyl(0.028, 0.028, 1.7, x, g + 0.55, z, [0.9, 0.35, 0.08], 5); if ((i / 2) % 3 === 0) b.box(0.3, 0.2, 0.02, x, g + 1.25, z, [0.9, 0.35, 0.08], Math.atan2(q[0], q[1]));
        if (prev) { const dx = x - prev[0], dz = z - prev[2], dy = g - prev[1], hl = Math.hypot(dx, dz); b.box(0.03, 0.03, Math.hypot(hl, dy), (x + prev[0]) / 2, (g + prev[1]) / 2 + 1.05, (z + prev[2]) / 2, [0.9, 0.35, 0.08], Math.atan2(dx, dz), -Math.atan2(dy, hl)); } prev = [x, g, z]; } }
    COMP.venues.push(v); compSave(v);
  }
  if (b.p.length) { const m = new THREE.Mesh(b.build(), liftMat); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // interface
  $("compBtn").addEventListener("click", () => compList(true)); $("pComp").addEventListener("click", () => { setOverlay("pause", false); compList(true); });
  gearLocks();
}
function gearLocks() { // lock the better clothes and gear until the medal points are there; whatever you already wear stays yours
  const pts = medalPoints();
  document.querySelectorAll("#fitRows select").forEach(sl => { const cat = sl.dataset.cat, lk = GEAR_LOCK[cat]; if (!lk) return;
    for (const o of sl.options) { const need = lk[o.value] || 0, locked = need > pts && outfit[cat] !== o.value; o.disabled = locked; o.textContent = KR.OUTFIT_OPTS[cat][o.value] + (locked ? "  (locked: " + need + " medal pts)" : ""); } });
}
const GATE_IN = 3.8, GATE_W = 8;   // the turning pole stands this far off the line, the outside pole this much further
function compSynth(v) { compSynth.last = -9; // a par run down the course line, for riders to follow until you have set a run of your own
  const S = [], vp = v.kind === "race" ? 16.5 : 14; let t = 0, air = null;
  for (let i = 0; i < v.path.length; i++) { const a = v.path[Math.max(0, i - 1)], c = v.path[Math.min(v.path.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, dx = (c[0] - a[0]) / l, dz = (c[1] - a[1]) / l, ph = Math.PI * (v.S[i] - 48) / 30, amp = (GATE_IN + 1.7) * sstep(8, 44, v.S[i]), wg = v.kind === "race" ? -amp * Math.cos(ph) : 0, x = v.path[i][0] - dz * wg, z = v.path[i][1] + dx * wg;   // a clean line round every gate
    let y = H(x, z), gr = true; // off every kicker and jump on the line, landing where the arc meets the snow again
    if (air) { const ta = t - air.t0; y = air.y0 + air.vy * ta - 0.5 * G * ta * ta; if (y <= H(x, z) && ta > 0.25) { air = null; y = H(x, z); } else gr = false; }
    else if (v.kind !== "race") { const f = kickerLip(x, z); if (f && !f.lip && i - (compSynth.last || -9) > 4) { compSynth.last = i; air = { t0: t, y0: y, vy: vp * Math.sin(Math.atan(1.7 * f.hK / f.Lr)) + 4.5 }; } }
    S.push({ t, x, y, z, yaw: Math.atan2(dx, dz) - (v.kind === "race" ? Math.atan(amp * Math.PI / 30 * Math.sin(ph)) : 0), spin: 0, rot: 0, rotV: 0, sw: false, gr, cr: false, tz: 0, turn: v.kind === "race" ? Math.cos(ph) : 0, carve: 0.7, sp: vp, chg: 0, st: 0, k: 0, gd: 0, sl: 0 }); t += 6 / vp; }
  return { T: t - 6 / vp, S };
}
function compEnter(v) {
  const sv = compSave(v), rec = sv.rec && sv.rec.S && sv.rec.S.length > 8 ? sv.rec : compSynth(v), own = rec === sv.rec, h = sv.runs || 0;
  placeSkier(v.start.x, v.start.z, v.start.yaw, 0); clearTracks(); COMP.hold = true; COMP.near = null;
  if (!COMP.ghosts.length) { const pick = (cat, i) => { const ks = Object.keys(KR.OUTFIT_OPTS[cat]); return ks[(i * 3 + cat.length) % ks.length]; };
    BOTS.forEach((n, i) => { const of = Object.assign({}, outfit, { helmet: pick("helmet", i), jacket: pick("jacket", i), pants: pick("pants", i), skis: pick("skis", i), accessory: pick("accessory", i) }), R = makeRider(of), tag = mpTag(R); mpTagText(tag, n); COMP.ghosts.push({ n, R, tag, q: null, keys: Object.assign({}, NOKEYS), st: null }); }); KR.dress(rig, outfit); }
  COMP.ghosts.forEach((g, i) => { const rn = Math.pow(hash2(h * 7 + 1, i, 201), 1.3);
    if (v.kind === "race") { g.res = +(own ? sv.best * (0.955 + 0.13 * rn) : v.par * (0.97 + 0.2 * rn)).toFixed(2); g.dur = g.res; }   // a racer crosses the line at exactly the time on the board
    else { g.res = Math.round(Math.max(own ? sv.best * (1.22 - 0.36 * rn) : 0, v.par * (1.15 - 0.45 * rn)) / 10) * 10; g.dur = rec.T * (0.93 + 0.12 * hash2(h, i, 202)); }   // strong riders: they score at least a good par run, and more than you if you are ahead of par
    g.skill = 1 + Math.round(2 * (1 - rn)); g.ai = 0;
    g.off = v.kind === "race" ? 0 : (i - 2) * 1.5 + (hash2(h, i, 203) - 0.5); g.k = 0; /* racers hold the racing line so they go round every gate */ g.q = null; g.endT = 0; });
  const airs = []; { let a0 = null; rec.S.forEach((q, i) => { if (!q.gr && a0 === null) a0 = q.t; if ((q.gr || i === rec.S.length - 1) && a0 !== null) { if (q.t - a0 > 0.4) airs.push([a0, q.t]); a0 = null; } }); }   // every time the run leaves the ground
  COMP.run = { v, rec, airs, t: -3.2, S: [], recT: 0, pts0: sk.pts, air: 0, vsum: 0, vn: 0, crash: 0, wasCr: false, gate: 0, miss: 0, idx: 0, sP: 0, lastX: sk.p.x, lastZ: sk.p.z, done: false };
  setOverlay("comp", false); setOverlay("compList", false); if (!$("menu").hidden) startPlay(); paused = false; $("compHud").hidden = false;
}
function compEnd(msg) { COMP.run = null; COMP.hold = false; $("compHud").hidden = true; for (const g of COMP.ghosts) g.R.hold.visible = false; if (msg) toast(msg, 3); }
function compTick(dt, time) {
  const r = COMP.run;
  if (!r) { COMP.near = null; if (sk.mode === "ski" && sk.sp < 9) for (const v of COMP.venues) if (Math.hypot(sk.p.x - v.start.x, sk.p.z - v.start.z) < 15) COMP.near = v; return; }
  const v = r.v, hud = $("compHud"); if (r.done) return;
  if (sk.mode !== "ski" || Math.hypot(sk.p.x - r.lastX, sk.p.z - r.lastZ) > 40) return compEnd("Heat abandoned");
  r.lastX = sk.p.x; r.lastZ = sk.p.z; r.t += dt;
  if (r.t < 0) { hud.textContent = v.name + " · " + Math.ceil(-r.t); return; }
  if (COMP.hold) { COMP.hold = false; toast("Go!", 1.2); sfx("pop"); }
  // where you are along the course
  let bd = 1e9, bi = r.idx, bt = 0, lat = 0; for (let i = Math.max(0, r.idx - 3); i < Math.min(v.path.length - 1, r.idx + 14); i++) { const a = v.path[i], c = v.path[i + 1], ex = c[0] - a[0], ez = c[1] - a[1], u = clamp(((sk.p.x - a[0]) * ex + (sk.p.z - a[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1), dx = sk.p.x - a[0] - ex * u, dz = sk.p.z - a[1] - ez * u, d = Math.hypot(dx, dz); if (d < bd) { bd = d; bi = i; bt = u; lat = (ex * dz - ez * dx) / (Math.hypot(ex, ez) || 1); } }
  r.idx = bi; r.sP = v.S[bi] + bt * (v.S[bi + 1] - v.S[bi]);
  if (bd > 110) return compEnd("You left the course");
  if (r.t > (v.kind === "race" ? v.par * 4 : 300)) return compEnd("Out of time");
  // the run is recorded so the others can ski it back at you next heat
  r.recT += dt; if (r.recT >= 1 / 6) { r.recT = 0; const p = mpPack(); r.S.push({ t: +r.t.toFixed(2), x: p.x, y: p.y, z: p.z, yaw: p.yaw, spin: p.spin, rot: p.rot, rotV: p.rotV, sw: p.sw, gr: p.gr, cr: p.cr, tz: p.tz, turn: p.turn, carve: p.carve, sp: p.sp, chg: p.chg, st: p.st, k: p.k, gd: p.gd, sl: p.sl }); }
  if (!sk.ground) r.air += dt; r.vsum += sk.sp; r.vn++; if (sk.crashed && !r.wasCr) r.crash++; r.wasCr = sk.crashed;
  while (r.gate < v.gates.length && r.sP > v.gates[r.gate].s) { const g = v.gates[r.gate++], o = lat * g.sd; if (o < GATE_IN - 0.35 || o > GATE_IN + GATE_W + 0.35) { compEnter(v); toast("Missed gate " + r.gate + ": back to the start", 3); return; } }
  if (v.fence && Math.abs(lat) > v.fence) return compEnd("Disqualified: you crossed the rope");
  // the other riders
  const a = 1 - Math.exp(-12 * dt), S = r.rec.S;
  for (const g of COMP.ghosts) { const tau = r.t * r.rec.T / g.dur; while (g.k < S.length - 2 && S[g.k + 1].t < tau) g.k++;
    const A = S[g.k], B = S[g.k + 1], u = clamp((tau - A.t) / (B.t - A.t || 1), 0, 1), yaw = A.yaw + wrap(B.yaw - A.yaw) * u, ox = lerp(A.x, B.x, u), oz = lerp(A.z, B.z, u), x = ox + Math.cos(yaw) * g.off, z = oz - Math.sin(yaw) * g.off;
    if (tau > r.rec.T) { g.endT += dt; if (g.endT > 2.5) { g.R.hold.visible = false; continue; } }
    g.st = Object.assign({}, A, { x, y: lerp(A.y, B.y, u) + H(x, z) - H(ox, oz), z, yaw, spin: lerp(A.spin, B.spin, u), rot: lerp(A.rot, B.rot, u), md: "ski", play: true, li: -1, res: "palisades", sp: tau > r.rec.T ? 0 : A.sp });
    // They throw tricks off every jump: spins by skill and air time, a flip when there is room, a grab through the middle.
    if (v.kind !== "race") { while (g.ai < r.airs.length - 1 && tau > r.airs[g.ai][1]) g.ai++; const ar = r.airs[g.ai]; if (ar && tau > ar[0] && tau < ar[1]) { const ua = (tau - ar[0]) / (ar[1] - ar[0]), du = ar[1] - ar[0], e = smooth(ua), n = Math.min(g.skill + 1, Math.max(1, Math.floor(du / 0.45))), sgn = (g.ai + g.skill) % 2 ? 1 : -1;
      g.st.spin += sgn * TAU * n * e; if (du > 0.95 && g.skill >= 2) g.st.rot += TAU * e * ((g.ai % 2) ? -1 : 1); if (ua > 0.2 && ua < 0.8) g.st.k |= 1 << MP_KEYS.indexOf(g.skill > 2 ? "grabS" : "grab"); } }
    poseRemote(g, dt, time, a); }
  const trick = sk.pts - r.pts0;
  hud.textContent = v.name + " · " + (v.kind === "race" ? fmtRes(v, r.t) + " · gate " + r.gate + "/" + v.gates.length : fmtRes(v, compScore(r)) + " · " + Math.max(0, Math.round(v.len - r.sP)) + " m to go");
  if (r.sP >= v.len - 2) compFinish();
}
function compScore(r) { const tr = sk.pts - r.pts0; return Math.max(0, r.v.kind === "style" ? (r.crash ? 0 : tr) : tr + Math.round(100 * r.air) + Math.round(15 * (r.vn ? r.vsum / r.vn : 0) * MPH) - 200 * r.crash); }
function compFinish() {
  const r = COMP.run, v = r.v, sv = compSave(v), before = medalPoints(); r.done = true;
  const mine = v.kind === "race" ? +r.t.toFixed(2) : compScore(r), me = MP.myName || "You";
  const heat = COMP.ghosts.map(g => ({ n: g.n, r: v.kind === "race" ? +g.res.toFixed(2) : g.res })).concat([{ n: me, r: mine, me: true }]).sort((a, b) => v.kind === "race" ? a.r - b.r : b.r - a.r);
  const place = heat.findIndex(e => e.me) + 1, trophy = place <= 3 ? 4 - place : 0, pb = better(v, mine, sv.best);
  if (r.S.length) r.S.push(Object.assign({}, r.S[r.S.length - 1], { t: +r.t.toFixed(2), x: +sk.p.x.toFixed(2), y: +sk.p.y.toFixed(2), z: +sk.p.z.toFixed(2) }));   // the last sample is the finish line itself, so a replay ends exactly on its time
  if (pb || !sv.rec) { if (pb) sv.best = mine; sv.rec = { T: +r.t.toFixed(2), S: r.S }; }
  sv.trophy = Math.max(sv.trophy || 0, trophy); sv.runs = (sv.runs || 0) + 1;
  for (const e of heat) { const n = e.me ? "You" : e.n, old = sv.board.find(q => q.n === n); if (!old) sv.board.push({ n, r: e.r }); else if (better(v, e.r, old.r)) old.r = e.r; }
  sv.board.sort((a, b) => v.kind === "race" ? a.r - b.r : b.r - a.r); sv.board.length = Math.min(sv.board.length, 8);
  store.set("pal-comp", COMP.save); gearLocks(); sk.sp = Math.min(sk.sp, 6); $("compHud").hidden = true;
  // results card
  const card = $("compCard"), el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }; card.textContent = "";
  card.append(el("h3", v.name), el("p", place === 1 ? "You won the heat." : "You placed " + place + " of " + heat.length + ".", "compLead"));
  const tr = el("div", (trophy ? TROPHY[trophy] + " trophy" : "No trophy this heat") + (pb ? "  ·  personal best" : ""), "trophy"); tr.style.color = TROPHY_COL[trophy]; card.append(tr);
  const tb = el("table", null, "board"); heat.forEach((e, i) => { const row = el("tr", null, e.me ? "me" : ""); row.append(el("td", String(i + 1)), el("td", e.n), el("td", fmtRes(v, e.r))); tb.append(row); }); card.append(tb);
  const after = medalPoints(), news = []; if (after > before) { for (const n in LIFT_LOCK) if (LIFT_LOCK[n] > before && LIFT_LOCK[n] <= after) news.push(n + " lift"); for (const c in GEAR_LOCK) for (const k in GEAR_LOCK[c]) if (GEAR_LOCK[c][k] > before && GEAR_LOCK[c][k] <= after) news.push(KR.OUTFIT_OPTS[c][k]); }
  card.append(el("p", "Medal points: " + after + (news.length ? "  ·  Unlocked: " + news.join(", ") : ""), "compLead"));
  const row = el("div", null, "row"), again = el("button", "Run again", "btn"), free = el("button", "Free ski", "btn ghost"), all = el("button", "All competitions", "btn ghost"); row.style.justifyContent = "center";
  again.addEventListener("click", () => compEnter(v)); free.addEventListener("click", () => { setOverlay("comp", false); compEnd(); }); all.addEventListener("click", () => { setOverlay("comp", false); compEnd(); compList(true); });
  row.append(again, free, all); card.append(row); setOverlay("comp", true);
}
function compList(on) { // every venue with your best, your trophy and its leaderboard, and what the medal points open
  setOverlay("compList", on); if (!on) return; const card = $("compListCard"), pts = medalPoints(), el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }; card.textContent = "";
  card.append(el("h3", "Competitions"), el("p", "Medal points: " + pts + " of " + COMP.venues.length * 3 + ".  Gold 3, silver 2, bronze 1, counting your best trophy at each venue.", "compLead"));
  for (const v of COMP.venues) { const sv = compSave(v), box = el("div", null, "venue"), head = el("div", null, "row"), go = el("button", "Go to the start", "btn"); go.style.cssText = "padding:8px 13px;font-size:13px;margin-left:auto";
    const tn = el("b", v.name), tp = el("span", TROPHY[sv.trophy || 0], "trophy"); tp.style.color = TROPHY_COL[sv.trophy || 0]; head.append(tn, tp, go); box.append(head, el("p", v.blurb + "  Your best: " + fmtRes(v, sv.best) + ".", "compLead"));
    go.addEventListener("click", () => { compList(false); if (!$("menu").hidden) startPlay(); paused = false; const q = v.path[0], d = Math.atan2(v.path[1][0] - q[0], v.path[1][1] - q[1]); placeSkier(q[0] - Math.sin(d) * 8, q[1] - Math.cos(d) * 8, d, 0); toast("Press E under the start arch to enter", 3.5); });
    if (sv.board.length) { const tb = el("table", null, "board"); sv.board.forEach((e, i) => { const row = el("tr", null, e.n === "You" ? "me" : ""); row.append(el("td", String(i + 1)), el("td", e.n === "You" ? (MP.myName || "You") : e.n), el("td", fmtRes(v, e.r))); tb.append(row); }); box.append(tb); }
    card.append(box); }
  const un = el("div", null, "venue"); un.append(el("b", "Unlocks")); const lst = el("p", null, "compLead"), items = [];
  for (const n in LIFT_LOCK) items.push([LIFT_LOCK[n], n + " lift"]); for (const c in GEAR_LOCK) for (const k in GEAR_LOCK[c]) items.push([GEAR_LOCK[c][k], KR.OUTFIT_OPTS[c][k]]);
  items.sort((a, b) => a[0] - b[0]); for (let p = 1; p <= 5; p++) { const row = el("div", (p <= pts ? "Open" : "Locked") + " at " + p + (p === 1 ? " point: " : " points: ") + items.filter(i => i[0] === p).map(i => i[1]).join(", ")); row.style.opacity = p <= pts ? 1 : 0.6; lst.append(row); }
  un.append(lst); card.append(un); const close = el("button", "Close", "btn ghost"); close.addEventListener("click", () => compList(false)); const rw = el("div", null, "row"); rw.style.justifyContent = "center"; rw.append(close); card.append(rw);
}
