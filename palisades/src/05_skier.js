/* ---------- the rider: Kicker Run's skier, outfits and pose code, copied from ski.html by tools/extract_kr.py (do not edit here) ----------
   The pose code reads Kicker Run's globals (sk, K, skierRig, outfit); KR.pose() points them at a rider for the duration of the call. */
const KR = (() => {
let sk = null, K = null, skierRig = null, slopeNow = 0;
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sA_ = () => slopeNow, spray = () => { };
const OUTFIT_DEFAULT = { helmet: "redbull", jacket: "vest", pants: "blue", accessory: "scarf", skis: "current", poles: "metal", skibend: "slight", wax: "std", grip: "std", len: "mid", style: "simple" };
let outfit = Object.assign({}, OUTFIT_DEFAULT);
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const OUTFIT_OPTS = {
  helmet: { frog: "Frog hat", beanie: "Beanie with ball", redbull: "Red Bull helmet", santa: "Santa hat", purple: "Purple beanie + shades", camo: "Camo beanie" },
  jacket: { trench: "Black trench coat", vest: "Grey vest, white long sleeve", santa: "Red Santa coat", black: "Black jacket", forest: "Forest green anorak", block: "Orange and navy jacket", navy: "Navy shell, cream sleeves", piped: "Black piped jacket", greenc: "Green and cream shell" },
  skis: { black: "Black wider skis", purple: "Purple skis", current: "Current skis", red: "Red skis", pink: "Pink skis", stripes: "Retro stripes", camo: "Snow camo", flames: "Flames" },
  song: { off: "No music", hypa: "Hypa · Silva Bumpa", yosemite: "Yosemite · KETTAMA", think: "Think of You · KETTAMA & Prospa", fly: "Fly Away XTC · KETTAMA", nite: "On 2nite · Silva Bumpa", doin: "Doin' it ft. MC DT · Silva Bumpa", youtube: "My YouTube link" },
  style: { simple: "Simple mannequin", detailed: "Detailed" },
  gfx: { auto: "Auto", low: "Low", med: "Medium", high: "High" },
  accessory: { scarf: "Scarf", ninja: "Ninja headband", cape: "Cape", phones: "Headphones", wired: "Wired headphones" },
  pants: { cream: "Cream pants", santa: "Red Santa pants", suit: "Black suit pants", shorts: "Grey shorts", blue: "Blue pants", khaki: "Khakis", brown: "Brown pants" },
  poles: { metal: "Metal poles", bamboo: "Bamboo poles" },
  wax: { slow: "Cold grip wax", std: "All-round wax", fast: "Hot speed wax" },
  grip: { loose: "Loose edges", std: "Standard edges", sharp: "Razor edges" },
  len: { short: "Short · 150 cm", mid: "Medium · 170 cm", long: "Long · 190 cm" },
  skibend: { flat: "Flat · no bend", slight: "Slight bend", medium: "Medium bend", full: "Full bend (old)" }
};
const JACKETS = { trench: { j: 0x15171b, t: 0x0c0d10, arm: 0x15171b, cuff: 0x0c0d10, sc: [0x7a1f26, 0x2a2a2e] }, vest: { j: 0x80868e, t: 0x5d636b, arm: 0xf2f3f5, cuff: 0xe4e6ea, sc: [0xf2f3f5, 0x80868e] }, santa: { j: 0xc4161c, t: 0xf6f6f2, arm: 0xc4161c, cuff: 0xf6f6f2, sc: [0xf6f6f2, 0xc4161c] }, black: { j: 0x16181c, t: 0x2a2d33, arm: 0x16181c, cuff: 0x0b0c0e, sc: [0x2a2d33, 0x16181c] }, forest: { j: 0x2f5e3f, t: 0x1e3a28, arm: 0x2f5e3f, cuff: 0x16261b, sc: [0xd9b45a, 0x2f5e3f] }, block: { j: 0xe0702a, t: 0x1f2a44, arm: 0x1f2a44, cuff: 0x141c2e, sc: [0x1f2a44, 0xe0702a] }, navy: { j: 0x22305c, t: 0x18234a, arm: 0x22305c, cuff: 0x18234a, sc: [0xe3d9c3, 0x22305c], up: 0xe3d9c3, lo: 0x22305c, tex: "navy", baggy: true }, piped: { j: 0x121315, t: 0x0b0b0c, arm: 0x121315, cuff: 0x0b0b0c, sc: [0xf2f2f2, 0x121315], up: 0xffffff, lo: 0xffffff, armTex: true, tex: "piped", baggy: true }, greenc: { j: 0x24564a, t: 0x1b4038, arm: 0x24564a, cuff: 0xd8cdb5, sc: [0xe3d9c3, 0x24564a], up: 0x24564a, lo: 0xe3d9c3, tex: "greenc", baggy: true } };
const PANTS = { santa: [0xc4161c, 0xc4161c], suit: [0x17191e, 0x17191e], shorts: [0x7d838b, -1], blue: [0x2f5fa8, 0x2f5fa8], khaki: [0xb59f72, 0xb59f72], brown: [0x6b4a2f, 0x6b4a2f], cream: [0xe3d9c3, 0xd8cdb5] };
const _cv = new THREE.Vector3(), _cp = [];
function updCord(R, w, t) {
  const tor = R.torso; tor.updateMatrixWorld(true); const toT = v => tor.worldToLocal(R.head.localToWorld(v));
  const eL = toT(_cv.set(-0.112, -0.05, -0.005).clone()), eR = toT(_cv.set(0.112, -0.05, -0.005).clone()), Y = new THREE.Vector3(0.02, 0.5, -0.2), P = new THREE.Vector3(0.16, 0.08, -0.215), pts = [];
  const seg = (a, b, n, sag, ph) => { for (let i = 0; i <= n; i++) { const u = i / n, e = Math.sin(Math.PI * u), v = a.clone().lerp(b, u); v.y -= sag * e; v.x += e * w * 0.035 * Math.sin(t * 13 + u * 7 + ph); v.z -= e * (0.012 + w * 0.05 * (0.6 + 0.4 * Math.sin(t * 9 + u * 5 + ph))); pts.push(v); } };
  const L = [], Rr = []; let cur = pts; seg(eL, Y, 8, 0.01, 0); L.push(...pts.splice(0)); seg(eR, Y, 8, 0.01, 2); Rr.push(...pts.splice(0)); seg(Y, P, 12, 0.04, 4); const D = pts.splice(0);
  const tube = arr => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arr), arr.length * 2, 0.0045, 4, false), gs = [tube(L), tube(Rr), tube(D)];
  const merged = new THREE.BufferGeometry(), pos = [], idx = []; let off = 0; for (const g of gs) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) pos.push(p[i]); const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off); off += p.length / 3; g.dispose(); }
  merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); merged.setIndex(idx); merged.computeVertexNormals(); R.cord.geometry.dispose(); R.cord.geometry = merged;
}
function applyOutfit(R) {
  if (!R) return; const m = R.mats, J = JACKETS[outfit.jacket], P = PANTS[outfit.pants], h = outfit.helmet;
  m.jacket.color.setHex(J.j); m.jacket2.color.setHex(J.t); m.jacketArm.color.setHex(J.arm); m.cuffM.color.setHex(J.cuff);
  m.scarfMat[0].color.setHex(J.sc[0]); m.scarfMat[1].color.setHex(J.sc[1]);
  for (const k in R.ex) R.ex[k].visible = k === outfit.jacket;
  m.pants.color.setHex(P[0]); m.pantsLow.color.setHex(P[1] < 0 ? m.skin.color.getHex() : P[1]);
  R.helmetG.visible = h === "redbull"; m.helmet.color.setHex(0x0d2a5e); m.stripeM.color.setHex(0xd9232d);
  skiRk = { flat: 0, slight: 0.35, medium: 0.65, full: 1 }[outfit.skibend] ?? 0.35; tunePhys();
  for (const k in R.hats) R.hats[k].visible = k === h;
  if (outfit.poles === "bamboo") { R.poleMat.map = R.bambooTex; R.poleMat.color.setHex(0xffffff); R.poleMat.metalness = 0.02; R.poleMat.roughness = 0.8; } else { R.poleMat.map = null; R.poleMat.color.setHex(0xa7b8c9); R.poleMat.metalness = 0.6; R.poleMat.roughness = 0.35; } R.poleMat.needsUpdate = true;
  R.cuffs.forEach(c => c.visible = outfit.pants !== "shorts");
  { const sm = outfit.style === "simple", k = sm ? 1 : 0, Sc = (m, x, y, z) => m.scale.set(sm ? x : 1, sm ? y : 1, sm ? z : 1);
    R.detail.forEach(m => { m.visible = !sm; }); R.simpleOnly.forEach(m => { m.visible = sm && (!m.userData.helmetOnly || h === "redbull"); });
    R.torsoM.scale.set(sm ? 1.62 : 1.2, 1, sm ? 1.12 : 0.82); R.hoodM.scale.set(sm ? 1.55 : 1.2, sm ? 1.05 : 0.85, sm ? 1.2 : 0.9); R.hoodM.position.set(0, sm ? 0.73 : 0.7, sm ? 0.14 : 0.115);
    R.shape.shoulders.forEach(m => { m.visible = !sm; }); R.torsoM.visible = !sm; R.simpleBody.visible = sm; if (sm) m.jacketArm.color.setHex(J.j);
    R.armUp.color.setHex(J.up !== undefined ? J.up : sm ? J.j : J.arm); R.armLo.color.setHex(J.lo !== undefined ? J.lo : sm ? J.j : J.arm); R.armUp.map = R.armLo.map = J.armTex ? R.pipeTex : null; R.armUp.needsUpdate = R.armLo.needsUpdate = true;
    R.simpleBody.material = J.tex ? R.jTex[J.tex] : m.jacket; R.bag = J.baggy ? 1.1 : 1; R.simpleBody.scale.set(R.bag, J.baggy ? 1.03 : 1, J.baggy ? 1.16 : 1); R.shape.arms.forEach(m => Sc(m, 1.2, 1, 1.2)); R.shape.elbows.forEach(m => Sc(m, 1.2, 1.2, 1.2)); 
    R.shape.calves.forEach(m => { m.visible = !sm; }); 
    m.boot.color.setHex(sm ? 0xe8ebef : 0x1a1f29); }
  for (const k in R.acc) R.acc[k].visible = k === outfit.accessory; R.buds.forEach(b => b.visible = outfit.accessory === "wired");
  R.skiM.map = R.skiTexes[outfit.skis === "current" ? "current" : outfit.skis]; R.skiM.needsUpdate = true; R.skiMeshes.forEach(m => m.scale.x = outfit.skis === "black" ? 1.4 : 1);
}
let skiRk = 0.35;
const PHYS = { drag: 1, turn: 1, scrub: 1, spin: 1, land: 0 };
const TUNE = { wax: { slow: { drag: 1.16 }, std: { drag: 1 }, fast: { drag: 0.84 } }, grip: { loose: { turn: 0.82, scrub: 0.75 }, std: { turn: 1, scrub: 1 }, sharp: { turn: 1.2, scrub: 1.3 } }, len: { short: { turn: 1.12, spin: 1.22, land: -0.15, drag: 1.04 }, mid: { turn: 1, spin: 1, land: 0, drag: 1 }, long: { turn: 0.9, spin: 0.84, land: 0.3, drag: 0.95 } } };
function tunePhys() { PHYS.drag = 1; PHYS.turn = 1; PHYS.scrub = 1; PHYS.spin = 1; PHYS.land = 0; for (const c of ["wax", "grip", "len"]) { const t = TUNE[c][outfit[c]] || {}; PHYS.drag *= t.drag || 1; PHYS.turn *= t.turn || 1; PHYS.scrub *= t.scrub || 1; PHYS.spin *= t.spin || 1; PHYS.land += t.land || 0; } }
function buildSkier() {
  const root = new THREE.Group(), pivot = new THREE.Group(), rig = new THREE.Group();
  pivot.position.y = 0.9; rig.position.y = -0.9; root.add(pivot); pivot.add(rig);
  const M = (color, o) => worldShade(new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0.04 }, o || {})));
  const lensTex = canvasTex(64, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#ffb347"); g.addColorStop(0.5, "#ff5a8a"); g.addColorStop(1, "#5a6bff"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, 0, w, 6); });
  const mkSkiTex = (base) => canvasTex(8, 8, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); });
  const skiTex = mkSkiTex("#ee5a2c", "#f6f7f9", "#14181f");
  const skiTexes = { current: skiTex, black: mkSkiTex("#15171c", "#d9dde3", "#0a0b0e"), purple: mkSkiTex("#7b3fd0", "#f1e8ff", "#2a1450"), red: mkSkiTex("#d3202a", "#f6f7f9", "#14181f"), pink: mkSkiTex("#ff6fb5", "#ffffff", "#7a1f4d"),
    // patterned top sheets: across the texture, the left half wraps over the top of the ski and the right half is the base; down the texture runs tail to tip
    stripes: canvasTex(64, 256, (x, w, h) => { x.fillStyle = "#14181f"; x.fillRect(0, 0, w, h); x.fillStyle = "#f2f0ea"; x.fillRect(0, 0, w, h); for (let i = -4; i < 20; i++) { x.fillStyle = i % 3 === 0 ? "#c8302c" : i % 3 === 1 ? "#1f3b6e" : "#f2b632"; x.fillRect(0, i * 16, w, 6); } }),
    camo: canvasTex(64, 256, (x, w, h) => { x.fillStyle = "#14181f"; x.fillRect(0, 0, w, h); x.fillStyle = "#e9edf2"; x.fillRect(0, 0, w, h); const r = mulberry(91); for (let i = 0; i < 120; i++) { x.fillStyle = ["#8f9aa6", "#5d6875", "#c9d1da", "#3d4650"][i % 4]; x.beginPath(); x.ellipse(r() * w, r() * h, 3 + r() * 8, 6 + r() * 16, r() * 3, 0, 7); x.fill(); } }),
    flames: canvasTex(64, 256, (x, w, h) => { x.fillStyle = "#101114"; x.fillRect(0, 0, w, h); const g = x.createLinearGradient(0, 0, 0, h * 0.55); g.addColorStop(0, "#ffe14a"); g.addColorStop(0.45, "#ff7a1a"); g.addColorStop(1, "rgba(200,30,20,0)"); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); for (let k = 0; k <= 16; k++) { const xx = w - k * (w / 16), yy = h * (0.32 + 0.22 * ((k % 2) ? 1 : 0.45)); x.lineTo(xx, yy); } x.lineTo(0, 0); x.closePath(); x.fill(); x.fillStyle = "#f6f7f9"; x.font = "bold 9px Arial"; x.save(); x.translate(w / 2, h * 0.75); x.rotate(-Math.PI / 2); x.textAlign = "center"; x.fillText("FUEGO", 0, 3); x.restore(); }) };
  const logoTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#14181f"; x.fillRect(0, 0, w, h); x.fillStyle = "#f08a3a"; x.beginPath(); x.moveTo(64, 14); x.lineTo(112, 108); x.lineTo(16, 108); x.closePath(); x.fill(); x.fillStyle = "#f4f6f9"; x.beginPath(); x.moveTo(64, 46); x.lineTo(84, 88); x.lineTo(44, 88); x.closePath(); x.fill(); });
  const foldTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#808080"; x.fillRect(0, 0, w, h); const rr = mulberry(77); for (let i = 0; i < 26; i++) { const y = rr() * h, a = (rr() - 0.5) * 0.6, len = 30 + rr() * 70, x0 = rr() * w; x.strokeStyle = rr() < 0.5 ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.35)"; x.lineWidth = 2 + rr() * 4; x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + len / 2, y + a * 40 + 8, x0 + len, y + a * 80); x.stroke(); } }); foldTex.wrapS = foldTex.wrapT = THREE.RepeatWrapping;
  const jacket = M(0x2f8f8c, { roughness: 0.62, bumpMap: foldTex, bumpScale: 0.025 }), jacket2 = M(0x2b3036, { roughness: 0.7 }), pants = M(0x2c3445, { roughness: 0.8, bumpMap: foldTex, bumpScale: 0.03 }), boot = M(0x1a1f29, { roughness: 0.5 }), helmet = M(0x15181d, { roughness: 0.22, metalness: 0.2 });
  const black = M(0x14181f), glove = M(0x1b1f27, { roughness: 0.6 }), skin = M(0xe5b794, { roughness: 0.6 }), white = M(0xf4f6f9), orange = M(0xf08a3a), skiM = M(0xffffff, { map: skiTex, roughness: 0.35 });
  const jacketArm = M(0x2f8f8c, { roughness: 0.62, bumpMap: foldTex, bumpScale: 0.025 }), cuffM = M(0x2b3036, { roughness: 0.7 }), pantsLow = M(0x2c3445, { roughness: 0.8, bumpMap: foldTex, bumpScale: 0.03 }), stripeM = M(0xf4f6f9); jacket.side = THREE.DoubleSide;
  const lens = M(0xffffff, { map: lensTex, roughness: 0.1, metalness: 0.7 }), gaiter = M(0x434a57), hair = M(0x4a3426, { roughness: 0.9 });
  const add = (geo, m, x, y, z, parent) => { const mm = new THREE.Mesh(geo, m); mm.position.set(x, y, z); (parent || rig).add(mm); return mm; };
  const limb = (r0, r1, len, m) => { const g = new THREE.CylinderGeometry(r0, r1, len, 16); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, m); };
  // skis, bindings, boots
  const skiG = [], tailM = [], noseM = [], midM = [], bend = [];
  [-0.13, 0.13].forEach(x => {
    const sg = new THREE.Group(); sg.position.set(x, 0.2, 0.06); sg.rotation.order = "YXZ"; rig.add(sg); const ig = new THREE.Group(); ig.position.set(-x, -0.2, -0.06); sg.add(ig);
    const tm = new THREE.Object3D(); tm.position.set(x, 0.05, 0.78); ig.add(tm); skiG.push(sg); tailM.push(tm);
    const nm = new THREE.Object3D(); nm.position.set(x, 0.05, -0.84); ig.add(nm); noseM.push(nm); const mm2 = new THREE.Object3D(); mm2.position.set(x, 0.06, -0.05); ig.add(mm2); midM.push(mm2);
    const addS = (g, m, px, py, pz) => add(g, m, px, py, pz, ig);
    { // one smooth, curved ski: rounded tips, slight waist, rocker at nose and tail, bends when buttering
      const n = 40, ring = 10, zN = -0.96, zT = 0.88, pos = new Float32Array((n + 1) * ring * 3), idx = [], zs = [], baseY = [];
      const noseC = z => 0.17 * Math.pow(Math.max(0, (-z - 0.42) / 0.54), 1.8), tailC = z => 0.075 * Math.pow(Math.max(0, (z - 0.55) / 0.33), 1.8);
      for (let a = 0; a <= n; a++) {
        const u = a / n, z = zN + (zT - zN) * u, e = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 9))), wd = (0.145 - 0.026 * Math.sin(Math.PI * u) + (u > 0.6 ? 0.004 : 0)) * 0.5 * e, th = 0.019 * (0.35 + 0.65 * e), yc = 0.052 + noseC(z) + tailC(z);
        zs.push(z); for (let k = 0; k < ring; k++) { const ang = k / ring * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang), o = (a * ring + k) * 3; pos[o] = wd * Math.sign(c) * Math.pow(Math.abs(c), 0.45); pos[o + 1] = yc + th * Math.sign(sn) * Math.pow(Math.abs(sn), 0.45); pos[o + 2] = z; baseY.push(pos[o + 1]); }
      }
      for (let a = 0; a < n; a++) for (let k = 0; k < ring; k++) { const p0 = a * ring + k, p1 = a * ring + (k + 1) % ring, q0 = p0 + ring, q1 = p1 + ring; idx.push(p0, q0, p1, p1, q0, q1); }
      const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sgeo.setIndex(idx); sgeo.computeVertexNormals();
      const uvs = new Float32Array((n + 1) * ring * 2); for (let a = 0; a <= n; a++) for (let k = 0; k < ring; k++) { uvs[(a * ring + k) * 2] = k / ring; uvs[(a * ring + k) * 2 + 1] = a / n; } sgeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      const sm = addS(sgeo, skiM, x, 0, 0.0); let lb = -1, ln = -1, lr = -1;
      bend.push({ upd: (bt, nb) => { if (Math.abs(bt - lb) < 0.01 && Math.abs(nb - ln) < 0.01 && lr === skiRk) return; lb = bt; ln = nb; lr = skiRk; for (let a = 0; a <= n; a++) { const z = zs[a], dy = (skiRk - 1) * (noseC(z) + tailC(z)) + (nb * noseC(z) * 2.4 + bt * tailC(z) * 4.5) * (0.4 + 0.6 * skiRk); for (let k = 0; k < ring; k++) { const o = a * ring + k; pos[o * 3 + 1] = baseY[o] + dy; } } sgeo.attributes.position.needsUpdate = true; sgeo.computeVertexNormals(); } });
    }
    { const bk = M(0x16181c, { roughness: 0.45, metalness: 0.3 }), al = M(0xb9c0c8, { roughness: 0.3, metalness: 0.85 }), acc2 = M(0xd3202a, { roughness: 0.5 });
      addS(new THREE.BoxGeometry(0.075, 0.012, 0.5), bk, x, 0.068, 0.06); // track plate
      addS(new THREE.BoxGeometry(0.07, 0.006, 0.06), al, x, 0.077, -0.06); // anti-friction plate under the toe
      addS(new THREE.BoxGeometry(0.06, 0.04, 0.06), bk, x, 0.09, -0.145); // toe body
      addS(new THREE.BoxGeometry(0.105, 0.025, 0.03), bk, x, 0.118, -0.115); // toe wings over the boot toe
      addS(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), al, x, 0.1, -0.168).rotation.z = Math.PI / 2; // DIN screw housing
      addS(new THREE.BoxGeometry(0.025, 0.01, 0.02), acc2, x, 0.112, -0.17);
      addS(new THREE.BoxGeometry(0.075, 0.075, 0.085), bk, x, 0.11, 0.27); // heel piece
      addS(new THREE.BoxGeometry(0.08, 0.02, 0.07), al, x, 0.15, 0.235); // heel cup over the boot heel
      const lev = addS(new THREE.BoxGeometry(0.05, 0.012, 0.11), acc2, x, 0.16, 0.32); lev.rotation.x = 0.55; // step-in lever
      [-1, 1].forEach(sd2 => { const br = addS(new THREE.BoxGeometry(0.008, 0.008, 0.12), al, x + sd2 * 0.05, 0.075, 0.24); br.rotation.x = -0.25; br.rotation.y = sd2 * 0.12; addS(new THREE.BoxGeometry(0.014, 0.03, 0.02), bk, x + sd2 * 0.056, 0.06, 0.18); }); }
    addS(new THREE.BoxGeometry(0.118, 0.12, 0.32), boot, x, 0.135, 0.06);
    addS(new THREE.CylinderGeometry(0.062, 0.066, 0.15, 16), boot, x, 0.235, 0.05); // boot cuff, the shaft is hidden under the trousers
    addS(new THREE.TorusGeometry(0.07, 0.016, 8, 16), M(0x2a2f3a, { roughness: 0.6 }), x, 0.45, 0.05).rotation.x = Math.PI / 2;
    addS(new THREE.BoxGeometry(0.1, 0.03, 0.05), orange, x, 0.33, -0.03);
    [0.08, 0.17].forEach((zo, i) => addS(new THREE.BoxGeometry(0.02, 0.025, 0.05), orange, x + Math.sign(x) * 0.06, 0.22 + i * 0.07, 0.0 + zo * 0.2));
  });
  const a = 0.43, b = 0.44, legs = [], cuffs = [], shape = { thighs: [], shins: [], calves: [], arms: [], shoulders: [], knees: [], elbows: [] };
  [-0.115, 0.115].forEach(x => {
    const hip = new THREE.Group(); rig.add(hip);
    { const m = limb(0.126, 0.097, a, pants); hip.add(m); shape.thighs.push(m); }
    const knee = new THREE.Group(); knee.position.y = -a; hip.add(knee);
    { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), pantsLow); knee.add(kn); shape.knees.push(kn); }
    { const m = limb(0.097, 0.088, b + 0.07, pantsLow); knee.add(m); shape.shins.push(m); }
    const calf = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), pantsLow); calf.scale.set(1, 1.7, 1.1); calf.position.set(0, -0.13, 0.025); knee.add(calf); shape.calves.push(calf);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.108, 0.17, 16), pants); cuff.position.y = -b + 0.13; knee.add(cuff); cuffs.push(cuff);
    legs.push({ hip, knee, x });
  });
  const hipG = new THREE.Group(); rig.add(hipG);
  add(new THREE.SphereGeometry(0.17, 16, 12), pants, 0, 0.02, 0, hipG).scale.set(1.18, 0.8, 0.88);
  const torso = new THREE.Group(); hipG.add(torso);
  let simpleBody = null;
  const torsoM = add(new THREE.CylinderGeometry(0.205, 0.19, 0.6, 22), jacket, 0, 0.31, 0, torso); torsoM.scale.set(1.2, 1, 0.82);
  add(new THREE.CylinderGeometry(0.222, 0.225, 0.1, 22), jacket2, 0, 0.04, 0, torso).scale.set(1.2, 1, 0.84);
  add(new THREE.CylinderGeometry(0.218, 0.218, 0.13, 22), jacket2, 0, 0.37, 0, torso).scale.set(1.2, 1, 0.84);
  add(new THREE.SphereGeometry(0.21, 16, 10), jacket, 0, 0.56, 0, torso).scale.set(1.22, 0.5, 0.82);
  const logo = add(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.8 }), 0, 0.3, 0.172, torso); logo.visible = false;
  { const nR = 26, nA = 28, pos = [], idx = [];
    for (let i = 0; i <= nR; i++) { const y = -0.13 + 0.87 * i / nR, t = clamp((y + 0.13) / 0.87, 0, 1); let w = (0.288 - 0.06 * smooth((t - 0.35) / 0.45) + 0.016 * (1 - smooth(t / 0.12)) + 0.03 * Math.sin(Math.min(1, t / 0.78) * Math.PI * 0.5)) * (1 - 0.08 * smooth((t - 0.55) / 0.3)), d = 0.2 + 0.025 * t; const top = smooth((t - 0.86) / 0.14); w = lerp(w, 0.11, Math.pow(top, 1.4)); d = lerp(d, 0.1, Math.pow(top, 1.4)); const shl = smooth((t - 0.74) / 0.12) * (1 - smooth((t - 0.9) / 0.1)); w += 0.006 * shl; for (let k = 0; k < nA; k++) { const a = k / nA * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); pos.push(w * Math.sign(c) * Math.pow(Math.abs(c), 0.8), y, d * Math.sign(sn) * Math.pow(Math.abs(sn), 0.8)); } }
    for (let i = 0; i < nR; i++) for (let k = 0; k < nA; k++) { const p0 = i * nA + k, p1 = i * nA + (k + 1) % nA, q0 = p0 + nA, q1 = p1 + nA; idx.push(p0, p1, q0, p1, q1, q0); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tg.setIndex(idx); { const uv = []; for (let i = 0; i <= nR; i++) for (let k = 0; k < nA; k++) uv.push(k / nA, i / nR); tg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); } tg.computeVertexNormals(); tg.userData.base = Float32Array.from(pos); tg.userData.nR = nR; tg.userData.nA = nA;
    const tm = new THREE.Mesh(tg, jacket); tm.position.set(0, 0.0, 0); torso.add(tm); tm.userData.simpleBody = true; simpleBody = tm; }
  [-0.225, 0.225].forEach(x => shape.shoulders.push(add(new THREE.SphereGeometry(0.09, 14, 10), jacketArm, x, 0.56, 0, torso)));
  const hoodM = add(new THREE.SphereGeometry(0.155, 14, 10), jacket, 0, 0.7, 0.115, torso); hoodM.scale.set(1.2, 0.85, 0.9); // hood
  add(new THREE.CylinderGeometry(0.082, 0.095, 0.11, 14), gaiter, 0, 0.66, 0, torso);
  const head = new THREE.Group(); head.position.y = 0.8; torso.add(head);
  add(new THREE.SphereGeometry(0.113, 18, 14), skin, 0, 0, 0, head);
  add(new THREE.SphereGeometry(0.06, 10, 8), hair, 0, -0.075, 0.105, head).scale.set(1.3, 0.8, 0.9);
  const helmetG = new THREE.Group(); head.add(helmetG);
  add(new THREE.SphereGeometry(0.139, 22, 14, 0, TAU, 0, Math.PI * 0.62), helmet, 0, 0.012, 0.012, helmetG);
  const stripe = add(new THREE.TorusGeometry(0.141, 0.011, 6, 28, Math.PI), stripeM, 0, 0.012, 0.012, helmetG); stripe.rotation.y = Math.PI / 2;
  [-0.045, 0, 0.045].forEach(z => add(new THREE.BoxGeometry(0.1, 0.012, 0.03), black, 0, 0.145, z - 0.0, helmetG));
  add(new THREE.BoxGeometry(0.29, 0.022, 0.07), helmet, 0, 0.072, -0.122, helmetG);
  [-1, 1].forEach(sd => { add(new THREE.CylinderGeometry(0.042, 0.042, 0.032, 12), helmet, sd * 0.135, -0.012, 0.012, helmetG).rotation.z = Math.PI / 2; });
  add(new THREE.BoxGeometry(0.28, 0.1, 0.075), white, 0, 0.012, -0.108, head);
  add(new THREE.BoxGeometry(0.215, 0.062, 0.025), lens, 0, 0.012, -0.152, head);
  const strap = add(new THREE.TorusGeometry(0.133, 0.027, 8, 24), white, 0, 0.012, 0, head); strap.rotation.x = Math.PI / 2;
  // outfit extras and hats (toggled by applyOutfit)
  const ex = { trench: new THREE.Group(), santa: new THREE.Group(), vest: new THREE.Group() }; Object.values(ex).forEach(g => torso.add(g));
  const skirt = add(new THREE.CylinderGeometry(0.235, 0.33, 0.62, 24, 1, true), jacket, 0, -0.22, 0, ex.trench); skirt.scale.set(1.2, 1, 0.86);
  [-1, 1].forEach(sd => { const l = add(new THREE.BoxGeometry(0.07, 0.3, 0.02), jacket2, sd * 0.075, 0.42, 0.172, ex.trench); l.rotation.z = -sd * 0.28; });
  add(new THREE.TorusGeometry(0.125, 0.045, 8, 18), jacket, 0, 0.62, 0, ex.trench).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.215, 0.215, 0.05, 22), jacket2, 0, 0.1, 0, ex.trench).scale.set(1.2, 1, 0.84);
  const beltM = M(0x14161a), goldM = M(0xd4af37, { metalness: 0.6, roughness: 0.35 }), furM = M(0xf6f6f2, { roughness: 0.95 });
  add(new THREE.CylinderGeometry(0.226, 0.226, 0.08, 22), beltM, 0, 0.1, 0, ex.santa).scale.set(1.2, 1, 0.84);
  add(new THREE.BoxGeometry(0.09, 0.09, 0.03), goldM, 0, 0.1, 0.182, ex.santa);
  add(new THREE.TorusGeometry(0.118, 0.042, 8, 18), furM, 0, 0.63, 0, ex.santa).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.05, 0.46, 0.02), furM, 0, 0.34, 0.172, ex.santa);
  add(new THREE.TorusGeometry(0.105, 0.03, 8, 18), M(0xf2f3f5), 0, 0.64, 0, ex.vest).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.13, 0.24, 0.012), M(0xf2f3f5), 0, 0.5, 0.168, ex.vest);
  [0.3, 0.2, 0.1].forEach(y => add(new THREE.SphereGeometry(0.016, 8, 6), M(0x2b2e33), 0, y, 0.177, ex.vest));
  const hats = { frog: new THREE.Group(), beanie: new THREE.Group(), santa: new THREE.Group(), purple: new THREE.Group(), camo: new THREE.Group() }; Object.values(hats).forEach(g => head.add(g));
  const frogM = M(0x4aa83a, { roughness: 0.55 }), frogD = M(0x2f7d2a, { roughness: 0.6 }), eyeW = M(0xffffff, { roughness: 0.3 });
  add(new THREE.SphereGeometry(0.15, 24, 14, 0, TAU, 0, Math.PI * 0.55), frogM, 0, 0.012, 0.012, hats.frog).scale.set(1.04, 0.9, 1.04);
  [-1, 1].forEach(sd => {
    add(new THREE.SphereGeometry(0.052, 14, 10), frogM, sd * 0.07, 0.135, -0.055, hats.frog);
    add(new THREE.SphereGeometry(0.044, 14, 10), eyeW, sd * 0.07, 0.15, -0.06, hats.frog);
    add(new THREE.SphereGeometry(0.022, 10, 8), black, sd * 0.07, 0.153, -0.098, hats.frog);
    add(new THREE.SphereGeometry(0.018, 8, 6), frogD, sd * 0.03, 0.1, -0.13, hats.frog).scale.set(1, 0.6, 1);
  });
  [[-0.09, 0.05, 0.06], [0.07, 0.07, 0.09], [0.0, 0.12, 0.1]].forEach(q => add(new THREE.SphereGeometry(0.022, 8, 6), frogD, q[0], q[1] + 0.06, q[2], hats.frog).scale.set(1.4, 0.5, 1.4));
  const bnM = M(0x2f4b9a, { roughness: 0.95 });
  add(new THREE.SphereGeometry(0.15, 24, 14, 0, TAU, 0, Math.PI * 0.58), bnM, 0, 0.012, 0.012, hats.beanie);
  add(new THREE.TorusGeometry(0.146, 0.03, 8, 28), M(0x233a78, { roughness: 0.95 }), 0, -0.016, 0.012, hats.beanie).rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(0.048, 14, 10), M(0xf2f3f5, { roughness: 1 }), 0, 0.185, 0.012, hats.beanie);
  { // rolled-cuff beanies pulled low, one purple with wraparound shades, one in green camo
    const camoT = canvasTex(128, 64, (x, w, h) => { x.fillStyle = "#6f7d4a"; x.fillRect(0, 0, w, h); const r = mulberry(17); for (let i = 0; i < 40; i++) { x.fillStyle = ["#4a5532", "#2e3522", "#9aa36f", "#c2b98f"][i % 4]; x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 10, 3 + r() * 6, r() * 3, 0, 7); x.fill(); } }); camoT.wrapS = camoT.wrapT = THREE.RepeatWrapping;
    for (const [g, mat] of [[hats.purple, M(0x5b3aa8, { roughness: 0.95, side: THREE.DoubleSide })], [hats.camo, M(0xffffff, { roughness: 0.95, map: camoT, side: THREE.DoubleSide })]]) {
      add(new THREE.SphereGeometry(0.152, 24, 14, 0, TAU, 0, Math.PI * 0.62), mat, 0, 0.0, 0.012, g).scale.set(1, 1.08, 1);
      add(new THREE.CylinderGeometry(0.156, 0.158, 0.06, 24, 1, true), mat, 0, -0.02, 0.012, g); }
    const lensMat = M(0x0b0c10, { roughness: 0.08, metalness: 0.7 }), frameMat = M(0x101114, { roughness: 0.4 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.122, 0.05, 24, 1, true, Math.PI - 1.15, 2.3), lensMat); shade.position.set(0, -0.008, 0.015); hats.purple.add(shade);
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.131, 0.131, 0.012, 24, 1, true, Math.PI - 1.2, 2.4), frameMat); fr.position.set(0, 0.018, 0.015); hats.purple.add(fr);
    for (const sd of [-1, 1]) { const arm = add(new THREE.BoxGeometry(0.008, 0.01, 0.13), frameMat, sd * 0.118, 0.012, 0.06, hats.purple); arm.rotation.y = sd * 0.08; } }
  const sHat = new THREE.Group(); sHat.position.set(0, 0.0, 0.015); sHat.rotation.x = 0.55; hats.santa.add(sHat);
  add(new THREE.ConeGeometry(0.145, 0.34, 22), M(0xc4161c, { roughness: 0.85 }), 0, 0.17, 0, sHat);
  add(new THREE.TorusGeometry(0.14, 0.036, 8, 26), furM, 0, 0.012, 0, sHat).rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(0.05, 12, 10), furM, 0, 0.35, 0, sHat);
  const rbTex = canvasTex(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = "#ffd21f"; x.beginPath(); x.arc(64, 64, 44, 0, TAU); x.fill(); x.fillStyle = "#d9232d"; [-1, 1].forEach(sd => { x.beginPath(); x.ellipse(64 + sd * 24, 72, 18, 12, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(64 + sd * 34, 62); x.lineTo(64 + sd * 46, 38); x.lineTo(64 + sd * 26, 56); x.fill(); }); });
  [-1, 1].forEach(sd => { const d = add(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshStandardMaterial({ map: rbTex, transparent: true, roughness: 0.6 }), sd * 0.1415, 0.045, 0.0, helmetG); d.rotation.y = sd * Math.PI / 2; });
  // scarf trailing off the gaiter
  const scarf = [], scarfMat = [M(0xf08a3a), M(0x2f8f8c)]; const scarfG = new THREE.Group(); torso.add(scarfG); let sp = new THREE.Group(); sp.position.set(0.08, 0.66, 0.12); scarfG.add(sp);
  for (let i = 0; i < 6; i++) { const seg = new THREE.Group(); seg.position.z = i ? 0.17 : 0; sp.add(seg); const m = add(new THREE.BoxGeometry(0.11 - i * 0.008, 0.018, 0.18), scarfMat[i % 2], 0, 0, 0.09, seg); scarf.push(seg); sp = seg; }
  // other accessories
  const ninjaG = new THREE.Group(); head.add(ninjaG); const ninjaM = M(0x14161a, { roughness: 0.8 }), ninjaR = M(0xc4161c, { roughness: 0.8 }), ninjaTails = [];
  add(new THREE.TorusGeometry(0.152, 0.02, 8, 30), ninjaM, 0, 0.075, 0.012, ninjaG).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.1, 0.045, 0.012), ninjaR, 0, 0.075, -0.164, ninjaG); add(new THREE.SphereGeometry(0.03, 10, 8), ninjaM, 0, 0.075, 0.17, ninjaG);
  [-1, 1].forEach(sd => { let tp = new THREE.Group(); tp.position.set(sd * 0.02, 0.075, 0.18); ninjaG.add(tp); const chain = []; for (let i = 0; i < 5; i++) { const seg = new THREE.Group(); seg.position.z = i ? 0.13 : 0; tp.add(seg); add(new THREE.BoxGeometry(0.05 - i * 0.004, 0.012, 0.14), ninjaM, 0, 0, 0.07, seg); chain.push(seg); tp = seg; } ninjaTails.push({ chain, sd }); });
  const capeG = new THREE.Group(); capeG.position.set(0, 0.58, 0.16); torso.add(capeG);
  const capeGeo = new THREE.PlaneGeometry(0.5, 0.95, 4, 8); capeGeo.translate(0, -0.475, 0);
  const cape = new THREE.Mesh(capeGeo, new THREE.MeshStandardMaterial({ color: 0xa81420, roughness: 0.7, side: THREE.DoubleSide })); cape.castShadow = true; capeG.add(cape);
  add(new THREE.SphereGeometry(0.035, 8, 6), goldM, -0.2, 0.0, -0.1, capeG); add(new THREE.SphereGeometry(0.035, 8, 6), goldM, 0.2, 0.0, -0.1, capeG);
  const capeBase = Float32Array.from(capeGeo.attributes.position.array);
  const phonesG = new THREE.Group(); head.add(phonesG); const phM = M(0x15181d, { roughness: 0.45, metalness: 0.2 });
  add(new THREE.TorusGeometry(0.162, 0.014, 8, 26, Math.PI), phM, 0, 0.0, 0.012, phonesG);
  [-1, 1].forEach(sd => { const cup = add(new THREE.CylinderGeometry(0.058, 0.058, 0.05, 16), phM, sd * 0.158, -0.01, 0.012, phonesG); cup.rotation.z = Math.PI / 2; const pad = add(new THREE.CylinderGeometry(0.048, 0.048, 0.056, 16), M(0xc4161c, { roughness: 0.6 }), sd * 0.158, -0.01, 0.012, phonesG); pad.rotation.z = Math.PI / 2; });
  const wiredG = new THREE.Group(); torso.add(wiredG); const budM = M(0xf4f5f7, { roughness: 0.35 }), cordM = M(0xf0f1f3, { roughness: 0.5 }), buds = [];
  [-1, 1].forEach(sd => { const b = add(new THREE.SphereGeometry(0.018, 10, 8), budM, sd * 0.112, -0.012, -0.005, head); const st = add(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), budM, sd * 0.112, -0.042, -0.005, head); b.visible = st.visible = false; buds.push(b, st); });
  const cord = new THREE.Mesh(new THREE.BufferGeometry(), cordM); cord.frustumCulled = false; wiredG.add(cord);
  const acc = { scarf: scarfG, ninja: ninjaG, cape: capeG, phones: phonesG, wired: wiredG };
  // arms with elbows, gloves, poles
  const poleMat = M(0xa7b8c9, { metalness: 0.6, roughness: 0.35 }), bambooTex = canvasTex(16, 256, (x, w, h) => { x.fillStyle = "#d2bd72"; x.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const y = 20 + i * 42; x.fillStyle = "#8a7335"; x.fillRect(0, y, w, 5); x.fillStyle = "rgba(255,255,255,0.18)"; x.fillRect(0, y + 6, w, 2); } x.fillStyle = "rgba(90,120,50,0.25)"; x.fillRect(0, 0, 4, h); });
  const armUp = M(0x2f8f8c, { roughness: 0.62, bumpMap: foldTex, bumpScale: 0.025, side: THREE.DoubleSide }), armLo = M(0x2f8f8c, { roughness: 0.62, bumpMap: foldTex, bumpScale: 0.025, side: THREE.DoubleSide });
  const pipeTex = canvasTex(64, 64, (x, w, h) => { x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h); x.fillStyle = "#151618"; x.fillRect(0, 0, w, h); x.fillStyle = "#f4f4f4"; x.fillRect(w * 0.22, 0, 2.5, h); });
  // jacket body prints: across = around the body (front centre at 3/4), down = top of the jacket
  const JT = (draw) => { const t = canvasTex(512, 256, draw); t.wrapS = THREE.RepeatWrapping; return M(0xffffff, { map: t, roughness: 0.62, bumpMap: foldTex, bumpScale: 0.025, side: THREE.DoubleSide }); };
  const zip = (x, w, h, col) => { x.fillStyle = col; x.fillRect(w * 0.75 - 2, 0, 4, h); };
  const jTex = {
    navy: JT((x, w, h) => { x.fillStyle = "#22305c"; x.fillRect(0, 0, w, h); zip(x, w, h, "#8a8f99"); x.fillStyle = "#e3d9c3"; x.fillRect(0, h * 0.86, w, h * 0.14); x.fillStyle = "#22305c"; x.fillRect(0, h * 0.94, w, h * 0.06); x.strokeStyle = "#8a8f99"; x.lineWidth = 3; for (const u of [0.63, 0.87]) { x.beginPath(); x.moveTo(w * u, h * 0.5); x.lineTo(w * (u + (u < 0.75 ? 0.02 : -0.02)), h * 0.78); x.stroke(); } x.fillStyle = "#f4f4f4"; x.font = "italic 13px Arial"; x.save(); x.translate(w * 0.86, h * 0.3); x.scale(-1, 1); x.fillText("summit", 0, 0); x.restore(); }),
    piped: JT((x, w, h) => { x.fillStyle = "#121315"; x.fillRect(0, 0, w, h); zip(x, w, h, "#2a2c30"); x.strokeStyle = "#f2f2f2"; x.lineWidth = 3; for (const c of [0.62, 0.88, 0.12, 0.38]) { const sgn = c < 0.5 ? (c < 0.25 ? 1 : -1) : (c < 0.75 ? 1 : -1); x.beginPath(); for (let i = 0; i <= 40; i++) { const v = i / 40, uu = c + sgn * 0.045 * Math.sin(v * Math.PI * 1.15 + 0.3); i ? x.lineTo(w * uu, h * v) : x.moveTo(w * uu, h * v); } x.stroke(); } x.fillStyle = "#f2f2f2"; x.beginPath(); x.moveTo(w * 0.82, h * 0.3); x.lineTo(w * 0.835, h * 0.27); x.lineTo(w * 0.85, h * 0.3); x.closePath(); x.fill(); x.fillStyle = "#0b0b0c"; x.fillRect(0, h * 0.95, w, h * 0.05); }),
    greenc: JT((x, w, h) => { x.fillStyle = "#e3d9c3"; x.fillRect(0, 0, w, h); x.fillStyle = "#24564a"; x.fillRect(0, 0, w, h * 0.4); zip(x, w, h, "#24564a"); x.strokeStyle = "#1a1c1e"; x.lineWidth = 3; for (const [u0, u1, v0, v1] of [[0.66, 0.68, 0.12, 0.4], [0.84, 0.82, 0.12, 0.4], [0.64, 0.66, 0.5, 0.78], [0.86, 0.84, 0.5, 0.78]]) { x.beginPath(); x.moveTo(w * u0, h * v0); x.lineTo(w * u1, h * v1); x.stroke(); } })
  };
  const arms = [];
  [-1, 1].forEach(sd => {
    const sh = new THREE.Group(); sh.position.set(sd * 0.19, 0.56, 0); torso.add(sh);
    { const m = limb(0.07, 0.06, 0.3, armUp); sh.add(m); shape.arms.push(m); }
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    { const em = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), armLo); el.add(em); shape.elbows.push(em); }
    { const m = limb(0.06, 0.052, 0.3, armLo); el.add(m); shape.arms.push(m); }
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.09, 12), cuffM); cuff.position.y = -0.24; el.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), glove); hand.position.y = -0.335; hand.scale.set(0.95, 1.1, 1.1); el.add(hand);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), glove); thumb.position.set(-sd * 0.045, -0.31, -0.03); el.add(thumb);
    const pg = new THREE.CylinderGeometry(0.011, 0.011, 1.18, 8); pg.translate(0, -0.59, 0);
    const pole = new THREE.Mesh(pg, poleMat); pole.position.y = -0.335; pole.rotation.x = -0.8; el.add(pole);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.13, 8), orange); grip.position.y = -0.06; pole.add(grip);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.012, 12), M(0x14181f)); basket.position.y = -1.05; pole.add(basket);
    arms.push({ sh, el, pole, pole_v: new THREE.Vector3(sd * 0.7, -0.3, 0.8).normalize(), sd });
  });
  const skiBack = new THREE.Group(); torso.add(skiBack); [-1, 1].forEach(sd => { const sb = new THREE.Mesh(new THREE.BoxGeometry(0.095, 1.5, 0.025), skiM); sb.position.set(sd * 0.07, 0.36, 0.22); sb.rotation.z = -sd * 0.1; sb.rotation.x = 0.1; skiBack.add(sb); }); skiBack.visible = false;
  const skiMeshes = []; skiG.forEach(g => g.traverse(o => { if (o.isMesh && o.material === skiM) skiMeshes.push(o); }));
  // parts shown only in the simple style: a white helmet band, a plain grey visor and a skin neck
  const simpleOnly = [];
  { const bandM = add(new THREE.TorusGeometry(0.143, 0.024, 8, 28), M(0xf1f3f6), 0, 0.03, 0.012, head); bandM.rotation.x = Math.PI / 2; bandM.userData.helmetOnly = true; simpleOnly.push(bandM);
    const lensG = lens.clone(); lensG.side = THREE.DoubleSide; const frameG = M(0x1c1f25, { roughness: 0.5 }); frameG.side = THREE.DoubleSide;
    const lensM = new THREE.Mesh(new THREE.CylinderGeometry(0.147, 0.147, 0.072, 20, 1, true, Math.PI - 0.95, 1.9), lensG); lensM.position.set(0, 0.012, 0.012); head.add(lensM); simpleOnly.push(lensM);
    const frM = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.092, 20, 1, true, Math.PI - 1.08, 2.16), frameG); frM.position.set(0, 0.012, 0.012); head.add(frM); simpleOnly.push(frM);
    const nose = add(new THREE.BoxGeometry(0.05, 0.035, 0.04), frameG, 0, -0.02, -0.15, head); simpleOnly.push(nose);
    const strapM = add(new THREE.TorusGeometry(0.15, 0.014, 6, 28), frameG, 0, 0.012, 0.012, head); strapM.rotation.x = Math.PI / 2; simpleOnly.push(strapM);
    simpleOnly.push(add(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 12), skin, 0, -0.1, 0.01, head)); }
  // detail meshes hidden in the simple mannequin style: straps, vents, bands, buckles, goggles and so on
  const detail = [], keep = new Set([...Object.values(hats), ...Object.values(ex), ...acc ? Object.values(acc) : []]), detMats = [black, orange, lens, white, stripeM, gaiter, hair, jacket2, cuffM];
  const inKeep = o => { for (let q = o.parent; q; q = q.parent) if (keep.has(q)) return true; return false; };
  root.traverse(o => { if (o.isMesh && detMats.includes(o.material) && !inKeep(o)) detail.push(o); });
  helmetG.children.forEach(m => { if (m.geometry.type !== "SphereGeometry") detail.push(m); });
  return { cord, buds, head, torso, armUp, armLo, pipeTex, jTex, simpleBody, poleMat, bambooTex, bend, simpleOnly, shape, torsoM, hoodM, detail, skiBack, noseM, midM, skiM, skiTexes, skiMeshes, acc, ninjaTails, capeGeo, capeBase, cuffs, skiG, tailM, mats: { boot, jacket, jacket2, jacketArm, cuffM, pants, pantsLow, helmet, stripeM, skin, scarfMat }, helmetG, hats, ex, root, pivot, rig, legs, hipG, torso, head, arms, scarf, pose: { c: 0.3, lean: 0.2, carve: 0, L: new THREE.Vector3(-0.36, 0.92, -0.3), Rh: new THREE.Vector3(0.36, 0.92, -0.3), headY: 0 }, a, b };
}

const _tv = typeof THREE !== "undefined" ? new THREE.Vector3() : null;
const Y_DOWN = typeof THREE !== "undefined" ? new THREE.Vector3(0, -1, 0) : null;
const _a = typeof THREE !== "undefined" ? { d: new THREE.Vector3(), dir: new THREE.Vector3(), p: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), t: new THREE.Vector3() } : null;
function ikArm(arm, tgt) { // two-bone arm IK in torso space, hand reaches tgt
  const S = arm.sh.position, A = 0.3, B = 0.335, v = _a;
  v.d.copy(tgt).sub(S); let dist = v.d.length();
  const maxR = A + B - 0.012; if (dist > maxR) { v.d.multiplyScalar(maxR / dist); dist = maxR; } if (dist < 0.14) dist = 0.14;
  v.dir.copy(v.d).normalize();
  const cosA = clamp((A * A + dist * dist - B * B) / (2 * A * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  v.p.copy(arm.pole_v); v.p.addScaledVector(v.dir, -v.p.dot(v.dir)).normalize();
  v.e.copy(S).addScaledVector(v.dir, A * cosA).addScaledVector(v.p, A * sinA);
  v.f.copy(v.e).sub(S).normalize(); arm.sh.quaternion.setFromUnitVectors(Y_DOWN, v.f);
  v.f.copy(S).addScaledVector(v.dir, dist).sub(v.e).normalize(); v.q.copy(arm.sh.quaternion).invert(); v.f.applyQuaternion(v.q);
  arm.el.quaternion.setFromUnitVectors(Y_DOWN, v.f);
}
// where each grab puts a hand, in rig space (x right, y up, z back); arm = which hand
const GRAB_POSE = [{ arm: 0, t: [0.12, 0.12, -0.3] }, { arm: 1, t: [0.1, 0.12, -0.12] }, { arm: 1, t: [0.16, 0.12, 0.5] }, { arm: 0, t: [-0.26, 0.12, 0.15] }, { arm: 0, t: [-0.14, 0.16, -0.6] }, { arm: 1, t: [-0.1, 0.12, 0.32] }];

const GRAB_P = { method: { ay: 0.72, az: 0.2, hy: 0.88, pitch: -0.5, cross: 0.1, roll: 1.0, lean: -0.5, twist: 0 }, japan: { ay: 0.95, az: 0.0, hy: 1.0, pitch: 0.05, cross: 0.25, xp: 0.62, roll: 0.1, lean: 0.5, twist: 0.55 }, bike: { ay: 0.5, az: -0.14, hy: 0.9, pitch: 0, cross: 0 }, tail: { ay: 0.64, az: 0.3, hy: 0.9, pitch: -1.15, cross: 0.5 }, nose: { ay: 0.6, az: -0.22, hy: 0.92, pitch: 1.0, cross: 0.4 }, indy: { ay: 0.42, az: 0.04, hy: 0.8, pitch: -0.05, cross: 0 }, safety: { ay: 0.6, az: 0.02, hy: 0.86, pitch: -0.12, cross: 0.05, roll: 0.12, lean: 0.4, twist: -0.2 } };
function poseSkier(dt, time) {
  const R = skierRig, p = R.pose, air = sk.air;
  const flipping = air && Math.abs(sk.rotV) > 2.5, gk = air && !sk.crashed ? (K.grabS ? "safety" : K.grab ? "tail" : K.grabN ? "nose" : K.grabI ? "indy" : K.grabQ ? "japan" : null) : null, grab = !!gk, bikeOn = !!sk.bike, tuck = !air && K.boost && !sk.grind && !sk.crashed;
  const sliding = (sk.grind || sk.boxT > 0.15) && !(K.up || K.down), nbutter = !air && K.up && !K.down && !sk.crashed && !sk.bike && sk.sp > 2, butter = !air && K.down && !K.up && !sk.crashed && !sk.bike && sk.sp > 2;
  const tailT = [0.3, 1.1, 0.55];
  if (gk) p.kind = gk;
  if (grab) { R.rig.updateMatrixWorld(true); (p.kind === "nose" ? R.noseM[1] : p.kind === "safety" ? R.midM[1] : (p.kind === "indy" || p.kind === "japan") ? R.midM[0] : R.tailM[0]).getWorldPosition(_tv); R.rig.worldToLocal(_tv); if (p.kind === "safety") _tv.x += 0.07; tailT[0] = _tv.x; tailT[1] = _tv.y + 0.02; tailT[2] = _tv.z; }
  let c = 0.3, lean = 0.2, L = [-0.36, 0.92, -0.3], Rt = [0.36, 0.92, -0.3], poleThrust = 0;
  p.vt = (p.vt || 0) + (sk.turn - (p.vt || 0)) * (1 - Math.exp(-4.5 * dt)); // the body eases into and out of turns instead of snapping
  const vt = clamp(p.vt, -1, 1), carve = sk.carve * Math.abs(vt), tn = vt;
  if (bikeOn) { c = 0.9; lean = 0.5; L = [-0.3, 0.78, -0.42]; Rt = [0.3, 0.78, -0.42]; }
  else if (sk.crashed) { c = 0.4; lean = 0.2; const w = Math.sin(time * 16); L = [-0.75, 1.45 + w * 0.2, 0.1]; Rt = [0.75, 1.45 - w * 0.2, 0.1]; }
  else if (sk.stumT > 0 && !air) { const w = Math.sin(time * 14); c = 0.55; lean = 0.05; L = [-0.85, 1.25 + w * 0.35, 0.2]; Rt = [0.85, 1.25 - w * 0.35, 0.2]; }
  else if (sk.chg > 0.02 && !air) { const q = sk.chg; c = 0.3 + 0.62 * q; lean = 0.2 + 0.55 * q; L = [-0.45 - 0.1 * q, 0.9 - 0.4 * q, -0.1 + 0.45 * q]; Rt = [0.45 + 0.1 * q, 0.9 - 0.4 * q, -0.1 + 0.45 * q]; poleThrust = 0; }
  else if (sk.grind && K.grabI && !sk.crashed) { c = 0.35; lean = -0.42; L = [-0.85, 1.55, 0.35]; Rt = [0.9, 1.3, -0.25]; } // backslide: lean back, arms flung out
  else if (sliding) { c = 0.55; lean = 0.3; L = [-0.7, 1.0, -0.2]; Rt = [0.7, 1.0, -0.2]; }
  else if (grab) {
    c = 0.93; lean = 0.62; L = [-0.82, 1.2, -0.1]; Rt = [0.82, 1.2, -0.1];
    c = 0.9; lean = GRAB_P[p.kind || "tail"].lean !== undefined ? GRAB_P[p.kind || "tail"].lean : 0.15; L = [-0.75, 1.1, -0.05]; Rt = tailT;
  }
  else if (flipping && sk.rotV > 0) { c = -0.12; lean = -0.3; L = [-0.78, 1.18, 0.12]; Rt = [0.78, 1.18, 0.12]; } // laid-out backflip: body straight, legs long, arms out wide
  else if (flipping) { c = 0.96; lean = 0.95; L = [-0.2, 0.5, -0.34]; Rt = [0.2, 0.5, -0.34]; }
  else if (air) { c = 0.5; lean = 0.25; L = [-0.78, 1.32, -0.05]; Rt = [0.78, 1.32, -0.05]; }
  else if (nbutter) { c = 0.62; lean = 0.6; L = [-0.75, 0.95, -0.3]; Rt = [0.75, 0.95, -0.3]; }
  else if (butter) { c = 0.6; lean = -0.12; L = [-0.78, 0.98, -0.05]; Rt = [0.78, 0.98, -0.05]; }
  else if (tuck) { c = 0.86; lean = 1.05; L = [-0.2, 0.64, -0.62]; Rt = [0.2, 0.64, -0.62]; }
  else if (sk.pumpT > 0) { c = 0.82; lean = 0.95; L = [-0.28, 0.72, -0.5]; Rt = [0.28, 0.72, -0.5]; poleThrust = 1; }
  else { // riding: carve opens the inside arm and drops the inside hip
    c = 0.3 + 0.12 * carve; lean = 0.22 + 0.1 * carve;
    L = [-0.36 - 0.1 * carve * (tn > 0 ? 0 : 1), 0.92 - 0.12 * carve * (tn < 0 ? 1 : 0), -0.3 - 0.14 * carve * (tn > 0 ? 1 : 0)];
    Rt = [0.36 + 0.1 * carve * (tn > 0 ? 1 : 0), 0.92 - 0.12 * carve * (tn > 0 ? 1 : 0), -0.3 - 0.14 * carve * (tn < 0 ? 1 : 0)];
    if (sk.sp < 3.5) { c = 0.25 + 0.03 * Math.sin(time * 2); }
  }
  // the legs soak up the terrain: crouch when the slope flattens, extend when it steepens
  { const vg = air ? 0 : sk.sp * Math.sin(sA_(sk.x, sk.s, sk.psi)), acc = (vg - (p.vgPrev || 0)) / Math.max(dt, 1e-3); p.vgPrev = vg;
    p.abs = (p.abs || 0) + (clamp(air ? 0 : acc * 0.012, -0.25, 0.4) - (p.abs || 0)) * Math.min(1, 7 * dt); c += p.abs; }
  if (!air && !sliding && !sk.crashed) { L[1] += 0.03 * Math.sin(time * 2.6); Rt[1] += 0.03 * Math.sin(time * 2.6 + 1.7); }
  // landing squash and take-off extension
  if (sk.landT > 0) c += 0.5 * Math.sin(Math.PI * sk.landT / 0.35);
  if (sk.popT > 0) c -= 0.28 * (sk.popT / 0.2);
  const k = 1 - Math.exp(-(air ? 11 : 6.5) * dt), kh = 1 - Math.exp(-(air || grab ? 14 : 7.5) * dt);
  p.c += (c - p.c) * k; p.lean += (lean - p.lean) * k; p.carve += (carve - p.carve) * k;
  p.L.x += (L[0] - p.L.x) * kh; p.L.y += (L[1] - p.L.y) * kh; p.L.z += (L[2] - p.L.z) * kh;
  p.Rh.x += (Rt[0] - p.Rh.x) * kh; p.Rh.y += (Rt[1] - p.Rh.y) * kh; p.Rh.z += (Rt[2] - p.Rh.z) * kh;
  // legs: two-bone IK, feet stay on the skis; tail grab swings the feet up and back, skis crossed
  p.tg = (p.tg || 0) + ((grab || bikeOn ? 1 : 0) - (p.tg || 0)) * Math.min(1, 12 * dt); const tg = p.tg, GP = GRAB_P[bikeOn ? "bike" : (p.kind || "tail")];
  p.bt = (p.bt || 0) + ((butter ? 1 : 0) - (p.bt || 0)) * Math.min(1, 9 * dt); p.nb = (p.nb || 0) + ((nbutter ? 1 : 0) - (p.nb || 0)) * Math.min(1, 9 * dt); const bt = p.bt, nb = p.nb;
  const dh = (R.a + R.b) * (0.97 - 0.42 * clamp(p.c, -0.2, 1.1)), foot = 0.26, ankY = lerp(foot, GP.ay, tg) + 0.34 * (bt + nb), ankZ = GP.az * tg + 0.12 * bt - 0.12 * nb, hipY = lerp(foot + dh, GP.hy, tg) + 0.3 * (bt + nb);
  const inside = p.carve * tn * 0.07; // hips drop toward the inside of a carve
  // each leg works on its own: knees flex out of step, the inside ski leads and is unweighted a little in a turn, skis wander a touch apart
  const natT = !air && !sliding && !sk.crashed && !bikeOn && !sk.finished ? (1 - tg) * (1 - Math.max(bt, nb)) : 0; p.nt = (p.nt || 0) + (natT - (p.nt || 0)) * Math.min(1, 4 * dt);
  const nk = p.nt, spdN = clamp(sk.sp / 22, 0, 1.4), cvA = p.carve * Math.abs(tn);
  const LP = [0, 1].map(i => {
    const wIn = clamp((i === 0 ? 1 : -1) * tn * 2.5, 0, 1), isIn = wIn > 0.5;
    const dc = nk * (0.08 * Math.sin(time * 2.1 + i * 2.6) + 0.012 * spdN * Math.sin(time * 5.3 + i * 4.1) + lerp(-0.04, 0.17, wIn) * cvA);
    const lift = nk * (0.035 * Math.max(0, Math.sin(time * 1.7 + i * 3.1)) + 0.04 * wIn * cvA);
    const dz = nk * (0.07 * Math.sin(time * 1.45 + i * 2.2) + lerp(0.04, -0.12, wIn) * cvA);
    const bsLeg = i === 0 ? (p.bsl || 0) : 0, hY = hipY - dc * 0.3 - nk * 0.012 * Math.sin(time * 2.6 + i * Math.PI), aY = ankY + lift + 0.38 * bsLeg, aZ = ankZ + dz - 0.28 * bsLeg;
    const ddy = hY - aY, dist = Math.min(Math.hypot(ddy, aZ), R.a + R.b - 0.005), phi = Math.atan2(aZ, ddy);
    const cosA = clamp((R.a * R.a + dist * dist - R.b * R.b) / (2 * R.a * dist), -1, 1), th = Math.acos(cosA), t1 = th - phi;
    const kf = R.a * Math.sin(t1), t2 = Math.atan2(-aZ - kf, ddy - R.a * Math.cos(t1));
    return { t1, t2, hY, aY, aZ, isIn, yaw: (p.hb || 0) * (i ? -0.13 : 0.13) + nk * (0.06 * Math.sin(time * 1.2 + i * 2.4) + 0.012 * Math.sin(time * 2.1 + i * 0.9) * spdN + (i ? 0.02 : -0.02)), roll: -tn * nk * lerp(0.02, 0.09, wIn) * p.carve, w: nk * 0.022 * Math.sin(time * 0.8 + i * 1.9) - (p.hb || 0) * 0.02 };
  });
  R.legs.forEach((l, i) => { const P = LP[i]; l.hip.position.set(l.x - inside + (i ? 1 : -1) * P.w, P.hY, 0.04); l.hip.rotation.x = P.t1; l.hip.rotation.z = -tn * p.carve * 0.12 + -tn * 0.06 * cvA * (i === 0 ? clamp(tn * 2.5, 0, 1) : clamp(-tn * 2.5, 0, 1)) + (i ? 1 : -1) * 0.03 * nk * Math.sin(time * 1.9 + i); l.knee.rotation.x = P.t2 - P.t1; });
  p.gs = (p.gs || 0) + ((sk.grind && !sk.crashed ? 1 : 0) - (p.gs || 0)) * (1 - Math.exp(-9 * dt)); const gs = p.gs;
  p.bsl = (p.bsl || 0) + ((sk.grind && K.grabI && !sk.crashed ? 1 : 0) - (p.bsl || 0)) * (1 - Math.exp(-10 * dt)); const bsl = p.bsl;
  const swp = sk.bikeJump ? clamp(sk.airT / 0.45, 0, 1) : 1, ease = 1 + 2.7 * Math.pow(swp - 1, 3) + 1.7 * Math.pow(swp - 1, 2);
  if (sk.bikeJump && !sk.swapDone && swp > 0.05) { sk.swapDone = true; spray(sk.x, sk.y + 0.2, sk.s, 16, 6); }
  if (sk.bikeJump && swp >= 1) sk.bikeJump = false;
  R.bend.forEach(b => b.upd(bt, nb));
  { // baggy trousers that billow and flutter in the wind
    const sm = outfit.style === "simple", spd = sk.crashed ? 0 : (air ? Math.hypot(sk.vx, sk.vs) : sk.sp), w = clamp(spd / 28, 0, 1.4) + 0.12, t = time;
    R.shape.thighs.forEach((m, i) => { const f = 1 + 0.03 * w * Math.sin(t * 9 + i * 2.1); m.scale.set((sm ? 1.54 : 1.15) * f, 1, (sm ? 1.44 : 1.15) * (1 + 0.03 * w * Math.sin(t * 8 + i))); m.rotation.z = 0.025 * w * Math.sin(t * 9 + i * 1.7); });
    R.shape.knees.forEach(m => m.scale.set(sm ? 1.52 : 1, sm ? 1.25 : 1, sm ? 1.48 : 1));
    if (R.simpleBody && R.simpleBody.visible) { // jacket hem and chest ripple in the wind
      const g = R.simpleBody.geometry, base = g.userData.base, pa = g.attributes.position.array, nR = g.userData.nR, nA = g.userData.nA, amp = 0.045 * w;
      for (let i = 0; i <= nR; i++) { const tt = i / nR, k = Math.pow(1 - tt, 1.4) * amp + 0.25 * amp * Math.sin(tt * Math.PI); for (let a = 0; a < nA; a++) { const o = (i * nA + a) * 3, bx = base[o], bz = base[o + 2], r = Math.hypot(bx, bz) || 1, ang = a / nA * Math.PI * 2, f = k * (Math.sin(t * 13 + ang * 3 + tt * 6) * 0.6 + Math.sin(t * 21 + ang * 5) * 0.4); pa[o] = bx + bx / r * f; pa[o + 2] = bz + bz / r * f + k * 0.5 * Math.sin(t * 9 + ang * 2); pa[o + 1] = base[o + 1] + 0.012 * amp * 10 * Math.sin(t * 17 + ang * 4) * (1 - tt); } }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }
    R.shape.arms.forEach((m, i) => { const f = (1 + 0.04 * w * Math.sin(t * 11 + i * 1.7)) * (R.bag || 1); m.scale.set((sm ? 1.38 : 1) * f, 1, (sm ? 1.38 : 1) * (1 + 0.04 * w * Math.sin(t * 9 + i)) * (R.bag || 1));
    if (R.acc.wired && R.acc.wired.visible) updCord(R, w, t); });
    R.shape.shins.forEach((m, i) => { const f = 1 + 0.05 * w * Math.sin(t * 17 + i * 1.3 + 1); m.scale.set((sm ? 1.58 : 1.35) * f, 1, (sm ? 1.58 : 1.35) * (1 + 0.05 * w * Math.sin(t * 14 + i * 2))); m.rotation.z = 0.04 * w * Math.sin(t * 11 + i * 2.4); m.rotation.x = 0.035 * w * Math.sin(t * 15 + i); });
    R.cuffs.forEach((m, i) => { const f = 1 + 0.07 * w * Math.sin(t * 21 + i * 1.9); m.scale.set((sm ? 1.78 : 1.5) * f, 1.2 + 0.1 * w * Math.sin(t * 19 + i), (sm ? 1.78 : 1.5) * (1 + 0.07 * w * Math.sin(t * 18 + i * 0.7))); m.rotation.z = 0.08 * w * Math.sin(t * 13 + i * 2.2); m.rotation.x = 0.07 * w * Math.sin(t * 17 + i); });
  }
  R.skiBack.visible = bikeOn || (sk.bikeJump && swp < 0.3); R.skiBack.scale.setScalar(bikeOn ? 1 : Math.max(0.01, 1 - swp / 0.3));
  R.skiG.forEach((sg, i) => { const P = LP[i]; sg.visible = !bikeOn && swp > 0.05; sg.scale.setScalar(bikeOn ? 0.01 : Math.max(0.01, ease)); sg.position.set((i ? 0.13 : -0.13) + (i ? 1 : -1) * P.w, 0.2 + (P.aY - foot), 0.06 + P.aZ); sg.rotation.x = GP.pitch * tg + (i ? -1 : 1) * (GP.xp || 0) * tg + 0.5 * bt - 0.5 * nb + 0.05 * (P.aY - ankY); sg.rotation.y = (i ? -1 : 1) * GP.cross * tg + P.yaw + gs * (i ? -0.16 : 0.1); sg.rotation.z = (i ? 1 : -1) * (GP.roll || 0) * tg + P.roll + gs * (i ? 0.08 : -0.05); sg.rotation.x += gs * (i ? 0.2 : -0.17) + (i ? 0 : 0.6 * (p.bsl || 0)); sg.position.z += gs * (i ? -0.09 : 0.09); });
  R.hipG.position.set(-inside, hipY + 0.02 - 0.15 * (LP[0].hY + LP[1].hY - 2 * hipY) * -1, 0.04 + 0.04 * p.c); R.hipG.rotation.set(0, nk * (0.05 * Math.sin(time * 1.1) - tn * p.carve * 0.12), nk * 0.6 * (LP[1].hY - LP[0].hY)); R.hipG.updateMatrix();
  R.torso.rotation.y = air ? (GP.twist || 0) * tg : -tn * p.carve * 0.28 - vt * 0.06 + 0.025 * Math.sin(time * 0.9); R.torso.rotation.x = -p.lean; R.torso.rotation.z = tn * p.carve * 0.16 + (air ? 0 : 0); R.torso.scale.y = 1 + 0.006 * Math.sin(time * 3.2);
  R.torso.updateMatrix();
  // arms: targets are in rig space, convert to torso space
  _a.m.copy(R.hipG.matrix).multiply(R.torso.matrix).invert();
  R.arms.forEach((arm, i) => { _a.t.copy(i ? p.Rh : p.L).applyMatrix4(_a.m); ikArm(arm, _a.t); arm.pole.visible = !bikeOn && (!grab || i === 0); arm.pole.rotation.x = -0.8 + 0.5 * poleThrust * Math.sin(time * 30) ; });
  // head looks into the turn
  p.headY += (-sk.turn * 0.5 - p.headY) * Math.min(1, 6 * dt);
  p.hb = (p.hb || 0) + ((air && !sk.crashed && sk.rotV > 2.5 ? 1 : 0) - (p.hb || 0)) * (1 - Math.exp(-7 * dt)); // laid-out backflip: chin up, head back
  R.head.rotation.y = p.headY; R.head.rotation.x = p.lean * 0.55 + 0.85 * p.hb; R.head.position.set(0, 0.8 - 0.035 * p.hb, 0.055 * p.hb);
  // scarf streams behind with speed
  const spd = clamp((air ? Math.hypot(sk.vx, sk.vs) : sk.sp) / 26, 0, 1);
  if (outfit.accessory === "ninja") R.ninjaTails.forEach((t, k) => t.chain.forEach((seg, i) => { seg.rotation.x = lerp(0.35, -0.1, spd) - 0.12 * i * (1 - spd) + 0.16 * Math.sin(time * 10 + i * 0.9 + k * 1.7) * (0.3 + spd); seg.rotation.y = t.sd * (0.18 + 0.1 * i * spd) - sk.turn * 0.2 + 0.18 * Math.sin(time * 8 + i * 1.3 + k) * spd; }));
  if (outfit.accessory === "cape") { const pa = R.capeGeo.attributes.position, b0 = R.capeBase, drag = 0.1 + spd * 0.75; for (let v = 0; v < pa.count; v++) { const x0 = b0[v * 3], y0 = b0[v * 3 + 1], t = clamp(-y0 / 0.95, 0, 1); pa.setXYZ(v, x0 * (1 + 0.15 * t), y0 * (1 - 0.25 * spd * t), t * drag + 0.05 * Math.sin(time * 9 + t * 6 + x0 * 7) * t * (0.4 + spd) + (air ? 0.2 * t : 0)); } pa.needsUpdate = true; R.capeGeo.computeVertexNormals(); }
  R.scarf.forEach((seg, i) => { seg.rotation.x = lerp(0.55, -0.12, spd) + 0.14 * Math.sin(time * 9 + i * 0.9) * (0.4 + spd); seg.rotation.y = -sk.turn * 0.22 + 0.12 * Math.sin(time * 7 + i * 1.3) * spd; });
}

return {
  JACKETS, PANTS, OUTFIT_OPTS, OUTFIT_DEFAULT, PHYS,
  build(of) { outfit = Object.assign({}, OUTFIT_DEFAULT, of || {}); const R = buildSkier(); R.outfit = outfit; applyOutfit(R); R.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); return R; },
  dress(R, of) { outfit = R.outfit = Object.assign({}, OUTFIT_DEFAULT, of || {}); applyOutfit(R); },
  pose(R, state, keys, slope, dt, time) { sk = state; K = keys; skierRig = R; outfit = R.outfit; slopeNow = slope; poseSkier(dt, time); }
};
})();
