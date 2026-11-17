#!/usr/bin/env python3
"""Assembles ../palisades.html from shell.html, src/*.js and data/world.json."""
import glob, os
here = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(here, "shell.html")).read()
code = "\n".join(open(f).read() for f in sorted(glob.glob(os.path.join(here, "src", "*.js"))))
world = open(os.path.join(here, "data", "world.json")).read()
assert "</script" not in code and "</script" not in world
out = shell.replace("/*CODE*/", code).replace("/*WORLD*/", world)
open(os.path.join(here, "..", "palisades.html"), "w").write(out)
print("palisades.html", round(len(out) / 1e6, 2), "MB")
