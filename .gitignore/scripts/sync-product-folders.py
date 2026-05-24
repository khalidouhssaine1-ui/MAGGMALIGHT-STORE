#!/usr/bin/env python3
import json
import re
import shutil
import struct
import subprocess
import tempfile
import unicodedata
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_DIR = ROOT / "images" / "Products"
DATA_FILE = ROOT / "js" / "products-data.js"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".avif"}


def normalize_text(value):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", value or "")).strip()


def parse_product_folder(folder):
    name = normalize_text(folder.name)
    match = re.match(r"^(.+?)\s*\((.+)\)\s*$", name)
    if not match:
        return None
    return normalize_text(match.group(1)), normalize_text(match.group(2))


def load_products():
    source = DATA_FILE.read_text(encoding="utf-8")
    match = re.search(r"window\.MAGGMA_PRODUCTS\s*=\s*(\[.*\]);\s*$", source, re.S)
    if not match:
        raise RuntimeError("window.MAGGMA_PRODUCTS not found in js/products-data.js")
    return json.loads(match.group(1))


def save_products(products):
    DATA_FILE.write_text(
        "/* Generated from maggmalight_products.xlsx. Product folder overrides applied for MAGGMALIGHT store. */\n"
        + "window.MAGGMA_PRODUCTS = "
        + json.dumps(products, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def png_pixels(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    pos = 8
    width = height = color_type = None
    idat = b""
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        chunk_type = data[pos + 4 : pos + 8]
        chunk_data = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type = struct.unpack(">IIBB", chunk_data[:10])[:4]
            if bit_depth != 8 or color_type not in (0, 2, 6):
                return None
        elif chunk_type == b"IDAT":
            idat += chunk_data
        elif chunk_type == b"IEND":
            break
    if not width or not height or not idat:
        return None

    channels = {0: 1, 2: 3, 6: 4}[color_type]
    bpp = channels
    raw = zlib.decompress(idat)
    stride = width * channels
    rows = []
    offset = 0
    prev = bytearray(stride)
    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        row = bytearray(raw[offset : offset + stride])
        offset += stride
        for i in range(stride):
            left = row[i - bpp] if i >= bpp else 0
            up = prev[i]
            up_left = prev[i - bpp] if i >= bpp else 0
            if filter_type == 1:
                row[i] = (row[i] + left) & 255
            elif filter_type == 2:
                row[i] = (row[i] + up) & 255
            elif filter_type == 3:
                row[i] = (row[i] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                row[i] = (row[i] + (left if pa <= pb and pa <= pc else up if pb <= pc else up_left)) & 255
        rows.append(bytes(row))
        prev = row
    return width, height, channels, rows


def white_background_score(image_path):
    filename = image_path.name.lower()
    if re.search(r"(product|packshot|white|fond|principal|main)", filename):
        return 10
    sips = shutil.which("sips")
    if not sips:
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "preview.png"
        result = subprocess.run(
            [sips, "-s", "format", "png", "-Z", "96", str(image_path), "--out", str(out)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode != 0 or not out.exists():
            return 0
        parsed = png_pixels(out)
    if not parsed:
        return 0
    width, height, channels, rows = parsed
    margin_x = max(2, width // 7)
    margin_y = max(2, height // 7)
    white = total = 0
    brightness = 0
    for y, row in enumerate(rows):
        for x in range(width):
            if not (x < margin_x or x >= width - margin_x or y < margin_y or y >= height - margin_y):
                continue
            idx = x * channels
            if channels == 1:
                r = g = b = row[idx]
                alpha = 255
            else:
                r, g, b = row[idx], row[idx + 1], row[idx + 2]
                alpha = row[idx + 3] if channels == 4 else 255
            total += 1
            brightness += (r + g + b) / 3
            if alpha < 10 or (r > 232 and g > 232 and b > 232 and max(r, g, b) - min(r, g, b) < 24):
                white += 1
    if not total:
        return 0
    name_bonus = 0.16 if re.search(r"(white|fond|product|packshot|principal|main)", image_path.name, re.I) else 0
    return (white / total) * 0.78 + (brightness / total / 255) * 0.22 + name_bonus


def relative_path(path):
    return path.relative_to(ROOT).as_posix()


def main():
    products = load_products()
    by_sku = {normalize_text(product.get("sku", "")).upper(): product for product in products if product.get("sku")}
    matched = []
    skipped = []

    for folder in sorted(PRODUCTS_DIR.iterdir()):
        if not folder.is_dir():
            continue
        parsed = parse_product_folder(folder)
        if not parsed:
            continue
        sku, title = parsed
        product = by_sku.get(sku.upper())
        images = sorted(
            [item for item in folder.iterdir() if item.is_file() and item.suffix.lower() in IMAGE_EXTS],
            key=lambda item: item.name.lower(),
        )
        if not product or not images:
            skipped.append({"folder": folder.name, "sku": sku, "reason": "product not found" if not product else "no images"})
            continue

        scored = sorted(images, key=lambda item: white_background_score(item), reverse=True)
        main_image = scored[0]
        gallery = [main_image] + [item for item in images if item != main_image]

        product["name"] = title
        product["image"] = relative_path(main_image)
        product["gallery"] = [relative_path(item) for item in gallery]
        product["description"] = (
            f"{title}. Produit d’éclairage sélectionné par MAGGMALIGHT pour les intérieurs premium, "
            "les projets résidentiels, hôteliers et professionnels au Maroc."
        )
        matched.append({"sku": sku, "title": title, "main": product["image"], "images": len(gallery)})

    save_products(products)
    print(json.dumps({"matched": matched, "skipped": skipped}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
