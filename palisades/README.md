# Palisades Tahoe

`../palisades.html` is a single-file ski game of Palisades Tahoe (Olympic Valley and Alpine Meadows) at 1:1 scale.

- `shell.html`: page, HUD and menus. `src/*.js`: the game, concatenated in name order. `data/world.json`: the baked world.
- `python3 build.py` assembles `../palisades.html`.

## Controls that differ from Kicker Run

On snow `W` drives forward (no nose butter) and `Shift` + turn is a hard slash turn. `R` rewinds, `B` takes the skis off to walk, `E` loads a lift (`F` fast-forward, `Enter` skip), `V` first person, `M` map (click to drop in), `1`-`4` weather.

## Rider

`src/05_skier.js` is generated: `python3 tools/extract_kr.py` copies Kicker Run's skier model, outfits and pose code out of `../ski.html`. The ride physics and key map in `src/06_game.js` follow Kicker Run's.

## World data

`tools/` rebuilds `data/world.json` from public sources:

1. `dem.py`: USGS 3DEP elevation from AWS Terrain Tiles (zoom 14).
2. `overture.py <theme> <type> <out.json>`: lifts, towers, runs, buildings, roads from Overture Maps (OpenStreetMap), for `base/infrastructure`, `base/land_use`, `base/land`, `base/water`, `buildings/building`, `transportation/segment`.
3. `s2.py <scene> <bands>`: Sentinel-2 L2A red and near-infrared bands for tree cover.
4. `build_data.py <raw dir> <world.json>`: resamples to a 10 m grid, rasterises grooming, moguls, roads and tree masks, packs lifts and runs.

Map data © OpenStreetMap contributors (ODbL), via Overture Maps. Elevation: USGS. Imagery: Copernicus Sentinel-2.
