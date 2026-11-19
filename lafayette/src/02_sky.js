/* ---------- renderer, sky, light, haze ---------- */
const canvas = $("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PERF.px));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.25, 90000);
scene.add(camera);
const MAXANISO = renderer.capabilities.getMaxAnisotropy();

/* Uniforms every material shares: the haze, the sun, the long shadows the hills throw, the clock. */
const GU = {
  uFogP: { value: new THREE.Vector4(0.00004, 1 / 1200, 0, 0.6) }, uFogSun: { value: new THREE.Vector3(0, 1, 0) }, uFogSunCol: { value: new THREE.Color(1, 1, 1) },
  uTLight: { value: null }, uTLp: { value: new THREE.Vector4(X0, Z0, 1 / (X1 - X0), 1 / (Z1 - Z0)) }, uTime: { value: 0 }, uNight: { value: 0 },
};
function shareUniforms(shader) { for (const k in GU) shader.uniforms[k] = GU[k]; }
THREE.Material.prototype.onBeforeCompile = function (shader) { shareUniforms(shader); };
THREE.ShaderChunk.fog_pars_vertex = "#ifdef USE_FOG\n varying float vFogDepth; varying vec3 vFogDir;\n#endif";
THREE.ShaderChunk.fog_vertex = "#ifdef USE_FOG\n vFogDepth = - mvPosition.z; vFogDir = mvPosition.xyz * mat3( viewMatrix );\n#endif";
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogDir; uniform float fogDensity;
 uniform vec4 uFogP; uniform vec3 uFogSun; uniform vec3 uFogSunCol;
 vec3 applyHaze( vec3 col, vec3 dv ) {   // haze thins with height: the valley floor is milkier than the ridge line
  float fd = length( dv ); vec3 fdir = dv / max( fd, 1e-3 ); float t = fdir.y * fd * uFogP.y;
  float hf = abs( t ) > 1e-3 ? ( 1.0 - exp( - t ) ) / t : 1.0;
  float ff = 1.0 - exp( - uFogP.x * fd * hf );
  float sg = pow( max( dot( fdir, uFogSun ), 0.0 ), 5.0 );
  return mix( col, mix( fogColor, uFogSunCol, sg * uFogP.w ), ff );
 }
#endif`;
THREE.ShaderChunk.fog_fragment = "#ifdef USE_FOG\n gl_FragColor.rgb = applyHaze( gl_FragColor.rgb, vFogDir );\n#endif";
// the shadow a hill throws across the valley at sunset is baked into a texture and dims the sun for anything standing in it
THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin + "\nuniform sampler2D uTLight; uniform vec4 uTLp;\n";
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace("getDirectionalLightInfo( directionalLight, directLight );",
  "getDirectionalLightInfo( directionalLight, directLight );\n #if ( UNROLLED_LOOP_INDEX == 0 )\n { vec3 tlw = cameraPosition + ( - vViewPosition ) * mat3( viewMatrix ); directLight.color *= texture2D( uTLight, ( tlw.xz - uTLp.xy ) * uTLp.zw ).r; }\n #endif");

const sunDir = new THREE.Vector3(0, 1, 0);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; scene.add(sun); scene.add(sun.target);
sun.shadow.mapSize.set(Q.shadow, Q.shadow); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06;
scene.fog = new THREE.FogExp2(0x9fb7d6, 0.00004);
const TOD = {
  day: { label: "Day", az: 212, el: 56, sunCol: [1.0, 0.95, 0.86], sunI: 6.6, zen: [0.075, 0.20, 0.50], hor: [0.46, 0.62, 0.84], hor2: [0.46, 0.62, 0.84], glow: [1.0, 0.9, 0.7], glowK: 0.5, ground: [0.10, 0.10, 0.07],
    fog: [0.50, 0.64, 0.82], fogSun: [0.80, 0.80, 0.74], fogD: 0.000034, fogK: 0.5, exposure: 0.54, env: 0.55, stars: 0, cloud: 0.56, cloudLit: [1.0, 0.98, 0.95], cloudDark: [0.60, 0.66, 0.76], bloom: [0.16, 0.6, 0.92], night: 0 },
  sunset: { label: "Sunset", az: 291, el: 4.2, sunCol: [1.0, 0.50, 0.20], sunI: 5.5, zen: [0.055, 0.105, 0.27], hor: [1.0, 0.44, 0.13], hor2: [0.36, 0.27, 0.40], glow: [1.0, 0.45, 0.12], glowK: 1.6, ground: [0.05, 0.04, 0.035],
    fog: [0.40, 0.33, 0.38], fogSun: [1.0, 0.50, 0.20], fogD: 0.000055, fogK: 0.95, exposure: 1.0, env: 1.5, stars: 0.05, cloud: 0.5, cloudLit: [1.0, 0.52, 0.30], cloudDark: [0.30, 0.22, 0.32], bloom: [0.3, 0.7, 0.85], night: 0.25 },
  night: { label: "Night", az: 150, el: 46, sunCol: [0.55, 0.68, 1.0], sunI: 0.16, zen: [0.0035, 0.006, 0.016], hor: [0.020, 0.022, 0.034], hor2: [0.034, 0.026, 0.022], glow: [0.5, 0.6, 0.9], glowK: 0.25, ground: [0.006, 0.006, 0.008],
    fog: [0.016, 0.019, 0.030], fogSun: [0.04, 0.05, 0.08], fogD: 0.00005, fogK: 0.4, exposure: 1.5, env: 1.6, stars: 1, cloud: 0.62, cloudLit: [0.06, 0.07, 0.10], cloudDark: [0.012, 0.014, 0.022], bloom: [0.32, 0.7, 0.85], night: 1 },
};
let tod = TOD.day, todName = "day";

const SKY_GLSL = `
uniform vec3 uSun, uZen, uHor, uHor2, uSunCol, uGlowCol, uGround, uCloudLit, uCloudDark; uniform float uGlowK, uStars, uCloud, uSkyT, uEnv, uSunI;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 skyColor(vec3 d) {
  float y = clamp(d.y, 0.0, 1.0), h = pow(1.0 - y, 4.0);
  vec2 sx = normalize(uSun.xz + 1e-5), dx = normalize(d.xz + 1e-5); float toward = pow(clamp(dot(sx, dx) * 0.5 + 0.5, 0.0, 1.0), 1.6);
  vec3 c = mix(uZen, mix(uHor2, uHor, toward), h);
  float mu = max(dot(d, uSun), 0.0);
  c += uGlowCol * (pow(mu, 6.0) * 0.22 + pow(mu, 48.0) * 0.55 + pow(mu, 700.0) * 2.5) * uGlowK * (0.4 + 0.6 * h);
  if (uEnv < 0.5) {
    c += uSunCol * uSunI * smoothstep(0.99985, 0.99996, mu) * 14.0;
    if (uStars > 0.01) { vec3 q = floor(d * 260.0); float s = h31(q); float tw = 0.75 + 0.25 * sin(uSkyT * 3.0 + s * 90.0); c += vec3(0.8, 0.86, 1.0) * step(0.9972, s) * pow(h31(q + 3.7), 3.0) * 1.6 * tw * uStars * smoothstep(0.02, 0.25, d.y); }
  }
  if (d.y > 0.0) {   // high thin cloud
    vec2 p = d.xz / (d.y + 0.12) * 1.5 + vec2(uSkyT * 0.004, uSkyT * 0.0015);
    float n = fbm(p), n2 = fbm(p * 2.7 + 4.0);
    float cov = smoothstep(uCloud, uCloud + 0.26, n * 0.75 + n2 * 0.25) * smoothstep(0.015, 0.22, d.y);
    vec3 cc = mix(uCloudDark, uCloudLit, clamp(0.35 + n2 * 0.8 + pow(mu, 3.0) * 0.6, 0.0, 1.0));
    c = mix(c, cc, cov * 0.85);
  }
  c = mix(c, uGround, smoothstep(0.0, -0.12, d.y));
  return c;
}`;
function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uSun: { value: sunDir }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uHor2: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uGlowCol: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
      uCloudLit: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() }, uGlowK: { value: 1 }, uStars: { value: 0 }, uCloud: { value: 0.5 }, uSkyT: { value: 0 }, uEnv: { value: 0 }, uSunI: { value: 1 } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix * vec4(position, 0.0); gl_Position = projectionMatrix * vec4(p.xyz, 1.0); gl_Position.z = gl_Position.w; }",
    fragmentShader: SKY_GLSL + "varying vec3 vDir; void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }",
  });
}
const skyMat = skyMaterial(), sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat); sky.frustumCulled = false; sky.renderOrder = -1000; scene.add(sky);
const envScene = new THREE.Scene(), envSkyMat = skyMaterial(), envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envSkyMat); envSkyMat.uniforms.uEnv.value = 1; envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;

/* Where the sun cannot reach: for each point of a coarse grid, walk toward the sun and see whether the land rises above the ray. */
const TLW = Math.round((X1 - X0) / 16) + 1, TLH = Math.round((Z1 - Z0) / 16) + 1, TLdata = new Uint8Array(TLW * TLH);
const TLtex = new THREE.DataTexture(TLdata, TLW, TLH, THREE.RedFormat); TLtex.minFilter = TLtex.magFilter = THREE.LinearFilter; TLtex.wrapS = TLtex.wrapT = THREE.ClampToEdgeWrapping; GU.uTLight.value = TLtex;
function bakeTerrainLight() {
  const tanEl = sunDir.y / Math.hypot(sunDir.x, sunDir.z);
  if (tanEl > 0.9) { TLdata.fill(255); TLtex.needsUpdate = true; return; }
  const hx = sunDir.x / Math.hypot(sunDir.x, sunDir.z), hz = sunDir.z / Math.hypot(sunDir.x, sunDir.z), maxD = Math.min(6000, 460 / tanEl);
  for (let j = 0; j < TLH; j++) for (let i = 0; i < TLW; i++) {
    const x = X0 + i * 16, z = Z0 + j * 16, h0 = H(x, z) + 1.2; let clear = 1;
    for (let d = 14, st = 14; d < maxD; d += st, st = Math.min(60, st * 1.07)) {
      const ry = h0 + d * tanEl; if (ry > 470) break;
      const c = (ry - H(x + hx * d, z + hz * d)) / d; if (c < clear) { clear = c; if (c < -0.012) break; }
    }
    TLdata[j * TLW + i] = Math.round(255 * sstep(-0.006, 0.008, clear));
  }
  TLtex.needsUpdate = true;
}
function sunVisAt(x, z) { return bil(TLdata, TLW, TLH, (x - X0) / 16, (z - Z0) / 16) / 255; }

function setTimeOfDay(name) {
  todName = TOD[name] ? name : "day"; tod = TOD[todName];
  const az = tod.az * DEG, el = tod.el * DEG; sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  sun.color.setRGB(...tod.sunCol); sun.intensity = tod.sunI;
  for (const m of [skyMat, envSkyMat]) {
    const u = m.uniforms; u.uZen.value.setRGB(...tod.zen); u.uHor.value.setRGB(...tod.hor); u.uHor2.value.setRGB(...tod.hor2); u.uSunCol.value.setRGB(...tod.sunCol); u.uGlowCol.value.setRGB(...tod.glow); u.uGround.value.setRGB(...tod.ground);
    u.uCloudLit.value.setRGB(...tod.cloudLit); u.uCloudDark.value.setRGB(...tod.cloudDark); u.uGlowK.value = tod.glowK; u.uStars.value = tod.stars; u.uCloud.value = tod.cloud; u.uSunI.value = tod.sunI;
  }
  scene.fog.color.setRGB(...tod.fog); GU.uFogSun.value.copy(sunDir); GU.uFogSunCol.value.setRGB(...tod.fogSun); GU.uFogP.value.w = tod.fogK; GU.uNight.value = tod.night;
  renderer.toneMappingExposure = tod.exposure;
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, 0, 1, 100); scene.environment = envRT.texture; scene.environmentIntensity = tod.env;
  bakeTerrainLight();
  if (typeof onTimeOfDay === "function") onTimeOfDay();
}
const _ls = { r: new THREE.Vector3(), u: new THREE.Vector3(), c: new THREE.Vector3() };
let shadowR = 70;
function updateSky(focus, time) {
  sky.position.copy(camera.position); sky.scale.setScalar(60000); skyMat.uniforms.uSkyT.value = time; GU.uTime.value = time;
  GU.uFogP.value.x = tod.fogD * Math.exp(-(camera.position.y - 60) * GU.uFogP.value.y); GU.uFogP.value.y = 1 / 1100;
  // the shadow map follows the rider, moved in whole texels so shadow edges do not crawl
  const R = shadowR, cam = sun.shadow.camera; if (cam.right !== R) { cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = 1; cam.far = 900; cam.updateProjectionMatrix(); }
  _ls.r.crossVectors(sunDir, _ls.u.set(0, 1, 0)).normalize(); _ls.u.crossVectors(_ls.r, sunDir).normalize();
  const tex = 2 * R / sun.shadow.mapSize.x, a = Math.round(focus.dot(_ls.r) / tex) * tex, b = Math.round(focus.dot(_ls.u) / tex) * tex, c = focus.dot(sunDir);
  _ls.c.copy(_ls.r).multiplyScalar(a).addScaledVector(_ls.u, b).addScaledVector(sunDir, c);
  sun.target.position.copy(_ls.c); sun.position.copy(_ls.c).addScaledVector(sunDir, 450); sun.target.updateMatrixWorld();
}

/* ---------- post: bloom for the sun, lamps and headlights, then a light grade ---------- */
let composer = null, bloomPass = null;
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.22 }, uSat: { value: 1.12 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform sampler2D tDiffuse; uniform float uVig, uSat; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, uSat); vec2 q = vUv - 0.5; c.rgb *= 1.0 - uVig * smoothstep(0.25, 0.85, dot(q, q) * 2.0); gl_FragColor = c; }",
};
/* One bad pixel (a not-a-number from any shader) would be smeared by the bloom into a black block, so anything that is not a
   sane brightness is removed before the bloom sees it. */
const CleanShader = { uniforms: { tDiffuse: { value: null } }, vertexShader: GradeShader.vertexShader,
  fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; if (isnan(c.r) || isnan(c.g) || isnan(c.b) || isinf(c.r) || isinf(c.g) || isinf(c.b)) c = vec3(0.0); gl_FragColor = vec4(clamp(c, 0.0, 48.0), 1.0); }" };
let cleanPass = null;
function setupPost() {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.cap >= 4 ? 4 : 2 });
  composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
  cleanPass = new ShaderPass(CleanShader); composer.addPass(cleanPass);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.6, 0.9); composer.addPass(bloomPass);
  composer.addPass(new ShaderPass(GradeShader)); composer.addPass(new OutputPass());
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PERF.px)); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
function renderFrame() {
  if (composer && PERF.post > 0) { const glow = PERF.post === 2 || tod.night > 0.1; bloomPass.enabled = cleanPass.enabled = glow; bloomPass.strength = tod.bloom[0]; bloomPass.radius = tod.bloom[1]; bloomPass.threshold = tod.bloom[2]; composer.render(); } else renderer.render(scene, camera);
}
/* ---------- keeping it smooth ---------- */
function setTier(t) {
  t = clamp(t, 0, Q.cap); Object.assign(PERF, TIERS[t]); PERF.tier = t; resize();
  if (typeof setGrassFraction === "function") setGrassFraction(PERF.grassTest || PERF.grass); uBldFar.value = PERF.bld; if (TREES.lods.length) { TREES.t = -1; TREES.last.set(1e9, 0, 0); }
}
const PERFMON = { t: 0, n: 0, good: 0, hold: 3, block: 0 };
function perfTick(raw) {   // raw: real seconds since the last frame
  if (document.hidden || raw > 0.4) return; PERFMON.t += raw; PERFMON.n++; if (PERFMON.t < 1.5) return;
  const fps = PERFMON.n / PERFMON.t; PERFMON.t = 0; PERFMON.n = 0; PERF.fps = fps; if (PERFMON.hold > 0) { PERFMON.hold--; return; } if (PERFMON.block > 0) PERFMON.block--;
  if (fps < 45 && PERF.tier > 0) { setTier(PERF.tier - (fps < 22 && PERF.tier > 1 ? 2 : 1)); PERFMON.hold = 1; PERFMON.block = 20; PERFMON.good = 0; }
  else if (fps > 57) { if (++PERFMON.good >= 3 && PERF.tier < Q.cap && PERFMON.block === 0) { setTier(PERF.tier + 1); PERFMON.hold = 1; PERFMON.good = 0; } } else PERFMON.good = 0;
}
