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
  if (QS.has("orbit")) { const o = QS.get("orbit").split(",").map(Number); GAME.cam.orbit = o[0] || 0; GAME.cam.orbitP = o[1] || 0; GAME.cam.dist = o[2] || 1; GAME.cam.orbitT = 1e9; }
  if (QS.has("test")) { camera.updateMatrixWorld(); if (GAME.v) updateCamera(1, true); uBldFar.value = 900; for (let i = 0; i < 40; i++) updateRoads(1); updateBuildings(1, true); window.__K = K; window.__G = GAME; window.__cam = camera; window.__dbg = { H, ground, deckAt, hiAt, hitTrees, hitBuildings, DECKS, TRIALS }; window.__sel = k => { selectVehicle(k, true); const s0 = SPAWNS[0], [x, z] = ll2xz(s0[1], s0[2]), sn = snapToRoad(x, z, false); placeVehicle(GAME.v, sn.x, sn.z, sn.yaw); };
    // physics without drawing, for checks: hold these inputs for `sec` seconds and report where the machine went
    // a crude autopilot that follows a timed route, to prove the route can be ridden end to end
    window.__auto = (ti, sec, vmax) => { const T = TRIALS[ti], v = GAME.v, P = T.pts, res = []; startTrial(T); let i = 0, resets = 0, maxAir = 0, t = 0, minC = 9, maxSp = 0;
      for (; t < sec; t += 1 / 60) { while (i < P.length - 1 && Math.hypot(P[i][0] - v.p.x, P[i][1] - v.p.z) < 7 + v.speed * 0.55) i++;
        const err = wrap(Math.atan2(P[i][0] - v.p.x, P[i][1] - v.p.z) - v.psi), slow = Math.abs(err) > 0.3; input.steer = clamp(err * 2.4, -1, 1); input.throttle = v.speed < (slow ? vmax * 0.45 : vmax) ? 1 : 0; input.brake = v.speed > (slow ? vmax * 0.6 : vmax * 1.15) ? 0.7 : 0; input.hand = false; input.lean = 0;
        stepVehicle(v, input, 1 / 60); if (v.S.four && v.upright < 0.2 && v.air > 2) { if (res.length < 6) res.push("flipped@" + t.toFixed(0) + "s at " + v.p.x.toFixed(0) + "," + v.p.z.toFixed(0) + " safe " + v.safe.x.toFixed(0) + "," + v.safe.z.toFixed(0)); resets++; resetVehicle(); } maxAir = Math.max(maxAir, v.air); maxSp = Math.max(maxSp, v.speed); minC = Math.min(minC, v.p.y - ground(v.p.x, v.p.z, v.p.y));
        if (v.crash > 3.4 || v.sunk) { resets++; if (res.length < 6) res.push("reset@" + t.toFixed(0) + "s " + (v.sunk ? "sunk" : v.why) + " at " + v.p.x.toFixed(0) + "," + v.p.z.toFixed(0)); resetVehicle(); }
        updateTrial(1 / 60); if (!GAME.trial || GAME.trial.done) break; }
      res.push(T.name + ": " + (GAME.trial && GAME.trial.done ? "FINISHED in " + GAME.trial.t.toFixed(1) + "s" : "NOT finished, cp " + (GAME.trial ? GAME.trial.cp + "/" + GAME.trial.cps.length : "?") + " route point " + i + "/" + P.length + " at " + v.p.x.toFixed(0) + "," + v.p.z.toFixed(0)) + " | resets " + resets + " maxAir " + maxAir.toFixed(1) + "s top " + (maxSp * MPH).toFixed(0) + "mph minClear " + minC.toFixed(2));
      GAME.trial = null; return res; };
    window.__sim = (sec, inp) => { const v = GAME.v, out = []; Object.assign(input, { throttle: 0, brake: 0, steer: 0, hand: false, lean: 0 }, inp); let k = 0; for (let t = 0; t < sec; t += 1 / 60, k++) { stepVehicle(v, input, 1 / 60); if (v.crash > 3.4 || v.sunk) { out.push("RESET " + (v.sunk ? "sunk" : v.why)); resetVehicle(); } if (k % 60 === 59) out.push([(t + 1 / 60).toFixed(0) + "s", (v.speed * MPH).toFixed(0) + "mph", v.p.x.toFixed(0), v.p.y.toFixed(1), v.p.z.toFixed(0), "th" + (v.th || 0).toFixed(2), "phi" + (v.phi || 0).toFixed(2), "air" + v.air.toFixed(1), "g" + (ground(v.p.x, v.p.z, v.p.y) ).toFixed(1), v.S.four ? "up" + v.upright.toFixed(2) : "", "fwd" + v.fwd.toFixed(1), "sf" + v.surf, "c" + v.contact.map(c => c ? 1 : 0).join("")].join(" ")); }
      syncVehicle(v, 1 / 60, 0); updateCamera(1, true); camera.updateMatrixWorld(); for (let i = 0; i < 40; i++) updateRoads(1); updateBuildings(1, true); return out; }; }
  let last = performance.now(), frames = 0;
  const frame = now => {
    requestAnimationFrame(frame); const dt = QS.has("test") ? 1 / 30 : Math.min(0.05, (now - last) / 1000); last = now; GAME.time += dt; const time = GAME.time, v = GAME.v;
    if (GAME.mode === "play" && !GAME.paused) {
      readInput(dt); stepVehicle(v, input, dt);
      if (v.S.four) { v.roofT = v.upright < 0.25 && v.speed < 1.5 ? (v.roofT || 0) + dt : 0; if (v.roofT > 2.5) { v.roofT = 0; resetVehicle(); toast("Back on your wheels", 1.5); } }   // a car on its roof is set back on the road
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
