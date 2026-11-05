"""Parse the Microelectronic Circuits problem pages of EC2024 (MIT License, bc0403)
into content/exercises/<set>.json. Source: assets/ec2024/<set>.md (copied from
https://github.com/bc0403/EC2024/tree/main/docs). Struck-through [optional] items are skipped.

Each record: id, set, chapter, kp (knowledge point heading), kind (choice/fill/calc),
question (markdown), answer (markdown, source reference answer), images (list of asset paths),
url (source page). Re-running overwrites only these generated files; the hand-written
review overlays live in content/exercises/<set>.review.json and are never touched here.
"""
import json, re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
SRC = SITE / "assets" / "ec2024"
OUT = SITE / "content" / "exercises"
SETS = [
    ("diode", 6, "二极管及其应用电路"),
    ("bjt", 7, "三极管及其放大电路"),
    ("mosfet", 8, "场效应晶体管及其放大电路"),
    ("opam", 9, "理想运算放大器及其应用电路"),
    ("freq", 10, "频率响应"),
    ("feedbak", 11, "反馈"),
    ("pa", 12, "功率放大器"),
    ("int", 0, "综合"),
]
ID_RE = re.compile(r"^\*\*`(CH\d+-KP\d+-\d+)`\*\*\s*[:：]?\s*(.*)$")
IMG_HTML = re.compile(r"<img\s[^>]*?src=\"\.?/?([^\"]+)\"[^>]*>")
IMG_MD = re.compile(r"!\[[^\]]*\]\(\.?/?([^)\s]+)\)")


def norm_line(s):
    s = s.replace("\u00a0", " ").replace("\u200b", "").replace("\ufeff", "")
    s = re.sub(r"[ \t]{2,}", "  ", s.strip())
    return s.strip()


def fix_images(text, images):
    def rep(m):
        p = m.group(1)
        images.append(p)
        return f"\n\n@@IMG:{p}@@\n\n"
    text = IMG_HTML.sub(rep, text)
    text = IMG_MD.sub(rep, text)
    return text


def tidy(lines):
    out, blank = [], False
    for l in lines:
        if not l:
            if not blank:
                out.append("")
            blank = True
        else:
            out.append(l)
            blank = False
    return "\n".join(out).strip()


def classify(q):
    if re.search(r"(^|\n)\s*A[\.．、]", q) and re.search(r"(^|\n)\s*B[\.．、]", q):
        return "choice"
    if "____" in q or "＿" in q:
        return "fill"
    return "calc"


def parse(name, chapter, title):
    lines = (SRC / f"{name}.md").read_text(encoding="utf-8").splitlines()
    recs, cur, kp, skip = [], None, "", False
    for raw in lines:
        line = norm_line(raw)
        if line.startswith("## "):
            kp = line[3:].strip()
            cur = None
            continue
        if line.startswith("# "):
            cur = None
            continue
        m = ID_RE.match(line)
        if m:
            cur = {"id": m.group(1), "kp": kp, "q": [m.group(2)], "a": []}
            recs.append(cur)
            skip = False
            continue
        if cur is None:
            continue
        # ~~<img>~~ still renders the picture on the source site; keep the image,
        # unless it belongs to a struck-through [optional] problem (skip mode)
        if re.fullmatch(r"~~\s*(<img[^>]*>|!\[[^\]]*\]\([^)]*\))\s*~~", line):
            if skip:
                continue
            line = line.strip("~").strip()
        elif line.startswith("~~") or line.startswith("> ~~"):
            skip = True
            continue
        if skip and line and not line.startswith(">"):
            skip = False
        if skip:
            continue
        if line.startswith(">"):
            cur["a"].append(norm_line(line[1:]))
        else:
            if cur["a"] and line:
                # text after an answer block that is not a blockquote: keep with answer
                cur["a"].append(line)
            else:
                cur["q"].append(line)
    out = []
    for r in recs:
        imgs_q, imgs_a = [], []
        q = fix_images(tidy(r["q"]), imgs_q)
        a = fix_images(tidy(r["a"]), imgs_a)
        out.append({
            "id": r["id"], "set": name, "chapter": chapter, "setTitle": title,
            "kp": r["kp"], "kind": classify(q), "question": q.strip(), "answer": a.strip(),
            "images": imgs_q, "answerImages": imgs_a,
            "url": f"https://bc0403.github.io/EC2024/{name}",
        })
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, ch, title in SETS:
        recs = parse(name, ch, title)
        ids = [r["id"] for r in recs]
        assert len(ids) == len(set(ids)), f"duplicate id in {name}"
        for r in recs:
            for p in r["images"] + r["answerImages"]:
                assert (SRC / p).is_file(), f"missing image {p} in {r['id']}"
        (OUT / f"{name}.json").write_text(json.dumps(recs, ensure_ascii=False, indent=1), encoding="utf-8")
        kinds = {}
        for r in recs:
            kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
        noans = [r["id"] for r in recs if not r["answer"]]
        print(f"{name}: {len(recs)} {kinds} no-answer={noans}")
        total += len(recs)
    print("total", total)


if __name__ == "__main__":
    main()
