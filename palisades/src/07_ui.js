/* ---------- runs: which named trail am I on ---------- */
const RUN_GRID = new Map(), DIFF_NAME = ["Green circle", "Blue square", "Black diamond", "Double black"], DIFF_COL = ["#2fb565", "#2f7fe0", "#111111", "#111111"], RUN_W = [46, 42, 30, 18];
function initRuns() {
  WORLD.runs.forEach((r, ri) => { for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 60)); for (let k = 0; k <= n; k++) { const key = Math.floor(lerp(a[0], b[0], k / n) / 120) + "," + Math.floor(lerp(a[1], b[1], k / n) / 120); let s = RUN_GRID.get(key); if (!s) RUN_GRID.set(key, s = new Set()); s.add(ri); } } });
}
function runAt(x, z) {
  const gx = Math.floor(x / 120), gz = Math.floor(z / 120); let best = null, bd = 1e9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const s = RUN_GRID.get((gx + a) + "," + (gz + b)); if (!s) continue; for (const ri of s) { const r = WORLD.runs[ri]; if (!r.n) continue; for (let i = 0; i < r.pts.length - 1; i++) { const p = r.pts[i], q = r.pts[i + 1], ex = q[0] - p[0], ez = q[1] - p[1], t = clamp(((x - p[0]) * ex + (z - p[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1), d = Math.hypot(x - p[0] - ex * t, z - p[1] - ez * t) / (RUN_W[r.d] * 0.5 + 8); if (d < bd) { bd = d; best = r; } } } }
  _runNear = best; _runK = bd; return bd < 1 ? best : null;
}
let _runK = 9, _runNear = null;
function areaAt(x, z) { for (const a of WORLD.areas) if (a.p && inPoly(a.p, x, z)) return a; return null; }
/* ---------- HUD ---------- */
let curRun = null, runShow = 0, hudT = 0, fpsAcc = 0, fpsN = 0;
/* A small arrow at the top of the screen for each other player: it points the way to them from where you are looking, in their colour, with the distance. */
const friendArrows = new Map();
function updateFriendArrows() {
  const box = $("friendArrows"), cy = Math.atan2(camDir.x, camDir.z) + (look.yaw || 0), seen = new Set();
  if (sk.mode !== "menu") for (const [peer, r] of MP.remotes) { const st = r.st; if (!st || st.res !== "palisades" || st.play === false) continue; seen.add(peer);
    let e = friendArrows.get(peer); if (!e) { e = document.createElement("span"); e.className = "fa"; const a = document.createElement("i"), d = document.createElement("b"); a.style.borderBottomColor = r.col || "#ffd24a"; e.append(a, d); box.appendChild(e); friendArrows.set(peer, e); }
    const dx = st.x - sk.p.x, dz = st.z - sk.p.z, dist = Math.hypot(dx, dz); e.firstChild.style.transform = "rotate(" + (-wrap(Math.atan2(dx, dz) - cy) * 180 / Math.PI).toFixed(0) + "deg)";
    const txt = units === "imp" ? (dist * FT > 2640 ? (dist / 1609.34).toFixed(1) + " mi" : Math.round(dist * FT / 10) * 10 + " ft") : dist > 1000 ? (dist / 1000).toFixed(1) + " km" : Math.round(dist / 10) * 10 + " m"; if (e.lastChild.textContent !== txt) e.lastChild.textContent = txt; }
  for (const [peer, e] of friendArrows) if (!seen.has(peer)) { e.remove(); friendArrows.delete(peer); }
}
let ptsTick = 0, ptsSaved = -1;
function updateHUD(dt) {
  updateFriendArrows();
  { const ce = $("chg"), on = sk.chg > 0.02 && sk.mode === "ski"; if (ce.hidden === on) ce.hidden = !on; if (on) ce.firstElementChild.style.width = Math.round(sk.chg * 100) + "%"; }   // jump bar
  hudT += dt; fpsAcc += dt; fpsN++;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").style.opacity = 0; }
  if (trickT > 0) { trickT -= dt; if (trickT <= 0) $("trick").style.opacity = 0; }
  if (hudT < 0.1) return; hudT = 0;
  if (++ptsTick > 25) { ptsTick = 0; const pv = Math.round(sk.pts); if (pv !== ptsSaved) { ptsSaved = pv; store.set("pal-pts", pv); } }   // your trick points are your money in the village: they are kept between visits
  const imp = units === "imp"; $("speed").textContent = Math.round(sk.sp * (imp ? MPH : KMH)); $("speedU").textContent = imp ? "MPH" : "KM/H";
  $("sAlt").textContent = fmtAlt(sk.p.y); $("sVert").textContent = imp ? Math.round(sk.vert * FT).toLocaleString() + " ft" : Math.round(sk.vert).toLocaleString() + " m";
  $("sMax").textContent = Math.round(sk.maxSp * (imp ? MPH : KMH)) + (imp ? " mph" : " km/h"); $("sPts").textContent = sk.pts.toLocaleString();
  if (fpsAcc > 0.5) { $("fps").textContent = QS.has("fps") || QS.has("test") ? Math.round(fpsN / fpsAcc) + " fps · " + treeCount.toLocaleString() + " trees" : ""; fpsAcc = 0; fpsN = 0; }
  // the run you are on stays named at the top of the screen
  { const rb = $("runBox"), set = (cls, name, sub) => { const key = cls + name + sub; if (rb.dataset.k !== key) { rb.dataset.k = key; $("runName").textContent = ""; if (cls) { const d = document.createElement("span"); d.className = "dia " + cls; $("runName").append(d); } $("runName").append(document.createTextNode(name)); $("runSub").textContent = sub; } rb.hidden = false; };
    if (sk.mode === "wait" || sk.mode === "lift") rb.hidden = true;
    else if (sk.mode === "walk") set("", "On foot", "Skis off · B to click back in");
    else { const r = runAt(sk.p.x, sk.p.z), ar = r ? null : areaAt(sk.p.x, sk.p.z);
      if (r) set("d" + r.d, r.n, DIFF_NAME[r.d] + (r.g ? " · groomed" : " · powder"));
      else if (ar) set("d" + ar.d, ar.n, DIFF_NAME[ar.d] + " · powder");
      else set("", "Off-piste", _runNear && _runK < 8 ? "Powder · near " + _runNear.n : "Powder"); } }
  // lift prompt and ride bar
  const pr = $("prompt"), lb = $("liftBar");
  if (sk.mode === "ski" && COMP.near && !COMP.run) { pr.hidden = false; pr.innerHTML = "<kbd>E</kbd> Enter the " + COMP.near.name; }
  else if (sk.shopIn && isGear(sk.shopIn)) { pr.hidden = false; pr.innerHTML = nearCounter && basket.length ? "<kbd>E</kbd> Pay " + basketTotal().toLocaleString() + " pts" : "<kbd>E</kbd> Browse" + (basket.length ? " · carrying " + basket.length + " (" + basketTotal().toLocaleString() + " pts): pay at the counter, or run with Shift" : ""); }
  else if (PUB.seat) { pr.hidden = false; pr.innerHTML = PUB.sip > 0 ? "Sláinte" : PUB.beers > 0 ? "<kbd>E</kbd> Drink · " + PUB.beers + (PUB.beers === 1 ? " pint" : " pints") + " on the table · move to stand up" : "Glass empty · move to stand up, order more at the bar"; }
  else if (nearSeat) { pr.hidden = false; pr.innerHTML = "<kbd>E</kbd> Sit down" + (PUB.beers ? " with your " + (PUB.beers === 1 ? "pint" : PUB.beers + " pints") : ""); }
  else if (nearCounter && nearCounter.pub) { pr.hidden = false; pr.innerHTML = "<kbd>E</kbd> Order a pint" + (PUB.beers ? " · " + PUB.beers + " poured, take a seat at a table" : ""); }
  else if (nearCounter) { pr.hidden = false; pr.innerHTML = "<kbd>E</kbd> Order"; }
  else if (sk.mode === "sled") { pr.hidden = false; pr.innerHTML = sk.sledRole === 2 ? "<kbd>E</kbd> Hop off" : "<kbd>E</kbd> Get off the snowmobile"; }
  else if (sk.mode === "ski" && nearSled && !COMP.run) { pr.hidden = false; pr.innerHTML = sledDriver(nearSled) ? "<kbd>E</kbd> Hop on the back" : "<kbd>E</kbd> Ride the snowmobile"; }
  else if (sk.mode === "ski" && nearLift && !COMP.run) { pr.hidden = false; if (liftLocked(nearLift)) pr.textContent = nearLift.name + " is locked: needs " + LIFT_LOCK[nearLift.name] + " medal points, you have " + medalPoints() + ". Win trophies in competitions (L)."; else pr.innerHTML = "<kbd>E</kbd> Load " + nearLift.name; } else pr.hidden = true;
  if (sk.mode === "wait" || sk.mode === "lift") {
    const L = sk.lift; lb.hidden = false; $("liftName").textContent = L.name;
    if (sk.mode === "wait") { $("liftFill").style.width = "0%"; $("liftSub").innerHTML = (L.type === "tram" ? "Next cabin in " : "Next chair in ") + fmtTime(sk.wait) + ' · hold <span class="kb">F</span> to fast-forward · <span class="kb">Enter</span> skip to top'; }
    else { const left = (L.len - sk.liftS) / L.v; $("liftFill").style.width = (100 * sk.liftS / L.len).toFixed(1) + "%"; $("liftSub").innerHTML = fmtAlt(sk.p.y) + " · " + fmtTime(left) + ' to the top · hold <span class="kb">F</span> to fast-forward · <span class="kb">Enter</span> skip'; }
  } else lb.hidden = true;
}
/* ---------- trail map and minimap ---------- */
let mapBase = null, mapFromMenu = false; const MAPW = 1200, MAPH = Math.round(MAPW * (Z1 - Z0) / (X1 - X0));
const mx = x => (x - X0) / (X1 - X0) * MAPW, mz = z => (z - Z0) / (Z1 - Z0) * MAPH;
function buildMap() {
  const c = document.createElement("canvas"); c.width = MAPW; c.height = MAPH; const g = c.getContext("2d"), im = g.createImageData(MAPW, MAPH), d = im.data;
  for (let j = 0; j < MAPH; j++) for (let i = 0; i < MAPW; i++) { // hillshade lit from the north-west, tinted by tree cover
    const fx = i / MAPW * (NX - 1), fz = j / MAPH * (NZ - 1), gi = clamp(fx | 0, 1, NX - 2), gj = clamp(fz | 0, 1, NZ - 2), k = gj * NX + gi;
    const sx = (HM[k + 1] - HM[k - 1]) / (2 * CELL), sz = (HM[k + NX] - HM[k - NX]) / (2 * CELL), sh = clamp(0.72 + (sx * 0.55 + sz * 0.45) * 0.9, 0.25, 1.15), t = MA[k * 4 + 1] / 255, rk = CL[k];
    let r = 236 * sh, gg = 241 * sh, b = 248 * sh; r = lerp(r, 148 * sh, rk * 0.8); gg = lerp(gg, 140 * sh, rk * 0.8); b = lerp(b, 132 * sh, rk * 0.8); r = lerp(r, 62 * sh, t * 0.85); gg = lerp(gg, 104 * sh, t * 0.85); b = lerp(b, 74 * sh, t * 0.85);
    const o = (j * MAPW + i) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0); g.lineCap = g.lineJoin = "round";
  const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(mx(p[0]), mz(p[1])) : g.moveTo(mx(p[0]), mz(p[1]))); };
  for (const cr of WORLD.creeks || []) { g.strokeStyle = "rgba(58,124,190,0.75)"; g.lineWidth = cr.k ? 1.5 : 0.9; path(cr.pts); g.stroke(); }   // creeks
  for (const pass of [0, 1]) for (const r of WORLD.runs) { path(r.pts); if (!pass) { g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = r.d <= 1 ? 5.5 : 4; } else { g.strokeStyle = DIFF_COL[r.d]; g.lineWidth = r.d <= 1 ? 3 : 2; g.setLineDash(r.d === 3 ? [5, 4] : []); } g.stroke(); g.setLineDash([]); }
  for (const L of LIFTS) { g.strokeStyle = "#d81f26"; g.lineWidth = L.carpet ? 1.5 : 2.6; path(L.nodes.map(n => [n.x, n.z])); g.stroke(); if (L.carpet) continue; g.fillStyle = "#d81f26"; for (const n of [L.bot, L.top]) { g.beginPath(); g.arc(mx(n.x), mz(n.z), n === L.bot ? 5 : 3.2, 0, TAU); g.fill(); } }
  g.font = "700 11px 'Barlow Semi Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (const L of LIFTS) { if (L.carpet || L.len < 300) continue; const x = mx(L.cx), y = mz(L.cz); let a = Math.atan2(mz(L.top.z) - mz(L.bot.z), mx(L.top.x) - mx(L.bot.x)); if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI; g.save(); g.translate(x, y); g.rotate(a); g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,.9)"; g.strokeText(L.name.toUpperCase(), 0, -8); g.fillStyle = "#a01318"; g.fillText(L.name.toUpperCase(), 0, -8); g.restore(); }
  g.font = "800 13px 'Barlow Semi Condensed', sans-serif";
  for (const pk of WORLD.peaks) { const x = mx(pk.p[0]), y = mz(pk.p[1]); g.fillStyle = "#1b2733"; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y + 4); g.lineTo(x - 5, y + 4); g.fill(); g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,.9)"; const t = pk.n.toUpperCase() + " " + pk.ft.toLocaleString() + "′"; g.strokeText(t, x, y + 14); g.fillText(t, x, y + 14); }
  mapBase = c;
}
function drawMap() {
  const c = $("mapC"); if (c.width !== MAPW) { c.width = MAPW; c.height = MAPH; } const g = c.getContext("2d"); g.drawImage(mapBase, 0, 0);
  const dot = (x, z, col, r) => { g.fillStyle = col; g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.arc(mx(x), mz(z), r, 0, TAU); g.fill(); g.stroke(); };
  // competitions: the course in red, a flag at the start with its name
  for (const v of COMP.venues) { g.strokeStyle = "rgba(214,40,30,0.9)"; g.lineWidth = 2.2; g.setLineDash([5, 4]); g.beginPath(); v.path.forEach((p, i) => i ? g.lineTo(mx(p[0]), mz(p[1])) : g.moveTo(mx(p[0]), mz(p[1]))); g.stroke(); g.setLineDash([]);
    const x = mx(v.start.x), y = mz(v.start.z); g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 17); g.stroke(); g.fillStyle = "#d6281e"; g.beginPath(); g.moveTo(x, y - 17); g.lineTo(x + 12, y - 13); g.lineTo(x, y - 9); g.closePath(); g.fill(); g.stroke();
    g.font = "700 12px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.lineWidth = 3; g.strokeStyle = "rgba(10,22,34,0.85)"; g.strokeText(v.name, x + 15, y - 13); g.fillStyle = "#fff"; g.fillText(v.name, x + 15, y - 13); }
  for (const r of MP.remotes.values()) if (r.st) dot(r.st.x, r.st.z, r.col || "#ffd24a", 5);
  const x = mx(sk.p.x), y = mz(sk.p.z), a = Math.atan2(Math.sin(sk.yaw), -Math.cos(sk.yaw)); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "#ff5a36"; g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -11); g.lineTo(7.5, 8); g.lineTo(0, 4); g.lineTo(-7.5, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function mapPick(ev) { // a lift end if the click is on one, otherwise the spot itself
  const c = $("mapC"), r = c.getBoundingClientRect(), x = X0 + (ev.clientX - r.left) / r.width * (X1 - X0), z = Z0 + (ev.clientY - r.top) / r.height * (Z1 - Z0); let best = null, bd = 55;
  for (const v of COMP.venues) if (Math.hypot(v.start.x - x, v.start.z - z) < 60) return { x: v.start.x - Math.sin(v.start.yaw) * 8, z: v.start.z - Math.cos(v.start.yaw) * 8 };   // a click on a competition flag puts you just above its start arch
  for (const L of LIFTS) for (const [n, top] of [[L.bot, false], [L.top, true]]) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = { L, top }; } }
  return best || (inWorld(x, z, 240) && !buildingAt(x, z) ? { x, z } : null);
}
function fallLine(x, z) { const gx = H(x - 3, z) - H(x + 3, z), gz = H(x, z - 3) - H(x, z + 3); return Math.hypot(gx, gz) > 0.02 ? Math.atan2(gx, gz) : 0; }
function startPlay() { setOverlay("menu", false); $("hud").hidden = false; paused = false; }
function goHome() { for (const id of ["pause", "map", "how"]) setOverlay(id, false); paused = false; if (sk.mode === "walk") toggleWalk(); sk.mode = "menu"; sk.lift = null; for (const k in K) K[k] = 0; charging = false; $("hud").hidden = true; setOverlay("menu", true); }
let miniT = 0;
function drawMini(dt) {
  miniT += dt; if (miniT < 0.06) return; miniT = 0;
  const c = $("miniC"), g = c.getContext("2d"), S = c.width, R = 520, sc = S / (2 * R), yaw = Math.atan2(camDir.x, camDir.z);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
  g.translate(S / 2, S / 2); g.rotate(yaw - Math.PI);   // heading up
  const k = MAPW / (X1 - X0); g.save(); g.scale(sc / k, sc / k); g.translate(-mx(sk.p.x), -mz(sk.p.z)); g.imageSmoothingEnabled = true; g.drawImage(mapBase, 0, 0); g.restore();
  for (const r of MP.remotes.values()) if (r.st && r.st.res === "palisades") { g.fillStyle = r.col || "#ffd24a"; g.beginPath(); g.arc((r.st.x - sk.p.x) * sc, (r.st.z - sk.p.z) * sc, 7, 0, TAU); g.fill(); }
  g.setTransform(1, 0, 0, 1, S / 2, S / 2); const a = wrap(Math.atan2(camDir.x, camDir.z) - (sk.yaw + (sk.sw ? Math.PI : 0))); g.rotate(a);
  g.fillStyle = "#ff5a36"; g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -17); g.lineTo(12, 13); g.lineTo(0, 6); g.lineTo(-12, 13); g.closePath(); g.stroke(); g.fill();
}
/* ---------- sound: wind, edges on snow, landings ---------- */
let ac = null, muted = store.get("pal-mute", false), windG, windF, carveG, carveF;
function initAudio() {
  if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const mk = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gn = ac.createGain(); gn.gain.value = 0; s.connect(fl).connect(gn).connect(ac.destination); s.start(); return [gn, fl]; };
  [windG, windF] = mk("lowpass", 400, 0.4); [carveG, carveF] = mk("bandpass", 2600, 0.7);
  noiseBuf = buf; [liftG] = mk("lowpass", 170, 2.5);                        // the rumble of a terminal's drive
  const osc = (type, f) => { const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(); o.type = type; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = 420; g.gain.value = 0; o.connect(fl).connect(g).connect(ac.destination); o.start(); return [o, g]; };
  [humO, humG] = osc("sawtooth", 49); [sledO, sledG] = osc("sawtooth", 50);   // the electric hum of the motor room; the snowmobile's engine
}
/* The sounds a lift makes: the motor hum and rumble at a terminal, and the clatter of each grip rolling over a tower's sheaves, which you hear from the chair and from the snow underneath. */
let noiseBuf = null, liftG = null, humO = null, humG = null, sledO = null, sledG = null, liftScanT = 0, liftSt = 1e9, liftTw = null, clackAt = 0, lastTower = -1;
function clack(vol) { // four wheels, one after another
  if (!ac || muted || vol < 0.02) return; const t = ac.currentTime;
  for (let k = 0; k < 4; k++) { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = 700 + 260 * (k % 2); f.Q.value = 3; g.gain.setValueAtTime(0.0001, t + k * 0.075); g.gain.exponentialRampToValueAtTime(0.5 * vol, t + k * 0.075 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.075 + 0.06); s.connect(f).connect(g).connect(ac.destination); s.start(t + k * 0.075, Math.random()); s.stop(t + k * 0.075 + 0.08); }
  const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.3); g.gain.setValueAtTime(0.16 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.36);
}
function liftAudio(t, live) {
  const riding = sk.mode === "lift" && sk.lift && !sk.lift.carpet, L0 = riding ? sk.lift : null;
  if (t - liftScanT > 0.3) { liftScanT = t; liftSt = 1e9; liftTw = null; let bt = 28;   // what is near: a terminal, a tower
    for (const L of LIFTS) { if (L.carpet || Math.abs(L.cx - sk.p.x) + Math.abs(L.cz - sk.p.z) > L.len + 120) continue; for (const nd of L.nodes) { const d = Math.hypot(nd.x - sk.p.x, nd.z - sk.p.z); if (nd.st) liftSt = Math.min(liftSt, d); else if (d < bt && L.type !== "tram") { bt = d; liftTw = { L, d }; } } } }
  const nearSt = clamp(1 - liftSt / 45, 0, 1), k = live ? Math.max(nearSt, riding ? 0.3 : 0) : 0;
  liftG.gain.setTargetAtTime(k * 0.5, t, 0.25); humG.gain.setTargetAtTime(k * 0.045, t, 0.25); humO.frequency.setTargetAtTime(49 + 2 * Math.sin(t * 0.7), t, 0.2);
  if (!live) return;
  if (riding && L0.type !== "tram") { let i = 0; while (i < L0.S.length - 1 && L0.S[i + 1] < sk.liftS) i++; if (i !== lastTower) { if (lastTower >= 0 && !L0.nodes[i].st) clack(0.9); lastTower = i; } }   // your own chair crossing a tower
  else { lastTower = -1; if (liftTw && t > clackAt) { clackAt = t + liftTw.L.spacing / liftTw.L.v / 2 * (0.9 + 0.2 * Math.random()); clack(clamp(1 - liftTw.d / 28, 0, 1) * 0.7); } }   // chairs passing the tower you are standing near
}
function updateAudio() {
  if (!ac) return; const t = ac.currentTime, live = !muted && !paused && sk.mode !== "menu", sp = sk.sp;
  windG.gain.setTargetAtTime(live ? clamp(sp / 34, 0, 1) ** 1.6 * 0.5 + (wx.wind * 0.02) : 0, t, 0.1); windF.frequency.setTargetAtTime(280 + sp * 34, t, 0.1);
  const on = sk.mode === "ski" && sk.ground && !sk.crashed;
  carveG.gain.setTargetAtTime(live && on ? clamp(sp / 28, 0, 1) * (0.018 + sk.carve * Math.abs(sk.turn) * 0.09 + sk.brakeK * 0.2 + Math.min(0.1, Math.abs(sk.slip || 0) * 0.08) + (sk.surf.rock || 0) * 0.3) * (1 - 0.5 * sk.surf.powder) : 0, t, 0.04);
  carveF.frequency.setTargetAtTime(1800 + sk.surf.groom * 1600 + sk.brakeK * 900 - (sk.surf.rock || 0) * 900, t, 0.08);   // rock scrapes lower and louder than snow
  liftAudio(t, live);
  const S = sk.mode === "sled" ? sk.sled : null; sledG.gain.setTargetAtTime(live && S ? 0.05 + 0.05 * Math.abs(S.thr) + 0.02 * clamp(Math.abs(S.v) / 20, 0, 1) : 0, t, 0.08); if (S) sledO.frequency.setTargetAtTime(46 + Math.abs(S.v) * 4.2 + (S.thr > 0 ? 24 : 0), t, 0.12);
}
function sfx(kind, k = 1) {
  if (!ac || muted) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.connect(g).connect(ac.destination);
  if (kind === "thump" || kind === "crash") { o.type = "sine"; o.frequency.setValueAtTime(kind === "crash" ? 90 : 120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); g.gain.setValueAtTime(0.5 * k, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.start(t); o.stop(t + 0.3); }
  else if (kind === "pop") { o.type = "triangle"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(320, t + 0.08); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.start(t); o.stop(t + 0.13); }
  else if (kind === "alarm") { o.type = "square"; for (let k = 0; k < 8; k++) o.frequency.setValueAtTime(k % 2 ? 660 : 880, t + k * 0.16); g.gain.setValueAtTime(0.09, t); g.gain.setValueAtTime(0.09, t + 1.2); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3); o.start(t); o.stop(t + 1.32); }
  else if (kind === "land") { o.type = "sine"; o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(880, t + 0.09); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.32); }
}
/* ---------- input ---------- */
/* Kicker Run's key map */
const KEYMAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", a: "spinL", d: "spinR", q: "grabQ", e: "grabN", " ": "grab", Shift: "boost", f: "grabS", g: "focus", j: "brake", x: "grabN", c: "grabI" };
function setOverlay(id, on) { $(id).hidden = !on; }
const anyOverlay = () => ["menu", "how", "pause", "map", "fit", "store"].some(id => !$(id).hidden);
function setPaused(v) { paused = v; setOverlay("pause", v); }
function toggleMap(v, fromMenu) { const on = v === undefined ? $("map").hidden : v; if (on) { mapFromMenu = !!fromMenu; drawMap(); setOverlay("pause", false); } setOverlay("map", on); paused = on && !mapFromMenu; }
function setGfx(name) { if (!QUAL[name]) return; qName = name; Q = QUAL[name]; store.set("pal-gfx", name); buildComposer(); document.querySelectorAll("[data-q]").forEach(b => b.classList.toggle("on", b.dataset.q === name)); }
function setUnits(u) { units = u; store.set("pal-units", u); document.querySelectorAll("[data-u]").forEach(b => b.classList.toggle("on", b.dataset.u === u)); }
function initInput() {
  addEventListener("keydown", ev => {
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, n = KEYMAP[key]; initAudio(); if (ac && ac.state === "suspended") ac.resume();
    if (n) { K[n] = 1; ev.preventDefault(); }
    if (ev.repeat) return;
    if (key === " ") gDown();
    if (sk.mode === "menu") { if (key === "Escape" && !$("map").hidden) toggleMap(false); else if (key === "Enter" && $("map").hidden) $("go").click(); return; }
    if (key === "Escape") { if (!$("map").hidden) toggleMap(false); else if (!$("how").hidden) setOverlay("how", false); else setPaused(!paused); }
    else if (key === "p") setPaused(!paused);
    else if (key === "m") toggleMap();
    else if (key === "b") toggleWalk();
    else if (key === "v") { fpv = !fpv; store.set("pal-fpv", fpv); camSnap = true; }
    else if (key === "n") { muted = !muted; store.set("pal-mute", muted); toast(muted ? "Sound off" : "Sound on", 1.2); }
    else if (key === "r") { rewKey = !COMP.run; if (COMP.run) toast("No rewinding in a competition", 1.5); }
    else if (key === "e" && sk.mode === "ski" && COMP.near && !COMP.run && sk.ground) compEnter(COMP.near);
    else if (key === "e" && (PUB.seat || nearSeat)) pubUse();
    else if (key === "e" && (nearCounter || isGear(sk.shopIn))) shopUse();
    else if (key === "e" && (sk.mode === "sled" || (sk.mode === "ski" && nearSled && !COMP.run))) sledToggle();
    else if (key === "e" && sk.mode === "ski" && nearLift && sk.ground && !COMP.run) { if (liftLocked(nearLift)) toast(nearLift.name + " is locked", 2); else boardLift(nearLift); }
    else if (key === "l" && sk.mode !== "menu") compList($("compList").hidden);
    else if (key === "Enter" && (sk.mode === "wait" || sk.mode === "lift")) { const L = sk.lift; unloadAt(L); toast("Top of " + L.name + " · " + fmtAlt(sk.p.y)); }
    else if ("1234".includes(key) && key.length === 1) setWeather(["bluebird", "golden", "overcast", "storm"][+key - 1]);
  });
  addEventListener("keyup", ev => { const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, n = KEYMAP[key]; if (n) K[n] = 0; if (key === " ") gUp(); if (key === "r") rewKey = false; });
  addEventListener("blur", () => { for (const k in K) K[k] = 0; charging = false; rewKey = false; });
  canvas.addEventListener("pointerdown", ev => { look.drag = true; look.idle = 0; canvas.setPointerCapture(ev.pointerId); initAudio(); });
  canvas.addEventListener("pointermove", ev => { if (!look.drag) return; look.yaw -= ev.movementX * 0.005; look.pit = clamp(look.pit - ev.movementY * 0.004, -1.1, 1.1); look.idle = 0; });
  const end = () => { look.drag = false; }; canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  document.querySelectorAll("[data-w]").forEach(b => b.addEventListener("click", () => setWeather(b.dataset.w)));
  document.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { gfxPicked = true; setGfx(b.dataset.q); }));
  document.querySelectorAll("[data-u]").forEach(b => b.addEventListener("click", () => setUnits(b.dataset.u)));
  $("howBtn").addEventListener("click", () => setOverlay("how", true)); $("howOk").addEventListener("click", () => setOverlay("how", false)); $("pHow").addEventListener("click", () => setOverlay("how", true));
  $("resume").addEventListener("click", () => setPaused(false)); $("pMap").addEventListener("click", () => toggleMap(true));
  $("map").addEventListener("click", ev => { if (ev.target === $("map")) toggleMap(false); });
  $("mapC").addEventListener("mousemove", ev => { const h = mapPick(ev), t = $("mapTip"); if (!h) { t.style.display = "none"; return; } const r = $("mapWrap").getBoundingClientRect(); t.style.display = "block"; t.style.left = ev.clientX - r.left + 14 + "px"; t.style.top = ev.clientY - r.top + 14 + "px";
    if (h.L) t.textContent = (h.top ? "Top of " : "Base of ") + h.L.name + " · " + fmtAlt((h.top ? h.L.top : h.L.bot).g); else { const rn = runAt(h.x, h.z); t.textContent = "Drop in here · " + fmtAlt(H(h.x, h.z)) + (rn ? " · " + rn.n : ""); } });
  $("mapC").addEventListener("click", ev => { const h = mapPick(ev); if (!h) return;
    if (h.L) { if (h.top) unloadAt(h.L); else placeSkier(h.L.bot.x - Math.sin(h.L.dir) * 14, h.L.bot.z - Math.cos(h.L.dir) * 14, h.L.dir); toast((h.top ? "Top of " : "Base of ") + h.L.name); }
    else { placeSkier(h.x, h.z, fallLine(h.x, h.z)); const rn = runAt(h.x, h.z); toast("Dropped in" + (rn ? " on " + rn.n : "") + " · " + fmtAlt(sk.p.y)); }
    toggleMap(false); startPlay(); initAudio(); });
  $("pickBtn").addEventListener("click", () => toggleMap(true, true)); $("walkBtn").addEventListener("click", ev => { toggleWalk(); ev.target.blur(); }); $("homeBtn").addEventListener("click", goHome); $("pHome").addEventListener("click", goHome); $("mapBtn").addEventListener("click", () => toggleMap(true));
  const sel = $("startSel"); const opt = (v, t) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); };
  opt("village", "The Village · Olympic Valley base, 6,200 ft");
  LIFTS.map((L, i) => [L, i]).filter(([L]) => !L.carpet && L.len > 400).sort((a, b) => b[0].top.g - a[0].top.g).forEach(([L, i]) => opt(i, "Top of " + L.name + " · " + Math.round(L.top.g * FT).toLocaleString() + " ft"));
  sel.value = store.get("pal-start", "village"); if (!sel.value) sel.value = "village";
  // outfit and ski setup: Kicker Run's own options, everything unlocked
  const FIT = [["helmet", "Headwear"], ["goggles", "Goggles"], ["jacket", "Jacket"], ["pants", "Pants"], ["accessory", "Accessory"], ["skis", "Skis"], ["poles", "Poles"], ["style", "Figure"], ["skibend", "Ski rocker"], ["len", "Ski length"], ["grip", "Edges"], ["wax", "Wax"]];
  for (const [cat, label] of FIT) { const l = document.createElement("label"); l.textContent = label; l.htmlFor = "fit-" + cat; const sl = document.createElement("select"); sl.id = "fit-" + cat;
    for (const k in KR.OUTFIT_OPTS[cat]) { const o = document.createElement("option"); o.value = k; o.textContent = KR.OUTFIT_OPTS[cat][k]; sl.appendChild(o); } sl.value = outfit[cat]; sl.dataset.cat = cat;
    sl.addEventListener("change", () => { if (sl.selectedOptions[0] && sl.selectedOptions[0].disabled) { sl.value = outfit[cat]; return; } outfit[cat] = sl.value; store.set("pal-outfit", outfit); dressRig(rig, outfit); }); $("fitRows").append(l, sl); }
  const openFit = () => { setOverlay("pause", false); setOverlay("fit", true); if (sk.mode !== "menu") paused = true; };
  $("fitBtn").addEventListener("click", openFit); $("pFit").addEventListener("click", openFit); $("fitOk").addEventListener("click", () => { setOverlay("fit", false); if (sk.mode !== "menu") paused = false; });
  { const ni = $("nameIn"); ni.value = MP.myName; ni.addEventListener("input", () => { MP.myName = ni.value.replace(/[<>]/g, "").trim().slice(0, 20); store.set("pal-name", MP.myName); MP.dirty = true; }); }
  $("go").addEventListener("click", () => { initAudio(); store.set("pal-start", sel.value); spawnAt(sel.value); startPlay(); });
  setGfxButtons(); setUnits(units);
}
function setGfxButtons() { document.querySelectorAll("[data-q]").forEach(b => b.classList.toggle("on", b.dataset.q === qName)); }

/* ---------- multiplayer: same lobby transports as Kicker Run (claude.ai room, or Firebase when opened anywhere else) ---------- */
const MP = { myName: String(store.get("pal-name", "") || "").slice(0, 20), room: null, user: null, myId: null, remotes: new Map(), others: [], sendT: 0, status: "connecting…", names: {}, dirty: true, listT: 0 };
const r2 = v => Math.round(v * 100) / 100;
function mpPack() {
  let k = 0; MP_KEYS.forEach((n, i) => { if (K[n]) k |= 1 << i; });
  const o = mpPack0(k); if (MP.myName) o.nm = MP.myName; if (sk.mode === "sled" && sk.sled) { o.sdi = SLEDS.indexOf(sk.sled); o.sdr = sk.sledRole || 1; } if (sk.shopIn) o.shop = sk.shopIn.name; if (sk.sit) o.sit = +(1 + (sk.sipK || 0)).toFixed(2); return o;
}
function mpPack0(k) {
  return { v: 2, res: "palisades", id: MP.myId, play: sk.mode !== "menu", x: r2(sk.p.x), y: r2(sk.p.y), z: r2(sk.p.z), yaw: r2(sk.yaw), spin: r2(sk.spin), rot: r2(sk.rot), rotV: r2(sk.rotV), sw: !!sk.sw, gr: !!sk.ground, cr: !!sk.crashed, tz: r2(sk.tumZ), turn: r2(sk.turn), carve: r2(sk.carve), sp: r2(sk.sp), chg: r2(sk.chg), st: r2(Math.max(0, sk.stumT)), k, md: sk.mode, gd: sk.grind ? 1 : 0, wp: r2(sk.walkPh || 0), li: sk.lift ? sk.lift.id : -1, sl: r2(sk.slope), sc: sk.pts, vt: Math.round(sk.vert),
    of: { goggles: outfit.goggles, helmet: outfit.helmet, jacket: outfit.jacket, pants: outfit.pants, accessory: outfit.accessory, skis: outfit.skis, poles: outfit.poles, style: outfit.style } };
}
function mpSend(dt) { if (!MP.room) return; MP.sendT -= dt; if (MP.sendT > 0) return; MP.sendT = 1 / 12; try { const r = MP.room.presence({ st: mpPack() }); if (r && r.catch) r.catch(() => { }); } catch (e) { } }
function mpTag(R) { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const tex = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); sp.scale.set(2.4, 0.6, 1); sp.position.set(0, 2.5, 0); sp.renderOrder = 999; R.hold.add(sp); return { c, tex, txt: "" }; }
function mpTagText(tag, txt) { if (tag.txt === txt) return; tag.txt = txt; const g = tag.c.getContext("2d"); g.clearRect(0, 0, 256, 64); g.font = "700 30px system-ui, sans-serif"; const w = Math.min(248, g.measureText(txt).width + 28); g.fillStyle = "rgba(10,14,24,.62)"; g.beginPath(); g.roundRect ? g.roundRect(128 - w / 2, 8, w, 46, 23) : g.rect(128 - w / 2, 8, w, 46); g.fill(); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 32); tag.tex.needsUpdate = true; }
function mpColor(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return "hsl(" + (h % 360) + ",70%,62%)"; }
function mpSync(peers) {
  const seen = new Set(), others = [];
  for (const p of peers) {
    if (p.sameTab || (p.kind && p.kind !== "viewer")) continue; const st = p.presence && p.presence.st; if (!st || typeof st !== "object") continue;
    const by = p.by || (typeof st.id === "string" ? st.id : null); others.push({ peer: p.peer, by, st, isMe: p.isMe });
    if (st.res !== "palisades" || ![st.x, st.y, st.z].every(Number.isFinite)) continue;
    seen.add(p.peer); let r = MP.remotes.get(p.peer); const ofk = st.of ? JSON.stringify(st.of) : "";
    if (!r) { const R = makeRider(st.of); r = { R, tag: mpTag(R), q: null, ofk, col: mpColor(by || p.peer), keys: Object.assign({}, NOKEYS) }; MP.remotes.set(p.peer, r); dressRig(rig, outfit); }
    if (r.ofk !== ofk) { r.ofk = ofk; dressRig(r.R, st.of); dressRig(rig, outfit); }   // dressing sets the ski tune, so put ours back
    r.st = st; r.by = by; r.isMe = p.isMe;
  }
  for (const [peer, r] of MP.remotes) if (!seen.has(peer)) { scene.remove(r.R.hold); MP.remotes.delete(peer); }
  MP.others = others; MP.dirty = true;
}
async function mpList() {
  const box = $("riders"); MP.dirty = false; const ids = MP.others.map(o => o.by).filter(Boolean); let ps = {};
  try { if (MP.user && ids.length) ps = await MP.user.profiles([...new Set(ids)]); } catch (e) { }
  const nameOf = (id, fb) => { const q = id && ps[id]; if (!q) return MP.names[id] || fb; const em = typeof q.email === "string" && q.email.indexOf("@") > 0 ? q.email.slice(0, q.email.indexOf("@")) : ""; return em || q.name || MP.names[id] || fb; };
  const mbox = $("menuRiders"); box.textContent = ""; mbox.textContent = ""; let n = 0;
  // Finding friends: each rider is listed with where they are and how far away, and a Join button that drops you in beside them.
  for (const o of MP.others) { if (o.st.res !== "palisades") continue; n++; const nm = (typeof o.st.nm === "string" && o.st.nm.trim().slice(0, 20)) || nameOf(o.by, o.isMe ? "You (other tab)" : "Rider " + n), r = MP.remotes.get(o.peer); if (r) mpTagText(r.tag, nm);   // the name they typed, else the one from their account
    const st = o.st, rn = st.play === false ? null : runAt(st.x, st.z), ar = rn ? null : areaAt(st.x, st.z), dist = Math.hypot(st.x - sk.p.x, st.z - sk.p.z);
    const where = st.play === false ? "at the home screen" : typeof st.shop === "string" ? "in " + st.shop.slice(0, 30) : st.md === "lift" && LIFTS[st.li] ? "riding " + LIFTS[st.li].name : rn && rn.n ? "on " + rn.n : ar ? "in " + ar.n : "off piste";
    for (const [bx, far] of [[box, true], [mbox, false]]) { const d = document.createElement("div"); d.className = "r"; const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = r ? r.col : "#ffd24a"; const b = document.createElement("b"); b.textContent = nm;
      const s = document.createElement("span"); s.className = "where"; s.textContent = where + (far && sk.mode !== "menu" ? " · " + (units === "imp" ? (dist * FT > 2640 ? (dist / 1609.34).toFixed(1) + " mi" : Math.round(dist * FT / 10) * 10 + " ft") : dist > 1000 ? (dist / 1000).toFixed(1) + " km" : Math.round(dist / 10) * 10 + " m") : "");
      d.append(dot, b, s); if (st.play !== false) { const j = document.createElement("button"); j.className = "join"; j.textContent = "Join"; j.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); joinRider(o.peer, nm); }); d.append(j); } bx.appendChild(d); } }
  const head = MP.room ? (n ? n + (n === 1 ? " rider" : " riders") + " on the mountain with you" : "Share this link to ride together") : MP.status;
  const d = document.createElement("div"); d.textContent = head; box.prepend(d); const d2 = document.createElement("div"); d2.textContent = n ? head + ". Join drops you in beside them." : head; mbox.prepend(d2);
}
function joinRider(peer, nm) { // drop in a few metres uphill of a friend, facing the way they face
  const o = MP.others.find(q => q.peer === peer); if (!o || !o.st) return; const st = o.st, yaw = st.yaw || 0;
  let x = st.x - Math.sin(yaw) * 5, z = st.z - Math.cos(yaw) * 5; if (H(x, z) < H(st.x, st.z) - 6 || cliffK(x, z) > 0.3) { x = st.x + 2.5; z = st.z + 2.5; }
  if (sk.mode === "menu" || !$("menu").hidden) startPlay(); if (!$("map").hidden) toggleMap(false); placeSkier(x, z, yaw, 0); toast("Joined " + nm, 2.5); MP.dirty = true;
}
const _rs = { p: new THREE.Vector3() };
function updateRemotes(dt, time) {
  MP.listT += dt; if (MP.dirty && MP.listT > 0.5) { MP.listT = 0; mpList(); } else if (MP.listT > 2 && MP.remotes.size) { MP.listT = 0; mpList(); }
  const a = 1 - Math.exp(-12 * dt);
  for (const r of MP.remotes.values()) poseRemote(r, dt, time, a);
}
function poseRemote(r, dt, time, a) { // stand a rider (a friend, or a competition rival) where their state says, in the pose it implies
    const st = r.st, R = r.R; if (!st) return; const far = Math.hypot(st.x - sk.p.x, st.z - sk.p.z);
    const L = st.md === "lift" ? LIFTS[st.li] : null, cabin = L && !L.carpet && !L.type.startsWith("chair");
    R.hold.visible = st.play !== false && far < 2500 && !cabin; if (!R.hold.visible) return;
    const jump = !r.q || Math.hypot(st.x - r.q.p.x, st.z - r.q.p.z) > 30;
    if (jump) r.q = { p: new THREE.Vector3(st.x, st.y, st.z), yaw: st.yaw, spin: st.spin, rot: st.rot, grind: null, boxT: 0, bike: false, finished: false, bikeJump: false, pumpT: 0, landT: 0, popT: 0, airT: 1, vx: 0, vs: 0 };
    const q = r.q; q.p.x += (st.x - q.p.x) * a; q.p.y += (st.y - q.p.y) * a; q.p.z += (st.z - q.p.z) * a; q.yaw += wrap(st.yaw - q.yaw) * a; q.spin += (st.spin - q.spin) * a; q.rot += (st.rot - q.rot) * a;
    q.rotV = st.rotV || 0; q.sw = st.sw; q.ground = st.gr; q.air = !st.gr && st.md === "ski"; q.crashed = st.cr; q.tumZ = st.tz || 0; q.turn = st.turn; q.carve = st.carve; q.sp = st.sp; q.vs = st.sp; q.chg = L && L.type.startsWith("chair") ? 0.85 : st.md === "sled" ? 0 : st.chg || 0; q.stumT = st.st || 0; q.stumD = 1; q.mode = st.md; q.sit = st.sit >= 1; q.sipK = q.sit ? clamp(st.sit - 1, 0, 1) : 0; q.walkPh = st.wp || 0; q.grind = st.gd ? 1 : null;
    MP_KEYS.forEach((n, i) => { r.keys[n] = st.k & (1 << i) ? 1 : 0; }); if (q.ground) { r.keys.boost = r.keys.up; r.keys.up = 0; } else r.keys.boost = 0;   // on snow W is the tuck, as it is for you: other riders do not nose butter along
    poseRider(R, q, st.md === "ski" ? r.keys : NOKEYS, st.sl || 0, dt, time, jump); if (L && L.type.startsWith("chair")) R.hold.position.y += 0.2;
    if (st.md === "sled") { // another player on a snowmobile: the driver's state moves the machine itself; both riders sit on its seat
      const S = SLEDS[st.sdi], pass = st.sdr === 2, back = pass ? 0.94 : 0.34; if (S && !pass && !(sk.sled === S && sk.sledRole === 1)) { S.x = q.p.x; S.z = q.p.z; S.yaw = q.yaw; S.v = st.sp || 0; S.remote = r; S.remoteT = performance.now(); sledPlace(S); }
      R.hold.position.y += pass ? 0.18 : 0.12; R.hold.position.x -= Math.sin(q.yaw) * back; R.hold.position.z -= Math.cos(q.yaw) * back; }
}
const FIREBASE_CONFIG = { apiKey: "AIzaSyDP_rgi4dWZqVax_c5Ob5Hg4dilLS9Bchc", authDomain: "kicker-run.firebaseapp.com", databaseURL: "https://kicker-run-default-rtdb.firebaseio.com", projectId: "kicker-run", storageBucket: "kicker-run.firebasestorage.app", messagingSenderId: "149808173020", appId: "1:149808173020:web:744be18f442c535fe54919" };
const fbLoad = src => new Promise((ok, no) => { const e = document.createElement("script"); e.src = src; e.onload = ok; e.onerror = no; document.head.appendChild(e); });
async function fbInit() {
  MP.status = "Connecting to the lobby…"; MP.dirty = true;
  const V = "https://www.gstatic.com/firebasejs/10.12.2/"; await fbLoad(V + "firebase-app-compat.js"); await Promise.all([fbLoad(V + "firebase-auth-compat.js"), fbLoad(V + "firebase-database-compat.js")]);
  const fb = window.firebase; fb.initializeApp(FIREBASE_CONFIG); const auth = fb.auth(), db = fb.database(); let presRef = null, off = null, myName = "";
  const signIn = () => auth.signInWithPopup(new fb.auth.GoogleAuthProvider()).catch(e => { MP.status = "Sign-in failed (" + ((e && e.code) || "error") + ")"; MP.dirty = true; });
  const signBtn = (show, who) => { let b = $("mpsign"); if (!b) { b = document.createElement("button"); b.id = "mpsign"; b.textContent = "Sign in with Google to ride together"; b.addEventListener("click", signIn); $("topRight").insertBefore(b, $("riders")); } b.hidden = !show;
    const box = $("mpAuth"); box.textContent = ""; const g = document.createElement("button"); // the same choice on the home screen, where you set your name
    if (show) { g.className = "gbtn"; const G = document.createElement("b"); G.textContent = "G"; g.append(G, "Sign in with Google"); g.addEventListener("click", signIn); box.append(g, "to ride with friends under your name"); }
    else { g.className = "gbtn out"; g.textContent = "Sign out"; g.addEventListener("click", () => auth.signOut()); box.append("Signed in as " + who, g); } };
  auth.onAuthStateChanged(u => {
    if (presRef) { presRef.remove().catch(() => { }); presRef = null; } if (off) { off(); off = null; }
    MP.room = null; MP.remotes.forEach(r => scene.remove(r.R.hold)); MP.remotes.clear(); MP.others = [];
    if (!u) { MP.myId = null; MP.status = "Solo · sign in to ride with others"; signBtn(true); MP.dirty = true; return; }
    MP.myId = u.uid; myName = ((u.displayName && u.displayName.split(" ")[0]) || (u.email && u.email.indexOf("@") > 0 ? u.email.slice(0, u.email.indexOf("@")) : "") || "Rider").slice(0, 20); signBtn(false, myName);
    if (!MP.myName) { MP.myName = myName; $("nameIn").value = myName; }   // your Google first name, until you type another
    presRef = db.ref("presence/" + u.uid); presRef.onDisconnect().remove();
    MP.room = { presence: patch => presRef.set({ st: patch.st, nm: (MP.myName || myName).slice(0, 24), t: fb.database.ServerValue.TIMESTAMP }) };
    const ref = db.ref("presence"), fn = v => { const all = v.val() || {}, peers = []; for (const id in all) { const e = all[id]; if (!e || !e.st) continue; if (e.nm) MP.names[id] = String(e.nm).slice(0, 24); peers.push({ peer: id, by: id, sameTab: id === u.uid, isMe: id === u.uid, kind: "viewer", presence: { st: e.st } }); } mpSync(peers); };
    ref.on("value", fn, () => { MP.room = null; MP.status = "Lobby refused the connection"; MP.dirty = true; }); off = () => ref.off("value", fn); MP.dirty = true;
  });
}
async function mpInit() {
  if (QS.has("solo") || QS.has("test")) { MP.status = "Solo"; return; }
  if (!window.claude || !window.claude.use) { fbInit().catch(() => { MP.status = "Solo · lobby unreachable"; MP.dirty = true; }); return; }
  try {
    const [room, user] = await Promise.all([window.claude.use("room"), window.claude.use("user")]); MP.user = user; if (user) MP.myId = await user.id();
    if (!room) { MP.status = "Solo · this page could not join a lobby"; MP.dirty = true; return; }
    $("mpAuth").textContent = "Here you are signed in through Claude. Google sign-in is on the GitHub link."; MP.room = room; room.onPeers(ch => mpSync(ch.peers), () => { MP.room = null; MP.status = "Solo · lobby disconnected"; MP.dirty = true; }); MP.dirty = true;
  } catch (e) { MP.status = "Solo · lobby unreachable"; MP.dirty = true; }
}
