"""Render uncropped classroom slides for the offline reader; run from any directory."""
import fitz
from PIL import Image

from render_figures import PDFS, SITE

PAGE_DIR = SITE / "assets" / "pages"


def render():
    for key, filename in PDFS.items():
        if not key.startswith("ch"):
            continue
        folder = PAGE_DIR / key
        folder.mkdir(parents=True, exist_ok=True)
        with fitz.open(SITE.parent / filename) as doc:
            for number, page in enumerate(doc, 1):
                target = folder / f"{number:03}.webp"
                scale = 1500 / max(page.rect.width, page.rect.height)
                pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                img.save(target, "WEBP", quality=88, method=4)
            print(key, len(doc), flush=True)


if __name__ == "__main__":
    render()
