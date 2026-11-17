# Adds the real creeks to world.json: python3 creeks.py <raw folder with water.json> <world.json>
# water.json comes from: python3 overture.py base water <raw>/water.json
# Each mapped stream is snapped to the bottom of its gully in the surveyed terrain, so the water runs where water would.
import sys, json, gzip, base64, numpy as np
from scipy import ndimage
from shapely.geometry import LineString
RAW, OUT = sys.argv[1].rstrip("/") + "/", sys.argv[2]
W = json.load(open(OUT)); M = W["meta"]
X0, Z0, NX, NZ, CELL = M["x0"], M["z0"], M["nx"], M["nz"], M["cell"]
X1, Z1 = X0 + (NX - 1) * CELL, Z0 + (NZ - 1) * CELL
d = np.frombuffer(gzip.decompress(base64.b64decode(W["h"])), "<i2").astype(np.int64).reshape(NZ, NX)
col0 = np.cumsum(d[:, 0]); d2 = d.copy(); d2[:, 0] = col0; Hm = (np.cumsum(d2, axis=1) & 0xffff) * M["hq"] + M["hbase"]
Hs = ndimage.gaussian_filter(Hm, 1.0)
def toXZ(lon, lat): return ((lon - M["lon0"]) * M["mlon"], -(lat - M["lat0"]) * M["mlat"])
def snap(pts, R=4):
    out = []
    for x, z in pts:
        i, j = int(round((x - X0) / CELL)), int(round((z - Z0) / CELL))
        if i < R or j < R or i >= NX - R or j >= NZ - R: out.append((x, z)); continue
        win = Hs[j - R:j + R + 1, i - R:i + R + 1]; jj, ii = np.mgrid[-R:R + 1, -R:R + 1]
        cost = win + 0.035 * np.hypot(ii, jj) * CELL   # the lowest ground nearby, not straying far for a few centimetres
        k = np.argmin(cost); out.append((X0 + (i + ii.flat[k]) * CELL, Z0 + (j + jj.flat[k]) * CELL))
    return out
def smooth(pts, n=2):
    a = np.array(pts)
    for _ in range(n):
        b = a.copy(); b[1:-1] = (a[:-2] + 2 * a[1:-1] + a[2:]) / 4; a = b
    return a
creeks = []
for f in json.load(open(RAW + "water.json"))["features"]:
    g, p = f["geometry"], f["properties"]
    if g["type"] != "LineString" or p.get("subtype") not in ("stream", "river"): continue
    name = (p.get("names") or {}).get("primary") or ""
    ln = LineString([toXZ(c[0], c[1]) for c in g["coordinates"]])
    if ln.length < 30: continue
    k = 2 if p.get("subtype") == "river" else 1 if name else 0
    pts = [ln.interpolate(s).coords[0] for s in np.arange(0, ln.length, 8.0)] + [ln.coords[-1]]
    if k < 2: pts = smooth(snap(smooth(snap(pts), 2)), 3)
    seg = []
    for x, z in pts:   # keep the parts inside the resort grid
        if X0 + 60 < x < X1 - 60 and Z0 + 60 < z < Z1 - 60: seg.append((float(x), float(z)))
        else:
            if len(seg) > 3: creeks.append((name, k, seg))
            seg = []
    if len(seg) > 3: creeks.append((name, k, seg))
W["creeks"] = [{"n": n, "k": k, "pts": [[round(x, 1), round(z, 1)] for x, z in LineString(s).simplify(0.8).coords]} for n, k, s in creeks]
json.dump(W, open(OUT, "w"), separators=(",", ":"))
print(len(W["creeks"]), "creeks,", round(sum(LineString(c["pts"]).length for c in W["creeks"]) / 1000, 1), "km;", sorted({c["n"] for c in W["creeks"] if c["n"]}), len(json.dumps(W["creeks"])) // 1000, "KB")
