import math, io, requests, numpy as np
from PIL import Image
Z = 14
BB = (-120.300, 39.165, -120.210, 39.215)
def t(lon, lat, z): 
    n = 2 ** z; x = (lon + 180) / 360 * n; y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n; return x, y
x0, y1 = t(BB[0], BB[1], Z); x1, y0 = t(BB[2], BB[3], Z)
tx0, tx1, ty0, ty1 = int(x0), int(x1), int(y0), int(y1)
W = (tx1 - tx0 + 1) * 256; H = (ty1 - ty0 + 1) * 256
arr = np.zeros((H, W), np.float32)
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        r = requests.get(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png", timeout=60); r.raise_for_status()
        im = np.asarray(Image.open(io.BytesIO(r.content)).convert("RGB")).astype(np.float32)
        arr[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
np.save("data/dem_raw.npy", arr); open("data/dem_meta.txt", "w").write(f"{Z} {tx0} {ty0} {W} {H}")
print(arr.shape, arr.min(), arr.max(), tx0, ty0)
