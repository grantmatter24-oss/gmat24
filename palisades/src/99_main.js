/* ---------- boot and main loop ---------- */
/* If the machine cannot hold 30 fps the graphics level steps down by itself, once per level, unless you picked a level yourself. */
let aqT = 0, aqN = 0, aqSlow = 0, gfxPicked = false;
function autoQuality(dt) {
  if (gfxPicked || sk.mode === "menu" || paused || QS.has("test")) return; aqT += dt; aqN++;
  if (aqT < 4) return; const fps = aqN / aqT; aqT = 0; aqN = 0; aqSlow = fps < 31 ? aqSlow + 1 : 0;
  if (aqSlow >= 2) { const order = ["ultra", "high", "med", "low"], i = order.indexOf(qName); if (i >= 0 && i < 3) { setGfx(order[i + 1]); toast("Graphics lowered to " + order[i + 1] + " to keep it smooth", 4); } aqSlow = 0; }
}
const progress = (msg, f) => { $("loadMsg").textContent = msg; $("loadFill").style.width = Math.round(f * 100) + "%"; return new Promise(r => setTimeout(r, 16)); };
let frame = 0, lastT = 0, acc = 0, menuA = 0, camFix = null;
function tick(t) {
  requestAnimationFrame(tick);
  const now = t / 1000, dt = Math.min(0.05, Math.max(0.001, now - lastT)); lastT = now; frame++; U.uTime.value = now;
  if (sk.mode === "menu") { // slow drift over the valley, looking up at KT-22 and Headwall
    menuA += dt * 0.012; camera.position.set(2350 + Math.cos(menuA) * 260, 2105 + Math.sin(menuA * 0.7) * 25, -820 + Math.sin(menuA) * 260); camera.up.set(0, 1, 0); camera.lookAt(700, 2230, 760); if (camFix) { camera.position.set(camFix[0], camFix[1], camFix[2]); camera.lookAt(camFix[3], camFix[4], camFix[5]); }
    camDir.set(-0.7, 0, 0.7); if (camFix) { sk.p.set(camFix[3], camFix[4], camFix[5]); camDir.set(0, 0, 0); } else sk.p.set(1500, 2000, 0); updateLifts(dt, camera.position, frame); updateNPCs(dt, camera.position); updateRemotes(dt, now);   // keep the friends list live on the home screen
  } else if (!paused) {
    const riding = sk.mode === "wait" || sk.mode === "lift", ff = riding && K.grabS ? 10 : 1;
    // G in the air: Kicker Run's slow-motion, on a meter that drains in 3.4 s and refills on snow
    const wantSlow = sk.mode === "ski" && K.focus && !sk.ground && !sk.crashed && focusM > 0.01; timeScale += ((wantSlow ? 0.38 : 1) - timeScale) * Math.min(1, 10 * dt);
    if (wantSlow) focusM = Math.max(0, focusM - dt / 3.4); else if (sk.ground) focusM = Math.min(1, focusM + dt * 0.04);
    rewinding = sk.mode === "ski" && rewKey && REW.length > 1; $("rew").hidden = !rewinding;
    if (rewinding) stepRewind(dt);
    else if (sk.mode === "ski") { acc += dt * timeScale; let n = 0; while (acc >= 1 / 120 && n < 8) { stepSki(1 / 120); acc -= 1 / 120; n++; } if (n === 8) acc = 0; recordRewind(dt); }
    updateLifts(dt * ff, camera.position, frame); updateNPCs(dt, camera.position);
    if (sk.mode === "wait" || sk.mode === "lift") stepLift(dt * ff); else if (sk.mode === "walk") stepWalk(dt);
    findNearLift(); emitSpray(dt); layTracks(dt); updateParticles(dt); updateRig(dt, now); updateCamera(dt); if (camFix) { camera.position.set(camFix[0], camFix[1], camFix[2]); camera.up.set(0, 1, 0); camera.lookAt(camFix[3], camFix[4], camFix[5]); camera.fov = camFix[6] || 50; camera.updateProjectionMatrix(); } updateRemotes(dt, now); mpSend(dt);
  }
  rig.hold.visible = sk.mode !== "menu" && rig.hold.visible;
  updateSun(); skyMesh.position.copy(camera.position); skyMesh.scale.setScalar(40000);
  updateTerrain(camera.position, 5); updateTrees(camera.position); updateRocks(camera.position); if (frame % 20 === 0) { thinBillboards(camera.position); updatePark(camera.position); }
  autoQuality(dt);
  if (snowFall.visible) { snowFall.material.uniforms.uCam.value.copy(camera.position); snowFall.material.uniforms.uPx.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * DEG / 2); }
  gradePass.uniforms.uSpeed.value = sk.mode === "ski" && !paused ? smooth((sk.sp - 14) / 26) : 0;
  updateHUD(dt); if (sk.mode !== "menu") drawMini(dt); updateAudio();
  renderer.info.reset(); composer.render(); window.__frames = frame;
  if (window.__snapReq) { const r = window.__snapReq; window.__snapReq = null; r(canvas.toDataURL("image/jpeg", 0.93)); }
}
async function boot() {
  await progress("Reading the survey", 0.05); await loadWorld();
  await progress("Shaping the mountain", 0.2); initCreeks(); initCat(); initRocks(); buildTerrainTex(); buildComposer(); initTrees();
  await progress("Setting the light", 0.35); setWeather(wxName);
  await progress("Laying snow", 0.45); initChunks(); buildOuter();
  await progress("Stringing the lifts", 0.6); initLifts(); initBuildings(); initRuns(); initCars(); initSigns(); initSlow(); initNPCs(); initVillage(); initParkMeshes(); initSnowGuns();
  await progress("Planting the forest", 0.72); buildBillboards();
  await progress("Drawing the trail map", 0.88); rig = makeRider(outfit); initParticles(); initTracks(); initSnowfall(); buildMap(); initInput(); mpInit();
  await progress("Ready", 1);
  const go = QS.get("go");
  if (go) { spawnAt(go); $("hud").hidden = false; if (QS.has("at")) { const a = QS.get("at").split(",").map(Number); placeSkier(a[0], a[1], (a[2] || 0) * DEG, a[3] || 0); } }
  else $("menu").hidden = false;
  if (QS.has("fpv")) fpv = QS.get("fpv") === "1";
  if (QS.has("cam")) { camFix = QS.get("cam").split(",").map(Number); sk.mode = "menu"; $("menu").hidden = true; $("hud").hidden = true; }
  // build the terrain around the first view before showing it
  if (camFix) camera.position.set(camFix[0], camFix[1], camFix[2]); else if (sk.mode === "menu") camera.position.set(2350, 2105, -820); else updateCamera(0.016);
  for (let i = 0; i < 300; i++) if (!updateTerrain(camera.position, 40)) break;
  for (let i = 0; i < 40; i++) { updateTrees(camera.position); updateRocks(camera.position); }
  $("load").hidden = true; renderer.info.autoReset = false; requestAnimationFrame(tick);
  window.__pal = { treeMask, trkMesh: () => trkMesh, updateRig, layTracks, getCat: () => CATG, creekD, onRock, catBench, viewFrom: a => { camFix = a; }, CLIFFS, buildCliff, updateTerrain, setCam: a => { camFix = a; sk.mode = "menu"; $("menu").hidden = true; $("hud").hidden = true; }, cliffK, hBase, PARK, REW, stepRewind, recordRewind, toggleWalk, stepWalk, clearTracks, goHome, toggleMap, runAt, npcs, KR, gDown, gUp, landing, stepSki, stepLift, updateLifts, findNearLift, nrm, sk, K, LIFTS, WORLD, H, camera, scene, renderer, setWeather, placeSkier, boardLift, unloadAt, spawnAt, MP, chunks, nearTiles, treeTiles, Q };
  window.__info = () => ({ mode: sk.mode, p: [Math.round(sk.p.x), Math.round(sk.p.y), Math.round(sk.p.z)], sp: +sk.sp.toFixed(1), ground: sk.ground, crashed: sk.crashed, trees: treeCount, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lift: sk.lift && sk.lift.name, liftS: Math.round(sk.liftS) });
}
boot().catch(e => { const d = document.createElement("div"); d.id = "err"; d.textContent = String(e && e.stack || e); document.body.appendChild(d); console.error(e); });
