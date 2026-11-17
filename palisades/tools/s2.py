import os, sys, numpy as np, rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds
os.environ["CURL_CA_BUNDLE"] = "/root/.ccr/ca-bundle.crt"; os.environ["GDAL_DISABLE_READDIR_ON_OPEN"] = "EMPTY_DIR"
BB = (-120.300, 39.170, -120.210, 39.214)
scene, bands = sys.argv[1], sys.argv[2].split(",")
base = f"/vsicurl/https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/10/S/GJ/{scene}/"
out = {}
for b in bands:
    with rasterio.open(base + b + ".tif") as ds:
        l, bt, r, t = transform_bounds("EPSG:4326", ds.crs, *BB)
        w = from_bounds(l, bt, r, t, ds.transform).round_offsets().round_lengths()
        a = ds.read(window=w); out[b] = a
        tr = ds.window_transform(w)
        print(b, a.shape, a.dtype, a.mean(), ds.crs, tr.c, tr.f, tr.a, flush=True)
        out["meta"] = np.array([tr.c, tr.f, tr.a, ds.crs.to_epsg()])
np.savez(f"data/s2_{scene.split('/')[-1]}.npz", **out)
