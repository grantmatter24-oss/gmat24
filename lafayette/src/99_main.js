/* ---------- boot and the frame loop ---------- */
const MENU_AT = ll2xz(37.8915, -122.1180);
async function boot() {
  const say = async msg => { $("loadMsg").textContent = msg; await new Promise(r => setTimeout(r, 30)); };
  await say("Unpacking the survey…"); await loadWorld();
  await say("Shaping the hills…"); buildTerrain(); buildWater();
  await say("Paving the streets…"); buildRoadMaterials(); buildStrips(); buildSports();
  await say("Raising the buildings…"); buildBuildingMaterials(); indexBuildings();
  await say("Planting oaks and grass…"); buildTrees(); buildGrass(); buildFx(); buildLamps(); buildTrials(); buildMap();
  setupPost(); setTimeOfDay(QS.get("tod") || store.get("laf-tod", "day")); resize(); window.addEventListener("resize", resize);
  buildMenu(); mpInit(); $("load").style.display = "none";
  if (QS.has("cam")) { const cp = QS.get("cam").split(",").map(Number); camera.position.set(cp[0], H(cp[0], cp[2]) + cp[1], cp[2]); camera.rotation.order = "YXZ"; camera.rotation.set(-cp[4] * DEG, cp[3] + Math.PI, 0); GAME.mode = "free"; }
  else if (QS.has("auto")) { const a = QS.get("auto").split(","); if (VEHICLES[a[0]]) GAME.type = a[0]; const s = SPAWNS[+a[1] || 0], [x, z] = ll2xz(s[1], s[2]); startPlay(snapToRoad(x, z, !!s[3])); if (a[2]) { const T = TRIALS[+a[2]]; if (T) startTrial(T); } }
  else openMenu();
  if (QS.has("test")) { camera.updateMatrixWorld(); if (GAME.v) updateCamera(1, true); uBldFar.value = 900; for (let i = 0; i < 40; i++) updateRoads(1); updateBuildings(1, true); window.__K = K; window.__G = GAME; window.__cam = camera;
    // physics without drawing, for checks: hold these inputs for `sec` seconds and report where the machine went
    window.__sim = (sec, inp) => { const v = GAME.v, out = []; Object.assign(input, { throttle: 0, brake: 0, steer: 0, hand: false, lean: 0 }, inp); let k = 0; for (let t = 0; t < sec; t += 1 / 60, k++) { stepVehicle(v, input, 1 / 60); if (v.crash > 3.4 || v.sunk) { out.push("RESET crash=" + v.crash.toFixed(1)); resetVehicle(); } if (k % 60 === 59) out.push([(t + 1 / 60).toFixed(0) + "s", (v.speed * MPH).toFixed(0) + "mph", v.p.x.toFixed(0), v.p.y.toFixed(1), v.p.z.toFixed(0), "th" + (v.th || 0).toFixed(2), "phi" + (v.phi || 0).toFixed(2), "air" + v.air.toFixed(1), "g" + (ground(v.p.x, v.p.z, v.p.y) ).toFixed(1), v.S.four ? "up" + v.upright.toFixed(2) : ""].join(" ")); }
      syncVehicle(v, 1 / 60, 0); updateCamera(1, true); camera.updateMatrixWorld(); for (let i = 0; i < 40; i++) updateRoads(1); updateBuildings(1, true); return out; }; }
  let last = performance.now(), frames = 0;
  const frame = now => {
    requestAnimationFrame(frame); const dt = QS.has("test") ? 1 / 30 : Math.min(0.05, (now - last) / 1000); last = now; GAME.time += dt; const time = GAME.time, v = GAME.v;
    if (GAME.mode === "play" && !GAME.paused) {
      readInput(dt); stepVehicle(v, input, dt);
      if (v.crash > 3.4) { resetVehicle(); toast("Back on your wheels", 1.5); } else if (v.sunk) { resetVehicle(); toast("Back on dry land", 1.5); }
      updateTrial(dt); syncVehicle(v, dt, time); updateCamera(dt, false);
    } else if (GAME.mode === "menu") {   // a slow circle over town behind the menu
      const a = time * 0.035 + 2.2, cx = MENU_AT[0], cz = MENU_AT[1], gy = H(cx, cz); camera.position.set(cx + Math.cos(a) * 950, gy + 250, cz + Math.sin(a) * 950); camera.lookAt(cx, gy + 20, cz);
    }
    mpSend(dt); updateRemotes(dt, time); camera.updateMatrixWorld();
    updateSky(v && GAME.mode !== "menu" && GAME.mode !== "free" ? v.model.group.position : camera.position, time); updateTerrain(); updateRoads(dt); updateBuildings(dt); updateTrees(dt); updateGrass(v ? v.model.group.position : null); updateLamps(); updateFx(dt); updateAudio(dt); updateHud(dt);
    renderFrame(); frames++; window.__frames = frames;
  };
  requestAnimationFrame(frame); window.__ready = true;
}
boot().catch(e => { console.error(e); $("loadMsg").textContent = "Could not start: " + (e && e.message); window.__err = String(e && e.stack || e); });
