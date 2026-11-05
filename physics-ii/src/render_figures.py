#!/usr/bin/env python3
"""Render lecture figures (content/figures-chNN.json -> assets/figs/<id>.webp)
and exercise diagrams (content/exercises/chNN.json -> assets/ex/<id>.webp)
from 大学物理甲-II_第1至14讲.pdf.
"""

from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz
from PIL import Image

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
PDF_PATH = ROOT / "大学物理甲-II_第1至14讲.pdf"
CHAPTERS = ["ch09", "ch10", "ch11", "ch12", "ch13", "ch14"]


def page_number_boxes(page: fitz.Page) -> List[Tuple[float, float, float, float]]:
    """Detect bottom-right slide page number boxes so they can be masked if inside crop."""
    w, h = page.rect.width, page.rect.height
    out: List[Tuple[float, float, float, float]] = []
    for b in page.get_text("dict").get("blocks", []):
        for line in b.get("lines", []):
            for sp in line.get("spans", []):
                x0, y0, x1, y1 = sp["bbox"]
                txt = sp.get("text", "").strip()
                if re.fullmatch(r"\d{1,3}", txt) and x0 / w > 0.86 and y0 / h > 0.88:
                    out.append(((x0 - 2) / w, (y0 - 2) / h, (x1 + 2) / w, (y1 + 2) / h))
    return out


def mask_page_numbers(crop: List[float], im: Image.Image, page: fitz.Page) -> int:
    x0, y0, x1, y1 = crop
    px = im.load()
    n = 0
    for bx0, by0, bx1, by1 in page_number_boxes(page):
        ix0, iy0, ix1, iy1 = max(bx0, x0), max(by0, y0), min(bx1, x1), min(by1, y1)
        if ix0 >= ix1 or iy0 >= iy1:
            continue
        sx, sy = im.width / (x1 - x0), im.height / (y1 - y0)
        for yy in range(max(0, int((iy0 - y0) * sy)), min(im.height, int((iy1 - y0) * sy) + 1)):
            for xx in range(max(0, int((ix0 - x0) * sx)), min(im.width, int((ix1 - x0) * sx) + 1)):
                px[xx, yy] = (255, 255, 255)
        n += 1
    return n


def render_crop(
    doc: fitz.Document,
    page_num: int,
    crop: List[float],
    out_path: Path,
    scale: float = 2.6,
    force: bool = False,
) -> Tuple[Path, bool]:
    if out_path.is_file() and not force:
        return out_path, False
    page = doc[page_num - 1]
    x0, y0, x1, y1 = [float(v) for v in crop]
    if not (0.0 <= x0 < x1 <= 1.0 and 0.0 <= y0 < y1 <= 1.0):
        raise ValueError(f"Invalid crop {crop} for {out_path.name} on page {page_num}")
    r = page.rect
    clip = fitz.Rect(
        r.x0 + x0 * r.width,
        r.y0 + y0 * r.height,
        r.x0 + x1 * r.width,
        r.y0 + y1 * r.height,
    )
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=clip)
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    mask_page_numbers([x0, y0, x1, y1], im, page)
    if max(im.size) > 1800:
        im.thumbnail((1800, 1800))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(out_path, "WEBP", quality=88, method=6)
    return out_path, True


def process_chapter(doc: fitz.Document, ch: str, force: bool = False) -> None:
    # 1. Lecture figures: content/figures-chNN.json
    fig_path = SITE / "content" / f"figures-{ch}.json"
    if fig_path.is_file():
        data = json.loads(fig_path.read_text(encoding="utf-8"))
        changed = False
        if isinstance(data, list):
            items = [(rec["id"], rec) for rec in data]
        elif isinstance(data, dict):
            items = list(data.items())
        else:
            raise ValueError(f"Unexpected JSON structure in {fig_path}")

        for fig_id, rec in items:
            rec["id"] = fig_id
            page_num = int(rec["page"])
            crop = rec["crop"]
            src_label = f"课件 PDF 第 {page_num} 页"
            if rec.get("source") != src_label:
                rec["source"] = src_label
                changed = True
            asset_key = f"figs/{fig_id}.webp"
            if rec.get("assetKey") != asset_key:
                rec["assetKey"] = asset_key
                changed = True
            out_file = SITE / "assets" / "figs" / f"{fig_id}.webp"
            out, made = render_crop(
                doc,
                page_num,
                crop,
                out_file,
                scale=float(rec.get("scale", 2.6)),
                force=force,
            )
            print(("rendered " if made else "kept     ") + str(out.relative_to(SITE)))

        if changed:
            fig_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2. Exercise diagrams: content/exercises/chNN.json
    ex_path = SITE / "content" / "exercises" / f"{ch}.json"
    if ex_path.is_file():
        ex_data = json.loads(ex_path.read_text(encoding="utf-8"))
        ex_list = ex_data.get("exercises", ex_data) if isinstance(ex_data, dict) else ex_data
        changed_ex = False
        for rec in ex_list:
            if "crop" in rec and "page" in rec:
                ex_id = rec["id"]
                page_num = int(rec["page"])
                crop = rec["crop"]
                out_file = SITE / "assets" / "ex" / f"{ex_id}.webp"
                out, made = render_crop(
                    doc,
                    page_num,
                    crop,
                    out_file,
                    scale=float(rec.get("scale", 2.6)),
                    force=force,
                )
                q_img = f"ex/{ex_id}.webp"
                if rec.get("questionImage") != q_img:
                    rec["questionImage"] = q_img
                    changed_ex = True
                print(("rendered " if made else "kept     ") + str(out.relative_to(SITE)))
        if changed_ex:
            ex_path.write_text(json.dumps(ex_data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    doc = fitz.open(PDF_PATH)
    for ch in args or CHAPTERS:
        process_chapter(doc, ch, force=force)


if __name__ == "__main__":
    main()
