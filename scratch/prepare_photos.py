"""Resize and compress the edited shoot photos for the site.

Reads the full-size originals from "New Phtos/" and writes:
  assets/images/shoot/web/gallery-NN.jpg      grid thumbnails (800px long side)
  assets/images/shoot/display/gallery-NN.jpg  lightbox images (1600px long side)
  assets/images/hero.jpg                      hero for tall screens, couple centred
  assets/images/hero-wide.jpg                 hero for wide screens, couple centred
Camera metadata is dropped; the sRGB colour profile is kept.

usage: python3 scratch/prepare_photos.py
"""
import os
from PIL import Image, ImageOps

SRC = "New Phtos"
OUT_WEB = "assets/images/shoot/web"
OUT_DISPLAY = "assets/images/shoot/display"

# Gallery order: night and day shots alternate in the "All" view, with the
# colour and black-and-white 2115 frames (and the two wide building shots) kept apart
MIDNIGHT = ["3T1A1891", "3T1A1661", "3T1A2042", "3T1A1586", "3T1A1731", "3T1A2115",
            "3T1A1877", "3T1A2092", "3T1A1786", "3T1A1573", "3T1A1617", "3T1A2115-2"]
SUNLIT = ["3T1A0659", "3T1A0763", "3T1A0619", "3T1A1231", "3T1A0881", "3T1A1381", "3T1A0986"]
HERO = "3T1A0659"
# In the hero original the couple spans x 760-2035 (centre 1398) and heads
# start at y 3087. The widest crop centred on them is 2 x 1398 px; 16:10
# leaves room for the menu bar above their heads.
HERO_WIDE_BOX = (0, 2830, 2796, 2830 + 1748)
# Same centred strip at 2:3 for phones and portrait tablets, keeping the canopy
HERO_TALL_BOX = (0, 1106, 2796, 1106 + 4194)


def gallery_order():
    order = []
    for i in range(max(len(MIDNIGHT), len(SUNLIT))):
        if i < len(MIDNIGHT):
            order.append((MIDNIGHT[i], "midnight"))
        if i < len(SUNLIT):
            order.append((SUNLIT[i], "sunlit"))
    return order


def load(name):
    im = Image.open(os.path.join(SRC, name + ".jpg"))
    icc = im.info.get("icc_profile")
    return ImageOps.exif_transpose(im).convert("RGB"), icc


def save(im, path, icc, quality):
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True,
            subsampling="4:2:0", icc_profile=icc)


def fit_long_side(im, size):
    out = im.copy()
    out.thumbnail((size, size), Image.LANCZOS)
    return out


def main():
    os.makedirs(OUT_WEB, exist_ok=True)
    os.makedirs(OUT_DISPLAY, exist_ok=True)
    for n, (name, cat) in enumerate(gallery_order(), start=1):
        im, icc = load(name)
        slot = f"gallery-{n:02d}.jpg"
        save(fit_long_side(im, 800), os.path.join(OUT_WEB, slot), icc, 80)
        save(fit_long_side(im, 1600), os.path.join(OUT_DISPLAY, slot), icc, 82)
        print(f"{slot}  {cat:8s}  {name}")

    im, icc = load(HERO)
    hero = im.crop(HERO_TALL_BOX).resize((1400, 2100), Image.LANCZOS)
    save(hero, "assets/images/hero.jpg", icc, 76)
    print("hero.jpg            ", HERO, hero.size)

    wide = im.crop(HERO_WIDE_BOX).resize((2400, 1500), Image.LANCZOS)
    save(wide, "assets/images/hero-wide.jpg", icc, 78)
    print("hero-wide.jpg       ", HERO, wide.size)


if __name__ == "__main__":
    main()
