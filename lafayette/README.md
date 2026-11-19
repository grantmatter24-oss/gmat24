# Lafayette

`../lafayette.html` is a single-file driving game of Lafayette, California at 1:1 scale: about 8.8 km by 6.6 km, from Happy Valley
to I-680 and from the Lafayette Reservoir rim trail north to Geary Road. Five machines (dirt bike, car, 4x4 quad, mountain bike,
electric scooter), three times of day, timed routes, online riders. No traffic and no computer-controlled characters.

- `shell.html`: page, HUD and menu. `src/*.js`: the game, concatenated in name order. `data/world.json`: the baked world.
- `python3 build.py` assembles `../lafayette.html`.

## Controls

`W A S D` or arrows drive (hold brake at a stop to reverse the car or quad). `Space` rear brake or handbrake. `Shift` / `Ctrl` lean
back / forward. `R` reset, `C` rider's-eye view, `M` map (click to go there), `T` time of day, `H` lights, `1`-`5` change machine,
`X` cancel a timed route, `Esc` menu.

## Staying smooth

The game measures its own frame rate and moves between five detail steps (resolution, grass, tree and building distance, shadow
refresh, bloom). Low / Medium / High in the menu only set how high it may climb. `?tier=0..4` with `?test` pins a step.

## World data

`tools/` rebuilds `data/world.json` from public sources (raw downloads go in any scratch folder, passed as `<raw>`):

1. `overture.py <theme> <type> <raw>/<type>.json` for `transportation/segment`, `buildings/building`, `base/water`,
   `base/land_use`, `base/land`, `base/infrastructure`: OpenStreetMap via Overture Maps.
2. `dem.py <raw>`: the playable ground from the USGS 1/9 arc-second (3 m) lidar DEM, Contra Costa County 2008
   (`StagedProducts/Elevation/19/IMG/ned19_n38x00_w122x25_ca_contracostaco_2008.zip` on `prd-tnm`, unzipped to `<raw>/ned/`);
   the surroundings and far backdrop from USGS 3DEP via AWS Terrain Tiles.
3. `s2.py <raw> <yyyymmdd> <tag>`: Sentinel-2 L2A reflectance. `20260513 may` gives the ground colour, `20260714 jul` separates
   tree canopy and watered turf from cured grass.
4. `build_data.py <raw> ../data/world.json`: grades every street into the height grid, rasterises pavement, trails, buildings
   and water at 2 m, classifies vegetation, packs roads, bridges, 16,700 building footprints with their surveyed heights,
   water bodies and street furniture, and routes the timed courses in `trials.json` along the real network.

`geo.py` holds the map frame: the screenshot the map was built from, the grid sizes, and the lon/lat to metres conversion.

Map data © OpenStreetMap contributors (ODbL), via Overture Maps. Elevation: USGS. Imagery: Copernicus Sentinel-2.
