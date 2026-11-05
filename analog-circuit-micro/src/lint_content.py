"""Check content files without writing dist/ (safe to run in parallel).

  ../.venv/bin/python src/lint_content.py ch06            # chapter: md + figures/formulas/quiz json
  ../.venv/bin/python src/lint_content.py ex:diode        # exercise review overlay
Reports KaTeX errors, unknown markers, schema problems, Chinese/\\text inside math.
Exit code 1 on any error.
"""
import json, re, sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SITE / "src"))
from mdconv import MathStore, protect_math  # noqa: E402

C = SITE / "content"
LAB_IDS = set(re.findall(r"L\['([\w-]+)'\]\s*=", (SITE / "src" / "labs.js").read_text(encoding="utf-8")))
EX_IDS = set()
for p in (C / "exercises").glob("*.json"):
    if not p.name.endswith(".review.json"):
        EX_IDS |= {r["id"] for r in json.loads(p.read_text(encoding="utf-8"))}
errs = []


def math_check(text, where):
    st = MathStore()
    protect_math(text, st)
    for tex, _ in st.items:
        if re.search(r"[\u4e00-\u9fff]", tex):
            errs.append(f"{where}: Chinese inside math: {tex[:60]}")
        if "\\text{" in tex or "\\boxed" in tex:
            errs.append(f"{where}: \\text{{}} / \\boxed not allowed: {tex[:60]}")
    if st.items:
        st.render_all()
        for tex, e in st.errors:
            errs.append(f"{where}: KaTeX: {e[:120]} :: {tex[:80]}")
    left = re.sub(r"QMATHQ\d+QEND", "", protect_math(text, MathStore()))
    if left.count("$") % 2:
        errs.append(f"{where}: unbalanced $")


def chapter(ch):
    n = int(ch[2:])
    md = (C / f"{ch}.md")
    figs = json.loads((C / f"figures-{ch}.json").read_text(encoding="utf-8")) if (C / f"figures-{ch}.json").is_file() else []
    fig_ids = {f["id"] for f in figs}
    for f in figs:
        for k in ("id", "pdf", "page", "crop", "caption"):
            if k not in f:
                errs.append(f"figure {f.get('id')}: missing {k}")
        if not f["id"].startswith(f"F{n}-"):
            errs.append(f"figure id {f['id']} must start with F{n}-")
        if not (SITE / "assets" / "figs" / f"{f['id']}.webp").is_file():
            errs.append(f"figure {f['id']}: not rendered (run src/render_figures.py {ch})")
        math_check(f.get("caption", ""), f"figure {f['id']}")
    if md.is_file():
        t = md.read_text(encoding="utf-8")
        if not re.match(rf"# 第\s*{n}\s*章", t):
            errs.append(f"{ch}.md must start with '# 第{n}章 ...'")
        math_check(t, f"{ch}.md")
        for kind, key in re.findall(r"\{\{(fig|lab|ex):([\w\-\.]+)\}\}", t):
            ok = {"fig": fig_ids, "lab": LAB_IDS, "ex": EX_IDS}[kind]
            if key not in ok:
                errs.append(f"{ch}.md: unknown {kind} marker {key}")
        used = set(re.findall(r"\{\{fig:([\w\-]+)\}\}", t))
        for f in fig_ids - used:
            errs.append(f"figure {f} defined but never placed")
        h2 = re.findall(r"^## (.+)$", t, re.M)
        labs = sorted(set(re.findall(r"\{\{lab:([\w-]+)\}\}", t)))
        print(f"{ch}.md: {len(t)} chars, {len(h2)} sections, {len(used)} figures placed, labs {labs}")
        sec_ids = {f"{ch}-s{i+1:02d}" for i in range(len(h2))}
    else:
        errs.append(f"missing {md}")
        sec_ids = set()
    for name, req in (("formulas", ("id", "title", "tex", "use", "conditions", "pitfall", "section")), ("quiz", ("id", "question", "options", "correct", "explanation"))):
        p = C / f"{name}-{ch}.json"
        if not p.is_file():
            errs.append(f"missing {p.name}")
            continue
        for r in json.loads(p.read_text(encoding="utf-8")):
            for k in req:
                if k not in r or r[k] in ("", None, []):
                    errs.append(f"{name} {r.get('id')}: missing {k}")
            if r.get("section") and r["section"] not in sec_ids:
                errs.append(f"{name} {r.get('id')}: section {r['section']} not in {ch}.md (h2 order)")
            if name == "quiz" and not (0 <= r.get("correct", -1) < len(r.get("options", []))):
                errs.append(f"quiz {r.get('id')}: bad correct index")
            for k in ("tex", "use", "conditions", "pitfall", "question", "explanation"):
                if k in r:
                    math_check(("$$" + r[k] + "$$") if k == "tex" else r[k], f"{name} {r.get('id')}.{k}")
            for o in r.get("options", []):
                math_check(o, f"quiz {r.get('id')} option")


def exercises(s):
    base = {r["id"]: r for r in json.loads((C / "exercises" / f"{s}.json").read_text(encoding="utf-8"))}
    p = C / "exercises" / f"{s}.review.json"
    rev = json.loads(p.read_text(encoding="utf-8"))
    missing = set(base) - set(rev)
    extra = set(rev) - set(base)
    if missing:
        errs.append(f"{s}: not reviewed: {sorted(missing)}")
    if extra:
        errs.append(f"{s}: unknown ids: {sorted(extra)}")
    for k, o in rev.items():
        if o.get("verdict") not in ("ok", "corrected", "note", "unclear"):
            errs.append(f"{k}: verdict must be ok/corrected/note/unclear")
        if o.get("verdict") == "corrected" and not o.get("final"):
            errs.append(f"{k}: corrected needs 'final'")
        if o.get("difficulty") not in (1, 2, 3):
            errs.append(f"{k}: difficulty 1/2/3")
        if base.get(k, {}).get("kind") == "calc" and not o.get("solution"):
            errs.append(f"{k}: calc problem needs 'solution'")
        for f in ("solution", "check", "note", "final"):
            if o.get(f):
                math_check(o[f], f"{k}.{f}")
        for h in o.get("hints", []):
            math_check(h, f"{k}.hint")
    from collections import Counter
    print(s, len(rev), "reviewed", dict(Counter(o.get("verdict") for o in rev.values())))


for a in sys.argv[1:]:
    exercises(a[3:]) if a.startswith("ex:") else chapter(a)
for e in errs:
    print("ERROR", e)
print("OK" if not errs else f"{len(errs)} errors")
sys.exit(1 if errs else 0)
