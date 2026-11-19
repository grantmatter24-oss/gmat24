/* ---------- trees: placed where the satellite sees canopy, kept off streets, roofs and water ---------- */
const TC = 128, TSTEP = 6.4, treeChunks = new Map();
const SPECIES = [   // height range, crown radius as a share of height, tint
  { h: [7, 12.5], r: 0.56, c: [0.80, 0.86, 0.66] },     // coast live oak: low, wide, dark
  { h: [11, 18], r: 0.36, c: [1.0, 1.08, 0.76] },      // valley oak, bay, sycamore: taller and brighter
  { h: [4.2, 7.5], r: 0.46, c: [1.08, 1.16, 0.74] },    // garden and street trees
  { h: [15, 27], r: 0.17, c: [0.72, 0.86, 0.78] },      // redwood, pine, cedar
];
function treeChunk(cx, cz) {
  const key = cx * 4096 + cz; let c = treeChunks.get(key); if (c) return c;
  const n0 = Math.round(TC / TSTEP), B = { n: 0, m: [], col: [] }, C = { n: 0, m: [], col: [] }, tr = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let gj = 0; gj < n0; gj++) for (let gi = 0; gi < n0; gi++) {
    const ix = cx * n0 + gi, iz = cz * n0 + gj, x = (ix + 0.12 + 0.76 * hash2(ix, iz, 1)) * TSTEP, z = (iz + 0.12 + 0.76 * hash2(ix, iz, 2)) * TSTEP;
    const inside = inWorld(x, z, 3); let cover, urban = 0, street = false;
    if (inside) {
      cover = loAt(x, z, 0); if (hiAt(x, z, 0) > 0.22 || hiAt(x, z, 2) > 0.18 || hiAt(x, z, 1) > 0.06) continue;
      let hard = 0; for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]]) hard = Math.max(hard, hiAt(x + dx, z + dz, 0), hiAt(x + dx, z + dz, 1) * 2.5); if (hard > 0.5) continue;   // no trunks on or beside a street or trail
      for (const [dx, dz] of [[13, 0], [-13, 0], [0, 13], [0, -13], [9, 9], [-9, -9]]) urban = Math.max(urban, hiAt(x + dx, z + dz, 2), hiAt(x + dx, z + dz, 0) * 0.8);
      let rd = 0; for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) rd = Math.max(rd, hiAt(x + dx, z + dz, 0)); street = rd > 0.5 && urban > 0.25;
    } else { if (Math.abs(x) > MR - 200 || Math.abs(z) > MR - 200) continue; cover = midTreeAt(x, z) * 0.82; }
    if (hash2(ix, iz, 3) > Math.max(sstep(0.16, 0.72, cover) * 0.96, street ? 0.55 : 0)) continue;   // streets in town are lined with trees
    const r1 = hash2(ix, iz, 4), r2 = hash2(ix, iz, 5), r3 = hash2(ix, iz, 6);
    const sp = urban > 0.3 ? (r1 < 0.13 ? 3 : r1 < 0.42 ? 2 : r1 < 0.68 ? 1 : 0) : (r1 < 0.035 ? 3 : r1 < 0.27 ? 1 : 0), S = SPECIES[sp];
    const h = lerp(S.h[0], S.h[1], r2) * (0.82 + 0.3 * cover), r = h * S.r * (0.85 + 0.3 * r3) + (sp === 3 ? 0.8 : 0), y = H(x, z);
    if (inside && (waterAt(x, z) > -1e8 || deckAt(x, z, 1e9) > -1e8)) continue;   // nothing grows in the water or up through a bridge
    p.set(x, y - 0.25, z); q.setFromAxisAngle(_up, r3 * TAU); s.set(r, h, r); m4.compose(p, q, s);
    const T = sp === 3 ? C : B, k = 1.1 + 0.36 * hash2(ix, iz, 7), plum = sp === 2 && hash2(ix, iz, 8) < 0.07;
    for (let e = 0; e < 16; e++) T.m.push(m4.elements[e]); T.col.push((plum ? 1.5 : S.c[0]) * k, (plum ? 0.55 : S.c[1]) * k, (plum ? 0.6 : S.c[2]) * k); T.n++;
    if (inside) tr.push(x, z, Math.max(0.16, r * (sp === 3 ? 0.13 : 0.075)), h);
  }
  const pack = T => {   // far away, every other tree is drawn half as big again: the same wood for half the work
    const o = { n: T.n, m: Float32Array.from(T.m), col: Float32Array.from(T.col) }, fn = (T.n + 1) >> 1; o.fn = fn; o.fm = new Float32Array(fn * 16); o.fcol = new Float32Array(fn * 3);
    for (let i = 0; i < fn; i++) { for (let e = 0; e < 16; e++) o.fm[i * 16 + e] = o.m[i * 32 + e] * (e < 11 && e !== 3 && e !== 7 ? 1.32 : 1); for (let e = 0; e < 3; e++) o.fcol[i * 3 + e] = o.col[i * 6 + e]; }
    return o; };
  c = { b: pack(B), c: pack(C), tr: Float32Array.from(tr) };
  treeChunks.set(key, c); return c;
}
/* Push a circle out of any tree trunk it overlaps (same contract as hitBuildings). */
function hitTrees(x, z, r, out) {
  let deep = 0;
  for (let cx = Math.floor((x - 2) / TC); cx <= Math.floor((x + 2) / TC); cx++) for (let cz = Math.floor((z - 2) / TC); cz <= Math.floor((z + 2) / TC); cz++) {
    const t = treeChunk(cx, cz).tr; for (let i = 0; i < t.length; i += 4) { const dx = x - t[i], dz = z - t[i + 1], d = Math.hypot(dx, dz), pen = r + t[i + 2] - d; if (pen > deep) { deep = pen; out.x = dx / (d + 1e-6); out.z = dz / (d + 1e-6); } }
  }
  return deep;
}
function leafAtlas() {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S * 2; const g = c.getContext("2d"), r = rng(77);
  for (let t = 0; t < 2; t++) {   // two broadleaf clusters
    const ox = t * S + S / 2, oy = S / 2, leaves = [];
    for (let i = 0; i < 1100; i++) { const a = r() * TAU, d = 114 * Math.pow(r(), 0.6); leaves.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d * 0.92, r()]); }
    leaves.sort((a, b) => a[2] - b[2]);
    g.strokeStyle = "rgba(58,44,30,0.9)"; g.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + Math.cos(a) * 50, oy + Math.sin(a) * 50, ox + Math.cos(a + 0.4) * 100, oy + Math.sin(a + 0.4) * 100); g.stroke(); }
    for (const [x, y, d] of leaves) { const l = 13 + d * 25 + r() * 7, hue = 66 + r() * 34; g.fillStyle = `hsl(${hue},${26 + r() * 20}%,${l}%)`; g.save(); g.translate(x, y); g.rotate(r() * TAU); g.beginPath(); g.ellipse(0, 0, 3.6 + r() * 3.4, 1.8 + r() * 1.7, 0, 0, TAU); g.fill(); g.restore(); }
  }
  { const ox = S / 2, oy = S + S / 2;   // conifer spray
    for (let i = 0; i < 46; i++) { const a = r() * TAU, d0 = r() * 40, len = 50 + r() * 62, x0 = ox + Math.cos(a) * d0, y0 = oy + Math.sin(a) * d0, x1 = ox + Math.cos(a) * (d0 + len), y1 = oy + Math.sin(a) * (d0 + len);
      g.strokeStyle = "rgba(52,40,28,0.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let k = 0; k < 44; k++) { const t = k / 44, px = lerp(x0, x1, t), py = lerp(y0, y1, t), na = a + (k % 2 ? 1 : -1) * (0.75 + r() * 0.5), nl = (9 + r() * 7) * (1 - t * 0.5); g.strokeStyle = `hsl(${88 + r() * 36},${24 + r() * 18}%,${12 + r() * 20}%)`; g.lineWidth = 2.0; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(na) * nl, py + Math.sin(na) * nl); g.stroke(); } } }
  { const im = g.createImageData(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const v = 0.55 + 0.45 * vnoise(x * 0.14, y * 0.03, 5) + (r() - 0.5) * 0.2, k = (y * S + x) * 4; im.data[k] = 92 * v; im.data[k + 1] = 74 * v; im.data[k + 2] = 58 * v; im.data[k + 3] = 255; } g.putImageData(im, S, S); }   // bark
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, MAXANISO); return t;
}
function treeGeometry(conifer, cards, size, trunkSides, seed) {
  const r = rng(seed), b = new Buf(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3(), nn = new THREE.Vector3();
  const th = conifer ? 0.94 : 0.5, tr = conifer ? 0.2 : 0.085;
  for (let k = 0; k < trunkSides; k++) {   // trunk (bark tile)
    const a0 = k / trunkSides * TAU, a1 = (k + 1) / trunkSides * TAU, base = b.v;
    for (const [a, y, rr] of [[a0, 0, tr], [a1, 0, tr], [a0, th, tr * (conifer ? 0.15 : 0.6)], [a1, th, tr * (conifer ? 0.15 : 0.6)]]) b.vert(Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(a), 0, Math.sin(a), 0.52 + 0.46 * (a / TAU), 0.02 + 0.46 * y, 0.8, 0.8, 0.8);
    b.i.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  for (let k = 0; k < cards; k++) {
    let cx, cy, cz, sz, ao;
    if (conifer) { const y = 0.16 + 0.82 * Math.pow((k + r()) / cards, 0.85), a = r() * TAU, rad = (1 - y) * 0.95 + 0.04, rr = rad * (0.35 + 0.6 * r()); cx = Math.cos(a) * rr; cz = Math.sin(a) * rr; cy = y; d.set(Math.cos(a), 0.45, Math.sin(a)).normalize(); sz = size * (0.5 + 0.7 * (1 - y)); ao = 0.5 + 0.5 * (rr / rad); }
    else { d.set(r() * 2 - 1, r() * 1.5 - 0.4, r() * 2 - 1).normalize(); const rr = 0.42 + 0.56 * Math.pow(r(), 0.7); cx = d.x * 0.9 * rr; cy = 0.66 + d.y * 0.33 * rr; cz = d.z * 0.9 * rr; sz = size * (0.8 + 0.45 * r()); ao = (0.5 + 0.5 * rr) * (0.78 + 0.22 * (d.y * 0.5 + 0.5)); }
    nn.copy(d).add(t1.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9)).normalize();
    t1.set(-nn.z, 0, nn.x); if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0); t1.normalize(); t2.crossVectors(nn, t1).normalize();
    if (cards <= 6 && !conifer) { const a = k / cards * Math.PI; t1.set(Math.cos(a), 0, Math.sin(a)); t2.set(0, 1, 0); cx = cz = 0; cy = 0.66; sz = 1.05; ao = 0.9; d.set(-Math.sin(a), 0.5, Math.cos(a)).normalize(); }
    if (cards <= 6 && conifer) { const a = k / cards * Math.PI; t1.set(Math.cos(a), 0, Math.sin(a)); t2.set(0, 1, 0); cx = cz = 0; cy = 0.56; sz = 0.6; ao = 0.9; d.set(-Math.sin(a), 0.5, Math.cos(a)).normalize(); }
    const tile = conifer ? 2 : (r() < 0.5 ? 0 : 1), u0 = (tile % 2) * 0.5, v0 = tile < 2 ? 0.5 : 0, fl = r() < 0.5, base = b.v, vy = conifer && cards <= 6 ? sz * 0.78 : cards <= 6 ? sz * 0.36 : sz * (conifer ? 0.6 : 0.7), n2 = t1.set(d.x, d.y + 0.45, d.z).normalize().clone();
    const tx = new THREE.Vector3(-nn.z, 0, nn.x); if (tx.lengthSq() < 1e-4) tx.set(1, 0, 0); tx.normalize(); if (cards <= 6) { const a = k / cards * Math.PI; tx.set(Math.cos(a), 0, Math.sin(a)); }
    for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.vert(cx + tx.x * a * sz + t2.x * c * vy, cy + tx.y * a * sz + t2.y * c * vy, cz + tx.z * a * sz + t2.z * c * vy, n2.x, n2.y, n2.z, u0 + (fl ? 1 - (a + 1) / 2 : (a + 1) / 2) * 0.5, v0 + (c + 1) / 2 * 0.5, ao, ao, ao);
    b.quad(base, base + 1, base + 2, base + 3);
  }
  return b.geo();
}
const TREES = { lods: [], last: new THREE.Vector3(1e9, 0, 0), t: 0 };
function buildTrees() {
  const tex = leafAtlas(), mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide, vertexColors: true, roughness: 0.82, metalness: 0 });
  mat.onBeforeCompile = sh => {
    shareUniforms(sh);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifdef USE_INSTANCING
       float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23; float wy = position.y * position.y;
       transformed.x += ( sin( uTime * 1.1 + ph + position.y * 4.0 ) + sin( uTime * 2.7 + ph * 1.7 + position.x * 9.0 ) * 0.35 ) * 0.022 * wy; transformed.z += cos( uTime * 0.9 + ph * 1.3 + position.y * 3.0 ) * 0.022 * wy;
      #endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;");
  };
  mat.customProgramCacheKey = () => "tree";
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
  const caps = [[1200, 300], [9000, 2200], [46000, 9000]], spec = [[30, 0.52, 6], [9, 0.82, 4], [4, 1, 3]];
  for (let l = 0; l < 3; l++) for (let c = 0; c < 2; c++) {
    const geo = treeGeometry(c === 1, c === 1 ? Math.max(4, Math.round(spec[l][0] * 0.8)) : spec[l][0], spec[l][1], spec[l][2], 100 + l * 10 + c), im = new THREE.InstancedMesh(geo, mat, caps[l][c]);
    im.count = 0; im.frustumCulled = false; im.castShadow = l === 0; im.receiveShadow = l < 2; im.customDepthMaterial = depth; im.matrixAutoUpdate = false; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(caps[l][c] * 3), 3);
    scene.add(im); TREES.lods.push(im);
  }
}
function refillTrees() {
  const cx = camera.position.x, cz = camera.position.z, far = 1500 * PERF.tree, near = 85, mid = 300 + 180 * PERF.tree; uTreeNear.value = far * 0.92;
  const cnt = [0, 0, 0, 0, 0, 0]; let made = 0;
  const put = (lod, c, M4, C3, i0, n) => { const im = TREES.lods[lod * 2 + c], cap = im.instanceMatrix.count, k = cnt[lod * 2 + c]; n = Math.min(n, cap - k); if (n <= 0) return; im.instanceMatrix.array.set(M4.subarray(i0 * 16, (i0 + n) * 16), k * 16); im.instanceColor.array.set(C3.subarray(i0 * 3, (i0 + n) * 3), k * 3); cnt[lod * 2 + c] = k + n; };
  for (let tx = Math.floor((cx - far) / TC); tx <= Math.floor((cx + far) / TC); tx++) for (let tz = Math.floor((cz - far) / TC); tz <= Math.floor((cz + far) / TC); tz++) {
    const mx = (tx + 0.5) * TC, mz = (tz + 0.5) * TC, d = Math.hypot(mx - cx, mz - cz); if (d > far) continue;
    if (!inWorld(mx, mz, -M.ring)) continue;
    let ch = treeChunks.get(tx * 4096 + tz); if (!ch) { if (made > (TREES.first ? 40 : 5000)) continue; ch = treeChunk(tx, tz); made++; }
    for (let c = 0; c < 2; c++) {
      const T = c ? ch.c : ch.b; if (!T.n) continue;
      if (d > mid + 90) put(2, c, T.fm, T.fcol, 0, T.fn); else if (d > near + 95 && d < mid - 90) put(1, c, T.m, T.col, 0, T.n);
      else for (let i = 0; i < T.n; i++) { const dd = Math.hypot(T.m[i * 16 + 12] - cx, T.m[i * 16 + 14] - cz); if (dd < near) put(0, c, T.m, T.col, i, 1); else if (dd < mid) put(1, c, T.m, T.col, i, 1); else if (!(i & 1)) put(2, c, T.fm, T.fcol, i >> 1, 1); }
    }
  }
  TREES.first = true;
  for (let k = 0; k < 6; k++) { const im = TREES.lods[k]; im.count = cnt[k]; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
  if (treeChunks.size > 2600) { for (const [key] of treeChunks) { const tx = Math.floor(key / 4096 + 0.5), tz = key - tx * 4096; if (Math.hypot((tx + 0.5) * TC - cx, (tz + 0.5) * TC - cz) > far + 600) treeChunks.delete(key); } }
}
function updateTrees(dt) {
  TREES.t -= dt; if (TREES.t > 0 && TREES.last.distanceToSquared(camera.position) < 30 * 30) return; if (TREES.t > -0.25 && TREES.last.distanceToSquared(camera.position) < 12 * 12) return;
  TREES.t = 0.5; TREES.last.copy(camera.position); refillTrees();
}

/* ---------- grass: individual blades around the rider, placed and coloured on the GPU from the survey and the satellite image ---------- */
const GRASS = [];
function grassLayer(R, spacing, segs, width, cutIn, fadeFrom, hScale) {
  const N = Math.round(2 * R / spacing), off = new Float32Array(N * N * 4), r = rng(R * 13 + 5);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = (j * N + i) * 4; off[k] = (i + r()) * spacing - R; off[k + 1] = (j + r()) * spacing - R; off[k + 2] = r(); off[k + 3] = r(); }
  for (let i = N * N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); for (let e = 0; e < 4; e++) { const t = off[i * 4 + e]; off[i * 4 + e] = off[j * 4 + e]; off[j * 4 + e] = t; } }   // shuffled, so drawing only the first part thins the grass evenly
  const pos = [], idx = []; for (let s = 0; s < segs; s++) pos.push(-0.5, s / segs, 0, 0.5, s / segs, 0); pos.push(0, 1, 0);
  for (let s = 0; s < segs - 1; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); } idx.push((segs - 1) * 2, (segs - 1) * 2 + 1, segs * 2);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4)); g.instanceCount = N * N;
  const U = { uGC: { value: new THREE.Vector3() }, uRider: { value: new THREE.Vector3(1e6, 0, 1e6) }, uGP: { value: new THREE.Vector4(R, fadeFrom, cutIn, width) }, uGH: { value: hScale } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    shareUniforms(sh);
    Object.assign(sh.uniforms, U, { tHeight: { value: TX.height }, tLo: { value: TX.lo }, tHi: { value: TX.hi }, tSat: { value: TX.sat }, tNormalT: { value: TX.normal }, tNoise: { value: TX.noise },
      uRect: { value: new THREE.Vector4(X0, Z0, 1 / (X1 - X0), 1 / (Z1 - Z0)) }, uGridMax: { value: new THREE.Vector2(NX - 1, NZ - 1) } });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
      uniform highp sampler2D tHeight; uniform sampler2D tLo, tHi, tSat, tNormalT, tNoise; uniform vec3 uGC, uRider; uniform vec4 uGP, uRect; uniform vec2 uGridMax; uniform float uTime, uGH;
      attribute vec4 aOff; varying vec3 vGCol;
      float gh( vec2 p ) { p = fract( p * vec2( 0.1031, 0.1030 ) ); p += dot( p, p.yx + 33.33 ); return fract( ( p.x + p.y ) * p.y ); }
      float heightAt( vec2 w ) { vec2 f = ( w - uRect.xy ) / ${CELL.toFixed(1)}; vec2 i = clamp( floor( f ), vec2( 0.0 ), uGridMax - 1.0 ); vec2 t = clamp( f - i, 0.0, 1.0 ); ivec2 ii = ivec2( i );
        float a = texelFetch( tHeight, ii, 0 ).r, b = texelFetch( tHeight, ii + ivec2( 1, 0 ), 0 ).r, c = texelFetch( tHeight, ii + ivec2( 0, 1 ), 0 ).r, d = texelFetch( tHeight, ii + ivec2( 1, 1 ), 0 ).r;
        return mix( mix( a, b, t.x ), mix( c, d, t.x ), t.y ); }`)
      .replace("#include <beginnormal_vertex>", `
        float GR = uGP.x; vec2 wp = aOff.xy + floor( ( uGC.xz - aOff.xy ) / ( 2.0 * GR ) + 0.5 ) * ( 2.0 * GR );
        vec2 uvR = ( wp - uRect.xy ) * uRect.zw; float inMap = step( 0.002, uvR.x ) * step( uvR.x, 0.998 ) * step( 0.002, uvR.y ) * step( uvR.y, 0.998 );
        vec2 uvS = ( uvR * vec2( ${LOW - 1}.0, ${LOH - 1}.0 ) + 0.5 ) / vec2( ${LOW}.0, ${LOH}.0 );
        vec3 glo = texture2D( tLo, uvS ).rgb; vec3 ghi = texture2D( tHi, uvR ).rgb; vec3 gsat = texture2D( tSat, uvS ).rgb;
        float h1 = gh( wp ), h2 = gh( wp + 17.3 ), h3 = aOff.z, h4 = aOff.w;
        float hard = max( max( ghi.r, ghi.g * 1.3 ), ghi.b ), can = smoothstep( 0.35, 0.75, glo.r ), wild = clamp( glo.g * 1.3, 0.0, 1.0 ), turf = clamp( glo.b * 1.5, 0.0, 1.0 );
        float patchy = texture2D( tNoise, wp * 0.021 ).g;
        float dens = clamp( wild + turf, 0.0, 1.0 ) * ( 1.0 - 0.72 * can ) * ( 0.55 + 0.6 * patchy );
        float hgt = mix( mix( 0.10, 0.26 + 0.42 * h1 * ( 0.5 + patchy ), wild ), 0.05 + 0.035 * h1, turf ) * ( 1.0 - 0.45 * can ) * uGH;
        float gdist = distance( wp, uGC.xz );
        float gk = inMap * step( h2, dens ) * ( 1.0 - smoothstep( 0.10, 0.36, hard ) ) * ( 1.0 - smoothstep( uGP.y, GR, gdist ) ) * smoothstep( uGP.z, uGP.z + 5.0, gdist + step( uGP.z, 0.01 ) * 100.0 );
        hgt *= gk;
        vec3 gtn = texture2D( tNormalT, ( uvR * uGridMax + 0.5 ) / ( uGridMax + 1.0 ) ).xyz; gtn = normalize( vec3( gtn.x * 2.0 - 1.0, gtn.y, gtn.z * 2.0 - 1.0 ) );
        vec3 objectNormal = gtn;`)
      .replace("#include <begin_vertex>", `
        float ga = h3 * 6.2831; vec2 gdir = vec2( cos( ga ), sin( ga ) ), gface = vec2( - gdir.y, gdir.x ); float gy = position.y;
        float gust = ( texture2D( tNoise, wp * 0.011 + uTime * vec2( 0.031, 0.017 ) ).r - 0.5 ) * 2.0;
        float sway = sin( uTime * 2.2 + wp.x * 0.61 + wp.y * 0.47 + h1 * 6.0 ) * 0.07 + gust * 0.30;
        vec2 dr = wp - uRider.xz; float dk = 1.0 - smoothstep( 0.35, 1.7, length( dr ) ); vec2 push = normalize( dr + 1e-4 ) * dk;
        vec3 transformed = vec3( wp.x, heightAt( wp ) + gy * hgt * ( 1.0 - 0.3 * abs( sway ) ) * ( 1.0 - 0.7 * dk ), wp.y );
        transformed.xz += gdir * position.x * uGP.w * ( 1.0 - gy * 0.82 ) * step( 0.0005, gk ) + ( gface * ( 0.12 + 0.34 * h4 ) + vec2( 0.8, 0.6 ) * sway ) * gy * gy * hgt + push * gy * hgt * 1.3;
        vec3 gc = mix( vec3( dot( gsat, vec3( 0.3, 0.55, 0.15 ) ) ), gsat, 1.35 ) * ( 0.78 + 0.44 * h1 ); gc = mix( gc, gc * vec3( 0.84, 0.97, 0.72 ), turf );
        vGCol = gc * mix( 0.40, 1.22, gy ) + vec3( 0.050, 0.044, 0.012 ) * gy * gy * wild * ( 1.0 - turf );`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGCol;").replace("#include <map_fragment>", "diffuseColor.rgb = vGCol;")
      .replace("#include <normal_fragment_begin>", "float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;");
  };
  m.customProgramCacheKey = () => "grass";
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; scene.add(mesh); GRASS.push({ mesh, U, geo: g, total: N * N, width });
}
function buildGrass() {
  grassLayer(17, 0.115, 3, 0.05, 0, 12, 1);          // blades underfoot
  grassLayer(60, 0.45, 2, 0.16, 11, 42, 1.15);       // tufts out to where the ground texture takes over
}
function setGrassFraction(f) { for (const G of GRASS) { G.geo.instanceCount = Math.max(1, Math.floor(G.total * clamp(f, 0.02, 1))); G.U.uGP.value.w = G.width * Math.min(2.4, 1 / Math.sqrt(clamp(f, 0.05, 1))); } }   // fewer blades are drawn wider
function updateGrass(riderPos) { for (const G of GRASS) { G.U.uGC.value.copy(camera.position); if (riderPos) G.U.uRider.value.copy(riderPos); } }
