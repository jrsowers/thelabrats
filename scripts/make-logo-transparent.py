#!/usr/bin/env python3
"""
Turn the league logo's solid white background transparent.

    python3 scripts/make-logo-transparent.py logos/<file>.png <out-stem> [max-px]

WHY NOT "make every white pixel transparent":
The logo's own artwork is full of white — the "LAB RATS" lettering, the lab
coat, the shield outline. Keying out all white would punch holes straight
through it. So this flood-fills inward from the image BORDER and only clears
white that is actually connected to the outside. Interior white is untouched.

Edge pixels are anti-aliased against the old background, so alpha is feathered
by how close each boundary pixel is to pure white. Without that you get a hard,
crunchy outline that looks worse than the white box did.

Deterministic and exact for a solid background — which is why this beats an ML
background remover here. Those are for photographic subjects, and they tend to
feather hard vector edges and hallucinate detail around thin shapes like the
rat's tail and whiskers.
"""
import os
import sys
from collections import deque
from PIL import Image

TOLERANCE = 26        # how far from pure white still counts as background
FEATHER_START = 200   # below this brightness, keep fully opaque


def main(src: str, stem: str, max_px: int) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, _ = px[x, y]
        return r >= 255 - TOLERANCE and g >= 255 - TOLERANCE and b >= 255 - TOLERANCE

    # Flood fill inward from every border pixel.
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not seen[y * w + x] and is_bg(x, y):
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not seen[y * w + x] and is_bg(x, y):
                seen[y * w + x] = 1
                q.append((x, y))

    cleared = 0
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        # Feather: the whiter the pixel, the more transparent it becomes, so
        # anti-aliased edges fade out instead of forming a hard rim.
        brightness = min(r, g, b)
        if brightness >= 255 - TOLERANCE:
            alpha = 0
        else:
            span = (255 - TOLERANCE) - FEATHER_START
            alpha = 255 if span <= 0 else int(255 * (1 - (brightness - FEATHER_START) / span))
            alpha = max(0, min(255, alpha))
        px[x, y] = (r, g, b, alpha)
        cleared += 1

        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(nx, ny):
                seen[ny * w + nx] = 1
                q.append((nx, ny))

    # Trim the now-empty margin so the logo scales predictably in a 224px rail.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    out = f"public/brand/{stem}.png"
    small = img.copy()
    small.thumbnail((max_px, max_px), Image.LANCZOS)
    small.save(out)

    print(f"  source   {os.path.basename(src)}  ({w}x{h})")
    print(f"  cleared  {cleared:,} background pixels")
    print(f"  trimmed  {img.size[0]}x{img.size[1]}")
    print(f"  wrote    {out}  ({small.size[0]}x{small.size[1]}, {os.path.getsize(out)/1024:.0f} KB)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 440)
