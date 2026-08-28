#!/usr/bin/env python3
"""
Composite the league logo over a background to produce the og:image.

    python3 scripts/make-og-image.py <background.png> [logo.png]

Output: public/brand/og-image.png at 1200x630 — the size Slack, iMessage, X and
Facebook all crop toward. Anything else gets letterboxed or centre-cropped by
whoever renders the card.

The background is cover-cropped rather than squashed, then darkened with a
vignette and a slight overall scrim so white logo lettering stays legible over
stadium floodlights. Without that scrim the logo disappears into the brightest
part of the image on some crops.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

OG_W, OG_H = 1200, 630
LOGO_WIDTH_RATIO = 0.62   # logo spans this fraction of the card width


def cover_crop(img: Image.Image, w: int, h: int) -> Image.Image:
    """Scale to fill w×h, cropping the overflow — never distort the photo."""
    scale = max(w / img.width, h / img.height)
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def main(bg_path: str, logo_path: str = 'public/brand/lab-rats-logo-rail.png') -> None:
    bg = cover_crop(Image.open(bg_path).convert('RGB'), OG_W, OG_H)

    # Overall scrim: keeps the photo readable but stops floodlights competing
    # with white lettering.
    scrim = Image.new('RGBA', (OG_W, OG_H), (4, 8, 16, 90))
    card = Image.alpha_composite(bg.convert('RGBA'), scrim)

    # Radial-ish vignette, so the centre reads darkest where the logo sits.
    vignette = Image.new('L', (OG_W, OG_H), 0)
    ImageDraw.Draw(vignette).ellipse(
        (-OG_W * 0.15, -OG_H * 0.45, OG_W * 1.15, OG_H * 1.45), fill=170,
    )
    vignette = vignette.filter(ImageFilter.GaussianBlur(140))
    dark = Image.new('RGBA', (OG_W, OG_H), (2, 5, 12, 255))
    card = Image.composite(card, Image.alpha_composite(card, dark), vignette)

    # Logo, centred slightly above the midline so it sits in the optical centre.
    logo = Image.open(logo_path).convert('RGBA')
    target_w = int(OG_W * LOGO_WIDTH_RATIO)
    logo = logo.resize(
        (target_w, round(logo.height * target_w / logo.width)), Image.LANCZOS,
    )
    x = (OG_W - logo.width) // 2
    y = int(OG_H * 0.5 - logo.height * 0.5 - OG_H * 0.03)

    # Soft shadow so the mark separates from the turf behind it.
    shadow = Image.new('RGBA', (OG_W, OG_H), (0, 0, 0, 0))
    shadow.paste(logo, (x, y + 6), logo)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    card = Image.alpha_composite(card, shadow)

    card.paste(logo, (x, y), logo)

    # JPEG, not PNG: this is a photograph with a logo on it. PNG kept it at
    # ~940KB, which is a slow link preview for no visual gain.
    out = 'public/brand/og-image.jpg'
    card.convert('RGB').save(out, 'JPEG', quality=88, optimize=True, progressive=True)

    import os
    print(f'  wrote {out}  ({OG_W}x{OG_H}, {os.path.getsize(out)/1024:.0f} KB)')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(*sys.argv[1:3])
