"""Remove the shallow pocket fold (the V from each side down to the seal)
from the open envelope photo, keeping the seal and sprig untouched.

usage: python3 remove_pocket_line.py <open.png> <out.png>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
im = Image.open(SRC).convert("RGBA")
W, H = im.size
A = np.asarray(im).astype(np.float32)
RGB, ALPHA = A[:, :, :3], A[:, :, 3]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# pocket edge, measured on the photo: (181, 703) -> (705, 815) -> (1229, 696)
POCKET = [(181, 703), (705, 815), (1229, 696)]
(ax, ay), (bx, by), (cx, cy) = POCKET
pocket_y = np.where(xx <= bx, ay + (by - ay) * (xx - ax) / (bx - ax),
                    by + (cy - by) * (xx - bx) / (cx - bx))

HALF = 22            # rows either side of the line to rebuild (incl. its soft shadow)
blur = np.asarray(im.convert("RGB").filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
resid = np.clip(RGB - blur, -14, 14)

out = RGB.copy()
cols = np.arange(W)
HALF_AT = np.round(9 + (HALF - 9) * np.clip((np.abs(cols - 705) - 150) / 160, 0, 1)).astype(int)
for x in range(182, W - 182):
    py = pocket_y[0, x]
    # stay narrow near the seal, where the bottom flap creases meet the line
    half = HALF_AT[x]
    top, bot = int(py - half), int(py + half)
    # lighting from just outside the band, texture borrowed from 52px lower
    up = blur[top - 3:top, x].mean(0)
    dn = blur[bot:bot + 3, x].mean(0)
    for y in range(top, bot + 1):
        t = (y - top) / (bot - top)
        out[y, x] = up * (1 - t) + dn * t + resid[y + 52, x]
# feather the left/right ends into the envelope edges
edge = np.clip(np.minimum(xx - 182, (W - 182) - xx) / 3, 0, 1)
band = (np.abs(yy - pocket_y) <= HALF_AT[None, :]) * edge
band = np.asarray(Image.fromarray((band * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255

# leave the wax seal and its shadow exactly as photographed
mx, mn = RGB.max(2), RGB.min(2)
sat = (mx - mn) / np.maximum(mx, 1)
seal = ((xx - 705) ** 2 + (yy - 785) ** 2 < 112 ** 2) & ((sat > 0.24) | (RGB.mean(2) < 150))
seal = Image.fromarray((seal * 255).astype(np.uint8))
seal = seal.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))   # drop the thin line's shadow
seal = seal.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
seal = np.asarray(seal.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
band *= 1 - seal

res = RGB * (1 - band[:, :, None]) + out * band[:, :, None]
Image.fromarray(np.dstack([np.clip(res, 0, 255), ALPHA]).astype(np.uint8)).save(OUT, optimize=True)
print("wrote", OUT)
