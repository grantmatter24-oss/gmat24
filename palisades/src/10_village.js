/* ---------- the village on foot: cobbled plaza, people walking, and shops you can walk into ----------
   The ground between the village buildings is cobblestone. People walk about it. Each shop is a real room inside its building: the wall is
   open at the shop front, with glass you can see through from both sides, so you simply ski or walk in through the door. At a counter,
   E is served: a gear shop opens your outfit. */
const SHOP_LIST = [ // names as I recall them from the Village at Palisades Tahoe; kind decides how the room is fitted out
  ["Parallel Mountain Sports", "ski"], ["The North Face", "wear"], ["Alice's Mountain Market", "market"], ["Fireside Pizza Co.", "food"], ["Auld Dubliner", "bar"], ["Tremigo Mexican Kitchen", "food"],
  ["Coffeebar", "cafe"], ["Gallery Keoki", "art"], ["Estelle Sports", "ski"], ["Mamasake Sushi", "food"], ["Uncorked", "bar"], ["Wildflour Baking Co.", "cafe"], ["Patagonia", "wear"], ["Euro Sweets", "market"]
];
const SHOPS = [], WALKERS = []; let nearCounter = null, walkParts = null;
const shopInside = (s, x, z) => { const rx = x - s.dx, rz = z - s.dz, u = rx * s.tx + rz * s.tz, w = rx * s.nx + rz * s.nz; return (Math.abs(u) < s.hw && w > 0.25 && w < s.D) || (Math.abs(u) < 0.62 && w > -0.7 && w <= 0.25); };
function planShops() { // before the buildings are built: choose the shop fronts and fit a room behind each, so the walls can be left open there
  const skip = /lifthouse|lift base|express base|funitel base|venture base|exhibition base|silverado base|lady base|chair base|shirley|clock tower|gold coast/i, cen = bd => { let x = 0, z = 0; for (const q of bd.p) { x += q[0] / bd.p.length; z += q[1] / bd.p.length; } return [x, z]; };
  // The main village: the tall lodge buildings standing together just behind the Funitel and tram bases.
  const fu = WORLD.lifts.find(l => l.t === "funitel"), tr = WORLD.lifts.find(l => l.t === "tram"); if (!fu) return; const b0 = fu.pts[0];
  const core = WORLD.blds.filter(bd => !skip.test(bd.n || "") && bd.h >= 11.5 && polyArea(bd.p) > 800).map(cen).filter(c => Math.hypot(c[0] - b0[0], c[1] - b0[1]) < 330); if (core.length < 3) return;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const c of core) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); z0 = Math.min(z0, c[1]); z1 = Math.max(z1, c[1]); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rb = (z1 - z0) / 2 + 24, ra = (x1 - x0) / 2 + 40; PLAZA.x = cx; PLAZA.z = cz; PLAZA.r = rb; PLAZA.asp = ra / rb; U.uPlaza.value.set(cx, cz, rb, ra / rb);   // an oval laid along the village
  const near = WORLD.blds.filter(bd => !skip.test(bd.n || "") && polyArea(bd.p) > 250).map(bd => ({ bd, c: cen(bd) })).filter(q => plazaD(q.c[0], q.c[1]) < PLAZA.r * 1.12);
  const cands = [], c2h = bd => Math.min(1, bd.h / 12);
  for (const { bd } of near) { const P = bd.p, n = P.length; for (let i = 0; i < n; i++) { const a = P[i], c = P[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 7.4) continue;
    const tx = (c[0] - a[0]) / len, tz = (c[1] - a[1]) / len, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, sg = inPoly(P, mx - tz * 0.4, mz + tx * 0.4) ? -1 : 1, ox = -tz * sg, oz = tx * sg, dP = Math.hypot(mx - cx, mz - cz); if (plazaD(mx + ox * 3, mz + oz * 3) > PLAZA.r - 4) continue;
    if (near.some(q => inPoly(q.bd.p, mx + ox * 2.5, mz + oz * 2.5) || inPoly(q.bd.p, mx + ox * 5, mz + oz * 5))) continue;   // the door must open onto the plaza, not onto another wall
    const face = ((cx - mx) * ox + (cz - mz) * oz) / (dP || 1); cands.push({ bd, i, len, tx, tz, mx, mz, nx: -ox, nz: -oz, sc: face * 0.6 + Math.min(len, 14) / 14 + c2h(bd) }); } }
  cands.sort((p, q) => q.sc - p.sc); const perB = new Map();   // the tall hotel buildings first, their longest clear walls
  for (const c of cands) { if (SHOPS.length >= SHOP_LIST.length) break; if ((perB.get(c.bd) || 0) >= 3) continue; let fit = null;
    for (let hw = Math.min(4.6, c.len / 2 - 0.5); hw >= 3 && !fit; hw -= 0.4) for (let D = 8; D >= 4.5 && !fit; D -= 0.5) { const pts = [[-hw, 0.4], [hw, 0.4], [-hw, D + 0.3], [hw, D + 0.3], [0, D + 0.3], [-hw, D / 2], [hw, D / 2]].map(q => [c.mx + c.tx * q[0] + c.nx * q[1], c.mz + c.tz * q[0] + c.nz * q[1]]);
      if (pts.every(q => inPoly(c.bd.p, q[0], q[1])) && !SHOPS.some(s => pts.some(q => shopInside({ dx: s.dx, dz: s.dz, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, hw: s.hw + 0.5, D: s.D + 0.5 }, q[0], q[1])) || Math.hypot(s.dx + s.nx * s.D / 2 - c.mx - c.nx * D / 2, s.dz + s.nz * s.D / 2 - c.mz - c.nz * D / 2) < (s.hw + hw) * 0.9)) fit = { hw, D }; }
    if (!fit) continue; const [name, kind] = SHOP_LIST[SHOPS.length], openW = Math.min(2 * fit.hw - 0.6, c.len - 1.2); let fy = -1e9; for (const u of [-1, 0, 1]) for (const w of [-1.2, 0.2, fit.D / 2, fit.D]) fy = Math.max(fy, H(c.mx + c.tx * u * fit.hw + c.nx * w, c.mz + c.tz * u * fit.hw + c.nz * w));
    const s = { name, kind, bd: c.bd, dx: c.mx, dz: c.mz, tx: c.tx, tz: c.tz, nx: c.nx, nz: c.nz, hw: fit.hw, D: fit.D, openW, floorY: fy + 0.05, obst: [] }; SHOPS.push(s); perB.set(c.bd, (perB.get(c.bd) || 0) + 1);
    (c.bd.shopEdges || (c.bd.shopEdges = {}))[c.i] = { s0: c.len / 2 - openW / 2, s1: c.len / 2 + openW / 2, yF: s.floorY, yT: s.floorY + 2.75 }; }
  { const par = SHOPS.find(q => q.name === "Parallel Mountain Sports"); let nb = null, nd = 1e9; for (const q of SHOPS) { const d = Math.hypot(q.dx - b0[0], q.dz - b0[1]); if (d < nd) { nd = d; nb = q; } }   // the ski shop is the first one you reach from the lifts
    if (par && nb && nb !== par) { const t = [nb.name, nb.kind]; nb.name = par.name; nb.kind = par.kind; par.name = t[0]; par.kind = t[1]; } }
}
/* ---- Parallel Mountain Sports: skis and clothes for your locker ----
   Everything the locker can hold is on sale here. Press E in the shop to browse, pick things up (you wear them at once), then pay at the
   counter with your trick points, or run for the door with Shift. Either way they end up in your locker; run, and the alarm goes. */
const STORE_CATS = [["skis", "Skis", 2500], ["jacket", "Jackets", 1800], ["pants", "Pants", 1200], ["helmet", "Hats and helmets", 900], ["accessory", "Accessories", 600], ["poles", "Poles", 500]];
const OWNED = store.get("pal-owned", null) || {}; let basket = [], ownDone = false;
function ownInit() { if (ownDone) return; ownDone = true; for (const [cat] of STORE_CATS) { const a = Array.isArray(OWNED[cat]) ? OWNED[cat] : (OWNED[cat] = []); for (const k of [outfit[cat], KR.OUTFIT_DEFAULT[cat]]) if (k && !a.includes(k)) a.push(k); } store.set("pal-owned", OWNED); }
const owns = (cat, k) => Array.isArray(OWNED[cat]) && OWNED[cat].includes(k), isGear = s => s && (s.kind === "ski" || s.kind === "wear");
const priceOf = cat => Math.round(STORE_CATS.find(q => q[0] === cat)[2] * (1 - Math.min(0.5, 0.1 * medalPoints())) / 10) * 10, basketTotal = () => basket.reduce((a, b) => a + priceOf(b.cat), 0);
function basketWear() { const of = Object.assign({}, outfit); for (const b of basket) of[b.cat] = b.k; KR.dress(rig, of); }
function storeOpen(s) {
  ownInit(); const card = $("storeCard"), el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }; card.textContent = "";
  card.append(el("h3", s.name), el("p", "Your points: " + Math.round(sk.pts).toLocaleString() + (basket.length ? "  ·  Carrying " + basket.length + (basket.length === 1 ? " item" : " items") + ", " + basketTotal().toLocaleString() + " pts" : "") + ".  Pick things up, then pay at the counter (E) or run out with Shift.", "compLead"));
  for (const [cat, title] of STORE_CATS) { const box = el("div", null, "venue"); box.append(el("b", title + "  ·  " + priceOf(cat).toLocaleString() + " pts each")); const grid = el("div", null, "storeGrid");
    for (const k in KR.OUTFIT_OPTS[cat]) { const row = el("div", null, "storeItem"), has = owns(cat, k), inB = basket.some(b => b.cat === cat && b.k === k); row.append(el("span", KR.OUTFIT_OPTS[cat][k]));
      if (has) row.append(el("i", "in your locker")); else { const bt = el("button", inB ? "Put back" : "Pick up", "join"); if (inB) bt.style.background = "#5b6b7a"; bt.addEventListener("click", () => { basket = basket.filter(b => b.cat !== cat); if (!inB) basket.push({ cat, k }); basketWear(); storeOpen(s); }); row.append(bt); }
      grid.append(row); } box.append(grid); card.append(box); }
  const rw = el("div", null, "row"), close = el("button", "Back to the shop floor", "btn"); rw.style.justifyContent = "center"; close.addEventListener("click", () => { setOverlay("store", false); paused = false; }); rw.append(close); card.append(rw);
  setOverlay("store", true); paused = true;
}
function basketKeep(paid) { for (const b of basket) { if (!owns(b.cat, b.k)) OWNED[b.cat].push(b.k); outfit[b.cat] = b.k; } basket = []; store.set("pal-owned", OWNED); store.set("pal-outfit", outfit); store.set("pal-pts", Math.round(sk.pts)); KR.dress(rig, outfit); gearLocks(); document.querySelectorAll("#fitRows select").forEach(sl => { if (sl.dataset.cat && outfit[sl.dataset.cat]) sl.value = outfit[sl.dataset.cat]; }); }
function storePay() { const t = basketTotal(); if (sk.pts < t) return toast("That is " + t.toLocaleString() + " pts and you have " + Math.round(sk.pts).toLocaleString() + ". Put something back, earn more with tricks, or run.", 4);
  sk.pts -= t; const n = basket.length; basketKeep(true); sfx("land"); toast("Paid " + t.toLocaleString() + " pts. " + (n === 1 ? "It is" : "They are") + " in your locker.", 3); }
function textPlate(txt, bg, fg) { const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 1024, 128); g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; let fs = 78; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; while (g.measureText(txt).width > 960 && fs > 28) { fs -= 4; g.font = "800 " + fs + "px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; } g.fillText(txt, 512, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshBasicMaterial({ map: t }); }
function initPlaza() {
  if (!PLAZA.r) return; const ext = new GeoBag(), inn = new GeoBag(), gl = new GeoBag(), plates = [];
  const WOOD = [0.52, 0.38, 0.24], DARK2 = [0.17, 0.12, 0.08], STEELc = [0.6, 0.62, 0.65], WHITE = [0.9, 0.89, 0.86], CLOTH = [[0.75, 0.1, 0.08], [0.1, 0.3, 0.7], [0.9, 0.7, 0.1], [0.1, 0.5, 0.3], [0.5, 0.2, 0.6], [0.92, 0.92, 0.94], [0.1, 0.1, 0.12], [0.9, 0.45, 0.1]];
  SHOPS.forEach((s, si) => { const yaw = Math.atan2(s.nx, s.nz), F = s.floorY, hw = s.hw, D = s.D, oW = s.openW / 2;
    const L = (u, y, w) => [s.dx + s.tx * u + s.nx * w, F + y, s.dz + s.tz * u + s.nz * w], bx = (bag, wu, h, dw, u, y, w, c, ry) => { const p = L(u, y, w); bag.box(wu, h, dw, p[0], p[1], p[2], c, yaw + (ry || 0)); }, cy = (bag, r0, r1, h, u, y, w, c, seg) => { const p = L(u, y, w); bag.cyl(r0, r1, h, p[0], p[1], p[2], c, seg || 8); };
    const block = (u, w, r) => { const p = L(u, 0, w); s.obst.push([p[0], p[2], r]); towerHits.push({ x: p[0], z: p[2], r }); };
    // the shop front: timber frame, stall risers, clear glass either side of an open door, awning and sign
    const col = [[0.55, 0.12, 0.1], [0.1, 0.25, 0.45], [0.12, 0.35, 0.2], [0.6, 0.42, 0.08]][si % 4];
    for (const u of [-oW, -0.68, 0.68, oW]) bx(ext, 0.12, 2.75, 0.16, u, 1.375, 0, DARK2); bx(ext, s.openW + 0.12, 0.16, 0.18, 0, 2.68, 0, DARK2); bx(ext, 1.36, 0.1, 0.16, 0, 2.2, 0, DARK2);
    for (const sd of [-1, 1]) { const w2 = oW - 0.74, uc = sd * (0.74 + w2 / 2); bx(ext, w2, 0.5, 0.16, uc, 0.25, 0, WOOD); bx(gl, w2 - 0.08, 1.98, 0.02, uc, 1.52, 0, [1, 1, 1]); bx(ext, w2, 0.06, 0.28, uc, 0.53, 0.06, WOOD); }
    bx(gl, 1.24, 0.36, 0.02, 0, 2.42, 0, [1, 1, 1]); bx(ext, 0.07, 2.1, 1.0, -0.66, 1.05, 0.52, DARK2);                                              // transom; the door stands open against the wall inside
    bx(ext, s.openW + 0.8, 0.1, 1.5, 0, 2.98, -0.72, col); bx(ext, s.openW + 0.8, 0.28, 0.05, 0, 2.86, -1.46, col); bx(ext, Math.min(5.4, s.openW), 0.7, 0.1, 0, 3.6, -0.07, [0.12, 0.08, 0.05]);
    plates.push([L(0, 3.6, -0.13), Math.atan2(-s.nx, -s.nz), s.name, Math.min(5.2, s.openW - 0.2), 0.6]);
    // the room: plank floor, plastered walls, lit ceiling
    const wallC = s.kind === "bar" ? [0.34, 0.22, 0.14] : s.kind === "art" ? [0.86, 0.84, 0.8] : s.kind === "cafe" ? [0.78, 0.7, 0.58] : [0.76, 0.72, 0.64];
    bx(inn, 2 * hw, 0.1, D, 0, -0.05, D / 2 + 0.1, WOOD); for (let k = -Math.floor(hw / 0.9); k <= hw / 0.9; k++) bx(inn, 0.02, 0.012, D, k * 0.9, 0.003, D / 2 + 0.1, DARK2); bx(inn, 2 * hw, 0.1, D, 0, 2.95, D / 2 + 0.1, WHITE);
    for (const sd of [-1, 1]) { bx(inn, 0.12, 3, D, sd * (hw + 0.06), 1.45, D / 2 + 0.1, wallC); bx(inn, 0.06, 0.9, D, sd * (hw - 0.03), 0.45, D / 2 + 0.1, DARK2); if (hw - oW > 0.15) bx(inn, hw - oW, 3, 0.1, sd * (hw + oW) / 2, 1.45, 0.14, wallC); }
    bx(inn, 2 * hw + 0.2, 3, 0.12, 0, 1.45, D + 0.16, wallC); bx(inn, s.openW, 0.2, 0.1, 0, 2.86, 0.14, wallC);
    for (let k = -1; k <= 1; k++) for (const w of [D * 0.3, D * 0.7]) { bx(inn, 0.9, 0.04, 0.22, k * hw * 0.6, 2.88, w, [1.7, 1.6, 1.3]); }                              // strip lights
    const cu = hw - 1.9, cw = D - 1.0; // the counter, toward the back on one side, with someone behind it
    bx(inn, 3.0, 1.0, 0.65, cu, 0.5, cw, DARK2); bx(inn, 3.1, 0.06, 0.75, cu, 1.03, cw, WOOD); bx(inn, 0.38, 0.28, 0.32, cu + 1.0, 1.2, cw, [0.1, 0.1, 0.11]); bx(inn, 0.3, 0.02, 0.2, cu + 1.0, 1.36, cw - 0.1, [0.5, 0.8, 0.95]);
    bx(inn, 0.36, 0.78, 0.22, cu - 0.3, 1.33, cw + 0.55, CLOTH[si % 8]); { const p = L(cu - 0.3, 1.86, cw + 0.55); inn.add(new THREE.SphereGeometry(0.12, 10, 8), _gm.makeTranslation(p[0], p[1], p[2]), [0.85, 0.68, 0.56]); }
    for (const du of [-1.1, 0, 1.1]) block(cu + du, cw, 0.62); { const p = L(cu, 0, cw - 1.1); s.cx = p[0]; s.cz = p[2]; }
    const rack = (u, w, ry) => { bx(inn, 2.0, 0.05, 0.05, u, 1.55, w, STEELc, ry); for (const e of [-1, 1]) { const du = ry ? 0 : e, dw = ry ? e : 0; bx(inn, 0.05, 1.55, 0.05, u + du, 0.78, w + dw, STEELc); } for (let i = 0; i < 8; i++) { const o = -0.8 + i * 0.228; bx(inn, 0.15, 0.82, 0.48, u + (ry ? 0 : o), 1.1, w + (ry ? o : 0), CLOTH[(i * 3 + si) % 8], ry); } block(u - (ry ? 0 : 0.6), w - (ry ? 0.6 : 0), 0.55); block(u + (ry ? 0 : 0.6), w + (ry ? 0.6 : 0), 0.55); };
    const table = (u, w, chairs) => { cy(inn, 0.48, 0.48, 0.05, u, 0.75, w, WOOD, 12); cy(inn, 0.05, 0.22, 0.72, u, 0.36, w, DARK2, 6); block(u, w, 0.55); for (let k = 0; k < chairs; k++) { const a = k * TAU / chairs + 0.4, cu2 = u + Math.sin(a) * 0.82, cw2 = w + Math.cos(a) * 0.82; bx(inn, 0.4, 0.05, 0.4, cu2, 0.46, cw2, WOOD); bx(inn, 0.34, 0.44, 0.04, cu2 + Math.sin(a) * 0.19, 0.72, cw2 + Math.cos(a) * 0.19, DARK2, a); for (const e of [-1, 1]) bx(inn, 0.04, 0.46, 0.04, cu2 + e * 0.16, 0.23, cw2 + e * 0.16, DARK2); } };
    const shelf = (sd, w0, w1, rows, item) => { const u = sd * (hw - 0.22); for (let rI = 0; rI < rows; rI++) { const y = 0.5 + rI * 0.5; bx(inn, 0.36, 0.04, w1 - w0, u, y, (w0 + w1) / 2, WOOD); for (let w = w0 + 0.25; w < w1 - 0.1; w += 0.45) item(u, y + 0.04, w, rI); } };
    if (s.kind === "ski") { for (let i = 0; i < Math.floor((D - 2.2) / 0.3); i++) bx(inn, 0.03, 1.72, 0.1, -(hw - 0.05), 1.05, 0.9 + i * 0.3, CLOTH[i % 8]); bx(inn, 0.06, 0.08, D - 2, -(hw - 0.04), 1.95, D / 2, DARK2);          // skis racked along one wall
      shelf(1, 0.8, D - 2.4, 4, (u, y, w, rI) => { bx(inn, 0.26, 0.3, 0.3, u, y + 0.15, w, CLOTH[(rI + Math.round(w * 3)) % 8]); bx(inn, 0.26, 0.1, 0.12, u, y + 0.05, w + 0.2, [0.1, 0.1, 0.11]); });                       // boots and helmets on shelves
      rack(-1.9, D * 0.42, 0); bx(inn, 1.4, 0.45, 0.4, -hw + 1.3, 0.22, D - 0.6, WOOD); block(-hw + 1.3, D - 0.6, 0.7);                                                                                                // a rack of jackets, the boot-fitting bench
      bx(inn, 1.6, 0.06, 0.6, 0.2, 0.92, D - 0.45, STEELc); for (const e of [-0.7, 0.7]) bx(inn, 0.06, 0.92, 0.5, 0.2 + e, 0.46, D - 0.45, STEELc); bx(inn, 0.1, 0.03, 1.5, 0.2, 0.99, D - 0.45, CLOTH[1], Math.PI / 2); }   // tuning bench with a ski on it
    else if (s.kind === "wear") { rack(-2.0, D * 0.38, 0); rack(-2.0, D * 0.68, 0); rack(hw - 2.2, D * 0.3, 0);
      shelf(-1, 0.8, D - 0.8, 4, (u, y, w, rI) => bx(inn, 0.3, 0.14, 0.34, u, y + 0.07, w, CLOTH[(rI * 2 + Math.round(w * 2)) % 8]));                                                                                  // folded sweaters
      for (const [mu, mw] of [[oW - 0.9, 0.9], [-oW + 0.9, 0.9]]) { bx(inn, 0.5, 0.12, 0.5, mu, 0.06, mw, WHITE); bx(inn, 0.3, 0.8, 0.2, mu, 0.52, mw, [0.12, 0.12, 0.14]); bx(inn, 0.42, 0.62, 0.24, mu, 1.2, mw, CLOTH[(si + (mu > 0 ? 3 : 5)) % 8]); cy(inn, 0.1, 0.1, 0.22, mu, 1.64, mw, WHITE, 8); block(mu, mw, 0.35); } }   // mannequins in the windows
    else if (s.kind === "market") { for (const u of [-hw * 0.5, hw * 0.42]) { bx(inn, 0.7, 1.5, D * 0.45, u, 0.75, D * 0.45, WHITE); for (let rI = 0; rI < 3; rI++) for (let w = D * 0.25; w < D * 0.66; w += 0.3) for (const e of [-1, 1]) bx(inn, 0.12, 0.2, 0.2, u + e * 0.36, 0.5 + rI * 0.45, w, CLOTH[(rI + Math.round(w * 4) + (e > 0 ? 2 : 0)) % 8]); block(u, D * 0.33, 0.6); block(u, D * 0.57, 0.6); }
      bx(inn, 0.7, 1.9, D * 0.5, -(hw - 0.4), 0.95, D * 0.6, [0.82, 0.86, 0.9]); bx(inn, 0.04, 1.6, D * 0.46, -(hw - 0.76), 1.0, D * 0.6, [0.55, 0.75, 0.9]); }                                                         // shelves down the middle, a cooler along the wall
    else if (s.kind === "art") { for (let i = 0; i < Math.floor((D - 1.4) / 1.9); i++) for (const sd of [-1, 1]) { bx(inn, 0.05, 1.1, 1.5, sd * (hw - 0.03), 1.7, 1.5 + i * 1.9, DARK2); bx(inn, 0.03, 0.94, 1.34, sd * (hw - 0.07), 1.7, 1.5 + i * 1.9, [[0.2, 0.4, 0.7], [0.85, 0.55, 0.2], [0.3, 0.55, 0.4], [0.7, 0.2, 0.25]][(i + (sd > 0 ? 2 : 0)) % 4]); }
      for (const [pu, pw] of [[-1.6, D * 0.45], [1.7, D * 0.4]]) { bx(inn, 0.55, 1.0, 0.55, pu, 0.5, pw, WHITE); bx(inn, 0.28, 0.5, 0.28, pu, 1.25, pw, [0.5, 0.42, 0.2]); block(pu, pw, 0.42); } bx(inn, 1.6, 0.42, 0.45, -1.3, 0.21, D * 0.2 + 0.6, WOOD); block(-1.3, D * 0.2 + 0.6, 0.5); }
    else { // somewhere to eat or drink
      const bar = s.kind === "bar", cafe = s.kind === "cafe"; table(-hw + 1.5, 1.6, cafe ? 2 : 4); table(-hw + 1.5, D * 0.5, cafe ? 2 : 4); if (D > 6) table(-hw + 1.5, D - 1.7, 4); table(1.5, D * 0.3, cafe ? 2 : 4);
      for (let k = 0; k < 4; k++) { const u = cu - 1.2 + k * 0.8; cy(inn, 0.17, 0.17, 0.05, u, 0.74, cw - 0.75, [0.5, 0.12, 0.1], 10); cy(inn, 0.03, 0.14, 0.72, u, 0.36, cw - 0.75, STEELc, 6); }                         // stools at the counter
      bx(inn, 3.0, 0.05, 0.28, cu, 1.75, D + 0.02, WOOD); bx(inn, 3.0, 0.05, 0.28, cu, 2.2, D + 0.02, WOOD); const bc = [[0.1, 0.35, 0.15], [0.45, 0.25, 0.08], [0.6, 0.1, 0.1], [0.8, 0.75, 0.5]];
      for (let i = 0; i < 10; i++) for (const yy of [1.93, 2.38]) cy(inn, 0.045, 0.05, 0.3, cu - 1.3 + i * 0.29, yy, D + 0.02, bar ? bc[(i + (yy > 2 ? 1 : 0)) % 4] : WHITE, 6);                                       // bottles, or cups and jars
      if (cafe) { bx(inn, 0.6, 0.45, 0.45, cu - 0.9, 1.28, cw, STEELc); bx(inn, 1.0, 0.4, 0.5, cu + 0.2, 1.26, cw, [0.75, 0.86, 0.92]); for (let i = 0; i < 4; i++) bx(inn, 0.16, 0.08, 0.16, cu - 0.1 + i * 0.2, 1.15, cw, [0.75, 0.5, 0.2]); }   // espresso machine and pastry case
      if (bar) { bx(inn, 1.6, 1.3, 0.5, -hw + 1.0, 0.65, D - 0.2, [0.33, 0.31, 0.29]); bx(inn, 0.9, 0.6, 0.1, -hw + 1.0, 0.5, D - 0.48, [1.8, 0.7, 0.15]); bx(inn, 1.8, 0.12, 0.6, -hw + 1.0, 1.36, D - 0.2, WOOD); }                 // a stone fireplace with the fire lit
      plates.push([L(cu, 2.62, D + 0.08), Math.atan2(-s.nx, -s.nz), bar ? "ON TAP TODAY" : cafe ? "ESPRESSO · PASTRIES" : "TODAY'S MENU", 2.6, 0.32]); }
    bx(inn, 1.3, 0.02, 0.8, 0, 0.012, 0.7, [0.35, 0.12, 0.1]);                                                                                                                                                       // door mat
  });
  if (ext.p.length) { const m = new THREE.Mesh(ext.build(), liftMat); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  if (inn.p.length) { const g = inn.build(), nr = g.attributes.normal.array, cl = g.attributes.color.array;   // rooms are lit from their own ceilings: tops bright, sides softer, undersides dim, so the furniture reads as solid
    for (let i = 0; i < nr.length; i += 3) { if (cl[i] > 1.2) continue; const k = 0.66 + 0.3 * Math.max(0, nr[i + 1]) + 0.1 * (nr[i] * 0.6 + nr[i + 2] * 0.8) - 0.16 * Math.max(0, -nr[i + 1]); cl[i] *= k; cl[i + 1] *= k; cl[i + 2] *= k * 0.97; }
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true })); m.frustumCulled = false; scene.add(m); }
  if (gl.p.length) { const m = new THREE.Mesh(gl.build(), new THREE.MeshStandardMaterial({ color: 0xa9cfe0, transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0.1, depthWrite: false })); m.frustumCulled = false; m.renderOrder = 3; scene.add(m); }   // clear glass: you see the room through it
  for (const [p, yaw, name, w, h] of plates) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), textPlate(name, "#1f140c", "#f3e7c9")); m.position.set(p[0], p[1], p[2]); m.rotation.y = yaw; scene.add(m); }
  // people on the plaza: bodies, with arms and legs that swing as they walk
  const N = 44, JK = [0xd8362b, 0x1f6fd6, 0xf2b61b, 0x2a9d62, 0x8a4fd1, 0xe86a1c, 0x30343c, 0xe9edf2, 0x16a3a3, 0xd9438c], PT = [0x1b1e24, 0x2b3550, 0x4a3b2a, 0x3a3a3a], c = new THREE.Color();
  const body = new GeoBag(), leg = new GeoBag(), arm = new GeoBag(), W1 = [1, 1, 1];
  body.cyl(0.2, 0.19, 0.62, 0, 1.13, 0, W1, 10); body.add(new THREE.SphereGeometry(0.115, 10, 8), _gm.makeTranslation(0, 1.6, 0), [0.85, 0.68, 0.56]); body.cyl(0.125, 0.12, 0.1, 0, 1.68, 0, [0.12, 0.12, 0.14], 10);
  leg.box(0.15, 0.8, 0.17, 0, -0.4, 0, W1); leg.box(0.16, 0.09, 0.28, 0, -0.78, 0.05, [0.12, 0.1, 0.09]); arm.box(0.11, 0.56, 0.13, 0, -0.28, 0, W1); arm.box(0.1, 0.1, 0.12, 0, -0.6, 0, [0.12, 0.12, 0.14]);
  const mat = worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })), mk = (g, n) => { const m = new THREE.InstancedMesh(g.build(), mat, n); m.castShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  walkParts = { body: mk(body, N), leg: mk(leg, 2 * N), arm: mk(arm, 2 * N) };
  for (let i = 0; i < N; i++) { const w = { x: PLAZA.x, z: PLAZA.z, tx: PLAZA.x, tz: PLAZA.z, v: 0.75 + 0.55 * hash2(i, 3, 301), ph: i * 1.7, wait: 0, yaw: 0 }; walkerSpot(w, i * 13.1); w.x = w.tx; w.z = w.tz; walkerSpot(w, i * 5.3 + 1); WALKERS.push(w);
    c.setHex(JK[(i * 3 + 1) % JK.length]); walkParts.body.setColorAt(i, c); walkParts.arm.setColorAt(2 * i, c); walkParts.arm.setColorAt(2 * i + 1, c); c.setHex(PT[i % PT.length]); walkParts.leg.setColorAt(2 * i, c); walkParts.leg.setColorAt(2 * i + 1, c); }
  updateWalkers(0.016, { x: PLAZA.x, z: PLAZA.z });
}
function walkerSpot(w, seed) { for (let k = 0; k < 14; k++) { const a = hash2(seed, k, 302) * TAU, r = Math.sqrt(hash2(seed, k, 303)) * (PLAZA.r - 8), x = PLAZA.x + Math.sin(a) * r * PLAZA.asp, z = PLAZA.z + Math.cos(a) * r; if (!buildingAt(x, z) && !buildingAt(x + 1.2, z) && !buildingAt(x, z + 1.2) && !SHOPS.some(s => shopInside(s, x, z)) && (r < PLAZA.r * 0.55 || maskCh(x, z, 0) < 0.3)) { w.tx = x; w.tz = z; return; } } }
const _wm = new THREE.Matrix4(), _wc = new THREE.Matrix4(), _wq = new THREE.Quaternion(), _wp = new THREE.Vector3(), _w1 = new THREE.Vector3(1, 1, 1);
function updateWalkers(dt, cam) {
  if (!walkParts || Math.abs(cam.x - PLAZA.x) + Math.abs(cam.z - PLAZA.z) > 700) return;
  WALKERS.forEach((w, i) => { const dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz); let moving = false;
    if (w.wait > 0) w.wait -= dt; else if (d < 0.6) { w.wait = hash2(i, liftTime | 0, 304) * 4; walkerSpot(w, i * 7.7 + liftTime); }   // stand a moment, then walk on somewhere else
    else { const st = w.v * dt, nx = w.x + dx / d * st, nz = w.z + dz / d * st; if (buildingAt(nx, nz) || SHOPS.some(s => shopInside(s, nx, nz))) walkerSpot(w, i * 3.1 + liftTime * 1.3); else { w.x = nx; w.z = nz; w.ph += st * 4.6; w.yaw += wrap(Math.atan2(dx, dz) - w.yaw) * Math.min(1, 6 * dt); moving = true; } }
    const sw = moving ? Math.sin(w.ph) * 0.6 : 0, y = H(w.x, w.z) + (moving ? Math.abs(Math.cos(w.ph)) * 0.03 : 0);
    _wq.setFromAxisAngle(_up, w.yaw); _wm.compose(_wp.set(w.x, y, w.z), _wq, _w1); walkParts.body.setMatrixAt(i, _wm);
    for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; _wc.makeRotationX(-sd * sw).setPosition(sd * 0.1, 0.82, 0); _wc.premultiply(_wm); walkParts.leg.setMatrixAt(2 * i + k, _wc); _wc.makeRotationX(sd * sw * 0.75).setPosition(sd * 0.27, 1.4, 0); _wc.premultiply(_wm); walkParts.arm.setMatrixAt(2 * i + k, _wc); } });
  walkParts.body.instanceMatrix.needsUpdate = true; walkParts.leg.instanceMatrix.needsUpdate = true; walkParts.arm.instanceMatrix.needsUpdate = true;
}
/* ---- being in a shop ---- */
function shopTick() { const was = sk.shopIn; sk.shopIn = null; nearCounter = null; if (!(sk.mode === "ski" || sk.mode === "walk") || COMP.run) return;
  for (const s of SHOPS) if (Math.abs(s.dx - sk.p.x) + Math.abs(s.dz - sk.p.z) < 30 && shopInside(s, sk.p.x, sk.p.z)) { sk.shopIn = s; if (sk.sp < 4 && Math.hypot(s.cx - sk.p.x, s.cz - sk.p.z) < 1.5) nearCounter = s; }
  if (sk.shopIn && sk.shopIn !== was) toast(sk.shopIn.name + (isGear(sk.shopIn) ? " · E to browse" : ""), 2.5);
  if (was && !sk.shopIn && basket.length) { const n = basket.length; basketKeep(false); sfx("alarm"); toast("You ran out without paying! " + (n === 1 ? "It is" : "They are") + " in your locker now.", 4); }   // out of the door with the goods
}
function shopUse() { const s = sk.shopIn; if (!s) return;   // E in a shop
  if (isGear(s)) { if (nearCounter && basket.length) storePay(); else storeOpen(s); return; }
  if (nearCounter) toast(s.kind === "art" ? "Prints of the Palisades at first light. Not today." : s.kind === "bar" ? "A pint by the fire. One more run, though." : s.kind === "market" ? "Snacks for the chair." : "Something hot. Legs feel fresh again.", 3); }
