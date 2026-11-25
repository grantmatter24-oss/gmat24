/* ---------- skiing: Kicker Run's ride model on a real mountain ----------
   Same numbers as ski.html: gravity 18, speed runs along the skis, carve builds over 0.55 s, turning scrubs speed, Shift pushes, J brakes,
   Space charges a pop, A/D spin and W/S flip in the air, arrows nudge sideways, grabs on Space/Q/E/C/F, W/S butter on snow.
   Differences forced by free roaming: heading is a compass angle instead of an offset from the course, and speed may fall to zero. */
const G = 18, MAXV = 400, Y_AXIS = new THREE.Vector3(0, 1, 0);
const K = { left: 0, right: 0, up: 0, down: 0, spinL: 0, spinR: 0, grab: 0, grabN: 0, grabI: 0, grabQ: 0, grabS: 0, focus: 0, boost: 0, brake: 0 };
const MP_KEYS = Object.keys(K);
let popReq = false, popPow = 1, charging = false, chargeT = 0, focusM = 1, timeScale = 1;
const sk = {
  p: new THREE.Vector3(), v: new THREE.Vector3(), yaw: 0, ground: true, air: false, airT: 0, turn: 0, carve: 0, sw: false,
  spin: 0, spinV: 0, spinHold: 0, spinDir: 0, spinTarget: 0, rot: 0, rotV: 0, flipHold: 0, flipDir: 0, flipAcc: 0, flipB: 0, flipF: 0, grabT: 0, grabKind: "Tail", butSpun: false,
  chg: 0, pumpT: 0, landT: 0, popT: 0, stumT: 0, stumD: 1, crashed: false, crashT: 0, tumZ: 0, sp: 0, vx: 0, vs: 0, vside: 0,
  grind: null, grindT: 0, gs: 0, noRail: 0, featLaunch: false, boxT: 0, bike: false, finished: false, bikeJump: false,
  mode: "menu", lift: null, car: -1, liftS: 0, wait: 0, pts: 0, vert: 0, maxSp: 0, peakY: 0, slope: 0,
  surf: { groom: 0, powder: 1, rock: 0, road: 0, mogul: 0 }, safe: new THREE.Vector3(), safeYaw: 0, safeT: 0, slip: 0, brakeK: 0, slideYaw: 0
};
const nrm = new THREE.Vector3(0, 1, 0), fw = new THREE.Vector3(), rt = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let rig = null, fpv = store.get("pal-fpv", false), units = store.get("pal-units", "imp"), paused = false, toastT = 0;
/* Goggles: an extra the Kicker Run rider does not have. They are sold at the goggle shop in the village and worn over whatever is on your head. */
const GOGGLES = { none: null, fire: [0x141414, 0xff7a1a], ice: [0xf2f4f7, 0x3aa0ff], rose: [0x7a1420, 0xff5fa2], jade: [0x0f3a2a, 0x39d98a], gold: [0x1a1a1a, 0xf2c230], night: [0x1b1e24, 0x2a2d33], chrome: [0xcfd6de, 0xe6eef8], glow: [0x0e0f12, 0x39ffb0] };
KR.OUTFIT_OPTS.goggles = { none: "No goggles", fire: "Fire lens goggles", ice: "Ice blue goggles", rose: "Rose lens goggles", jade: "Jade lens goggles", gold: "Gold mirror goggles", night: "Blackout goggles", chrome: "Mirror chrome goggles", glow: "Glow goggles" }; KR.OUTFIT_DEFAULT.goggles = "none";
Object.assign(KR.OUTFIT_OPTS.helmet, { chrome: "Chrome helmet", visor: "LED visor helmet", astro: "Astronaut helmet", kabuto: "Samurai kabuto", crown: "King's crown", wizhat: "Wizard hat", trapper: "Fur trapper hat" });
Object.assign(KR.OUTFIT_OPTS.helmet, { laurel: "Victor's laurel wreath" }); Object.assign(KR.OUTFIT_OPTS.accessory, { halo: "Champion's halo", medal: "Gold medal" });   // prizes: won with a gold medal, never sold
const ACC_NEW = { pack: "Backpack", bandana: "Face bandana", hippack: "Hip pack", cam: "Helmet camera" }; Object.assign(KR.OUTFIT_OPTS.accessory, ACC_NEW);   // extras sold at the accessory shop
/* Designer skis: wide boards with printed top sheets, sold at the ski shop in the village. Across the canvas the left half is the top of
   the ski and the right half its base; down the canvas runs the length of the ski. */
const SKI_DESIGNS = {
  aurora: ["Aurora wide skis", (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0b1d3a"); g.addColorStop(0.35, "#0fb5a6"); g.addColorStop(0.65, "#7a3fe0"); g.addColorStop(1, "#ff5fa2"); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let k = 0; k < 5; k++) { x.strokeStyle = "rgba(190,255,230," + (0.25 + 0.1 * k) + ")"; x.lineWidth = 3 + k; x.beginPath(); for (let y = 0; y <= h; y += 8) x.lineTo(w * (0.2 + 0.12 * k) + Math.sin(y * 0.02 + k) * w * 0.12, y); x.stroke(); } x.fillStyle = "#fff"; for (let i = 0; i < 70; i++) x.fillRect((i * 37) % w, (i * 97) % h, 1.5, 1.5); }],
  topo: ["Topo line wide skis", (x, w, h) => { x.fillStyle = "#0e1013"; x.fillRect(0, 0, w, h); x.strokeStyle = "#e9edf2"; x.lineWidth = 1.2; for (let c = 0; c < 6; c++) { const cx = w * (0.2 + 0.6 * ((c * 0.37) % 1)), cy = h * (0.1 + c * 0.16); for (let r = 6; r < 70; r += 9) { x.beginPath(); for (let a = 0; a <= 6.4; a += 0.2) { const rr = r * (1 + 0.25 * Math.sin(a * 3 + c)); x.lineTo(cx + Math.cos(a) * rr * 0.7, cy + Math.sin(a) * rr * 1.5); } x.stroke(); } } x.fillStyle = "#ff5a1f"; x.fillRect(0, h * 0.47, w, 6); }],
  sunset: ["Sierra sunset wide skis", (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#2a0f4a"); g.addColorStop(0.45, "#d4326e"); g.addColorStop(0.75, "#ff8a2a"); g.addColorStop(1, "#ffd76a"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "#fff3c4"; x.beginPath(); x.arc(w / 2, h * 0.7, w * 0.22, 0, 7); x.fill(); x.fillStyle = "#140a1f"; x.beginPath(); x.moveTo(0, h * 0.86); for (let k = 0; k <= 8; k++) x.lineTo(k * w / 8, h * (0.86 - (k % 2 ? 0.07 : 0.02) - 0.02 * Math.sin(k))); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fill(); }],
  tiger: ["Tiger wide skis", (x, w, h) => { x.fillStyle = "#f08a1c"; x.fillRect(0, 0, w, h); x.fillStyle = "#111"; for (let k = 0; k < 16; k++) { const y = k * h / 15, d = k % 2 ? 1 : -1; x.beginPath(); x.moveTo(d > 0 ? 0 : w, y); x.quadraticCurveTo(w / 2, y + 26, d > 0 ? w * 0.72 : w * 0.28, y + 8); x.quadraticCurveTo(w / 2, y + 2, d > 0 ? 0 : w, y - 14); x.fill(); } x.fillStyle = "rgba(255,240,210,0.5)"; x.fillRect(w * 0.42, 0, w * 0.16, h); }],
  galaxy: ["Galaxy wide skis", (x, w, h) => { x.fillStyle = "#070a1c"; x.fillRect(0, 0, w, h); for (const [cx, cy, c] of [[0.3, 0.2, "120,60,220"], [0.7, 0.45, "40,120,255"], [0.35, 0.7, "230,60,160"], [0.65, 0.9, "60,200,220"]]) { const g = x.createRadialGradient(w * cx, h * cy, 2, w * cx, h * cy, w * 0.7); g.addColorStop(0, "rgba(" + c + ",0.75)"); g.addColorStop(1, "rgba(" + c + ",0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); } x.fillStyle = "#fff"; for (let i = 0; i < 160; i++) { const s = i % 9 === 0 ? 2.4 : 1.1; x.fillRect((i * 53) % w, (i * 131) % h, s, s); } }],
  wood: ["Walnut veneer wide skis", (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#5a3418"); g.addColorStop(0.5, "#8a5a2e"); g.addColorStop(1, "#4a2a12"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(40,20,8,0.5)"; x.lineWidth = 1; for (let k = 0; k < 22; k++) { x.beginPath(); for (let y = 0; y <= h; y += 10) x.lineTo(k * w / 22 + Math.sin(y * 0.015 + k * 1.7) * 3, y); x.stroke(); } x.fillStyle = "#0d0d0f"; x.fillRect(0, 0, w, h * 0.09); x.fillRect(0, h * 0.91, w, h * 0.09); x.fillStyle = "#d9b24a"; x.fillRect(0, h * 0.09, w, 3); x.fillRect(0, h * 0.91 - 3, w, 3); }],
  neon: ["Neon bolt wide skis", (x, w, h) => { x.fillStyle = "#08090b"; x.fillRect(0, 0, w, h); for (const [lw, c] of [[14, "rgba(60,255,160,0.25)"], [7, "rgba(60,255,200,0.6)"], [2.5, "#eafff5"]]) { x.strokeStyle = c; x.lineWidth = lw; x.lineJoin = "miter"; x.beginPath(); for (let k = 0; k <= 12; k++) x.lineTo(w * (k % 2 ? 0.2 : 0.8), k * h / 12); x.stroke(); } x.fillStyle = "#ff2fd0"; x.fillRect(0, h * 0.02, w, 5); x.fillRect(0, h * 0.97, w, 5); }],
  glacier: ["Glacier ice wide skis", (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#f4fbff"); g.addColorStop(1, "#9fd4ee"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = "#2b7fb8"; x.lineWidth = 1.6; for (let k = 0; k < 9; k++) { let px = (k * 41) % w, py = (k * 67) % h; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 7; s++) { px += Math.sin(k * 3 + s * 2.1) * 16; py += 14 + 9 * Math.cos(k + s); x.lineTo(px, py); } x.stroke(); } x.fillStyle = "#0e3a5c"; x.fillRect(0, h * 0.48, w, 8); }],
  lava: ["Lava crack wide skis", (x, w, h) => { x.fillStyle = "#0c0a0a"; x.fillRect(0, 0, w, h); for (const [lw, c] of [[9, "rgba(255,70,10,0.35)"], [4, "#ff5a14"], [1.4, "#ffe08a"]]) { x.strokeStyle = c; x.lineWidth = lw; for (let k = 0; k < 8; k++) { let px = (k * 29 + 9) % w, py = (k * 71) % h; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 8; s++) { px += Math.sin(k * 2.3 + s * 1.9) * 18; py += 16 + 8 * Math.cos(k * 1.3 + s); x.lineTo(px, py); } x.stroke(); } } }],
  checker: ["Race checker wide skis", (x, w, h) => { x.fillStyle = "#f4f5f7"; x.fillRect(0, 0, w, h); const q = w / 8; for (const y0 of [0, h * 0.84]) for (let j = 0; j < h * 0.16 / q; j++) for (let i = 0; i < 8; i++) if ((i + j) % 2) { x.fillStyle = "#101114"; x.fillRect(i * q, y0 + j * q, q, q); } x.fillStyle = "#d3202a"; x.fillRect(w * 0.2, h * 0.16, w * 0.1, h * 0.68); x.fillStyle = "#101114"; x.fillRect(w * 0.34, h * 0.16, w * 0.04, h * 0.68); }],
  champ: ["Champion's gold-leaf skis", (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#fff6d8"); g.addColorStop(0.5, "#e8b830"); g.addColorStop(1, "#8a5a0a"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(255,250,220,0.8)"; for (let i = 0; i < 90; i++) { x.save(); x.translate((i * 37) % w, (i * 97) % h); x.rotate(i); x.fillRect(-4, -1.5, 8, 3); x.restore(); } x.strokeStyle = "#5a3a06"; x.lineWidth = 2; for (let k = 0; k < 9; k++) for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(w / 2 + sd * 12, h * 0.3 + k * 22, 9, 4, sd * 0.7, 0, 7); x.stroke(); } x.fillStyle = "#1a1206"; x.fillRect(0, h * 0.02, w, 5); x.fillRect(0, h * 0.97, w, 5); }]   /* won, not sold: gold at the Speed Trap */
};
for (const k in SKI_DESIGNS) KR.OUTFIT_OPTS.skis[k] = SKI_DESIGNS[k][0];
let skiDesignTex = null;
function skiDesigns() { if (skiDesignTex) return skiDesignTex; skiDesignTex = {}; for (const k in SKI_DESIGNS) { const c = document.createElement("canvas"); c.width = 128; c.height = 512; const x = c.getContext("2d"); x.save(); x.beginPath(); x.rect(0, 0, 64, 512); x.clip(); SKI_DESIGNS[k][1](x, 64, 512); x.restore(); x.fillStyle = "#0d0f12"; x.fillRect(64, 0, 64, 512); x.fillStyle = "#e9edf2"; x.fillRect(92, 0, 8, 512);   // the design on top, a plain black base with one stripe
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; skiDesignTex[k] = t; } return skiDesignTex; }
function dressRig(R, of) { if (!R.skiDes) { R.skiDes = true; Object.assign(R.skiTexes, skiDesigns()); } KR.dress(R, of); clothDress(R, of); if (of && SKI_DESIGNS[of.skis]) R.skiMeshes.forEach(m => { m.scale.x = 1.4; }); const q = R.gog, sm = !of || of.style !== "detailed", c = q && (GOGGLES[of && of.goggles] || (sm ? [0x15171b, 0x39424d] : null)); if (!q) return;
  R.simpleOnly.forEach(m => { if (m.parent === R.head && !m.userData.helmetOnly && m.material !== R.mats.skin) m.visible = false; });   /* the mannequin's own stock goggles give way to these; with none bought it wears a plain smoke pair */
  q.grp.scale.setScalar(sm ? 1.21 : 1); q.grp.visible = !!c; if (c) { q.frame.color.setHex(c[0]); q.lens.color.setHex(c[1]); q.lens.emissive.setHex(c[1]); q.lens.emissiveIntensity = of && of.goggles === "glow" ? 1.6 : of && of.goggles === "chrome" ? 0.55 : 0.28; q.stripe.color.setHex(c[1]); } }
let outfit = Object.assign({}, KR.OUTFIT_DEFAULT, store.get("kickerOutfit", null) || {}, store.get("pal-outfit", null) || {});
for (const k of ["jacket", "pants"]) if (!KR[k === "jacket" ? "JACKETS" : "PANTS"][outfit[k]]) outfit[k] = KR.OUTFIT_DEFAULT[k];
const fwdOf = (yaw, out) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
function tangent(yaw) { normalAt(sk.p.x, sk.p.z, 0.7, nrm); fwdOf(yaw, fw).addScaledVector(nrm, -fw.dot(nrm)).normalize(); rt.set(-Math.cos(yaw), 0, Math.sin(yaw)); return Math.asin(clamp(fw.y, -1, 1)); }
function placeSkier(x, z, yaw, speed = 0) {
  sk.p.set(x, H(x, z), z); sk.yaw = yaw; sk.sp = speed; sk.v.set(0, 0, 0); sk.slope = tangent(yaw);
  sk.ground = true; sk.air = false; sk.airT = 0; sk.crashed = false; sk.sw = false; sk.spin = sk.spinV = sk.rot = sk.rotV = sk.spinTarget = 0; sk.turn = sk.carve = 0; sk.mode = "ski"; sk.lift = null; sk.car = -1; sk.stumT = 0; sk.butSpun = false;
  sk.slip = 0; sk.grind = null; REW.length = 0; sk.safe.copy(sk.p); sk.safeYaw = yaw; camSnap = true; sk.parked = !speed; sk.lastY = sk.p.y; charging = false; popReq = false;
}
function spawnAt(key) {
  if (key === "village") { const L = LIFTS.find(l => l.name === "KT22 Express") || LIFTS[0]; placeSkier(L.bot.x - Math.sin(L.dir) * 16, L.bot.z - Math.cos(L.dir) * 16, L.dir); return; }
  const L = LIFTS[+key]; if (L) unloadAt(L);
}
function unloadAt(L) {
  if (L.type.startsWith("chair")) { // off the chair at the unload line and away to the outside of the terminal, as you do on the real ones
    liftPoint(L, L.len - L.loadS + 3, 1, _cp); const o = 4.2; placeSkier(_cp.x + L.rx[L.ns - 1] * o, _cp.z + L.rz[L.ns - 1] * o, L.dir - 0.75, 3); return; }
  const d = L.carpet ? 3 : L.type === "tram" ? 16 : 20; placeSkier(L.top.x + Math.sin(L.dir) * d, L.top.z + Math.cos(L.dir) * d, L.dir, L.carpet ? 1 : 3);
}
function toast(msg, t = 2.6) { const e = $("toast"); e.textContent = msg; e.style.opacity = 1; toastT = t; }
let trickT = 0;
function popup(name, sub) { $("trickN").textContent = name; $("trickP").textContent = sub || ""; $("trick").style.opacity = 1; trickT = 2.2; }
function payout(pts, label, perfect, cork) { pts = Math.round(pts / 10) * 10; sk.pts += pts; if (label) popup(label, "+" + pts.toLocaleString() + (perfect ? "  · perfect landing" : "") + (cork ? "  · cork bonus" : "")); }
function gDown() { if (!charging && sk.mode === "ski" && !paused && sk.ground && !(sk.stumT > 0) && !sk.crashed) { charging = true; chargeT = 0; } }
function gUp() { if (charging) { charging = false; popPow = Math.max(0.3, Math.min(1, chargeT / 0.5)); popReq = true; chargeT = 0; } }
function trickInfo() { // Kicker Run's names
  const nB = Math.floor(((sk.flipB || 0) + 1.0) / TAU), nF = Math.floor(((sk.flipF || 0) + 1.0) / TAU), flips = nB && nF ? nB + nF : Math.floor((Math.abs(sk.flipAcc) + 1.0) / TAU), names = [], back = sk.flipAcc >= 0;
  if (nB && nF) { const cnt = n => (["", "", "Double ", "Triple "][Math.min(n, 3)]); names.push(cnt(nB) + "Backflip + " + cnt(nF) + "Frontflip"); const halves2 = Math.round(Math.abs(sk.spin) / Math.PI); if (halves2) names.push(halves2 * 180 + ""); const grab2 = sk.grabT > 0.3; if (grab2) names.push((sk.grabKind || "Tail") + " grab"); return { flips, halves: halves2, grab: grab2, label: names.join(" + ") }; }
  const halves = Math.round(Math.abs(sk.spin) / Math.PI), deg = halves * 180;
  if (flips > 0 && halves > 0) names.push((flips >= 3 ? "Triple Cork " : flips === 2 ? "Double Cork " : halves % 2 === 1 ? (back ? "Rodeo " : "Misty ") : "Cork ") + deg);
  else if (flips > 0) names.push((["", "", "Double ", "Triple ", "Quad "][Math.min(flips, 4)]) + (back ? "Backflip" : "Frontflip"));
  else if (halves > 0) names.push(halves === 1 ? "Half cab 180" : "Flat " + deg);
  const grab = sk.grabT > 0.3; if (grab) names.push((sk.grabKind || "Tail") + " grab");
  return { flips, halves, grab, label: names.join(" + ") };
}
function crash(why) {
  if (sk.crashed) return; const vh = Math.hypot(sk.v.x, sk.v.z);
  if (!sk.ground && vh > 0.5) sk.yaw = Math.atan2(sk.v.x, sk.v.z);
  const spd = sk.ground ? sk.sp : vh; sk.crashed = true; sk.grind = null; sk.crashT = 0; sk.air = false; sk.ground = true; sk.sp = Math.max(spd * 0.75, 5);
  // How you go down depends on the fall. Fast, you tomahawk: end over end, rolling as you go. Slow, you tip over and slide on your side.
  const dir = sk.rotV ? Math.sign(sk.rotV) : sk.flipAcc ? Math.sign(sk.flipAcc) : (Math.random() < 0.75 ? -1 : 1); sk.crashDir = dir; sk.crashSpd = spd; sk.crashHop = 0;
  if (spd > 9) { sk.rotV = dir * (4 + spd * 0.45); sk.tumV = (Math.random() - 0.5) * (4 + spd * 0.3); sk.tumZ = (Math.random() - 0.5) * 1.5; }
  else { sk.rotV = dir * 2.2; sk.tumV = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2); sk.tumZ = 0; }
  if (spd > 11 || (why === "Bad landing" && spd > 8)) yardSale(spd);   // a bad one takes your skis and poles off
  charging = false; popReq = false;
  popup("Wipeout", why); sfx("crash"); for (let i = 0; i < 36; i++) spray(sk.p, 3 + Math.random() * 5, (Math.random() - 0.5) * 6, sk.v);
}
function stumble(t) { // clipped a tree: wobble, lose speed, get pushed clear
  if (sk.stumT > 0 || sk.crashed) return; sk.stumT = 1.3; sk.stumD = Math.random() < 0.5 ? -1 : 1; sk.sp *= 0.7;
  const dx = sk.p.x - t.x, dz = sk.p.z - t.z, d = Math.hypot(dx, dz) || 1, r = 0.45 + t.h * 0.012; sk.p.x = t.x + dx / d * r; sk.p.z = t.z + dz / d * r;
}
/* A yard sale: in a bad fall the bindings release and the pole straps let go. Skis and poles fly off, slide to a stop and lie there until you get up and collect them. */
const LOOSE = [], _lw = new THREE.Vector3(), _lqt = new THREE.Quaternion(), _lax = new THREE.Vector3();
function yardSale(spd) {
  if (sk.lost || !rig) return; sk.lost = true; rig.hold.updateMatrixWorld(true);
  const toss = (src, long) => { const o = src.clone(); src.getWorldPosition(_lw); src.getWorldQuaternion(_lqt); o.position.copy(_lw); o.quaternion.copy(_lqt); o.scale.set(1, 1, 1); o.visible = true; o.traverse(c => { c.visible = true; }); scene.add(o);
    LOOSE.push({ o, v: new THREE.Vector3(sk.v.x * (0.45 + 0.5 * Math.random()) + (Math.random() - 0.5) * 6, 2 + Math.random() * 4 + spd * 0.12, sk.v.z * (0.45 + 0.5 * Math.random()) + (Math.random() - 0.5) * 6), ax: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), w: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 9), h: long ? 0.04 : 0.02, long }); };
  rig.skiMeshes.forEach(m => toss(m, true)); rig.arms.forEach(a => toss(a.pole, false));
}
function clearLoose() { for (const l of LOOSE) scene.remove(l.o); LOOSE.length = 0; }
function updateLoose(dt) {
  for (const l of LOOSE) { if (l.rest) continue; const o = l.o; l.v.y -= G * dt; o.position.addScaledVector(l.v, dt); const g = H(o.position.x, o.position.z) + l.h;
    if (o.position.y <= g) { o.position.y = g; if (l.v.y < -2.5) { l.v.y *= -0.25; l.w *= 0.6; } else l.v.y = 0; const hs = Math.hypot(l.v.x, l.v.z), dec = Math.max(0, hs - 5 * dt) / (hs || 1); l.v.x *= dec; l.v.z *= dec; l.w *= Math.exp(-3 * dt);
      if (hs < 0.25 && Math.abs(l.w) < 0.6) { l.rest = true; const yw = Math.random() * TAU; normalAt(o.position.x, o.position.z, 0.7, _lw); if (l.long) o.quaternion.setFromUnitVectors(_lax.set(0, 1, 0), _lw).multiply(_lqt.setFromAxisAngle(_lax.set(0, 1, 0), yw)); else o.quaternion.setFromUnitVectors(_lax.set(0, 1, 0), _lw.set(Math.sin(yw), 0.04, Math.cos(yw)).normalize()); continue; } }   // skis lie flat on the snow, poles lie along it
    o.quaternion.premultiply(_lqt.setFromAxisAngle(l.ax, l.w * dt)); }
}
/* How far the rock of a cliff stands out above the surveyed slope at a point, so the rider can stand on the rock that is drawn. */
function rockLift(x, z) {
  const ck = cliffK(x, z); if (ck < 0.2 || !CLIFFS.lab) return 0; const m = sstep(0.16, 0.5, ck), e = 1.25, ax = (H(x - e, z) - H(x + e, z)) / (2 * e), az = (H(x, z - e) - H(x, z + e)) / (2 * e), sl = Math.hypot(ax, az), steep = sstep(0.9, 1.7, sl);
  const c = CLIFFS[CLIFFS.lab[clamp(Math.round((z - Z0) / CELL), 0, NZ - 1) * NX + clamp(Math.round((x - X0) / CELL), 0, NX - 1)] - 1], d = lerp(-0.9, m * (0.15 + rockPush(c ? cliffStyle(c) : "b", x, H(x, z), z)), steep);
  return d > 0 ? Math.min(3, d * sl * 0.8) : 0;
}
function standUp() {
  if (sk.lost) { clearLoose(); sk.lost = false; toast("You collect your skis and poles", 2); }
  const g = tmp.set(H(sk.p.x - 1, sk.p.z) - H(sk.p.x + 1, sk.p.z), 0, H(sk.p.x, sk.p.z - 1) - H(sk.p.x, sk.p.z + 1));
  const yaw = g.lengthSq() > 1e-4 ? Math.atan2(g.x, g.z) + 1.35 : sk.yaw;   // stand across the fall line so you do not slide off at once
  if (rockAt(sk.p.x, sk.p.z) > 0.75 || !inWorld(sk.p.x, sk.p.z, 60)) { placeSkier(sk.safe.x, sk.safe.z, sk.safeYaw); return; }
  placeSkier(sk.p.x, sk.p.z, yaw);
}
const PLAZA = { x: 0, z: 0, r: 0, asp: 1 }, plazaD = (x, z) => Math.hypot((x - PLAZA.x) / PLAZA.asp, z - PLAZA.z), plazaK = (x, z) => PLAZA.r ? 1 - sstep(PLAZA.r - 10, PLAZA.r, plazaD(x, z)) : 0;   // the cobbled ground of the main village: an oval, PLAZA.r deep and asp times as long
function readSurface() {
  const m = maskAt(sk.p.x, sk.p.z), s = sk.surf; s.groom = m[0]; s.road = Math.max(m[2], plazaK(sk.p.x, sk.p.z) * (1 - sstep(0.2, 0.6, m[0]) * sstep(PLAZA.r * 0.55, PLAZA.r * 0.8, plazaD(sk.p.x, sk.p.z)))); s.mogul = m[3]; s.rock = sstep(0.215, 0.33, 1 - nrm.y) * (1 - m[0]) * sstep(0.35, 0.75, rockAt(sk.p.x, sk.p.z));   // only true cliff bands count as rock under the skis
  s.deep = (1 - sstep(0.15, 0.6, m[0])) * (1 - s.road) * (1 - s.rock);   // new snow lying untouched: everywhere the cats have not been
  s.powder = (1 - m[0]) * (1 - s.road) * (1 - s.rock) * (wx.snow ? 1 : 0.6); return s;
}
function railAt(x, y, z) { const c = parkCell(x, z); if (!c) return null; for (const f of c) { if (f.k !== "rail") continue; const rx = x - f.x, rz = z - f.z, s = rx * f.dx + rz * f.dz; if (s < -0.6 || s > f.len - 0.5 || Math.abs(-rx * f.dz + rz * f.dx) > 0.9) continue; const ry = lerp(f.y0, f.y1, clamp(s / f.len, 0, 1)); if (y <= ry + 0.45 && y >= ry - 1.4) return f; } return null; }
const _rkN = new THREE.Vector3(), onRock = (x, z) => cliffK(x, z) > 0.35 && normalAt(x, z, 1.2, _rkN).y < 0.72;   // bare cliff face: steeper than about 45 degrees inside a surveyed cliff
function landing() {
  const p = sk.p, v = sk.v, vh = Math.hypot(v.x, v.z), head = vh > 0.5 ? Math.atan2(v.x, v.z) : sk.yaw;
  p.y = H(p.x, p.z); const sA = tangent(head), diff = wrap(sk.rot - sA), real = sk.airT > 0.3, PH = KR.PHYS;
  if (real && Math.abs(diff) > 1.6 + PH.land) return crash("Bad landing");   // a sideways spin never crashes: the skis swing round to the nearest forward or backward
  sk.yaw = head; sk.slip = 0; let vt = vh * Math.cos(sA) + v.y * Math.sin(sA);
  if (real) vt *= 1 - 0.07 * sk.surf.powder;
  if (real && Math.abs(diff) > 0.65) { vt *= 1 - 0.45 * clamp((Math.abs(diff) - 0.65) / 0.95, 0, 1); for (let i = 0; i < 10; i++) spray(p, 2 + Math.random() * 2, (Math.random() - 0.5) * 5, v); }   // sloppy pitch only scrubs speed
  sk.sp = clamp(vt, 0, MAXV); sk.ground = true; sk.air = false; if (sk.airT > 0.15) sk.landT = 0.35;
  const kHalf = Math.round(sk.spin / Math.PI), odd = Math.abs(kHalf) % 2 === 1;
  if (real && sk.airT > 0.75) {
    const tr = trickInfo(), perfect = Math.abs(diff) < 0.4; let pts = sk.airT * 150;
    if (tr.flips) pts += 400 * tr.flips * (1 + 0.5 * (tr.flips - 1));
    pts += tr.halves * 150; if (tr.grab) pts += Math.min(sk.grabT, 2) * 250;
    if (tr.flips && tr.halves) pts *= 1.3; if (perfect) pts *= 1.25; if (odd) pts *= 1.15;
    if (sk.featLaunch === false) pts *= 0.35;   // tricks off flat ground count for less
    const drop = sk.peakY - p.y, label = (tr.label || (sk.airT > 0.8 ? (drop > 4 ? Math.round(units === "imp" ? drop * FT : drop) + (units === "imp" ? " ft drop" : " m drop") : "Clean air") : "")) + (odd ? (tr.label ? " · " : "") + "Switch" : "");
    payout(pts, label, perfect, tr.flips && tr.halves); if (tr.flips || tr.halves) focusM = Math.min(1, focusM + 0.2);
    sfx(tr.flips || tr.halves || tr.grab ? "land" : "thump", clamp(sk.airT, 0.4, 1.2)); for (let i = 0; i < 22; i++) spray(p, 2 + Math.random() * 4, (Math.random() - 0.5) * 7, v);
  } else if (sk.airT > 0.15) { sfx("thump", 0.35); for (let i = 0; i < 6; i++) spray(p, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 4, v); }
  sk.spin -= kHalf * Math.PI; sk.spinTarget = 0; if (odd) sk.sw = !sk.sw;
  sk.rot = 0; sk.rotV = 0; sk.flipAcc = 0; sk.flipB = 0; sk.flipF = 0; sk.spinV = 0; sk.grabT = 0; sk.airT = 0;
}
function stepSki(dt) {
  const p = sk.p, v = sk.v, PH = KR.PHYS;
  if (COMP.hold) { sk.sp = 0; v.set(0, 0, 0); popReq = false; return; }   // in the start gate, waiting for the count
  if (charging) { if (!sk.ground || sk.crashed) { charging = false; chargeT = 0; } else chargeT += dt; }
  sk.chg = charging ? Math.min(1, chargeT / 0.5) : 0;
  sk.pumpT = Math.max(0, sk.pumpT - dt); sk.landT = Math.max(0, sk.landT - dt); sk.popT = Math.max(0, sk.popT - dt);
  if (sk.crashed) { // slide and tumble to a stop, then get up
    const sl = tangent(sk.yaw); sk.crashT += dt; sk.sp = Math.max(0, sk.sp + (-G * Math.sin(sl) * 0.4 - 1.0 * sk.sp - 2.2) * dt); p.x += sk.sp * Math.sin(sk.yaw) * dt; p.z += sk.sp * Math.cos(sk.yaw) * dt; p.y = H(p.x, p.z);   // you keep sliding on a steep slope
    if (sk.sp > 3) { sk.rotV += (sk.crashDir * (sk.crashSpd > 9 ? Math.min(10, 2 + sk.sp * 0.55) : 1.4) - sk.rotV) * Math.min(1, 3 * dt); sk.rot += sk.rotV * dt; sk.tumZ += sk.tumV * dt; sk.tumV *= Math.exp(-0.5 * dt); sk.crashHop = Math.abs(Math.sin(sk.rot)) * 0.45 * clamp(sk.sp / 10, 0, 1); }
    else { const flat = Math.round((sk.rot - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2, side = Math.round(sk.tumZ / Math.PI) * Math.PI; sk.rot += (flat - sk.rot) * Math.min(1, 5 * dt); sk.tumZ += (side - sk.tumZ) * Math.min(1, 4 * dt); sk.rotV = 0; sk.crashHop *= Math.exp(-8 * dt); }   // come to rest lying flat
    if (treeHit(p.x, p.z, 0.3)) sk.sp *= 0.5; if ((sk.sp < 0.6 && sk.crashT > (sk.lost ? 2.6 : 1.4)) || sk.crashT > 5.5) standUp(); popReq = false; return;
  }
  if (sk.parked) { if (K.left || K.right || K.up || K.down || K.spinL || K.spinR || charging || popReq) sk.parked = false; else { sk.sp = 0; popReq = false; return; } }   // stay put after a spawn until the first input
  const onGr = sk.ground && !sk.grind, butterNow = onGr && sk.sp > 2 && K.brake;   // on snow J is the tail butter and S slows you down; in the air S is still the back flip
  const steer = butterNow ? 0 : onGr ? ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0) : (K.right ? 1 : 0) - (K.left ? 1 : 0);
  if (!onGr) sk.butSpun = false;
  if (butterNow) { const spI = (K.spinR ? 1 : 0) - (K.spinL ? 1 : 0); if (spI) sk.spinV += clamp(spI * 6 - sk.spinV, -30 * dt, 30 * dt); else sk.spinV *= Math.exp(-6 * dt); sk.spin += sk.spinV * dt; sk.butSpun = true; }
  else if (sk.butSpun && onGr) { sk.spin += sk.spinV * dt; sk.spinV *= Math.exp(-5 * dt); if (Math.abs(sk.spinV) < 0.5) { const kk = Math.round(sk.spin / Math.PI); sk.spin -= kk * Math.PI; if (kk % 2) sk.sw = !sk.sw; sk.butSpun = false; sk.spinV = 0; } }
  if (sk.stumT > 0) { sk.stumT -= dt; popReq = false; charging = false; }
  const stK = sk.stumT > 0 ? Math.min(1, sk.stumT / 0.9) : 0, steerS = stK ? lerp(steer, sk.stumD * Math.sin(sk.stumT * 7.5 * Math.PI / 1.3 * 2) * 0.9, stK) : steer;
  sk.turn = lerp(sk.turn, steerS, Math.min(1, 10 * dt));
  if (sk.grind) { // on a rail: slide its length, A/D spin, Space pops off
    const r = sk.grind; sk.grindT += dt; const spIn = (K.spinR ? 1 : 0) - (K.spinL ? 1 : 0);
    if (spIn) sk.spinV += clamp(spIn * 9 - sk.spinV, -60 * dt, 60 * dt); else { sk.spinV *= Math.exp(-5 * dt); const tgt = Math.round(sk.spin / Math.PI) * Math.PI; sk.spin += (tgt - sk.spin) * Math.min(1, 4 * dt); }
    sk.spin += sk.spinV * dt; const sA = Math.atan2(r.y1 - r.y0, r.len);
    sk.sp = clamp(sk.sp + (-G * Math.sin(sA) - 0.1 * sk.sp - 0.0025 * sk.sp * sk.sp) * dt, 6, MAXV); sk.gs += sk.sp * Math.cos(sA) * dt;
    const u = sk.gs / r.len; p.set(r.x + r.dx * sk.gs, lerp(r.y0, r.y1, u), r.z + r.dz * sk.gs); sk.yaw = Math.atan2(r.dx, r.dz); sk.slope = sA; sk.carve = 0;
    if (sk.grindT > 0.2 && Math.random() < 0.6) spray(p, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, v, 0.3);
    if (popReq || sk.gs >= r.len) {
      const pop = popReq ? 10.5 * (0.35 + 0.65 * popPow) : 1, spins = Math.abs(Math.round(sk.spin / Math.PI)); v.set(r.dx * sk.sp * Math.cos(sA), sk.sp * Math.sin(sA) + pop, r.dz * sk.sp * Math.cos(sA));
      if (spins % 2 === 1) sk.sw = !sk.sw; payout(sk.grindT * 420 + 450 + spins * 550, spins ? "Rail " + spins * 180 : "Rail grind", false, false); sfx("land");
      sk.grind = null; sk.noRail = 0.5; sk.ground = false; sk.air = true; sk.rot = sA; sk.vside = 0; sk.peakY = p.y; sk.airT = 0; sk.flipAcc = 0; sk.flipB = 0; sk.flipF = 0; sk.spin = 0; sk.spinV = 0; sk.grabT = 0; sk.rotV = 0; sk.featLaunch = true;
    }
    popReq = false;
  } else if (onGr) {
    // carving: the longer you hold a turn the more the edges bite, which turns tighter and scrubs less speed
    sk.carve = steer ? Math.min(1, sk.carve + dt / 0.55) : Math.max(0, sk.carve - dt * 2.5);
    const slash = K.boost && steer !== 0;   // Shift while turning: throw the skis round hard, scrub speed, spray
    const dyaw = -steer * (1.15 + 0.95 * sk.carve) * dt * PH.turn * (slash ? 1.5 : clamp(1.25 / (1 + Math.pow(sk.sp / 32, 2)), 0.55, 1)) * (1 - 0.18 * (sk.surf.deep || 0)); sk.yaw += dyaw;   // faster means wider arcs; deep snow turns slower
    // A Shift turn throws the skis round faster than the edges can hold: the skis point one way while you slide another, scrubbing speed.
    sk.slip = slash ? clamp(sk.slip * Math.exp(-0.7 * dt) + dyaw * 0.42, -0.5, 0.5) : sk.slip * Math.exp(-4.5 * dt);
    const sA = tangent(sk.yaw - sk.slip), sn = Math.sin(sA), s = readSurface(); sk.slope = sA;   // gravity and travel follow the way you are sliding, not the way the skis point
    // linear scrub from turning plus air drag that grows with speed, so there is no hard cap
    const DRG = PH.drag * (sk.wax > 0 ? 0.78 : 1);   // a fresh hot wax runs faster
    const lin = ((0.1 + 0.07 * (1 - clamp(sk.sp / 12, 0, 1))) * s.powder + 0.05 + Math.abs(steer) * (0.34 - 0.24 * sk.carve) * (0.85 + sk.sp / 90) * PH.scrub * (1 + 0.5 * (s.deep || 0)) + s.road * 0.25 + (slash ? 0.6 : 0) + 0.55 * Math.abs(Math.sin(sk.slip))) * (0.5 + 0.5 * DRG), quad = (K.brake || K.up ? 0.0052 : 0.0072) * DRG, push = K.up && !slash ? 7 : 0, brk = K.down ? 16 : 0;
    // Rock under the skis: you can scrape over it, but it grabs, chatters and can throw you off balance.
    const rk = s.rock; if (rk > 0.05 && sk.sp > 1) { if (Math.random() < 0.6) spray(p, 0.4 + Math.random(), (Math.random() - 0.5) * 2, v, 0.5); if (rk > 0.5 && sk.sp > 12 && sk.stumT <= 0 && Math.random() < 0.6 * dt) { sk.stumT = 0.9; sk.stumD = Math.random() < 0.5 ? -1 : 1; } }   /* rock scrapes and rattles you, but it does not slow you down */
    const acc = -G * sn - (lin + 1.5 * rk) * sk.sp - quad * sk.sp * sk.sp + push - brk - rk * (1.5 + 3 * Math.random());
    sk.sp = sk.sp < 0.25 && acc < 0.6 && !push ? 0 : clamp(sk.sp + acc * dt, 0, MAXV);   // unlike the course runs, here you can stop: across the hill, on the flat, or with J
    if (sk.sp > 1 && creekWet(p.x, p.z)) { sk.sp *= Math.exp(-2.6 * dt); if (Math.random() < 0.8) for (let i = 0; i < 3; i++) spray(p, 1 + Math.random() * 3, (Math.random() - 0.5) * 4, v, 0.6); }   // open water drags hard
    sk.brakeK = lerp(sk.brakeK, (brk || slash) && sk.sp > 1 ? 1 : 0, Math.min(1, 8 * dt));
    if (brk && sk.sp > 4 && Math.random() < 0.7) for (let i = 0; i < 3; i++) spray(p, 1 + Math.random() * 3, (Math.random() - 0.5) * 5, v, 0.6);
    if (!slash && Math.abs(sk.slip) > 0.1 && sk.sp > 3) for (let i = 0; i < 2; i++) spray(p, 1 + Math.random() * 2, Math.sign(sk.slip) * (2.5 + sk.sp * 0.25) * (0.4 + Math.random() * 0.8), v, 0.55, 0.5);
    if (slash && sk.sp > 3) for (let i = 0; i < 4; i++) spray(p, 1.2 + Math.random() * (2 + sk.sp * 0.08), -steer * (3 + sk.sp * 0.3) * (0.4 + Math.random() * 0.8), v, 0.55, 0.5 + 0.5 * s.powder);
    const popNow = popReq, pw = 0.35 + 0.65 * popPow;
    if (popNow) { sk.sp += 0.9 * pw * Math.max(0, 1 - sk.sp / 45); for (let i = 0; i < 4; i++) spray(p, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, v); sfx("pop"); }
    v.copy(fw).multiplyScalar(sk.sp);
    const nx = p.x + v.x * dt, nz = p.z + v.z * dt, yp = p.y + v.y * dt, hn = H(nx, nz);
    if (hn - p.y > 0.9 && sk.sp > 0.5) { // a cliff face dead ahead: you do not ski up it
      if (sk.sp > 9) crash("Hit a cliff"); else { sk.sp = 0; toast("Cliff", 1); } popReq = false; return;
    }
    // The top of a cliff is a takeoff: where the snow ends and the rock falls away you leave the ground on the line you were skiing, and never ride the rock.
    let cliffGo = false; const fl = Math.hypot(fw.x, fw.z) || 1, ax = fw.x / fl, az = fw.z / fl;
    if (sk.sp > 4 && cliffK(nx, nz) > 0.3) cliffGo = hn - H(nx + ax * 2.5, nz + az * 2.5) > 2.6;   // only a real drop: rock you can ski over, you ski over
    if (cliffGo) { const a = clamp(Math.atan2(p.y - H(p.x - ax * 3, p.z - az * 3), 3), -0.6, 0.0), sp = Math.max(sk.sp, 2.5); v.set(ax * sp * Math.cos(a), sp * Math.sin(a), az * sp * Math.cos(a)); }
    if (popNow || cliffGo || yp > hn + 0.12) { // the snow dropped away, a cliff lip, or a pop: airborne
      const lip = kickerLip(p.x, p.z); sk.featLaunch = !!lip;
      sk.ground = false; sk.air = true; if (popNow) { v.y += (lip ? 6.5 : 5.2) * pw + 3.0; sk.popT = 0.2; } if (lip && !lip.lip) { const L2 = lip.Lr + lip.T + lip.Ld, hill = Math.atan2(H(lip.x + lip.dx * (L2 + 3), lip.z + lip.dz * (L2 + 3)) - H(lip.x - lip.dx * 3, lip.z - lip.dz * 3), L2 + 6); v.y = Math.max(v.y, sk.sp * Math.sin(hill + Math.atan(1.7 * lip.hK / lip.Lr))) + (popNow ? 0 : lip.side ? 1.4 : 3.0); }   // leave along the lip's own angle, with the lift Kicker Run's kickers give
      p.set(nx, popNow || cliffGo ? Math.max(cliffGo ? p.y + v.y * dt : yp, hn) + 0.02 : yp, nz); sk.rot = sA; sk.vside = 0; sk.peakY = p.y;
      sk.airT = 0; sk.flipAcc = 0; sk.flipB = 0; sk.flipF = 0; sk.spin = 0; sk.spinV = 0; sk.grabT = 0; sk.rotV = 0; sk.spinTarget = 0;
    } else {
      p.set(nx, hn, nz);
      if (!butterNow && !sk.butSpun) { sk.spin += (sk.spinTarget - sk.spin) * Math.min(1, 9 * dt); if (Math.abs(sk.spin - sk.spinTarget) < 0.02) { sk.spin = 0; sk.spinTarget = 0; } }
      const t = sk.sp > 1 ? treeHit(p.x, p.z, 0.22) : null; if (t) stumble(t);
      { const rl = sk.sp > 4 ? railAt(p.x, p.y + 0.5, p.z) : null; if (rl && (p.x - rl.x) * rl.dx + (p.z - rl.z) * rl.dz < 2.5) { sk.grind = rl; sk.gs = Math.max(0, (p.x - rl.x) * rl.dx + (p.z - rl.z) * rl.dz); sk.grindT = 0; sk.spin = 0; sk.featLaunch = true; sfx("thump", 0.3); } }
      if (sk.sp > 1) {
        for (const th of towerHits) { const dx = p.x - th.x, dz = p.z - th.z; if (dx * dx + dz * dz < (th.r + 0.25) * (th.r + 0.25)) { if (sk.sp > 6) crash("Hit a lift tower"); else { tmp.set(dx, 0, dz).normalize(); p.addScaledVector(tmp, 0.25); sk.sp *= 0.3; } break; } }
        const bd = buildingAt(p.x, p.z); if (bd && p.y < bd.top) { if (sk.sp > 6) crash("Hit a building"); else { tmp.set(p.x - bd.cx, 0, p.z - bd.cz).normalize(); p.addScaledVector(tmp, 0.4); sk.sp *= 0.2; } }
      }
    }
    popReq = false;
  } else {
    sk.airT += dt;
    const flipIn = (K.down ? 1 : 0) - (K.up ? 1 : 0), spinIn = (K.spinR ? 1 : 0) - (K.spinL ? 1 : 0), before = sk.rot;   // +1 = back flip (nose up), -1 = front flip
    sk.flipHold = flipIn && Math.sign(flipIn) === sk.flipDir ? sk.flipHold + dt : 0; sk.flipDir = Math.sign(flipIn);
    if (flipIn && sk.rotV * flipIn < 0) { sk.rotV *= Math.exp(-12 * dt); sk.flipHold = 0.5; }   // reversing a flip: kill the old rotation quickly so back + front can link
    if (flipIn) sk.rotV += clamp(flipIn * (2.2 + 4.4 * Math.min(1, sk.flipHold / 1.1)) - sk.rotV, -8 * dt, 8 * dt);   // starts slow, builds momentum the longer you hold
    else sk.rotV *= Math.exp(-2.4 * dt);
    sk.rot += sk.rotV * dt;
    if (!flipIn && v.y > -3 && Math.abs(sk.rotV) < 1.4) { const vh = Math.hypot(v.x, v.z), want = sk.rot + wrap(Math.atan2(v.y, vh) - sk.rot); sk.rot += (want - sk.rot) * Math.min(1, 5.5 * dt); }   // gentle auto-level on the way down
    { const dr = sk.rot - before; sk.flipAcc += dr; if (dr > 0) sk.flipB += dr; else sk.flipF -= dr; }
    sk.spinHold = spinIn && Math.sign(spinIn) === sk.spinDir ? sk.spinHold + dt : 0; sk.spinDir = Math.sign(spinIn);
    if (spinIn) sk.spinV += clamp(spinIn * PH.spin * (3.0 + 6.5 * Math.min(1, sk.spinHold / 1.0)) - sk.spinV, -14 * dt * PH.spin, 14 * dt * PH.spin);
    else { sk.spinV *= Math.exp(-2.6 * dt); const tgt = Math.round(sk.spin / Math.PI) * Math.PI; sk.spin += (tgt - sk.spin) * Math.min(1, 4 * dt); }
    sk.spin += sk.spinV * dt;
    if (K.grab || K.grabN || K.grabI || K.grabQ || K.grabS) { sk.grabT += dt; sk.grabKind = K.grabS ? "Safety" : K.grab ? "Tail" : K.grabN ? "Nose" : K.grabI ? "Indy" : "Japan"; }
    if (steer) { const want = clamp(sk.vside + steer * 7 * dt, -9, 9); v.addScaledVector(rt, want - sk.vside); sk.vside = want; }   // arrows slide you side to side in the air
    v.y -= G * dt; p.addScaledVector(v, dt); if (p.y > sk.peakY) sk.peakY = p.y;
    sk.sp = Math.hypot(v.x, v.z); sk.carve = Math.max(0, sk.carve - dt * 2.5); sk.brakeK = 0; popReq = false;
    if (sk.noRail > 0) sk.noRail -= dt;
    const rl = !(sk.noRail > 0) && v.y <= 2.4 ? railAt(p.x, p.y, p.z) : null;
    if (rl) { sk.grind = rl; sk.gs = clamp((p.x - rl.x) * rl.dx + (p.z - rl.z) * rl.dz, 0, rl.len - 0.1); sk.grindT = 0; sk.sp = Math.max(6, Math.hypot(v.x, v.z)); sk.ground = true; sk.air = false; sk.rot = 0; sk.rotV = 0; sk.spin -= Math.round(sk.spin / Math.PI) * Math.PI; sk.landT = 0.2; sfx("thump", 0.3); }
    else if (p.y <= H(p.x, p.z)) { if (onRock(p.x, p.z) && sk.airT > 0.4 && v.dot(normalAt(p.x, p.z, 1.2, nrm)) < -14) { p.y = H(p.x, p.z); crash("Hit the rocks"); } else landing(); }   // you can land on rock, but not hard
    else if (sk.airT > 0.1 && treeHit(p.x, p.z, 0.2) && p.y - H(p.x, p.z) < 6) crash("Hit a tree");
  }
  sk.vx = v.x; sk.vs = v.z;
  if (sk.ground && !sk.crashed) {
    const dy = sk.lastY !== undefined ? sk.lastY - p.y : 0; if (dy > 0 && dy < 5) sk.vert += dy; sk.lastY = p.y; if (sk.sp > sk.maxSp) sk.maxSp = sk.sp;
    sk.safeT += dt; if (sk.safeT > 1.5 && inWorld(p.x, p.z, 160) && sk.surf.rock < 0.3 && nrm.y > 0.8) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
  } else sk.lastY = p.y;
  if (!inWorld(p.x, p.z, 70)) { toast("Ski area boundary"); placeSkier(sk.safe.x, sk.safe.z, sk.safeYaw + Math.PI); }
}

/* ---------- rewind: hold R and the last half minute runs backwards; let go and ski on from there ---------- */
const REW = [], REW_KEYS = ["yaw", "sp", "ground", "air", "airT", "turn", "carve", "sw", "spin", "spinV", "rot", "rotV", "flipAcc", "flipB", "flipF", "grabT", "crashed", "crashT", "tumZ", "stumT", "pts", "vert", "slope", "gs", "grindT", "vside", "peakY"]; let rewT = 0, rewinding = false, rewKey = false;
function recordRewind(dt) {
  rewT += dt; if (rewT < 1 / 30) return; rewT = 0; const o = { p: sk.p.clone(), v: sk.v.clone(), grind: sk.grind }; for (const k of REW_KEYS) o[k] = sk[k]; REW.push(o); if (REW.length > 900) REW.shift();
}
function stepRewind(dt) {
  rewT += dt * 2; let o = null; while (rewT >= 1 / 30 && REW.length > 1) { rewT -= 1 / 30; o = REW.pop(); } if (!o) return REW.length > 1;
  sk.p.copy(o.p); sk.v.copy(o.v); sk.grind = o.grind; for (const k of REW_KEYS) sk[k] = o[k]; sk.parked = false; sk.lastY = sk.p.y; charging = false; popReq = false; trkPrev = null; return REW.length > 1;
}
/* ---------- on foot: skis off and carried, to boot-pack up to the ridges and summits no lift reaches ---------- */
function toggleWalk() {
  if (sk.mode === "walk") { sk.mode = "ski"; sk.parked = true; sk.sp = 0; sk.v.set(0, 0, 0); toast("Skis on"); }
  else if (sk.mode === "ski" && sk.ground && !sk.crashed && sk.sp < 5) { sk.mode = "walk"; sk.sp = 0; sk.v.set(0, 0, 0); sk.sw = false; sk.spin = 0; sk.turn = sk.carve = 0; sk.walkPh = 0; sk.wv = 0; charging = false; popReq = false; toast("Skis off · W walks, A D turn, Shift runs · B to click back in", 4); }
  else if (sk.mode === "ski") toast("Stop first to take your skis off");
  const b = $("walkBtn"); if (b) b.textContent = sk.mode === "walk" ? "Ski" : "Walk";
}
const WALK = { walk: 3.1, run: 7.0, back: 1.8 };   // m/s: a brisk walk, a proper run (Shift), backing up
function stepWalk(dt) {
  if (sk.tackT > 0) { sk.sp = 0; sk.wv = 0; return; }   // flat on the cobbles under a policeman
  if (RANGE && RANGE.on) { const st = ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0); sk.yaw = RANGE.yaw + clamp(wrap(sk.yaw - st * 0.9 * dt - RANGE.yaw), -0.5, 0.5); sk.sp = 0; sk.wv = 0; return; }   // at the snowball range you only turn to aim
  if (sk.dance) { sk.sp = 0; sk.wv = 0; sk.walkPh = 0; return; }   // dancing on the spot
  if (PUB.seat) { const q = PUB.seat; sk.p.x = q.x; sk.p.z = q.z; sk.p.y = H(q.x, q.z); sk.yaw = Math.atan2(q.tx - q.x, q.tz - q.z); sk.sp = 0; sk.wv = 0; sk.turn = 0; return; }   // sat at a table in the pub
  const p = sk.p, steer = ((K.spinR || K.right) ? 1 : 0) - ((K.spinL || K.left) ? 1 : 0), go = (K.up ? 1 : 0) - (K.down ? 1 : 0), running = go > 0 && K.boost; sk.yaw -= steer * (running ? 2.4 : 3.0) * dt;
  const sA = tangent(sk.yaw); sk.slope = sA; readSurface();
  let want = go > 0 ? (running ? WALK.run : WALK.walk) : go < 0 ? -WALK.back : 0; want *= clamp(1 - Math.sin(sA) * go * 0.9, 0.45, 1.2) * (1 - 0.25 * sk.surf.powder);   // slower up the steeps and in deep snow
  let v = sk.wv || 0; v += clamp(want - v, -20 * dt, (Math.abs(want) > Math.abs(v) ? 12 : 20) * dt);   // you get up to speed over a few steps and pull up short
  const dx = Math.sin(sk.yaw) * v * dt, dz = Math.cos(sk.yaw) * v * dt, free = (x, z) => !buildingAt(x, z) && !treeHit(x, z, 0.15) && inWorld(x, z, 75) && !(sk.shopIn && sk.shopIn.obst.some(o => Math.hypot(o[0] - x, o[1] - z) < o[2] + 0.25)) && !PLAZA_OBST.some(o => Math.hypot(o[0] - x, o[1] - z) < o[2] + 0.25);
  if (free(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; } else if (free(p.x + dx, p.z)) { p.x += dx; v *= 1 - 3 * dt; } else if (free(p.x, p.z + dz)) { p.z += dz; v *= 1 - 3 * dt; } else v = 0;   // into a wall at an angle you slide along it
  sk.wv = v; p.y = H(p.x, p.z); sk.sp = Math.abs(v); sk.walkPh = (sk.walkPh || 0) + v * dt * lerp(4.3, 2.0, smooth((Math.abs(v) - 3.4) / 2.6)); sk.turn = lerp(sk.turn, 0, Math.min(1, 8 * dt));   // a run takes longer strides, not just quicker ones
  const dy = sk.lastY !== undefined ? p.y - sk.lastY : 0; sk.lastY = p.y; sk.climb = (sk.climb || 0) + Math.max(0, dy);
  sk.safeT += dt; if (sk.safeT > 1.5) { sk.safeT = 0; sk.safe.copy(p); sk.safeYaw = sk.yaw; }
}
/* ---------- riding lifts ---------- */
let nearLift = null; const _cp = new THREE.Vector3(), _cq = { s: 0, side: 1, docked: 0 };
function findNearLift() {
  nearLift = null; if (sk.mode !== "ski" || sk.crashed || !sk.ground || sk.sp > 7) return;
  let best = 20; for (const L of LIFTS) { const d = Math.hypot(sk.p.x - L.bot.x, sk.p.z - L.bot.z); if (d < best) { best = d; nearLift = L; } }
}
function nextCarrier(L) { // the carrier that reaches the load point soonest, and how long that takes
  if (L.type === "tram") { for (let k = 0; k < 2; k++) if (carrierAt(L, k, liftTime, _cq).docked === -1) return [k, 0]; const run = L.len / L.v + 8, cyc = 2 * (run + TRAM_DWELL), ph = liftTime % cyc; return [ph < run + TRAM_DWELL ? 1 : 0, ph < run + TRAM_DWELL ? run + TRAM_DWELL - ph : cyc - ph]; }
  let bk = 0, bt = 1e9; const loop = 2 * L.len;
  for (let k = 0; k < L.count; k++) { const u = (((k * L.spacing + (liftTime + L.phase) * L.v) % loop) + loop) % loop, t = ((loop + L.loadS - u) % loop) / L.v; if (t < bt) { bt = t; bk = k; } }
  return [bk, bt];
}
function boardLift(L) {
  if (sk.wax > 0) { sk.wax--; store.set("pal-wax", sk.wax); toast(sk.wax ? "Wax: good for " + sk.wax + " more lift " + (sk.wax === 1 ? "ride" : "rides") : "That wax is worn off. The Wax Room in the village does another.", 3); }
  sk.mode = "wait"; sk.lift = L; sk.v.set(0, 0, 0); sk.sp = 0; sk.sw = false; sk.carve = 0; sk.turn = 0; sk.brakeK = 0; sk.spin = 0; charging = false; popReq = false;
  if (L.carpet) { sk.mode = "lift"; sk.car = -1; sk.liftS = 0.5; return; }
  sk.car = nextCarrier(L)[0];
}
function stepLift(dt) {
  const L = sk.lift, lp = liftPoint(L, L.loadS, 1, _cp), p = sk.p;
  if (sk.mode === "wait") {
    const tx = lp.x, tz = lp.z, d = Math.hypot(tx - p.x, tz - p.z); if (d > 0.05) { const st = Math.min(d, 3.2 * dt); p.x += (tx - p.x) / d * st; p.z += (tz - p.z) / d * st; } p.y = H(p.x, p.z);
    sk.yaw += wrap(L.dir - sk.yaw) * Math.min(1, 5 * dt);
    const c = carrierAt(L, sk.car, liftTime, _cq), eta = nextCarrier(L)[1];
    if (L.type === "tram") { sk.wait = eta; if (c.docked === -1 && d < 1.5) { sk.mode = "lift"; } }
    else { sk.wait = eta; if (c.side === 1 && Math.abs(c.s - L.loadS) < Math.max(0.6, L.v * dt * 1.5) && d < 1.5) sk.mode = "lift"; else if (c.side === 1 && c.s > L.loadS + 1.5 && c.s < L.len * 0.5) sk.car = nextCarrier(L)[0]; }
    return;
  }
  let s, done = false;
  if (L.carpet) { sk.liftS += L.v * dt; s = sk.liftS; liftPoint(L, s, 0, p); p.y += 0.02; done = s >= L.len - 0.5; }
  else { const c = carrierAt(L, sk.car, liftTime, _cq); s = c.s; liftPoint(L, s, 1, p); p.y -= L.T.drop + (L.type.startsWith("chair") ? 0.5 : -0.12); done = L.type === "tram" ? c.docked === 1 : (c.side === -1 || s >= L.len - L.loadS); }
  sk.liftS = s; sk.yaw = L.dir; sk.sp = L.v; sk.v.set(0, 0, 0);
  if (done) { unloadAt(L); toast("Top of " + L.name + " · " + fmtAlt(sk.p.y)); }
}
const fmtAlt = y => units === "imp" ? Math.round(y * FT).toLocaleString() + " ft" : Math.round(y).toLocaleString() + " m";
const fmtTime = t => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

/* ---------- snow spray, tracks, falling snow ---------- */
const NP = 3600, pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP), pSize = new Float32Array(NP); let pNext = 0, sprayPts = null;
function initParticles() {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); g.setAttribute("aLife", new THREE.BufferAttribute(pLife, 1)); g.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: Object.assign({ uPx: { value: 600 } }, U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)), fog: true,
    vertexShader: `attribute float aLife, aSize; uniform float uPx; varying float vL; varying vec3 vWp;
      #include <fog_pars_vertex>
      void main() { vL = aLife; vWp = position; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition; gl_PointSize = aLife > 0.0 ? aSize * (1.6 - aLife * 0.6) * uPx / max(0.3, -mvPosition.z) : 0.0;
      #include <fog_vertex>
      }`,
    fragmentShader: GLSL_WORLD + `varying float vL; varying vec3 vWp;
      #include <fog_pars_fragment>
      void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25 || vL <= 0.0) discard;
        float vis = texture2D(uTT, ttUV(vWp)).a; vec3 col = vec3(0.92, 0.94, 0.97) * (uSunCol * 0.3183 * (0.55 * vis + 0.1) + uSkyAmb * 0.9);
        gl_FragColor = vec4(col, smoothstep(0.25, 0.02, d) * min(1.0, vL * 2.2) * 0.5);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }` });
  sprayPts = new THREE.Points(g, m); sprayPts.frustumCulled = false; sprayPts.renderOrder = 5; scene.add(sprayPts);
}
function spray(at, up, side, vel, back = 0.5, big = 0) {
  const i = pNext; pNext = (pNext + 1) % NP;
  pPos[i * 3] = at.x + (Math.random() - 0.5) * 0.3; pPos[i * 3 + 1] = at.y + 0.05; pPos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 0.3;
  pVel[i * 3] = vel.x * back + rt.x * side + (Math.random() - 0.5) * 1.2; pVel[i * 3 + 1] = up + vel.y * back; pVel[i * 3 + 2] = vel.z * back + rt.z * side + (Math.random() - 0.5) * 1.2;
  pLife[i] = (0.5 + Math.random() * 0.6) * (1 + 0.9 * big); pSize[i] = (0.16 + Math.random() * 0.3) * (1 + 2.2 * big);
}
function updateParticles(dt) {
  for (let i = 0; i < NP; i++) { if (pLife[i] <= 0) continue; pLife[i] -= dt; const k = i * 3; pVel[k + 1] -= 7.5 * dt; const dr = Math.exp(-2.2 * dt); pVel[k] *= dr; pVel[k + 2] *= dr; pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt; }
  const a = sprayPts.geometry.attributes; a.position.needsUpdate = true; a.aLife.needsUpdate = true; a.aSize.needsUpdate = true; sprayPts.material.uniforms.uPx.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * DEG / 2);
}
function emitSpray(dt) {
  if (sk.mode !== "ski" || !sk.ground || sk.crashed || sk.sp < 4) return;
  const s0 = sk.surf, pd = Math.max(s0.powder, s0.deep || 0), s = { powder: pd }, pw = 0.5 + 0.7 * pd, steer = sk.turn, n = (sk.sp > 18 ? 3 : 2) * pw * dt * 60 * 0.5, cnt = Math.floor(n + Math.random());
  for (let i = 0; i < Math.min(cnt, 12); i++) spray(sk.p, 0.5 + Math.random() * (0.8 + 1.2 * s.powder), (Math.random() - 0.5) * (1.5 + 2 * s.powder), sk.v, 0.3 + 0.2 * s.powder, 0.25 * s.powder);
  if (Math.abs(steer) > 0.3 && sk.sp > 6 && sk.carve > 0.2) { const k = Math.floor((2 + sk.sp / 10) * (1 + 3.5 * s.powder) * dt * 60 * 0.5 + Math.random()); for (let i = 0; i < k; i++) spray(sk.p, (1.5 + sk.sp * 0.05 + Math.random() * 2) * (1 + 0.8 * s.powder), -Math.sign(steer) * (3 + sk.carve * 4 + sk.sp * 0.12) * (0.5 + Math.random() * 0.6), sk.v, 0.3 + 0.2 * s.powder, s.powder); }   // a real cloud off every powder turn
  if (pd > 0.7 && Math.abs(steer) > 0.35 && sk.sp > 9) { const k = Math.floor((1.5 + sk.sp / 14) * dt * 60 * 0.5 + Math.random()); for (let i = 0; i < k; i++) spray(sk.p, 3.2 + Math.random() * 2.4, -Math.sign(steer) * (1 + Math.random() * 2.5), sk.v, 0.12, 1); }   // face shots: deep snow thrown head high on every turn
  if (K.brake && sk.sp > 3 && Math.random() < 0.4) spray(sk.p, 2, 0, sk.v, 0.4);
}
/* Ski tracks are trenches in the new snow, not marks on it: a groove for each ski, cut to the depth you were riding at, with a ridge between them.
   They are real geometry below the snow surface, drawn with the snow's own shader. They stay until the snow is topped up, every five minutes. */
const TRK = 16000, TV = 14, TRACK_LIFE = 300, trkPos = new Float32Array(TRK * TV * 3), trkNor = new Float32Array(TRK * TV * 3), _tn = new THREE.Vector3(); let trkN = 0, trkMesh = null, trkClock = 0, trkLast = new THREE.Vector3(1e9, 0, 0), trkPrev = null;
function initTracks() {
  const idx = new Uint32Array(TRK * 36); for (let q = 0; q < TRK; q++) for (let c = 0; c < 6; c++) { const a = q * TV + c, b = a + 7; idx.set([a, a + 1, b, a + 1, b + 1, b], q * 36 + c * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(trkPos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(trkNor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
  const m = terrainMaterial({ TRENCH: "" }); m.depthWrite = false;
  trkMesh = new THREE.Mesh(g, m); trkMesh.frustumCulled = false; trkMesh.receiveShadow = true; trkMesh.renderOrder = -1; scene.add(trkMesh);   // after the terrain, before everything standing on it
}
function clearTracks(say) { trkN = 0; trkClock = 0; trkPrev = null; trkMesh.geometry.setDrawRange(0, 0); if (say) toast("Fresh snow has filled in your tracks"); }
function layTracks(dt) {
  trkClock += dt; if (trkClock > TRACK_LIFE) clearTracks(trkN > 40);
  const walking = sk.mode === "walk", sled = sk.mode === "sled";
  if (!(sk.mode === "ski" || walking || sled) || !sk.ground || sk.crashed || sk.shopIn) { trkPrev = null; return; }
  const yawM = sled ? sk.yaw : sk.yaw - sk.spin, back = sled ? 0.9 : 0.3, x = sk.p.x - Math.sin(yawM) * back, z = sk.p.z - Math.cos(yawM) * back; if (Math.hypot(x - trkLast.x, z - trkLast.z) < 0.45) return;
  const s = sk.surf, pv = trkPrev, open = (1 - s.rock) * (1 - s.road), d = ((walking ? 0.04 : 0.016) + (sk.sink || 0) + 0.03 * sk.brakeK) * open; trkLast.set(x, 0, z);
  if (!sled && d < 0.008) { trkPrev = null; return; }
  let dx = pv ? x - pv.x : Math.sin(yawM), dz = pv ? z - pv.z : Math.cos(yawM); const l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l, cur = { x, z, R: [] }; trkPrev = cur;
  normalAt(x, z, 0.8, _tn); const sd = U.uSunDir.value, sxp = sd.x * px + sd.z * pz, tanE = sd.y / Math.max(0.05, Math.abs(sxp));   // which parts of a trench the sun reaches
  const strip = (O, Y, Tl, A, dd) => { const P = new Float32Array(21), N = new Float32Array(21), rimO = sxp > 0 ? O[6] : O[0];
    for (let j = 0; j < 7; j++) { const X = x + px * O[j], Z = z + pz * O[j]; P[j * 3] = X; P[j * 3 + 1] = H(X, Z) + Y[j]; P[j * 3 + 2] = Z;
      const t = Tl[j] * Math.min(1, dd / 0.05), nx = _tn.x + px * t, ny = _tn.y, nz = _tn.z + pz * t, il = A[j] * (-Y[j] <= Math.abs(rimO - O[j]) * tanE + 0.01 ? 1 : 0.45) / Math.hypot(nx, ny, nz); N[j * 3] = nx * il; N[j * 3 + 1] = ny * il; N[j * 3 + 2] = nz * il; }
    cur.R.push({ P, N }); };
  const groove = (c, w, dd) => { const wall = 0.03 + dd * 0.5, ao = 1 - Math.min(0.36, dd * 1.8); strip([c - w - wall, c - w, c - w / 3, c, c + w / 3, c + w, c + w + wall], [0.004, -dd, -dd, -dd, -dd, -dd, 0.004], [0.3, 0.8, 0, 0, 0, -0.8, -0.3], [1, ao, ao, ao, ao, ao, 1], dd); };   // one flat-bottomed trench
  if (sled) { // a snowmobile leaves three: a narrow groove under each ski and the wide, deeper band of the track between them
    const deep = s.deep || 0, ds = (0.025 + 0.07 * deep) * open, dt2 = (0.04 + 0.13 * deep) * open; if (dt2 < 0.01) { trkPrev = null; return; }
    groove(-0.53, 0.075, ds); groove(0.53, 0.075, ds); groove(0, 0.2, dt2);
  } else {
    const gap = walking ? 0.12 : 0.16, hw = walking ? 0.075 : 0.05 + 0.03 * sk.carve + 0.07 * sk.brakeK + 0.2 * Math.abs(Math.sin(sk.slip || 0)), wall = 0.03 + d * 0.55, ridge = -d * 0.55 * clamp(d / 0.12, 0, 1), ao = 1 - Math.min(0.36, d * 1.8);
    strip([-(gap + hw + wall), -(gap + hw), -(gap - hw), 0, gap - hw, gap + hw, gap + hw + wall], [0.004, -d, -d, ridge, -d, -d, 0.004], [0.3, 0.8, -0.45, 0, 0.45, -0.8, -0.3], [1, ao, ao, 1 - (1 - ao) * 0.5, ao, ao, 1], d);
  }
  if (!pv || l > 3 || pv.R.length !== cur.R.length) return;   // the first cross-section of a run only starts the trench
  const pa = trkMesh.geometry.attributes.position, na = trkMesh.geometry.attributes.normal;
  for (let r = 0; r < cur.R.length; r++) { const q = trkN % TRK, k = q * TV * 3; trkN++; trkPos.set(pv.R[r].P, k); trkPos.set(cur.R[r].P, k + 21); trkNor.set(pv.R[r].N, k); trkNor.set(cur.R[r].N, k + 21); pa.addUpdateRange(k, 42); na.addUpdateRange(k, 42); }
  pa.needsUpdate = true; na.needsUpdate = true; trkMesh.geometry.setDrawRange(0, Math.min(trkN, TRK) * 36);
}
function initSnowfall() {
  const n = 9000, pos = new Float32Array(n * 3), g = new THREE.BufferGeometry(); for (let i = 0; i < n * 3; i++) pos[i] = Math.random();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uCam: { value: new THREE.Vector3() }, uPx: { value: 600 }, uWind: { value: new THREE.Vector3(2.5, -2.2, 1.2) } },
    vertexShader: `uniform float uTime, uPx; uniform vec3 uCam, uWind; varying float vF;
      void main() { vec3 q = position * 60.0 + uWind * uTime + vec3(sin(uTime * 0.7 + position.y * 40.0), 0.0, cos(uTime * 0.6 + position.x * 40.0)) * 0.6;
        vec3 wp = uCam + mod(q - uCam, 60.0) - 30.0; vec4 mv = viewMatrix * vec4(wp, 1.0); gl_Position = projectionMatrix * mv; float d = max(0.4, -mv.z); vF = smoothstep(30.0, 18.0, d); gl_PointSize = (0.035 + 0.03 * position.z) * uPx / d; }`,
    fragmentShader: `varying float vF; void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(vec3(0.93), smoothstep(0.25, 0.05, d) * 0.85 * vF);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` });
  snowFall = new THREE.Points(g, m); snowFall.frustumCulled = false; snowFall.renderOrder = 6; snowFall.visible = wx.snow > 0; scene.add(snowFall);
}

/* ---------- camera ---------- */
let camSnap = true, camSlope = 0, camAir = 0, look = { yaw: 0, pit: 0, drag: false, idle: 0 }; const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1), _m4 = new THREE.Matrix4(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
function makeRider(of) { // Kicker Run's skier faces -z; the holder faces +z and stands on the slope
  const R = KR.build(of), hold = new THREE.Group(); R.root.rotation.y = Math.PI; R.root.position.y = 0.025; hold.add(R.root); R.hold = hold; scene.add(hold);
  { const grp = new THREE.Group(), frame = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.75, side: THREE.DoubleSide }), lens = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.14, metalness: 0.55, emissive: 0xff7a1a, emissiveIntensity: 0.28, side: THREE.DoubleSide }), stripe = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7, side: THREE.DoubleSide });
    /* ski goggles: one wide lens wrapped round the face with a notch for the nose, the frame showing round its edge, and a strap right round the helmet */
    const shield = (half, top, bot, rad, notch, mat) => { const nU = 28, nV = 5, pos = [], idx = []; for (let a = 0; a <= nU; a++) { const u = -1 + 2 * a / nU, ang = u * half, e = Math.sqrt(1 - Math.pow(Math.abs(u), 5)), yT = top * (0.5 + 0.5 * e), yB = -bot * (0.45 + 0.55 * e) + notch * Math.exp(-u * u / 0.03); for (let b = 0; b <= nV; b++) { const v = b / nV, r = rad * (1 - 0.06 * Math.pow(2 * v - 1, 2)); pos.push(Math.sin(ang) * r, yB + (yT - yB) * v, -Math.cos(ang) * r); } }
      for (let a = 0; a < nU; a++) for (let b = 0; b < nV; b++) { const p0 = a * (nV + 1) + b, p1 = p0 + nV + 1; idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); } const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals(); const m = new THREE.Mesh(ge, mat); m.position.set(0, -0.006, 0.012); grp.add(m); return m; };
    shield(1.02, 0.052, 0.054, 0.1455, 0.012, frame); shield(0.94, 0.042, 0.044, 0.1495, 0.017, lens);
    const band = (r, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true, Math.PI + 0.98, 2 * Math.PI - 1.96), mat); m.position.set(0, -0.004, 0.012); grp.add(m); }; band(0.1445, 0.04, frame); band(0.1462, 0.01, stripe);
    for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.03), frame); c.position.set(sd * 0.1225, -0.004, 0.012 - 0.078); c.rotation.y = -sd * 1.0; grp.add(c); }   // the clips where the strap meets the frame
    R.head.add(grp); R.gog = { grp, frame, lens, stripe }; }
  { const mk = par => { const q = new THREE.Group(); q.visible = false; par.add(q); return q; }, M = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r || 0.85 }), put = (q, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; q.add(m); return m; };
    /* accessories sold at Summit Accessories. The rider faces -z, so +z is the back. */
    const pack = mk(R.torso), orange = M(0xd9541e), dark = M(0x1c1f24), grey = M(0x8a9099); put(pack, new THREE.SphereGeometry(0.15, 16, 12), orange, 0, 0.36, 0.205).scale.set(1.12, 1.5, 0.72); put(pack, new THREE.SphereGeometry(0.1, 12, 10), dark, 0, 0.27, 0.3).scale.set(1.2, 1.1, 0.5); put(pack, new THREE.SphereGeometry(0.11, 12, 8), dark, 0, 0.55, 0.2).scale.set(1.25, 0.5, 0.75);
    for (const sd of [-1, 1]) { const st = put(pack, new THREE.TorusGeometry(0.17, 0.02, 6, 16, Math.PI * 1.15), dark, sd * 0.13, 0.4, 0.02); st.rotation.set(0, Math.PI / 2, 0); st.rotation.z = -0.3; st.scale.set(1, 1.05, 1); } put(pack, new THREE.BoxGeometry(0.26, 0.03, 0.02), grey, 0, 0.4, -0.175);
    const bandana = mk(R.head), red = M(0xb3202a); put(bandana, new THREE.SphereGeometry(0.119, 18, 10, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.3), red, 0, 0, 0).material.side = THREE.DoubleSide; { const t = put(bandana, new THREE.ConeGeometry(0.085, 0.13, 3), red, 0, -0.13, -0.075); t.rotation.set(Math.PI + 0.25, Math.PI, 0); t.scale.z = 0.35; } for (let k = 0; k < 5; k++) put(bandana, new THREE.SphereGeometry(0.008, 5, 4), M(0xf2f2f2), (k - 2) * 0.03, -0.045 - 0.012 * (k % 2), -0.113 + 0.004 * Math.abs(k - 2));
    const hip = mk(R.hipG), teal = M(0x138a8a); put(hip, new THREE.SphereGeometry(0.1, 14, 10), teal, 0, 0.1, 0.19).scale.set(1.5, 0.75, 0.6); put(hip, new THREE.BoxGeometry(0.2, 0.012, 0.02), dark, 0, 0.11, 0.252); { const b = put(hip, new THREE.TorusGeometry(0.235, 0.013, 6, 26), dark, 0, 0.1, 0.0); b.rotation.x = Math.PI / 2; b.scale.set(1.16, 0.8, 1); }
    const cam = mk(R.head); put(cam, new THREE.BoxGeometry(0.055, 0.042, 0.04), dark, 0, 0.19, -0.035); put(cam, new THREE.CylinderGeometry(0.014, 0.014, 0.014, 10), grey, 0, 0.192, -0.06).rotation.x = Math.PI / 2; put(cam, new THREE.BoxGeometry(0.03, 0.03, 0.03), dark, 0, 0.158, -0.03); put(cam, new THREE.SphereGeometry(0.005, 5, 4), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), 0.02, 0.205, -0.055);
    /* prizes for gold medals: a halo that glows over your head, and the medal itself on a ribbon */
    const halo = mk(R.head); put(halo, new THREE.TorusGeometry(0.105, 0.014, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffe27a }), 0, 0.27, 0.01).rotation.x = Math.PI / 2; put(halo, new THREE.TorusGeometry(0.105, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.27, 0.01).rotation.x = Math.PI / 2;
    const medal = mk(R.torso), gm = new THREE.MeshStandardMaterial({ color: 0xe2b233, roughness: 0.3, metalness: 0.6, emissive: 0x4a3400 }); for (const sd of [-1, 1]) put(medal, new THREE.BoxGeometry(0.036, 0.27, 0.012), M(0x1f4fbf), sd * 0.052, 0.5, -0.275).rotation.z = sd * 0.38; put(medal, new THREE.CylinderGeometry(0.058, 0.058, 0.016, 20), gm, 0, 0.365, -0.29).rotation.x = Math.PI / 2;
    Object.assign(R.acc, { pack, bandana, hippack: hip, cam, halo, medal });
    /* exotic headwear. The head is a 0.113 m ball at the origin, looking down -z. */
    const hat = k => { const q = mk(R.head); R.hats[k] = q; return q; }, S2 = (r, a, b, c, d2) => new THREE.SphereGeometry(r, 22, 14, a === undefined ? 0 : a, b === undefined ? TAU : b, c === undefined ? 0 : c, d2 === undefined ? Math.PI : d2), MM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, side: THREE.DoubleSide }, o)), gold = MM(0xe2b233, { metalness: 0.55, roughness: 0.25, emissive: 0x3a2800 });
    { const q = hat("chrome"), m = MM(0xdfe6ee, { metalness: 0.6, roughness: 0.16, emissive: 0x30363e }); put(q, S2(0.142, 0, TAU, 0, Math.PI * 0.62), m, 0, 0.012, 0.012); put(q, new THREE.TorusGeometry(0.143, 0.009, 6, 24, Math.PI), m, 0, 0.012, 0.012).rotation.y = Math.PI / 2; }
    { const q = hat("visor"), ge = new THREE.TorusGeometry(0.146, 0.015, 6, 24, 2.4); ge.rotateX(Math.PI / 2); ge.rotateY(1.2 + Math.PI / 2); put(q, S2(0.142, 0, TAU, 0, Math.PI * 0.62), MM(0x0e1014, { roughness: 0.3 }), 0, 0.012, 0.012); put(q, ge, new THREE.MeshBasicMaterial({ color: 0x39e6ff }), 0, 0.052, 0.012); put(q, new THREE.BoxGeometry(0.012, 0.04, 0.2), new THREE.MeshBasicMaterial({ color: 0xff2fd0 }), 0, 0.15, 0.02); }
    { const q = hat("astro"); put(q, S2(0.176, 0, TAU, 0, Math.PI * 0.8), MM(0xf2f4f7, { roughness: 0.35 }), 0, 0.02, 0.01); put(q, S2(0.179, Math.PI * 1.5 - 0.85, 1.7, 0.85, 1.05), gold, 0, 0.02, 0.01); put(q, new THREE.TorusGeometry(0.125, 0.03, 8, 22), MM(0x9aa2ab), 0, -0.105, 0.01).rotation.x = Math.PI / 2; }
    { const q = hat("kabuto"), red = MM(0x5a0f12, { roughness: 0.3 }); put(q, S2(0.146, 0, TAU, 0, Math.PI * 0.55), red, 0, 0.012, 0.012); put(q, new THREE.CylinderGeometry(0.15, 0.215, 0.1, 18, 1, true, -2.1, 4.2), red, 0, -0.035, 0.012); put(q, new THREE.BoxGeometry(0.07, 0.05, 0.012), gold, 0, 0.09, -0.136); for (const sd of [-1, 1]) put(q, new THREE.BoxGeometry(0.022, 0.2, 0.012), gold, sd * 0.07, 0.2, -0.12).rotation.z = -sd * 0.5; }
    { const q = hat("crown"); put(q, new THREE.CylinderGeometry(0.124, 0.12, 0.075, 20, 1, true), gold, 0, 0.105, 0.005); put(q, S2(0.116, 0, TAU, 0, Math.PI / 2), MM(0xa8141c), 0, 0.1, 0.005).scale.y = 0.65; put(q, new THREE.TorusGeometry(0.123, 0.017, 6, 22), MM(0xf6f6f2, { roughness: 0.95 }), 0, 0.07, 0.005).rotation.x = Math.PI / 2; for (let k = 0; k < 8; k++) { const a = k * TAU / 8; put(q, new THREE.ConeGeometry(0.024, 0.07, 6), gold, Math.sin(a) * 0.121, 0.175, 0.005 + Math.cos(a) * 0.121); put(q, new THREE.SphereGeometry(0.013, 8, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x2a6aff : 0xff2a3a }), Math.sin(a + 0.39) * 0.127, 0.108, 0.005 + Math.cos(a + 0.39) * 0.127); } }
    { const q = hat("wizhat"), pur = MM(0x2a1766), c = put(q, new THREE.ConeGeometry(0.128, 0.4, 18), pur, 0.02, 0.3, 0.02); c.rotation.z = -0.14; c.rotation.x = 0.1; put(q, new THREE.CylinderGeometry(0.25, 0.25, 0.014, 26), pur, 0, 0.108, 0.01); put(q, new THREE.TorusGeometry(0.128, 0.012, 6, 22), gold, 0, 0.122, 0.01).rotation.x = Math.PI / 2; for (let k = 0; k < 7; k++) put(q, new THREE.SphereGeometry(0.012, 6, 5), new THREE.MeshBasicMaterial({ color: 0xf2d24a }), Math.sin(k * 2.4) * (0.1 - k * 0.011), 0.17 + k * 0.035, 0.02 + Math.cos(k * 2.4) * (0.1 - k * 0.011)); }
    { const q = hat("trapper"), fur = MM(0x6b4a2f, { roughness: 0.98 }), lin = MM(0xcdbb9c, { roughness: 0.98 }); put(q, S2(0.148, 0, TAU, 0, Math.PI * 0.55), fur, 0, 0.012, 0.012).scale.set(1.05, 0.95, 1.05); for (const sd of [-1, 1]) { put(q, new THREE.BoxGeometry(0.035, 0.17, 0.11), fur, sd * 0.148, -0.04, 0.012); put(q, new THREE.BoxGeometry(0.02, 0.15, 0.09), lin, sd * 0.132, -0.04, 0.012); } put(q, new THREE.BoxGeometry(0.21, 0.065, 0.035), lin, 0, 0.085, -0.135); put(q, new THREE.BoxGeometry(0.25, 0.1, 0.035), fur, 0, -0.01, 0.16); }
    { const q = hat("laurel"); put(q, new THREE.TorusGeometry(0.128, 0.008, 6, 26, 5.0), gold, 0, 0.075, 0.005).rotation.set(Math.PI / 2, 0, 0); for (let k = 0; k < 18; k++) { const a = 0.75 + k * 0.265 + Math.PI, lf = put(q, new THREE.SphereGeometry(0.03, 8, 6), gold, Math.sin(a) * 0.132, 0.085 + 0.012 * (k % 2), 0.005 + Math.cos(a) * 0.132); lf.scale.set(0.5, 0.42, 1.25); lf.rotation.set(0.5 * (k % 2 ? 1 : -1), a, 0); } }   /* a victor's wreath: gold leaves round the back and sides, open over the brow */
    dressRig(R, of || {}); }
  const carry = new THREE.Group(); R.skiMeshes.forEach((m, i) => { const c = new THREE.Mesh(m.geometry, m.material); c.position.set(i ? 0.035 : -0.035, 0, 0); if (i) c.rotation.z = Math.PI; c.castShadow = true; carry.add(c); }); carry.position.set(0.25, 1.36, 0.1); carry.rotation.set(1.18, 0, 0.06); carry.visible = false; R.rig.add(carry); R.carry = carry; return R;
}
/* On foot the skis and bindings come off but the boots stay on: everything in the ski groups that is not a boot is put away. */
function footGear(R, on) { if (!R.footBits) { R.footBits = []; R.skiG.forEach(sg => sg.traverse(o => { if (o.isMesh && o.material !== R.mats.boot) R.footBits.push(o); })); R.footOn = true; }
  if (R.footOn === on) return; R.footOn = on; R.footBits.forEach(o => { if (!on) { o.userData.wv = o.visible; o.visible = false; } else if (o.userData.wv !== undefined) o.visible = o.userData.wv; }); }
/* Walking and running: upright over the feet, each foot placed by the same two-bone leg solve the skiing pose uses. The stride lengthens, the knees lift,
   the body leans in and the elbows fold as the pace turns into a run. */
function walkPose(R, q) {
  const a = R.a, b = R.b, foot = 0.26, sp = q.sp || 0, mv = smooth(sp / 0.9), run = smooth((sp - 3.4) / 2.6), ph = q.walkPh || 0;
  const stride = (0.26 + 0.3 * run) * mv, lift = (0.07 + 0.19 * run) * mv, lean = 0.03 + 0.04 * mv + 0.2 * run, hip0 = foot + (a + b) * (0.96 - 0.05 * run), hY = hip0 + mv * (0.014 + 0.03 * run) * Math.cos(2 * ph);
  R.legs.forEach((l, i) => { const th = ph + i * Math.PI, s = Math.sin(th), sw = Math.max(0, Math.cos(th));   // sw > 0: this foot is off the ground and coming forward
    const aZ = -stride * s, aY = foot + lift * Math.pow(sw, 1.2) + 0.16 * run * sw * Math.max(0, -s), ddy = hY - aY, dist = Math.min(Math.hypot(ddy, aZ), a + b - 0.004), phi = Math.atan2(aZ, ddy);
    const t1 = Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1)) - phi, t2 = Math.atan2(-aZ - a * Math.sin(t1), ddy - a * Math.cos(t1));
    l.hip.position.set(l.x, hY, 0.04); l.hip.rotation.set(t1, 0, 0); l.knee.rotation.x = t2 - t1;
    const sg = R.skiG[i]; sg.visible = true; sg.scale.setScalar(1); sg.position.set(i ? 0.13 : -0.13, 0.2 + (aY - foot), 0.06 + aZ); sg.rotation.set(0.7 * t2 * mv, 0, 0); });
  R.hipG.position.set(0, hY + 0.02, 0.04); R.hipG.rotation.set(0, 0.07 * mv * (1 + run) * Math.sin(ph), 0); R.hipG.updateMatrix();
  R.torso.rotation.set(-lean, -0.11 * mv * (1 + run) * Math.sin(ph), 0); R.torso.updateMatrix(); R.head.rotation.set(lean * 0.8, 0, 0); R.head.position.set(0, 0.8, 0);
  R.arms.forEach((ar, i) => { const sw = Math.sin(ph + (i ? 0 : Math.PI)) * (0.4 + 0.5 * run) * mv; ar.pole.visible = false; ar.sh.rotation.set(sw + 0.12 * run, 0, (i ? 1 : -1) * (0.34 - 0.1 * run));   /* held clear of the jacket */ ar.el.rotation.set(0.16 + 1.3 * run + Math.max(0, sw) * 0.4, 0, 0); });   // hands empty: arms swing against the legs
}
function poseRider(R, q, keys, slope, dt, time, snap) {
  const hold = R.hold, onSnow = q.ground && (q.mode === "ski" || q.mode === "walk" || q.mode === "sled") && !q.crashed && !(q === sk && sk.shopIn);
  const up = onSnow ? normalAt(q.p.x, q.p.z, 0.7, _y) : _y.set(0, 1, 0); fwdOf(q.yaw, _z); _x.crossVectors(up, _z).normalize(); _z.crossVectors(_x, up).normalize();
  _qa.setFromRotationMatrix(_m4.makeBasis(_x, up, _z)); if (snap) hold.quaternion.copy(_qa); else hold.quaternion.slerp(_qa, Math.min(1, (onSnow ? 7 : 16) * dt));
  hold.position.copy(q.p); if (onSnow && q !== sk && q.mode !== "sled") { q.sinkR = (q.sinkR || 0) + ((1 - maskAt(q.p.x, q.p.z)[0]) * (1 - maskAt(q.p.x, q.p.z)[2]) * (q.mode === "walk" ? 0.2 : 0.14) - (q.sinkR || 0)) * Math.min(1, 5 * dt); hold.position.y -= q.sinkR; }   // other riders sink too; your own depth is set in updateRig   // 20 cm of fresh: boots go to the bottom of it, skis float most of the way
  q.bike = q.mode === "sled"; if (q.bike) { q.sw = false; q.spin = 0; }   // on a snowmobile you sit astride it like a bike, hands on the bars, facing the way it points
  KR.pose(R, q, keys, slope, dt, time); if (q.bike) R.skiBack.visible = false;
  if (q.crashed) { // a falling body is loose: arms and legs fly while it tumbles and sprawl where it stops
    const k = clamp((q.sp || 0) / 8, 0, 1), s0 = 1 - k; R.arms.forEach((a, i) => { const sd = i ? 1 : -1; a.sh.rotation.x += k * 1.3 * Math.sin(time * 9 + i * 2.1) - s0 * 0.5; a.sh.rotation.z += sd * (k * 0.9 * Math.sin(time * 7 + i) + s0 * 0.9 + 0.3); a.el.rotation.x += k * 0.8 * Math.sin(time * 11 + i * 1.3) - 0.3; });
    R.legs.forEach((l, i) => { const sd = i ? 1 : -1; l.hip.rotation.x += k * 0.8 * Math.sin(time * 8 + i * Math.PI) + s0 * 0.25 * sd; l.hip.rotation.z = (l.hip.rotation.z || 0) + sd * (0.18 + 0.25 * k * Math.abs(Math.sin(time * 6 + i))); l.knee.rotation.x -= k * 0.7 * Math.abs(Math.sin(time * 10 + i * 2)) + s0 * 0.35; });
    if (q.lost) R.arms.forEach(a => { a.pole.visible = false; }); }
  if (q.mode === "sled" || q.lost) { R.arms.forEach(a => { a.pole.visible = false; }); R.skiG.forEach(sg => { sg.visible = false; }); }   // on a snowmobile the skis and poles are off; in a yard sale they are gone
  R.rig.rotation.y = -(q.spin + (q.sw ? Math.PI : 0));
  const walking = q.mode === "walk"; R.carry.visible = false; footGear(R, !walking); R.root.position.y = walking ? -0.065 : 0.025;   /* without skis and bindings under them the boots stand on the ground */ R.skiMeshes.forEach(m => { m.visible = !walking && q.mode !== "sled" && !q.lost; });
  if (walking) walkPose(R, q);
  if (q.sit && walking) pubPose(R, q); else if (R.held) R.held.visible = false;
  if (q.dance && walking && !q.sit) dancePose(R, q, time);
  if (q === sk && sk.throwT > 0 && walking) { const k = sk.throwT / 0.35, ar = R.arms[1]; ar.sh.rotation.set(2.6 - 2.0 * (1 - k), 0, ar.sd * 0.2); ar.el.rotation.set(0.9 * k, 0, 0); }   // the throwing arm comes over the top
  const wob = q.stumT > 0 && !q.crashed ? Math.min(1, q.stumT / 0.9) : 0, seated = q.mode === "lift";
  R.pivot.rotation.x = (q.crashed ? q.rot : q.ground ? 0 : q.rot - 0) + wob * (0.28 * Math.sin(time * 9) - 0.12) - (seated ? 0.25 : 0);
  R.pivot.rotation.z = (q.crashed ? q.tumZ : -(R.pose.vt !== undefined ? R.pose.vt : q.turn) * (0.3 + 0.32 * q.carve) * (q.air ? 0.3 : 1)) + (wob ? wob * (q.stumD || 1) * 0.45 * Math.sin(time * 12) : 0);
}
const NOKEYS = Object.assign({}, K), PK = Object.assign({}, K);
function updateRig(dt, time) {
  const R = rig, onLift = sk.mode === "lift", seated = onLift && sk.lift && sk.lift.type.startsWith("chair"), cabin = onLift && sk.lift && !sk.lift.carpet && !seated;
  R.hold.visible = !cabin; sk.air = !sk.ground && sk.mode === "ski";
  if (seated) { sk.chg = 0.85; sk.turn = 0; sk.carve = 0; } if (sk.mode === "sled") { sk.chg = 0; sk.carve = 0; }   // sit: Kicker Run's deep crouch reads as a seat on the chair
  sk.poseSlope = camSnap ? sk.slope : (sk.poseSlope || 0) + (sk.slope - (sk.poseSlope || 0)) * Math.min(1, 3 * dt);   // legs follow the hill, not every ripple
  Object.assign(PK, K); if (sk.ground) { PK.boost = K.up; PK.up = 0; PK.down = K.brake; PK.brake = K.down; } else PK.boost = 0;   // on snow W is the tuck, not a nose butter
  poseRider(R, sk, sk.mode === "ski" ? PK : NOKEYS, sk.poseSlope, dt, time, camSnap);
  if (seated) R.hold.position.y += 0.2; if (sk.mode === "sled") { const back = sk.sledRole === 2 ? 0.94 : 0.34; R.hold.position.y += sk.sledRole === 2 ? 0.18 : 0.12; R.hold.position.x -= Math.sin(sk.yaw) * back; R.hold.position.z -= Math.cos(sk.yaw) * back; if (sk.sled && sk.sled.air) R.hold.quaternion.copy(sk.sled.mesh.quaternion); }   // on the seat, behind the bars; in the air you pitch with the machine
  if (sk.lost && !sk.crashed) { clearLoose(); sk.lost = false; }
  if (sk.crashed) R.hold.position.y += 0.22 + (sk.crashHop || 0);
  if (sk.shopIn && R.hold.position.y < sk.shopIn.floorY) R.hold.position.y = sk.shopIn.floorY;   // on the shop's floor, not the ground under it
  if (sk.sit) pubSeatY(R); if (sk.tackT > 0) { const k = smooth((3 - sk.tackT) / 0.3) * smooth(sk.tackT / 0.6); R.pivot.rotation.x = -1.45 * k; R.hold.position.y += 0.16 * k; }   /* tackled: face down, then back up */
  { const on = sk.mode === "ski" && sk.ground && !sk.crashed, want = on || sk.crashed ? rockLift(sk.p.x, sk.p.z) : 0; sk.rkLift = (sk.rkLift || 0) + (want - (sk.rkLift || 0)) * Math.min(1, 9 * dt);   // the rock stands out from the surveyed slope: ride on its surface, not inside it
    R.hold.position.y += sk.rkLift + (on ? sk.surf.rock * 0.03 * Math.sin(time * 61) * clamp(sk.sp / 8, 0, 1) : 0); }
  // Powder: you ride in the snow, not on it. Deeper when slow, floating up as you pick up speed; skis and boots go under the surface.
  { const want = (sk.mode === "ski" || sk.mode === "walk") && sk.ground && !sk.crashed && !sk.shopIn ? (sk.surf.deep || 0) * (sk.mode === "walk" ? 0.26 : 0.11 + 0.11 * (1 - clamp(sk.sp / 14, 0, 1))) : 0; sk.sink = (sk.sink || 0) + (want - (sk.sink || 0)) * Math.min(1, 6 * dt); R.hold.position.y -= sk.sink; }
  R.head.visible = !(fpv && !cabin && !sk.sit);
}
function updateCamera(dt) {
  if (PUB.seat) { pubCam(dt); return; }
  const p = sk.p, sp = sk.sp, onLift = sk.mode === "lift", cabin = onLift && !sk.lift.carpet && !sk.lift.type.startsWith("chair");
  if (!look.drag) { look.idle += dt; if (look.idle > 1.2 && (sp > 2 || onLift)) { const k = Math.exp(-2.5 * dt); look.yaw *= k; look.pit *= k; } }
  const vh = Math.hypot(sk.v.x, sk.v.z); let heading = sk.yaw;
  if (sk.mode === "ski" && !sk.ground && vh > 2.5) heading = Math.atan2(sk.v.x, sk.v.z);
  const cur = Math.atan2(camDir.x, camDir.z), nh = cur + wrap(heading - cur) * (camSnap || sk.mode === "sled" ? 1 : Math.min(1, (sk.ground ? 3.2 : 1.6) * dt)); camDir.set(Math.sin(nh), 0, Math.cos(nh));   // on a snowmobile the view is locked to the way it points
  const cy = nh + look.yaw, dx = Math.sin(cy), dz = Math.cos(cy);
  camera.fov = lerp(camera.fov, fpv ? 76 + 8 * smooth(sp / 36) : 60 + 13 * smooth(sp / 36), Math.min(1, 3 * dt)); camera.near = fpv ? 0.1 : 0.25; camera.updateProjectionMatrix();
  if (fpv && !sk.crashed) {
    const eye = cabin ? tmp.set(p.x, p.y + 1.7, p.z) : rig.head.getWorldPosition(tmp); if (!cabin) { eye.y += 0.03; eye.x += Math.sin(nh) * 0.09; eye.z += Math.cos(nh) * 0.09; }   // the rider's own eyes
    camera.position.copy(eye); const slope = sk.ground && sk.mode === "ski" ? Math.atan2(fw.y, Math.hypot(fw.x, fw.z)) : 0, pit = clamp(slope * 0.85 - (onLift ? 0.08 : 0.2) + look.pit, -1.45, 1.3), hy = sk.mode === "ski" && sk.ground ? -sk.turn * 0.3 : 0;   // looking where you are going, a little down the hill and into the turn; glance down (drag) to see your skis
    camTgt.set(eye.x + Math.sin(cy + hy) * Math.cos(pit), eye.y + Math.sin(pit), eye.z + Math.cos(cy + hy) * Math.cos(pit)); camera.up.set(0, 1, 0); camera.lookAt(camTgt);
    camera.rotateZ(rig.pivot.rotation.z * 0.3); camSnap = false; return;
  }
  if (onLift && !sk.lift.carpet) { // ride cam: behind and a little above the carrier, looking up the line
    const L = sk.lift, a = liftPoint(L, sk.liftS - 4, 1, tmp), b = liftPoint(L, sk.liftS + 4, 1, tmp2), sl = (b.y - a.y) / 8, dist = cabin ? 15 : 7.5, cp = Math.cos(look.pit), ly = Math.sin(look.pit);
    tmp.set(p.x - dx * dist * cp, p.y + 2.3 - sl * dist + ly * dist + (cabin ? 2 : 0), p.z - dz * dist * cp); const gh = H(tmp.x, tmp.z) + 1.2; if (tmp.y < gh) tmp.y = gh;
    if (camSnap) camPos.copy(tmp); else camPos.lerp(tmp, 1 - Math.exp(-6 * dt)); camera.position.copy(camPos); camera.up.set(0, 1, 0);
    tmp.set(p.x + dx * 14, p.y + 1.2 + sl * 14, p.z + dz * 14); if (camSnap) camTgt.copy(tmp); else camTgt.lerp(tmp, 1 - Math.exp(-8 * dt)); camera.lookAt(camTgt); camSnap = false; return;
  }
  const dist = (onLift ? (cabin ? 15 : 8.5) : 5.2 + sp * 0.06) * (sk.crashed ? 1.3 : 1), hgtC = (onLift ? 3.4 : 3.2 + sp * 0.012) + look.pit * -6;   // a little above and close behind
  if (sk.ground && sk.mode === "ski") camSlope += (clamp(-fw.y, -0.5, 0.8) - camSlope) * Math.min(1, 4 * dt);   // held through the air, so leaving a lip never drops the view
  camAir += ((!sk.ground && sk.mode === "ski" ? clamp(0.9 + (p.y - H(p.x, p.z)) * 0.14, 0.9, 3) : 0) - camAir) * Math.min(1, (sk.ground ? 2.5 : 5) * dt);
  const slopeY = camSlope * dist * 0.55 + camAir / 0.6;
  tmp.set(p.x - dx * dist, p.y + hgtC + slopeY * 0.6, p.z - dz * dist);
  const gh = H(tmp.x, tmp.z) + 1.1; if (tmp.y < gh) tmp.y = gh;
  if (camSnap) camPos.copy(tmp); else { const k = sk.mode === "sled" ? 1 : 1 - Math.exp(-(onLift ? 5 : 7) * dt); camPos.x += (tmp.x - camPos.x) * k; camPos.z += (tmp.z - camPos.z) * k;   /* rigidly behind a snowmobile */ camPos.y += (tmp.y - camPos.y) * (1 - Math.exp(-(tmp.y > camPos.y ? 7 : sk.ground ? 5 : 2.2) * dt)); if (camPos.y < H(camPos.x, camPos.z) + 0.9) camPos.y = H(camPos.x, camPos.z) + 0.9; }
  if (sk.shopIn) { const q = sk.shopIn, rx = camPos.x - q.dx, rz = camPos.z - q.dz, u = clamp(rx * q.tx + rz * q.tz, -q.hw + 0.3, q.hw - 0.3), w = clamp(rx * q.nx + rz * q.nz, 0.4, q.D - 0.3); camPos.x = q.dx + q.tx * u + q.nx * w; camPos.z = q.dz + q.tz * u + q.nz * w; camPos.y = Math.min(Math.max(camPos.y, q.floorY + 1.2), q.floorY + 2.65); }   // indoors the camera stays inside the room
  camera.position.copy(camPos); camera.up.set(0, 1, 0);
  tmp.set(p.x + dx * (3 + sp * 0.22), p.y + 1.25 - camSlope * dist * 0.14 + (onLift ? -1 : 0), p.z + dz * (3 + sp * 0.22));
  if (camSnap || sk.mode === "sled") camTgt.copy(tmp); else camTgt.lerp(tmp, 1 - Math.exp(-9 * dt)); camera.lookAt(camTgt);
  camera.rotateZ(-sk.turn * 0.03 * clamp(sp / 15, 0, 1)); camSnap = false;
}
/* shadow frustum follows the skier, snapped to texels so edges do not crawl */
function updateSun() {
  const R = Q.shadowR, c = tmp.copy(sk.p).addScaledVector(camDir, R * 0.45), tex = 2 * R / Q.shadow;
  _m4.lookAt(sunDir, tmp2.set(0, 0, 0), Y_AXIS); _qa.setFromRotationMatrix(_m4); _qb.copy(_qa).invert();
  c.applyQuaternion(_qb); c.x = Math.round(c.x / tex) * tex; c.y = Math.round(c.y / tex) * tex; c.applyQuaternion(_qa);
  sun.target.position.copy(c); sun.position.copy(c).addScaledVector(sunDir, 700); sun.target.updateMatrixWorld();
}
