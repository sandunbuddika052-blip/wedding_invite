"""Resize and compress the edited shoot photos for the site.

Reads the full-size originals from "New Phtos/" and writes:
  assets/images/shoot/web/gallery-NN.jpg      grid thumbnails (800px long side)
  assets/images/shoot/display/gallery-NN.jpg  lightbox images (1600px long side)
  assets/images/hero.jpg                      hero for tall screens, couple centred
  assets/images/hero-wide.jpg                 hero for wide screens, couple centred
  assets/images/share-cover.jpg               link preview for WhatsApp etc. (1600x838)
Camera metadata is dropped; the sRGB colour profile is kept.

It also rewrites the gallery cards in index.html and the gallery list in
js/config.js to match, and deletes numbered files left over from a longer
gallery, so adding or removing a photo is just an edit to the lists below.

usage: python3 scratch/prepare_photos.py
"""
import glob
import os
import re
from PIL import Image, ImageFilter, ImageOps

SRC = "New Phtos"
OUT_WEB = "assets/images/shoot/web"
OUT_DISPLAY = "assets/images/shoot/display"
# Bump when the gallery files change so returning guests don't see cached photos
GALLERY_VERSION = 3

# Gallery order: night and day shots alternate in the "All" view, with the
# two wide building shots kept apart
MIDNIGHT = ["3T1A1891", "3T1A2042", "3T1A1586", "3T1A1731", "3T1A2115",
            "3T1A1877", "3T1A1786", "3T1A1573", "3T1A1617"]
SUNLIT = ["3T1A0659", "3T1A0763", "3T1A0619", "3T1A1231", "3T1A0881", "3T1A1381", "3T1A0986"]
HERO = "3T1A0659"
# In the hero original the couple spans x 760-2035 (centre 1398) and heads
# start at y 3087. The widest crop centred on them is 2 x 1398 px; 16:10
# leaves room for the menu bar above their heads.
HERO_WIDE_BOX = (0, 2830, 2796, 2830 + 1748)
# Same centred strip at 2:3 for phones and portrait tablets, keeping the canopy
HERO_TALL_BOX = (0, 1106, 2796, 1106 + 4194)
# Link preview: the close embrace, 1.91:1, from above their heads down to
# her hand on his chest. That is wider than the photo, so the soft,
# out-of-focus background is extended by SHARE_PAD px on each side.
SHARE_PHOTO = "3T1A0763"
SHARE_ROWS = (1500, 3908)
SHARE_PAD = 392
SHARE_SIZE = (1600, 838)

CARD = '''          <div class="masonry-card" data-category="{cat}" data-full="assets/images/shoot/display/gallery-{n:02d}.jpg?v={v}" onclick="openLightboxAtIndex({i})">
            <div class="masonry-card-inner">
              <img src="assets/images/shoot/web/gallery-{n:02d}.jpg?v={v}" alt="Wedding photo" class="masonry-img" width="{w}" height="{h}" loading="lazy" />
              <div class="masonry-card-overlay">
                <span class="masonry-expand-badge" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </span>
              </div>
            </div>
          </div>'''


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


def extend_sides(photo, pad):
    """Widen a photo whose edges are out-of-focus background: mirror the
    outer strips outward and blur them more the further they get from the
    photo, so the join can't be seen."""
    w, h = photo.size
    canvas = Image.new("RGB", (w + 2 * pad, h))
    canvas.paste(photo, (pad, 0))
    left = ImageOps.mirror(photo.crop((0, 0, pad, h)))
    right = ImageOps.mirror(photo.crop((w - pad, 0, w, h)))
    canvas.paste(left, (0, 0))
    canvas.paste(right, (pad + w, 0))
    blurred = canvas.filter(ImageFilter.GaussianBlur(40))
    # 0 inside the photo, rising to 1 at the outer edges
    ramp = Image.new("L", canvas.size, 0)
    px = ramp.load()
    for x in range(canvas.width):
        d = max(pad - x, x - (pad + w - 1), 0)
        v = int(255 * min(1.0, (d + 60) / (pad + 60))) if d > 0 else 0
        for y in range(h):
            px[x, y] = v
    ramp = ramp.filter(ImageFilter.GaussianBlur(30))
    return Image.composite(blurred, canvas, ramp)


def remove_leftovers(count):
    for folder in (OUT_WEB, OUT_DISPLAY):
        for path in glob.glob(os.path.join(folder, "gallery-*.jpg")):
            n = int(re.search(r"gallery-(\d+)\.jpg$", path).group(1))
            if n > count:
                os.remove(path)
                print("removed", path)


def update_markup(order, sizes):
    # width/height give each card its shape before the photo loads, which
    # the gallery layout in main.js relies on
    cards = "\n".join(CARD.format(cat=cat, n=i + 1, i=i, v=GALLERY_VERSION, w=sizes[i][0], h=sizes[i][1])
                      for i, (_, cat) in enumerate(order))
    html = open("index.html", encoding="utf-8").read()
    m = re.search(r'(<div class="masonry-grid" id="galleryGrid">\n)(.*?)(\n        </div>\n\n      </div>\n    </section>)', html, re.S)
    if not m:
        raise SystemExit("gallery block not found in index.html")
    open("index.html", "w", encoding="utf-8").write(html[:m.start(2)] + cards + html[m.end(2):])

    rows = ",\n".join(
        f'    {{ url: "assets/images/shoot/web/gallery-{i + 1:02d}.jpg", '
        f'full: "assets/images/shoot/display/gallery-{i + 1:02d}.jpg", category: "{cat}" }}'
        for i, (_, cat) in enumerate(order))
    cfg = open("js/config.js", encoding="utf-8").read()
    m = re.search(r'(  gallery: \[\n)(.*?)(\n  \],)', cfg, re.S)
    if not m:
        raise SystemExit("gallery list not found in js/config.js")
    open("js/config.js", "w", encoding="utf-8").write(cfg[:m.start(2)] + rows + cfg[m.end(2):])
    print(f"index.html and js/config.js: {len(order)} gallery photos")


def main():
    os.makedirs(OUT_WEB, exist_ok=True)
    os.makedirs(OUT_DISPLAY, exist_ok=True)
    order = gallery_order()
    sizes = []
    for n, (name, cat) in enumerate(order, start=1):
        im, icc = load(name)
        slot = f"gallery-{n:02d}.jpg"
        thumb = fit_long_side(im, 800)
        sizes.append(thumb.size)
        save(thumb, os.path.join(OUT_WEB, slot), icc, 80)
        save(fit_long_side(im, 1600), os.path.join(OUT_DISPLAY, slot), icc, 82)
        print(f"{slot}  {cat:8s}  {name}")
    remove_leftovers(len(order))
    update_markup(order, sizes)

    im, icc = load(HERO)
    hero = im.crop(HERO_TALL_BOX).resize((1400, 2100), Image.LANCZOS)
    save(hero, "assets/images/hero.jpg", icc, 76)
    print("hero.jpg            ", HERO, hero.size)

    wide = im.crop(HERO_WIDE_BOX).resize((2400, 1500), Image.LANCZOS)
    save(wide, "assets/images/hero-wide.jpg", icc, 78)
    print("hero-wide.jpg       ", HERO, wide.size)

    im, icc = load(SHARE_PHOTO)
    share = extend_sides(im.crop((0, SHARE_ROWS[0], im.width, SHARE_ROWS[1])), SHARE_PAD)
    share = share.resize(SHARE_SIZE, Image.LANCZOS)
    share = share.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    save(share, "assets/images/share-cover.jpg", icc, 90)
    print("share-cover.jpg     ", SHARE_PHOTO, share.size)


if __name__ == "__main__":
    main()
