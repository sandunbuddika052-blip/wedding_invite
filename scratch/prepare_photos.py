"""Resize and compress the edited shoot photos for the site.

Reads the full-size originals from "New Phtos/" and writes:
  assets/images/shoot/web/gallery-NN.jpg      grid thumbnails (800px long side)
  assets/images/shoot/display/gallery-NN.jpg  lightbox images (1600px long side)
  assets/images/hero.jpg                      hero background (1800px wide)
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
    w = 1800
    hero = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    save(hero, "assets/images/hero.jpg", icc, 76)
    print("hero.jpg            ", HERO, hero.size)


if __name__ == "__main__":
    main()
