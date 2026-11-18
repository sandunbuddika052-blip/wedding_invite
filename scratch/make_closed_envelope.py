"""Build a closed envelope from the open envelope photo so both match.

Keeps the open image's bottom pocket, wax seal and sprig at identical pixel
positions; rebuilds the side panels and a closed top flap from the same paper.
usage: python3 make_closed.py <open.png> <out.png> [preview.jpg]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
rng = np.random.default_rng(7)

im = Image.open(SRC).convert("RGBA")
W, H = im.size
A = np.asarray(im).astype(np.float32)
RGB, ALPHA = A[:, :, :3], A[:, :, 3]
LUM = RGB.mean(2)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# ── geometry (measured on the open image) ──────────────────────────────
X0, X1, TOP, BOT = 181, 1230, 352, 1087
POCKET = [(181, 703), (705, 815), (1229, 696)]       # bottom flap V edge
APEX = (705, 802)                                     # top flap tip, under seal


def vline(pts):
    (ax, ay), (bx, by), (cx, cy) = pts
    return np.where(xx <= bx, ay + (by - ay) * (xx - ax) / (bx - ax),
                    by + (cy - by) * (xx - bx) / (cx - bx))


pocket_y = vline(POCKET)
flap_y = vline([(X0, TOP), APEX, (X1 - 1, TOP)])

# ── seal mask (bronze wax: saturated or dark) ─────────────────────────
mx, mn = RGB.max(2), RGB.min(2)
sat = (mx - mn) / np.maximum(mx, 1)
near = (xx - 705) ** 2 + (yy - 785) ** 2 < 112 ** 2
seal = near & ((sat > 0.24) | (LUM < 150))
sm = Image.fromarray((seal * 255).astype(np.uint8))
sm = sm.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))   # close
sm = sm.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))   # drop specks
sm = sm.filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 128 else 0)
# fill holes: flood from outside
filled = sm.copy()
ImageDraw.floodfill(filled, (0, 0), 128)
sm = Image.fromarray(np.where(np.asarray(filled) == 128, 0, 255).astype(np.uint8))
seal_a = np.asarray(sm.filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32) / 255
ys, xs = np.nonzero(seal_a > 0.5)
SEAL_C = (xs.mean(), ys.mean())
print("seal centre", [round(v) for v in SEAL_C], "bbox", xs.min(), xs.max(), ys.min(), ys.max())

# ── clean paper sample mask (for lighting fit) ─────────────────────────
body = (xx > X0 + 6) & (xx < X1 - 7) & (yy < BOT - 6)
clean = body & (yy > pocket_y + 6) & ~((xx - 705) ** 2 + (yy - 785) ** 2 < 150 ** 2)
clean |= (xx > 186) & (xx < 268) & (yy > 368) & (yy < 690)            # left side panel
clean |= (xx > 1150) & (xx < 1222) & (yy > 450) & (yy < 680)          # right side panel
clean &= LUM > 185

# lighting: quadratic surface per channel
def basis(x, y):
    x = (x - W / 2) / W
    y = (y - H / 2) / H
    return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)

blur = np.asarray(im.convert("RGB").filter(ImageFilter.GaussianBlur(5))).astype(np.float32)
sel = clean[::3, ::3]
Bm = basis(xx[::3, ::3][sel], yy[::3, ::3][sel])
light = np.zeros_like(RGB)
Bfull = basis(xx, yy)
for c in range(3):
    coef, *_ = np.linalg.lstsq(Bm, blur[::3, ::3, c][sel], rcond=None)
    light[:, :, c] = Bfull @ coef

# ── paper texture: quilt residual blocks from clean regions ────────────
resid = RGB - np.asarray(im.convert("RGB").filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
resid = np.clip(resid, -14, 14)
sources = [(480, 965, 940, 1075), (205, 775, 420, 870), (990, 775, 1200, 860)]
B, STEP = 48, 32
win1 = np.sin(np.linspace(0, np.pi, B)) ** 2
win = np.outer(win1, win1)[:, :, None]
tex = np.zeros_like(RGB)
wsum = np.zeros((H, W, 1), np.float32)
for by in range(TOP - B, BOT + B, STEP):
    for bx in range(X0 - B, X1 + B, STEP):
        sx0, sy0, sx1, sy1 = sources[rng.integers(len(sources))]
        px = rng.integers(sx0, sx1 - B)
        py = rng.integers(sy0, sy1 - B)
        patch = resid[py:py + B, px:px + B]
        ty0, tx0 = max(by, 0), max(bx, 0)
        ty1, tx1 = min(by + B, H), min(bx + B, W)
        if ty1 <= ty0 or tx1 <= tx0:
            continue
        p = patch[ty0 - by:ty1 - by, tx0 - bx:tx1 - bx]
        w = win[ty0 - by:ty1 - by, tx0 - bx:tx1 - bx]
        tex[ty0:ty1, tx0:tx1] += p * w
        wsum[ty0:ty1, tx0:tx1] += w * w
tex /= np.sqrt(np.maximum(wsum, 1e-4))

# match the fitted lighting to the real pocket just below its edge, column
# by column, so the rebuilt paper meets the photo without a brightness step
probe = np.clip((pocket_y[0] + 34).astype(int), 0, H - 1)
cols = np.arange(W)
ratio = blur[probe, cols] / np.maximum(light[probe, cols], 1)
ok = ((cols > X0 + 8) & (cols < X1 - 9)) & ~((cols > 585) & (cols < 835))
for c in range(3):
    ratio[:, c] = np.interp(cols, cols[ok], ratio[ok, c])
    ratio[:, c] = np.convolve(np.pad(ratio[:, c], 25, mode="edge"), np.ones(51) / 51, "valid")
fall = np.clip(1 - ((pocket_y + 34) - yy) / 160, 0, 1)[:, :, None]
light = light * (1 + (ratio[None, :, :] - 1) * fall)

paper = light + tex

# ── composite ──────────────────────────────────────────────────────────
out = paper.copy()

# 1. bottom pocket straight from the photo, starting just below its edge so
#    the open envelope's pocket fold doesn't show on the closed one
keep = np.clip((yy - (pocket_y + 10)) / 16.0, 0, 1)[:, :, None]
out = out * (1 - keep) + RGB * keep

# 2. top flap: soft shadow onto what's below, then the flap itself
flap = (yy < flap_y).astype(np.float32)
fm = Image.fromarray((flap * 255).astype(np.uint8))
shadow = np.asarray(fm.transform(fm.size, Image.AFFINE, (1, 0, 0, 0, 1, -5))
                    .filter(ImageFilter.GaussianBlur(7))).astype(np.float32) / 255
shadow = np.clip(shadow - flap, 0, 1)
out *= (1 - 0.13 * shadow)[:, :, None]

flap_aa = np.asarray(fm.filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)[:, :, None] / 255
# flap paper: same sheet, a touch brighter (faces the light), with a fine
# highlight along the folded edge like the pocket edges in the photo
d_edge = flap_y - yy                                   # px above the edge (vertical)
edge_hi = np.exp(-((d_edge - 1.5) ** 2) / 1.5)[:, :, None] * 10
top_fold = np.clip(1 - (yy - TOP) / 10, 0, 1)[:, :, None] * -8   # crease shading at the top fold
flap_px = paper + 3 + edge_hi + top_fold
out = out * (1 - flap_aa) + flap_px * flap_aa

# 3. monogram on the flap, in the card's gold
GOLD = np.array([146, 112, 66], np.float32)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/SnellRoundhand.ttc", 112, index=0)
amp = ImageFont.truetype("/System/Library/Fonts/Supplemental/SnellRoundhand.ttc", 64, index=0)
tm = Image.new("L", (W, H), 0)
td = ImageDraw.Draw(tm)
cx, cy = 705, 512
td.text((cx - 62, cy), "Y", font=font, fill=255, anchor="mm")
td.text((cx + 2, cy + 18), "&", font=amp, fill=255, anchor="mm")
td.text((cx + 66, cy + 4), "V", font=font, fill=255, anchor="mm")
for sx0, sx1 in ((cx - 120, cx - 30), (cx + 30, cx + 120)):
    td.line([(sx0, cy + 78), (sx1, cy + 78)], fill=150, width=2)
td.ellipse([cx - 4, cy + 74, cx + 4, cy + 82], fill=220)
t = np.asarray(tm.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)[:, :, None] / 255
t *= flap_aa
deboss = np.asarray(tm.transform(tm.size, Image.AFFINE, (1, 0, -1, 0, 1, -1))
                    .filter(ImageFilter.GaussianBlur(1))).astype(np.float32)[:, :, None] / 255
out = out + deboss * flap_aa * 6                       # faint pressed highlight
foil = GOLD + (light - light.mean()) * 0.6 + tex * 0.5
out = out * (1 - t * 0.92) + foil * (t * 0.92)

# 4. sprig: transfer its difference from the local background
SX0, SY0, SX1, SY1 = 190, 362, 520, 760
src = RGB[SY0:SY1, SX0:SX1]
sub_sat = sat[SY0:SY1, SX0:SX1]
sub_l = LUM[SY0:SY1, SX0:SX1]


def gblur(a, sigma):
    r = int(3 * sigma)
    k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sigma ** 2))
    k /= k.sum()
    a = np.pad(a, r, mode="edge")
    a = np.apply_along_axis(lambda v: np.convolve(v, k, "valid"), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(v, k, "valid"), 1, a)


def masked_blur(img, m, sigma, fallback):
    """Blur only the pixels where m is set (normalised convolution);
    where too little of the neighbourhood is set, use the fallback."""
    den = gblur(m, sigma)
    num = np.dstack([gblur(img[:, :, c] * m, sigma) for c in range(3)])
    est = num / np.maximum(den, 1e-3)[:, :, None]
    trust = np.clip((den - 0.03) / 0.07, 0, 1)[:, :, None]
    return est * trust + fallback * (1 - trust)


# background behind the sprig: paper/card only, found iteratively
light_sub = light[SY0:SY1, SX0:SX1]
bgm = ((sub_sat < 0.12) & (sub_l > 200)).astype(np.float32)
for _ in range(3):
    bg = masked_blur(src, bgm, 14, light_sub)
    d = np.abs(src - bg).max(2)
    bgm = (d < 9).astype(np.float32)
diff = src - bg
mag = np.abs(diff).max(2)
sx, sy = xx[SY0:SY1, SX0:SX1], yy[SY0:SY1, SX0:SX1]
dl = diff.mean(2)

w_norm = np.clip((mag - 4) / 8, 0, 1)
w_norm = np.asarray(Image.fromarray((w_norm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))).astype(np.float32) / 255
# on the card's edge (x≈280) and gold frame line (x≈310) keep only petals,
# stems and leaves, so the lines themselves don't come along
flower_w = np.clip((dl - 6) / 8, 0, 1)
stem_w = np.clip((sub_sat - 0.25) / 0.1, 0, 1) * np.clip((-dl - 12) / 10, 0, 1)
stem_w[sy < 398] = 0                       # bare frame line above the top blossoms
w_strict = np.maximum(flower_w, stem_w)


def ramp(x, a, b, r=3.0):
    return np.clip(np.minimum(x - (a - r), (b + r) - x) / r, 0, 1)


zone = np.maximum(ramp(sx, 277, 284), ramp(sx, 307, 314)) * np.clip((612 - sy) / 10, 0, 1)
wgt = w_norm * (1 - zone) + w_strict * zone
# the gold liner peeking out left of the card: fade it (and what's on it) out
liner_d = (360 + (sx - 183) * 0.79 + 6) - sy
wgt *= 1 - np.clip(liner_d / 4, 0, 1) * np.clip((286 - sx) / 3, 0, 1)
wgt[(sx >= 302) & (sx <= 319) & (sy < 392)] = 0     # frame line above the sprig
wgt = gblur(wgt, 0.8)[:, :, None]
above = np.clip(((pocket_y - 4) - yy)[SY0:SY1, SX0:SX1] / 2.0, 0, 1)[:, :, None]
out[SY0:SY1, SX0:SX1] += diff * wgt * above

# 5. seal on top, with its own soft drop shadow
sh = Image.fromarray((seal_a * 255).astype(np.uint8))
sh = np.asarray(sh.transform(sh.size, Image.AFFINE, (1, 0, -2, 0, 1, -6))
                .filter(ImageFilter.GaussianBlur(12))).astype(np.float32) / 255
out *= (1 - 0.2 * np.clip(sh - seal_a, 0, 1))[:, :, None]
out = out * (1 - seal_a[:, :, None]) + RGB * seal_a[:, :, None]

# ── alpha: rounded-top body, sides/bottom from the photo ───────────────
S4 = 4
mask = Image.new("L", (W * S4, H * S4), 0)
ImageDraw.Draw(mask).rounded_rectangle([X0 * S4, TOP * S4, X1 * S4, (BOT + 20) * S4], radius=10 * S4, fill=255)
mask = np.asarray(mask.resize((W, H), Image.LANCZOS)).astype(np.float32)
alpha = np.where(yy > 420, ALPHA, np.minimum(mask, np.where(yy > TOP + 12, ALPHA, 255)))
alpha = np.minimum(alpha, np.where(yy < BOT - 30, 255, ALPHA))
alpha = np.minimum(alpha, mask + (yy > 420) * 255)

res = np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8)
res[alpha == 0, :3] = 0
Image.fromarray(res, "RGBA").save(OUT, optimize=True)
print("wrote", OUT)

if PREVIEW:
    o = Image.open(OUT)
    sheet = Image.new("RGBA", (W * 2, H), (250, 246, 242, 255))
    sheet.alpha_composite(o, (0, 0))
    sheet.alpha_composite(im, (W, 0))
    sheet.convert("RGB").resize((W, H // 2)).save(PREVIEW, quality=88)
