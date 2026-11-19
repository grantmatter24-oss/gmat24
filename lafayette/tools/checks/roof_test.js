// offline check of the roof generator against every mapped footprint
const fs = require("fs"), zlib = require("zlib"), path = require("path");
global.hash2 = function (ix, iz, seed) { let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const src = fs.readFileSync(process.argv[2] + "/src/05a_roofs.js", "utf8"); const mod = { exports: {} }; new Function("module", src)(mod); const { roofSkeleton, offsetRing, tidyRing, gableSides } = mod.exports;
const W = JSON.parse(fs.readFileSync(process.argv[2] + "/data/world.json", "utf8")), vec = zlib.gunzipSync(Buffer.from(W.vec, "base64")), buf = vec.buffer.slice(vec.byteOffset, vec.byteOffset + vec.length);
const T = { u1: Uint8Array, u2: Uint16Array, u4: Uint32Array, i2: Int16Array, i4: Int32Array, f4: Float32Array }, V = {};
for (const k in W.index) { const [t, off, n] = W.index[k]; V[k] = new T[t](buf, off, n); }
const bP = new Float32Array(V.bXY.length); for (let s = 0; s < V.bStart.length - 1; s++) { let x = 0, z = 0; for (let k = V.bStart[s]; k < V.bStart[s + 1]; k++) { x += V.bXY[k * 2]; z += V.bXY[k * 2 + 1]; bP[k * 2] = x / 10; bP[k * 2 + 1] = z / 10; } }
const nb = V.bKind.length; let bad = 0, nfaces = 0, ncaps = 0, worst = 0, t0 = Date.now(), nGable = 0, capA = 0, totA = 0, nanC = 0; const badList = [];
for (let b = 0; b < nb; b++) {
  const a = V.bStart[b], n = V.bStart[b + 1] - a; if (n < 3) continue; let P = new Float32Array(n * 2); for (let i = 0; i < n; i++) { P[i * 2] = bP[(a + i) * 2]; P[i * 2 + 1] = bP[(a + i) * 2 + 1]; }
  let ar = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; ar += P[i * 2] * P[j * 2 + 1] - P[j * 2] * P[i * 2 + 1]; }
  if (ar < 0) { const Q = new Float32Array(n * 2); for (let i = 0; i < n; i++) { Q[i * 2] = P[(n - 1 - i) * 2]; Q[i * 2 + 1] = P[(n - 1 - i) * 2 + 1]; } P = Q; }
  const R = tidyRing(P, n), m = R.length / 2, style = b % 3, g = gableSides(R, m, style, b), dist = new Float32Array(m); for (let i = 0; i < m; i++) { dist[i] = g[i] ? 0.12 : 0.45; if (g[i]) nGable++; }
  const E = offsetRing(R, m, dist); let area = 0; for (let i = 0; i < m; i++) { const j = (i + 1) % m; area += E[i * 2] * E[j * 2 + 1] - E[j * 2] * E[i * 2 + 1]; } area /= 2;
  const sk = roofSkeleton(E, m, g, 7); let sum = 0, nan = false;
  for (let f = 0; f < sk.faces.length; f += 11) { const F = sk.faces; for (let q = 0; q < 11; q++) if (!isFinite(F[f + q])) nan = true; if (sk.EW[F[f]] === 0) continue;
    // quad area: (x1,z1)-(x2,z2) lower, (x3,z3)-(x4,z4) upper
    const x1 = F[f + 1], z1 = F[f + 2], x2 = F[f + 3], z2 = F[f + 4], x3 = F[f + 6], z3 = F[f + 7], x4 = F[f + 8], z4 = F[f + 9];
    sum += Math.abs((x1 * z2 - x2 * z1) + (x2 * z4 - x4 * z2) + (x4 * z3 - x3 * z4) + (x3 * z1 - x1 * z3)) / 2; }
  let ca = 0; for (const c of sk.caps) { let s = 0; const k = c.X.length; for (let i = 0; i < k; i++) { const j = (i + 1) % k; s += c.X[i] * c.Z[j] - c.X[j] * c.Z[i]; } ca += Math.abs(s) / 2; }
  sum += ca; nfaces += sk.faces.length / 11; ncaps += sk.caps.length; capA += ca; totA += area; if (nan) nanC++;
  const err = Math.abs(sum - area) / Math.max(area, 1); if (err > worst) worst = err;
  if (err > 0.03 || nan) { bad++; if (badList.length < 12) badList.push([b, V.bKind[b], m, area.toFixed(0), sum.toFixed(0), err.toFixed(3), style]); }
}
console.log("buildings", nb, "bad", bad, "nan", nanC, "worst", worst.toFixed(3), "faces/bld", (nfaces / nb).toFixed(1), "caps", ncaps, "cap area share", (capA / totA).toFixed(3), "gables", nGable, "ms", Date.now() - t0);
console.log(JSON.stringify(badList));
if (process.argv[3]) { const b = +process.argv[3], a = V.bStart[b], n = V.bStart[b + 1] - a; let P = new Float32Array(n * 2); for (let i = 0; i < n; i++) { P[i * 2] = bP[(a + i) * 2]; P[i * 2 + 1] = bP[(a + i) * 2 + 1]; }
  let ar = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; ar += P[i * 2] * P[j * 2 + 1] - P[j * 2] * P[i * 2 + 1]; } if (ar < 0) { const Q = new Float32Array(n * 2); for (let i = 0; i < n; i++) { Q[i * 2] = P[(n - 1 - i) * 2]; Q[i * 2 + 1] = P[(n - 1 - i) * 2 + 1]; } P = Q; }
  const R = tidyRing(P, n), m = R.length / 2, style = b % 3, g = gableSides(R, m, style, b), dist = new Float32Array(m); for (let i = 0; i < m; i++) dist[i] = g[i] ? 0.12 : 0.45; const E = offsetRing(R, m, dist), x0 = E[0], z0 = E[1];
  console.log("ring", Array.from(E).map((v, i) => (v - (i % 2 ? z0 : x0)).toFixed(1)).join(" "), "gable", Array.from(g).join(""));
  const sk = roofSkeleton(E, m, g, 7); for (let f = 0; f < sk.faces.length; f += 11) { const F = sk.faces; console.log("e" + F[f], [F[f + 1] - x0, F[f + 2] - z0, F[f + 3] - x0, F[f + 4] - z0].map(v => v.toFixed(1)).join(","), "t" + F[f + 5].toFixed(2), "->", [F[f + 6] - x0, F[f + 7] - z0, F[f + 8] - x0, F[f + 9] - z0].map(v => v.toFixed(1)).join(","), "t" + F[f + 10].toFixed(2)); }
  for (const c of sk.caps) console.log("cap t" + c.t.toFixed(2), c.X.map((x, i) => (x - x0).toFixed(1) + "," + (c.Z[i] - z0).toFixed(1)).join(" ")); }
