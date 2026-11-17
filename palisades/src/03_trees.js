/* ---------- forest ----------
   Every tree comes from a hash of its 5 m cell and the satellite tree-cover mask, so rendering and collisions agree without storing a list.
   Near trees are instanced meshes; beyond that each one is a camera-facing card rendered from the same model. */
const TCELL = 5, TPER = CH / TCELL;
const treeTiles = new Map();
function tileTrees(cx, cz) { // -> Float32Array of [x, y, z, height, width, rot, variant, tint] per tree
  const key = cz * 1000 + cx; let t = treeTiles.get(key); if (t) return t;
  const out = [], bx = Math.round((X0 + cx * CH) / TCELL), bz = Math.round((Z0 + cz * CH) / TCELL);
  for (let j = 0; j < TPER; j++) for (let i = 0; i < TPER; i++) {
    const gx = bx + i, gz = bz + j, x = (gx + 0.15 + 0.7 * hash2(gx, gz, 2)) * TCELL, z = (gz + 0.15 + 0.7 * hash2(gx, gz, 3)) * TCELL;
    const tm = treeMask(x, z), hr = hash2(gx, gz, 1); let lone = false;
    if (tm < 0.12 || hr > tm * tm * 0.6 + 0.02) { // outside the forest: lone firs and small clumps dotted over open slopes, never on a run
      const clump = vnoise(x * 0.012, z * 0.012, 91); if (hr > 0.004 + 0.05 * sstep(0.62, 0.85, clump) + 0.02 * tm) continue;
      if (clearMask(x, z) > 0.06 || rockAt(x, z) > 0.75) continue; lone = true;
    }
    if (cliffK(x, z) > 0.25) continue;
    if (!inWorld(x, z, 30)) continue;
    const y = H(x, z), hi = sstep(2330, 2640, y), big = hash2(gx, gz, 4); if (lone && y > 2640 + 60 * (hr * 200 % 1)) continue;
    const h = Math.max(9.5, (9 + 19 * big * big + 6 * tm) * lerp(1.1, 0.62, hi)), v = hash2(gx, gz, 5) < lerp(0.35, 0.75, hi) ? 1 : 0;
    out.push(x, y - 0.3, z, h, h * (v ? 0.34 : 0.25) * (0.85 + 0.3 * hash2(gx, gz, 6)), hash2(gx, gz, 7) * TAU, v, 0.8 + 0.4 * hash2(gx, gz, 8));
  }
  t = new Float32Array(out); treeTiles.set(key, t); return t;
}
/* A fir bough seen from above, drawn once: stem, side twigs, needles, and the new snow lying on it. Every tree is built from these. */
function boughTexture() {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), rnd = (() => { let a = 77; return () => { a = Math.imul(a ^ (a >>> 15), 2246822519) + 0x9e3779b9 | 0; return ((a >>> 8) & 0xffff) / 65536; }; })();
  const G = ["#0b2213", "#12301b", "#183d22", "#0e2a17", "#1c4426"]; g.lineCap = "round";
  g.strokeStyle = "#2a1c12"; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 256); g.lineTo(128, 14); g.stroke();
  const twigs = [];
  for (let i = 0; i < 52; i++) for (const sd of [-1, 1]) { const y = 252 - i * 4.7 - rnd() * 3, len = (1 - i / 54) * 108 + 8, ang = (0.55 + rnd() * 0.3) * sd, ex = 128 + Math.sin(ang) * len * 1.05, ey = y - Math.cos(ang) * len * 0.6; twigs.push([128, y, ex, ey, len]); }
  for (const [x0, y0, x1, y1, len] of twigs) { const n = Math.floor(len / 1.5), dx = (x1 - x0) / len, dy = (y1 - y0) / len;
    for (let k = 0; k <= n; k++) { const u = k / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u), nl = 5.5 * (1 - u * 0.5) + rnd() * 3; g.strokeStyle = G[Math.floor(rnd() * G.length)]; g.lineWidth = 1.5;
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (-dy * sd * 0.8 + dx * 0.6) * nl, y + (dx * sd * 0.8 + dy * 0.6) * nl); g.stroke(); } } }
  for (let i = 0; i < 70; i++) { const tw = twigs[Math.floor(rnd() * twigs.length)], u = 0.15 + rnd() * 0.75, x = lerp(tw[0], tw[2], u), y = lerp(tw[1], tw[3], u), r = 4 + rnd() * 9; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(240,244,249,0.95)"); gr.addColorStop(0.7, "rgba(232,238,246,0.85)"); gr.addColorStop(1, "rgba(232,238,246,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.8, Math.atan2(tw[3] - tw[1], tw[2] - tw[0]), 0, TAU); g.fill(); }   // new snow sits in soft pillows
  g.fillStyle = "#33231a"; g.fillRect(0, 244, 12, 12);   // a patch of bark for the trunk
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* unit-height conifer built from boughs: whorls of drooping branches up a bare lower trunk. v=0 a narrow fir, v=1 a broader pine. */
function treeGeometry(v, lo) {
  const pos = [], nor = [], col = [], uv = [], tiers = lo ? (v ? 6 : 8) : (v ? 12 : 16), y0 = v ? 0.44 : 0.33;
  const vert = (p, n, c, u, w) => { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); col.push(c, c, c); uv.push(u, w); };
  for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU, a1 = (i + 1) / 6 * TAU, r0 = 0.05, r1 = 0.012, yt = 0.96, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r], N = a => [Math.cos(a), 0.1, Math.sin(a)];
    vert(P(a0, r0, 0), N(a0), 1, 0.02, 0.02); vert(P(a0, r1, yt), N(a0), 1, 0.02, 0.02); vert(P(a1, r0, 0), N(a1), 1, 0.02, 0.02); vert(P(a1, r0, 0), N(a1), 1, 0.02, 0.02); vert(P(a0, r1, yt), N(a0), 1, 0.02, 0.02); vert(P(a1, r1, yt), N(a1), 1, 0.02, 0.02); }
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1), y = lerp(y0, 0.95, Math.pow(f, 0.92)), r = lerp(0.5, 0.07, Math.pow(f, v ? 0.75 : 0.85)) * (0.86 + 0.28 * hash2(t, 3, 50 + v)), n = lo ? 5 : f < 0.6 ? 8 : 6, droop = lerp(0.42, 0.12, f), shade = lerp(0.7, 1.12, f);
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5 * (t % 2) + 0.3 * (hash2(t, k, 51 + v) - 0.5)) / n * TAU, ca = Math.cos(a), sa = Math.sin(a), rr = r * (0.78 + 0.44 * hash2(t, k, 52 + v)), w = rr * (lo ? 0.8 : 0.5), px = -sa, pz = ca, oy = y - droop * rr + 0.03 * (hash2(t, k, 53) - 0.5);
      const nrm = [ca * 0.45, 0.85, sa * 0.45], A = [px * w * 0.22, y + 0.012, pz * w * 0.22], B = [-px * w * 0.22, y + 0.012, -pz * w * 0.22], C = [ca * rr + px * w, oy, sa * rr + pz * w], D = [ca * rr - px * w, oy, sa * rr - pz * w];
      vert(A, nrm, shade, 0.36, 0.0); vert(C, nrm, shade, 0.0, 1.0); vert(B, nrm, shade, 0.64, 0.0); vert(B, nrm, shade, 0.64, 0.0); vert(C, nrm, shade, 0.0, 1.0); vert(D, nrm, shade, 1.0, 1.0);
    }
  }
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI, ca = Math.cos(a) * 0.05, sa = Math.sin(a) * 0.05, n = [Math.cos(a + 1.57), 0.5, Math.sin(a + 1.57)];   // the leader at the very top
    vert([-ca, 0.9, -sa], n, 1.1, 0.25, 0.55); vert([ca, 0.9, sa], n, 1.1, 0.75, 0.55); vert([0, 1.0, 0], n, 1.1, 0.5, 0.98); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return g;
}
let treeGeo = null, treeGeoLo = null, treeMat = null, impTex = null, bbMat = null, rockGeo = null, rockMat = null;
function initTrees() {
  const bough = boughTexture(); treeGeo = [treeGeometry(0), treeGeometry(1)]; treeGeoLo = [treeGeometry(0, true), treeGeometry(1, true)];
  treeMat = worldShade(new THREE.MeshStandardMaterial({ map: bough, alphaTest: 0.4, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), {
    patch(sh) {
      sh.vertexShader = "varying vec3 vOp;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vOp = position;");
      sh.fragmentShader = "varying vec3 vOp;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        { float tD = length(cameraPosition - vWp); if (smoothstep(uTreeNear - 40.0, uTreeNear, tD) > ign(gl_FragCoord.xy)) discard; }`)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= 0.5 + 0.5 * smoothstep(0.03, 0.4, length(vOp.xz));");
    }
  });
  // cards: render each model once, lit from above so the card carries its own shading
  const S = 256, rt = new THREE.WebGLRenderTarget(S * 2, S * 2, { depthBuffer: true }); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.colorSpace = THREE.NoColorSpace;
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-0.5, 0.5, 1, 0, -2, 2);
  const im = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexColors: true, uniforms: { uMap: { value: bough } },
    vertexShader: `varying vec3 vC; varying vec3 vN; varying vec3 vP; varying vec2 vU; void main() { vC = color; vN = normal; vP = position; vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; varying vec3 vC; varying vec3 vN; varying vec3 vP; varying vec2 vU;
      void main() { vec4 tx = texture2D(uMap, vU); if (tx.a < 0.4) discard;
        gl_FragColor = vec4(tx.rgb * vC * (0.55 + 0.6 * smoothstep(0.0, 0.45, length(vP.xz))), 1.0); }` });
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setClearColor(0x0c1a0e, 0); renderer.clear();
  for (let v = 0; v < 2; v++) for (let a = 0; a < 2; a++) { const m = new THREE.Mesh(treeGeo[v], im); m.rotation.y = a * 1.3; sc.add(m); rt.viewport.set(v * S, a * S, S, S); rt.scissor.set(v * S, a * S, S, S); rt.scissorTest = true; renderer.setRenderTarget(rt); renderer.render(sc, cam); sc.remove(m); }
  renderer.setRenderTarget(prev); renderer.setClearColor(0x000000, 1); impTex = rt.texture;
  bbMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uImp: { value: impTex } }, U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)), fog: true, alphaToCoverage: true,
    vertexShader: `attribute vec4 iA; attribute vec4 iB; varying vec2 vUv; varying vec3 vWp; varying float vTint; varying vec3 vBase; varying float vX;
      #include <fog_pars_vertex>
      void main() { vec3 base = iA.xyz; vec3 toC = cameraPosition - base; vec3 right = normalize(vec3(toC.z, 0.0, -toC.x));
        vec3 wp = base + right * position.x * iB.x + vec3(0.0, position.y * iA.w, 0.0); vWp = wp; vBase = base; vTint = iB.w; vX = position.x * 2.0;
        vUv = vec2((uv.x + iB.z) * 0.5, (uv.y + step(0.5, fract(iB.y * 3.7))) * 0.5);
        vec4 mvPosition = viewMatrix * vec4(wp, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: GLSL_WORLD + `uniform sampler2D uImp; varying vec2 vUv; varying vec3 vWp; varying float vTint; varying vec3 vBase; varying float vX;
      #include <fog_pars_fragment>
      void main() { vec4 t = texture2D(uImp, vUv); if (t.a < 0.4) discard;
        float tD = length(cameraPosition - vBase); if (smoothstep(uTreeNear - 40.0, uTreeNear, tD) < ign(gl_FragCoord.xy)) discard;
        vec3 toC = normalize(cameraPosition - vBase); vec3 right = normalize(vec3(toC.z, 0.0, -toC.x));
        vec3 n = normalize(right * vX * 0.9 + vec3(toC.x, 0.0, toC.z) * (1.0 - abs(vX) * 0.6) + vec3(0.0, 0.45, 0.0));
        float vis = texture2D(uTT, ttUV(vBase)).a;
        vec3 lit = uSunCol * (0.3183 * (max(dot(n, uSunDir), 0.0) * 0.8 + 0.2 * max(uSunDir.y, 0.0))) * vis + uSkyAmb * 0.62;
        gl_FragColor = vec4(t.rgb * mix(0.8, 1.2, vTint - 0.8) * lit * mix(1.0, 0.5, smoothstep(250.0, 1400.0, tD)), 1.0);   // from across the valley a snowy fir still reads dark
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
}
/* far cards, grouped in blocks of tiles so the frustum can drop most of them */
const BB_BLOCK = 4, bbBlocks = []; let treeCount = 0;
function thinBillboards(cam) { for (const b of bbBlocks) { const d = Math.hypot(b.x - cam.x, b.z - cam.z); b.g.instanceCount = Math.ceil(b.n * (d < Q.bbFull ? 1 : d < Q.bbFull * 2 ? 0.6 : 0.34)); } }
function buildBillboards(progress) {
  const quad = new THREE.BufferGeometry();
  quad.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3)); quad.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); quad.setIndex([0, 1, 2, 0, 2, 3]);
  for (let bz = 0; bz < CNZ; bz += BB_BLOCK) for (let bx = 0; bx < CNX; bx += BB_BLOCK) {
    const A = [], B = []; let lo = 1e9, hi = -1e9;
    for (let cz = bz; cz < Math.min(CNZ, bz + BB_BLOCK); cz++) for (let cx = bx; cx < Math.min(CNX, bx + BB_BLOCK); cx++) {
      const t = tileTrees(cx, cz); for (let k = 0; k < t.length; k += 8) { A.push(t[k], t[k + 1], t[k + 2], t[k + 3]); B.push(t[k + 4] * 1.02, t[k + 5], t[k + 6], t[k + 7]); if (t[k + 1] < lo) lo = t[k + 1]; if (t[k + 1] + t[k + 3] > hi) hi = t[k + 1] + t[k + 3]; }
    }
    if (!A.length) continue; treeCount += A.length / 4;
    for (let i = A.length / 4 - 1; i > 0; i--) { const j = Math.floor(hash2(i, bx * 131 + bz, 95) * (i + 1)); for (let c = 0; c < 4; c++) { const a = i * 4 + c, b = j * 4 + c, t = A[a]; A[a] = A[b]; A[b] = t; const u = B[a]; B[a] = B[b]; B[b] = u; } }
    const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.setAttribute("position", quad.attributes.position); g.setAttribute("uv", quad.attributes.uv);
    g.setAttribute("iA", new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute("iB", new THREE.InstancedBufferAttribute(new Float32Array(B), 4)); g.instanceCount = A.length / 4;
    const w = BB_BLOCK * CH; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(X0 + bx * CH + w / 2, (lo + hi) / 2, Z0 + bz * CH + w / 2), Math.hypot(w * 0.71, (hi - lo) / 2) + 20);
    const m = new THREE.Mesh(g, bbMat); m.matrixAutoUpdate = false; scene.add(m); bbBlocks.push({ g, n: A.length / 4, x: X0 + bx * CH + w / 2, z: Z0 + bz * CH + w / 2 });
  }
}
/* near meshes, one pair of instanced meshes per tile, built as the skier approaches */
const nearTiles = new Map(), _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _ts = new THREE.Vector3(), _tp = new THREE.Vector3(), _tc = new THREE.Color(), _up = new THREE.Vector3(0, 1, 0);
function updateTrees(cam) {
  const R = Q.treeNear + 40, c0x = Math.floor((cam.x - R - X0) / CH), c1x = Math.floor((cam.x + R - X0) / CH), c0z = Math.floor((cam.z - R - Z0) / CH), c1z = Math.floor((cam.z + R - Z0) / CH);
  for (const [key, nt] of nearTiles) { const cx = key % 1000, cz = (key / 1000) | 0; if (cx < c0x - 1 || cx > c1x + 1 || cz < c0z - 1 || cz > c1z + 1) { for (const m of nt) { scene.remove(m); m.dispose(); } nearTiles.delete(key); } }
  let made = 0;
  for (let cz = Math.max(0, c0z); cz <= Math.min(CNZ - 1, c1z); cz++) for (let cx = Math.max(0, c0x); cx <= Math.min(CNX - 1, c1x); cx++) {
    const key = cz * 1000 + cx; let nt = nearTiles.get(key);
    if (!nt) {
      if (made > 2) continue; made++;
      const t = tileTrees(cx, cz), cnt = [0, 0]; for (let k = 0; k < t.length; k += 8) cnt[t[k + 6]]++;
      nt = [];
      for (let v = 0; v < 2; v++) {
        if (!cnt[v]) continue; const m = new THREE.InstancedMesh(treeGeo[v], treeMat, cnt[v]); m.userData.v = v; let n = 0;
        for (let k = 0; k < t.length; k += 8) if (t[k + 6] === v) { _tq.setFromAxisAngle(_up, t[k + 5]); _tm.compose(_tp.set(t[k], t[k + 1], t[k + 2]), _tq, _ts.set(t[k + 4], t[k + 3], t[k + 4])); m.setMatrixAt(n, _tm); const s = t[k + 7]; m.setColorAt(n++, _tc.setRGB(s, s, s)); }
        m.instanceMatrix.needsUpdate = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); nt.push(m);
      }
      nearTiles.set(key, nt);
    }
    const dx = Math.max(X0 + cx * CH - cam.x, 0, cam.x - X0 - (cx + 1) * CH), dz = Math.max(Z0 + cz * CH - cam.z, 0, cam.z - Z0 - (cz + 1) * CH), d = Math.hypot(dx, dz);
    for (const m of nt) { m.castShadow = d < Q.shadowR + 30; m.visible = d < R; const want = d > 110 ? treeGeoLo[m.userData.v] : treeGeo[m.userData.v]; if (m.geometry !== want) m.geometry = want; }
  }
}
/* trunk the skier would hit at (x, z), or null */
function treeHit(x, z, rad) {
  const cx = Math.floor((x - X0) / CH), cz = Math.floor((z - Z0) / CH); if (cx < 0 || cz < 0 || cx >= CNX || cz >= CNZ) return null;
  const t = tileTrees(cx, cz);
  for (let k = 0; k < t.length; k += 8) { const dx = t[k] - x, dz = t[k + 2] - z, r = rad + 0.1 + t[k + 3] * 0.008; if (dx * dx + dz * dz < r * r) return { x: t[k], z: t[k + 2], h: t[k + 3] }; }
  return null;
}

/* ---------- cliffs: every surveyed cliff is one rock ----------
   Connected patches of the lidar cliff map are found once. Each becomes a single mesh laid over the real cliff surface and pushed
   out along its normal by the chosen style, so no two are the same size or shape: each is as big as the cliff it stands on. */
const ROCK_STYLES = {
  a: { name: "Granite domes", flat: false, lo: [0.20, 0.19, 0.18], hi: [0.50, 0.48, 0.45] },
  b: { name: "Fractured blocks", flat: true, lo: [0.085, 0.062, 0.045], hi: [0.34, 0.26, 0.18] },
  c: { name: "Stepped ledges", flat: true, lo: [0.13, 0.11, 0.095], hi: [0.40, 0.33, 0.26] },
  d: { name: "Fluted columns", flat: true, lo: [0.05, 0.05, 0.055], hi: [0.22, 0.21, 0.21] }
};
let rockStyle = QS.get("rock") || store.get("pal-rock", "b"); if (!ROCK_STYLES[rockStyle]) rockStyle = "b";
const rockU = { uRkLo: { value: new THREE.Color() }, uRkHi: { value: new THREE.Color() } };
let CLIFFS = [], rockMats = null;
function rockPush(x, y, z, nx, nz) { // how far the rock stands out from the surveyed surface, by style
  if (rockStyle === "a") { const n = vnoise(x * 0.11 + y * 0.05, z * 0.11 + y * 0.08, 61); return 1.6 * n * n + 0.25 * vnoise(x * 0.45, z * 0.45 + y * 0.35, 62); }
  if (rockStyle === "b") { const a = Math.floor((x * 0.8 + z * 0.6) / 3.4), b = Math.floor(y / 2.8 + 0.4 * hash2(a, 1, 66)), c = Math.floor((-x * 0.6 + z * 0.8) / 3.4); return 0.2 + 1.7 * hash2(a * 7 + b * 13, c * 5 + b, 63); }
  if (rockStyle === "c") { const t = y / 2.6 + vnoise(x * 0.05, z * 0.05, 64) * 1.6, f = t - Math.floor(t); return 1.5 * (f < 0.78 ? f / 0.78 : (1 - f) / 0.22) + 0.2 * vnoise(x * 0.6, z * 0.6, 65); }
  const s2 = x * -nz + z * nx; return 1.7 * Math.pow(Math.abs(Math.sin(s2 * 0.62 + vnoise(y * 0.07, s2 * 0.03, 67) * 3)), 0.55) + 0.25 * vnoise(x * 0.5, z * 0.5 + y * 0.4, 68);
}
function initRocks() {
  const lab = new Int32Array(NX * NZ), stack = [];
  for (let k0 = 0; k0 < NX * NZ; k0++) {
    if (CL[k0] <= 0.35 || lab[k0]) continue; const id = CLIFFS.length + 1, c = { id, i0: 1e9, i1: 0, j0: 1e9, j1: 0, n: 0, mesh: null }; stack.push(k0); lab[k0] = id;
    while (stack.length) { const k = stack.pop(), i = k % NX, j = (k / NX) | 0; c.n++; if (i < c.i0) c.i0 = i; if (i > c.i1) c.i1 = i; if (j < c.j0) c.j0 = j; if (j > c.j1) c.j1 = j;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const q = b * NX + a; if (CL[q] > 0.35 && !lab[q]) { lab[q] = id; stack.push(q); } } }
    c.x = X0 + (c.i0 + c.i1) / 2 * CELL; c.z = Z0 + (c.j0 + c.j1) / 2 * CELL; c.r = Math.hypot(c.i1 - c.i0, c.j1 - c.j0) * CELL / 2 + 6; CLIFFS.push(c);
  }
  CLIFFS.lab = lab;
  const mk = flat => worldShade(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: flat }), {
    patch(sh) { Object.assign(sh.uniforms, rockU); sh.fragmentShader = "uniform vec3 uRkLo, uRkHi;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 wn = normalize(cross(dFdx(vWp), dFdy(vWp))); vec2 rw = abs(wn.xz) + 0.001; rw /= rw.x + rw.y;
        float n1 = texture2D(uNoise, vWp.zy * 0.045).r * rw.x + texture2D(uNoise, vWp.xy * 0.045).r * rw.y, n2 = texture2D(uNoise, vWp.zy * 0.4).g * rw.x + texture2D(uNoise, vWp.xy * 0.4).g * rw.y, n3 = texture2D(uNoise, vWp.zy * vec2(0.5, 0.02)).b * rw.x + texture2D(uNoise, vWp.xy * vec2(0.5, 0.02)).b * rw.y;
        vec3 rk = mix(uRkLo, uRkHi, n1 * 0.6 + n2 * 0.4) * (1.0 - 0.3 * smoothstep(0.55, 0.8, n3));
        float sn = smoothstep(0.42, 0.6, wn.y + (n2 - 0.5) * 0.3);
        diffuseColor.rgb = mix(rk, vec3(0.9, 0.92, 0.95), sn); }`); }
  });
  rockMats = { smooth: mk(false), flat: mk(true) }; setRockStyle(rockStyle);
}
function setRockStyle(k) { rockStyle = k; store.set("pal-rock", k); const st = ROCK_STYLES[k]; rockU.uRkLo.value.setRGB(...st.lo); rockU.uRkHi.value.setRGB(...st.hi); for (const c of CLIFFS) if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; } }
function buildCliff(c) {
  const big = c.n > 900, st = big ? 2.5 : 1.25, pad = 5, x0 = X0 + c.i0 * CELL - pad, z0 = Z0 + c.j0 * CELL - pad, nx = Math.ceil(((c.i1 - c.i0) * CELL + 2 * pad) / st) + 1, nz = Math.ceil(((c.j1 - c.j0) * CELL + 2 * pad) / st) + 1;
  const hs = new Float32Array(nx * nz), ms = new Float32Array(nx * nz), pos = new Float32Array(nx * nz * 3), lab = CLIFFS.lab;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * st, z = z0 + j * st, k = j * nx + i; hs[k] = H(x, z);
    const gi = clamp(Math.round((x - X0) / CELL), 0, NX - 1), gj = clamp(Math.round((z - Z0) / CELL), 0, NZ - 1), l = lab[gj * NX + gi]; ms[k] = l && l !== c.id ? 0 : sstep(0.16, 0.5, cliffK(x, z)); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = x0 + i * st, z = z0 + j * st, i0 = Math.max(0, i - 1), i1 = Math.min(nx - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nz - 1, j + 1);
    let ax = (hs[j * nx + i0] - hs[j * nx + i1]) / ((i1 - i0) * st), az = (hs[j0 * nx + i] - hs[j1 * nx + i]) / ((j1 - j0) * st); const il = 1 / Math.hypot(ax, 1, az), hl = Math.hypot(ax, az) || 1, m = ms[k], d = m * (0.15 + rockPush(x, hs[k], z, ax / hl, az / hl));
    pos[k * 3] = x - c.x + ax * il * d; pos[k * 3 + 1] = hs[k] + il * d * 0.6; pos[k * 3 + 2] = z - c.z + az * il * d; }
  const idx = []; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1; if (ms[a] < 0.07 || ms[b] < 0.07 || ms[d] < 0.07 || ms[e] < 0.07) continue; idx.push(a, d, b, b, d, e); }
  if (!idx.length) { c.mesh = false; return; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, ROCK_STYLES[rockStyle].flat ? rockMats.flat : rockMats.smooth); m.position.set(c.x, 0, c.z); m.matrixAutoUpdate = false; m.updateMatrix(); m.receiveShadow = true; m.castShadow = true; scene.add(m); c.mesh = m;
}
function updateRocks(cam) {
  let made = 0;
  for (const c of CLIFFS) { const d = Math.hypot(c.x - cam.x, c.z - cam.z) - c.r;
    if (d > Q.rockR + 150) { if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); } c.mesh = null; continue; }
    if (d < Q.rockR && c.mesh === null && c.n >= 2 && made < 2) { buildCliff(c); made++; }
    if (c.mesh) c.mesh.castShadow = d < Q.shadowR + 60; }
}
