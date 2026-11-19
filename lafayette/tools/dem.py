"""Elevation. Playable area: USGS 1/9 arc-second (3 m) lidar DEM, Contra Costa County 2008. Surroundings and far backdrop:
USGS 3DEP via AWS Terrain Tiles.  usage: dem.py <raw dir>   (expects <raw>/ned/*.img, unzipped from
StagedProducts/Elevation/19/IMG/ned19_n38x00_w122x25_ca_contracostaco_2008.zip on prd-tnm)"""
import sys, io, glob, numpy as np, requests, rasterio
from PIL import Image
from scipy import ndimage
from concurrent.futures import ThreadPoolExecutor
from geo import *
RAW = sys.argv[1].rstrip("/") + "/"
ds = rasterio.open(glob.glob(RAW + "ned/*.img")[0]); print(ds.crs, ds.res, ds.bounds, ds.nodata)
a = ds.read(1).astype(np.float32); T = ds.transform
def sample(xs, zs, order=3):
    lon, lat = toLL(xs, zs); col = (lon - T.c) / T.a - 0.5; row = (lat - T.f) / T.e - 0.5
    return ndimage.map_coordinates(a, [row, col], order=order, mode="nearest")
gx, gz = np.meshgrid(X0 + np.arange(NX) * CELL, Z0 + np.arange(NZ) * CELL)
H = sample(gx, gz).astype(np.float32); print("inner", H.shape, H.min(), H.max(), "nodata cells", int((H < -100).sum()))
np.save(RAW + "h_inner.npy", H)
# a wider 8 m copy of the lidar for the ground just outside the map, where it reaches
wx, wz = np.meshgrid(np.arange(-12000, 9601, 8.0), np.arange(-9600, 9601, 8.0)); np.save(RAW + "h_wide8.npy", sample(wx, wz, 1).astype(np.float32))
def tiles(zoom, half, cell, n, name):
    g = -half + np.arange(n) * cell; ox, oz = np.meshgrid(g, g); lon, lat = toLL(ox, oz); mx, my = merc(lon, lat, zoom)
    tx0, tx1, ty0, ty1 = int(mx.min()), int(mx.max()), int(my.min()), int(my.max())
    arr = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), np.float32)
    def get(t):
        tx, ty = t
        for k in range(4):
            try:
                r = requests.get(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zoom}/{tx}/{ty}.png", timeout=60); r.raise_for_status(); break
            except Exception as e:
                if k == 3: raise
        im = np.asarray(Image.open(io.BytesIO(r.content)).convert("RGB")).astype(np.float32)
        arr[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
    with ThreadPoolExecutor(16) as ex: list(ex.map(get, [(tx, ty) for tx in range(tx0, tx1 + 1) for ty in range(ty0, ty1 + 1)]))
    out = ndimage.map_coordinates(arr, [(my - ty0) * 256 - 0.5, (mx - tx0) * 256 - 0.5], order=1, mode="nearest").astype(np.float32)
    print(name, out.shape, out.min(), out.max()); np.save(RAW + name + ".npy", out)
tiles(13, MR, MC, MN, "h_mid")
tiles(10, FR, FC, FN, "h_far")
