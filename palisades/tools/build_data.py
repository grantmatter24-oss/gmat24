"""Builds the Palisades Tahoe world dataset: heightmap, masks, lifts, runs, buildings.
Sources: AWS Terrain Tiles (USGS 3DEP), Overture Maps (OpenStreetMap), Sentinel-2 L2A."""
import json, math, gzip, base64, io, numpy as np, requests
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from shapely.geometry import shape, LineString, Polygon, Point
from rasterio.warp import transform as rio_transform

import sys
RAW = sys.argv[1].rstrip("/") + "/"  # folder with the raw downloads (dem.py, overture.py, s2.py)
OUT = sys.argv[2]
LON0, LAT0 = -120.255, 39.192
MLAT, MLON = 111019.1, 86403.0
CELL = 5.0; HQ = 0.08   # metres per height step: 8 cm keeps the file small and is far below what the snow surface shows
X0, X1, Z0, Z1 = -3750.0, 3750.0, -2250.0, 6000.0  # Olympic Valley and Alpine Meadows;  # multiples of the 250 m backdrop grid so the two meshes share an edge
NX = int((X1 - X0) / CELL) + 1; NZ = int((Z1 - Z0) / CELL) + 1
def toXZ(lon, lat): return ((lon - LON0) * MLON, -(lat - LAT0) * MLAT)
def toLL(x, z): return (LON0 + x / MLON, LAT0 - z / MLAT)
print("grid", NX, NZ, X0, Z0, X1, Z1)

# ---------- elevation ----------
def merc(lon, lat, z):
    n = 2 ** z; return (lon + 180) / 360 * n, (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n
dem = np.load(RAW + "dem_raw.npy"); Zm, tx0, ty0, _, _ = [int(v) for v in open(RAW + "dem_meta.txt").read().split()]
def sample_dem(arr, z, tx0, ty0, xs, zs):
    lon, lat = toLL(xs, zs); mx, my = merc(lon, lat, z)
    px = (mx - tx0) * 256 - 0.5; py = (my - ty0) * 256 - 0.5
    return ndimage.map_coordinates(arr, [py, px], order=3, mode="nearest")
gx, gz = np.meshgrid(X0 + np.arange(NX) * CELL, Z0 + np.arange(NZ) * CELL)
Hm = sample_dem(dem, Zm, tx0, ty0, gx, gz).astype(np.float32)
# 1 m lidar (tools/lidar.py): the height grid is point-sampled from it so cliffs keep their full height, and the cliff map is
# wherever the 1 m surface is steeper than about 56 degrees
lid = np.load(RAW + "lidar1m.npy"); LE0, LN1 = [float(v) for v in open(RAW + "lidar_meta.txt").read().split()[:2]]
from rasterio.warp import transform as _tf
_lon, _lat = toLL(gx, gz); _e, _n = _tf("EPSG:4326", "EPSG:26910", _lon.ravel(), _lat.ravel())
lcol = np.array(_e).reshape(gx.shape) - LE0 - 0.5; lrow = LN1 - np.array(_n).reshape(gx.shape) - 0.5
Hl = ndimage.map_coordinates(lid, [lrow, lcol], order=1, mode="nearest").astype(np.float32)
print("lidar vs 10 m survey: mean diff %.2f m, rms %.2f m" % (float(np.mean(Hl - Hm)), float(np.sqrt(np.mean((Hl - Hm) ** 2)))))
steep = np.zeros(lid.shape, np.float32); dx = np.abs(np.diff(lid, axis=1)) > 1.5; dy = np.abs(np.diff(lid, axis=0)) > 1.5
steep[:, 1:] += dx; steep[:, :-1] += dx; steep[1:, :] += dy; steep[:-1, :] += dy; del dx, dy
steep = ndimage.uniform_filter((steep > 0).astype(np.float32), 5)
cliffRaw = ndimage.map_coordinates(steep, [lrow, lcol], order=1, mode="nearest"); del steep
# Snow buries the small stuff (boulders, brush, ruts), so everywhere except the cliffs the surface is the lidar smoothed over about
# 15 m. The cliffs keep the raw point samples so they stay sharp and full height.
Hs = ndimage.map_coordinates(ndimage.gaussian_filter(lid, 6.0), [lrow, lcol], order=1, mode="nearest").astype(np.float32); del lid
_cw = np.clip(ndimage.gaussian_filter(np.clip((cliffRaw - 0.06) / 0.3, 0, 1), 1.2) * 1.6, 0, 1)
Hm = (Hs * (1 - _cw) + Hl * _cw).astype(np.float32); del Hs
print("height", Hm.min(), Hm.max())
def Hat(x, z):
    i = np.clip((np.asarray(x) - X0) / CELL, 0, NX - 1); j = np.clip((np.asarray(z) - Z0) / CELL, 0, NZ - 1)
    return ndimage.map_coordinates(Hm, [np.atleast_1d(j), np.atleast_1d(i)], order=1)

# outer backdrop terrain (z11, 250 m grid, 60 km square)
OC, ON = 250.0, 241
ox0 = -OC * (ON - 1) / 2; oz0 = -OC * (ON - 1) / 2
ogx, ogz = np.meshgrid(ox0 + np.arange(ON) * OC, oz0 + np.arange(ON) * OC)
olon, olat = toLL(ogx, ogz); zO = 11
mx, my = merc(olon, olat, zO); otx0, otx1, oty0, oty1 = int(mx.min()), int(mx.max()), int(my.min()), int(my.max())
try: oarr = np.load(RAW + "outer_raw.npy")
except Exception:
    oarr = np.zeros(((oty1 - oty0 + 1) * 256, (otx1 - otx0 + 1) * 256), np.float32)
    for tx in range(otx0, otx1 + 1):
        for ty in range(oty0, oty1 + 1):
            r = requests.get(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zO}/{tx}/{ty}.png", timeout=60); r.raise_for_status()
            im = np.asarray(Image.open(io.BytesIO(r.content)).convert("RGB")).astype(np.float32)
            oarr[(ty - oty0) * 256:(ty - oty0 + 1) * 256, (tx - otx0) * 256:(tx - otx0 + 1) * 256] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
    np.save(RAW + "outer_raw.npy", oarr)
Ho = sample_dem(oarr, zO, otx0, oty0, ogx, ogz).astype(np.float32)
print("outer", Ho.min(), Ho.max())

# ---------- vector data ----------
def load(n): return json.load(open(RAW + f"{n}.json"))["features"]
def nm(p): return (p.get("names") or {}).get("primary")
def xz_line(co): return [toXZ(c[0], c[1]) for c in co]
def inb(x, z, m=0): return X0 - m <= x <= X1 + m and Z0 - m <= z <= Z1 + m
def rnd(pts, k=1): return [[round(x, k), round(z, k)] for x, z in pts]

SPEED = {"chair_fixed": 2.3, "chair_det": 5.0, "gondola": 6.0, "funitel": 6.0, "tram": 10.0, "carpet": 0.8}
lifts = []
for f in load("infra"):
    p = f["properties"]
    if p.get("subtype") != "aerialway" or f["geometry"]["type"] != "LineString": continue
    name = nm(p); tags = dict(p.get("source_tags") or []); cls = p["class"]
    pts = xz_line(f["geometry"]["coordinates"])
    if not name or not all(inb(x, z, -150) for x, z in pts): continue
    hs = Hat([q[0] for q in pts], [q[1] for q in pts])
    if name == "Base to Base":  # village to Alpine, over the KT-22 shoulder
        if pts[0][1] > pts[-1][1]: pts = pts[::-1]; hs = hs[::-1]
    elif hs[0] > hs[-1]: pts = pts[::-1]; hs = hs[::-1]
    occ = int(tags.get("aerialway:occupancy", 0) or 0); cap = int(tags.get("aerialway:capacity", 0) or 0)
    if cls == "chair_lift": typ = "chair_det" if ("Express" in name or name == "Wa She Shu" or any(k in name for k in ("Summit", "Roundhouse", "Treeline"))) else "chair_fixed"
    elif cls == "gondola": typ = "funitel" if "Funitel" in name else "gondola"
    elif cls == "cable_car": typ = "tram"
    else: typ = "carpet"
    if typ == "funitel": occ, cap = 28, 4000
    if typ == "gondola": occ, cap = 8, 1400
    if typ == "tram": occ, cap = 110, 1100
    if not occ: occ = 4
    if not cap: cap = {"chair_det": 2400, "chair_fixed": 1200, "carpet": 1200}.get(typ, 1200)
    L = LineString(pts).length
    lifts.append({"n": name, "t": typ, "occ": occ, "cap": cap, "v": SPEED[typ], "len": round(L), "vert": round(float(hs[-1] - hs[0])), "pts": rnd(pts)})
lifts.sort(key=lambda l: -l["len"])
for l in lifts: print("lift", l["n"], l["t"], l["occ"], l["len"], l["vert"], len(l["pts"]))

DIFF = {"novice": 0, "easy": 0, "intermediate": 1, "advanced": 2, "expert": 3, "extreme": 3, "freeride": 3}
runs, areas = [], []
for f in load("land_use"):
    p = f["properties"]
    if p.get("subtype") != "winter_sports" or p.get("class") != "downhill": continue
    tags = dict(p.get("source_tags") or []); name = nm(p) or tags.get("piste:name") or ""
    d = DIFF.get(tags.get("piste:difficulty"), 1); gr = tags.get("piste:grooming")
    g = shape(f["geometry"])
    if g.geom_type == "Polygon":
        c = g.centroid; x, z = toXZ(c.x, c.y)
        if inb(x, z) and name: areas.append({"n": name, "d": d, "c": [round(x), round(z)], "p": rnd(xz_line(list(g.exterior.simplify(0.0002).coords)), 0)})
        continue
    pts = xz_line(list(g.coords)); ls = LineString(pts).simplify(2.5); pts = list(ls.coords)
    if not any(inb(x, z) for x, z in pts): continue
    hs = Hat([q[0] for q in pts], [q[1] for q in pts])
    if hs[0] < hs[-1]: pts = pts[::-1]
    hs3 = Hat([q[0] for q in pts], [q[1] for q in pts]); grade = abs(float(hs3[0] - hs3[-1])) / max(ls.length, 1)
    groomed = 1 if (gr == "classic" or (gr is None and (d <= 1 or (d == 2 and grade < 0.36)))) else 0   # ridge and road-cut blacks such as Red Dog Ridge are groomed too
    mog = 1 if (gr == "mogul" or (gr is None and d == 2)) else 0
    hs2 = Hat([q[0] for q in pts], [q[1] for q in pts]); cat = 1 if (groomed and d <= 1 and ls.length > 250 and abs(float(hs2[0] - hs2[-1])) / ls.length < 0.115) else 0
    runs.append({"n": name, "d": d, "g": groomed, "m": mog, "c": cat, "len": round(ls.length), "pts": rnd(pts)})
print("runs", len(runs), "areas", len(areas))

peaks = [{"n": "Granite Chief", "ft": 9006, "ll": (-120.2870419, 39.1982695)}, {"n": "Washeshu Peak", "ft": 8885, "ll": (-120.26964, 39.1807396)}, {"n": "KT-22", "ft": 8070, "ll": (-120.2416764, 39.1829177)},
         {"n": "Emigrant Peak", "ft": 8774, "ll": (-120.2775, 39.1925)}, {"n": "Snow King", "ft": 7550, "ll": (-120.2268, 39.1880)}, {"n": "Broken Arrow", "ft": 8020, "ll": (-120.2555, 39.1925)}, {"n": "Poulsen Peak", "ft": 7651, "ll": (-120.2361744, 39.209604)}]
have = {pk["n"] for pk in peaks}
for f in load("land"):
    p = f["properties"]
    if p.get("subtype") == "physical" and p.get("class") == "peak" and f["geometry"]["type"] == "Point" and nm(p) and nm(p) not in have:
        lon, lat = f["geometry"]["coordinates"][:2]; x, z = toXZ(lon, lat)
        if inb(x, z, -200): peaks.append({"n": nm(p), "ft": int(round(float(Hat([x], [z])[0]) * 3.28084)), "ll": (lon, lat)}); have.add(nm(p))
for pk in peaks: x, z = toXZ(*pk.pop("ll")); pk["p"] = [round(x), round(z)]
peaks = [pk for pk in peaks if inb(pk["p"][0], pk["p"][1])]

# ---------- masks at 5 m ----------
MC = CELL; MW = NX; MH = NZ
def mpx(pts): return [((x - X0) / MC, (z - Z0) / MC) for x, z in pts]
groom = Image.new("L", (MW, MH), 0); mogul = Image.new("L", (MW, MH), 0); clear = Image.new("L", (MW, MH), 0); road = Image.new("L", (MW, MH), 0)
dcos = Image.new("L", (MW, MH), 128); dsin = Image.new("L", (MW, MH), 128)
WID = {0: 46, 1: 42, 2: 30, 3: 18}
def thick(img, pts, w, fill):
    d = ImageDraw.Draw(img); q = mpx(pts); wp = max(1, int(round(w / MC)))
    d.line(q, fill=fill, width=wp)
    for x, y in q: d.ellipse([x - wp / 2, y - wp / 2, x + wp / 2, y + wp / 2], fill=fill)
order = sorted(runs, key=lambda r: (r["g"], -r["d"]))
for r in order:
    w = 11 if r["c"] else WID[r["d"]]
    if r["g"]: thick(groom, r["pts"], w, 255)
    thick(clear, r["pts"], w * (1.0 if r["d"] <= 1 else 0.6) + 6, 255)
    for a, b in zip(r["pts"][:-1], r["pts"][1:]):  # direction field (double-angle so it can be blended)
        th = math.atan2(b[1] - a[1], b[0] - a[0]); c2, s2 = math.cos(2 * th), math.sin(2 * th)
        thick(dcos, [a, b], w + 30, int(round(128 + 127 * c2))); thick(dsin, [a, b], w + 30, int(round(128 + 127 * s2)))
for l in lifts:
    thick(clear, l["pts"], 16 if l["t"] != "carpet" else 10, 255)
    if l["t"] == "carpet": thick(groom, l["pts"], 30, 255)
# roads, parking, buildings
ROADC = {"tertiary": 9, "residential": 7, "unclassified": 7, "service": 5, "pedestrian": 6}
ALPINE_BASE = toXZ(-120.2386, 39.1644)
def plowed(pts, cls):
    hs = Hat([q[0] for q in pts], [q[1] for q in pts]); mx, mz = np.mean([q[0] for q in pts]), np.mean([q[1] for q in pts])
    if hs.max() < 1935: return True                      # Olympic Valley floor
    if cls in ("tertiary", "residential", "unclassified") and mz > 2300 and hs.max() < 2140: return True   # Alpine Meadows Road and its neighbourhoods
    return math.hypot(mx - ALPINE_BASE[0], mz - ALPINE_BASE[1]) < 420 and hs.max() < 2115   # Alpine base area
parks = []
for f in load("seg"):
    p = f["properties"]
    if p.get("subtype") != "road" or p.get("class") not in ROADC: continue
    pts = xz_line(f["geometry"]["coordinates"])
    if not plowed(pts, p["class"]): continue
    thick(road, pts, ROADC[p["class"]], 255); thick(clear, pts, ROADC[p["class"]] + 6, 255)
for f in load("infra"):
    p = f["properties"]
    if p.get("class") == "parking" and f["geometry"]["type"] == "Polygon":
        pts = xz_line(f["geometry"]["coordinates"][0])
        if not plowed(pts, "service") or not inb(pts[0][0], pts[0][1], -60): continue
        ImageDraw.Draw(road).polygon(mpx(pts), fill=255); ImageDraw.Draw(clear).polygon(mpx(pts), fill=255)
        pg = Polygon(pts).simplify(1.5)
        if pg.geom_type == "Polygon" and pg.area > 300: parks.append(rnd(list(pg.exterior.coords)[:-1], 0))
blds = []
for f in load("bld"):
    p = f["properties"]; g = shape(f["geometry"])
    if g.geom_type != "Polygon": g = max(g.geoms, key=lambda q: q.area) if hasattr(g, "geoms") else None
    if g is None: continue
    pts = xz_line(list(g.exterior.coords)); pg = Polygon(pts).simplify(0.8)
    if pg.is_empty or pg.geom_type != "Polygon" or pg.area < 30: continue
    if not inb(pg.centroid.x, pg.centroid.y, -20): continue
    pts = list(pg.exterior.coords)[:-1]
    if Polygon(pts).exterior.is_ccw: pts = pts[::-1]
    h = p.get("height") or (p.get("num_floors") or 0) * 3.2 or (4.5 if pg.area < 150 else 7 if pg.area < 600 else 12 if pg.area < 2500 else 17)
    b = {"p": rnd(pts), "h": round(float(h), 1)}
    if nm(p): b["n"] = nm(p)
    blds.append(b); ImageDraw.Draw(clear).polygon(mpx(list(Polygon(pts).buffer(5).exterior.coords)), fill=255)
print("buildings", len(blds))

# trees from Sentinel-2 (September, snow-free): dense conifer = high NDVI and dark in red / NIR
s2 = np.load(RAW + "s2_S2A_10SGJ_20240910_0_L2A.npz"); ux0, uy0, upx, epsg = s2["meta"]
mgx, mgz = np.meshgrid(X0 + np.arange(MW) * MC, Z0 + np.arange(MH) * MC)
lon, lat = toLL(mgx, mgz); ux, uy = rio_transform("EPSG:4326", f"EPSG:{int(epsg)}", lon.ravel(), lat.ravel())
ux = (np.array(ux).reshape(lon.shape) - ux0) / upx - 0.5; uy = (uy0 - np.array(uy).reshape(lon.shape)) / upx - 0.5
def s2s(b): return ndimage.map_coordinates(s2[b][0].astype(np.float32), [uy, ux], order=1, mode="nearest")
red, nir = s2s("B04"), s2s("B08")
ndvi = (nir - red) / (nir + red + 1)
ss = lambda v, a, b: np.clip((v - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((v - a) / (b - a), 0, 1))
tree = ss(ndvi, 0.33, 0.66) * (1 - ss(red, 450, 850)) * (1 - ss(nir, 2700, 3700))
# golf course / meadow polygons are not trees
nt = Image.new("L", (MW, MH), 0)
for f in load("land_use"):
    p = f["properties"]
    if p.get("subtype") in ("golf", "agriculture", "recreation") and f["geometry"]["type"] == "Polygon" and p.get("class") not in ("resort",):
        ImageDraw.Draw(nt).polygon(mpx(xz_line(f["geometry"]["coordinates"][0])), fill=255)
for f in load("land"):
    p = f["properties"]
    if p.get("subtype") in ("grass", "wetland") and f["geometry"]["type"] == "Polygon":
        ImageDraw.Draw(nt).polygon(mpx(xz_line(f["geometry"]["coordinates"][0])), fill=255)
blur = lambda im, r: np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255
tree *= 1 - blur(nt, 1.5); clearA = blur(clear, 1.2); tree *= 1 - np.clip(clearA * 1.3, 0, 1)
# very steep ground holds no trees
hx = ndimage.zoom(Hm, 2, order=1)[:MH, :MW] if False else ndimage.map_coordinates(Hm, [np.clip((mgz - Z0) / CELL, 0, NZ - 1), np.clip((mgx - X0) / CELL, 0, NX - 1)], order=1)
gy_, gx_ = np.gradient(hx, MC); slope = np.degrees(np.arctan(np.hypot(gx_, gy_)))
tree *= 1 - ss(slope, 38, 48)
groomA = blur(groom, 1.6); groomA *= 1 - ss(slope, 27, 34)  # cats do not groom the steeps
mogA = blur(mogul, 2.5) * (1 - groomA) * ss(slope, 14, 20) * (1 - ss(slope, 36, 42)) * (1 - np.clip(tree * 2, 0, 1))
roadA = blur(road, 0.6)
print("tree cover %.3f groom %.3f mogul %.3f road %.4f" % (tree.mean(), groomA.mean(), mogA.mean(), roadA.mean()))
u8 = lambda a: np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
cliffA = ss(cliffRaw, 0.10, 0.42) * (1 - groomA) * (1 - np.clip(roadA * 2, 0, 1)); tree *= 1 - cliffA
print('cliff cover %.4f' % cliffA.mean())
mA = np.stack([u8(groomA), (u8(tree) // 8) * 8, u8(roadA)], -1); mC = np.stack([u8(cliffA)] * 3, -1)
mB = np.stack([u8(np.clip(clearA * 1.3, 0, 1)), np.asarray(dcos.filter(ImageFilter.GaussianBlur(2.5))), np.asarray(dsin.filter(ImageFilter.GaussianBlur(2.5)))], -1)
def png(a):
    b = io.BytesIO(); Image.fromarray(a).save(b, "PNG", optimize=True); return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()

def pack16(a, base, q):
    v = np.round((a - base) / q).astype(np.int32); assert v.min() >= 0 and v.max() < 65536
    d = v.copy(); d[:, 1:] = v[:, 1:] - v[:, :-1]; d[1:, 0] = v[1:, 0] - v[:-1, 0]
    return base64.b64encode(gzip.compress(d.astype("<i2").tobytes(), 9)).decode()
out = {"meta": {"lon0": LON0, "lat0": LAT0, "mlon": MLON, "mlat": MLAT, "x0": X0, "z0": Z0, "nx": NX, "nz": NZ, "cell": CELL, "hbase": 1800, "hq": HQ, "mw": MW, "mh": MH, "mcell": MC,
                 "ox0": ox0, "oz0": oz0, "on": ON, "ocell": OC, "obase": 600, "oq": 0.05},
       "h": pack16(Hm, 1800, HQ), "ho": pack16(Ho, 600, 0.05), "maskA": png(mA), "maskB": png(mB), "maskC": png(mC),
       "lifts": lifts, "runs": runs, "areas": areas, "peaks": peaks, "blds": blds, "parks": parks}
js = json.dumps(out, separators=(",", ":")); open(OUT, "w").write(js)
print("world.json", len(js) / 1e6, "MB;", {k: round(len(json.dumps(v)) / 1e3) for k, v in out.items()})
