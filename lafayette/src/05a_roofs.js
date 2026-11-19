/* ---------- roofs: planes that climb inward from every wall and meet in hips, valleys and ridges, whatever the plan shape ---------- */
/* Where two lines (inward normals a and b) are pushed in by wa and wb, their corner moves by this much. */
function cornerMove(ax, az, bx, bz, wa, wb, out) {
  const det = ax * bz - az * bx;
  if (Math.abs(det) < 1e-4) { const w = (wa + wb) / 2; out[0] = ax * w; out[1] = az * w; return; }
  let vx = (wa * bz - wb * az) / det, vz = (ax * wb - bx * wa) / det; const s = Math.hypot(vx, vz), lim = 12 * Math.max(Math.abs(wa), Math.abs(wb), 1e-6);
  if (s > lim) { vx *= lim / s; vz *= lim / s; } out[0] = vx; out[1] = vz;
}
const _cm = [0, 0];
/* A ring with every side pushed out by its own distance (negative pulls it in). */
function offsetRing(P, n, dist) {
  const out = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) {
    const i = (k + n - 1) % n, j = (k + 1) % n; let ax = -(P[k * 2 + 1] - P[i * 2 + 1]), az = P[k * 2] - P[i * 2], bx = -(P[j * 2 + 1] - P[k * 2 + 1]), bz = P[j * 2] - P[k * 2];
    const la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1; ax /= la; az /= la; bx /= lb; bz /= lb;
    cornerMove(ax, az, bx, bz, -dist[i], -dist[k], _cm); out[k * 2] = P[k * 2] + _cm[0]; out[k * 2 + 1] = P[k * 2 + 1] + _cm[1];
  }
  return out;
}
/* Drop corners that do not turn and sides too short to carry a roof plane. */
function tidyRing(P, n) {
  let X = [], Z = []; for (let i = 0; i < n; i++) { X.push(P[i * 2]); Z.push(P[i * 2 + 1]); }
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let k = 0; k < X.length && X.length > 3; k++) {
      const m = X.length, i = (k + m - 1) % m, j = (k + 1) % m, ax = X[k] - X[i], az = Z[k] - Z[i], bx = X[j] - X[k], bz = Z[j] - Z[k], la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      if (la < 0.25 || Math.abs(ax * bz - az * bx) < 0.07 * la * lb) { X.splice(k, 1); Z.splice(k, 1); k--; changed = true; }   // no turn, or a slit that doubles back on itself
    }
    if (!changed) break;
  }
  const out = new Float32Array(X.length * 2); for (let i = 0; i < X.length; i++) { out[i * 2] = X[i]; out[i * 2 + 1] = Z[i]; } return out;
}
/* The roof over ring P (n corners, interior on the left of each side). `gable[i]` marks side i as a gable end: it stays upright while its
   neighbours climb. Planes stop climbing at run tMax, where the roof is cut off flat.
   Returns faces as runs of 11 numbers: side, then the lower edge (x, z, x, z, run) and the upper edge (x, z, x, z, run); and the flat caps. */
function roofSkeleton(P, n, gable, tMax) {
  const faces = [], caps = [], EN = new Float32Array(n * 2), EW = new Float32Array(n); let tEnd = 0, guard = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = P[j * 2] - P[i * 2], dz = P[j * 2 + 1] - P[i * 2 + 1], L = Math.hypot(dx, dz) || 1; EN[i * 2] = -dz / L; EN[i * 2 + 1] = dx / L; EW[i] = gable && gable[i] ? 0 : 1; }
  const run = (X, Z, E, T) => {
    for (;;) {
      if (++guard > 600) { caps.push({ X, Z, t: T }); return; }
      // tidy: sides that have shrunk to nothing go, and so do slivers where two fronts have met
      for (let again = true; again && X.length >= 3;) {
        again = false; const m = X.length;
        for (let k = 0; k < m; k++) {
          const j = (k + 1) % m, i = (k + m - 1) % m, L = Math.hypot(X[j] - X[k], Z[j] - Z[k]);
          if (L < 0.04) { X.splice(k, 1); Z.splice(k, 1); E.splice(k, 1); again = true; break; }
          const ix = X[k] - X[i], iz = Z[k] - Z[i], ox = X[j] - X[k], oz = Z[j] - Z[k], Li = Math.hypot(ix, iz);
          if (ix * ox + iz * oz < 0 && Math.abs(ix * oz - iz * ox) < 0.03 * Math.max(Li, L)) {
            if (Math.abs(L - Li) < 0.3) { const d = [i, k].sort((p, q) => q - p); for (const q of d) { X.splice(q, 1); Z.splice(q, 1); E.splice(q, 1); } }   // the two fronts were the same length: nothing is left of either
            else { if (L > Li) E[i] = E[k]; X.splice(k, 1); Z.splice(k, 1); E.splice(k, 1); }
            again = true; break; }
        }
      }
      const m = X.length; if (m < 3) return;
      let area = 0; for (let k = 0; k < m; k++) { const j = (k + 1) % m; area += X[k] * Z[j] - X[j] * Z[k]; } if (area < 0.06) return;
      const VX = new Float64Array(m), VZ = new Float64Array(m);
      for (let k = 0; k < m; k++) { const a = E[(k + m - 1) % m], b = E[k]; cornerMove(EN[a * 2], EN[a * 2 + 1], EN[b * 2], EN[b * 2 + 1], EW[a], EW[b], _cm); VX[k] = _cm[0]; VZ[k] = _cm[1]; }
      let te = tMax - T, kind = 0, ek = -1, sk = -1;
      for (let k = 0; k < m; k++) {   // a side shrinks to nothing
        const j = (k + 1) % m, ex = X[j] - X[k], ez = Z[j] - Z[k], L = Math.hypot(ex, ez), rate = ((VX[j] - VX[k]) * ex + (VZ[j] - VZ[k]) * ez) / L;
        if (rate < -1e-7) { const t = -L / rate; if (t < te) { te = t; kind = 1; ek = k; } }
      }
      for (let r = 0; r < m; r++) {   // a re-entrant corner runs into the far side and splits the roof in two
        const i = (r + m - 1) % m, j = (r + 1) % m; if ((X[r] - X[i]) * (Z[j] - Z[r]) - (Z[r] - Z[i]) * (X[j] - X[r]) >= -1e-6) continue;
        for (let k = 0; k < m; k++) {
          if (k === r || k === i) continue; const e = E[k], nx = EN[e * 2], nz = EN[e * 2 + 1], dist = (X[r] - X[k]) * nx + (Z[r] - Z[k]) * nz, den = EW[e] - (VX[r] * nx + VZ[r] * nz);
          if (dist <= 1e-6 || den <= 1e-7) continue; const t = dist / den; if (t >= te - 1e-6) continue;
          const k2 = (k + 1) % m, hx = X[r] + VX[r] * t, hz = Z[r] + VZ[r] * t, ax = X[k] + VX[k] * t, az = Z[k] + VZ[k] * t, bx = X[k2] + VX[k2] * t, bz = Z[k2] + VZ[k2] * t, l2 = (bx - ax) * (bx - ax) + (bz - az) * (bz - az);
          if (l2 < 1e-6) continue; const s = ((hx - ax) * (bx - ax) + (hz - az) * (bz - az)) / l2; if (s < -1e-4 || s > 1.0001) continue;
          te = t; kind = 2; sk = k; ek = r;
        }
      }
      if (!(te > 0)) te = 0;
      const NX = new Array(m), NZ = new Array(m); for (let k = 0; k < m; k++) { NX[k] = X[k] + VX[k] * te; NZ[k] = Z[k] + VZ[k] * te; }
      if (te > 1e-5) for (let k = 0; k < m; k++) { const j = (k + 1) % m; faces.push(E[k], X[k], Z[k], X[j], Z[j], T, NX[k], NZ[k], NX[j], NZ[j], T + te); }
      T += te; if (T > tEnd) tEnd = T;
      if (kind === 0) { caps.push({ X: NX, Z: NZ, t: T }); return; }
      if (kind === 2) {
        const r = ek, k = sk, X1 = [], Z1 = [], E1 = [], X2 = [NX[r]], Z2 = [NZ[r]], E2 = [E[k]];
        for (let q = r; ; q = (q + 1) % m) { X1.push(NX[q]); Z1.push(NZ[q]); E1.push(E[q]); if (q === k) break; }
        for (let q = (k + 1) % m; q !== r; q = (q + 1) % m) { X2.push(NX[q]); Z2.push(NZ[q]); E2.push(E[q]); }
        run(X1, Z1, E1, T); run(X2, Z2, E2, T); return;
      }
      NX.splice(ek, 1); NZ.splice(ek, 1); E.splice(ek, 1); X = NX; Z = NZ;
    }
  };
  const X = [], Z = [], E = []; for (let i = 0; i < n; i++) { X.push(P[i * 2]); Z.push(P[i * 2 + 1]); E.push(i); }
  run(X, Z, E, 0);
  return { faces, caps, tEnd, EN, EW };
}
/* Which sides of a house are gable ends: the short end of a wing, square at both corners, with the long walls running back from it. */
function gableSides(P, n, style, seed) {
  const g = new Uint8Array(n); if (style === 0) return g; let any = 0;
  for (let k = 0; k < n; k++) {
    const i = (k + n - 1) % n, j = (k + 1) % n, l = (k + 2) % n, ax = P[k * 2] - P[i * 2], az = P[k * 2 + 1] - P[i * 2 + 1], bx = P[j * 2] - P[k * 2], bz = P[j * 2 + 1] - P[k * 2 + 1], cx = P[l * 2] - P[j * 2], cz = P[l * 2 + 1] - P[j * 2 + 1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), lc = Math.hypot(cx, cz); if (lb < 2.6 || lb > 13 || la < 1e-3 || lc < 1e-3) continue;
    const s1 = (ax * bz - az * bx) / (la * lb), s2 = (bx * cz - bz * cx) / (lb * lc); if (s1 < 0.9 || s2 < 0.9) continue;   // both corners turn inward, close to square
    if (Math.min(la, lc) < lb * 0.55) continue;   // the walls behind must run back at least half a span, or it is only a bump in a long wall
    if (style === 2 && hash2(seed, k, 41) < 0.45) continue;
    g[k] = 1; any++;
  }
  if (any === n) g[0] = 0;
  return g;
}
if (typeof module !== "undefined") module.exports = { roofSkeleton, offsetRing, tidyRing, gableSides, cornerMove };
