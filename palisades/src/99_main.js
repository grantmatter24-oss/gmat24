/* ---------- boot and main loop ---------- */
const progress = (msg, f) => { $("loadMsg").textContent = msg; $("loadFill").style.width = Math.round(f * 100) + "%"; return new Promise(r => setTimeout(r, 16)); };
let frame = 0, lastT = 0, acc = 0, menuA = 0, camFix = null;
function tick(t) {
  requestAnimationFrame(tick);
  const now = t / 1000, dt = Math.min(0.05, Math.max(0.001, now - lastT)); lastT = now; frame++; U.uTime.value = now;
  if (sk.mode === "menu") { // slow drift over the valley, looking up at KT-22 and Headwall
    menuA += dt * 0.012; camera.position.set(2350 + Math.cos(menuA) * 260, 2105 + Math.sin(menuA * 0.7) * 25, -820 + Math.sin(menuA) * 260); camera.up.set(0, 1, 0); camera.lookAt(700, 2230, 760); if (camFix) { camera.position.set(camFix[0], camFix[1], camFix[2]); camera.lookAt(camFix[3], camFix[4], camFix[5]); }
    camDir.set(-0.7, 0, 0.7); sk.p.set(1500, 2000, 0); updateLifts(dt, camera.position, frame);
  } else if (!paused) {
    const riding = sk.mode === "wait" || sk.mode === "lift", ff = riding && K.ff ? 10 : 1;
    if (sk.mode === "ski") { acc += dt; let n = 0; while (acc >= 1 / 120 && n < 8) { stepSki(1 / 120); acc -= 1 / 120; n++; } if (n === 8) acc = 0; }
    updateLifts(dt * ff, camera.position, frame);
    if (sk.mode === "wait" || sk.mode === "lift") stepLift(dt * ff);
    findNearLift(); emitSpray(dt); layTracks(); updateParticles(dt); updateRig(dt, now); updateCamera(dt); updateRemotes(dt, now); mpSend(dt);
  }
  rig.root.visible = sk.mode !== "menu" && rig.root.visible;
  updateSun(); skyMesh.position.copy(camera.position); skyMesh.scale.setScalar(40000);
  updateTerrain(camera.position, 5); updateTrees(camera.position);
  if (snowFall.visible) { snowFall.material.uniforms.uCam.value.copy(camera.position); snowFall.material.uniforms.uPx.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * DEG / 2); }
  gradePass.uniforms.uSpeed.value = sk.mode === "ski" && !paused ? smooth((sk.sp - 14) / 26) : 0;
  updateHUD(dt); if (sk.mode !== "menu") drawMini(dt); updateAudio();
  renderer.info.reset(); composer.render(); window.__frames = frame;
  if (window.__snapReq) { const r = window.__snapReq; window.__snapReq = null; r(canvas.toDataURL("image/jpeg", 0.93)); }
}
async function boot() {
  await progress("Reading the survey", 0.05); await loadWorld();
  await progress("Shaping the mountain", 0.2); buildTerrainTex(); buildComposer(); initTrees();
  await progress("Setting the light", 0.35); setWeather(wxName);
  await progress("Laying snow", 0.45); initChunks(); buildOuter();
  await progress("Stringing the lifts", 0.6); initLifts(); initBuildings(); initRuns();
  await progress("Planting the forest", 0.72); buildBillboards();
  await progress("Drawing the trail map", 0.88); rig = buildSkier(sk.jacket); scene.add(rig.root); initParticles(); initTracks(); initSnowfall(); buildMap(); initInput(); mpInit();
  await progress("Ready", 1);
  const go = QS.get("go");
  if (go) { spawnAt(go); $("hud").hidden = false; if (QS.has("at")) { const a = QS.get("at").split(",").map(Number); placeSkier(a[0], a[1], (a[2] || 0) * DEG, a[3] || 0); } }
  else $("menu").hidden = false;
  if (QS.has("fpv")) fpv = QS.get("fpv") === "1";
  if (QS.has("cam")) { camFix = QS.get("cam").split(",").map(Number); sk.mode = "menu"; $("menu").hidden = true; $("hud").hidden = true; }
  // build the terrain around the first view before showing it
  if (camFix) camera.position.set(camFix[0], camFix[1], camFix[2]); else if (sk.mode === "menu") camera.position.set(2350, 2105, -820); else updateCamera(0.016);
  for (let i = 0; i < 300; i++) if (!updateTerrain(camera.position, 40)) break;
  for (let i = 0; i < 40; i++) updateTrees(camera.position);
  $("load").hidden = true; renderer.info.autoReset = false; requestAnimationFrame(tick);
  window.__pal = { stepSki, stepLift, updateLifts, findNearLift, nrm, sk, K, LIFTS, WORLD, H, camera, scene, renderer, setWeather, placeSkier, boardLift, unloadAt, spawnAt, MP, chunks, nearTiles, treeTiles, Q };
  window.__info = () => ({ mode: sk.mode, p: [Math.round(sk.p.x), Math.round(sk.p.y), Math.round(sk.p.z)], sp: +sk.sp.toFixed(1), ground: sk.ground, crashed: sk.crashed, trees: treeCount, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lift: sk.lift && sk.lift.name, liftS: Math.round(sk.liftS) });
}
boot().catch(e => { const d = document.createElement("div"); d.id = "err"; d.textContent = String(e && e.stack || e); document.body.appendChild(d); console.error(e); });
