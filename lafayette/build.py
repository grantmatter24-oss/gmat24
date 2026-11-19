#!/usr/bin/env python3
"""Assembles ../lafayette.html from shell.html, src/*.js and data/world.json."""
import glob, os, sys
here = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(here, "shell.html")).read()
code = "\n".join(open(f).read() for f in sorted(glob.glob(os.path.join(here, "src", "*.js"))))
world = open(os.path.join(here, "data", "world.json")).read()
assert "</script" not in code and "</script" not in world
out = shell.replace("/*CODE*/", code).replace("/*WORLD*/", world)
open(os.path.join(here, "..", "lafayette.html"), "w").write(out)
print("lafayette.html", round(len(out) / 1e6, 2), "MB")
if len(sys.argv) > 1:  # content-only variant for hosts that supply their own document skeleton
    head = out[out.index("<title>"):out.index("</head>")]; body = out[out.index("<body>") + 6:out.index("</body>")]
    head = head.replace("<title>Lafayette</title>", "<title>Lafayette Free Ride</title>").replace(":root {", ":root { color-scheme: dark;", 1)
    open(sys.argv[1], "w").write(head + body); print(sys.argv[1], "written")
