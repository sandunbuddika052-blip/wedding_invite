"""Resize and compress the edited shoot photos for the site.

Reads the full-size originals from "New Phtos/" and writes:
  assets/images/shoot/web/gallery-NN.jpg      grid thumbnails (800px long side)
  assets/images/shoot/display/gallery-NN.jpg  lightbox images (1600px long side)
  assets/images/hero.jpg                      hero for tall screens, couple centred
  assets/images/hero-wide.jpg                 hero for wide screens, couple centred
  assets/images/share-cover.jpg               link preview for WhatsApp etc. (1200x630)
Camera metadata is dropped; the sRGB colour profile is kept.

It also rewrites the gallery cards in index.html and the gallery list in
js/config.js to match, and deletes numbered files left over from a longer
gallery, so adding or removing a photo is just an edit to the lists below.

usage: python3 scratch/prepare_photos.py
"""
import glob
import os
import re
from PIL import Image, ImageOps

SRC = "New Phtos"
OUT_WEB = "assets/images/shoot/web"
OUT_DISPLAY = "assets/images/shoot/display"
# Bump when the gallery files change so returning guests don't see cached photos
GALLERY_VERSION = 3

# Gallery order: night and day shots alternate in the "All" view, with the
# colour and black-and-white 2115 frames (and the two wide building shots) kept apart
MIDNIGHT = ["3T1A1891", "3T1A2042", "3T1A1586", "3T1A1731", "3T1A2115",
            "3T1A1877", "3T1A1786", "3T1A1573", "3T1A1617", "3T1A2115-2"]
SUNLIT = ["3T1A0659", "3T1A0763", "3T1A0619", "3T1A1231", "3T1A0881", "3T1A1381", "3T1A0986"]
HERO = "3T1A0659"
# In the hero original the couple spans x 760-2035 (centre 1398) and heads
# start at y 3087. The widest crop centred on them is 2 x 1398 px; 16:10
# leaves room for the menu bar above their heads.
HERO_WIDE_BOX = (0, 2830, 2796, 2830 + 1748)
# Same centred strip at 2:3 for phones and portrait tablets, keeping the canopy
HERO_TALL_BOX = (0, 1106, 2796, 1106 + 4194)
# Link preview: the close embrace at full width, 1.91:1, from above their
# heads to the chest, faces (around x 1845, y 2610) near the middle
SHARE_PHOTO = "3T1A0763"
SHARE_BOX = (0, 1450, 3816, 1450 + 1998)

CARD = '''          <div class="masonry-card" data-category="{cat}" data-full="assets/images/shoot/display/gallery-{n:02d}.jpg?v={v}" onclick="openLightboxAtIndex({i})">
            <div class="masonry-card-inner">
              <img src="assets/images/shoot/web/gallery-{n:02d}.jpg?v={v}" alt="Wedding photo" class="masonry-img" loading="lazy" />
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


def remove_leftovers(count):
    for folder in (OUT_WEB, OUT_DISPLAY):
        for path in glob.glob(os.path.join(folder, "gallery-*.jpg")):
            n = int(re.search(r"gallery-(\d+)\.jpg$", path).group(1))
            if n > count:
                os.remove(path)
                print("removed", path)


def update_markup(order):
    cards = "\n".join(CARD.format(cat=cat, n=i + 1, i=i, v=GALLERY_VERSION)
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
    for n, (name, cat) in enumerate(order, start=1):
        im, icc = load(name)
        slot = f"gallery-{n:02d}.jpg"
        save(fit_long_side(im, 800), os.path.join(OUT_WEB, slot), icc, 80)
        save(fit_long_side(im, 1600), os.path.join(OUT_DISPLAY, slot), icc, 82)
        print(f"{slot}  {cat:8s}  {name}")
    remove_leftovers(len(order))
    update_markup(order)

    im, icc = load(HERO)
    hero = im.crop(HERO_TALL_BOX).resize((1400, 2100), Image.LANCZOS)
    save(hero, "assets/images/hero.jpg", icc, 76)
    print("hero.jpg            ", HERO, hero.size)

    wide = im.crop(HERO_WIDE_BOX).resize((2400, 1500), Image.LANCZOS)
    save(wide, "assets/images/hero-wide.jpg", icc, 78)
    print("hero-wide.jpg       ", HERO, wide.size)

    im, icc = load(SHARE_PHOTO)
    share = im.crop(SHARE_BOX).resize((1200, 630), Image.LANCZOS)
    save(share, "assets/images/share-cover.jpg", icc, 82)
    print("share-cover.jpg     ", SHARE_PHOTO, share.size)


if __name__ == "__main__":
    main()
