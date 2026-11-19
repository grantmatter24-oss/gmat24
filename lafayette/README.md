# Lafayette

`../lafayette.html` is a single-file driving game of Lafayette, California at 1:1 scale: about 8.8 km by 6.6 km, from Happy Valley
to I-680 and from the Lafayette Reservoir rim trail north to Geary Road. Five machines (dirt bike, car, 4x4 quad, mountain bike,
electric scooter), three times of day, timed routes, online riders. No traffic and no computer-controlled characters.

- `shell.html`: page, HUD and menu. `src/*.js`: the game, concatenated in name order. `data/world.json`: the baked world.
- `python3 build.py` assembles `../lafayette.html`.

## Controls

`W A S D` or arrows drive (hold brake at a stop to reverse the car or quad). `Space` rear brake or handbrake. `Shift` / `Ctrl` lean
back / forward. `E` get off and walk (`Shift` runs; `E` again gets back on, or brings the machine to you), `R` reset, `C` rider's-eye view, `M` map (click to go there), `T` time of day, `H` lights, `1`-`5` change machine,
`X` cancel a timed route, `Esc` menu.

## Places

`src/12_places.js`: five mapped businesses can be entered on foot (`E` at the door): the Roundup Saloon (root beer, jukebox,
darts), First Mile Cycle Works (tune-up, respray, ride out on a mountain bike), Safeway (shop and pay), the Lafayette Police
Department (desk, notice board) and the Acalanes High School gym (free throws). The same file parks cars in the bays along
every mapped car-park aisle. Name boards on buildings come from Overture place data, attached to footprints in the bake.

## Buildings

Every footprint, height and use comes from the map; everything else is built by rule, because no photographs are used.

- `src/05a_roofs.js` roofs any plan shape: each wall line climbs inward at the roof pitch and the planes meet in hips, valleys
  and ridges (a straight skeleton, with the splits that L, T and U plans need). A side marked as a gable stays upright instead.
  Which ends are gables is a per-house choice, not a survey. `node tools/checks/roof_test.js .` checks every footprint: the planes must cover the plan
  exactly once; the three footprints in 16,686 that fail get a flat roof.
- `src/05_buildings.js` builds walls bay by bay. `planFronts()` runs before the ground is drawn: it picks the wall of each house
  that faces the street, and paves a drive from the garage door to the road and the ground in front of every shopfront (written
  into the ground mask, so grass, tyres and sound all agree). Houses get a garage, front door, step, porch, chimney stack,
  fascia boards, soffits and, on some south-facing planes, solar panels. Shops get glazed fronts with doors, awnings, flat
  canopies or covered walks, pilasters, parapets and roof plant. Blocks of flats get balconies.
- Walls are boards, render or brick (three rows of one texture atlas, chosen per building; brick carries its own colour).
  Flat roofs read as a seamed membrane, pitched roofs as shingles. Parking structures show open decks.
- Around shops the bake paves what the satellite sees as bare ground on commercial land (car parks and forecourts), and places
  whose names say they serve food put tables and umbrellas out front. Houses get shrubs under the front windows and a path from
  the front door to the street.
- A few places are dressed for what they are, from their mapped names: the saloon has a western false front and boardwalk, the
  cinema a marquee and blade sign, supermarkets a tall entrance bay, filling stations a pump canopy.
- The bake (`tools/build_data.py`) levels a pad under every building at the height of the street it fronts and cuts or fills the
  slope around it, so doors meet the pavement. Roofs are tinted from the Sentinel-2 image.

Measured roof shapes would need the county's lidar point cloud (USGS, Contra Costa 2007). Its download server answers
automated requests with HTTP 429, so roof types remain a per-building choice.

## Trees

`src/06_veg.js`: broadleaf crowns are several rounded masses of leaf cards on visible limbs, each shaded as its own ball and
darker toward the heart of the crown; looking toward the sun, light comes through the leaves. Far trees use a lower alpha
cut-off so crowns stay full. Some street trees turn gold or plum.

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
