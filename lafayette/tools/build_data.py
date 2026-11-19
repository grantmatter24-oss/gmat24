"""Builds the Lafayette world dataset.  usage: build_data.py <raw dir> <world.json> [debug dir]
Sources: USGS 1/9 arc-second lidar DEM (Contra Costa County 2008) and 3DEP via AWS Terrain Tiles, Overture Maps
(OpenStreetMap) roads, buildings, land use and water, Copernicus Sentinel-2 L2A imagery."""
import sys, json, math, gzip, base64, io, heapq, collections, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import cKDTree
from geo import *

RAW = sys.argv[1].rstrip("/") + "/"; OUT = sys.argv[2]; DBG = (sys.argv[3].rstrip("/") + "/") if len(sys.argv) > 3 else None
RING = 1400.0                      # low-detail roads and buildings are kept this far outside the playable box
def load(n): return json.load(open(RAW + n + ".json"))["features"]
def nm(p): return (p.get("names") or {}).get("primary")
def inb(x, z, m=0.0): return X0 - m <= x <= X1 + m and Z0 - m <= z <= Z1 + m
def xz(co): a = np.asarray(co, np.float64)[:, :2]; x, z = toXZ(a[:, 0], a[:, 1]); return np.stack([x, z], 1)

# ---------------------------------------------------------------- elevation
H = np.load(RAW + "h_inner.npy").astype(np.float64); Hmid = np.load(RAW + "h_mid.npy").astype(np.float64); Hfar = np.maximum(np.load(RAW + "h_far.npy").astype(np.float64), -6.0)
def bil(A, x0, z0, cell, x, z):
    fx = np.clip((np.asarray(x, np.float64) - x0) / cell, 0, A.shape[1] - 1.001); fz = np.clip((np.asarray(z, np.float64) - z0) / cell, 0, A.shape[0] - 1.001)
    i = fx.astype(int); j = fz.astype(int); u = fx - i; v = fz - j
    return A[j, i] * (1 - u) * (1 - v) + A[j, i + 1] * u * (1 - v) + A[j + 1, i] * (1 - u) * v + A[j + 1, i + 1] * u * v
gx, gz = np.meshgrid(X0 + np.arange(NX) * CELL, Z0 + np.arange(NZ) * CELL)

# ---------------------------------------------------------------- roads
KIND = {"motorway": 0, "trunk": 2, "primary": 2, "secondary": 3, "tertiary": 4, "residential": 5, "unclassified": 5, "living_street": 5, "service": 6,
        "track": 9, "unknown": 9, "path": 10, "footway": 11, "pedestrian": 11, "cycleway": 12, "steps": 13}
#        mway link prim  sec  tert  res  serv  drive aisle track path foot cycle steps rail xwalk
WID2 = [18.0, 7.0, 16.0, 12.5, 10.0, 7.6, 5.0, 3.2, 6.4, 3.0, 1.0, 1.6, 3.0, 1.6, 3.4, 3.0]     # two-way widths, metres
WID1 = [18.0, 7.0, 9.5, 8.0, 6.5, 5.5, 4.2, 3.2, 6.4, 3.0, 1.0, 1.6, 3.0, 1.6, 3.4, 3.0]        # one-way
PAVED = {0, 1, 2, 3, 4, 5, 6, 7, 8, 12}
def cut(P, cum, f0, f1):
    L = cum[-1]; a, b = f0 * L, f1 * L; out = []
    def at(s): k = min(len(P) - 2, max(0, int(np.searchsorted(cum, s, "right") - 1))); t = (s - cum[k]) / max(1e-9, cum[k + 1] - cum[k]); return P[k] + (P[k + 1] - P[k]) * t
    out.append(at(a))
    for k in range(1, len(P) - 1):
        if a < cum[k] < b: out.append(P[k])
    out.append(at(b)); return np.array(out)
def resample(P, step):
    d = np.hypot(*(P[1:] - P[:-1]).T); cum = np.concatenate([[0], np.cumsum(d)]); L = cum[-1]
    if L < 1e-6: return P[:1].copy(), np.zeros(1)
    n = max(2, int(math.ceil(L / step)) + 1); s = np.linspace(0, L, n)
    return np.stack([np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])], 1), s
names = [""]; name_ix = {"": 0}
def name_id(n):
    n = (n or "").strip()
    if n not in name_ix: name_ix[n] = len(names); names.append(n)
    return name_ix[n]
pieces = []     # dict(kind, P, w, flags, name, level, bridge)
node_arms = collections.defaultdict(list); node_pos = {}
graph = collections.defaultdict(list)      # connector id -> [(other id, length, kind, polyline)]
segs = [f for f in load("segment") if f["geometry"]["type"] == "LineString"]
for f in segs:
    p = f["properties"]; cls = p.get("class"); sub = p.get("subclass"); st = p.get("subtype")
    P = xz(f["geometry"]["coordinates"])
    if len(P) < 2: continue
    bb = (P[:, 0].min(), P[:, 0].max(), P[:, 1].min(), P[:, 1].max())
    if bb[1] < X0 - RING or bb[0] > X1 + RING or bb[3] < Z0 - RING or bb[2] > Z1 + RING: continue
    if st == "rail":
        fl = [v for r in (p.get("rail_flags") or []) for v in r["values"]]
        if cls != "subway" or "is_abandoned" in fl or "is_disused" in fl: continue
        kind = 14
    elif st == "road":
        if cls not in KIND: continue
        kind = KIND[cls]
        if kind == 0 and sub == "link": kind = 1
        if kind == 6 and sub == "driveway": kind = 7
        if kind == 6 and sub in ("parking_aisle", "alley"): kind = 8
        if kind == 11 and sub == "crosswalk": kind = 15
    else: continue
    surf = [r["value"] for r in (p.get("road_surface") or [])]
    unpaved = any(s in ("unpaved", "dirt", "gravel") for s in surf) or (kind in (9, 10) and "paved" not in surf)
    if kind == 11 and not unpaved and sub != "sidewalk":
        # plain footways inside the open space are dirt trails; in town they are concrete
        pass
    oneway = any(a.get("access_type") == "denied" and (a.get("when") or {}).get("heading") == "backward" and not (a.get("when") or {}).get("mode") for a in (p.get("access_restrictions") or []))
    if kind in (0, 1): oneway = True
    w = (WID1 if oneway else WID2)[kind]
    d = np.hypot(*(P[1:] - P[:-1]).T); cum = np.concatenate([[0], np.cumsum(d)])
    if cum[-1] < 0.5: continue
    # split where bridge / tunnel flags or levels change
    brk = {0.0, 1.0}; rules = []
    for key in ("road_flags", "rail_flags"):
        for r in (p.get(key) or []):
            b = r.get("between") or [0.0, 1.0]
            for v in r["values"]:
                if v in ("is_bridge", "is_tunnel", "is_covered"): rules.append((v, b[0], b[1])); brk.update(b)
    for r in (p.get("level_rules") or []):
        b = r.get("between") or [0.0, 1.0]; rules.append(("level", b[0], b[1], r["value"])); brk.update(b)
    brk = sorted(brk)
    conn = sorted([(c["at"], c["connector_id"]) for c in (p.get("connectors") or [])])
    for a, b in zip(brk[:-1], brk[1:]):
        if (b - a) * cum[-1] < 0.3: continue
        mid = (a + b) / 2; bridge = tunnel = False; level = 0
        for r in rules:
            if r[1] <= mid <= r[2]:
                if r[0] == "is_bridge": bridge = True
                elif r[0] == "is_tunnel": tunnel = True
                elif r[0] == "level": level = r[3]
        if tunnel or level < 0: continue
        Q = cut(P, cum, a, b)
        pieces.append(dict(kind=kind, P=Q, w=w, oneway=oneway, unpaved=unpaved, name=name_id(nm(p)), level=level, bridge=bridge or level > 0, sub=sub))
    if kind <= 13:
        for (a0, c0), (a1, c1) in zip(conn[:-1], conn[1:]):
            Q = cut(P, cum, a0, a1); L = float(np.hypot(*(Q[1:] - Q[:-1]).T).sum())
            nid = name_id(nm(p)); graph[c0].append((c1, L, kind, Q, nid))
            if not (oneway and kind in (0, 1)): graph[c1].append((c0, L, kind, Q[::-1], nid))
            node_pos[c0] = Q[0]; node_pos[c1] = Q[-1]
        for a, c in conn: node_arms[c].append(kind)
print("road pieces", len(pieces), "bridges", sum(q["bridge"] for q in pieces), "names", len(names))

# Bridges the map does not flag. The survey has every bridge deck removed, so where a main road crosses a street or a creek
# without a bridge tag its centreline drops into the gap below. Any short, deep notch in a main road's profile is a bridge: split
# the road there and carry it across on a deck.
split = []; implied = 0
for q in pieces:
    if q["kind"] > 4 or q["bridge"]: split.append(q); continue
    P = q["P"]; R, s = resample(P, 2.0)
    if len(R) < 12 or not ((R[:, 0] > X0) & (R[:, 0] < X1) & (R[:, 1] > Z0) & (R[:, 1] < Z1)).all(): split.append(q); continue
    h = bil(H, X0, Z0, CELL, R[:, 0], R[:, 1]); dip = ndimage.grey_closing(h, size=71, mode="nearest") - h
    m = ndimage.binary_dilation(dip > 2.2, iterations=5); lab, n = ndimage.label(m)
    if n == 0: split.append(q); continue
    d = np.hypot(*(P[1:] - P[:-1]).T); cum = np.concatenate([[0], np.cumsum(d)]); L = cum[-1]; cuts = []
    for k in range(1, n + 1):
        ii = np.where(lab == k)[0]; a0, b0 = s[ii[0]], s[ii[-1]]
        if 8 <= b0 - a0 <= 170 and a0 > 6 and b0 < L - 6: cuts.append((a0 / L, b0 / L))
    if not cuts: split.append(q); continue
    pos = 0.0
    for f0, f1 in cuts:
        if f0 > pos + 1e-4: split.append(dict(q, P=cut(P, cum, pos, f0)))
        split.append(dict(q, P=cut(P, cum, f0, f1), bridge=True, level=max(q["level"], 1))); implied += 1; pos = f1
    if pos < 1 - 1e-4: split.append(dict(q, P=cut(P, cum, pos, 1.0)))
pieces = split; print("bridges implied by the survey", implied)

# road surface profile: the lidar along the centreline, smoothed, then stamped into the height grid so every street is graded flat
# across its width the way the real one is
SIG = {0: 14, 1: 10, 2: 9, 3: 9, 4: 8, 5: 7, 6: 5, 7: 4, 8: 4, 9: 5, 12: 6, 14: 14}
sx, sz, sh, shw, sbl = [], [], [], [], []
for q in pieces:
    k = q["kind"]
    if k not in SIG or q["bridge"]: continue
    R, s = resample(q["P"], 2.0)
    if len(R) < 2: continue
    m = (R[:, 0] > X0 - 40) & (R[:, 0] < X1 + 40) & (R[:, 1] > Z0 - 40) & (R[:, 1] < Z1 + 40)
    if not m.any(): continue
    h = bil(H, X0, Z0, CELL, R[:, 0], R[:, 1]); h = ndimage.gaussian_filter1d(h, SIG[k] / 2.0, mode="nearest")
    hw = q["w"] / 2; core = hw + (1.5 if k != 9 else 0.3); blend = max(5.0, hw) if k != 9 else 3.5
    sx.append(R[m, 0]); sz.append(R[m, 1]); sh.append(h[m]); shw.append(np.full(m.sum(), core)); sbl.append(np.full(m.sum(), blend))
sx, sz, sh, shw, sbl = [np.concatenate(a) for a in (sx, sz, sh, shw, sbl)]
tree = cKDTree(np.stack([sx, sz], 1)); K = 10
dist, idx = tree.query(np.stack([gx.ravel(), gz.ravel()], 1), k=K, distance_upper_bound=34.0, workers=-1)
ok = np.isfinite(dist); idx = np.where(ok, idx, 0)
core = shw[idx]; blend = sbl[idx]
u = np.clip((dist - core) / blend, 0, 1); cov = np.where(ok, 1 - u * u * (3 - 2 * u), 0.0)            # 1 on the road, 0 beyond the cut bank
wgt = np.where(ok, np.exp(-np.square(np.maximum(dist - core * 0.5, 0) / (core * 0.5 + 1.5))) * (cov > 0), 0.0) + 1e-12
# where a street passes under another (an overpass abutment), each cell belongs to the street that covers it best: the two grades
# must not be averaged into a ramp that neither street has
rows = np.arange(len(dist)); score = np.where(ok, cov * 1000 - dist, -1e9); bi = score.argmax(1); hb = sh[idx][rows, bi]
wgt = wgt * (np.abs(sh[idx] - hb[:, None]) < 1.5) + 1e-12
target = (wgt * sh[idx]).sum(1) / wgt.sum(1); B = cov[rows, bi]
Hn = H.ravel() * (1 - B) + target * B
print("graded cells", int((B > 0.01).sum()), "max change %.1f m, mean |change| on roads %.2f m" % (float(np.abs(Hn - H.ravel()).max()), float(np.abs(Hn - H.ravel())[B > 0.9].mean())))
H = Hn.reshape(H.shape); del dist, idx, core, blend, u, cov, wgt, target
# seam: the outer 120 m of the playable grid eases onto the coarse surrounding surface so the two meshes share an edge
edge = np.minimum(np.minimum(gx - X0, X1 - gx), np.minimum(gz - Z0, Z1 - gz)); t = np.clip(edge / 120.0, 0, 1); t = t * t * (3 - 2 * t)
H = bil(Hmid, -MR, -MR, MC, gx, gz) * (1 - t) + H * t
mg = -MR + np.arange(MN) * MC; mx, mz = np.meshgrid(mg, mg); edge = np.minimum(MR - np.abs(mx), MR - np.abs(mz)); t = np.clip(edge / 1600.0, 0, 1); t = t * t * (3 - 2 * t)
Hmid = bil(Hfar, -FR, -FR, FC, mx, mz) * (1 - t) + Hmid * t
def Hat(x, z): return bil(H, X0, Z0, CELL, x, z)
def Hany(x, z):
    x = np.asarray(x, np.float64); z = np.asarray(z, np.float64); ins = (x >= X0) & (x <= X1) & (z >= Z0) & (z <= Z1)
    return np.where(ins, bil(H, X0, Z0, CELL, x, z), bil(Hmid, -MR, -MR, MC, x, z))

# bridge decks: straight grade between the abutments, lifted where they must clear what passes beneath
def seg_x(a, b, c, d):
    r = b - a; s = d - c; den = r[0] * s[1] - r[1] * s[0]
    if abs(den) < 1e-9: return None
    t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den; u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den
    return (t, u) if 0 <= t <= 1 and 0 <= u <= 1 else None
decks = [q for q in pieces if q["bridge"] and q["kind"] != 15]
for q in decks:
    R, s = resample(q["P"], 4.0); q["R"] = R; q["s"] = s; y0, y1 = float(Hany(*R[0])), float(Hany(*R[-1])); q["y"] = y0 + (y1 - y0) * (s / max(1e-6, s[-1]))
grid_ix = collections.defaultdict(list)
for qi, q in enumerate(pieces):
    if q["kind"] in (10, 11, 13, 15) and not q["bridge"]: continue
    P = q["P"]
    for k in range(len(P) - 1):
        for cx in range(int(min(P[k][0], P[k + 1][0]) // 60), int(max(P[k][0], P[k + 1][0]) // 60) + 1):
            for cz in range(int(min(P[k][1], P[k + 1][1]) // 60), int(max(P[k][1], P[k + 1][1]) // 60) + 1): grid_ix[(cx, cz)].append((qi, k))
lifted = 0
for _ in range(3):
    for q in sorted(decks, key=lambda d: d["level"]):
        R, s, need = q["R"], q["s"], []
        for k in range(len(R) - 1):
            seen = set()
            for cx in range(int(min(R[k][0], R[k + 1][0]) // 60), int(max(R[k][0], R[k + 1][0]) // 60) + 1):
                for cz in range(int(min(R[k][1], R[k + 1][1]) // 60), int(max(R[k][1], R[k + 1][1]) // 60) + 1):
                    for qi, kk in grid_ix.get((cx, cz), ()):
                        o = pieces[qi]
                        if o is q or (qi, kk) in seen or o["level"] >= q["level"]: continue
                        seen.add((qi, kk)); hit = seg_x(R[k], R[k + 1], o["P"][kk], o["P"][kk + 1])
                        if not hit: continue
                        pt = o["P"][kk] + (o["P"][kk + 1] - o["P"][kk]) * hit[1]
                        if o["bridge"] and "R" in o: j = int(np.argmin(np.hypot(*(o["R"] - pt).T))); yo = o["y"][j]
                        else: yo = float(Hany(pt[0], pt[1]))
                        need.append((s[k] + (s[k + 1] - s[k]) * hit[0], yo + (4.3 if o["kind"] != 14 else 5.0)))   # enough for anything in the game to pass beneath, without humping the freeway
        for sc, yr in need:
            if sc < 14.0 or sc > s[-1] - 14.0: continue          # a road joining at the abutment is not something to clear
            cur = float(np.interp(sc, s, q["y"])); d = yr - cur
            if d <= 0.05: continue
            span = max(60.0, d * 24.0); bump = np.clip(1 - np.abs(s - sc) / span, 0, 1) * np.clip(s / 16.0, 0, 1) * np.clip((s[-1] - s) / 16.0, 0, 1); q["y"] = q["y"] + d * (bump * bump * (3 - 2 * bump)); lifted += 1   # never at the ends: the deck meets the road there
print("decks", len(decks), "clearance lifts", lifted)

# ---------------------------------------------------------------- hi-res ground masks (2 m, drawn at 1 m)
SS = 1.0; W1, H1 = int((X1 - X0) / SS), int((Z1 - Z0) / SS)
def px(P): return [((x - X0) / SS, (z - Z0) / SS) for x, z in P]
def draw_line(dr, P, w, val):
    pts = px(P); wp = max(1, int(round(w / SS)))
    dr.line(pts, fill=val, width=wp, joint="curve")
    if wp > 2:
        r = wp / 2
        for (x, y) in (pts[0], pts[-1]): dr.ellipse([x - r, y - r, x + r, y + r], fill=val)
paved = Image.new("L", (W1, H1), 0); dirt = Image.new("L", (W1, H1), 0); struct = Image.new("L", (W1, H1), 0)
dp, dd, ds = ImageDraw.Draw(paved), ImageDraw.Draw(dirt), ImageDraw.Draw(struct)
def polys(g):
    if g["type"] == "Polygon": return [g["coordinates"]]
    if g["type"] == "MultiPolygon": return g["coordinates"]
    return []
infra = load("infrastructure"); landuse = load("land_use"); land = load("land"); water = load("water")
for f in infra:
    p = f["properties"]
    if p.get("class") == "parking" and f["geometry"]["type"] in ("Polygon", "MultiPolygon"):
        for rings in polys(f["geometry"]):
            dp.polygon(px(xz(rings[0])), fill=255)
            for hole in rings[1:]: dp.polygon(px(xz(hole)), fill=0)
for f in landuse:
    if f["properties"].get("class") == "pedestrian":
        for rings in polys(f["geometry"]): dp.polygon(px(xz(rings[0])), fill=255)
for q in sorted(pieces, key=lambda q: -q["kind"]):
    k = q["kind"]; P = q["P"]
    if q["bridge"] or k == 15: continue
    if k == 14: draw_line(dd, P, 4.4, 150); continue                         # track ballast
    if k in (9, 10) or q["unpaved"]: draw_line(dd, P, max(1.0, q["w"]), 255)
    elif k in (11, 13): draw_line(dp, P, q["w"], 215)                         # concrete walks
    else: draw_line(dp, P, q["w"] + (4.2 if k in (2, 3, 4) else 0.4), 255)      # main streets carry a sidewalk each side
# ---------------------------------------------------------------- buildings
def lu_class(f): p = f["properties"]; return p.get("class")
from shapely.geometry import shape, Point, Polygon
from shapely.strtree import STRtree
lu_polys = []; lu_kind = []
for f in landuse:
    c = lu_class(f)
    k = {"commercial": 2, "retail": 2, "industrial": 2, "school": 4, "religious": 5, "institutional": 4}.get(c)
    if k is None: continue
    try: lu_polys.append(shape(f["geometry"])); lu_kind.append(k)
    except Exception: pass
lu_tree = STRtree(lu_polys)
BK = {"house": 0, "detached": 0, "residential": 0, "semidetached_house": 0, "garage": 1, "garages": 1, "shed": 1, "carport": 6, "roof": 6, "shelter": 6, "commercial": 2, "retail": 2, "office": 2, "hotel": 2,
      "supermarket": 2, "apartments": 3, "school": 4, "library": 4, "fire_station": 4, "civic": 4, "church": 5, "parking": 7, "train_station": 8, "hospital": 2}
BS = {"commercial": 2, "education": 4, "religious": 5, "civic": 4, "medical": 2, "transportation": 7, "entertainment": 2, "outbuilding": 1, "industrial": 2, "service": 2}
b_start = [0]; b_xy = []; b_h = []; b_kind = []; ring_b = []
nb = 0; dropped = 0
# footprints standing in a carriageway are mapping errors (machine-traced roofs over an overpass): leave them out
from shapely.geometry import LineString
street_lines = [LineString(q["P"]).buffer(max(0.5, q["w"] / 2 - 1.2), cap_style=2) for q in pieces if q["kind"] <= 5 and len(q["P"]) >= 2]; street_tree = STRtree(street_lines)
for f in load("building"):
    p = f["properties"]
    if p.get("is_underground"): continue
    for rings in polys(f["geometry"]):
        P = xz(rings[0])
        if len(P) < 4: continue
        cx, cz = P[:-1].mean(0)
        if not inb(cx, cz, RING): continue
        area = 0.5 * abs(float(np.sum(P[:-1, 0] * P[1:, 1] - P[1:, 0] * P[:-1, 1])))
        if area < 9: continue
        h = p.get("height"); nf = p.get("num_floors")
        kind = BK.get(p.get("class"), BS.get(p.get("subtype")))
        if kind is None:
            cand = lu_tree.query(Point(float(P[0, 0] / MLON + LON0), float(LAT0 - P[0, 1] / MLAT)))
            kind = None
            for ci in cand:
                if lu_polys[ci].contains(Point(float(LON0 + cx / MLON), float(LAT0 - cz / MLAT))): kind = lu_kind[ci]; break
            if kind is None: kind = 1 if area < 45 else (2 if area > 900 else 0)
            elif area < 45: kind = 1
        if h is None: h = nf * 3.2 if nf else {0: 4.6, 1: 2.8, 2: 6.5, 3: 9.0, 4: 6.0, 5: 9.0, 6: 2.9, 7: 9.0, 8: 7.0}[kind]
        h = float(min(max(h, 2.4), 80.0))
        if kind not in (6, 7, 8) and inb(cx, cz, 50):
            try:
                if len(street_tree.query(Polygon(P).buffer(-0.5), predicate="intersects")): dropped += 1; continue
            except Exception: pass
        if inb(cx, cz):
            Q = np.round(P[:-1] * 10).astype(np.int64)
            keep = [0] + [i for i in range(1, len(Q)) if (Q[i] != Q[i - 1]).any()]; Q = Q[keep]
            if len(Q) < 3: continue
            ds.polygon(px(P), fill=255 if kind != 6 else 120)
            b_xy.append(np.concatenate([Q[:1], Q[1:] - Q[:-1]]).ravel()); b_start.append(b_start[-1] + len(Q)); b_h.append(int(round(h * 10))); b_kind.append(kind); nb += 1
        else:
            # outside the map: just the footprint's bounding rectangle along its longest wall
            e = P[1:] - P[:-1]; L = np.hypot(e[:, 0], e[:, 1]); k = int(np.argmax(L)); ang = math.atan2(e[k, 1], e[k, 0]); c, s = math.cos(ang), math.sin(ang)
            u = P[:, 0] * c + P[:, 1] * s; v = -P[:, 0] * s + P[:, 1] * c; uc, vc = (u.min() + u.max()) / 2, (v.min() + v.max()) / 2
            ring_b.append((uc * c - vc * s, uc * s + vc * c, u.max() - u.min(), v.max() - v.min(), ang % math.pi, h))
print("buildings", nb, "ring buildings", len(ring_b), "dropped (a street runs through them)", dropped)
# ---------------------------------------------------------------- water
w_start = [0]; w_xy = []; w_y = []; w_kind = []
for f in water:
    p = f["properties"]; c = p.get("class")
    if f["geometry"]["type"] not in ("Polygon", "MultiPolygon"): continue
    for rings in polys(f["geometry"]):
        P = xz(rings[0]); cx, cz = P[:-1].mean(0)
        if not inb(cx, cz, 300) or len(P) < 4: continue
        area = 0.5 * abs(float(np.sum(P[:-1, 0] * P[1:, 1] - P[1:, 0] * P[:-1, 1])))
        pool = c == "swimming_pool"
        if not pool and area < 40: continue
        ds.polygon(px(P), fill=200)
        for hole in rings[1:]: ds.polygon(px(xz(hole)), fill=0)
        R, _ = resample(P, 6.0); yy = Hany(R[:, 0], R[:, 1]); y = float(np.percentile(yy, 20)) + (0.0 if not pool else 0.05)
        Q = np.round(P[:-1] * 10).astype(np.int64)
        w_xy.append(np.concatenate([Q[:1], Q[1:] - Q[:-1]]).ravel()); w_start.append(w_start[-1] + len(Q)); w_y.append(y); w_kind.append(1 if pool else 0)
print("water bodies", len(w_y), "pools", sum(w_kind))
def down(im): return np.asarray(im.resize((W1 // 2, H1 // 2), Image.BOX))
Mp, Md, Ms = down(paved), down(dirt), down(struct); del paved, dirt, struct, dp, dd, ds
Md = np.where(Mp > 128, 0, Md).astype(np.uint8)
print("hi mask", Mp.shape, "paved %.3f dirt %.3f struct %.3f" % ((Mp > 128).mean(), (Md > 128).mean(), (Ms > 128).mean()))

# the lake and ponds lie dead level: the water surface is where the survey says, the bed drops away beneath it
for i in range(len(w_y)):
    if w_kind[i]: continue
m4 = Ms[::2, ::2][:NZ - 1, :NX - 1]
wat = np.zeros((NZ, NX), bool); wat[:NZ - 1, :NX - 1] = (m4 > 190) & (m4 < 210)
if wat.any():
    lab, n = ndimage.label(wat); depth = ndimage.distance_transform_edt(wat) * CELL
    H = np.where(wat, H - np.minimum(depth * 0.18, 9.0) - 0.25, H)

# ---------------------------------------------------------------- vegetation from Sentinel-2
may = np.load(RAW + "s2_may.npz"); jul = np.load(RAW + "s2_jul.npz")
def ndvi(a): return (a[3] - a[2]) / np.maximum(a[3] + a[2], 1)
def ss(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
ji, mi = jul["inner"], may["inner"]; nj, nmay = ndvi(ji), ndvi(mi)
vis_j = (ji[0] + ji[1] + ji[2]) / 3
# summer: the grass has cured to straw, so what is still green is either tree canopy (dark) or watered turf (bright in the near infrared)
turf = ss(0.5, 0.68, nj) * ss(3300, 4300, ji[3]) * ss(520, 720, ji[1])
treec = ss(0.36, 0.62, nj) * (1 - turf)
grass = np.clip(1 - treec * 0.85 - turf, 0, 1) * ss(0.08, 0.2, nmay)        # anything alive in spring that is not canopy or turf
def up(a, order=1):
    zy, zx = (NZ - 1) / (a.shape[0] - 1), (NX - 1) / (a.shape[1] - 1)
    jj, ii = np.meshgrid(np.arange(NZ) / zy, np.arange(NX) / zx, indexing="ij"); return ndimage.map_coordinates(a, [jj, ii], order=order, mode="nearest")
LW, LH = treec.shape[1], treec.shape[0]; T4, L4, G4 = treec.copy(), turf.copy(), grass.copy()
# mapped land cover sharpens it: sports fields and parks are turf, woods are canopy
lu_img = Image.new("L", (LW, LH), 0); dl = ImageDraw.Draw(lu_img)
def px4(P): return [((x - X0) / 10.0 + 0.5, (z - Z0) / 10.0 + 0.5) for x, z in P]
pitches = []
for f in landuse:
    c = f["properties"].get("class")
    if c in ("pitch", "playground", "grass", "recreation_ground", "golf_course", "fairway", "garden", "cemetery") and f["geometry"]["type"] in ("Polygon", "MultiPolygon"):
        for rings in polys(f["geometry"]): dl.polygon(px4(xz(rings[0])), fill=255 if c in ("pitch", "grass", "fairway") else 120)
for f in land:
    c = f["properties"].get("class")
    if c in ("wood", "forest") and f["geometry"]["type"] in ("Polygon", "MultiPolygon"):
        for rings in polys(f["geometry"]): dl.polygon(px4(xz(rings[0])), fill=60)
lu4 = np.asarray(lu_img)
L4 = np.where(lu4 == 255, np.maximum(L4, 0.9), np.where(lu4 == 120, np.maximum(L4, 0.45), L4)); T4 = np.where(lu4 == 255, 0, np.where(lu4 == 60, np.maximum(T4, 0.55), T4))
hard = np.maximum(np.maximum(Mp, Md), Ms) / 255.0
G4 = np.clip(G4 * (1 - L4), 0, 1)
# in town the open ground is tended: lawns, planted verges and medians, not wild grass
urb10 = np.asarray(Image.fromarray((hard * 255).astype(np.uint8)).resize((LW, LH), Image.BOX)) / 255.0
UK = np.clip((ndimage.gaussian_filter(urb10, 3.0) - 0.05) / 0.18, 0, 1)
lawn = G4 * UK * 0.85; L4 = np.clip(L4 + lawn, 0, 1); G4 = G4 - lawn
maskLo = np.stack([np.clip(T4 * 255, 0, 255), np.clip(G4 * 255, 0, 255), np.clip(L4 * 255, 0, 255)], -1).astype(np.uint8)
print("canopy %.3f wild grass %.3f turf %.3f" % (T4.mean(), G4.mean(), L4.mean()))

# ground colour: the spring image, with roofs and asphalt replaced by the colour of the vegetation around them (those are drawn as
# real geometry, so the ground texture should only ever show soil and plants)
def to_srgb(a, gain=2.9): v = np.clip(np.stack([a[2], a[1], a[0]], -1) / 10000.0 * gain, 0, 1); return v ** (1 / 2.2)
col = to_srgb(mi); veg = np.clip(ss(0.22, 0.45, nmay) + ss(0.3, 0.5, nj), 0.02, 1)
hard10 = np.asarray(Image.fromarray((hard * 255).astype(np.uint8)).resize((col.shape[1], col.shape[0]), Image.BOX)) / 255.0
bright = ss(0.36, 0.6, col.mean(-1)) * (1 - ss(0.2, 0.4, nmay)); urban = np.clip(np.maximum(hard10 * 1.6, bright), 0, 1)
wv = veg * (1 - urban) + 1e-3
blur = np.stack([ndimage.gaussian_filter(col[..., c] * wv, 2.2) / ndimage.gaussian_filter(wv, 2.2) for c in range(3)], -1)
ground = col * (1 - urban[..., None]) + blur * urban[..., None]
gk = (UK * (1 - np.clip(T4, 0, 1)) * 0.6)[..., None]; ground = ground * (1 - gk) + np.array([0.30, 0.42, 0.20]) * gk
def jpg(a, q=90):
    b = io.BytesIO(); Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(b, "JPEG", quality=q, subsampling=0); return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
def png(a):
    b = io.BytesIO(); Image.fromarray(a).save(b, "PNG", optimize=True); return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()
mid_rgb = to_srgb(may["mid"]); far_rgb = to_srgb(may["far"])
mid_tree = ss(0.36, 0.62, ndvi(jul["mid"]))
if DBG:
    Image.fromarray((ground * 255).astype(np.uint8)).save(DBG + "ground.png"); Image.fromarray((col * 255).astype(np.uint8)).save(DBG + "sat.png")
    Image.fromarray(maskLo).save(DBG + "maskLo.png"); Image.fromarray(np.stack([Mp, Md, Ms], -1)[::2, ::2]).save(DBG + "maskHi_half.png")
    hs = np.clip(0.5 + (np.roll(H, 1, 1) - np.roll(H, -1, 1)) / 6 + (np.roll(H, 1, 0) - np.roll(H, -1, 0)) / 6, 0, 1); Image.fromarray((hs * 255).astype(np.uint8)).save(DBG + "shade.png")

# ---------------------------------------------------------------- pack
def enc16(A, base, q):
    v = np.round((A - base) / q).astype(np.int64); assert v.min() >= 0 and v.max() < 65536, (v.min(), v.max())
    p = v.copy(); p[1:, 1:] = v[1:, 1:] - v[1:, :-1] - v[:-1, 1:] + v[:-1, :-1]; p[0, 1:] = v[0, 1:] - v[0, :-1]; p[1:, 0] = v[1:, 0] - v[:-1, 0]
    return base64.b64encode(gzip.compress(p.astype("<i2").tobytes(), 9)).decode()     # wraps mod 65536, undone on load
blob = bytearray(); index = {}
def put(name, arr, dt):
    global blob
    a = np.asarray(arr).astype(dt); pad = (-len(blob)) % a.dtype.itemsize; blob += b"\0" * pad
    index[name] = [np.dtype(dt).str.strip("<|"), len(blob), int(a.size)]; blob += a.astype(np.dtype(dt).newbyteorder("<")).tobytes()
# roads
r_kind, r_flag, r_w, r_name, r_start, r_xy, r_ys, r_y = [], [], [], [], [0], [], [], []
for q in pieces:
    P = q["P"]; k = q["kind"]
    far = not ((P[:, 0] > X0 - 30) & (P[:, 0] < X1 + 30) & (P[:, 1] > Z0 - 30) & (P[:, 1] < Z1 + 30)).any()
    if far and k in (7, 8, 10, 11, 13, 15): continue
    if q["bridge"] and "R" in q: P = q["R"]
    else:
        # drop points that add nothing
        keep = [0]
        for i in range(1, len(P) - 1):
            a, b, c = P[keep[-1]], P[i], P[i + 1]; d = abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / max(1e-6, math.hypot(c[0] - a[0], c[1] - a[1]))
            if d > (0.12 if not far else 1.0): keep.append(i)
        keep.append(len(P) - 1); P = P[keep]
    Q = np.round(P * 10).astype(np.int64)
    r_xy.append(np.concatenate([Q[:1], Q[1:] - Q[:-1]]).ravel()); r_start.append(r_start[-1] + len(Q))
    r_kind.append(k); r_flag.append((1 if q["oneway"] else 0) | (2 if q["bridge"] else 0) | (4 if q["unpaved"] else 0) | (8 if far else 0) | (16 if q["sub"] == "sidewalk" else 0))
    r_w.append(int(round(q["w"] * 10))); r_name.append(q["name"])
    if q["bridge"] and "R" in q: r_ys.append(len(r_y)); r_y.extend(q["y"].tolist())
    else: r_ys.append(-1)
put("rKind", r_kind, "u1"); put("rFlag", r_flag, "u1"); put("rW", r_w, "u2"); put("rName", r_name, "u2"); put("rStart", r_start, "u4"); put("rXY", np.concatenate(r_xy), "i4")
put("rYs", r_ys, "i4"); put("rY", r_y, "f4")
print("packed roads", len(r_kind), "points", r_start[-1])
# junctions: where three or more real streets meet the paint stops
jx, jz, jr = [], [], []
for c, arms in node_arms.items():
    a = [k for k in arms if k <= 5]
    if len(a) >= 3 and c in node_pos and inb(*node_pos[c], 100): jx.append(node_pos[c][0]); jz.append(node_pos[c][1]); jr.append(max(WID2[k] for k in a))
put("jX", np.round(np.array(jx) * 10), "i4"); put("jZ", np.round(np.array(jz) * 10), "i4"); put("jR", np.round(np.array(jr) * 10), "u1")
put("bStart", b_start, "u4"); put("bXY", np.concatenate(b_xy), "i4"); put("bH", b_h, "u2"); put("bKind", b_kind, "u1")
rb = np.array(ring_b); put("qX", np.round(rb[:, 0]), "i2"); put("qZ", np.round(rb[:, 1]), "i2"); put("qW", np.clip(np.round(rb[:, 2] * 2), 1, 255), "u1"); put("qD", np.clip(np.round(rb[:, 3] * 2), 1, 255), "u1")
put("qA", np.round(rb[:, 4] / math.pi * 255), "u1"); put("qH", np.clip(np.round(rb[:, 5] * 4), 1, 255), "u1")
put("wStart", w_start, "u4"); put("wXY", np.concatenate(w_xy), "i4"); put("wY", w_y, "f4"); put("wKind", w_kind, "u1")
# street furniture and other mapped points
PK = {"traffic_signals": 0, "street_lamp": 1, "power_tower": 2, "fire_hydrant": 3, "bus_stop": 4, "bench": 5, "stop": 6, "gate": 7, "post_box": 8, "waste_basket": 9}
pk, pxs, pzs = [], [], []
for f in infra:
    c = f["properties"].get("class")
    if c in PK and f["geometry"]["type"] == "Point":
        x, z = toXZ(*f["geometry"]["coordinates"][:2])
        if inb(x, z, 20 if c != "power_tower" else RING): pk.append(PK[c]); pxs.append(x); pzs.append(z)
for f in land:
    if f["properties"].get("class") == "tree" and f["geometry"]["type"] == "Point":
        x, z = toXZ(*f["geometry"]["coordinates"][:2])
        if inb(x, z): pk.append(20); pxs.append(x); pzs.append(z)
put("pKind", pk, "u1"); put("pX", np.round(np.array(pxs) * 10), "i4"); put("pZ", np.round(np.array(pzs) * 10), "i4")
# sports grounds, as outlines the game paints
s_start = [0]; s_xy = []; s_kind = []
for f in landuse:
    c = f["properties"].get("class")
    if c in ("pitch", "track") and f["geometry"]["type"] == "Polygon":
        P = xz(f["geometry"]["coordinates"][0]); cx, cz = P[:-1].mean(0)
        if not inb(cx, cz): continue
        area = 0.5 * abs(float(np.sum(P[:-1, 0] * P[1:, 1] - P[1:, 0] * P[:-1, 1]))); n = (nm(f["properties"]) or "").lower()
        e = P[1:] - P[:-1]; per = float(np.hypot(e[:, 0], e[:, 1]).sum())
        k = 3 if c == "track" else (0 if area < 900 and len(P) <= 7 else (1 if area < 1700 and len(P) <= 7 else 2))     # 0 court, 1 small field, 2 field, 3 running track
        Q = np.round(P[:-1] * 10).astype(np.int64); s_xy.append(np.concatenate([Q[:1], Q[1:] - Q[:-1]]).ravel()); s_start.append(s_start[-1] + len(Q)); s_kind.append(k)
put("sStart", s_start, "u4"); put("sXY", np.concatenate(s_xy), "i4"); put("sKind", s_kind, "u1")

# ---------------------------------------------------------------- routes for the time trials (shortest path along the real network)
def nearest_nodes(x, z, kinds, nids=None, n=5, slack=160.0):
    c = []
    for k, arms in graph.items():
        if not any(e[2] in kinds and (not nids or e[4] in nids) for e in arms): continue
        p = node_pos[k]; c.append((math.hypot(p[0] - x, p[1] - z), k))
    c.sort(); return [k for d, k in c[:n] if d <= c[0][0] + slack]
def route(a, b, kinds, prefer=None, nids=()):
    dist = {a: 0.0}; prev = {}; pq = [(0.0, a)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == b: break
        if d > dist.get(u, 1e18): continue
        for v, L, k, Q, nid in graph[u]:
            if k not in kinds: continue
            nd = d + L * (0.12 if nid in nids else 0.6 if prefer and k in prefer else 1.0)
            if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = (u, Q); heapq.heappush(pq, (nd, v))
    if b not in prev: return None
    out = []; u = b
    while u != a: pu, Q = prev[u]; out.append(Q); u = pu
    out.reverse(); P = [out[0][0]]
    for Q in out: P.extend(Q[1:])
    return np.array(P), dist[b]
def ll(lat, lon): x, z = toXZ(lon, lat); return float(x), float(z)
ROADS = set(range(0, 9)); TRAIL = {9, 10, 11, 12, 13} | {5, 6, 7, 8}
TRIALS = json.load(open(__file__.replace("build_data.py", "trials.json")))
trials = []
for t in TRIALS:
    kinds = ROADS if t["net"] == "road" else TRAIL; P = None; nids = {name_ix[n] for n in t.get("names", []) if n in name_ix}
    only = {0} if t.get("motorway") else kinds; pref = {0, 1} if t.get("motorway") else {9, 10, 12} if t["net"] == "trail" else {2, 3, 4}
    cur = None
    for v0, v1 in zip(t["via"][:-1], t["via"][1:]):
        A = [cur] if cur is not None else nearest_nodes(*ll(v0[0], v0[1]), only, nids if len(v0) < 3 else None)
        Bn = nearest_nodes(*ll(v1[0], v1[1]), only, nids if len(v1) < 3 else None); best = None
        for a in A:
            for b in Bn:
                if a == b: continue
                r = route(a, b, kinds, pref, nids)
                if r and (best is None or r[1] < best[1]): best = (r[0], r[1], b)
        if best is None: print("NO ROUTE", t["name"]); P = None; break
        P = best[0] if P is None else np.concatenate([P, best[0][1:]]); cur = best[2]
    if P is None: continue
    R, s = resample(P, 5.0); L = float(s[-1]); ok = ((R[:, 0] > X0 + 80) & (R[:, 0] < X1 - 80) & (R[:, 1] > Z0 + 80) & (R[:, 1] < Z1 - 80)).all()
    y = Hat(R[:, 0], R[:, 1]); print("trial %-28s %5.2f km  climb %4.0f m  in map %s" % (t["name"], L / 1000, float(np.maximum(np.diff(y), 0).sum()), ok))
    trials.append(dict(name=t["name"], net=t["net"], loop=bool(t.get("loop")), blurb=t.get("blurb", ""), veh=t.get("veh", ""), pts=[[round(float(x), 1), round(float(z), 1)] for x, z in R]))

world = dict(
    meta=dict(lon0=LON0, lat0=LAT0, mlon=MLON, mlat=MLAT, x0=X0, z0=Z0, nx=NX, nz=NZ, cell=CELL, hbase=float(math.floor(H.min())) - 1, hq=0.05, low=LW, loh=LH, locell=10.0,
              mc=MC, mr=MR, mn=MN, mbase=float(math.floor(Hmid.min())) - 1, mq=0.25, fc=FC, fr=FR, fn=FN, fbase=float(math.floor(Hfar.min())) - 1, fq=1.0, hiw=int(Mp.shape[1]), hih=int(Mp.shape[0]), ring=RING),
    names=names, index=index, trials=trials)
world["h"] = enc16(H, world["meta"]["hbase"], 0.05); world["hm"] = enc16(Hmid, world["meta"]["mbase"], 0.25); world["hf"] = enc16(Hfar, world["meta"]["fbase"], 1.0)
world["vec"] = base64.b64encode(gzip.compress(bytes(blob), 9)).decode()
world["sat"] = jpg(ground, 90); world["satMid"] = jpg(mid_rgb, 86); world["satFar"] = jpg(far_rgb, 88)
world["maskLo"] = png(maskLo); world["maskHi"] = png(np.stack([Mp, Md, Ms], -1)); world["midTree"] = png((mid_tree * 255).astype(np.uint8))
s = json.dumps(world, separators=(",", ":")); open(OUT, "w").write(s)
print("world.json %.2f MB" % (len(s) / 1e6), {k: round(len(v) / 1e6, 2) for k, v in world.items() if isinstance(v, str)})
