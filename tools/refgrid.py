# Dev aid: crop a region of the reference in portrait-grid units (x,y,w,h) and overlay a labelled grid.
# usage: python tools/refgrid.py out.png x y w h [zoom] [mirror] [ox] [scale]   (units: 1 grid px = `scale` src px, origin = (45,12) for surge)
import sys
from PIL import Image, ImageDraw
out, x, y, w, h = sys.argv[1], *map(int, sys.argv[2:6])
zoom = int(sys.argv[6]) if len(sys.argv) > 6 else 14
sx0, sy0, k = (int(sys.argv[7]) if len(sys.argv) > 7 else 45), (int(sys.argv[8]) if len(sys.argv) > 8 else 12), 5.21
im = Image.open('brainstorm/reference/characters-reference.png').convert('RGB')
c = im.crop((round(sx0 + x * k), round(sy0 + y * k), round(sx0 + (x + w) * k), round(sy0 + (y + h) * k))).resize((w * zoom, h * zoom), Image.NEAREST)
d = ImageDraw.Draw(c)
for gx in range(0, w + 1, 4):
    d.line([(gx * zoom, 0), (gx * zoom, h * zoom)], fill=(255, 255, 255) if (x + gx) % 8 == 0 else (90, 90, 90)); d.text((gx * zoom + 2, 2), str(x + gx), fill=(255, 255, 0))
for gy in range(0, h + 1, 4):
    d.line([(0, gy * zoom), (w * zoom, gy * zoom)], fill=(255, 255, 255) if (y + gy) % 8 == 0 else (90, 90, 90)); d.text((2, gy * zoom + 2), str(y + gy), fill=(255, 255, 0))
c.save(out)
