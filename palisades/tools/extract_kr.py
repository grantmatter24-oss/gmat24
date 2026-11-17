#!/usr/bin/env python3
"""Copies Kicker Run's skier (model, outfits, pose) out of ../ski.html into src/05_skier.js, unchanged except for the material factory,
so Palisades uses the same rider. Re-run after the skier changes in Kicker Run."""
import os, re
here = os.path.dirname(os.path.abspath(__file__)); L = open(os.path.join(here, "..", "..", "ski.html")).read().split("\n")
def find(prefix, start=0): return next(i for i in range(start, len(L)) if L[i].startswith(prefix))
parts = []
parts.append(L[find("function canvasTex(")].replace("return new THREE.CanvasTexture(c); }", "const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }"))
parts.append(L[find("const JACKETS =")]); parts.append(L[find("const PANTS =")])
a = find("const _cv = new THREE.Vector3(), _cp = [];"); b = find("const _tv ="); parts += L[a:b]
c = find("/* terrain chunks */", b); parts += [l for l in L[b:c] if not l.startswith("window.__pose")]
body = "\n".join(parts)
old = body[body.index("  const M = (color, o) => {"):]; old = old[:old.index("\n")]
body = body.replace(old, "  const M = (color, o) => worldShade(new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0.04 }, o || {})));")
head = '''/* ---------- the rider: Kicker Run's skier, outfits and pose code, copied from ski.html by tools/extract_kr.py (do not edit here) ----------
   The pose code reads Kicker Run's globals (sk, K, skierRig, outfit); KR.pose() points them at a rider for the duration of the call. */
const KR = (() => {
let sk = null, K = null, skierRig = null, slopeNow = 0;
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sA_ = () => slopeNow, spray = () => { };
const OUTFIT_DEFAULT = { helmet: "redbull", jacket: "vest", pants: "blue", accessory: "scarf", skis: "current", poles: "metal", skibend: "slight", wax: "std", grip: "std", len: "mid", style: "simple" };
let outfit = Object.assign({}, OUTFIT_DEFAULT);
'''
tail = '''
return {
  JACKETS, PANTS, OUTFIT_DEFAULT, PHYS,
  build(of) { outfit = Object.assign({}, OUTFIT_DEFAULT, of || {}); const R = buildSkier(); R.outfit = outfit; applyOutfit(R); R.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); return R; },
  dress(R, of) { outfit = R.outfit = Object.assign({}, OUTFIT_DEFAULT, of || {}); applyOutfit(R); },
  pose(R, state, keys, slope, dt, time) { sk = state; K = keys; skierRig = R; outfit = R.outfit; slopeNow = slope; poseSkier(dt, time); }
};
})();
'''
open(os.path.join(here, "..", "src", "05_skier.js"), "w").write(head + body + tail)
print("05_skier.js", len(body.split("\n")), "lines from ski.html")
