"""Render lecture figures listed in content/figures-chNN.json to assets/figs/<id>.webp.

Record fields:
  id        "F6-01" (unique; chapter number + two digits)
  pdf       key in PDFS below (ch06, ch07, ch08, ch08s, ch10, ch11, ch11s, ch12, mit06 ... mit12)
  page      PDF physical page, 1-based
  crop      [x0, y0, x1, y1] normalized to page width/height (0..1)
  caption   markdown (inline math allowed)
  alt       short plain description
Optional:
  scale     render matrix (default 2.6)
sourceLabel is derived automatically, e.g. "来源：chap_7m 三极管 PDF 第 29 页".

Usage: ../.venv/bin/python src/render_figures.py [ch07 ...]   (only re-renders those chapters)
       add --force to overwrite existing images; --mask-only whites out slide page
       numbers inside existing images without re-rendering (safe to repeat).
"""
import io, json, re, sys
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
PDFS = {
    "ch06": "chap_6m 二极管.pdf", "ch07": "chap_7m 三极管.pdf", "ch08": "chap_8m 场效应晶体管.pdf",
    "ch08s": "chap_8m_补充.pdf", "ch10": "chap_10m 频率响应.pdf", "ch11": "chap_11m 反馈.pdf",
    "ch11s": "chap_11m_补充.pdf", "ch12": "chap_12m 功率放大器.pdf",
    "mit06": "第06章_二极管_MIT讲义.pdf", "mit07": "第07章_三极管_BJT_MIT讲义.pdf",
    "mit08": "第08章_场效应晶体管_FET_MIT讲义.pdf", "mit10": "第10章_频率响应_MIT讲义.pdf",
    "mit11": "第11章_负反馈_MIT讲义.pdf",
}
CHAPTERS = ["ch06", "ch07", "ch08", "ch10", "ch11", "ch12"]


def label(rec):
    name = PDFS[rec["pdf"]].rsplit(".", 1)[0]
    return f"来源：{name} PDF 第 {rec['page']} 页"


PAGE_NUM_COLOR = 0x0070BF  # slide page numbers are blue 18 pt text in the bottom-right corner


def page_number_boxes(page):
    W, H = page.rect.width, page.rect.height
    out = []
    for b in page.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            for sp in line["spans"]:
                x0, y0, x1, y1 = sp["bbox"]
                if (re.fullmatch(r"\d{1,2}", sp["text"].strip()) and sp["color"] == PAGE_NUM_COLOR
                        and x0 / W > 0.85 and y0 / H > 0.85):
                    out.append(((x0 - 2) / W, (y0 - 2) / H, (x1 + 2) / W, (y1 + 2) / H))
    return out


def mask_page_numbers(rec, im, page):
    """Turn only the blue page-number pixels inside the crop white; black lines under them stay."""
    x0, y0, x1, y1 = rec["crop"]
    px = im.load()
    n = 0
    for bx0, by0, bx1, by1 in page_number_boxes(page):
        ix0, iy0, ix1, iy1 = max(bx0, x0), max(by0, y0), min(bx1, x1), min(by1, y1)
        if ix0 >= ix1 or iy0 >= iy1:
            continue
        sx, sy = im.width / (x1 - x0), im.height / (y1 - y0)
        for yy in range(max(0, int((iy0 - y0) * sy)), min(im.height, int((iy1 - y0) * sy) + 1)):
            for xx in range(max(0, int((ix0 - x0) * sx)), min(im.width, int((ix1 - x0) * sx) + 1)):
                r, g, b = px[xx, yy][:3]
                if b - r > 6 and b >= g - 5:
                    px[xx, yy] = (255, 255, 255)
        n += 1
    return n


def mask_existing(rec):
    out = SITE / "assets" / "figs" / f"{rec['id']}.webp"
    page = fitz.open(ROOT / PDFS[rec["pdf"]])[rec["page"] - 1]
    im = Image.open(out).convert("RGB")
    if mask_page_numbers(rec, im, page):
        im.save(out, "WEBP", quality=88, method=6)
        return True
    return False


def render(rec, force=False):
    out = SITE / "assets" / "figs" / f"{rec['id']}.webp"
    if out.is_file() and not force:
        return out, False
    doc = fitz.open(ROOT / PDFS[rec["pdf"]])
    page = doc[rec["page"] - 1]
    x0, y0, x1, y1 = rec["crop"]
    assert 0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1, f"bad crop {rec['id']}"
    r = page.rect
    clip = fitz.Rect(r.x0 + x0 * r.width, r.y0 + y0 * r.height, r.x0 + x1 * r.width, r.y0 + y1 * r.height)
    s = rec.get("scale", 2.6)
    pix = page.get_pixmap(matrix=fitz.Matrix(s, s), clip=clip)
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    mask_page_numbers(rec, im, page)
    if max(im.size) > 1800:
        im.thumbnail((1800, 1800))
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=88, method=6)
    return out, True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    mask_only = "--mask-only" in sys.argv
    for ch in args or CHAPTERS:
        p = SITE / "content" / f"figures-{ch}.json"
        if not p.is_file():
            continue
        recs = json.loads(p.read_text(encoding="utf-8"))
        changed = False
        for rec in recs:
            assert rec["id"].startswith("F" + str(int(ch[2:])) + "-"), rec["id"]
            assert rec["pdf"] in PDFS, rec["pdf"]
            sl = label(rec)
            if rec.get("sourceLabel") != sl:
                rec["sourceLabel"] = sl
                changed = True
            if mask_only:
                if mask_existing(rec):
                    print("masked page number in", rec["id"])
                continue
            out, made = render(rec, force)
            print(("rendered " if made else "kept     ") + str(out.relative_to(SITE)))
        if changed:
            p.write_text(json.dumps(recs, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
