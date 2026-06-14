#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "app-icon"
ICONSET = OUT / "EvoScientistStudio.iconset"
PNG_1024 = OUT / "app-icon-1024.png"
ICNS = OUT / "EvoScientistStudio.icns"


def font(size):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Avenir Next Condensed.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def icon(size):
    scale = size / 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)

    margin = int(72 * scale)
    radius = int(210 * scale)
    box = (margin, margin, size - margin, size - margin)
    mask_draw.rounded_rectangle(box, radius=radius, fill=255)

    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(box, radius=radius, fill=(21, 83, 198, 255))
    draw.polygon(
        [
            (int(704 * scale), margin),
            (size - margin, margin),
            (size - margin, size - margin),
            (int(574 * scale), size - margin),
        ],
        fill=(210, 31, 58, 255),
    )
    draw.rectangle(
        (int(650 * scale), margin, int(706 * scale), size - margin),
        fill=(247, 250, 255, 255),
    )
    draw.rectangle(
        (int(718 * scale), margin, int(744 * scale), size - margin),
        fill=(13, 29, 65, 255),
    )

    img.alpha_composite(base)
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)
    white = (255, 255, 255, 255)
    x0 = int(272 * scale)
    y0 = int(268 * scale)
    stem = int(86 * scale)
    bar = int(102 * scale)
    long = int(372 * scale)
    mid = int(300 * scale)
    short = int(338 * scale)
    draw.rounded_rectangle((x0, y0, x0 + stem, y0 + int(488 * scale)), radius=int(26 * scale), fill=white)
    draw.rounded_rectangle((x0, y0, x0 + long, y0 + bar), radius=int(28 * scale), fill=white)
    draw.rounded_rectangle((x0, y0 + int(196 * scale), x0 + mid, y0 + int(196 * scale) + bar), radius=int(28 * scale), fill=white)
    draw.rounded_rectangle((x0, y0 + int(386 * scale), x0 + short, y0 + int(386 * scale) + bar), radius=int(28 * scale), fill=white)
    draw.rounded_rectangle(
        box,
        radius=radius,
        outline=(255, 255, 255, 180),
        width=max(2, int(10 * scale)),
    )
    return img


def save_iconset():
    OUT.mkdir(parents=True, exist_ok=True)
    if ICONSET.exists():
        shutil.rmtree(ICONSET)
    ICONSET.mkdir(parents=True)

    icon(1024).save(PNG_1024)
    sizes = [
        (16, 1), (16, 2),
        (32, 1), (32, 2),
        (128, 1), (128, 2),
        (256, 1), (256, 2),
        (512, 1), (512, 2),
    ]
    for points, scale in sizes:
        pixels = points * scale
        name = f"icon_{points}x{points}{'@2x' if scale == 2 else ''}.png"
        target = ICONSET / name
        if shutil.which("sips"):
            subprocess.run(
                ["sips", "-z", str(pixels), str(pixels), str(PNG_1024), "--out", str(target)],
                check=True,
                stdout=subprocess.DEVNULL,
            )
        else:
            icon(pixels).save(target)

    if shutil.which("iconutil"):
        subprocess.run(["iconutil", "-c", "icns", str(ICONSET), "-o", str(ICNS)], check=True)
    else:
        print("iconutil not found; generated PNG iconset only.")


if __name__ == "__main__":
    save_iconset()
    print(f"Wrote {PNG_1024}")
    if ICNS.exists():
        print(f"Wrote {ICNS}")
