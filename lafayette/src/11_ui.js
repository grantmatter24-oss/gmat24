/* ---------- map, HUD, menu ---------- */
const MAPS = 4;   // metres per map pixel
let MAPC = null;
function buildMap() {
  const w = Math.round((X1 - X0) / MAPS), h = Math.round((Z1 - Z0) / MAPS), c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.drawImage(SATIMG, 0, 0, w, h); g.fillStyle = "rgba(14,20,16,0.28)"; g.fillRect(0, 0, w, h);
  const mx = x => (x - X0) / MAPS, mz = z => (z - Z0) / MAPS;
  g.fillStyle = "#3f7f9c"; for (const W of WATERS) { if (W.pool) continue; g.beginPath(); for (let i = 0; i < W.n; i++) { const x = mx(V.wP[(W.a + i) * 2]), z = mz(V.wP[(W.a + i) * 2 + 1]); if (i) g.lineTo(x, z); else g.moveTo(x, z); } g.fill(); }
  g.fillStyle = "rgba(226,220,208,0.55)"; for (let b = 0; b < V.bKind.length; b++) { g.beginPath(); for (let k = V.bStart[b]; k < V.bStart[b + 1]; k++) { const x = mx(V.bP[k * 2]), z = mz(V.bP[k * 2 + 1]); if (k === V.bStart[b]) g.moveTo(x, z); else g.lineTo(x, z); } g.fill(); }
  g.lineJoin = g.lineCap = "round";
  const pass = (kinds, style, wmul, dash) => { g.strokeStyle = style; g.setLineDash(dash || []);
    for (let r = 0; r < V.rKind.length; r++) { const k = V.rKind[r]; if (!kinds.includes(k) || (V.rFlag[r] & 8)) continue; g.lineWidth = Math.max(0.9, V.rW[r] / 10 / MAPS * wmul); g.beginPath(); for (let i = V.rStart[r]; i < V.rStart[r + 1]; i++) { const x = mx(V.rP[i * 2]), z = mz(V.rP[i * 2 + 1]); if (i === V.rStart[r]) g.moveTo(x, z); else g.lineTo(x, z); } g.stroke(); } };
  pass([9, 10], "rgba(214,178,120,0.9)", 1.4, [3, 2]); pass([11, 12, 13], "rgba(230,226,214,0.55)", 1); pass([14], "rgba(60,62,70,0.9)", 1.2, [4, 3]);
  pass([6, 7, 8], "rgba(196,198,200,0.75)", 1); pass([5], "#d9dbdc", 1.15); pass([4], "#eceded", 1.2); pass([3], "#f6f2de", 1.25); pass([2], "#f8e7a6", 1.25); pass([1], "#f2c56a", 1.2); pass([0], "#efaa45", 1.1);
  g.setLineDash([]); MAPC = c;
}
const PLACES = [["Lafayette", 37.8857, -122.1183], ["Springhill", 37.9097, -122.1109], ["Silver Dell", 37.9171, -122.1024], ["Summit Ridge", 37.919, -122.0881], ["Acalanes Ridge", 37.9069, -122.0794], ["Overlook", 37.9026, -122.0753], ["Northridge", 37.8971, -122.1262], ["Condit", 37.8918, -122.091], ["Stanley", 37.8851, -122.1052], ["Silverwood", 37.8878, -122.1549], ["Saranap", 37.884, -122.0778], ["Lafayette Reservoir", 37.8815, -122.142], ["Walnut Creek", 37.9005, -122.0655], ["Happy Valley", 37.9046, -122.146], ["Briones", 37.92, -122.14]];
const SPAWNS = [["Downtown — Mt. Diablo Blvd", 37.8921, -122.1178, 0], ["Lafayette BART", 37.8935, -122.1243, 0], ["Lafayette Reservoir", 37.8853, -122.1432, 1], ["Lafayette Ridge trailhead", 37.9031, -122.1001, 1], ["Briones edge — Buckeye Ranch", 37.9161, -122.1357, 1], ["Happy Valley Road", 37.9010, -122.1440, 0],
  ["Acalanes High School", 37.9037, -122.0985, 0], ["Springhill", 37.9105, -122.1130, 0], ["Highway 24 at Acalanes Road", 37.8858, -122.1545, 0], ["Saranap — Olympic Blvd", 37.8872, -122.0850, 0], ["Walnut Creek — Mt. Diablo Blvd", 37.8975, -122.0720, 0], ["Burton Valley", 37.8760, -122.1040, 0]];
const ll2xz = (lat, lon) => [(lon - M.lon0) * M.mlon, -(lat - M.lat0) * M.mlat];
function snapToRoad(x, z, trail) {   // nearest point on a street (or a trail), and which way it runs
  let bd = 1e18, bx = x, bz = z, yaw = 0;
  for (const st of STRIPS) { const k = st.kind; if (st.flag & 10) continue; if (trail ? !(k === 9 || k === 10 || k === 12 || k === 6) : !(k >= 2 && k <= 5)) continue;
    for (let i = 0; i < st.n - 1; i += 2) { const d = (st.X[i] - x) ** 2 + (st.Z[i] - z) ** 2; if (d < bd) { bd = d; bx = st.X[i] - st.LX[i] * (trail || st.w < 7 ? 0 : st.w * 0.22); bz = st.Z[i] - st.LZ[i] * (trail || st.w < 7 ? 0 : st.w * 0.22); yaw = Math.atan2(st.X[i + 1] - st.X[i], st.Z[i + 1] - st.Z[i]); } } }
  return { x: bx, z: bz, yaw };
}
let toastEl, hudT = 0, mapOpen = false;
function toast(msg, sec = 3) { toastEl.textContent = msg; toastEl.classList.add("on"); GAME.toastT = sec; }
function setOverlay(id, on) { $(id).hidden = !on; }
function startPlay(spawn) {
  initAudio(); if (AU.ctx && AU.ctx.state === "suspended") AU.ctx.resume();
  const v = selectVehicle(GAME.type); if (spawn) placeVehicle(v, spawn.x, spawn.z, spawn.yaw); GAME.mode = "play"; GAME.paused = false; setOverlay("menu", false); setOverlay("hud", true); snapCamera(); $("resume").hidden = false; mpDirty();
}
function openMenu() { GAME.paused = true; GAME.mode = GAME.v ? "pause" : "menu"; setOverlay("menu", true); refreshTrialList(); if (document.pointerLockElement) document.exitPointerLock(); }
function refreshTrialList() {
  const box = $("trials"); box.textContent = "";
  for (const T of TRIALS) {
    const d = document.createElement("button"); d.className = "trial"; const key = trialKey(T, GAME.type), best = store.get(key, 0), top = LB.best[key];
    const a = document.createElement("b"); a.textContent = T.name; const s = document.createElement("span"); s.textContent = (units === "imp" ? (T.len / 1609.34).toFixed(1) + " mi" : (T.len / 1000).toFixed(1) + " km") + " · " + T.veh;
    const t = document.createElement("i"); t.textContent = (best ? "Your best " + fmtTime(best / 1000) : "No time yet") + (top ? " · record " + fmtTime(top.ms / 1000) + " " + top.nm : "");
    d.append(a, s, t); d.title = T.blurb; d.addEventListener("click", () => { startPlay(null); startTrial(T); }); box.appendChild(d);
  }
}
function buildMenu() {
  toastEl = $("toast");
  const vb = $("vehs"); VEH_ORDER.forEach((k, i) => { const b = document.createElement("button"); b.className = "veh"; b.dataset.v = k; const n = document.createElement("b"); n.textContent = VEHICLES[k].name; const s = document.createElement("span"); s.textContent = VEHICLES[k].sub; const kk = document.createElement("kbd"); kk.textContent = i + 1; b.append(kk, n, s);
    b.addEventListener("click", () => { GAME.type = k; store.set("laf-veh", k); markMenu(); if (GAME.v) selectVehicle(k, true); refreshTrialList(); }); vb.appendChild(b); });
  const tb = $("tods"); for (const k of ["day", "sunset", "night"]) { const b = document.createElement("button"); b.dataset.t = k; b.textContent = TOD[k].label; b.addEventListener("click", () => { setTimeOfDay(k); store.set("laf-tod", k); markMenu(); }); tb.appendChild(b); }
  const sel = $("spawn"); SPAWNS.forEach((s, i) => { const o = document.createElement("option"); o.value = i; o.textContent = s[0]; sel.appendChild(o); }); sel.value = store.get("laf-spawn", 0);
  document.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { store.set("laf-q", b.dataset.q); location.reload(); }));
  $("unitBtn").addEventListener("click", () => { units = units === "imp" ? "met" : "imp"; store.set("laf-units", units); markMenu(); refreshTrialList(); });
  $("sndBtn").addEventListener("click", () => { AU.on = !AU.on; store.set("laf-snd", AU.on); if (AU.master) AU.master.gain.value = AU.on ? 0.5 : 0; else if (AU.on) initAudio(); markMenu(); });
  $("go").addEventListener("click", () => { const s = SPAWNS[+sel.value] || SPAWNS[0]; store.set("laf-spawn", +sel.value); const [x, z] = ll2xz(s[1], s[2]); GAME.trial = null; startPlay(snapToRoad(x, z, !!s[3])); });
  $("resume").addEventListener("click", () => { if (GAME.v) { GAME.mode = "play"; GAME.paused = false; setOverlay("menu", false); } });
  const ni = $("nameIn"); ni.value = MP.myName; ni.addEventListener("input", () => { MP.myName = ni.value.replace(/[<>]/g, "").trim().slice(0, 20); store.set("laf-name", MP.myName); mpDirty(); });
  markMenu(); refreshTrialList();
  window.addEventListener("keydown", e => {
    if (e.target && e.target.tagName === "INPUT") return; K[e.code] = 1; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.repeat) return; const v = GAME.v;
    if (e.code === "Escape") { if (mapOpen) toggleMap(false); else if (GAME.mode === "play") openMenu(); else if (GAME.v) $("resume").click(); return; }
    if (GAME.mode !== "play") return;
    if (e.code === "KeyR") resetVehicle(); else if (e.code === "KeyC" || e.code === "KeyV") { GAME.cam.fp = !GAME.cam.fp; v.rider.bones.head.children.forEach(o => { o.visible = !GAME.cam.fp; }); }
    else if (e.code === "KeyM") toggleMap(!mapOpen); else if (e.code === "KeyT") { const o = ["day", "sunset", "night"], k = o[(o.indexOf(todName) + 1) % 3]; setTimeOfDay(k); store.set("laf-tod", k); markMenu(); toast(TOD[k].label, 1.5); }
    else if (e.code === "KeyH") { v.lightsOn = !v.lightsOn; } else if (e.code === "KeyU") $("unitBtn").click(); else if (e.code === "KeyX" && GAME.trial) { GAME.trial = null; toast("Route cancelled", 1.5); }
    else if (/^Digit[1-5]$/.test(e.code)) { const k = VEH_ORDER[+e.code.slice(5) - 1]; if (k !== GAME.type) { if (v.speed > 3) toast("Stop first to change machine", 2); else { GAME.cam.fp = false; selectVehicle(k, true); snapCamera(); markMenu(); toast(VEHICLES[k].name, 1.5); } } }
  });
  window.addEventListener("keyup", e => { K[e.code] = 0; }); window.addEventListener("blur", () => { for (const k in K) K[k] = 0; });
  let drag = null; canvas.addEventListener("pointerdown", e => { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); initAudio(); });
  canvas.addEventListener("pointermove", e => { if (!drag) return; const c = GAME.cam; c.orbit -= (e.clientX - drag[0]) * 0.0055; c.orbitP = clamp(c.orbitP + (e.clientY - drag[1]) * 0.004, -0.4, 1.2); c.orbitT = 2.5; drag = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", () => { drag = null; }); canvas.addEventListener("wheel", e => { GAME.cam.dist = clamp(GAME.cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 0.45, 3); e.preventDefault(); }, { passive: false });
  $("mapC").addEventListener("click", e => { const r = e.target.getBoundingClientRect(), x = X0 + (e.clientX - r.left) / r.width * (X1 - X0), z = Z0 + (e.clientY - r.top) / r.height * (Z1 - Z0); if (!inWorld(x, z, 40)) return; GAME.trial = null; const s = snapToRoad(x, z, false), t = snapToRoad(x, z, true), use = Math.hypot(t.x - x, t.z - z) < Math.hypot(s.x - x, s.z - z) ? t : s, near = Math.hypot(use.x - x, use.z - z) < 60;
    placeVehicle(GAME.v, near ? use.x : x, near ? use.z : z, near ? use.yaw : GAME.v.psi); snapCamera(); toggleMap(false); });
  $("mapClose").addEventListener("click", () => toggleMap(false));
}
function markMenu() {
  document.querySelectorAll(".veh").forEach(b => b.classList.toggle("on", b.dataset.v === GAME.type)); document.querySelectorAll("[data-t]").forEach(b => b.classList.toggle("on", b.dataset.t === todName));
  document.querySelectorAll("[data-q]").forEach(b => b.classList.toggle("on", b.dataset.q === qName)); $("unitBtn").textContent = units === "imp" ? "Miles" : "Kilometres"; $("sndBtn").textContent = AU.on ? "Sound on" : "Sound off";
}
function toggleMap(on) {
  mapOpen = on; setOverlay("map", on); if (!on) return; const c = $("mapC"), g = c.getContext("2d"); c.width = MAPC.width / 2; c.height = MAPC.height / 2; g.drawImage(MAPC, 0, 0, c.width, c.height);
  const px = x => (x - X0) / (X1 - X0) * c.width, pz = z => (z - Z0) / (Z1 - Z0) * c.height; g.textAlign = "center"; g.font = "600 11px system-ui, sans-serif"; g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,0.7)";
  for (const [n, la, lo] of PLACES) { const [x, z] = ll2xz(la, lo); if (!inWorld(x, z)) continue; g.fillStyle = "rgba(255,255,255,0.92)"; g.strokeText(n.toUpperCase(), px(x), pz(z)); g.fillText(n.toUpperCase(), px(x), pz(z)); }
  for (const T of TRIALS) { g.strokeStyle = "rgba(255,90,60,0.85)"; g.lineWidth = 2; g.beginPath(); T.pts.forEach((p, i) => { if (i % 3) return; if (i) g.lineTo(px(p[0]), pz(p[1])); else g.moveTo(px(p[0]), pz(p[1])); }); g.stroke(); g.fillStyle = "#ff5a3c"; g.beginPath(); g.arc(px(T.start.x), pz(T.start.z), 5, 0, TAU); g.fill(); }
  for (const r of MP.remotes.values()) { g.fillStyle = r.col; g.beginPath(); g.arc(px(r.v.p.x), pz(r.v.p.z), 5, 0, TAU); g.fill(); }
  const v = GAME.v; g.save(); g.translate(px(v.p.x), pz(v.p.z)); g.rotate(Math.PI - v.psi); g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
}
const COMP = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function updateHud(dt) {
  const v = GAME.v; if (GAME.toastT > 0) { GAME.toastT -= dt; if (GAME.toastT <= 0) toastEl.classList.remove("on"); }
  if (!v || GAME.mode !== "play") return;
  const sp = v.speed * (units === "imp" ? MPH : KMH); $("speed").textContent = Math.round(sp); $("unit").textContent = units === "imp" ? "mph" : "km/h";
  if (v.S.rpm) { $("rpmBar").style.width = clamp((v.rpm - v.S.rpm[0]) / (v.S.rpm[1] - v.S.rpm[0]), 0, 1) * 100 + "%"; $("gear").textContent = v.rev ? "R" : v.gear + 1; $("rpm").hidden = false; } else $("rpm").hidden = true;
  hudT -= dt; if (hudT < 0) { hudT = 0.25; const nm = roadNameAt(v.p.x, v.p.z); $("street").textContent = nm || (v.surf === 2 ? "Off road" : v.surf === 1 ? "Unnamed trail" : ""); const deg = ((180 - v.psi / DEG) % 360 + 360) % 360; $("compass").textContent = COMP[Math.round(deg / 45) % 8] + " · " + Math.round(H(v.p.x, v.p.z) * (units === "imp" ? FT : 1)) + (units === "imp" ? " ft" : " m");
    $("edge").hidden = !(v.edge > 0); }
  const R = GAME.trial, tp = $("trial"); tp.hidden = !R; if (R) { $("trialName").textContent = R.T.name; $("trialTime").textContent = fmtTime(R.t); $("trialCp").textContent = R.done ? "Finished" : R.run ? "Checkpoint " + Math.min(R.cp + 1, R.cps.length) + " of " + R.cps.length : "Cross the start line"; }
  // minimap: heading up
  const mc = $("mini"), g = mc.getContext("2d"), S = mc.width, zoom = 0.62 + Math.min(0.5, v.speed * 0.012), mx = (v.p.x - X0) / MAPS, mz = (v.p.z - Z0) / MAPS;
  g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, TAU); g.clip(); g.fillStyle = "#20261f"; g.fillRect(0, 0, S, S); g.translate(S / 2, S * 0.6); g.rotate(v.psi - Math.PI); g.scale(1 / zoom, 1 / zoom); g.drawImage(MAPC, -mx, -mz);
  if (R && !R.done) { g.strokeStyle = "#ff5a3c"; g.lineWidth = 3 * zoom; g.beginPath(); const P = R.T.pts, i0 = R.cp ? R.cps[R.cp - 1].i : 0; for (let i = i0; i < P.length; i += 2) { const x = (P[i][0] - X0) / MAPS - mx, z = (P[i][1] - Z0) / MAPS - mz; if (i === i0) g.moveTo(x, z); else g.lineTo(x, z); } g.stroke(); }
  for (const r of MP.remotes.values()) { g.fillStyle = r.col; g.beginPath(); g.arc((r.v.p.x - X0) / MAPS - mx, (r.v.p.z - Z0) / MAPS - mz, 4 * zoom, 0, TAU); g.fill(); }
  g.restore(); g.fillStyle = "#fff"; g.strokeStyle = "rgba(0,0,0,0.8)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(S / 2, S * 0.6 - 9); g.lineTo(S / 2 + 6, S * 0.6 + 7); g.lineTo(S / 2, S * 0.6 + 3); g.lineTo(S / 2 - 6, S * 0.6 + 7); g.closePath(); g.fill(); g.stroke();
}

/* ---------- riding together: a lobby through the page's own room when it has one, else Firebase ---------- */
const MP = { myName: String(store.get("laf-name", "") || "").slice(0, 20), room: null, user: null, myId: null, remotes: new Map(), others: [], sendT: 0, status: "Connecting…", names: {}, dirty: true, listT: 0 };
const LB = { best: {}, submit: null };
function mpDirty() { MP.dirty = true; }
const r2 = x => Math.round(x * 100) / 100;
function mpPack() {
  const v = GAME.v, o = { v: 1, res: "lafayette", id: MP.myId, play: GAME.mode === "play" && !!v }; if (!v) return o;
  Object.assign(o, { veh: v.type, x: r2(v.p.x), y: r2(v.p.y), z: r2(v.p.z), psi: r2(v.psi), th: r2(v.th), phi: r2(v.phi), st: r2(v.steer), sp: r2(v.fwd), thr: v.throttle > 0.05 ? 1 : 0, air: v.air > 0.06 ? 1 : 0, sf: v.surf, cr: v.crash > 0 ? 1 : 0, lt: v.lightsOn ? 1 : 0 });
  if (v.S.four) o.q = [r2(v.q.x), r2(v.q.y), r2(v.q.z), r2(v.q.w)]; if (MP.myName) o.nm = MP.myName; return o;
}
function mpSend(dt) { if (!MP.room) return; MP.sendT -= dt; if (MP.sendT > 0) return; MP.sendT = 1 / 12; try { const r = MP.room.presence({ st: mpPack() }); if (r && r.catch) r.catch(() => { }); } catch (e) { } }
function mpTag(v) { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const tex = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); sp.scale.set(2.6, 0.65, 1); sp.position.set(0, v.S.four ? 2.6 : 2.3, 0); sp.renderOrder = 999; v.model.group.add(sp); return { c, tex, txt: "" }; }
function mpTagText(tag, txt) { if (tag.txt === txt) return; tag.txt = txt; const g = tag.c.getContext("2d"); g.clearRect(0, 0, 256, 64); g.font = "700 30px system-ui, sans-serif"; const w = Math.min(248, g.measureText(txt).width + 28); g.fillStyle = "rgba(10,14,24,.62)"; g.beginPath(); if (g.roundRect) g.roundRect(128 - w / 2, 8, w, 46, 23); else g.rect(128 - w / 2, 8, w, 46); g.fill(); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 32); tag.tex.needsUpdate = true; }
function mpColor(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return "hsl(" + (h % 360) + ",70%,62%)"; }
function mpSync(peers) {
  const seen = new Set(), others = [];
  for (const p of peers) {
    if (p.sameTab || (p.kind && p.kind !== "viewer")) continue; const st = p.presence && p.presence.st; if (!st || typeof st !== "object" || st.res !== "lafayette") continue;
    const by = p.by || (typeof st.id === "string" ? st.id : null); others.push({ peer: p.peer, by, st, isMe: p.isMe });
    if (st.play === false || !SPEC[st.veh] || ![st.x, st.y, st.z].every(Number.isFinite)) continue; seen.add(p.peer); let r = MP.remotes.get(p.peer);
    if (r && r.v.type !== st.veh) { scene.remove(r.v.model.group); MP.remotes.delete(p.peer); r = null; }
    if (!r) { const v = makeVehicle(st.veh); v.model.group.traverse(o => { o.frustumCulled = false; }); v.p.set(st.x, st.y, st.z); v.psi = st.psi || 0; if (st.q) v.q.set(st.q[0], st.q[1], st.q[2], st.q[3]).normalize(); scene.add(v.model.group); r = { v, tag: mpTag(v), col: mpColor(by || p.peer) }; MP.remotes.set(p.peer, r); }
    r.st = st; r.by = by;
  }
  for (const [peer, r] of MP.remotes) if (!seen.has(peer)) { scene.remove(r.v.model.group); if (r.v.rider.root.parent === scene) scene.remove(r.v.rider.root); MP.remotes.delete(peer); }
  MP.others = others; MP.dirty = true;
}
function mpList() {
  MP.dirty = false; const boxes = [$("riders"), $("menuRiders")]; let n = 0; boxes.forEach(b => { b.textContent = ""; });
  for (const o of MP.others) { n++; const nm = (typeof o.st.nm === "string" && o.st.nm.trim().slice(0, 20)) || MP.names[o.by] || (o.isMe ? "You (other tab)" : "Rider " + n), r = MP.remotes.get(o.peer); if (r) mpTagText(r.tag, nm);
    const where = o.st.play === false ? "at the menu" : (VEHICLES[o.st.veh] ? VEHICLES[o.st.veh].name.toLowerCase() : "") + (Number.isFinite(o.st.x) && roadNameAt(o.st.x, o.st.z) ? " · " + roadNameAt(o.st.x, o.st.z) : "");
    for (const bx of boxes) { const d = document.createElement("div"); d.className = "r"; const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = r ? r.col : "#ffd24a"; const b = document.createElement("b"); b.textContent = nm; const s = document.createElement("span"); s.className = "where"; s.textContent = where; d.append(dot, b, s);
      if (o.st.play !== false && Number.isFinite(o.st.x)) { const j = document.createElement("button"); j.className = "join"; j.textContent = "Join"; j.addEventListener("click", () => { const yaw = o.st.psi || 0; if (GAME.mode !== "play") startPlay(null); GAME.trial = null; placeVehicle(GAME.v, o.st.x - Math.sin(yaw) * 6 + 2.5, o.st.z - Math.cos(yaw) * 6, yaw); snapCamera(); toast("Joined " + nm, 2.5); }); d.append(j); }
      bx.appendChild(d); } }
  const head = MP.room ? (n ? n + (n === 1 ? " other rider" : " other riders") + " in Lafayette" : "No one else here yet — share this page's link to ride together") : MP.status;
  boxes.forEach(b => { const d = document.createElement("div"); d.className = "mphead"; d.textContent = head; b.prepend(d); });
}
function updateRemotes(dt, time) {
  MP.listT += dt; if ((MP.dirty && MP.listT > 0.5) || MP.listT > 3) { MP.listT = 0; mpList(); }
  const a = 1 - Math.exp(-10 * dt);
  for (const r of MP.remotes.values()) {
    const st = r.st, v = r.v; if (!st) continue; const far = Math.hypot(st.x - camera.position.x, st.z - camera.position.z); v.model.group.visible = far < 2500; if (!v.model.group.visible) continue;
    if (Math.hypot(st.x - v.p.x, st.z - v.p.z) > 40) v.p.set(st.x, st.y, st.z); else { v.p.x += (st.x - v.p.x) * a; v.p.y += (st.y - v.p.y) * a; v.p.z += (st.z - v.p.z) * a; }
    v.psi += wrap((st.psi || 0) - v.psi) * a; v.th += ((st.th || 0) - v.th) * a; v.phi += ((st.phi || 0) - v.phi) * a; v.steer += ((st.st || 0) - v.steer) * a; if (st.q && v.S.four) { _g.q.set(st.q[0], st.q[1], st.q[2], st.q[3]).normalize(); v.q.slerp(_g.q, a); }
    v.fwd = st.sp || 0; v.speed = Math.abs(v.fwd); v.throttle = st.thr ? 1 : 0; v.air = st.air ? 0.2 : 0; v.surf = st.sf || 0; v.lightsOn = !!st.lt; v.acc = 0; v.psiDot = 0; if (v.S.human && st.thr) v.crank += clamp(v.speed * 0.9 + 2.5, 3, 11) * dt;
    const r0 = v.S.rw || v.S.rr; for (let i = 0; i < 4; i++) { v.spin[i] += v.fwd / r0 * dt; v.comp[i] = v.S.four ? v.S.sag : (i ? v.S.sagR : v.S.sagF); }
    if (st.cr && !v.ragdoll) { v.v.set(Math.sin(v.psi) * v.fwd, 0, Math.cos(v.psi) * v.fwd); v.crash = 0.01; } else if (!st.cr && v.ragdoll) { v.crash = 0; v.ragdoll = null; }
    if (v.crash > 0) stepCrash(v, dt); syncVehicle(v, dt, time);
  }
}
const FIREBASE_CONFIG = { apiKey: "AIzaSyDP_rgi4dWZqVax_c5Ob5Hg4dilLS9Bchc", authDomain: "kicker-run.firebaseapp.com", databaseURL: "https://kicker-run-default-rtdb.firebaseio.com", projectId: "kicker-run", storageBucket: "kicker-run.firebasestorage.app", messagingSenderId: "149808173020", appId: "1:149808173020:web:744be18f442c535fe54919" };
const fbLoad = src => new Promise((ok, no) => { const e = document.createElement("script"); e.src = src; e.onload = ok; e.onerror = no; document.head.appendChild(e); });
async function fbInit() {
  MP.status = "Connecting to the lobby…"; MP.dirty = true;
  const Vv = "https://www.gstatic.com/firebasejs/10.12.2/"; await fbLoad(Vv + "firebase-app-compat.js"); await Promise.all([fbLoad(Vv + "firebase-auth-compat.js"), fbLoad(Vv + "firebase-database-compat.js")]);
  const fb = window.firebase; fb.initializeApp(FIREBASE_CONFIG); const auth = fb.auth(), db = fb.database(); let presRef = null, off = null, myName = "";
  const signIn = () => auth.signInWithPopup(new fb.auth.GoogleAuthProvider()).catch(e => { MP.status = "Sign-in failed (" + ((e && e.code) || "error") + ")"; MP.dirty = true; });
  const signBtn = (show, who) => { const box = $("mpAuth"); box.textContent = ""; const g = document.createElement("button");
    if (show) { g.className = "gbtn"; g.textContent = "Sign in with Google"; g.addEventListener("click", signIn); box.append(g, " to ride with friends and post times"); } else { g.className = "gbtn out"; g.textContent = "Sign out"; g.addEventListener("click", () => auth.signOut()); box.append("Signed in as " + who + " ", g); } };
  db.ref("lb").on("value", s => { const all = s.val() || {}, best = {}; for (const uid in all) { const e = all[uid]; if (!e) continue; for (const k in e) { if (k.slice(0, 4) !== "laf_" || typeof e[k] !== "number") continue; if (!best[k] || e[k] < best[k].ms) best[k] = { ms: e[k], nm: String(e.nm || "Rider").slice(0, 16) }; } } LB.best = best; if (!$("menu").hidden) refreshTrialList(); }, () => { });
  auth.onAuthStateChanged(u => {
    if (presRef) { presRef.remove().catch(() => { }); presRef = null; } if (off) { off(); off = null; }
    MP.room = null; MP.remotes.forEach(r => scene.remove(r.v.model.group)); MP.remotes.clear(); MP.others = []; LB.submit = null;
    if (!u) { MP.myId = null; MP.status = "Riding solo · sign in to ride with others"; signBtn(true); MP.dirty = true; return; }
    MP.myId = u.uid; myName = ((u.displayName && u.displayName.split(" ")[0]) || "Rider").slice(0, 20); signBtn(false, myName); if (!MP.myName) { MP.myName = myName; $("nameIn").value = myName; }
    presRef = db.ref("presence/" + u.uid); presRef.onDisconnect().remove();
    MP.room = { presence: patch => presRef.set({ st: patch.st, nm: (MP.myName || myName).slice(0, 24), t: fb.database.ServerValue.TIMESTAMP }) };
    LB.submit = (key, ms) => db.ref("lb/" + u.uid).update({ nm: (MP.myName || myName).slice(0, 24), [key]: ms }).catch(() => { });
    const ref = db.ref("presence"), fn = s => { const all = s.val() || {}, peers = []; for (const id in all) { const e = all[id]; if (!e || !e.st) continue; if (e.nm) MP.names[id] = String(e.nm).slice(0, 24); peers.push({ peer: id, by: id, sameTab: id === u.uid, isMe: id === u.uid, kind: "viewer", presence: { st: e.st } }); } mpSync(peers); };
    ref.on("value", fn, () => { MP.room = null; MP.status = "The lobby refused the connection"; MP.dirty = true; }); off = () => ref.off("value", fn); MP.dirty = true;
  });
}
function lbSubmit(key, ms) { if (LB.submit) LB.submit(key, ms); }
async function mpInit() {
  if (QS.has("solo") || QS.has("test")) { MP.status = "Riding solo"; return; }
  if (!window.claude || !window.claude.use) { fbInit().catch(() => { MP.status = "Riding solo · lobby unreachable"; MP.dirty = true; }); return; }
  try {
    const [room, user] = await Promise.all([window.claude.use("room"), window.claude.use("user")]); MP.user = user; if (user) MP.myId = await user.id();
    if (!room) { MP.status = "Riding solo · this page could not join a lobby"; MP.dirty = true; return; }
    MP.room = room; room.onPeers(ch => mpSync(ch.peers), () => { MP.room = null; MP.status = "Riding solo · lobby disconnected"; MP.dirty = true; }); MP.dirty = true;
  } catch (e) { MP.status = "Riding solo · lobby unreachable"; MP.dirty = true; }
}
