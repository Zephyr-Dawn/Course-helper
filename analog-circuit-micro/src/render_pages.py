"""Render lecture PDF pages to JPEG for visual reading (tmp/pages/<key>/pNNN.jpg)
and 2x2 contact sheets (tmp/pages/<key>/sheet_NN.jpg). Reading aid only, not a build input."""
import fitz, io, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tmp" / "pages"
PDFS = {
    "ch06": "chap_6m 二极管.pdf",
    "ch07": "chap_7m 三极管.pdf",
    "ch08": "chap_8m 场效应晶体管.pdf",
    "ch08s": "chap_8m_补充.pdf",
    "ch10": "chap_10m 频率响应.pdf",
    "ch11": "chap_11m 反馈.pdf",
    "ch11s": "chap_11m_补充.pdf",
    "ch12": "chap_12m 功率放大器.pdf",
}


def main(keys):
    for key in keys or PDFS:
        d = fitz.open(ROOT / PDFS[key])
        od = OUT / key
        od.mkdir(parents=True, exist_ok=True)
        ims = []
        for i, p in enumerate(d):
            pix = p.get_pixmap(matrix=fitz.Matrix(1.4, 1.4))
            im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            im.save(od / f"p{i+1:03d}.jpg", quality=82)
            ims.append(im)
        w, h = ims[0].size
        for s in range(0, len(ims), 4):
            sheet = Image.new("RGB", (w * 2 + 10, h * 2 + 10), "white")
            for k, im in enumerate(ims[s:s + 4]):
                sheet.paste(im.resize((w, h)), ((k % 2) * (w + 10), (k // 2) * (h + 10)))
            sheet.save(od / f"sheet_{s//4+1:02d}_p{s+1:03d}-{min(s+4,len(ims)):03d}.jpg", quality=75)
        print(key, len(ims), "pages", (w, h))


if __name__ == "__main__":
    main(sys.argv[1:])
