"""Shared map frame for the Lafayette world. X is east, Z is south, in metres from the centre of the reference screenshot."""
import math, numpy as np
BOX = (-122.16137, 37.87166, -122.06175, 37.92662)   # the screenshot: lon west, lat south, lon east, lat north
LON0, LAT0 = (BOX[0] + BOX[2]) / 2, (BOX[1] + BOX[3]) / 2
_p = math.radians(LAT0)
MLAT = 111132.92 - 559.82 * math.cos(2 * _p) + 1.175 * math.cos(4 * _p)
MLON = 111412.84 * math.cos(_p) - 93.5 * math.cos(3 * _p) + 0.118 * math.cos(5 * _p)
CELL = 4.0                                   # playable height grid
X0, X1, Z0, Z1 = -4400.0, 4400.0, -3080.0, 3560.0   # the south edge is pushed out 480 m so the whole Lafayette Reservoir rim trail is inside
NX, NZ = int((X1 - X0) / CELL) + 1, int((Z1 - Z0) / CELL) + 1
MC, MR = 40.0, 16000.0                       # surrounding terrain: 40 m cells out to 16 km
MN = int(2 * MR / MC) + 1
FC, FR = 320.0, 56000.0                      # far backdrop: 320 m cells out to 56 km
FN = int(2 * FR / FC) + 1
def toXZ(lon, lat): return ((np.asarray(lon) - LON0) * MLON, -(np.asarray(lat) - LAT0) * MLAT)
def toLL(x, z): return (LON0 + np.asarray(x) / MLON, LAT0 - np.asarray(z) / MLAT)
def merc(lon, lat, z):
    n = 2 ** z; return (np.asarray(lon) + 180) / 360 * n, (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n
if __name__ == "__main__": print(LON0, LAT0, MLON, MLAT, NX, NZ, MN, FN)
