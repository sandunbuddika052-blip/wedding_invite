"""Build a wide banner from the portrait ring photo by extending the linen
to both sides, so wide screens get the full rings without heavy upscaling.

usage: python3 make_ring_banner.py <ring_photo.jpeg> <out.jpg>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(11)

im = Image.open(SRC).convert("RGB")
SW, SH = im.size                                   # 1086 x 1448
SRCF = np.asarray(im).astype(np.float32)
BLUR = np.asarray(im.filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
RESID = np.clip(SRCF - np.asarray(im.filter(ImageFilter.GaussianBlur(3))).astype(np.float32), -18, 18)

# band of the photo to keep: daisy tips at the top, rings, linen for the caption
Y0, Y1 = 680, 1360
H = Y1 - Y0
ASPECT = 3.0
W = int(round(H * ASPECT))
PX0 = (W - SW) // 2                                # photo's left edge on the canvas
SCALE = 1.35

# clean linen strips we may borrow texture from: (x0, x1, y0, y1) in photo px
STRIPS = [(900, 1080, 650, SH - 4),                # right edge, below the daisies
          (8, 245, 875, SH - 4)]                   # left edge, below the baby's breath


def gblur(a, sigma):
    r = int(3 * sigma)
    k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sigma ** 2))
    k /= k.sum()
    a = np.pad(a, ((r, r), (0, 0)), mode="edge")
    return np.apply_along_axis(lambda v: np.convolve(v, k, "valid"), 0, a)


# ── lighting for the extensions, row by row ────────────────────────────
rows = np.arange(Y0, Y1)
right_edge = BLUR[rows, SW - 30:SW - 4].mean(1)                     # (H, 3)
left_edge = BLUR[rows, 4:30].mean(1)
# the left edge is flowers/shadow near the top: trust it only lower down
trust_left = np.clip((rows - 860) / 60.0, 0, 1)[:, None]
left_edge = left_edge * trust_left + right_edge * (1 - trust_left)
far = gblur((left_edge + right_edge) / 2, 25) * 0.975               # gentle vignette

light = np.zeros((H, W, 3), np.float32)
xs = np.arange(W)
for side, edge, xr in (("L", left_edge, np.arange(0, PX0)), ("R", right_edge, np.arange(PX0 + SW, W))):
    d = (PX0 - xr) if side == "L" else (xr - (PX0 + SW - 1))        # px away from the photo
    t = np.clip(d / 380.0, 0, 1) ** 1.3
    light[:, xr] = gblur(edge, 8)[:, None, :] * (1 - t[None, :, None]) + far[:, None, :] * t[None, :, None]
# under the photo's feathered edges, hold each side's seam value so the
# fade goes photo -> linen with no step in between
half = SW // 2
light[:, PX0:PX0 + half] = gblur(left_edge, 8)[:, None, :]
light[:, PX0 + half:PX0 + SW] = gblur(right_edge, 8)[:, None, :]

# ── linen texture: quilt residual patches taken from the same rows ─────
B, STEP = 56, 36
win1 = np.sin(np.linspace(0, np.pi, B)) ** 2
win = np.outer(win1, win1)[:, :, None]
tex = np.zeros((H, W, 3), np.float32)
wsum = np.zeros((H, W, 1), np.float32)
for by in range(-B // 2, H, STEP):
    for bx in range(-B // 2, W, STEP):
        if PX0 + 200 < bx and bx + B < PX0 + SW - 200:
            continue                                                # well inside the photo
        want = Y0 + max(by, 0)
        options = []
        for x0, x1, y0, y1 in STRIPS:
            lo, hi = max(y0, want - 35), min(y1 - B, want + 35)
            if hi > lo:
                options.append((x0, x1 - B, lo, hi))
        if not options:
            x0, x1, y0, y1 = STRIPS[0]
            options = [(x0, x1 - B, y1 - B - 70, y1 - B)]
        ox0, ox1, oy0, oy1 = options[rng.integers(len(options))]
        sx, sy = rng.integers(ox0, ox1), rng.integers(oy0, oy1)
        patch = RESID[sy:sy + B, sx:sx + B]
        ty0, tx0 = max(by, 0), max(bx, 0)
        ty1, tx1 = min(by + B, H), min(bx + B, W)
        tex[ty0:ty1, tx0:tx1] += patch[ty0 - by:ty1 - by, tx0 - bx:tx1 - bx] * win[ty0 - by:ty1 - by, tx0 - bx:tx1 - bx]
        wsum[ty0:ty1, tx0:tx1] += win[ty0 - by:ty1 - by, tx0 - bx:tx1 - bx] ** 2
tex /= np.sqrt(np.maximum(wsum, 1e-4))

canvas = light + tex

# ── photo in the middle, feathered into the extensions ────────────────
photo = SRCF[Y0:Y1]
fw = np.ones((H, SW), np.float32)
ramp_r = np.clip(np.arange(SW)[::-1] / 90.0, 0, 1)                  # right edge: linen, short blend
# left edge: longer blend at the top where the baby's breath meets the edge
left_len = 90 + 80 * (1 - np.clip((rows - 820) / 60.0, 0, 1))
ramp_l = np.clip(np.arange(SW)[None, :] / left_len[:, None], 0, 1)
fw = np.minimum(ramp_l, ramp_r[None, :])
fw = fw * fw * (3 - 2 * fw)                                         # smoothstep
canvas[:, PX0:PX0 + SW] = canvas[:, PX0:PX0 + SW] * (1 - fw[:, :, None]) + photo * fw[:, :, None]

out = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
out = out.resize((int(W * SCALE), int(H * SCALE)), Image.LANCZOS)
out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=35, threshold=2))
out.save(OUT, quality=86, optimize=True, progressive=True)
print("wrote", OUT, out.size)
