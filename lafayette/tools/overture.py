"""Overture Maps features inside the Lafayette box, as GeoJSON.  usage: overture.py <theme> <type> <out.json>"""
import sys, re, json, requests, fsspec, pyarrow.parquet as pq, pyarrow.compute as pc
from shapely import wkb
from shapely.geometry import mapping
BB = (-122.215, 37.845, -122.020, 37.955)  # xmin ymin xmax ymax: the playable map plus a margin
REL = "release/2026-11-18.0"
def keys(theme, typ):
    x = requests.get(f"https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix={REL}/theme={theme}/type={typ}/", timeout=60).text
    return re.findall(r'<Key>([^<]*)</Key>', x)
def grab(theme, typ, out):
    fs = fsspec.filesystem("https", client_kwargs={"trust_env": True})
    feats = []
    for k in keys(theme, typ):
        url = f"https://overturemaps-us-west-2.s3.amazonaws.com/{k}"
        f = fs.open(url, block_size=4 * 1024 * 1024, cache_type="readahead")
        pf = pq.ParquetFile(f); md = pf.metadata
        names = [md.schema.column(i).path for i in range(md.num_columns)]
        ix = {n: names.index(n) for n in ("bbox.xmin", "bbox.xmax", "bbox.ymin", "bbox.ymax")}
        hit = []
        for g in range(md.num_row_groups):
            rg = md.row_group(g); st = {n: rg.column(i).statistics for n, i in ix.items()}
            if any(s is None or not s.has_min_max for s in st.values()): hit.append(g); continue
            if st["bbox.xmin"].min > BB[2] or st["bbox.xmax"].max < BB[0] or st["bbox.ymin"].min > BB[3] or st["bbox.ymax"].max < BB[1]: continue
            hit.append(g)
        if hit: print(k.split("/")[-1][:12], md.num_row_groups, "rg hit", hit, file=sys.stderr, flush=True)
        for g in hit:
            t = pf.read_row_group(g); b = t["bbox"].combine_chunks()
            m = pc.and_(pc.and_(pc.less_equal(pc.struct_field(b, "xmin"), BB[2]), pc.greater_equal(pc.struct_field(b, "xmax"), BB[0])), pc.and_(pc.less_equal(pc.struct_field(b, "ymin"), BB[3]), pc.greater_equal(pc.struct_field(b, "ymax"), BB[1])))
            t = t.filter(m)
            for r in t.to_pylist():
                geom = wkb.loads(r.pop("geometry")); r.pop("bbox", None); r.pop("sources", None)
                feats.append({"type": "Feature", "geometry": mapping(geom), "properties": {k2: v for k2, v in r.items() if v is not None}})
        if hit: print(len(feats), "features so far", file=sys.stderr, flush=True)
    json.dump({"type": "FeatureCollection", "features": feats}, open(out, "w"), default=str)
grab(sys.argv[1], sys.argv[2], sys.argv[3])
