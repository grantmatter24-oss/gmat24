/* ---------- renderer, sky, light, weather ---------- */
const QUAL = {
  low: { pr: 0.8, shadow: 1024, shadowR: 70, msaa: 0, bloom: false, treeNear: 110, lod: 0.55, bbFull: 700, rockR: 260 },
  med: { pr: 1, shadow: 2048, shadowR: 110, msaa: 2, bloom: true, treeNear: 170, lod: 0.8, bbFull: 1300, rockR: 480 },
  high: { pr: 1.5, shadow: 4096, shadowR: 150, msaa: 4, bloom: true, treeNear: 230, lod: 1, bbFull: 2200, rockR: 650 },
  ultra: { pr: 2, shadow: 4096, shadowR: 210, msaa: 4, bloom: true, treeNear: 360, lod: 1.5, bbFull: 6000, rockR: 900 }
};
let qName = QS.get("q") || store.get("pal-gfx", "high"); if (!QUAL[qName]) qName = "high";
let Q = QUAL[qName];
const canvas = $("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.25, 90000);
scene.add(camera);
scene.fog = new THREE.FogExp2(0xa8c4e6, 0.00006);

const sunDir = new THREE.Vector3(0.3, 0.6, 0.7).normalize();
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06;
scene.add(sun, sun.target);

/* Weather presets. Azimuth is clockwise from north (north = -z); the mountain faces east, so golden hour is the morning. */
const WX = {
  bluebird: { name: "Bluebird", az: 158, el: 37, sunCol: [1.0, 0.955, 0.89], sunI: 3.3, zen: [0.115, 0.27, 0.66], hor: [0.60, 0.76, 0.96], gnd: [0.62, 0.68, 0.78], cloud: 0.16, cloudLit: [1, 1, 1], cloudDark: [0.62, 0.68, 0.78], fog: 0.000052, fogCol: [0.56, 0.72, 0.93], exp: 0.66, env: 1.05, snow: 0, lamp: 0, wind: 0.3 },
  golden: { name: "Golden hour", az: 121, el: 9.5, sunCol: [1.0, 0.60, 0.30], sunI: 3.4, zen: [0.11, 0.20, 0.47], hor: [0.93, 0.62, 0.44], gnd: [0.50, 0.46, 0.52], cloud: 0.34, cloudLit: [1.0, 0.72, 0.5], cloudDark: [0.42, 0.36, 0.46], fog: 0.00008, fogCol: [0.80, 0.62, 0.56], exp: 0.86, env: 1.0, snow: 0, lamp: 0.9, wind: 0.4 },
  overcast: { name: "Flat light", az: 170, el: 40, sunCol: [1, 1, 1], sunI: 0.22, zen: [0.50, 0.53, 0.57], hor: [0.70, 0.72, 0.75], gnd: [0.58, 0.60, 0.63], cloud: 1.0, cloudLit: [0.86, 0.87, 0.89], cloudDark: [0.48, 0.5, 0.54], fog: 0.00022, fogCol: [0.70, 0.72, 0.76], exp: 0.78, env: 1.15, snow: 0, lamp: 0.3, wind: 0.8 },
  storm: { name: "Snowing", az: 170, el: 40, sunCol: [1, 1, 1], sunI: 0.05, zen: [0.47, 0.49, 0.53], hor: [0.60, 0.62, 0.65], gnd: [0.55, 0.57, 0.60], cloud: 1.0, cloudLit: [0.7, 0.71, 0.73], cloudDark: [0.44, 0.46, 0.5], fog: 0.0019, fogCol: [0.62, 0.64, 0.68], exp: 0.82, env: 1.2, snow: 1, lamp: 0.8, wind: 1.6 }
};
let wxName = QS.get("wx") || store.get("pal-wx", "bluebird"); if (!WX[wxName]) wxName = "bluebird";
let wx = WX[wxName];

function noiseTexture() {
  const n = 256, d = new Uint8Array(n * n * 4); let s = 1234567;
  for (let i = 0; i < d.length; i++) { s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 | 0; d[i] = (s >>> 11) & 255; }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
const noiseTex = noiseTexture();
const U = { // uniforms shared by every material that reads the world
  uTT: { value: null }, uMA: { value: null }, uMB: { value: null }, uNoise: { value: noiseTex },
  uTrk: { value: null }, uTraffic: { value: null },
  uSunDir: { value: sunDir }, uSunCol: { value: new THREE.Color() }, uTime: { value: 0 }, uShadowR: { value: 160 }, uTreeNear: { value: 260 }, uSkyAmb: { value: new THREE.Color() }, uWet: { value: 0 }
};
const GLSL_WORLD = `
uniform sampler2D uTT, uMA, uMB, uNoise; uniform vec3 uSunDir, uSunCol, uSkyAmb; uniform float uTime, uShadowR, uTreeNear;
vec2 ttUV(vec3 p) { return ((p.xz - vec2(${X0.toFixed(1)}, ${Z0.toFixed(1)})) / ${LCELL.toFixed(1)} + 0.5) / vec2(${TNX}.0, ${TNZ}.0); }
vec2 mkUV(vec3 p) { return ((p.xz - vec2(${X0.toFixed(1)}, ${Z0.toFixed(1)})) / ${MCELL.toFixed(1)} + 0.5) / vec2(${MW}.0, ${MH}.0); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;
/* Any lit material can take the baked mountain shadow, so a skier or a chair under a ridge goes dark with the slope it is on. */
function worldShade(mat, opts = {}) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = "varying vec3 vWp;\n" + sh.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
      { vec4 wsp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wsp = instanceMatrix * wsp;
      #endif
        vWp = (modelMatrix * wsp).xyz; }`);
    sh.fragmentShader = "varying vec3 vWp;\n" + GLSL_WORLD + sh.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
      { float tVis = texture2D(uTT, ttUV(vWp)).a; reflectedLight.directDiffuse *= tVis; reflectedLight.directSpecular *= tVis; }`);
    if (opts.patch) opts.patch(sh);
  };
  return mat;
}

/* sky dome: gradient, sun, drifting cloud deck */
const skyU = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGnd: { value: new THREE.Color() }, uSunDir: U.uSunDir, uSunCol: { value: new THREE.Color() }, uCloud: { value: 0.2 }, uCloudLit: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() }, uTime: U.uTime, uNoise: U.uNoise, uEnv: { value: 0 }, uSunI: { value: 1 } };
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: `varying vec3 vDir; void main() { vDir = position; vec4 p = viewMatrix * vec4(position, 0.0); gl_Position = projectionMatrix * vec4(p.xyz, 1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `
    uniform vec3 uZen, uHor, uGnd, uSunDir, uSunCol, uCloudLit, uCloudDark; uniform float uCloud, uTime, uEnv, uSunI; uniform sampler2D uNoise; varying vec3 vDir;
    float fbm(vec2 p) { float a = 0.0, w = 0.5; for (int i = 0; i < 5; i++) { a += w * texture2D(uNoise, p).r; p = p * 2.03 + 17.1; w *= 0.5; } return a; }
    void main() {
      vec3 d = normalize(vDir); float h = d.y, sd = max(dot(d, uSunDir), 0.0);
      vec3 col = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.42));
      col = mix(col, uHor * 1.06, exp(-max(h, 0.0) * 9.0) * 0.6);
      col += uSunCol * uSunI * (pow(sd, 9.0) * 0.05 + pow(sd, 90.0) * 0.16 + pow(sd, 900.0) * 0.9);
      if (uEnv < 0.5) col += uSunCol * uSunI * smoothstep(0.99962, 0.99982, sd) * 24.0;
      if (h > 0.0) {
        vec2 uv = d.xz / (h + 0.07) * 0.035 + vec2(uTime * 0.0008, uTime * 0.0003);
        float n = fbm(uv) * 0.75 + fbm(uv * 3.1 + 5.0) * 0.25;
        float a = smoothstep(1.0 - uCloud * 0.62 - 0.06, 1.0 - uCloud * 0.62 + 0.28 - uCloud * 0.2, n + uCloud * 0.5) * smoothstep(0.0, 0.10, h);
        float lit = clamp(0.35 + 0.65 * (1.0 - n) + pow(sd, 6.0) * 0.6, 0.0, 1.4);
        vec3 cc = mix(uCloudDark, uCloudLit, lit) * (0.75 + 0.5 * uSunI / 3.3 + pow(sd, 24.0) * uSunI * 0.25);
        col = mix(col, cc, a * mix(0.9, 1.0, uCloud));
      } else col = mix(col, uGnd, smoothstep(0.0, -0.08, h));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat); skyMesh.frustumCulled = false; skyMesh.renderOrder = -10; scene.add(skyMesh);
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
function bakeEnv() {
  const s = new THREE.Scene(), m = new THREE.Mesh(skyMesh.geometry, skyMat); m.scale.setScalar(50); s.add(m);
  skyU.uEnv.value = 1; const rt = pmrem.fromScene(s, 0, 0.1, 100); skyU.uEnv.value = 0;
  if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture;
}

/* post: bloom on the HDR frame, then ACES and a light grade */
let composer = null, bloomPass = null;
const gradePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.22 }, uSpeed: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uSpeed; varying vec2 vUv;
    void main() { vec2 c = vUv - 0.5; float r = dot(c, c);
      vec3 col = vec3(0.0); float n = 0.0; float amt = uSpeed * r * 0.06;
      for (int i = 0; i < 6; i++) { float t = float(i) / 5.0; col += texture2D(tDiffuse, vUv - c * amt * t).rgb; n += 1.0; }
      col /= n; col *= 1.0 - uVig * smoothstep(0.12, 0.62, r); gl_FragColor = vec4(col, 1.0); }`
});
function buildComposer() {
  if (composer) { composer.dispose(); composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); }
  const pr = Q.pr < 1 ? Q.pr : Math.min(Q.pr, window.devicePixelRatio || 1);
  renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(sz.x, sz.y, { type: THREE.HalfFloatType, samples: Q.msaa });
  composer = new EffectComposer(renderer, rt); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = null;
  if (Q.bloom) { bloomPass = new UnrealBloomPass(new THREE.Vector2(sz.x / 2, sz.y / 2), 0.16, 0.7, 1.0); composer.addPass(bloomPass); }
  composer.addPass(gradePass); composer.addPass(new OutputPass());
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  const R = Q.shadowR, sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 10; sc.far = 1400; sc.updateProjectionMatrix();
  U.uShadowR.value = R; U.uTreeNear.value = Q.treeNear;
}
addEventListener("resize", () => buildComposer());

/* The sun's shadow over the whole mountain, marched across the height grid: terrain only (alpha) and with forest canopy (blue). */
let TT = null, ttTex = null;
const hf = v => THREE.DataUtils.toHalfFloat(v);
/* Tracks other skiers have left on the groomed runs: carved S-turns drawn once into a tiling texture, laid along each run's
   direction, and shown in proportion to how busy the run is (Mountain Run most of all). */
let trkStyle = +(QS.get("trk") || store.get("pal-trk", 1));
function trackTexture(dense) {
  const Wd = 512, Ht = 2048, c = document.createElement("canvas"); c.width = Wd; c.height = Ht; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, Wd, Ht); g.lineCap = "round"; let sd = dense ? 911 : 373; const rnd = () => { sd = Math.imul(sd ^ (sd >>> 15), 2246822519) + 0x9e3779b9 | 0; return ((sd >>> 8) & 0xffff) / 65536; };
  const arc = (x0, amp, k, ph, lw, al, off) => { g.strokeStyle = "rgba(255,255,255," + al + ")"; g.lineWidth = lw; for (const dx of [-Wd, 0, Wd]) { g.beginPath(); for (let y = -8; y <= Ht + 8; y += 6) { const x = x0 + amp * Math.sin(TAU * k * y / Ht + ph) + dx + off; y < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } };
  if (dense) for (let i = 0; i < 16; i++) arc(rnd() * Wd, 30 + rnd() * 110, 2 + Math.floor(rnd() * 4), rnd() * TAU, 9 + rnd() * 10, 0.10 + rnd() * 0.08, 0);   // scraped, skidded patches
  for (let i = 0, n = dense ? 46 : 12; i < n; i++) { const x0 = rnd() * Wd, amp = 35 + rnd() * 120, k = 2 + Math.floor(rnd() * 4), ph = rnd() * TAU, al = 0.45 + rnd() * 0.5; for (const off of [-1.8, 1.8]) arc(x0, amp, k, ph, dense ? 1.5 : 1.9, al, off); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t;
}
function trafficTexture() {
  const Wd = 500, Ht = Math.round(Wd * (Z1 - Z0) / (X1 - X0)), c = document.createElement("canvas"); c.width = Wd; c.height = Ht; const g = c.getContext("2d"), sc = Wd / (X1 - X0); g.fillStyle = "#000"; g.fillRect(0, 0, Wd, Ht); g.lineCap = g.lineJoin = "round";
  const lv = r => r.n === "Mountain Run" ? 255 : r.c ? 185 : r.d <= 1 ? 150 : 95;
  for (const r of WORLD.runs.filter(r => r.g).sort((a, b) => lv(a) - lv(b))) { const v = lv(r); g.strokeStyle = "rgb(" + v + "," + v + "," + v + ")"; g.lineWidth = ((r.c ? 11 : [46, 42, 30, 18][r.d]) + 20) * sc; g.beginPath(); r.pts.forEach((p, i) => { const x = (p[0] - X0) * sc, y = (p[1] - Z0) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t;
}
function buildTerrainTex() {
  U.uTrk.value = trackTexture(trkStyle === 2); U.uTraffic.value = trafficTexture();
  TT = new Uint16Array(TNX * TNZ * 4);
  for (let j = 0; j < TNZ; j++) for (let i = 0; i < TNX; i++) {
    const x = X0 + i * LCELL, z = Z0 + j * LCELL, e = LCELL;
    const hx = Hsmooth(x + e, z) - Hsmooth(x - e, z), hz = Hsmooth(x, z + e) - Hsmooth(x, z - e), il = 1 / Math.hypot(hx, 2 * e, hz), k = (j * TNX + i) * 4;
    TT[k] = hf(-hx * il); TT[k + 1] = hf(-hz * il); TT[k + 2] = hf(1); TT[k + 3] = hf(1);
  }
  ttTex = new THREE.DataTexture(TT, TNX, TNZ, THREE.RGBAFormat, THREE.HalfFloatType); ttTex.magFilter = ttTex.minFilter = THREE.LinearFilter; ttTex.wrapS = ttTex.wrapT = THREE.ClampToEdgeWrapping; ttTex.needsUpdate = true; U.uTT.value = ttTex;
  // ambient occlusion from how sunk a point is below its surroundings, kept in the alpha of the second mask
  const R = Math.round(30 / CELL), D = Math.round(20 / CELL);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const gi = clamp(i, R, NX - R - 1), gj = clamp(j, R, NZ - R - 1), c = HM[gj * NX + gi];
    const av = (HM[gj * NX + gi - R] + HM[gj * NX + gi + R] + HM[(gj - R) * NX + gi] + HM[(gj + R) * NX + gi] + HM[(gj - D) * NX + gi - D] + HM[(gj - D) * NX + gi + D] + HM[(gj + D) * NX + gi - D] + HM[(gj + D) * NX + gi + D]) / 8;
    MB[(j * MW + i) * 4 + 3] = Math.round(255 * (1 - clamp((av - c) / 16, 0, 0.42)));
  }
  const mk = d => { const t = new THREE.DataTexture(d, MW, MH, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; };
  U.uMA.value = mk(MA); U.uMB.value = mk(MB);
}
function bakeSunShadow() {
  const el = Math.atan2(sunDir.y, Math.hypot(sunDir.x, sunDir.z)), hl = Math.hypot(sunDir.x, sunDir.z), ux = sunDir.x / hl, uz = sunDir.z / hl, rise = Math.tan(el) * LCELL, lit = wx.sunI > 0.5, q = Math.round(LCELL / CELL);
  let hmax = 0; for (let i = 0; i < HM.length; i += 7) if (HM[i] > hmax) hmax = HM[i];
  for (let j = 0; j < TNZ; j++) for (let i = 0; i < TNX; i++) {
    let vt = 1, vc = 1;
    if (lit) {
      const y0 = HM[j * q * NX + i * q] + 1.2; let d = 1.2;
      while (vt > 0.001) {
        const px = i + ux * d, pz = j + uz * d; if (px < 0 || pz < 0 || px > TNX - 1 || pz > TNZ - 1) break;
        const y = y0 + rise * d; if (y > hmax + 20) break;
        const pi = px + 0.5 | 0, pj = pz + 0.5 | 0, k = pj * q * NX + pi * q, g = y - HM[k];
        vt = Math.min(vt, g / (d * LCELL) * 14);
        if (d < 14) { const can = MA[k * 4 + 1] / 255 * 15; vc = Math.min(vc, (g - can) / (d * LCELL) * 5 + 0.35); }
        d += Math.max(0.7, d * 0.045);
      }
      vt = clamp(vt, 0, 1); vc = clamp(Math.min(vc, vt), 0, 1) * (0.55 + 0.45 * vt);
    }
    const k = (j * TNX + i) * 4; TT[k + 2] = hf(Math.min(vc, vt)); TT[k + 3] = hf(vt);
  }
  ttTex.needsUpdate = true;
}
let snowFall = null;
function setWeather(name, quick) {
  wxName = name; wx = WX[name]; store.set("pal-wx", name);
  const az = wx.az * DEG, el = wx.el * DEG;
  sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  sun.color.setRGB(...wx.sunCol); sun.intensity = wx.sunI; U.uSunCol.value.setRGB(...wx.sunCol).multiplyScalar(wx.sunI);
  skyU.uZen.value.setRGB(...wx.zen); skyU.uHor.value.setRGB(...wx.hor); skyU.uGnd.value.setRGB(...wx.gnd); skyU.uSunCol.value.setRGB(...wx.sunCol); skyU.uSunI.value = wx.sunI;
  skyU.uCloud.value = wx.cloud; skyU.uCloudLit.value.setRGB(...wx.cloudLit); skyU.uCloudDark.value.setRGB(...wx.cloudDark);
  U.uSkyAmb.value.setRGB(...wx.zen).lerp(new THREE.Color(...wx.hor), 0.55).multiplyScalar(wx.env);
  scene.fog.color.setRGB(...wx.fogCol); scene.fog.density = wx.fog;
  renderer.toneMappingExposure = wx.exp; scene.environmentIntensity = wx.env;
  sun.castShadow = wx.sunI > 0.5;
  bakeEnv(); if (TT) bakeSunShadow();
  if (snowFall) snowFall.visible = wx.snow > 0;
  uLamp.value = wx.lamp;
  document.querySelectorAll("[data-w]").forEach(b => b.classList.toggle("on", b.dataset.w === name));
}

/* ---------- terrain ---------- */
const TERRAIN_FRAG_PARS = GLSL_WORLD + `
varying vec3 vWp; varying vec3 vWn; varying float vLake; uniform sampler2D uTrk, uTraffic;
float glint(vec3 p, vec3 V, float scale) {
  vec3 q = p * scale, c = floor(q); vec4 r = texture2D(uNoise, (c.xz + c.y * 37.0 + 0.5) / 256.0, -8.0);
  vec3 fn = normalize(r.xyz * 2.0 - 1.0 + vec3(0.0, 0.5, 0.0)); vec3 f = fract(q) - 0.5 - (r.zxy - 0.5) * 0.5;
  return pow(max(dot(fn, normalize(V + uSunDir)), 0.0), 90.0) * step(0.7, r.a) * smoothstep(0.16, 0.05, length(f));
}
`;
const TERRAIN_FRAG_COLOR = `
  float tDist = length(cameraPosition - vWp); vec3 tV = (cameraPosition - vWp) / tDist;
  vec4 tt = vec4(0.0, 0.0, 1.0, 1.0); vec4 mA = vec4(0.0), mB = vec4(0.0, 0.5, 0.5, 1.0);
  #ifndef OUTER
    tt = texture2D(uTT, ttUV(vWp)); mA = texture2D(uMA, mkUV(vWp)); mB = texture2D(uMB, mkUV(vWp));
  #endif
  #ifdef FAR_N
    vec3 Nw = normalize(vec3(tt.r, sqrt(max(1.0 - tt.r * tt.r - tt.g * tt.g, 0.02)), tt.g));
  #else
    vec3 Nw = normalize(vWn);
  #endif
  float groom = mA.r, tree = mA.g, road = mA.b;
  float nA = texture2D(uNoise, vWp.xz * 0.0031).r, nB = texture2D(uNoise, vWp.xz * 0.021).g, nC = texture2D(uNoise, vWp.xz * 0.19).b;
  float slope = 1.0 - Nw.y;
  // rock is only ever a cliff face: the standing walls of the bands, never bare ground
  float cliffM = smoothstep(0.22, 0.5, mA.a + (nC - 0.5) * 0.22);
  #ifdef OUTER
    float rock = smoothstep(0.30, 0.38, slope + (nB - 0.5) * 0.14);
  #elif defined(FAR_N)
    float rock = cliffM;
  #else
    float rock = max(smoothstep(0.36, 0.5, 1.0 - normalize(vWn).y) * smoothstep(0.03, 0.2, mA.a), smoothstep(0.4, 0.62, mA.a + (nC - 0.5) * 0.2) * mix(0.75 * smoothstep(0.2, 0.34, 1.0 - normalize(vWn).y), 1.0, smoothstep(240.0, 520.0, tDist)));   // only surveyed cliffs are rock: a steep jump wall or cat-track bank is still snow
  #endif
  #ifdef OUTER
    float forest = smoothstep(0.42, 0.62, nB * 0.6 + nA * 0.5 + texture2D(uNoise, vWp.xz * 0.0009).g * 0.3) * smoothstep(2650.0, 2350.0, vWp.y + nA * 200.0) * smoothstep(0.30, 0.16, slope);
    tree = forest * (1.0 - vLake);
  #endif
  vec3 snow = vec3(0.905, 0.925, 0.955);
  float open = (1.0 - groom) * (1.0 - road);
  snow *= 1.0 - open * 0.07 * (nB - 0.5) - 0.045 * (nA - 0.5);
  // wind texture and fine grain in the surface normal
  float nearK = smoothstep(260.0, 30.0, tDist);
  vec2 gW = texture2D(uNoise, vWp.xz * 0.19).rg - 0.5, gF = texture2D(uNoise, vWp.xz * 2.3).ba - 0.5;
  Nw.xz += (gW * 0.16 * open + gF * 0.09) * nearK * (1.0 - rock);
  Nw.xz += (texture2D(uNoise, vWp.xz * 0.031).rg - 0.5) * 0.11 * open * (1.0 - rock) * smoothstep(1800.0, 150.0, tDist);   // wind-packed drifts read from across the bowl
  // grooming: corduroy up close, cat passes from a distance. Four fixed stripe fields blended by the run's direction.
  vec2 d2 = mB.gb * 2.0 - 1.0; d2 /= max(length(d2), 0.05);
  vec4 wk = vec4(max(d2.x, 0.0), max(d2.y, 0.0), max(-d2.x, 0.0), max(-d2.y, 0.0)); wk *= wk;
  vec2 cordG = vec2(0.0); float bandV = 0.0, bandE = 0.0;
  float scr = 0.0, trk = 0.0;
  #define CORD(PK, W) { float a = dot(vWp.xz, PK); trk += W * texture2D(uTrk, vec2(a / 24.0, dot(vWp.xz, vec2(-PK.y, PK.x)) / 96.0)).r; scr += W * texture2D(uNoise, vec2(a * 0.55, dot(vWp.xz, vec2(-PK.y, PK.x)) * 0.012)).r; float ph = a * 125.66; float vis = clamp(1.0 - fwidth(ph) * 0.45, 0.0, 1.0); cordG += PK * cos(ph) * W * vis; float b = a / 4.4, fb = fract(b); bandV += W * (texture2D(uNoise, vec2(floor(b) * 0.0391, 0.3), -8.0).r - 0.5); bandE += W * smoothstep(0.05, 0.0, min(fb, 1.0 - fb)); }
  CORD(vec2(0.0, 1.0), wk.x) CORD(vec2(-0.7071, 0.7071), wk.y) CORD(vec2(-1.0, 0.0), wk.z) CORD(vec2(-0.7071, -0.7071), wk.w)
  float groomK = smoothstep(0.25, 0.6, groom);   // a groomed surface has a definite edge
  Nw.xz += cordG * 0.30 * groomK; snow *= 1.0 + groomK * (bandV * 0.05 - bandE * 0.035 * smoothstep(900.0, 60.0, tDist));
  snow *= 1.0 - groomK * (0.07 + (scr - 0.5) * 0.18 * smoothstep(260.0, 8.0, tDist));
  #ifndef OUTER
    snow *= 1.0 - groomK * trk * texture2D(uTraffic, (vWp.xz - vec2(${X0.toFixed(1)}, ${Z0.toFixed(1)})) / vec2(${(X1 - X0).toFixed(1)}, ${(Z1 - Z0).toFixed(1)})).r * 0.42 * smoothstep(420.0, 12.0, tDist);   // other skiers' tracks, thickest where the traffic is
  #endif   // packed and scored by skis, against the untouched snow beside it
  Nw = normalize(Nw);
  // forest floor: litter up close, canopy shade from afar
  snow = mix(snow, vec3(0.50, 0.47, 0.40), tree * 0.16 * nC * nearK);
  snow *= mix(1.0, 0.56, tree * smoothstep(uTreeNear * 0.6, uTreeNear + 250.0, tDist));
  #ifdef OUTER
    snow = mix(snow, vec3(0.045, 0.075, 0.05) * (0.7 + 0.6 * nC), tree * (0.55 + 0.4 * texture2D(uNoise, vWp.xz * 0.006).b));
  #endif
  // Sierra granite: pale grey blocks split by dark joints, iron staining, water streaks down the fall line, snow held on ledges and in cracks
  vec3 rp = vWp; float rFar = smoothstep(2500.0, 300.0, tDist);
  vec2 rw = abs(Nw.xz) + 0.001; rw /= rw.x + rw.y;   // rock detail is projected onto the cliff's own face, so it does not smear down steep walls
  #define RT(SC, CH) (texture2D(uNoise, rp.zy * (SC)).CH * rw.x + texture2D(uNoise, rp.xy * (SC)).CH * rw.y)
  float blk = RT(0.013, r), strata = RT(vec2(0.021, 0.05), g), grain = RT(0.8, a);
  float j1 = smoothstep(0.05, 0.0, abs(RT(0.037, b) - 0.5)) * smoothstep(1500.0, 350.0, tDist);
  float j2 = smoothstep(0.06, 0.0, abs(RT(0.1, r) - 0.5)) * smoothstep(500.0, 60.0, tDist);
  float j3 = smoothstep(0.08, 0.0, abs(RT(0.36, g) - 0.5)) * smoothstep(90.0, 15.0, tDist);
  vec3 rk = mix(vec3(0.085, 0.062, 0.045), vec3(0.37, 0.285, 0.20), blk * 0.55 + strata * 0.45);      // tan and ochre, as the faces above the valley are
  rk = mix(rk, vec3(0.22, 0.215, 0.21), smoothstep(0.45, 0.8, nA) * 0.4);                         // greyer bands
  rk = mix(rk, vec3(0.13, 0.15, 0.11), smoothstep(0.62, 0.8, nB) * smoothstep(0.45, 0.7, blk) * 0.35);   // lichen
  rk *= (0.82 + 0.36 * grain * rFar + 0.18 * (nC - 0.5)) * 1.05;
  float streak = RT(vec2(0.07, 0.006), g);
  rk *= 1.0 - 0.3 * smoothstep(0.5, 0.8, streak) * smoothstep(600.0, 120.0, tDist);                                               // dark water streaks
  rk = mix(rk, vec3(0.04, 0.03, 0.025), clamp(j1 * 0.8 + j2 * 0.65 + j3 * 0.5, 0.0, 0.85));     // joints and cracks
  float ledge = smoothstep(0.5, 0.72, RT(vec2(0.017, 0.13), b)) * (1.0 - smoothstep(0.36, 0.52, slope));
  rock *= 1.0 - ledge * 0.35;
  { vec3 bp = (vec3(RT(0.06, r), RT(0.06, g), RT(0.06, b)) - 0.5) * 0.55 + (vec3(RT(0.4, g), RT(0.4, b), RT(0.4, r)) - 0.5) * 0.4 * rFar;
    Nw = normalize(Nw + bp * rock); }                                                              // broken, faceted faces
  vec3 alb = mix(snow, rk, rock);
  alb = mix(alb, mix(vec3(0.075, 0.078, 0.085), vec3(0.42, 0.43, 0.45), nC * nC * 0.7), road * 0.92);
  float tRough = mix(mix(0.76, 0.52, groomK), 0.93, max(rock, road));
  float snowAmt = (1.0 - rock) * (1.0 - road);
  #ifdef OUTER
    alb = mix(alb, vec3(0.012, 0.045, 0.10), vLake); tRough = mix(tRough, 0.12, vLake); snowAmt *= 1.0 - vLake;
  #endif
  diffuseColor.rgb = alb;`;
function terrainMaterial(defs) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  m.defines = Object.assign({}, defs);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = "varying vec3 vWp; varying vec3 vWn; varying float vLake; attribute float aLake;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normal;\n #ifdef OUTER\n vLake = aLake;\n #else\n vLake = 0.0;\n #endif");
    sh.fragmentShader = TERRAIN_FRAG_PARS + sh.fragmentShader
      .replace("#include <color_fragment>", TERRAIN_FRAG_COLOR)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = tRough;")
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz); nonPerturbedNormal = normal;")
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        { float nearF = smoothstep(uShadowR * 0.55, uShadowR * 0.95, tDist);
          float sunVis = mix(tt.a, tt.b, nearF);
          reflectedLight.directDiffuse *= sunVis; reflectedLight.directSpecular *= sunVis;
          reflectedLight.indirectDiffuse *= mB.a * mix(1.0, 0.8, tree);
          float gl = glint(vWp, tV, 70.0) * smoothstep(14.0, 2.0, tDist) + glint(vWp, tV, 24.0) * smoothstep(45.0, 6.0, tDist) + glint(vWp, tV, 8.0) * smoothstep(130.0, 25.0, tDist) * 0.8;
          reflectedLight.directSpecular += uSunCol * gl * sunVis * snowAmt * max(dot(Nw, uSunDir), 0.0) * 5.0; }`);
  };
  return m;
}
const matNear = terrainMaterial({}), matFar = terrainMaterial({ FAR_N: "" }), matOuter = terrainMaterial({ OUTER: "" });
/* Terrain is drawn in 150 m chunks near the skier (1.25 m to 10 m grids) and 750 m blocks beyond (10 m to 75 m), each with skirts to hide the joins. */
const CH = 150, CNX = Math.round((X1 - X0) / CH), CNZ = Math.round((Z1 - Z0) / CH), BK = 5, BNX = CNX / BK, BNZ = CNZ / BK;
const LODSEG = [120, 60, 30, 15], BLKSEG = [75, 25, 10], LODDIST = [150, 340, 760, 1900, 4200];
const chunks = [], blocks = [], idxCache = {};
const terrainG = new THREE.Group(); scene.add(terrainG);
function gridIndex(n) {
  if (idxCache[n]) return idxCache[n];
  const w = n + 1, ix = [], base = w * w;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * w + i; ix.push(a, a + w, a + 1, a + 1, a + w, a + w + 1); }
  const edge = (k, f, flip) => { for (let i = 0; i < n; i++) { const a = f(i), b = f(i + 1), c = base + k * w + i, d = c + 1; if (flip) ix.push(a, c, b, b, c, d); else ix.push(a, b, c, b, d, c); } };
  edge(0, i => i, false); edge(1, i => n * w + i, true); edge(2, i => i * w, true); edge(3, i => i * w + n, false);
  return idxCache[n] = new THREE.BufferAttribute(base + 4 * w > 65535 ? new Uint32Array(ix) : new Uint16Array(ix), 1);
}
let _hg = new Float32Array(1);
const Hbare = (x, z) => H(x, z, true);
function buildPatch(o, size, n, detail, slot) {
  const w = n + 1, st = size / n, hfn = detail ? Hbare : Hsmooth, gw = n + 3;
  if (_hg.length < gw * gw) _hg = new Float32Array(gw * gw);
  for (let j = 0; j < gw; j++) for (let i = 0; i < gw; i++) _hg[j * gw + i] = hfn(o.x0 + (i - 1) * st, o.z0 + (j - 1) * st);
  const nv = w * w + 4 * w, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), drop = Math.max(10, st * 0.8 + 0.6);
  let lo = 1e9, hi = -1e9;
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const g = (j + 1) * gw + i + 1, h = _hg[g], k = (j * w + i) * 3; pos[k] = i * st; pos[k + 1] = h - o.y0; pos[k + 2] = j * st; if (h < lo) lo = h; if (h > hi) hi = h;
    const nx = _hg[g - 1] - _hg[g + 1], nz = _hg[g - gw] - _hg[g + gw], il = 1 / Math.hypot(nx, 2 * st, nz); nor[k] = nx * il; nor[k + 1] = 2 * st * il; nor[k + 2] = nz * il;
  }
  const skirt = (k, f) => { for (let i = 0; i < w; i++) { const s = f(i) * 3, d = (w * w + k * w + i) * 3; pos[d] = pos[s]; pos[d + 1] = pos[s + 1] - drop; pos[d + 2] = pos[s + 2]; nor[d] = nor[s]; nor[d + 1] = nor[s + 1]; nor[d + 2] = nor[s + 2]; } };
  skirt(0, i => i); skirt(1, i => n * w + i); skirt(2, i => i * w); skirt(3, i => i * w + n);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setIndex(gridIndex(n));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(size / 2, (lo + hi) / 2 - o.y0, size / 2), Math.hypot(size * 0.71, (hi - lo) / 2 + drop));
  const m = new THREE.Mesh(g, detail ? matNear : matFar); m.position.set(o.x0, o.y0, o.z0); m.matrixAutoUpdate = false; m.updateMatrix(); m.receiveShadow = true; m.castShadow = detail && n >= 60; m.visible = false;   // the ground near you throws its own shadows: jump faces, cliffs, cat-track banks
  terrainG.add(m); o.mesh[slot] = m; if (o.lo === undefined || lo < o.lo) o.lo = lo; if (o.hi === undefined || hi > o.hi) o.hi = hi;
}
const buildChunk = (ch, lod) => buildPatch(ch, CH, LODSEG[lod], lod <= 2, lod), buildBlock = (b, k) => buildPatch(b, CH * BK, BLKSEG[k], false, k);
function initChunks() {
  for (let bz = 0; bz < BNZ; bz++) for (let bx = 0; bx < BNX; bx++) {
    const x0 = X0 + bx * CH * BK, z0 = Z0 + bz * CH * BK, b = { x0, z0, y0: Math.round(Hsmooth(x0 + CH * BK / 2, z0 + CH * BK / 2)), mesh: [], cur: -1, chunks: [], split: false };
    buildBlock(b, 2); buildBlock(b, 1); blocks.push(b);
    for (let cz = 0; cz < BK; cz++) for (let cx = 0; cx < BK; cx++) { const ch = { x0: x0 + cx * CH, z0: z0 + cz * CH, y0: 0, mesh: [], cur: -1, d: 0, lo: b.lo, hi: b.hi }; ch.y0 = Math.round(Hsmooth(ch.x0 + CH / 2, ch.z0 + CH / 2)); b.chunks.push(ch); chunks.push(ch); }
  }
}
const boxDist = (o, size, cam) => { const dx = Math.max(o.x0 - cam.x, 0, cam.x - o.x0 - size), dz = Math.max(o.z0 - cam.z, 0, cam.z - o.z0 - size), dy = Math.max(o.lo - cam.y, 0, cam.y - o.hi); return Math.sqrt(dx * dx + dz * dz + dy * dy); };
const showOnly = (o, k) => { if (o.cur === k) return; if (o.cur >= 0 && o.mesh[o.cur]) o.mesh[o.cur].visible = false; if (k >= 0) o.mesh[k].visible = true; o.cur = k; };
const _queue = [];
function updateTerrain(cam, budget) {
  _queue.length = 0;
  for (const b of blocks) {
    const d = boxDist(b, CH * BK, cam), split = d < LODDIST[2] * Q.lod + 40;
    if (!split) {
      if (b.split) { for (const ch of b.chunks) showOnly(ch, -1); b.split = false; }
      const want = d < LODDIST[3] * Q.lod ? 0 : d < LODDIST[4] * Q.lod ? 1 : 2; let show = want;
      if (!b.mesh[want]) { _queue.push({ o: b, lod: want, d, blk: true }); show = b.mesh[1] && want < 1 ? 1 : 2; }
      showOnly(b, show); continue;
    }
    showOnly(b, -1); b.split = true;
    for (const ch of b.chunks) {
      const dc = boxDist(ch, CH, cam); ch.d = dc; let want = 3; for (let l = 0; l < 3; l++) if (dc < LODDIST[l] * Q.lod) { want = l; break; }
      let show = want;
      if (!ch.mesh[want]) { if (want === 3) buildChunk(ch, 3); else { _queue.push({ o: ch, lod: want, d: dc, blk: false }); show = -1; for (let l = want + 1; l < 4; l++) if (ch.mesh[l]) { show = l; break; } if (show < 0) { buildChunk(ch, 3); show = 3; } } }
      showOnly(ch, show);
      for (let l = 0; l < 2; l++) if (ch.mesh[l] && l !== ch.cur && dc > LODDIST[1] * Q.lod + 450) { ch.mesh[l].geometry.dispose(); terrainG.remove(ch.mesh[l]); ch.mesh[l] = null; }
    }
  }
  if (!_queue.length) return 0;
  _queue.sort((a, b) => a.d - b.d); const t0 = performance.now(); let n = 0;
  for (const q of _queue) { if (q.blk) buildBlock(q.o, q.lod); else buildChunk(q.o, q.lod); n++; if (performance.now() - t0 > budget) break; }
  return _queue.length - n;
}
/* the country beyond the resort, out to Lake Tahoe and the Sierra crest */
function buildOuter() {
  const n = M.on, st = M.ocell, pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), lake = new Float32Array(n * n), ix = [];
  const hh = (i, j) => HO[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, h = hh(i, j); pos[k * 3] = M.ox0 + i * st; pos[k * 3 + 1] = h; pos[k * 3 + 2] = M.oz0 + j * st;
    const nx = hh(i - 1, j) - hh(i + 1, j), nz = hh(i, j - 1) - hh(i, j + 1), il = 1 / Math.hypot(nx, 2 * st, nz); nor[k * 3] = nx * il; nor[k * 3 + 1] = 2 * st * il; nor[k * 3 + 2] = nz * il;
    let flat = pos[k * 3] > 6000 && h > 1894 && h < 1901; if (flat) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (Math.abs(hh(i + a, j + b) - h) > 1.2) flat = false;
    lake[k] = flat ? 1 : 0;
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const x = M.ox0 + i * st, z = M.oz0 + j * st; if (x >= X0 - 1 && x + st <= X1 + 1 && z >= Z0 - 1 && z + st <= Z1 + 1) continue;
    const a = j * n + i; ix.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("aLake", new THREE.BufferAttribute(lake, 1)); g.setIndex(ix);
  const m = new THREE.Mesh(g, matOuter); m.frustumCulled = false; m.matrixAutoUpdate = false; scene.add(m);
}
