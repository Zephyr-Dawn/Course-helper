"""Build the offline single-file review site.

  ../.venv/bin/python build.py            -> dist/模拟电路-下半学期复习.html
  ../.venv/bin/python build.py --draft    -> also accept missing chapters (never for delivery)
  ../.venv/bin/python build.py --out index.html  -> write the HTML to another path (Pages: course dir index.html)

Inputs: content/*.md|json, assets/, src/{shell.html,style.css,app.js,models.js,labs.js}.
Never hand-edit the generated HTML.
"""
import base64, hashlib, html, io, json, re, sys
from pathlib import Path
from PIL import Image

SITE = Path(__file__).resolve().parent
sys.path.insert(0, str(SITE / "src"))
from mdconv import MathStore, md_to_html, inline_md as _inline_md  # noqa: E402

CONTENT = SITE / "content"
ASSETS = SITE / "assets"
CACHE = SITE / ".cache"
DIST = SITE.parent / "dist"
OUT_NAME = "模拟电路-下半学期复习.html"
CHAPTERS = ["ch06", "ch07", "ch08", "ch10", "ch11", "ch12"]
SETS = ["diode", "bjt", "mosfet", "opam", "freq", "feedbak", "pa", "int"]
DRAFT = "--draft" in sys.argv
OUT_ARG = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None


def load_json(p, default):
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else default


class Images:
    def __init__(self):
        self.keys = {}

    def key(self, rel):
        if rel not in self.keys:
            self.keys[rel] = "i" + hashlib.sha1(rel.encode()).hexdigest()[:10]
        return self.keys[rel]

    def data(self):
        CACHE.mkdir(exist_ok=True)
        out, missing = {}, []
        for rel, k in self.keys.items():
            p = ASSETS / rel
            if not p.is_file():
                missing.append(rel)
                continue
            if p.suffix.lower() == ".webp":
                b = p.read_bytes()
            else:
                c = CACHE / (hashlib.sha1(p.read_bytes()).hexdigest() + ".webp")
                if not c.is_file():
                    im = Image.open(p)
                    im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
                    if max(im.size) > 1600:
                        im.thumbnail((1600, 1600))
                    im.save(c, "WEBP", lossless=True, method=6)
                b = c.read_bytes()
            out[k] = "data:image/webp;base64," + base64.b64encode(b).decode()
        return out, missing


def section_ids(h, chid):
    secs, n2, n3 = [], 0, 0

    def rep(m):
        nonlocal n2, n3
        lvl, inner = m.group(1), m.group(2)
        title = re.sub(r"<[^>]+>", "", inner)
        if lvl == "2":
            n2 += 1
            n3 = 0
            sid = f"{chid}-s{n2:02d}"
        else:
            n3 += 1
            sid = f"{chid}-s{n2:02d}-h{n3:02d}"
        secs.append({"id": sid, "level": int(lvl), "title": html.unescape(title).strip()})
        fav = ' <button class="fav-btn" data-fav="%s" title="收藏本节" aria-label="收藏本节">☆</button>' % sid if lvl == "2" else ""
        return f'<h{lvl} id="{sid}">{inner}{fav}</h{lvl}>'

    h = re.sub(r"<h([23])>(.*?)</h\1>", rep, h)
    return h, secs


def plain(h):
    t = re.sub(r'<span class="katex-html".*?</span></span></span>', " ", h, flags=re.S)
    t = re.sub(r'<annotation encoding="application/x-tex">(.*?)</annotation>', r" \1 ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def main():
    store = MathStore()
    imgs = Images()
    ctx = {"img_key": imgs.key}
    ctx["inline_md"] = lambda s: _inline_md(s, store)

    figures = {}
    for ch in CHAPTERS:
        for f in load_json(CONTENT / f"figures-{ch}.json", []):
            assert f["id"] not in figures, "duplicate figure " + f["id"]
            figures[f["id"]] = f
    ctx["figures"] = figures

    chapters = []
    for ch in CHAPTERS:
        p = CONTENT / f"{ch}.md"
        if not p.is_file():
            if DRAFT:
                continue
            raise SystemExit(f"missing {p}")
        text = p.read_text(encoding="utf-8")
        m = re.match(r"#\s+(.+)\n", text)
        title = m.group(1).strip() if m else ch
        body = text[m.end():] if m else text
        h = md_to_html(body, store, ctx)
        h, secs = section_ids(h, ch)
        chapters.append({"id": ch, "num": int(ch[2:]), "title": title, "html": h, "sections": secs})

    # exercises
    exercises, sets = [], []
    for s in SETS:
        base = load_json(CONTENT / "exercises" / f"{s}.json", [])
        rev = load_json(CONTENT / "exercises" / f"{s}.review.json", {})
        for r in base:
            o = rev.get(r["id"], {})
            e = {k: r[k] for k in ("id", "set", "chapter", "setTitle", "kp", "kind", "url")}
            e["qHtml"] = md_to_html(r["question"], store, ctx)
            e["aHtml"] = md_to_html(r["answer"], store, ctx)
            for k in ("solution", "check", "note", "final"):
                e[k + "Html"] = md_to_html(o[k], store, ctx) if o.get(k) else ""
            e["hints"] = [_inline_md(x, store) for x in o.get("hints", [])]
            e["verdict"] = o.get("verdict", "")
            e["difficulty"] = o.get("difficulty", 0)
            e["tags"] = o.get("tags", [])
            exercises.append(e)
        if base:
            sets.append({"name": s, "chapter": base[0]["chapter"], "title": base[0]["setTitle"], "count": len(base),
                         "kps": list(dict.fromkeys(r["kp"] for r in base))})

    formulas, quizzes = [], []
    for ch in CHAPTERS:
        for f in load_json(CONTENT / f"formulas-{ch}.json", []):
            formulas.append({
                "id": f["id"], "chapter": int(ch[2:]), "section": f.get("section", ""), "title": f["title"],
                "texHtml": md_to_html("$$" + f["tex"] + "$$", store),
                "useHtml": _inline_md(f.get("use", ""), store), "condHtml": _inline_md(f.get("conditions", ""), store),
                "pitfallHtml": _inline_md(f.get("pitfall", ""), store),
            })
        for q in load_json(CONTENT / f"quiz-{ch}.json", []):
            quizzes.append({
                "id": q["id"], "chapter": int(ch[2:]), "qHtml": _inline_md(q["question"], store),
                "options": [_inline_md(x, store) for x in q["options"]], "correct": q["correct"],
                "explHtml": _inline_md(q["explanation"], store), "section": q.get("section", ""),
            })

    store.render_all()
    if store.errors:
        for t, e in store.errors[:30]:
            print("KaTeX error:", e, "::", t[:120])
        if not DRAFT:
            raise SystemExit(f"{len(store.errors)} KaTeX errors")

    def R(s):
        return store.restore(s)

    GREEK = {"alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ", "lambda": "λ", "mu": "μ", "pi": "π",
             "tau": "τ", "omega": "ω", "Omega": "Ω", "phi": "φ", "varphi": "φ", "eta": "η", "infty": "∞", "parallel": "∥"}

    def tex_plain(t):
        t = re.sub(r"\\(mathrm|mathit|mathbf|rm|text)\s*", "", t)
        t = re.sub(r"\\([A-Za-z]+)", lambda m: GREEK.get(m.group(1), ""), t)
        return re.sub(r"[{}\\]", "", t).replace("_", "").replace("^", "").strip()

    for c in chapters:
        c["html"] = R(c["html"])
        for s in c["sections"]:  # 目录用纯文本标题
            s["title"] = re.sub(r"QMATHQ(\d+)QEND", lambda m: tex_plain(store.items[int(m.group(1))][0]), s["title"])
    for e in exercises:
        for k in ("qHtml", "aHtml", "solutionHtml", "checkHtml", "noteHtml", "finalHtml"):
            e[k] = R(e[k])
        e["hints"] = [R(x) for x in e["hints"]]
    for f in formulas:
        for k in ("texHtml", "useHtml", "condHtml", "pitfallHtml"):
            f[k] = R(f[k])
    for q in quizzes:
        q["qHtml"], q["explHtml"] = R(q["qHtml"]), R(q["explHtml"])
        q["options"] = [R(x) for x in q["options"]]
    figs_used = sorted(set(ctx.get("used", {}).get("fig", [])))
    unused = sorted(set(figures) - set(figs_used))
    missing = ctx.get("missing", [])
    if missing and not DRAFT:
        raise SystemExit(f"missing markers: {missing}")

    # search index
    search = []
    for c in chapters:
        parts = re.split(r'(?=<h2 id=")', c["html"])
        for part in parts:
            m = re.match(r'<h2 id="([^"]+)">(.*?)</h2>', part, re.S)
            if not m:
                continue
            search.append({"t": "讲义", "id": m.group(1), "title": plain(m.group(2)).replace("☆", "").strip(),
                           "text": plain(part)[:1800], "route": f"#/ch/{c['id']}/{m.group(1)}"})
    for e in exercises:
        search.append({"t": "习题", "id": e["id"], "title": f"{e['id']} {e['setTitle']}", "text": plain(e["qHtml"])[:600],
                       "route": f"#/ex/{e['id']}"})
    for f in formulas:
        search.append({"t": "公式", "id": f["id"], "title": f["title"], "text": plain(f["useHtml"] + f["condHtml"])[:400],
                       "route": f"#/formulas/{f['id']}"})

    image_data, img_missing = imgs.data()
    if img_missing and not DRAFT:
        raise SystemExit(f"missing images: {img_missing[:10]}")

    meta = {"built": __import__("datetime").date.today().isoformat(),
            "counts": {"chapters": len(chapters), "sections": sum(1 for c in chapters for s in c["sections"] if s["level"] == 2),
                       "figures": len(figs_used), "exercises": len(exercises),
                       "reviewed": sum(1 for e in exercises if e["solutionHtml"] or e["checkHtml"]),
                       "formulas": len(formulas), "quizzes": len(quizzes), "images": len(image_data)}}
    data = {"chapters": chapters, "exercises": exercises, "sets": sets, "formulas": formulas,
            "quizzes": quizzes, "search": search, "meta": meta}

    # KaTeX css with embedded woff2 fonts
    kcss = (ASSETS / "katex" / "katex.min.css").read_text(encoding="utf-8")

    def font(m):
        name = m.group(1)
        b = (ASSETS / "katex" / "fonts" / f"{name}.woff2").read_bytes()
        return f'src:url(data:font/woff2;base64,{base64.b64encode(b).decode()}) format("woff2")'
    kcss = re.sub(r'src:url\(fonts/([\w\-]+)\.woff2\) format\("woff2"\)[^;}]*', font, kcss)
    assert "fonts/" not in kcss, "unresolved KaTeX font reference"

    def js_json(o):
        return json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    shell = (SITE / "src" / "shell.html").read_text(encoding="utf-8")
    src = {n: (SITE / "src" / n).read_text(encoding="utf-8") for n in ("style.css", "models.js", "labs.js", "app.js")}
    out = (shell.replace("/*KATEX_CSS*/", kcss).replace("/*STYLE_CSS*/", src["style.css"])
           .replace("/*COURSE_DATA*/", js_json(data)).replace("/*IMAGE_DATA*/", js_json(image_data))
           .replace("/*MODELS_JS*/", src["models.js"]).replace("/*LABS_JS*/", src["labs.js"])
           .replace("/*APP_JS*/", src["app.js"]))
    target = Path(OUT_ARG).resolve() if OUT_ARG else DIST / OUT_NAME
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(out.encode("utf-8"))  # 固定 LF 字节，便于与仓库中的 Pages 产物逐字节比对
    manifest = dict(meta, unusedFigures=unused, sha256=hashlib.sha256(out.encode()).hexdigest(), bytes=len(out.encode()))
    (SITE / "build-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
