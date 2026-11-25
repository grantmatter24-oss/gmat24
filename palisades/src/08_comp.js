/* ---------- competitions, trophies and unlocks ----------
   Venues on the mountain, each between a start ring and a finish ring. Ski to a start ring (or pick one from the Competitions list) and press E.
   Four are heats against five riders; the rest are solo challenges judged against fixed bronze, silver and gold marks, with a prize for a first gold.
   The other riders ski like you: each one replays your own best run on that course, a little faster or slower and a little to one side,
   so beating them means beating yourself. Before you have a run on record they ski the course line at a par pace.
   Placing in a heat wins a trophy; trophies are worth medal points (gold 3, silver 2, bronze 1, best per venue), and medal points open
   the better clothes and gear. Every lift and run is open from the start. */
const COMP = { venues: [], near: null, run: null, hold: false, ghosts: [], save: store.get("pal-comp", {}) || {} };
const TROPHY = ["No trophy", "Bronze", "Silver", "Gold"], TROPHY_COL = ["#7d8a96", "#c27a3a", "#c9d1d8", "#f0c23b"], BOTS = ["Koda", "Juniper", "Rook", "Sierra", "Aspen"];
const LIFT_LOCK = {};   // every lift and run is open to everyone; medal points only unlock clothes and gear
const GEAR_LOCK = {};   // gear is bought (or lifted) at Parallel Mountain Sports now; each medal point takes 10% off the prices there, up to half
const compSave = v => COMP.save[v.id] || (COMP.save[v.id] = { best: null, trophy: 0, board: [], rec: null, runs: 0 });
const medalPoints = () => COMP.venues.reduce((a, v) => a + (compSave(v).trophy || 0), 0);
const liftLocked = L => (LIFT_LOCK[L.name] || 0) > medalPoints();
const timed = v => v.kind === "race" || v.kind === "trial";
const fmtRes = (v, r) => r == null ? "—" : timed(v) ? (Math.floor(r / 60) + ":" + (r % 60 < 10 ? "0" : "") + (r % 60).toFixed(2)) : v.kind === "speed" ? (units === "imp" ? (r * MPH).toFixed(1) + " mph" : (r * KMH).toFixed(1) + " km/h") : v.kind === "air" ? (units === "imp" ? Math.round(r * FT) + " ft" : r.toFixed(1) + " m") : Math.round(r).toLocaleString() + " pts";
const better = (v, a, b) => b == null || (timed(v) ? a < b : a > b);
const medalOf = (v, r) => { let n = 0; if (r != null) for (const t of v.tgt) if (timed(v) ? r <= t : r >= t) n++; return n; };   // a solo challenge is judged against fixed marks: bronze, silver, gold
const RINGS = [], PRIZE_AT = {}, GOLD_PTS = 50000;

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
  /* Solo challenges, each against fixed marks. Gold is meant to be hard: it takes a near perfect run. A first gold wins a prize that cannot be bought, and 50,000 points. */
  const line = (x0, z0, x1, z1) => ({ pts: [[x0, z0], [x1, z1]], len: Math.hypot(x1 - x0, z1 - z0) });
  const steepest = () => { let best = null; for (const r of WORLD.runs) { if (!r.g || r.len < 430) continue; const P = compPath(r.pts, 10, r.len - 10, 0); for (let i = 0; i + 58 < P.length; i += 4) { const a = P[i], e = P[i + 58]; if (Math.hypot(e[0] - a[0], e[1] - a[1]) < 58 * 6 * 0.95) continue; const drop = Hsmooth(a[0], a[1]) - Hsmooth(e[0], e[1]); if (best && drop <= best.drop) continue; let ok = true; for (let k = i; k <= i + 58 && ok; k += 3) ok = cliffK(P[k][0], P[k][1]) < 0.15 && !buildingAt(P[k][0], P[k][1]) && !treeHit(P[k][0], P[k][1], 2); if (ok) best = { drop, n: r.n, a, e }; } } return best && Object.assign(line(best.a[0], best.a[1], best.e[0], best.e[1]), { n: best.n }); };   // the steepest straight, groomed 350 m on the mountain
  const bigKick = () => { const q = PARK.filter(p => p.k === "table" && (p.kind === "big" || p.kind === "mid")).sort((a, c2) => c2.hK * c2.Lr - a.hK * a.Lr)[0]; if (!q) return null; const l = Math.hypot(q.dx, q.dz) || 1, ux = q.dx / l, uz = q.dz / l; return line(q.x - ux * 150, q.z - uz * 150, q.x + ux * 130, q.z + uz * 130); };   // the biggest table in the parks, with a long run-in
  const zone = ar => { const P = ar.p || []; if (P.length < 3) return null; let cx = 0, cz = 0, top = P[0]; for (const q of P) { cx += q[0] / P.length; cz += q[1] / P.length; if (Hsmooth(q[0], q[1]) > Hsmooth(top[0], top[1])) top = q; } let x = lerp(top[0], cx, 0.15), z = lerp(top[1], cz, 0.15), len = 0, n = 0; const pts = [[x, z]];
    while (len < 560 && inWorld(x, z, 120)) { const e = 10, gx = Hsmooth(x + e, z) - Hsmooth(x - e, z), gz = Hsmooth(x, z + e) - Hsmooth(x, z - e), gl = Math.hypot(gx, gz); if (gl / (2 * e) < 0.1 && len > 200) break; if (gl < 1e-4) break; x -= gx / gl * 12; z -= gz / gl * 12; len += 12; pts.push([x, z]); }   // down the fall line from the top of the area
    for (const q of CLIFFS) { let near = false; for (let k = 0; k < pts.length && !near; k += 2) near = Math.hypot(q.x - pts[k][0], q.z - pts[k][1]) < 70 + q.r; if (near) n++; } return len >= 240 ? { pts, len, n, name: ar.n } : null; };
  const zones = (WORLD.areas || []).map(zone).filter(Boolean).sort((a, c2) => c2.n - a.n).slice(0, 3), st = steepest(), ZP = [["jacket", "champ"], ["helmet", "laurel"], ["pants", "champ"]];
  defs.push({ id: "trial", name: "Mountain Run Time Trial", kind: "trial", solo: true, blurb: "Top to bottom of Mountain Run against the clock, on any line you like.", run: runBy(["Mountain Run"]), s0: 30, max: 6000, end: 40, off: 0, wide: 420, tgt: TGT.trial, prize: ["accessory", "medal"] });
  if (st) defs.push({ id: "speed", name: "Speed Trap · " + st.n, kind: "speed", solo: true, blurb: "Straight down the steepest groomed pitch on the mountain. Your score is the fastest you go between the rings.", run: st, s0: 0, max: 6000, end: 0, off: 0, wide: 90, tgt: TGT.speed, prize: ["skis", "champ"] });
  { const k = bigKick(); if (k) defs.push({ id: "air", name: "Big Air", kind: "air", solo: true, blurb: "One kicker. Your score is the longest jump you land on your feet between the rings.", run: k, s0: 0, max: 6000, end: 0, off: 0, wide: 70, tgt: TGT.air, prize: ["accessory", "halo"] }); }
  zones.forEach((z, i) => defs.push({ id: "zone" + (i + 1), name: z.name + " Cliff Session", kind: "tricks", solo: true, blurb: "Open steep ground with " + z.n + " cliffs on it, top to bottom on any line. Your score is the trick points you land on the way down.", run: z, s0: 0, max: 6000, end: 0, off: 0, wide: 190, tgt: TGT.tricks.map(t => Math.round(t * z.len / 100) * 100), prize: ZP[i] }));
  const b = new GeoBag(), banner = (txt, col) => { const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, 1024, 128); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; let fs = 84; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; while (g.measureText(txt).width > 970 && fs > 28) { fs -= 4; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; } g.fillText(txt, 512, 66); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return worldShade(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); };
  /* The start and finish of every course: a ring of light hanging just clear of the snow, with its name above it. */
  const ring = (x, z, yaw, txt, col, css, fin) => { const g = H(x, z), grp = new THREE.Group(), core = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.15, 10, 56), new THREE.MeshBasicMaterial({ color: col })), halo = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.6, 10, 56), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })),
      veil = new THREE.Mesh(new THREE.CircleGeometry(3.5, 44), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), mat = banner(txt, css); grp.position.set(x, g + 4.4, z); grp.rotation.y = yaw; halo.renderOrder = 5; veil.renderOrder = 5; grp.add(core, halo, veil);
    for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 0.68), mat); m.position.set(0, 4.5, sd * 0.02); m.rotation.y = sd < 0 ? Math.PI : 0; grp.add(m); } scene.add(grp); const o = { grp, halo, veil, y0: g + 4.4, ph: RINGS.length * 1.7, fin }; RINGS.push(o); return o; };
  for (const d of defs) { if (!d.run) continue; const path = compPath(d.run.pts, d.s0, Math.min(d.run.len - (d.end || 20), d.s0 + d.max), d.off); if (path.length < 20) continue;
    const S = [0]; for (let i = 1; i < path.length; i++) S.push(S[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const v = { id: d.id, name: d.name, kind: d.kind, blurb: d.blurb, path, S, len: S[S.length - 1], gates: [], fence: d.fence || 0, par: d.par || (d.kind === "race" ? S[S.length - 1] / 16.5 : d.kind === "style" ? 3200 : 2400) };
    const dir = i => { const a = path[Math.max(0, i - 1)], c = path[Math.min(path.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [(c[0] - a[0]) / l, (c[1] - a[1]) / l]; };
    const d0 = dir(0), d1 = dir(path.length - 1); v.start = { x: path[0][0], z: path[0][1], yaw: Math.atan2(d0[0], d0[1]) };
    v.solo = !!d.solo; v.tgt = d.tgt; v.wide = d.wide; v.prize = d.prize; if (d.prize) PRIZE_AT[d.prize.join(":")] = d.name; v.end = { x: path[path.length - 1][0], z: path[path.length - 1][1] };
    ring(v.start.x - d0[0] * 2, v.start.z - d0[1] * 2, v.start.yaw, "START · " + d.name.toUpperCase(), 0x3ab8ff, "#0d3a66", false).v = v;
    ring(v.end.x, v.end.z, Math.atan2(d1[0], d1[1]), "FINISH", 0x39ffb0, "#0d4a33", true).v = v;
    // Giant slalom gates, set alternately left and right of the line. Each is a turning flag and an outside flag: you ski between them, round the turning pole.
    if (d.kind === "race") for (let s = 48, k = 0; s < v.len - 30; s += 30, k++) { const i = Math.round(s / 6), q = dir(i), sd = k % 2 ? 1 : -1, yaw = Math.atan2(q[0], q[1]), col = k % 2 ? [0.05, 0.2, 0.65] : [0.75, 0.08, 0.06];
      for (const o of [GATE_IN, GATE_IN + GATE_W]) { const x = path[i][0] - q[1] * sd * o, z = path[i][1] + q[0] * sd * o, g = H(x, z); for (const e of [-0.36, 0.36]) b.cyl(0.018, 0.018, 1.9, x + Math.cos(yaw) * e, g + 0.75, z - Math.sin(yaw) * e, col, 5); b.box(0.74, 0.5, 0.02, x, g + 1.42, z, col, yaw); }
      v.gates.push({ s: S[i], sd }); }
    // Rope lines down both sides of a fenced course: posts every 12 m with an orange rope and flags. Crossing one ends the run.
    if (v.fence) { const b = new GeoBag(); for (const sd of [-1, 1]) { let prev = null; for (let i = 0; i < path.length; i += 2) { const q = dir(i), x = path[i][0] - q[1] * sd * v.fence, z = path[i][1] + q[0] * sd * v.fence, g = H(x, z); b.cyl(0.028, 0.028, 1.7, x, g + 0.55, z, [0.9, 0.35, 0.08], 5); if ((i / 2) % 3 === 0) b.box(0.3, 0.2, 0.02, x, g + 1.25, z, [0.9, 0.35, 0.08], Math.atan2(q[0], q[1]));
        if (prev) { const dx = x - prev[0], dz = z - prev[2], dy = g - prev[1], hl = Math.hypot(dx, dz); b.box(0.03, 0.03, Math.hypot(hl, dy), (x + prev[0]) / 2, (g + prev[1]) / 2 + 1.05, (z + prev[2]) / 2, [0.9, 0.35, 0.08], Math.atan2(dx, dz), -Math.atan2(dy, hl)); } prev = [x, g, z]; } }
      const fm = new THREE.Mesh(b.build(), liftMat); fm.castShadow = true; fm.frustumCulled = false; fm.visible = false; scene.add(fm); v.fenceMesh = fm; }   // put up for a heat, taken down after it
    COMP.venues.push(v); compSave(v);
  }
  if (b.p.length) { const m = new THREE.Mesh(b.build(), liftMat); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // interface
  $("compBtn").addEventListener("click", () => compList(true)); $("pComp").addEventListener("click", () => { setOverlay("pause", false); compList(true); });
  gearLocks();
}
function gearLocks() { // the locker only holds what you own: the rest is on the racks at Parallel Mountain Sports
  ownInit();
  document.querySelectorAll("#fitRows select").forEach(sl => { const cat = sl.dataset.cat; if (!STORE_CATS.some(q => q[0] === cat)) return;
    for (const o of sl.options) { const locked = !owns(cat, o.value) && outfit[cat] !== o.value; o.disabled = locked; o.textContent = KR.OUTFIT_OPTS[cat][o.value] + (locked ? (PRIZE_AT[cat + ":" + o.value] ? "  (win gold at " + PRIZE_AT[cat + ":" + o.value] + ")" : "  (at " + (shopFor(cat, o.value) || "the village shops") + ")") : ""); } });
}
const TGT = { trial: [140, 120, 106], speed: [38, 42, 44.4], air: [25, 38, 50], tricks: [5, 9.5, 16] };   /* a flawless test run: 100.8 s, 45.0 m/s (100.6 mph), 53.9 m */   // bronze, silver, gold: seconds, m/s, metres, and trick points per metre of the zone (set from test runs of each course)
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
  const sv = compSave(v), rec = v.solo ? { T: 1, S: [] } : sv.rec && sv.rec.S && sv.rec.S.length > 8 ? sv.rec : compSynth(v), own = rec === sv.rec, h = sv.runs || 0;
  placeSkier(v.start.x, v.start.z, v.start.yaw, 0); clearTracks(); COMP.hold = true; COMP.near = null;
  if (!COMP.ghosts.length) { const pick = (cat, i) => { const ks = Object.keys(KR.OUTFIT_OPTS[cat]); return ks[(i * 3 + cat.length) % ks.length]; };
    BOTS.forEach((n, i) => { const of = Object.assign({}, outfit, { helmet: pick("helmet", i), jacket: pick("jacket", i), pants: pick("pants", i), skis: pick("skis", i), accessory: pick("accessory", i) }), R = makeRider(of), tag = mpTag(R); mpTagText(tag, n); COMP.ghosts.push({ n, R, tag, q: null, keys: Object.assign({}, NOKEYS), st: null }); }); dressRig(rig, outfit); }
  if (v.solo) COMP.ghosts.forEach(g => { g.R.hold.visible = false; }); else COMP.ghosts.forEach((g, i) => { const rn = Math.pow(hash2(h * 7 + 1, i, 201), 1.3);
    if (v.kind === "race") { g.res = +(own ? sv.best * (0.955 + 0.13 * rn) : v.par * (0.97 + 0.2 * rn)).toFixed(2); g.dur = g.res; }   // a racer crosses the line at exactly the time on the board
    else { g.res = Math.round(Math.max(own ? sv.best * (1.22 - 0.36 * rn) : 0, v.par * (1.15 - 0.45 * rn)) / 10) * 10; g.dur = rec.T * (0.93 + 0.12 * hash2(h, i, 202)); }   // strong riders: they score at least a good par run, and more than you if you are ahead of par
    g.skill = 1 + Math.round(2 * (1 - rn)); g.ai = 0;
    g.off = v.kind === "race" ? 0 : (i - 2) * 1.5 + (hash2(h, i, 203) - 0.5); g.k = 0; /* racers hold the racing line so they go round every gate */ g.q = null; g.endT = 0; });
  const airs = []; { let a0 = null; rec.S.forEach((q, i) => { if (!q.gr && a0 === null) a0 = q.t; if ((q.gr || i === rec.S.length - 1) && a0 !== null) { if (q.t - a0 > 0.4) airs.push([a0, q.t]); a0 = null; } }); }   // every time the run leaves the ground
  COMP.run = { v, rec, airs, t: -3.2, S: [], recT: 0, pts0: sk.pts, air: 0, vsum: 0, vn: 0, crash: 0, wasCr: false, gate: 0, miss: 0, idx: 0, sP: 0, lastX: sk.p.x, lastZ: sk.p.z, done: false, vmax: 0, best: 0, ja: null };
  setOverlay("comp", false); setOverlay("compList", false); if (!$("menu").hidden) startPlay(); paused = false; $("compHud").hidden = false;
  for (const q of COMP.venues) if (q.fenceMesh) q.fenceMesh.visible = q === v;
}
function compEnd(msg) { COMP.run = null; COMP.hold = false; for (const v of COMP.venues) if (v.fenceMesh) v.fenceMesh.visible = false; $("compHud").hidden = true; for (const g of COMP.ghosts) g.R.hold.visible = false; if (msg) toast(msg, 3); }
function compTick(dt, time) {
  const r = COMP.run;
  for (const q of RINGS) { if (Math.abs(q.grp.position.x - sk.p.x) + Math.abs(q.grp.position.z - sk.p.z) > 2600) continue; const s = Math.sin(time * 1.7 + q.ph), live = r && r.v === q.v && q.fin ? 1.6 : 1; q.grp.position.y = q.y0 + 0.28 * s; q.halo.scale.setScalar(1 + 0.05 * Math.sin(time * 2.6 + q.ph)); q.halo.material.opacity = (0.2 + 0.09 * s) * live; q.veil.material.opacity = (0.06 + 0.03 * s) * live; }   // the rings bob and breathe; your finish burns brighter
  if (!r) { COMP.near = null; if (sk.mode === "ski" && sk.sp < 9) for (const v of COMP.venues) if (Math.hypot(sk.p.x - v.start.x, sk.p.z - v.start.z) < 15) COMP.near = v; return; }
  const v = r.v, hud = $("compHud"); if (r.done) return;
  if (sk.mode !== "ski" || Math.hypot(sk.p.x - r.lastX, sk.p.z - r.lastZ) > 40) return compEnd("Heat abandoned");
  r.lastX = sk.p.x; r.lastZ = sk.p.z; r.t += dt;
  if (r.t < 0) { hud.textContent = v.name + " · " + Math.ceil(-r.t); return; }
  if (COMP.hold) { COMP.hold = false; toast("Go!", 1.2); sfx("pop"); }
  // where you are along the course
  let bd = 1e9, bi = r.idx, bt = 0, lat = 0; for (let i = Math.max(0, r.idx - 3); i < Math.min(v.path.length - 1, r.idx + 14); i++) { const a = v.path[i], c = v.path[i + 1], ex = c[0] - a[0], ez = c[1] - a[1], u = clamp(((sk.p.x - a[0]) * ex + (sk.p.z - a[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1), dx = sk.p.x - a[0] - ex * u, dz = sk.p.z - a[1] - ez * u, d = Math.hypot(dx, dz); if (d < bd) { bd = d; bi = i; bt = u; lat = (ex * dz - ez * dx) / (Math.hypot(ex, ez) || 1); } }
  r.idx = bi; r.sP = v.S[bi] + bt * (v.S[bi + 1] - v.S[bi]);
  if (bd > (v.wide || 110)) return compEnd("You left the course");
  if (r.t > (v.kind === "race" ? v.par * 4 : v.kind === "trial" ? v.tgt[0] * 2.5 : 300)) return compEnd("Out of time");
  // the run is recorded so the others can ski it back at you next heat
  r.recT += dt; if (!v.solo && !r.fr && r.recT >= 1 / 6) { r.recT = 0; const p = mpPack(); r.S.push({ t: +r.t.toFixed(2), x: p.x, y: p.y, z: p.z, yaw: p.yaw, spin: p.spin, rot: p.rot, rotV: p.rotV, sw: p.sw, gr: p.gr, cr: p.cr, tz: p.tz, turn: p.turn, carve: p.carve, sp: p.sp, chg: p.chg, st: p.st, k: p.k, gd: p.gd, sl: p.sl }); }
  if (v.solo) { r.vmax = Math.max(r.vmax, sk.ground ? sk.sp : Math.hypot(sk.v.x, sk.v.z)); if (!sk.ground && !sk.crashed) { if (!r.ja) r.ja = [sk.p.x, sk.p.z]; } else { if (r.ja && !sk.crashed) r.best = Math.max(r.best, Math.hypot(sk.p.x - r.ja[0], sk.p.z - r.ja[1])); r.ja = null; } }   // top speed; the longest jump landed on your feet
  if (!sk.ground) r.air += dt; r.vsum += sk.sp; r.vn++; if (sk.crashed && !r.wasCr) r.crash++; r.wasCr = sk.crashed;
  while (r.gate < v.gates.length && r.sP > v.gates[r.gate].s) { const g = v.gates[r.gate++], o = lat * g.sd; if (o < GATE_IN - 0.35 || o > GATE_IN + GATE_W + 0.35) { if (r.fr) { r.pen += 5; toast("Missed gate " + r.gate + ": 5 seconds added", 2.5); } else { compEnter(v); toast("Missed gate " + r.gate + ": back to the start", 3); return; } } }
  if (v.fence && Math.abs(lat) > v.fence) return compEnd("Disqualified: you crossed the rope");
  // the other riders
  const a = 1 - Math.exp(-12 * dt), S = r.rec.S;
  if (!v.solo && !r.fr) for (const g of COMP.ghosts) { const tau = r.t * r.rec.T / g.dur; while (g.k < S.length - 2 && S[g.k + 1].t < tau) g.k++;
    const A = S[g.k], B = S[g.k + 1], u = clamp((tau - A.t) / (B.t - A.t || 1), 0, 1), yaw = A.yaw + wrap(B.yaw - A.yaw) * u, ox = lerp(A.x, B.x, u), oz = lerp(A.z, B.z, u), x = ox + Math.cos(yaw) * g.off, z = oz - Math.sin(yaw) * g.off;
    if (tau > r.rec.T) { g.endT += dt; if (g.endT > 2.5) { g.R.hold.visible = false; continue; } }
    g.st = Object.assign({}, A, { x, y: lerp(A.y, B.y, u) + H(x, z) - H(ox, oz), z, yaw, spin: lerp(A.spin, B.spin, u), rot: lerp(A.rot, B.rot, u), md: "ski", play: true, li: -1, res: "palisades", sp: tau > r.rec.T ? 0 : A.sp });
    // They throw tricks off every jump: spins by skill and air time, a flip when there is room, a grab through the middle.
    if (v.kind !== "race") { while (g.ai < r.airs.length - 1 && tau > r.airs[g.ai][1]) g.ai++; const ar = r.airs[g.ai]; if (ar && tau > ar[0] && tau < ar[1]) { const ua = (tau - ar[0]) / (ar[1] - ar[0]), du = ar[1] - ar[0], e = smooth(ua), n = Math.min(g.skill + 1, Math.max(1, Math.floor(du / 0.45))), sgn = (g.ai + g.skill) % 2 ? 1 : -1;
      g.st.spin += sgn * TAU * n * e; if (du > 0.95 && g.skill >= 2) g.st.rot += TAU * e * ((g.ai % 2) ? -1 : 1); if (ua > 0.2 && ua < 0.8) g.st.k |= 1 << MP_KEYS.indexOf(g.skill > 2 ? "grabS" : "grab"); } }
    poseRemote(g, dt, time, a); }
  const trick = sk.pts - r.pts0;
  const togo = " · " + Math.max(0, Math.round(v.len - r.sP)) + " m to go", cur = timed(v) ? r.t : compScore(r), md = v.solo ? medalOf(v, timed(v) ? (r.t <= v.tgt[2] ? r.t : r.t <= v.tgt[1] ? r.t : r.t) : cur) : 0, nxt = v.solo ? (timed(v) ? (r.t <= v.tgt[2] ? " · gold pace " + fmtRes(v, v.tgt[2]) : r.t <= v.tgt[1] ? " · silver pace " + fmtRes(v, v.tgt[1]) : r.t <= v.tgt[0] ? " · bronze pace " + fmtRes(v, v.tgt[0]) : "") : md >= 3 ? " · GOLD" : " · " + TROPHY[md + 1].toLowerCase() + " at " + fmtRes(v, v.tgt[md])) : "";
  if (r.fr) hud.textContent = raceHud(r); else hud.textContent = v.name + " · " + (v.kind === "race" ? fmtRes(v, r.t) + " · gate " + r.gate + "/" + v.gates.length : v.kind === "speed" ? "now " + fmtRes(v, sk.sp) + " · top " + fmtRes(v, r.vmax) + nxt : v.kind === "air" ? "longest " + fmtRes(v, r.best) + nxt : fmtRes(v, cur) + togo + nxt);
  if (r.sP >= v.len - 2) compFinish();
}
function compScore(r) { const tr = sk.pts - r.pts0; if (r.v.kind === "speed") return r.vmax; if (r.v.kind === "air") return r.best; if (r.v.kind === "tricks") return Math.max(0, tr); return Math.max(0, r.v.kind === "style" ? (r.crash ? 0 : tr) : tr + Math.round(100 * r.air) + Math.round(15 * (r.vn ? r.vsum / r.vn : 0) * MPH) - 200 * r.crash); }
function compFinish() {
  if (COMP.run.fr) return raceFinish();
  const r = COMP.run, v = r.v, sv = compSave(v), before = medalPoints(); r.done = true;
  const mine = timed(v) ? +r.t.toFixed(2) : +compScore(r).toFixed(2), me = MP.myName || "You";
  const heat = (v.solo ? v.tgt.map((t, i) => ({ n: TROPHY[i + 1] + " mark", r: t })) : COMP.ghosts.map(g => ({ n: g.n, r: v.kind === "race" ? +g.res.toFixed(2) : g.res }))).concat([{ n: me, r: mine, me: true }]).sort((a, b) => timed(v) ? a.r - b.r : b.r - a.r);
  const place = heat.findIndex(e => e.me) + 1, trophy = v.solo ? medalOf(v, mine) : place <= 3 ? 4 - place : 0, pb = better(v, mine, sv.best);
  let won = ""; if (v.solo && trophy === 3 && !sv.prize) { sv.prize = true; const [pc, pk] = v.prize; ownInit(); if (!owns(pc, pk)) OWNED[pc].push(pk); store.set("pal-owned", OWNED); sk.pts += GOLD_PTS; store.set("pal-pts", Math.round(sk.pts)); won = KR.OUTFIT_OPTS[pc][pk]; sfx("land"); }   // a first gold: the prize, and the purse
  if (r.S.length) r.S.push(Object.assign({}, r.S[r.S.length - 1], { t: +r.t.toFixed(2), x: +sk.p.x.toFixed(2), y: +sk.p.y.toFixed(2), z: +sk.p.z.toFixed(2) }));   // the last sample is the finish line itself, so a replay ends exactly on its time
  if (v.solo) { if (pb) sv.best = mine; } else if (pb || !sv.rec) { if (pb) sv.best = mine; sv.rec = { T: +r.t.toFixed(2), S: r.S }; }
  sv.trophy = Math.max(sv.trophy || 0, trophy); sv.runs = (sv.runs || 0) + 1;
  for (const e of heat) { if (v.solo && !e.me) continue; const n = e.me ? "You" : e.n, old = sv.board.find(q => q.n === n); if (!old) sv.board.push({ n, r: e.r }); else if (better(v, e.r, old.r)) old.r = e.r; }
  sv.board.sort((a, b) => timed(v) ? a.r - b.r : b.r - a.r); sv.board.length = Math.min(sv.board.length, 8);
  store.set("pal-comp", COMP.save); gearLocks(); sk.sp = Math.min(sk.sp, 6); $("compHud").hidden = true;
  // results card
  const card = $("compCard"), el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }; card.textContent = "";
  card.append(el("h3", v.name), el("p", v.solo ? (trophy === 3 ? "Gold. That is as good as it gets." : trophy ? "You made the " + TROPHY[trophy].toLowerCase() + " mark with " + fmtRes(v, mine) + ". " + TROPHY[trophy + 1] + " is " + fmtRes(v, v.tgt[trophy]) + "." : "You scored " + fmtRes(v, mine) + ". Bronze is " + fmtRes(v, v.tgt[0]) + ".") : place === 1 ? "You won the heat." : "You placed " + place + " of " + heat.length + ".", "compLead"));
  if (won) card.append(el("p", "Prize won: " + won + ". It is in your locker, and " + GOLD_PTS.toLocaleString() + " pts are in your account.", "compLead"));
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
    const fr = el("button", "Race friends", "btn ghost"); fr.style.cssText = "padding:8px 13px;font-size:13px"; fr.addEventListener("click", () => { compList(false); if (!$("menu").hidden) startPlay(); paused = false; raceHost(v); });
    const tn = el("b", v.name), tp = el("span", TROPHY[sv.trophy || 0], "trophy"); tp.style.color = TROPHY_COL[sv.trophy || 0]; head.append(tn, tp, go, fr); box.append(head, el("p", v.blurb + "  Your best: " + fmtRes(v, sv.best) + "." + (v.solo ? "  Bronze " + fmtRes(v, v.tgt[0]) + " · silver " + fmtRes(v, v.tgt[1]) + " · gold " + fmtRes(v, v.tgt[2]) + ".  Gold prize: " + KR.OUTFIT_OPTS[v.prize[0]][v.prize[1]] + " and " + GOLD_PTS.toLocaleString() + " pts" + (sv.prize ? " (won)." : ".") : ""), "compLead"));
    go.addEventListener("click", () => { compList(false); if (!$("menu").hidden) startPlay(); paused = false; const q = v.path[0], d = Math.atan2(v.path[1][0] - q[0], v.path[1][1] - q[1]); placeSkier(q[0] - Math.sin(d) * 8, q[1] - Math.cos(d) * 8, d, 0); toast("Press E at the start ring to enter", 3.5); });
    if (sv.board.length) { const tb = el("table", null, "board"); sv.board.forEach((e, i) => { const row = el("tr", null, e.n === "You" ? "me" : ""); row.append(el("td", String(i + 1)), el("td", e.n === "You" ? (MP.myName || "You") : e.n), el("td", fmtRes(v, e.r))); tb.append(row); }); box.append(tb); }
    card.append(box); }
  const un = el("div", null, "venue"); un.append(el("b", "What medal points do")); const lst = el("p", null, "compLead"), items = [];
  for (const n in LIFT_LOCK) items.push([LIFT_LOCK[n], n + " lift"]); for (const c in GEAR_LOCK) for (const k in GEAR_LOCK[c]) items.push([GEAR_LOCK[c][k], KR.OUTFIT_OPTS[c][k]]);
  lst.append(el("div", "Every lift and run is open. Each medal point takes 10% off the prices at Parallel Mountain Sports in the village, up to half. You have " + pts + "."));
  un.append(lst); card.append(un); const close = el("button", "Close", "btn ghost"); close.addEventListener("click", () => compList(false)); const rw = el("div", null, "row"); rw.style.justifyContent = "center"; rw.append(close); card.append(rw);
}
