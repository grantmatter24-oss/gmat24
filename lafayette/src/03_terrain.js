/* ---------- terrain: a quadtree of instanced patches that read the height grid straight from a texture ---------- */
const TX = {};   // shared textures
function noiseTexture(size = 512) {   // four independent tileable noises, one per channel
  const d = new Uint8Array(size * size * 4), per = [64, 16, 32, 6];
  const tn = (x, y, p, seed) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), h = (a, b) => hash2(((a % p) + p) % p, ((b % p) + p) % p, seed); return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy); };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let c = 0; c < 4; c++) {
    let s = 0, a = 0.5, f = per[c], tot = 0; for (let o = 0; o < 4; o++) { s += a * tn(x / size * f, y / size * f, f, 11 + c * 31 + o * 7); tot += a; a *= 0.55; f *= 2; }
    d[(y * size + x) * 4 + c] = clamp(Math.round(((s / tot - 0.5) * 1.9 + 0.5) * 255), 0, 255);
  }
  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = Math.min(8, MAXANISO); t.needsUpdate = true; return t;
}
function normalTexture(Hh, w, h, cell) {
  const d = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const a = Hh[j * w + Math.max(0, i - 1)] - Hh[j * w + Math.min(w - 1, i + 1)], b = Hh[Math.max(0, j - 1) * w + i] - Hh[Math.min(h - 1, j + 1) * w + i], l = 1 / Math.hypot(a, 2 * cell, b), k = (j * w + i) * 4;
    d[k] = Math.round((a * l * 0.5 + 0.5) * 255); d[k + 1] = Math.round(2 * cell * l * 255); d[k + 2] = Math.round((b * l * 0.5 + 0.5) * 255); d[k + 3] = 255;
  }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t;
}
function heightTexture(Hh, w, h) { const t = new THREE.DataTexture(Hh, w, h, THREE.RedFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
function imageTexture(im, srgb, maxSize) {
  let src = im; if (maxSize && Math.max(im.width, im.height) > maxSize) { const c = document.createElement("canvas"), k = maxSize / Math.max(im.width, im.height); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); src = c; }
  const t = new THREE.Texture(src); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = Math.min(4, MAXANISO); t.needsUpdate = true; return t;
}
function bytesTexture(bytes, w, h) { const t = new THREE.DataTexture(bytes, w, h, THREE.RGBAFormat); t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = Math.min(4, MAXANISO); t.needsUpdate = true; return t; }

const PATCH = 32;   // quads along one side of every patch
function patchGeometry() {
  const n = PATCH + 1, pos = [], idx = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pos.push(i, 0, j);
  for (let j = 0; j < PATCH; j++) for (let i = 0; i < PATCH; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
  // a skirt hangs from the rim to hide the hairline gaps where a fine patch meets a coarse one
  const rim = []; for (let i = 0; i < PATCH; i++) rim.push([i, 0]); for (let j = 0; j < PATCH; j++) rim.push([PATCH, j]); for (let i = PATCH; i > 0; i--) rim.push([i, PATCH]); for (let j = PATCH; j > 0; j--) rim.push([0, j]);
  const base = pos.length / 3; for (const [i, j] of rim) pos.push(i, 1, j);
  for (let k = 0; k < rim.length; k++) { const k2 = (k + 1) % rim.length, a = rim[k][1] * n + rim[k][0], b = rim[k2][1] * n + rim[k2][0], c = base + k, d = base + k2; idx.push(a, c, b, b, c, d); }
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const nor = new Float32Array(pos.length); for (let i = 1; i < nor.length; i += 3) nor[i] = 1; g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return g;
}
const TERRAIN_FRAG_COMMON = `
uniform sampler2D tNoise, tNormal, tSat, tLo, tHi; uniform vec4 uRect; uniform vec4 uHole; uniform vec4 uGridF; uniform float uTreeNear, uBldFar; varying vec3 vWpos;
float thash(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.y); }
`;
function terrainMaterial(layer) {
  const inner = layer.inner, m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 });
  m.defines = inner ? { T_INNER: 1 } : { T_OUTER: 1 };
  m.onBeforeCompile = sh => {
    shareUniforms(sh);
    Object.assign(sh.uniforms, { tHeight: { value: layer.tHeight }, tNoise: { value: TX.noise }, tNormal: { value: layer.tNormal }, tSat: { value: layer.tSat }, tLo: { value: layer.tLo }, tHi: { value: layer.tHi || TX.noise },
      uRect: { value: new THREE.Vector4(layer.x0, layer.z0, 1 / (layer.cell * (layer.w - 1)), 1 / (layer.cell * (layer.h - 1))) }, uGrid: { value: new THREE.Vector4(layer.w - 1, layer.h - 1, layer.cell, 0) },
      uHole: { value: layer.hole || new THREE.Vector4(1, 1, -1, -1) }, uTreeNear: layer.uTreeNear, uBldFar: layer.uBldFar });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform highp sampler2D tHeight; uniform vec4 uRect; uniform vec4 uGrid; attribute vec3 aNode; varying vec3 vWpos;")
      .replace("#include <begin_vertex>", `vec2 cell = clamp( aNode.xy + position.xz * aNode.z, vec2( 0.0 ), uGrid.xy );
        float th = texelFetch( tHeight, ivec2( cell ), 0 ).r - position.y * aNode.z * uGrid.z * 0.7;
        vec3 transformed = vec3( uRect.x + cell.x * uGrid.z, th, uRect.y + cell.y * uGrid.z ); vWpos = transformed;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + TERRAIN_FRAG_COMMON)
      .replace("#include <map_fragment>", `
        vec2 wxz = vWpos.xz; if ( wxz.x > uHole.x && wxz.x < uHole.z && wxz.y > uHole.y && wxz.y < uHole.w ) discard;
        vec2 uvR = ( wxz - uRect.xy ) * uRect.zw; float dist = length( vWpos - cameraPosition );
        vec4 n1 = texture2D( tNoise, wxz * 0.23 ), n2 = texture2D( tNoise, wxz * 0.037 + 0.37 ), n3 = texture2D( tNoise, wxz * 0.0047 + 0.11 );
        #ifdef T_INNER
          vec2 uvS = ( uvR * vec2( ${LOW - 1}.0, ${LOH - 1}.0 ) + 0.5 ) / vec2( ${LOW}.0, ${LOH}.0 );
          vec3 sat = texture2D( tSat, uvS ).rgb; vec3 lo = texture2D( tLo, uvS ).rgb; vec3 hi = texture2D( tHi, uvR ).rgb;
          float nearK = 1.0 - smoothstep( 40.0, 160.0, dist );
          sat = mix( vec3( dot( sat, vec3( 0.3, 0.55, 0.15 ) ) ), sat, 1.3 ); vec3 g = sat * ( 0.80 + 0.40 * n2.g ) * ( 0.90 + 0.20 * n3.a ); g *= mix( 1.0, 0.72 + 0.56 * n1.r, nearK );
          float can = smoothstep( 0.30, 0.70, lo.r + ( n2.r - 0.5 ) * 0.25 );
          float nearT = 1.0 - smoothstep( uTreeNear * 0.75, uTreeNear, dist );
          vec3 litter = vec3( 0.150, 0.118, 0.080 ) * ( 0.65 + 0.7 * n1.g );
          g = mix( g, mix( litter, g * 0.6, 0.4 ), can * nearT );
          g = mix( g, g * ( 0.55 + 0.9 * n2.b ) * vec3( 0.86, 0.95, 0.80 ), can * ( 1.0 - nearT ) );
          float turf = lo.b * ( 1.0 - can ); g = mix( g, g * vec3( 0.80, 1.05, 0.72 ), turf * 0.5 ); g *= 1.0 - 0.24 * clamp( lo.g * 1.4, 0.0, 1.0 ) * ( 1.0 - can );   // soil under the blades is darker than their tips
          vec3 dirtC = vec3( 0.36, 0.285, 0.20 ) * ( 0.72 + 0.56 * n1.g ) * ( 0.85 + 0.3 * n2.r ); g = mix( g, dirtC, smoothstep( 0.06, 0.42, hi.g ) );
          vec3 asph = vec3( 0.130, 0.131, 0.135 ) * ( 0.82 + 0.36 * n1.b ); g = mix( g, asph, smoothstep( 0.35, 0.62, hi.r ) );
          float st = hi.b; float bld = smoothstep( 0.45, 0.8, st ); vec2 rc = floor( wxz / 14.0 ); float rh = thash( rc );
          vec3 roof = mix( vec3( 0.20, 0.185, 0.17 ), vec3( 0.42, 0.40, 0.37 ), rh ); roof = mix( roof, vec3( 0.30, 0.17, 0.12 ), step( 0.82, thash( rc + 7.0 ) ) );
          g = mix( g, mix( vec3( 0.20, 0.19, 0.175 ), roof, smoothstep( uBldFar * 0.82, uBldFar, dist ) ), bld );
          float rough = mix( 0.96, 0.82, smoothstep( 0.35, 0.62, hi.r ) );
        #else
          vec3 sat = texture2D( tSat, uvR ).rgb; sat = mix( vec3( dot( sat, vec3( 0.3, 0.55, 0.15 ) ) ), sat, 1.3 ); float can = texture2D( tLo, uvR ).r;
          vec3 g = sat * ( 0.84 + 0.32 * n2.g ) * ( 0.92 + 0.16 * n3.a ); g = mix( g, g * ( 0.62 + 0.76 * n2.b ), smoothstep( 0.3, 0.7, can ) * ( 1.0 - smoothstep( 2500.0, 9000.0, dist ) ) );
          float rough = 0.96;
        #endif
        diffuseColor.rgb = g;`)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = rough;")
      .replace("#include <normal_fragment_maps>", `
        vec3 tn = texture2D( tNormal, ( uvR * uGridF.xy + 0.5 ) / ( uGridF.xy + 1.0 ) ).xyz; tn = normalize( vec3( tn.x * 2.0 - 1.0, tn.y, tn.z * 2.0 - 1.0 ) );
        tn = normalize( tn + vec3( n1.g - 0.5, 0.0, n1.b - 0.5 ) * 0.16 * ( 1.0 - smoothstep( 30.0, 140.0, dist ) ) );
        normal = normalize( mat3( viewMatrix ) * tn );`);
    sh.uniforms.uGridF = { value: new THREE.Vector4(layer.w - 1, layer.h - 1, 0, 0) };
  };
  m.customProgramCacheKey = () => "terrain" + (inner ? 1 : 0);
  return m;
}
/* One terrain layer = one height grid drawn as a quadtree. `levels` is how many times the base patch may double. */
function makeTerrainLayer(o) {
  const L = Object.assign({ nodes: 0, max: 700 }, o);
  L.geo = patchGeometry(); L.attr = new THREE.InstancedBufferAttribute(new Float32Array(L.max * 3), 3); L.attr.setUsage(THREE.DynamicDrawUsage); L.geo.setAttribute("aNode", L.attr);
  L.mesh = new THREE.Mesh(L.geo, terrainMaterial(L)); L.mesh.frustumCulled = false; L.mesh.receiveShadow = true; L.mesh.matrixAutoUpdate = false; scene.add(L.mesh);
  // min and max height of every base patch, so patches behind hills or off screen are skipped
  const bw = Math.ceil((L.w - 1) / PATCH), bh = Math.ceil((L.h - 1) / PATCH); L.bw = bw; L.bh = bh; L.mn = new Float32Array(bw * bh); L.mx = new Float32Array(bw * bh);
  for (let bj = 0; bj < bh; bj++) for (let bi = 0; bi < bw; bi++) {
    let a = 1e9, b = -1e9; for (let j = bj * PATCH; j <= Math.min(L.h - 1, (bj + 1) * PATCH); j += 2) for (let i = bi * PATCH; i <= Math.min(L.w - 1, (bi + 1) * PATCH); i += 2) { const v = L.H[j * L.w + i]; if (v < a) a = v; if (v > b) b = v; }
    L.mn[bj * bw + bi] = a; L.mx[bj * bw + bi] = b;
  }
  return L;
}
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _bx = new THREE.Box3();
function updateTerrainLayer(L) {
  const A = L.attr.array, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z; let n = 0;
  const top = 1 << L.levels, step0 = PATCH * L.cell;
  const visit = (lv, bi, bj) => {   // node covers base patches [bi, bi + 2^lv) x [bj, bj + 2^lv)
    const s = 1 << lv, i1 = Math.min(L.bw, bi + s), j1 = Math.min(L.bh, bj + s); if (bi >= L.bw || bj >= L.bh) return;
    let a = 1e9, b = -1e9; for (let j = bj; j < j1; j++) for (let i = bi; i < i1; i++) { const k = j * L.bw + i; if (L.mn[k] < a) a = L.mn[k]; if (L.mx[k] > b) b = L.mx[k]; }
    const xa = L.x0 + bi * step0, xb = Math.min(L.x0 + (L.w - 1) * L.cell, xa + s * step0), za = L.z0 + bj * step0, zb = Math.min(L.z0 + (L.h - 1) * L.cell, za + s * step0);
    if (L.hole && xa >= L.hole.x && xb <= L.hole.z && za >= L.hole.y && zb <= L.hole.w) return;
    _bx.min.set(xa, a - 40, za); _bx.max.set(xb, b + 2, zb); if (!_fr.intersectsBox(_bx)) return;
    const dx = Math.max(xa - cx, 0, cx - xb), dz = Math.max(za - cz, 0, cz - zb), dy = Math.max(a - cy, 0, cy - b); let d = Math.hypot(dx, dy, dz);
    if (L.hole) { const hx = Math.max(L.hole.x - xb, 0, xa - L.hole.z), hz = Math.max(L.hole.y - zb, 0, za - L.hole.w); d = Math.min(d, Math.hypot(hx, hz) * 0.8); }   // stay fine beside the playable map so the seam is exact
    if (lv > 0 && d < s * step0 * L.lodK) { const h = s >> 1; visit(lv - 1, bi, bj); visit(lv - 1, bi + h, bj); visit(lv - 1, bi, bj + h); visit(lv - 1, bi + h, bj + h); return; }
    if (n >= L.max) return; A[n * 3] = bi * PATCH; A[n * 3 + 1] = bj * PATCH; A[n * 3 + 2] = s; n++;
  };
  for (let bj = 0; bj < L.bh; bj += top) for (let bi = 0; bi < L.bw; bi += top) visit(L.levels, bi, bj);
  L.geo.instanceCount = n; L.attr.needsUpdate = true; L.nodes = n;
}
let terrIn, terrMid, farMesh, seaMesh;
const uTreeNear = { value: 900 }, uBldFar = { value: 2600 };
function buildTerrain() {
  TX.noise = noiseTexture(); const maxT = renderer.capabilities.maxTextureSize;
  TX.sat = imageTexture(SATIMG, true); TX.satMid = imageTexture(SATMIDIMG, true); TX.satFar = imageTexture(SATFARIMG, true);
  TX.lo = bytesTexture(LO, LOW, LOH); TX.hi = bytesTexture(HI, HIW, HIH); TX.hi.anisotropy = Math.min(8, MAXANISO); TX.midTree = bytesTexture(MIDTREE, MN, MN);
  TX.height = heightTexture(HM, NX, NZ); TX.normal = normalTexture(HM, NX, NZ, CELL); TX.heightMid = heightTexture(HMD, MN, MN); TX.normalMid = normalTexture(HMD, MN, MN, MC);
  terrIn = makeTerrainLayer({ inner: true, H: HM, w: NX, h: NZ, cell: CELL, x0: X0, z0: Z0, levels: 4, lodK: 1.55 * Q.far, tHeight: TX.height, tNormal: TX.normal, tSat: TX.sat, tLo: TX.lo, tHi: TX.hi, uTreeNear, uBldFar });
  terrMid = makeTerrainLayer({ inner: false, H: HMD, w: MN, h: MN, cell: MC, x0: -MR, z0: -MR, levels: 3, lodK: 1.7 * Q.far, hole: new THREE.Vector4(X0, Z0, X1, Z1), tHeight: TX.heightMid, tNormal: TX.normalMid, tSat: TX.satMid, tLo: TX.midTree, uTreeNear, uBldFar });
  // far backdrop: one plain mesh out to the horizon, with a hole where the finer ground is
  const n = FN, pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), idx = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; pos[k * 3] = -FR + i * FC; pos[k * 3 + 1] = HFR[k]; pos[k * 3 + 2] = -FR + j * FC; uv[k * 2] = i / (n - 1); uv[k * 2 + 1] = j / (n - 1); }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const x = -FR + i * FC, z = -FR + j * FC; if (x >= -MR && x + FC <= MR && z >= -MR && z + FC <= MR) continue; const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ map: TX.satFar, roughness: 1, metalness: 0 });
  farMesh = new THREE.Mesh(g, fm); farMesh.matrixAutoUpdate = false; scene.add(farMesh);
  const sm = new THREE.MeshStandardMaterial({ color: 0x1d3a4a, roughness: 0.12, metalness: 0.0 });
  seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * FR, 2 * FR).rotateX(-Math.PI / 2), sm); seaMesh.position.y = 0.3; seaMesh.matrixAutoUpdate = false; seaMesh.updateMatrix(); scene.add(seaMesh);
}
function updateTerrain() {
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
  updateTerrainLayer(terrIn); updateTerrainLayer(terrMid);
}

/* ---------- water: the reservoir, ponds and back-yard pools ---------- */
let waterMat, poolMat;
function buildWater() {
  waterMat = new THREE.MeshStandardMaterial({ color: 0x1a3a3c, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.93 });
  waterMat.onBeforeCompile = sh => {
    shareUniforms(sh); sh.uniforms.tNoise = { value: TX.noise };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWpos;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWpos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tNoise; uniform float uTime; varying vec3 vWpos;")
      .replace("#include <normal_fragment_maps>", `vec2 wq = vWpos.xz; vec4 r1 = texture2D( tNoise, wq * 0.09 + vec2( uTime * 0.012, uTime * 0.007 ) ), r2 = texture2D( tNoise, wq * 0.31 - vec2( uTime * 0.02, -uTime * 0.016 ) );
        vec3 wn = normalize( vec3( ( r1.g - 0.5 ) * 0.22 + ( r2.b - 0.5 ) * 0.12, 1.0, ( r1.b - 0.5 ) * 0.22 + ( r2.g - 0.5 ) * 0.12 ) ); normal = normalize( mat3( viewMatrix ) * wn );`);
  };
  poolMat = new THREE.MeshStandardMaterial({ color: 0x2b9bb8, roughness: 0.08, metalness: 0.0 });
  const lakes = [], pools = [];
  for (let w = 0; w < WATERS.length; w++) {
    const W = WATERS[w], sh = new THREE.Shape(); for (let i = 0; i < W.n; i++) { const x = V.wP[(W.a + i) * 2], z = V.wP[(W.a + i) * 2 + 1]; if (i === 0) sh.moveTo(x, z); else sh.lineTo(x, z); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); g.translate(0, W.y, 0); (W.pool ? pools : lakes).push(g);
  }
  for (const [list, mat, ro] of [[lakes, waterMat, 2], [pools, poolMat, 0]]) {
    if (!list.length) continue; const g = mergeGeos(list), m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.renderOrder = ro; m.matrixAutoUpdate = false; scene.add(m);
  }
}
/* Join plain geometries (same attributes) into one. */
function mergeGeos(list) {
  let nv = 0, ni = 0; const names = Object.keys(list[0].attributes);
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry(), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
  const arrs = {}; for (const nm of names) arrs[nm] = new Float32Array(nv * list[0].attributes[nm].itemSize);
  for (const g of list) {
    const c = g.attributes.position.count; for (const nm of names) arrs[nm].set(g.attributes[nm].array, vo * g.attributes[nm].itemSize);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; } else { for (let i = 0; i < c; i++) idx[io + i] = vo + i; io += c; }
    vo += c; g.dispose();
  }
  for (const nm of names) out.setAttribute(nm, new THREE.BufferAttribute(arrs[nm], list[0].attributes[nm].itemSize)); out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
}
