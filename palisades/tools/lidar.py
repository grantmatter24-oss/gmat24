"""USGS 3DEP 1 m lidar DEM (CA_SierraNevada_B22) over the resort, saved as a UTM mosaic for build_data.py.
usage: lidar.py <raw dir>"""
import os, sys, numpy as np, rasterio
from rasterio.windows import from_bounds
os.environ["CURL_CA_BUNDLE"] = "/root/.ccr/ca-bundle.crt"; os.environ["GDAL_DISABLE_READDIR_ON_OPEN"] = "EMPTY_DIR"; os.environ["GDAL_HTTP_MAX_RETRY"] = "4"
RAW = sys.argv[1].rstrip("/") + "/"
E0, E1, N0, N1 = 732700, 741500, 4334900, 4344700   # UTM 10N box around the world grid, 1 m cells
W, H = E1 - E0, N1 - N0
out = np.full((H, W), np.nan, np.float32)
for x in (73, 74):
    for y in (434, 435):
        url = f"/vsicurl/https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/CA_SierraNevada_B22/TIFF/USGS_1M_10_x{x}y{y}_CA_SierraNevada_B22.tif"
        with rasterio.open(url) as ds:
            b = ds.bounds; l, r, bt, t = max(E0, b.left), min(E1, b.right), max(N0, b.bottom), min(N1, b.top)
            if l >= r or bt >= t: continue
            w = from_bounds(l, bt, r, t, ds.transform).round_offsets().round_lengths()
            a = ds.read(1, window=w).astype(np.float32); a[a < -1000] = np.nan
            tr = ds.window_transform(w); c0 = int(round(tr.c - E0)); r0 = int(round(N1 - tr.f))
            hh, ww = min(a.shape[0], H - r0), min(a.shape[1], W - c0)
            out[r0:r0 + hh, c0:c0 + ww] = np.where(np.isnan(a[:hh, :ww]), out[r0:r0 + hh, c0:c0 + ww], a[:hh, :ww])
            print(x, y, ds.crs, a.shape, np.nanmin(a), np.nanmax(a), "blocks", ds.block_shapes[0], flush=True)
np.save(RAW + "lidar1m.npy", out); open(RAW + "lidar_meta.txt", "w").write(f"{E0} {N1} 1 26910")
print("coverage", 1 - np.isnan(out).mean())
