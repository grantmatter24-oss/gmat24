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
    const tm = treeMask(x, z); if (tm < 0.12) continue;
    if (hash2(gx, gz, 1) > tm * tm * 0.6 + 0.02) continue;
    if (!inWorld(x, z, 30)) continue;
    const y = H(x, z), hi = sstep(2330, 2640, y), big = hash2(gx, gz, 4);
    const h = Math.max(9.5, (9 + 19 * big * big + 6 * tm) * lerp(1.1, 0.62, hi)), v = hash2(gx, gz, 5) < lerp(0.35, 0.75, hi) ? 1 : 0;
    out.push(x, y - 0.3, z, h, h * (v ? 0.34 : 0.25) * (0.85 + 0.3 * hash2(gx, gz, 6)), hash2(gx, gz, 7) * TAU, v, 0.8 + 0.4 * hash2(gx, gz, 8));
  }
  t = new Float32Array(out); treeTiles.set(key, t); return t;
}
/* unit-height conifer: v=0 a narrow fir spire, v=1 a broader pine with a taller clear trunk */
function treeGeometry(v) {
  const pos = [], nor = [], col = [], seg = 9, tiers = v ? 6 : 8, y0 = v ? 0.44 : 0.33;   // the lowest boughs sit a third of the way up: 3 m or more of clear trunk
  const tri = (a, b, c, ca, cb, cc) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    pos.push(...a, ...b, ...c); nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); col.push(...ca, ...cb, ...cc);
  };
  const bark = [0.16, 0.10, 0.065], dark = [0.018, 0.045, 0.024], tip = [0.055, 0.115, 0.05];
  for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU, a1 = (i + 1) / 6 * TAU, r0 = 0.05, r1 = 0.02, yt = v ? 0.7 : 0.6; tri([Math.cos(a0) * r0, 0, Math.sin(a0) * r0], [Math.cos(a0) * r1, yt, Math.sin(a0) * r1], [Math.cos(a1) * r0, 0, Math.sin(a1) * r0], bark, bark, bark); tri([Math.cos(a1) * r0, 0, Math.sin(a1) * r0], [Math.cos(a0) * r1, yt, Math.sin(a0) * r1], [Math.cos(a1) * r1, yt, Math.sin(a1) * r1], bark, bark, bark); }
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1), yb = lerp(y0, 0.86, Math.pow(f, 0.9)), th = lerp(0.2, 0.12, f) * (v ? 1.2 : 1), yt = Math.min(1, yb + th), rb = lerp(0.5, 0.09, Math.pow(f, v ? 0.7 : 0.85)) * (v && t === 0 ? 0.8 : 1), tw = t * 0.7;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU + tw, a1 = (i + 1) / seg * TAU + tw, am = (a0 + a1) / 2, k0 = 0.78 + 0.22 * hash2(i, t, 40 + v), k1 = 0.78 + 0.22 * hash2((i + 1) % seg, t, 40 + v), dr = 0.045 * (1 - f);
      const p0 = [Math.cos(a0) * rb * k0, yb - dr * k0, Math.sin(a0) * rb * k0], p1 = [Math.cos(a1) * rb * k1, yb - dr * k1, Math.sin(a1) * rb * k1], pm = [Math.cos(am) * rb * 0.62, yb + th * 0.1, Math.sin(am) * rb * 0.62], top = [0, yt, 0];
      tri(top, pm, p0, dark, dark, tip); tri(top, p1, pm, dark, tip, dark);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g;
}
const TREE_SNOW = `float tsn = smoothstep(0.66, 0.92, tNy * 0.8 + texture2D(uNoise, tP.xz * 0.9 + tP.y * 0.31).r * 0.62 - 0.06) * step(0.012, tGreen) * 0.7;`;
let treeGeo = null, treeMat = null, treeDepthMat = null, impTex = null, bbMat = null;
function initTrees() {
  treeGeo = [treeGeometry(0), treeGeometry(1)];
  treeMat = worldShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }), {
    patch(sh) {
      sh.vertexShader = "varying vec3 vOn; varying vec3 vOp;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vOn = normal; vOp = position;");
      sh.fragmentShader = "varying vec3 vOn; varying vec3 vOp;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        { float tD = length(cameraPosition - vWp); if (smoothstep(uTreeNear - 40.0, uTreeNear, tD) > ign(gl_FragCoord.xy)) discard;
          float tNy = vOn.y * (gl_FrontFacing ? 1.0 : -1.0), tGreen = diffuseColor.g - diffuseColor.r; vec3 tP = vWp; ${TREE_SNOW}
          diffuseColor.rgb = mix(diffuseColor.rgb * (0.55 + 0.9 * smoothstep(0.0, 0.5, length(vOp.xz))), vec3(0.80, 0.83, 0.88), tsn); }`)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= 0.45 + 0.55 * smoothstep(0.05, 0.45, length(vOp.xz));");
    }
  });
  // cards: render each model once, lit from above so the card carries its own shading
  const S = 256, rt = new THREE.WebGLRenderTarget(S * 2, S * 2, { depthBuffer: true }); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.colorSpace = THREE.NoColorSpace;
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-0.5, 0.5, 1, 0, -2, 2);
  const im = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexColors: true, uniforms: { uNoise: U.uNoise },
    vertexShader: `varying vec3 vC; varying vec3 vN; varying vec3 vP; void main() { vC = color; vN = normal; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uNoise; varying vec3 vC; varying vec3 vN; varying vec3 vP;
      void main() { float tNy = vN.y * (gl_FrontFacing ? 1.0 : -1.0), tGreen = vC.g - vC.r; vec3 tP = vP * 14.0; ${TREE_SNOW}
        vec3 c = mix(vC * (0.55 + 0.9 * smoothstep(0.0, 0.5, length(vP.xz))), vec3(0.80, 0.83, 0.88), tsn);
        gl_FragColor = vec4(c * (0.5 + 0.5 * clamp(tNy * 0.5 + 0.6, 0.0, 1.0)), 1.0); }` });
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
        gl_FragColor = vec4(t.rgb * mix(0.8, 1.2, vTint - 0.8) * lit, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
}
/* far cards, grouped in blocks of tiles so the frustum can drop most of them */
const BB_BLOCK = 4; let treeCount = 0;
function buildBillboards(progress) {
  const quad = new THREE.BufferGeometry();
  quad.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3)); quad.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); quad.setIndex([0, 1, 2, 0, 2, 3]);
  for (let bz = 0; bz < CNZ; bz += BB_BLOCK) for (let bx = 0; bx < CNX; bx += BB_BLOCK) {
    const A = [], B = []; let lo = 1e9, hi = -1e9;
    for (let cz = bz; cz < Math.min(CNZ, bz + BB_BLOCK); cz++) for (let cx = bx; cx < Math.min(CNX, bx + BB_BLOCK); cx++) {
      const t = tileTrees(cx, cz); for (let k = 0; k < t.length; k += 8) { A.push(t[k], t[k + 1], t[k + 2], t[k + 3]); B.push(t[k + 4] * 1.02, t[k + 5], t[k + 6], t[k + 7]); if (t[k + 1] < lo) lo = t[k + 1]; if (t[k + 1] + t[k + 3] > hi) hi = t[k + 1] + t[k + 3]; }
    }
    if (!A.length) continue; treeCount += A.length / 4;
    const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.setAttribute("position", quad.attributes.position); g.setAttribute("uv", quad.attributes.uv);
    g.setAttribute("iA", new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute("iB", new THREE.InstancedBufferAttribute(new Float32Array(B), 4)); g.instanceCount = A.length / 4;
    const w = BB_BLOCK * CH; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(X0 + bx * CH + w / 2, (lo + hi) / 2, Z0 + bz * CH + w / 2), Math.hypot(w * 0.71, (hi - lo) / 2) + 20);
    const m = new THREE.Mesh(g, bbMat); m.matrixAutoUpdate = false; scene.add(m);
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
        if (!cnt[v]) continue; const m = new THREE.InstancedMesh(treeGeo[v], treeMat, cnt[v]); let n = 0;
        for (let k = 0; k < t.length; k += 8) if (t[k + 6] === v) { _tq.setFromAxisAngle(_up, t[k + 5]); _tm.compose(_tp.set(t[k], t[k + 1], t[k + 2]), _tq, _ts.set(t[k + 4], t[k + 3], t[k + 4])); m.setMatrixAt(n, _tm); const s = t[k + 7]; m.setColorAt(n++, _tc.setRGB(s, s, s)); }
        m.instanceMatrix.needsUpdate = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); nt.push(m);
      }
      nearTiles.set(key, nt);
    }
    const dx = Math.max(X0 + cx * CH - cam.x, 0, cam.x - X0 - (cx + 1) * CH), dz = Math.max(Z0 + cz * CH - cam.z, 0, cam.z - Z0 - (cz + 1) * CH), d = Math.hypot(dx, dz);
    for (const m of nt) { m.castShadow = d < Q.shadowR + 30; m.visible = d < R; }
  }
}
/* trunk the skier would hit at (x, z), or null */
function treeHit(x, z, rad) {
  const cx = Math.floor((x - X0) / CH), cz = Math.floor((z - Z0) / CH); if (cx < 0 || cz < 0 || cx >= CNX || cz >= CNZ) return null;
  const t = tileTrees(cx, cz);
  for (let k = 0; k < t.length; k += 8) { const dx = t[k] - x, dz = t[k + 2] - z, r = rad + 0.1 + t[k + 3] * 0.008; if (dx * dx + dz * dz < r * r) return { x: t[k], z: t[k + 2], h: t[k + 3] }; }
  return null;
}
