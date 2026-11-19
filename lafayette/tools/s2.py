"""Sentinel-2 L2A surface reflectance resampled onto the world grids.  usage: s2.py <raw dir> <date yyyymmdd> <tag>
Writes <raw>/s2_<tag>.npz with inner (10 m: B02 B03 B04 B08), mid (40 m) and far (320 m) arrays."""
import os, sys, re, numpy as np, requests, rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from rasterio.warp import transform as tf
from scipy import ndimage
from geo import *
os.environ["CURL_CA_BUNDLE"] = "/root/.ccr/ca-bundle.crt"; os.environ["GDAL_DISABLE_READDIR_ON_OPEN"] = "EMPTY_DIR"; os.environ["GDAL_HTTP_MAX_RETRY"] = "4"
RAW, DATE, TAG = sys.argv[1].rstrip("/") + "/", sys.argv[2], sys.argv[3]
B = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/"
def scene(tile):
    p = f"sentinel-s2-l2a-cogs/10/S/{tile[0]}{tile[1]}/{DATE[:4]}/{int(DATE[4:6])}/"
    x = requests.get(B + "?list-type=2&prefix=" + p + "&delimiter=/", timeout=60).text
    m = [s for s in re.findall(r"<Prefix>([^<]+)/</Prefix>", x) if DATE in s]
    return m[0] if m else None
def grid(half_x, half_z, cell, bands, tiles, x0=None, z0=None):
    xs = np.arange(-half_x if x0 is None else x0, half_x + 0.1, cell); zs = np.arange(-half_z if z0 is None else z0, half_z + 0.1, cell)
    gx, gz = np.meshgrid(xs, zs); lon, lat = toLL(gx, gz); e, n = tf("EPSG:4326", "EPSG:32610", lon.ravel(), lat.ravel())
    e = np.array(e).reshape(gx.shape); n = np.array(n).reshape(gx.shape); out = np.zeros((len(bands),) + gx.shape, np.float32); got = np.zeros(gx.shape, bool)
    res = max(10.0, cell / 2)
    for t in tiles:
        sc = scene(t)
        if not sc: print("no scene for", t); continue
        for bi, b in enumerate(bands):
            with rasterio.open("/vsicurl/" + B + sc + "/" + b + ".tif") as ds:
                bb = ds.bounds; l, r, bt, tp = max(bb.left, e.min() - 100), min(bb.right, e.max() + 100), max(bb.bottom, n.min() - 100), min(bb.top, n.max() + 100)
                if l >= r or bt >= tp: break
                w = from_bounds(l, bt, r, tp, ds.transform).round_offsets().round_lengths()
                hh, ww = max(1, int(round(w.height * ds.res[0] / res))), max(1, int(round(w.width * ds.res[0] / res)))
                a = ds.read(1, window=w, out_shape=(hh, ww), resampling=Resampling.average).astype(np.float32); tr = ds.window_transform(w)
                px = (e - tr.c) / (tr.a * w.width / ww) - 0.5; py = (tr.f - n) / (-tr.e * w.height / hh) - 0.5
                v = ndimage.map_coordinates(a, [py, px], order=1, mode="nearest"); ok = (px >= -0.5) & (px <= ww - 0.5) & (py >= -0.5) & (py <= hh - 0.5) & (v > 0)
                m = ok & ~got if bi == 0 else m_keep
                if bi == 0: m_keep = m
                out[bi][m] = v[m]
        if 'm_keep' in dir(): got |= m_keep
        print(t, sc, "filled", round(float(got.mean()), 3), flush=True)
    return out
inner = grid(X1, Z1, 10.0, ["B02", "B03", "B04", "B08"], ["EH", "EG"], X0, Z0)
mid = grid(MR, MR, 40.0, ["B02", "B03", "B04", "B08"], ["EH", "EG"])
far = grid(FR, FR, 320.0, ["B02", "B03", "B04"], ["EH", "FH", "EG", "FG"])
np.savez_compressed(RAW + f"s2_{TAG}.npz", inner=inner, mid=mid, far=far); print(inner.shape, mid.shape, far.shape, inner.mean(axis=(1, 2)))
